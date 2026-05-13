module.exports = async function isAntiNukeWhitelisted(guild, userId, config) {
  try {
    if (!guild || !userId) return false;

    if (guild.ownerId === userId) return true;
    if (guild.client?.user?.id === userId) return true;

    const antiNuke = config?.security?.antiNuke || {};

    const whitelistUserIds = Array.isArray(antiNuke.whitelistUserIds)
      ? antiNuke.whitelistUserIds
      : [];

    const whitelistRoleIds = Array.isArray(antiNuke.whitelistRoleIds)
      ? antiNuke.whitelistRoleIds
      : [];

    if (whitelistUserIds.includes(userId)) {
      return true;
    }

    if (!whitelistRoleIds.length) {
      return false;
    }

    const member =
      guild.members.cache.get(userId) ||
      (await guild.members.fetch(userId).catch(() => null));

    if (!member) return false;

    return whitelistRoleIds.some((roleId) => member.roles.cache.has(roleId));
  } catch (error) {
    console.error("❌ Anti-Nuke whitelist check error:", error);
    return false;
  }
};