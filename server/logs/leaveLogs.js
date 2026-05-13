console.log("✅ leaveLogs.js loaded");

const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const { getGuildConfig } = require("../database/guildConfigDb");

module.exports = (client) => {
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const config = await getGuildConfig(member.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;
      if (!logsConfig?.memberLeave?.enabled) return;
      if (!logsConfig?.memberLeave?.channelId) return;

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

      if (wasKicked) return;

      const logChannel = await member.guild.channels
        .fetch(logsConfig.memberLeave.channelId)
        .catch(() => null);

      if (!logChannel || !logChannel.isTextBased()) return;

      const avatar =
        member.user?.displayAvatarURL({ dynamic: true }) ||
        member.guild.iconURL({ dynamic: true });

      const embed = new EmbedBuilder()
        .setColor(logsConfig.memberLeave.color || "#ED4245")
        .setTitle("🚪 User Left")
        .setAuthor({
          name: member.user?.tag || "Unknown User",
          iconURL: avatar || undefined,
        })
        .setThumbnail(avatar || null)
        .addFields(
          { name: "User", value: `<@${member.id}>`, inline: true },
          { name: "User ID", value: member.id, inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[LEAVE LOG ERROR]", error);
    }
  });
};