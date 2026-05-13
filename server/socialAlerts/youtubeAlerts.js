const axios = require("axios");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getAllEnabledAlerts,
  updateSocialAlert,
  applyAlertVariables,
} = require("./socialAlertsManager");

const API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YT_TIMEOUT_MS = 15000;
const STARTUP_WARMUP_MS = 2 * 60 * 1000;
const YOUTUBE_EVENT_COOLDOWN_MS = 90 * 60 * 1000;

const channelResolveCache = new Map();
const uploadsPlaylistCache = new Map();

function getRoleMention(alert) {
  return Array.isArray(alert.pingRoleIds) && alert.pingRoleIds.length > 0
    ? alert.pingRoleIds.map((id) => `<@&${id}>`).join(" ")
    : alert.pingRoleId
    ? `<@&${alert.pingRoleId}>`
    : "";
}

function isWithinCooldown(timestamp, cooldownMs = YOUTUBE_EVENT_COOLDOWN_MS) {
  if (!timestamp) return false;

  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return false;

  return Date.now() - parsed < cooldownMs;
}

function isStartupWarmupActive() {
  return (
    global.KYRO_START_TIME &&
    Date.now() - global.KYRO_START_TIME < STARTUP_WARMUP_MS
  );
}

function buildUploadEmbed(alert, data) {
  const roleMention = getRoleMention(alert);

  const title =
    applyAlertVariables(alert.embedTitle, {
      creator: alert.creatorName,
      platform: "YouTube",
      role: roleMention,
      url: data.url,
    }) || "📺 New YouTube Upload";

  const description =
    applyAlertVariables(alert.embedDescription, {
      creator: alert.creatorName,
      platform: "YouTube",
      role: roleMention,
      url: data.url,
    }) || `**${alert.creatorName}** uploaded a new video`;

  return new EmbedBuilder()
    .setTitle(title)
    .setURL(data.url)
    .setDescription(description)
    .addFields({
      name: "Title",
      value: data.title || "Untitled Video",
    })
    .setImage(data.thumbnailUrl || null)
    .setColor("#FF0000")
    .setTimestamp();
}

function buildLiveEmbed(alert, data) {
  const roleMention = getRoleMention(alert);

  const title =
    applyAlertVariables(alert.embedTitle, {
      creator: alert.creatorName,
      platform: "YouTube",
      role: roleMention,
      url: data.url,
    }) || "🔴 YouTube Live";

  const description =
    applyAlertVariables(alert.embedDescription, {
      creator: alert.creatorName,
      platform: "YouTube",
      role: roleMention,
      url: data.url,
    }) || `**${alert.creatorName}** is live now`;

  return new EmbedBuilder()
    .setTitle(title)
    .setURL(data.url)
    .setDescription(description)
    .addFields({
      name: "Stream",
      value: data.title || "Live Stream",
    })
    .setImage(data.thumbnailUrl || null)
    .setColor("#FF0000")
    .setTimestamp();
}

function buildUploadButtonRow(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("▶ Watch Video")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );
}

function buildLiveButtonRow(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("🔴 Watch Live")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );
}

function extractYouTubeHandleOrId(url = "") {
  const clean = String(url).trim();

  const channelIdMatch = clean.match(
    /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i
  );
  if (channelIdMatch) {
    return {
      type: "channelId",
      value: channelIdMatch[1],
    };
  }

  const handleMatch = clean.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/i);
  if (handleMatch) {
    return {
      type: "handle",
      value: handleMatch[1],
    };
  }

  const usernameMatch = clean.match(/youtube\.com\/user\/([a-zA-Z0-9._-]+)/i);
  if (usernameMatch) {
    return {
      type: "username",
      value: usernameMatch[1],
    };
  }

  if (/^UC[a-zA-Z0-9_-]+$/.test(clean)) {
    return {
      type: "channelId",
      value: clean,
    };
  }

  return {
    type: "unknown",
    value: clean,
  };
}

