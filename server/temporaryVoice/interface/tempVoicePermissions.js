const {
  ActionRowBuilder,
  UserSelectMenuBuilder
} = require("discord.js");

const { getUserOwnedTempChannel } = require("../core/tempVoiceData");

async function showPermitUserMenu(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("tempvoice_permit_user_select")
      .setPlaceholder("Select a user to permit")
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply({
    content: "✅ Select a user to permit into your temporary voice channel.",
    components: [row],
    ephemeral: true
  });
}

async function showRejectUserMenu(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("tempvoice_reject_user_select")
      .setPlaceholder("Select a user to reject")
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply({
    content: "⛔ Select a user to reject from your temporary voice channel.",
    components: [row],
    ephemeral: true
  });
}

async function showInviteUserMenu(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("tempvoice_invite_user_select")
      .setPlaceholder("Select a user to invite")
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.reply({
    content: "📨 Select a user to invite to your temporary voice channel.",
    components: [row],
    ephemeral: true
  });
}

async function handleTempVoicePermissionSelect(interaction) {
  if (!interaction.isUserSelectMenu()) return false;

  const allowedIds = [
    "tempvoice_permit_user_select",
    "tempvoice_reject_user_select",
    "tempvoice_invite_user_select"
  ];

  if (!allowedIds.includes(interaction.customId)) return false;

  const guild = interaction.guild;
  const user = interaction.user;

  if (!guild) return false;

  const userRoom = await getUserOwnedTempChannel(guild.id, user.id);

  if (!userRoom) {
    await interaction.reply({
      content: "❌ You do not own a temporary voice channel.",
      ephemeral: true
    });
    return true;
  }

  const channel = guild.channels.cache.get(userRoom.channelId);

  if (!channel) {
    await interaction.reply({
      content: "❌ Your temporary voice channel could not be found.",
      ephemeral: true
    });
    return true;
  }

  const targetUserId = interaction.values[0];

  if (!targetUserId) {
    await interaction.reply({
      content: "❌ No user was selected.",
      ephemeral: true
    });
    return true;
  }

  if (targetUserId === user.id) {
    await interaction.reply({
      content: "❌ You cannot use this action on yourself.",
      ephemeral: true
    });
    return true;
  }

  const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

  if (!targetMember) {
    await interaction.reply({
      content: "❌ That user could not be found.",
      ephemeral: true
    });
    return true;
  }

  // ───────── PERMIT ─────────
  if (
    interaction.customId === "tempvoice_permit_user_select" ||
    interaction.customId === "tempvoice_invite_user_select"
  ) {
    try {
      await channel.permissionOverwrites.edit(targetUserId, {
        ViewChannel: true,
        Connect: true,
        Speak: true
      });

      const isInvite = interaction.customId === "tempvoice_invite_user_select";

      await interaction.update({
        content: isInvite
          ? `📨 <@${targetUserId}> has been invited to your temporary voice channel.`
          : `✅ <@${targetUserId}> has been permitted to join your temporary voice channel.`,
        components: []
      });
    } catch (error) {
      console.error("Temporary Voice permit/invite error:", error);

      await interaction.update({
        content: "❌ Failed to update channel permissions.",
        components: []
      });
    }

    return true;
  }

  // ───────── REJECT ─────────
  if (interaction.customId === "tempvoice_reject_user_select") {
    try {
      await channel.permissionOverwrites.edit(targetUserId, {
        ViewChannel: false,
        Connect: false
      });

      if (targetMember.voice?.channelId === channel.id) {
        await targetMember.voice.disconnect("Rejected from Temporary Voice channel").catch(() => {});
      }

      await interaction.update({
        content: `⛔ <@${targetUserId}> has been rejected from your temporary voice channel.`,
        components: []
      });
    } catch (error) {
      console.error("Temporary Voice reject error:", error);

      await interaction.update({
        content: "❌ Failed to reject that user from your channel.",
        components: []
      });
    }

    return true;
  }

  return false;
}

module.exports = {
  showPermitUserMenu,
  showRejectUserMenu,
  showInviteUserMenu,
  handleTempVoicePermissionSelect
};