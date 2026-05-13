const GuildMember = require("../models/GuildMember");

async function getGuildMember(guildId, userId) {
  if (!guildId || !userId) return null;

  let member = await GuildMember.findOne({ guildId, userId });

  if (!member) {
    member = await GuildMember.create({ guildId, userId });
  }

  return member;
}

async function updateGuildMember(guildId, userId, updates = {}) {
  if (!guildId || !userId) return null;

return GuildMember.findOneAndUpdate(
  { guildId, userId },
  { $set: updates },
  { returnDocument: "after", upsert: true }
);
}

module.exports = {
  getGuildMember,
  updateGuildMember,
};