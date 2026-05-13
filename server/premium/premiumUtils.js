const Subscription = require("../models/Subscription");

const LIFETIME_PREMIUM_GUILDS = [
  "1496159360294850681",
];

const PREMIUM_LIMITS = {
  rssFeeds: {
    free: 2,
    premium: Infinity,
  },

  tempVoice: {
    free: 1,
    premium: Infinity,
  },

  verificationPanels: {
    free: 2,
    premium: Infinity,
  },

  socialAlerts: {
    free: {
      youtube: 1,
      twitch: 1,
      tiktok: 1,
      kick: 1,
    },
    premium: Infinity,
  },
};

async function getPremiumStatus(guildId) {
  if (LIFETIME_PREMIUM_GUILDS.includes(String(guildId))) {
    return {
      hasPremium: true,
      plan: "lifetime",
    };
  }

  const subscription = await Subscription.findOne({ guildId });

  if (!subscription) {
    return {
      hasPremium: false,
      plan: "free",
    };
  }

  return {
    hasPremium:
      subscription.plan === "premium" &&
      ["active", "trialing"].includes(subscription.status),

    plan: subscription.plan,
  };
}

function getFeatureLimit(premiumStatus, featureName) {
  const feature = PREMIUM_LIMITS[featureName];

  if (!feature) return null;

  return premiumStatus.hasPremium
    ? feature.premium
    : feature.free;
}

function getSocialPlatformLimit(premiumStatus, platform) {
  const limits = PREMIUM_LIMITS.socialAlerts;

  if (premiumStatus.hasPremium) {
    return Infinity;
  }

  return limits.free?.[platform] ?? 0;
}

module.exports = {
  getPremiumStatus,
  getFeatureLimit,
  getSocialPlatformLimit,
};