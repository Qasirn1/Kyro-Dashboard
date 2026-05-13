function extractMessageId(input) {

  if (input.includes("/")) {
    const parts = input.split("/");
    return parts[parts.length - 1];
  }

  return input;
}

module.exports = { extractMessageId };