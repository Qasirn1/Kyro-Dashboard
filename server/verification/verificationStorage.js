const GuildConfig = require("../models/GuildConfig");

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultPanel() {
  return {
    id: makeId("verif"),
    name: "Verification Panel 1",
    enabled: true,

    mode: "button", // button | captcha | reaction

    channelId: null,
    roleId: null,
    logChannelId: null,

    autoKick: {
      enabled: false,
      minutes: 10,
    },

    embed: {
      id: makeId("vembed"),
      enabled: true,
      collapsed: false,
      title: "Verification Required",
      description: "Click the button below to verify and access the server.",
      color: "#5865F2",
      authorName: "",
      authorIcon: "",
      thumbnail: "",
      image: "",
      header: "",
      footer: "",
      footerIcon: "",
      fields: [],
    },

    embeds: [
      {
        id: makeId("vembed"),
        enabled: true,
        collapsed: false,
        title: "Verification Required",
        description: "Click the button below to verify and access the server.",
        color: "#5865F2",
        authorName: "",
        authorIcon: "",
        thumbnail: "",
        image: "",
        header: "",
        footer: "",
        footerIcon: "",
        fields: [],
      },
    ],

    interaction: {
      button: {
        label: "Verify",
        style: "Success",
        emoji: "✅",
      },
      reaction: {
        emoji: "✅",
      },
      captcha: {
        attempts: 3,
        timeout: 60,
      },
    },

    sentPanel: {
      messageId: null,
      channelId: null,
      publishedAt: null,
    },

    settings: {
      allowReverify: false,
      sendWelcomeAfterVerify: false,
      minAccountAgeDays: 0,
      autoKickUnverified: false,
      autoKickMinutes: 0,
      maxAttempts: 3,
    },
  };
}

