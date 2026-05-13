const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { joinGiveaway, leaveGiveaway } = require("./giveawayManager");
const { getGiveaway } = require("./giveawayStorage");

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch {
    return null;
  }
}

async function handleGiveawayButton(interaction) {
  if (!interaction.isButton()) return false;

  if (
    !interaction.customId.startsWith("giveaway_join_") &&
    !interaction.customId.startsWith("giveaway_leave_") &&
    !interaction.customId.startsWith("giveaway_participants_")
  ) {
    return false;
  }

  try {
    const parts = interaction.customId.split("_");
    const action = parts[1];
    const giveawayId = parts.slice(2).join("_");

    if (!action || !giveawayId) {
      await safeReply(interaction, {
        content: "❌ Invalid giveaway button.",
        ephemeral: true,
      });
      return true;
    }

    if (action === "join") {
      const result = await joinGiveaway({
        guild: interaction.guild,
        giveawayId,
        userId: interaction.user.id,
      });

      await safeReply(interaction, {
        content: result.message,
        ephemeral: true,
      });

      return true;
    }

    if (action === "leave") {
      const result = await leaveGiveaway({
        guild: interaction.guild,
        giveawayId,
        userId: interaction.user.id,
      });

      await safeReply(interaction, {
        content: result.message,
        ephemeral: true,
      });

      return true;
    }

    if (action === "participants") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await safeReply(interaction, {
          content: "❌ Only admins can view giveaway participants.",
          ephemeral: true,
        });
        return true;
      }

      const giveaway = await getGiveaway(interaction.guild.id, giveawayId);

      if (!giveaway) {
        await safeReply(interaction, {
          content: "❌ Giveaway not found.",
          ephemeral: true,
        });
        return true;
      }

      const entries = Array.isArray(giveaway.entries) ? giveaway.entries : [];

      const participantList = entries.length
        ? entries.slice(0, 50).map((id) => `• <@${id}>`).join("\n")
        : "No participants yet.";

     const embed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle("🎉 Giveaway Participants")
  .setDescription(
    entries.length
      ? entries.slice(0, 50).map((id) => `• <@${id}>`).join("\n")
      : "No participants yet."
  )
  .addFields(
    {
      name: "Prize",
      value: giveaway.prize || "Unknown",
      inline: true,
    },
    {
      name: "Total Entries",
      value: `${entries.length}`,
      inline: true,
    },
    {
      name: "Host",
      value:
        giveaway.hostId && /^\d+$/.test(String(giveaway.hostId))
          ? `<@${giveaway.hostId}>`
          : "Dashboard Giveaway",
      inline: true,
    }
  )
  .setFooter({
    text: `Giveaway ID: ${giveaway.id || giveawayId}`,
  })
  .setTimestamp();

      if (entries.length > 50) {
        embed.addFields({
          name: "Note",
          value: "Showing first 50 participants only.",
        });
      }

      await safeReply(interaction, {
        embeds: [embed],
        ephemeral: true,
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error("[Giveaways] Button interaction error:", error);

    await safeReply(interaction, {
      content: "❌ Giveaway interaction failed. Check bot logs.",
      ephemeral: true,
    });

    return true;
  }
}

module.exports = {
  handleGiveawayButton,
};