const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },

    status: {
      type: String,
      enum: ["inactive", "active", "trialing", "past_due", "cancelled", "expired"],
      default: "inactive",
    },

    source: {
      type: String,
      enum: ["manual", "paddle", "trial"],
      default: "manual",
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    currentPeriodEndsAt: {
      type: Date,
      default: null,
    },

    paddleCustomerId: {
      type: String,
      default: null,
    },

    paddleSubscriptionId: {
      type: String,
      default: null,
    },

entitlements: {
  customBranding: {
    type: Boolean,
    default: false,
  },
},

  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);