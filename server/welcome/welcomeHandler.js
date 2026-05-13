const { Events, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require("discord.js");
const buildWelcomeCard = require("./welcomeCard");
const { getGuildConfig } = require("../database/guildConfigDb");
const GuildConfig = require("../models/GuildConfig");

function parseVariables(text, member, config = {}) {
  if (!text) return "";

  return text
    .replace(/{user}/g, `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(
      /{rules}/g,
      config.rulesChannelId ? `<#${config.rulesChannelId}>` : "rules channel"
    )
    .replace(
      /{support}/g,
      config.supportChannelId ? `<#${config.supportChannelId}>` : "support channel"
    );
}

async function getGuildSecurityConfig(guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return config?.security || null;
  } catch (error) {
    console.error("Failed to load guild security config in welcomeHandler:", error);
    return null;
  }
}

function getQuarantineRoleIdsFromSecurity(security) {
  const ids = new Set();

  const antiRaidQuarantineRoleId =
    security?.antiRaid?.quarantineRoleId || "";
  const suspiciousQuarantineRoleId =
    security?.suspiciousAccount?.quarantineRoleId || "";

  if (antiRaidQuarantineRoleId) ids.add(antiRaidQuarantineRoleId);
  if (suspiciousQuarantineRoleId) ids.add(suspiciousQuarantineRoleId);

  return [...ids];
}

async function memberIsQuarantined(member) {
  try {
    const security = await getGuildSecurityConfig(member.guild.id);
    if (!security) return false;

    const quarantineRoleIds = getQuarantineRoleIdsFromSecurity(security);
    if (!quarantineRoleIds.length) return false;

    return quarantineRoleIds.some((roleId) => member.roles.cache.has(roleId));
  } catch (error) {
    console.error("Failed to check quarantine status in welcomeHandler:", error);
    return false;
  }
}

