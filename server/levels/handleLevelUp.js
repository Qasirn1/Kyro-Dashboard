const { EmbedBuilder, ChannelType } = require("discord.js");

function parseVariables(text = "", { guild, member, oldLevel, newLevel, totalXP }) {
  return String(text || "")
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{mention}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{displayname}", member.displayName || member.user.username)
    .replaceAll("{server}", guild.name)
    .replaceAll("{guild}", guild.name)
    .replaceAll("{level}", String(newLevel))
    .replaceAll("{newLevel}", String(newLevel))
    .replaceAll("{oldLevel}", String(oldLevel))
    .replaceAll("{xp}", String(totalXP))
    .replaceAll("{totalxp}", String(totalXP));
}

module.exports = async function handleLevelUp({
  guild,
  member,
  oldLevel,
  newLevel,
  totalXP,
  config,
}) {
  try {
    if (!guild || !member) {
      return;
    }

    if (!config) {
      return;
    }

    if (newLevel <= oldLevel) return;

    const levelUpChannelId =
      config.levelUpChannelId ||
      config.levelUpChannel ||
      config.leveling?.levelUpChannelId ||
      config.leveling?.levelUpChannel ||
      null;

    if (!levelUpChannelId) {
      return;
    }

    let channel =
      guild.channels.cache.get(levelUpChannelId) ||
      (await guild.channels.fetch(levelUpChannelId).catch(() => null));

    if (!channel) {

      return;
    }

    const sendableTypes = [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
    ];

    if (!sendableTypes.includes(channel.type) || typeof channel.send !== "function") {
      return;
    }

    const me =
      guild.members.me ||
      (await guild.members.fetchMe().catch(() => null));

    if (!me) {
      return;
    }

    const perms = channel.permissionsFor(me);
    if (!perms?.has("ViewChannel") || !perms?.has("SendMessages")) {
      return;
    }

    const levelUpEmbed =
      config.levelUpEmbed ||
      config.leveling?.levelUpEmbed ||
      {};

    const embedEnabled =
      levelUpEmbed.enabled !== false;

    const rawLevelUpMessage =
      config.levelUpMessage ||
      config.leveling?.levelUpMessage ||
      "Congrats {user} You reached Level {level}!";

    const parsedLevelUpMessage = parseVariables(rawLevelUpMessage, {
      guild,
      member,
      oldLevel,
      newLevel,
      totalXP,
    });

    if (!embedEnabled) {
      await channel.send({ content: parsedLevelUpMessage });
      return;
    }

    const rawEmbedTitle = levelUpEmbed.title || "🎉 Level Up!";
    const embedTitle = parseVariables(rawEmbedTitle, {
      guild,
      member,
      oldLevel,
      newLevel,
      totalXP,
    });

    const embedColor = levelUpEmbed.color || "#7c5cff";

    const rawEmbedFooter =
      levelUpEmbed.footer || "Kyro Leveling System";

    const embedFooter = parseVariables(rawEmbedFooter, {
      guild,
      member,
      oldLevel,
      newLevel,
      totalXP,
    });

    const embedBanner = levelUpEmbed.banner || null;
    const embedThumbnailEnabled = levelUpEmbed.thumbnail !== false;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(embedTitle)
      .setDescription(parsedLevelUpMessage)
      .addFields({
        name: "Total XP",
        value: `${totalXP}`,
        inline: true,
      })
      .setTimestamp();

    if (embedFooter) {
      const guildIcon = guild.iconURL({ extension: "png", size: 256 }) || undefined;
      embed.setFooter({
        text: embedFooter,
        iconURL: guildIcon,
      });
    }

    if (embedThumbnailEnabled) {
      embed.setThumbnail(
        member.displayAvatarURL({ extension: "png", size: 256 })
      );
    }

    if (embedBanner) {
      embed.setImage(embedBanner);
    }

    await channel.send({ embeds: [embed] });

  } catch (error) {
    console.error("[LEVEL-UP] ❌ Failed to send level-up message:", error);
  }
};