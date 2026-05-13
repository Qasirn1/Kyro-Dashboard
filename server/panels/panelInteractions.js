const { loadPanels } = require("./panelManager");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const data = await loadPanels();
  const guildPanels = data?.[interaction.guildId]?.panels || [];

  if (!guildPanels.length) return;

  for (const panel of guildPanels) {
    const buttons = Array.isArray(panel?.buttons) ? panel.buttons : [];
    const button = buttons.find((b) => b.id === interaction.customId);

    if (!button) continue;

    // ROLE BUTTON
    if (button.type === "role") {
      const role = interaction.guild.roles.cache.get(button.roleId);

      if (!role) return;

      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: `⚠️ You already have the <@&${role.id}> role.`,
          flags: 64,
        });
      }

      await interaction.member.roles.add(role);

      return interaction.reply({
        content: `✅ Gave you the <@&${role.id}> role.`,
        flags: 64,
      });
    }

    // MESSAGE BUTTON (JSON popup)
    if (button.type === "message") {
      try {
        let jsonData = button.message?.json;

        if (!jsonData) {
          return interaction.reply({
            content: "❌ No message data found.",
            ephemeral: true,
          });
        }

        if (typeof jsonData === "string") {
          jsonData = JSON.parse(jsonData);
        }

        return interaction.reply({
          ...jsonData,
          ephemeral: true,
        });
      } catch (error) {
        console.error("Message button JSON error:", error);

        return interaction.reply({
          content: "❌ Invalid JSON embed.",
          ephemeral: true,
        });
      }
    }

    // NAVIGATION BUTTON (switch panel page)
    if (button.type === "navigate") {
      const page = panel.pages?.[button.target];

      if (!page) {
        return interaction.reply({
          content: "❌ Panel page not found.",
          ephemeral: true,
        });
      }

      const {
        EmbedBuilder,
        ButtonBuilder,
        ButtonStyle,
        ActionRowBuilder,
      } = require("discord.js");

      const embeds = [];

      for (const e of page.embeds || []) {
        const embed = new EmbedBuilder()
          .setColor(e.color || "#2b2d31")
          .setTitle(e.title || "")
          .setDescription(e.description || "");

        if (e.banner) embed.setImage(e.banner);
        if (e.thumbnail) embed.setThumbnail(e.thumbnail);

        embeds.push(embed);
      }

      // Prevent empty message error
      if (embeds.length === 0) {
        await interaction.deferUpdate();

        return interaction.followUp({
          content: "⚠️ This page has no content yet.",
          ephemeral: true,
        });
      }

      const rows = [];
      let currentRow = new ActionRowBuilder();

      for (const btn of page.buttons || []) {
        const b = new ButtonBuilder()
          .setLabel(btn.label)
          .setStyle(ButtonStyle[btn.style] || ButtonStyle.Secondary);

        if (btn.emoji) b.setEmoji(btn.emoji);

        if (btn.type === "link") {
          b.setStyle(ButtonStyle.Link);
          b.setURL(btn.url);
        } else {
          b.setCustomId(btn.id);
        }

        currentRow.addComponents(b);

        if (currentRow.components.length === 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
      }

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      await interaction.update({
        embeds,
        components: rows,
      });

      return;
    }
  }
};