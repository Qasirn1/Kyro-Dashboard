const { URL } = require("url");

function normalizeUrl(input) {
  if (!input || typeof input !== "string") return null;

  let value = input.trim();

  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    return null;
  }
}

function getBaseUrl(input) {
  try {
    const parsed = new URL(input);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function extractFeedLinksFromHtml(html, pageUrl) {
  if (!html || typeof html !== "string") return [];

  const matches = [
    ...html.matchAll(
      /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]*type=["'](?:application\/rss\+xml|application\/atom\+xml|application\/xml|text\/xml)["'][^>]*href=["']([^"']+)["'][^>]*>/gi
    ),
    ...html.matchAll(
      /<link[^>]+type=["'](?:application\/rss\+xml|application\/atom\+xml|application\/xml|text\/xml)["'][^>]*rel=["'][^"']*alternate[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi
    )
  ];

  const links = [];

  for (const match of matches) {
    const rawHref = match[1];
    if (!rawHref) continue;

    try {
      const absolute = new URL(rawHref, pageUrl).toString();
      links.push(absolute);
    } catch {
      // ignore bad URLs
    }
  }

  return [...new Set(links)];
}

function makeFeedId() {
  return `rss_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

module.exports = {
  normalizeUrl,
  getBaseUrl,
  extractFeedLinksFromHtml,
  makeFeedId
};