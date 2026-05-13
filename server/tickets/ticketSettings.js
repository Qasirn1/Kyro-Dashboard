const GuildConfig = require("../models/GuildConfig");

/*
Get ticket settings from Mongo
*/
async function getTicketSettings(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();

    return config?.tickets || null;
  } catch (error) {
    console.error("getTicketSettings error:", error);
    return null;
  }
}

/*
Save ticket settings to Mongo
*/
async function saveTicketSettings(guildId, settings) {
  try {
    const payload = {
      title: settings.title || "🎫 Support Tickets",
      description:
        settings.description ||
        "Click the button below to open a ticket.",
      footer: settings.footer || "Kyro Ticket System",
      bannerUrl: settings.bannerUrl || "",
      buttonLabel: settings.buttonLabel || "Create Ticket",
      buttonEmoji: settings.buttonEmoji || "📩",
    };

    await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          guildId,
          "tickets.panel": payload,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return payload;
  } catch (error) {
    console.error("saveTicketSettings error:", error);
    return null;
  }
}

module.exports = {
  getTicketSettings,
  saveTicketSettings,
};