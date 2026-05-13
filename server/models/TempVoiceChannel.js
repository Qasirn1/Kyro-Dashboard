const mongoose = require("mongoose");

const tempVoiceChannelSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    createdAtTimestamp: {
      type: Number,
      default: () => Date.now(),
    },
    locked: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
    game: {
      type: String,
      default: "",
    },
    lfm: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

tempVoiceChannelSchema.index({ guildId: 1, ownerId: 1 });
tempVoiceChannelSchema.index({ guildId: 1, channelId: 1 });

module.exports = mongoose.model("TempVoiceChannel", tempVoiceChannelSchema);