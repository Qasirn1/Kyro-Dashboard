const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

function buildTempVoicePanelEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎙️ Temporary Voice Interface")
    .setDescription(
      [
        "**Use the dropdown menus below to control your temporary voice channel.**",
        "",
        "You must own an active temporary voice room to use these controls.",
        "",
        "**Channel Settings Menu**",
        "• Rename your room",
        "• Change user limit",
        "• Set status / game / LFM",
        "• Claim ownership if owner left",
        "",
        "**Channel Permissions Menu**",
        "• Lock / Unlock channel",
        "• Hide / Unhide channel",
        "• Permit user access",
        "• Reject user access",
        "• Invite user access",
        "",
    
      ].join("\n")
    )
}

function buildTempVoiceSettingsMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("tempvoice_settings_menu")
      .setPlaceholder("Change channel settings")
      .addOptions([
        {
          label: "Rename",
          description: "Change your temporary voice channel name.",
          value: "rename",
          emoji: "📝"
        },
        {
          label: "Limit",
          description: "Change your temporary voice channel user limit.",
          value: "limit",
          emoji: "👥"
        },
        {
          label: "Status",
          description: "Set a custom room status.",
          value: "status",
          emoji: "💬"
        },
        {
          label: "Game",
          description: "Set room name from your game.",
          value: "game",
          emoji: "🎮"
        },
        {
          label: "LFM",
          description: "Looking for members status.",
          value: "lfm",
          emoji: "📣"
        },
        {
          label: "Claim Ownership",
          description: "Claim this room if the owner has left.",
          value: "claim",
          emoji: "👑"
        }
      ])
  );
}

function buildTempVoicePermissionsMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("tempvoice_permissions_menu")
      .setPlaceholder("Change channel permissions")
      .addOptions([
        {
          label: "Lock",
          description: "Lock your temporary voice channel.",
          value: "lock",
          emoji: "🔒"
        },
        {
          label: "Unlock",
          description: "Unlock your temporary voice channel.",
          value: "unlock",
          emoji: "🔓"
        },
        {
          label: "Hide",
          description: "Hide your temporary voice channel.",
          value: "hide",
          emoji: "🙈"
        },
        {
          label: "Unhide",
          description: "Unhide your temporary voice channel.",
          value: "unhide",
          emoji: "👀"
        },
        {
          label: "Permit",
          description: "Allow a user to access your room.",
          value: "permit",
          emoji: "✅"
        },
        {
          label: "Reject",
          description: "Block a user from accessing your room.",
          value: "reject",
          emoji: "⛔"
        },
        {
          label: "Invite",
          description: "Invite a user to your room.",
          value: "invite",
          emoji: "📨"
        }
      ])
  );
}

function buildTempVoicePanelComponents() {
  return [
    buildTempVoiceSettingsMenu(),
    buildTempVoicePermissionsMenu()
  ];
}

module.exports = {
  buildTempVoicePanelEmbed,
  buildTempVoicePanelComponents
};