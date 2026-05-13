const GuildConfig = require("../models/GuildConfig");

async function fetchSelfRolesConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.selfRoles || null;
  } catch (error) {
    console.error(
      "[SelfRoles] Failed to fetch self roles config from Mongo:",
      error.message
    );
    return null;
  }
}

function getPanelById(selfRoles, panelId) {
  return (selfRoles?.panels || []).find(
    (panel) => panel.id === panelId && panel.enabled !== false
  );
}

function getOptionById(panel, optionId) {
  return (panel?.options || []).find((option) => option.id === optionId);
}

async function removeOtherPanelRoles(member, panel, selectedRoleId) {
  for (const option of panel.options || []) {
    if (!option.roleId) continue;
    if (option.roleId === selectedRoleId) continue;
    if (!member.roles.cache.has(option.roleId)) continue;

    try {
      await member.roles.remove(option.roleId);
    } catch (error) {
      console.error(
        `[SelfRoles] Failed removing old single-mode role ${option.roleId}:`,
        error.message
      );
    }
  }
}

function canBotManageRole(guild, role) {
  if (!guild?.members?.me || !role) return false;
  return guild.members.me.roles.highest.position > role.position;
}

module.exports = async (interaction) => {
  if (!interaction.guild || !interaction.member) return;

  const guildId = interaction.guild.id;
  const member = interaction.member;

  // ───────────────────────────────────────────────────────────
  // BUTTON SELF ROLES
  // customId = selfrole_btn:<panelId>:<optionId>
  // ───────────────────────────────────────────────────────────
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("selfrole_btn:")
  ) {
    const parts = interaction.customId.split(":");
    const panelId = parts[1];
    const optionId = parts[2];

    if (!panelId || !optionId) return;

    const selfRoles = await fetchSelfRolesConfig(guildId);
    if (!selfRoles?.enabled) {
      return interaction
        .reply({
          content: "❌ Self roles system is disabled.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    const panel = getPanelById(selfRoles, panelId);
    if (!panel || panel.type !== "buttons") {
      return interaction
        .reply({
          content: "❌ This self-role panel is no longer available.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    const option = getOptionById(panel, optionId);
    if (!option?.roleId) {
      return interaction
        .reply({
          content: "❌ That role option is invalid.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    const role = interaction.guild.roles.cache.get(option.roleId);
    if (!role) {
      return interaction
        .reply({
          content: "❌ That role no longer exists.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    if (!canBotManageRole(interaction.guild, role)) {
      return interaction
        .reply({
          content:
            "❌ I cannot assign that role. Move my bot role above it in role hierarchy.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    try {
      const alreadyHasRole = member.roles.cache.has(role.id);

      if (panel.selectionMode === "single" && !alreadyHasRole) {
        await removeOtherPanelRoles(member, panel, role.id);
      }

      if (alreadyHasRole) {
        await member.roles.remove(role.id);

        return interaction
          .reply({
            content: `Removed the ${role} role.`,
            ephemeral: true,
          })
          .catch(() => {});
      }

      await member.roles.add(role.id);

      return interaction
        .reply({
          content: `Gave you the ${role} role.`,
          ephemeral: true,
        })
        .catch(() => {});
    } catch (error) {
      console.error("[SelfRoles] Button role error:", error);

      return interaction
        .reply({
          content: "❌ Failed to update your roles.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }

  // ───────────────────────────────────────────────────────────
  // DROPDOWN SELF ROLES
  // customId = selfrole_select:<panelId>
  // value = option.id
  // ───────────────────────────────────────────────────────────
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("selfrole_select:")
  ) {
    const parts = interaction.customId.split(":");
    const panelId = parts[1];

    if (!panelId) return;

    const selfRoles = await fetchSelfRolesConfig(guildId);
    if (!selfRoles?.enabled) {
      return interaction
        .reply({
          content: "❌ Self roles system is disabled.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    const panel = getPanelById(selfRoles, panelId);
    if (!panel || panel.type !== "dropdown") {
      return interaction
        .reply({
          content: "❌ This dropdown panel is no longer available.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    const selectedOptionIds = interaction.values || [];
    const selectedOptions = (panel.options || []).filter((option) =>
      selectedOptionIds.includes(option.id)
    );

    try {
      const addedRoles = [];
      const removedRoles = [];

      if (panel.selectionMode === "single") {
        const selectedOption = selectedOptions[0];

        if (!selectedOption?.roleId) {
          return interaction
            .reply({
              content: "❌ Invalid role selection.",
              ephemeral: true,
            })
            .catch(() => {});
        }

        const selectedRole = interaction.guild.roles.cache.get(
          selectedOption.roleId
        );

        if (!selectedRole) {
          return interaction
            .reply({
              content: "❌ That role no longer exists.",
              ephemeral: true,
            })
            .catch(() => {});
        }

        if (!canBotManageRole(interaction.guild, selectedRole)) {
          return interaction
            .reply({
              content:
                "❌ I cannot assign that role. Move my bot role above it in role hierarchy.",
              ephemeral: true,
            })
            .catch(() => {});
        }

        for (const option of panel.options || []) {
          if (!option.roleId) continue;

          const role = interaction.guild.roles.cache.get(option.roleId);
          if (!role) continue;

          const hasRole = member.roles.cache.has(role.id);

          if (role.id === selectedRole.id) {
            if (!hasRole) {
              await member.roles.add(role.id);
              addedRoles.push(`<@&${role.id}>`);
            }
          } else if (hasRole) {
            await member.roles.remove(role.id);
            removedRoles.push(`<@&${role.id}>`);
          }
        }
      } else {
        for (const option of panel.options || []) {
          if (!option.roleId) continue;

          const role = interaction.guild.roles.cache.get(option.roleId);
          if (!role) continue;
          if (!canBotManageRole(interaction.guild, role)) continue;

          const hasRole = member.roles.cache.has(role.id);
          const selected = selectedOptionIds.includes(option.id);

          if (selected && !hasRole) {
            await member.roles.add(role.id);
            addedRoles.push(`<@&${role.id}>`);
          }

          if (!selected && hasRole) {
            await member.roles.remove(role.id);
            removedRoles.push(`<@&${role.id}>`);
          }
        }
      }

      if (addedRoles.length && removedRoles.length) {
        return interaction
          .reply({
            content: `Updated your roles. Added: **${addedRoles.join(
              ", "
            )}** | Removed: **${removedRoles.join(", ")}**`,
            ephemeral: true,
          })
          .catch(() => {});
      }

      if (addedRoles.length) {
        return interaction
          .reply({
            content: `Gave you: **${addedRoles.join(", ")}**.`,
            ephemeral: true,
          })
          .catch(() => {});
      }

      if (removedRoles.length) {
        return interaction
          .reply({
            content: `Removed: **${removedRoles.join(", ")}**.`,
            ephemeral: true,
          })
          .catch(() => {});
      }

      return interaction
        .reply({
          content: "No role changes.",
          ephemeral: true,
        })
        .catch(() => {});
    } catch (error) {
      console.error("[SelfRoles] Dropdown role error:", error);

      return interaction
        .reply({
          content: "❌ Failed to update roles.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
};