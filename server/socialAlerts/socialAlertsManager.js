const crypto = require("crypto");
const GuildConfig = require("../models/GuildConfig");

const FREE_PLATFORM_LIMITS = {
  youtube: 2,
  kick: 2,
  tiktok: 2,
  twitch: 2,
};

function createDefaultGuildConfig() {
  return {
    enabled: true,
    isPremium: false,
    alerts: [],
  };
}

async function ensureGuildSocialAlertsDoc(guildId) {
  if (!guildId) return null;

  let guildConfig = await GuildConfig.findOne({ guildId });

  if (!guildConfig) {
    guildConfig = await GuildConfig.create({
      guildId,
      socialAlerts: createDefaultGuildConfig(),
    });
  }

  if (!guildConfig.socialAlerts) {
    guildConfig.socialAlerts = createDefaultGuildConfig();
    await guildConfig.save();
  }

  if (!Array.isArray(guildConfig.socialAlerts.alerts)) {
    guildConfig.socialAlerts.alerts = [];
    await guildConfig.save();
  }

  return guildConfig;
}

function generateAlertId() {
  return `social_${crypto.randomBytes(6).toString("hex")}`;
}

function normalizeAlert(alert = {}) {
  return {
    id: alert.id || generateAlertId(),
    platform: (alert.platform || "").toLowerCase(),

    creatorUrl: alert.creatorUrl || null,
    creatorId: alert.creatorId || null,
    creatorName: alert.creatorName || "Unknown Creator",
    profileImageUrl: alert.profileImageUrl || null,

    channelId: alert.channelId || null,
    pingRoleId: alert.pingRoleId || null,
    pingRoleIds: Array.isArray(alert.pingRoleIds)
      ? alert.pingRoleIds.filter(Boolean)
      : [],

    enabled: alert.enabled ?? true,

    alertUploads: alert.alertUploads ?? true,
    alertLives: alert.alertLives ?? true,
    alertPosts: alert.alertPosts ?? true,

    messageContent: alert.messageContent || null,
    embedTitle: alert.embedTitle || null,
    embedDescription: alert.embedDescription || null,

    uploadsPlaylistId: alert.uploadsPlaylistId || null,

    lastVideoId: alert.lastVideoId || null,
    lastLiveVideoId: alert.lastLiveVideoId || null,

    isLive: alert.isLive ?? false,
    lastLiveAt: alert.lastLiveAt || null,
    lastUploadAt: alert.lastUploadAt || null,

    lastPostId: alert.lastPostId || null,
  };
}

async function ensureGuildSocialAlerts(guildId) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);
  return guildConfig?.socialAlerts || createDefaultGuildConfig();
}

async function getGuildSocialAlerts(guildId) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);
  return guildConfig?.socialAlerts || null;
}

async function updateGuildSocialAlerts(guildId, updates) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);

  guildConfig.socialAlerts = {
    ...createDefaultGuildConfig(),
    ...(guildConfig.socialAlerts?.toObject?.() || guildConfig.socialAlerts || {}),
    ...(updates || {}),
  };

  if (!Array.isArray(guildConfig.socialAlerts.alerts)) {
    guildConfig.socialAlerts.alerts = [];
  }

  guildConfig.markModified("socialAlerts");
  await guildConfig.save();

  return guildConfig.socialAlerts;
}

async function replaceGuildSocialAlerts(guildId, newConfig) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);

  guildConfig.socialAlerts = {
    ...createDefaultGuildConfig(),
    ...(newConfig || {}),
    alerts: Array.isArray(newConfig?.alerts)
      ? newConfig.alerts.map(normalizeAlert)
      : [],
  };

  guildConfig.markModified("socialAlerts");
  await guildConfig.save();

  return guildConfig.socialAlerts;
}

async function getAlertCount(guildId) {
  const config = await ensureGuildSocialAlerts(guildId);
  return Array.isArray(config.alerts) ? config.alerts.length : 0;
}

async function getPlatformAlertCount(guildId, platform) {
  const config = await ensureGuildSocialAlerts(guildId);
  const alerts = Array.isArray(config.alerts) ? config.alerts : [];
  const normalizedPlatform = String(platform || "").toLowerCase();

  return alerts.filter(
    (alert) => String(alert.platform || "").toLowerCase() === normalizedPlatform
  ).length;
}

function getPlatformLimit(platform) {
  const normalizedPlatform = String(platform || "").toLowerCase();
  return FREE_PLATFORM_LIMITS[normalizedPlatform] ?? 2;
}

