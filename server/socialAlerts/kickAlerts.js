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

const KICK_TIMEOUT_MS = 15000;

function getRoleMention(alert) {
  return Array.isArray(alert.pingRoleIds) && alert.pingRoleIds.length > 0
    ? alert.pingRoleIds.map((id) => `<@&${id}>`).join(" ")
    : alert.pingRoleId
    ? `<@&${alert.pingRoleId}>`
    : "";
}

function extractKickUsername(urlOrUsername = "") {
  const clean = String(urlOrUsername).trim();

  const match = clean.match(/kick\.com\/([a-zA-Z0-9_]+)/i);
  if (match) return match[1].toLowerCase();

  return clean.replace(/^@/, "").toLowerCase();
}

async function fetchKickChannel(username) {
  try {
    const response = await axios.get(`https://kick.com/api/v2/channels/${username}`, {
      timeout: KICK_TIMEOUT_MS,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 KyroBot/1.0",
      },
    });

    return response.data || null;
  } catch (error) {
    console.error(`[SocialAlerts][Kick] fetch error for ${username}:`, error.message);
    return null;
  }
}

function normalizeKickChannelData(data) {
  if (!data) return null;

  const slug =
    data.slug ||
    data.user?.username ||
    data.user?.slug ||
    null;

  const creatorName =
    data.user?.username ||
    data.user?.display_name ||
    data.name ||
    slug ||
    "Kick Streamer";

  const profileImageUrl =
    data.user?.profile_pic ||
    data.user?.profile_picture ||
    data.user?.avatar ||
    null;

  const stream = data.stream || data.livestream || null;

  const isLive = Boolean(
    stream?.is_live ||
    data.is_live ||
    data.livestream?.is_live
  );

  const startedAt =
    stream?.start_time ||
    data.stream?.start_time ||
    data.livestream?.start_time ||
    null;

  const streamTitle =
    data.stream_title ||
    stream?.session_title ||
    stream?.title ||
    "Live Now";

  const categoryName =
    data.category?.name ||
    stream?.category?.name ||
    stream?.categories?.[0]?.name ||
    data.categories?.[0]?.name ||
    data.recent_categories?.[0]?.name ||
    "Unknown";

  const viewerCount =
    stream?.viewer_count != null
      ? String(stream.viewer_count)
      : "0";

  const imageUrl =
    stream?.thumbnail?.url ||
    stream?.thumbnail ||
    stream?.poster ||
    stream?.preview ||
    data.banner_picture ||
    null;

  const url = slug ? `https://kick.com/${slug}` : "https://kick.com";

  return {
    found: true,
    slug,
    creatorName,
    profileImageUrl,
    isLive,
    startedAt,
    streamTitle,
    categoryName,
    viewerCount,
    imageUrl,
    url,
  };
}

function buildKickLiveSessionFingerprint(liveData) {
  if (!liveData) return null;

  const startedAt = liveData.startedAt ? String(liveData.startedAt) : "";
  const slug = liveData.slug ? String(liveData.slug) : "";
  const title = liveData.streamTitle ? String(liveData.streamTitle) : "";

  if (slug && startedAt) {
    return `kick:${slug}:${startedAt}`;
  }

  if (slug && title) {
    return `kick:${slug}:${title}`;
  }

  if (slug) {
    return `kick:${slug}:live`;
  }

  return null;
}