async function resolveChannelIdViaOEmbed(creatorUrl) {
  try {
    const response = await axios.get("https://www.youtube.com/oembed", {
      timeout: YT_TIMEOUT_MS,
      params: {
        url: creatorUrl,
        format: "json",
      },
    });

    const authorUrl = response.data?.author_url || "";
    const channelIdMatch = authorUrl.match(
      /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i
    );

    if (channelIdMatch) {
      return {
        channelId: channelIdMatch[1],
        creatorName: response.data?.author_name || null,
      };
    }

    return {
      channelId: null,
      creatorName: response.data?.author_name || null,
    };
  } catch {
    return {
      channelId: null,
      creatorName: null,
    };
  }
}

async function resolveChannelIdViaPage(creatorUrl) {
  try {
    const response = await axios.get(creatorUrl, {
      timeout: YT_TIMEOUT_MS,
      headers: {
        "User-Agent": "Mozilla/5.0 KyroBot/1.0",
      },
    });

    const html = String(response.data || "");

    const browseIdMatch =
      html.match(/"browseId":"(UC[a-zA-Z0-9_-]+)"/) ||
      html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/);

    const creatorNameMatch =
      html.match(/<title>(.*?)<\/title>/i) || html.match(/"title":"(.*?)"/);

    return {
      channelId: browseIdMatch ? browseIdMatch[1] : null,
      creatorName: creatorNameMatch
        ? String(creatorNameMatch[1])
            .replace(/\s*-\s*YouTube\s*$/i, "")
            .trim()
        : null,
    };
  } catch {
    return {
      channelId: null,
      creatorName: null,
    };
  }
}

async function resolveChannelId(creatorUrlOrId) {
  if (!creatorUrlOrId) return null;

  const parsed = extractYouTubeHandleOrId(creatorUrlOrId);

  if (parsed.type === "channelId") {
    return {
      channelId: parsed.value,
      creatorName: null,
    };
  }

  if (channelResolveCache.has(creatorUrlOrId)) {
    return channelResolveCache.get(creatorUrlOrId);
  }

  let resolved = {
    channelId: null,
    creatorName: null,
  };

  if (parsed.type === "handle" || parsed.type === "unknown") {
    resolved = await resolveChannelIdViaOEmbed(creatorUrlOrId);

    if (!resolved.channelId) {
      resolved = await resolveChannelIdViaPage(creatorUrlOrId);
    }
  }

  if (!resolved.channelId && parsed.type === "username") {
    try {
      const response = await axios.get(`${YT_BASE_URL}/channels`, {
        timeout: YT_TIMEOUT_MS,
        params: {
          key: API_KEY,
          part: "id,snippet",
          forUsername: parsed.value,
          maxResults: 1,
        },
      });

      const item = response.data?.items?.[0];
      if (item) {
        resolved = {
          channelId: item.id || null,
          creatorName: item.snippet?.title || null,
        };
      }
    } catch (error) {
      console.error(
        "[SocialAlerts] YouTube resolveChannelId username error:",
        error.response?.status,
        JSON.stringify(error.response?.data || error.message, null, 2)
      );
    }
  }

  if (resolved.channelId) {
    channelResolveCache.set(creatorUrlOrId, resolved);
  }

  return resolved.channelId ? resolved : null;
}

async function fetchUploadsPlaylistId(channelId) {
  if (!channelId) return null;

  if (uploadsPlaylistCache.has(channelId)) {
    return uploadsPlaylistCache.get(channelId);
  }

  try {
    const response = await axios.get(`${YT_BASE_URL}/channels`, {
      timeout: YT_TIMEOUT_MS,
      params: {
        key: API_KEY,
        part: "contentDetails,snippet",
        id: channelId,
        maxResults: 1,
      },
    });

    const item = response.data?.items?.[0];
    const playlistId = item?.contentDetails?.relatedPlaylists?.uploads || null;

    if (playlistId) {
      uploadsPlaylistCache.set(channelId, playlistId);
    }

    return playlistId;
  } catch (error) {
    console.error(
      "[SocialAlerts] YouTube fetchUploadsPlaylistId error:",
      error.response?.status,
      JSON.stringify(error.response?.data || error.message, null, 2)
    );
    return null;
  }
}

