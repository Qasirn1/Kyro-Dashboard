const GuildConfig = require("../models/GuildConfig");

function createDefaultRule(overrides = {}) {
  return {
    enabled: false,
    actionMode: "direct",
    action: "block",
    duration: 10,

    notify: {
      channel: true,
      dm: false,
    },

    warnings: {
      enabled: false,
      maxWarnings: 3,
      punishment: "timeout",
      timeoutDuration: 10,
      expiryHours: 24,
    },

    ignoredChannels: [],
    ignoredRoles: [],

    ...overrides,
  };
}

function createDefaultAutomodConfig() {
  return {
    enabled: false,
    ignoredChannels: [],
    ignoredRoles: [],
    rules: {
      antiSpam: createDefaultRule({
        threshold: 5,
        interval: 5,
      }),
      badWords: createDefaultRule({
        blockedWords: [],
        matchPartialWords: false,
      }),
      antiInvites: createDefaultRule(),
      antiLinks: createDefaultRule(),
      capsSpam: createDefaultRule({
        minLength: 8,
        percentage: 70,
      }),
      emojiSpam: createDefaultRule({
        threshold: 8,
      }),
      mentionSpam: createDefaultRule({
        threshold: 5,
        interval: 10,
      }),
      massPing: createDefaultRule({
        threshold: 5,
        interval: 10,
      }),
    },
  };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function normalizeAction(value) {
  return ["block", "warn", "timeout"].includes(value) ? value : "block";
}

function normalizeActionMode(value) {
  return value === "warnings" ? "warnings" : "direct";
}

function normalizePunishment(value) {
  return ["timeout", "kick", "ban"].includes(value) ? value : "timeout";
}

function normalizeRule(base, incoming = {}) {
  return {
    ...base,
    ...incoming,

    enabled: incoming.enabled ?? base.enabled,
    actionMode: normalizeActionMode(incoming.actionMode ?? base.actionMode),
    action: normalizeAction(incoming.action ?? base.action),
    duration: Math.max(1, Number(incoming.duration ?? base.duration) || base.duration),

    notify: {
      channel: incoming.notify?.channel ?? base.notify.channel,
      dm: incoming.notify?.dm ?? base.notify.dm,
    },

    warnings: {
      enabled: incoming.warnings?.enabled ?? base.warnings.enabled,
      maxWarnings: Math.max(
        1,
        Number(incoming.warnings?.maxWarnings ?? base.warnings.maxWarnings) ||
          base.warnings.maxWarnings
      ),
      punishment: normalizePunishment(
        incoming.warnings?.punishment ?? base.warnings.punishment
      ),
      timeoutDuration: Math.max(
        1,
        Number(
          incoming.warnings?.timeoutDuration ??
            base.warnings.timeoutDuration
        ) || base.warnings.timeoutDuration
      ),
      expiryHours: Math.max(
        1,
        Number(incoming.warnings?.expiryHours ?? base.warnings.expiryHours) ||
          base.warnings.expiryHours
      ),
    },

    ignoredChannels: normalizeArray(
      incoming.ignoredChannels ?? base.ignoredChannels
    ),
    ignoredRoles: normalizeArray(incoming.ignoredRoles ?? base.ignoredRoles),
  };
}

function normalizeAutomodConfig(payload = {}) {
  const defaults = createDefaultAutomodConfig();

  return {
    enabled: payload.enabled ?? defaults.enabled,
    ignoredChannels: normalizeArray(payload.ignoredChannels),
    ignoredRoles: normalizeArray(payload.ignoredRoles),
    rules: {
      antiSpam: {
        ...normalizeRule(defaults.rules.antiSpam, payload.rules?.antiSpam),
        threshold: Math.max(
          1,
          Number(payload.rules?.antiSpam?.threshold ?? defaults.rules.antiSpam.threshold) ||
            defaults.rules.antiSpam.threshold
        ),
        interval: Math.max(
          1,
          Number(payload.rules?.antiSpam?.interval ?? defaults.rules.antiSpam.interval) ||
            defaults.rules.antiSpam.interval
        ),
      },

      badWords: {
        ...normalizeRule(defaults.rules.badWords, payload.rules?.badWords),
        blockedWords: normalizeArray(payload.rules?.badWords?.blockedWords),
        matchPartialWords:
          payload.rules?.badWords?.matchPartialWords ??
          defaults.rules.badWords.matchPartialWords,
      },

      antiInvites: normalizeRule(
        defaults.rules.antiInvites,
        payload.rules?.antiInvites
      ),

      antiLinks: normalizeRule(
        defaults.rules.antiLinks,
        payload.rules?.antiLinks
      ),

      capsSpam: {
        ...normalizeRule(defaults.rules.capsSpam, payload.rules?.capsSpam),
        minLength: Math.max(
          1,
          Number(payload.rules?.capsSpam?.minLength ?? defaults.rules.capsSpam.minLength) ||
            defaults.rules.capsSpam.minLength
        ),
        percentage: Math.min(
          100,
          Math.max(
            1,
            Number(
              payload.rules?.capsSpam?.percentage ??
                defaults.rules.capsSpam.percentage
            ) || defaults.rules.capsSpam.percentage
          )
        ),
      },

      emojiSpam: {
        ...normalizeRule(defaults.rules.emojiSpam, payload.rules?.emojiSpam),
        threshold: Math.max(
          1,
          Number(payload.rules?.emojiSpam?.threshold ?? defaults.rules.emojiSpam.threshold) ||
            defaults.rules.emojiSpam.threshold
        ),
      },

      mentionSpam: {
        ...normalizeRule(
          defaults.rules.mentionSpam,
          payload.rules?.mentionSpam
        ),
        threshold: Math.max(
          1,
          Number(
            payload.rules?.mentionSpam?.threshold ??
              defaults.rules.mentionSpam.threshold
          ) || defaults.rules.mentionSpam.threshold
        ),
        interval: Math.max(
          1,
          Number(
            payload.rules?.mentionSpam?.interval ??
              defaults.rules.mentionSpam.interval
          ) || defaults.rules.mentionSpam.interval
        ),
      },

      massPing: {
        ...normalizeRule(defaults.rules.massPing, payload.rules?.massPing),
        threshold: Math.max(
          1,
          Number(payload.rules?.massPing?.threshold ?? defaults.rules.massPing.threshold) ||
            defaults.rules.massPing.threshold
        ),
        interval: Math.max(
          1,
          Number(payload.rules?.massPing?.interval ?? defaults.rules.massPing.interval) ||
            defaults.rules.massPing.interval
        ),
      },
    },
  };
}

async function getGuildAutomodConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return normalizeAutomodConfig(config?.automod || {});
  } catch (error) {
    console.error("Failed to load automod config from MongoDB:", error);
    return createDefaultAutomodConfig();
  }
}

