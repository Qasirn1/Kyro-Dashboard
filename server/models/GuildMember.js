const mongoose = require("mongoose");

const guildMemberSchema = new mongoose.Schema(
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

    xp: {
      chatXP: { type: Number, default: 0 },
      voiceXP: { type: Number, default: 0 },
      chatLevel: { type: Number, default: 0 },
      voiceLevel: { type: Number, default: 0 },
    },

    invites: {
      joined: { type: Number, default: 0 },
      left: { type: Number, default: 0 },
      fake: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
    },

    moderation: {
      strikes: { type: Number, default: 0 },
      warnings: { type: Array, default: [] },
      jailed: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

guildMemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("GuildMember", guildMemberSchema);