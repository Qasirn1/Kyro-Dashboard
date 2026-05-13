const { EmbedBuilder } = require("discord.js");
const { getGuildVerification } = require("./verificationStorage");

const verificationKickTimers = new Map();

function getTimerKey(guildId, userId) {
    return `${guildId}-${userId}`;
}

function clearVerificationKick(guildId, userId) {
    const key = getTimerKey(guildId, userId);
    const existing = verificationKickTimers.get(key);

    if (existing) {
        clearTimeout(existing);
        verificationKickTimers.delete(key);
    }
}

async function sendAutoKickLog(member, config) {
    try {
        const logChannelId = config?.logChannelId;
        if (!logChannelId) return;

        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor("#ED4245")
            .setTitle("🚨 Unverified Member Auto-Kicked")
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "User", value: `${member.user.tag} (${member.id})`, inline: false },
                { name: "Reason", value: "User did not complete verification in time.", inline: false },
                { name: "Timer", value: `${config?.settings?.autoKickMinutes || 0} minute(s)`, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
        console.error("Verification auto-kick log error:", error);
    }
}

function scheduleVerificationKick(member) {
    try {
        const config = getGuildVerification(member.guild.id);
        if (!config?.enabled) return;
        if (!config?.verifiedRoleId) return;
        if (!config?.settings?.autoKickUnverified) return;

        const minutes = Number(config?.settings?.autoKickMinutes || 0);
        if (!minutes || minutes <= 0) return;

        const verifiedRole = member.guild.roles.cache.get(config.verifiedRoleId);
        if (!verifiedRole) return;

        if (member.user.bot) return;
        if (member.roles.cache.has(verifiedRole.id)) return;

        clearVerificationKick(member.guild.id, member.id);

        const timeout = setTimeout(async () => {
            try {
                verificationKickTimers.delete(getTimerKey(member.guild.id, member.id));

                const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
                if (!freshMember) return;

                const freshConfig = getGuildVerification(member.guild.id);
                if (!freshConfig?.enabled) return;
                if (!freshConfig?.settings?.autoKickUnverified) return;

                const freshVerifiedRole = member.guild.roles.cache.get(freshConfig.verifiedRoleId);
                if (!freshVerifiedRole) return;

                if (freshMember.roles.cache.has(freshVerifiedRole.id)) return;

                await sendAutoKickLog(freshMember, freshConfig);
                await freshMember.kick("Kyro Verification: Auto-kick for not verifying in time").catch(() => {});
            } catch (error) {
                console.error("Verification auto-kick execution error:", error);
            }
        }, minutes * 60 * 1000);

        verificationKickTimers.set(getTimerKey(member.guild.id, member.id), timeout);
    } catch (error) {
        console.error("Verification schedule auto-kick error:", error);
    }
}

module.exports = {
    scheduleVerificationKick,
    clearVerificationKick
};