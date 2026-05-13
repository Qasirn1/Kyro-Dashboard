const GuildConfig = require("../models/GuildConfig");

function normalizeRssConfig(rss = {}) {
  const feeds = Array.isArray(rss.feeds) ? rss.feeds : [];

  return {
    enabled: rss.enabled ?? false,
    isPremium: rss.isPremium ?? false,
    feeds: feeds.map((feed, index) => ({
      id:
        typeof feed.id === "string" && feed.id.trim()
          ? feed.id.trim()
          : `rss_${Date.now()}_${index}`,

      title: typeof feed.title === "string" ? feed.title.trim() : "",
      url: typeof feed.url === "string" ? feed.url.trim() : "",
      feedUrl: typeof feed.feedUrl === "string" ? feed.feedUrl.trim() : "",

      channelId:
        typeof feed.channelId === "string" && feed.channelId.trim()
          ? feed.channelId.trim()
          : null,

      roleId:
        typeof feed.roleId === "string" && feed.roleId.trim()
          ? feed.roleId.trim()
          : null,

      enabled: feed.enabled ?? true,
      paused: feed.paused ?? false,
      pauseReason:
        typeof feed.pauseReason === "string" ? feed.pauseReason : "",

      lastPostId:
        typeof feed.lastPostId === "string" ? feed.lastPostId : null,

      lastPostDate:
        typeof feed.lastPostDate === "string" ? feed.lastPostDate : null,

      lastPostFingerprint:
        typeof feed.lastPostFingerprint === "string"
          ? feed.lastPostFingerprint
          : null,

      recentPostFingerprints: Array.isArray(feed.recentPostFingerprints)
        ? feed.recentPostFingerprints.filter(Boolean).map(String).slice(0, 15)
        : [],

      lastChecked:
        typeof feed.lastChecked === "string" ? feed.lastChecked : null,

      lastSuccessfulCheck:
        typeof feed.lastSuccessfulCheck === "string"
          ? feed.lastSuccessfulCheck
          : null,

      lastError:
        typeof feed.lastError === "string" ? feed.lastError : null,

      lastErrorCode:
        typeof feed.lastErrorCode === "string" ? feed.lastErrorCode : null,

      lastErrorStatus:
        typeof feed.lastErrorStatus === "number" ? feed.lastErrorStatus : null,

      createdAt: feed.createdAt || new Date(),
    })),
  };
}

async function ensureGuildRssConfig(guildId) {
  if (!guildId) return null;

  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = await GuildConfig.create({
      guildId,
      rss: {
        enabled: false,
        isPremium: false,
        feeds: [],
      },
    });
  } else if (!config.rss) {
    config.rss = {
      enabled: false,
      isPremium: false,
      feeds: [],
    };
    await config.save();
  }

  return normalizeRssConfig(config.rss || {});
}

async function getGuildRssConfig(guildId) {
  if (!guildId) return null;

  const config = await GuildConfig.findOne({ guildId }).lean();
  if (!config) return null;

  return normalizeRssConfig(config.rss || {});
}

async function updateGuildRssConfig(guildId, updates = {}) {
  if (!guildId) return null;

  const existing = await ensureGuildRssConfig(guildId);

  const merged = normalizeRssConfig({
    ...existing,
    ...updates,
    feeds: Array.isArray(updates.feeds) ? updates.feeds : existing.feeds,
  });

  const updated = await GuildConfig.findOneAndUpdate(
    { guildId },
    {
      $set: {
        rss: merged,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return normalizeRssConfig(updated?.rss || merged);
}

async function loadAllRssFeeds() {
  const configs = await GuildConfig.find(
    {
      "rss.feeds.0": { $exists: true },
    },
    {
      guildId: 1,
      rss: 1,
    }
  ).lean();

  const result = {};

  for (const config of configs) {
    if (!config?.guildId) continue;
    result[config.guildId] = normalizeRssConfig(config.rss || {});
  }

  return result;
}

async function saveAllRssFeeds(data = {}) {
  try {
    const entries = Object.entries(data);

    for (const [guildId, rssConfig] of entries) {
      await GuildConfig.findOneAndUpdate(
        { guildId },
        {
          $set: {
            rss: normalizeRssConfig(rssConfig || {}),
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return true;
  } catch (error) {
    console.error("[RSS] Failed to save Mongo RSS config:", error);
    return false;
  }
}

module.exports = {
  normalizeRssConfig,
  ensureGuildRssConfig,
  getGuildRssConfig,
  updateGuildRssConfig,
  loadAllRssFeeds,
  saveAllRssFeeds,
};