const GuildConfig = require("../models/GuildConfig");

async function fetchSelfRolesConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.selfRoles || null;
  } catch (error) {
    console.error(
      "[CustomBot SelfRoles] Failed to fetch reaction config from Mongo:",
      error.message
    );
    return null;
  }
}

function normalizeReactionEmoji(reaction) {
  return {
    id: reaction.emoji?.id || null,
    name: reaction.emoji?.name || null,
    animated: Boolean(reaction.emoji?.animated),
  };
}

function optionEmojiMatches(optionEmoji, reactionEmoji) {
  if (!optionEmoji || !reactionEmoji) return false;

  if (typeof optionEmoji === "object" && optionEmoji.id) {
    return optionEmoji.id === reactionEmoji.id;
  }

  if (typeof optionEmoji === "string" && optionEmoji.startsWith("<")) {
    const match = optionEmoji.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
    if (!match) return false;
    return match[2] === reactionEmoji.id;
  }

  if (typeof optionEmoji === "string") {
    return optionEmoji === reactionEmoji.name;
  }

  return false;
}

function findReactionPanel(selfRoles, messageId) {
  return (selfRoles?.panels || []).find(
    (panel) =>
      panel.type === "reactions" &&
      String(panel.messageId) === String(messageId) &&
      panel.enabled !== false
  );
}

function findReactionOption(panel, reactionEmoji) {
  return (panel?.options || []).find((option) =>
    optionEmojiMatches(option.emoji, reactionEmoji)
  );
}

function canBotManageRole(guild, role) {
  if (!guild?.members?.me || !role) return false;
  return guild.members.me.roles.highest.position > role.position;
}

async function removeOtherReactionRoles(panel, member, selectedOption, reaction) {
  for (const option of panel.options || []) {
    if (!option.roleId) continue;
    if (option.id === selectedOption.id) continue;

    if (member.roles.cache.has(option.roleId)) {
      await member.roles.remove(option.roleId).catch(() => {});
    }

    const oldReaction = reaction.message.reactions.cache.find((r) => {
      const emoji = {
        id: r.emoji?.id || null,
        name: r.emoji?.name || null,
        animated: Boolean(r.emoji?.animated),
      };

      return optionEmojiMatches(option.emoji, emoji);
    });

    if (!oldReaction) continue;

    try {
      const users = await oldReaction.users.fetch();
      if (users.has(member.id)) {
        await oldReaction.users.remove(member.id).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

async function handleReactionAdd(reaction, user) {
  if (user?.bot) return false;

  try {
    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (!reaction?.message?.guild) return false;

    const guild = reaction.message.guild;
    const selfRoles = await fetchSelfRolesConfig(guild.id);
    if (!selfRoles?.enabled) return false;

    const panel = findReactionPanel(selfRoles, reaction.message.id);
    if (!panel) return false;

    const reactionEmoji = normalizeReactionEmoji(reaction);
    const option = findReactionOption(panel, reactionEmoji);

    if (!option || !option.roleId) return false;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return false;

    const role = guild.roles.cache.get(option.roleId);
    if (!role) return false;
    if (!canBotManageRole(guild, role)) return false;

    if (panel.selectionMode === "single") {
      await removeOtherReactionRoles(panel, member, option, reaction);
    }

    if (!member.roles.cache.has(option.roleId)) {
      await member.roles.add(option.roleId).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("[CustomBot SelfRoles] reaction add error:", err);
    return true;
  }
}

async function handleReactionRemove(reaction, user) {
  if (user?.bot) return false;

  try {
    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (!reaction?.message?.guild) return false;

    const guild = reaction.message.guild;
    const selfRoles = await fetchSelfRolesConfig(guild.id);
    if (!selfRoles?.enabled) return false;

    const panel = findReactionPanel(selfRoles, reaction.message.id);
    if (!panel) return false;

    const reactionEmoji = normalizeReactionEmoji(reaction);
    const option = findReactionOption(panel, reactionEmoji);

    if (!option || !option.roleId) return false;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return false;

    const role = guild.roles.cache.get(option.roleId);
    if (!role) return false;
    if (!canBotManageRole(guild, role)) return false;

    if (member.roles.cache.has(option.roleId)) {
      await member.roles.remove(option.roleId).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("[CustomBot SelfRoles] reaction remove error:", err);
    return true;
  }
}

module.exports = {
  handleReactionAdd,
  handleReactionRemove,
};