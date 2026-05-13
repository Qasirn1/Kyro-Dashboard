const axios = require("axios");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const {
  getAllEnabledAlerts,
  updateSocialAlert,
  applyAlertVariables
} = require("./socialAlertsManager");

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let twitchTokenCache = {
  accessToken: null,
  expiresAt: 0
};

const twitchUserCache = new Map();

function getRoleMention(alert) {
  return Array.isArray(alert.pingRoleIds) && alert.pingRoleIds.length > 0
    ? alert.pingRoleIds.map((id) => `<@&${id}>`).join(" ")
    : alert.pingRoleId
    ? `<@&${alert.pingRoleId}>`
    : "";
}

function extractTwitchLogin(urlOrLogin = "") {
  const clean = String(urlOrLogin).trim();

  const urlMatch = clean.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();

  return clean.replace(/^@/, "").toLowerCase();
}

async function getTwitchAppAccessToken() {
  const now = Date.now();

  if (
    twitchTokenCache.accessToken &&
    twitchTokenCache.expiresAt > now + 60_000
  ) {
    return twitchTokenCache.accessToken;
  }

  const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
    params: {
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials"
    }
  });

  const accessToken = response.data?.access_token;
  const expiresIn = response.data?.expires_in || 0;

  if (!accessToken) {
    throw new Error("Failed to get Twitch app access token.");
  }

  twitchTokenCache.accessToken = accessToken;
  twitchTokenCache.expiresAt = now + expiresIn * 1000;

  return accessToken;
}

