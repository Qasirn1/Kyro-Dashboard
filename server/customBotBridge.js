const { Events } = require("discord.js");

const handleSelfRoles = require("./customBotHandlers/selfRolesHandler");
const handleTickets = require("./customBotHandlers/ticketsHandler");
const handleGiveaways = require("./customBotHandlers/giveawaysHandler");
const handleEmbedBuilder = require("./customBotHandlers/embedBuilderHandler");
const handleTempVoice = require("./customBotHandlers/tempVoiceHandler");

function registerCustomBotBridge(client) {
  console.log(`🌉 Registering custom bot bridge for ${client.user?.tag}`);

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      await handleSelfRoles(interaction, client);
      await handleTickets(interaction, client);
      await handleGiveaways(interaction, client);
      await handleEmbedBuilder(interaction, client);
      await handleTempVoice(interaction, client);
    } catch (err) {
      console.error(`❌ Custom bot bridge error (${client.user?.tag}):`, err);
    }
  });
}

module.exports = {
  registerCustomBotBridge,
};