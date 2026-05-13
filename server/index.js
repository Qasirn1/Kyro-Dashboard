require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const Parser = require("rss-parser");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
} = require("discord.js");

const GuildConfig = require("./models/GuildConfig");
const CustomBot = require("./models/CustomBot");
const { getCustomBotClient } = require("./customBotManager");

const {
  restartCustomBot,
  stopCustomBot,
  updateCustomBotLive,
} = require("./customBotManager");
const EmbedMessage = require("./models/EmbedMessage");
const MongoStore = require("connect-mongo").default;
const {
  getPremiumStatus,
  getFeatureLimit,
  getSocialPlatformLimit,
} = require("./premium/premiumUtils");

const { createCanvas } = require("canvas");

const activeCustomCaptchas = new Map();

function generateCaptchaCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

function generateCaptchaImage(code) {
  const width = 280;
  const height = 100;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;

    ctx.beginPath();

    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 2,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.font = "bold 42px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";

  const spacing = width / (code.length + 1);

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    const x = spacing * (i + 1);
    const y = height / 2;

    ctx.save();

    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.6);

    ctx.fillText(char, -10, 0);

    ctx.restore();
  }

  return canvas.toBuffer();
}

const app = express();

global.kyroCustomBotInteractionHandler = async (interaction) => {
  try {
    const guildId = interaction.guildId;
    const config = await GuildConfig.findOne({ guildId });
    const verification = normalizeVerificationPayload(config?.verification || {});

    const findPanel = (mode) =>
      verification.panels?.find((p) => p.mode === mode && p.roleId) ||
      verification.panels?.find((p) => p.roleId);

    async function giveVerifiedRole(member, panel, interactionOrReaction) {
      const verifiedRoleId = panel?.roleId;

      if (!verifiedRoleId) {
        return { ok: false, message: "Verified role is not configured." };
      }

      const role = await interactionOrReaction.guild.roles
        .fetch(verifiedRoleId)
        .catch(() => null);

      if (!role) {
        return { ok: false, message: "Verified role not found." };
      }

if (member.roles.cache.has(role.id)) {
  return {
    ok: false,
    message: `⚠️ You are already verified with ${role}.`,
  };
}

      const botMember = await interactionOrReaction.guild.members
        .fetchMe()
        .catch(() => null);

      if (!botMember?.permissions.has("ManageRoles")) {
        return {
          ok: false,
          message: "I need the **Manage Roles** permission to give this role.",
        };
      }

      if (role.position >= botMember.roles.highest.position) {
        return {
          ok: false,
          message: `I cannot give ${role}. Move my bot role above this role in Server Settings → Roles.`,
        };
      }

      await member.roles.add(role, "Kyro verification role reward");

      return {
        ok: true,
        role,
        message: `✅ You have been verified and received ${role}.`,
      };
    }

 if (interaction.isButton() && interaction.customId === "kyro_verify") {
  const member = interaction.member;

  const clickedPanel =
    verification.panels?.find(
      (p) => p?.sentPanel?.messageId === interaction.message?.id
    ) ||
    verification.panels?.find((p) => p.roleId);

 if (clickedPanel?.mode === "captcha") {
  const code = generateCaptchaCode(6);
  const key = `${interaction.guildId}:${interaction.user.id}`;

  activeCustomCaptchas.set(key, {
    code,
    panel: clickedPanel,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  const buffer = generateCaptchaImage(code);
  const attachment = new AttachmentBuilder(buffer, { name: "captcha.png" });

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🔐 Captcha Verification")
    .setDescription(
      "Please type the code shown in the image below.\n\nClick **Enter Captcha** to submit.\nThis expires in **5 minutes**."
    )
    .setImage("attachment://captcha.png");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("kyro_custom_captcha_modal_open")
      .setLabel("Enter Captcha")
      .setStyle(ButtonStyle.Primary)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
    files: [attachment],
    ephemeral: true,
  });
}

  const result = await giveVerifiedRole(member, clickedPanel, interaction);

  return interaction.reply({
    content: result.message,
    ephemeral: true,
  });
}

   if (
  interaction.isButton() &&
  interaction.customId === "kyro_custom_captcha_modal_open"
) {
  const modal = new ModalBuilder()
    .setCustomId("kyro_custom_captcha_modal")
    .setTitle("Captcha Verification");

  const input = new TextInputBuilder()
    .setCustomId("captcha_answer")
    .setLabel("Enter the captcha code")
    .setPlaceholder("Type the code exactly as shown")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(4)
    .setMaxLength(12);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  return interaction.showModal(modal);
}

if (
  interaction.isModalSubmit() &&
  interaction.customId === "kyro_custom_captcha_modal"
) {
  const key = `${interaction.guildId}:${interaction.user.id}`;
  const session = activeCustomCaptchas.get(key);

  if (!session || Date.now() > session.expiresAt) {
    activeCustomCaptchas.delete(key);

    return interaction.reply({
      content: "❌ Your captcha expired. Please click Verify again.",
      ephemeral: true,
    });
  }

  const answer = interaction.fields
    .getTextInputValue("captcha_answer")
    .trim()
    .toUpperCase();

  if (answer !== session.code) {
    activeCustomCaptchas.delete(key);

    return interaction.reply({
      content: "❌ Incorrect captcha code. Please click Verify and try again.",
      ephemeral: true,
    });
  }

  activeCustomCaptchas.delete(key);

  const result = await giveVerifiedRole(
    interaction.member,
    session.panel,
    interaction
  );

  return interaction.reply({
    content: result.message,
    ephemeral: true,
  });
}

  } catch (error) {
    console.error("❌ Global custom bot interaction error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while verifying you.",
        ephemeral: true,
      }).catch(() => null);
    }
  }
};

global.kyroCustomBotReactionHandler = async (reaction, user) => {
  try {
    if (!reaction || !user || user.bot) return;

    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }

    if (reaction.message?.partial) {
      await reaction.message.fetch().catch(() => null);
    }

    const guild = reaction.message?.guild;
    const guildId = guild?.id;

    if (!guild || !guildId) return;

    const config = await GuildConfig.findOne({ guildId });
    const verification = normalizeVerificationPayload(config?.verification || {});

    const panel = verification.panels?.find(
      (p) =>
        p.mode === "reaction" &&
        p.roleId &&
        p.sentPanel?.messageId === reaction.message.id
    );

    if (!panel) return;

    const expectedEmoji = parseDiscordEmoji(panel.interaction?.reaction?.emoji);

    const expectedId =
      typeof expectedEmoji === "object" && expectedEmoji?.id
        ? String(expectedEmoji.id)
        : null;

    const expectedName =
      typeof expectedEmoji === "string"
        ? expectedEmoji
        : expectedEmoji?.name;

    const reactedId = reaction.emoji?.id ? String(reaction.emoji.id) : null;
    const reactedName = reaction.emoji?.name;

    const matches = expectedId
      ? reactedId === expectedId
      : reactedName === expectedName;

    if (!matches) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = await guild.roles.fetch(panel.roleId).catch(() => null);
    if (!role) return;

    const botMember = await guild.members.fetchMe().catch(() => null);

    if (!botMember?.permissions.has("ManageRoles")) {
      await user
        .send("❌ I need the **Manage Roles** permission to verify you.")
        .catch(() => null);
      return;
    }

    if (role.position >= botMember.roles.highest.position) {
      await user
        .send(`❌ I cannot give ${role.name}. Move my bot role above it.`)
        .catch(() => null);
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await user
        .send(`⚠️ You are already verified with ${role.name}.`)
        .catch(() => null);
      return;
    }

    await member.roles.add(role, "Kyro reaction verification");

  await user
  .send(`✅ You have been verified in **${guild.name}** and received **${role.name}**.`)
      .catch(() => null);
  } catch (error) {
    console.error("❌ Custom bot reaction verification error:", error);
  }
};

const PORT = process.env.PORT || 3001;
const KYRO_BOT_API_BASE_URL =
  process.env.KYRO_BOT_API_BASE_URL || "http://localhost:3000";
const INTERNAL_API_TOKEN =
  process.env.INTERNAL_API_TOKEN || "kyro_internal_refresh_token";

  const FREE_RSS_FEED_LIMIT = 3;
/* ───────── DISCORD BOT CLIENT ───────── */

const botClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, // required
  ],
});
botClient.once("clientReady", () => {
  console.log(`🤖 Dashboard bot ready as ${botClient.user?.tag}`);
});
botClient
  .login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log("🤖 Dashboard bot client logged in"))
  .catch((err) => console.error("❌ Dashboard bot login failed:", err));

const allowedOrigins = [
  "https://kyro-dashboard-eight.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.json());

app.use(
  session({
    name: "kyro.sid",
    secret: process.env.SESSION_SECRET || "kyro-secret-key",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "dashboard_sessions",
      ttl: 60 * 60 * 24 * 7, // 7 days
      autoRemove: "native",
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

/* ───────────────────── MONGODB ───────────────────── */

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🍃 Dashboard MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ Dashboard MongoDB connection error:", error);
    process.exit(1);
  }
}

async function getOrCreateGuildConfig(guildId) {
  if (!guildId) return null;

  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = await GuildConfig.create({ guildId });
  }

  return config;
}

/* ───────────────────── NORMALIZERS ───────────────────── */
function normalizeAutomodPayload(payload = {}) {
  const defaultRule = (rule = {}) => ({
    enabled: rule.enabled ?? false,
    actionMode: rule.actionMode === "warnings" ? "warnings" : "direct",
    action: ["block", "warn", "timeout"].includes(rule.action)
      ? rule.action
      : "block",
    duration: Math.max(1, Number(rule.duration ?? 10)),

    notify: {
      channel: rule.notify?.channel ?? true,
      dm: rule.notify?.dm ?? false,
    },

    warnings: {
      enabled: rule.warnings?.enabled ?? false,
      maxWarnings: Math.max(1, Number(rule.warnings?.maxWarnings ?? 3)),
      punishment: ["timeout", "kick", "ban"].includes(rule.warnings?.punishment)
        ? rule.warnings.punishment
        : "timeout",
      timeoutDuration: Math.max(
        1,
        Number(rule.warnings?.timeoutDuration ?? 10)
      ),
      expiryHours: Math.max(1, Number(rule.warnings?.expiryHours ?? 24)),
    },

    ignoredChannels: Array.isArray(rule.ignoredChannels)
      ? rule.ignoredChannels.filter(Boolean).map(String)
      : [],
    ignoredRoles: Array.isArray(rule.ignoredRoles)
      ? rule.ignoredRoles.filter(Boolean).map(String)
      : [],
  });

  return {
    enabled: payload.enabled ?? false,
    ignoredChannels: Array.isArray(payload.ignoredChannels)
      ? payload.ignoredChannels.filter(Boolean).map(String)
      : [],
    ignoredRoles: Array.isArray(payload.ignoredRoles)
      ? payload.ignoredRoles.filter(Boolean).map(String)
      : [],

    rules: {
      antiSpam: {
        ...defaultRule(payload.rules?.antiSpam),
        threshold: Math.max(1, Number(payload.rules?.antiSpam?.threshold ?? 5)),
        interval: Math.max(1, Number(payload.rules?.antiSpam?.interval ?? 5)),
      },

      badWords: {
        ...defaultRule(payload.rules?.badWords),
        blockedWords: Array.isArray(payload.rules?.badWords?.blockedWords)
          ? payload.rules.badWords.blockedWords.filter(Boolean).map(String)
          : [],
        matchPartialWords: payload.rules?.badWords?.matchPartialWords ?? false,
      },

      antiInvites: {
        ...defaultRule(payload.rules?.antiInvites),
      },

      antiLinks: {
        ...defaultRule(payload.rules?.antiLinks),
      },

      capsSpam: {
        ...defaultRule(payload.rules?.capsSpam),
        minLength: Math.max(1, Number(payload.rules?.capsSpam?.minLength ?? 8)),
        percentage: Math.min(
          100,
          Math.max(1, Number(payload.rules?.capsSpam?.percentage ?? 70))
        ),
      },

      emojiSpam: {
        ...defaultRule(payload.rules?.emojiSpam),
        threshold: Math.max(1, Number(payload.rules?.emojiSpam?.threshold ?? 8)),
      },

      mentionSpam: {
        ...defaultRule(payload.rules?.mentionSpam),
        threshold: Math.max(
          1,
          Number(payload.rules?.mentionSpam?.threshold ?? 5)
        ),
        interval: Math.max(1, Number(payload.rules?.mentionSpam?.interval ?? 10)),
      },

      massPing: {
        ...defaultRule(payload.rules?.massPing),
        threshold: Math.max(1, Number(payload.rules?.massPing?.threshold ?? 5)),
        interval: Math.max(1, Number(payload.rules?.massPing?.interval ?? 10)),
      },
    },
  };
}

function normalizeGoodbyePayload(payload = {}) {
  return {
    enabled: payload.enabled ?? false,
    channelId: payload.channelId || null,

    embed: {
      enabled: payload.embed?.enabled ?? true,
      title: payload.embed?.title || "👋 Goodbye {username}",
      description: payload.embed?.description || "",
      color: payload.embed?.color || "#ff4d4d",
      footer: payload.embed?.footer || "",
      banner: payload.embed?.banner || "",
      thumbnail:
        payload.embed?.thumbnail === false || payload.embed?.thumbnail === "false"
          ? false
          : payload.embed?.thumbnail === true || payload.embed?.thumbnail === "true"
          ? true
          : typeof payload.embed?.thumbnail === "string"
          ? payload.embed.thumbnail
          : true,
    },
  };
}
function normalizeLogsPayload(payload = {}) {
  const normalizeLogItem = (item = {}, defaultColor = "#5865F2") => ({
    enabled: item.enabled ?? false,
    channelId: item.channelId || null,
    color: item.color || defaultColor,
  });

  return {
    enabled: payload.enabled ?? false,

    memberJoin: normalizeLogItem(payload.memberJoin, "#57F287"),
    memberLeave: normalizeLogItem(payload.memberLeave, "#ED4245"),

    messageDelete: normalizeLogItem(payload.messageDelete, "#ED4245"),
    messageEdit: normalizeLogItem(payload.messageEdit, "#FEE75C"),

    memberBan: normalizeLogItem(payload.memberBan, "#ED4245"),
    memberUnban: normalizeLogItem(payload.memberUnban, "#57F287"),
    memberKick: normalizeLogItem(payload.memberKick, "#FAA61A"),
    timeout: normalizeLogItem(payload.timeout, "#5865F2"),

    channelCreate: normalizeLogItem(payload.channelCreate, "#57F287"),
    channelDelete: normalizeLogItem(payload.channelDelete, "#ED4245"),
    channelUpdate: normalizeLogItem(payload.channelUpdate, "#FEE75C"),

    roleCreate: normalizeLogItem(payload.roleCreate, "#57F287"),
    roleDelete: normalizeLogItem(payload.roleDelete, "#ED4245"),
    roleUpdate: normalizeLogItem(payload.roleUpdate, "#FEE75C"),
  };
}

function normalizeServerStatsEntry(entry = {}, index = 0) {
  const allowedTypes = [
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
  ];

  const allowedDisplays = ["time", "date", "datetime"];
  const allowedFormats = ["12h", "24h"];
  const allowedNumberStyles = ["full", "compact"];

  return {
    id: entry.id || `stat_${Date.now()}_${index}`,
    channelId: entry.channelId || null,
    enabled: entry.enabled !== false,

    type: allowedTypes.includes(entry.type) ? entry.type : "members",
    label: typeof entry.label === "string" ? entry.label : null,

    roleId: entry.roleId || null,

    emoji: typeof entry.emoji === "string" ? entry.emoji : null,
    timezone:
      typeof entry.timezone === "string" && entry.timezone.trim()
        ? entry.timezone
        : "UTC",
    format: allowedFormats.includes(entry.format) ? entry.format : "12h",
    display: allowedDisplays.includes(entry.display) ? entry.display : "time",
    numberStyle: allowedNumberStyles.includes(entry.numberStyle)
      ? entry.numberStyle
      : "full",

    platform: typeof entry.platform === "string" ? entry.platform : null,
    statType: typeof entry.statType === "string" ? entry.statType : null,

    value: typeof entry.value === "number" ? entry.value : null,
    fallbackValue:
      typeof entry.fallbackValue === "number" ? entry.fallbackValue : null,
    lastValue: typeof entry.lastValue === "number" ? entry.lastValue : null,
    lastFetchedAt: entry.lastFetchedAt || null,
  };
}

function normalizeServerStatsPayload(payload = {}) {
  return {
    enabled: payload.enabled ?? false,
    categoryId: payload.categoryId || null,
    refreshMinutes:
      Number(payload.refreshMinutes) > 0
        ? Number(payload.refreshMinutes)
        : 5,
    entries: Array.isArray(payload.entries)
      ? payload.entries.map((entry, index) =>
          normalizeServerStatsEntry(entry, index)
        )
      : [],
    lastUpdated: payload.lastUpdated || null,
  };
}
function buildTempVoicePanelEmbed() {
  return {
    color: 0x5865f2,
    title: "🎙️ Temporary Voice Interface",
    description: [
      "**Use the dropdown menus below to control your temporary voice channel.**",
      "",
      "You must own an active temporary voice room to use these controls.",
      "",
      "**Channel Settings Menu**",
      "• Rename your room",
      "• Change user limit",
      "• Set status / game / LFM",
      "• Claim ownership if owner left",
      "",
      "**Channel Permissions Menu**",
      "• Lock / Unlock channel",
      "• Hide / Unhide channel",
      "• Permit user access",
      "• Reject user access",
      "• Invite user access",
    ].join("\n"),
  };
}

function buildTempVoicePanelComponents() {
  return [
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "tempvoice_settings_menu",
          placeholder: "Change channel settings",
          options: [
            {
              label: "Rename",
              description: "Change your temporary voice channel name.",
              value: "rename",
              emoji: { name: "📝" },
            },
            {
              label: "Limit",
              description: "Change your temporary voice channel user limit.",
              value: "limit",
              emoji: { name: "👥" },
            },
            {
              label: "Status",
              description: "Set a custom room status.",
              value: "status",
              emoji: { name: "💬" },
            },
            {
              label: "Game",
              description: "Set room name from your game.",
              value: "game",
              emoji: { name: "🎮" },
            },
            {
              label: "LFM",
              description: "Looking for members status.",
              value: "lfm",
              emoji: { name: "📣" },
            },
            {
              label: "Claim Ownership",
              description: "Claim this room if the owner has left.",
              value: "claim",
              emoji: { name: "👑" },
            },
          ],
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "tempvoice_permissions_menu",
          placeholder: "Change channel permissions",
          options: [
            {
              label: "Lock",
              description: "Lock your temporary voice channel.",
              value: "lock",
              emoji: { name: "🔒" },
            },
            {
              label: "Unlock",
              description: "Unlock your temporary voice channel.",
              value: "unlock",
              emoji: { name: "🔓" },
            },
            {
              label: "Hide",
              description: "Hide your temporary voice channel.",
              value: "hide",
              emoji: { name: "🙈" },
            },
            {
              label: "Unhide",
              description: "Unhide your temporary voice channel.",
              value: "unhide",
              emoji: { name: "👀" },
            },
            {
              label: "Permit",
              description: "Allow a user to access your room.",
              value: "permit",
              emoji: { name: "✅" },
            },
            {
              label: "Reject",
              description: "Block a user from accessing your room.",
              value: "reject",
              emoji: { name: "⛔" },
            },
            {
              label: "Invite",
              description: "Invite a user to your room.",
              value: "invite",
              emoji: { name: "📨" },
            },
          ],
        },
      ],
    },
  ];
}
function normalizeTicketsPayload(payload = {}) {
  const panels = Array.isArray(payload.panels) ? payload.panels : [];

  return {
    enabled: payload.enabled ?? false,

  premiumTrial: {
  activatedAt: payload.premiumTrial?.activatedAt || null,
  expiresAt:
    payload.premiumTrial?.expiresAt ||
    payload.premiumTrial?.endsAt ||
    null,
  endsAt:
    payload.premiumTrial?.endsAt ||
    payload.premiumTrial?.expiresAt ||
    null,
  isActive: payload.premiumTrial?.isActive ?? false,
  hasPremium: payload.premiumTrial?.hasPremium ?? false,
  plan: payload.premiumTrial?.plan || "free",
},

    panels: panels.map((panel, index) => ({
      id: panel.id || `panel_${Date.now()}_${index}`,
      name: panel.name || `Ticket Panel ${index + 1}`,
      channelId: panel.channelId || null,

      panelMessage: {
        useEmbed: panel.panelMessage?.useEmbed ?? false,
        title: panel.panelMessage?.title || "How can we help?",
        description:
          panel.panelMessage?.description ||
          "Welcome to our ticket support service! If you have any issues or concerns, please use the button below.",
        color: panel.panelMessage?.color || "#5865F2",
        bannerUrl: panel.panelMessage?.bannerUrl || "",
        footer: panel.panelMessage?.footer || "",
      },

      ticketIntroMessage: {
        useEmbed: panel.ticketIntroMessage?.useEmbed ?? false,
        title: panel.ticketIntroMessage?.title || "Your ticket has been created.",
        description:
          panel.ticketIntroMessage?.description ||
          "Please provide any additional info you deem relevant to help us answer faster.",
        color: panel.ticketIntroMessage?.color || "#5865F2",
        bannerUrl: panel.ticketIntroMessage?.bannerUrl || "",
        footer: panel.ticketIntroMessage?.footer || "",
      },

      ticketTypeMode:
        panel.ticketTypeMode === "dropdown" ? "dropdown" : "buttons",

      supportRoleIds: Array.isArray(panel.supportRoleIds)
        ? panel.supportRoleIds.filter(Boolean).map(String)
        : [],

      managerRoleIds: Array.isArray(panel.managerRoleIds)
        ? panel.managerRoleIds.filter(Boolean).map(String)
        : Array.isArray(panel.supportRoleIds)
        ? panel.supportRoleIds.filter(Boolean).map(String)
        : [],

      options: Array.isArray(panel.options)
        ? panel.options.map((option, optionIndex) => ({
            id: option.id || `opt_${Date.now()}_${optionIndex}`,
            label: option.label || `Option ${optionIndex + 1}`,
            emoji: option.emoji || "🎫",
            description: option.description || "",
            buttonStyle: ["primary", "secondary", "success", "danger"].includes(
              option.buttonStyle
            )
              ? option.buttonStyle
              : "primary",

            openCategoryId: option.openCategoryId || null,
            claimedCategoryId: option.claimedCategoryId || null,
            closedCategoryId: option.closedCategoryId || null,

            staffRoleId: option.staffRoleId || null,
            staffRoleIds: Array.isArray(option.staffRoleIds)
              ? option.staffRoleIds.filter(Boolean).map(String)
              : option.staffRoleId
              ? [String(option.staffRoleId)]
              : [],

            formEnabled: option.formEnabled ?? false,
            formTitle: option.formTitle || "",
            formQuestions: Array.isArray(option.formQuestions)
              ? option.formQuestions.map((question, qIndex) => ({
                  id: question.id || `q_${Date.now()}_${qIndex}`,
                  label: question.label || `Question ${qIndex + 1}`,
                  type: question.type === "paragraph" ? "paragraph" : "short",
                  placeholder: question.placeholder || "",
                  required: question.required ?? false,
                }))
              : [],
          }))
        : [],

      transcripts: {
        enabled: panel.transcripts?.enabled ?? false,
        channelId: panel.transcripts?.channelId || null,
        sendToUserDm: panel.transcripts?.sendToUserDm ?? false,
      },

      logs: {
        enabled: panel.logs?.enabled ?? false,
        channelId: panel.logs?.channelId || null,
      },

      behavior: {
        claimEnabled: panel.behavior?.claimEnabled ?? true,
        closeEnabled: panel.behavior?.closeEnabled ?? true,
        reopenEnabled: panel.behavior?.reopenEnabled ?? true,
        deleteEnabled: panel.behavior?.deleteEnabled ?? true,
        autoDeleteClosed: panel.behavior?.autoDeleteClosed ?? false,
        autoDeleteDuration: panel.behavior?.autoDeleteDuration || "24h",
        maxOpenTicketsPerUser: Math.max(
          1,
          Number(panel.behavior?.maxOpenTicketsPerUser ?? 1)
        ),
        pingStaffOnOpen: panel.behavior?.pingStaffOnOpen ?? true,
      },

      sentPanel: {
        messageId: panel.sentPanel?.messageId || null,
        channelId: panel.sentPanel?.channelId || null,
        publishedAt: panel.sentPanel?.publishedAt || null,
      },
    })),
  };
}

