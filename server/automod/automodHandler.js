const fs = require("fs");
const path = require("path");
const {
  getGuildAutomodConfig,
} = require("./automodConfig");

const rulesPath = path.join(__dirname, "rules");

const rules = fs
  .readdirSync(rulesPath)
  .filter((file) => file.endsWith(".js"))
  .map((file) => require(`./rules/${file}`));

async function runAutomod(message) {
  
  if (message.author.bot) return;
  if (!message.guild) return;

  const automodConfig = await getGuildAutomodConfig(message.guild.id);

  if (!automodConfig?.enabled) return;

  for (const rule of rules) {
    try {
      await rule(message, automodConfig);
    } catch (err) {
      console.error(`Automod rule error (${rule.name || "unknown"}):`, err);
    }
  }
}

module.exports = runAutomod;