function createDefaultGuildVerification() {
  return {
    enabled: false,

    premiumTrial: {
      activatedAt: null,
      expiresAt: null,
      isActive: false,
    },

    // legacy support
    channelId: null,
    messageId: null,
    verifiedRoleId: null,
    logChannelId: null,
    mode: "button",
    panelMode: "builder",

    panel: {
      title: "Verification Required",
      description: "Click the button below to verify and access the server.",
      color: "#5865F2",
      image: "",
      thumbnail: "",
      footer: "Powered by Kyro",
    },

    jsonPanel: {
      enabled: false,
      raw: "",
    },

    button: {
      label: "Verify",
      emoji: "✅",
      style: "Secondary",
      customId: "kyro_verify",
    },

    settings: {
      allowReverify: false,
      sendWelcomeAfterVerify: false,
      minAccountAgeDays: 0,
      autoKickUnverified: false,
      autoKickMinutes: 0,
      maxAttempts: 3,
    },

    // dashboard-ready source of truth
    panels: [createDefaultPanel()],
  };
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
        ? "Verification Required"
        : `Verification Embed ${index + 1}`,
    description:
      typeof embed.description === "string"
        ? embed.description
        : "Click the button below to verify and access the server.",
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

function normalizePanel(panel = {}, index = 0) {
  const defaultPanel = createDefaultPanel();

  const normalizedEmbeds =
    Array.isArray(panel.embeds) && panel.embeds.length > 0
      ? panel.embeds.map((embed, embedIndex) =>
          normalizeVerificationEmbed(embed, embedIndex)
        )
      : [normalizeVerificationEmbed(panel.embed || {}, 0)];

  return {
    ...defaultPanel,

    id: panel.id || defaultPanel.id,
    name: panel.name || `Verification Panel ${index + 1}`,
    enabled: panel.enabled ?? true,

    mode: ["button", "captcha", "reaction"].includes(panel.mode)
      ? panel.mode
      : "button",

    channelId: panel.channelId || null,
    roleId: panel.roleId || panel.verifiedRoleId || null,
    logChannelId: panel.logChannelId || null,

    autoKick: {
      enabled: panel.autoKick?.enabled ?? false,
      minutes: Math.max(1, Number(panel.autoKick?.minutes ?? 10)),
    },

    embed: { ...normalizedEmbeds[0] },
    embeds: normalizedEmbeds,

    interaction: {
      button: {
        label: panel.interaction?.button?.label || panel.button?.label || "Verify",
        style: ["Primary", "Secondary", "Success", "Danger"].includes(
          panel.interaction?.button?.style || panel.button?.style
        )
          ? panel.interaction?.button?.style || panel.button?.style
          : "Success",
        emoji: normalizeVerificationEmoji(
          panel.interaction?.button?.emoji || panel.button?.emoji || "✅"
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
          Number(
            panel.interaction?.captcha?.attempts ??
              panel.settings?.maxAttempts ??
              3
          )
        ),
        timeout: Math.max(
          10,
          Number(panel.interaction?.captcha?.timeout ?? 60)
        ),
      },
    },

    sentPanel: {
      messageId: panel.sentPanel?.messageId || panel.messageId || null,
      channelId: panel.sentPanel?.channelId || panel.channelId || null,
      publishedAt: panel.sentPanel?.publishedAt || null,
    },

    settings: {
      allowReverify: panel.settings?.allowReverify ?? false,
      sendWelcomeAfterVerify: panel.settings?.sendWelcomeAfterVerify ?? false,
      minAccountAgeDays: Math.max(
        0,
        Number(panel.settings?.minAccountAgeDays ?? 0)
      ),
      autoKickUnverified: panel.settings?.autoKickUnverified ?? false,
      autoKickMinutes: Math.max(
        0,
        Number(panel.settings?.autoKickMinutes ?? panel.autoKick?.minutes ?? 0)
      ),
      maxAttempts: Math.max(
        1,
        Number(panel.settings?.maxAttempts ?? panel.interaction?.captcha?.attempts ?? 3)
      ),
    },
  };
}

function pickActivePanel(panels = [], root = {}) {
  if (!Array.isArray(panels) || panels.length === 0) return null;

  const byPublishedChannel = panels.find(
    (panel) =>
      panel?.enabled !== false &&
      panel?.sentPanel?.messageId &&
      panel?.sentPanel?.channelId
  );
  if (byPublishedChannel) return byPublishedChannel;

  const byConfiguredChannel = panels.find(
    (panel) => panel?.enabled !== false && panel?.channelId && panel?.roleId
  );
  if (byConfiguredChannel) return byConfiguredChannel;

  const byRole = panels.find(
    (panel) => panel?.enabled !== false && panel?.roleId
  );
  if (byRole) return byRole;

  return panels.find((panel) => panel?.enabled !== false) || panels[0] || null;
}

function mergeVerificationData(existing = {}, newData = {}) {
  const defaults = createDefaultGuildVerification();
  const source = {
    ...defaults,
    ...(existing || {}),
    ...(newData || {}),
  };

  let rawPanels = [];
  if (Array.isArray(source.panels) && source.panels.length > 0) {
    rawPanels = source.panels;
  } else {
    // migrate legacy single config into one panel
    rawPanels = [
      {
        id: makeId("verif"),
        name: "Verification Panel 1",
        enabled: source.enabled ?? false,
        mode: source.mode || "button",
        channelId: source.channelId || null,
        roleId: source.roleId || source.verifiedRoleId || null,
        logChannelId: source.logChannelId || null,
        embed: {
          title: source.panel?.title || "Verification Required",
          description:
            source.panel?.description ||
            "Click the button below to verify and access the server.",
          color: source.panel?.color || "#5865F2",
          image: source.panel?.image || "",
          thumbnail: source.panel?.thumbnail || "",
          footer: source.panel?.footer || "",
          authorName: "",
          authorIcon: "",
          header: "",
          footerIcon: "",
          fields: [],
        },
        interaction: {
          button: {
            label: source.button?.label || "Verify",
            style: source.button?.style || "Secondary",
            emoji: source.button?.emoji || "✅",
          },
          reaction: {
            emoji: "✅",
          },
          captcha: {
            attempts: Number(source.settings?.maxAttempts ?? 3),
            timeout: 60,
          },
        },
        sentPanel: {
          messageId: source.messageId || null,
          channelId: source.channelId || null,
          publishedAt: null,
        },
        settings: {
          allowReverify: source.settings?.allowReverify ?? false,
          sendWelcomeAfterVerify: source.settings?.sendWelcomeAfterVerify ?? false,
          minAccountAgeDays: Number(source.settings?.minAccountAgeDays ?? 0),
          autoKickUnverified: source.settings?.autoKickUnverified ?? false,
          autoKickMinutes: Number(source.settings?.autoKickMinutes ?? 0),
          maxAttempts: Number(source.settings?.maxAttempts ?? 3),
        },
      },
    ];
  }

  const normalizedPanels = rawPanels.map((panel, index) =>
    normalizePanel(panel, index)
  );

  const activePanel = pickActivePanel(normalizedPanels, source);
  const firstPanel = activePanel || normalizedPanels[0] || createDefaultPanel();

  return {
    ...defaults,
    ...source,

    enabled:
      source.enabled ??
      normalizedPanels.some((panel) => panel?.enabled !== false) ??
      false,

    premiumTrial: {
      ...defaults.premiumTrial,
      ...(existing.premiumTrial || {}),
      ...(newData.premiumTrial || {}),
    },

    // top-level mirrors for legacy bot code
    channelId: firstPanel.channelId || source.channelId || null,
    messageId: firstPanel.sentPanel?.messageId || source.messageId || null,
    verifiedRoleId: firstPanel.roleId || source.verifiedRoleId || null,
    roleId: firstPanel.roleId || source.roleId || null,
    logChannelId: firstPanel.logChannelId || source.logChannelId || null,
    mode: firstPanel.mode || source.mode || "button",

    panelMode: source.panelMode || "builder",

    panel: {
      title:
        firstPanel.embed?.title ||
        source.panel?.title ||
        defaults.panel.title,
      description:
        firstPanel.embed?.description ||
        source.panel?.description ||
        defaults.panel.description,
      color:
        firstPanel.embed?.color ||
        source.panel?.color ||
        defaults.panel.color,
      image:
        firstPanel.embed?.image ||
        source.panel?.image ||
        defaults.panel.image,
      thumbnail:
        firstPanel.embed?.thumbnail ||
        source.panel?.thumbnail ||
        defaults.panel.thumbnail,
      footer:
        firstPanel.embed?.footer ||
        source.panel?.footer ||
        defaults.panel.footer,
    },

    jsonPanel: {
      ...defaults.jsonPanel,
      ...(existing.jsonPanel || {}),
      ...(newData.jsonPanel || {}),
    },

    button: {
      ...defaults.button,
      ...(existing.button || {}),
      ...(newData.button || {}),
      label:
        firstPanel.interaction?.button?.label ||
        newData.button?.label ||
        existing.button?.label ||
        defaults.button.label,
      emoji:
        firstPanel.interaction?.button?.emoji ||
        newData.button?.emoji ||
        existing.button?.emoji ||
        defaults.button.emoji,
      style:
        firstPanel.interaction?.button?.style ||
        newData.button?.style ||
        existing.button?.style ||
        defaults.button.style,
      customId: "kyro_verify",
    },

    settings: {
      ...defaults.settings,
      ...(existing.settings || {}),
      ...(newData.settings || {}),
      allowReverify:
        firstPanel.settings?.allowReverify ??
        newData.settings?.allowReverify ??
        existing.settings?.allowReverify ??
        defaults.settings.allowReverify,
      sendWelcomeAfterVerify:
        firstPanel.settings?.sendWelcomeAfterVerify ??
        newData.settings?.sendWelcomeAfterVerify ??
        existing.settings?.sendWelcomeAfterVerify ??
        defaults.settings.sendWelcomeAfterVerify,
      minAccountAgeDays:
        firstPanel.settings?.minAccountAgeDays ??
        newData.settings?.minAccountAgeDays ??
        existing.settings?.minAccountAgeDays ??
        defaults.settings.minAccountAgeDays,
      autoKickUnverified:
        firstPanel.settings?.autoKickUnverified ??
        newData.settings?.autoKickUnverified ??
        existing.settings?.autoKickUnverified ??
        defaults.settings.autoKickUnverified,
      autoKickMinutes:
        firstPanel.settings?.autoKickMinutes ??
        newData.settings?.autoKickMinutes ??
        existing.settings?.autoKickMinutes ??
        defaults.settings.autoKickMinutes,
      maxAttempts:
        firstPanel.settings?.maxAttempts ??
        firstPanel.interaction?.captcha?.attempts ??
        newData.settings?.maxAttempts ??
        existing.settings?.maxAttempts ??
        defaults.settings.maxAttempts,
    },

    panels: normalizedPanels,
    activePanel: firstPanel,
  };
}

async function loadVerification() {
  try {
    const docs = await GuildConfig.find({}, { guildId: 1, verification: 1 }).lean();

    const data = {};
    for (const doc of docs) {
      data[doc.guildId] = mergeVerificationData({}, doc.verification || {});
    }

    return data;
  } catch (error) {
    console.error("Verification load error:", error);
    return {};
  }
}

async function saveVerification(data) {
  try {
    if (!data || typeof data !== "object") return;

    const guildIds = Object.keys(data);

    for (const guildId of guildIds) {
      const verification = mergeVerificationData({}, data[guildId] || {});

      await GuildConfig.findOneAndUpdate(
        { guildId },
        {
          $set: {
            guildId,
            verification,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
  } catch (error) {
    console.error("Verification save error:", error);
  }
}

async function ensureGuildVerification(guildId) {
  try {
    let config = await GuildConfig.findOne({ guildId });

    if (!config) {
      config = await GuildConfig.create({
        guildId,
        verification: createDefaultGuildVerification(),
      });
    } else if (!config.verification) {
      config.verification = createDefaultGuildVerification();
      await config.save();
    } else {
      const merged = mergeVerificationData(
        {},
        config.verification.toObject ? config.verification.toObject() : config.verification
      );
      config.verification = merged;
      await config.save();
    }

    return mergeVerificationData(
      {},
      config.verification?.toObject
        ? config.verification.toObject()
        : config.verification
    );
  } catch (error) {
    console.error("ensureGuildVerification error:", error);
    return createDefaultGuildVerification();
  }
}

async function getGuildVerification(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();

    if (!config || !config.verification) {
      return null;
    }

    return mergeVerificationData({}, config.verification);
  } catch (error) {
    console.error("getGuildVerification error:", error);
    return null;
  }
}

async function setGuildVerification(guildId, newData) {
  try {
    const existingDoc = await GuildConfig.findOne({ guildId }).lean();
    const existingVerification = existingDoc?.verification || {};

    const mergedVerification = mergeVerificationData(existingVerification, newData || {});

    await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          guildId,
          verification: mergedVerification,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return mergedVerification;
  } catch (error) {
    console.error("setGuildVerification error:", error);
    return mergeVerificationData({}, newData || {});
  }
}

async function updateGuildVerification(guildId, updater) {
  try {
    const current =
      (await getGuildVerification(guildId)) || createDefaultGuildVerification();
    const updated = updater(current) || current;
    return await setGuildVerification(guildId, updated);
  } catch (error) {
    console.error("updateGuildVerification error:", error);
    return createDefaultGuildVerification();
  }
}

module.exports = {
  loadVerification,
  saveVerification,
  createDefaultGuildVerification,
  ensureGuildVerification,
  getGuildVerification,
  setGuildVerification,
  updateGuildVerification,
};