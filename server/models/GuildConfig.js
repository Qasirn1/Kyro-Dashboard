const mongoose = require("mongoose");

const serverStatsEntrySchema = new mongoose.Schema(
  {
    id: { type: String, default: null },
    channelId: { type: String, default: null },
    enabled: { type: Boolean, default: true },

    type: {
      type: String,
      enum: [
        "members",
        "humans",
        "bots",
        "online",
        "roles",
        "role_count",
        "channels",
        "text_channels",
        "voice_channels",
        "categories",
        "boosts",
        "time",
        "social",
        "custom",
      ],
      default: "members",
    },

    label: { type: String, default: null },
    roleId: { type: String, default: null },

    emoji: { type: String, default: null },
    timezone: { type: String, default: "UTC" },
    format: { type: String, enum: ["12h", "24h"], default: "12h" },
    display: {
      type: String,
      enum: ["time", "date", "datetime"],
      default: "time",
    },
    numberStyle: {
      type: String,
      enum: ["full", "compact"],
      default: "full",
    },

    platform: { type: String, default: null },
    statType: { type: String, default: null },

    value: { type: Number, default: null },
    fallbackValue: { type: Number, default: null },
    lastValue: { type: Number, default: null },
    lastFetchedAt: { type: Date, default: null },
  },
  { _id: false }
);

const guildConfigSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ───────── WELCOME SYSTEM ───────── */
       welcome: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      mode: {
        type: String,
        enum: ["embed", "background", "both"],
        default: "embed",
      },

      embed: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        color: { type: String, default: "#5865F2" },
        footer: { type: String, default: "" },
        banner: { type: String, default: "" },
        thumbnail: { type: mongoose.Schema.Types.Mixed, default: true },
      },

      card: {
        enabled: { type: Boolean, default: true },
        backgroundUrl: { type: String, default: "" },
        backgroundColor: { type: String, default: "#000000" },
        textColor: { type: String, default: "#ffffff" },
        overlayOpacity: { type: Number, default: 0.45 },
        title: { type: String, default: "WELCOME" },
        subtitle: { type: String, default: "{username}" },
        showAvatar: { type: Boolean, default: true },
      },

      autoRole: {
        enabled: { type: Boolean, default: false },
        roleId: { type: String, default: null },
      },

      dm: {
        enabled: { type: Boolean, default: false },
        mode: {
          type: String,
          enum: ["text", "embed"],
          default: "text",
        },
        message: { type: String, default: "" },
        embed: {
          enabled: { type: Boolean, default: true },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          color: { type: String, default: "#5865F2" },
          footer: { type: String, default: "" },
          banner: { type: String, default: "" },
          thumbnail: { type: mongoose.Schema.Types.Mixed, default: true },
        },
      },
    },

