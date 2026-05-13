const mongoose = require("mongoose");

const inviteStatSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    invites: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    fake: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

inviteStatSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("InviteStat", inviteStatSchema);