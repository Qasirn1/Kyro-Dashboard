const { ChannelType, PresenceUpdateStatus } = require("discord.js");
const {
  formatTimeByTimezone,
  formatDateByTimezone,
  formatDateTimeByTimezone,
} = require("./timeFormatter");

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function compactNumber(value) {
  const number = Number(value || 0);

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(number % 1_000_000_000 === 0 ? 0 : 1)}B`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(number % 1_000_000 === 0 ? 0 : 1)}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(number % 1_000 === 0 ? 0 : 1)}K`;
  }

  return `${number}`;
}

function formatDisplayNumber(value, style = "full") {
  return style === "compact" ? compactNumber(value) : formatNumber(value);
}

function getHumansCount(guild) {
  return guild.members.cache.filter((member) => !member.user.bot).size;
}

function getBotsCount(guild) {
  return guild.members.cache.filter((member) => member.user.bot).size;
}

function getOnlineCount(guild) {
  return guild.members.cache.filter((member) => {
    if (member.user.bot) return false;

    const status = member.presence?.status;
    return status && status !== PresenceUpdateStatus.Offline;
  }).size;
}

function getChannelCountByTypes(guild, types) {
  return guild.channels.cache.filter((channel) => types.includes(channel.type)).size;
}

function getRoleHolderCount(guild, roleId) {
  if (!guild || !roleId) return 0;

  const role = guild.roles.cache.get(roleId);
  if (!role) return 0;

  return role.members.size;
}

function getDefaultLabel(type) {
  switch (type) {
    case "members":
      return "Members";
    case "humans":
      return "Humans";
    case "bots":
      return "Bots";
    case "online":
      return "Online";
    case "roles":
      return "Roles";
    case "role_count":
      return "Role Members";
    case "channels":
      return "Channels";
    case "text_channels":
      return "Text Channels";
    case "voice_channels":
      return "Voice Channels";
    case "categories":
      return "Categories";
    case "boosts":
      return "Boosts";
    case "time":
      return "Time";
    case "social":
      return "Social";
    case "custom":
      return "Count";
    default:
      return "Stat";
  }
}

function getStatEmoji(entry = {}) {
  if (entry.emoji) return entry.emoji;

  switch (entry.type) {
    case "members":
      return "👥";
    case "humans":
      return "🧑";
    case "bots":
      return "🤖";
    case "online":
      return "🟢";
    case "roles":
      return "🎭";
    case "role_count":
      return "🛡️";
    case "channels":
      return "📚";
    case "text_channels":
      return "💬";
    case "voice_channels":
      return "🔊";
    case "categories":
      return "🗂️";
    case "boosts":
      return "🚀";
    case "time":
      if (entry.display === "date") return "📅";
      if (entry.display === "datetime") return "🗓️";
      return "🕒";
    case "social":
      switch (entry.platform) {
        case "instagram":
          return "📸";
        case "twitter":
        case "x":
          return "🐦";
        case "youtube":
          return "📺";
        case "kick":
          return "🟢";
        default:
          return "📊";
      }
    case "custom":
      return "📌";
    default:
      return "📌";
  }
}

function buildBaseName(emoji, label, value) {
  return `${emoji} | ${label}: ${value}`;
}

function buildSocialLabel(entry) {
  if (entry.label) return entry.label;

  switch (entry.platform) {
    case "instagram":
      return "Instagram";
    case "twitter":
    case "x":
      return "X";
    case "youtube":
      return entry.statType === "views" ? "YouTube Views" : "YouTube Subs";
    case "kick":
      return "Kick Followers";
    default:
      return "Social";
  }
}

function buildRoleCountLabel(entry, guild) {
  if (entry.label) return entry.label;

  const role = entry.roleId ? guild.roles.cache.get(entry.roleId) : null;
  return role?.name || "Role Members";
}

function buildStatChannelName(entry, guild) {
  if (!entry || !guild) return null;

  const numberStyle = entry.numberStyle || "full";
  const label = entry.label || getDefaultLabel(entry.type);
  const emoji = getStatEmoji(entry);

  switch (entry.type) {
    case "members":
      return buildBaseName(emoji, label, formatDisplayNumber(guild.memberCount, numberStyle));

    case "humans":
      return buildBaseName(emoji, label, formatDisplayNumber(getHumansCount(guild), numberStyle));

    case "bots":
      return buildBaseName(emoji, label, formatDisplayNumber(getBotsCount(guild), numberStyle));

    case "online":
      return buildBaseName(emoji, label, formatDisplayNumber(getOnlineCount(guild), numberStyle));

    case "roles":
      return buildBaseName(emoji, label, formatDisplayNumber(guild.roles.cache.size, numberStyle));

    case "role_count": {
      const roleLabel = buildRoleCountLabel(entry, guild);
      const count = getRoleHolderCount(guild, entry.roleId);
      return buildBaseName(emoji, roleLabel, formatDisplayNumber(count, numberStyle));
    }

    case "channels":
      return buildBaseName(emoji, label, formatDisplayNumber(guild.channels.cache.size, numberStyle));

    case "text_channels": {
      const count = getChannelCountByTypes(guild, [
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
      ]);

      return buildBaseName(emoji, label, formatDisplayNumber(count, numberStyle));
    }

    case "voice_channels": {
      const count = getChannelCountByTypes(guild, [
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice,
      ]);

      return buildBaseName(emoji, label, formatDisplayNumber(count, numberStyle));
    }

    case "categories": {
      const count = getChannelCountByTypes(guild, [ChannelType.GuildCategory]);
      return buildBaseName(emoji, label, formatDisplayNumber(count, numberStyle));
    }

    case "boosts":
      return buildBaseName(
        emoji,
        label,
        formatDisplayNumber(guild.premiumSubscriptionCount || 0, numberStyle)
      );

    case "time": {
      const timezone = entry.timezone || "UTC";
      const format = entry.format || "12h";
      const display = entry.display || "time";

      if (display === "date") {
        return buildBaseName(emoji, label, formatDateByTimezone(timezone));
      }

      if (display === "datetime") {
        return buildBaseName(emoji, label, formatDateTimeByTimezone(timezone, format));
      }

      return buildBaseName(emoji, label, formatTimeByTimezone(timezone, format));
    }

    case "social": {
      const socialLabel = buildSocialLabel(entry);
      const socialValue =
        typeof entry.lastValue === "number"
          ? formatDisplayNumber(entry.lastValue, numberStyle)
          : entry.fallbackValue != null
          ? formatDisplayNumber(entry.fallbackValue, numberStyle)
          : "N/A";

      return buildBaseName(emoji, socialLabel, socialValue);
    }

    case "custom": {
      const customValue =
        typeof entry.value === "number"
          ? formatDisplayNumber(entry.value, numberStyle)
          : typeof entry.lastValue === "number"
          ? formatDisplayNumber(entry.lastValue, numberStyle)
          : "0";

      return buildBaseName(emoji, label, customValue);
    }

    default:
      return null;
  }
}

module.exports = {
  buildStatChannelName,
  formatNumber,
  compactNumber,
  formatDisplayNumber,
  getHumansCount,
  getBotsCount,
  getOnlineCount,
  getChannelCountByTypes,
  getRoleHolderCount,
  getDefaultLabel,
  getStatEmoji,
  buildSocialLabel,
  buildRoleCountLabel,
};