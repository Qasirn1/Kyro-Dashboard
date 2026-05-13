const axios = require("axios");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
  getAllEnabledAlerts,
  updateSocialAlert,
  applyAlertVariables,
} = require("./socialAlertsManager");

function getRoleMention(alert) {
  return Array.isArray(alert.pingRoleIds) && alert.pingRoleIds.length > 0
    ? alert.pingRoleIds.map((id) => `<@&${id}>`).join(" ")
    : alert.pingRoleId
    ? `<@&${alert.pingRoleId}>`
    : "";
}

function buildTikTokPostEmbed(alert, postData) {
  const roleMention = getRoleMention(alert);

const description =
  applyAlertVariables(alert.embedDescription, {
    creator: alert.creatorName,
    platform: "TikTok",
    role: roleMention,
    url: postData.url,
  }) || `🔥 **${alert.creatorName}** just dropped a new TikTok`;

  const title =
    applyAlertVariables(alert.embedTitle, {
      creator: alert.creatorName,
      platform: "TikTok",
      role: roleMention,
      url: postData.url,
    }) || `🎵 ${alert.creatorName} just posted on TikTok`

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
   .addFields({
  name: "🎬 Video",
  value: postData.title?.slice(0, 100) || "New TikTok Post",
})
    .setColor("#010101")
    .setTimestamp();

 if (postData.thumbnailUrl) {
  embed.setImage(postData.thumbnailUrl); // 🔥 BIG preview
}
  return embed;
}

function extractTikTokUsername(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  if (raw.startsWith("@")) return raw.slice(1);

  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const atPart = parts.find((part) => part.startsWith("@"));
    if (atPart) return atPart.slice(1);
  } catch {
    // ignore
  }

  return raw.replace(/^@/, "") || null;
}

function normalizeTikTokProviderItem(
  item,
  username,
  fallbackCreatorName,
  fallbackProfileImageUrl
) {
  if (!item || typeof item !== "object") return null;

  const postId = String(
    item.id ||
      item.postId ||
      item.aweme_id ||
      item.videoId ||
      item.video_id ||
      item.awemeId ||
      item.itemId ||
      ""
  ).trim();

  let postUrl = String(
    item.webVideoUrl ||
      item.url ||
      item.link ||
      item.videoUrl ||
      item.shareUrl ||
      item.permalink ||
      ""
  ).trim();

  if (!postUrl && username && postId) {
    postUrl = `https://www.tiktok.com/@${username}/video/${postId}`;
  }

  const title = String(
    item.text ||
      item.desc ||
      item.title ||
      item.caption ||
      item.description ||
      "New TikTok Post"
  ).trim();

  const thumbnailUrl =
    item.covers?.default ||
    item.covers?.origin ||
    item.thumbnailUrl ||
    item.thumbnail ||
    item.cover ||
    item.coverUrl ||
    item.image ||
    item.videoMeta?.coverUrl ||
    item.video?.coverUrl ||
    null;

  const creatorName =
    item.authorMeta?.nickName ||
    item.authorMeta?.nickname ||
    item.authorMeta?.name ||
    item.author?.nickname ||
    item.author?.uniqueId ||
    fallbackCreatorName ||
    username;

  const profileImageUrl =
    item.authorMeta?.avatar ||
    item.authorMeta?.avatarUrl ||
    item.author?.avatarLarger ||
    item.author?.avatarMedium ||
    fallbackProfileImageUrl ||
    null;

  const isValid = Boolean(postId && postUrl);

  return {
    isValid,
    postId,
    url: postUrl,
    title,
    thumbnailUrl,
    creatorName,
    profileImageUrl,
  };
}

function extractCandidateItemsFromProviderData(data) {
  const rootItems = Array.isArray(data) ? data : data ? [data] : [];
  const candidates = [];

  for (const item of rootItems) {
    if (!item || typeof item !== "object") continue;

    candidates.push(item);

    const nestedCollections = [
      item.items,
      item.posts,
      item.videos,
      item.aweme_list,
      item.awemeList,
      item.results,
      item.data,
    ];

    for (const collection of nestedCollections) {
      if (Array.isArray(collection)) {
        for (const nestedItem of collection) {
          candidates.push(nestedItem);
        }
      }
    }
  }

  return candidates;
}

