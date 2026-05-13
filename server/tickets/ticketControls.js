const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const axios = require("axios");
const transcripts = require("discord-html-transcripts");
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

// TEMP migration fallback only.
// After all tickets are DB-based and clean, this can be removed.
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

function findPanelAndOption(ticketsConfig, panelId, optionId) {
  const panel = ticketsConfig?.panels?.find((p) => p.id === panelId);
  if (!panel) return { panel: null, option: null };

  const option = panel.options?.find((o) => o.id === optionId) || null;
  return { panel, option };
}

function canUseTicketsConfig(ticketsConfig, panelId, optionId) {
  if (!ticketsConfig) return false;

  const { panel, option } = findPanelAndOption(ticketsConfig, panelId, optionId);

  if (ticketsConfig.enabled === true && panel && option) return true;

  if (panel && option) {
    console.warn(
      "[Kyro Tickets] tickets.enabled is false, but panel/option exists. Allowing controls fallback.",
      { enabled: ticketsConfig.enabled, panelId, optionId }
    );
    return true;
  }

  return false;
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

function isStaffMember(member, panel, option) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;

  const staffRoleIds = getSupportRoleIds(panel, option);
  if (!staffRoleIds.length) return false;

  return staffRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function buildActionRows(panel, status = "open", claimedBy = null) {
  const isClosed = status === "closed" || status === "archived";

  const row = new ActionRowBuilder().addComponents(
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

  return [row];
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

async function saveTranscriptIfEnabled(channel, guild, panel, closedByUserTag) {
  if (!panel?.transcripts?.enabled || !panel?.transcripts?.channelId) return;

  try {
    const transcriptChannel = guild.channels.cache.get(
      panel.transcripts.channelId
    );
    if (!transcriptChannel) return;

    const attachment = await transcripts.createTranscript(channel, {
      fileName: `${channel.name}.html`,
    });

    const embed = new EmbedBuilder()
      .setTitle("📄 Ticket Transcript")
      .setDescription(
        `Transcript from ${channel}\nClosed by: ${closedByUserTag}`
      )
      .setColor("#57F287")
      .setTimestamp();

    await transcriptChannel.send({
      embeds: [embed],
      files: [attachment],
    });

    const ticket = await Ticket.findOne({ channelId: channel.id }).catch(() => null);

    if (panel.transcripts.sendToUserDm && ticket?.ownerId) {
      try {
        const owner = await guild.client.users.fetch(ticket.ownerId);
        await owner.send({
          content: `📄 Here is the transcript for your ticket from **${guild.name}**.`,
          files: [attachment],
        });
      } catch {
        console.warn("[Kyro Tickets] Could not DM transcript to user.");
      }
    }
  } catch (error) {
    console.error("[Kyro Tickets] Failed to save transcript:", error.message);
  }
}

function resolveClosedCategoryId(panel, option) {
  return (
    option?.closedCategoryId ||
    panel?.closedCategoryId ||
    panel?.categories?.closedCategoryId ||
    null
  );
}

function resolveOpenCategoryId(panel, option) {
  return (
    option?.openCategoryId ||
    panel?.openCategoryId ||
    panel?.categories?.openCategoryId ||
    null
  );
}

async function getTicketRecord(channel, guildId) {
  let ticket = await Ticket.findOne({ channelId: channel.id }).catch(() => null);
  if (ticket) return ticket;

  // TEMP fallback for old tickets that still only have topic metadata
  const meta = parseTicketMeta(channel.topic || "");
  if (!meta.ownerId || !meta.panelId || !meta.optionId) return null;

  ticket = await Ticket.findOneAndUpdate(
    { channelId: channel.id },
    {
      guildId,
      channelId: channel.id,
      ownerId: meta.ownerId,
      panelId: meta.panelId,
      optionId: meta.optionId,
      status: meta.status || "open",
      claimedBy: meta.claimedBy || null,
      closedAt: meta.closedAt ? new Date(meta.closedAt) : null,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).catch(() => null);

  return ticket;
}

function buildStatusText(status) {
  return status === "closed" || status === "archived" ? "🔴 Closed" : "🟢 Open";
}

async function updateTicketEmbedStatusFromMessage(message, status) {
  try {
    if (!message?.editable || !message.embeds?.length) return false;

    const sourceEmbed = message.embeds[0];
    const fields = (sourceEmbed.fields || []).map((field) => {
      if (field.name === "Status") {
        return {
          name: field.name,
          value: buildStatusText(status),
          inline: field.inline ?? true,
        };
      }
      return {
        name: field.name,
        value: field.value,
        inline: field.inline ?? false,
      };
    });

    const updatedEmbed = EmbedBuilder.from(sourceEmbed).setFields(fields);

    await message.edit({
      embeds: [updatedEmbed],
      components: message.components,
    });

    return true;
  } catch (error) {
    console.error("[Kyro Tickets] Failed to update embed status:", error.message);
    return false;
  }
}

function buildReopenedTicketEmbedFromExisting(message, ownerId, optionLabel) {
  const sourceEmbed = message?.embeds?.[0];

  if (!sourceEmbed) {
    return new EmbedBuilder()
      .setTitle("Your ticket has been reopened.")
      .setDescription("This ticket was reopened from archive.")
      .setColor("#5865F2")
      .addFields(
        { name: "User", value: `<@${ownerId}>`, inline: true },
        { name: "Type", value: optionLabel || "Support", inline: true },
        { name: "Status", value: "🟢 Open", inline: true }
      )
      .setTimestamp();
  }

  const fields = (sourceEmbed.fields || []).map((field) => {
    if (field.name === "Status") {
      return {
        name: field.name,
        value: "🟢 Open",
        inline: field.inline ?? true,
      };
    }
    return {
      name: field.name,
      value: field.value,
      inline: field.inline ?? false,
    };
  });

  return EmbedBuilder.from(sourceEmbed).setFields(fields).setTimestamp();
}

async function moveAndRenameTicketChannel({
  guild,
  channel,
  newName,
  targetCategoryId = null,
  reason,
}) {
  const freshChannel = await guild.channels.fetch(channel.id);

  if (!freshChannel || freshChannel.type !== ChannelType.GuildText) {
    throw new Error("Fresh channel fetch failed before move/rename.");
  }

  let editedChannel = freshChannel;

  if (targetCategoryId && freshChannel.parentId !== targetCategoryId) {
    const targetCategory = guild.channels.cache.get(targetCategoryId);


    if (!targetCategory) {
      throw new Error(`Target category not found: ${targetCategoryId}`);
    }

    if (targetCategory.type !== ChannelType.GuildCategory) {
      throw new Error(
        `Target category ID is not a category channel: ${targetCategoryId}`
      );
    }

    editedChannel = await freshChannel.setParent(targetCategoryId, {
      lockPermissions: false,
    });
  }

  if (editedChannel.name !== newName) {
    editedChannel = await editedChannel.setName(newName, reason);
  }

  return editedChannel;
}

async function updateTicketPanelFromInteraction(interaction, panel, status, claimedBy) {
  try {
    if (interaction?.message?.editable) {
      await interaction.message.edit({
        components: buildActionRows(panel, status, claimedBy),
      });
      return true;
    }
  } catch (error) {
    console.error(
      "[Kyro Tickets] interaction.message edit failed:",
      error.message
    );
  }

  return false;
}

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId.startsWith("kyro_role_")) return;

  if (
    ![
      "ticket_claim",
      "ticket_close",
      "ticket_reopen",
      "ticket_delete",
      "ticket_confirm_close",
      "ticket_cancel_close",
    ].includes(interaction.customId)
  ) {
    return;
  }

  const { guild, channel, user, member } = interaction;
  if (!guild || !channel || channel.type !== ChannelType.GuildText) return;

  const ticket = await getTicketRecord(channel, guild.id);
  if (!ticket?.panelId || !ticket?.optionId) {
    return interaction
      .reply({
        content: "❌ Ticket metadata not found for this channel.",
        flags: EPHEMERAL_FLAGS,
      })
      .catch(() => {});
  }

  const ticketsConfig = await fetchGuildTicketsConfig(guild.id);


  if (!canUseTicketsConfig(ticketsConfig, ticket.panelId, ticket.optionId)) {
    return interaction.reply({
      content: "❌ Ticket system is disabled for this server.",
      flags: EPHEMERAL_FLAGS,
    });
  }

  const { panel, option } = findPanelAndOption(
    ticketsConfig,
    ticket.panelId,
    ticket.optionId
  );

  if (!panel || !option) {
    return interaction.reply({
      content: "❌ Ticket configuration not found.",
      flags: EPHEMERAL_FLAGS,
    });
  }

  const staffAllowed = isStaffMember(member, panel, option);

  // CLAIM
  if (interaction.customId === "ticket_claim") {
    if (!staffAllowed) {
      return interaction.reply({
        content: "❌ Only ticket staff can claim tickets.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    if (ticket.status !== "open") {
      return interaction.reply({
        content: "❌ Closed tickets cannot be claimed.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    if (ticket.claimedBy) {
      return interaction.reply({
        content: `📌 Ticket already claimed by <@${ticket.claimedBy}>.`,
        flags: EPHEMERAL_FLAGS,
      });
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    try {
      await Ticket.updateOne(
        { channelId: channel.id },
        {
          $set: {
            claimedBy: user.id,
            status: "open",
          },
        }
      );

      await updateTicketPanelFromInteraction(interaction, panel, "open", user.id);

      channel.send(`📌 Ticket claimed by ${user}.`).catch(() => {});
      sendTicketLog(
        guild,
        panel,
        new EmbedBuilder()
          .setTitle("📌 Ticket Claimed")
          .setDescription(`${user} claimed ${channel}`)
          .setColor("#5865F2")
          .setTimestamp()
      ).catch(() => {});

      return interaction.editReply({
        content: "✅ Ticket claimed successfully.",
      });
    } catch (error) {
      console.error("[Kyro Tickets] Claim ticket error:", error);

      return interaction.editReply({
        content: "❌ Failed to claim ticket.",
      });
    }
  }

  // CLOSE
  if (interaction.customId === "ticket_close") {
    if (!staffAllowed) {
      return interaction.reply({
        content: "❌ Only ticket staff can close tickets.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    if (ticket.status === "closed" || ticket.status === "archived") {
      return interaction.reply({
        content: "❌ This ticket is already closed.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    try {
      const newName = channel.name.startsWith("closed-")
        ? channel.name
        : `closed-${channel.name.replace(/^ticket-/, "")}`;

      const closedCategoryId = resolveClosedCategoryId(panel, option);

      const movedChannel = await moveAndRenameTicketChannel({
        guild,
        channel,
        newName,
        targetCategoryId: closedCategoryId,
        reason: `Kyro ticket closed by ${user.tag}`,
      });

      if (ticket.ownerId) {
        await movedChannel.permissionOverwrites.edit(ticket.ownerId, {
          SendMessages: false,
        });
      }

      await Ticket.updateOne(
        { channelId: channel.id },
        {
          $set: {
            status: "closed",
            closedAt: new Date(),
            archivedChannelId: movedChannel.id,
          },
        }
      );

      await updateTicketPanelFromInteraction(
        interaction,
        panel,
        "closed",
        ticket.claimedBy
      );
      await updateTicketEmbedStatusFromMessage(interaction.message, "closed");

      // optional: clean topic while migrating off ugly metadata
      movedChannel
        .setTopic(`🎫 Ticket • Closed 🔒 • <@${ticket.ownerId}>`)
        .catch(() => {});

      await interaction.editReply({
        content: "✅ Ticket closed successfully.",
      });

      saveTranscriptIfEnabled(channel, guild, panel, user.tag).catch((err) => {
        console.error("[Kyro Tickets] Transcript save failed:", err.message);
      });

      movedChannel.send(`🔒 Ticket closed by ${user}.`).catch((err) => {
        console.error("[Kyro Tickets] Close channel message failed:", err.message);
      });

      const logEmbed = new EmbedBuilder()
        .setTitle("🔒 Ticket Closed")
        .addFields(
          { name: "Ticket", value: `${movedChannel}`, inline: true },
          { name: "Closed By", value: `${user}`, inline: true }
        )
        .setColor("#ED4245")
        .setTimestamp();

      sendTicketLog(guild, panel, logEmbed).catch((err) => {
        console.error("[Kyro Tickets] Close log failed:", err.message);
      });

      return;
    } catch (error) {
      console.error("[Kyro Tickets] Close ticket error:", error);

      return interaction.editReply({
        content:
          "❌ Failed to close ticket. Check Closed Category permissions and category setup.",
      });
    }
  }

  // stale old confirm buttons
  if (interaction.customId === "ticket_confirm_close") {
    return interaction.reply({
      content: "ℹ️ Please use the Close button directly.",
      flags: EPHEMERAL_FLAGS,
    });
  }

  if (interaction.customId === "ticket_cancel_close") {
    return interaction.reply({
      content: "ℹ️ Nothing to cancel.",
      flags: EPHEMERAL_FLAGS,
    });
  }

  // REOPEN
  if (interaction.customId === "ticket_reopen") {
    if (!staffAllowed) {
      return interaction.reply({
        content: "❌ Only ticket staff can reopen tickets.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    if (ticket.status !== "closed" && ticket.status !== "archived") {
      return interaction.reply({
        content: "❌ This ticket is already open.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    try {
      const guildObj = guild;
      const openCategoryId = resolveOpenCategoryId(panel, option);

      const reopenedName = channel.name.startsWith("closed-")
        ? `ticket-${channel.name.replace(/^closed-/, "")}`
        : `ticket-${channel.name.replace(/^ticket-/, "")}`;

      const supportRoleIds = getSupportRoleIds(panel, option);

      const permissionOverwrites = [
        {
          id: guildObj.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ];

      if (ticket.ownerId) {
        permissionOverwrites.push({
          id: ticket.ownerId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        });
      }

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

      const reopenedChannel = await guildObj.channels.create({
        name: reopenedName,
        type: ChannelType.GuildText,
        parent: openCategoryId || null,
        topic: `🎫 Ticket • Open 🟢 • <@${ticket.ownerId}>`,
        permissionOverwrites,
      });

      await Ticket.updateOne(
        { channelId: channel.id },
        {
          $set: {
            status: "archived",
            archivedChannelId: channel.id,
          },
        }
      );

      await Ticket.findOneAndUpdate(
        { channelId: reopenedChannel.id },
        {
          guildId: guild.id,
          channelId: reopenedChannel.id,
          ownerId: ticket.ownerId,
          panelId: ticket.panelId,
          optionId: ticket.optionId,
          status: "open",
          claimedBy: ticket.claimedBy,
          closedAt: null,
          reopenedFromChannelId: channel.id,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      // archive old ticket visually
      if (interaction.message?.editable) {
        await updateTicketEmbedStatusFromMessage(interaction.message, "closed");
        await interaction.message.edit({
          components: [],
        });
      }

      const reopenedEmbed = buildReopenedTicketEmbedFromExisting(
        interaction.message,
        ticket.ownerId,
        option?.label || "Support"
      );

      await reopenedChannel.send({
        embeds: [reopenedEmbed],
        components: buildActionRows(panel, "open", ticket.claimedBy),
      });

      await reopenedChannel.send(
        `🟢 Ticket reopened by ${user}.\n📦 Previous closed ticket archive: ${channel}`
      );

      await interaction.editReply({
        content: `✅ Ticket reopened successfully: ${reopenedChannel}`,
      });

      const logEmbed = new EmbedBuilder()
        .setTitle("🟢 Ticket Reopened")
        .addFields(
          { name: "Old Ticket", value: `${channel}`, inline: true },
          { name: "New Ticket", value: `${reopenedChannel}`, inline: true },
          { name: "Reopened By", value: `${user}`, inline: true }
        )
        .setColor("#57F287")
        .setTimestamp();

      sendTicketLog(guildObj, panel, logEmbed).catch((err) => {
        console.error("[Kyro Tickets] Reopen log failed:", err.message);
      });

      return;
    } catch (error) {
      console.error("[Kyro Tickets] Reopen ticket error:", error);

      return interaction.editReply({
        content: `❌ Failed to reopen ticket. ${error.message}`,
      });
    }
  }

  // DELETE
  if (interaction.customId === "ticket_delete") {
    if (!staffAllowed) {
      return interaction.reply({
        content: "❌ Only ticket staff can delete tickets.",
        flags: EPHEMERAL_FLAGS,
      });
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAGS });

    try {
      await Ticket.updateOne(
        { channelId: channel.id },
        {
          $set: {
            status: "archived",
            archivedChannelId: channel.id,
          },
        }
      ).catch(() => {});

      const logEmbed = new EmbedBuilder()
        .setTitle("🗑 Ticket Deleted")
        .addFields(
          { name: "Ticket", value: `${channel.name}`, inline: true },
          { name: "Deleted By", value: `${user}`, inline: true }
        )
        .setColor("#ED4245")
        .setTimestamp();

      sendTicketLog(guild, panel, logEmbed).catch((err) => {
        console.error("[Kyro Tickets] Delete log failed:", err.message);
      });

      await interaction.editReply({
        content: "🗑 Ticket will be deleted in 3 seconds...",
      });

      setTimeout(async () => {
        try {
          await channel.delete("Kyro ticket deleted by staff");
        } catch (error) {
          console.error("[Kyro Tickets] Failed to delete ticket:", error.message);
        }
      }, 3000);
    } catch (error) {
      console.error("[Kyro Tickets] Delete ticket error:", error);

      return interaction.editReply({
        content: "❌ Failed to delete ticket.",
      });
    }
  }
};