goodbye: {
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },

  embed: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: "👋 Goodbye {username}" },
    description: {
      type: String,
      default: "{username} left **{server}**",
    },
    color: { type: String, default: "#ff4d4d" },
    footer: { type: String, default: "" },
    banner: { type: String, default: "" },
    thumbnail: {
      type: mongoose.Schema.Types.Mixed,
      default: true,
    },
  },
},

       /* ───────── LEVELING SYSTEM ───────── */
    leveling: {
      enabled: { type: Boolean, default: true },

      chat: {
        enabled: { type: Boolean, default: true },

        xpMode: {
          type: String,
          enum: ["fixed", "random"],
          default: "random",
        },

        xpPerMessage: { type: Number, default: 15 },
        minXp: { type: Number, default: 10 },
        maxXp: { type: Number, default: 20 },
        cooldownSeconds: { type: Number, default: 60 },

        ignoredChannelIds: { type: [String], default: [] },
        ignoredRoleIds: { type: [String], default: [] },
      },

      voice: {
        enabled: { type: Boolean, default: true },

        xpPerMinute: { type: Number, default: 10 },

        ignoredChannelIds: { type: [String], default: [] },
        ignoredRoleIds: { type: [String], default: [] },

        requireOtherUsers: { type: Boolean, default: false },
        ignoreMutedUsers: { type: Boolean, default: false },
        ignoreDeafenedUsers: { type: Boolean, default: false },
      },

      announcements: {
        levelUpChannelId: { type: String, default: null },
        levelUpMessage: {
          type: String,
          default: "GG {user}, you reached level {level}!",
        },
      },

      rankCard: {
        backgroundImage: { type: String, default: "" },
        overlayOpacity: { type: Number, default: 0.35 },
        accentColor: { type: String, default: "#5865F2" },
      },

      roleRewardMode: {
        type: String,
        enum: ["stack", "highest"],
        default: "stack",
      },

      roleRewards: {
        type: [
          {
            level: { type: Number, required: true },
            roleId: { type: String, required: true },
          },
        ],
        default: [],
      },

      levelUpEmbed: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "Level Up!" },
        color: { type: String, default: "#5865F2" },
        footer: { type: String, default: "" },
        banner: { type: String, default: "" },
      },
    },
    /* ───────── VERIFICATION SYSTEM ───────── */
    verification: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      messageId: { type: String, default: null },
      verifiedRoleId: { type: String, default: null },
      logChannelId: { type: String, default: null },

      mode: {
        type: String,
        enum: ["button", "captcha"],
        default: "button",
      },

      panelMode: {
        type: String,
        enum: ["builder", "json"],
        default: "builder",
      },

      panel: {
        title: { type: String, default: "Verification Required" },
        description: {
          type: String,
          default: "Click the button below to verify and access the server.",
        },
        color: { type: String, default: "#5865F2" },
        image: { type: String, default: "" },
        thumbnail: { type: String, default: "" },
        footer: { type: String, default: "Powered by Kyro" },
      },

      jsonPanel: {
        enabled: { type: Boolean, default: false },
        raw: { type: String, default: "" },
      },

      button: {
        label: { type: String, default: "Verify" },
        emoji: { type: String, default: "✅" },
        style: {
          type: String,
          enum: ["Primary", "Secondary", "Success", "Danger"],
          default: "Secondary",
        },
        customId: { type: String, default: "kyro_verify" },
      },

      settings: {
        allowReverify: { type: Boolean, default: false },
        sendWelcomeAfterVerify: { type: Boolean, default: false },
        minAccountAgeDays: { type: Number, default: 0 },
        autoKickUnverified: { type: Boolean, default: false },
        autoKickMinutes: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
      },
    },
    /* ───────── LOG SYSTEM ───────── */
        logs: {
      enabled: { type: Boolean, default: false },

      memberJoin: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#57F287" },
      },

      memberLeave: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#ED4245" },
      },

      messageDelete: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#ED4245" },
      },

      messageEdit: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#FEE75C" },
      },

      memberBan: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#ED4245" },
      },

      memberUnban: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#57F287" },
      },

      memberKick: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#FAA61A" },
      },

      timeout: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#5865F2" },
      },

      channelCreate: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#57F287" },
      },

      channelDelete: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#ED4245" },
      },

      channelUpdate: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#FEE75C" },
      },

      roleCreate: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#57F287" },
      },

      roleDelete: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#ED4245" },
      },

      roleUpdate: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        color: { type: String, default: "#FEE75C" },
      },
    },

         /* ───────── AUTOMOD ───────── */
    automod: {
      enabled: { type: Boolean, default: false },

      ignoredChannels: { type: [String], default: [] },
      ignoredRoles: { type: [String], default: [] },

      rules: {
        antiSpam: {
          enabled: { type: Boolean, default: false },

          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },

          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },

          threshold: { type: Number, default: 5 },
          interval: { type: Number, default: 5 },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        badWords: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          blockedWords: { type: [String], default: [] },
          matchPartialWords: { type: Boolean, default: false },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        antiInvites: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        antiLinks: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        capsSpam: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          minLength: { type: Number, default: 8 },
          percentage: { type: Number, default: 70 },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        emojiSpam: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          threshold: { type: Number, default: 8 },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        mentionSpam: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          threshold: { type: Number, default: 5 },
          interval: { type: Number, default: 10 },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },

        massPing: {
          enabled: { type: Boolean, default: false },
          actionMode: {
            type: String,
            enum: ["direct", "warnings"],
            default: "direct",
          },
          action: {
            type: String,
            enum: ["block", "warn", "timeout"],
            default: "block",
          },
          threshold: { type: Number, default: 5 },
          interval: { type: Number, default: 10 },
          duration: { type: Number, default: 10 },

          notify: {
            channel: { type: Boolean, default: true },
            dm: { type: Boolean, default: false },
          },

          warnings: {
            enabled: { type: Boolean, default: false },
            maxWarnings: { type: Number, default: 3 },
            punishment: {
              type: String,
              enum: ["timeout", "kick", "ban"],
              default: "timeout",
            },
            timeoutDuration: { type: Number, default: 10 },
            expiryHours: { type: Number, default: 24 },
          },

          ignoredChannels: { type: [String], default: [] },
          ignoredRoles: { type: [String], default: [] },
        },
      },
    },
