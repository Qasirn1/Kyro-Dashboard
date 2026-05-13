module.exports = function parseDuration(input) {
  if (!input || typeof input !== "string") return null;

  const regex = /(\d+)([mhd])/g;
  let total = 0;
  let match;
  let matchedLength = 0;

  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];

    matchedLength += match[0].length;

    if (unit === "m") total += value * 60;
    if (unit === "h") total += value * 60 * 60;
    if (unit === "d") total += value * 60 * 60 * 24;
  }

  // ❌ reject invalid mixed strings
  if (matchedLength !== input.length) return null;

  return total > 0 ? total : null;
};