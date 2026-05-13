const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

function resolveButtonStyle(style) {
  const styles = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
  };

  return styles[style] || ButtonStyle.Secondary;
}

function safeParseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeEmbedsFromJSON(parsed) {
  if (!parsed) return [];

  if (Array.isArray(parsed.embeds)) {
    return parsed.embeds;
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed.embed && typeof parsed.embed === "object") {
    return [parsed.embed];
  }

  if (parsed.data && Array.isArray(parsed.data.embeds)) {
    return parsed.data.embeds;
  }

  return [];
}

function buildBuilderEmbed(config = {}) {
  const panel = config.panel || {};

  const embed = new EmbedBuilder()
    .setTitle(panel.title || "Verification Required")
    .setDescription(
      panel.description ||
        "Click the button below to verify and access the server."
    )
    .setColor(panel.color || "#5865F2");

  if (panel.image) {
    embed.setImage(panel.image);
  }

  if (panel.thumbnail) {
    embed.setThumbnail(panel.thumbnail);
  }

  if (panel.footer) {
    embed.setFooter({ text: panel.footer });
  }

  return embed;
}

function buildJSONEmbeds(config = {}) {
  const raw = config?.jsonPanel?.raw;
  if (!raw || typeof raw !== "string") return [];

  const parsed = safeParseJSON(raw);
  if (!parsed) return [];

  const embedObjects = normalizeEmbedsFromJSON(parsed);
  if (!embedObjects.length) return [];

  const validEmbeds = [];

  for (const embedData of embedObjects.slice(0, 10)) {
    try {
      const embed = EmbedBuilder.from(embedData);
      validEmbeds.push(embed);
    } catch (error) {
      console.error("Invalid verification JSON embed:", error);
    }
  }

  return validEmbeds;
}

function buildVerificationButton(config = {}) {
  const button = config.button || {};

  const verifyButton = new ButtonBuilder()
    // Always keep this fixed so bot interaction handler always matches
    .setCustomId("kyro_verify")
    .setLabel(button.label || "Verify")
    .setStyle(resolveButtonStyle(button.style || "Secondary"));

  if (button.emoji) {
    try {
      verifyButton.setEmoji(button.emoji);
    } catch (error) {
      console.error("Invalid verification button emoji:", error);
    }
  }

  return new ActionRowBuilder().addComponents(verifyButton);
}

function buildVerificationPanel(config = {}) {
  let embeds = [];

  if (config.panelMode === "json" && config?.jsonPanel?.enabled) {
    embeds = buildJSONEmbeds(config);
  }

  if (!embeds.length) {
    embeds = [buildBuilderEmbed(config)];
  }

  const row = buildVerificationButton(config);

  return {
    embeds,
    components: [row],
  };
}

module.exports = {
  buildVerificationPanel,
  buildBuilderEmbed,
  buildJSONEmbeds,
  buildVerificationButton,
};