async function canAddMoreAlerts(guildId, platform = null) {
  const config = await ensureGuildSocialAlerts(guildId);

  if (config.isPremium) {
    if (platform) {
      return {
        allowed: true,
        limit: null,
        count: await getPlatformAlertCount(guildId, platform),
        platform: String(platform).toLowerCase(),
        premium: true,
      };
    }

    return {
      allowed: true,
      limit: null,
      count: await getAlertCount(guildId),
      platform: null,
      premium: true,
    };
  }

  if (platform) {
    const normalizedPlatform = String(platform || "").toLowerCase();
    const limit = getPlatformLimit(normalizedPlatform);
    const count = await getPlatformAlertCount(guildId, normalizedPlatform);

    return {
      allowed: count < limit,
      limit,
      count,
      platform: normalizedPlatform,
      premium: false,
    };
  }

  return {
    allowed: true,
    limit: null,
    count: await getAlertCount(guildId),
    platform: null,
    premium: false,
  };
}

async function addSocialAlert(guildId, alertData) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);
  const socialAlerts = guildConfig.socialAlerts || createDefaultGuildConfig();

  if (!Array.isArray(socialAlerts.alerts)) {
    socialAlerts.alerts = [];
  }

  const isPremium = Boolean(socialAlerts.isPremium);
  const platform = String(alertData?.platform || "").toLowerCase();

  if (!platform) {
    return {
      ok: false,
      error: "Missing alert platform.",
    };
  }

  if (!isPremium) {
    const platformCount = socialAlerts.alerts.filter(
      (alert) => String(alert.platform || "").toLowerCase() === platform
    ).length;

    const platformLimit = getPlatformLimit(platform);

    if (platformCount >= platformLimit) {
      return {
        ok: false,
        error: `Free plan ${platform} limit reached (${platformLimit} alerts).`,
        code: "PLATFORM_LIMIT_REACHED",
        platform,
        limit: platformLimit,
        count: platformCount,
      };
    }
  }

  const newAlert = normalizeAlert(alertData);
  socialAlerts.alerts.push(newAlert);

  guildConfig.socialAlerts = socialAlerts;
  guildConfig.markModified("socialAlerts");
  await guildConfig.save();

  return {
    ok: true,
    alert: newAlert,
  };
}

async function removeSocialAlert(guildId, alertId) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);
  if (!guildConfig?.socialAlerts?.alerts) return false;

  const before = guildConfig.socialAlerts.alerts.length;

  guildConfig.socialAlerts.alerts = guildConfig.socialAlerts.alerts.filter(
    (alert) => alert.id !== alertId
  );

  if (guildConfig.socialAlerts.alerts.length === before) return false;

  guildConfig.markModified("socialAlerts");
  await guildConfig.save();
  return true;
}

async function updateSocialAlert(guildId, alertId, updates = {}) {
  const guildConfig = await ensureGuildSocialAlertsDoc(guildId);
  if (!guildConfig?.socialAlerts?.alerts) return null;

  const index = guildConfig.socialAlerts.alerts.findIndex(
    (alert) => String(alert?.id) === String(alertId)
  );

  if (index === -1) return null;

  const existingAlertDoc = guildConfig.socialAlerts.alerts[index];
  const existingAlert =
    typeof existingAlertDoc?.toObject === "function"
      ? existingAlertDoc.toObject()
      : JSON.parse(JSON.stringify(existingAlertDoc || {}));

  const mergedAlert = normalizeAlert({
    ...existingAlert,
    ...updates,
  });

  guildConfig.socialAlerts.alerts[index] = mergedAlert;

  guildConfig.markModified("socialAlerts");
  await guildConfig.save();

  return guildConfig.socialAlerts.alerts[index];
}

async function getAllEnabledAlerts() {
  const configs = await GuildConfig.find({
    "socialAlerts.enabled": true,
    "socialAlerts.alerts.0": { $exists: true },
  }).lean();

  const results = [];

  for (const config of configs) {
    const guildId = config.guildId;
    const socialAlerts = config.socialAlerts || {};

    if (!socialAlerts?.enabled) continue;
    if (!Array.isArray(socialAlerts.alerts)) continue;

    for (const alert of socialAlerts.alerts) {
      const normalized = normalizeAlert(alert);

      if (!normalized.enabled) continue;
      if (!normalized.platform) continue;
      if (!normalized.channelId) continue;

      results.push({
        guildId,
        ...normalized,
      });
    }
  }

  return results;
}

function applyAlertVariables(text, variables = {}) {
  if (!text || typeof text !== "string") return text || null;

  return text
    .replace(/\{creator\}/gi, variables.creator ?? "Unknown Creator")
    .replace(/\{platform\}/gi, variables.platform ?? "Unknown Platform")
    .replace(/\{role\}/gi, variables.role ?? "")
    .replace(/\{url\}/gi, variables.url ?? "");
}

module.exports = {
  FREE_PLATFORM_LIMITS,
  createDefaultGuildConfig,
  ensureGuildSocialAlerts,
  getGuildSocialAlerts,
  updateGuildSocialAlerts,
  replaceGuildSocialAlerts,
  normalizeAlert,
  getAlertCount,
  getPlatformAlertCount,
  getPlatformLimit,
  canAddMoreAlerts,
  addSocialAlert,
  removeSocialAlert,
  updateSocialAlert,
  getAllEnabledAlerts,
  applyAlertVariables,
};