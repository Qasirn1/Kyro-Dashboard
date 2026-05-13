const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },

  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },

  hostId: { type: String, required: true },

  prize: { type: String, required: true },
  description: { type: String, default: null },

  winnerCount: { type: Number, required: true, default: 1 },

  entries: {
    type: [String],
    default: [],
  },

  requiredRoleId: { type: String, default: null },

  bannerUrl: { type: String, default: null },

  winnerAnnouncementChannelId: { type: String, default: null },
  winnerBannerUrl: { type: String, default: null },
  winnerMessage: { type: String, default: null },

  ended: { type: Boolean, default: false, index: true },

  createdAt: { type: Number, required: true },
  endAt: { type: Number, required: true, index: true },
  endedAt: { type: Number, default: null },

  winners: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("Giveaway", giveawaySchema);