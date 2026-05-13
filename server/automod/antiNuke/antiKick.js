const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const isAntiNukeWhitelisted = require("./isAntiNukeWhitelisted");

const kickTracker = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async (member, config) => {
  try {
    const guild = member.guild;
    if (!guild) return;

    const settings = config?.security?.antiNuke;
    if (!settings?.enabled) return;
    if (!settings?.antiKick?.enabled) return;

    await sleep(1500);

    const logs = await guild
      .fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
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

    return targetId === member.id && Math.abs(now - createdAt) < 15000;
  }) ||
  logs.entries.find((auditEntry) => {
    return auditEntry.target?.id === member.id;
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
    const limit = Math.max(1, Number(settings.antiKick?.limit) || 3);

    const trackerKey = `${guild.id}:kick:${executorId}`;

    if (!kickTracker.has(trackerKey)) {
      kickTracker.set(trackerKey, []);
    }

    const timestamps = kickTracker.get(trackerKey);
    timestamps.push(now);

    const filtered = timestamps.filter((ts) => now - ts < timeWindowMs);
    kickTracker.set(trackerKey, filtered);


    if (filtered.length < limit) return;

    kickTracker.set(trackerKey, []);

    const punishment = String(settings.punishment || "quarantine").toLowerCase();
    const executorMember = await guild.members.fetch(executorId).catch(() => null);

    let actionResult = "Alert only";

    if (executorMember) {
      if (punishment === "kick") {
        if (executorMember.kickable) {
          await executorMember
            .kick("Kyro Anti-Nuke: Kick threshold reached")
            .catch(() => {});
          actionResult = "User was kicked";
        } else {
          actionResult = "Kick failed (user not kickable)";
        }
      } else if (punishment === "ban") {
        if (executorMember.bannable) {
          await executorMember
            .ban({
              deleteMessageSeconds: 0,
              reason: "Kyro Anti-Nuke: Kick threshold reached",
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
          const removableRoles = executorMember.roles.cache.filter((r) => {
            if (r.id === guild.id) return false;
            if (r.id === quarantineRole.id) return false;
            if (r.managed) return false;
            if (r.position >= me.roles.highest.position) return false;
            return true;
          });

          if (removableRoles.size > 0) {
            await executorMember.roles
              .remove(
                [...removableRoles.values()],
                "Kyro Anti-Nuke: stripping roles after mass kick detection"
              )
              .catch(() => {});
          }

          if (!executorMember.roles.cache.has(quarantineRole.id)) {
            await executorMember.roles
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
          value: "Anti Kick",
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
          name: "Kicks",
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
    console.error("Anti Kick error:", error);
  }
};