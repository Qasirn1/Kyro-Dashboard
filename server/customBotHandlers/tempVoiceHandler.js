const botMongoose = require("mongoose");

const {
  handleTempVoiceActions,
} = require("../temporaryVoice/interface/tempVoiceActions.js");

const {
  handleTempVoiceModal,
} = require("../temporaryVoice/interface/tempVoiceModals.js");

let botMongoConnecting = null;

async function ensureBotMongoConnected() {
  if (botMongoose.connection.readyState === 1) return;

  if (!botMongoConnecting) {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL;

    if (!mongoUri) {
      throw new Error(
        "MongoDB URI missing. Add MONGODB_URI or MONGO_URI to kyro-dashboard/server/.env"
      );
    }

    botMongoConnecting = botMongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
  }

  await botMongoConnecting;
}

module.exports = async function handleTempVoice(interaction) {
  try {
    if (!interaction.isStringSelectMenu() && !interaction.isModalSubmit()) {
      return false;
    }

    const customId = interaction.customId || "";

    const isTempVoiceInteraction =
      customId === "tempvoice_settings_menu" ||
      customId === "tempvoice_permissions_menu" ||
      customId === "tempvoice_rename_modal" ||
      customId === "tempvoice_limit_modal" ||
      customId === "tempvoice_status_modal" ||
      customId === "tempvoice_game_modal" ||
      customId === "tempvoice_lfm_modal";

    if (!isTempVoiceInteraction) return false;

    await ensureBotMongoConnected();

    const handledAction = await handleTempVoiceActions(interaction);
    if (handledAction) return true;

    const handledModal = await handleTempVoiceModal(interaction);
    if (handledModal) return true;

    return false;
  } catch (error) {
    console.error("[CustomBot TempVoice] Handler error:", error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Something went wrong while handling Temporary Voice.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: "❌ Something went wrong while handling Temporary Voice.",
          ephemeral: true,
        });
      }
    } catch {}

    return true;
  }
};