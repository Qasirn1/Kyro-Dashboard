const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const {
  canAddMoreAlerts,
  addSocialAlert,
  removeSocialAlert,
  getGuildSocialAlerts,
  getPlatformLimit
} = require("./socialAlertsManager");

const wizardSessions = new Map();

function getSessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function setWizardSession(guildId, userId, data) {
  wizardSessions.set(getSessionKey(guildId, userId), data);
}

function getWizardSession(guildId, userId) {
  return wizardSessions.get(getSessionKey(guildId, userId)) || null;
}

function clearWizardSession(guildId, userId) {
  wizardSessions.delete(getSessionKey(guildId, userId));
}

function detectCreatorNameFromUrl(url) {
  try {
    const raw = String(url || "").trim();
    if (!raw) return "Unknown Creator";

    const withoutQuery = raw.split("?")[0].replace(/\/+$/, "");
    const parts = withoutQuery.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "Unknown Creator";

    return last.replace("@", "");
  } catch {
    return "Unknown Creator";
  }
}

function buildPreviewEmbed(data) {
  return new EmbedBuilder()
    .setTitle("✅ Social Alert Ready")
    .setDescription("Your social alert has been configured successfully.")
    .addFields(
      { name: "Platform", value: data.platform || "Unknown", inline: true },
      { name: "Creator", value: data.creatorName || "Unknown Creator", inline: true },
      { name: "Channel", value: data.channelId ? `<#${data.channelId}>` : "Not set", inline: true },
      { name: "Ping Role", value: data.pingRoleId ? `<@&${data.pingRoleId}>` : "None", inline: true },
      {
        name: "Alert Types",
        value: [
          data.alertLives ? "Live" : null,
          data.alertUploads ? "Uploads" : null,
          data.alertPosts ? "Posts" : null
        ].filter(Boolean).join(", ") || "Default",
        inline: false
      },
      {
        name: "Custom Description",
        value: data.embedDescription || "Default Kyro alert text",
        inline: false
      }
    )
    .setColor("#57F287");
}

async function handlePlatformSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith("socialalerts_platform_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[2];
  const userId = parts[3];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This social alert setup is not for you.",
      ephemeral: true
    });
    return true;
  }

  const platform = interaction.values[0];
  const premiumCheck = await canAddMoreAlerts(interaction.guildId, platform);

  if (!premiumCheck.allowed) {
    const limit = getPlatformLimit(platform);

    await interaction.update({
      content:
        `❌ Free plan ${platform.toUpperCase()} limit reached (${limit} alerts).\n` +
        `Upgrade to **Kyro Premium** to add more ${platform} alerts.`,
      embeds: [],
      components: []
    });
    return true;
  }

  setWizardSession(interaction.guildId, interaction.user.id, {
    platform
  });

  const modal = new ModalBuilder()
    .setCustomId(`socialalerts_link_modal_${interaction.guildId}_${interaction.user.id}`)
    .setTitle("Social Alert Setup");

  const creatorLinkInput = new TextInputBuilder()
    .setCustomId("creator_url")
    .setLabel("Creator Link")
    .setPlaceholder("Paste YouTube / Kick / Twitch profile link")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("embed_description")
    .setLabel("Custom Description")
    .setPlaceholder("Example: {creator} is live")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(creatorLinkInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  await interaction.showModal(modal);
  return true;
}

