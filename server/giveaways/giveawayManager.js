const {
  createGiveaway,
  getGiveaway,
  updateGiveaway,
} = require("./giveawayStorage");

const {
  generateGiveawayId,
  pickWinners,
  userHasRequiredRole,
} = require("./giveawayUtils");

const {
  buildGiveawayEmbed,
  buildGiveawayButtons,
  buildEndedEmbed,
} = require("./giveawayEmbed");

const { EmbedBuilder } = require("discord.js");

function buildWinnerAnnouncementText(giveaway, winners) {
  const winnerMentions =
    winners.length > 0
      ? winners.map((id) => `<@${id}>`).join(", ")
      : "No valid winners";

  const hostText =
    giveaway.hostId && /^\d+$/.test(String(giveaway.hostId))
      ? `<@${giveaway.hostId}>`
      : "Dashboard Giveaway";

  const template =
    giveaway.winnerMessage?.trim() ||
    "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.";

  return template
    .replace(/\{winners\}/gi, winnerMentions)
    .replace(/\{prize\}/gi, giveaway.prize || "Giveaway")
    .replace(/\{host\}/gi, hostText);
}

async function createGiveawayMessage({
  guild,
  channel,
  hostId,
  prize,
  description = null,
  winnerCount,
  durationMs,
  requiredRoleId = null,
  bannerUrl = null,
  winnerAnnouncementChannelId = null,
  winnerBannerUrl = null,
  winnerMessage = null,
}) {
  const id = generateGiveawayId();
  const now = Date.now();
  const endAt = now + durationMs;

  const giveaway = {
    id,
    guildId: guild.id,
    channelId: channel.id,
    messageId: null,
    hostId,
    prize,
    description,
    winnerCount,
    entries: [],
    requiredRoleId,
    bannerUrl,
    winnerAnnouncementChannelId,
    winnerBannerUrl,
    winnerMessage,
    ended: false,
    createdAt: now,
    endAt,
    winners: [],
    endedAt: null,
  };

  const embed = buildGiveawayEmbed(giveaway);
  const components = buildGiveawayButtons(id);

  const message = await channel.send({
    embeds: [embed],
    components,
  });

  giveaway.messageId = message.id;
  await createGiveaway(guild.id, giveaway);

  return giveaway;
}

async function joinGiveaway({ guild, giveawayId, userId }) {
  const giveaway = await getGiveaway(guild.id, giveawayId);

  if (!giveaway) {
    return { ok: false, message: "❌ Giveaway not found." };
  }

  if (giveaway.ended) {
    return { ok: false, message: "❌ This giveaway has already ended." };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return { ok: false, message: "❌ Could not verify your server membership." };
  }

  if (
    giveaway.requiredRoleMode === "deny_except" &&
    giveaway.requiredRoleId &&
    !userHasRequiredRole(member, giveaway.requiredRoleId)
  ) {
    return {
      ok: false,
      message: `❌ You need <@&${giveaway.requiredRoleId}> to enter this giveaway.`,
    };
  }

  if (
    giveaway.requiredRoleMode === "allow_except" &&
    giveaway.requiredRoleId &&
    userHasRequiredRole(member, giveaway.requiredRoleId)
  ) {
    return {
      ok: false,
      message: `❌ Members with <@&${giveaway.requiredRoleId}> cannot enter this giveaway.`,
    };
  }

  if (giveaway.entries.includes(userId)) {
    return { ok: false, message: "❌ You already joined this giveaway." };
  }

  const updatedEntries = [...giveaway.entries, userId];
  const updated = await updateGiveaway(guild.id, giveawayId, {
    entries: updatedEntries,
  });

  await refreshGiveawayMessage(guild, updated);

  return { ok: true, message: "✅ You have entered the giveaway." };
}

async function leaveGiveaway({ guild, giveawayId, userId }) {
  const giveaway = await getGiveaway(guild.id, giveawayId);

  if (!giveaway) {
    return { ok: false, message: "❌ Giveaway not found." };
  }

  if (giveaway.ended) {
    return { ok: false, message: "❌ This giveaway has already ended." };
  }

  if (!giveaway.entries.includes(userId)) {
    return { ok: false, message: "❌ You are not in this giveaway." };
  }

  const updatedEntries = giveaway.entries.filter((id) => id !== userId);
  const updated = await updateGiveaway(guild.id, giveawayId, {
    entries: updatedEntries,
  });

  await refreshGiveawayMessage(guild, updated);

  return { ok: true, message: "✅ You have left the giveaway." };
}

