const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const isAntiNukeWhitelisted = require("./isAntiNukeWhitelisted");

const banTracker = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async (guildBan, config) => {
  try {
    const guild = guildBan.guild;
    if (!guild) return;

    const settings = config?.security?.antiNuke;
    if (!settings?.enabled) return;
    if (!settings?.antiBan?.enabled) return;

    await sleep(1500);

    const logs = await guild
      .fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 6,
      })
      .catch(() => null);

    if (!logs) {
      return;
    }

    const now = Date.now();

 const entry =
  logs.entries.find((auditEntry) => {
    const targetId = auditEntry.target?.id;
    const createdAt = auditEntry.createdTimestamp || 0;

    return (
      targetId === guildBan.user.id &&
      Math.abs(now - createdAt) < 15000
    );
  }) ||
  logs.entries.find((auditEntry) => {
    return auditEntry.target?.id === guildBan.user.id;
  });

    if (!entry) {
      return;
    }

    const executor = entry.executor;
    const executorId = executor?.id;

    if (!executorId) return;

    const ownerId = guild.ownerId;
    const me = guild.members.me;
    if (!me) return;

    if (executorId === ownerId) return;
    if (executorId === me.id) return;

    const isWhitelisted = await isAntiNukeWhitelisted(guild, executorId, config);
    if (isWhitelisted) {
      return;
    }

    const timeWindowMs = Math.max(1000, Number(settings.timeframe) || 10000);
    const timeWindowSeconds = Math.floor(timeWindowMs / 1000);
    const limit = Math.max(1, Number(settings.antiBan?.limit) || 2);

    const trackerKey = `${guild.id}:ban:${executorId}`;

    if (!banTracker.has(trackerKey)) {
      banTracker.set(trackerKey, []);
    }

    const timestamps = banTracker.get(trackerKey);
    timestamps.push(now);

    const filtered = timestamps.filter((ts) => now - ts < timeWindowMs);
    banTracker.set(trackerKey, filtered);


    if (filtered.length < limit) return;

    banTracker.set(trackerKey, []);

    const punishment = String(settings.punishment || "quarantine").toLowerCase();
    const member = await guild.members.fetch(executorId).catch(() => null);

    let actionResult = "Alert only";

    if (member) {
      if (punishment === "kick") {
        if (member.kickable) {
          await member
            .kick("Kyro Anti-Nuke: Ban threshold reached")
            .catch(() => {});
          actionResult = "User was kicked";
        } else {
          actionResult = "Kick failed (user not kickable)";
        }
      } else if (punishment === "ban") {
        if (member.bannable) {
          await member
            .ban({
              deleteMessageSeconds: 0,
              reason: "Kyro Anti-Nuke: Ban threshold reached",
            })
            .catch(() => {});
          actionResult = "User was banned";
        } else {
          actionResult = "Ban failed (user not bannable)";
        }
      } else if (punishment === "quarantine") {
        const quarantineRoleId = settings.quarantineRole;
        const quarantineRole = quarantineRoleId
          ? guild.roles.cache.get(quarantineRoleId) ||
            (await guild.roles.fetch(quarantineRoleId).catch(() => null))
          : null;

        if (quarantineRole) {
          const removableRoles = member.roles.cache.filter((r) => {
            if (r.id === guild.id) return false;
            if (r.id === quarantineRole.id) return false;
            if (r.managed) return false;
            if (r.position >= me.roles.highest.position) return false;
            return true;
          });

          if (removableRoles.size > 0) {
            await member.roles
              .remove(
                [...removableRoles.values()],
                "Kyro Anti-Nuke: stripping roles after mass ban detection"
              )
              .catch(() => {});
          }

          if (!member.roles.cache.has(quarantineRole.id)) {
            await member.roles
              .add(
                quarantineRole,
                "Kyro Anti-Nuke: quarantine role applied"
              )
              .catch(() => {});
          }

          actionResult = `User was quarantined with <@&${quarantineRole.id}>`;
        } else {
          actionResult = "Quarantine failed (role not found)";
        }
      }
    } else {
      actionResult = "Punishment failed (executor not found in guild)";
    }

    let logChannel = null;
    if (settings.logChannel) {
      logChannel =
        guild.channels.cache.get(settings.logChannel) ||
        (await guild.channels.fetch(settings.logChannel).catch(() => null));
    }

    const executorAvatar =
      typeof executor?.displayAvatarURL === "function"
        ? executor.displayAvatarURL({ size: 256 })
        : null;

    const embed = new EmbedBuilder()
      .setTitle("🚨 Anti-Nuke Triggered")
      .setColor(0xff0000)
      .setThumbnail(executorAvatar)
      .addFields(
        {
          name: "Module",
          value: "Anti Ban",
          inline: false,
        },
        {
          name: "Executor",
          value: executor
            ? `<@${executorId}> | \`${executor.username}\``
            : `<@${executorId}>`,
          inline: false,
        },
        {
          name: "Executor ID",
          value: `\`${executorId}\``,
          inline: false,
        },
        {
          name: "Bans",
          value: `${filtered.length} in ${timeWindowSeconds} seconds`,
          inline: false,
        },
        {
          name: "Server",
          value: guild.name,
          inline: false,
        },
        {
          name: "Punishment",
          value: actionResult,
          inline: false,
        }
      )
      .setTimestamp();

    if (logChannel?.isTextBased?.()) {
      await logChannel
        .send({
          embeds: [embed],
        })
        .catch((err) => {
          console.error("Anti-Nuke alert send error:", err);
        });
    } else {
    }

  } catch (error) {
    console.error("Anti Ban error:", error);
  }
};