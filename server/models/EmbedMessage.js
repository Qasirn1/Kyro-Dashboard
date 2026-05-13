const mongoose = require("mongoose");

const embedMessageSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },

    name: { type: String, default: "Untitled Embed" },

    embed: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      color: { type: String, default: "#5865F2" },
      footer: { type: String, default: "" },
      thumbnail: { type: String, default: "" },
      image: { type: String, default: "" },
    },

    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.EmbedMessage ||
  mongoose.model("EmbedMessage", embedMessageSchema);