function normalizeSelfRoleEmoji(emoji) {
  if (!emoji) return "";

  if (typeof emoji === "object" && emoji.id) {
    return {
      id: String(emoji.id),
      name: emoji.name || "",
      animated: !!emoji.animated,
      url:
        emoji.url ||
        `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=64`,
    };
  }

  if (typeof emoji === "string") {
    return emoji;
  }

  return "";
}

function normalizeSelfRolesPayload(payload = {}) {
  const panels = Array.isArray(payload.panels) ? payload.panels : [];

  return {
    enabled: payload.enabled ?? false,

    panels: panels.map((panel, index) => ({
      id: panel.id || `panel_${Date.now()}_${index}`,
      name: panel.name || `Role Panel ${index + 1}`,

      type: ["buttons", "dropdown", "reactions"].includes(panel.type)
        ? panel.type
        : "buttons",

      selectionMode: ["single", "multi"].includes(panel.selectionMode)
        ? panel.selectionMode
        : "single",

      channelId: panel.channelId || "",
      messageId: panel.messageId || "",

      enabled: panel.enabled ?? true,

      buttonStyle: ["Primary", "Secondary", "Success", "Danger"].includes(
        panel.buttonStyle
      )
        ? panel.buttonStyle
        : "Secondary",

      placeholder: panel.placeholder || "Choose your role",

      embed: {
        title: panel.embed?.title || "Pick your roles",
        description:
          panel.embed?.description ||
          "Choose the roles you want from the panel below.",
        color: panel.embed?.color || "#5865F2",
        footer: panel.embed?.footer || "",
        banner: panel.embed?.banner || "",
        thumbnail: panel.embed?.thumbnail || "",
        headerIcon: panel.embed?.headerIcon || "",
      },

      options: Array.isArray(panel.options)
        ? panel.options.map((option, optionIndex) => ({
            id: option.id || `opt_${Date.now()}_${optionIndex}`,
            roleId: option.roleId || "",
            label: option.label || "",
            emoji: normalizeSelfRoleEmoji(option.emoji),
            description: option.description || "",
            buttonColor: ["Primary", "Secondary", "Success", "Danger"].includes(
              option.buttonColor
            )
              ? option.buttonColor
              : "Primary",
          }))
        : [],

      sentPanel: {
        messageId: panel.sentPanel?.messageId || null,
        channelId: panel.sentPanel?.channelId || null,
        publishedAt: panel.sentPanel?.publishedAt || null,
      },
    })),
  };
}

function normalizeLevelingPayload(body = {}) {
  const toStringArray = (value) =>
    Array.isArray(value) ? [...new Set(value.filter(Boolean).map(String))] : [];

  const safeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const flatIgnoredChatChannels =
    body.disabledChannels ||
    body.ignoredChannels ||
    [];

  const flatIgnoredChatRoles =
    body.ignoredRoleIds ||
    body.disabledRoleIds ||
    body.ignoredRoles ||
    [];

  const flatIgnoredVoiceChannels =
    body.disabledVoiceChannels ||
    body.ignoredVoiceChannels ||
    body.voiceDisabledChannels ||
    [];

  const flatIgnoredVoiceRoles =
    body.voiceIgnoredRoleIds ||
    body.voiceIgnoredRoles ||
    body.ignoredRoleIds ||
    [];

  const nestedChat = body.chat || {};
  const nestedVoice = body.voice || {};
  const nestedAnnouncements = body.announcements || {};
  const nestedRankCard = body.rankCard || {};

  const chatXpMode = ["fixed", "random"].includes(nestedChat?.xpMode)
    ? nestedChat.xpMode
    : "fixed";

  const xpPerMessage = Math.max(
    1,
    safeNumber(
      nestedChat?.xpPerMessage ??
        body.chatXpRate ??
        10,
      10
    )
  );

  const minXp = Math.max(
    1,
    safeNumber(
      nestedChat?.minXp ??
        body.minXp ??
        xpPerMessage,
      xpPerMessage
    )
  );

  const maxXp = Math.max(
    minXp,
    safeNumber(
      nestedChat?.maxXp ??
        body.maxXp ??
        xpPerMessage,
      xpPerMessage
    )
  );

  const cooldownSeconds = Math.max(
    0,
    safeNumber(
      nestedChat?.cooldownSeconds ??
        body.chatCooldownSeconds ??
        body.xpCooldownSeconds ??
        60,
      60
    )
  );

  const voiceXpPerMinute = Math.max(
    1,
    safeNumber(
      nestedVoice?.xpPerMinute ??
        body.voiceXpRate ??
        body.voiceXpPerMinute ??
        5,
      5
    )
  );

  return {
    enabled: body.enabled ?? true,

    chat: {
      enabled: nestedChat?.enabled ?? true,
      xpMode: chatXpMode,
      xpPerMessage,
      minXp,
      maxXp,
      cooldownSeconds,

      ignoredChannelIds: toStringArray(
        nestedChat?.ignoredChannelIds ?? flatIgnoredChatChannels
      ),
      ignoredRoleIds: toStringArray(
        nestedChat?.ignoredRoleIds ?? flatIgnoredChatRoles
      ),
    },

    voice: {
      enabled: nestedVoice?.enabled ?? true,
      xpPerMinute: voiceXpPerMinute,

      ignoredChannelIds: toStringArray(
        nestedVoice?.ignoredChannelIds ?? flatIgnoredVoiceChannels
      ),
      ignoredRoleIds: toStringArray(
        nestedVoice?.ignoredRoleIds ?? flatIgnoredVoiceRoles
      ),

      requireOtherUsers: nestedVoice?.requireOtherUsers ?? false,
      ignoreMutedUsers: nestedVoice?.ignoreMutedUsers ?? false,
      ignoreDeafenedUsers: nestedVoice?.ignoreDeafenedUsers ?? false,
    },

    announcements: {
      levelUpChannelId:
        nestedAnnouncements?.levelUpChannelId ||
        body.levelUpChannelId ||
        body.levelUpChannel ||
        null,

      levelUpMessage:
        typeof nestedAnnouncements?.levelUpMessage === "string"
          ? nestedAnnouncements.levelUpMessage
          : typeof body.levelUpMessage === "string"
          ? body.levelUpMessage
          : "GG {user}, you reached level {level}!",
    },

    rankCard: {
      backgroundImage:
        nestedRankCard?.backgroundImage ||
        body.rankCardBackgroundImage ||
        "",
      overlayOpacity: Math.max(
        0,
        Math.min(
          1,
          safeNumber(
            nestedRankCard?.overlayOpacity ?? body.overlayOpacity ?? 0.35,
            0.35
          )
        )
      ),
      accentColor:
        nestedRankCard?.accentColor ||
        body.accentColor ||
        "#5865F2",
    },

    roleRewardMode: ["stack", "highest"].includes(body.roleRewardMode)
      ? body.roleRewardMode
      : "stack",

    roleRewards: Array.isArray(body.roleRewards)
      ? body.roleRewards
          .map((r) => ({
            level: Math.max(1, safeNumber(r.level, 1)),
            roleId: r.roleId ? String(r.roleId) : "",
          }))
          .filter((r) => r.roleId)
      : [],

    levelUpEmbed: {
      enabled: body.levelUpEmbed?.enabled ?? true,
      title: body.levelUpEmbed?.title || "Level Up!",
      color: body.levelUpEmbed?.color || "#5865F2",
      footer: body.levelUpEmbed?.footer || "",
      banner: body.levelUpEmbed?.banner || "",
    },
  };
}

function normalizeInviteTrackerPayload(body = {}) {
  return {
    enabled: Boolean(body.enabled),
    logChannelId: body.logChannelId || "",
    fakeAccountDays: Math.max(1, Number(body.fakeAccountDays ?? 7)),
    countFakeAsInvites: Boolean(body.countFakeAsInvites),
    rewards: Array.isArray(body.rewards)
      ? body.rewards
          .map((reward) => ({
            invites: Number(reward.invites ?? 0),
            roleId: reward.roleId || "",
          }))
          .filter((reward) => reward.invites > 0 && reward.roleId)
          .sort((a, b) => a.invites - b.invites)
      : [],
  };
}

function normalizeSocialAlertsPayload(payload = {}) {
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];

  return {
    enabled: payload.enabled ?? true,
    isPremium: payload.isPremium ?? false,

    alerts: alerts.map((alert, index) => {
      const singleRole =
        typeof alert.pingRoleId === "string"
          ? alert.pingRoleId.trim()
          : null;

      const multiRoles = Array.isArray(alert.pingRoleIds)
        ? alert.pingRoleIds.filter(Boolean).map((r) => String(r))
        : [];

      return {
        id:
          typeof alert.id === "string" && alert.id.trim()
            ? alert.id.trim()
            : `social_${Date.now()}_${index}`,

        platform:
          typeof alert.platform === "string"
            ? alert.platform.toLowerCase().trim()
            : "youtube",

        creatorUrl:
          typeof alert.creatorUrl === "string"
            ? alert.creatorUrl.trim()
            : null,

        creatorId:
          typeof alert.creatorId === "string"
            ? alert.creatorId.trim()
            : null,

        creatorName:
          typeof alert.creatorName === "string" && alert.creatorName.trim()
            ? alert.creatorName.trim()
            : "Unknown Creator",

        channelId:
          typeof alert.channelId === "string"
            ? alert.channelId.trim()
            : null,

        // ✅ LEGACY SINGLE ROLE (kept for compatibility)
        pingRoleId: singleRole,

        // ✅ MULTI ROLE SUPPORT (MAIN)
        pingRoleIds:
          multiRoles.length > 0
            ? multiRoles
            : singleRole
            ? [singleRole]
            : [],

        enabled: alert.enabled ?? true,

        alertUploads: alert.alertUploads ?? true,
        alertLives: alert.alertLives ?? true,
        alertPosts: alert.alertPosts ?? true,

        messageContent:
          typeof alert.messageContent === "string"
            ? alert.messageContent
            : null,

        embedTitle:
          typeof alert.embedTitle === "string"
            ? alert.embedTitle
            : null,

        embedDescription:
          typeof alert.embedDescription === "string"
            ? alert.embedDescription
            : null,

        lastVideoId:
          typeof alert.lastVideoId === "string"
            ? alert.lastVideoId
            : null,

        lastLiveVideoId:
          typeof alert.lastLiveVideoId === "string"
            ? alert.lastLiveVideoId
            : null,

        isLive: alert.isLive ?? false,

        lastLiveAt:
          typeof alert.lastLiveAt === "string"
            ? alert.lastLiveAt
            : null,

        lastPostId:
          typeof alert.lastPostId === "string"
            ? alert.lastPostId
            : null,

        profileImageUrl:
          typeof alert.profileImageUrl === "string"
            ? alert.profileImageUrl
            : null,

        uploadsPlaylistId:
          typeof alert.uploadsPlaylistId === "string"
            ? alert.uploadsPlaylistId
            : null,
      };
    }),
  };
}

function normalizeRssPayload(payload = {}) {
  const feeds = Array.isArray(payload.feeds) ? payload.feeds : [];

  return {
    enabled: payload.enabled ?? false,
    isPremium: payload.isPremium ?? false,

    feeds: feeds.map((feed, index) => ({
      id:
        typeof feed.id === "string" && feed.id.trim()
          ? feed.id.trim()
          : `rss_${Date.now()}_${index}`,

      title:
        typeof feed.title === "string"
          ? feed.title.trim()
          : "",

      url:
        typeof feed.url === "string"
          ? feed.url.trim()
          : "",

      feedUrl:
        typeof feed.feedUrl === "string"
          ? feed.feedUrl.trim()
          : "",

      channelId:
        typeof feed.channelId === "string"
          ? feed.channelId.trim()
          : null,

      roleId:
        typeof feed.roleId === "string"
          ? feed.roleId.trim()
          : null,

      enabled: feed.enabled ?? true,
      paused: feed.paused ?? false,

      pauseReason:
        typeof feed.pauseReason === "string"
          ? feed.pauseReason
          : "",

      lastPostId:
        typeof feed.lastPostId === "string"
          ? feed.lastPostId
          : null,

      lastPostDate:
        typeof feed.lastPostDate === "string"
          ? feed.lastPostDate
          : null,

      lastPostFingerprint:
        typeof feed.lastPostFingerprint === "string"
          ? feed.lastPostFingerprint
          : null,

      recentPostFingerprints: Array.isArray(feed.recentPostFingerprints)
        ? feed.recentPostFingerprints.filter(Boolean).map(String).slice(0, 15)
        : [],

      lastChecked:
        typeof feed.lastChecked === "string"
          ? feed.lastChecked
          : null,

      lastSuccessfulCheck:
        typeof feed.lastSuccessfulCheck === "string"
          ? feed.lastSuccessfulCheck
          : null,

      lastError:
        typeof feed.lastError === "string"
          ? feed.lastError
          : null,

      lastErrorCode:
        typeof feed.lastErrorCode === "string"
          ? feed.lastErrorCode
          : null,

      lastErrorStatus:
        typeof feed.lastErrorStatus === "number"
          ? feed.lastErrorStatus
          : null,

      createdAt: feed.createdAt || new Date(),
    })),
  };
}

const rssParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Kyro Dashboard RSS Resolver/1.0",
  },
});

function normalizeDiscoverUrl(url = "") {
  try {
    const value = String(url || "").trim();
    if (!value) return null;

    const withProtocol = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;

    const parsed = new URL(withProtocol);
    parsed.hash = "";

    return parsed.toString();
  } catch {
    return null;
  }
}

function getOriginFromUrl(url = "") {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function getHomepageFromUrl(url = "") {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return null;
  }
}

