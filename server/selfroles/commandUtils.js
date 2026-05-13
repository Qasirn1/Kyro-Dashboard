function extractMessageId(input) {
  if (!input) return null;

  if (input.includes("/")) {
    const parts = input.split("/");
    return parts[parts.length - 1] || null;
  }

  return input;
}

function isUnicodeEmoji(value) {
  if (!value) return false;
  return !value.startsWith("<") && !/^\d+$/.test(value);
}

function parseEmoji(input) {
  if (!input) return null;

  const trimmed = input.trim();

  // Full custom emoji string: <:name:id> or <a:name:id>
  const customMatch = trimmed.match(/^<(a?):([^:]+):(\d+)>$/);
  if (customMatch) {
    return {
      type: "custom",
      id: customMatch[3],
      name: customMatch[2],
      animated: customMatch[1] === "a"
    };
  }

  // Raw custom emoji ID
  if (/^\d+$/.test(trimmed)) {
    return {
      type: "custom",
      id: trimmed,
      name: null,
      animated: false
    };
  }

  // Unicode emoji
  if (isUnicodeEmoji(trimmed)) {
    return {
      type: "unicode",
      value: trimmed
    };
  }

  return null;
}

function isValidHexColor(value) {
  return /^#([A-Fa-f0-9]{6})$/.test(value);
}

module.exports = {
  extractMessageId,
  isUnicodeEmoji,
  parseEmoji,
  isValidHexColor
};