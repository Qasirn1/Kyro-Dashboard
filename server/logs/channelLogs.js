console.log("✅ channelLogs.js loaded");

const {
  EmbedBuilder,
  Events,
  AuditLogEvent,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { getGuildConfig } = require("../database/guildConfigDb");

function channelTypeName(type) {
  return ChannelType[type] ?? "Unknown";
}

async function getLogChannel(guild, logConfig) {
  if (!logConfig?.enabled) return null;
  if (!logConfig?.channelId) return null;

  const channel = await guild.channels.fetch(logConfig.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;

  return channel;
}

function toNicePermissionName(permission) {
  return permission
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Guild/g, "Server ")
    .replace(/TTS/g, "TTS")
    .replace(/UseVAD/g, "Use VAD")
    .replace(/Everyone/g, "@everyone");
}

function formatPermissionList(list) {
  if (!list.length) return "None";
  return list.map((perm) => `• ${toNicePermissionName(perm)}`).join("\n");
}

function getOverwriteTargetLabel(guild, overwriteId) {
  const role = guild.roles.cache.get(overwriteId);
  if (role) return `<@&${role.id}>`;

  const member = guild.members.cache.get(overwriteId);
  if (member) return `<@${member.id}>`;

  return overwriteId;
}

function getPermissionDiff(oldOverwrite, newOverwrite) {
  const oldAllow = oldOverwrite?.allow?.toArray?.() || [];
  const oldDeny = oldOverwrite?.deny?.toArray?.() || [];
  const newAllow = newOverwrite?.allow?.toArray?.() || [];
  const newDeny = newOverwrite?.deny?.toArray?.() || [];

  const allowedAdded = newAllow.filter((perm) => !oldAllow.includes(perm));
  const allowedRemoved = oldAllow.filter((perm) => !newAllow.includes(perm));
  const deniedAdded = newDeny.filter((perm) => !oldDeny.includes(perm));
  const deniedRemoved = oldDeny.filter((perm) => !newDeny.includes(perm));

  return {
    allowedAdded,
    allowedRemoved,
    deniedAdded,
    deniedRemoved,
    hasChanges:
      allowedAdded.length > 0 ||
      allowedRemoved.length > 0 ||
      deniedAdded.length > 0 ||
      deniedRemoved.length > 0,
  };
}

function buildPermissionChangeLines(diff) {
  const lines = [];

  if (diff.allowedAdded.length) {
    lines.push(`**Allowed Added**\n${formatPermissionList(diff.allowedAdded)}`);
  }

  if (diff.allowedRemoved.length) {
    lines.push(`**Allowed Removed**\n${formatPermissionList(diff.allowedRemoved)}`);
  }

  if (diff.deniedAdded.length) {
    lines.push(`**Denied Added**\n${formatPermissionList(diff.deniedAdded)}`);
  }

  if (diff.deniedRemoved.length) {
    lines.push(`**Denied Removed**\n${formatPermissionList(diff.deniedRemoved)}`);
  }

  return lines;
}

function splitTextIntoChunks(text, maxLength = 1024) {
  if (!text || text.length <= maxLength) return [text || "None"];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let sliceIndex = remaining.lastIndexOf("\n", maxLength);
    if (sliceIndex <= 0) sliceIndex = maxLength;

    chunks.push(remaining.slice(0, sliceIndex));
    remaining = remaining.slice(sliceIndex).trimStart();
  }

  if (remaining.length) chunks.push(remaining);

  return chunks;
}