module.exports = (client) => {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const guildId = member.guild.id;
      const guildConfig = await getGuildConfig(guildId);


      if (!guildConfig?.welcome?.enabled) return;

      const config = guildConfig.welcome;
      const embed = config.embed || {};

      async function handleAutoRole() {
  try {
    const security = await getGuildSecurityConfig(member.guild.id);

    const suspiciousSettings = security?.suspiciousAccount || null;
    const suspiciousEnabled = !!suspiciousSettings?.enabled;

    if (suspiciousEnabled) {
      const accountAgeMs = Date.now() - member.user.createdTimestamp;

      const minAgeMinutes =
        Number(suspiciousSettings.minAccountAgeMinutes) ||
        Number(suspiciousSettings.accountAgeMinutes) ||
        ((Number(suspiciousSettings.accountAgeDays) || 7) * 24 * 60);

      const minAgeMs = minAgeMinutes * 60 * 1000;

      const checkDefaultAvatar =
        suspiciousSettings.checkDefaultAvatar === true ||
        suspiciousSettings.detectDefaultAvatar === true;

      const hasDefaultAvatar = member.user.avatar === null;
      const isTooNew = accountAgeMs < minAgeMs;

      const looksSuspicious =
        isTooNew || (checkDefaultAvatar && hasDefaultAvatar);

      if (looksSuspicious) {
        return;
      }
    }

    const quarantined = await memberIsQuarantined(member);
    if (quarantined) {
      return;
    }

    const autoRoleEnabled = config.autoRole?.enabled;
    const autoRoleId = config.autoRole?.roleId;

    if (!autoRoleEnabled || !autoRoleId) return;

    const botMember =
      member.guild.members.me ||
      (await member.guild.members.fetchMe().catch(() => null));

    if (!botMember) {
      return;
    }

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return;
    }

    let role = member.guild.roles.cache.get(autoRoleId);
    if (!role) {
      role = await member.guild.roles.fetch(autoRoleId).catch(() => null);
    }

    if (!role) {
      return;
    }

    if (role.managed) {
      return;
    }

    if (role.position >= botMember.roles.highest.position) {
    console.warn(
  `[Kyro Welcome] Cannot assign role "${role.name}" because it is above the bot's highest role`
);
      return;
    }

    await member.roles.add(role);
  } catch (error) {
    console.error("Welcome auto role error:", error);
  }
}

      async function handleWelcomeDM() {
        try {

          if (!config.dm?.enabled) {
            return;
          }

          const replace = (text) => parseVariables(text, member, guildConfig);

          if (config.dm.mode === "embed") {
            const dmEmbed = new EmbedBuilder().setColor(
              config.dm.embed?.color || "#5865F2"
            );

            const dmTitle = replace(config.dm.embed?.title || "");
            const dmDescription = replace(
              config.dm.embed?.description || "Welcome to {server}, {user}"
            );

            if (dmTitle && dmTitle.trim() !== "") {
              dmEmbed.setTitle(dmTitle);
            }

            if (dmDescription && dmDescription.trim() !== "") {
              dmEmbed.setDescription(dmDescription);
            }

            if (config.dm.embed?.footer) {
              dmEmbed.setFooter({
                text: replace(config.dm.embed.footer),
              });
            }

            if (config.dm.embed?.banner) {
              dmEmbed.setImage(config.dm.embed.banner);
            }

            const dmThumb = config.dm.embed?.thumbnail;
            if (dmThumb !== false && dmThumb !== "false") {
              dmEmbed.setThumbnail(
                member.user.displayAvatarURL({ dynamic: true })
              );
            }

            await member.send({ embeds: [dmEmbed] });
            
            return;
          }

          const dmMessage = replace(
            config.dm?.message || `Welcome to {server}, {user}`
          );

          

          await member.send({ content: dmMessage });
          
        } catch (error) {
          console.error("[WELCOME DM ERROR]", error);
        }
      }

      // Run these first so they still work even if welcome channel is missing
      await handleAutoRole();
      await handleWelcomeDM();

      const channelId = config.channelId;
      if (!channelId) return;

      const channel =
        member.guild.channels.cache.get(channelId) ||
        (await member.guild.channels.fetch(channelId).catch(() => null));

      if (!channel) {
  return;
}

      const mode = config.mode || "embed";

      const title = embed.title
        ? parseVariables(embed.title, member, guildConfig)
        : null;

      const description =
        embed.description || config.message
          ? parseVariables(
              embed.description || config.message,
              member,
              guildConfig
            )
          : `Welcome to **${member.guild.name}** 🎉`;

      const welcomeEmbed = new EmbedBuilder()
        .setColor(embed.color || "#5865F2")
        .setDescription(description)
        .setTimestamp();

      if (title) {
        welcomeEmbed.setTitle(title);
      }

      if (embed.banner && embed.banner !== "") {
        welcomeEmbed.setImage(embed.banner);
      }

      // Thumbnail logic:
      // - false / "false" => disable thumbnail
      // - true / "true" / empty => use member avatar
      // - valid URL string => use custom thumbnail URL
      const thumbnailValue = embed.thumbnail;

      if (
        thumbnailValue === false ||
        thumbnailValue === "false" ||
        thumbnailValue === null
      ) {
        // do not set thumbnail
      } else if (
        typeof thumbnailValue === "string" &&
        thumbnailValue.trim() !== "" &&
        thumbnailValue !== "true"
      ) {
        welcomeEmbed.setThumbnail(thumbnailValue);
      } else {
        welcomeEmbed.setThumbnail(
          member.user.displayAvatarURL({ dynamic: true })
        );
      }

      if (embed.footer) {
        welcomeEmbed.setFooter({
          text: parseVariables(embed.footer, member, guildConfig),
        });
      }

      // EMBED ONLY MODE
      if (mode === "embed") {
        await channel.send({ embeds: [welcomeEmbed] });
        return;
      }

      // BACKGROUND CARD ONLY MODE
      if (mode === "background") {
        try {
          const image = await buildWelcomeCard(member, config);
          const attachment = new AttachmentBuilder(image, {
            name: "welcome.png",
          });

          await channel.send({
            files: [attachment],
          });

          return;
        } catch (error) {
          console.error("Welcome background error:", error);
          await channel.send({ embeds: [welcomeEmbed] });
          return;
        }
      }

      // EMBED + CARD MODE
      if (mode === "both") {
        try {
          const image = await buildWelcomeCard(member, config);
          const attachment = new AttachmentBuilder(image, {
            name: "welcome.png",
          });

          await channel.send({
            embeds: [welcomeEmbed.setImage("attachment://welcome.png")],
            files: [attachment],
          });

          return;
        } catch (error) {
          console.error("Welcome both mode background error:", error);
          await channel.send({ embeds: [welcomeEmbed] });
          return;
        }
      }

      // FALLBACK
      await channel.send({ embeds: [welcomeEmbed] });
    } catch (error) {
      console.error("Welcome handler error:", error);
    }
  });
};