console.log("✅ joinLogs.js loaded");

const { EmbedBuilder, Events } = require("discord.js");
const { getGuildConfig } = require("../database/guildConfigDb");

module.exports = (client) => {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const config = await getGuildConfig(member.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;
      if (!logsConfig?.memberJoin?.enabled) return;
      if (!logsConfig?.memberJoin?.channelId) return;

      const logChannel = await member.guild.channels
        .fetch(logsConfig.memberJoin.channelId)
        .catch(() => null);

      if (!logChannel || !logChannel.isTextBased()) return;

      const createdAt = Math.floor(member.user.createdTimestamp / 1000);
      const accountAgeDays = Math.floor(
        (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24)
      );

      const embed = new EmbedBuilder()
        .setColor(logsConfig.memberJoin.color || "#57F287")
        .setTitle("📥 User Joined")
        .setAuthor({
          name: member.user.tag,
          iconURL: member.user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User", value: `<@${member.id}>`, inline: true },
          { name: "User ID", value: member.id, inline: true },
          {
            name: "Account Created",
            value: `<t:${createdAt}:F>\n(<t:${createdAt}:R>)`,
          },
          {
            name: "Account Age",
            value: `${accountAgeDays} days`,
            inline: true,
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[JOIN LOG ERROR]", error);
    }
  });
};