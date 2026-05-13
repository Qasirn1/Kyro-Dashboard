const {
  getUserOwnedTempChannel,
  getTempVoiceChannel,
  transferTempVoiceOwnership,
  updateTempVoiceChannel,
} = require("../core/tempVoiceData");

const {
  showRenameModal,
  showLimitModal,
  showStatusModal,
  showGameModal,
  showLfmModal,
} = require("./tempVoiceModals");

const {
  showPermitUserMenu,
  showRejectUserMenu,
  showInviteUserMenu,
} = require("./tempVoicePermissions");

async function handleTempVoiceActions(interaction) {
  if (!interaction.isStringSelectMenu()) return false;

  if (
    interaction.customId !== "tempvoice_settings_menu" &&
    interaction.customId !== "tempvoice_permissions_menu"
  ) {
    return false;
  }

  const guild = interaction.guild;
  const user = interaction.user;

  if (!guild) return false;

  const action = interaction.values[0];

  // ───────── CLAIM OWNERSHIP ─────────
  if (action === "claim") {
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member || !member.voice?.channelId) {
      await interaction.reply({
        content: "❌ You must be inside a temporary voice channel to claim ownership.",
        ephemeral: true,
      });
      return true;
    }

    const channel = guild.channels.cache.get(member.voice.channelId);

    if (!channel) {
      await interaction.reply({
        content: "❌ Your voice channel could not be found.",
        ephemeral: true,
      });
      return true;
    }

    const tempChannelData = await getTempVoiceChannel(guild.id, channel.id);

    if (!tempChannelData) {
      await interaction.reply({
        content: "❌ You are not inside a temporary voice channel.",
        ephemeral: true,
      });
      return true;
    }

    if (tempChannelData.ownerId === user.id) {
      await interaction.reply({
        content: "❌ You already own this temporary voice channel.",
        ephemeral: true,
      });
      return true;
    }

    const currentOwner = await guild.members
      .fetch(tempChannelData.ownerId)
      .catch(() => null);
    const ownerStillInside = currentOwner?.voice?.channelId === channel.id;

    if (ownerStillInside) {
      await interaction.reply({
        content: "❌ You cannot claim this room while the current owner is still inside.",
        ephemeral: true,
      });
      return true;
    }

    await transferTempVoiceOwnership(guild.id, channel.id, user.id);

    await interaction.reply({
      content: "👑 You have successfully claimed ownership of this temporary voice channel.",
      ephemeral: true,
    });

    return true;
  }

  // from here onward, user must own a temp room
  const userRoom = await getUserOwnedTempChannel(guild.id, user.id);

  if (!userRoom) {
    await interaction.reply({
      content: "❌ You do not own a temporary voice channel.",
      ephemeral: true,
    });
    return true;
  }

  const channel = guild.channels.cache.get(userRoom.channelId);

  if (!channel) {
    await interaction.reply({
      content: "❌ Your temporary voice channel could not be found.",
      ephemeral: true,
    });
    return true;
  }

  if (action === "rename") {
    await showRenameModal(interaction);
    return true;
  }

  if (action === "limit") {
    await showLimitModal(interaction);
    return true;
  }

  if (action === "status") {
    await showStatusModal(interaction);
    return true;
  }

  if (action === "game") {
    await showGameModal(interaction);
    return true;
  }

  if (action === "lfm") {
    await showLfmModal(interaction);
    return true;
  }

  if (action === "lock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      Connect: false,
    });

    await updateTempVoiceChannel(guild.id, channel.id, {
      locked: true,
    });

    await interaction.reply({
      content: "🔒 Your voice channel has been locked.",
      ephemeral: true,
    });

    return true;
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      Connect: true,
    });

    await updateTempVoiceChannel(guild.id, channel.id, {
      locked: false,
    });

    await interaction.reply({
      content: "🔓 Your voice channel has been unlocked.",
      ephemeral: true,
    });

    return true;
  }

  if (action === "hide") {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: false,
    });

    await updateTempVoiceChannel(guild.id, channel.id, {
      hidden: true,
    });

    await interaction.reply({
      content: "🙈 Your voice channel has been hidden.",
      ephemeral: true,
    });

    return true;
  }

  if (action === "unhide") {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: true,
    });

    await updateTempVoiceChannel(guild.id, channel.id, {
      hidden: false,
    });

    await interaction.reply({
      content: "👀 Your voice channel is now visible again.",
      ephemeral: true,
    });

    return true;
  }

  if (action === "permit") {
    await showPermitUserMenu(interaction);
    return true;
  }

  if (action === "reject") {
    await showRejectUserMenu(interaction);
    return true;
  }

  if (action === "invite") {
    await showInviteUserMenu(interaction);
    return true;
  }

  return false;
}

module.exports = {
  handleTempVoiceActions,
};