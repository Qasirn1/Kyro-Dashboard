const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const axios = require("axios");
const Ticket = require("../models/Ticket");


const DASHBOARD_API_BASE_URL =
  process.env.DASHBOARD_API_BASE_URL || "http://localhost:3001";
const EPHEMERAL_FLAGS = 64;

async function fetchGuildTicketsConfig(guildId) {
  try {
    const response = await axios.get(
      `${DASHBOARD_API_BASE_URL}/api/guilds/${guildId}/tickets`
    );

    if (!response.data?.success) return null;
    return response.data.tickets || null;
  } catch (error) {
    console.error(
      "[Kyro Tickets] Failed to fetch ticket config:",
      error.response?.data || error.message
    );
    return null;
  }
}

// TEMPORARY: keep topic metadata until ticketControls.js is also migrated.
// Once controls move to Mongo too, we can remove these safely.
function parseTicketMeta(topic = "") {
  const meta = {
    ownerId: null,
    panelId: null,
    optionId: null,
    status: "open",
    claimedBy: null,
    closedAt: null,
  };

  if (!topic || !topic.startsWith("kyro_ticket|")) return meta;

  const parts = topic.split("|").slice(1);

  for (const part of parts) {
    const [key, value] = part.split(":");
    if (!key) continue;

    if (key === "owner") meta.ownerId = value || null;
    if (key === "panel") meta.panelId = value || null;
    if (key === "option") meta.optionId = value || null;
    if (key === "status") meta.status = value || "open";
    if (key === "claimedBy") {
      meta.claimedBy = value && value !== "none" ? value : null;
    }
    if (key === "closedAt") {
      meta.closedAt = value ? Number(value) : null;
    }
  }

  return meta;
}

// TEMPORARY: keep for ticketControls.js compatibility
function buildTicketMeta({
  ownerId,
  panelId,
  optionId,
  status = "open",
  claimedBy = null,
  closedAt = null,
}) {
  let meta = `kyro_ticket|owner:${ownerId}|panel:${panelId}|option:${optionId}|status:${status}|claimedBy:${claimedBy || "none"}`;

  if (closedAt) {
    meta += `|closedAt:${closedAt}`;
  }

  return meta;
}

function findPanelAndOption(ticketsConfig, panelId, optionId) {
  const panel = ticketsConfig?.panels?.find((p) => p.id === panelId);
  if (!panel) return { panel: null, option: null };

  const option = panel.options?.find((o) => o.id === optionId) || null;
  return { panel, option };
}

function getSupportRoleIds(panel, option) {
  const roleIds = new Set();

  if (Array.isArray(panel?.supportRoleIds)) {
    for (const roleId of panel.supportRoleIds) {
      if (roleId) roleIds.add(roleId);
    }
  }

  if (Array.isArray(option?.staffRoleIds)) {
    for (const roleId of option.staffRoleIds) {
      if (roleId) roleIds.add(roleId);
    }
  }

  if (option?.staffRoleId) {
    roleIds.add(option.staffRoleId);
  }

  return [...roleIds];
}

function buildTicketActionRow(panel, status = "open", claimedBy = null) {
  const isClosed = status === "closed";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel(claimedBy ? "Claimed" : "Claim")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isClosed || !!claimedBy),

    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isClosed),

    new ButtonBuilder()
      .setCustomId("ticket_reopen")
      .setLabel("Reopen")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isClosed),

    new ButtonBuilder()
      .setCustomId("ticket_delete")
      .setLabel("Delete")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(false)
  );
}

