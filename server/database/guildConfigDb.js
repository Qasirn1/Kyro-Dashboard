const GuildConfig = require("../models/GuildConfig");

async function getGuildConfig(guildId) {
  if (!guildId) return null;

  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = await GuildConfig.create({ guildId });
  }

  return config;
}

async function updateGuildConfig(guildId, updates = {}) {
  if (!guildId) return null;

  return GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { returnDocument: "after", upsert: true }
  );
}

module.exports = {
  getGuildConfig,
  updateGuildConfig,
};