/* ───────── JAIL SYSTEM ───────── */
jail: {
  jailRoleId: { type: String, default: null },
  logChannelId: { type: String, default: null },
},
/* ───────── MARKETS ───────── */
markets: {
  enabled: { type: Boolean, default: true },
  defaultCurrency: { type: String, default: "usd" },

  watchlist: {
    type: [String],
    default: [],
  },

  alerts: {
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, default: "price_alert" },
        assetType: { type: String, default: "" },
        symbol: { type: String, default: "" },
        direction: {
          type: String,
          enum: ["above", "below"],
          default: "above",
        },
        targetPrice: { type: Number, default: 0 },
        currency: { type: String, default: "usd" },
        channelId: { type: String, default: null },
        roleId: { type: String, default: null },
        createdBy: { type: String, default: null },
        enabled: { type: Boolean, default: true },
        triggeredAt: { type: String, default: null },
        createdAt: { type: String, default: null },
      },
    ],
    default: [],
  },

  channels: {
    updatesChannelId: { type: String, default: null },
    alertsChannelId: { type: String, default: null },
  },
},
    /* ───────── SECURITY SYSTEM ───────── */
    security: {
      suspiciousAccount: {
        enabled: { type: Boolean, default: false },
        accountAgeDays: { type: Number, default: 7 },
        checkDefaultAvatar: { type: Boolean, default: false },
        action: { type: String, default: "alert" },
        alertChannelId: { type: String, default: null },
        mentionRoleId: { type: String, default: null },
        quarantineRoleId: { type: String, default: null },
      },

      antiRaid: {
        enabled: { type: Boolean, default: false },
        joinThreshold: { type: Number, default: 5 },
        timeWindowSeconds: { type: Number, default: 10 },
        action: { type: String, default: "alert" },
        alertChannelId: { type: String, default: null },
        mentionRoleId: { type: String, default: null },
        quarantineRoleId: { type: String, default: null },
      },
    },
    /* ───────── INVITE TRACKER ───────── */
    inviteTracker: {
      enabled: { type: Boolean, default: false },
      logChannelId: { type: String, default: null },
      fakeAccountDays: { type: Number, default: 7 },
      countFakeAsInvites: { type: Boolean, default: false },
      rewards: {
        type: [
          {
            invites: { type: Number, required: true },
            roleId: { type: String, required: true },
          },
        ],
        default: [],
      },
    },
    /* ───────── RSS ───────── */
    rss: {
      enabled: { type: Boolean, default: false },
      isPremium: { type: Boolean, default: false },

      feeds: {
        type: [
          {
            id: { type: String, default: null },

            title: { type: String, default: "" },
            url: { type: String, default: "" },
            feedUrl: { type: String, default: "" },

            channelId: { type: String, default: null },
            roleId: { type: String, default: null },

            enabled: { type: Boolean, default: true },
            paused: { type: Boolean, default: false },
            pauseReason: { type: String, default: "" },

            lastPostId: { type: String, default: null },
            lastPostDate: { type: String, default: null },

            lastPostFingerprint: { type: String, default: null },
            recentPostFingerprints: { type: [String], default: [] },

            lastChecked: { type: String, default: null },
            lastSuccessfulCheck: { type: String, default: null },

            lastError: { type: String, default: null },
            lastErrorCode: { type: String, default: null },
            lastErrorStatus: { type: Number, default: null },

            createdAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
    },
        /* ───────── SOCIAL ALERTS ───────── */
    socialAlerts: {
      enabled: { type: Boolean, default: true },
      isPremium: { type: Boolean, default: false },

      alerts: {
        type: [
          {
            id: { type: String, default: null },
            platform: { type: String, default: "" },

            creatorUrl: { type: String, default: null },
            creatorId: { type: String, default: null },
            creatorName: { type: String, default: "Unknown Creator" },

            channelId: { type: String, default: null },
            pingRoleId: { type: String, default: null },
            pingRoleIds: { type: [String], default: [] },

            enabled: { type: Boolean, default: true },

            alertUploads: { type: Boolean, default: true },
            alertLives: { type: Boolean, default: true },
            alertPosts: { type: Boolean, default: true },

            messageContent: { type: String, default: null },
            embedTitle: { type: String, default: null },
            embedDescription: { type: String, default: null },

            lastVideoId: { type: String, default: null },
            lastLiveVideoId: { type: String, default: null },

            isLive: { type: Boolean, default: false },
            lastLiveAt: { type: String, default: null },

            lastPostId: { type: String, default: null },
          },
        ],
        default: [],
      },
    },

        /* ───────── TEMPORARY VOICE ───────── */
 temporaryVoice: {
  enabled: { type: Boolean, default: false },

  entries: {
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, default: "Temp Voice Setup" },

        joinChannelId: { type: String, default: null },
        categoryId: { type: String, default: null },
        interfaceChannelId: { type: String, default: null },
        panelMessageId: { type: String, default: null },

        nameFormat: { type: String, default: "{username}'s Room" },
        userLimit: { type: Number, default: 0 },
        bitrate: { type: Number, default: 64000 },

        enabled: { type: Boolean, default: true },
      },
    ],
    default: [],
  },
},
/* ───────── SELF ROLES ───────── */
selfRoles: {
  enabled: { type: Boolean, default: false },

  panels: {
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, default: "Self Role Panel" },

        type: {
          type: String,
          enum: ["buttons", "dropdown", "reactions"],
          default: "buttons",
        },

        selectionMode: {
          type: String,
          enum: ["single", "multi"],
          default: "multi",
        },

        channelId: { type: String, default: null },
        messageId: { type: String, default: null },

        enabled: { type: Boolean, default: true },

        buttonStyle: {
          type: String,
          enum: ["Primary", "Secondary", "Success", "Danger"],
          default: "Secondary",
        },

        embed: {
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          color: { type: String, default: "#5865F2" },
          footer: { type: String, default: "" },
          banner: { type: String, default: "" },
        },

        options: {
          type: [
            {
              id: { type: String, required: true },
              label: { type: String, default: "" },
              description: { type: String, default: "" },
              roleId: { type: String, default: null },

              emoji: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
              },
            },
          ],
          default: [],
        },

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
},

/* ───────── PANELS SYSTEM ───────── */
panels: {
  type: [
    {
      panelId: { type: String, required: true },
      name: { type: String, default: "" },
      type: { type: String, default: "generic" },
      channelId: { type: String, default: null },
      messageId: { type: String, default: null },
      enabled: { type: Boolean, default: true },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  default: [],
},

    /* ───────── SERVER STATS ───────── */
serverStats: {
  enabled: { type: Boolean, default: false },
  categoryId: { type: String, default: null },
  refreshMinutes: { type: Number, default: 5 },
  entries: {
    type: [serverStatsEntrySchema],
    default: [],
  },
  lastUpdated: { type: Date, default: null },
  lastTimeUpdated: { type: Date, default: null },
},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GuildConfig", guildConfigSchema);