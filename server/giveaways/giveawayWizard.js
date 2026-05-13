const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");

const {
  parseDuration,
  isValidWinnerCount,
  isValidImageUrl,
  normalizeImageUrl,
} = require("./giveawayUtils");

const { createGiveawayMessage } = require("./giveawayManager");

function buildGiveawayCreateModal() {
  const modal = new ModalBuilder()
    .setCustomId("giveaway_create_modal")
    .setTitle("Create Giveaway");

  const prizeInput = new TextInputBuilder()
    .setCustomId("prize")
    .setLabel("Prize")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("Example: Discord Nitro");

  const descriptionInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Giveaway Description (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder("Add extra details about the giveaway");

  const winnersInput = new TextInputBuilder()
    .setCustomId("winners")
    .setLabel("Winner Count")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("Example: 1");

  const durationInput = new TextInputBuilder()
    .setCustomId("duration")
    .setLabel("Duration (s, m, h, d)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("Example: 10m or 2h or 3d");

  const bannerInput = new TextInputBuilder()
    .setCustomId("bannerUrl")
    .setLabel("Giveaway Banner URL (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("png, jpg, webp, gif");

  modal.addComponents(
    new ActionRowBuilder().addComponents(prizeInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(winnersInput),
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(bannerInput)
  );

  return modal;
}

function buildGiveawayExtrasModal() {
  const modal = new ModalBuilder()
    .setCustomId("giveaway_extras_modal")
    .setTitle("Giveaway Extras");

  const winnerBannerInput = new TextInputBuilder()
    .setCustomId("winnerBannerUrl")
    .setLabel("Winner Banner URL (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("png, jpg, webp, gif");

  const winnerMessageInput = new TextInputBuilder()
    .setCustomId("winnerMessage")
    .setLabel("Winner Message (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder("Use {winners}, {prize}, {host}");

  modal.addComponents(
    new ActionRowBuilder().addComponents(winnerBannerInput),
    new ActionRowBuilder().addComponents(winnerMessageInput)
  );

  return modal;
}

function buildExtrasButtons() {
  const openExtrasButton = new ButtonBuilder()
    .setCustomId("giveaway_open_extras")
    .setLabel("Open Extras")
    .setStyle(ButtonStyle.Primary);

  const skipButton = new ButtonBuilder()
    .setCustomId("giveaway_skip_extras")
    .setLabel("Skip & Create")
    .setStyle(ButtonStyle.Success);

  return [new ActionRowBuilder().addComponents(openExtrasButton, skipButton)];
}

async function finalizeGiveaway(interaction, cached, extras = {}) {
  const giveawayChannel = await interaction.guild.channels
    .fetch(cached.giveawayChannelId)
    .catch(() => null);

  if (!giveawayChannel || !giveawayChannel.isTextBased()) {
    const cache = interaction.client.giveawayWizardCache || new Map();
    cache.delete(interaction.user.id);

    await interaction.reply({
      content: "❌ Giveaway channel no longer exists.",
      ephemeral: true,
    }).catch(() => {});
    return;
  }

  let winnerAnnouncementChannelId = null;
  if (cached.winnerAnnouncementChannelId) {
    const winnerChannel = await interaction.guild.channels
      .fetch(cached.winnerAnnouncementChannelId)
      .catch(() => null);

    if (!winnerChannel || !winnerChannel.isTextBased()) {
      const cache = interaction.client.giveawayWizardCache || new Map();
      cache.delete(interaction.user.id);

      await interaction.reply({
        content: "❌ Winner announcement channel no longer exists.",
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    winnerAnnouncementChannelId = winnerChannel.id;
  }

  const giveaway = await createGiveawayMessage({
    guild: interaction.guild,
    channel: giveawayChannel,
    hostId: interaction.user.id,
    prize: cached.prize,
    description: cached.description,
    winnerCount: cached.winnerCount,
    durationMs: cached.durationMs,
    requiredRoleId: cached.requiredRoleId,
    bannerUrl: cached.bannerUrl,
    winnerAnnouncementChannelId,
    winnerBannerUrl: extras.winnerBannerUrl || null,
    winnerMessage: extras.winnerMessage || null,
  });

  const cache = interaction.client.giveawayWizardCache || new Map();
  cache.delete(interaction.user.id);

  const summary = [
    "✅ Giveaway created successfully.",
    `🎉 Prize: **${giveaway.prize}**`,
    cached.description ? `📝 Description: ${cached.description}` : null,
    `📍 Giveaway Channel: <#${giveaway.channelId}>`,
    winnerAnnouncementChannelId
      ? `🏁 Winner Channel: <#${winnerAnnouncementChannelId}>`
      : `🏁 Winner Channel: <#${giveaway.channelId}>`,
    giveaway.requiredRoleId
      ? `🔒 Required Role: <@&${giveaway.requiredRoleId}>`
      : "🔓 Required Role: None",
    extras.winnerBannerUrl ? "🖼️ Winner Banner: Added" : null,
    extras.winnerMessage
      ? "💬 Custom Winner Message: Added"
      : "💬 Custom Winner Message: Default Kyro message",
  ]
    .filter(Boolean)
    .join("\n");

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content: summary,
      components: [],
    }).catch(() => {});
  } else {
    await interaction.reply({
      content: summary,
      ephemeral: true,
    }).catch(() => {});
  }
}

async function startGiveawayWizard(interaction) {
  const giveawayChannel = interaction.options.getChannel("channel", true);
  const winnerAnnouncementChannel =
    interaction.options.getChannel("winner_channel", false);
  const requiredRole = interaction.options.getRole("required_role", false);

  if (!giveawayChannel || !giveawayChannel.isTextBased()) {
    await interaction.reply({
      content: "❌ Invalid giveaway channel selected.",
      ephemeral: true,
    });
    return;
  }

  if (winnerAnnouncementChannel && !winnerAnnouncementChannel.isTextBased()) {
    await interaction.reply({
      content: "❌ Invalid winner announcement channel selected.",
      ephemeral: true,
    });
    return;
  }

  if (giveawayChannel.type === ChannelType.GuildVoice) {
    await interaction.reply({
      content: "❌ Giveaway channel must be a text channel.",
      ephemeral: true,
    });
    return;
  }

  if (
    winnerAnnouncementChannel &&
    winnerAnnouncementChannel.type === ChannelType.GuildVoice
  ) {
    await interaction.reply({
      content: "❌ Winner announcement channel must be a text channel.",
      ephemeral: true,
    });
    return;
  }

  const cache = interaction.client.giveawayWizardCache || new Map();

  cache.set(interaction.user.id, {
    giveawayChannelId: giveawayChannel.id,
    winnerAnnouncementChannelId: winnerAnnouncementChannel
      ? winnerAnnouncementChannel.id
      : null,
    requiredRoleId: requiredRole ? requiredRole.id : null,
  });

  interaction.client.giveawayWizardCache = cache;

  await interaction.showModal(buildGiveawayCreateModal());
}

async function handleGiveawayCreateModal(interaction) {
  const prize = interaction.fields.getTextInputValue("prize")?.trim();
  const description = interaction.fields
    .getTextInputValue("description")
    ?.trim();
  const winnersRaw = interaction.fields.getTextInputValue("winners")?.trim();
  const durationRaw = interaction.fields
    .getTextInputValue("duration")
    ?.trim()
    .toLowerCase();
  const bannerRaw = interaction.fields.getTextInputValue("bannerUrl")?.trim();

  const cache = interaction.client.giveawayWizardCache || new Map();
  const cached = cache.get(interaction.user.id);

  if (!cached) {
    await interaction.reply({
      content: "❌ Giveaway setup expired. Please run `/giveaway create` again.",
      ephemeral: true,
    });
    return;
  }

  if (!prize) {
    await interaction.reply({
      content: "❌ Prize is required.",
      ephemeral: true,
    });
    return;
  }

  if (!isValidWinnerCount(winnersRaw)) {
    await interaction.reply({
      content: "❌ Winner count must be a whole number between 1 and 50.",
      ephemeral: true,
    });
    return;
  }

  const durationMs = parseDuration(durationRaw);
  if (!durationMs) {
    await interaction.reply({
      content: "❌ Invalid duration. Use formats like `10m`, `2h`, `3d`.",
      ephemeral: true,
    });
    return;
  }

  const bannerUrl = normalizeImageUrl(bannerRaw);

  if (bannerUrl && !isValidImageUrl(bannerUrl)) {
    await interaction.reply({
      content: "❌ Giveaway banner URL must end with png, jpg, jpeg, webp, or gif.",
      ephemeral: true,
    });
    return;
  }

  cache.set(interaction.user.id, {
    ...cached,
    prize,
    description: description || null,
    winnerCount: Number(winnersRaw),
    durationMs,
    bannerUrl,
  });

  interaction.client.giveawayWizardCache = cache;

  await interaction.reply({
    content:
      "✅ Main giveaway details saved.\nChoose **Open Extras** to add winner banner/message, or **Skip & Create** to use Kyro's default winner announcement.",
    components: buildExtrasButtons(),
    ephemeral: true,
  });
}

async function handleGiveawayExtrasButton(interaction) {
  if (!interaction.isButton()) return false;

  if (interaction.customId === "giveaway_open_extras") {
    await interaction.showModal(buildGiveawayExtrasModal());
    return true;
  }

  if (interaction.customId === "giveaway_skip_extras") {
    const cache = interaction.client.giveawayWizardCache || new Map();
    const cached = cache.get(interaction.user.id);

    if (!cached) {
      await interaction.reply({
        content: "❌ Giveaway setup expired. Please run `/giveaway create` again.",
        ephemeral: true,
      }).catch(() => {});
      return true;
    }

    await interaction.deferReply({ ephemeral: true });
    await finalizeGiveaway(interaction, cached, {});
    return true;
  }

  return false;
}

async function handleGiveawayExtrasModal(interaction) {
  const winnerBannerRaw = interaction.fields
    .getTextInputValue("winnerBannerUrl")
    ?.trim();
  const winnerMessageRaw = interaction.fields
    .getTextInputValue("winnerMessage")
    ?.trim();

  const cache = interaction.client.giveawayWizardCache || new Map();
  const cached = cache.get(interaction.user.id);

  if (!cached) {
    await interaction.reply({
      content: "❌ Giveaway setup expired. Please run `/giveaway create` again.",
      ephemeral: true,
    });
    return;
  }

  const winnerBannerUrl = normalizeImageUrl(winnerBannerRaw);
  const winnerMessage = winnerMessageRaw ? winnerMessageRaw.trim() : null;

  if (winnerBannerUrl && !isValidImageUrl(winnerBannerUrl)) {
    await interaction.reply({
      content: "❌ Winner banner URL must end with png, jpg, jpeg, webp, or gif.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  await finalizeGiveaway(interaction, cached, {
    winnerBannerUrl,
    winnerMessage,
  });
}

module.exports = {
  buildGiveawayCreateModal,
  buildGiveawayExtrasModal,
  startGiveawayWizard,
  handleGiveawayCreateModal,
  handleGiveawayExtrasButton,
  handleGiveawayExtrasModal,
};