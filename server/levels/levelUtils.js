const fs = require("fs");
const path = require("path");

const levelsPath = path.join(process.cwd(), "data", "levels.json");

/* ===============================
   XP CURVE (SOURCE OF TRUTH)
================================ */
function getRequiredXP(level) {
  return 5 * level * level + 50 * level + 100;
}

/* ===============================
   CALCULATE LEVEL FROM TOTAL XP
   totalXP => current level + current level progress XP
================================ */
function calculateFromTotalXP(totalXP = 0) {
  let level = 1;
  let remaining = Math.max(0, Number(totalXP) || 0);

  while (remaining >= getRequiredXP(level)) {
    remaining -= getRequiredXP(level);
    level++;
  }

  return { level, remaining };
}

/* ===============================
   UPDATE LEVELS (OLD FORMAT SUPPORT)
   Keeps compatibility with places still using userData object
================================ */
function updateLevels(userData = {}) {
  userData.totalChatXP = Math.max(0, Number(userData.totalChatXP) || 0);
  userData.totalVoiceXP = Math.max(0, Number(userData.totalVoiceXP) || 0);

  const chat = calculateFromTotalXP(userData.totalChatXP);
  userData.chatLevel = chat.level;
  userData.chatXP = chat.remaining;

  const voice = calculateFromTotalXP(userData.totalVoiceXP);
  userData.voiceLevel = voice.level;
  userData.voiceXP = voice.remaining;

  return userData;
}

/* ===============================
   LEGACY JSON LEADERBOARD
   Kept only so old imports do not break
================================ */
function getLeaderboard(guildId) {
  if (!fs.existsSync(levelsPath)) return [];

  const data = JSON.parse(fs.readFileSync(levelsPath, "utf8"));
  const guildData = data[guildId] || {};

  return Object.entries(guildData)
    .map(([userId, u]) => ({
      userId,
      xp: u.totalChatXP ?? 0,
      level: u.chatLevel ?? 1,
    }))
    .sort((a, b) =>
      b.level !== a.level ? b.level - a.level : b.xp - a.xp
    );
}

module.exports = {
  getRequiredXP,
  calculateFromTotalXP,
  updateLevels,
  getLeaderboard,
};