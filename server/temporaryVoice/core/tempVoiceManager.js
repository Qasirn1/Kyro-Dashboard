const { ChannelType } = require("discord.js");

const { getTempVoiceConfig } = require("./tempVoiceConfig");
const {
  addTempVoiceChannel,
  removeTempVoiceChannel,
  isTempVoiceChannel,
} = require("./tempVoiceData");

function buildTempChannelName(member, format) {
  const safeFormat = format || "{username}'s Room";

  return safeFormat
    .replace(/{username}/gi, member.user.username)
    .replace(/{displayname}/gi, member.displayName || member.user.username);
}

async function createTemporaryVoiceChannel(member, guild, entryConfig) {
  const channelName = buildTempChannelName(member, entryConfig.nameFormat);

  const newChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: entryConfig.categoryId || null,
    userLimit: entryConfig.userLimit || 0,
    bitrate: entryConfig.bitrate || 64000,
    reason: `Temporary Voice room created for ${member.user.tag}`,
  });

  await addTempVoiceChannel(guild.id, newChannel.id, member.id, {
    name: newChannel.name,
    tempVoiceEntryId: entryConfig.id || null,
    joinChannelId: entryConfig.joinChannelId || null,
  });

  return newChannel;
}

async function handleTempVoiceJoin(newState) {
  const member = newState.member;
  const guild = newState.guild;
  const joinedChannel = newState.channel;

  if (!member || !guild || !joinedChannel) return;
  if (member.user.bot) return;

  const config = await getTempVoiceConfig(guild.id);
  if (!config?.enabled) return;
  if (!Array.isArray(config.entries) || config.entries.length === 0) return;

  const matchedEntry = config.entries.find(
    (entry) =>
      entry?.enabled !== false &&
      entry?.joinChannelId &&
      entry.joinChannelId === joinedChannel.id
  );

  if (!matchedEntry) return;

  let tempChannel;

  try {
    tempChannel = await createTemporaryVoiceChannel(member, guild, matchedEntry);
    await member.voice.setChannel(
      tempChannel,
      "Moved user into their Temporary Voice room"
    );
  } catch (error) {
    console.error("Failed to create/move Temporary Voice channel:", error);

    if (tempChannel) {
      await tempChannel.delete().catch(() => {});
      await removeTempVoiceChannel(guild.id, tempChannel.id);
    }
  }
}

async function handleTempVoiceLeave(oldState) {
  const guild = oldState.guild;
  const oldChannel = oldState.channel;

  if (!guild || !oldChannel) return;

  const isTemp = await isTempVoiceChannel(guild.id, oldChannel.id);
  if (!isTemp) return;

  if (oldChannel.members.size > 0) return;

  try {
    await oldChannel.delete("Temporary Voice room empty");
    await removeTempVoiceChannel(guild.id, oldChannel.id);
  } catch (error) {
    console.error("Failed to delete Temporary Voice channel:", error);
  }
}

async function handleTempVoiceUpdate(oldState, newState) {
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (!oldChannelId && newChannelId) {
    await handleTempVoiceJoin(newState);
    return;
  }

  if (oldChannelId && !newChannelId) {
    await handleTempVoiceLeave(oldState);
    return;
  }

  if (oldChannelId !== newChannelId) {
    await handleTempVoiceLeave(oldState);
    await handleTempVoiceJoin(newState);
  }
}

module.exports = {
  handleTempVoiceUpdate,
  buildTempChannelName,
  createTemporaryVoiceChannel,
};