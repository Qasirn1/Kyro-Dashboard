const mongoose = require("mongoose");

const CustomBotSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
    },

    ownerId: {
      type: String,
      required: true,
    },

    // 🔐 Bot identity
    botToken: {
      type: String,
      required: true,
    },

    botClientId: {
      type: String,
      required: true,
    },

    // 🎨 Branding
    name: {
      type: String,
      default: "Kyro Bot",
    },

    avatar: {
      type: String, // URL
      default: null,
    },

    // ⚙️ Status
    enabled: {
      type: Boolean,
      default: false,
    },

    // 🎮 Presence (NEW)
    activityType: {
      type: String,
      default: "Listening to",
    },

    activityText: {
      type: String,
      default: "/help",
    },

    status: {
      type: String,
      enum: ["online", "idle", "dnd", "invisible"],
      default: "online",
    },

    // 📊 Meta
    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastStartedAt: {
      type: Date,
      default: null,
    },
  },
  { versionKey: false }
);

// One custom bot per guild
CustomBotSchema.index({ guildId: 1 }, { unique: true });

module.exports = mongoose.model("CustomBot", CustomBotSchema);