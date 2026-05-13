const botMongoose = require("mongoose");

const ticketCreate = require("../tickets/ticketCreate.js");
const ticketControls = require("../tickets/ticketControls.js");

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

module.exports = async function handleTickets(interaction) {
  try {
    if (
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isModalSubmit()
    ) {
      return false;
    }

    const customId = interaction.customId || "";

    const isTicketInteraction =
      customId.startsWith("ticket_open:") ||
      customId.startsWith("ticket_select:") ||
      customId.startsWith("ticket_form:") ||
      [
        "ticket_claim",
        "ticket_close",
        "ticket_reopen",
        "ticket_delete",
        "ticket_confirm_close",
        "ticket_cancel_close",
      ].includes(customId);

    if (!isTicketInteraction) return false;

    await ensureBotMongoConnected();

    await ticketCreate(interaction);
    await ticketControls(interaction);

    return true;
  } catch (error) {
    console.error("[CustomBot Tickets] Handler error:", error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Something went wrong while handling this ticket.",
          flags: 64,
        });
      } else {
        await interaction.followUp({
          content: "❌ Something went wrong while handling this ticket.",
          flags: 64,
        });
      }
    } catch {}

    return true;
  }
};