function uniqueUrls(urls = []) {
  const seen = new Set();
  const result = [];

  for (const raw of urls) {
    const normalized = normalizeDiscoverUrl(raw);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function extractFeedLinksFromHtmlSimple(html = "", baseUrl = "") {
  const links = [];

  const regex =
    /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]+href=["']([^"']+)["'][^>]*type=["']([^"']+)["'][^>]*>|<link[^>]+type=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*alternate[^"']*["'][^>]*>/gi;

  let match;
  while ((match = regex.exec(String(html)))) {
    const href = match[1] || match[4];
    const type = match[2] || match[3] || "";

    if (
      !/application\/rss\+xml|application\/atom\+xml|application\/xml|text\/xml/i.test(
        type
      )
    ) {
      continue;
    }

    try {
      links.push(new URL(href, baseUrl).toString());
    } catch {
      continue;
    }
  }

  return links;
}

async function fetchHtmlForDiscovery(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "Kyro Dashboard RSS Resolver/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed HTML fetch: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

async function tryParseFeedCandidate(feedUrl) {
  try {
    const parsed = await rssParser.parseURL(feedUrl);

    const hasUsefulContent =
      parsed &&
      (typeof parsed.title === "string" || Array.isArray(parsed.items));

    if (!hasUsefulContent) return null;

    return parsed;
  } catch {
    return null;
  }
}

function buildKnownFeedCandidates(normalizedUrl) {
  const candidates = [];
  const origin = getOriginFromUrl(normalizedUrl);

  if (!origin) return candidates;

  const parsed = new URL(normalizedUrl);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const segments = pathname.split("/").filter(Boolean);

  const commonPaths = [
    "/feed",
    "/rss",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/index.xml",
    "/feeds/posts/default?alt=rss",
    "/feeds/posts/default",
    "/feed/",
    "/rss/",
  ];

  commonPaths.forEach((path) => candidates.push(`${origin}${path}`));

  if (pathname !== "/") {
    candidates.push(`${origin}${pathname}/feed`);
    candidates.push(`${origin}${pathname}/rss`);
    candidates.push(`${origin}${pathname}.xml`);
  }

  if (segments.length > 0) {
    candidates.push(`${origin}/feed/${segments.join("/")}`);
    candidates.push(`${origin}/${segments.join("/")}/feed`);
  }

  candidates.push(`${origin}/feed`);
  candidates.push(`${origin}/rss.xml`);

  return candidates;
}

function buildHeuristicFeedCandidates(normalizedUrl) {
  const candidates = [];
  const parsed = new URL(normalizedUrl);
  const origin = getOriginFromUrl(normalizedUrl);
  const host = parsed.host.toLowerCase();
  const pathname = parsed.pathname.replace(/\/+$/, "");

  if (!origin) return candidates;

  if (host.includes("blogspot.")) {
    candidates.push(`${origin}/feeds/posts/default?alt=rss`);
    candidates.push(`${origin}/feeds/posts/default`);
  }

  if (host.includes("medium.com")) {
    if (pathname && pathname !== "/") {
      candidates.push(`${origin}/feed${pathname}`);
    } else {
      candidates.push(`${origin}/feed`);
    }
  }

  candidates.push(`${origin}/rss/`);
  candidates.push(`${origin}/feed/`);

  return candidates;
}

async function discoverFeedFromWebsiteUrl(websiteUrl) {
  const normalized = normalizeDiscoverUrl(websiteUrl);
  if (!normalized) {
    return {
      success: false,
      reason: "Invalid website URL",
      websiteUrl: null,
      feedUrl: null,
      allFeedUrls: [],
      suggestedFeedUrls: [],
    };
  }

  const homepage = getHomepageFromUrl(normalized);

  const htmlCandidates = uniqueUrls([normalized, homepage]);

  const discoveredFromHtml = [];
  const knownCandidates = buildKnownFeedCandidates(normalized);
  const heuristicCandidates = buildHeuristicFeedCandidates(normalized);

  for (const htmlUrl of htmlCandidates) {
    try {
      const html = await fetchHtmlForDiscovery(htmlUrl);
      const links = extractFeedLinksFromHtmlSimple(html, htmlUrl);
      discoveredFromHtml.push(...links);
    } catch (error) {
      console.warn(
        `[RSS Discover] HTML discovery failed on ${htmlUrl}:`,
        error.message
      );
    }
  }

  const allCandidates = uniqueUrls([
    ...discoveredFromHtml,
    ...knownCandidates,
    ...heuristicCandidates,
  ]);

  let bestFeed = null;
let bestScore = -1;

for (const candidate of allCandidates) {
  const parsed = await tryParseFeedCandidate(candidate);
  if (!parsed) continue;

  let score = 0;

  // Prefer feeds with more items
  if (Array.isArray(parsed.items)) {
    score += parsed.items.length;
  }

  // Prefer feeds with images
  const hasImage = parsed.items?.some(
    (item) =>
      item.enclosure?.url ||
      item.image?.url ||
      item.thumbnail ||
      item.content?.includes("<img")
  );
  if (hasImage) score += 50;

  // Prefer RSS keyword
  if (candidate.includes("rss")) score += 30;

  // Penalize generic feeds
  if (candidate.includes("feed")) score -= 10;

  if (score > bestScore) {
    bestScore = score;
    bestFeed = {
      candidate,
      parsed,
    };
  }
}

if (bestFeed) {
  return {
    success: true,
    websiteUrl: normalized,
    feedUrl: bestFeed.candidate,
    feedTitle: bestFeed.parsed.title || "",
    allFeedUrls: allCandidates,
    suggestedFeedUrls: allCandidates.slice(0, 10),
  };
}

  return {
    success: false,
    reason: "No RSS/Atom feed found on that website.",
    websiteUrl: normalized,
    feedUrl: null,
    allFeedUrls: allCandidates,
    suggestedFeedUrls: allCandidates.slice(0, 10),
  };
}

async function parseFeedForTest(feedUrl) {
  const normalized = normalizeDiscoverUrl(feedUrl);
  if (!normalized) {
    throw new Error("Invalid feed URL");
  }

  return await rssParser.parseURL(normalized);
}

function normalizeTemporaryVoiceEntry(entry = {}, index = 0) {
  return {
    id:
      typeof entry?.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `tempvc_${Date.now()}_${index}`,

    name:
      typeof entry?.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : `Temp Voice Setup ${index + 1}`,

    joinChannelId:
      typeof entry?.joinChannelId === "string" ? entry.joinChannelId : "",

    categoryId:
      typeof entry?.categoryId === "string" ? entry.categoryId : "",

    interfaceChannelId:
      typeof entry?.interfaceChannelId === "string"
        ? entry.interfaceChannelId
        : "",

    panelMessageId:
      typeof entry?.panelMessageId === "string" ? entry.panelMessageId : "",

    nameFormat:
      typeof entry?.nameFormat === "string" && entry.nameFormat.trim()
        ? entry.nameFormat
        : "{username}'s Room",

    userLimit:
      typeof entry?.userLimit === "number" && entry.userLimit >= 0
        ? entry.userLimit
        : 0,

    bitrate:
      typeof entry?.bitrate === "number" && entry.bitrate >= 8000
        ? entry.bitrate
        : 64000,

    enabled: entry?.enabled ?? true,
  };
}

function normalizeTemporaryVoicePayload(payload = {}) {
  const rawEntries = Array.isArray(payload?.entries) ? payload.entries : [];

  return {
    enabled: payload?.enabled ?? false,
    entries:
      rawEntries.length > 0
        ? rawEntries.map((entry, index) =>
            normalizeTemporaryVoiceEntry(entry, index)
          )
        : [
            normalizeTemporaryVoiceEntry(
              {
                name: "Main Temp Voice",
                joinChannelId:
                  typeof payload?.joinChannelId === "string"
                    ? payload.joinChannelId
                    : "",
                categoryId:
                  typeof payload?.categoryId === "string"
                    ? payload.categoryId
                    : "",
                interfaceChannelId:
                  typeof payload?.interfaceChannelId === "string"
                    ? payload.interfaceChannelId
                    : "",
                panelMessageId:
                  typeof payload?.panelMessageId === "string"
                    ? payload.panelMessageId
                    : "",
                nameFormat:
                  typeof payload?.nameFormat === "string" &&
                  payload.nameFormat.trim()
                    ? payload.nameFormat
                    : "{username}'s Room",
                userLimit:
                  typeof payload?.userLimit === "number" && payload.userLimit >= 0
                    ? payload.userLimit
                    : 0,
                bitrate:
                  typeof payload?.bitrate === "number" && payload.bitrate >= 8000
                    ? payload.bitrate
                    : 64000,
                enabled: true,
              },
              0
            ),
          ],
  };
}

function normalizeVerificationEmoji(emoji) {
  if (!emoji) return "";

  if (typeof emoji === "object" && emoji.id) {
    return {
      id: String(emoji.id),
      name: emoji.name || "",
      animated: !!emoji.animated,
      url:
        emoji.url ||
        `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=64`,
      identifier: `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`,
    };
  }

  if (typeof emoji === "string") {
    return emoji;
  }

  return "";
}

function normalizeVerificationField(field = {}, index = 0) {
  return {
    id: field.id || makeId("vfield"),
    name: typeof field.name === "string" ? field.name : "",
    value: typeof field.value === "string" ? field.value : "",
    inline: Boolean(field.inline),
    order: Number.isFinite(field.order) ? field.order : index,
  };
}

function normalizeVerificationEmbed(embed = {}, index = 0) {
  return {
    id: embed.id || makeId("vembed"),
    enabled: embed.enabled ?? true,
    collapsed: embed.collapsed ?? false,

    title:
      typeof embed.title === "string"
        ? embed.title
        : index === 0
        ? "Verify Yourself"
        : `Verification Embed ${index + 1}`,

    description:
      typeof embed.description === "string"
        ? embed.description
        : "Click the button below to verify and get access to the server.",

    color:
      typeof embed.color === "string" && embed.color.trim()
        ? embed.color
        : "#5865F2",

    authorName: typeof embed.authorName === "string" ? embed.authorName : "",
    authorIcon: typeof embed.authorIcon === "string" ? embed.authorIcon : "",

    thumbnail: typeof embed.thumbnail === "string" ? embed.thumbnail : "",
    image: typeof embed.image === "string" ? embed.image : "",

    header: typeof embed.header === "string" ? embed.header : "",
    footer: typeof embed.footer === "string" ? embed.footer : "",
    footerIcon: typeof embed.footerIcon === "string" ? embed.footerIcon : "",

    fields: Array.isArray(embed.fields)
      ? embed.fields.map((field, fieldIndex) =>
          normalizeVerificationField(field, fieldIndex)
        )
      : [],
  };
}

function normalizeVerificationPayload(payload = {}) {
  const panels = Array.isArray(payload.panels) ? payload.panels : [];

  return {
    enabled: payload.enabled ?? false,

 premiumTrial: {
  activatedAt: payload.premiumTrial?.activatedAt || null,
  expiresAt: payload.premiumTrial?.expiresAt || null,
  isActive: payload.premiumTrial?.isActive ?? false,
  hasPremium: payload.premiumTrial?.hasPremium ?? false,
  plan: payload.premiumTrial?.plan || "free",
},

    panels: panels.map((panel, index) => {
      const normalizedEmbeds =
        Array.isArray(panel.embeds) && panel.embeds.length > 0
          ? panel.embeds.map((embed, embedIndex) =>
              normalizeVerificationEmbed(embed, embedIndex)
            )
          : [normalizeVerificationEmbed(panel.embed || {}, 0)];

      return {
        id: panel.id || `verif_${Date.now()}_${index}`,
        name: panel.name || `Verification Panel ${index + 1}`,
        enabled: panel.enabled ?? true,

        mode: ["button", "reaction", "captcha"].includes(panel.mode)
          ? panel.mode
          : "button",

        channelId: panel.channelId || null,
        roleId: panel.roleId || null,
        logChannelId: panel.logChannelId || null,

        autoKick: {
          enabled: panel.autoKick?.enabled ?? false,
          minutes: Math.max(1, Number(panel.autoKick?.minutes ?? 10)),
        },

        // legacy single embed mirror
        embed: { ...normalizedEmbeds[0] },

        // new builder-style embeds
        embeds: normalizedEmbeds,

        interaction: {
          button: {
            label: panel.interaction?.button?.label || "Verify",
            style: ["Primary", "Secondary", "Success", "Danger"].includes(
              panel.interaction?.button?.style
            )
              ? panel.interaction.button.style
              : "Success",
            emoji: normalizeVerificationEmoji(
              panel.interaction?.button?.emoji || ""
            ),
          },

          reaction: {
            emoji: normalizeVerificationEmoji(
              panel.interaction?.reaction?.emoji || "✅"
            ),
          },

          captcha: {
            attempts: Math.max(
              1,
              Number(panel.interaction?.captcha?.attempts ?? 3)
            ),
            timeout: Math.max(
              10,
              Number(panel.interaction?.captcha?.timeout ?? 60)
            ),
          },
        },

        sentPanel: {
          messageId: panel.sentPanel?.messageId || null,
          channelId: panel.sentPanel?.channelId || null,
          publishedAt: panel.sentPanel?.publishedAt || null,
        },
      };
    }),
  };
}

function normalizeAntiNukePayload(body = {}) {
  return {
    enabled: Boolean(body.enabled),
    punishment: ["quarantine", "kick", "ban"].includes(body.punishment)
      ? body.punishment
      : "quarantine",
    timeframe: Math.max(1000, Number(body.timeframe) || 10000),
    logChannel: typeof body.logChannel === "string" ? body.logChannel : "",
    quarantineRole:
      typeof body.quarantineRole === "string" ? body.quarantineRole : "",

    whitelistUserIds: Array.isArray(body.whitelistUserIds)
      ? body.whitelistUserIds.filter((id) => typeof id === "string")
      : [],

    whitelistRoleIds: Array.isArray(body.whitelistRoleIds)
      ? body.whitelistRoleIds.filter((id) => typeof id === "string")
      : [],

    antiChannelDelete: {
      enabled: Boolean(body.antiChannelDelete?.enabled),
      limit: Math.max(1, Number(body.antiChannelDelete?.limit) || 3),
    },
    antiChannelCreate: {
      enabled: Boolean(body.antiChannelCreate?.enabled),
      limit: Math.max(1, Number(body.antiChannelCreate?.limit) || 3),
    },
    antiRoleDelete: {
      enabled: Boolean(body.antiRoleDelete?.enabled),
      limit: Math.max(1, Number(body.antiRoleDelete?.limit) || 3),
    },
    antiRoleCreate: {
      enabled: Boolean(body.antiRoleCreate?.enabled),
      limit: Math.max(1, Number(body.antiRoleCreate?.limit) || 3),
    },
    antiRoleUpdate: {
      enabled: Boolean(body.antiRoleUpdate?.enabled),
      limit: Math.max(1, Number(body.antiRoleUpdate?.limit) || 3),
    },
    antiBan: {
      enabled: Boolean(body.antiBan?.enabled),
      limit: Math.max(1, Number(body.antiBan?.limit) || 2),
    },
    antiKick: {
      enabled: Boolean(body.antiKick?.enabled),
      limit: Math.max(1, Number(body.antiKick?.limit) || 3),
    },
  };
}
/* ───────────────────── HELPERS ───────────────────── */

function mapButtonStyle(style) {
  switch (style) {
    case "secondary":
      return ButtonStyle.Secondary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    case "primary":
    default:
      return ButtonStyle.Primary;
  }
}
function formatServerStatsNumber(value, style = "full") {
  const number = Number(value || 0);

  if (style === "compact") {
    if (number >= 1_000_000_000) {
      return `${(number / 1_000_000_000).toFixed(
        number % 1_000_000_000 === 0 ? 0 : 1
      )}B`;
    }

    if (number >= 1_000_000) {
      return `${(number / 1_000_000).toFixed(
        number % 1_000_000 === 0 ? 0 : 1
      )}M`;
    }

    if (number >= 1_000) {
      return `${(number / 1_000).toFixed(number % 1_000 === 0 ? 0 : 1)}K`;
    }

    return `${number}`;
  }

  return new Intl.NumberFormat("en-US").format(number);
}

function getServerStatsDefaultLabel(type) {
  switch (type) {
    case "members":
      return "Members";
    case "humans":
      return "Humans";
    case "bots":
      return "Bots";
    case "online":
      return "Online";
    case "roles":
      return "Roles";
    case "role_count":
      return "Role Members";
    case "channels":
      return "Channels";
    case "text_channels":
      return "Text Channels";
    case "voice_channels":
      return "Voice Channels";
    case "categories":
      return "Categories";
    case "boosts":
      return "Boosts";
    case "time":
      return "Time";
    case "social":
      return "Social";
    case "custom":
      return "Count";
    default:
      return "Stat";
  }
}

function getServerStatsEmoji(entry = {}) {
  if (entry.emoji) return entry.emoji;

  switch (entry.type) {
    case "members":
      return "👥";
    case "humans":
      return "🧑";
    case "bots":
      return "🤖";
    case "online":
      return "🟢";
    case "roles":
      return "🎭";
    case "role_count":
      return "🛡️";
    case "channels":
      return "#️⃣";
    case "text_channels":
      return "💬";
    case "voice_channels":
      return "🔊";
    case "categories":
      return "🗂️";
    case "boosts":
      return "🚀";
    case "time":
      if (entry.display === "date") return "📅";
      if (entry.display === "datetime") return "🗓️";
      return "🕒";
    case "social":
      return "📊";
    case "custom":
      return "📌";
    default:
      return "📌";
  }
}

function getOrdinal(day) {
  if (day > 3 && day < 21) return "th";

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatTimeByTimezoneForDashboard(timezone, format = "12h") {
  try {
    const now = new Date();

    const options =
      format === "24h"
        ? {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        : {
            timeZone: timezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          };

    return new Intl.DateTimeFormat("en-US", options).format(now);
  } catch {
    return "Invalid Timezone";
  }
}

function formatDateByTimezoneForDashboard(timezone) {
  try {
    const now = new Date();

    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    }).format(now);

    const month = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
    }).format(now);

    const dayNumber = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      day: "numeric",
    }).format(now);

    return `${weekday}, ${month} ${dayNumber}${getOrdinal(Number(dayNumber))}`;
  } catch {
    return "Invalid Date";
  }
}

function formatDateTimeByTimezoneForDashboard(timezone, format = "12h") {
  const date = formatDateByTimezoneForDashboard(timezone);
  const time = formatTimeByTimezoneForDashboard(timezone, format);

  if (date === "Invalid Date" || time === "Invalid Timezone") {
    return "Invalid DateTime";
  }

  return `${date} | ${time}`;
}

async function buildServerStatsChannelName(entry, guild) {
  if (!entry || !guild) return null;

  const label = entry.label || getServerStatsDefaultLabel(entry.type);
  const emoji = getServerStatsEmoji(entry);
  const numberStyle = entry.numberStyle || "full";

  const channels = await guild.channels.fetch().catch(() => new Map());
  const roles = await guild.roles.fetch().catch(() => new Map());

  const allChannels = [...channels.values()].filter(Boolean);
  const allRoles = [...roles.values()].filter(Boolean);

  const buildBase = (textLabel, value) => `${emoji} | ${textLabel}: ${value}`;

  switch (entry.type) {
    case "members":
      return buildBase(
        label,
        formatServerStatsNumber(guild.memberCount || 0, numberStyle)
      );

case "humans": {
  await guild.members.fetch().catch(() => null);

  const humanCount = guild.members.cache.filter(
    (member) => !member.user.bot
  ).size;

  return buildBase(label, humanCount);
}

case "bots": {
  await guild.members.fetch().catch(() => null);

  const botCount = guild.members.cache.filter(
    (member) => member.user.bot
  ).size;

  return buildBase(label, botCount);
}

case "online": {
  await guild.members.fetch({ withPresences: true }).catch(() => null);

  const onlineCount = guild.members.cache.filter((member) => {
    const status = member.presence?.status;
    return status === "online" || status === "idle" || status === "dnd";
  }).size;

  return buildBase(label, formatServerStatsNumber(onlineCount, numberStyle));
}

    case "roles":
      return buildBase(label, formatServerStatsNumber(allRoles.length, numberStyle));

    case "role_count": {
      const role = entry.roleId ? roles.get(entry.roleId) : null;
      const roleLabel = entry.label || role?.name || "Role Members";
      const count = role?.members?.size || 0;
      return buildBase(roleLabel, formatServerStatsNumber(count, numberStyle));
    }

    case "channels":
      return buildBase(
        label,
        formatServerStatsNumber(
          allChannels.filter((channel) => channel.type !== 4).length,
          numberStyle
        )
      );

    case "text_channels":
      return buildBase(
        label,
        formatServerStatsNumber(
          allChannels.filter((channel) =>
            [0, 5, 10, 11, 12, 15, 16].includes(channel.type)
          ).length,
          numberStyle
        )
      );

    case "voice_channels":
      return buildBase(
        label,
        formatServerStatsNumber(
          allChannels.filter((channel) => [2, 13].includes(channel.type)).length,
          numberStyle
        )
      );

    case "categories":
      return buildBase(
        label,
        formatServerStatsNumber(
          allChannels.filter((channel) => channel.type === 4).length,
          numberStyle
        )
      );

    case "boosts":
      return buildBase(
        label,
        formatServerStatsNumber(guild.premiumSubscriptionCount || 0, numberStyle)
      );

    case "time": {
      const timezone = entry.timezone || "UTC";
      const format = entry.format || "12h";
      const display = entry.display || "time";

      if (display === "date") {
        return buildBase(label, formatDateByTimezoneForDashboard(timezone));
      }

      if (display === "datetime") {
        return buildBase(
          label,
          formatDateTimeByTimezoneForDashboard(timezone, format)
        );
      }

      return buildBase(label, formatTimeByTimezoneForDashboard(timezone, format));
    }

    case "social": {
      const value =
        typeof entry.lastValue === "number"
          ? entry.lastValue
          : typeof entry.fallbackValue === "number"
          ? entry.fallbackValue
          : 0;

      return buildBase(label, formatServerStatsNumber(value, numberStyle));
    }

    case "custom": {
      const value =
        typeof entry.value === "number"
          ? entry.value
          : typeof entry.lastValue === "number"
          ? entry.lastValue
          : 0;

      return buildBase(label, formatServerStatsNumber(value, numberStyle));
    }

    default:
      return null;
  }
}
async function refreshServerStatsChannelsNow(guild, categoryId, entries = []) {
  const refreshedEntries = [];
  let refreshedCount = 0;

  for (const entry of entries) {
    if (!entry?.enabled || !entry.channelId) {
      refreshedEntries.push(entry);
      continue;
    }

    const channel = await guild.channels.fetch(entry.channelId).catch(() => null);

    if (!channel) {
      refreshedEntries.push({ ...entry, channelId: null });
      continue;
    }

    const latestName = await buildServerStatsChannelName(entry, guild);

    if (latestName && channel.name !== latestName) {
      channel
        .setName(latestName, "Kyro dashboard instant server stats refresh")
        .catch((err) =>
          console.error("[ServerStats Manual] Rename failed:", err.message)
        );

      refreshedCount++;
    }

    if (categoryId && channel.parentId !== categoryId) {
      channel
        .setParent(categoryId, {
          lockPermissions: false,
          reason: "Kyro dashboard server stats category sync",
        })
        .catch((err) =>
          console.error("[ServerStats Manual] Category sync failed:", err.message)
        );
    }

    refreshedEntries.push(entry);
  }

  return { refreshedEntries, refreshedCount };
}
function mapSelfRoleButtonStyle(style) {
  switch (style) {
    case "Primary":
      return ButtonStyle.Primary;
    case "Success":
      return ButtonStyle.Success;
    case "Danger":
      return ButtonStyle.Danger;
    case "Secondary":
    default:
      return ButtonStyle.Secondary;
  }
}

function parseDiscordEmoji(emoji) {
  if (!emoji) return undefined;

  if (typeof emoji === "object" && emoji.id) {
    return {
      id: emoji.id,
      name: emoji.name || undefined,
      animated: !!emoji.animated,
    };
  }

  if (typeof emoji === "string") {
    const match = emoji.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
    if (match) {
      const animated = emoji.startsWith("<a:");
      return {
        id: match[2],
        name: match[1],
        animated,
      };
    }

    return emoji;
  }

  return undefined;
}

function buildTicketPanelMessage(panel) {
  const components = [];

  if (panel.ticketTypeMode === "dropdown") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`ticket_select:${panel.id}`)
      .setPlaceholder("Select ticket type")
      .addOptions(
        (panel.options || []).slice(0, 25).map((option) => ({
          label: String(option.label || "Open ticket").slice(0, 100),
          description: String(option.description || "").slice(0, 100) || undefined,
          emoji: option.emoji || undefined,
          value: option.id,
        }))
      );

    components.push(new ActionRowBuilder().addComponents(menu));
  } else {
    const buttons = (panel.options || []).slice(0, 5).map((option) =>
      new ButtonBuilder()
        .setCustomId(`ticket_open:${panel.id}:${option.id}`)
        .setLabel(String(option.label || "Open ticket").slice(0, 80))
        .setStyle(mapButtonStyle(option.buttonStyle))
        .setEmoji(option.emoji || undefined)
    );

    if (buttons.length) {
      components.push(new ActionRowBuilder().addComponents(buttons));
    }
  }

  let embeds = [];

  if (panel.panelMessage?.useEmbed) {
    const embed = new EmbedBuilder()
      .setTitle(panel.panelMessage?.title || "How can we help?")
      .setDescription(
        panel.panelMessage?.description ||
          "Welcome to our ticket support service! If you have any issues or concerns, please use the button below."
      )
      .setColor(panel.panelMessage?.color || "#5865F2");

    if (panel.panelMessage?.bannerUrl) {
      embed.setImage(panel.panelMessage.bannerUrl);
    }

    if (panel.panelMessage?.footer) {
      embed.setFooter({ text: panel.panelMessage.footer });
    }

    embeds = [embed];
  }

  const content = panel.panelMessage?.useEmbed
    ? undefined
    : `${panel.panelMessage?.title || "How can we help?"}\n\n${
        panel.panelMessage?.description ||
        "Welcome to our ticket support service! If you have any issues or concerns, please use the button below."
      }`;

  return {
    content,
    embeds,
    components,
  };
}

function buildSelfRolePanelMessage(panel) {
  const components = [];

  if (panel.type === "dropdown") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`selfrole_select:${panel.id}`)
      .setPlaceholder(panel.placeholder || "Choose your role")
      .addOptions(
        (panel.options || []).slice(0, 25).map((option, index) => ({
          label: String(option.label || `Role ${index + 1}`).slice(0, 100),
          description:
            String(option.description || "").slice(0, 100) || undefined,
          emoji: parseDiscordEmoji(option.emoji),
          value: option.id,
        }))
      );

    components.push(new ActionRowBuilder().addComponents(menu));
  }

  if (panel.type === "buttons") {
    const rows = [];
    const options = (panel.options || []).slice(0, 25);

    for (let i = 0; i < options.length; i += 5) {
      const chunk = options.slice(i, i + 5);

      const buttons = chunk.map((option, index) =>
        new ButtonBuilder()
          .setCustomId(`selfrole_btn:${panel.id}:${option.id}`)
          .setLabel(String(option.label || `Role ${i + index + 1}`).slice(0, 80))
          .setStyle(mapSelfRoleButtonStyle(panel.buttonStyle))
          .setEmoji(parseDiscordEmoji(option.emoji))
      );

      rows.push(new ActionRowBuilder().addComponents(buttons));
    }

    components.push(...rows);
  }

  const embed = new EmbedBuilder()
    .setTitle(panel.embed?.title || "Pick your roles")
    .setDescription(
      panel.embed?.description ||
        "Choose the roles you want from the panel below."
    )
    .setColor(panel.embed?.color || "#5865F2");

  if (panel.embed?.banner) {
    embed.setImage(panel.embed.banner);
  }

  if (panel.embed?.thumbnail) {
    embed.setThumbnail(panel.embed.thumbnail);
  }

  if (panel.embed?.footer) {
    embed.setFooter({ text: panel.embed.footer });
  }

  if (panel.embed?.headerIcon) {
    embed.setAuthor({
      name: panel.embed?.title || "Pick your roles",
      iconURL: panel.embed.headerIcon,
    });
    embed.setTitle(null);
  }

  return {
    embeds: [embed],
    components,
  };
}
function mapVerificationButtonStyle(style) {
  switch (style) {
    case "Primary":
      return ButtonStyle.Primary;
    case "Secondary":
      return ButtonStyle.Secondary;
    case "Danger":
      return ButtonStyle.Danger;
    case "Success":
    default:
      return ButtonStyle.Success;
  }
}

function buildVerificationEmbed(embedBlock = {}, index = 0) {
  const embed = new EmbedBuilder().setColor(
    safeDiscordColor(embedBlock.color || "#5865F2")
  );

  if (embedBlock.authorName) {
    embed.setAuthor({
      name: String(embedBlock.authorName).slice(0, 256),
      iconURL: isUsableEmbedUrl(embedBlock.authorIcon)
        ? embedBlock.authorIcon
        : undefined,
    });
  }

  if (embedBlock.title) {
    embed.setTitle(String(embedBlock.title).slice(0, 256));
  }

  let description = "";
  if (embedBlock.header) {
    description += `${embedBlock.header}\n\n`;
  }
  if (embedBlock.description) {
    description += embedBlock.description;
  }

  if (description.trim()) {
    embed.setDescription(description.slice(0, 4096));
  }

  if (Array.isArray(embedBlock.fields) && embedBlock.fields.length) {
    embed.addFields(
      embedBlock.fields
        .filter((field) => field?.name || field?.value)
        .slice(0, 25)
        .map((field) => ({
          name: String(field.name || "Field").slice(0, 256),
          value: String(field.value || "—").slice(0, 1024),
          inline: Boolean(field.inline),
        }))
    );
  }

  if (isUsableEmbedUrl(embedBlock.thumbnail)) {
    embed.setThumbnail(embedBlock.thumbnail);
  }

  if (isUsableEmbedUrl(embedBlock.image)) {
    embed.setImage(embedBlock.image);
  }

  const footerIconUrl = isUsableEmbedUrl(embedBlock.footerIcon)
    ? embedBlock.footerIcon
    : undefined;

  if (embedBlock.footer || footerIconUrl) {
    embed.setFooter({
      text: String(embedBlock.footer || "").slice(0, 2048),
      iconURL: footerIconUrl,
    });
  }

  return embed;
}

