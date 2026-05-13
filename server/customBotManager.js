const { Client, GatewayIntentBits, ActivityType, Events, Partials } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { registerCustomBotBridge } = require("./customBotBridge");

const { handleTempVoiceUpdate } = require("./temporaryVoice/core/tempVoiceManager.js");

const registerMessageLogs = require("./logs/messageLogs.js");
const registerJoinLogs = require("./logs/joinLogs.js");
const registerLeaveLogs = require("./logs/leaveLogs.js");
const registerModerationLogs = require("./logs/moderationLogs.js");
const registerChannelLogs = require("./logs/channelLogs.js");
const registerRoleLogs = require("./logs/roleLogs.js");

const runAntiRaid = require("./automod/antiRaid.js");
const runAutomod = require("./automod/automodHandler.js");
const runSuspiciousAccount = require("./automod/suspiciousAccount.js");
const antiNukeHandler = require("./automod/antiNuke/antiNukeHandler.js");
const antiRoleUpdate = require("./automod/antiNuke/antiRoleUpdate.js");

const GuildConfig = require("./models/GuildConfig");

const registerWelcomeHandler = require("./welcome/welcomeHandler.js");
const registerGoodbyeHandler = require("./welcome/goodbyeHandler.js");
const registerInviteTracker = require("./invites/inviteTracker.js");

const { updateGuildServerStats } = require("./serverStats/serverStatsUpdater.js");

const {
  startSocialAlertsScheduler,
  stopSocialAlertsScheduler,
} = require("./socialAlerts/socialScheduler.js");

const {
  startRssScheduler,
  stopRssScheduler,
} = require("./rss/rssScheduler.js");

const registerLevelSystem = require("./levels/levelSystem.js");
const jailManager = require("./jail/jailManager.js");
const { handlePollReactionAdd } = require("./polls/pollReactionHandler.js");

const botMongoose = require("mongoose");

let botMongoConnecting = null;

async function ensureBotMongoConnected() {
  if (botMongoose.connection.readyState === 1) return;

  if (!botMongoConnecting) {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL;

    if (!mongoUri) {
      throw new Error("MongoDB URI missing in dashboard .env");
    }

    botMongoConnecting = botMongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
  }

  await botMongoConnecting;
}

async function getMergedGuildConfig(guildId) {
  return await GuildConfig.findOne({ guildId }).lean();
}

function loadCustomBotCommands(client) {
  client.commands.clear();

  if (!fs.existsSync(MAIN_BOT_COMMANDS_PATH)) {
    console.warn("⚠️ Custom bot commands path not found:", MAIN_BOT_COMMANDS_PATH);
    return;
  }

  const commandEntries = fs.readdirSync(MAIN_BOT_COMMANDS_PATH);

  for (const entry of commandEntries) {
    const entryPath = path.join(MAIN_BOT_COMMANDS_PATH, entry);
    const stat = fs.statSync(entryPath);

    if (stat.isFile() && entry.endsWith(".js")) {
      const command = require(entryPath);

      if (!command?.data?.name || !command.execute) continue;

      client.commands.set(command.data.name, command);
    }

    if (stat.isDirectory()) {
      const files = fs.readdirSync(entryPath).filter((file) => file.endsWith(".js"));

      for (const file of files) {
        const filePath = path.join(entryPath, file);
        const command = require(filePath);

        if (!command?.data?.name || !command.execute) continue;

        client.commands.set(command.data.name, command);
      }
    }
  }
}

const {
  handleReactionAdd,
  handleReactionRemove,
} = require("./customBotHandlers/selfRoleReactionHandler");
const activeBots = new Map();
const serverStatsIntervals = new Map();
const socialAlertsRunningGuilds = new Set();
const rssRunningGuilds = new Set();
const MAIN_BOT_SRC_PATH = "C:/Users/qasir/Desktop/kyro-bot/src";
const MAIN_BOT_COMMANDS_PATH = path.join(MAIN_BOT_SRC_PATH, "commands");

