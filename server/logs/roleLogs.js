console.log("✅ roleLogs.js loaded");

const {
  EmbedBuilder,
  Events,
  AuditLogEvent,
  PermissionsBitField,
} = require("discord.js");
const { getGuildConfig } = require("../database/guildConfigDb");

const recentRoleMemberLogCache = new Map();

async function getLogChannel(guild, logConfig) {
  if (!logConfig?.enabled) return null;
  if (!logConfig?.channelId) return null;

  const channel = await guild.channels.fetch(logConfig.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;

  return channel;
}

function toNicePermissionName(permission) {
  return permission
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Guild/g, "Server ")
    .replace(/TTS/g, "TTS")
    .replace(/UseVAD/g, "Use VAD")
    .replace(/Everyone/g, "@everyone");
}

function formatPermissionList(list) {
  if (!list.length) return "None";
  return list.map((perm) => `• ${toNicePermissionName(perm)}`).join("\n");
}

function splitTextIntoChunks(text, maxLength = 1024) {
  if (!text || text.length <= maxLength) return [text || "None"];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let sliceIndex = remaining.lastIndexOf("\n", maxLength);
    if (sliceIndex <= 0) sliceIndex = maxLength;

    chunks.push(remaining.slice(0, sliceIndex));
    remaining = remaining.slice(sliceIndex).trimStart();
  }

  if (remaining.length) chunks.push(remaining);

  return chunks;
}

function makeRoleMemberLogKey({ guildId, userId, roleId, action }) {
  return `${guildId}:${userId}:${roleId}:${action}`;
}

function isDuplicateRoleMemberLog(key, windowMs = 4000) {
  const now = Date.now();
  const last = recentRoleMemberLogCache.get(key);

  if (last && now - last < windowMs) {
    return true;
  }

  recentRoleMemberLogCache.set(key, now);

  setTimeout(() => {
    if (recentRoleMemberLogCache.get(key) === now) {
      recentRoleMemberLogCache.delete(key);
    }
  }, windowMs + 1000);

  return false;
}

async function findRelevantMemberRoleAuditEntry(guild, memberId, roleId, actionType) {
  try {
    const action =
      actionType === "add"
        ? AuditLogEvent.MemberRoleUpdate
        : AuditLogEvent.MemberRoleUpdate;

    const auditLogs = await guild.fetchAuditLogs({
      type: action,
      limit: 10,
    });

    const now = Date.now();

    const entry = auditLogs.entries.find((entry) => {
      if (!entry) return false;
      if (!entry.target || entry.target.id !== memberId) return false;

      const created = entry.createdTimestamp || 0;
      if (Math.abs(now - created) > 15000) return false;

      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        if (change.key === "$add" && actionType === "add") {
          const addedRoles = Array.isArray(change.new) ? change.new : [];
          if (addedRoles.some((r) => r.id === roleId)) return true;
        }

        if (change.key === "$remove" && actionType === "remove") {
          const removedRoles = Array.isArray(change.new) ? change.new : [];
          if (removedRoles.some((r) => r.id === roleId)) return true;
        }
      }

      return false;
    });

    return entry || null;
  } catch (error) {
    console.error("[ROLE AUDIT LOOKUP ERROR]", error);
    return null;
  }
}