function buildVerificationPanelMessage(panel) {
  const embedsSource =
    Array.isArray(panel.embeds) && panel.embeds.length > 0
      ? panel.embeds
      : [panel.embed || {}];

  const embeds = embedsSource
    .filter((embed) => embed?.enabled !== false)
    .slice(0, 10)
    .map((embed, index) => buildVerificationEmbed(embed, index));

  const components = [];
  const buttonLabel = panel.interaction?.button?.label || "Verify";
  const buttonStyle = panel.interaction?.button?.style || "Success";

 if (panel.mode === "button" || panel.mode === "captcha") {
    const verifyButton = new ButtonBuilder()
      .setCustomId("kyro_verify")
      .setLabel(String(buttonLabel).slice(0, 80))
      .setStyle(mapVerificationButtonStyle(buttonStyle));

    const parsedEmoji = parseDiscordEmoji(panel.interaction?.button?.emoji);
    if (parsedEmoji) {
      verifyButton.setEmoji(parsedEmoji);
    }

    components.push(new ActionRowBuilder().addComponents(verifyButton));
  }

 const content = "";

  return {
    content,
    embeds,
    components,
  };
}
function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultEmbedBlock(order = 0) {
  return {
    id: makeId("embed"),
    title: "",
    titleUrl: "",
    description: "",
    color: "#5865F2",
    author: {
      name: "",
      iconUrl: "",
      url: "",
    },
    thumbnailUrl: "",
    imageUrl: "",
    footer: {
      text: "",
      iconUrl: "",
    },
    timestamp: false,
    fields: [],
    order,
  };
}

function normalizeEmbedField(field = {}, index = 0) {
  return {
    id: field.id || makeId("field"),
    name: typeof field.name === "string" ? field.name : "",
    value: typeof field.value === "string" ? field.value : "",
    inline: Boolean(field.inline),
    order: Number.isFinite(field.order) ? field.order : index,
  };
}

function normalizeEmbedBlock(block = {}, index = 0) {
  const fields = Array.isArray(block.fields)
    ? block.fields.map((field, fieldIndex) => normalizeEmbedField(field, fieldIndex))
    : [];

  return {
    id: block.id || makeId("embed"),
    title: typeof block.title === "string" ? block.title : "",
    titleUrl: typeof block.titleUrl === "string" ? block.titleUrl : "",
    description: typeof block.description === "string" ? block.description : "",
    color: typeof block.color === "string" && block.color.trim()
      ? block.color
      : "#5865F2",

    author: {
      name: typeof block.author?.name === "string" ? block.author.name : "",
      iconUrl:
        typeof block.author?.iconUrl === "string" ? block.author.iconUrl : "",
      url: typeof block.author?.url === "string" ? block.author.url : "",
    },

    thumbnailUrl:
      typeof block.thumbnailUrl === "string" ? block.thumbnailUrl : "",
    imageUrl: typeof block.imageUrl === "string" ? block.imageUrl : "",

    footer: {
      text: typeof block.footer?.text === "string" ? block.footer.text : "",
      iconUrl:
        typeof block.footer?.iconUrl === "string" ? block.footer.iconUrl : "",
    },

    timestamp: Boolean(block.timestamp),
    fields,
    order: Number.isFinite(block.order) ? block.order : index,
  };
}

function normalizeEmbedButton(button = {}, index = 0) {
  return {
    id: button.id || makeId("btn"),
    type: typeof button.type === "string" ? button.type : "link",
    label: typeof button.label === "string" ? button.label : "",
    emoji: typeof button.emoji === "string" ? button.emoji : "",
    url: typeof button.url === "string" ? button.url : "",
    style: typeof button.style === "string" ? button.style : "link",
    row: Number.isFinite(button.row) ? button.row : 0,
    order: Number.isFinite(button.order) ? button.order : index,
  };
}

function detectPremiumUsage(embeds = []) {
  if (!Array.isArray(embeds)) return false;

  return embeds.some((embed) => {
    const hasAuthor =
      Boolean(embed?.author?.name) ||
      Boolean(embed?.author?.iconUrl) ||
      Boolean(embed?.author?.icon_url) ||
      Boolean(embed?.author?.url);

    const hasFooter =
      Boolean(embed?.footer?.text) ||
      Boolean(embed?.footer?.iconUrl) ||
      Boolean(embed?.footer?.icon_url);

    return hasAuthor || hasFooter;
  });
}
function safeDiscordColor(color) {
  if (typeof color !== "string") return 0x5865f2;

  const cleaned = color.trim().replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return 0x5865f2;

  return parseInt(cleaned, 16);
}
function isUsableEmbedUrl(value) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return true;
  }

  return false;
}
function isBase64Image(value) {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/") &&
    value.includes(";base64,")
  );
}

function makeAttachmentFromDataUrl(dataUrl, baseName = "image") {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);

  if (!match) return null;

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  const fileName = `${baseName}.${extension}`;

  return new AttachmentBuilder(buffer, { name: fileName });
}

function buildDiscordEmbedFromBlock(block = {}) {
  const embed = new EmbedBuilder().setColor(
    safeDiscordColor(block.color || "#5865F2")
  );

  if (block.author?.name) {
    embed.setAuthor({
      name: String(block.author.name).slice(0, 256),
      iconURL: block.author?.iconUrl || undefined,
      url: block.author?.url || undefined,
    });
  }

  if (block.title) {
    embed.setTitle(String(block.title).slice(0, 256));

    if (block.titleUrl) {
      embed.setURL(block.titleUrl);
    }
  }

  if (block.description) {
    embed.setDescription(String(block.description).slice(0, 4096));
  }

  if (Array.isArray(block.fields) && block.fields.length) {
    embed.addFields(
      block.fields
        .filter((field) => field?.name || field?.value)
        .slice(0, 25)
        .map((field) => ({
          name: String(field.name || "Field").slice(0, 256),
          value: String(field.value || "—").slice(0, 1024),
          inline: Boolean(field.inline),
        }))
    );
  }

 if (isUsableEmbedUrl(block.thumbnailUrl)) {
  embed.setThumbnail(block.thumbnailUrl);
}

if (isUsableEmbedUrl(block.imageUrl)) {
  embed.setImage(block.imageUrl);
}

const footerIconUrl = isUsableEmbedUrl(block.footer?.iconUrl)
  ? block.footer.iconUrl
  : undefined;

if (block.footer?.text || footerIconUrl) {
  embed.setFooter({
    text: String(block.footer?.text || "").slice(0, 2048),
    iconURL: footerIconUrl,
  });
}

if (block.timestamp) {
  embed.setTimestamp(new Date());
}

  return embed;
}

function buildDiscordButtonRows(buttons = []) {
  const linkButtons = Array.isArray(buttons)
    ? buttons.filter((button) => button?.label && button?.url).slice(0, 25)
    : [];

  const rows = [];

  for (let i = 0; i < linkButtons.length; i += 5) {
    const chunk = linkButtons.slice(i, i + 5);

    const row = new ActionRowBuilder().addComponents(
      chunk.map((button) => {
        const builder = new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(String(button.label).slice(0, 80))
          .setURL(button.url);

        const parsedEmoji = parseDiscordEmoji(button.emoji);
        if (parsedEmoji) {
          builder.setEmoji(parsedEmoji);
        }

        return builder;
      })
    );

    rows.push(row);
  }

  return rows;
}

function buildEmbedMessagePayload(messageDoc) {
  const embeds = [];
  const files = [];

  if (Array.isArray(messageDoc?.embeds)) {
    messageDoc.embeds.slice(0, 10).forEach((block, index) => {
      const embed = new EmbedBuilder().setColor(
        safeDiscordColor(block.color || "#5865F2")
      );

      // AUTHOR
      if (block.author?.name) {
        embed.setAuthor({
          name: String(block.author.name).slice(0, 256),
          iconURL: isUsableEmbedUrl(block.author?.iconUrl)
            ? block.author.iconUrl
            : undefined,
          url: isUsableEmbedUrl(block.author?.url)
            ? block.author.url
            : undefined,
        });
      }

      // TITLE
      if (block.title) {
        embed.setTitle(String(block.title).slice(0, 256));

        if (isUsableEmbedUrl(block.titleUrl)) {
          embed.setURL(block.titleUrl);
        }
      }

      // DESCRIPTION
      if (block.description) {
        embed.setDescription(String(block.description).slice(0, 4096));
      }

      // FIELDS
      if (Array.isArray(block.fields) && block.fields.length) {
        embed.addFields(
          block.fields
            .filter((f) => f?.name || f?.value)
            .slice(0, 25)
            .map((f) => ({
              name: String(f.name || "Field").slice(0, 256),
              value: String(f.value || "—").slice(0, 1024),
              inline: Boolean(f.inline),
            }))
        );
      }

      // THUMBNAIL
      if (isBase64Image(block.thumbnailUrl)) {
        const attachment = makeAttachmentFromDataUrl(
          block.thumbnailUrl,
          `thumb_${index}`
        );
        if (attachment) {
          files.push(attachment);
          embed.setThumbnail(`attachment://${attachment.name}`);
        }
      } else if (isUsableEmbedUrl(block.thumbnailUrl)) {
        embed.setThumbnail(block.thumbnailUrl);
      }

      // IMAGE (BANNER 🔥)
      if (isBase64Image(block.imageUrl)) {
        const attachment = makeAttachmentFromDataUrl(
          block.imageUrl,
          `image_${index}`
        );
        if (attachment) {
          files.push(attachment);
          embed.setImage(`attachment://${attachment.name}`);
        }
      } else if (isUsableEmbedUrl(block.imageUrl)) {
        embed.setImage(block.imageUrl);
      }

      // FOOTER
      const footerIconUrl = isUsableEmbedUrl(block.footer?.iconUrl)
        ? block.footer.iconUrl
        : undefined;

      if (block.footer?.text || footerIconUrl) {
        embed.setFooter({
          text: String(block.footer?.text || "").slice(0, 2048),
          iconURL: footerIconUrl,
        });
      }

      // TIMESTAMP
      if (block.timestamp) {
        embed.setTimestamp(new Date());
      }

      embeds.push(embed);
    });
  }

  const components = buildDiscordButtonRows(messageDoc?.buttons || []);

 return {
  content:
    typeof messageDoc?.messageContent === "string"
      ? messageDoc.messageContent
      : "",
  embeds,
  components,
  files,
};
}

async function triggerKyroServerStatsRefresh(guildId) {
  try {
    await axios.post(
      `${KYRO_BOT_API_BASE_URL}/internal/server-stats/refresh/${guildId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${INTERNAL_API_TOKEN}`,
        },
        timeout: 15000,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "[Dashboard] Failed to trigger Kyro instant server stats refresh:",
      error.response?.data || error.message
    );
    return false;
  }
}
/* ───────────────────── BASIC ROUTES ───────────────────── */

app.get("/", (req, res) => {
  res.send("Kyro Dashboard API is running 🚀");
});