async function refreshInstantServerStats(guild, reason = "event") {
  try {
    if (!guild) return;

    await ensureBotMongoConnected();

    await guild.members.fetch().catch(() => {});
    await guild.roles.fetch().catch(() => {});
    await guild.channels.fetch().catch(() => {});


    await updateGuildServerStats(guild, {
      force: true,
      skipTime: true,
    });
  } catch (error) {
    console.error(
      "❌ Custom bot instant Server Stats refresh failed:",
      error.message
    );
  }
}


function createClient() {
  return new Client({
   intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildModeration,
],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember,
    ],
  });
}

function mapActivityType(type) {
  const map = {
    Playing: ActivityType.Playing,
    Streaming: ActivityType.Streaming,
    "Listening to": ActivityType.Listening,
    Watching: ActivityType.Watching,
    "Competing in": ActivityType.Competing,
    Competing: ActivityType.Competing,
  };

  return map[type] ?? ActivityType.Listening;
}

function mapStatus(status) {
  const map = {
    online: "online",
    idle: "idle",
    dnd: "dnd",
    invisible: "invisible",
  };

  return map[status] ?? "online";
}

async function applyPresence(client, botConfig) {
  const activityType = botConfig.activityType || "Listening to";
  const activityText = botConfig.activityText || "/help";
  const finalStatus = mapStatus(botConfig.status);

  try {
  client.user.setPresence({
  activities: [
    {
      name: activityText,
      type: mapActivityType(activityType),
    },
  ],
});

client.user.setStatus(finalStatus);

  } catch (error) {
    console.error("❌ Custom bot presence failed:", error.message);
  }
}

async function startCustomBot(botConfig) {
  const { guildId, botToken } = botConfig;

  if (!guildId || !botToken) return null;

  if (activeBots.has(guildId)) {
    return activeBots.get(guildId);
  }

const client = createClient();

client.commands = new Map();
loadCustomBotCommands(client);

client.on(Events.InteractionCreate, async (interaction) => {
  try {

   if (interaction.isChatInputCommand()) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn("❌ Custom bot command not found:", interaction.commandName);
    return;
  }

  await ensureBotMongoConnected();

  await command.execute(interaction);
  return;
}

    const handler = global.kyroCustomBotInteractionHandler;

    if (typeof handler === "function") {
      await handler(interaction, {
        customBot: true,
        guildId: botConfig.guildId,
      });
    }
  } catch (error) {
    console.error("❌ Custom bot interaction failed:", error);
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user?.bot) return;

    const handler = global.kyroCustomBotReactionHandler;

    const handledSelfRoleReaction = await handleReactionAdd(reaction, user);
    if (handledSelfRoleReaction) return;

    const handledPollReaction = await handlePollReactionAdd(reaction, user);
    if (handledPollReaction) return;

    if (typeof handler === "function") {
      await handler(reaction, user, {
        customBot: true,
        guildId: botConfig.guildId,
      });
    }
  } catch (error) {
    console.error("❌ Custom bot reaction failed:", error);
  }
});



