const Giveaway = require("../models/Giveaway");

async function getGuildGiveaways(guildId) {
  const giveaways = await Giveaway.find({ guildId }).lean();

  const mapped = {};
  for (const giveaway of giveaways) {
    mapped[giveaway.id] = giveaway;
  }

  return mapped;
}

async function getGiveaway(guildId, giveawayId) {
  return await Giveaway.findOne({
    guildId,
    id: giveawayId,
  }).lean();
}

async function createGiveaway(guildId, giveawayData) {
  const created = await Giveaway.create({
    ...giveawayData,
    guildId,
  });

  return created.toObject();
}

async function updateGiveaway(guildId, giveawayId, updates = {}) {
  const updated = await Giveaway.findOneAndUpdate(
    { guildId, id: giveawayId },
    { $set: updates },
    { returnDocument: "after" }
  ).lean();

  return updated;
}

async function deleteGiveaway(guildId, giveawayId) {
  const result = await Giveaway.deleteOne({
    guildId,
    id: giveawayId,
  });

  return result.deletedCount > 0;
}

async function getAllActiveGiveaways() {
  return await Giveaway.find({
    ended: false,
  }).lean();
}

module.exports = {
  getGuildGiveaways,
  getGiveaway,
  createGiveaway,
  updateGiveaway,
  deleteGiveaway,
  getAllActiveGiveaways,
};