function buildIntroEmbed(panel, option, user, submittedAnswers = []) {
  const intro = panel?.ticketIntroMessage || {};

  const embed = new EmbedBuilder()
    .setTitle(intro.title || "Your ticket has been created.")
    .setDescription(
      intro.description ||
        "Please provide any additional info you deem relevant to help us answer faster."
    )
    .setColor(intro.color || "#5865F2")
    .addFields(
      { name: "User", value: `${user}`, inline: true },
      { name: "Type", value: option?.label || "Support", inline: true },
      { name: "Status", value: "🟢 Open", inline: true }
    )
    .setTimestamp();

  if (intro.bannerUrl) embed.setImage(intro.bannerUrl);
  if (intro.footer) embed.setFooter({ text: intro.footer });

  if (submittedAnswers.length > 0) {
    for (const answer of submittedAnswers.slice(0, 5)) {
      embed.addFields({
        name: answer.label,
        value: answer.value || "No answer provided",
        inline: false,
      });
    }
  }

  return embed;
}

async function sendTicketLog(guild, panel, embed) {
  const logChannelId = panel?.logs?.enabled ? panel?.logs?.channelId : null;
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("[Kyro Tickets] Failed to send log:", error.message);
  }
}

async function findExistingOpenTicket(guild, userId, panel = null, option = null) {
  try {
    const existingTicket = await Ticket.findOne({
      guildId: guild.id,
      ownerId: userId,
      status: "open",
    }).sort({ createdAt: -1 });

    if (!existingTicket) return null;

    const existingChannel =
      guild.channels.cache.get(existingTicket.channelId) ||
      (await guild.channels.fetch(existingTicket.channelId).catch(() => null));

    if (!existingChannel) {
      await Ticket.updateOne(
        { _id: existingTicket._id },
        { $set: { status: "archived" } }
      ).catch(() => {});
      return null;
    }

    const closedCategoryId =
      option?.closedCategoryId ||
      panel?.closedCategoryId ||
      panel?.categories?.closedCategoryId ||
      null;

    if (
      existingChannel.name?.startsWith("closed-") ||
      (closedCategoryId && existingChannel.parentId === closedCategoryId)
    ) {
      await Ticket.updateOne(
        { _id: existingTicket._id },
        {
          $set: {
            status: "closed",
            archivedChannelId: existingChannel.id,
          },
        }
      ).catch(() => {});
      return null;
    }

    return existingChannel;
  } catch (error) {
    console.error("[Kyro Tickets] Failed to check existing open ticket:", error);
    return null;
  }
}