async function fetchLatestTikTokPostFromProvider(alert) {
  const providerBase = process.env.TIKTOK_PROVIDER_URL;
  const apifyToken = process.env.APIFY_TOKEN;

  if (!providerBase) {
    return {
      found: false,
      reason: "TikTok provider URL is not configured.",
    };
  }

  if (!apifyToken) {
    return {
      found: false,
      reason: "APIFY_TOKEN is not configured.",
    };
  }

  const username =
    extractTikTokUsername(alert.creatorUrl) ||
    extractTikTokUsername(alert.creatorId) ||
    extractTikTokUsername(alert.creatorName);

  if (!username) {
    return {
      found: false,
      reason: "Missing TikTok username or creator URL.",
    };
  }

  try {
  const response = await axios.post(
  providerBase,
  {
    profiles: [username],
    resultsLimit: 3,
  },
  {
    timeout: 60000,
    headers: {
      Authorization: `Bearer ${apifyToken}`,
      "Content-Type": "application/json",
      "User-Agent": "KyroBot TikTok Alerts/1.0",
      Accept: "application/json",
    },
  }
);

    const data = response?.data;
    const candidateItems = extractCandidateItemsFromProviderData(data);

    if (!candidateItems.length) {
      return {
        found: false,
        reason: "Provider returned no TikTok items.",
      };
    }

    const normalizedItems = candidateItems
      .map((item) =>
        normalizeTikTokProviderItem(
          item,
          username,
          alert.creatorName,
          alert.profileImageUrl
        )
      )
      .filter(Boolean);

    const firstValidItem = normalizedItems.find((item) => item.isValid) || null;

    if (!firstValidItem) {
      return {
        found: false,
        reason: "Provider returned no valid TikTok post items.",
      };
    }

    return {
      found: true,
      postId: firstValidItem.postId,
      title: firstValidItem.title,
      url: firstValidItem.url,
      thumbnailUrl: firstValidItem.thumbnailUrl,
      creatorName: firstValidItem.creatorName,
      profileImageUrl: firstValidItem.profileImageUrl,
    };
  } catch (error) {
    const status = error?.response?.status || null;
    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      "Unknown TikTok provider error";

    console.error(
      `[SocialAlerts][TikTok] Provider request failed for ${username}:`,
      {
        status,
        message,
        providerBase,
      }
    );

    return {
      found: false,
      reason: message,
      status,
    };
  }
}

async function fetchLatestTikTokPost(alert) {
  return fetchLatestTikTokPostFromProvider(alert);
}

async function checkTikTokAlerts(client) {
  const allAlerts = await getAllEnabledAlerts();
  const tiktokAlerts = allAlerts.filter(
    (alert) => alert.platform === "tiktok" && alert.alertPosts
  );

  if (!tiktokAlerts.length) return;

  for (const alert of tiktokAlerts) {
    try {
      const guild = await client.guilds.fetch(alert.guildId).catch(() => null);
      if (!guild) continue;

      const channel = await guild.channels.fetch(alert.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      const latestPost = await fetchLatestTikTokPost(alert);

            if (!latestPost?.found) {
        if (latestPost?.reason) {
          console.warn(
            `[SocialAlerts][TikTok] Provider returned no usable post for alert ${alert.id} in guild ${alert.guildId}: ${latestPost.reason}`
          );
        }
        continue;
      }

      const updatePatch = {};

      if (latestPost.creatorName && latestPost.creatorName !== alert.creatorName) {
        updatePatch.creatorName = latestPost.creatorName;
      }

      if (
        latestPost.profileImageUrl &&
        latestPost.profileImageUrl !== alert.profileImageUrl
      ) {
        updatePatch.profileImageUrl = latestPost.profileImageUrl;
      }

            if (!alert.lastPostId) {
        await updateSocialAlert(alert.guildId, alert.id, {
          ...updatePatch,
          lastPostId: latestPost.postId,
        });

        continue;
      }

      if (String(latestPost.postId) === String(alert.lastPostId)) {
        if (Object.keys(updatePatch).length > 0) {
          await updateSocialAlert(alert.guildId, alert.id, updatePatch);
        }
        continue;
      }

      const content =
        applyAlertVariables(alert.messageContent, {
          creator: latestPost.creatorName || alert.creatorName,
          platform: "TikTok",
          role: getRoleMention(alert),
          url: latestPost.url,
        }) || null;

      const embed = buildTikTokPostEmbed(
        {
          ...alert,
          creatorName: latestPost.creatorName || alert.creatorName,
        },
        latestPost
      );

     const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel("🎵 Watch Video")
    .setStyle(ButtonStyle.Link)
    .setURL(latestPost.url)
);

const payload = {
  embeds: [embed],
  components: [row],
};

      if (content) payload.content = content;

      if (Array.isArray(alert.pingRoleIds) && alert.pingRoleIds.length > 0) {
        payload.allowedMentions = { roles: alert.pingRoleIds };
      } else if (alert.pingRoleId) {
        payload.allowedMentions = { roles: [alert.pingRoleId] };
      }

            const sentMessage = await channel.send(payload);

      await updateSocialAlert(alert.guildId, alert.id, {
        ...updatePatch,
        lastPostId: latestPost.postId,
      });

    } catch (error) {
      console.error(
        `[SocialAlerts] TikTok alert check failed for guild ${alert.guildId}, alert ${alert.id}:`,
        error
      );
    }
  }
}

module.exports = {
  buildTikTokPostEmbed,
  fetchLatestTikTokPost,
  checkTikTokAlerts,
};