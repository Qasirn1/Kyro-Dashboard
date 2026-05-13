const { EmbedBuilder } = require("discord.js");
const GuildConfig = require("../models/GuildConfig");

const joinTracker = new Map();
const raidCooldown = new Map();

module.exports = async (member, passedConfig = null) => {
  try {
    const guild = member.guild;
    const guildId = guild.id;
    const now = Date.now();

    let dbConfig = null;

    try {
      dbConfig = await GuildConfig.findOne({ guildId }).lean();
    } catch (dbError) {
      console.error("Anti-raid DB fetch error:", dbError);
    }

    const settings =
      dbConfig?.security?.antiRaid ||
      passedConfig?.security?.antiRaid ||
      passedConfig?.antiRaid ||
      null;

    if (!settings?.enabled) return;

    const joinThreshold =
      Number(settings.joinThreshold) ||
      Number(settings.joinLimit) ||
      5;

    const timeWindowSeconds =
      Number(settings.joinWindow) ||
      Number(settings.timeWindowSeconds) ||
      Math.floor((Number(settings.interval) || 10000) / 1000) ||
      10;

    const cooldownMs =
      (Number(settings.cooldownSeconds) || 0) * 1000 ||
      Number(settings.cooldownMs) ||
      Number(settings.cooldown) ||
      30000;

    const action = String(settings.action || "alert").toLowerCase();

    const lastRaid = raidCooldown.get(guildId);
    if (lastRaid && now - lastRaid < cooldownMs) {
      return;
    }

    if (!joinTracker.has(guildId)) {
      joinTracker.set(guildId, []);
    }

    const timestamps = joinTracker.get(guildId);
    timestamps.push(now);

    const filtered = timestamps.filter(
      (timestamp) => now - timestamp < timeWindowSeconds * 1000
    );

    joinTracker.set(guildId, filtered);

    if (filtered.length < joinThreshold) return;

    raidCooldown.set(guildId, now);

    const pingRoleIds = Array.isArray(settings.pingRoleIds)
      ? settings.pingRoleIds.filter((id) => typeof id === "string" && id)
      : [];

    const legacyMentionRoleId =
      settings.mentionRoleEnabled && settings.mentionRoleId
        ? settings.mentionRoleId
        : settings.mentionRole && settings.roleId
        ? settings.roleId
        : "";

    const allPingRoleIds = [...new Set([...pingRoleIds, legacyMentionRoleId].filter(Boolean))];

    const rolePing =
      allPingRoleIds.length > 0
        ? allPingRoleIds.map((roleId) => `<@&${roleId}>`).join(" ")
        : "";

    const alertChannelId = settings.alertChannelId || "";
    const quarantineRoleId =
      settings.quarantineRoleId ||
      settings.quarantineRole ||
      "";

    const alertChannel = alertChannelId
      ? guild.channels.cache.get(alertChannelId)
      : null;

    let actionResult = "Alert sent only";
    let affectedCount = 0;

    const recentMembers = guild.members.cache.filter((guildMember) => {
      const joinedAt = guildMember.joinedTimestamp || 0;
      return now - joinedAt < timeWindowSeconds * 1000;
    });

    if (action === "kick") {
      for (const [, raidMember] of recentMembers) {
        if (!raidMember.kickable) continue;

        try {
          await raidMember.kick("Kyro Anti-Raid Detection");
          affectedCount++;
        } catch {}
      }

      actionResult = `Kicked ${affectedCount} recent member(s)`;
    } else if (action === "ban") {
      for (const [, raidMember] of recentMembers) {
        if (!raidMember.bannable) continue;

        try {
          await raidMember.ban({
            deleteMessageSeconds: 0,
            reason: "Kyro Anti-Raid Detection",
          });
          affectedCount++;
        } catch {}
      }

      actionResult = `Banned ${affectedCount} recent member(s)`;
    } else if (action === "quarantine") {
      if (quarantineRoleId) {
        const quarantineRole = guild.roles.cache.get(quarantineRoleId);

        if (quarantineRole) {
          const botHighestRolePosition =
            guild.members.me?.roles?.highest?.position || 0;

          for (const [, raidMember] of recentMembers) {
            try {
              const removableRoles = raidMember.roles.cache.filter((role) => {
                if (role.id === guild.id) return false; // @everyone
                if (role.id === quarantineRole.id) return false;
                if (role.managed) return false;
                if (role.position >= botHighestRolePosition) return false;
                return true;
              });

              if (removableRoles.size > 0) {
                await raidMember.roles
                  .remove(
                    [...removableRoles.values()],
                    "Kyro Anti-Raid Detection - removing roles for quarantine"
                  )
                  .catch(() => {});
              }

              if (!raidMember.roles.cache.has(quarantineRole.id)) {
                await raidMember.roles
                  .add(
                    quarantineRole,
                    "Kyro Anti-Raid Detection - quarantine role applied"
                  )
                  .catch(() => {});
              }

              affectedCount++;
            } catch {}
          }

          actionResult = `Quarantined ${affectedCount} recent member(s) with ${quarantineRole.name}`;
        } else {
          actionResult = "Quarantine failed (role not found)";
        }
      } else {
        actionResult = "Quarantine failed (no quarantine role set)";
      }
    }

    const joinTimestamp = Math.floor(now / 1000);

    const embed = new EmbedBuilder()
      .setTitle("🚨 Raid Detected")
      .setColor(0xff0000)
      .addFields(
        {
          name: "Triggered By",
          value: `${member} | \`${member.user.tag}\``,
          inline: false,
        },
        {
          name: "Detected Joins",
          value: `${filtered.length} members`,
          inline: true,
        },
        {
          name: "Time Window",
          value: `${timeWindowSeconds} seconds`,
          inline: true,
        },
        {
          name: "Join Time",
          value: `<t:${joinTimestamp}:R>`,
          inline: false,
        },
        {
          name: "Action",
          value: actionResult,
          inline: false,
        }
      )
      .setTimestamp();

    if (alertChannel) {
      await alertChannel
        .send({
          content: rolePing || undefined,
          embeds: [embed],
        })
        .catch(() => {});
    }

    console.log(
      `🚨 Raid detected in guild ${guildId}: ${filtered.length} joins in ${timeWindowSeconds}s | action=${action}`
    );

    joinTracker.set(guildId, []);
  } catch (error) {
    console.error("Anti-raid error:", error);
  }
};