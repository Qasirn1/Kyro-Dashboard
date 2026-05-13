const GuildConfig = require("../models/GuildConfig");

function createDefaultServerStatsConfig() {
  return {
    enabled: false,
    categoryId: null,
    refreshMinutes: 5,
    entries: [],
    lastUpdated: null,
lastTimeUpdated: null,
  };
}

function normalizeServerStatsEntry(entry = {}) {
  return {
    id: entry.id || null,
    channelId: entry.channelId || null,
    enabled: entry.enabled !== false,
    type: entry.type || "members",
    label: entry.label || null,

    // role-based stats
    roleId: entry.roleId || null,

    // formatting / time settings
    emoji: entry.emoji || null,
    timezone: entry.timezone || "UTC",
    format: entry.format || "12h",
    display: entry.display || "time",
    numberStyle: entry.numberStyle || "full",

    // social/custom fields
    platform: entry.platform || null,
    statType: entry.statType || null,

    // custom values
    value: typeof entry.value === "number" ? entry.value : null,
    fallbackValue:
      typeof entry.fallbackValue === "number" ? entry.fallbackValue : null,
    lastValue: typeof entry.lastValue === "number" ? entry.lastValue : null,
    lastFetchedAt: entry.lastFetchedAt || null,
  };
}

function normalizeServerStatsConfig(statsConfig = {}) {
  const defaults = createDefaultServerStatsConfig();

  return {
    ...defaults,
    ...statsConfig,
    enabled: Boolean(statsConfig.enabled),
    categoryId: statsConfig.categoryId || null,
    refreshMinutes:
      typeof statsConfig.refreshMinutes === "number" &&
      statsConfig.refreshMinutes > 0
        ? statsConfig.refreshMinutes
        : defaults.refreshMinutes,
    entries: Array.isArray(statsConfig.entries)
      ? statsConfig.entries.map(normalizeServerStatsEntry)
      : [],
    lastUpdated: statsConfig.lastUpdated || null,
lastTimeUpdated: statsConfig.lastTimeUpdated || null,
  };
}

async function getOrCreateGuildConfig(guildId) {
  let guildConfig = await GuildConfig.findOne({ guildId });

  if (!guildConfig) {
    guildConfig = await GuildConfig.create({
      guildId,
      serverStats: createDefaultServerStatsConfig(),
    });
  }

  if (!guildConfig.serverStats) {
    guildConfig.serverStats = createDefaultServerStatsConfig();
    await guildConfig.save();
  }

  return guildConfig;
}

async function ensureServerStatsConfig(guildId) {
  const guildConfig = await getOrCreateGuildConfig(guildId);

  const normalized = normalizeServerStatsConfig(guildConfig.serverStats || {});
  guildConfig.serverStats = normalized;
  await guildConfig.save();

  return normalizeServerStatsConfig(guildConfig.serverStats);
}

async function getServerStatsConfig(guildId) {
  const guildConfig = await GuildConfig.findOne({ guildId });
  if (!guildConfig?.serverStats) return null;

  return normalizeServerStatsConfig(guildConfig.serverStats);
}

async function updateServerStatsConfig(guildId, newStatsConfig = {}) {
  const guildConfig = await getOrCreateGuildConfig(guildId);

  const current = normalizeServerStatsConfig(guildConfig.serverStats || {});
  const merged = {
    ...current,
    ...newStatsConfig,
  };

  if (Object.prototype.hasOwnProperty.call(newStatsConfig, "entries")) {
    merged.entries = Array.isArray(newStatsConfig.entries)
      ? newStatsConfig.entries.map(normalizeServerStatsEntry)
      : [];
  } else {
    merged.entries = current.entries;
  }

 guildConfig.serverStats = normalizeServerStatsConfig({
  ...merged,
  lastUpdated: newStatsConfig.lastUpdated || merged.lastUpdated || new Date(),
  lastTimeUpdated:
    newStatsConfig.lastTimeUpdated || merged.lastTimeUpdated || null,
});

  await guildConfig.save();

  return normalizeServerStatsConfig(guildConfig.serverStats);
}

async function addServerStatsEntry(guildId, entry) {
  const statsConfig = await ensureServerStatsConfig(guildId);
  const normalizedEntry = normalizeServerStatsEntry(entry);

  statsConfig.entries.push(normalizedEntry);

  return updateServerStatsConfig(guildId, {
    entries: statsConfig.entries,
  });
}

async function removeServerStatsEntry(guildId, channelId) {
  const statsConfig = await ensureServerStatsConfig(guildId);

  const filteredEntries = statsConfig.entries.filter(
    (entry) => entry.channelId !== channelId
  );

  return updateServerStatsConfig(guildId, {
    entries: filteredEntries,
  });
}

module.exports = {
  ensureServerStatsConfig,
  getServerStatsConfig,
  updateServerStatsConfig,
  addServerStatsEntry,
  removeServerStatsEntry,
  createDefaultServerStatsConfig,
  normalizeServerStatsConfig,
  normalizeServerStatsEntry,
};