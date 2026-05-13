const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPoll, setPoll, getAllPolls } = require("./pollStorage");

const NUMBER_EMOJIS = [
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
  "🔟",
];

function parseDuration(input) {
  if (!input || typeof input !== "string") return null;

  const value = input.trim().toLowerCase();
  const match = value.match(/^(\d+)(s|m|h|d)$/);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  if (!amount || amount <= 0) return null;

  switch (unit) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function formatDuration(input) {
  if (!input) return "No end time set";

  const value = input.trim().toLowerCase();
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return "No end time set";

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit === "s") return `${amount} second${amount === 1 ? "" : "s"}`;
  if (unit === "m") return `${amount} minute${amount === 1 ? "" : "s"}`;
  if (unit === "h") return `${amount} hour${amount === 1 ? "" : "s"}`;
  if (unit === "d") return `${amount} day${amount === 1 ? "" : "s"}`;

  return "No end time set";
}

function buildPollDescription(poll, revealVotes = true) {
  return (poll.options || [])
    .map((option, index) => {
      const count = Array.isArray(option.votes) ? option.votes.length : 0;
      const emoji = option.emoji || NUMBER_EMOJIS[index] || `${index + 1}.`;
      const text = option.label || `Option ${index + 1}`;

      return `${emoji} **${text}**${
        revealVotes ? ` — **${count} vote${count === 1 ? "" : "s"}**` : ""
      }`;
    })
    .join("\n\n");
}

