const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "capsSpam");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const content = String(message.content || "");
  const minLength = Math.max(1, Number(settings.minLength || 8));
  const percentage = Math.min(100, Math.max(1, Number(settings.percentage || 70)));

  if (content.length < minLength) return;

  const letters = content.replace(/[^a-zA-Z]/g, "");
  if (!letters.length) return;

  const uppercaseLetters = letters.replace(/[^A-Z]/g, "");
  const ratio = (uppercaseLetters.length / letters.length) * 100;

  if (ratio < percentage) return;

  try {
    await applyPunishment(
      message,
      settings,
      `Too many capital letters detected (${Math.round(ratio)}% caps).`,
      "capsSpam"
    );
  } catch (error) {
    console.error("Caps spam moderation error:", error);
  }
};