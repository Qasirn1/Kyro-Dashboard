const GuildMember = require("../models/GuildMember");

async function getOrCreateLevelingMember(guildId, userId) {
  if (!guildId || !userId) return null;

  let member = await GuildMember.findOne({ guildId, userId });

  if (!member) {
    member = await GuildMember.create({
      guildId,
      userId,
      xp: {
        chatXP: 0,
        voiceXP: 0,
        chatLevel: 1,
        voiceLevel: 1,
      },
    });
  }

  return member;
}

async function addChatXP(guildId, userId, amount) {
  if (!guildId || !userId || !amount) return null;

  return GuildMember.findOneAndUpdate(
    { guildId, userId },
    { $inc: { "xp.chatXP": amount } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function addVoiceXP(guildId, userId, amount) {
  if (!guildId || !userId || !amount) return null;

  return GuildMember.findOneAndUpdate(
    { guildId, userId },
    { $inc: { "xp.voiceXP": amount } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function setChatLevel(guildId, userId, level) {
  if (!guildId || !userId || level == null) return null;

  return GuildMember.findOneAndUpdate(
    { guildId, userId },
    { $set: { "xp.chatLevel": level } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}
async function setVoiceLevel(guildId, userId, level) {
  if (!guildId || !userId || level == null) return null;

  return GuildMember.findOneAndUpdate(
    { guildId, userId },
    { $set: { "xp.voiceLevel": level } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}
async function getLevelingMember(guildId, userId) {
  if (!guildId || !userId) return null;

  return GuildMember.findOne({ guildId, userId });
}

module.exports = {
  getOrCreateLevelingMember,
  getLevelingMember,
  addChatXP,
  addVoiceXP,
  setChatLevel,
  setVoiceLevel,
};