async function handleLinkModal(interaction) {
  if (!interaction.isModalSubmit()) return false;
  if (!interaction.customId.startsWith("socialalerts_link_modal_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[3];
  const userId = parts[4];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This social alert setup is not for you.",
      ephemeral: true
    });
    return true;
  }

  const existing = getWizardSession(interaction.guildId, interaction.user.id);

  if (!existing) {
    await interaction.reply({
      content: "❌ Social alert session expired. Please run `/socialalerts setup` again.",
      ephemeral: true
    });
    return true;
  }

  const creatorUrl = interaction.fields.getTextInputValue("creator_url")?.trim();
  const embedDescription =
    interaction.fields.getTextInputValue("embed_description")?.trim() || null;

  const creatorName = detectCreatorNameFromUrl(creatorUrl);

  const updatedSession = {
    ...existing,
    creatorUrl,
    creatorName,
    embedDescription
  };

  setWizardSession(interaction.guildId, interaction.user.id, updatedSession);

  if (updatedSession.platform === "youtube") {
    const embed = new EmbedBuilder()
      .setTitle("🎥 YouTube Alert Type")
      .setDescription("Choose which YouTube alerts you want for this creator.")
      .setColor("#5865F2");

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`socialalerts_yttype_${interaction.guildId}_${interaction.user.id}`)
        .setPlaceholder("Choose YouTube alert type")
        .addOptions([
          {
            label: "Live Only",
            value: "live_only",
            description: "Only alert when creator goes live"
          },
          {
            label: "Uploads Only",
            value: "uploads_only",
            description: "Only alert when creator uploads a video"
          },
          {
            label: "Both",
            value: "both",
            description: "Alert for both live streams and uploads"
          }
        ])
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    return true;
  }

  if (updatedSession.platform === "kick") {
    updatedSession.alertLives = true;
    updatedSession.alertUploads = false;
    updatedSession.alertPosts = false;
  }

  if (updatedSession.platform === "twitch") {
    updatedSession.alertLives = true;
    updatedSession.alertUploads = false;
    updatedSession.alertPosts = false;
  }

  if (updatedSession.platform === "tiktok") {
    updatedSession.alertLives = false;
    updatedSession.alertUploads = false;
    updatedSession.alertPosts = true;
  }

  setWizardSession(interaction.guildId, interaction.user.id, updatedSession);

  const embed = new EmbedBuilder()
    .setTitle("📍 Select Alert Channel")
    .setDescription("Choose the channel where Kyro should send this social alert.")
    .setColor("#5865F2");

  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`socialalerts_channel_${interaction.guildId}_${interaction.user.id}`)
      .setPlaceholder("Select alert channel")
      .setChannelTypes(ChannelType.GuildText)
  );

  await interaction.reply({
    embeds: [embed],
    components: [channelRow],
    ephemeral: true
  });

  return true;
}

async function handleYouTubeTypeSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith("socialalerts_yttype_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[2];
  const userId = parts[3];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This social alert setup is not for you.",
      ephemeral: true
    });
    return true;
  }

  const existing = getWizardSession(interaction.guildId, interaction.user.id);

  if (!existing) {
    await interaction.reply({
      content: "❌ Social alert session expired. Please run `/socialalerts setup` again.",
      ephemeral: true
    });
    return true;
  }

  const type = interaction.values[0];

  const updated = {
    ...existing,
    alertLives: type === "live_only" || type === "both",
    alertUploads: type === "uploads_only" || type === "both",
    alertPosts: false
  };

  setWizardSession(interaction.guildId, interaction.user.id, updated);

  const embed = new EmbedBuilder()
    .setTitle("📍 Select Alert Channel")
    .setDescription("Choose the channel where Kyro should send this social alert.")
    .setColor("#5865F2");

  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`socialalerts_channel_${interaction.guildId}_${interaction.user.id}`)
      .setPlaceholder("Select alert channel")
      .setChannelTypes(ChannelType.GuildText)
  );

  await interaction.update({
    embeds: [embed],
    components: [channelRow]
  });

  return true;
}

async function handleChannelSelect(interaction) {
  if (!interaction.isChannelSelectMenu()) return false;
  if (!interaction.customId.startsWith("socialalerts_channel_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[2];
  const userId = parts[3];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This social alert setup is not for you.",
      ephemeral: true
    });
    return true;
  }

  const existing = getWizardSession(interaction.guildId, interaction.user.id);

  if (!existing) {
    await interaction.reply({
      content: "❌ Social alert session expired. Please run `/socialalerts setup` again.",
      ephemeral: true
    });
    return true;
  }

  const channelId = interaction.values[0];

  setWizardSession(interaction.guildId, interaction.user.id, {
    ...existing,
    channelId
  });

  const embed = new EmbedBuilder()
    .setTitle("🏷 Optional Ping Role")
    .setDescription("Select a role to ping, or press Skip Role.")
    .setColor("#5865F2");

  const roleRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`socialalerts_role_${interaction.guildId}_${interaction.user.id}`)
      .setPlaceholder("Select ping role (optional)")
      .setMinValues(0)
      .setMaxValues(1)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`socialalerts_skiprole_${interaction.guildId}_${interaction.user.id}`)
      .setLabel("Skip Role")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed],
    components: [roleRow, buttonRow]
  });

  return true;
}

