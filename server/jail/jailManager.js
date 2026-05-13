const JailRecord = require("../models/JailRecord");
const { sendJailLog, sendUnjailLog } = require("./jailLogger");

/* -------------------- core -------------------- */
async function jail(
  member,
  jailRoleId,
  reason = "No reason",
  duration = null,
  moderator = null
) {
  const guildId = member.guild.id;

  if (!member.manageable) throw new Error("MEMBER_NOT_MANAGEABLE");

  const jailRole = member.guild.roles.cache.get(jailRoleId);
  if (!jailRole) throw new Error("JAIL_ROLE_NOT_FOUND");
  if (!jailRole.editable) throw new Error("JAIL_ROLE_NOT_EDITABLE");

  const roles = member.roles.cache
    .filter((r) => r.id !== member.guild.id && r.editable)
    .map((r) => r.id);

  await member.roles.add(jailRoleId);

  const removable = member.roles.cache.filter(
    (r) => r.id !== member.guild.id && r.id !== jailRoleId && r.editable
  );

  if (removable.size) {
    await member.roles.remove(removable);
  }

  const jailedAt = Date.now();
  const expiresAt = duration ? jailedAt + duration * 60 * 1000 : null;

  await JailRecord.findOneAndUpdate(
    { guildId, userId: member.id },
    {
      $set: {
        guildId,
        userId: member.id,
        roles,
        reason,
        jailedAt,
        expiresAt,
        jailRoleId,
        jailedBy: moderator?.id || null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  try {
    await sendJailLog({
      guild: member.guild,
      member,
      moderator,
      reason,
      duration,
    });
  } catch (e) {
    console.warn("Jail log failed:", e.message);
  }

  if (expiresAt) {
    const delay = expiresAt - Date.now();
    if (delay > 0) {
      setTimeout(() => unjail(member, null), delay);
    }
  }
}

async function unjail(member, moderator = null) {
  const guildId = member.guild.id;

  const entry = await JailRecord.findOne({
    guildId,
    userId: member.id,
  }).lean();

  if (!entry) return false;

  try {
    if (member.roles.cache.has(entry.jailRoleId)) {
      await member.roles.remove(entry.jailRoleId);
    }

    if (Array.isArray(entry.roles) && entry.roles.length) {
      await member.roles.add(entry.roles);
    }

    await JailRecord.deleteOne({
      guildId,
      userId: member.id,
    });

    try {
      await sendUnjailLog({
        guild: member.guild,
        member,
        moderator,
      });
    } catch (e) {
      console.warn("Unjail log failed:", e.message);
    }

    return true;
  } catch (err) {
    console.error("UNJAIL ERROR:", err);
    return false;
  }
}

async function restoreJails(client) {
  const activeTimedJails = await JailRecord.find({
    expiresAt: { $ne: null },
  }).lean();

  for (const entry of activeTimedJails) {
    let guild;
    try {
      guild = await client.guilds.fetch(entry.guildId);
    } catch {
      continue;
    }

    const remaining = Number(entry.expiresAt) - Date.now();

    if (remaining <= 0) {
      try {
        const member = await guild.members.fetch(entry.userId).catch(() => null);

        if (member) {
          await unjail(member, null);
        } else {
          await JailRecord.deleteOne({
            guildId: entry.guildId,
            userId: entry.userId,
          });
        }
      } catch (err) {
        console.error("RESTORE EXPIRED JAIL ERROR:", err);
      }
      continue;
    }

    setTimeout(async () => {
      try {
        const member = await guild.members.fetch(entry.userId).catch(() => null);

        if (member) {
          await unjail(member, null);
        } else {
          await JailRecord.deleteOne({
            guildId: entry.guildId,
            userId: entry.userId,
          });
        }
      } catch (err) {
        console.error("RESTORE ERROR:", err);
      }
    }, remaining);
  }
}

/* -------------------- exports -------------------- */
module.exports = {
  jail,
  unjail,
  restoreJails,
};