const TempVoiceChannel = require("../../models/TempVoiceChannel");

function mapTempVoiceDoc(doc) {
  if (!doc) return null;

  return {
    ownerId: doc.ownerId,
    createdAt: doc.createdAtTimestamp,
    locked: !!doc.locked,
    hidden: !!doc.hidden,
    name: doc.name || "",
    status: doc.status || "",
    game: doc.game || "",
    lfm: doc.lfm || "",
    userLimit: typeof doc.userLimit === "number" ? doc.userLimit : 0,
    tempVoiceEntryId: doc.tempVoiceEntryId || null,
    joinChannelId: doc.joinChannelId || null,
  };
}

async function loadTempVoiceData() {
  const docs = await TempVoiceChannel.find({}).lean();
  const data = {};

  for (const doc of docs) {
    if (!data[doc.guildId]) data[doc.guildId] = {};
    data[doc.guildId][doc.channelId] = mapTempVoiceDoc(doc);
  }

  return data;
}

// MongoDB handles persistence automatically
async function saveTempVoiceData() {
  return true;
}

async function ensureGuildTempVoiceData(guildId) {
  const docs = await TempVoiceChannel.find({ guildId }).lean();
  const guildData = {};

  for (const doc of docs) {
    guildData[doc.channelId] = mapTempVoiceDoc(doc);
  }

  return guildData;
}

async function addTempVoiceChannel(guildId, channelId, ownerId, extraData = {}) {
  const payload = {
    guildId,
    channelId,
    ownerId,
    createdAtTimestamp: Date.now(),
    locked: false,
    hidden: false,
    name: "",
    status: "",
    game: "",
    lfm: "",
    userLimit: 0,
    tempVoiceEntryId: null,
    joinChannelId: null,
    ...extraData,
  };

  const doc = await TempVoiceChannel.findOneAndUpdate(
    { channelId },
    { $set: payload },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return mapTempVoiceDoc(doc);
}

async function getTempVoiceChannel(guildId, channelId) {
  const doc = await TempVoiceChannel.findOne({ guildId, channelId }).lean();
  return mapTempVoiceDoc(doc);
}

async function removeTempVoiceChannel(guildId, channelId) {
  const result = await TempVoiceChannel.deleteOne({ guildId, channelId });
  return result.deletedCount > 0;
}

async function isTempVoiceChannel(guildId, channelId) {
  const doc = await TempVoiceChannel.findOne({ guildId, channelId })
    .select("_id")
    .lean();

  return !!doc;
}

async function getUserOwnedTempChannel(guildId, ownerId) {
  const doc = await TempVoiceChannel.findOne({ guildId, ownerId }).lean();
  if (!doc) return null;

  return {
    channelId: doc.channelId,
    ...mapTempVoiceDoc(doc),
  };
}

async function updateTempVoiceChannel(guildId, channelId, updates = {}) {
  const doc = await TempVoiceChannel.findOneAndUpdate(
    { guildId, channelId },
    { $set: updates },
    { new: true }
  ).lean();

  return mapTempVoiceDoc(doc);
}

async function transferTempVoiceOwnership(guildId, channelId, newOwnerId) {
  const doc = await TempVoiceChannel.findOneAndUpdate(
    { guildId, channelId },
    { $set: { ownerId: newOwnerId } },
    { new: true }
  ).lean();

  return mapTempVoiceDoc(doc);
}

module.exports = {
  loadTempVoiceData,
  saveTempVoiceData,
  ensureGuildTempVoiceData,
  addTempVoiceChannel,
  getTempVoiceChannel,
  removeTempVoiceChannel,
  isTempVoiceChannel,
  getUserOwnedTempChannel,
  updateTempVoiceChannel,
  transferTempVoiceOwnership,
};