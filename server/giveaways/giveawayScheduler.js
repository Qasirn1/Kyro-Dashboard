const { getAllActiveGiveaways } = require("./giveawayStorage");
const { endGiveaway } = require("./giveawayManager");

let giveawayInterval = null;

async function getGuildFromMainOrCustom(client, giveaway) {
  let guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);

  if (guild) return guild;

  try {
    const { getCustomBotClient } = require("../../../kyro-dashboard/server/customBotManager");
    const customClient = getCustomBotClient(giveaway.guildId);

    if (!customClient) return null;

    guild =
      customClient.guilds.cache.get(giveaway.guildId) ||
      (await customClient.guilds.fetch(giveaway.guildId).catch(() => null));

    return guild || null;
  } catch (error) {
    return null;
  }
}

function startGiveawayScheduler(client) {
  if (giveawayInterval) return;

  giveawayInterval = setInterval(async () => {
    try {
      const activeGiveaways = await getAllActiveGiveaways();
      const now = Date.now();

      for (const giveaway of activeGiveaways) {
        if (giveaway.ended) continue;
        if (now < giveaway.endAt) continue;

        const guild = await getGuildFromMainOrCustom(client, giveaway);
        if (!guild) {
          console.warn(
            `[Giveaways] Could not find guild ${giveaway.guildId} for giveaway ${giveaway.id}`
          );
          continue;
        }

        await endGiveaway(guild, giveaway.id);
      }
    } catch (error) {
      console.error("[Giveaways] Scheduler error:", error);
    }
  }, 15000);
}

module.exports = {
  startGiveawayScheduler,
};