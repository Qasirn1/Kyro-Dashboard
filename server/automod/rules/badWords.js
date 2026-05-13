const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "badWords");

  if (!settings?.enabled) return;

  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const content = String(message.content || "").toLowerCase().trim();
  if (!content) return;

  const blockedWords = Array.isArray(settings.blockedWords)
    ? settings.blockedWords
        .map((word) => String(word).trim().toLowerCase())
        .filter(Boolean)
    : [];

  if (!blockedWords.length) return;

  const matchPartialWords = Boolean(settings.matchPartialWords);

  const found = blockedWords.some((word) => {
    if (matchPartialWords) {
      return content.includes(word);
    }

    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    return pattern.test(content);
  });

  if (!found) return;

   try {
    await applyPunishment(
      message,
      settings,
      "Inappropriate language is not allowed.",
      "badWords"
    );
  } catch (error) {
    console.error("Bad word moderation error:", error);
  }
};