module.exports = (client) => {
  /* ───────────── ROLE ADDED / REMOVED FROM MEMBER ───────────── */
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
      const config = await getGuildConfig(newMember.guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      const logChannel = await getLogChannel(newMember.guild, logsConfig.roleUpdate);
      if (!logChannel) return;

      const addedRoles = newMember.roles.cache.filter(
        (role) => !oldMember.roles.cache.has(role.id)
      );

      const removedRoles = oldMember.roles.cache.filter(
        (role) => !newMember.roles.cache.has(role.id)
      );

      for (const role of addedRoles.values()) {
  if (role.id === newMember.guild.id) continue;

  const auditEntry = await findRelevantMemberRoleAuditEntry(
    newMember.guild,
    newMember.id,
    role.id,
    "add"
  );

  const dedupeKey = makeRoleMemberLogKey({
          guildId: newMember.guild.id,
          userId: newMember.id,
          roleId: role.id,
          action: "add",
        });

        if (isDuplicateRoleMemberLog(dedupeKey)) continue;

       const executorText = auditEntry?.executor
  ? `<@${auditEntry.executor.id}>`
  : "Unknown / System";

        const embed = new EmbedBuilder()
          .setColor(logsConfig.roleUpdate.color || "#FEE75C")
          .setTitle("➕ Role Added")
          .setAuthor({
            name: newMember.user.tag,
            iconURL: newMember.user.displayAvatarURL({ dynamic: true, size: 256 }),
          })
          .setThumbnail(
            newMember.user.displayAvatarURL({ dynamic: true, size: 256 })
          )
          .addFields(
            { name: "User", value: `<@${newMember.id}>`, inline: true },
            { name: "Role", value: role.toString(), inline: true },
            { name: "Added By", value: executorText, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }

      for (const role of removedRoles.values()) {
  if (role.id === newMember.guild.id) continue;

  const auditEntry = await findRelevantMemberRoleAuditEntry(
    newMember.guild,
    newMember.id,
    role.id,
    "remove"
  );



  const dedupeKey = makeRoleMemberLogKey({
          guildId: newMember.guild.id,
          userId: newMember.id,
          roleId: role.id,
          action: "remove",
        });

        if (isDuplicateRoleMemberLog(dedupeKey)) continue;

        const executorText = auditEntry?.executor
          ? `<@${auditEntry.executor.id}>`
          : "Unknown / System";

        const embed = new EmbedBuilder()
          .setColor(logsConfig.roleUpdate.color || "#FEE75C")
          .setTitle("➖ Role Removed")
          .setAuthor({
            name: newMember.user.tag,
            iconURL: newMember.user.displayAvatarURL({ dynamic: true, size: 256 }),
          })
          .setThumbnail(
            newMember.user.displayAvatarURL({ dynamic: true, size: 256 })
          )
          .addFields(
            { name: "User", value: `<@${newMember.id}>`, inline: true },
            { name: "Role", value: role.toString(), inline: true },
            { name: "Removed By", value: executorText, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("[ROLE MEMBER UPDATE LOG ERROR]", error);
    }
  });

  /* ───────────── ROLE CREATE / UPDATE / DELETE (AUDIT LOG RELIABLE) ───────────── */
  client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
    try {
      if (
        ![
          AuditLogEvent.RoleCreate,
          AuditLogEvent.RoleUpdate,
          AuditLogEvent.RoleDelete,
        ].includes(entry.action)
      ) {
        return;
      }

      const config = await getGuildConfig(guild.id);
      const logsConfig = config?.logs;

      if (!logsConfig?.enabled) return;

      let currentLogConfig = null;
      let title = "✏ Role Updated";
      let fallbackColor = "#FEE75C";

      if (entry.action === AuditLogEvent.RoleCreate) {
        currentLogConfig = logsConfig.roleCreate;
        title = "🆕 Role Created";
        fallbackColor = "#57F287";
      }

      if (entry.action === AuditLogEvent.RoleDelete) {
        currentLogConfig = logsConfig.roleDelete;
        title = "🗑 Role Deleted";
        fallbackColor = "#ED4245";
      }

      if (entry.action === AuditLogEvent.RoleUpdate) {
        currentLogConfig = logsConfig.roleUpdate;
        title = "✏ Role Updated";
        fallbackColor = "#FEE75C";
      }

      const logChannel = await getLogChannel(guild, currentLogConfig);
      if (!logChannel) return;

      const roleName = entry.target?.name || "Unknown Role";

      const fields = [
        {
          name: "Role",
          value: entry.target?.id ? `<@&${entry.target.id}>` : roleName,
          inline: true,
        },
        {
          name: "Executor",
          value: entry.executor ? `<@${entry.executor.id}>` : "Unknown",
          inline: true,
        },
      ];

      const changes = [];

      for (const change of entry.changes || []) {
        if (change.key === "name") {
          changes.push(`**Name:** ${change.old ?? "None"} → ${change.new ?? "None"}`);
        }

        if (change.key === "color") {
          const oldColor =
            change.old && Number(change.old) !== 0
              ? `#${Number(change.old).toString(16).padStart(6, "0")}`
              : "None";

          const newColor =
            change.new && Number(change.new) !== 0
              ? `#${Number(change.new).toString(16).padStart(6, "0")}`
              : "None";

          changes.push(`**Color:** ${oldColor} → ${newColor}`);
        }

        if (change.key === "permissions") {
          const oldPermsRaw = BigInt(change.old ?? 0);
          const newPermsRaw = BigInt(change.new ?? 0);

          const allFlags = PermissionsBitField.Flags;
          const addedPerms = [];
          const removedPerms = [];

          for (const [permName, permBit] of Object.entries(allFlags)) {
            const bit = BigInt(permBit);
            const hadOld = (oldPermsRaw & bit) === bit;
            const hasNew = (newPermsRaw & bit) === bit;

            if (!hadOld && hasNew) addedPerms.push(permName);
            if (hadOld && !hasNew) removedPerms.push(permName);
          }

          if (addedPerms.length) {
            changes.push(`**Permissions Added**\n${formatPermissionList(addedPerms)}`);
          }

          if (removedPerms.length) {
            changes.push(`**Permissions Removed**\n${formatPermissionList(removedPerms)}`);
          }
        }

        if (change.key === "mentionable") {
          changes.push(
            `**Mentionable:** ${change.old ? "Yes" : "No"} → ${change.new ? "Yes" : "No"}`
          );
        }

        if (change.key === "hoist") {
          changes.push(
            `**Displayed Separately:** ${change.old ? "Yes" : "No"} → ${change.new ? "Yes" : "No"}`
          );
        }
      }

      if (changes.length) {
        const chunks = splitTextIntoChunks(changes.join("\n\n"), 1024);

        chunks.forEach((chunk, index) => {
          fields.push({
            name: index === 0 ? "Changes" : "More Changes",
            value: chunk || "None",
            inline: false,
          });
        });
      }

     const executorUser = entry.executor
  ? await client.users.fetch(entry.executor.id).catch(() => entry.executor)
  : null;

const executorAvatar =
  executorUser?.displayAvatarURL?.({ dynamic: true, size: 256 }) ||
  entry.executor?.displayAvatarURL?.({ dynamic: true, size: 256 }) ||
  null;

const embed = new EmbedBuilder()
  .setColor(currentLogConfig?.color || fallbackColor)
  .setTitle(title)
  .setAuthor({
    name: executorUser?.tag || entry.executor?.tag || "Unknown",
    iconURL: executorAvatar || undefined,
  })
  .setThumbnail(executorAvatar)
        .addFields(fields)
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[ROLE AUDIT LOG ERROR]", error);
    }
  });
};