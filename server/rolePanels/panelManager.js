const fs = require("fs");
const path = require("path");

const dataPath = path.join(process.cwd(), "data", "selfroles.json");

function loadData() {
  if (!fs.existsSync(dataPath)) return {};
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getPanels(guildId) {
  const data = loadData();
  return data[guildId]?.panels || [];
}

function getPanelByMessage(guildId, messageId) {
  const panels = getPanels(guildId);
  return panels.find(p => p.messageId === messageId);
}

function reorderPanels(guildId, panelId, newPosition) {

  const data = loadData();
  const panels = data[guildId]?.panels || [];

  const index = panels.findIndex(p => p.panelId === panelId);
  if (index === -1) return false;

  const panel = panels.splice(index, 1)[0];
  panels.splice(newPosition, 0, panel);

  data[guildId].panels = panels;

  saveData(data);

  return true;
}

module.exports = {
  getPanels,
  getPanelByMessage,
  reorderPanels
};