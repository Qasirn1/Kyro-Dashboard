const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

function toDiscordComponentEmoji(emoji) {
  if (!emoji) return undefined;

  if (emoji.type === "unicode") {
    return emoji.value;
  }

  if (emoji.type === "custom") {
    return {
      id: emoji.id,
      name: emoji.name || null,
      animated: Boolean(emoji.animated)
    };
  }

  return undefined;
}

function buildButtonRows(panel) {
  const options = panel.options || [];

  if (!options.length) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("kyro_role_placeholder")
          .setLabel("Add roles with /roles-add")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      )
    ];
  }

  const buttons = options.slice(0, 25).map((option) => {
    const button = new ButtonBuilder()
      .setCustomId(`kyro_role_${option.roleId}`)
      .setLabel(option.label || "Role")
      .setStyle(ButtonStyle[panel.buttonStyle] || ButtonStyle.Secondary);

    const parsedEmoji = toDiscordComponentEmoji(option.emoji);
    if (parsedEmoji) {
      button.setEmoji(parsedEmoji);
    }

    return button;
  });

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  return rows;
}

function buildDropdownRows(panel) {
  const options = panel.options || [];

  if (!options.length) {
    return [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`kyro_dropdown_placeholder_${panel.id}`)
          .setPlaceholder("Add dropdown roles with /roles-add")
          .setMinValues(1)
          .setMaxValues(1)
          .setDisabled(true)
          .addOptions([
            {
              label: "Setup roles first",
              value: "placeholder_setup_roles"
            }
          ])
      )
    ];
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`kyro_dropdown_${panel.messageId}`)
    .setPlaceholder("Select your roles")
    .setMinValues(1)
    .setMaxValues(panel.selectionMode === "single" ? 1 : Math.min(options.length, 25))
    .addOptions(
      options.slice(0, 25).map((option) => {
        const entry = {
          label: option.label || "Role",
          value: option.roleId
        };

        const parsedEmoji = toDiscordComponentEmoji(option.emoji);
        if (parsedEmoji) {
          entry.emoji = parsedEmoji;
        }

        return entry;
      })
    );

  return [new ActionRowBuilder().addComponents(menu)];
}

async function clearAllReactions(message) {
  try {
    await message.reactions.removeAll();
  } catch {
    // ignore reaction cleanup errors
  }
}

async function syncReactionPanel(message, panel) {
  for (const option of panel.options || []) {
    if (!option.emoji) continue;

    try {
      if (option.emoji.type === "unicode" && option.emoji.value) {
        await message.react(option.emoji.value);
      } else if (option.emoji.type === "custom" && option.emoji.id) {
        await message.react(option.emoji.id);
      }
    } catch {
      // ignore individual reaction failures
    }
  }
}

async function renderPanelMessage(message, panel, previousType = null) {
  if (!message || !panel) return;

  // If old type was reactions, clear them first
  if (previousType === "reactions" || panel.type !== "reactions") {
    await clearAllReactions(message);
  }

  if (panel.type === "buttons") {
    const rows = buildButtonRows(panel);

    await message.edit({
      components: rows
    });

    return;
  }

  if (panel.type === "dropdown") {
    const rows = buildDropdownRows(panel);

    await message.edit({
      components: rows
    });

    return;
  }

  if (panel.type === "reactions") {
    await message.edit({
      components: []
    });

    await syncReactionPanel(message, panel);
  }
}

module.exports = {
  toDiscordComponentEmoji,
  buildButtonRows,
  buildDropdownRows,
  clearAllReactions,
  syncReactionPanel,
  renderPanelMessage
};