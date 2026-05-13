const { createCanvas, loadImage } = require("canvas");
const path = require("path");

function parseCardVariables(text, member) {
  if (!text) return "";

  return text
    .replace(/{user}/g, `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{user\.idname}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(/{server\.member_count}/g, member.guild.memberCount.toString());
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string") {
    return `rgba(0,0,0,${alpha})`;
  }

  let cleanHex = hex.replace("#", "").trim();

  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (cleanHex.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function safeLoadImage(src) {
  try {
    return await loadImage(src);
  } catch (error) {
    return null;
  }
}

async function buildWelcomeCard(member, config = {}) {
  const canvas = createCanvas(1024, 500);
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const cardConfig = config.card || {};
  const backgroundConfig = config.background || {};

  const backgroundUrl =
    cardConfig.backgroundUrl ||
    backgroundConfig.imageUrl ||
    cardConfig.background ||
    null;

  const backgroundColor =
    cardConfig.backgroundColor ||
    backgroundConfig.color ||
    "#000000";

  const textColor = cardConfig.textColor || "#ffffff";
  const overlayOpacity =
    typeof cardConfig.overlayOpacity === "number"
      ? Math.max(0, Math.min(1, cardConfig.overlayOpacity))
      : 0.45;

  const titleText = parseCardVariables(
    cardConfig.title || "WELCOME",
    member
  );

  const subtitleText = parseCardVariables(
    cardConfig.subtitle || member.user.username,
    member
  );

  const showAvatar = cardConfig.showAvatar !== false;

  // =========================
  // BASE BACKGROUND COLOR
  // =========================
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // =========================
  // LOAD BACKGROUND IMAGE
  // =========================
  let background = null;

  if (backgroundUrl) {
    background = await safeLoadImage(backgroundUrl);
  }

  if (!background) {
    const fallbackPath = path.join(
      process.cwd(),
      "src",
      "assets",
      "backgrounds",
      "default.png"
    );

    background = await safeLoadImage(fallbackPath);
  }

  if (background) {
    const ratio = Math.max(
      canvas.width / background.width,
      canvas.height / background.height
    );

    const bgWidth = background.width * ratio;
    const bgHeight = background.height * ratio;

    const bgX = (canvas.width - bgWidth) / 2;
    const bgY = (canvas.height - bgHeight) / 2;

    ctx.drawImage(background, bgX, bgY, bgWidth, bgHeight);
  }

  // =========================
  // OVERLAY
  // =========================
  ctx.fillStyle = hexToRgba("#000000", overlayOpacity);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // =========================
  // AVATAR
  // =========================
  if (showAvatar) {
    try {
      const avatar = await loadImage(
        member.user.displayAvatarURL({ extension: "png", size: 512 })
      );

      const avatarSize = 190;
      const avatarX = canvas.width / 2 - avatarSize / 2;
      const avatarY = 70;

      ctx.save();

      ctx.beginPath();
      ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

      ctx.restore();

      // avatar border
      ctx.beginPath();
      ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2 + 6,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.stroke();
    } catch (error) {
      console.error("Welcome card avatar load error:", error);
    }
  }

  // =========================
  // TEXT
  // =========================
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = textColor;

  const titleY = showAvatar ? 330 : 220;
  const subtitleY = showAvatar ? 395 : 285;

  // title
  ctx.font = "bold 54px Sans";
  ctx.fillText(titleText, canvas.width / 2, titleY, 900);

  // subtitle
  ctx.font = "bold 38px Sans";
  ctx.fillText(subtitleText, canvas.width / 2, subtitleY, 900);

  return canvas.toBuffer("image/png");
}

module.exports = buildWelcomeCard;