async function fetchLatestUploadByPlaylist(uploadsPlaylistId) {
  try {
    const response = await axios.get(`${YT_BASE_URL}/playlistItems`, {
      timeout: YT_TIMEOUT_MS,
      params: {
        key: API_KEY,
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: 1,
      },
    });

    const item = response.data?.items?.[0];
    if (!item) return { found: false };

    const videoId =
      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || null;

    if (!videoId) return { found: false };

    return {
      found: true,
      videoId,
      title: item.snippet?.title || "Untitled Video",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        null,
      publishedAt:
        item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null,
    };
  } catch (error) {
    console.error(
      "[SocialAlerts] YouTube fetchLatestUploadByPlaylist error:",
      error.response?.status,
      JSON.stringify(error.response?.data || error.message, null, 2)
    );
    return { found: false };
  }
}

async function fetchVideoLiveState(videoId) {
  try {
    const response = await axios.get(`${YT_BASE_URL}/videos`, {
      timeout: YT_TIMEOUT_MS,
      params: {
        key: API_KEY,
        id: videoId,
        part: "snippet,liveStreamingDetails",
      },
    });

    const item = response.data?.items?.[0];
    if (!item) {
      return {
        found: false,
        isLive: false,
      };
    }

    const isLive = item?.snippet?.liveBroadcastContent === "live";

    return {
      found: true,
      isLive,
    };
  } catch (error) {
    console.error(
      "[SocialAlerts] YouTube fetchVideoLiveState error:",
      error.response?.status,
      JSON.stringify(error.response?.data || error.message, null, 2)
    );
    return {
      found: false,
      isLive: false,
    };
  }
}

