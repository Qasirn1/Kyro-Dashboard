const { EmbedBuilder } = require("discord.js");

// 🔹 AUTOMOD IMPORT
const runAutomod = require("../automod/automodHandler");
const { getGuildConfig } = require("../database/guildConfigDb");

function trimText(text, max = 1024) {
  if (!text) return "*Message not cached*";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

module.exports = (client) => {
  // ───────────────────── MESSAGE CREATE (AUTOMOD) ─────────────────────
  client.on("messageCreate", async (message) => {
    try {
      if (!message.guild) return;
      if (!message.author || message.author.bot) return;

      await runAutomod(message);
    } catch (err) {
      console.error("AUTOMOD ERROR:", err);
    }
  });

  // ───────────────────── MESSAGE DELETE LOG ─────────────────────
  client.on("messageDelete", async (message) => {
    try {
      if (message.partial) {
        try {
          message = await message.fetch();
        } catch {
          return;
        }
      }

      if (!message.guild) return;
      if (!message.author || message.author.bot) return;

      const config = await getGuildConfig(message.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;
      if (!logsConfig?.messageDelete?.enabled) return;
      if (!logsConfig?.messageDelete?.channelId) return;

      const logChannel = await message.guild.channels
        .fetch(logsConfig.messageDelete.channelId)
        .catch(() => null);

      if (!logChannel || !logChannel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(logsConfig.messageDelete.color || "#ED4245")
        .setTitle("🗑 Message Deleted")
        .setThumbnail(
          message.author.displayAvatarURL({ dynamic: true, size: 256 })
        )
        .addFields(
          { name: "User", value: `<@${message.author.id}>`, inline: true },
          { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
          {
            name: "Message",
            value: trimText(message.content),
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("MESSAGE DELETE LOG ERROR:", err);
    }
  });

  // ───────────────────── MESSAGE EDIT LOG ─────────────────────
  client.on("messageUpdate", async (oldMessage, newMessage) => {
    try {
      if (oldMessage.partial) {
        try {
          oldMessage = await oldMessage.fetch();
        } catch {}
      }

      if (newMessage.partial) {
        try {
          newMessage = await newMessage.fetch();
        } catch {}
      }

      if (!newMessage.guild) return;
      if (!newMessage.author || newMessage.author.bot) return;
      if (oldMessage.content === newMessage.content) return;

      const config = await getGuildConfig(newMessage.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;
      if (!logsConfig?.messageEdit?.enabled) return;
      if (!logsConfig?.messageEdit?.channelId) return;

      const logChannel = await newMessage.guild.channels
        .fetch(logsConfig.messageEdit.channelId)
        .catch(() => null);

      if (!logChannel || !logChannel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(logsConfig.messageEdit.color || "#FEE75C")
        .setTitle("✏ Message Edited")
        .setThumbnail(
          newMessage.author.displayAvatarURL({ dynamic: true, size: 256 })
        )
        .addFields(
          { name: "User", value: `<@${newMessage.author.id}>`, inline: true },
          { name: "Channel", value: `<#${newMessage.channel.id}>`, inline: true },
          {
            name: "Before",
            value: trimText(oldMessage.content),
          },
          {
            name: "After",
            value: trimText(newMessage.content),
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("MESSAGE EDIT LOG ERROR:", err);
    }
  });
};