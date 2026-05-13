const GuildConfig = require("../models/GuildConfig");

async function fetchSelfRolesConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.selfRoles || null;
  } catch (error) {
    console.error(
      "[SelfRoles] Failed to fetch self roles config from Mongo:",
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

  // New custom emoji object
  if (typeof optionEmoji === "object" && optionEmoji.id) {
    return optionEmoji.id === reactionEmoji.id;
  }

  // Old/custom string like <a:name:id> or <:name:id>
  if (typeof optionEmoji === "string" && optionEmoji.startsWith("<")) {
    const match = optionEmoji.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
    if (!match) return false;
    return match[2] === reactionEmoji.id;
  }

  // Unicode emoji string
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

module.exports = (client) => {
  // ───────────────────────────────────────────────────────────
  // REACTION ADD
  // ───────────────────────────────────────────────────────────
  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch().catch(() => null);
      if (!reaction?.message?.guild) return;

      const guild = reaction.message.guild;
      const selfRoles = await fetchSelfRolesConfig(guild.id);
      if (!selfRoles?.enabled) return;

      const panel = findReactionPanel(selfRoles, reaction.message.id);
      if (!panel) return;

      const reactionEmoji = normalizeReactionEmoji(reaction);
      const option = findReactionOption(panel, reactionEmoji);

      if (!option || !option.roleId) return;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      const role = guild.roles.cache.get(option.roleId);
      if (!role) return;
      if (!canBotManageRole(guild, role)) return;

      if (panel.selectionMode === "single") {
        await removeOtherReactionRoles(panel, member, option, reaction);
      }

      if (!member.roles.cache.has(option.roleId)) {
        await member.roles.add(option.roleId).catch(() => {});
      }
    } catch (err) {
      console.error("[SelfRoles] reaction add error:", err);
    }
  });

  // ───────────────────────────────────────────────────────────
  // REACTION REMOVE
  // ───────────────────────────────────────────────────────────
  client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch().catch(() => null);
      if (!reaction?.message?.guild) return;

      const guild = reaction.message.guild;
      const selfRoles = await fetchSelfRolesConfig(guild.id);
      if (!selfRoles?.enabled) return;

      const panel = findReactionPanel(selfRoles, reaction.message.id);
      if (!panel) return;

      const reactionEmoji = normalizeReactionEmoji(reaction);
      const option = findReactionOption(panel, reactionEmoji);

      if (!option || !option.roleId) return;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      const role = guild.roles.cache.get(option.roleId);
      if (!role) return;
      if (!canBotManageRole(guild, role)) return;

      if (member.roles.cache.has(option.roleId)) {
        await member.roles.remove(option.roleId).catch(() => {});
      }
    } catch (err) {
      console.error("[SelfRoles] reaction remove error:", err);
    }
  });
};