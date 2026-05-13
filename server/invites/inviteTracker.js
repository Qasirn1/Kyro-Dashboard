const { Events } = require("discord.js");
const InviteStat = require("../models/InviteStat");
const InviteJoin = require("../models/InviteJoin");
const GuildConfig = require("../models/GuildConfig");
const { inviteCache } = require("./inviteCache");

function getAccountAgeDays(user) {
  const createdAt = user.createdAt?.getTime?.() || Date.now();
  const now = Date.now();
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}

module.exports = (client) => {
  /* ───────────── CACHE INVITES ON READY ───────────── */
  client.once(Events.ClientReady, async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        inviteCache.set(
          guild.id,
          new Map(invites.map((inv) => [inv.code, inv.uses]))
        );
      } catch (error) {
       
      }
    }
  });

  /* ───────────── KEEP CACHE FRESH ───────────── */
  client.on(Events.InviteCreate, async (invite) => {
    try {
      if (!invite?.guild) return;

      const invites = await invite.guild.invites.fetch().catch(() => null);
      if (!invites) return;

      inviteCache.set(
        invite.guild.id,
        new Map(invites.map((inv) => [inv.code, inv.uses]))
      );
    } catch (error) {
    }
  });

  client.on(Events.InviteDelete, async (invite) => {
    try {
      if (!invite?.guild) return;

      const invites = await invite.guild.invites.fetch().catch(() => null);
      if (!invites) return;

      inviteCache.set(
        invite.guild.id,
        new Map(invites.map((inv) => [inv.code, inv.uses]))
      );
    } catch (error) {
      
    }
  });

  /* ───────────── MEMBER JOIN ───────────── */
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const guild = member.guild;
      if (!guild) return;

      const guildConfig = await GuildConfig.findOne({ guildId: guild.id }).lean();
      const inviteTrackerConfig = guildConfig?.inviteTracker || {};

      if (!inviteTrackerConfig.enabled) return;

      let logChannel = null;
      if (inviteTrackerConfig.logChannelId) {
        logChannel =
          guild.channels.cache.get(inviteTrackerConfig.logChannelId) ||
          (await guild.channels.fetch(inviteTrackerConfig.logChannelId).catch(() => null));
      }

      let inviterUser = null;
      let inviteCode = null;
      let totalInvites = 0;
      let totalLeaves = 0;
      let totalFake = 0;
      let netInvites = 0;
      let isFake = false;
      let isRejoin = false;

      const fakeAccountDays = Number(inviteTrackerConfig.fakeAccountDays || 7);
      const accountAgeDays = getAccountAgeDays(member.user);
      isFake = accountAgeDays < fakeAccountDays;

      const newInvites = await guild.invites.fetch().catch(() => null);
      const oldInvites = inviteCache.get(guild.id) || new Map();

      if (!newInvites) return;

      const usedInvite = newInvites.find((inv) => {
        const oldUses = oldInvites.get(inv.code) || 0;
        return inv.uses > oldUses;
      });

      // Refresh cache immediately
      inviteCache.set(
        guild.id,
        new Map(newInvites.map((inv) => [inv.code, inv.uses]))
      );

      const existingJoin = await InviteJoin.findOne({
        guildId: guild.id,
        invitedUserId: member.id,
      });

      if (existingJoin && existingJoin.leftAt) {
        isRejoin = true;
      }

      if (usedInvite && usedInvite.inviter) {
        inviterUser = usedInvite.inviter;
        inviteCode = usedInvite.code;

        let incPayload = {};

        // Rejoin should not count as a fresh invite again
        if (!isRejoin) {
          if (isFake) {
            incPayload.fake = 1;

            if (inviteTrackerConfig.countFakeAsInvites) {
              incPayload.invites = 1;
            }
          } else {
            incPayload.invites = 1;
          }
        }

        const updatedStat = await InviteStat.findOneAndUpdate(
          { guildId: guild.id, userId: inviterUser.id },
          { $inc: incPayload },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

        totalInvites = Number(updatedStat?.invites || 0);
        totalLeaves = Number(updatedStat?.leaves || 0);
        totalFake = Number(updatedStat?.fake || 0);
        netInvites = totalInvites - totalLeaves - totalFake;

        await InviteJoin.findOneAndUpdate(
          { guildId: guild.id, invitedUserId: member.id },
          {
            $set: {
              inviterId: inviterUser.id,
              inviteCode,
              joinedAt: new Date(),
              leftAt: null,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

        /* 🎁 INVITE REWARDS CHECK (use net invites) */
        const rewards = Array.isArray(inviteTrackerConfig.rewards)
          ? [...inviteTrackerConfig.rewards].sort(
              (a, b) => Number(a.invites) - Number(b.invites)
            )
          : [];

        if (rewards.length > 0) {
          const inviterMember = await guild.members.fetch(inviterUser.id).catch(() => null);

          if (inviterMember) {
            for (const reward of rewards) {
              const requiredInvites = Number(reward.invites) || 0;

              if (netInvites >= requiredInvites) {
                const rewardRole =
                  guild.roles.cache.get(reward.roleId) ||
                  (await guild.roles.fetch(reward.roleId).catch(() => null));

                if (rewardRole && !inviterMember.roles.cache.has(rewardRole.id)) {
                  await inviterMember.roles.add(rewardRole).catch(() => {});
                }
              }
            }
          }
        }
      } else {
        await InviteJoin.findOneAndUpdate(
          { guildId: guild.id, invitedUserId: member.id },
          {
            $set: {
              inviterId: null,
              inviteCode: null,
              joinedAt: new Date(),
              leftAt: null,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );
      }

           if (logChannel?.isTextBased?.()) {
        let message = "";
        const inviterMention = inviterUser ? `<@${inviterUser.id}>` : "Unknown";

        if (!inviterUser) {
          message = `➕ ${member} joined the server, but the invite could not be determined.`;
        } else if (isRejoin) {
          message = `🔁 ${member} rejoined via ${inviterMention}`;
        } else if (isFake) {
          message = `⚠️ ${member} joined via ${inviterMention} • Marked as fake (${accountAgeDays}d old account)`;
        } else {
          message = `➕ ${member} has been invited by ${inviterMention} and now has **${netInvites}** invites.`;
        }

        await logChannel.send({ content: message }).catch(() => {});
      }
    } catch (err) {
      console.error("Invite tracking join error:", err);
    }
  });

  /* ───────────── MEMBER LEAVE (COUNT LEAVES ONCE PER JOIN) ───────────── */
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const guild = member.guild;
      if (!guild) return;

      const joinRecord = await InviteJoin.findOne({
        guildId: guild.id,
        invitedUserId: member.id,
      });

      if (!joinRecord?.inviterId) return;

      // Prevent duplicate leave counting for the same leave event/history state
      if (joinRecord.leftAt) return;

      await InviteStat.findOneAndUpdate(
        { guildId: guild.id, userId: joinRecord.inviterId },
        {
          $inc: { leaves: 1 },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      joinRecord.leftAt = new Date();
      await joinRecord.save();
    } catch (err) {
      console.error("Invite tracking leave error:", err);
    }
  });
};