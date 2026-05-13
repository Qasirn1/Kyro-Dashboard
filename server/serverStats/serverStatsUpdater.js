function getCustomBotGuild(guildId) {
  const clients = global.kyroCustomBots || global.activeCustomBots || new Map();

  for (const bot of clients.values()) {
    const client = bot?.client || bot;
    const customGuild = client?.guilds?.cache?.get(guildId);
    if (customGuild) return customGuild;
  }

  return null;
}

const {
  getServerStatsConfig,
  updateServerStatsConfig,
} = require("./serverStatsManager");

const { buildStatChannelName } = require("./serverStatsFormatter");

let statsInterval = null;
let isUpdating = false;

const MIN_GENERAL_REFRESH_MINUTES = 5;
const MIN_TIME_REFRESH_MINUTES = 5;

function getRefreshMinutes(statsConfig = {}) {
  return Math.max(
    MIN_GENERAL_REFRESH_MINUTES,
    Number(
      statsConfig.refreshMinutes ||
        statsConfig.refreshInterval ||
        statsConfig.refreshRate ||
        statsConfig.intervalMinutes ||
        MIN_GENERAL_REFRESH_MINUTES
    )
  );
}

function canUpdateTimeStat(statsConfig = {}, options = {}) {
  if (options.skipTime) return false;
  if (options.force || options.forceTime) return true;

  const lastTimeUpdated = statsConfig.lastTimeUpdated
    ? new Date(statsConfig.lastTimeUpdated).getTime()
    : 0;

  const nextTimeUpdate =
    lastTimeUpdated + MIN_TIME_REFRESH_MINUTES * 60 * 1000;

  return Date.now() >= nextTimeUpdate;
}

function canUpdateGeneralStats(statsConfig = {}, options = {}) {
  if (options.force) return true;

  const refreshMinutes = getRefreshMinutes(statsConfig);

  const lastUpdated = statsConfig.lastUpdated
    ? new Date(statsConfig.lastUpdated).getTime()
    : 0;

  const nextAllowedUpdate = lastUpdated + refreshMinutes * 60 * 1000;

  return Date.now() >= nextAllowedUpdate;
}

async function updateGuildServerStats(guild, options = {}) {
  if (!guild) return;

  const activeGuild = getCustomBotGuild(guild.id) || guild;

  const statsConfig = await getServerStatsConfig(guild.id);

  if (!statsConfig?.enabled) return;
  if (!Array.isArray(statsConfig.entries) || !statsConfig.entries.length) return;

  const generalAllowed = canUpdateGeneralStats(statsConfig, options);
  const timeAllowed = canUpdateTimeStat(statsConfig, options);

  if (!generalAllowed && !timeAllowed) return;

  try {
    await activeGuild.members.fetch().catch(() => {});
    await activeGuild.roles.fetch().catch(() => {});
    await activeGuild.channels.fetch().catch(() => {});
  } catch (error) {
    console.error(
      `[ServerStats] Failed to fetch fresh guild data for ${guild.id}:`,
      error
    );
  }

  const validEntries = [];
  const processedChannels = new Set();
  let removedMissingEntries = 0;
  let updatedGeneral = false;
  let updatedTime = false;

  for (const entry of statsConfig.entries) {
    try {
      if (!entry?.channelId) continue;
      if (entry.enabled === false) continue;

      const isTimeStat = entry.type === "time";

      if (isTimeStat && !timeAllowed) {
        validEntries.push(entry);
        continue;
      }

      if (!isTimeStat && !generalAllowed) {
        validEntries.push(entry);
        continue;
      }

      const channel = await activeGuild.channels
        .fetch(entry.channelId, { force: true })
        .catch(() => null);

      if (!channel) {
        console.warn(
          `[ServerStats] Removing missing channel entry ${
            entry.id || "unknown"
          } in guild ${guild.id}`
        );
        removedMissingEntries++;
        continue;
      }

      if (processedChannels.has(entry.channelId)) {
        console.warn(
          `[ServerStats] Skipping duplicate channel entry ${
            entry.id || "unknown"
          } for channel ${entry.channelId}`
        );
        continue;
      }

      processedChannels.add(entry.channelId);
      validEntries.push(entry);

      const newName = buildStatChannelName(entry, activeGuild);
      if (!newName) continue;

if (channel.name !== newName) {

  if (isTimeStat) {
    updatedTime = true;
  } else {
    updatedGeneral = true;
  }

  await channel
    .setName(newName, "Kyro server stats auto-update")
    .catch((error) => {
      console.error(
        `[ServerStats] Failed to rename channel ${entry.channelId} in guild ${guild.id}:`,
        error.message || error
      );
    });
}
    } catch (error) {
      console.error(
        `[ServerStats] Error updating entry ${
          entry?.id || "unknown"
        } in guild ${guild.id}:`,
        error
      );
    }
  }

  try {
    await updateServerStatsConfig(guild.id, {
      ...statsConfig,
      entries: validEntries,
      lastUpdated: updatedGeneral ? new Date() : statsConfig.lastUpdated,
      lastTimeUpdated: updatedTime ? new Date() : statsConfig.lastTimeUpdated,
    });

    if (removedMissingEntries > 0) {
    }
  } catch (error) {
    console.error(
      `[ServerStats] Failed to save updated server stats config for guild ${guild.id}:`,
      error
    );
  }
}

async function updateAllServerStats(client) {
  if (!client?.guilds?.cache) return;
  if (isUpdating) return;

  isUpdating = true;

  try {
    for (const guild of client.guilds.cache.values()) {
      try {
        await updateGuildServerStats(guild);
      } catch (error) {
        console.error(`[ServerStats] Failed updating guild ${guild.id}:`, error);
      }
    }
  } finally {
    isUpdating = false;
  }
}

function startServerStatsUpdater(client) {
  console.log("[ServerStats] Updater started.");

  const runUpdate = async () => {
    try {
      await updateAllServerStats(client);
    } catch (error) {
      console.error("[ServerStats] Updater loop failed:", error);
    }
  };

  setTimeout(runUpdate, 3000);

  if (statsInterval) clearInterval(statsInterval);

  statsInterval = setInterval(() => {
    runUpdate();
  }, 60 * 1000);
}

module.exports = {
  startServerStatsUpdater,
  updateAllServerStats,
  updateGuildServerStats,
};