client.on(Events.MessageReactionRemove, async (reaction, user) => {
  try {
    if (user?.bot) return;

    const handled = await handleReactionRemove(reaction, user);
    if (handled) return;
  } catch (error) {
    console.error("❌ Custom bot reaction remove failed:", error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author?.bot) return;

    await ensureBotMongoConnected();
    await runAutomod(message);
  } catch (error) {
    console.error("❌ Custom bot AutoMod failed:", error);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    await ensureBotMongoConnected();
    await handleTempVoiceUpdate(oldState, newState);
  } catch (error) {
    console.error("❌ Custom bot temp voice update failed:", error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await ensureBotMongoConnected();

    await runSuspiciousAccount(member);
    await runAntiRaid(member);
    await refreshInstantServerStats(member.guild, "member join");
  } catch (error) {
    console.error("❌ Custom bot security member join failed:", error);
  }
});

client.on(Events.ChannelDelete, async (channel) => {
  try {
    if (!channel.guild) return;

    await ensureBotMongoConnected();
    const config = await getMergedGuildConfig(channel.guild.id);

    await antiNukeHandler.handleChannelDelete(channel, config);
    await refreshInstantServerStats(channel.guild, "channel delete");
  } catch (error) {
    console.error("❌ Custom bot Anti-Nuke channel delete failed:", error);
  }
});

client.on(Events.ChannelCreate, async (channel) => {
  try {
    if (!channel.guild) return;

    await ensureBotMongoConnected();
    const config = await getMergedGuildConfig(channel.guild.id);

    await antiNukeHandler.handleChannelCreate(channel, config);
    await refreshInstantServerStats(channel.guild, "channel create");
  } catch (error) {
    console.error("❌ Custom bot Anti-Nuke channel create failed:", error);
  }
});

client.on(Events.GuildRoleDelete, async (role) => {
  try {
    if (!role.guild) return;

    await ensureBotMongoConnected();
    const config = await getMergedGuildConfig(role.guild.id);

    await antiNukeHandler.handleRoleDelete(role, config);
    await refreshInstantServerStats(role.guild, "role delete");
  } catch (error) {
    console.error("❌ Custom bot Anti-Nuke role delete failed:", error);
  }
});

client.on(Events.GuildRoleCreate, async (role) => {
  try {
    if (!role.guild) return;

    await ensureBotMongoConnected();
    const config = await getMergedGuildConfig(role.guild.id);

    await antiNukeHandler.handleRoleCreate(role, config);
    await refreshInstantServerStats(role.guild, "role create");
  } catch (error) {
    console.error("❌ Custom bot Anti-Nuke role create failed:", error);
  }
});

client.on(Events.GuildBanAdd, async (guildBan) => {
  try {
    if (!guildBan.guild) return;

    await ensureBotMongoConnected();
    const config = await getMergedGuildConfig(guildBan.guild.id);

    await antiNukeHandler.handleBan(guildBan, config);
  } catch (error) {
    console.error("❌ Custom bot Anti-Nuke ban failed:", error);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    if (!member.guild) return;


    const config = await getMergedGuildConfig(member.guild.id);


    await antiNukeHandler.handleKick(member, config);
    await refreshInstantServerStats(member.guild, "member leave");
  } catch (error) {
    console.error("❌ Custom Bot Anti-Nuke kick error:", error);
  }
});

client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  try {
    if (!newRole.guild) return;

    await ensureBotMongoConnected();
    const config = await getMergedGuildConfig(newRole.guild.id);

    await antiRoleUpdate(oldRole, newRole, config);
    await refreshInstantServerStats(newRole.guild, "role update");
  } catch (error) {
    console.error("❌ Custom bot Anti-Nuke role update failed:", error);
  }
});


 client.once("clientReady", async () => {
  console.log(`🤖 Custom Bot Online: ${client.user.tag}`);

  registerCustomBotBridge(client);

await ensureBotMongoConnected();
try {
  await jailManager.restoreJails(client);
} catch (error) {
  console.error("❌ Custom bot jail restore failed:", error.message);
}
if (!client.__kyroLogsRegistered) {
  registerMessageLogs(client);
  registerJoinLogs(client);
  registerLeaveLogs(client);
  registerModerationLogs(client);
  registerChannelLogs(client);
  registerRoleLogs(client);

  client.__kyroLogsRegistered = true;
}

if (!client.__kyroWelcomeRegistered) {
  registerWelcomeHandler(client);
  registerGoodbyeHandler(client);

  client.__kyroWelcomeRegistered = true;
}

if (!client.__kyroInviteTrackerRegistered) {
  registerInviteTracker(client);

  client.__kyroInviteTrackerRegistered = true;
}

if (!client.__kyroLevelSystemRegistered) {
  registerLevelSystem(client);

  client.__kyroLevelSystemRegistered = true;
}

if (!socialAlertsRunningGuilds.has(guildId)) {
  startSocialAlertsScheduler(client);
  socialAlertsRunningGuilds.add(guildId);
}

if (!rssRunningGuilds.has(guildId)) {
  startRssScheduler(client);
  rssRunningGuilds.add(guildId);
}

// Server Stats updater for this custom bot
if (serverStatsIntervals.has(guildId)) {
  clearInterval(serverStatsIntervals.get(guildId));
}

const runServerStats = async () => {
  try {
    await ensureBotMongoConnected();

    const guild =
      client.guilds.cache.get(guildId) ||
      (await client.guilds.fetch(guildId).catch(() => null));

    if (!guild) {
      console.warn(`⚠️ Custom bot Server Stats skipped. Guild not found: ${guildId}`);
      return;
    }

await updateGuildServerStats(guild);
  } catch (error) {
    console.error("❌ Custom bot Server Stats update failed:", error.message);
  }
};

setTimeout(runServerStats, 3000);

// Run every 60 seconds so dashboard refresh changes are picked up quickly
const statsInterval = setInterval(runServerStats, 60 * 1000);
serverStatsIntervals.set(guildId, statsInterval);

    try {
      if (botConfig.name) {
        await client.user.setUsername(botConfig.name).catch((err) => {
          console.error("❌ Username update failed:", err.message);
        });
      }

    // if (botConfig.avatar) {
//   await client.user.setAvatar(botConfig.avatar).catch((err) => {
//     console.error("❌ Avatar update failed:", err.message);
//   });
// }

      setTimeout(() => {
        applyPresence(client, botConfig);
      }, 1500);
    } catch (error) {
      console.error("❌ Custom bot branding failed:", error.message);
    }
  });

  client.on("error", (error) => {
    console.error(`❌ Custom bot client error for ${guildId}:`, error.message);
  });

  try {
    await client.login(botToken);
    activeBots.set(guildId, client);
    return client;
  } catch (error) {
    console.error(`❌ Custom bot login failed for ${guildId}:`, error.message);
    return null;
  }
}