function buildModalForOption(panelId, option) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_form:${panelId}:${option.id}`)
    .setTitle(option.formTitle || `${option.label} Form`);

  const rows = [];

  for (const question of (option.formQuestions || []).slice(0, 5)) {
    const input = new TextInputBuilder()
      .setCustomId(question.id)
      .setLabel((question.label || "Question").slice(0, 45))
      .setPlaceholder((question.placeholder || "").slice(0, 100))
      .setRequired(question.required ?? false)
      .setStyle(
        question.type === "paragraph"
          ? TextInputStyle.Paragraph
          : TextInputStyle.Short
      );

    rows.push(new ActionRowBuilder().addComponents(input));
  }

  modal.addComponents(...rows);
  return modal;
}

function buildFreshPanelComponents(panel) {
  if (panel?.ticketTypeMode === "dropdown") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`ticket_select:${panel.id}`)
      .setPlaceholder("Open ticket")
      .addOptions(
        (panel.options || []).slice(0, 25).map((option) => ({
          label: String(option.label || "Open ticket").slice(0, 100),
          description:
            String(option.description || "").slice(0, 100) || undefined,
          emoji: option.emoji || undefined,
          value: option.id,
        }))
      );

    return [new ActionRowBuilder().addComponents(menu)];
  }

  if (panel?.ticketTypeMode === "buttons") {
    const buttons = (panel.options || []).slice(0, 5).map((option) =>
      new ButtonBuilder()
        .setCustomId(`ticket_open:${panel.id}:${option.id}`)
        .setLabel(String(option.label || "Open ticket").slice(0, 80))
        .setStyle(
          option.buttonStyle === "secondary"
            ? ButtonStyle.Secondary
            : option.buttonStyle === "success"
            ? ButtonStyle.Success
            : option.buttonStyle === "danger"
            ? ButtonStyle.Danger
            : ButtonStyle.Primary
        )
        .setEmoji(option.emoji || undefined)
    );

    return buttons.length
      ? [new ActionRowBuilder().addComponents(buttons)]
      : [];
  }

  return [];
}

function resolveOpenCategoryId(panel, option) {
  return (
    option?.openCategoryId ||
    panel?.openCategoryId ||
    panel?.categories?.openCategoryId ||
    null
  );
}

function canUseTicketsConfig(ticketsConfig, panelId, optionId) {
  if (!ticketsConfig) return false;

  const { panel, option } = findPanelAndOption(ticketsConfig, panelId, optionId);

  if (ticketsConfig.enabled === true && panel && option) return true;

  if (panel && option) {
    console.warn(
      "[Kyro Tickets] tickets.enabled is false, but panel/option exists. Allowing open as fallback.",
      {
        enabled: ticketsConfig.enabled,
        panelId,
        optionId,
      }
    );
    return true;
  }

  return false;
}

async function createTicketChannel({
  interaction,
  panel,
  option,
  submittedAnswers = [],
}) {
  const guild = interaction.guild;
  const user = interaction.user;

  const existing = await findExistingOpenTicket(guild, user.id, panel, option);
  if (existing) {
    return interaction.editReply({
      content: `❌ You already have an open ticket: ${existing}`,
    });
  }

  const supportRoleIds = getSupportRoleIds(panel, option);

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  for (const roleId of supportRoleIds) {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  const safeUsername = user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 18);

  const channelName = `ticket-${safeUsername || "user"}`;
  const openCategoryId = resolveOpenCategoryId(panel, option);


  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: openCategoryId,
    // TEMPORARY compatibility until ticketControls.js is migrated too
   topic: `🎫 Ticket • Open 🟢 • <@${user.id}>`,
    permissionOverwrites,
  });

  await Ticket.findOneAndUpdate(
    { channelId: channel.id },
    {
      guildId: guild.id,
      channelId: channel.id,
      ownerId: user.id,
      panelId: panel.id,
      optionId: option.id,
      status: "open",
      claimedBy: null,
      closedAt: null,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const introEmbed = buildIntroEmbed(panel, option, user, submittedAnswers);
  const actionRows = [buildTicketActionRow(panel, "open", null)];

  const mentionRoles =
    panel?.behavior?.pingStaffOnOpen && supportRoleIds.length > 0
      ? supportRoleIds.map((id) => `<@&${id}>`).join(" ")
      : "";

  await channel.send({
    content: mentionRoles || undefined,
    embeds: [introEmbed],
    components: actionRows,
  });

  await interaction.editReply({
    content: `✅ Your ticket has been created: ${channel}`,
  });

  const logEmbed = new EmbedBuilder()
    .setTitle("📩 Ticket Opened")
    .addFields(
      { name: "User", value: `${user}`, inline: true },
      { name: "Ticket", value: `${channel}`, inline: true },
      { name: "Type", value: option?.label || "Support", inline: true }
    )
    .setColor("#57F287")
    .setTimestamp();

  await sendTicketLog(guild, panel, logEmbed);
}

module.exports = async (interaction) => {
  if (
    !interaction.isButton() &&
    !interaction.isStringSelectMenu() &&
    !interaction.isModalSubmit()
  ) {
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("kyro_role_")) {
    return;
  }

  if (
    interaction.isButton() &&
    ["ticket_claim", "ticket_close", "ticket_reopen", "ticket_delete"].includes(
      interaction.customId
    )
  ) {
    return;
  }

  // BUTTON OPEN
  if (interaction.isButton()) {
    if (!interaction.customId.startsWith("ticket_open:")) return;

    const [, panelId, optionId] = interaction.customId.split(":");
    if (!panelId || !optionId) {
      return interaction.reply({
        content: "❌ Invalid ticket button configuration.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const ticketsConfig = await fetchGuildTicketsConfig(interaction.guild.id);


    if (!canUseTicketsConfig(ticketsConfig, panelId, optionId)) {
      return interaction.reply({
        content: "❌ Ticket system is disabled for this server.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const { panel, option } = findPanelAndOption(
      ticketsConfig,
      panelId,
      optionId
    );

    if (!panel || !option) {
      return interaction.reply({
        content: "❌ Ticket panel or option not found.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    if (
      option.formEnabled &&
      Array.isArray(option.formQuestions) &&
      option.formQuestions.length > 0
    ) {
      const modal = buildModalForOption(panelId, option);
      return interaction.showModal(modal);
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    const result = await createTicketChannel({
      interaction,
      panel,
      option,
      submittedAnswers: [],
    });

    try {
      if (interaction.message && panel?.ticketTypeMode === "dropdown") {
        await interaction.message.edit({
          components: buildFreshPanelComponents(panel),
        });
      }
    } catch (error) {
      console.error(
        "[Kyro Tickets] Failed to refresh dropdown panel:",
        error.message
      );
    }

    return result;
  }

  // DROPDOWN OPEN
  if (interaction.isStringSelectMenu()) {
    if (!interaction.customId.startsWith("ticket_select:")) return;

    const [, panelId] = interaction.customId.split(":");
    const optionId = interaction.values?.[0];

    if (!panelId || !optionId) {
      return interaction.reply({
        content: "❌ Invalid ticket dropdown configuration.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const ticketsConfig = await fetchGuildTicketsConfig(interaction.guild.id);


    if (!canUseTicketsConfig(ticketsConfig, panelId, optionId)) {
      return interaction.reply({
        content: "❌ Ticket system is disabled for this server.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const { panel, option } = findPanelAndOption(
      ticketsConfig,
      panelId,
      optionId
    );

    if (!panel || !option) {
      return interaction.reply({
        content: "❌ Ticket panel or option not found.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    if (
      option.formEnabled &&
      Array.isArray(option.formQuestions) &&
      option.formQuestions.length > 0
    ) {
      const modal = buildModalForOption(panelId, option);
      return interaction.showModal(modal);
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    const result = await createTicketChannel({
      interaction,
      panel,
      option,
      submittedAnswers: [],
    });

    try {
      if (interaction.message && panel?.ticketTypeMode === "dropdown") {
        await interaction.message.edit({
          components: buildFreshPanelComponents(panel),
        });
      }
    } catch (error) {
      console.error(
        "[Kyro Tickets] Failed to refresh dropdown panel:",
        error.message
      );
    }

    return result;
  }

  // MODAL SUBMIT FOR FORMS
  if (interaction.isModalSubmit()) {
    if (!interaction.customId.startsWith("ticket_form:")) return;

    const [, panelId, optionId] = interaction.customId.split(":");
    if (!panelId || !optionId) {
      return interaction.reply({
        content: "❌ Invalid ticket form configuration.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const ticketsConfig = await fetchGuildTicketsConfig(interaction.guild.id);


    if (!canUseTicketsConfig(ticketsConfig, panelId, optionId)) {
      return interaction.reply({
        content: "❌ Ticket system is disabled for this server.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const { panel, option } = findPanelAndOption(
      ticketsConfig,
      panelId,
      optionId
    );

    if (!panel || !option) {
      return interaction.reply({
        content: "❌ Ticket panel or option not found.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    const submittedAnswers = (option.formQuestions || [])
      .slice(0, 5)
      .map((question) => ({
        label: question.label,
        value: interaction.fields.getTextInputValue(question.id) || "",
      }));

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    const result = await createTicketChannel({
      interaction,
      panel,
      option,
      submittedAnswers,
    });

    try {
      const panelMessage =
        interaction.message ||
        interaction.channel?.messages?.cache?.find(
          (msg) =>
            msg.author.id === interaction.client.user.id &&
            msg.components?.length > 0
        );

      if (panelMessage && panel?.ticketTypeMode === "dropdown") {
        await panelMessage.edit({
          components: buildFreshPanelComponents(panel),
        });
      }
    } catch (error) {
      console.error(
        "[Kyro Tickets] Failed to refresh dropdown panel after modal:",
        error.message
      );
    }

    return result;
  }
};