app.get("/auth/discord", (req, res) => {
  const redirect = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI
  )}&scope=identify%20guilds`;
  res.redirect(redirect);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("No code provided.");
  }

  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
const accessToken = tokenResponse.data.access_token;
req.session.accessToken = accessToken;

req.session.save((err) => {
  if (err) {
    console.error("Session save error:", err);
    return res.status(500).send("Failed to save session.");
  }

  res.redirect(process.env.CLIENT_URL || "https://kyro-dashboard-eight.vercel.app/");
});
  } catch (error) {
    console.error(
      "OAuth callback error:",
      error.response?.data || error.message
    );
    res.status(500).send("Discord login failed.");
  }
});

app.get("/api/discord/user", async (req, res) => {
const token = req.session?.accessToken;

if (!token) {
  return res.status(401).json({ error: "Not authenticated" });
}

  try {
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    res.json(userResponse.data);
  } catch (error) {
    console.error("User fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Discord user" });
  }
});

app.get("/api/discord/guilds", async (req, res) => {
  const token = req.session?.accessToken;

if (!token) {
  return res.status(401).json({ error: "Not authenticated" });
}

  try {
    const guildsResponse = await axios.get(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

 const manageableGuilds = guildsResponse.data;

    res.json(manageableGuilds);
  } catch (error) {
    console.error("Guild fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Discord guilds" });
  }
});
/* ───────────────────── AUTOMOD API ───────────────────── */

app.get("/api/guilds/:guildId/automod", async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await getOrCreateGuildConfig(guildId);
    const automod = normalizeAutomodPayload(config.automod || {});

    res.json({
      success: true,
      automod,
    });
  } catch (error) {
    console.error("Automod GET error:", error);
    res.status(500).json({ error: "Failed to fetch automod config" });
  }
});

app.post("/api/guilds/:guildId/automod", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedAutomod = normalizeAutomodPayload(req.body);

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          automod: normalizedAutomod,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Automod config saved successfully",
      automod: normalizeAutomodPayload(updatedConfig?.automod || {}),
    });
  } catch (error) {
    console.error("Automod POST error:", error);
    res.status(500).json({
      error: "Failed to save automod config",
      details: error.message,
    });
  }
});
/* ───────────────────── LEVELING API ───────────────────── */

app.get("/api/guilds/:guildId/leveling", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const premiumStatus = await getPremiumStatus(guildId);

    const leveling = normalizeLevelingPayload(config.leveling || {});

    res.json({
      success: true,
      leveling,
      premiumStatus,
    });
  } catch (error) {
    console.error("Leveling GET error:", error);
    res.status(500).json({ error: "Failed to fetch leveling config" });
  }
});

app.post("/api/guilds/:guildId/leveling", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedLeveling = normalizeLevelingPayload(req.body);

    const chatXpRate =
      normalizedLeveling.chat.xpMode === "fixed"
        ? normalizedLeveling.chat.xpPerMessage
        : normalizedLeveling.chat.maxXp;

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          "leveling.enabled": normalizedLeveling.enabled,

          "leveling.chat": normalizedLeveling.chat,
          "leveling.voice": normalizedLeveling.voice,
          "leveling.announcements": normalizedLeveling.announcements,
          "leveling.rankCard": normalizedLeveling.rankCard,

          "leveling.roleRewardMode": normalizedLeveling.roleRewardMode,
          "leveling.roleRewards": normalizedLeveling.roleRewards,

          "leveling.levelUpEmbed": normalizedLeveling.levelUpEmbed,

          // legacy mirrors for bot compatibility
          "leveling.chatXpRate": chatXpRate,
          "leveling.chatCooldownSeconds": normalizedLeveling.chat.cooldownSeconds,
          "leveling.ignoredRoleIds": normalizedLeveling.chat.ignoredRoleIds,
          "leveling.disabledChannels": normalizedLeveling.chat.ignoredChannelIds,

          "leveling.voiceXpRate": normalizedLeveling.voice.xpPerMinute,
          "leveling.disabledVoiceChannels": normalizedLeveling.voice.ignoredChannelIds,

          "leveling.levelUpChannelId":
            normalizedLeveling.announcements.levelUpChannelId,
          "leveling.levelUpMessage":
            normalizedLeveling.announcements.levelUpMessage,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: "Leveling config saved successfully",
      leveling: normalizeLevelingPayload(updatedConfig?.leveling || {}),
    });
  } catch (error) {
    console.error("Leveling POST error:", error);
    res.status(500).json({
      error: "Failed to save leveling config",
      details: error.message,
    });
  }
});

/* ───────────── CUSTOM BOT API ───────────── */

// GET custom bot config
app.get("/api/guilds/:guildId/custom-bot", async (req, res) => {
  try {
    const { guildId } = req.params;

    const bot = await CustomBot.findOne({ guildId });

    res.json({
      success: true,
      customBot: bot || null,
    });
  } catch (error) {
    console.error("CustomBot GET error:", error);
    res.status(500).json({ error: "Failed to fetch custom bot config" });
  }
});

// CREATE / UPDATE custom bot
app.post("/api/guilds/:guildId/custom-bot", async (req, res) => {
  try {
    const { guildId } = req.params;
    const {
      botToken,
      botClientId,
      name,
      avatar,
      enabled,
      activityType,
      activityText,
      status,
      banner,
bannerType,
    } = req.body;

    if (!botToken) {
      return res.status(400).json({
        error: "botToken is required",
      });
    }

    const updated = await CustomBot.findOneAndUpdate(
      { guildId },
      {
        $set: {
          guildId,
          botToken,
          botClientId,
          name: name || "Kyro Bot",
          avatar: avatar || null,
          enabled: Boolean(enabled),

          // 🔥 NEW FIELDS
          activityType: activityType || "Listening to",
          activityText: activityText || "/help",
          status: status || "online",
          banner: banner || null,
bannerType: bannerType || "image",
        },
      },
      { new: true, upsert: true }
    );

// ⚡ FULLY INDEPENDENT LIVE UPDATE
try {
  if (updated.enabled) {
    await updateCustomBotLive(updated);
  } else {
    await stopCustomBot(guildId);
  }
} catch (err) {
  console.error("Local custom bot live update failed:", err.message);
}

    res.json({
      success: true,
      customBot: updated,
    });
  } catch (error) {
    console.error("CustomBot POST error:", error);
    res.status(500).json({ error: "Failed to save custom bot config" });
  }
});

function normalizeWelcomePayload(payload = {}) {
  return {
    enabled: payload?.enabled ?? false,
    channelId: payload?.channelId ?? null,
    mode: payload?.mode ?? "embed",

    embed: {
      enabled: payload?.embed?.enabled ?? true,
      title: payload?.embed?.title ?? "",
      description: payload?.embed?.description ?? "",
      color: payload?.embed?.color ?? "#5865F2",
      footer: payload?.embed?.footer ?? "",
      banner: payload?.embed?.banner ?? "",
      thumbnail:
        payload?.embed?.thumbnail !== undefined ? payload.embed.thumbnail : true,
    },

    card: {
      enabled: payload?.card?.enabled ?? true,
      backgroundUrl: payload?.card?.backgroundUrl ?? "",
      backgroundColor: payload?.card?.backgroundColor ?? "#000000",
      textColor: payload?.card?.textColor ?? "#ffffff",
      overlayOpacity:
        typeof payload?.card?.overlayOpacity === "number"
          ? payload.card.overlayOpacity
          : 0.45,
      title: payload?.card?.title ?? "WELCOME",
      subtitle: payload?.card?.subtitle ?? "{username}",
      showAvatar:
        payload?.card?.showAvatar !== undefined ? payload.card.showAvatar : true,
    },

    autoRole: {
      enabled: payload?.autoRole?.enabled ?? false,
      roleId: payload?.autoRole?.roleId ?? null,
      roleIds: Array.isArray(payload?.autoRole?.roleIds)
        ? payload.autoRole.roleIds.filter(Boolean)
        : payload?.autoRole?.roleId
        ? [payload.autoRole.roleId]
        : [],
    },

    dm: {
      enabled: payload?.dm?.enabled ?? false,
      mode: payload?.dm?.mode ?? "text",
      message: payload?.dm?.message ?? "",
      embed: {
        enabled: payload?.dm?.embed?.enabled ?? true,
        title: payload?.dm?.embed?.title ?? "",
        description: payload?.dm?.embed?.description ?? "",
        color: payload?.dm?.embed?.color ?? "#5865F2",
        footer: payload?.dm?.embed?.footer ?? "",
        banner: payload?.dm?.embed?.banner ?? "",
        thumbnail:
          payload?.dm?.embed?.thumbnail !== undefined
            ? payload.dm.embed.thumbnail
            : true,
      },
    },
  };
}
/* ───────────────────── WELCOME API ───────────────────── */

app.get("/api/guilds/:guildId/welcome", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const premiumStatus = await getPremiumStatus(guildId);

    const welcome = normalizeWelcomePayload(config.welcome || {});

    res.json({
      success: true,
      welcome,
      premiumStatus,
    });
  } catch (error) {
    console.error("Welcome GET error:", error);
    res.status(500).json({ error: "Failed to fetch welcome config" });
  }
});

app.post("/api/guilds/:guildId/welcome", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedWelcome = normalizeWelcomePayload(req.body);

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          "welcome.enabled": normalizedWelcome.enabled,
          "welcome.channelId": normalizedWelcome.channelId,
          "welcome.mode": normalizedWelcome.mode,

          "welcome.embed.enabled": normalizedWelcome.embed.enabled,
          "welcome.embed.title": normalizedWelcome.embed.title,
          "welcome.embed.description": normalizedWelcome.embed.description,
          "welcome.embed.color": normalizedWelcome.embed.color,
          "welcome.embed.footer": normalizedWelcome.embed.footer,
          "welcome.embed.banner": normalizedWelcome.embed.banner,
          "welcome.embed.thumbnail": normalizedWelcome.embed.thumbnail,

          "welcome.card.enabled": normalizedWelcome.card.enabled,
          "welcome.card.backgroundUrl": normalizedWelcome.card.backgroundUrl,
          "welcome.card.backgroundColor":
            normalizedWelcome.card.backgroundColor,
          "welcome.card.textColor": normalizedWelcome.card.textColor,
          "welcome.card.overlayOpacity": normalizedWelcome.card.overlayOpacity,
          "welcome.card.title": normalizedWelcome.card.title,
          "welcome.card.subtitle": normalizedWelcome.card.subtitle,
          "welcome.card.showAvatar": normalizedWelcome.card.showAvatar,

          "welcome.autoRole.enabled": normalizedWelcome.autoRole.enabled,
          "welcome.autoRole.roleId": normalizedWelcome.autoRole.roleId,
          "welcome.autoRole.roleIds": normalizedWelcome.autoRole.roleIds,

          "welcome.dm.enabled": normalizedWelcome.dm.enabled,
          "welcome.dm.mode": normalizedWelcome.dm.mode,
          "welcome.dm.message": normalizedWelcome.dm.message,
          "welcome.dm.embed.enabled": normalizedWelcome.dm.embed.enabled,
          "welcome.dm.embed.title": normalizedWelcome.dm.embed.title,
          "welcome.dm.embed.description": normalizedWelcome.dm.embed.description,
          "welcome.dm.embed.color": normalizedWelcome.dm.embed.color,
          "welcome.dm.embed.footer": normalizedWelcome.dm.embed.footer,
          "welcome.dm.embed.banner": normalizedWelcome.dm.embed.banner,
          "welcome.dm.embed.thumbnail": normalizedWelcome.dm.embed.thumbnail,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Welcome config saved successfully",
      welcome: normalizeWelcomePayload(updatedConfig.welcome),
    });
  } catch (error) {
    console.error("Welcome POST error:", error);
    res.status(500).json({ error: "Failed to save welcome config" });
  }
});

/* ───────────────────── GOODBYE API ───────────────────── */

app.get("/api/guilds/:guildId/goodbye", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const premiumStatus = await getPremiumStatus(guildId);

    const goodbye = normalizeGoodbyePayload(config.goodbye || {});

    res.json({
      success: true,
      goodbye,
      premiumStatus,
    });
  } catch (error) {
    console.error("Goodbye GET error:", error);
    res.status(500).json({ error: "Failed to fetch goodbye config" });
  }
});

app.post("/api/guilds/:guildId/goodbye", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedGoodbye = normalizeGoodbyePayload(req.body);

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          "goodbye.enabled": normalizedGoodbye.enabled,
          "goodbye.channelId": normalizedGoodbye.channelId,

          "goodbye.embed.enabled": normalizedGoodbye.embed.enabled,
          "goodbye.embed.title": normalizedGoodbye.embed.title,
          "goodbye.embed.description": normalizedGoodbye.embed.description,
          "goodbye.embed.color": normalizedGoodbye.embed.color,
          "goodbye.embed.footer": normalizedGoodbye.embed.footer,
          "goodbye.embed.banner": normalizedGoodbye.embed.banner,
          "goodbye.embed.thumbnail": normalizedGoodbye.embed.thumbnail,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Goodbye config saved successfully",
      goodbye: normalizeGoodbyePayload(updatedConfig.goodbye),
    });
  } catch (error) {
    console.error("Goodbye POST error:", error);
    res.status(500).json({ error: "Failed to save goodbye config" });
  }
});

/* ───────────────────── LOGS API ───────────────────── */

app.get("/api/guilds/:guildId/logs", async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await getOrCreateGuildConfig(guildId);
    const logs = normalizeLogsPayload(config.logs || {});

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Logs GET error:", error);
    res.status(500).json({ error: "Failed to fetch logs config" });
  }
});

app.post("/api/guilds/:guildId/logs", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedLogs = normalizeLogsPayload(req.body);

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          logs: normalizedLogs,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Logs config saved successfully",
      logs: normalizeLogsPayload(updatedConfig.logs || {}),
    });
  } catch (error) {
    console.error("Logs POST error:", error);
    res.status(500).json({ error: "Failed to save logs config" });
  }
});
/* ───────────────────── SERVER STATS API ───────────────────── */

app.get("/api/guilds/:guildId/server-stats", async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await getOrCreateGuildConfig(guildId);
    const serverStats = normalizeServerStatsPayload(config.serverStats || {});

    res.json({
      success: true,
      serverStats,
    });
  } catch (error) {
    console.error("Server Stats GET error:", error);
    res.status(500).json({ error: "Failed to fetch server stats config" });
  }
});

app.post("/api/guilds/:guildId/server-stats", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedServerStats = normalizeServerStatsPayload(req.body);

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          serverStats: normalizedServerStats,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Server stats config saved successfully",
      serverStats: normalizeServerStatsPayload(updatedConfig?.serverStats || {}),
    });
  } catch (error) {
    console.error("Server Stats POST error:", error);
    res.status(500).json({
      error: "Failed to save server stats config",
      details: error.message,
    });
  }
});
app.post("/api/guilds/:guildId/server-stats/create", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const serverStats = normalizeServerStatsPayload(config.serverStats || {});

    if (!serverStats.enabled) {
      return res.status(400).json({
        error: "Server stats is disabled. Enable it first.",
      });
    }

    if (!serverStats.categoryId) {
      return res.status(400).json({
        error: "Please select a stats category first.",
      });
    }

  const guild = await getGuildFromAnyBot(guildId);
if (!guild) {
  return res.status(404).json({
    error: "Guild not found for Kyro or custom bot",
  });
}

    const category = await guild.channels.fetch(serverStats.categoryId).catch(() => null);
    if (!category || category.type !== 4) {
      return res.status(400).json({
        error: "Selected category is invalid or inaccessible.",
      });
    }

    const updatedEntries = [];
    let createdCount = 0;

    for (const entry of serverStats.entries || []) {
      if (!entry?.enabled) {
        updatedEntries.push(entry);
        continue;
      }

      if (entry.channelId) {
        updatedEntries.push(entry);
        continue;
      }

      const channelName = await buildServerStatsChannelName(entry, guild);
      if (!channelName) {
        updatedEntries.push(entry);
        continue;
      }

      const createdChannel = await guild.channels.create({
        name: channelName,
        type: 2,
        parent: category.id,
        reason: "Kyro dashboard server stats create",
      });

      updatedEntries.push({
        ...entry,
        channelId: createdChannel.id,
      });

      createdCount++;
    }

      const refreshedEntries = updatedEntries;
const refreshedCount = 0;

const now = new Date();

config.serverStats = {
  ...serverStats,
  entries: refreshedEntries,
  lastUpdated: now,
  lastTimeUpdated: refreshedEntries.some((entry) => entry.type === "time")
    ? now
    : config.serverStats?.lastTimeUpdated,
};

    await config.save();


    res.json({
      success: true,
      message:
        createdCount > 0
          ? `Created ${createdCount} stat channel${
              createdCount === 1 ? "" : "s"
            } and refreshed ${refreshedCount} channel${
              refreshedCount === 1 ? "" : "s"
            }.`
          : `No new stat channels needed to be created. Refreshed ${refreshedCount} channel${
              refreshedCount === 1 ? "" : "s"
            }.`,
      serverStats: normalizeServerStatsPayload(config.serverStats || {}),
    });
  } catch (error) {
    console.error("Server Stats CREATE error:", error);
    res.status(500).json({
      error: "Failed to create server stats channels",
      details: error.message,
    });
  }
});

app.post("/api/guilds/:guildId/server-stats/update", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const serverStats = normalizeServerStatsPayload(config.serverStats || {});

    if (!serverStats.enabled) {
      return res.status(400).json({
        error: "Server stats is disabled. Enable it first.",
      });
    }

    if (!serverStats.categoryId) {
      return res.status(400).json({
        error: "Please select a stats category first.",
      });
    }

    const guild = await getGuildFromAnyBot(guildId);

    if (!guild) {
      return res.status(404).json({
        error: "Guild not found for Kyro or custom bot",
      });
    }

    await guild.members.fetch().catch(() => {});
    await guild.roles.fetch().catch(() => {});
    await guild.channels.fetch().catch(() => {});

    const category = await guild.channels
      .fetch(serverStats.categoryId)
      .catch(() => null);

    if (!category || category.type !== 4) {
      return res.status(400).json({
        error: "Selected category is invalid or inaccessible.",
      });
    }

    const refreshedEntries = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedTimeCount = 0;

    for (const entry of serverStats.entries || []) {
      if (!entry?.enabled) {
        refreshedEntries.push(entry);
        continue;
      }

      if (entry.type === "time") {
        refreshedEntries.push(entry);
        skippedTimeCount++;
        continue;
      }

      const channelName = await buildServerStatsChannelName(entry, guild);

      if (!channelName) {
        refreshedEntries.push(entry);
        continue;
      }

      let channel = null;

      if (entry.channelId) {
        channel = await guild.channels.fetch(entry.channelId).catch(() => null);
      }

      if (!channel) {
        const createdChannel = await guild.channels.create({
          name: channelName,
          type: 2,
          parent: category.id,
          reason: "Kyro dashboard server stats update created missing channel",
        });

        refreshedEntries.push({
          ...entry,
          channelId: createdChannel.id,
        });

        createdCount++;
        continue;
      }

      if (channel.name !== channelName) {
        channel
          .setName(channelName, "Kyro dashboard manual server stats update")
          .catch((error) => {
            console.error(
              "[ServerStats Manual] Rename failed:",
              error.message
            );
          });

        updatedCount++;
      }

      if (channel.parentId !== category.id) {
        channel
          .setParent(category.id, {
            lockPermissions: false,
            reason: "Kyro dashboard server stats category sync",
          })
          .catch((error) => {
            console.error(
              "[ServerStats Manual] Category sync failed:",
              error.message
            );
          });
      }

      refreshedEntries.push(entry);
    }

    config.serverStats = {
      ...serverStats,
      entries: refreshedEntries,
      lastUpdated: new Date(),
      lastTimeUpdated: serverStats.lastTimeUpdated || config.serverStats?.lastTimeUpdated,
    };

    await config.save();

    res.json({
      success: true,
      message: `Updated ${updatedCount} stat channel${
        updatedCount === 1 ? "" : "s"
      }${
        createdCount > 0
          ? ` and created ${createdCount} missing channel${
              createdCount === 1 ? "" : "s"
            }`
          : ""
      }.${
        skippedTimeCount > 0
          ? ` Time stats are updated automatically every 10 minutes to avoid Discord rename limits.`
          : ""
      }`,
      serverStats: normalizeServerStatsPayload(config.serverStats || {}),
    });
  } catch (error) {
    console.error("Server Stats UPDATE error:", error);
    res.status(500).json({
      error: "Failed to update server stats channels",
      details: error.message,
    });
  }
});

app.get("/api/guilds/:guildId/temporary-voice", async (req, res) => {
  try {
    const { guildId } = req.params;

    let config = await GuildConfig.findOne({ guildId }).lean();

    if (!config) {
      config = await GuildConfig.create({ guildId });
      config = config.toObject();
    }

    const premiumStatus = await getPremiumStatus(guildId);

    const temporaryVoice = normalizeTemporaryVoicePayload(
      config.temporaryVoice || {}
    );

    temporaryVoice.isPremium = Boolean(premiumStatus.hasPremium);
    temporaryVoice.plan = premiumStatus.plan || "free";

    return res.json({
      success: true,
      temporaryVoice,
      premiumStatus,
    });
  } catch (error) {
    console.error("Temporary Voice GET error:", error);
    return res.status(500).json({
      error: "Failed to load temporary voice settings",
    });
  }
});
app.post("/api/guilds/:guildId/temporary-voice", async (req, res) => {
  try {
    const { guildId } = req.params;

    const normalized = normalizeTemporaryVoicePayload(req.body || {});

const config = await GuildConfig.findOne({ guildId });
const premiumStatus = await getPremiumStatus(guildId);
const isPremium = Boolean(premiumStatus.hasPremium);

normalized.isPremium = isPremium;
normalized.plan = premiumStatus.plan || "free";

const enabledEntries = Array.isArray(normalized.entries)
  ? normalized.entries.filter((entry) => entry?.enabled !== false)
  : [];

if (!isPremium && enabledEntries.length > 1) {
  return res.status(403).json({
   error:
  "Free plan supports 1 temporary voice setup. Upgrade to Kyro Premium to add more.",
code: "TEMP_VOICE_LIMIT_REACHED",
limit: 1,
  });
}

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          temporaryVoice: normalized,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
      temporaryVoice: normalizeTemporaryVoicePayload(
        updated?.temporaryVoice || normalized
      ),
    });
  } catch (error) {
    console.error("Temporary Voice POST error:", error);
    return res.status(500).json({
      error: "Failed to save temporary voice settings",
    });
  }
});
app.post("/api/guilds/:guildId/temporary-voice/publish", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { entryId } = req.body || {};

    const config = await GuildConfig.findOne({ guildId });
    if (!config) {
      return res.status(404).json({ error: "Guild config not found" });
    }

    const tempVoice = normalizeTemporaryVoicePayload(config.temporaryVoice || {});

    if (!tempVoice.enabled) {
      return res.status(400).json({
        error: "Temporary Voice must be enabled before publishing the panel",
      });
    }

    if (!Array.isArray(tempVoice.entries) || tempVoice.entries.length === 0) {
      return res.status(400).json({
        error: "No temporary voice entries configured",
      });
    }

    const selectedEntry = tempVoice.entries.find((entry) => entry.id === entryId);

    if (!selectedEntry) {
      return res.status(404).json({
        error: "Selected temporary voice entry not found",
      });
    }

    if (!selectedEntry.interfaceChannelId) {
      return res.status(400).json({
        error: "Please select an interface channel first",
      });
    }

    let guild = botClient.guilds.cache.get(guildId);
    if (!guild) {
      guild = await getGuildFromAnyBot(guildId);
    }

    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    const channel = await guild.channels
      .fetch(selectedEntry.interfaceChannelId)
      .catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Configured interface channel is invalid or not text-based",
      });
    }

    const sentMessage = await channel.send({
      embeds: [buildTempVoicePanelEmbed()],
      components: buildTempVoicePanelComponents(),
    });

    const updatedEntries = tempVoice.entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            panelMessageId: sentMessage.id,
          }
        : entry
    );

    config.temporaryVoice = {
      ...tempVoice,
      entries: updatedEntries,
    };

    await config.save();

    return res.json({
      success: true,
      message: "Temporary Voice panel published successfully",
      temporaryVoice: normalizeTemporaryVoicePayload(config.temporaryVoice || {}),
    });
  } catch (error) {
    console.error("Temporary Voice publish error:", error);
    return res.status(500).json({
      error: "Failed to publish Temporary Voice panel",
    });
  }
});
app.post("/api/guilds/:guildId/temporary-voice/disable", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          "temporaryVoice.enabled": false,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
      message: "Temporary Voice disabled successfully",
      temporaryVoice: normalizeTemporaryVoicePayload(
        config?.temporaryVoice || {}
      ),
    });
  } catch (error) {
    console.error("Temporary Voice disable error:", error);
    return res.status(500).json({
      error: "Failed to disable Temporary Voice",
    });
  }
});
/* ───────────────────── TICKETS API ───────────────────── */

app.get("/api/guilds/:guildId/tickets", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const tickets = normalizeTicketsPayload(config.tickets || {});
    const premiumStatus = await getPremiumStatus(guildId);

    const trialEndsAt = tickets?.premiumTrial?.expiresAt
      ? new Date(tickets.premiumTrial.expiresAt)
      : null;

    const ticketTrialActive =
      trialEndsAt instanceof Date &&
      !Number.isNaN(trialEndsAt.getTime()) &&
      trialEndsAt > new Date();

    tickets.premiumTrial = {
      ...tickets.premiumTrial,
      isActive: ticketTrialActive,
      hasPremium: premiumStatus.hasPremium,
      plan: premiumStatus.plan || "free",
    };

    res.json({
      success: true,
      tickets,
      premiumStatus,
      ticketTrialActive,
      premiumUnlocked: Boolean(premiumStatus.hasPremium || ticketTrialActive),
    });
  } catch (error) {
    console.error("Tickets GET error:", error);
    res.status(500).json({ error: "Failed to fetch ticket config" });
  }
});

function ticketUsesPremiumFeatures(tickets = {}) {
  const panels = Array.isArray(tickets.panels) ? tickets.panels : [];

  for (const panel of panels) {
    const panelMessage = panel.panelMessage || {};
    const introMessage = panel.ticketIntroMessage || {};
    const behavior = panel.behavior || {};
    const options = Array.isArray(panel.options) ? panel.options : [];

    if (panelMessage.bannerUrl || panelMessage.imageUrl || panelMessage.footer) {
      return true;
    }

    if (introMessage.bannerUrl || introMessage.imageUrl || introMessage.footer) {
      return true;
    }

    if (behavior.autoDeleteClosed) {
      return true;
    }

    for (const option of options) {
      const questions = Array.isArray(option.questions) ? option.questions : [];
      const formQuestions = Array.isArray(option.formQuestions)
        ? option.formQuestions
        : [];

      if (questions.length > 0 || formQuestions.length > 0) {
        return true;
      }
    }
  }

  return false;
}

app.post("/api/guilds/:guildId/tickets", async (req, res) => {
  try {
    const { guildId } = req.params;

    const existingConfig = await getOrCreateGuildConfig(guildId);
    const existingTickets = normalizeTicketsPayload(existingConfig.tickets || {});
    const incomingTickets = normalizeTicketsPayload(req.body);

     const existingTrial = existingTickets?.premiumTrial || {};
    const incomingTrial = incomingTickets?.premiumTrial || {};

    const existingActivatedAt = existingTrial?.activatedAt
      ? new Date(existingTrial.activatedAt).getTime()
      : null;

    const incomingActivatedAt = incomingTrial?.activatedAt
      ? new Date(incomingTrial.activatedAt).getTime()
      : null;

    const existingTrialAlreadyUsed = Boolean(existingActivatedAt);

    let finalPremiumTrial = incomingTrial;

    if (
      existingTrialAlreadyUsed &&
      incomingActivatedAt &&
      incomingActivatedAt !== existingActivatedAt
    ) {
      return res.status(400).json({
        error: "This server has already used its 7-day premium trial.",
      });
    }

    if (existingTrialAlreadyUsed) {
      finalPremiumTrial = {
        ...existingTrial,
        ...incomingTrial,
        activatedAt: existingTrial.activatedAt,
      };
    }

    const normalizedTickets = {
      ...incomingTickets,
      premiumTrial: finalPremiumTrial,
    };

    const premiumStatus = await getPremiumStatus(guildId);
    normalizedTickets.premiumTrial.hasPremium = premiumStatus.hasPremium;
normalizedTickets.premiumTrial.plan = premiumStatus.plan;

const trialEndsAt =
  normalizedTickets?.premiumTrial?.expiresAt ||
  normalizedTickets?.premiumTrial?.endsAt
    ? new Date(
        normalizedTickets.premiumTrial.expiresAt ||
          normalizedTickets.premiumTrial.endsAt
      )
    : null;

const ticketTrialActive =
  trialEndsAt instanceof Date &&
  !Number.isNaN(trialEndsAt.getTime()) &&
  trialEndsAt > new Date();

normalizedTickets.premiumTrial.isActive = ticketTrialActive;
normalizedTickets.premiumTrial.hasPremium = premiumStatus.hasPremium;
normalizedTickets.premiumTrial.plan = premiumStatus.plan || "free";

const usesPremiumTicketFeatures =
  ticketUsesPremiumFeatures(normalizedTickets);

if (
  usesPremiumTicketFeatures &&
  !premiumStatus.hasPremium &&
  !ticketTrialActive
) {
  return res.status(403).json({
    success: false,
    code: "TICKET_PREMIUM_REQUIRED",
    hasPremium: premiumStatus.hasPremium,
    trialActive: ticketTrialActive,
    error:
      "Ticket banners, footers, forms, and auto-delete require Kyro Premium or the 7-day ticket trial.",
  });
}

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          tickets: normalizedTickets,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Tickets config saved successfully",
      tickets: normalizeTicketsPayload(updatedConfig?.tickets || {}),
    });
  } catch (error) {
    console.error("Tickets POST error:", error);
    res.status(500).json({
      error: "Failed to save ticket config",
      details: error.message,
    });
  }
});

app.post("/api/guilds/:guildId/tickets/:panelId/publish", async (req, res) => {
  try {
    const { guildId, panelId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const tickets = normalizeTicketsPayload(config.tickets || {});
    const panel = tickets.panels.find((p) => p.id === panelId);

    if (!panel) {
      return res.status(404).json({ error: "Panel not found" });
    }

    if (!tickets.enabled) {
      return res.status(400).json({ error: "Ticket system is disabled" });
    }

    if (!panel.channelId) {
      return res.status(400).json({ error: "Please select a publish channel first" });
    }

    const channel = await getChannelFromAnyBot(guildId, panel.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Selected channel is invalid or inaccessible",
      });
    }

    const messagePayload = buildTicketPanelMessage(panel);

    let message = null;

    if (panel.sentPanel?.messageId && panel.sentPanel?.channelId === panel.channelId) {
      const existingMessage = await channel.messages
        .fetch(panel.sentPanel.messageId)
        .catch(() => null);

      if (existingMessage) {
        message = await existingMessage.edit(messagePayload);
      }
    }

    if (!message) {
      message = await channel.send(messagePayload);
    }

    const updatedTickets = {
      ...tickets,
      panels: tickets.panels.map((p) =>
        p.id === panelId
          ? {
              ...p,
              sentPanel: {
                messageId: message.id,
                channelId: channel.id,
                publishedAt: new Date(),
              },
            }
          : p
      ),
    };

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tickets: updatedTickets } },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Ticket panel published successfully",
      tickets: normalizeTicketsPayload(updatedConfig?.tickets || {}),
    });
  } catch (error) {
    console.error("Ticket publish error:", error);
    res.status(500).json({
      error: "Failed to publish ticket panel",
      details: error.message,
    });
  }
});

/* ───────────────────── SELF ROLES API ───────────────────── */

app.get("/api/guilds/:guildId/selfroles", async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await getOrCreateGuildConfig(guildId);
    const selfRoles = normalizeSelfRolesPayload(config.selfRoles || {});

    res.json({
      success: true,
      selfRoles,
    });
  } catch (error) {
    console.error("Self Roles GET error:", error);
    res.status(500).json({ error: "Failed to fetch self roles config" });
  }
});

app.post("/api/guilds/:guildId/selfroles", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedSelfRoles = normalizeSelfRolesPayload(req.body);

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          selfRoles: normalizedSelfRoles,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Self roles config saved successfully",
      selfRoles: normalizeSelfRolesPayload(updatedConfig?.selfRoles || {}),
    });
  } catch (error) {
    console.error("Self Roles POST error:", error);
    res.status(500).json({
      error: "Failed to save self roles config",
      details: error.message,
    });
  }
});

app.post("/api/guilds/:guildId/selfroles/:panelId/publish", async (req, res) => {
  try {
    const { guildId, panelId } = req.params;
const forceNew = req.query.forceNew === "true";
    const config = await getOrCreateGuildConfig(guildId);
    const selfRoles = normalizeSelfRolesPayload(config.selfRoles || {});
    const panel = selfRoles.panels.find((p) => p.id === panelId);

    if (!panel) {
      return res.status(404).json({ error: "Panel not found" });
    }

    if (!selfRoles.enabled) {
      return res.status(400).json({ error: "Self roles system is disabled" });
    }

    if (!panel.channelId) {
      return res.status(400).json({ error: "Please select a publish channel first" });
    }

    if (!panel.options?.length) {
      return res.status(400).json({ error: "Please add at least one role option" });
    }

    if (panel.type !== "reactions") {
      const invalidOption = panel.options.find(
        (option) => !option.roleId || !option.label?.trim()
      );

      if (invalidOption) {
        return res.status(400).json({
          error: "All buttons/dropdown options need both label and role",
        });
      }
    }

    if (panel.type === "reactions") {
      const invalidReaction = panel.options.find(
        (option) => !option.roleId || !option.emoji
      );

      if (invalidReaction) {
        return res.status(400).json({
          error: "All reaction options need both role and emoji",
        });
      }
    }

   const channel = await getChannelFromAnyBot(guildId, panel.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Selected channel is invalid or inaccessible",
      });
    }

    const messagePayload = buildSelfRolePanelMessage(panel);
    let message = null;

const sameChannelMessageId =
  !forceNew &&
  panel.sentPanel?.messageId &&
  panel.sentPanel?.channelId === panel.channelId
    ? panel.sentPanel.messageId
    : !forceNew && panel.messageId && panel.channelId
    ? panel.messageId
    : null;

if (sameChannelMessageId) {
  const existingMessage = await channel.messages
    .fetch(sameChannelMessageId)
    .catch(() => null);

  if (existingMessage) {
    message = await existingMessage.edit(messagePayload);
  }
}

    if (!message) {
      message = await channel.send(messagePayload);
    }

    if (panel.type === "reactions") {
      try {
        await message.reactions.removeAll().catch(() => null);

        for (const option of panel.options) {
          const emoji = parseDiscordEmoji(option.emoji);
          if (emoji) {
            await message.react(emoji);
          }
        }
      } catch (reactionError) {
        console.error("Self role reactions publish error:", reactionError);
      }
    }

    const updatedSelfRoles = {
      ...selfRoles,
      panels: selfRoles.panels.map((p) =>
        p.id === panelId
          ? {
              ...p,
              messageId: message.id,
              channelId: channel.id,
              sentPanel: {
                messageId: message.id,
                channelId: channel.id,
                publishedAt: new Date(),
              },
            }
          : p
      ),
    };

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { selfRoles: updatedSelfRoles } },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message:
        sameChannelMessageId
          ? "Self role panel updated successfully"
          : "Self role panel published successfully",
      selfRoles: normalizeSelfRolesPayload(updatedConfig?.selfRoles || {}),
    });
  } catch (error) {
    console.error("Self role publish error:", error);
    res.status(500).json({
      error: "Failed to publish self role panel",
      details: error.message,
    });
  }
});
// =========================
// EMBED BUILDER ROUTES
// =========================

// GET all embed messages for a guild
app.get("/api/guilds/:guildId/embed-messages", async (req, res) => {
  try {
    const { guildId } = req.params;

    const rawMessages = await EmbedMessage.find({ guildId })
      .sort({ updatedAt: -1 })
      .lean();

    const messages = await Promise.all(
      rawMessages.map(async (message) => {
        let channelName = "";

        if (message.channelId) {
          const channel = await botClient.channels
            .fetch(message.channelId)
            .catch(() => null);

          if (channel?.name) {
            channelName = channel.name;
          }
        }

        return {
  ...message,
  channelName,
  usesPremium: detectPremiumUsage(Array.isArray(message.embeds) ? message.embeds : []),
};
      })
    );

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch embed messages",
    });
  }
});

// GET one embed message
app.get("/api/guilds/:guildId/embed-messages/:embedId", async (req, res) => {
  try {
    const { guildId, embedId } = req.params;


    let message = await EmbedMessage.findOne({ guildId, embedId }).lean();

    if (!message) {
     

      message = await EmbedMessage.findOne({ embedId }).lean();

      if (message) {
      }
    }

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Embed message not found",
      });
    }

 const premiumStatus = await getPremiumStatus(guildId);

return res.json({
  success: true,
  message,
  premiumStatus,
});
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      error: "Failed to fetch embed message",
    });
  }
});

// CREATE new embed message
app.post("/api/guilds/:guildId/embed-messages", async (req, res) => {
  try {
    const { guildId } = req.params;
    const {
      name = "New Embed",
      channelId = "",
      messageContent = "",
      embeds = [],
      buttons = [],
      createdBy = "",
      updatedBy = "",
    } = req.body || {};

    const normalizedEmbeds =
      Array.isArray(embeds) && embeds.length > 0
        ? embeds.map((embed, index) => normalizeEmbedBlock(embed, index))
        : [buildDefaultEmbedBlock(0)];

    const normalizedButtons = Array.isArray(buttons)
      ? buttons.map((button, index) => normalizeEmbedButton(button, index))
      : [];

    const newEmbedId = makeId("embedmsg");


    const embedMessage = await EmbedMessage.create({
      guildId,
      embedId: newEmbedId,
      name: typeof name === "string" && name.trim() ? name.trim() : "New Embed",
      enabled: true,
      status: "draft",
      channelId: typeof channelId === "string" ? channelId : "",
      messageId: "",
      messageContent:
        typeof messageContent === "string" ? messageContent : "",
      embeds: normalizedEmbeds,
      buttons: normalizedButtons,
      usesPremium: detectPremiumUsage(normalizedEmbeds),
      createdBy,
      updatedBy,
    });

    const verifySaved = await EmbedMessage.findOne({
      embedId: embedMessage.embedId,
    }).lean();


    return res.json({
      success: true,
      message: embedMessage,
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      error: "Failed to create embed message",
    });
  }
});

// UPDATE existing embed message
app.put("/api/guilds/:guildId/embed-messages/:embedId", async (req, res) => {
  try {
    const { guildId, embedId } = req.params;
    const {
      name,
      enabled,
      status,
      channelId,
      messageId,
      messageContent,
      embeds,
      buttons,
      updatedBy = "",
    } = req.body || {};

    const existing = await EmbedMessage.findOne({ guildId, embedId });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Embed message not found",
      });
    }

    if (typeof name === "string") {
      existing.name = name.trim() || "New Embed";
    }

    if (typeof enabled === "boolean") {
      existing.enabled = enabled;
    }

    if (typeof status === "string" && ["draft", "published"].includes(status)) {
      existing.status = status;
    }

    if (typeof channelId === "string") {
      existing.channelId = channelId;
    }

    if (typeof messageId === "string") {
      existing.messageId = messageId;
    }

    if (typeof messageContent === "string") {
      existing.messageContent = messageContent;
    }

    if (Array.isArray(embeds)) {
      existing.embeds =
        embeds.length > 0
          ? embeds.map((embed, index) => normalizeEmbedBlock(embed, index))
          : [buildDefaultEmbedBlock(0)];
    }

    if (Array.isArray(buttons)) {
      existing.buttons = buttons.map((button, index) =>
        normalizeEmbedButton(button, index)
      );
    }

    existing.usesPremium = detectPremiumUsage(existing.embeds);
    existing.updatedBy = updatedBy;

    await existing.save();

    return res.json({
      success: true,
      message: existing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to update embed message",
    });
  }
});

// DUPLICATE embed message
app.post(
  "/api/guilds/:guildId/embed-messages/:embedId/duplicate",
  async (req, res) => {
    try {
      const { guildId, embedId } = req.params;
      const { updatedBy = "", createdBy = "" } = req.body || {};

      const existing = await EmbedMessage.findOne({ guildId, embedId }).lean();

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: "Embed message not found",
        });
      }

      const duplicated = await EmbedMessage.create({
        guildId,
        embedId: makeId("embedmsg"),
        name: existing.name.replace(/ Copy(\s\d+)?$/, "") + " Copy",
        enabled: existing.enabled,
        status: "draft",
        channelId: existing.channelId || "",
        messageId: "",
        messageContent: existing.messageContent || "",
        embeds: (existing.embeds || []).map((embed, embedIndex) =>
          normalizeEmbedBlock(
            {
              ...embed,
              id: makeId("embed"),
              fields: (embed.fields || []).map((field) => ({
                ...field,
                id: makeId("field"),
              })),
            },
            embedIndex
          )
        ),
        buttons: (existing.buttons || []).map((button, buttonIndex) =>
          normalizeEmbedButton(
            {
              ...button,
              id: makeId("btn"),
            },
            buttonIndex
          )
        ),
        usesPremium: existing.usesPremium || false,
        createdBy,
        updatedBy,
      });

      return res.json({
        success: true,
        message: duplicated,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Failed to duplicate embed message",
      });
    }
  }
);

// DELETE embed message
app.delete("/api/guilds/:guildId/embed-messages/:embedId", async (req, res) => {
  try {
    const { guildId, embedId } = req.params;

    const deleted = await EmbedMessage.findOneAndDelete({ guildId, embedId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Embed message not found",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to delete embed message",
    });
  }
});
app.post("/api/guilds/:guildId/embed-messages/:embedId/publish", async (req, res) => {
  
  try {
    const { guildId, embedId } = req.params;

    const messageDoc = await EmbedMessage.findOne({ guildId, embedId });

    if (!messageDoc) {
      return res.status(404).json({
        success: false,
        error: "Embed message not found",
      });
    }

    if (!messageDoc.channelId) {
      return res.status(400).json({
        success: false,
        error: "Please select a publish channel first",
      });
    }

    const channel = await getChannelFromAnyBot(guildId, messageDoc.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        success: false,
        error: "Selected channel is invalid or inaccessible",
      });
    }

    const payload = buildEmbedMessagePayload(messageDoc);
    const sentMessage = await channel.send(payload);

    messageDoc.status = "published";
    messageDoc.messageId = sentMessage.id;
    messageDoc.updatedAt = new Date();

    await messageDoc.save();

    return res.json({
      success: true,
      message: messageDoc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to publish embed message",
    });
  }
});

app.post("/api/guilds/:guildId/embed-messages/:embedId/update-message", async (req, res) => {
  try {
    const { guildId, embedId } = req.params;

    const messageDoc = await EmbedMessage.findOne({ guildId, embedId });

    if (!messageDoc) {
      return res.status(404).json({
        success: false,
        error: "Embed message not found",
      });
    }

    if (!messageDoc.channelId) {
      return res.status(400).json({
        success: false,
        error: "Please select a publish channel first",
      });
    }

    if (!messageDoc.messageId) {
      return res.status(400).json({
        success: false,
        error: "This embed has not been published yet",
      });
    }

    const channel = await getChannelFromAnyBot(guildId, messageDoc.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        success: false,
        error: "Selected channel is invalid or inaccessible",
      });
    }

    const existingMessage = await channel.messages.fetch(messageDoc.messageId).catch(() => null);

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        error: "Published Discord message not found",
      });
    }

    const payload = buildEmbedMessagePayload(messageDoc);
    
    await existingMessage.edit(payload);

    messageDoc.status = "published";
    messageDoc.updatedAt = new Date();

    await messageDoc.save();

    return res.json({
      success: true,
      message: messageDoc,
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      error: "Failed to update published embed message",
    });
  }
});
// ================= VERIFICATION ROUTES =================
app.get("/api/guilds/:guildId/verification", async (req, res) => {
  try {
    const { guildId } = req.params;

    let config = await GuildConfig.findOne({ guildId });

    if (!config) {
      config = await GuildConfig.create({ guildId });
    }

    const premiumStatus = await getPremiumStatus(guildId);

    

    const verificationData = normalizeVerificationPayload(
      config.verification || {}
    );

    res.json({
      ...verificationData,
      premiumStatus,
    });
  } catch (err) {
    console.error("GET verification error:", err);
    res.status(500).json({ error: "Failed to load verification config" });
  }
});

app.post("/api/guilds/:guildId/verification", async (req, res) => {
  try {
    const { guildId } = req.params;
    const verification = normalizeVerificationPayload(req.body);

    const premiumStatus = await getPremiumStatus(guildId);

const panelCount = Array.isArray(verification.panels)
  ? verification.panels.length
  : 0;

const verificationLimit = getFeatureLimit(
  premiumStatus,
  "verificationPanels"
);

if (
  verificationLimit !== Infinity &&
  panelCount > verificationLimit
) {
  return res.status(403).json({
    success: false,
    code: "VERIFICATION_LIMIT_REACHED",
    limit: verificationLimit,
    hasPremium: premiumStatus.hasPremium,
    error: `Free plan supports up to ${verificationLimit} verification panels.`,
  });
}

const hasCaptchaPanel = Array.isArray(verification.panels)
  ? verification.panels.some(
      (panel) =>
        String(panel.mode || "").toLowerCase() === "captcha"
    )
  : false;

if (hasCaptchaPanel && !premiumStatus.hasPremium) {
  return res.status(403).json({
    success: false,
    code: "CAPTCHA_PREMIUM_REQUIRED",
    hasPremium: false,
    error:
      "Captcha verification requires Kyro Premium.",
  });
}

    let config = await GuildConfig.findOne({ guildId });

    if (!config) {
      config = await GuildConfig.create({ guildId });
    }

    config.verification = verification;

    await config.save();

    res.json({
      success: true,
      verification: normalizeVerificationPayload(config.verification || {}),
    });
  } catch (err) {
    console.error("POST verification error:");
    console.error("message:", err.message);
    console.error("stack:", err.stack);

    if (err.errors) {
      console.error("validation errors:", Object.keys(err.errors));
      for (const key of Object.keys(err.errors)) {
        console.error(`${key}:`, err.errors[key].message);
      }
    }

    res.status(500).json({
      error: "Failed to save verification config",
      details: err.message,
    });
  }
});

app.post("/api/guilds/:guildId/verification/:panelId/publish", async (req, res) => {
  try {
    const { guildId, panelId } = req.params;
    const forceNew = req.query.forceNew === "true";

    const config = await getOrCreateGuildConfig(guildId);
    const verification = normalizeVerificationPayload(config.verification || {});
    const panel = verification.panels.find((p) => p.id === panelId);

    if (!panel) {
      return res.status(404).json({ error: "Verification panel not found" });
    }

    if (!panel.channelId) {
      return res.status(400).json({
        error: "Please select a publish channel first",
      });
    }

    if (!panel.roleId) {
      return res.status(400).json({
        error: "Please select a verified role first",
      });
    }

    const channel = await getChannelFromAnyBot(guildId, panel.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Selected channel is invalid or inaccessible",
      });
    }

    const messagePayload = buildVerificationPanelMessage(panel);
    let message = null;

    const sameChannelMessageId =
      !forceNew &&
      panel.sentPanel?.messageId &&
      panel.sentPanel?.channelId === panel.channelId
        ? panel.sentPanel.messageId
        : null;

    if (sameChannelMessageId) {
      const existingMessage = await channel.messages
        .fetch(sameChannelMessageId)
        .catch(() => null);

      if (existingMessage) {
        message = await existingMessage.edit(messagePayload);
      }
    }

    if (!message) {
      message = await channel.send(messagePayload);
    }

    if (panel.mode === "reaction") {
      try {
        await message.reactions.removeAll().catch(() => null);

        const emoji = parseDiscordEmoji(panel.interaction?.reaction?.emoji);
        if (emoji) {
          await message.react(emoji);
        }
      } catch (reactionError) {
        console.error("Verification reactions publish error:", reactionError);
      }
    }

    const updatedVerification = {
      ...verification,
      panels: verification.panels.map((p) =>
        p.id === panelId
          ? {
              ...p,
              sentPanel: {
                messageId: message.id,
                channelId: channel.id,
                publishedAt: new Date(),
              },
            }
          : p
      ),
    };

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { verification: updatedVerification } },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message:
        sameChannelMessageId
          ? "Verification panel updated successfully"
          : "Verification panel published successfully",
      verification: normalizeVerificationPayload(
        updatedConfig?.verification || {}
      ),
    });
  } catch (error) {
    console.error("Verification publish error:", error);
    res.status(500).json({
      error: "Failed to publish verification panel",
      details: error.message,
    });
  }
});

app.post("/api/guilds/:guildId/verification/:panelId/update-message", async (req, res) => {
  try {
    const { guildId, panelId } = req.params;

    const config = await getOrCreateGuildConfig(guildId);
    const verification = normalizeVerificationPayload(config.verification || {});
    const panel = verification.panels.find((p) => p.id === panelId);

    if (!panel) {
      return res.status(404).json({ error: "Verification panel not found" });
    }

    if (!panel.sentPanel?.messageId || !panel.sentPanel?.channelId) {
      return res.status(400).json({
        error: "This verification panel has not been published yet",
      });
    }

  const channel = await getChannelFromAnyBot(guildId, panel.sentPanel.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        error: "Published channel is invalid or inaccessible",
      });
    }

    const existingMessage = await channel.messages
      .fetch(panel.sentPanel.messageId)
      .catch(() => null);

    if (!existingMessage) {
      return res.status(404).json({
        error:
          "The published verification message could not be found. Use Publish New once to create a fresh panel.",
      });
    }

    const messagePayload = buildVerificationPanelMessage(panel);
    await existingMessage.edit(messagePayload);

    if (panel.mode === "reaction") {
      try {
        await existingMessage.reactions.removeAll().catch(() => null);

        const emoji = parseDiscordEmoji(panel.interaction?.reaction?.emoji);
        if (emoji) {
          await existingMessage.react(emoji);
        }
      } catch (reactionError) {
        console.error("Verification reactions update error:", reactionError);
      }
    }

    const updatedVerification = {
      ...verification,
      panels: verification.panels.map((p) =>
        p.id === panelId
          ? {
              ...p,
              sentPanel: {
                ...p.sentPanel,
                messageId: existingMessage.id,
                channelId: channel.id,
              },
            }
          : p
      ),
    };

    const updatedConfig = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { verification: updatedVerification } },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: "Verification message updated successfully",
      verification: normalizeVerificationPayload(
        updatedConfig?.verification || {}
      ),
    });
  } catch (error) {
    console.error("Verification update-message error:", error);
    res.status(500).json({
      error: "Failed to update verification panel",
      details: error.message,
    });
  }
});

async function getGuildFromAnyBot(guildId) {
  let guild = botClient.guilds.cache.get(guildId);

  if (!guild) {
    guild = await botClient.guilds.fetch(guildId).catch(() => null);
  }

  if (guild) return guild;

  const customClient = getCustomBotClient(guildId);

  if (!customClient) return null;

  guild = customClient.guilds.cache.get(guildId);

  if (!guild) {
    guild = await customClient.guilds.fetch(guildId).catch(() => null);
  }

  return guild || null;
}

async function getChannelFromAnyBot(guildId, channelId) {
  const guild = await getGuildFromAnyBot(guildId);
  if (!guild) return null;

  return guild.channels.fetch(channelId).catch(() => null);
}

async function getRoleFromAnyBot(guildId, roleId) {
  const guild = await getGuildFromAnyBot(guildId);
  if (!guild) return null;

  return guild.roles.fetch(roleId).catch(() => null);
}

async function getEmojiFromAnyBot(guildId, emojiId) {
  const guild = await getGuildFromAnyBot(guildId);
  if (!guild) return null;

  return guild.emojis.fetch(emojiId).catch(() => null);
}

/* ───────────────────── RESOURCE ROUTES ───────────────────── */

app.get("/api/guilds/:guildId/channels", async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = await getGuildFromAnyBot(guildId);

    if (!guild) {
      return res.status(404).json({ error: "Guild not found for main or custom bot" });
    }

    const channelsFetched = await guild.channels.fetch().catch((err) => {
      console.error("[Channels Route] guild.channels.fetch error:", err);
      return null;
    });

    const channels = [...(channelsFetched?.values() || [])]
      .filter((c) => c && (c.type === 0 || c.type === 2 || c.type === 4 || c.type === 5))
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, channels });
  } catch (error) {
    console.error("Guild channels fetch error:", error);
    res.status(500).json({ error: "Failed to fetch guild channels" });
  }
});

app.get("/api/guilds/:guildId/categories", async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = await getGuildFromAnyBot(guildId);

    if (!guild) {
      return res.status(404).json({ error: "Guild not found for main or custom bot" });
    }

    const channels = await guild.channels.fetch();

    const categories = [...channels.values()]
      .filter((channel) => channel && channel.type === 4)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, categories });
  } catch (error) {
    console.error("Guild categories fetch error:", error);
    res.status(500).json({ error: "Failed to fetch guild categories" });
  }
});

app.get("/api/guilds/:guildId/roles", async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = await getGuildFromAnyBot(guildId);

    if (!guild) {
      return res.status(404).json({ error: "Guild not found for main or custom bot" });
    }

    const roles = await guild.roles.fetch();

    const formattedRoles = [...roles.values()]
      .filter((role) => role && role.name !== "@everyone" && !role.managed)
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
      }))
      .sort((a, b) => b.position - a.position)
      .map(({ id, name }) => ({ id, name }));

    res.json({ success: true, roles: formattedRoles });
  } catch (error) {
    console.error("Guild roles fetch error:", error);
    res.status(500).json({ error: "Failed to fetch guild roles" });
  }
});

app.get("/api/guilds/:guildId/emojis", async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = await getGuildFromAnyBot(guildId);

    if (!guild) {
      return res.status(404).json({ error: "Guild not found for main or custom bot" });
    }

    const emojisFetched = await guild.emojis.fetch();

    const emojis = [...emojisFetched.values()].map((emoji) => ({
      id: emoji.id,
      name: emoji.name,
      animated: !!emoji.animated,
      url: emoji.imageURL({
  size: 64,
  extension: emoji.animated ? "gif" : "png",
}),
      identifier: `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`,
    }));

    res.json({ success: true, emojis });
  } catch (error) {
    console.error("Guild emojis fetch error:", error);
    res.status(500).json({ error: "Failed to fetch guild emojis" });
  }
});

app.get("/api/discord/bot-guilds", async (req, res) => {
  try {
    const mainGuildIds = [...botClient.guilds.cache.values()].map((g) => g.id);

    const customBots = await CustomBot.find({
      enabled: true,
    });

    const customGuildIds = customBots.map((b) => b.guildId);

    const allGuildIds = [...new Set([...mainGuildIds, ...customGuildIds])];

    res.json({
      success: true,
      guildIds: allGuildIds,
      mainGuildIds,
      customGuildIds,
    });
  } catch (error) {
    console.error("Bot guild fetch error:", error.message);
    res.status(500).json({ error: "Failed to fetch bot guilds" });
  }
});

/* ───────────────────── LEGACY LEVELING API ───────────────────── */

app.get("/api/leveling/:guildId", async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await getOrCreateGuildConfig(guildId);
    res.json(normalizeLevelingPayload(config.leveling || {}));
  } catch (error) {
    console.error("Legacy leveling GET error:", error);
    res.status(500).json({ error: "Failed to fetch leveling config" });
  }
});

app.post("/api/leveling/:guildId", async (req, res) => {
  try {
    const { guildId } = req.params;
    const normalizedLeveling = normalizeLevelingPayload(req.body);

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { leveling: normalizedLeveling } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    res.json(normalizeLevelingPayload(updated.leveling));
  } catch (error) {
    console.error("Legacy leveling POST error:", error);
    res.status(500).json({ error: "Failed to save leveling config" });
  }
});

function parseGiveawayDuration(input) {
  if (!input) return 3600000; // default 1h

  const match = input.match(/^(\d+)([smhdw])$/i);
  if (!match) return 3600000;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 3600000);
}

// ───────────── GIVEAWAYS GET ─────────────
app.get("/api/guilds/:guildId/giveaways", async (req, res) => {
  try {
    const { guildId } = req.params;

    const premiumStatus = await getPremiumStatus(guildId);

    const Giveaway = require("./models/Giveaway")

    const giveaways = await Giveaway.find({ guildId }).sort({ createdAt: -1 });

    res.json({
  success: true,
  giveaways,
  premiumStatus,
});
  } catch (error) {
    console.error("Giveaways GET error:", error);
    res.status(500).json({ error: "Failed to fetch giveaways" });
  }
});
// ───────────── GIVEAWAY CREATE ─────────────
app.post("/api/guilds/:guildId/giveaways", async (req, res) => {
  try {
    const { guildId } = req.params;
    const premiumStatus = await getPremiumStatus(guildId);
const isPremium = Boolean(premiumStatus.hasPremium);

    const data = req.body;

if (!isPremium) {
  data.bannerUrl = null;
  data.winnerBannerUrl = null;
}
    const Giveaway = require("./models/Giveaway")

    const now = Date.now();
    const durationMs = parseGiveawayDuration(data.duration);
    const giveawayId = `gw_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const created = await Giveaway.create({
      id: giveawayId,
      guildId,
      channelId: data.channelId || "",
      messageId: null,
      hostId: data.hostId || req.user?.id || null,
      name: data.name || "New Giveaway",
      prize: data.prize || "Untitled Giveaway",
      description: data.description || null,
      duration: data.duration || "1h",
      winnerCount: Number(data.winners) || 1,
      entries: [],
      requiredRoleMode: data.requiredRoleMode || "none",
      requiredRoleId: data.requiredRoleId || null,
      bannerUrl: data.bannerUrl || null,
      winnerAnnouncementChannelId: data.winnerAnnouncementChannelId || null,
      winnerBannerUrl: data.winnerBannerUrl || null,
      winnerMessage: data.winnerMessage || null,
      ended: false,
      createdAt: now,
      endAt: now + durationMs,
      winners: [],
    });

    res.json({
      success: true,
      giveaway: created,
    });
  } catch (error) {
    console.error("Giveaway CREATE error:", error);
    res.status(500).json({ error: "Failed to create giveaway" });
  }
});

