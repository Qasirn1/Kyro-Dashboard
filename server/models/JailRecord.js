const mongoose = require("mongoose");

const jailRecordSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    roles: {
      type: [String],
      default: [],
    },
    reason: {
      type: String,
      default: "No reason",
    },
    jailedAt: {
      type: Number,
      default: () => Date.now(),
    },
    expiresAt: {
      type: Number,
      default: null,
    },
    jailRoleId: {
      type: String,
      required: true,
    },
    jailedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

jailRecordSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("JailRecord", jailRecordSchema);