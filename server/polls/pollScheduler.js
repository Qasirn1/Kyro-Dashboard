const { getAllPolls } = require("./pollStorage");
const {
  endPoll,
  buildEndedPollEmbed,
} = require("./pollManager");

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

let pollInterval = null;

function clonePollWithReactionCounts(poll, message) {
  const clonedPoll = JSON.parse(JSON.stringify(poll));

  clonedPoll.options = (clonedPoll.options || []).map((option, index) => {
    const emoji = option.emoji || NUMBER_EMOJIS[index];
    const reaction = message.reactions.cache.find(
      (r) => r.emoji.name === emoji
    );

    const count = reaction ? Math.max((reaction.count || 1) - 1, 0) : 0;

    return {
      ...option,
      votes: Array(count).fill("reaction_vote"),
    };
  });

  return clonedPoll;
}

async function checkPolls(client) {
  const allPolls = await getAllPolls();
  const now = Date.now();

  for (const pollId of Object.keys(allPolls)) {
    const poll = allPolls[pollId];

    if (!poll || poll.ended) continue;
    if (!poll.endsAt) continue;
    if (now < poll.endsAt) continue;

    try {
      const endedPoll = await endPoll(pollId);
      if (!endedPoll) continue;

      const guild = await client.guilds.fetch(endedPoll.guildId).catch(() => null);
      if (!guild) continue;

      const channel = await guild.channels.fetch(endedPoll.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      const message = await channel.messages.fetch(endedPoll.messageId).catch(() => null);
      if (!message) continue;

      await message.fetch().catch(() => null);

      const finalPoll =
        endedPoll.type === "reactions"
          ? clonePollWithReactionCounts(endedPoll, message)
          : endedPoll;

      await message.edit({
        embeds: [buildEndedPollEmbed(finalPoll)],
        components: [],
      });

     
    } catch (error) {
      console.error(`[PollScheduler] Failed to end poll ${pollId}:`, error);
    }
  }
}

function startPollScheduler(client) {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(() => {
    checkPolls(client).catch((error) => {
      console.error("[PollScheduler] Poll check failed:", error);
    });
  }, 15000);

  console.log("[PollScheduler] Started poll scheduler.");
}

module.exports = {
  startPollScheduler,
  checkPolls,
};