// ───────────── END GIVEAWAY ─────────────
app.post("/api/guilds/:guildId/giveaways/:id/end", async (req, res) => {
  try {
    const { guildId, id } = req.params;

    const Giveaway = require("./models/Giveaway");
    const { getCustomBotClient } = require("./customBotManager");
const customClient = getCustomBotClient(guildId);
const discordClient = customClient || botClient;

    const giveaway = await Giveaway.findOne({ guildId, id });

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    if (giveaway.ended) {
      return res.status(400).json({ error: "Giveaway already ended" });
    }

    const safeEntries = Array.isArray(giveaway.entries) ? giveaway.entries : [];
    const winnerCount = Math.max(1, Number(giveaway.winnerCount) || 1);

    const shuffled = [...safeEntries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, Math.min(winnerCount, shuffled.length));

    giveaway.ended = true;
    giveaway.endedAt = Date.now();
    giveaway.winners = winners;

    await giveaway.save();

    if (giveaway.channelId && giveaway.messageId) {
      const winnersText =
        winners.length > 0
          ? winners.map((id) => `<@${id}>`).join(", ")
          : "No valid entries";

      const endedEmbed = {
  title: `${giveaway.prize || "Giveaway"} (Ended)`,
  description: [
    giveaway.description || null,
    giveaway.description ? "" : null,
    `👤 **Host:** ${
      giveaway.hostId && /^\d+$/.test(String(giveaway.hostId))
        ? `<@${giveaway.hostId}>`
        : "Dashboard Giveaway"
    }`,
    `👥 **Winners:** ${winnerCount} winner${winnerCount > 1 ? "s" : ""}`,
    `🎟 **Total Entries:** ${safeEntries.length}`,
    "",
    `🏆 **Winner(s):**`,
    winnersText,
  ]
    .filter(Boolean)
    .join("\n"),
  color: 0xed4245,
};

if (
  typeof giveaway.bannerUrl === "string" &&
  (giveaway.bannerUrl.startsWith("http://") ||
    giveaway.bannerUrl.startsWith("https://"))
) {
  endedEmbed.image = { url: giveaway.bannerUrl };
}

    const giveawayChannel = await discordClient.channels
  .fetch(giveaway.channelId)
  .catch(() => null);

if (!giveawayChannel || !giveawayChannel.isTextBased()) {
  throw new Error("Giveaway channel is not accessible by the active bot.");
}

const giveawayMessage = await giveawayChannel.messages
  .fetch(giveaway.messageId)
  .catch(() => null);

if (!giveawayMessage) {
  throw new Error("Giveaway message could not be found by the active bot.");
}

await giveawayMessage.edit({
  embeds: [endedEmbed],
  components: [],
});
    }

    const winnerAnnouncementChannelId =
      giveaway.winnerAnnouncementChannelId || giveaway.channelId;

    if (winnerAnnouncementChannelId) {
      const winnerMentions =
        winners.length > 0
          ? winners.map((id) => `<@${id}>`).join(", ")
          : "No valid winners";

      const hostText =
        giveaway.hostId && /^\d+$/.test(String(giveaway.hostId))
          ? `<@${giveaway.hostId}>`
          : "Dashboard Giveaway";

      const winnerMessage =
        (typeof giveaway.winnerMessage === "string" && giveaway.winnerMessage.trim()
          ? giveaway.winnerMessage.trim()
          : "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.")
          .replace(/\{winners\}/gi, winnerMentions)
          .replace(/\{prize\}/gi, giveaway.prize || "Giveaway")
          .replace(/\{host\}/gi, hostText);

      const winnerEmbed = {
  title: "🎉 Giveaway Winner Announcement",
  description:
    winners.length > 0
      ? [
          `🎁 **Prize:** ${giveaway.prize || "Giveaway"}`,
          giveaway.description
            ? `📝 **Description:** ${giveaway.description}`
            : null,
          `👤 **Hosted By:** ${hostText}`,
          `🏆 **Winner(s):** ${winnerMentions}`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `🎁 **Prize:** ${giveaway.prize || "Giveaway"}`,
          giveaway.description
            ? `📝 **Description:** ${giveaway.description}`
            : null,
          `👤 **Hosted By:** ${hostText}`,
          "",
          "No valid entries were found for this giveaway.",
        ]
          .filter(Boolean)
          .join("\n"),
  color: 0x2ecc71,
};

if (
  typeof giveaway.winnerBannerUrl === "string" &&
  (giveaway.winnerBannerUrl.startsWith("http://") ||
    giveaway.winnerBannerUrl.startsWith("https://"))
) {
  winnerEmbed.image = { url: giveaway.winnerBannerUrl };
}

     const winnerChannel = await discordClient.channels
  .fetch(winnerAnnouncementChannelId)
  .catch(() => null);

if (!winnerChannel || !winnerChannel.isTextBased()) {
  throw new Error("Winner announcement channel is not accessible by the active bot.");
}

await winnerChannel.send({
  content:
    winners.length > 0
      ? winnerMessage
      : "⚠️ Giveaway ended with no valid entries.",
  embeds: [winnerEmbed],
});
    }

    res.json({
      success: true,
      giveaway,
    });
  } catch (error) {
    console.error(
      "Giveaway END error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({
      error: error.response?.data?.message || "Failed to end giveaway",
    });
  }
});