async function finishSocialAlertSetup(interaction, pingRoleId = null) {
  const existing = getWizardSession(interaction.guildId, interaction.user.id);

  if (!existing) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: "❌ Social alert session expired. Please run `/socialalerts setup` again.",
        ephemeral: true
      }).catch(() => {});
    }
    return true;
  }

  const result = await addSocialAlert(interaction.guildId, {
    platform: existing.platform,
    creatorUrl: existing.creatorUrl,
    creatorId: existing.creatorUrl,
    creatorName: existing.creatorName,
    channelId: existing.channelId,
    pingRoleId,
    messageContent: pingRoleId ? `<@&${pingRoleId}>` : null,
    embedTitle: null,
    embedDescription:
      existing.embedDescription ||
      (existing.platform === "youtube"
        ? "{creator} has a new alert"
        : existing.platform === "kick"
          ? "{creator} is live"
          : existing.platform === "twitch"
            ? "{creator} is live"
            : "{creator} posted new content"),
    alertLives: existing.alertLives ?? false,
    alertUploads: existing.alertUploads ?? false,
    alertPosts: existing.alertPosts ?? false
  });

  if (!result.ok) {
    clearWizardSession(interaction.guildId, interaction.user.id);

    const platform = String(existing.platform || "this").toUpperCase();
    const limit = typeof result.limit === "number" ? result.limit : getPlatformLimit(existing.platform);

    await interaction.update({
      content:
        `❌ Free plan ${platform} limit reached (${limit} alerts).\n` +
        `Upgrade to **Kyro Premium** to add more ${existing.platform} alerts.`,
      embeds: [],
      components: []
    });
    return true;
  }

  clearWizardSession(interaction.guildId, interaction.user.id);

  await interaction.update({
    content: null,
    embeds: [buildPreviewEmbed(result.alert)],
    components: []
  });

  return true;
}

async function handleRoleSelect(interaction) {
  if (!interaction.isRoleSelectMenu()) return false;
  if (!interaction.customId.startsWith("socialalerts_role_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[2];
  const userId = parts[3];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This social alert setup is not for you.",
      ephemeral: true
    });
    return true;
  }

  const pingRoleId = interaction.values?.[0] || null;
  return finishSocialAlertSetup(interaction, pingRoleId);
}

async function handleSkipRole(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("socialalerts_skiprole_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[2];
  const userId = parts[3];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This social alert setup is not for you.",
      ephemeral: true
    });
    return true;
  }

  return finishSocialAlertSetup(interaction, null);
}

async function handleRemoveSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith("socialalerts_remove_")) return false;

  const parts = interaction.customId.split("_");
  const guildId = parts[2];
  const userId = parts[3];

  if (interaction.guildId !== guildId || interaction.user.id !== userId) {
    await interaction.reply({
      content: "❌ This remove menu is not for you.",
      ephemeral: true
    });
    return true;
  }

  const alertId = interaction.values?.[0];
  if (!alertId) {
    await interaction.update({
      content: "❌ No social alert selected.",
      embeds: [],
      components: []
    });
    return true;
  }

  const config = await getGuildSocialAlerts(interaction.guildId);
  const alerts = Array.isArray(config?.alerts) ? config.alerts : [];
  const alert = alerts.find((a) => a.id === alertId);

  if (!alert) {
    await interaction.update({
      content: "❌ That social alert no longer exists.",
      embeds: [],
      components: []
    });
    return true;
  }

  const removed = await removeSocialAlert(interaction.guildId, alertId);

  if (!removed) {
    await interaction.update({
      content: "❌ Failed to remove that social alert.",
      embeds: [],
      components: []
    });
    return true;
  }

  await interaction.update({
    content: `✅ Removed **${(alert.platform || "unknown").toUpperCase()}** alert for **${alert.creatorName || "Unknown Creator"}**.`,
    embeds: [],
    components: []
  });

  return true;
}

async function handleSocialAlertsWizard(interaction) {
  try {
    const handledPlatform = await handlePlatformSelect(interaction);
    if (handledPlatform) return true;

    const handledModal = await handleLinkModal(interaction);
    if (handledModal) return true;

    const handledYTType = await handleYouTubeTypeSelect(interaction);
    if (handledYTType) return true;

    const handledChannel = await handleChannelSelect(interaction);
    if (handledChannel) return true;

    const handledRole = await handleRoleSelect(interaction);
    if (handledRole) return true;

    const handledSkip = await handleSkipRole(interaction);
    if (handledSkip) return true;

    const handledRemove = await handleRemoveSelect(interaction);
    if (handledRemove) return true;

    return false;
  } catch (error) {
    console.error("[SocialAlerts] Wizard error:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Error in social alerts flow.",
        ephemeral: true
      }).catch(() => {});
    }

    return true;
  }
}

module.exports = {
  handleSocialAlertsWizard,
  clearWizardSession
};