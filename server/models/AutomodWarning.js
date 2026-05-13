const mongoose = require("mongoose");

const automodWarningSchema = new mongoose.Schema(
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
    ruleKey: {
      type: String,
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    lastViolationAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

automodWarningSchema.index(
  { guildId: 1, userId: 1, ruleKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("AutomodWarning", automodWarningSchema);