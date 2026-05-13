const GuildConfig = require("../models/GuildConfig");

function normalizePanelsArray(selfRoles) {
  if (!selfRoles || !Array.isArray(selfRoles.panels)) return [];
  return selfRoles.panels;
}

// GET PANELS
async function getGuildPanels(guildId) {
  const config = await GuildConfig.findOne({ guildId }).lean();

  if (!config || !config.selfRoles) return [];

  return Array.isArray(config.selfRoles.panels) ? config.selfRoles.panels : [];
}

// SAVE NEW PANEL
async function saveGuildPanel(guildId, panel) {
  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = new GuildConfig({ guildId });
  }

  if (!config.selfRoles) {
    config.selfRoles = { panels: [] };
  }

  if (!Array.isArray(config.selfRoles.panels)) {
    config.selfRoles.panels = [];
  }

  config.selfRoles.panels.push(panel);
  await config.save();

  return panel;
}

// UPDATE PANEL
async function updateGuildPanel(guildId, panelId, updates = {}) {
  const config = await GuildConfig.findOne({ guildId });

  if (!config || !config.selfRoles) return null;

  const panels = normalizePanelsArray(config.selfRoles);
  const index = panels.findIndex((p) => String(p.id) === String(panelId));

  if (index === -1) return null;

  const existingPanel =
    typeof panels[index]?.toObject === "function"
      ? panels[index].toObject()
      : { ...panels[index] };

  const updatedPanel = {
    ...existingPanel,
    ...updates,
    updatedAt: new Date(),
  };

  config.selfRoles.panels[index] = updatedPanel;

  await config.save();

  return updatedPanel;
}

// DELETE PANEL
async function deleteGuildPanel(guildId, panelId) {
  const config = await GuildConfig.findOne({ guildId });

  if (!config || !config.selfRoles) return false;

  const before = Array.isArray(config.selfRoles.panels)
    ? config.selfRoles.panels.length
    : 0;

  config.selfRoles.panels = normalizePanelsArray(config.selfRoles).filter(
    (p) => String(p.id) !== String(panelId)
  );

  if (config.selfRoles.panels.length === before) {
    return false;
  }

  await config.save();

  return true;
}

module.exports = {
  getGuildPanels,
  saveGuildPanel,
  updateGuildPanel,
  deleteGuildPanel,
};