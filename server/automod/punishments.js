const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../models/GuildConfig");
const AutomodWarning = require("../models/AutomodWarning");
const processedViolations = new Set();
async function sendWarningNotifications(
  message,
  reason,
  settings,
  warningCount,
  maxWarnings
) {
  const notifyChannel = settings?.notify?.channel ?? true;
  const notifyDm = settings?.notify?.dm ?? false;

  const embed = new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("⚠️ Warning")
    .setDescription(
      `${message.author}, ${reason}\n\nWarning ${warningCount}/${maxWarnings}`
    )
    .setFooter({
      text: `${message.guild.name} • Kyro Automod`,
    })
    .setTimestamp();

  if (notifyChannel) {
    try {
      const sent = await message.channel.send({
        embeds: [embed],
        allowedMentions: {
          users: [message.author.id],
        },
      });

      setTimeout(() => {
        sent.delete().catch(() => {});
      }, 6000);
    } catch (error) {
      console.error("Automod channel warning error:", error);
    }
  }

  if (notifyDm) {
    try {
      await message.author.send(
        `⚠️ You received a warning in **${message.guild.name}**\n\nReason: ${reason}\nWarning ${warningCount}/${maxWarnings}`
      );
    } catch {
      // ignore DM failures
    }
  }
}

async function getWarningRecord(guildId, userId, ruleKey) {
  let record = await AutomodWarning.findOne({ guildId, userId, ruleKey });

  if (!record) {
    record = await AutomodWarning.create({
      guildId,
      userId,
      ruleKey,
      count: 0,
      lastViolationAt: null,
    });
  }

  return record;
}

async function applyEscalationPunishment(message, settings, reason) {
  const punishment = settings?.warnings?.punishment || "timeout";

  if (punishment === "timeout") {
    const durationMinutes = Math.max(
      1,
      Number(settings?.warnings?.timeoutDuration || 10)
    );
    const durationMs = durationMinutes * 60 * 1000;

    if (!message.member.moderatable) return;

    await message.member.timeout(durationMs, reason);
    return;
  }

  if (punishment === "kick") {
    if (!message.member.kickable) return;
    await message.member.kick(reason);
    return;
  }

  if (punishment === "ban") {
    if (!message.member.bannable) return;
    await message.member.ban({ reason });
  }
}

async function applyDirectPunishment(message, settings, reason) {
  const action = ["block", "warn", "timeout"].includes(settings?.action)
    ? settings.action
    : "block";

  if (action === "block") {
    return;
  }

  if (action === "warn") {
    await sendWarningNotifications(message, reason, settings, 1, 1);
    return;
  }

  if (action === "timeout") {
    const durationMinutes = Math.max(1, Number(settings?.duration || 10));
    const durationMs = durationMinutes * 60 * 1000;

    if (!message.member.moderatable) return;

    await message.member.timeout(durationMs, reason);

    const logsConfig = await GuildConfig.findOne({ guildId: message.guild.id })
      .lean()
      .catch(() => null);

    const logChannelId =
      logsConfig?.logs?.timeout?.enabled ? logsConfig.logs.timeout.channelId : null;

    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("⏱️ User Timed Out (Automod)")
          .setThumbnail(
            message.author.displayAvatarURL({ dynamic: true, size: 256 })
          )
          .addFields(
            { name: "User", value: `<@${message.author.id}>`, inline: true },
            { name: "Reason", value: reason, inline: true },
            { name: "Duration", value: `${durationMinutes} minute(s)`, inline: true },
            { name: "Channel", value: `<#${message.channel.id}>`, inline: true }
          )
          .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  }
}

async function applyPunishment(message, settings, reason, ruleKey = "unknownRule") {
  if (!message?.guild || !message?.member || !settings?.enabled) return;
  const violationKey = `${message.id}:${ruleKey}`;

if (processedViolations.has(violationKey)) return;
processedViolations.add(violationKey);

setTimeout(() => {
  processedViolations.delete(violationKey);
}, 10000);

  const member = message.member;

  const hasBypass =
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild);

  if (hasBypass) return;

  try {
    await message.delete().catch(() => {});
  } catch {}

  try {
    const actionMode = settings?.actionMode || "direct";

    if (actionMode === "direct" || !settings?.warnings?.enabled) {
      await applyDirectPunishment(message, settings, reason);
      return;
    }

    const guildId = message.guild.id;
    const userId = message.author.id;

    const warningExpiryHours = Math.max(
      1,
      Number(settings?.warnings?.expiryHours || 24)
    );
    const maxWarnings = Math.max(
      1,
      Number(settings?.warnings?.maxWarnings || 3)
    );

    const expiryMs = warningExpiryHours * 60 * 60 * 1000;
    const now = new Date();

    const record = await getWarningRecord(guildId, userId, ruleKey);

    let count = record.count || 0;
    const lastViolationAt = record.lastViolationAt
      ? new Date(record.lastViolationAt).getTime()
      : 0;

    if (!lastViolationAt || Date.now() - lastViolationAt > expiryMs) {
      count = 0;
    }

    count += 1;

    if (count < maxWarnings) {
      record.count = count;
      record.lastViolationAt = now;
      await record.save();

      await sendWarningNotifications(message, reason, settings, count, maxWarnings);
      return;
    }

    await applyEscalationPunishment(message, settings, reason);

    record.count = 0;
    record.lastViolationAt = now;
    await record.save();
  } catch (error) {
    console.error("Punishment error:", error);
  }
}

module.exports = applyPunishment;