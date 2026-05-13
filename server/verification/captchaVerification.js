const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");

const { generateCaptchaImage } = require("./captchaImage");
const { giveVerifiedRole } = require("./verificationManager");

const activeCaptchas = new Map();
const CAPTCHA_EXPIRE_MS = 5 * 60 * 1000; // 5 minutes

function getCaptchaKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function generateCaptchaCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

function clearCaptchaSession(guildId, userId) {
  const key = getCaptchaKey(guildId, userId);
  const session = activeCaptchas.get(key);

  if (session?.timeout) {
    clearTimeout(session.timeout);
  }

  activeCaptchas.delete(key);
}

function createCaptchaSession(guildId, userId, config = {}) {
  clearCaptchaSession(guildId, userId);

  const code = generateCaptchaCode(6);
  const key = getCaptchaKey(guildId, userId);

  const timeout = setTimeout(() => {
    clearCaptchaSession(guildId, userId);
  }, CAPTCHA_EXPIRE_MS);

  const session = {
    code,
    guildId,
    userId,
    createdAt: Date.now(),
    timeout,
    configSnapshot: config,
  };

  activeCaptchas.set(key, session);
  return session;
}

function getCaptchaSession(guildId, userId) {
  const key = getCaptchaKey(guildId, userId);
  return activeCaptchas.get(key) || null;
}

function buildCaptchaOpenButton() {
  const button = new ButtonBuilder()
    .setCustomId("kyro_captcha_open_modal")
    .setLabel("Enter Captcha")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder().addComponents(button);
}

function buildCaptchaModal() {
  const modal = new ModalBuilder()
    .setCustomId("kyro_captcha_modal")
    .setTitle("Captcha Verification");

  const input = new TextInputBuilder()
    .setCustomId("captcha_answer")
    .setLabel("Enter the captcha code")
    .setPlaceholder("Type the code exactly as shown")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(4)
    .setMaxLength(12);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  return modal;
}

async function replyOrEdit(interaction, payload) {
  try {
    if (interaction.replied) {
      return await interaction.followUp({
        ...payload,
        ephemeral: true,
      });
    }

    if (interaction.deferred) {
      return await interaction.editReply(payload);
    }

    return await interaction.reply({
      ...payload,
      ephemeral: true,
    });
  } catch (error) {
    console.error("replyOrEdit captcha error:", error);
    return null;
  }
}

async function startCaptchaVerification(interaction, config) {
  try {
    if (!interaction.guild || !interaction.member) return false;

    const session = createCaptchaSession(
      interaction.guild.id,
      interaction.member.id,
      config
    );

    const buffer = await Promise.resolve(generateCaptchaImage(session.code));
    const attachment = new AttachmentBuilder(buffer, { name: "captcha.png" });

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🔐 Captcha Verification")
      .setDescription(
        `Please type the code shown in the image below.\n\n` +
          `Click **Enter Captcha** to submit.\n` +
          `This expires in **5 minutes**.`
      )
      .setImage("attachment://captcha.png");

    const row = buildCaptchaOpenButton();

    await replyOrEdit(interaction, {
      embeds: [embed],
      components: [row],
      files: [attachment],
    });

    return true;
  } catch (error) {
    console.error("Start captcha verification error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Failed to start captcha verification.",
          ephemeral: true,
        })
        .catch(() => {});
    } else {
      await replyOrEdit(interaction, {
        content: "❌ Failed to start captcha verification.",
      });
    }

    return true;
  }
}

async function openCaptchaModal(interaction) {
  try {
    if (!interaction.isButton()) return false;
    if (interaction.customId !== "kyro_captcha_open_modal") return false;
    if (!interaction.guild || !interaction.member) return false;

    const session = getCaptchaSession(interaction.guild.id, interaction.member.id);

    if (!session) {
      await interaction
        .reply({
          content:
            "❌ Your captcha session expired or was not found. Please click verify again.",
          ephemeral: true,
        })
        .catch(() => {});
      return true;
    }

    const modal = buildCaptchaModal();
    await interaction.showModal(modal);

    return true;
  } catch (error) {
    console.error("Open captcha modal error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Failed to open captcha input.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    return true;
  }
}

async function handleCaptchaModal(interaction, config) {
  try {
    if (!interaction.isModalSubmit()) return false;
    if (interaction.customId !== "kyro_captcha_modal") return false;
    if (!interaction.guild || !interaction.member) return false;

    const session = getCaptchaSession(interaction.guild.id, interaction.member.id);

    if (!session) {
      await interaction
        .reply({
          content:
            "❌ Your captcha session expired or was not found. Please click the verify button again.",
          ephemeral: true,
        })
        .catch(() => {});
      return true;
    }

    const answer = interaction.fields
      .getTextInputValue("captcha_answer")
      ?.trim()
      ?.toUpperCase();

    if (!answer) {
      await interaction
        .reply({
          content: "❌ No captcha answer was provided.",
          ephemeral: true,
        })
        .catch(() => {});
      return true;
    }

    if (answer !== session.code) {
      clearCaptchaSession(interaction.guild.id, interaction.member.id);

      await interaction
        .reply({
          content:
            "❌ Incorrect captcha code. Please click the verify button and try again.",
          ephemeral: true,
        })
        .catch(() => {});
      return true;
    }

    clearCaptchaSession(interaction.guild.id, interaction.member.id);

    const result = await giveVerifiedRole(
      interaction.member,
      config || session.configSnapshot || {}
    );

    await interaction
      .reply({
        content: result?.message || "✅ Verification completed.",
        ephemeral: true,
      })
      .catch(() => {});

    return true;
  } catch (error) {
    console.error("Handle captcha modal error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Something went wrong while checking your captcha.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    return true;
  }
}

module.exports = {
  activeCaptchas,
  generateCaptchaCode,
  createCaptchaSession,
  getCaptchaSession,
  clearCaptchaSession,
  startCaptchaVerification,
  openCaptchaModal,
  handleCaptchaModal,
};