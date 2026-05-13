const { getGuildVerification } = require("./verificationStorage");
const { giveVerifiedRole } = require("./verificationManager");

function normalizeEmojiToComparable(emoji) {
  if (!emoji) return null;

  if (typeof emoji === "string") {
    return emoji.trim();
  }

  if (typeof emoji === "object") {
    if (emoji.identifier) return String(emoji.identifier).trim();
    if (emoji.id && emoji.name) {
      return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
    }
    if (emoji.id) return String(emoji.id).trim();
    if (emoji.name) return String(emoji.name).trim();
  }

  return null;
}

function getReactionComparable(reaction) {
  const reactionEmoji = reaction?.emoji;
  if (!reactionEmoji) return null;

  if (reactionEmoji.id && reactionEmoji.name) {
    return `<${reactionEmoji.animated ? "a" : ""}:${reactionEmoji.name}:${reactionEmoji.id}>`;
  }

  if (reactionEmoji.id) return String(reactionEmoji.id).trim();
  if (reactionEmoji.name) return String(reactionEmoji.name).trim();

  return null;
}

function pickReactionPanel(config, reaction) {
  if (!config?.panels || !Array.isArray(config.panels)) return null;

  const messageId = reaction?.message?.id;
  const channelId = reaction?.message?.channelId || reaction?.message?.channel?.id;

  if (!messageId || !channelId) return null;

  return (
    config.panels.find(
      (panel) =>
        panel?.enabled !== false &&
        panel?.mode === "reaction" &&
        panel?.sentPanel?.messageId === messageId &&
        panel?.sentPanel?.channelId === channelId
    ) || null
  );
}

async function handleVerificationReactionAdd(reaction, user) {
  try {
    if (!reaction || !user) return false;
    if (user.bot) return false;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return false;
      }
    }

    const message = reaction.message;
    if (!message?.guild) return false;

    const guild = message.guild;
    const member =
      message.guild.members.cache.get(user.id) ||
      (await message.guild.members.fetch(user.id).catch(() => null));

    if (!member) return false;

    const config = await getGuildVerification(guild.id);
    if (!config || config.enabled === false) return false;

    const panel = pickReactionPanel(config, reaction);
    if (!panel) return false;

    const configuredEmoji = normalizeEmojiToComparable(
      panel?.interaction?.reaction?.emoji || "✅"
    );
    const reactedEmoji = getReactionComparable(reaction);

    if (!configuredEmoji || !reactedEmoji) return false;

    const emojiMatched =
      configuredEmoji === reactedEmoji ||
      String(configuredEmoji) === String(reaction.emoji?.id || "") ||
      String(configuredEmoji) === String(reaction.emoji?.name || "");

    if (!emojiMatched) return false;

    const result = await giveVerifiedRole(member, {
      ...config,
      activePanel: panel,
      mode: panel.mode,
      roleId: panel.roleId,
      logChannelId: panel.logChannelId,
      settings: {
        ...(config.settings || {}),
        ...(panel.settings || {}),
      },
    });

    try {
      await member.send(result.message).catch(() => {});
    } catch {}

    return true;
  } catch (error) {
    console.error("Verification reaction add handler error:", error);
    return false;
  }
}

module.exports = {
  handleVerificationReactionAdd,
};