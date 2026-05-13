const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const isAntiNukeWhitelisted = require("./isAntiNukeWhitelisted");

const roleUpdateMap = new Map();

module.exports = async (oldRole, newRole, config) => {
  try {
    const guild = newRole.guild;
    if (!guild) return;

    const antiNuke = config?.security?.antiNuke;
    if (!antiNuke?.enabled) return;
    if (!antiNuke?.antiRoleUpdate?.enabled) return;

    const logs = await guild
      .fetchAuditLogs({
        limit: 6,
        type: AuditLogEvent.RoleUpdate,
      })
      .catch(() => null);

    if (!logs) return;

    const now = Date.now();

  const log =
  logs.entries.find((entry) => {
    const targetId = entry.target?.id;
    const createdAt = entry.createdTimestamp || 0;
    return targetId === newRole.id && Math.abs(now - createdAt) < 15000;
  }) ||
  logs.entries.find((entry) => {
    return entry.target?.id === newRole.id;
  });

    if (!log) return;

    const executor = log.executor;
    const executorId = executor?.id;
    if (!executorId) return;

    const me = guild.members.me;
    if (!me) return;

    if (executorId === guild.ownerId) return;
    if (executorId === me.id) return;

    const isWhitelisted = await isAntiNukeWhitelisted(guild, executorId, config);
    if (isWhitelisted) {
      return;
    }

    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member) return;

    if (member.roles.highest.position >= me.roles.highest.position) return;

    const limit = Math.max(1, Number(antiNuke.antiRoleUpdate?.limit) || 3);
    const timeframe = Math.max(1000, Number(antiNuke.timeframe) || 10000);
    const timeframeSeconds = Math.floor(timeframe / 1000);

    if (!roleUpdateMap.has(guild.id)) roleUpdateMap.set(guild.id, {});
    const guildMap = roleUpdateMap.get(guild.id);

    if (!guildMap[executorId]) guildMap[executorId] = [];

    guildMap[executorId].push(now);

    guildMap[executorId] = guildMap[executorId].filter(
      (t) => now - t < timeframe
    );


    if (guildMap[executorId].length < limit) return;

    guildMap[executorId] = [];

    const action = String(antiNuke.punishment || "quarantine").toLowerCase();
    let actionResult = "Alert only";

    if (action === "ban") {
      if (member.bannable) {
        await member
          .ban({ deleteMessageSeconds: 0, reason: "Kyro Anti-Nuke: Role Update Spam" })
          .catch(() => {});
        actionResult = "User was banned";
      } else {
        actionResult = "Ban failed (user not bannable)";
      }
    } else if (action === "kick") {
      if (member.kickable) {
        await member.kick("Kyro Anti-Nuke: Role Update Spam").catch(() => {});
        actionResult = "User was kicked";
      } else {
        actionResult = "Kick failed (user not kickable)";
      }
    } else if (action === "quarantine") {
      const quarantineRoleId = antiNuke.quarantineRole;
      const quarantineRole = quarantineRoleId
        ? guild.roles.cache.get(quarantineRoleId) ||
          (await guild.roles.fetch(quarantineRoleId).catch(() => null))
        : null;

      if (quarantineRole) {
        const removableRoles = member.roles.cache.filter((role) => {
          if (role.id === guild.id) return false; // @everyone
          if (role.id === quarantineRole.id) return false;
          if (role.managed) return false;
          if (role.position >= me.roles.highest.position) return false;
          return true;
        });

        if (removableRoles.size > 0) {
          await member.roles
            .remove(
              [...removableRoles.values()],
              "Kyro Anti-Nuke: stripping roles after role update detection"
            )
            .catch(() => {});
        }

        if (!member.roles.cache.has(quarantineRole.id)) {
          await member.roles
            .add(
              quarantineRole,
              "Kyro Anti-Nuke: quarantine role applied"
            )
            .catch(() => {});
        }

        actionResult = `User was quarantined with <@&${quarantineRole.id}>`;
      } else {
        actionResult = "Quarantine failed (role not found)";
      }
    }

    let logChannel = null;
    if (antiNuke.logChannel) {
      logChannel =
        guild.channels.cache.get(antiNuke.logChannel) ||
        (await guild.channels.fetch(antiNuke.logChannel).catch(() => null));
    }

    if (logChannel?.isTextBased?.()) {
      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🚨 Anti-Nuke Triggered — Role Update")
        .setThumbnail(
          typeof executor.displayAvatarURL === "function"
            ? executor.displayAvatarURL({ size: 256 })
            : null
        )
        .setDescription(
          `User **${executor.tag || executorId}** triggered Anti-Nuke protection.`
        )
        .addFields(
          { name: "Action", value: actionResult, inline: true },
          { name: "User", value: `<@${executorId}>`, inline: true },
          { name: "Role Modified", value: `${newRole.name}`, inline: true },
          {
            name: "Updates Detected",
            value: `${limit} in ${timeframeSeconds} seconds`,
            inline: false,
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (error) {
    console.error("Anti Role Update Error:", error);
  }
};