const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function renderButtons(panel) {

  const buttons = panel.roles.map(r => {

    const btn = new ButtonBuilder()
      .setCustomId(`kyro_role_${r.roleId}`)
      .setLabel(r.label)
      .setStyle(ButtonStyle[panel.style] || ButtonStyle.Secondary);

    if (r.emoji) btn.setEmoji(r.emoji);

    return btn;

  });

  const rows = [];

  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  return rows;
}

module.exports = { renderButtons };