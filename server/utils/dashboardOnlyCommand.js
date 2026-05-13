const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

function buildDashboardUrl(guildId, page = "dashboard") {
  const baseUrl =
    process.env.KYRO_DASHBOARD_URL || "http://localhost:5173";

  return `${baseUrl}/#/${page}?guild=${guildId}`;
}

async function sendDashboardOnlyNotice(interaction, options = {}) {
  const {
    featureName = "This feature",
    page = "dashboard",
    description = "This setup has moved to the Kyro Dashboard for easier configuration.",
  } = options;

  const dashboardUrl = buildDashboardUrl(interaction.guildId, page);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Moved to Kyro Dashboard")
    .setDescription(
      `**${featureName}** is now managed from the Kyro Dashboard.\n\n${description}`
    )
    .addFields({
      name: "Why?",
      value:
        "The dashboard gives a safer, cleaner, and more advanced setup experience.",
    })
    .setFooter({ text: "Kyro Dashboard • Recommended setup method" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Open Dashboard")
      .setStyle(ButtonStyle.Link)
      .setURL(dashboardUrl)
  );

  const payload = {
    embeds: [embed],
    components: [row],
    ephemeral: true,
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

module.exports = {
  sendDashboardOnlyNotice,
  buildDashboardUrl,
};