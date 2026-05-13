const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "emojiSpam");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const threshold = Math.max(1, Number(settings.threshold || 8));
  const content = String(message.content || "");

  if (!content.trim()) return;

  const customEmojiMatches = content.match(/<a?:[a-zA-Z0-9_]+:\d+>/g) || [];
  const unicodeEmojiMatches = content.match(/\p{Extended_Pictographic}/gu) || [];

  const totalEmojiCount = customEmojiMatches.length + unicodeEmojiMatches.length;

  if (totalEmojiCount < threshold) return;

  try {
    await applyPunishment(
      message,
      settings,
      `Too many emojis detected (${totalEmojiCount}).`,
      "emojiSpam"
    );
  } catch (error) {
    console.error("Emoji spam error:", error);
  }
};