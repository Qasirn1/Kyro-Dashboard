const GuildConfig = require("../models/GuildConfig");

const DEFAULT_GUILD_CONFIG = {
  security: {
    suspiciousAccount: {
      enabled: false,
      accountAgeDays: 3,
      checkDefaultAvatar: true,
      action: "alert",
      alertChannelId: "",
      mentionRole: false,
      roleId: "",
      quarantineRoleId: "",
      banDeleteMessageSeconds: 0,
    },
    antiRaid: {
      enabled: false,
      joinThreshold: 5,
      timeWindowSeconds: 10,
      alertChannelId: "",
      mentionRole: false,
      roleId: "",
      action: "alert",
      quarantineRoleId: "",
    },
    antiNuke: {
      enabled: false,
      punishment: "quarantine",
      timeWindowSeconds: 10,
      alertChannelId: "",
      mentionRole: false,
      roleId: "",
      quarantineRoleId: "",
      whitelist: [],
      modules: {
        channelDelete: true,
        channelCreate: true,
        roleDelete: true,
        roleCreate: true,
        ban: true,
        kick: true,
      },
      limits: {
        channelDelete: 3,
        channelCreate: 3,
        roleDelete: 3,
        roleCreate: 3,
        ban: 3,
        kick: 3,
      },
    },
  },
};

function deepMerge(target, source) {
  const output = Array.isArray(target) ? [...target] : { ...target };

  if (!source || typeof source !== "object") return output;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = output[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      output[key] = deepMerge(
        targetValue && typeof targetValue === "object" && !Array.isArray(targetValue)
          ? targetValue
          : {},
        sourceValue
      );
    } else {
      output[key] = sourceValue;
    }
  }

  return output;
}

async function loadServerConfig() {
  try {
    const docs = await GuildConfig.find({}, { guildId: 1, security: 1 }).lean();
    const result = {};

    for (const doc of docs) {
      result[doc.guildId] = deepMerge(
        DEFAULT_GUILD_CONFIG,
        { security: doc.security || {} }
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to load server config from MongoDB:", error);
    return {};
  }
}

async function saveServerConfig(data = {}) {
  try {
    for (const [guildId, config] of Object.entries(data)) {
      const merged = deepMerge(DEFAULT_GUILD_CONFIG, config || {});

      await GuildConfig.findOneAndUpdate(
        { guildId },
        {
          $set: {
            security: merged.security || DEFAULT_GUILD_CONFIG.security,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to save server config to MongoDB:", error);
    return false;
  }
}

async function getOrCreateGuildConfig(guildId) {
  try {
    let doc = await GuildConfig.findOne({ guildId });

    if (!doc) {
      doc = await GuildConfig.create({
        guildId,
        security: DEFAULT_GUILD_CONFIG.security,
      });
    }

    const mergedConfig = deepMerge(
      DEFAULT_GUILD_CONFIG,
      {
        security: doc.security?.toObject
          ? doc.security.toObject()
          : doc.security || {},
      }
    );

    await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          security: mergedConfig.security,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return mergedConfig;
  } catch (error) {
    console.error("❌ Failed to get/create guild config from MongoDB:", error);
    return JSON.parse(JSON.stringify(DEFAULT_GUILD_CONFIG));
  }
}

async function updateGuildConfig(guildId, updates = {}) {
  try {
    const currentConfig = await getOrCreateGuildConfig(guildId);
    const mergedConfig = deepMerge(currentConfig, updates);

    await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          security: mergedConfig.security || DEFAULT_GUILD_CONFIG.security,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return mergedConfig;
  } catch (error) {
    console.error("❌ Failed to update guild config in MongoDB:", error);
    return JSON.parse(JSON.stringify(DEFAULT_GUILD_CONFIG));
  }
}

module.exports = {
  loadServerConfig,
  saveServerConfig,
  getOrCreateGuildConfig,
  updateGuildConfig,
  DEFAULT_GUILD_CONFIG,
};