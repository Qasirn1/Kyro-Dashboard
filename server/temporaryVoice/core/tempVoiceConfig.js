const GuildConfig = require("../../models/GuildConfig");

const DEFAULT_TEMP_VOICE_ENTRY = {
  id: "",
  name: "Main Temp Voice",
  joinChannelId: null,
  categoryId: null,
  interfaceChannelId: null,
  panelMessageId: null,
  nameFormat: "{username}'s Room",
  userLimit: 0,
  bitrate: 64000,
  enabled: true,
};

const DEFAULT_TEMP_VOICE_CONFIG = {
  enabled: false,
  entries: [],
};

function normalizeTempVoiceEntry(entry = {}, index = 0) {
  return {
    ...DEFAULT_TEMP_VOICE_ENTRY,
    ...entry,
    id:
      typeof entry?.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `tempvc_${index}`,
    name:
      typeof entry?.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : `Temp Voice Setup ${index + 1}`,
    joinChannelId:
      typeof entry?.joinChannelId === "string" ? entry.joinChannelId : null,
    categoryId:
      typeof entry?.categoryId === "string" ? entry.categoryId : null,
    interfaceChannelId:
      typeof entry?.interfaceChannelId === "string"
        ? entry.interfaceChannelId
        : null,
    panelMessageId:
      typeof entry?.panelMessageId === "string" ? entry.panelMessageId : null,
    nameFormat:
      typeof entry?.nameFormat === "string" && entry.nameFormat.trim()
        ? entry.nameFormat
        : "{username}'s Room",
    userLimit:
      typeof entry?.userLimit === "number" && entry.userLimit >= 0
        ? entry.userLimit
        : 0,
    bitrate:
      typeof entry?.bitrate === "number" && entry.bitrate >= 8000
        ? entry.bitrate
        : 64000,
    enabled: entry?.enabled ?? true,
  };
}

function normalizeTempVoiceConfig(raw = {}) {
  const rawEntries = Array.isArray(raw?.entries) ? raw.entries : [];

  const entries =
    rawEntries.length > 0
      ? rawEntries.map((entry, index) => normalizeTempVoiceEntry(entry, index))
      : raw?.joinChannelId
      ? [
          normalizeTempVoiceEntry(
            {
              id: "tempvc_0",
              name: "Main Temp Voice",
              joinChannelId: raw.joinChannelId || null,
              categoryId: raw.categoryId || null,
              interfaceChannelId: raw.interfaceChannelId || null,
              panelMessageId: raw.panelMessageId || null,
              nameFormat: raw.nameFormat || "{username}'s Room",
              userLimit:
                typeof raw.userLimit === "number" && raw.userLimit >= 0
                  ? raw.userLimit
                  : 0,
              bitrate:
                typeof raw.bitrate === "number" && raw.bitrate >= 8000
                  ? raw.bitrate
                  : 64000,
              enabled: true,
            },
            0
          ),
        ]
      : [];

  return {
    enabled: raw?.enabled ?? false,
    entries,
  };
}

async function getOrCreateGuildConfig(guildId) {
  let guildConfig = await GuildConfig.findOne({ guildId });

  if (!guildConfig) {
    guildConfig = await GuildConfig.create({
      guildId,
      temporaryVoice: { ...DEFAULT_TEMP_VOICE_CONFIG },
    });
    return guildConfig;
  }

  if (!guildConfig.temporaryVoice) {
    guildConfig.temporaryVoice = { ...DEFAULT_TEMP_VOICE_CONFIG };
    await guildConfig.save();
  }

  return guildConfig;
}

async function getTempVoiceConfig(guildId) {
  const guildConfig = await GuildConfig.findOne({ guildId }).lean();

  if (!guildConfig || !guildConfig.temporaryVoice) {
    return { ...DEFAULT_TEMP_VOICE_CONFIG };
  }

  return normalizeTempVoiceConfig(guildConfig.temporaryVoice || {});
}

async function ensureTempVoiceConfig(guildId) {
  const guildConfig = await getOrCreateGuildConfig(guildId);

  if (!guildConfig.temporaryVoice) {
    guildConfig.temporaryVoice = { ...DEFAULT_TEMP_VOICE_CONFIG };
    await guildConfig.save();
  }

  return normalizeTempVoiceConfig(
    guildConfig.temporaryVoice?.toObject
      ? guildConfig.temporaryVoice.toObject()
      : guildConfig.temporaryVoice
  );
}

async function setTempVoiceConfig(guildId, newData = {}) {
  const guildConfig = await getOrCreateGuildConfig(guildId);

  const existing = normalizeTempVoiceConfig(
    guildConfig.temporaryVoice
      ? guildConfig.temporaryVoice.toObject
        ? guildConfig.temporaryVoice.toObject()
        : guildConfig.temporaryVoice
      : { ...DEFAULT_TEMP_VOICE_CONFIG }
  );

  const merged = {
    ...existing,
    ...newData,
    entries: Array.isArray(newData?.entries)
      ? newData.entries.map((entry, index) =>
          normalizeTempVoiceEntry(entry, index)
        )
      : existing.entries,
  };

  guildConfig.temporaryVoice = merged;
  await guildConfig.save();

  return normalizeTempVoiceConfig(
    guildConfig.temporaryVoice?.toObject
      ? guildConfig.temporaryVoice.toObject()
      : guildConfig.temporaryVoice
  );
}

async function disableTempVoice(guildId) {
  const guildConfig = await getOrCreateGuildConfig(guildId);

  const existing = normalizeTempVoiceConfig(
    guildConfig.temporaryVoice
      ? guildConfig.temporaryVoice.toObject
        ? guildConfig.temporaryVoice.toObject()
        : guildConfig.temporaryVoice
      : { ...DEFAULT_TEMP_VOICE_CONFIG }
  );

  guildConfig.temporaryVoice = {
    ...existing,
    enabled: false,
  };

  await guildConfig.save();

  return normalizeTempVoiceConfig(
    guildConfig.temporaryVoice?.toObject
      ? guildConfig.temporaryVoice.toObject()
      : guildConfig.temporaryVoice
  );
}

module.exports = {
  getTempVoiceConfig,
  ensureTempVoiceConfig,
  setTempVoiceConfig,
  disableTempVoice,
  DEFAULT_TEMP_VOICE_CONFIG,
  DEFAULT_TEMP_VOICE_ENTRY,
  normalizeTempVoiceConfig,
  normalizeTempVoiceEntry,
};