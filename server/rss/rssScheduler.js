const { EmbedBuilder } = require("discord.js");

const {
  loadAllRssFeeds,
  saveAllRssFeeds,
} = require("./rssManager");

const {
  parseFeed,
} = require("./rssFetcher");

let rssInterval = null;
let rssStartupTimeout = null;
let rssRunning = false;

function stripHtml(html = "") {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max = 300) {
  const value = String(text || "").trim();
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function getItemId(item) {
  return item?.guid || item?.id || item?.link || item?.title || null;
}

function getItemDate(item) {
  return item?.isoDate || item?.pubDate || item?.published || null;
}

function getItemDescription(item) {
  return truncate(
    stripHtml(
      item?.contentSnippet ||
        item?.content ||
        item?.summary ||
        item?.description ||
        ""
    ),
    400
  );
}

function getItemImage(item) {
  if (!item) return null;

  if (item.enclosure?.url) return item.enclosure.url;
  if (item.image?.url) return item.image.url;
  if (typeof item.image === "string") return item.image;
  if (item.thumbnail) return item.thumbnail;

  if (Array.isArray(item.enclosures) && item.enclosures.length) {
    const firstImageEnclosure = item.enclosures.find((entry) =>
      String(entry?.type || "").startsWith("image/")
    );
    if (firstImageEnclosure?.url) return firstImageEnclosure.url;
  }

  const htmlSources = [
    item.content,
    item["content:encoded"],
    item.summary,
    item.description,
  ].filter(Boolean);

  for (const html of htmlSources) {
    const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match?.[1]) return match[1];
  }

  if (item.media?.thumbnail?.url) return item.media.thumbnail.url;
  if (item.media?.content?.url) return item.media.content.url;

  return null;
}

function normalizeTextForFingerprint(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

function normalizeUrlForFingerprint(value) {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];

    for (const key of trackingParams) {
      url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return String(value || "").trim();
  }
}

function getItemFingerprint(item) {
  const stableLink = normalizeUrlForFingerprint(item?.link || "");
  const stableTitle = normalizeTextForFingerprint(item?.title || "");
  const stableDate = String(getItemDate(item) || "").trim();

  return [stableLink, stableTitle, stableDate].join("::");
}

function getRecentFingerprints(feedConfig) {
  return Array.isArray(feedConfig?.recentPostFingerprints)
    ? feedConfig.recentPostFingerprints.filter(Boolean).map(String)
    : [];
}

function rememberFingerprint(feedConfig, fingerprint) {
  const recent = getRecentFingerprints(feedConfig);

  if (fingerprint) {
    recent.unshift(String(fingerprint));
  }

  const unique = [...new Set(recent)].slice(0, 15);

  feedConfig.recentPostFingerprints = unique;
  feedConfig.lastPostFingerprint = fingerprint || null;
}

function isFingerprintAlreadySeen(feedConfig, fingerprint) {
  if (!fingerprint) return false;

  if (
    feedConfig?.lastPostFingerprint &&
    String(feedConfig.lastPostFingerprint) === String(fingerprint)
  ) {
    return true;
  }

  return getRecentFingerprints(feedConfig).includes(String(fingerprint));
}

