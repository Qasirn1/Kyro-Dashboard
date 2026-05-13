const { Events } = require("discord.js");
const handleLevelUp = require("./handleLevelUp");
const { calculateFromTotalXP } = require("./levelUtils");
const {
  getOrCreateLevelingMember,
  addChatXP,
  setChatLevel,
} = require("../database/levelingDb");
const { getGuildConfig } = require("../database/guildConfigDb");

const cooldowns = new Map();

/* ───────── HELPERS ───────── */
function getIgnoredRoleIds(levelingConfig = {}) {
  const chat = levelingConfig.chat || {};

  if (Array.isArray(chat.ignoredRoleIds)) {
    return chat.ignoredRoleIds;
  }
  if (Array.isArray(levelingConfig.ignoredRoleIds)) {
    return levelingConfig.ignoredRoleIds;
  }
  if (Array.isArray(levelingConfig.disabledRoleIds)) {
    return levelingConfig.disabledRoleIds;
  }
  if (Array.isArray(levelingConfig.ignoredRoles)) {
    return levelingConfig.ignoredRoles;
  }

  return [];
}

function getDisabledChannelIds(levelingConfig = {}) {
  const chat = levelingConfig.chat || {};

  if (Array.isArray(chat.ignoredChannelIds)) {
    return chat.ignoredChannelIds;
  }
  if (Array.isArray(levelingConfig.disabledChannels)) {
    return levelingConfig.disabledChannels;
  }
  if (Array.isArray(levelingConfig.ignoredChannels)) {
    return levelingConfig.ignoredChannels;
  }

  return [];
}

function getChatCooldownMs(levelingConfig = {}) {
  const chat = levelingConfig.chat || {};

  const seconds =
    chat.cooldownSeconds ??
    levelingConfig.chatCooldownSeconds ??
    levelingConfig.xpCooldownSeconds ??
    60;

  return Math.max(0, Number(seconds) || 60) * 1000;
}

function getChatXpGain(levelingConfig = {}) {
  const chat = levelingConfig.chat || {};

  const xpMode = ["fixed", "random"].includes(chat.xpMode)
    ? chat.xpMode
    : "fixed";

  if (xpMode === "random") {
    const minXp = Math.max(
      1,
      Number(chat.minXp ?? levelingConfig.minXp ?? 10) || 10
    );

    const maxXp = Math.max(
      minXp,
      Number(chat.maxXp ?? levelingConfig.maxXp ?? minXp) || minXp
    );

    return Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
  }

  const xp = chat.xpPerMessage ?? levelingConfig.chatXpRate ?? 10;
  return Math.max(0, Number(xp) || 0);
}

function getLevelUpConfig(levelingConfig = {}, guildConfig = {}) {
  const announcements = levelingConfig.announcements || {};

  return {
    levelUpChannelId:
      announcements.levelUpChannelId ||
      levelingConfig.levelUpChannelId ||
      guildConfig?.leveling?.announcements?.levelUpChannelId ||
      guildConfig?.leveling?.levelUpChannelId ||
      guildConfig?.levelUpChannelId ||
      null,

    levelUpChannel:
      announcements.levelUpChannelId ||
      levelingConfig.levelUpChannel ||
      guildConfig?.leveling?.announcements?.levelUpChannelId ||
      guildConfig?.leveling?.levelUpChannel ||
      guildConfig?.levelUpChannel ||
      null,

    levelUpMessage:
      announcements.levelUpMessage ||
      levelingConfig.levelUpMessage ||
      guildConfig?.leveling?.announcements?.levelUpMessage ||
      guildConfig?.leveling?.levelUpMessage ||
      guildConfig?.levelUpMessage ||
      "",

    levelUpEmbed:
      levelingConfig.levelUpEmbed ||
      guildConfig?.leveling?.levelUpEmbed ||
      guildConfig?.levelUpEmbed ||
      {},
  };
}

