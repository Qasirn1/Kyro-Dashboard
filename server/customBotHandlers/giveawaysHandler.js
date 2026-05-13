const botMongoose = require("mongoose");

const { handleGiveawayButton } = require("../giveaways/giveawayButtons.js");

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

module.exports = async function handleGiveaways(interaction) {
  try {
    if (!interaction.isButton()) return false;

    const customId = interaction.customId || "";

    const isGiveawayInteraction =
      customId.startsWith("giveaway_join_") ||
      customId.startsWith("giveaway_leave_") ||
      customId.startsWith("giveaway_participants_");

    if (!isGiveawayInteraction) return false;

    await ensureBotMongoConnected();

    return await handleGiveawayButton(interaction);
  } catch (error) {
    console.error("[CustomBot Giveaways] Handler error:", error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Something went wrong while handling this giveaway.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: "❌ Something went wrong while handling this giveaway.",
          ephemeral: true,
        });
      }
    } catch {}

    return true;
  }
};