function getComparableTimestamp(item) {
  const raw = getItemDate(item);
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

function isMeaningfulFeedItem(item) {
  if (!item || typeof item !== "object") return false;

  const hasTitle = Boolean(String(item.title || "").trim());
  const hasLink = Boolean(String(item.link || "").trim());
  const hasGuid = Boolean(String(item.guid || item.id || "").trim());
  const hasDate = Boolean(getItemDate(item));
  const hasDescription = Boolean(getItemDescription(item));

  return hasTitle || hasLink || hasGuid || hasDate || hasDescription;
}

function getMeaningfulItems(items = []) {
  return Array.isArray(items) ? items.filter(isMeaningfulFeedItem) : [];
}

function findNewestUnseenItem(feedConfig, items = []) {
  const recentItems = getMeaningfulItems(items).slice(0, 8);
  const lastPostedTime = feedConfig?.lastPostDate
    ? new Date(feedConfig.lastPostDate).getTime()
    : null;

  for (const item of recentItems) {
    const fingerprint = getItemFingerprint(item);
    const itemTime = getComparableTimestamp(item);

    if (isFingerprintAlreadySeen(feedConfig, fingerprint)) {
      continue;
    }

    if (
      Number.isFinite(lastPostedTime) &&
      Number.isFinite(itemTime) &&
      itemTime < lastPostedTime
    ) {
      continue;
    }

    return item;
  }

  return null;
}

function buildRssEmbed(feedConfig, item, parsedFeed) {
  const title = truncate(item?.title || parsedFeed?.title || "New RSS Post", 256);
  const description = truncate(getItemDescription(item), 220);
  const articleUrl = item?.link || feedConfig.feedUrl || feedConfig.url || null;
  const cleanArticleUrl = articleUrl
    ? normalizeUrlForFingerprint(articleUrl)
    : null;
  const image = getItemImage(item);

  const sourceTitle = truncate(feedConfig.title || parsedFeed?.title || "Feed", 120);
  const sourceUrl = feedConfig.url ? normalizeUrlForFingerprint(feedConfig.url) : null;

  const rawPublished = getItemDate(item);
  const publishedDate = rawPublished ? new Date(rawPublished) : null;
  const publishedTimestamp =
    publishedDate && Number.isFinite(publishedDate.getTime())
      ? Math.floor(publishedDate.getTime() / 1000)
      : null;

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle(title || "New RSS Post")
    .setFooter({
      text: sourceTitle || "RSS Feed",
    })
    .setTimestamp(publishedDate && Number.isFinite(publishedDate.getTime()) ? publishedDate : new Date());

  if (cleanArticleUrl) {
    embed.setURL(cleanArticleUrl);
  }

  if (description) {
    embed.setDescription(description);
  }

  if (image) {
    embed.setImage(image);
  }

  const fields = [];

  if (publishedTimestamp) {
    fields.push({
      name: "🕒 Published",
      value: `<t:${publishedTimestamp}:f>`,
      inline: false,
    });
  }

  if (sourceUrl) {
    fields.push({
      name: "🌐 Source",
      value: truncate(sourceUrl, 1024),
      inline: false,
    });
  }

  if (cleanArticleUrl) {
    fields.push({
      name: "🔗 Read Article",
      value: truncate(cleanArticleUrl, 1024),
      inline: false,
    });
  }

  if (fields.length) {
    embed.addFields(fields);
  }

  return embed;
}

function setFeedChecked(feedConfig) {
  feedConfig.lastChecked = new Date().toISOString();
}

function clearFeedError(feedConfig) {
  feedConfig.lastError = null;
  feedConfig.lastErrorCode = null;
  feedConfig.lastErrorStatus = null;
  feedConfig.lastSuccessfulCheck = new Date().toISOString();
}

function setFeedError(feedConfig, error) {
  feedConfig.lastError = error?.message || "Unknown RSS error";
  feedConfig.lastErrorCode = error?.code || null;
  feedConfig.lastErrorStatus = error?.status || error?.response?.status || null;
}

function shouldTreatAsPermanentFailure(status) {
  return [400, 401, 402, 403, 404, 410].includes(Number(status));
}

function getPauseReasonForStatus(status) {
  const code = Number(status);

  if (code === 400) return "Feed returned 400 Bad Request";
  if (code === 401) return "Feed returned 401 Unauthorized";
  if (code === 402) return "Feed provider returned 402 Payment Required";
  if (code === 403) return "Feed returned 403 Forbidden";
  if (code === 404) return "Feed returned 404 Not Found";
  if (code === 410) return "Feed returned 410 Gone";

  return "Feed paused due to permanent HTTP failure";
}

async function processFeed(client, guildId, feedConfig) {
  if (!feedConfig?.enabled || !feedConfig?.feedUrl || !feedConfig?.channelId) {
    return { changed: false };
  }

  if (feedConfig.paused) {
    return { changed: false };
  }

  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return { changed: false };

    const channel = await guild.channels.fetch(feedConfig.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return { changed: false };

    const parsedFeed = await parseFeed(feedConfig.feedUrl);
    const items = getMeaningfulItems(parsedFeed?.items || []);
    const latestItem = items.length ? items[0] : null;

    if (!latestItem) {
      setFeedChecked(feedConfig);
      clearFeedError(feedConfig);
      return { changed: true };
    }

    const latestItemId = getItemId(latestItem);
    const latestItemDate = getItemDate(latestItem);
    const latestItemFingerprint = getItemFingerprint(latestItem);

    // First sync only: save latest state, do not post old content
    if (
      !feedConfig.lastPostId &&
      !feedConfig.lastPostDate &&
      !feedConfig.lastPostFingerprint
    ) {
      feedConfig.lastPostId = latestItemId || null;
      feedConfig.lastPostDate = latestItemDate || null;
      rememberFingerprint(feedConfig, latestItemFingerprint);
      setFeedChecked(feedConfig);
      clearFeedError(feedConfig);

      return { changed: true };
    }

    const candidateItem = findNewestUnseenItem(feedConfig, items);

    if (!candidateItem) {
      setFeedChecked(feedConfig);
      clearFeedError(feedConfig);
      return { changed: true };
    }

    const candidateItemId = getItemId(candidateItem);
    const candidateItemDate = getItemDate(candidateItem);
    const candidateFingerprint = getItemFingerprint(candidateItem);

    const embed = buildRssEmbed(feedConfig, candidateItem, parsedFeed);

    const messagePayload = {
      embeds: [embed],
    };

    if (feedConfig.roleId) {
      messagePayload.content = `<@&${feedConfig.roleId}>`;
      messagePayload.allowedMentions = {
        roles: [feedConfig.roleId],
      };
    }

    await channel.send(messagePayload);

    feedConfig.lastPostId = candidateItemId || null;
    feedConfig.lastPostDate = candidateItemDate || null;
    rememberFingerprint(feedConfig, candidateFingerprint);
    setFeedChecked(feedConfig);
    clearFeedError(feedConfig);

    return { changed: true };
  } catch (error) {
    const status = error?.status || error?.response?.status || null;

    setFeedChecked(feedConfig);
    setFeedError(feedConfig, error);

    if (shouldTreatAsPermanentFailure(status)) {
      feedConfig.paused = true;
      feedConfig.pauseReason = getPauseReasonForStatus(status);

      console.warn(
        `[RSS] Feed ${feedConfig?.id || "unknown"} for guild ${guildId} returned permanent status ${status} and has been paused.`
      );

      return { changed: true };
    }

    console.error(
      `[RSS] Failed to process feed ${feedConfig?.id || "unknown"} for guild ${guildId}:`,
      error?.message || "Unknown RSS error"
    );

    return { changed: true };
  }
}

async function runRssCheck(client) {
  if (!client) return;

  if (rssRunning) {
    console.warn("[RSS] Previous run still active, skipping this cycle.");
    return;
  }

  rssRunning = true;
  const startedAt = Date.now();

  try {
    const data = await loadAllRssFeeds();
    let changedAny = false;
    const jobs = [];

    for (const [guildId, guildConfig] of Object.entries(data)) {
      if (
        !guildConfig?.enabled ||
        !Array.isArray(guildConfig.feeds) ||
        !guildConfig.feeds.length
      ) {
        continue;
      }

      for (const feedConfig of guildConfig.feeds) {
        jobs.push(
          processFeed(client, guildId, feedConfig)
            .then((result) => {
              if (result?.changed) changedAny = true;
            })
            .catch((error) => {
              console.error(
                `[RSS] Feed job failed for guild ${guildId}, feed ${feedConfig?.id || "unknown"}:`,
                error?.message || error
              );
            })
        );
      }
    }

    await Promise.allSettled(jobs);

    if (changedAny) {
      await saveAllRssFeeds(data);
    }


  } catch (error) {
    console.error("[RSS] Scheduler run failed:", error);
  } finally {
    rssRunning = false;
  }
}

function startRssScheduler(client, intervalMs = 5 * 60 * 1000) {
  if (!client) {
    console.error("[RSS] Cannot start scheduler without client.");
    return;
  }

  if (rssInterval) {
    clearInterval(rssInterval);
    rssInterval = null;
  }

  if (rssStartupTimeout) {
    clearTimeout(rssStartupTimeout);
    rssStartupTimeout = null;
  }

  console.log(`[RSS] Scheduler started. Interval: ${intervalMs}ms`);

  rssStartupTimeout = setTimeout(() => {
    runRssCheck(client)
      .catch((error) => {
        console.error("[RSS] Initial scheduler run failed:", error);
      })
      .finally(() => {
        rssStartupTimeout = null;
      });
  }, 15000);

  rssInterval = setInterval(() => {
    runRssCheck(client).catch((error) => {
      console.error("[RSS] Interval scheduler run failed:", error);
    });
  }, intervalMs);

  return rssInterval;
}

function stopRssScheduler() {
  if (rssInterval) {
    clearInterval(rssInterval);
    rssInterval = null;
  }

  if (rssStartupTimeout) {
    clearTimeout(rssStartupTimeout);
    rssStartupTimeout = null;
  }

}

module.exports = {
  startRssScheduler,
  stopRssScheduler,
  runRssCheck,
};