const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

const userMentions = new Map();

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "mentionSpam");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const threshold = Math.max(1, Number(settings.threshold || 5));
  const intervalMs = Math.max(1, Number(settings.interval || 10)) * 1000;

  const mentions = (message.content.match(/<@!?[0-9]+>/g) || []).length;
  if (mentions === 0) return;

  const userId = message.author.id;
  const now = Date.now();

  if (!userMentions.has(userId)) {
    userMentions.set(userId, []);
  }

  const timestamps = userMentions.get(userId);

  for (let i = 0; i < mentions; i++) {
    timestamps.push(now);
  }

  while (timestamps.length && now - timestamps[0] > intervalMs) {
    timestamps.shift();
  }

  if (timestamps.length < threshold) return;

  try {
    userMentions.delete(userId);

    await applyPunishment(
      message,
      settings,
      `Mention spam detected (${timestamps.length} mentions in ${Math.floor(intervalMs / 1000)}s).`,
      "mentionSpam"
    );
  } catch (error) {
    console.error("Mention spam error:", error);
  }
};