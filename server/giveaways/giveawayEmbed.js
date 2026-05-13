const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const {
  formatRelativeTime,
  formatFullTime,
} = require("./giveawayUtils");

function buildHostText(hostId) {
  if (!hostId) return "Dashboard Giveaway";
  return /^\d+$/.test(String(hostId)) ? `<@${hostId}>` : "Dashboard Giveaway";
}

function isUsableEmbedImage(value) {
  if (!value || typeof value !== "string") return false;

  const trimmed = value.trim();

  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function buildGiveawayEmbed(giveaway) {
  const {
    prize,
    description,
    winnerCount,
    endAt,
    requiredRoleId,
    entries,
    bannerUrl,
  } = giveaway;

  const safeEntries = Array.isArray(entries) ? entries : [];

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(prize || "Giveaway")
    .setDescription(
      [
        description ? `${description}` : null,
        description ? "" : null,
        `👥 **Winners:** ${winnerCount || 1} winner${
          Number(winnerCount || 1) > 1 ? "s" : ""
        }`,
        `🎟 **Entries:** ${safeEntries.length}`,
        `⏰ **Ends:** ${formatRelativeTime(endAt)}`,
        requiredRoleId ? `🔒 **Role Requirement:** <@&${requiredRoleId}>` : null,
      ]
        .filter(Boolean)
        .join("\n")
    );

  if (isUsableEmbedImage(bannerUrl)) {
    embed.setImage(bannerUrl);
  }

  return embed;
}

function buildGiveawayButtons(giveawayId) {
  const joinButton = new ButtonBuilder()
    .setCustomId(`giveaway_join_${giveawayId}`)
    .setLabel("Participate")
    .setStyle(ButtonStyle.Success);

  const leaveButton = new ButtonBuilder()
    .setCustomId(`giveaway_leave_${giveawayId}`)
    .setLabel("Leave")
    .setStyle(ButtonStyle.Danger);

  const participantsButton = new ButtonBuilder()
    .setCustomId(`giveaway_participants_${giveawayId}`)
    .setLabel("View Participants")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(
    joinButton,
    leaveButton,
    participantsButton
  );

  return [row];
}

function buildEndedEmbed(giveaway, winners = []) {
  const {
    prize,
    description,
    hostId,
    winnerCount,
    entries,
    bannerUrl,
  } = giveaway;

  const safeEntries = Array.isArray(entries) ? entries : [];

  const winnersText =
    winners.length > 0
      ? winners.map((id) => `<@${id}>`).join(", ")
      : "No valid entries";

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`${prize || "Giveaway"} (Ended)`)
    .setDescription(
      [
        description ? `${description}` : null,
        description ? "" : null,
        `👤 **Host:** ${buildHostText(hostId)}`,
        `👥 **Winners:** ${winnerCount || 1} winner${
          Number(winnerCount || 1) > 1 ? "s" : ""
        }`,
        `🎟 **Total Entries:** ${safeEntries.length}`,
        "",
        `🏆 **Winner(s):**`,
        winnersText,
      ]
        .filter(Boolean)
        .join("\n")
    );

  if (isUsableEmbedImage(bannerUrl)) {
    embed.setImage(bannerUrl);
  }

  return embed;
}

module.exports = {
  buildGiveawayEmbed,
  buildGiveawayButtons,
  buildEndedEmbed,
};