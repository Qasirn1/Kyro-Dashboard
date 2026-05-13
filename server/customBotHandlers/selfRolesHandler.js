const GuildConfig = require("../models/GuildConfig");

async function fetchSelfRolesConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.selfRoles || null;
  } catch (error) {
    console.error(
      "[CustomBot SelfRoles] Failed to fetch config from Mongo:",
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
        `[CustomBot SelfRoles] Failed removing old single-mode role ${option.roleId}:`,
        error.message
      );
    }
  }
}

function canBotManageRole(guild, role) {
  if (!guild?.members?.me || !role) return false;
  return guild.members.me.roles.highest.position > role.position;
}

async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(payload).catch(() => {});
    }

    return interaction.reply(payload).catch(() => {});
  } catch {
    return null;
  }
}

module.exports = async function handleSelfRoles(interaction) {
  if (!interaction.guild || !interaction.member) return false;

  const guildId = interaction.guild.id;
  const member = interaction.member;

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("selfrole_btn:")
  ) {
    const parts = interaction.customId.split(":");
    const panelId = parts[1];
    const optionId = parts[2];

    if (!panelId || !optionId) return false;

    const selfRoles = await fetchSelfRolesConfig(guildId);
    if (!selfRoles?.enabled) {
      await safeReply(interaction, {
        content: "❌ Self roles system is disabled.",
        ephemeral: true,
      });
      return true;
    }

    const panel = getPanelById(selfRoles, panelId);
    if (!panel || panel.type !== "buttons") {
      await safeReply(interaction, {
        content: "❌ This self-role panel is no longer available.",
        ephemeral: true,
      });
      return true;
    }

    const option = getOptionById(panel, optionId);
    if (!option?.roleId) {
      await safeReply(interaction, {
        content: "❌ That role option is invalid.",
        ephemeral: true,
      });
      return true;
    }

    const role = interaction.guild.roles.cache.get(option.roleId);
    if (!role) {
      await safeReply(interaction, {
        content: "❌ That role no longer exists.",
        ephemeral: true,
      });
      return true;
    }

    if (!canBotManageRole(interaction.guild, role)) {
      await safeReply(interaction, {
        content:
          "❌ I cannot assign that role. Move my bot role above it in role hierarchy.",
        ephemeral: true,
      });
      return true;
    }

    try {
      const alreadyHasRole = member.roles.cache.has(role.id);

      if (panel.selectionMode === "single" && !alreadyHasRole) {
        await removeOtherPanelRoles(member, panel, role.id);
      }

      if (alreadyHasRole) {
        await member.roles.remove(role.id);

        await safeReply(interaction, {
          content: `Removed the ${role} role.`,
          ephemeral: true,
        });

        return true;
      }

      await member.roles.add(role.id);

      await safeReply(interaction, {
        content: `Gave you the ${role} role.`,
        ephemeral: true,
      });

      return true;
    } catch (error) {
      console.error("[CustomBot SelfRoles] Button role error:", error);

      await safeReply(interaction, {
        content: "❌ Failed to update your roles.",
        ephemeral: true,
      });

      return true;
    }
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("selfrole_select:")
  ) {
    const parts = interaction.customId.split(":");
    const panelId = parts[1];

    if (!panelId) return false;

    const selfRoles = await fetchSelfRolesConfig(guildId);
    if (!selfRoles?.enabled) {
      await safeReply(interaction, {
        content: "❌ Self roles system is disabled.",
        ephemeral: true,
      });
      return true;
    }

    const panel = getPanelById(selfRoles, panelId);
    if (!panel || panel.type !== "dropdown") {
      await safeReply(interaction, {
        content: "❌ This dropdown panel is no longer available.",
        ephemeral: true,
      });
      return true;
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
          await safeReply(interaction, {
            content: "❌ Invalid role selection.",
            ephemeral: true,
          });
          return true;
        }

        const selectedRole = interaction.guild.roles.cache.get(
          selectedOption.roleId
        );

        if (!selectedRole) {
          await safeReply(interaction, {
            content: "❌ That role no longer exists.",
            ephemeral: true,
          });
          return true;
        }

        if (!canBotManageRole(interaction.guild, selectedRole)) {
          await safeReply(interaction, {
            content:
              "❌ I cannot assign that role. Move my bot role above it in role hierarchy.",
            ephemeral: true,
          });
          return true;
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
        await safeReply(interaction, {
          content: `Updated your roles. Added: **${addedRoles.join(
            ", "
          )}** | Removed: **${removedRoles.join(", ")}**`,
          ephemeral: true,
        });
        return true;
      }

      if (addedRoles.length) {
        await safeReply(interaction, {
          content: `Gave you: **${addedRoles.join(", ")}**.`,
          ephemeral: true,
        });
        return true;
      }

      if (removedRoles.length) {
        await safeReply(interaction, {
          content: `Removed: **${removedRoles.join(", ")}**.`,
          ephemeral: true,
        });
        return true;
      }

      await safeReply(interaction, {
        content: "No role changes.",
        ephemeral: true,
      });

      return true;
    } catch (error) {
      console.error("[CustomBot SelfRoles] Dropdown role error:", error);

      await safeReply(interaction, {
        content: "❌ Failed to update roles.",
        ephemeral: true,
      });

      return true;
    }
  }

  return false;
};