const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "antiLinks");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const linkRegex = /(https?:\/\/|www\.)/i;

  if (!linkRegex.test(message.content)) return;

  try {
    await applyPunishment(
      message,
      settings,
      "Links are not allowed in this server.",
      "antiLinks"
    );
  } catch (error) {
    console.error("Link moderation error:", error);
  }
};