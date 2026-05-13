const { EmbedBuilder } = require("discord.js");
const GuildConfig = require("../models/GuildConfig");

async function getJailLogChannel(guild) {
  const config = await GuildConfig.findOne({ guildId: guild.id }).lean();

  const channelId =
    config?.jail?.logChannelId ||
    process.env.JAIL_LOG_CHANNEL_ID;

  if (!channelId) return null;

  return guild.channels.cache.get(channelId) || null;
}

async function sendJailLog({ guild, member, moderator, reason, duration }) {
const channel = await getJailLogChannel(guild);
if (!channel) return;

  const userAvatar = member.user.displayAvatarURL({
    dynamic: true,
    size: 512,
  });

  const modAvatar = moderator
    ? moderator.displayAvatarURL({ dynamic: true, size: 512 })
    : null;

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("🔒 Member Jailed")

    // 👤 Jailed user avatar (BIG IMAGE)
    .setThumbnail(userAvatar)

    // 👮 Moderator avatar + name
    .setAuthor({
      name: moderator ? moderator.tag : "System",
      iconURL: modAvatar,
    })

    .addFields(
      { name: "User", value: `<@${member.id}>`, inline: true },
      {
        name: "Moderator",
        value: moderator ? `<@${moderator.id}>` : "System",
        inline: true,
      },
      {
        name: "Reason",
        value: reason || "No reason provided",
        inline: false,
      },
      {
        name: "Duration",
        value: duration ? `${duration} minutes` : "Permanent",
        inline: false,
      }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function sendUnjailLog({ guild, member, moderator }) {
const channel = await getJailLogChannel(guild);
if (!channel) return;

  const userAvatar = member.user.displayAvatarURL({
    dynamic: true,
    size: 512,
  });

  const modAvatar = moderator
    ? moderator.displayAvatarURL({ dynamic: true, size: 512 })
    : null;

  const embed = new EmbedBuilder()
    .setColor(0x00ff99)
    .setTitle("🔓 Member Unjailed")

    // 👤 User avatar
    .setThumbnail(userAvatar)

    // 👮 Moderator avatar
    .setAuthor({
      name: moderator ? moderator.tag : "System",
      iconURL: modAvatar,
    })

    .addFields(
      { name: "User", value: `<@${member.id}>`, inline: true },
      {
        name: "Moderator",
        value: moderator ? `<@${moderator.id}>` : "System",
        inline: true,
      }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = {
  sendJailLog,
  sendUnjailLog,
};
