const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "antiInvites");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;

  if (!inviteRegex.test(message.content)) return;

  try {
    await applyPunishment(
      message,
      settings,
      "Discord invites are not allowed.",
      "antiInvites"
    );
  } catch (error) {
    console.error("Invite moderation error:", error);
  }
};