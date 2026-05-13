const { Events, EmbedBuilder } = require("discord.js");
const { getGuildConfig } = require("../database/guildConfigDb");

function parseVariables(text, member, config = {}) {
  if (!text) return "";

  return text
    .replace(/{user}/g, `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(
      /{rules}/g,
      config.rulesChannelId ? `<#${config.rulesChannelId}>` : "rules channel"
    )
    .replace(
      /{support}/g,
      config.supportChannelId ? `<#${config.supportChannelId}>` : "support channel"
    );
}

module.exports = (client) => {
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const guildId = member.guild.id;
      const guildConfig = await getGuildConfig(guildId);

      if (!guildConfig?.goodbye?.enabled) return;

      const config = guildConfig.goodbye;
      const embed = config.embed || {};
      const channelId = config.channelId;

      if (!channelId) return;

      const channel = member.guild.channels.cache.get(channelId);
      if (!channel) return;

      const title = embed.title
        ? parseVariables(embed.title, member, guildConfig)
        : `👋 Goodbye ${member.user.username}`;

      const description =
        embed.description || config.message
          ? parseVariables(
              embed.description || config.message,
              member,
              guildConfig
            )
          : `${member.user.username} left **${member.guild.name}**`;

      const goodbyeEmbed = new EmbedBuilder()
        .setColor(embed.color || "#ff4d4d")
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

      // Banner / GIF / Image
      if (embed.banner && embed.banner !== "") {
        goodbyeEmbed.setImage(embed.banner);
      }

     // Thumbnail logic
const thumbnailValue = embed.thumbnail;

if (
  thumbnailValue === false ||
  thumbnailValue === "false" ||
  thumbnailValue === null
) {
  // do not set thumbnail
} else if (
  typeof thumbnailValue === "string" &&
  thumbnailValue.trim() !== "" &&
  thumbnailValue !== "true"
) {
  goodbyeEmbed.setThumbnail(thumbnailValue);
} else {
  goodbyeEmbed.setThumbnail(
    member.user.displayAvatarURL({ dynamic: true })
  );
}
      // Footer
      if (embed.footer) {
        goodbyeEmbed.setFooter({
          text: parseVariables(embed.footer, member, guildConfig),
        });
      }

      await channel.send({ embeds: [goodbyeEmbed] });
    } catch (error) {
      console.error("Goodbye handler error:", error);
    }
  });
};