const { getPoll } = require("./pollStorage");
const {
  addVote,
  buildPollButtons,
  buildPollEmbed,
} = require("./pollManager");

async function handlePollInteraction(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("poll_vote_")) return false;

  try {
    const parts = interaction.customId.split("_");
    const pollId = `${parts[2]}_${parts[3]}_${parts[4]}`;
    const optionIndex = Number(parts[5]);

    const poll = await getPoll(pollId);

    if (!poll) {
      await interaction.reply({
        content: "This poll no longer exists.",
        ephemeral: true,
      });
      return true;
    }

    const result = await addVote(pollId, interaction.user.id, optionIndex);

    if (!result.ok) {
      await interaction.reply({
        content: result.message,
        ephemeral: true,
      });
      return true;
    }

    const updatedPoll = result.poll;
    const selectedOption = updatedPoll.options?.[optionIndex];

    await interaction.update({
      embeds: [buildPollEmbed(updatedPoll, true, false)],
      components: buildPollButtons(updatedPoll, false),
    });

    await interaction.followUp({
      content: `Your vote for **${selectedOption?.label || "that option"}** has been recorded.`,
      ephemeral: true,
    });

    return true;
  } catch (error) {
    console.error("[PollInteractions] Error handling poll vote:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "There was an error while recording your vote.",
        ephemeral: true,
      });
    }

    return true;
  }
}

module.exports = {
  handlePollInteraction,
};