module.exports = (client) => {
  /* ───────────── CHANNEL CREATE ───────────── */
  client.on(Events.ChannelCreate, async (channel) => {
    try {
      if (!channel.guild) return;

      const config = await getGuildConfig(channel.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const logChannel = await getLogChannel(channel.guild, logsConfig.channelCreate);
      if (!logChannel) return;

      const auditLogs = await channel.guild
        .fetchAuditLogs({
          type: AuditLogEvent.ChannelCreate,
          limit: 1,
        })
        .catch(() => null);

      const entry = auditLogs?.entries?.first();

      const embed = new EmbedBuilder()
        .setColor(logsConfig.channelCreate.color || "#57F287")
        .setTitle("🆕 Channel Created")
        .setAuthor({
          name: entry?.executor?.tag || "Unknown",
          iconURL: entry?.executor?.displayAvatarURL({ dynamic: true }) || undefined,
        })
        .setThumbnail(entry?.executor?.displayAvatarURL({ dynamic: true }) || null)
        .addFields(
          { name: "Channel", value: channel.toString(), inline: true },
          { name: "Type", value: channelTypeName(channel.type), inline: true },
          {
            name: "Created By",
            value: entry?.executor ? `<@${entry.executor.id}>` : "Unknown",
            inline: true,
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[CHANNEL CREATE LOG ERROR]", error);
    }
  });

  /* ───────────── CHANNEL DELETE ───────────── */
  client.on(Events.ChannelDelete, async (channel) => {
    try {
      if (!channel.guild) return;

      const config = await getGuildConfig(channel.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const logChannel = await getLogChannel(channel.guild, logsConfig.channelDelete);
      if (!logChannel) return;

      const auditLogs = await channel.guild
        .fetchAuditLogs({
          type: AuditLogEvent.ChannelDelete,
          limit: 1,
        })
        .catch(() => null);

      const entry = auditLogs?.entries?.first();

      const embed = new EmbedBuilder()
        .setColor(logsConfig.channelDelete.color || "#ED4245")
        .setTitle("🗑 Channel Deleted")
        .setAuthor({
          name: entry?.executor?.tag || "Unknown",
          iconURL: entry?.executor?.displayAvatarURL({ dynamic: true }) || undefined,
        })
        .setThumbnail(entry?.executor?.displayAvatarURL({ dynamic: true }) || null)
        .addFields(
          { name: "Channel", value: `#${channel.name}`, inline: true },
          { name: "Type", value: channelTypeName(channel.type), inline: true },
          {
            name: "Deleted By",
            value: entry?.executor ? `<@${entry.executor.id}>` : "Unknown",
            inline: true,
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[CHANNEL DELETE LOG ERROR]", error);
    }
  });

  /* ───────────── CHANNEL UPDATE + PERMISSION UPDATE ───────────── */
  client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    try {
      if (!newChannel.guild) return;

      const config = await getGuildConfig(newChannel.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const normalLogChannel = await getLogChannel(
        newChannel.guild,
        logsConfig.channelUpdate
      );
      if (!normalLogChannel) return;

      const channelUpdateAuditLogs = await newChannel.guild
        .fetchAuditLogs({
          type: AuditLogEvent.ChannelUpdate,
          limit: 1,
        })
        .catch(() => null);

      const channelUpdateEntry = channelUpdateAuditLogs?.entries?.first();

      const normalChanges = [];

      if (oldChannel.name !== newChannel.name) {
        normalChanges.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
      }

      if ("topic" in oldChannel && oldChannel.topic !== newChannel.topic) {
        normalChanges.push(
          `**Topic:** ${oldChannel.topic || "None"} → ${newChannel.topic || "None"}`
        );
      }

      if ("nsfw" in oldChannel && oldChannel.nsfw !== newChannel.nsfw) {
        normalChanges.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
      }

      if (
        "rateLimitPerUser" in oldChannel &&
        oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser
      ) {
        normalChanges.push(
          `**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`
        );
      }

      if (oldChannel.parentId !== newChannel.parentId) {
        const oldCat = oldChannel.parent?.name || "None";
        const newCat = newChannel.parent?.name || "None";
        normalChanges.push(`**Category:** ${oldCat} → ${newCat}`);
      }

      if (normalChanges.length) {
        const embed = new EmbedBuilder()
          .setColor(logsConfig.channelUpdate.color || "#FEE75C")
          .setTitle("✏ Channel Updated")
          .setAuthor({
            name: channelUpdateEntry?.executor?.tag || "Unknown",
            iconURL:
              channelUpdateEntry?.executor?.displayAvatarURL({ dynamic: true }) ||
              undefined,
          })
          .setThumbnail(
            channelUpdateEntry?.executor?.displayAvatarURL({ dynamic: true }) || null
          )
          .addFields(
            { name: "Channel", value: newChannel.toString(), inline: true },
            {
              name: "Updated By",
              value: channelUpdateEntry?.executor
                ? `<@${channelUpdateEntry.executor.id}>`
                : "Unknown",
              inline: true,
            },
            {
              name: "Changes",
              value: normalChanges.join("\n"),
            }
          )
          .setTimestamp();

        await normalLogChannel.send({ embeds: [embed] });
      }

      const oldOverwrites = oldChannel.permissionOverwrites?.cache || new Map();
      const newOverwrites = newChannel.permissionOverwrites?.cache || new Map();

      const overwriteIds = new Set([
        ...oldOverwrites.keys(),
        ...newOverwrites.keys(),
      ]);

      const permissionEmbeds = [];

      for (const overwriteId of overwriteIds) {
        const oldOverwrite = oldOverwrites.get(overwriteId) || null;
        const newOverwrite = newOverwrites.get(overwriteId) || null;

        const diff = getPermissionDiff(oldOverwrite, newOverwrite);
        if (!diff.hasChanges) continue;

        const permissionAuditLogs = await newChannel.guild
          .fetchAuditLogs({
            type: AuditLogEvent.ChannelOverwriteUpdate,
            limit: 1,
          })
          .catch(() => null);

        const permissionEntry = permissionAuditLogs?.entries?.first();

        const changeLines = buildPermissionChangeLines(diff);
        const changeText = changeLines.join("\n\n");
        const chunks = splitTextIntoChunks(changeText, 1024);

        const fields = [
          {
            name: "Channel",
            value: newChannel.toString(),
            inline: true,
          },
          {
            name: "Updated By",
            value: permissionEntry?.executor
              ? `<@${permissionEntry.executor.id}>`
              : "Unknown",
            inline: true,
          },
          {
            name: "Permission Target",
            value: getOverwriteTargetLabel(newChannel.guild, overwriteId),
            inline: true,
          },
        ];

        chunks.forEach((chunk, index) => {
          fields.push({
            name: index === 0 ? "Permission Changes" : "More Changes",
            value: chunk || "None",
            inline: false,
          });
        });

        const embed = new EmbedBuilder()
          .setColor(logsConfig.channelUpdate.color || "#FEE75C")
          .setTitle("🔐 Channel Permissions Updated")
          .setAuthor({
            name: permissionEntry?.executor?.tag || "Unknown",
            iconURL:
              permissionEntry?.executor?.displayAvatarURL({ dynamic: true }) ||
              undefined,
          })
          .setThumbnail(
            permissionEntry?.executor?.displayAvatarURL({ dynamic: true }) || null
          )
          .addFields(fields)
          .setTimestamp();

        permissionEmbeds.push(embed);
      }

      for (const embed of permissionEmbeds) {
        await normalLogChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("[CHANNEL UPDATE LOG ERROR]", error);
    }
  });
};