/* ───────── LEVEL SYSTEM ───────── */
module.exports = (client) => {
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      const guildId = message.guild.id;
      const userId = message.author.id;

      const guildConfig = await getGuildConfig(guildId);
      const levelingConfig = guildConfig?.leveling || {};

      // 🚫 leveling disabled entirely
      if (levelingConfig.enabled === false) return;

      // 🚫 ignore bots/webhooks/system-ish empty events
      if (!message.author || message.webhookId) return;

      const member =
        message.member ||
        (await message.guild.members.fetch(userId).catch(() => null));

      if (!member) return;

      // 🚫 XP disabled channels
      const disabledChannels = getDisabledChannelIds(levelingConfig);
      if (disabledChannels.includes(message.channel.id)) return;

      // 🚫 ignored roles
      const ignoredRoleIds = getIgnoredRoleIds(levelingConfig);
      if (
        ignoredRoleIds.length > 0 &&
        member.roles.cache.some((role) => ignoredRoleIds.includes(role.id))
      ) {
        return;
      }

      // 🚫 empty messages should not gain XP
      const hasContent = Boolean(message.content && message.content.trim());
      const hasAttachments = Boolean(message.attachments?.size);
      if (!hasContent && !hasAttachments) return;

      // ⏱ XP cooldown
      const cooldownMs = getChatCooldownMs(levelingConfig);
      const key = `${guildId}-${userId}`;
      const now = Date.now();

      if (cooldowns.has(key) && now - cooldowns.get(key) < cooldownMs) return;
      cooldowns.set(key, now);

      // ⚡ XP per message
      const xpGain = getChatXpGain(levelingConfig);
      if (xpGain <= 0) return;

      // get/create Mongo member
      const mongoMember = await getOrCreateLevelingMember(guildId, userId);
      if (!mongoMember) return;

      const oldTotalChatXP = Math.max(0, mongoMember?.xp?.chatXP ?? 0);
      const oldChat = calculateFromTotalXP(oldTotalChatXP);
      const oldChatLevel = oldChat.level;

      const newTotalChatXP = oldTotalChatXP + xpGain;
      const newChat = calculateFromTotalXP(newTotalChatXP);
      const newChatLevel = newChat.level;

      // sync MongoDB (DB stores TOTAL XP)
      await addChatXP(guildId, userId, xpGain);
      await setChatLevel(guildId, userId, newChatLevel);

      /* ───────── LEVEL UP HANDLING ───────── */
      if (newChatLevel > oldChatLevel) {
        await handleLevelUp({
          client,
          guild: message.guild,
          member,
          oldLevel: oldChatLevel,
          newLevel: newChatLevel,
          totalXP: newTotalChatXP,
          config: getLevelUpConfig(levelingConfig, guildConfig),
        });

        // 🎁 Apply reward roles (chat levels only)
        const roleRewards = Array.isArray(levelingConfig.roleRewards)
          ? levelingConfig.roleRewards
          : [];

        const roleMode =
          levelingConfig.roleRewardMode ||
          levelingConfig.roleMode ||
          "stack";

        const validRewards = roleRewards.filter(
          (r) => r && r.roleId && Number.isFinite(Number(r.level))
        );

        if (validRewards.length > 0) {
          if (roleMode === "highest") {
            for (const reward of validRewards) {
              if (member.roles.cache.has(reward.roleId)) {
                await member.roles.remove(reward.roleId).catch(() => {});
              }
            }

            const highest = validRewards
              .filter((r) => Number(r.level) <= newChatLevel)
              .sort((a, b) => Number(b.level) - Number(a.level))[0];

            if (highest && !member.roles.cache.has(highest.roleId)) {
              await member.roles.add(highest.roleId).catch(() => {});
            }
          } else {
            for (const reward of validRewards) {
              if (
                Number(reward.level) <= newChatLevel &&
                !member.roles.cache.has(reward.roleId)
              ) {
                await member.roles.add(reward.roleId).catch(() => {});
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ levelSystem MessageCreate error:", error);
    }
  });
};