app.delete("/api/guilds/:guildId/giveaways/:id", async (req, res) => {
  try {
    const { guildId, id } = req.params;

    const Giveaway = require("./models/Giveaway")

    const deleted = await Giveaway.deleteOne({ guildId, id });

    res.json({
      success: deleted.deletedCount > 0,
    });
  } catch (error) {
    console.error("Giveaway DELETE error:", error);
    res.status(500).json({ error: "Failed to delete giveaway" });
  }
});
app.put("/api/guilds/:guildId/giveaways/:id", async (req, res) => {
  try {
    const { guildId, id } = req.params;
    const data = req.body;

    const Giveaway = require("./models/Giveaway");

    const currentGiveaway = await Giveaway.findOne({ guildId, id });

    if (!currentGiveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    const durationMs = parseGiveawayDuration(data.duration || "1h");
    const baseCreatedAt = currentGiveaway.createdAt || Date.now();
    const newEndAt = baseCreatedAt + durationMs;

   const update = {
  hostId: data.hostId || currentGiveaway.hostId || null,
  name: data.name || "New Giveaway",
  prize: data.prize || "Untitled Giveaway",
  description: data.description || null,
  duration: data.duration || currentGiveaway.duration || "1h",
  winnerCount: Number(data.winners) || 1,
  channelId: data.channelId || "",
  bannerUrl: data.bannerUrl || null,

  requiredRoleMode: data.requiredRoleMode || "none",
  requiredRoleId:
    data.requiredRoleMode && data.requiredRoleMode !== "none"
      ? data.requiredRoleId || null
      : null,

  winnerAnnouncementChannelId:
    data.winnerAnnouncementChannelId || data.channelId || null,

  winnerBannerUrl: data.winnerBannerUrl || null,

 winnerMessage:
  typeof data.winnerMessage === "string" && data.winnerMessage.trim()
    ? data.winnerMessage.trim()
    : "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.",

  endAt: newEndAt,
};

    const updated = await Giveaway.findOneAndUpdate(
      { guildId, id },
      { $set: update },
      { returnDocument: "after" }
    );

    res.json({
      success: true,
      giveaway: updated,
    });
  } catch (error) {
    console.error("Giveaway UPDATE error:", error);
    res.status(500).json({ error: "Failed to update giveaway" });
  }
});

const FormData = require("form-data");
function buildGiveawayDiscordPayload(giveaway) {
  const entryCount = Array.isArray(giveaway.entries) ? giveaway.entries.length : 0;
  const endDate = new Date(giveaway.endAt);
  const winnerText = `${giveaway.winnerCount || 1} winner${
    (giveaway.winnerCount || 1) > 1 ? "s" : ""
  }`;

  const embed = {
    title: giveaway.prize || "Giveaway",
    description: [
      giveaway.description || null,
      giveaway.description ? "" : null,
      `👥 **Winners:** ${winnerText}`,
      `🎟 **Entries:** ${entryCount}`,
      `⏰ **Ends:** <t:${Math.floor(endDate.getTime() / 1000)}:R>`,
      giveaway.requiredRoleId
        ? `🔒 **Role Requirement:** <@&${giveaway.requiredRoleId}>`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    color: 0x5865f2,
  };

  if (
    typeof giveaway.bannerUrl === "string" &&
    (giveaway.bannerUrl.startsWith("http://") ||
      giveaway.bannerUrl.startsWith("https://"))
  ) {
    embed.image = { url: giveaway.bannerUrl };
  }

  const components = giveaway.ended
    ? []
    : [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "Participate",
              custom_id: `giveaway_join_${giveaway.id}`,
            },
            {
              type: 2,
              style: 4,
              label: "Leave",
              custom_id: `giveaway_leave_${giveaway.id}`,
            },
            {
              type: 2,
              style: 2,
              label: "View Participants",
              custom_id: `giveaway_participants_${giveaway.id}`,
            },
          ],
        },
      ];

  return {
    embeds: [embed],
    components,
  };
}

async function getGiveawayPublishChannel(guildId, channelId) {
  const { getCustomBotClient } = require("./customBotManager");

  const customClient = getCustomBotClient(guildId);
  const client = customClient || botClient;

  if (!client?.channels) {
    throw new Error("No Discord client available for giveaway publishing.");
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    throw new Error("Selected giveaway channel is not accessible by the publishing bot.");
  }

  return channel;
}

app.post("/api/guilds/:guildId/giveaways/:id/publish", async (req, res) => {
  try {
    const { guildId, id } = req.params;

    const Giveaway = require("./models/Giveaway");

    const giveaway = await Giveaway.findOne({ guildId, id });

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    if (!giveaway.channelId) {
      return res.status(400).json({ error: "Giveaway channel is required" });
    }

    // 🚀 NEW LOGIC
    if (giveaway.messageId && !giveaway.ended) {
      return res.status(400).json({
        error: "Already published. Use update instead.",
      });
    }

    const payload = buildGiveawayDiscordPayload(giveaway);

   const channel = await getGiveawayPublishChannel(guildId, giveaway.channelId);
const sentMessage = await channel.send(payload);

giveaway.messageId = sentMessage.id;
    giveaway.ended = false;
    giveaway.endedAt = null;

    await giveaway.save();

    res.json({
      success: true,
      giveaway,
    });
  } catch (error) {
    console.error(
      "Giveaway PUBLISH error:",
      error.response?.data || error.message || error
    );

    res.status(500).json({
      error:
        error.response?.data?.message ||
        "Failed to publish giveaway",
    });
  }
});

app.post("/api/guilds/:guildId/giveaways/:id/update-message", async (req, res) => {
  try {
    const { guildId, id } = req.params;

    const Giveaway = require("./models/Giveaway");

    const giveaway = await Giveaway.findOne({ guildId, id });

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    if (!giveaway.channelId || !giveaway.messageId) {
      return res.status(400).json({
        error: "This giveaway has not been published yet.",
      });
    }

    if (giveaway.ended) {
      return res.status(400).json({
        error: "Ended giveaways cannot be updated. Republish instead.",
      });
    }

    const payload = buildGiveawayDiscordPayload(giveaway);

  const channel = await getGiveawayPublishChannel(guildId, giveaway.channelId);
const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);

if (!message) {
  return res.status(404).json({
    error: "Giveaway message not found or not accessible by the publishing bot.",
  });
}

await message.edit(payload);

    res.json({
      success: true,
      giveaway,
    });
  } catch (error) {
    console.error(
      "Giveaway UPDATE MESSAGE error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({
      error: error.response?.data?.message || "Failed to update giveaway message",
    });
  }
});

app.post("/api/guilds/:guildId/giveaways/:id/republish", async (req, res) => {
  try {
    const { guildId, id } = req.params;

    const Giveaway = require("./models/Giveaway");

    const giveaway = await Giveaway.findOne({ guildId, id });

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    if (!giveaway.channelId) {
      return res.status(400).json({ error: "Giveaway channel is required" });
    }

    giveaway.ended = false;
    giveaway.endedAt = null;
    giveaway.entries = [];
    giveaway.winners = [];
    giveaway.messageId = null;

    const durationMs = parseGiveawayDuration(giveaway.duration || "1h");
    giveaway.createdAt = Date.now();
    giveaway.endAt = giveaway.createdAt + durationMs;

    const payload = buildGiveawayDiscordPayload(giveaway);

  const channel = await getGiveawayPublishChannel(guildId, giveaway.channelId);
const sentMessage = await channel.send(payload);

giveaway.messageId = sentMessage.id;
    await giveaway.save();

    res.json({
      success: true,
      giveaway,
    });
  } catch (error) {
    console.error(
      "Giveaway REPUBLISH error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({
      error: error.response?.data?.message || "Failed to republish giveaway",
    });
  }
});

app.get("/api/guilds/:guildId/security", async (req, res) => {
  try {
    const { guildId } = req.params;

    let config = await GuildConfig.findOne({ guildId });

    if (!config) {
      config = await GuildConfig.create({ guildId });
    }

    const premiumStatus = await getPremiumStatus(guildId);

    const antiRaid = config.security?.antiRaid || {
      enabled: false,
      joinThreshold: 5,
      joinWindow: 10,
      action: "alert",
      cooldownSeconds: 30,
      alertChannelId: "",
      pingRoleIds: [],
      quarantineRoleId: "",
    };

    const suspiciousAccount = config.security?.suspiciousAccount || {
      enabled: false,
      accountAgeDays: 7,
      checkDefaultAvatar: false,
      action: "alert",
      alertChannelId: "",
      pingRoleIds: [],
      quarantineRoleId: "",
    };

    const antiNuke = config.security?.antiNuke || {
      enabled: false,
      punishment: "quarantine",
      timeframe: 10000,
      logChannel: "",
      quarantineRole: "",
      whitelistUserIds: [],
      whitelistRoleIds: [],

      antiChannelDelete: { enabled: false, limit: 3 },
      antiChannelCreate: { enabled: false, limit: 3 },
      antiRoleDelete: { enabled: false, limit: 3 },
      antiRoleCreate: { enabled: false, limit: 3 },
      antiRoleUpdate: { enabled: false, limit: 3 },
      antiBan: { enabled: false, limit: 2 },
      antiKick: { enabled: false, limit: 3 },
    };

    return res.json({
      success: true,
      security: {
        antiRaid,
        suspiciousAccount,
        antiNuke,
      },
      premiumStatus,
    });
  } catch (error) {
    console.error("Security GET error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load security settings",
    });
  }
});

app.post("/api/guilds/:guildId/security", async (req, res) => {
  try {
    const { guildId } = req.params;
    const body = req.body || {};
    const antiRaid = body.antiRaid || {};
    const suspiciousAccount = body.suspiciousAccount || {};
    const antiNuke = body.antiNuke || {};

    const normalizedAntiRaid = {
      enabled: !!antiRaid.enabled,
      joinThreshold: Math.max(2, Number(antiRaid.joinThreshold ?? 5)),
      joinWindow: Math.max(2, Number(antiRaid.joinWindow ?? 10)),
      action: ["alert", "kick", "ban", "quarantine"].includes(antiRaid.action)
        ? antiRaid.action
        : "alert",
      cooldownSeconds: Math.max(5, Number(antiRaid.cooldownSeconds ?? 30)),
      alertChannelId:
        typeof antiRaid.alertChannelId === "string"
          ? antiRaid.alertChannelId
          : "",
      pingRoleIds: Array.isArray(antiRaid.pingRoleIds)
        ? antiRaid.pingRoleIds.filter((id) => typeof id === "string")
        : [],
      quarantineRoleId:
        typeof antiRaid.quarantineRoleId === "string"
          ? antiRaid.quarantineRoleId
          : "",
    };

    const normalizedSuspiciousAccount = {
  enabled: !!suspiciousAccount.enabled,
  accountAgeDays: Math.max(1, Number(suspiciousAccount.accountAgeDays ?? 7)),
  checkDefaultAvatar: !!suspiciousAccount.checkDefaultAvatar,
  action: ["alert", "kick", "ban", "quarantine"].includes(
    suspiciousAccount.action
  )
    ? suspiciousAccount.action
    : "alert",
  alertChannelId:
    typeof suspiciousAccount.alertChannelId === "string"
      ? suspiciousAccount.alertChannelId
      : "",
  pingRoleIds: Array.isArray(suspiciousAccount.pingRoleIds)
    ? suspiciousAccount.pingRoleIds.filter((id) => typeof id === "string")
    : [],
  quarantineRoleId:
    typeof suspiciousAccount.quarantineRoleId === "string"
      ? suspiciousAccount.quarantineRoleId
      : "",
};

const normalizedAntiNuke = normalizeAntiNukePayload(antiNuke);

const premiumStatus = await getPremiumStatus(guildId);

const existingConfig = await GuildConfig.findOne({ guildId }).lean();
const existingSecurity = existingConfig?.security || {};

const existingAntiRaidEnabled = !!existingSecurity?.antiRaid?.enabled;
const existingSuspiciousEnabled = !!existingSecurity?.suspiciousAccount?.enabled;
const existingAntiNuke = existingSecurity?.antiNuke || {};

const existingAnyAntiNukeEnabled =
  !!existingAntiNuke.enabled ||
  !!existingAntiNuke.antiChannelDelete?.enabled ||
  !!existingAntiNuke.antiChannelCreate?.enabled ||
  !!existingAntiNuke.antiRoleDelete?.enabled ||
  !!existingAntiNuke.antiRoleCreate?.enabled ||
  !!existingAntiNuke.antiRoleUpdate?.enabled ||
  !!existingAntiNuke.antiBan?.enabled ||
  !!existingAntiNuke.antiKick?.enabled;

const incomingAnyAntiNukeEnabled =
  !!normalizedAntiNuke.enabled ||
  !!normalizedAntiNuke.antiChannelDelete?.enabled ||
  !!normalizedAntiNuke.antiChannelCreate?.enabled ||
  !!normalizedAntiNuke.antiRoleDelete?.enabled ||
  !!normalizedAntiNuke.antiRoleCreate?.enabled ||
  !!normalizedAntiNuke.antiRoleUpdate?.enabled ||
  !!normalizedAntiNuke.antiBan?.enabled ||
  !!normalizedAntiNuke.antiKick?.enabled;

const isSavingPremiumSecurityEnabled =
  normalizedAntiRaid.enabled ||
  normalizedSuspiciousAccount.enabled ||
  incomingAnyAntiNukeEnabled;

if (isSavingPremiumSecurityEnabled && !premiumStatus.hasPremium) {
  return res.status(403).json({
    success: false,
    code: "SECURITY_PREMIUM_REQUIRED",
    hasPremium: false,
    error:
      "Anti Raid, Anti Nuke, and Suspicious Account protection require Kyro Premium.",
  });
}


    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
$set: {
  "security.antiRaid": normalizedAntiRaid,
  "security.suspiciousAccount": normalizedSuspiciousAccount,
  "security.antiNuke": normalizedAntiNuke,
},
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

   res.json({
  success: true,
  message: "Security config saved successfully",
security: {
  antiRaid: config.security?.antiRaid || normalizedAntiRaid,
  suspiciousAccount:
    config.security?.suspiciousAccount || normalizedSuspiciousAccount,
  antiNuke:
    config.security?.antiNuke || normalizedAntiNuke,
},
});
  } catch (error) {
    console.error("Security POST error:", error);
    res.status(500).json({ error: "Failed to save security config" });
  }
});

app.get("/api/guilds/:guildId/social-alerts", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await GuildConfig.findOne({ guildId }).lean();
    const premiumStatus = await getPremiumStatus(guildId);

    const socialAlerts = normalizeSocialAlertsPayload(
      config?.socialAlerts || {}
    );

    socialAlerts.isPremium = Boolean(premiumStatus.hasPremium);
    socialAlerts.plan = premiumStatus.plan || "free";

    return res.json({
      success: true,
      socialAlerts,
      premiumStatus,
    });
  } catch (error) {
    console.error("Social Alerts GET error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load social alerts settings",
    });
  }
});

app.post("/api/guilds/:guildId/social-alerts", async (req, res) => {
  try {
    const { guildId } = req.params;

    const socialAlerts = normalizeSocialAlertsPayload(req.body || {});

    const premiumStatus = await getPremiumStatus(guildId);

    socialAlerts.isPremium = Boolean(premiumStatus.hasPremium);
socialAlerts.plan = premiumStatus.plan || "free";

const alerts = Array.isArray(socialAlerts.alerts)
  ? socialAlerts.alerts
  : [];

const platformCounts = {};

for (const alert of alerts) {
  const platform = String(alert.platform || "")
    .toLowerCase()
    .trim();

  if (!platform) continue;

  platformCounts[platform] =
    (platformCounts[platform] || 0) + 1;
}

for (const [platform, count] of Object.entries(platformCounts)) {
  const limit = getSocialPlatformLimit(
    premiumStatus,
    platform
  );

  if (limit !== Infinity && count > limit) {
    return res.status(403).json({
      success: false,
      code: "SOCIAL_ALERT_LIMIT_REACHED",
      platform,
      limit,
      hasPremium: premiumStatus.hasPremium,
      error: `Free plan supports up to ${limit} ${platform} alert(s).`,
    });
  }
}

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          socialAlerts,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
    socialAlerts: {
  ...normalizeSocialAlertsPayload(updated?.socialAlerts || {}),
  isPremium: Boolean(premiumStatus.hasPremium),
  plan: premiumStatus.plan || "free",
},
    });
  } catch (error) {
    console.error("Social Alerts POST error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to save social alerts settings",
    });
  }
});

