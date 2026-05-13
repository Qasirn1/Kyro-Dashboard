const { checkYouTubeAlerts } = require("./youtubeAlerts");
const { checkKickAlerts } = require("./kickAlerts");
const { checkTikTokAlerts } = require("./tiktokAlerts");
const { checkTwitchAlerts } = require("./twitchAlerts");

let socialAlertsInterval = null;
let socialAlertsStartupTimeout = null;
let socialAlertsRunning = false;

async function runSocialAlertsCheck(client) {
  if (!client) return;
  if (socialAlertsRunning) return;

  socialAlertsRunning = true;

  try {
    await checkYouTubeAlerts(client);
    await checkKickAlerts(client);
    await checkTikTokAlerts(client);
    await checkTwitchAlerts(client);
  } catch (error) {
    console.error("[SocialAlerts] Scheduler check failed:", error);
  } finally {
    socialAlertsRunning = false;
  }
}

function startSocialAlertsScheduler(client, intervalMs = 5 * 60 * 1000) {
  if (!client) {
    console.error("[SocialAlerts] Cannot start scheduler without client.");
    return;
  }

  if (socialAlertsInterval) {
    clearInterval(socialAlertsInterval);
    socialAlertsInterval = null;
  }

  if (socialAlertsStartupTimeout) {
    clearTimeout(socialAlertsStartupTimeout);
    socialAlertsStartupTimeout = null;
  }

  console.log(`[SocialAlerts] Scheduler started. Interval: ${intervalMs}ms`);

  socialAlertsStartupTimeout = setTimeout(() => {
    runSocialAlertsCheck(client)
      .catch((error) => {
        console.error("[SocialAlerts] Initial scheduler run failed:", error);
      })
      .finally(() => {
        socialAlertsStartupTimeout = null;
      });
  }, 15000);

  socialAlertsInterval = setInterval(() => {
    runSocialAlertsCheck(client).catch((error) => {
      console.error("[SocialAlerts] Interval scheduler run failed:", error);
    });
  }, intervalMs);
}

function stopSocialAlertsScheduler() {
  if (socialAlertsInterval) {
    clearInterval(socialAlertsInterval);
    socialAlertsInterval = null;
  }

  if (socialAlertsStartupTimeout) {
    clearTimeout(socialAlertsStartupTimeout);
    socialAlertsStartupTimeout = null;
  }
}

function getSocialAlertsSchedulerState() {
  return {
    running: Boolean(socialAlertsInterval || socialAlertsStartupTimeout),
    busy: socialAlertsRunning,
  };
}

async function triggerSocialAlertsManualCheck(client) {
  await runSocialAlertsCheck(client);
}

async function sendTestSocialAlert(client, guildId, channelId, platform = "youtube") {
  if (!client || !guildId || !channelId) {
    return { ok: false, error: "Missing client, guildId, or channelId." };
  }

  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      return { ok: false, error: "Guild not found." };
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return { ok: false, error: "Alert channel not found or is not a text channel." };
    }

    let payload = null;

    if (platform === "youtube") {
      payload = {
        content: "🧪 Test social alert",
        embeds: [
          {
            title: "📺 New YouTube Upload",
            description: "**Test Creator** uploaded a new video.",
            color: 0xff0000,
            fields: [
              { name: "Title", value: "This is a test YouTube alert." },
              { name: "Watch", value: "https://youtube.com/" },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (platform === "kick") {
      payload = {
        content: "🧪 Test social alert",
        embeds: [
          {
            title: "🟢 Kick Live Alert",
            description: "**Test Streamer** is now live on Kick.",
            color: 0x53fc18,
            fields: [
              { name: "Stream", value: "This is a test Kick alert." },
              { name: "Watch Now", value: "https://kick.com/" },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (platform === "tiktok") {
      payload = {
        content: "🧪 Test social alert",
        embeds: [
          {
            title: "🎵 New TikTok Post",
            description: "**Test Creator** posted new content on TikTok.",
            color: 0x010101,
            fields: [
              { name: "Post", value: "This is a test TikTok alert." },
              { name: "Watch", value: "https://tiktok.com/" },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (platform === "twitch") {
      payload = {
        content: "🧪 Test social alert",
        embeds: [
          {
            title: "🟣 Twitch Live",
            description: "**Test Streamer** is now live on Twitch.",
            color: 0x9146ff,
            fields: [
              { name: "Stream", value: "This is a test Twitch alert." },
              { name: "Watch", value: "https://twitch.tv/" },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else {
      return { ok: false, error: "Invalid platform for test alert." };
    }

    await channel.send(payload);

    return { ok: true };
  } catch (error) {
    console.error("[SocialAlerts] Failed to send test alert:", error);
    return { ok: false, error: error.message };
  }
}

module.exports = {
  startSocialAlertsScheduler,
  stopSocialAlertsScheduler,
  getSocialAlertsSchedulerState,
  triggerSocialAlertsManualCheck,
  sendTestSocialAlert,
};