function buildPollButtons(poll, disabled = false) {
  const rows = [];
  const maxPerRow = 5;

  for (let i = 0; i < poll.options.length; i += maxPerRow) {
    const chunk = poll.options.slice(i, i + maxPerRow);

    const row = new ActionRowBuilder().addComponents(
      chunk.map((option, chunkIndex) => {
        const optionIndex = i + chunkIndex;

        return new ButtonBuilder()
          .setCustomId(`poll_vote_${poll.pollId}_${optionIndex}`)
          .setLabel(option.emoji || NUMBER_EMOJIS[optionIndex] || `${optionIndex + 1}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled);
      })
    );

    rows.push(row);
  }

  return rows;
}

function buildPollEmbed(poll, revealVotes = true, ended = false) {
  const embed = new EmbedBuilder()
    .setTitle("📊 Poll")
    .setDescription(
      `**Question:** ${poll.question}\n\n${buildPollDescription(poll, revealVotes)}`
    )
    .setColor(ended ? 0xff4d4d : 0x5865f2)
    .setFooter({
      text: ended
        ? "Poll ended"
        : `⏳ ${
            poll.endsAt
              ? `Ends in ${formatDuration(poll.durationRaw)}`
              : "No end time set"
          }`,
    })
    .setTimestamp();

  if (poll.image) embed.setImage(poll.image);

  return embed;
}

function createPollData({
  guildId,
  channelId,
  authorId,
  question,
  options,
  image,
  durationRaw,
  type = "buttons",
  anonymous = false,
  multiSelect = false,
}) {
  const pollId = `poll_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const durationMs = parseDuration(durationRaw);

  return {
    pollId,
    guildId,
    channelId,
    authorId,
    question,
    description: "",
    image: image || null,
    durationRaw: durationRaw || null,
    type,
    anonymous,
    multiSelect,
    createdAt: Date.now(),
    createdAtTimestamp: Date.now(),
    endsAt: durationMs ? Date.now() + durationMs : null,
    ended: false,
    options: options.map((text, index) => ({
      id: `option_${index + 1}`,
      label: text,
      emoji: NUMBER_EMOJIS[index] || null,
      votes: [],
    })),
  };
}

async function saveNewPoll(pollData) {
  await setPoll(pollData.pollId, pollData);
  return pollData;
}

async function addVote(pollId, userId, optionIndex) {
  const poll = await getPoll(pollId);
  if (!poll) return { ok: false, message: "Poll not found." };
  if (poll.ended) return { ok: false, message: "This poll has already ended." };
  if (!poll.options?.[optionIndex]) {
    return { ok: false, message: "Invalid poll option." };
  }

  if (!poll.multiSelect) {
    for (const option of poll.options) {
      option.votes = option.votes.filter((id) => id !== userId);
    }
  } else if (poll.options[optionIndex].votes.includes(userId)) {
    poll.options[optionIndex].votes = poll.options[optionIndex].votes.filter(
      (id) => id !== userId
    );
    await setPoll(poll.pollId, poll);
    return { ok: true, poll };
  }

  if (!poll.options[optionIndex].votes.includes(userId)) {
    poll.options[optionIndex].votes.push(userId);
  }

  await setPoll(poll.pollId, poll);

  return { ok: true, poll };
}

async function removeVote(pollId, userId) {
  const poll = await getPoll(pollId);
  if (!poll) return { ok: false, message: "Poll not found." };
  if (poll.ended) return { ok: false, message: "This poll has already ended." };

  let removed = false;

  for (const option of poll.options || []) {
    const before = option.votes.length;
    option.votes = option.votes.filter((id) => id !== userId);
    if (option.votes.length !== before) removed = true;
  }

  await setPoll(poll.pollId, poll);

  return {
    ok: true,
    removed,
    poll,
  };
}

async function endPoll(pollId) {
  const poll = await getPoll(pollId);
  if (!poll || poll.ended) return null;

  poll.ended = true;
  await setPoll(poll.pollId, poll);
  return poll;
}

function getWinningOptions(poll) {
  const counts = (poll.options || []).map((option) => option.votes.length);
  const highest = Math.max(...counts, 0);

  if (highest === 0) return [];

  return (poll.options || [])
    .map((option, index) => ({
      index,
      text: option.label,
      votes: option.votes.length,
    }))
    .filter((option) => option.votes === highest);
}

function buildEndedPollEmbed(poll) {
  const winners = getWinningOptions(poll);

  const embed = new EmbedBuilder()
    .setTitle("📊 Poll Ended")
    .setDescription(
      `**Question:** ${poll.question}\n\n${buildPollDescription(poll, true)}`
    )
    .setColor(0xff4d4d)
    .setFooter({ text: "Voting closed" })
    .setTimestamp();

  if (poll.image) embed.setImage(poll.image);

  if (winners.length === 1) {
    embed.addFields({
      name: "🏆 Winner",
      value: `**${winners[0].text}** with **${winners[0].votes} vote${
        winners[0].votes === 1 ? "" : "s"
      }**`,
    });
  } else if (winners.length > 1) {
    embed.addFields({
      name: "🤝 Tie",
      value: winners
        .map(
          (winner) =>
            `**${winner.text}** — ${winner.votes} vote${
              winner.votes === 1 ? "" : "s"
            }`
        )
        .join("\n"),
    });
  } else {
    embed.addFields({
      name: "📭 Result",
      value: "No votes were cast.",
    });
  }

  return embed;
}

function buildResultsEmbed(poll) {
  const winners = getWinningOptions(poll);

  const embed = new EmbedBuilder()
    .setTitle(poll.ended ? "📊 Final Poll Results" : "📊 Current Poll Results")
    .setDescription(
      `**Question:** ${poll.question}\n\n${buildPollDescription(poll, true)}`
    )
    .setColor(poll.ended ? 0xff4d4d : 0x5865f2)
    .setFooter({
      text: poll.ended
        ? "This poll has ended"
        : poll.endsAt
        ? `Poll is active • Ends in ${formatDuration(poll.durationRaw)}`
        : "Poll is active • No end time set",
    })
    .setTimestamp();

  if (poll.image) embed.setImage(poll.image);

  if (winners.length === 1) {
    embed.addFields({
      name: poll.ended ? "🏆 Winner" : "🥇 Leading Option",
      value: `**${winners[0].text}** with **${winners[0].votes} vote${
        winners[0].votes === 1 ? "" : "s"
      }**`,
    });
  } else if (winners.length > 1) {
    embed.addFields({
      name: poll.ended ? "🤝 Tie" : "🤝 Currently Tied",
      value: winners
        .map(
          (winner) =>
            `**${winner.text}** — ${winner.votes} vote${
              winner.votes === 1 ? "" : "s"
            }`
        )
        .join("\n"),
    });
  } else {
    embed.addFields({
      name: "📭 Result",
      value: "No votes have been cast yet.",
    });
  }

  return embed;
}

async function getLatestActivePollInChannel(guildId, channelId) {
  const polls = Object.values(await getAllPolls());

  const matching = polls
    .filter(
      (poll) =>
        poll &&
        poll.guildId === guildId &&
        poll.channelId === channelId &&
        !poll.ended
    )
    .sort((a, b) => (b.createdAtTimestamp || b.createdAt || 0) - (a.createdAtTimestamp || a.createdAt || 0));

  return matching[0] || null;
}

async function getLatestPollInChannel(guildId, channelId) {
  const polls = Object.values(await getAllPolls());

  const matching = polls
    .filter(
      (poll) => poll && poll.guildId === guildId && poll.channelId === channelId
    )
    .sort((a, b) => (b.createdAtTimestamp || b.createdAt || 0) - (a.createdAtTimestamp || a.createdAt || 0));

  return matching[0] || null;
}

module.exports = {
  parseDuration,
  formatDuration,
  buildPollButtons,
  buildPollEmbed,
  buildEndedPollEmbed,
  buildResultsEmbed,
  createPollData,
  saveNewPoll,
  addVote,
  removeVote,
  endPoll,
  getLatestActivePollInChannel,
  getLatestPollInChannel,
};