async function sendUploadAlert(client, alert, latest) {
  const guild = await client.guilds.fetch(alert.guildId).catch(() => null);
  if (!guild) return false;

  const channel = await guild.channels.fetch(alert.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const content =
    applyAlertVariables(alert.messageContent, {
      creator: alert.creatorName,
      platform: "YouTube",
      role: getRoleMention(alert),
      url: latest.url,
    }) || null;

  const embed = buildUploadEmbed(alert, latest);
  const row = buildUploadButtonRow(latest.url);

  await channel.send({
    content,
    embeds: [embed],
    components: [row],
  });

  return true;
}

async function sendLiveAlert(client, alert, latest) {
  const guild = await client.guilds.fetch(alert.guildId).catch(() => null);
  if (!guild) return false;

  const channel = await guild.channels.fetch(alert.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const content =
    applyAlertVariables(alert.messageContent, {
      creator: alert.creatorName,
      platform: "YouTube",
      role: getRoleMention(alert),
      url: latest.url,
    }) || null;

  const embed = buildLiveEmbed(alert, latest);
  const row = buildLiveButtonRow(latest.url);

  await channel.send({
    content,
    embeds: [embed],
    components: [row],
  });

  return true;
}

async function checkYouTubeAlerts(client) {
  if (!API_KEY) {
    console.warn("[SocialAlerts][YouTube] Missing YOUTUBE_API_KEY. YouTube alerts skipped.");
    return;
  }

  const allAlerts = await getAllEnabledAlerts();
  const youtubeAlerts = allAlerts.filter(
    (alert) =>
      alert.platform === "youtube" && (alert.alertUploads || alert.alertLives)
  );

  if (!youtubeAlerts.length) return;

  const groupedByCreator = new Map();

  for (const alert of youtubeAlerts) {
    try {
      let channelId = alert.creatorId;
      let creatorName = alert.creatorName;
      let uploadsPlaylistId = alert.uploadsPlaylistId || null;

      if (!channelId || String(channelId).startsWith("http")) {
        const resolved = await resolveChannelId(alert.creatorUrl || alert.creatorId);

        if (!resolved?.channelId) {
          console.warn(
  `[SocialAlerts][YouTube] Could not resolve channel for alert ${alert.id}`
);
          continue;
        }

        channelId = resolved.channelId;
        creatorName = resolved.creatorName || creatorName;

        await updateSocialAlert(alert.guildId, alert.id, {
          creatorId: channelId,
          creatorName,
        });
      }

      if (!uploadsPlaylistId) {
        uploadsPlaylistId = await fetchUploadsPlaylistId(channelId);

        if (!uploadsPlaylistId) {
        console.warn(
  `[SocialAlerts][YouTube] Could not get uploads playlist for alert ${alert.id}`
);
          continue;
        }

        await updateSocialAlert(alert.guildId, alert.id, {
          uploadsPlaylistId,
        });
      }

      const groupKey = `${channelId}:${uploadsPlaylistId}`;

      if (!groupedByCreator.has(groupKey)) {
        groupedByCreator.set(groupKey, {
          channelId,
          uploadsPlaylistId,
          alerts: [],
        });
      }

      groupedByCreator.get(groupKey).alerts.push({
        ...alert,
        creatorId: channelId,
        creatorName,
        uploadsPlaylistId,
      });
    } catch (error) {
   console.error(
  `[SocialAlerts][YouTube] Failed grouping alert ${alert.id}:`,
  error.message
);
    }
  }

  for (const [, creatorGroup] of groupedByCreator.entries()) {
    try {
      const latest = await fetchLatestUploadByPlaylist(creatorGroup.uploadsPlaylistId);
      if (!latest.found || !latest.videoId) continue;

      const liveState = await fetchVideoLiveState(latest.videoId);
      const live = Boolean(liveState?.isLive);
      const startupWarmup = isStartupWarmupActive();
      const nowIso = new Date().toISOString();

      for (const alert of creatorGroup.alerts) {
        try {
          const isLiveDuplicate = latest.videoId === alert.lastLiveVideoId;
          const isUploadDuplicate = latest.videoId === alert.lastVideoId;

          const isLiveCooldownActive = isWithinCooldown(alert.lastLiveAt);
          const isUploadCooldownActive = isWithinCooldown(alert.lastUploadAt);

          if (alert.alertLives && live && !isLiveDuplicate && !isLiveCooldownActive) {
            if (startupWarmup) {
              await updateSocialAlert(alert.guildId, alert.id, {
                lastLiveVideoId: latest.videoId,
                isLive: true,
                lastLiveAt: nowIso,
              });
              continue;
            }

            const sent = await sendLiveAlert(client, alert, latest);

            if (sent) {
              await updateSocialAlert(alert.guildId, alert.id, {
                lastLiveVideoId: latest.videoId,
                isLive: true,
                lastLiveAt: nowIso,
              });
            }
          }

          if (
            alert.alertUploads &&
            !live &&
            !isUploadDuplicate &&
            !isUploadCooldownActive
          ) {
            if (startupWarmup) {
              await updateSocialAlert(alert.guildId, alert.id, {
                lastVideoId: latest.videoId,
                isLive: false,
                lastUploadAt: nowIso,
              });
              continue;
            }

            const sent = await sendUploadAlert(client, alert, latest);

            if (sent) {
              await updateSocialAlert(alert.guildId, alert.id, {
                lastVideoId: latest.videoId,
                isLive: false,
                lastUploadAt: nowIso,
              });
            }
          }

          if (!live && alert.isLive) {
            await updateSocialAlert(alert.guildId, alert.id, {
              isLive: false,
            });
          }
        } catch (error) {
         console.error(
  `[SocialAlerts][YouTube] Failed fan-out for alert ${alert.id}:`,
  error.message
);
        }
      }
    } catch (error) {
      console.error(
  `[SocialAlerts][YouTube] Failed checking creator ${creatorGroup.channelId}:`,
  error.message
);
    }
  }
}

module.exports = {
  checkYouTubeAlerts,
};