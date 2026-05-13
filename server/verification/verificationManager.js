const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { clearVerificationKick } = require("./verificationAutoKick");

async function logVerification(member, config) {
  try {
    const logChannelId =
      config?.logChannelId ||
      config?.panel?.logChannelId ||
      config?.activePanel?.logChannelId ||
      config?.panels?.find((p) => p?.enabled !== false)?.logChannelId ||
      null;

    if (!logChannelId) return;

    const logChannel =
      member.guild.channels.cache.get(logChannelId) ||
      (await member.guild.channels.fetch(logChannelId).catch(() => null));

    if (!logChannel || !logChannel.isTextBased()) return;

    const accountCreatedAt = Math.floor(member.user.createdTimestamp / 1000);
    const joinedAt = member.joinedTimestamp
      ? Math.floor(member.joinedTimestamp / 1000)
      : null;

    const mode =
      config?.mode ||
      config?.panel?.mode ||
      config?.activePanel?.mode ||
      config?.panels?.find((p) => p?.enabled !== false)?.mode ||
      "button";

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("✅ Member Verified")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: "User",
          value: `${member} (${member.user.tag})`,
          inline: false,
        },
        {
          name: "User ID",
          value: member.id,
          inline: true,
        },
        {
          name: "Method",
          value: mode,
          inline: true,
        },
        {
          name: "Account Created",
          value: `<t:${accountCreatedAt}:F>`,
          inline: false,
        }
      )
      .setTimestamp();

    if (joinedAt) {
      embed.addFields({
        name: "Joined Server",
        value: `<t:${joinedAt}:F>`,
        inline: false,
      });
    }

    await logChannel.send({ embeds: [embed] }).catch((error) => {
      console.error("Verification log send error:", error);
    });
  } catch (error) {
    console.error("Verification log error:", error);
  }
}

function getActiveVerificationPanel(config = {}) {
  if (config?.activePanel && typeof config.activePanel === "object") {
    return config.activePanel;
  }

  if (config?.panel && typeof config.panel === "object" && config.panel.roleId) {
    return config.panel;
  }

  if (Array.isArray(config?.panels) && config.panels.length > 0) {
    return (
      config.panels.find((panel) => panel?.enabled !== false && panel?.roleId) ||
      config.panels.find((panel) => panel?.roleId) ||
      null
    );
  }

  return null;
}

async function getVerifiedRole(member, config) {
  try {
    const activePanel = getActiveVerificationPanel(config);

    const roleId =
      config?.verifiedRoleId ||
      config?.roleId ||
      activePanel?.verifiedRoleId ||
      activePanel?.roleId ||
      null;

    if (!roleId) return null;

    return (
      member.guild.roles.cache.get(roleId) ||
      (await member.guild.roles.fetch(roleId).catch(() => null))
    );
  } catch (error) {
    console.error("Get verified role error:", error);
    return null;
  }
}

function isAlreadyVerified(member, verifiedRole) {
  if (!verifiedRole) return false;
  return member.roles.cache.has(verifiedRole.id);
}

function getMinimumAccountAgeDays(config) {
  const activePanel = getActiveVerificationPanel(config);

  const days = Number(
    config?.settings?.minAccountAgeDays ??
      activePanel?.settings?.minAccountAgeDays ??
      0
  );

  return Number.isFinite(days) && days > 0 ? days : 0;
}

function getAccountAgeMs(member) {
  return Date.now() - member.user.createdTimestamp;
}

function meetsMinimumAccountAge(member, config) {
  const minDays = getMinimumAccountAgeDays(config);

  if (minDays <= 0) {
    return { ok: true, minDays: 0 };
  }

  const requiredMs = minDays * 24 * 60 * 60 * 1000;
  const actualMs = getAccountAgeMs(member);

  return {
    ok: actualMs >= requiredMs,
    minDays,
  };
}

function canBotManageVerifiedRole(member, verifiedRole) {
  const me = member.guild.members.me;

  if (!me) {
    return {
      ok: false,
      reason: "missing_bot_member",
      message: "❌ I could not access my bot member in this server.",
    };
  }

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return {
      ok: false,
      reason: "missing_manage_roles",
      message: "❌ I need the Manage Roles permission to assign the verified role.",
    };
  }

  if (verifiedRole.managed) {
    return {
      ok: false,
      reason: "managed_role",
      message: "❌ The configured verified role is managed and cannot be assigned.",
    };
  }

  if (verifiedRole.id === member.guild.id) {
    return {
      ok: false,
      reason: "everyone_role",
      message: "❌ The configured verified role cannot be @everyone.",
    };
  }

  if (verifiedRole.position >= me.roles.highest.position) {
    return {
      ok: false,
      reason: "role_too_high",
      message:
        "❌ I can't assign the verified role because it is above or equal to my highest role.",
    };
  }

  return { ok: true };
}

async function giveVerifiedRole(member, config) {
  try {
    const activePanel = getActiveVerificationPanel(config);
    const verifiedRole = await getVerifiedRole(member, config);

    if (!verifiedRole) {
      return {
        ok: false,
        reason: "missing_role",
        message: "❌ Verified role is not configured or no longer exists.",
      };
    }

if (member.roles.cache.has(verifiedRole.id)) {
  return {
    ok: false,
    reason: "already_verified",
    message: "⚠️ You are already verified.",
  };
}

    const roleManageCheck = canBotManageVerifiedRole(member, verifiedRole);
    if (!roleManageCheck.ok) {
      return {
        ok: false,
        reason: roleManageCheck.reason,
        message: roleManageCheck.message,
      };
    }

    const accountAgeCheck = meetsMinimumAccountAge(member, config);
    if (!accountAgeCheck.ok) {
      return {
        ok: false,
        reason: "account_too_new",
        message: `❌ Your account must be at least **${accountAgeCheck.minDays} day(s)** old before you can verify.`,
      };
    }

    const allowReverify =
      config?.settings?.allowReverify ??
      activePanel?.settings?.allowReverify ??
      false;

    if (isAlreadyVerified(member, verifiedRole)) {
      if (!allowReverify) {
        return {
          ok: true,
          reason: "already_verified",
          message: "✅ You are already verified.",
        };
      }
    }

    await member.roles.add(verifiedRole, "Kyro Verification");

    try {
      clearVerificationKick(member.guild.id, member.id);
    } catch (error) {
      console.error("clearVerificationKick error:", error);
    }

    await logVerification(member, config);

let message;

if (config?.mode === "reaction") {
  message = "✅ You have been verified successfully.";
} else {
  message = `✅ You have been verified and received the <@&${verifiedRole.id}> role.`;
}

return {
  ok: true,
  reason: "verified",
  message,
};
  } catch (error) {
    console.error("Give verified role error:", error);

    return {
      ok: false,
      reason: "role_add_failed",
      message: "❌ I couldn't give you the verified role. Please contact staff.",
    };
  }
}

module.exports = {
  logVerification,
  getVerifiedRole,
  isAlreadyVerified,
  giveVerifiedRole,
  getMinimumAccountAgeDays,
  meetsMinimumAccountAge,
  canBotManageVerifiedRole,
};