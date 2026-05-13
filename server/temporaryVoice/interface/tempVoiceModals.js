const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

const {
  getUserOwnedTempChannel,
  updateTempVoiceChannel,
} = require("../core/tempVoiceData");

function buildSingleInputModal({
  customId,
  title,
  inputId,
  label,
  placeholder,
  maxLength = 80,
}) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(maxLength)
    .setPlaceholder(placeholder)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  return modal;
}

async function showRenameModal(interaction) {
  const modal = buildSingleInputModal({
    customId: "tempvoice_rename_modal",
    title: "Rename Temporary Voice",
    inputId: "channel_name",
    label: "New channel name",
    placeholder: "Enter a new voice channel name",
    maxLength: 100,
  });

  await interaction.showModal(modal);
}

async function showLimitModal(interaction) {
  const modal = buildSingleInputModal({
    customId: "tempvoice_limit_modal",
    title: "Set Temporary Voice Limit",
    inputId: "channel_limit",
    label: "User limit (0 to 99)",
    placeholder: "Example: 5",
    maxLength: 2,
  });

  await interaction.showModal(modal);
}

async function showStatusModal(interaction) {
  const modal = buildSingleInputModal({
    customId: "tempvoice_status_modal",
    title: "Set Voice Status",
    inputId: "channel_status",
    label: "Status text",
    placeholder: "Example: Chill Room / Music / Ranked",
    maxLength: 80,
  });

  await interaction.showModal(modal);
}

async function showGameModal(interaction) {
  const modal = buildSingleInputModal({
    customId: "tempvoice_game_modal",
    title: "Set Game Name",
    inputId: "channel_game",
    label: "Game name",
    placeholder: "Example: Valorant / Fortnite / Minecraft",
    maxLength: 80,
  });

  await interaction.showModal(modal);
}

async function showLfmModal(interaction) {
  const modal = buildSingleInputModal({
    customId: "tempvoice_lfm_modal",
    title: "Looking For Members",
    inputId: "channel_lfm",
    label: "LFM text",
    placeholder: "Example: Need 2 for ranked / Need 1 support",
    maxLength: 80,
  });

  await interaction.showModal(modal);
}

async function handleTempVoiceModal(interaction) {
  if (!interaction.isModalSubmit()) return false;

  const allowedModalIds = [
    "tempvoice_rename_modal",
    "tempvoice_limit_modal",
    "tempvoice_status_modal",
    "tempvoice_game_modal",
    "tempvoice_lfm_modal",
  ];

  if (!allowedModalIds.includes(interaction.customId)) return false;

  const guild = interaction.guild;
  const user = interaction.user;

  if (!guild) return false;

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

  try {
    // ───────── RENAME ─────────
    if (interaction.customId === "tempvoice_rename_modal") {
      const newName = interaction.fields.getTextInputValue("channel_name").trim();

      if (!newName) {
        await interaction.reply({
          content: "❌ Channel name cannot be empty.",
          ephemeral: true,
        });
        return true;
      }

      await channel.setName(newName, `Temporary Voice rename by ${user.tag}`);

      await updateTempVoiceChannel(guild.id, channel.id, {
        name: newName,
      });

      await interaction.reply({
        content: `✅ Your voice channel has been renamed to **${newName}**.`,
        ephemeral: true,
      });

      return true;
    }

    // ───────── LIMIT ─────────
    if (interaction.customId === "tempvoice_limit_modal") {
      const rawLimit = interaction.fields.getTextInputValue("channel_limit").trim();
      const limit = Number(rawLimit);

      if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
        await interaction.reply({
          content: "❌ Please enter a valid number between 0 and 99.",
          ephemeral: true,
        });
        return true;
      }

      await channel.setUserLimit(limit, `Temporary Voice limit changed by ${user.tag}`);

      await updateTempVoiceChannel(guild.id, channel.id, {
  userLimit: limit,
});

      await interaction.reply({
        content: `✅ Your voice channel user limit has been set to **${limit}**.`,
        ephemeral: true,
      });

      return true;
    }

    // ───────── STATUS ─────────
    if (interaction.customId === "tempvoice_status_modal") {
      const status = interaction.fields.getTextInputValue("channel_status").trim();

      if (!status) {
        await interaction.reply({
          content: "❌ Status cannot be empty.",
          ephemeral: true,
        });
        return true;
      }

      const newName = `💬 ${status}`.slice(0, 100);

      await channel.setName(newName, `Temporary Voice status changed by ${user.tag}`);

      await updateTempVoiceChannel(guild.id, channel.id, {
        name: newName,
        status,
      });

      await interaction.reply({
        content: `✅ Your voice channel status has been updated to **${newName}**.`,
        ephemeral: true,
      });

      return true;
    }

    // ───────── GAME ─────────
    if (interaction.customId === "tempvoice_game_modal") {
      const game = interaction.fields.getTextInputValue("channel_game").trim();

      if (!game) {
        await interaction.reply({
          content: "❌ Game name cannot be empty.",
          ephemeral: true,
        });
        return true;
      }

      const newName = `🎮 ${game}`.slice(0, 100);

      await channel.setName(newName, `Temporary Voice game changed by ${user.tag}`);

      await updateTempVoiceChannel(guild.id, channel.id, {
        name: newName,
        game,
      });

      await interaction.reply({
        content: `✅ Your voice channel game has been updated to **${newName}**.`,
        ephemeral: true,
      });

      return true;
    }

    // ───────── LFM ─────────
    if (interaction.customId === "tempvoice_lfm_modal") {
      const lfmText = interaction.fields.getTextInputValue("channel_lfm").trim();

      if (!lfmText) {
        await interaction.reply({
          content: "❌ LFM text cannot be empty.",
          ephemeral: true,
        });
        return true;
      }

      const newName = `📣 ${lfmText}`.slice(0, 100);

      await channel.setName(newName, `Temporary Voice LFM changed by ${user.tag}`);

      await updateTempVoiceChannel(guild.id, channel.id, {
        name: newName,
        lfm: lfmText,
      });

      await interaction.reply({
        content: `✅ Your voice channel LFM has been updated to **${newName}**.`,
        ephemeral: true,
      });

      return true;
    }
  } catch (error) {
    console.error("Temporary Voice modal error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Something went wrong while updating your temporary voice channel.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    return true;
  }

  return false;
}

module.exports = {
  showRenameModal,
  showLimitModal,
  showStatusModal,
  showGameModal,
  showLfmModal,
  handleTempVoiceModal,
};