const mongoose = require("mongoose");

const mutedUserSchema = new mongoose.Schema(
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
    expires: {
      type: Number,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

mutedUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("MutedUser", mutedUserSchema);