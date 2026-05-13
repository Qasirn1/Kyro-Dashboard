const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

/* ===============================
   FONT (SAFE LOAD)
================================ */
try {
  registerFont(
    path.join(__dirname, "../assets/fonts/Inter-Bold.ttf"),
    { family: "Inter" }
  );
} catch (err) {
  console.warn("⚠️ Inter font not found, using default font");
}

/* ===============================
   XP CURVE (MUST MATCH levelUtils)
================================ */
function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

/* ===============================
   ROUNDED RECT
================================ */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, h / 2, w / 2));

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawRoundedBar(ctx, x, y, w, h, progress, colors, shadowColor) {
  ctx.fillStyle = "#2b2d31";
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();

  const safeProgress = Math.max(0, Math.min(progress, 1));
  const fillWidth = Math.max(0, w * safeProgress);

  if (fillWidth <= 0) return;

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 10;

  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);

  ctx.fillStyle = grad;
  roundRect(ctx, x, y, fillWidth, h, 6);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawImageCover(ctx, image, x, y, w, h) {
  const imgWidth = image.width;
  const imgHeight = image.height;

  const scale = Math.max(w / imgWidth, h / imgHeight);

  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;

  const dx = x + (w - drawWidth) / 2;
  const dy = y + (h - drawHeight) / 2;

  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}
/* ===============================
   EXPORT
================================ */
module.exports = async (member, data, rank, levelingConfig = {}) => {
  const {
    chatXP = 0,            // current level progress XP only
    totalChatXP = 0,       // total stored chat XP
    chatLevel = 1,
    voiceXP = 0,           // current level progress XP only
    totalVoiceXP = 0,      // total stored voice XP
    voiceLevel = 0,
  } = data;

  const safeChatLevel = Math.max(1, Number(chatLevel) || 1);
  const safeVoiceLevel = Math.max(0, Number(voiceLevel) || 0);

  const safeChatXP = Math.max(0, Number(chatXP) || 0);
  const safeVoiceXP = Math.max(0, Number(voiceXP) || 0);

  const safeTotalChatXP = Math.max(0, Number(totalChatXP) || 0);
  const safeTotalVoiceXP = Math.max(0, Number(totalVoiceXP) || 0);

  const chatNextXP = xpForLevel(safeChatLevel);
  const voiceDisplayLevel = Math.max(1, safeVoiceLevel);
  const voiceNextXP = xpForLevel(voiceDisplayLevel);

  const chatProgress = chatNextXP > 0 ? safeChatXP / chatNextXP : 0;
  const voiceProgress = voiceNextXP > 0 ? safeVoiceXP / voiceNextXP : 0;

  const canvas = createCanvas(900, 280);
  const ctx = canvas.getContext("2d");

    /* ========== BACKGROUND ========== */
  let background;

  try {
    const customBackground = levelingConfig?.rankCard?.backgroundImage;

    if (customBackground) {
      background = await loadImage(customBackground);
    } else {
      background = await loadImage(
        path.join(__dirname, "../assets/backgrounds/dark.png")
      );
    }
  } catch (err) {
    console.log("Rank card background failed, using default.");
    background = await loadImage(
      path.join(__dirname, "../assets/backgrounds/dark.png")
    );
  }

    drawImageCover(ctx, background, 0, 0, canvas.width, canvas.height);

  /* ========== AVATAR ========== */
  const avatar = await loadImage(
    member.user.displayAvatarURL({ extension: "png", size: 256 })
  );

  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 140, 70, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, 50, 70, 140, 140);
  ctx.restore();

  /* ========== TEXT ========== */
  ctx.font = "28px Inter";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(member.user.username, 220, 80);

  ctx.font = "16px Inter";
  ctx.fillStyle = "#7ffcff";
  ctx.fillText(`Chat LVL ${safeChatLevel}`, 220, 108);

  ctx.fillStyle = "#c7a6ff";
  ctx.fillText(`Voice LVL ${safeVoiceLevel}`, 340, 108);

  ctx.font = "13px Inter";
  ctx.fillStyle = "#b0b3b8";
  ctx.fillText(`Rank #${rank}`, 220, 128);

  /* ========== CHAT XP BAR ========== */
  ctx.fillText(`Level XP: ${safeChatXP} / ${chatNextXP}`, 220, 155);
  ctx.fillText(`Total XP: ${safeTotalChatXP}`, 520, 155);

  drawRoundedBar(
    ctx,
    220,
    165,
    500,
    11,
    chatProgress,
    ["#00ffff", "#5fffff"],
    "#00ffff"
  );

  /* ========== VOICE XP BAR ========== */
  ctx.fillText(`Level XP: ${safeVoiceXP} / ${voiceNextXP}`, 220, 205);
  ctx.fillText(`Total XP: ${safeTotalVoiceXP}`, 520, 205);

  drawRoundedBar(
    ctx,
    220,
    215,
    500,
    11,
    voiceProgress,
    ["#b084ff", "#d6c2ff"],
    "#b084ff"
  );

  return canvas.toBuffer();
};