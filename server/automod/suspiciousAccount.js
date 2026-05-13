const { EmbedBuilder } = require("discord.js");
const GuildConfig = require("../models/GuildConfig");
const punish = require("./punishments");

module.exports = async (member, passedConfig = null) => {
  try {
    const guild = member.guild;
    const guildId = guild.id;
    const user = member.user;

    let dbConfig = null;

    try {
      dbConfig = await GuildConfig.findOne({ guildId }).lean();
    } catch (dbError) {
      console.error("Suspicious account DB fetch error:", dbError);
    }

    const settings =
      dbConfig?.security?.suspiciousAccount ||
      passedConfig?.security?.suspiciousAccount ||
      passedConfig?.suspiciousAccounts ||
      null;

    if (!settings?.enabled) return;

    const accountAgeMs = Date.now() - user.createdTimestamp;

    const minAgeMinutes =
      Number(settings.minAccountAgeMinutes) ||
      Number(settings.accountAgeMinutes) ||
      ((Number(settings.accountAgeDays) || 7) * 24 * 60);

    const minAgeMs = minAgeMinutes * 60 * 1000;

    const checkDefaultAvatar =
      settings.checkDefaultAvatar === true ||
      settings.detectDefaultAvatar === true;

    const hasDefaultAvatar = user.avatar === null;

    const isTooNew = accountAgeMs < minAgeMs;
    const isSuspicious =
      isTooNew || (checkDefaultAvatar && hasDefaultAvatar);

    if (!isSuspicious) return;

    const action = String(settings.action || "alert").toLowerCase();

    const pingRoleIds = Array.isArray(settings.pingRoleIds)
      ? settings.pingRoleIds.filter((id) => typeof id === "string" && id)
      : [];

    const legacyMentionRoleId =
      settings.mentionRoleEnabled && settings.mentionRoleId
        ? settings.mentionRoleId
        : settings.mentionRole && settings.roleId
        ? settings.roleId
        : "";

    const allPingRoleIds = [
      ...new Set([...pingRoleIds, legacyMentionRoleId].filter(Boolean)),
    ];

    const rolePing =
      allPingRoleIds.length > 0
        ? allPingRoleIds.map((roleId) => `<@&${roleId}>`).join(" ")
        : "";

    const alertChannelId = settings.alertChannelId || "";
    const quarantineRoleId =
      settings.quarantineRoleId ||
      settings.quarantineRole ||
      "";

    const alertChannel = alertChannelId
      ? guild.channels.cache.get(alertChannelId)
      : null;

    const accountAgeMinutes = Math.floor(accountAgeMs / 60000);
    const accountAgeHours = Math.floor(accountAgeMs / (1000 * 60 * 60));
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    const reasons = [];
    if (isTooNew) {
      reasons.push(
        `Account age below threshold (${accountAgeMinutes} minutes old)`
      );
    }
    if (checkDefaultAvatar && hasDefaultAvatar) {
      reasons.push("User is using the default Discord avatar");
    }

    let actionResult = "Alert sent only";

    if (action === "kick") {
      if (member.kickable) {
        await member.kick("Kyro Suspicious Account Detection");
        actionResult = "User was kicked";
      } else {
        actionResult = "Kick failed (user not kickable)";
      }
    } else if (action === "ban") {
      if (member.bannable) {
        const deleteMessageSeconds =
          Number(settings.banDeleteMessageSeconds) ||
          Number(settings.banDeleteSeconds) ||
          0;

        await member.ban({
          deleteMessageSeconds,
          reason: "Kyro Suspicious Account Detection",
        });

        actionResult = "User was banned";
      } else {
        actionResult = "Ban failed (user not bannable)";
      }
    } else if (action === "quarantine") {
      if (quarantineRoleId) {
        const quarantineRole = guild.roles.cache.get(quarantineRoleId);

        if (quarantineRole) {
          const botHighestRolePosition =
            guild.members.me?.roles?.highest?.position || 0;

          const buildProtectedRoleIds = (targetMember) => {
            const protectedIds = targetMember.roles.cache
              .filter((role) => {
                if (role.id === guild.id) return true; // keep @everyone
                if (role.managed) return true; // keep managed roles
                if (role.position >= botHighestRolePosition) return true; // keep roles bot cannot manage
                return false;
              })
              .map((role) => role.id);

            // always include quarantine role
            return [...new Set([...protectedIds, quarantineRole.id])];
          };

          const removableRolesNow = member.roles.cache.filter((role) => {
            if (role.id === guild.id) return false;
            if (role.id === quarantineRole.id) return false;
            if (role.managed) return false;
            if (role.position >= botHighestRolePosition) return false;
            return true;
          });

          const removedCount = removableRolesNow.size;

          const firstPassRoleIds = buildProtectedRoleIds(member);

          await member.roles.set(
            firstPassRoleIds,
            "Kyro Suspicious Account Detection - quarantine role applied"
          );

          actionResult = `User was quarantined and stripped to only ${quarantineRole.name}${
            removedCount ? ` (${removedCount} removable role(s) cleared)` : ""
          }`;

          // Second pass: catch any role that gets re-added right after quarantine
          setTimeout(async () => {
            try {
              const freshMember = await guild.members
                .fetch(member.id)
                .catch(() => null);
              if (!freshMember) return;

              const secondPassRoleIds = buildProtectedRoleIds(freshMember);

              await freshMember.roles
                .set(
                  secondPassRoleIds,
                  "Kyro Suspicious Account Detection - quarantine enforcement pass"
                )
                .catch(() => {});
            } catch (error) {
              console.error("Suspicious quarantine second-pass error:", error);
            }
          }, 2000);
        } else {
          actionResult = "Quarantine failed (role not found)";
        }
      } else {
        actionResult = "Quarantine failed (no quarantine role set)";
      }
    }

    const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
    const joinTimestamp = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setTitle("⚠ Suspicious Account Detected")
      .setColor(0xffa500)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "User",
          value: `${member} | \`${member.user.tag}\``,
          inline: false,
        },
        {
          name: "Account Created",
          value: `<t:${createdTimestamp}:F>`,
          inline: false,
        },
        {
          name: "Join Time",
          value: `<t:${joinTimestamp}:R>`,
          inline: false,
        },
        {
          name: "Account Age",
          value: `${accountAgeMinutes} minutes | ${accountAgeHours} hours | ${accountAgeDays} days`,
          inline: false,
        },
        {
          name: "Action",
          value: actionResult,
          inline: false,
        },
        {
          name: "Reasons",
          value: reasons.join("\n") || "No reason detected",
          inline: false,
        }
      )
      .setTimestamp();

    if (alertChannel) {
      await alertChannel
        .send({
          content: rolePing || undefined,
          embeds: [embed],
        })
        .catch(() => {});
    }

    try {
      await punish(
        {
          guild,
          author: user,
          member,
          channel: alertChannel || null,
        },
        "strike",
        null,
        "suspiciousAccount"
      );
    } catch (err) {
      console.log("Suspicious account punish error:", err);
    }
  } catch (error) {
    console.error("Suspicious account detection error:", error);
  }
};