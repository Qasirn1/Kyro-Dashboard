const applyPunishment = require("../punishments");
const { getRuleConfig, isIgnoredByAutomod } = require("../automodConfig");

module.exports = async (message, automodConfig) => {
  const settings = getRuleConfig(automodConfig, "massPing");

  if (!settings?.enabled) return;
  if (isIgnoredByAutomod(message, automodConfig, settings)) return;

  const threshold = Math.max(1, Number(settings.threshold || 5));

  let pingCount = 0;

  if (message.mentions.everyone) {
    pingCount += 1;
  }

  pingCount += message.mentions.roles.size;

  if (pingCount < threshold) return;

  try {
    await applyPunishment(
      message,
      settings,
      `Mass ping detected (${pingCount} pings).`,
      "massPing"
    );
  } catch (error) {
    console.error("Mass ping error:", error);
  }
};