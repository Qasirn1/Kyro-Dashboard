console.log("✅ moderationLogs.js loaded");

const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const { getGuildConfig } = require("../database/guildConfigDb");

async function getLogChannel(guild, logConfig) {
  if (!logConfig?.enabled) return null;
  if (!logConfig?.channelId) return null;

  const channel = await guild.channels.fetch(logConfig.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;

  return channel;
}

module.exports = (client) => {
  /* ───────────── BAN / UNBAN (AUDIT LOG) ───────────── */
  client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
    try {
      if (
        ![
          AuditLogEvent.MemberBanAdd,
          AuditLogEvent.MemberBanRemove,
        ].includes(entry.action)
      ) {
        return;
      }

      const config = await getGuildConfig(guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const isBan = entry.action === AuditLogEvent.MemberBanAdd;
      const currentLogConfig = isBan
        ? logsConfig.memberBan
        : logsConfig.memberUnban;

      const logChannel = await getLogChannel(guild, currentLogConfig);
      if (!logChannel) return;

      const user = entry.target;
      if (!user) return;

      const embed = new EmbedBuilder()
        .setColor(currentLogConfig.color || (isBan ? "#ED4245" : "#57F287"))
        .setTitle(isBan ? "🔨 User Banned" : "♻️ User Unbanned")
        .setAuthor({
          name: entry.executor?.tag || "Unknown",
          iconURL: entry.executor?.displayAvatarURL({ dynamic: true }) || undefined,
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User", value: `<@${user.id}>`, inline: true },
          {
            name: isBan ? "Banned By" : "Unbanned By",
            value: entry.executor ? `<@${entry.executor.id}>` : "Unknown",
            inline: true,
          },
          {
            name: "Reason",
            value: entry.reason || "No reason provided",
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[BAN/UNBAN LOG ERROR]", error);
    }
  });

  /* ───────────── TIMEOUT / UNTIMEOUT ───────────── */
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
      if (
        oldMember.communicationDisabledUntilTimestamp ===
        newMember.communicationDisabledUntilTimestamp
      ) {
        return;
      }

      const config = await getGuildConfig(newMember.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const logChannel = await getLogChannel(newMember.guild, logsConfig.timeout);
      if (!logChannel) return;

      const timedOut = newMember.isCommunicationDisabled();

      const auditLogs = await newMember.guild
        .fetchAuditLogs({
          type: AuditLogEvent.MemberUpdate,
          limit: 1,
        })
        .catch(() => null);

      const entry = auditLogs?.entries?.first();

      const duration =
        timedOut && newMember.communicationDisabledUntil
          ? `<t:${Math.floor(
              newMember.communicationDisabledUntil.getTime() / 1000
            )}:R>`
          : "—";

      const embed = new EmbedBuilder()
        .setColor(logsConfig.timeout.color || "#5865F2")
        .setTitle(timedOut ? "⏳ User Timed Out" : "✅ Timeout Removed")
        .setAuthor({
          name: entry?.executor?.tag || "Unknown",
          iconURL: entry?.executor?.displayAvatarURL({ dynamic: true }) || undefined,
        })
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User", value: `<@${newMember.id}>`, inline: true },
          {
            name: "Moderator",
            value: entry?.executor ? `<@${entry.executor.id}>` : "Unknown",
            inline: true,
          },
          {
            name: "Duration",
            value: duration,
          },
          {
            name: "Reason",
            value: entry?.reason || "No reason provided",
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[TIMEOUT LOG ERROR]", error);
    }
  });

  /* ───────────── KICK ───────────── */
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const config = await getGuildConfig(member.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const logChannel = await getLogChannel(member.guild, logsConfig.memberKick);
      if (!logChannel) return;

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const auditLogs = await member.guild
        .fetchAuditLogs({
          type: AuditLogEvent.MemberKick,
          limit: 1,
        })
        .catch(() => null);

      const entry = auditLogs?.entries?.first();

      const wasKicked =
        entry &&
        entry.action === AuditLogEvent.MemberKick &&
        entry.target?.id === member.id &&
        entry.executor &&
        Date.now() - entry.createdTimestamp < 10000;

      if (!wasKicked) return;

      const embed = new EmbedBuilder()
        .setColor(logsConfig.memberKick.color || "#FAA61A")
        .setTitle("👢 User Kicked")
        .setAuthor({
          name: entry.executor?.tag || "Unknown",
          iconURL: entry.executor?.displayAvatarURL({ dynamic: true }) || undefined,
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User", value: `<@${member.id}>`, inline: true },
          {
            name: "Kicked By",
            value: entry.executor ? `<@${entry.executor.id}>` : "Unknown",
            inline: true,
          },
          {
            name: "Reason",
            value: entry.reason || "No reason provided",
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[KICK LOG ERROR]", error);
    }
  });
};