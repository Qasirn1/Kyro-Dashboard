function generateGiveawayId() {
  return `gw_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function parseDuration(input) {
  if (!input || typeof input !== "string") return null;

  const match = input.trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (isNaN(value) || value <= 0) return null;

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "Ended";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

function formatRelativeTime(endAt) {
  if (!endAt) return "Unknown";

  const unix = Math.floor(endAt / 1000);
  return `<t:${unix}:R>`;
}

function formatFullTime(endAt) {
  if (!endAt) return "Unknown";

  const unix = Math.floor(endAt / 1000);
  return `<t:${unix}:F>`;
}

function isValidWinnerCount(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 && num <= 50;
}

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    const validProtocols = ["http:", "https:"];

    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }

    return /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url);
  } catch {
    return false;
  }
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  return trimmed.length ? trimmed : null;
}

function pickWinners(entries = [], winnerCount = 1) {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const uniqueEntries = [...new Set(entries)];
  const shuffled = [...uniqueEntries].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, Math.min(winnerCount, uniqueEntries.length));
}

function userHasRequiredRole(member, requiredRoleId) {
  if (!requiredRoleId) return true;
  if (!member || !member.roles || !member.roles.cache) return false;

  return member.roles.cache.has(requiredRoleId);
}

module.exports = {
  generateGiveawayId,
  parseDuration,
  formatDuration,
  formatRelativeTime,
  formatFullTime,
  isValidWinnerCount,
  isValidImageUrl,
  normalizeImageUrl,
  pickWinners,
  userHasRequiredRole,
};