async function refreshGiveawayMessage(guild, giveaway) {
  try {
    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) return;
    const embed = buildGiveawayEmbed(giveaway);
    const components = giveaway.ended ? [] : buildGiveawayButtons(giveaway.id);

    await message.edit({
      embeds: [embed],
      components,
    });
  } catch (error) {
    console.error(`[Giveaways] Failed to refresh giveaway ${giveaway.id}:`, error);
  }
}

async function sendWinnerAnnouncement(guild, giveaway, winners) {
  try {
    const targetChannelId =
      giveaway.winnerAnnouncementChannelId || giveaway.channelId;

    const targetChannel = await guild.channels.fetch(targetChannelId).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased()) return;

    const winnerMentions =
      winners.length > 0
        ? winners.map((id) => `<@${id}>`).join(", ")
        : null;

    const announcementText = buildWinnerAnnouncementText(giveaway, winners);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🎉 Giveaway Winner Announcement")
      .setDescription(
        winners.length > 0
          ? [
              `**Prize:** ${giveaway.prize}`,
              giveaway.description ? `**Description:** ${giveaway.description}` : null,
              `**Hosted By:** ${
  giveaway.hostId && /^\d+$/.test(String(giveaway.hostId))
    ? `<@${giveaway.hostId}>`
    : "Dashboard Giveaway"
}`,
              `**Winner(s):** ${winnerMentions}`,
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `**Prize:** ${giveaway.prize}`,
              giveaway.description ? `**Description:** ${giveaway.description}` : null,
              `**Hosted By:** ${
  giveaway.hostId && /^\d+$/.test(String(giveaway.hostId))
    ? `<@${giveaway.hostId}>`
    : "Dashboard Giveaway"
}`,
              "",
              "No valid entries were found for this giveaway.",
            ]
              .filter(Boolean)
              .join("\n")
      )
      .setTimestamp();

    if (giveaway.winnerBannerUrl) {
      embed.setImage(giveaway.winnerBannerUrl);
    }

    await targetChannel.send({
      content: winners.length > 0 ? announcementText : "⚠️ Giveaway ended with no valid entries.",
      embeds: [embed],
    });
  } catch (error) {
    console.error(
      `[Giveaways] Failed to send winner announcement for ${giveaway.id}:`,
      error
    );
  }
}

async function endGiveaway(guild, giveawayId) {
  const giveaway = await getGiveaway(guild.id, giveawayId);

  if (!giveaway) {
    return { ok: false, message: "❌ Giveaway not found." };
  }

  if (giveaway.ended) {
    return { ok: false, message: "❌ Giveaway already ended." };
  }

  const safeEntries = Array.isArray(giveaway.entries) ? giveaway.entries : [];
  const winners = pickWinners(safeEntries, giveaway.winnerCount || 1);

  const updated = await updateGiveaway(guild.id, giveawayId, {
    ended: true,
    winners,
    endedAt: Date.now(),
  });

  try {
    const channel = await guild.channels.fetch(updated.channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      const message = await channel.messages.fetch(updated.messageId).catch(() => null);

      if (message) {
        const endedEmbed = buildEndedEmbed(updated, winners);

        await message.edit({
          embeds: [endedEmbed],
          components: [],
        });
      }
    }
  } catch (error) {
    console.error(`[Giveaways] Failed to end giveaway message ${giveawayId}:`, error);
  }

  await sendWinnerAnnouncement(guild, updated, winners);

  return {
    ok: true,
    message: winners.length
      ? `✅ Giveaway ended. Winners: ${winners.map((id) => `<@${id}>`).join(", ")}`
      : "✅ Giveaway ended, but there were no valid entries.",
    giveaway: updated,
    winners,
  };
}

module.exports = {
  createGiveawayMessage,
  joinGiveaway,
  leaveGiveaway,
  refreshGiveawayMessage,
  endGiveaway,
};