async function twitchGet(url, params = {}) {
  const token = await getTwitchAppAccessToken();

  return axios.get(url, {
    params,
    headers: {
      "Client-Id": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`
    }
  });
}

async function resolveTwitchUser(loginOrUrl) {
  const login = extractTwitchLogin(loginOrUrl);
  if (!login) return null;

  if (twitchUserCache.has(login)) {
    return twitchUserCache.get(login);
  }

  const response = await twitchGet("https://api.twitch.tv/helix/users", {
    login
  });

  const user = response.data?.data?.[0];
  if (!user) return null;

  const resolved = {
    id: user.id,
    login: user.login,
    displayName: user.display_name,
    profileImageUrl: user.profile_image_url
  };

  twitchUserCache.set(login, resolved);
  return resolved;
}

async function fetchTwitchLiveStatus(userId) {
  const response = await twitchGet("https://api.twitch.tv/helix/streams", {
    user_id: userId
  });

  const stream = response.data?.data?.[0];
  if (!stream) {
    return {
      found: true,
      isLive: false,
      startedAt: null
    };
  }

  const thumbnailUrl = stream.thumbnail_url
    ? stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720")
    : null;

  return {
    found: true,
    isLive: true,
    startedAt: stream.started_at || null,
    title: stream.title || "Live Now",
    url: `https://www.twitch.tv/${stream.user_login}`,
    thumbnailUrl,
    gameName: stream.game_name || "Unknown Game",
    viewerCount:
      typeof stream.viewer_count === "number"
        ? String(stream.viewer_count)
        : "Unknown"
  };
}

function buildTwitchLiveEmbed(alert, liveData) {
  const roleMention = getRoleMention(alert);

  const title =
    applyAlertVariables(alert.embedTitle, {
      creator: alert.creatorName,
      platform: "Twitch",
      role: roleMention,
      url: liveData.url
    }) || "🟣 Twitch Live";

  const description =
    applyAlertVariables(alert.embedDescription, {
      creator: alert.creatorName,
      platform: "Twitch",
      role: roleMention,
      url: liveData.url
    }) || `**${alert.creatorName}** is live on Twitch.`;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${alert.creatorName} is LIVE 🔴`,
      iconURL: alert.profileImageUrl || null,
      url: liveData.url
    })
    .setTitle(title)
    .setURL(liveData.url)
    .setDescription(description)
    .addFields(
      { name: "Stream", value: liveData.title || "Live Now" },
      { name: "Game", value: liveData.gameName || "Unknown Game", inline: true },
      { name: "Viewers", value: liveData.viewerCount || "Unknown", inline: true }
    )
    .setImage(liveData.thumbnailUrl || null)
    .setColor("#9146FF")
    .setTimestamp();

  if (alert.profileImageUrl) {
    embed.setThumbnail(alert.profileImageUrl);
  }

  return embed;
}

function buildTwitchButtonRow(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("🟣 Watch Stream")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );
}

async function sendTwitchLiveAlert(client, alert, liveData) {
  const guild = await client.guilds.fetch(alert.guildId).catch(() => null);
  if (!guild) return false;

  const channel = await guild.channels.fetch(alert.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const content =
    applyAlertVariables(alert.messageContent, {
      creator: alert.creatorName,
      platform: "Twitch",
      role: getRoleMention(alert),
      url: liveData.url
    }) || null;

  const embed = buildTwitchLiveEmbed(alert, liveData);
  const row = buildTwitchButtonRow(liveData.url);

  await channel.send({
    content,
    embeds: [embed],
    components: [row]
  });

  return true;
}

async function checkTwitchAlerts(client) {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.warn("[SocialAlerts] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET. Twitch alerts skipped.");
    return;
  }

  const allAlerts = await getAllEnabledAlerts();
  const twitchAlerts = allAlerts.filter(
    (alert) => alert.platform === "twitch" && alert.alertLives
  );

  if (!twitchAlerts.length) return;

  const groupedByUserId = new Map();

  for (const alert of twitchAlerts) {
    try {
      let userId = alert.creatorId;
      let creatorName = alert.creatorName;
      let profileImageUrl = alert.profileImageUrl || null;

      if (!userId || String(userId).startsWith("http") || !/^\d+$/.test(String(userId))) {
        const resolvedUser = await resolveTwitchUser(
          alert.creatorUrl || alert.creatorId || alert.creatorName
        );

        if (!resolvedUser) {
          console.warn(`[SocialAlerts] Could not resolve Twitch user for alert ${alert.id}`);
          continue;
        }

        userId = resolvedUser.id;
        creatorName = resolvedUser.displayName || creatorName;
        profileImageUrl = resolvedUser.profileImageUrl || profileImageUrl;

        await updateSocialAlert(alert.guildId, alert.id, {
          creatorId: userId,
          creatorName,
          profileImageUrl
        });
      }

      if (!groupedByUserId.has(userId)) {
        groupedByUserId.set(userId, []);
      }

      groupedByUserId.get(userId).push({
        ...alert,
        creatorId: userId,
        creatorName,
        profileImageUrl
      });
    } catch (error) {
      console.error(
        `[SocialAlerts] Failed grouping Twitch alert ${alert.id}:`,
        error.message
      );
    }
  }

  for (const [userId, alerts] of groupedByUserId.entries()) {
    try {
      const liveData = await fetchTwitchLiveStatus(userId);
      if (!liveData.found) continue;

  for (const alert of alerts) {
  try {
    const startupDelayMs = 1000 * 60 * 2; // 2 minutes
const isStartupWarmup =
  global.KYRO_START_TIME &&
  Date.now() - global.KYRO_START_TIME < startupDelayMs;
    const now = Date.now();
    const cooldownMs = 1000 * 60 * 90; // 90 minutes safety
    const isCooldownActive =
      alert.lastLiveAt &&
      now - new Date(alert.lastLiveAt).getTime() < cooldownMs;

    if (!liveData.isLive) {
      if (alert.isLive) {
        await updateSocialAlert(alert.guildId, alert.id, {
          isLive: false,
          lastLiveAt: null,
        });
      }
      continue;
    }

    if (alert.isLive || isCooldownActive) {
     
      continue;
    }

 if (isStartupWarmup) {
  await updateSocialAlert(alert.guildId, alert.id, {
    isLive: true,
    lastLiveAt: new Date().toISOString(),
  });
  continue;
}

const sent = await sendTwitchLiveAlert(client, alert, liveData);

if (sent) {
  await updateSocialAlert(alert.guildId, alert.id, {
    isLive: true,
    lastLiveAt: new Date().toISOString(),
  });
}
  } catch (error) {
          console.error(
            `[SocialAlerts] Failed fan-out Twitch alert ${alert.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        `[SocialAlerts] Failed checking grouped Twitch user ${userId}:`,
        error.message
      );
    }
  }
}

module.exports = {
  checkTwitchAlerts
};