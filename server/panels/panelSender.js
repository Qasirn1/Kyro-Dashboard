const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

async function sendPanel(client, guildId, panel) {

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error("Panel Error: Guild not found");
    return;
  }

  const channel = guild.channels.cache.get(panel.channelId);
  if (!channel) {
    console.error("Panel Error: Channel not found");
    return;
  }

  const embeds = [];

  for (const e of panel.embeds) {

    const embed = new EmbedBuilder()
      .setColor(e.color || "#2b2d31")
      .setTitle(e.title || "")
      .setDescription(e.description || "");

    if (e.banner) embed.setImage(e.banner);
    if (e.thumbnail) embed.setThumbnail(e.thumbnail);

    if (e.footer) {
      embed.setFooter({ text: e.footer });
    }

    embeds.push(embed);

  }

  const rows = [];
  const buttonsByRow = {};

  for (const btn of panel.buttons) {

    const button = new ButtonBuilder()
      .setLabel(btn.label)
      .setStyle(ButtonStyle[btn.style] || ButtonStyle.Primary);

    if (btn.emoji) {
      button.setEmoji(btn.emoji);
    }

    if (btn.disabled) {
      button.setDisabled(true);
    }

    if (btn.type === "link") {

      button.setStyle(ButtonStyle.Link);
      button.setURL(btn.url);

    } else {

      button.setCustomId(btn.id);

    }

    const rowIndex = btn.row ?? 0;

    if (!buttonsByRow[rowIndex]) {
      buttonsByRow[rowIndex] = [];
    }

    buttonsByRow[rowIndex].push(button);

  }

  for (const rowIndex of Object.keys(buttonsByRow)) {

    const rowButtons = buttonsByRow[rowIndex];

    for (let i = 0; i < rowButtons.length; i += 5) {

      const row = new ActionRowBuilder().addComponents(
        rowButtons.slice(i, i + 5)
      );

      rows.push(row);

    }

  }

  const message = await channel.send({
    embeds,
    components: rows
  });

  return message.id;

}

module.exports = { sendPanel };