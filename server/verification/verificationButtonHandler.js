const GuildConfig = require("../models/GuildConfig");
const { getGuildVerification } = require("./verificationStorage");
const { giveVerifiedRole } = require("./verificationManager");
const {
  startCaptchaVerification,
  openCaptchaModal,
  handleCaptchaModal,
} = require("./captchaVerification");

async function safeReply(interaction, content) {
  try {
    if (interaction.replied) {
      return await interaction.followUp({
        content,
        ephemeral: true,
      });
    }

    if (interaction.deferred) {
      return await interaction.editReply({
        content,
      });
    }

    return await interaction.reply({
      content,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Verification safeReply error:", error);
    return null;
  }
}

async function loadVerificationConfig(guildId) {
  try {
    const config = await getGuildVerification(guildId);
    return config || null;
  } catch (error) {
    console.error("Failed to load verification config:", error);
    return null;
  }
}

async function getGuildSecurityConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.security || null;
  } catch (error) {
    console.error("Failed to load guild security config:", error);
    return null;
  }
}

function getQuarantineRoleIdsFromSecurity(security) {
  const ids = new Set();

  const antiRaidQuarantineRoleId =
    security?.antiRaid?.quarantineRoleId || "";
  const suspiciousQuarantineRoleId =
    security?.suspiciousAccount?.quarantineRoleId || "";

  if (antiRaidQuarantineRoleId) ids.add(antiRaidQuarantineRoleId);
  if (suspiciousQuarantineRoleId) ids.add(suspiciousQuarantineRoleId);

  return [...ids];
}

async function memberIsQuarantined(member) {
  try {
    const security = await getGuildSecurityConfig(member.guild.id);
    if (!security) return false;

    const quarantineRoleIds = getQuarantineRoleIdsFromSecurity(security);
    if (!quarantineRoleIds.length) return false;

    return quarantineRoleIds.some((roleId) => member.roles.cache.has(roleId));
  } catch (error) {
    console.error("Failed to check quarantine status:", error);
    return false;
  }
}

async function handleVerificationButton(interaction) {
  try {
    if (!interaction.isButton()) return false;
    if (!interaction.guild || !interaction.member) return false;

    // Captcha modal opener
    if (interaction.customId === "kyro_captcha_open_modal") {
      try {
        const quarantined = await memberIsQuarantined(interaction.member);
        if (quarantined) {
          await safeReply(
            interaction,
            "❌ You cannot verify while quarantined. Please contact a server admin."
          );
          return true;
        }

        await openCaptchaModal(interaction);
      } catch (error) {
        console.error("openCaptchaModal error:", error);

        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: "❌ Failed to open captcha verification.",
              ephemeral: true,
            })
            .catch(() => {});
        }
      }

      return true;
    }

    // Main verification button
    if (interaction.customId !== "kyro_verify") return false;

    const config = await loadVerificationConfig(interaction.guild.id);

    if (!config) {
      await safeReply(
        interaction,
        "❌ Verification system is not configured yet. Please ask an admin to set it up again."
      );
      return true;
    }

    if (!config.enabled) {
      await safeReply(
        interaction,
        "❌ Verification system is currently disabled."
      );
      return true;
    }

    const quarantined = await memberIsQuarantined(interaction.member);
    if (quarantined) {
      await safeReply(
        interaction,
        "❌ You cannot verify while quarantined. Please contact a server admin."
      );
      return true;
    }

    const clickedPanel = Array.isArray(config.panels)
  ? config.panels.find(
      (panel) =>
        panel?.sentPanel?.messageId &&
        panel.sentPanel.messageId === interaction.message?.id
    )
  : null;

const activeConfig = clickedPanel
  ? {
      ...config,
      ...clickedPanel,
      mode: clickedPanel.mode || config.mode || "button",
      roleId: clickedPanel.roleId || config.roleId || config.verifiedRoleId,
      verifiedRoleId:
        clickedPanel.roleId || config.verifiedRoleId || config.roleId,
      settings: {
        ...(config.settings || {}),
        ...(clickedPanel.settings || {}),
      },
    }
  : config;

const mode = activeConfig.mode || "button";

    // Captcha flow
    if (mode === "captcha") {
      try {
        await startCaptchaVerification(interaction, activeConfig);
      } catch (error) {
        console.error("startCaptchaVerification error:", error);

        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: "❌ Failed to start captcha verification.",
              ephemeral: true,
            })
            .catch(() => {});
        } else {
          await safeReply(
            interaction,
            "❌ Failed to start captcha verification."
          );
        }
      }

      return true;
    }

    if (mode !== "button") {
      await safeReply(
        interaction,
        "❌ Invalid verification mode configured."
      );
      return true;
    }

    // Button verification flow
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

   const result = await giveVerifiedRole(interaction.member, activeConfig);

    await safeReply(
      interaction,
      result?.message || "✅ Verification completed."
    );

    return true;
  } catch (error) {
    console.error("Verification button handler error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Something went wrong while processing verification.",
          ephemeral: true,
        })
        .catch(() => {});
    } else {
      await safeReply(
        interaction,
        "❌ Something went wrong while processing verification."
      );
    }

    return true;
  }
}

async function handleVerificationModal(interaction) {
  try {
    if (!interaction.isModalSubmit()) return false;
    if (interaction.customId !== "kyro_captcha_modal") return false;
    if (!interaction.guild || !interaction.member) return false;

    const config = await loadVerificationConfig(interaction.guild.id);

    if (!config) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content:
              "❌ Verification system is not configured yet. Please ask an admin to set it up again.",
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        await safeReply(
          interaction,
          "❌ Verification system is not configured yet. Please ask an admin to set it up again."
        );
      }

      return true;
    }

    const quarantined = await memberIsQuarantined(interaction.member);
    if (quarantined) {
      await safeReply(
        interaction,
        "❌ You cannot verify while quarantined. Please contact a server admin."
      );
      return true;
    }

    return await handleCaptchaModal(interaction, config);
  } catch (error) {
    console.error("Verification modal handler error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Something went wrong while processing the captcha.",
          ephemeral: true,
        })
        .catch(() => {});
    } else {
      await safeReply(
        interaction,
        "❌ Something went wrong while processing the captcha."
      );
    }

    return true;
  }
}

module.exports = {
  handleVerificationButton,
  handleVerificationModal,
};