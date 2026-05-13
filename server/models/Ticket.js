const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
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
    panelId: {
      type: String,
      required: true,
    },
    optionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed", "archived"],
      default: "open",
      index: true,
    },
    claimedBy: {
      type: String,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    reopenedFromChannelId: {
      type: String,
      default: null,
    },
    archivedChannelId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TicketSchema.index({ guildId: 1, ownerId: 1, status: 1 });

module.exports = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);