function getRuleConfig(automodConfig, ruleKey) {
  if (!automodConfig?.rules) return null;
  return automodConfig.rules[ruleKey] || null;
}

function isIgnoredByAutomod(message, automodConfig, ruleConfig = null) {
  const member = message.member;
  const channelId = message.channel?.id;

  const globalIgnoredChannels = normalizeArray(automodConfig?.ignoredChannels);
  const globalIgnoredRoles = normalizeArray(automodConfig?.ignoredRoles);

  const ruleIgnoredChannels = normalizeArray(ruleConfig?.ignoredChannels);
  const ruleIgnoredRoles = normalizeArray(ruleConfig?.ignoredRoles);

  if (
    channelId &&
    (globalIgnoredChannels.includes(channelId) ||
      ruleIgnoredChannels.includes(channelId))
  ) {
    return true;
  }

  if (
    member?.roles?.cache?.some(
      (role) =>
        globalIgnoredRoles.includes(role.id) ||
        ruleIgnoredRoles.includes(role.id)
    )
  ) {
    return true;
  }

  return false;
}

module.exports = {
  createDefaultAutomodConfig,
  normalizeAutomodConfig,
  getGuildAutomodConfig,
  getGuildConfig: getGuildAutomodConfig,
  getRuleConfig,
  isIgnoredByAutomod,
};