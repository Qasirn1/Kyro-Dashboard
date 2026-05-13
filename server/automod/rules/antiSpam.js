const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

const userMessages = new Map();

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "antiSpam");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const userId = message.author.id;
  const now = Date.now();

  if (!userMessages.has(userId)) {
    userMessages.set(userId, []);
  }

  const timestamps = userMessages.get(userId);
  timestamps.push(now);

  const intervalMs = Math.max(1, Number(settings.interval || 5)) * 1000;
  const filtered = timestamps.filter((t) => now - t < intervalMs);

  userMessages.set(userId, filtered);

  const threshold = Math.max(1, Number(settings.threshold || 5));

  if (filtered.length >= threshold) {
    try {
      userMessages.delete(userId);

      await applyPunishment(
        message,
        settings,
        "Spam detected: sending messages too quickly.",
        "antiSpam"
      );
    } catch (error) {
      console.error("Spam moderation error:", error);
    }
  }
};