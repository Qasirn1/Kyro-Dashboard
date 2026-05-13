const { createCanvas } = require("canvas");

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function generateCaptchaImage(code) {
  const width = 280;
  const height = 100;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "#0f172a"; // dark premium bg
  ctx.fillRect(0, 0, width, height);

  // noise dots
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // lines
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(randomBetween(0, width), randomBetween(0, height));
    ctx.lineTo(randomBetween(0, width), randomBetween(0, height));
    ctx.stroke();
  }

  // text
  ctx.font = "bold 42px Sans";
  ctx.textBaseline = "middle";

  const spacing = width / (code.length + 1);

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    const x = spacing * (i + 1);
    const y = height / 2;

    const angle = randomBetween(-0.3, 0.3);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(char, -10, 0);

    ctx.restore();
  }

  return canvas.toBuffer();
}

module.exports = {
  generateCaptchaImage
};