app.post("/api/guilds/:guildId/social-alerts/test", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { platform, channelId, alert } = req.body || {};

    if (!guildId) {
      return res.status(400).json({
        success: false,
        error: "Missing guildId",
      });
    }

    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: "Please select an alert channel first.",
      });
    }

    const guild = await getGuildFromAnyBot(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: "Guild not found.",
      });
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        success: false,
        error: "Alert channel not found or is not a text channel.",
      });
    }

    const normalizedAlert = normalizeSocialAlertsPayload({
      alerts: [alert || {}],
    }).alerts[0];

    const pingRoleIds = Array.isArray(normalizedAlert?.pingRoleIds)
      ? normalizedAlert.pingRoleIds.filter(Boolean)
      : [];

    const legacyPingRoleId =
      typeof normalizedAlert?.pingRoleId === "string" &&
      normalizedAlert.pingRoleId.trim()
        ? normalizedAlert.pingRoleId.trim()
        : "";

    const allPingRoleIds = [
      ...new Set([...pingRoleIds, legacyPingRoleId].filter(Boolean)),
    ];

    const roleMentions =
      allPingRoleIds.length > 0
        ? allPingRoleIds.map((roleId) => `<@&${roleId}>`).join(" ")
        : "";

    const creatorName =
      normalizedAlert?.creatorName?.trim() || "Test Creator";

    const selectedPlatform = String(
      platform || normalizedAlert?.platform || "youtube"
    )
      .toLowerCase()
      .trim();

    const platformLabel =
      selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);

    const testUrlByPlatform = {
      youtube: normalizedAlert?.creatorUrl?.trim() || "https://youtube.com/",
      kick: normalizedAlert?.creatorUrl?.trim() || "https://kick.com/",
      twitch: normalizedAlert?.creatorUrl?.trim() || "https://twitch.tv/",
      tiktok: normalizedAlert?.creatorUrl?.trim() || "https://tiktok.com/",
    };

    const testTitlesByPlatform = {
      youtube: "📺 New YouTube Alert",
      kick: "🟢 Kick Live Alert",
      twitch: "🟣 Twitch Live Alert",
      tiktok: "🎵 New TikTok Alert",
    };

    const defaultDescriptions = {
      youtube: "{creator} just posted a new YouTube alert.",
      kick: "{creator} is now live on Kick.",
      twitch: "{creator} is now live on Twitch.",
      tiktok: "{creator} posted new TikTok content.",
    };

    const testUrl = testUrlByPlatform[selectedPlatform] || "https://example.com/";

    const rawEmbedTitle =
      normalizedAlert?.embedTitle?.trim() ||
      testTitlesByPlatform[selectedPlatform] ||
      "📢 Social Alert Test";

    const rawEmbedDescription =
      normalizedAlert?.embedDescription?.trim() ||
      defaultDescriptions[selectedPlatform] ||
      "{creator} has a new social alert.";

    const replaceVars = (text = "") =>
      String(text || "")
        .replace(/\{creator\}/gi, creatorName)
        .replace(/\{platform\}/gi, platformLabel)
        .replace(/\{role\}/gi, roleMentions)
        .replace(/\{url\}/gi, testUrl)
        .trim();

    let content =
      typeof normalizedAlert?.messageContent === "string"
        ? normalizedAlert.messageContent
        : "";

    content = replaceVars(content);

    const embedTitle = replaceVars(rawEmbedTitle);
    const embedDescription = replaceVars(rawEmbedDescription);

    const embedColorMap = {
      youtube: 0xff0000,
      kick: 0x53fc18,
      twitch: 0x9146ff,
      tiktok: 0x010101,
    };

    const embed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setDescription(embedDescription)
      .setColor(embedColorMap[selectedPlatform] || 0x5865f2)
      .addFields(
        {
          name: "Creator",
          value: creatorName,
          inline: true,
        },
        {
          name: "Platform",
          value: platformLabel,
          inline: true,
        },
        {
          name: "Preview Link",
          value: testUrl,
          inline: false,
        }
      )
      .setTimestamp();

    if (
      typeof normalizedAlert?.profileImageUrl === "string" &&
      normalizedAlert.profileImageUrl.trim()
    ) {
      embed.setThumbnail(normalizedAlert.profileImageUrl.trim());
    }

    const buttonLabelMap = {
      youtube: "Watch on YouTube",
      kick: "Watch on Kick",
      twitch: "Watch on Twitch",
      tiktok: "Open TikTok",
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(buttonLabelMap[selectedPlatform] || "Open Link")
        .setStyle(ButtonStyle.Link)
        .setURL(testUrl)
    );

    await channel.send({
      content: content || roleMentions || "🧪 Test social alert",
      embeds: [embed],
      components: [row],
    });

    return res.json({
      success: true,
      message: "Test alert sent successfully.",
    });
  } catch (error) {
    console.error("Social Alerts TEST error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send test alert.",
    });
  }
});
app.post("/api/guilds/:guildId/social-alerts/resolve-creator", async (req, res) => {
  try {
    const { url, platform } = req.body || {};

    if (!url || !String(url).trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing creator URL",
      });
    }

    const normalizedPlatform = String(platform || "").toLowerCase().trim();
    const cleanUrl = String(url).trim();

    if (!normalizedPlatform) {
      return res.status(400).json({
        success: false,
        error: "Missing platform",
      });
    }

    // YOUTUBE
if (normalizedPlatform === "youtube") {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Missing YouTube API key",
    });
  }

  let creatorName = "";
  let creatorId = "";
  let profileImageUrl = "";

  const channelIdMatch =
    cleanUrl.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i) ||
    cleanUrl.match(/^(UC[a-zA-Z0-9_-]+)$/i);

  if (channelIdMatch) {
    creatorId = channelIdMatch[1];

    const channelRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        params: {
          part: "snippet",
          id: creatorId,
          key: YOUTUBE_API_KEY,
        },
      }
    );

    const item = channelRes.data?.items?.[0];

    if (!item) {
      return res.json({
        success: false,
        error: "YouTube channel not found",
      });
    }

    creatorName = item.snippet?.title || "";
    profileImageUrl =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.default?.url ||
      "";
  } else {
    const handleMatch = cleanUrl.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/i);

    let query = "";
    if (handleMatch?.[1]) {
      query = handleMatch[1];
    } else {
      query = cleanUrl.replace(/^@/, "").trim();
    }

    const searchRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: query,
          type: "channel",
          maxResults: 5,
          key: YOUTUBE_API_KEY,
        },
      }
    );

    const item =
      searchRes.data?.items?.find((entry) => {
        const title = String(entry?.snippet?.title || "").toLowerCase();
        return title.includes(String(query).toLowerCase());
      }) || searchRes.data?.items?.[0];

    if (!item) {
      return res.json({
        success: false,
        error: "YouTube channel not found",
      });
    }

    creatorName = item.snippet?.title || "";
    creatorId = item.snippet?.channelId || "";
    profileImageUrl =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.default?.url ||
      "";
  }


  return res.json({
    success: true,
    creatorName,
    creatorId,
    profileImageUrl,
  });
}

    // TWITCH
    if (normalizedPlatform === "twitch") {
      const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
      const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

      if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        return res.status(500).json({
          success: false,
          error: "Missing Twitch API credentials",
        });
      }

      const loginMatch = cleanUrl.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
      const login = (
        loginMatch?.[1] ||
        cleanUrl.replace(/^@/, "").trim()
      ).toLowerCase();

      if (!login) {
        return res.status(400).json({
          success: false,
          error: "Invalid Twitch URL or username",
        });
      }
      const tokenRes = await axios.post(
        "https://id.twitch.tv/oauth2/token",
        null,
        {
          params: {
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            grant_type: "client_credentials",
          },
        }
      );

      const accessToken = tokenRes.data?.access_token;

      if (!accessToken) {
        return res.status(500).json({
          success: false,
          error: "Failed to get Twitch access token",
        });
      }

      const userRes = await axios.get("https://api.twitch.tv/helix/users", {
        params: { login },
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
      });


      const user = userRes.data?.data?.[0];

      if (!user) {
        return res.json({
          success: false,
          error: "Twitch creator not found",
        });
      }

      return res.json({
        success: true,
        creatorName: user.display_name || user.login || "",
        creatorId: user.id || "",
        profileImageUrl: user.profile_image_url || "",
      });
    }

    // KICK
    if (normalizedPlatform === "kick") {
      const usernameMatch = cleanUrl.match(/kick\.com\/([^/?#]+)/i);
      const username = (
        usernameMatch?.[1] ||
        cleanUrl.replace(/^@/, "").trim()
      ).toLowerCase();

      if (!username) {
        return res.status(400).json({
          success: false,
          error: "Invalid Kick URL or username",
        });
      }


      const kickRes = await axios.get(
        `https://kick.com/api/v2/channels/${username}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 KyroBot/1.0",
          },
          timeout: 15000,
        }
      );


      const data = kickRes.data || null;

      if (!data) {
        return res.json({
          success: false,
          error: "Kick creator not found",
        });
      }

      const creatorName =
        data.user?.username ||
        data.user?.display_name ||
        data.slug ||
        data.name ||
        username;

      const creatorId = String(
        data.id || data.user_id || data.user?.id || username
      );

      const profileImageUrl =
        data.user?.profile_pic ||
        data.user?.profile_picture ||
        data.user?.avatar ||
        data.square_cover_url ||
        "";

      return res.json({
        success: true,
        creatorName,
        creatorId,
        profileImageUrl,
      });
    }

  // TIKTOK
if (normalizedPlatform === "tiktok") {
  const usernameMatch =
    cleanUrl.match(/tiktok\.com\/@([^/?#]+)/i) ||
    cleanUrl.match(/^@?([a-zA-Z0-9._]+)$/i);

  const username = (
    usernameMatch?.[1] ||
    cleanUrl.replace(/^@/, "").trim()
  )
    .replace(/^@/, "")
    .replace(/\?+$/, "")
    .trim();
  if (!username) {
    return res.status(400).json({
      success: false,
      error: "Invalid TikTok URL or username",
    });
  }

  const providerBase = process.env.TIKTOK_PROVIDER_URL;
  const apifyToken = process.env.APIFY_TOKEN;
  if (!providerBase || !apifyToken) {
    return res.json({
      success: true,
      creatorName: username,
      creatorId: username,
      profileImageUrl: "",
    });
  }

  try {
    const providerRes = await axios.post(
      providerBase,
      {
        profiles: [username],
        resultsLimit: 5,
      },
      {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          "Content-Type": "application/json",
          "User-Agent": "KyroBot TikTok Resolve/1.0",
          Accept: "application/json",
        },
      }
    );

    const providerData = providerRes.data;
    const items = Array.isArray(providerData) ? providerData : [providerData];

    const first =
  items.find((item) => item?.authorMeta?.avatar || item?.authorMeta?.avatarUrl) ||
  items[0] ||
  {};
    const creatorName =
      first?.authorMeta?.nickName ||
      first?.authorMeta?.nickname ||
      first?.authorMeta?.name ||
      username;

    const creatorId =
      first?.authorMeta?.name ||
      first?.authorMeta?.id ||
      username;

    const profileImageUrl =
      first?.authorMeta?.avatar ||
      first?.authorMeta?.avatarUrl ||
      first?.authorMeta?.originalAvatarUrl ||
      "";

    return res.json({
      success: true,
      creatorName,
      creatorId: String(creatorId || username),
      profileImageUrl,
    });
  } catch (providerError) {
  console.error("[TikTok Resolve Provider Error]", {
  message: providerError?.message,
  status: providerError?.response?.status || null,
  data: providerError?.response?.data || null,
});

    return res.json({
      success: true,
      creatorName: username,
      creatorId: username,
      profileImageUrl: "",
    });
  }
}

    return res.json({
      success: false,
      error: "Platform not supported yet",
    });
  } catch (err) {
    console.error(
      "Resolve creator error:",
      err.response?.data || err.message || err
    );

    return res.status(500).json({
      success: false,
      error: "Failed to resolve creator",
    });
  }
});

/* ───────────────────── RSS API ───────────────────── */

app.get("/api/guilds/:guildId/rss", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await GuildConfig.findOne({ guildId }).lean();
    const premiumStatus = await getPremiumStatus(guildId);
    const rss = normalizeRssPayload(config?.rss || {});

    rss.isPremium = Boolean(premiumStatus.hasPremium);
    rss.plan = premiumStatus.plan || "free";

    return res.json({
      success: true,
      rss,
      premiumStatus,
    });
  } catch (error) {
    console.error("RSS GET error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load RSS settings",
    });
  }
});

app.post("/api/guilds/:guildId/rss", async (req, res) => {
  try {
    const { guildId } = req.params;

    const rss = normalizeRssPayload(req.body || {});
  const premiumStatus = await getPremiumStatus(guildId);
  rss.isPremium = Boolean(premiumStatus.hasPremium);
rss.plan = premiumStatus.plan || "free";
const rssLimit = getFeatureLimit(premiumStatus, "rssFeeds");
const feedCount = Array.isArray(rss.feeds) ? rss.feeds.length : 0;

if (rssLimit !== Infinity && feedCount > rssLimit) {
  return res.status(403).json({
    success: false,
    code: "RSS_FREE_LIMIT_REACHED",
    error: `Free plan supports up to ${rssLimit} RSS feeds per server.`,
    limit: rssLimit,
    hasPremium: premiumStatus.hasPremium,
  });
}

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          rss,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
      rss: {
  ...normalizeRssPayload(updated?.rss || {}),
  isPremium: Boolean(premiumStatus.hasPremium),
  plan: premiumStatus.plan || "free",
},
    });
  } catch (error) {
    console.error("RSS POST error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to save RSS settings",
    });
  }
});

app.post("/api/guilds/:guildId/rss/discover", async (req, res) => {
  try {
    const { websiteUrl } = req.body || {};

    if (!websiteUrl || !String(websiteUrl).trim()) {
      return res.status(400).json({
        success: false,
        error: "Website URL is required",
      });
    }

    const result = await discoverFeedFromWebsiteUrl(websiteUrl);

    if (!result.success) {
      return res.json({
        success: false,
        reason: result.reason || "No feed found",
        websiteUrl: result.websiteUrl,
        feedUrl: null,
        feedTitle: "",
        allFeedUrls: result.allFeedUrls || [],
        suggestedFeedUrls: result.suggestedFeedUrls || [],
      });
    }

    return res.json({
      success: true,
      websiteUrl: result.websiteUrl,
      feedUrl: result.feedUrl,
      feedTitle: result.feedTitle || "",
      allFeedUrls: result.allFeedUrls || [],
      suggestedFeedUrls: result.suggestedFeedUrls || [],
    });
  } catch (error) {
    console.error("RSS discover error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to discover RSS feed",
    });
  }
});

app.post("/api/guilds/:guildId/rss/test", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, roleId, feedUrl, title } = req.body || {};

    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: "Please select an alert channel first",
      });
    }

    if (!feedUrl || !String(feedUrl).trim()) {
      return res.status(400).json({
        success: false,
        error: "Feed URL is required",
      });
    }

    const guild = await getGuildFromAnyBot(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: "Guild not found",
      });
    }

    const channel = await getChannelFromAnyBot(guildId, channelId);
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({
        success: false,
        error: "Selected channel is invalid or inaccessible",
      });
    }

    const parsedFeed = await parseFeedForTest(feedUrl);
    const latestItem =
      Array.isArray(parsedFeed?.items) && parsedFeed.items.length
        ? parsedFeed.items[0]
        : null;

    if (!latestItem) {
      return res.status(400).json({
        success: false,
        error: "Feed was parsed but no items were found",
      });
    }

    const descriptionSource =
      latestItem.contentSnippet ||
      latestItem.content ||
      latestItem.summary ||
      latestItem.description ||
      "";

    const plainDescription = String(descriptionSource)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(String(latestItem.title || parsedFeed.title || title || "RSS Test Post").slice(0, 256))
      .setURL(latestItem.link || feedUrl)
      .setDescription(plainDescription || "Test RSS alert from Kyro.")
      .setFooter({
        text: `Kyro RSS Test • ${String(title || parsedFeed.title || "Feed").slice(0, 120)}`,
      })
      .setTimestamp(
        latestItem.isoDate || latestItem.pubDate
          ? new Date(latestItem.isoDate || latestItem.pubDate)
          : new Date()
      );

    const imageUrl =
      latestItem.enclosure?.url ||
      latestItem.image?.url ||
      latestItem.thumbnail ||
      null;

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    const payload = {
      content: roleId ? `<@&${roleId}>` : "🧪 Test RSS alert from Kyro",
      embeds: [embed],
    };

    if (roleId) {
      payload.allowedMentions = {
        roles: [roleId],
      };
    }

    await channel.send(payload);

    return res.json({
      success: true,
      message: "Test RSS alert sent successfully",
    });
  } catch (error) {
    console.error("RSS test error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send test RSS alert",
      details: error.message,
    });
  }
});
app.get("/api/guilds/:guildId/invite-tracker", async (req, res) => {
  try {
    const { guildId } = req.params;

    const config = await GuildConfig.findOne({ guildId }).lean();

    return res.json({
      success: true,
      inviteTracker: normalizeInviteTrackerPayload(
        config?.inviteTracker || {}
      ),
    });
  } catch (error) {
    console.error("Invite Tracker GET error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load invite tracker settings",
    });
  }
});
app.post("/api/guilds/:guildId/invite-tracker", async (req, res) => {
  try {
    const { guildId } = req.params;

    const inviteTracker = normalizeInviteTrackerPayload(req.body || {});

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          inviteTracker,
        },
      },
      {
       returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
      inviteTracker: normalizeInviteTrackerPayload(
        updated?.inviteTracker || {}
      ),
    });
  } catch (error) {
    console.error("Invite Tracker POST error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to save invite tracker settings",
    });
  }
});
/* ───────────── TEMP VOICE ROUTES ───────────── */

// GET TEMP VOICE CONFIG
app.get("/api/guilds/:guildId/temporary-voice", async (req, res) => {
  try {
    const { guildId } = req.params;

    let config = await GuildConfig.findOne({ guildId }).lean();

    if (!config) {
      config = await GuildConfig.create({ guildId });
      config = config.toObject();
    }

    const premiumStatus = await getPremiumStatus(guildId);

    const temporaryVoice = normalizeTemporaryVoicePayload(
      config.temporaryVoice || {}
    );

    temporaryVoice.isPremium = Boolean(premiumStatus.hasPremium);
    temporaryVoice.plan = premiumStatus.plan || "free";

    return res.json({
      success: true,
      temporaryVoice,
      premiumStatus,
    });
  } catch (error) {
    console.error("Temporary Voice GET error:", error);
    return res.status(500).json({
      error: "Failed to load temporary voice settings",
    });
  }
});

// SAVE TEMP VOICE CONFIG
app.post("/api/guilds/:guildId/temporary-voice", async (req, res) => {
  try {
    const { guildId } = req.params;

    const normalized = normalizeTemporaryVoicePayload(req.body || {});

    const premiumStatus = await getPremiumStatus(guildId);

const entryCount = Array.isArray(normalized.entries)
  ? normalized.entries.length
  : 0;

const tempVoiceLimit = getFeatureLimit(
  premiumStatus,
  "tempVoice"
);

if (
  tempVoiceLimit !== Infinity &&
  entryCount > tempVoiceLimit
) {
  return res.status(403).json({
    success: false,
    code: "TEMP_VOICE_LIMIT_REACHED",
    limit: tempVoiceLimit,
    hasPremium: premiumStatus.hasPremium,
    error: `Free plan supports up to ${tempVoiceLimit} temporary voice setup(s).`,
  });
}

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          temporaryVoice: normalized,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      temporaryVoice: normalizeTemporaryVoicePayload(
        updated.temporaryVoice || {}
      ),
    });
  } catch (error) {
    console.error("Temp Voice POST error:", error);
    res.status(500).json({ error: "Failed to save Temporary Voice config" });
  }
});

// PUBLISH PANEL (MULTI ENTRY)
app.post(
  "/api/guilds/:guildId/temporary-voice/publish",
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { entryId } = req.body || {};

      const config = await GuildConfig.findOne({ guildId });

      if (!config || !config.temporaryVoice) {
        return res.status(404).json({
          error: "Temporary Voice not configured",
        });
      }

      const tv = normalizeTemporaryVoicePayload(config.temporaryVoice);

      const entry = tv.entries.find((e) => e.id === entryId);

      if (!entry) {
        return res.status(404).json({
          error: "Entry not found",
        });
      }

      if (!entry.interfaceChannelId) {
        return res.status(400).json({
          error: "No interface channel selected",
        });
      }

      const guild = botClient.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const channel = guild.channels.cache.get(entry.interfaceChannelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({
          error: "Invalid interface channel",
        });
      }

      const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } =
        require("discord.js");

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎧 Temporary Voice Control Panel")
        .setDescription(
          "Manage your temporary voice room using the options below."
        );

      const settingsMenu = new StringSelectMenuBuilder()
        .setCustomId("tempvoice_settings_menu")
        .setPlaceholder("Voice Settings")
        .addOptions([
          { label: "Rename", value: "rename" },
          { label: "Set Limit", value: "limit" },
          { label: "Set Status", value: "status" },
          { label: "Set Game", value: "game" },
          { label: "LFM", value: "lfm" },
        ]);

      const permissionsMenu = new StringSelectMenuBuilder()
        .setCustomId("tempvoice_permissions_menu")
        .setPlaceholder("Permissions")
        .addOptions([
          { label: "Lock", value: "lock" },
          { label: "Unlock", value: "unlock" },
          { label: "Hide", value: "hide" },
          { label: "Unhide", value: "unhide" },
          { label: "Claim Ownership", value: "claim" },
        ]);

      const message = await channel.send({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(settingsMenu),
          new ActionRowBuilder().addComponents(permissionsMenu),
        ],
      });

      // save messageId into correct entry
      const updatedEntries = tv.entries.map((e) =>
        e.id === entryId ? { ...e, panelMessageId: message.id } : e
      );

      await GuildConfig.updateOne(
        { guildId },
        {
          $set: {
            "temporaryVoice.entries": updatedEntries,
          },
        }
      );

      res.json({
        success: true,
        temporaryVoice: {
          ...tv,
          entries: updatedEntries,
        },
      });
    } catch (error) {
      console.error("Temp Voice publish error:", error);
      res.status(500).json({ error: "Failed to publish panel" });
    }
  }
);

/* ───────────────────── GIVEAWAY SCHEDULER ───────────────────── */

const Giveaway = require("./models/Giveaway");

let dashboardGiveawayInterval = null;

function startDashboardGiveawayScheduler() {
  if (dashboardGiveawayInterval) return;

  dashboardGiveawayInterval = setInterval(async () => {
    try {
      const activeGiveaways = await Giveaway.find({
        ended: false,
      });

      const now = Date.now();

      for (const giveaway of activeGiveaways) {
        if (now < giveaway.endAt) continue;

        try {
          const customClient = getCustomBotClient(giveaway.guildId);
          const client = customClient || botClient;

          if (!client) continue;

          const guild = await client.guilds
            .fetch(giveaway.guildId)
            .catch(() => null);

          if (!guild) {
            continue;
          }

         

          await axios.post(
            `${KYRO_BOT_API_BASE_URL}/api/guilds/${giveaway.guildId}/giveaways/${giveaway.id}/end`
          );
        } catch (err) {
          console.error(
            `[Dashboard Giveaways] Failed ending giveaway ${giveaway.id}:`,
            err.message
          );
        }
      }
    } catch (err) {
      console.error("[Dashboard Giveaways] Scheduler error:", err.message);
    }
  }, 15000);
}

/* ───────────────────── START SERVER ───────────────────── */

connectDatabase().then(async () => {
  app.listen(PORT, () => {
    console.log(`Dashboard API running on port ${PORT}`);
  });

  // 🔥 AUTO START ALL CUSTOM BOTS
  try {
    const bots = await CustomBot.find({ enabled: true });

    for (const bot of bots) {
      try {
        await restartCustomBot(bot);
      } catch (err) {
        console.error(`Failed to auto-start bot for ${bot.guildId}`, err.message);
      }
    }


    startDashboardGiveawayScheduler();
  } catch (err) {
    console.error("Auto-start error:", err.message);
  }
});