function buildKickEmbed(alert, liveData) {
  const roleMention = getRoleMention(alert);

  const title =
    applyAlertVariables(alert.embedTitle, {
      creator: alert.creatorName,
      platform: "Kick",
      role: roleMention,
      url: liveData.url,
    }) || "🟢 Kick Live";

  const description =
    applyAlertVariables(alert.embedDescription, {
      creator: alert.creatorName,
      platform: "Kick",
      role: roleMention,
      url: liveData.url,
    }) || `🎮 **${alert.creatorName}** is live on Kick!`;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${alert.creatorName} is LIVE 🔴`,
      url: liveData.url,
      iconURL: alert.profileImageUrl || liveData.profileImageUrl || undefined,
    })
    .setTitle(title)
    .setURL(liveData.url)
    .setDescription(description)
    .addFields(
      { name: "Stream", value: liveData.streamTitle || "Live Now" },
      { name: "Game", value: liveData.categoryName || "Unknown", inline: true },
      { name: "Viewers", value: liveData.viewerCount || "0", inline: true }
    )
    .setColor("#53FC18")
    .setTimestamp();

  if (alert.profileImageUrl || liveData.profileImageUrl) {
    embed.setThumbnail(alert.profileImageUrl || liveData.profileImageUrl);
  }

  if (liveData.imageUrl) {
    embed.setImage(liveData.imageUrl);
  }

  return embed;
}

function buildKickButtonRow(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Watch Live")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
      .setEmoji("🟢")
  );
}

async function sendKickAlert(client, alert, liveData) {
  const guild = await client.guilds.fetch(alert.guildId).catch(() => null);
  if (!guild) return false;

  const channel = await guild.channels.fetch(alert.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const content =
    applyAlertVariables(alert.messageContent, {
      creator: alert.creatorName,
      platform: "Kick",
      role: getRoleMention(alert),
      url: liveData.url,
    }) || null;

  await channel.send({
    content,
    embeds: [buildKickEmbed(alert, liveData)],
    components: [buildKickButtonRow(liveData.url)],
  });

  return true;
}

async function checkKickAlerts(client) {
  const allAlerts = await getAllEnabledAlerts();
  const kickAlerts = allAlerts.filter(
    (alert) => alert.platform === "kick" && alert.alertLives
  );

  if (!kickAlerts.length) {
    return;
  }

  const groupedByUsername = new Map();

  for (const alert of kickAlerts) {
    try {
      const username = extractKickUsername(
        alert.creatorUrl || alert.creatorId || alert.creatorName
      );

      if (!username) continue;

      if (!groupedByUsername.has(username)) {
        groupedByUsername.set(username, []);
      }

      groupedByUsername.get(username).push(alert);
    } catch (error) {
      console.error(
        `[SocialAlerts][Kick] Failed grouping alert ${alert.id}:`,
        error.message
      );
    }
  }

  for (const [username, alerts] of groupedByUsername.entries()) {
    try {
      const rawData = await fetchKickChannel(username);

      if (!rawData) {
       
        continue;
      }

      const liveData = normalizeKickChannelData(rawData);

      if (!liveData) {
        continue;
      }

      const liveSessionId = buildKickLiveSessionFingerprint(liveData);

      for (const alert of alerts) {
        try {
          const startupDelayMs = 1000 * 60 * 2; // 2 minutes
          const isStartupWarmup =
            global.KYRO_START_TIME &&
            Date.now() - global.KYRO_START_TIME < startupDelayMs;

          if (
            liveData.profileImageUrl &&
            liveData.profileImageUrl !== alert.profileImageUrl
          ) {
            await updateSocialAlert(alert.guildId, alert.id, {
              profileImageUrl: liveData.profileImageUrl,
              creatorName: liveData.creatorName || alert.creatorName,
            });

            alert.profileImageUrl = liveData.profileImageUrl;
            alert.creatorName = liveData.creatorName || alert.creatorName;
          }

          const wasLive = Boolean(alert.isLive);
          const previousSessionId = alert.lastLiveVideoId || null;

          if (!liveData.isLive) {
            if (wasLive) {
           

              await updateSocialAlert(alert.guildId, alert.id, {
                isLive: false,
                lastLiveAt: null,
              });
            }

            continue;
          }

          const isSameLiveSession =
            wasLive &&
            previousSessionId &&
            liveSessionId &&
            previousSessionId === liveSessionId;

          if (isSameLiveSession) {
            continue;
          }

          if (wasLive && !previousSessionId && liveSessionId) {
            await updateSocialAlert(alert.guildId, alert.id, {
              lastLiveVideoId: liveSessionId,
            });
            continue;
          }

        

          if (isStartupWarmup) {
         
            continue;
          }

          const sent = await sendKickAlert(client, alert, liveData);

          if (sent) {
            await updateSocialAlert(alert.guildId, alert.id, {
              isLive: true,
              lastLiveAt: new Date().toISOString(),
              lastLiveVideoId: liveSessionId,
              creatorName: liveData.creatorName || alert.creatorName,
              profileImageUrl:
                liveData.profileImageUrl || alert.profileImageUrl || null,
            });
          }
        } catch (error) {
          console.error(
            `[SocialAlerts][Kick] Failed fan-out for alert ${alert.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        `[SocialAlerts][Kick] Failed checking grouped creator ${username}:`,
        error.message
      );
    }
  }
}

module.exports = {
  checkKickAlerts,
};