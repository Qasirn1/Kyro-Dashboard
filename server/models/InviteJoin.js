const mongoose = require("mongoose");

const inviteJoinSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    invitedUserId: { type: String, required: true, index: true },
    inviterId: { type: String, default: null, index: true },
    inviteCode: { type: String, default: null },

    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

inviteJoinSchema.index({ guildId: 1, invitedUserId: 1 }, { unique: true });

module.exports = mongoose.model("InviteJoin", inviteJoinSchema);