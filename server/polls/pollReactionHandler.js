const { getAllPolls } = require("./pollStorage");

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

async function findPollByMessageId(messageId) {
  const polls = Object.values(await getAllPolls());
  return (
    polls.find(
      (poll) => poll && String(poll.messageId) === String(messageId)
    ) || null
  );
}

async function handlePollReactionAdd(reaction, user) {
  try {
    if (user.bot) return false;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return false;
      }
    }

    const message = reaction.message;

    if (message.partial) {
      try {
        await message.fetch();
      } catch {
        return false;
      }
    }

    const poll = await findPollByMessageId(message.id);
    if (!poll) return false;

    if (poll.ended) {
      await reaction.users.remove(user.id).catch(() => {});
      return true;
    }

    const emojiName = reaction.emoji?.name;
    if (!NUMBER_EMOJIS.includes(emojiName)) {
      await reaction.users.remove(user.id).catch(() => {});
      return true;
    }

    const validEmojis = NUMBER_EMOJIS.slice(0, (poll.options || []).length);

    if (!validEmojis.includes(emojiName)) {
      await reaction.users.remove(user.id).catch(() => {});
      return true;
    }

    for (const emoji of validEmojis) {
      if (emoji === emojiName) continue;

      const otherReaction = message.reactions.cache.find(
        (r) => r.emoji.name === emoji
      );

      if (!otherReaction) continue;

      await otherReaction.users.remove(user.id).catch(() => {});
    }

    return true;
  } catch (error) {
    console.error("[PollReactionHandler] Reaction add error:", error);
    return false;
  }
}

module.exports = {
  handlePollReactionAdd,
};