const GuildConfig = require("../models/GuildConfig");

async function loadPanels() {
  const configs = await GuildConfig.find(
    { "panels.0": { $exists: true } },
    { guildId: 1, panels: 1 }
  ).lean();

  const result = {};

  for (const config of configs) {
    result[config.guildId] = {
      panels: Array.isArray(config.panels) ? config.panels : [],
    };
  }

  return result;
}

async function savePanels(data = {}) {
  try {
    for (const [guildId, guildData] of Object.entries(data)) {
      const panels = Array.isArray(guildData?.panels) ? guildData.panels : [];

      await GuildConfig.findOneAndUpdate(
        { guildId },
        {
          $set: {
            panels,
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to save panels to Mongo:", error);
    return false;
  }
}

async function getGuildPanels(guildId) {
  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = await GuildConfig.create({
      guildId,
      panels: [],
    });
  }

  if (!Array.isArray(config.panels)) {
    config.panels = [];
    await config.save();
  }

  return config.panels;
}

async function addPanel(guildId, panel) {
  let config = await GuildConfig.findOne({ guildId });

  if (!config) {
    config = await GuildConfig.create({
      guildId,
      panels: [],
    });
  }

  if (!Array.isArray(config.panels)) {
    config.panels = [];
  }

  const normalizedPanel = {
    ...panel,
    createdAt: panel?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  config.panels.push(normalizedPanel);
  await config.save();

  return normalizedPanel;
}

async function updatePanel(guildId, panelId, newData = {}) {
  const config = await GuildConfig.findOne({ guildId });

  if (!config || !Array.isArray(config.panels)) return null;

  const index = config.panels.findIndex(
    (p) => String(p.panelId) === String(panelId)
  );

  if (index === -1) return null;

  const existingPanel =
    typeof config.panels[index]?.toObject === "function"
      ? config.panels[index].toObject()
      : { ...config.panels[index] };

  const updatedPanel = {
    ...existingPanel,
    ...newData,
    updatedAt: new Date(),
  };

  config.panels[index] = updatedPanel;
  await config.save();

  return updatedPanel;
}

module.exports = {
  loadPanels,
  savePanels,
  getGuildPanels,
  addPanel,
  updatePanel,
};