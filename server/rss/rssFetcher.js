const Parser = require("rss-parser");
const { URL } = require("url");
const {
  normalizeUrl,
  extractFeedLinksFromHtml
} = require("./rssUtils");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "KyroBot RSS Reader/1.0"
  }
});

const COMMON_FEED_PATHS = [
  "/feed",
  "/rss",
  "/rss.xml",
  "/feed.xml",
  "/atom.xml",
  "/index.xml",
  "/feeds/posts/default?alt=rss",
  "/feeds/posts/default"
];

function createHttpError(message, status, url, bodyPreview = "") {
  const error = new Error(message);
  error.status = status || 0;
  error.url = url || "";
  error.bodyPreview = bodyPreview || "";
  error.isPermanent =
    status === 400 ||
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 404 ||
    status === 410;

  error.code =
    status === 400 ? "BAD_REQUEST" :
    status === 401 ? "UNAUTHORIZED" :
    status === 402 ? "PAYMENT_REQUIRED" :
    status === 403 ? "FORBIDDEN" :
    status === 404 ? "NOT_FOUND" :
    status === 410 ? "GONE" :
    "HTTP_ERROR";

  return error;
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "KyroBot RSS Reader/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    const body = await safeReadText(response);
    throw createHttpError(
      `Failed to fetch HTML: ${response.status} ${response.statusText}`,
      response.status,
      url,
      body.slice(0, 300)
    );
  }

  return response.text();
}

async function parseFeed(feedUrl) {
  const normalized = normalizeUrl(feedUrl);
  if (!normalized) {
    const error = new Error("Invalid feed URL.");
    error.code = "INVALID_URL";
    error.isPermanent = true;
    throw error;
  }

  const response = await fetch(normalized, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "KyroBot RSS Reader/1.0",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
    }
  });

  if (!response.ok) {
    const body = await safeReadText(response);

    console.warn("[RSS FETCH ERROR]", {
      url: normalized,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: body.slice(0, 300)
    });

    throw createHttpError(
      `Failed to fetch feed: ${response.status} ${response.statusText}`,
      response.status,
      normalized,
      body.slice(0, 300)
    );
  }

  const xml = await response.text();

  try {
    const feed = await parser.parseString(xml);
    return feed;
  } catch (err) {
    const error = new Error(`Failed to parse feed XML: ${err.message}`);
    error.code = "PARSE_ERROR";
    error.url = normalized;
    error.isPermanent = false;
    throw error;
  }
}

function getOrigin(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function buildHomepageUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return null;
  }
}

function uniqueUrls(urls = []) {
  const seen = new Set();
  const result = [];

  for (const url of urls) {
    const normalized = normalizeUrl(url);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

async function tryParseCandidateFeed(feedUrl) {
  try {
    const feed = await parseFeed(feedUrl);

    const hasUsefulContent =
      feed &&
      (
        typeof feed.title === "string" ||
        Array.isArray(feed.items)
      );

    if (!hasUsefulContent) {
      return null;
    }

    return {
      feedUrl,
      feed
    };
  } catch (error) {
    if (error?.status === 402) {
      console.warn(`[RSS] Candidate feed returned 402 Payment Required: ${feedUrl}`);
    }
    return null;
  }
}

async function discoverFeedFromWebsite(websiteUrl) {
  const normalized = normalizeUrl(websiteUrl);
  if (!normalized) {
    throw new Error("Invalid website URL.");
  }

  const homepageUrl = buildHomepageUrl(normalized);
  const origin = getOrigin(normalized);

  const htmlCandidates = [];
  const feedCandidates = [];

  htmlCandidates.push(normalized);
  if (homepageUrl && homepageUrl !== normalized) {
    htmlCandidates.push(homepageUrl);
  }

  // 1) Look for rel="alternate" feeds on the given page and homepage
  for (const htmlUrl of uniqueUrls(htmlCandidates)) {
    try {
      const html = await fetchHtml(htmlUrl);
      const feedLinks = extractFeedLinksFromHtml(html, htmlUrl);
      feedCandidates.push(...feedLinks);
    } catch (error) {
      console.warn(`[RSS] Failed HTML discovery on ${htmlUrl}:`, error.message);
    }
  }

  // 2) Try common feed paths on origin
  if (origin) {
    for (const path of COMMON_FEED_PATHS) {
      feedCandidates.push(`${origin}${path}`);
    }
  }

  const uniqueCandidates = uniqueUrls(feedCandidates);

  for (const candidate of uniqueCandidates) {
    const parsed = await tryParseCandidateFeed(candidate);
    if (parsed) {
      return {
        websiteUrl: normalized,
        feedUrl: parsed.feedUrl,
        allFeedUrls: uniqueCandidates,
        feed: parsed.feed
      };
    }
  }

  return {
    websiteUrl: normalized,
    feedUrl: null,
    allFeedUrls: uniqueCandidates,
    feed: null
  };
}

async function resolveWebsiteToFeed(websiteUrl) {
  const discovery = await discoverFeedFromWebsite(websiteUrl);

  if (!discovery.feedUrl || !discovery.feed) {
    return {
      success: false,
      websiteUrl: discovery.websiteUrl,
      feedUrl: null,
      allFeedUrls: discovery.allFeedUrls || [],
      reason: "No RSS/Atom feed found on that website."
    };
  }

  return {
    success: true,
    websiteUrl: discovery.websiteUrl,
    feedUrl: discovery.feedUrl,
    allFeedUrls: discovery.allFeedUrls,
    feed: discovery.feed
  };
}

module.exports = {
  fetchHtml,
  discoverFeedFromWebsite,
  parseFeed,
  resolveWebsiteToFeed
};