async function stopCustomBot(guildId) {
  const client = activeBots.get(guildId);
  if (!client) return false;

if (serverStatsIntervals.has(guildId)) {
  clearInterval(serverStatsIntervals.get(guildId));
  serverStatsIntervals.delete(guildId);
}

if (socialAlertsRunningGuilds.has(guildId)) {
  stopSocialAlertsScheduler();
  socialAlertsRunningGuilds.delete(guildId);
}

if (rssRunningGuilds.has(guildId)) {
  stopRssScheduler();
  rssRunningGuilds.delete(guildId);
}

client.destroy();
activeBots.delete(guildId);

  console.log(`🛑 Custom bot stopped for ${guildId}`);
  return true;
}

async function restartCustomBot(botConfig) {
  await stopCustomBot(botConfig.guildId);
  return startCustomBot(botConfig);
}

async function updateCustomBotLive(botConfig) {
  const client = activeBots.get(botConfig.guildId);

  // If bot not running → fallback to restart
  if (!client || !client.user) {
    return restartCustomBot(botConfig);
  }

  try {
    // 🔥 Update username (if changed)
    if (botConfig.name && client.user.username !== botConfig.name) {
      await client.user.setUsername(botConfig.name).catch((err) => {
        console.error("❌ Live username update failed:", err.message);
      });
    }

    // 🔥 Update presence instantly
    await applyPresence(client, botConfig);

    return client;
  } catch (error) {
    console.error("❌ Custom bot live update failed:", error.message);

    // fallback safety
    return restartCustomBot(botConfig);
  }
}

function getCustomBotClient(guildId) {
  return activeBots.get(guildId) || null;
}

module.exports = {
  activeBots,
  getCustomBotClient,
  startCustomBot,
  stopCustomBot,
  restartCustomBot,
  updateCustomBotLive,
};