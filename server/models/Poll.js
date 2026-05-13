const mongoose = require("mongoose");

const pollOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
    emoji: { type: String, default: null },
    votes: { type: [String], default: [] },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    pollId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    guildId: {
      type: String,
      required: true,
      index: true,
    },

    channelId: {
      type: String,
      default: null,
    },

    messageId: {
      type: String,
      default: null,
    },

    authorId: {
      type: String,
      default: null,
    },

    question: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["buttons", "reactions"],
      default: "buttons",
    },

    options: {
      type: [pollOptionSchema],
      default: [],
    },

    anonymous: {
      type: Boolean,
      default: false,
    },

    multiSelect: {
      type: Boolean,
      default: false,
    },

    ended: {
      type: Boolean,
      default: false,
    },

    endsAt: {
      type: Number,
      default: null,
      index: true,
    },

    createdAtTimestamp: {
      type: Number,
      default: () => Date.now(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Poll", pollSchema);