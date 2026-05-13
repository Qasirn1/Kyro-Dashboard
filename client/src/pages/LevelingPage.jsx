import { useEffect, useRef, useState } from "react";
import { Crown, ChevronDown, Search, X, CheckCircle2 } from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import PageLoader from "../components/PageLoader";

import API_BASE from "../config/api";

function LevelingPage({ selectedGuild }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [hasChanges, setHasChanges] = useState(false);
  const initialLevelingRef = useRef(null);
    const rankCardFileInputRef = useRef(null);

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  
const [premiumStatus, setPremiumStatus] = useState({
  hasPremium: false,
  plan: "free",
});

const isPremium = Boolean(
  premiumStatus?.hasPremium || premiumStatus?.plan === "lifetime"
);

   const [leveling, setLeveling] = useState({
    enabled: true,

    chat: {
      enabled: true,
      xpMode: "random",
      xpPerMessage: 15,
      minXp: 10,
      maxXp: 20,
      cooldownSeconds: 60,
      ignoredChannelIds: [],
      ignoredRoleIds: [],
    },

    voice: {
      enabled: true,
      xpPerMinute: 10,
      ignoredChannelIds: [],
      ignoredRoleIds: [],
      requireOtherUsers: false,
      ignoreMutedUsers: false,
      ignoreDeafenedUsers: false,
    },

    announcements: {
      levelUpChannelId: "",
      levelUpMessage: "GG {user}, you reached level {level}!",
    },

    rankCard: {
      backgroundImage: "",
      overlayOpacity: 0.35,
      accentColor: "#5865F2",
    },

    roleRewardMode: "stack",
    roleRewards: [],

    levelUpEmbed: {
      enabled: true,
      title: "Level Up!",
      color: "#5865F2",
      footer: "",
      banner: "",
    },
  });


  useEffect(() => {
    if (!selectedGuild?.id) return;

    const fetchLevelingData = async () => {
      setLoading(true);
      setSaveMessage("");

      try {
       const [levelingRes, channelsRes, rolesRes] = await Promise.all([
  fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/leveling`),
  fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`),
  fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/roles`),
]);

        const levelingData = await levelingRes.json();
        const channelsData = await channelsRes.json();
        const rolesData = await rolesRes.json();

        if (levelingData.success && levelingData.leveling) {
          setPremiumStatus(
  levelingData?.premiumStatus || {
    hasPremium: false,
    plan: "free",
  }
);
                    const normalizedLoadedLeveling = {
            enabled: levelingData.leveling?.enabled ?? true,

            chat: {
              enabled: levelingData.leveling?.chat?.enabled ?? true,
              xpMode: levelingData.leveling?.chat?.xpMode ?? "random",
              xpPerMessage: Number(levelingData.leveling?.chat?.xpPerMessage ?? 15),
              minXp: Number(levelingData.leveling?.chat?.minXp ?? 10),
              maxXp: Number(levelingData.leveling?.chat?.maxXp ?? 20),
              cooldownSeconds: Number(
                levelingData.leveling?.chat?.cooldownSeconds ?? 60
              ),
              ignoredChannelIds: [
                ...(levelingData.leveling?.chat?.ignoredChannelIds ?? []),
              ].sort(),
              ignoredRoleIds: [
                ...(levelingData.leveling?.chat?.ignoredRoleIds ?? []),
              ].sort(),
            },

            voice: {
              enabled: levelingData.leveling?.voice?.enabled ?? true,
              xpPerMinute: Number(levelingData.leveling?.voice?.xpPerMinute ?? 10),
              ignoredChannelIds: [
                ...(levelingData.leveling?.voice?.ignoredChannelIds ?? []),
              ].sort(),
              ignoredRoleIds: [
                ...(levelingData.leveling?.voice?.ignoredRoleIds ?? []),
              ].sort(),
              requireOtherUsers:
                levelingData.leveling?.voice?.requireOtherUsers ?? false,
              ignoreMutedUsers:
                levelingData.leveling?.voice?.ignoreMutedUsers ?? false,
              ignoreDeafenedUsers:
                levelingData.leveling?.voice?.ignoreDeafenedUsers ?? false,
            },

            announcements: {
              levelUpChannelId:
                levelingData.leveling?.announcements?.levelUpChannelId ?? "",
              levelUpMessage:
                levelingData.leveling?.announcements?.levelUpMessage ??
                "GG {user}, you reached level {level}!",
            },

            rankCard: {
              backgroundImage:
                levelingData.leveling?.rankCard?.backgroundImage ?? "",
              overlayOpacity: Number(
                levelingData.leveling?.rankCard?.overlayOpacity ?? 0.35
              ),
              accentColor:
                levelingData.leveling?.rankCard?.accentColor ?? "#5865F2",
            },

            roleRewardMode: levelingData.leveling?.roleRewardMode ?? "stack",

            roleRewards: Array.isArray(levelingData.leveling?.roleRewards)
              ? levelingData.leveling.roleRewards
                  .filter((reward) => reward.roleId && Number(reward.level) > 0)
                  .map((reward) => ({
                    roleId: reward.roleId,
                    level: Math.max(1, Number(reward.level) || 1),
                  }))
                  .sort((a, b) => a.level - b.level)
              : [],

            levelUpEmbed: {
              enabled: levelingData.leveling?.levelUpEmbed?.enabled ?? true,
              title: levelingData.leveling?.levelUpEmbed?.title ?? "Level Up!",
              color: levelingData.leveling?.levelUpEmbed?.color ?? "#5865F2",
              footer: levelingData.leveling?.levelUpEmbed?.footer ?? "",
              banner: levelingData.leveling?.levelUpEmbed?.banner ?? "",
            },
          };

          setLeveling(normalizedLoadedLeveling);
         setTimeout(() => {
  initialLevelingRef.current = JSON.stringify(
  getLevelingSnapshot(normalizedLoadedLeveling)
);
  setHasChanges(false);
}, 0);
          setHasChanges(false);
        }

        if (channelsData.success) {
          setChannels(channelsData.channels || []);
        }

        if (rolesData.success) {
          setRoles(rolesData.roles || []);
        }
      } catch (error) {
        console.error("Failed to fetch leveling dashboard data:", error);
      } finally {
        setLoading(false);
setHasChanges(false);
      }
    };

    fetchLevelingData();
  }, [selectedGuild?.id]);

  useEffect(() => {
    if (!initialLevelingRef.current || loading) return;

  const normalizedCurrent = getLevelingSnapshot(leveling);

    const currentString = JSON.stringify(normalizedCurrent);
    setHasChanges(currentString !== initialLevelingRef.current);
  }, [leveling, loading]);

  useEffect(() => {
    if (!saveMessage) return;

    const timer = setTimeout(() => {
      setSaveMessage("");
    }, 2500);

    return () => clearTimeout(timer);
  }, [saveMessage]);

  const saveSettings = async () => {
    if (!selectedGuild?.id) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const cleanedRoleRewards = (leveling.roleRewards || [])
        .filter((reward) => reward.roleId && Number(reward.level) > 0)
        .map((reward) => ({
          roleId: reward.roleId,
          level: Math.max(1, Number(reward.level) || 1),
        }))
        .sort((a, b) => a.level - b.level);

            const normalizedSavedLeveling = {
        enabled: leveling.enabled ?? true,

        chat: {
          enabled: leveling.chat?.enabled ?? true,
          xpMode: leveling.chat?.xpMode ?? "random",
          xpPerMessage: Math.max(1, Number(leveling.chat?.xpPerMessage ?? 15)),
minXp: Math.max(1, Number(leveling.chat?.minXp ?? 10)),
maxXp: Math.max(
  Math.max(1, Number(leveling.chat?.minXp ?? 10)),
  Number(leveling.chat?.maxXp ?? 20)
),
cooldownSeconds: Math.max(0, Number(leveling.chat?.cooldownSeconds ?? 60)),
          ignoredChannelIds: [...(leveling.chat?.ignoredChannelIds || [])].sort(),
          ignoredRoleIds: [...(leveling.chat?.ignoredRoleIds || [])].sort(),
        },

        voice: {
          enabled: leveling.voice?.enabled ?? true,
          xpPerMinute: Math.max(1, Number(leveling.voice?.xpPerMinute ?? 10)),
          ignoredChannelIds: [...(leveling.voice?.ignoredChannelIds || [])].sort(),
          ignoredRoleIds: [...(leveling.voice?.ignoredRoleIds || [])].sort(),
          requireOtherUsers: leveling.voice?.requireOtherUsers ?? false,
          ignoreMutedUsers: leveling.voice?.ignoreMutedUsers ?? false,
          ignoreDeafenedUsers: leveling.voice?.ignoreDeafenedUsers ?? false,
        },

        announcements: {
          levelUpChannelId: leveling.announcements?.levelUpChannelId ?? "",
          levelUpMessage:
            leveling.announcements?.levelUpMessage ??
            "GG {user}, you reached level {level}!",
        },

        rankCard: {
          backgroundImage: leveling.rankCard?.backgroundImage ?? "",
          overlayOpacity: Number(leveling.rankCard?.overlayOpacity ?? 0.35),
          accentColor: leveling.rankCard?.accentColor ?? "#5865F2",
        },

        roleRewardMode: leveling.roleRewardMode || "stack",
        roleRewards: cleanedRoleRewards,

        levelUpEmbed: {
          enabled: leveling.levelUpEmbed?.enabled ?? true,
          title: leveling.levelUpEmbed?.title ?? "Level Up!",
          color: leveling.levelUpEmbed?.color ?? "#5865F2",
          footer: leveling.levelUpEmbed?.footer ?? "",
          banner: leveling.levelUpEmbed?.banner ?? "",
        },
      };

      const res = await fetch(
  `${API_BASE}/api/guilds/${selectedGuild.id}/leveling`,
  {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(normalizedSavedLeveling),
        }
      );

      const data = await res.json();

      if (data.success) {
        setLeveling(normalizedSavedLeveling);
       initialLevelingRef.current = JSON.stringify(
  getLevelingSnapshot(normalizedSavedLeveling)
);
        setHasChanges(false);
        setSaveMessage("✅ Leveling settings saved successfully.");
      } else {
        setSaveMessage("❌ Failed to save leveling settings.");
      }
    } catch (error) {
      console.error("Failed to save leveling config:", error);
      setSaveMessage("❌ Failed to save leveling settings.");
    } finally {
      setSaving(false);
    }
  };

  const addRoleReward = () => {
    setLeveling((prev) => ({
      ...prev,
      roleRewards: [...prev.roleRewards, { level: 1, roleId: "" }],
    }));
  };

  const updateRoleReward = (index, key, value) => {
    setLeveling((prev) => {
      const updated = [...prev.roleRewards];
      updated[index] = {
        ...updated[index],
        [key]: key === "level" ? Math.max(1, Number(value) || 1) : value,
      };

      updated.sort((a, b) => a.level - b.level);

      return {
        ...prev,
        roleRewards: updated,
      };
    });
  };

  const removeRoleReward = (index) => {
    setLeveling((prev) => ({
      ...prev,
      roleRewards: prev.roleRewards.filter((_, i) => i !== index),
    }));
  };

  const discardChanges = () => {
    if (!initialLevelingRef.current) return;

    try {
      const originalData = JSON.parse(initialLevelingRef.current);
      setLeveling(originalData);
      setSaveMessage("");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to discard changes:", error);
    }
  };

  const isRoleAlreadySelected = (roleId, currentIndex) => {
    return leveling.roleRewards.some(
      (reward, index) => index !== currentIndex && reward.roleId === roleId
    );
  };

  const insertVariable = (variable) => {
    setLeveling((prev) => ({
      ...prev,
      announcements: {
        ...prev.announcements,
        levelUpMessage: `${prev.announcements?.levelUpMessage || ""}${variable}`,
      },
    }));
  };

const getLevelingSnapshot = (data) => ({
  enabled: !!data.enabled,

  chat: {
    enabled: data.chat?.enabled ?? true,
    xpMode: data.chat?.xpMode ?? "random",
    xpPerMessage: Math.max(1, Number(data.chat?.xpPerMessage ?? 15)),
    minXp: Math.max(1, Number(data.chat?.minXp ?? 10)),
    maxXp: Math.max(
      Math.max(1, Number(data.chat?.minXp ?? 10)),
      Number(data.chat?.maxXp ?? 20)
    ),
    cooldownSeconds: Math.max(0, Number(data.chat?.cooldownSeconds ?? 60)),
    ignoredChannelIds: [...(data.chat?.ignoredChannelIds || [])].sort(),
    ignoredRoleIds: [...(data.chat?.ignoredRoleIds || [])].sort(),
  },

  voice: {
    enabled: data.voice?.enabled ?? true,
    xpPerMinute: Math.max(1, Number(data.voice?.xpPerMinute ?? 10)),
    ignoredChannelIds: [...(data.voice?.ignoredChannelIds || [])].sort(),
    ignoredRoleIds: [...(data.voice?.ignoredRoleIds || [])].sort(),
    requireOtherUsers: data.voice?.requireOtherUsers ?? false,
    ignoreMutedUsers: data.voice?.ignoreMutedUsers ?? false,
    ignoreDeafenedUsers: data.voice?.ignoreDeafenedUsers ?? false,
  },

  announcements: {
    levelUpChannelId: data.announcements?.levelUpChannelId ?? "",
    levelUpMessage:
      data.announcements?.levelUpMessage ??
      "GG {user}, you reached level {level}!",
  },

  rankCard: {
    backgroundImage: data.rankCard?.backgroundImage ?? "",
    overlayOpacity: Number(data.rankCard?.overlayOpacity ?? 0.35),
    accentColor: data.rankCard?.accentColor ?? "#5865F2",
  },

  roleRewardMode: data.roleRewardMode || "stack",

  roleRewards: [...(data.roleRewards || [])]
    .filter((reward) => reward.roleId && Number(reward.level) > 0)
    .map((reward) => ({
      roleId: reward.roleId,
      level: Math.max(1, Number(reward.level) || 1),
    }))
    .sort((a, b) => a.level - b.level),

  levelUpEmbed: {
    enabled: data.levelUpEmbed?.enabled ?? true,
    title: data.levelUpEmbed?.title ?? "Level Up!",
    color: data.levelUpEmbed?.color ?? "#5865F2",
    footer: data.levelUpEmbed?.footer ?? "",
    banner: data.levelUpEmbed?.banner ?? "",
  },
});

  const getPreviewMessage = () => {
    const baseMessage =
      leveling.announcements?.levelUpMessage?.trim() ||
      "Congrats {user} You reached Level {level}";

    return baseMessage
      .replaceAll("{user}", "@Qasir")
      .replaceAll("{username}", "Qasir")
      .replaceAll("{server}", selectedGuild?.name || "Kyro Server")
      .replaceAll("{level}", "5");
  };

  const handleRankCardImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      setLeveling((prev) => ({
        ...prev,
        rankCard: {
          ...prev.rankCard,
          backgroundImage: result,
        },
      }));
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  const removeRankCardImage = () => {
    setLeveling((prev) => ({
      ...prev,
      rankCard: {
        ...prev.rankCard,
        backgroundImage: "",
      },
    }));
  };

  if (!selectedGuild) {
    return (
      <div style={pageCard}>
        <h2 style={sectionTitle}>Leveling Settings</h2>
        <p style={sectionText}>
          Select a server from the dashboard first, then open Leveling.
        </p>
      </div>
    );
  }

 if (loading) {
  return (
    <PageLoader
      title="Loading leveling..."
      subtitle="Preparing XP rates, level-up channels, reward roles, and embed settings."
    />
  );
}

  return (
    <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto" }}>
            <input
        ref={rankCardFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleRankCardImageUpload}
        style={{ display: "none" }}
      />
      <div style={pageCard}>
        <div style={pageHeaderRow}>
          <div>
            <h2 style={{ ...sectionTitle, textAlign: "left" }}>
              Leveling Settings
            </h2>
            <p style={{ ...sectionText, textAlign: "left", marginBottom: 0 }}>
              Managing <strong>{selectedGuild.name}</strong>
            </p>
          </div>

          {hasChanges && (
            <button
              style={{
                ...authButton,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          )}
        </div>

        <div style={settingsGrid}>
          <div style={settingCard}>
            <div style={settingTitle}>Enable Leveling</div>
            <div style={toggleRow}>
              <button
                onClick={() =>
                  setLeveling({
                    ...leveling,
                    enabled: !leveling.enabled,
                  })
                }
                style={{
                  ...toggleButton,
                  justifyContent: leveling.enabled ? "flex-end" : "flex-start",
                  background: leveling.enabled
                    ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                <div style={toggleCircle} />
              </button>
              <span style={settingHelp}>
                Turn the leveling system on or off for this server.
              </span>
            </div>
          </div>

                    <div style={settingCard}>
            <div style={settingTitle}>Chat XP Mode</div>

            <div style={rewardModeWrap}>
              <button
                type="button"
                onClick={() =>
                  setLeveling({
                    ...leveling,
                    chat: {
                      ...leveling.chat,
                      xpMode: "fixed",
                    },
                  })
                }
                style={{
                  ...rewardModeButton,
                  ...(leveling.chat?.xpMode === "fixed"
                    ? rewardModeButtonActive
                    : {}),
                }}
              >
                <div style={rewardModeTitle}>Fixed XP</div>
                <div style={rewardModeText}>
                  Every eligible message gives the same amount of XP.
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setLeveling({
                    ...leveling,
                    chat: {
                      ...leveling.chat,
                      xpMode: "random",
                    },
                  })
                }
                style={{
                  ...rewardModeButton,
                  ...(leveling.chat?.xpMode === "random"
                    ? rewardModeButtonActive
                    : {}),
                }}
              >
                <div style={rewardModeTitle}>Random XP</div>
                <div style={rewardModeText}>
                  Every eligible message gives a random XP amount in your range.
                </div>
              </button>
            </div>

            <p style={settingHelp}>
              Choose whether chat XP should be fixed or randomized.
            </p>
          </div>

                    <div style={settingCard}>
            <div style={settingTitle}>Chat XP Settings</div>

            {leveling.chat?.xpMode === "fixed" ? (
              <>
                <div style={miniLabel}>XP Per Message</div>
                <input
                  type="number"
                  min="1"
                  value={leveling.chat?.xpPerMessage ?? 15}
                  onChange={(e) =>
                    setLeveling({
                      ...leveling,
                      chat: {
                        ...leveling.chat,
                        xpPerMessage: Math.max(1, Number(e.target.value) || 1),
                      },
                    })
                  }
                  style={inputStyle}
                />
                <p style={settingHelp}>
                  Members will receive this exact amount of XP per eligible message.
                </p>
              </>
            ) : (
              <>
                <div style={{ display: "grid", gap: "14px" }}>
                  <div>
                    <div style={miniLabel}>Minimum XP</div>
                    <input
                      type="number"
                      min="1"
                      value={leveling.chat?.minXp ?? 10}
                      onChange={(e) =>
                        setLeveling({
                          ...leveling,
                          chat: {
                            ...leveling.chat,
                            minXp: Math.max(1, Number(e.target.value) || 1),
                          },
                        })
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={miniLabel}>Maximum XP</div>
                    <input
                      type="number"
                      min="1"
                      value={leveling.chat?.maxXp ?? 20}
                      onChange={(e) =>
                        setLeveling({
                          ...leveling,
                          chat: {
                            ...leveling.chat,
                            maxXp: Math.max(1, Number(e.target.value) || 1),
                          },
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <p style={settingHelp}>
                  Members will receive a random XP value between min and max for each eligible message.
                </p>
              </>
            )}
          </div>

                    <div style={settingCard}>
            <div style={settingTitle}>Chat Cooldown</div>
            <input
              type="number"
              min="0"
              value={leveling.chat?.cooldownSeconds ?? 60}
              onChange={(e) =>
                setLeveling({
                  ...leveling,
                  chat: {
                    ...leveling.chat,
                    cooldownSeconds: Math.max(0, Number(e.target.value) || 0),
                  },
                })
              }
              style={inputStyle}
            />
            <p style={settingHelp}>
              Cooldown in seconds before a member can earn chat XP again.
            </p>
          </div>

          <div style={settingCard}>
            <div style={settingTitle}>Voice XP Rate</div>
            <input
              type="number"
              value={leveling.voice?.xpPerMinute ?? 10}
           onChange={(e) =>
  setLeveling({
    ...leveling,
    voice: {
      ...leveling.voice,
      xpPerMinute: Number(e.target.value),
    },
  })
}
              style={inputStyle}
            />
            <p style={settingHelp}>XP awarded per minute in voice.</p>
          </div>

          <div style={settingCard}>
            <div style={settingTitle}>Level-Up Channel</div>

             <SearchableSelect
options={channels
  .filter((channel) => {
    const type = String(channel.type).toLowerCase();

    return (
      type === "0" ||
      type === "guild_text" ||
      type === "text"
    );
  })
  .map((channel) => ({
    ...channel,
    id: channel.id || channel.channelId,
    name: channel.name || channel.label,
  }))}
 value={leveling.announcements?.levelUpChannelId || ""}
  placeholder="Select a channel"
  searchPlaceholder="Search channels..."
  formatLabel={(item) => `# ${item.name}`}
onChange={(value) =>
  setLeveling({
    ...leveling,
    announcements: {
      ...leveling.announcements,
      levelUpChannelId: value,
    },
  })
}
/>

            <p style={settingHelp}>
              Channel where level-up messages will be sent.
            </p>
          </div>
        </div>

        <div style={{ ...settingCard, marginTop: "22px" }}>
          <div style={settingTitle}>Level-Up Message</div>

          <textarea
            value={leveling.announcements?.levelUpMessage || ""}
          onChange={(e) =>
  setLeveling({
    ...leveling,
    announcements: {
      ...leveling.announcements,
      levelUpMessage: e.target.value,
    },
  })
}
            placeholder="Enter custom level-up message..."
            style={textareaStyle}
          />

          <div style={{ marginTop: "14px" }}>
            <div style={miniLabel}>Variables</div>

            <div style={variableChipsWrap}>
              <button
                type="button"
                style={variableChip}
                onClick={() => insertVariable("{user}")}
              >
                + user
              </button>

              <button
                type="button"
                style={variableChip}
                onClick={() => insertVariable("{username}")}
              >
                + username
              </button>

              <button
                type="button"
                style={variableChip}
                onClick={() => insertVariable("{server}")}
              >
                + server
              </button>

              <button
                type="button"
                style={variableChip}
                onClick={() => insertVariable("{level}")}
              >
                + level
              </button>
            </div>
          </div>

          <div style={previewCard}>
            <div style={previewHeader}>Live Preview</div>

           <div style={previewOuter}>
  <div
    style={{
      ...previewEmbed,
      borderLeft: `4px solid ${leveling.levelUpEmbed?.color || "#5865F2"}`,
    }}
  >
    <div style={previewAuthorRow}>
      <div style={previewBotAvatar}>K</div>
      <div style={previewAuthorText}>
        <span style={previewAuthorName}>Kyro</span>
        <span style={previewBotTag}>APP</span>
      </div>
    </div>

    <div style={previewTitle}>
      {leveling.levelUpEmbed?.title || "Level Up!"}
    </div>

    <div style={previewDescription}>{getPreviewMessage()}</div>

    {leveling.levelUpEmbed?.banner ? (
      <img
        src={leveling.levelUpEmbed.banner}
        alt="Level-up banner preview"
        style={previewBanner}
      />
    ) : null}

    {leveling.levelUpEmbed?.footer && isPremium ? (
      <div style={previewFooterRow}>
        <div style={previewFooterIcon}>K</div>
        <div style={previewFooter}>{leveling.levelUpEmbed.footer}</div>
      </div>
    ) : null}
  </div>
</div>
          </div>

          <p style={settingHelp}>
            Use variables to personalize the level-up message with live preview.
          </p>
        </div>

        <div style={{ ...settingCard, marginTop: "22px" }}>
          <div style={settingTitle}>Embed Customization</div>

          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <div style={miniLabel}>Embed Title</div>
              <input
                type="text"
                value={leveling.levelUpEmbed?.title || ""}
                onChange={(e) =>
                  setLeveling({
                    ...leveling,
                    levelUpEmbed: {
                      ...leveling.levelUpEmbed,
                      title: e.target.value,
                    },
                  })
                }
                placeholder="Level Up!"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={miniLabel}>Embed Color</div>
              <div style={colorRow}>
                <input
                  type="color"
                  value={leveling.levelUpEmbed?.color || "#5865F2"}
                  onChange={(e) =>
                    setLeveling({
                      ...leveling,
                      levelUpEmbed: {
                        ...leveling.levelUpEmbed,
                        color: e.target.value,
                      },
                    })
                  }
                  style={colorInput}
                />

                <input
                  type="text"
                  value={leveling.levelUpEmbed?.color || "#5865F2"}
                  onChange={(e) =>
                    setLeveling({
                      ...leveling,
                      levelUpEmbed: {
                        ...leveling.levelUpEmbed,
                        color: e.target.value,
                      },
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            {!isPremium ? (
              <PremiumLockedInputRow
                label="Footer Text"
                description="Footer text is available for Kyro Premium servers only."
                placeholder="Premium only"
                value={leveling.levelUpEmbed?.footer || ""}
              />
            ) : (
              <div>
                <div style={settingTitleInline}>Footer Text</div>

                <input
                  type="text"
                  value={leveling.levelUpEmbed?.footer || ""}
                  onChange={(e) =>
                    setLeveling({
                      ...leveling,
                      levelUpEmbed: {
                        ...leveling.levelUpEmbed,
                        footer: e.target.value,
                      },
                    })
                  }
                  placeholder="Powered by Kyro"
                  style={inputStyle}
                />

                <p style={settingHelp}>
                  Customize the footer shown on your level-up embed.
                </p>
              </div>
            )}
          </div>
        </div>

        {!isPremium ? (
          <PremiumLockedField
            label="Level-Up Banner"
            description="Premium servers will be able to set a custom banner/image for level-up messages."
            placeholder="Premium only"
            value={leveling.levelUpEmbed?.banner || ""}
          />
        ) : (
          <div style={{ ...settingCard, marginTop: "22px" }}>
            <div style={settingTitle}>Level-Up Banner</div>

            <input
              type="text"
              placeholder="Banner URL"
              value={leveling.levelUpEmbed?.banner || ""}
              onChange={(e) =>
                setLeveling((prev) => ({
                  ...prev,
                  levelUpEmbed: {
                    ...prev.levelUpEmbed,
                    banner: e.target.value,
                  },
                }))
              }
              style={inputStyle}
            />

            <p style={settingHelp}>
              Set a custom banner or image for level-up messages.
            </p>
          </div>
        )}

                <div style={{ ...settingCard, marginTop: "22px" }}>
          <div style={settingTitle}>Rank Card Background</div>

          <div style={miniLabel}>Mode</div>
          <div style={rewardModeWrap}>
            <button
              type="button"
              onClick={removeRankCardImage}
              style={{
                ...rewardModeButton,
                ...(!leveling.rankCard?.backgroundImage
                  ? rewardModeButtonActive
                  : {}),
              }}
            >
              <div style={rewardModeTitle}>Default Kyro Card</div>
              <div style={rewardModeText}>
                Free servers use the built-in polished Kyro rank card background.
              </div>
            </button>

            <button
              type="button"
              onClick={() => rankCardFileInputRef.current?.click()}
              style={{
                ...rewardModeButton,
                ...(leveling.rankCard?.backgroundImage
                  ? rewardModeButtonActive
                  : {}),
              }}
            >
              <div style={rewardModeTitle}>Custom Background</div>
              <div style={rewardModeText}>
                Use an image link or upload a custom background from your device.
              </div>
            </button>
          </div>

          <div style={{ marginTop: "16px" }}>
            <div style={miniLabel}>Background Image URL</div>
            <p style={settingHelp}>
  Recommended size: <strong>900 × 280</strong> (or 1800 × 560 for higher quality). 
  Images with different ratios may be cropped to fit.
</p>
            <input
              type="text"
              placeholder="Paste image URL..."
              value={leveling.rankCard?.backgroundImage || ""}
              onChange={(e) =>
                setLeveling((prev) => ({
                  ...prev,
                  rankCard: {
                    ...prev.rankCard,
                    backgroundImage: e.target.value,
                  },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: "12px" }}>
            <div style={miniLabel}>Upload from Device</div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => rankCardFileInputRef.current?.click()}
                style={secondaryButton}
              >
                Choose from Device
              </button>

              {leveling.rankCard?.backgroundImage ? (
                <button
                  type="button"
                  onClick={removeRankCardImage}
                  style={dangerButton}
                >
                  Remove Image
                </button>
              ) : null}
            </div>

            <p style={settingHelp}>
              Paste an image link or upload from your device. Leave it empty to use the default Kyro rank card background.
            </p>
          </div>

          {leveling.rankCard?.backgroundImage ? (
            <div style={rankCardPreviewWrap}>
              <div style={miniLabel}>Preview</div>
              <img
                src={leveling.rankCard.backgroundImage}
                alt="Rank card background preview"
                style={rankCardPreviewImage}
              />
            </div>
          ) : (
            <div style={rankCardDefaultNote}>
              <div style={miniLabel}>Default Card Active</div>
              <div style={settingHelp}>
                No custom background selected. Kyro will use the built-in default rank card design.
              </div>
            </div>
          )}
        </div>

        <div style={{ ...settingCard, marginTop: "22px" }}>
          <div style={settingTitle}>Disabled XP Channels</div>

<MultiSelectDropdown
  options={channels
  .filter((channel) => {
  const type = String(channel.type).toLowerCase();

  return (
    type === "0" ||
    type === "guild_text" ||
    type === "text"
  );
})
  .map((channel) => ({
    ...channel,
    id: channel.id || channel.channelId,
    name: channel.name || channel.label,
  }))}
  values={leveling.chat?.ignoredChannelIds || []}
  placeholder="Select channels"
onChange={(updatedValues) =>
  setLeveling({
    ...leveling,
    chat: {
      ...leveling.chat,
      ignoredChannelIds: updatedValues,
    },
  })
}
/>

          <p style={settingHelp}>
            Select channels where members should not gain XP.
          </p>
        </div>

<div style={{ ...settingCard, marginTop: "22px" }}>
  <div style={settingTitle}>Ignored Chat Roles</div>

  <MultiSelectDropdown
    options={roles}
    values={leveling.chat?.ignoredRoleIds || []}
    placeholder="Select roles"
    onChange={(updatedValues) =>
      setLeveling({
        ...leveling,
        chat: {
          ...leveling.chat,
          ignoredRoleIds: updatedValues,
        },
      })
    }
  />

  <p style={settingHelp}>
    Members with these roles will not gain chat XP.
  </p>
</div>

<div style={{ ...settingCard, marginTop: "22px" }}>
  <div style={settingTitle}>Ignored Voice Channels</div>

  <MultiSelectDropdown
    options={channels.filter((channel) => channel.type === 2)}
    values={leveling.voice?.ignoredChannelIds || []}
    placeholder="Select voice channels"
    onChange={(updatedValues) =>
      setLeveling({
        ...leveling,
        voice: {
          ...leveling.voice,
          ignoredChannelIds: updatedValues,
        },
      })
    }
  />

  <p style={settingHelp}>
    Members will not gain voice XP in these voice channels.
  </p>
</div>

<div style={{ ...settingCard, marginTop: "22px" }}>
  <div style={settingTitle}>Ignored Voice Roles</div>

  <MultiSelectDropdown
    options={roles}
    values={leveling.voice?.ignoredRoleIds || []}
    placeholder="Select roles"
    onChange={(updatedValues) =>
      setLeveling({
        ...leveling,
        voice: {
          ...leveling.voice,
          ignoredRoleIds: updatedValues,
        },
      })
    }
  />

  <p style={settingHelp}>
    Members with these roles will not gain voice XP.
  </p>
</div>

<div style={{ ...settingCard, marginTop: "22px" }}>
  <div style={settingTitle}>Voice XP Filters</div>

  <div style={{ display: "grid", gap: "14px" }}>
    <label style={checkboxRow}>
      <input
        type="checkbox"
        checked={leveling.voice?.requireOtherUsers ?? false}
        onChange={(e) =>
          setLeveling({
            ...leveling,
            voice: {
              ...leveling.voice,
              requireOtherUsers: e.target.checked,
            },
          })
        }
      />
      <span style={settingHelp}>
        Only give voice XP if another user is also in the channel.
      </span>
    </label>

    <label style={checkboxRow}>
      <input
        type="checkbox"
        checked={leveling.voice?.ignoreMutedUsers ?? false}
        onChange={(e) =>
          setLeveling({
            ...leveling,
            voice: {
              ...leveling.voice,
              ignoreMutedUsers: e.target.checked,
            },
          })
        }
      />
      <span style={settingHelp}>
        Ignore users who are muted.
      </span>
    </label>

    <label style={checkboxRow}>
      <input
        type="checkbox"
        checked={leveling.voice?.ignoreDeafenedUsers ?? false}
        onChange={(e) =>
          setLeveling({
            ...leveling,
            voice: {
              ...leveling.voice,
              ignoreDeafenedUsers: e.target.checked,
            },
          })
        }
      />
      <span style={settingHelp}>
        Ignore users who are deafened.
      </span>
    </label>
  </div>
</div>

        <div style={{ ...settingCard, marginTop: "22px" }}>
          <div style={settingTitle}>Role Rewards</div>

          <div style={{ marginBottom: "18px" }}>
            <div style={miniLabel}>Reward Mode</div>

            <div style={rewardModeWrap}>
              <button
                type="button"
                onClick={() =>
                  setLeveling({
                    ...leveling,
                    roleRewardMode: "stack",
                  })
                }
                style={{
                  ...rewardModeButton,
                  ...(leveling.roleRewardMode === "stack"
                    ? rewardModeButtonActive
                    : {}),
                }}
              >
                <div style={rewardModeTitle}>Stack Rewards</div>
                <div style={rewardModeText}>
                  Members keep all previously unlocked reward roles.
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setLeveling({
                    ...leveling,
                    roleRewardMode: "highest",
                  })
                }
                style={{
                  ...rewardModeButton,
                  ...(leveling.roleRewardMode === "highest"
                    ? rewardModeButtonActive
                    : {}),
                }}
              >
                <div style={rewardModeTitle}>Highest Reward Only</div>
                <div style={rewardModeText}>
                  Members only keep their highest unlocked reward role.
                </div>
              </button>
            </div>
          </div>

          {leveling.roleRewards.length === 0 ? (
            <div style={emptyRewardBox}>No role rewards added yet.</div>
          ) : (
            leveling.roleRewards.map((reward, index) => (
              <div key={index} style={rewardItemCard}>
                <div style={rewardRowTop}>
                  <div style={{ width: "140px", flexShrink: 0 }}>
                    <div style={miniLabel}>Level</div>
                    <input
                      type="number"
                      min="1"
                      value={reward.level}
                      onChange={(e) =>
                        updateRoleReward(index, "level", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="Level"
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={miniLabel}>Role</div>
                   <SearchableSelect
  options={roles.filter(
    (role) =>
      role.id === reward.roleId || !isRoleAlreadySelected(role.id, index)
  )}
  value={reward.roleId}
  placeholder="Select a role"
  searchPlaceholder="Search roles..."
  onChange={(value) => {
    if (value && isRoleAlreadySelected(value, index)) {
      return;
    }
    updateRoleReward(index, "roleId", value);
  }}
/>
                  </div>

                  <div style={{ display: "flex", alignItems: "end" }}>
                    <button
                      type="button"
                      onClick={() => removeRoleReward(index)}
                      style={dangerButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={addRoleReward}
            style={secondaryButton}
          >
            + Add Role Reward
          </button>

          <p style={settingHelp}>
            Add reward roles that members unlock at specific levels.
          </p>
        </div>

        {saveMessage && <div style={saveBox}>{saveMessage}</div>}

        {hasChanges && (
          <div style={stickySaveBar}>
            <div>
              <div style={stickySaveTitle}>You have unsaved changes</div>
              <div style={stickySaveText}>
                Save your leveling settings or discard the recent edits.
              </div>
            </div>

            <div style={stickySaveActions}>
              <button
                type="button"
                onClick={discardChanges}
                style={stickyDiscardButton}
                disabled={saving}
              >
                Discard
              </button>

              <button
                type="button"
                onClick={saveSettings}
                style={{
                  ...stickySaveButton,
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSelectDropdown({ options, values, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  const selectedOptions = options.filter((option) => values.includes(option.id));

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...searchableSelectButtonStyle,
          border: open
            ? "1px solid rgba(88,101,242,0.34)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color:
              selectedOptions.length > 0 ? "#fff" : "rgba(255,255,255,0.52)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left",
          }}
        >
          {selectedOptions.length > 0
            ? `${selectedOptions.length} channel(s) selected`
            : placeholder}
        </span>

        <ChevronDown
          size={17}
          style={{
            color: "rgba(255,255,255,0.72)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div style={{ ...searchableSelectMenuStyle, zIndex: 4000 }}>
          <div style={searchableSelectSearchWrapStyle}>
            <Search
              size={15}
              color="rgba(255,255,255,0.55)"
              style={{ flexShrink: 0 }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channels..."
              style={searchableSelectSearchInputStyle}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={searchableSelectClearButtonStyle}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const active = values.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      const updated = active
                        ? values.filter((id) => id !== option.id)
                        : [...values, option.id];

                      onChange(updated);
                    }}
                    style={searchableSelectOptionStyle(active)}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      # {option.name}
                    </span>

                    {active ? (
                      <CheckCircle2 size={15} color="#9db2ff" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div style={searchableSelectEmptyStyle}>No results found.</div>
            )}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div style={selectedTagsWrap}>
          {selectedOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange(values.filter((id) => id !== option.id))
              }
              style={selectedTagButton}
            >
              <span>{`#${option.name}`}</span>
              <span style={{ opacity: 0.8 }}>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PremiumLockedInputRow({
  label,
  description,
  placeholder = "Premium only",
  buttonText = "Upgrade to Premium",
  value = "",
  onUpgrade,
}) {
  return (
    <div>
      <div style={settingTitleInline}>
        {label}{" "}
        <span style={premiumBadge}>
          <Crown size={14} strokeWidth={2} />
          Premium
        </span>
      </div>

      <input
        type="text"
        value={value}
        readOnly
        disabled
        placeholder={placeholder}
        style={{
          ...inputStyle,
          opacity: 0.65,
          cursor: "not-allowed",
        }}
      />

      <div style={premiumUpgradeRow}>
        <p style={{ ...settingHelp, margin: 0 }}>{description}</p>

        <button
          type="button"
          style={premiumUpgradeButton}
          onClick={() => {
            if (onUpgrade) {
              onUpgrade();
            } else {
              window.dispatchEvent(new Event("kyro:navigate-premium"));
            }
          }}
        >
          <Crown size={14} strokeWidth={2} />
          {buttonText}
        </button>
      </div>
    </div>
  );
}

function PremiumLockedField({
  label,
  description,
  placeholder = "Premium only",
  value = "",
  buttonText = "Upgrade to Premium",
  onUpgrade,
}) {
  return (
    <div style={{ ...settingCard, marginTop: "22px", opacity: 0.8 }}>
      <div style={settingTitle}>
        {label}{" "}
        <span style={premiumBadge}>
          <Crown size={14} strokeWidth={2} />
          Premium
        </span>
      </div>

      <input
        type="text"
        value={value}
        readOnly
        disabled
        placeholder={placeholder}
        style={{
          ...inputStyle,
          opacity: 0.65,
          cursor: "not-allowed",
        }}
      />

      <div style={premiumUpgradeRow}>
        <p style={{ ...settingHelp, margin: 0 }}>{description}</p>

        <button
          type="button"
          style={premiumUpgradeButton}
          onClick={() => {
            if (onUpgrade) {
              onUpgrade();
            } else {
             window.dispatchEvent(new Event("kyro:navigate-premium"));
            }
          }}
        >
          <Crown size={14} strokeWidth={2} />
          {buttonText}
        </button>
      </div>
    </div>
  );
}

const authButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: "10px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(59,130,246,0.35)",
};

const sectionTitle = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "700",
  textAlign: "center",
};

const sectionText = {
  marginTop: "10px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "15px",
  lineHeight: "1.6",
  textAlign: "center",
};

const pageCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "22px",
  padding: "28px",
  backdropFilter: "blur(10px)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const pageHeaderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "24px",
};

const settingsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "22px",
};

const settingCard = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "18px",
  padding: "18px",
};

const settingTitle = {
  fontSize: "16px",
  fontWeight: "700",
  marginBottom: "12px",
};

const settingHelp = {
  margin: "10px 0 0 0",
  color: "rgba(255,255,255,0.68)",
  fontSize: "13px",
  lineHeight: "1.5",
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",
  minHeight: "110px",
  resize: "vertical",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  lineHeight: "1.5",
  boxSizing: "border-box",
};

const toggleRow = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const toggleButton = {
  width: "56px",
  height: "30px",
  borderRadius: "999px",
  border: "none",
  display: "flex",
  alignItems: "center",
  padding: "4px",
  cursor: "pointer",
  transition: "0.2s",
};

const toggleCircle = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#ffffff",
};

const secondaryButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

const dangerButton = {
  border: "none",
  background: "rgba(239,68,68,0.18)",
  color: "#fca5a5",
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
};

const saveBox = {
  marginTop: "18px",
  padding: "14px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: "14px",
  fontWeight: "600",
};

const dropdownWrap = {
  position: "relative",
  width: "100%",
};

const dropdownButton = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

const dropdownArrow = {
  fontSize: "11px",
  opacity: 0.8,
};

const dropdownMenu = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#131c2e",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "8px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  zIndex: 100,
  maxHeight: "260px",
  overflowY: "auto",
};

const dropdownItem = (selected, disabled = false) => ({
  width: "100%",
  textAlign: "left",
  background: selected
    ? "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(124,58,237,0.35))"
    : "transparent",
  color: disabled ? "rgba(255,255,255,0.35)" : "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px 12px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "14px",
  marginBottom: "4px",
  opacity: disabled ? 0.7 : 1,
});

const selectedTagsWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
};

const selectedTag = {
  borderRadius: "999px",
  color: "white",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "600",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  border: "1px solid rgba(124,58,237,0.8)",
};

const selectedTagButton = {
  border: "1px solid rgba(124,58,237,0.8)",
  borderRadius: "999px",
  color: "white",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "600",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
};

const searchableSelectButtonStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#fff",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s ease",
};

const searchableSelectMenuStyle = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  right: 0,
  borderRadius: 18,
  border: "1px solid rgba(88,101,242,0.18)",
  background:
    "linear-gradient(180deg, rgba(10,14,24,0.985), rgba(8,12,20,0.985))",
  boxShadow:
    "0 24px 60px rgba(0,0,0,0.48), 0 0 0 1px rgba(255,255,255,0.02) inset",
  overflow: "hidden",
  backdropFilter: "blur(14px)",
  padding: 12,
};

const searchableSelectSearchWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  height: 46,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  padding: "0 12px",
  marginBottom: 10,
  boxSizing: "border-box",
  overflow: "hidden",
};

const searchableSelectSearchInputStyle = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#fff",
  fontSize: 14,
  lineHeight: "1.2",
  padding: 0,
  margin: 0,
};

const searchableSelectClearButtonStyle = {
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.55)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
};

const searchableSelectOptionStyle = (active) => ({
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: active
    ? "1px solid rgba(88,101,242,0.30)"
    : "1px solid transparent",
  background: active
    ? "rgba(88,101,242,0.16)"
    : "rgba(255,255,255,0.02)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
  marginBottom: 6,
  fontSize: 14,
  transition: "all 0.18s ease",
});

const searchableSelectEmptyStyle = {
  padding: "12px 10px 4px",
  color: "rgba(255,255,255,0.55)",
  fontSize: 13,
};

const rewardModeWrap = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const rewardModeButton = {
  flex: 1,
  minWidth: "240px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const rewardModeButtonActive = {
  border: "1px solid rgba(88, 101, 242, 0.9)",
  boxShadow: "0 0 0 1px rgba(88, 101, 242, 0.25)",
  background: "rgba(88, 101, 242, 0.08)",
};

const rewardModeTitle = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#FFFFFF",
  marginBottom: "6px",
};

const rewardModeText = {
  fontSize: "13px",
  color: "rgba(255,255,255,0.65)",
  lineHeight: 1.5,
};

const emptyRewardBox = {
  marginBottom: "14px",
  borderRadius: "14px",
  border: "1px dashed rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
  padding: "18px",
  color: "rgba(255,255,255,0.6)",
  fontSize: "14px",
};

const rewardItemCard = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "14px",
};

const rewardRowTop = {
  display: "flex",
  gap: "14px",
  alignItems: "stretch",
  flexWrap: "wrap",
};

const miniLabel = {
  fontSize: "12px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.65)",
  marginBottom: "8px",
};

const stickySaveBar = {
  position: "sticky",
  bottom: "18px",
  marginTop: "22px",
  padding: "16px 18px",
  borderRadius: "18px",
  background: "rgba(8, 15, 30, 0.94)",
  border: "1px solid rgba(88, 101, 242, 0.28)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  backdropFilter: "blur(10px)",
  zIndex: 30,
};

const stickySaveTitle = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
  marginBottom: "4px",
};

const stickySaveText = {
  fontSize: "13px",
  color: "rgba(255,255,255,0.68)",
  lineHeight: "1.5",
};

const stickySaveActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const stickyDiscardButton = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

const stickySaveButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(59,130,246,0.35)",
};

const variableChipsWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "10px",
};

const variableChip = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
};

const previewCard = {
  marginTop: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.025)",
  padding: "16px",
};

const previewHeader = {
  fontSize: "13px",
  fontWeight: "700",
  color: "rgba(255,255,255,0.7)",
  marginBottom: "12px",
};
const previewOuter = {
  background: "transparent",
};

const previewEmbed = {
  background: "#2b2d31",
  borderRadius: "4px",
  padding: "12px 14px 14px 12px",
  maxWidth: "520px",
};

const previewAuthorRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "10px",
};

const previewBotAvatar = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "700",
};

const previewAuthorText = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const previewAuthorName = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#ffffff",
};

const previewBotTag = {
  fontSize: "10px",
  fontWeight: "700",
  color: "#ffffff",
  background: "#5865F2",
  borderRadius: "4px",
  padding: "2px 4px",
};

const previewTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#ffffff",
  marginBottom: "6px",
};

const previewDescription = {
  fontSize: "14px",
  lineHeight: "1.45",
  color: "#dbdee1",
};

const previewBanner = {
  width: "100%",
  maxHeight: "220px",
  objectFit: "contain",
  borderRadius: "4px",
  marginTop: "12px",
};

const previewFooterRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "10px",
};

const previewFooterIcon = {
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
};

const previewFooter = {
  fontSize: "12px",
  color: "#b5bac1",
};

const colorRow = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const colorInput = {
  width: "52px",
  height: "44px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  background: "transparent",
  padding: "4px",
  cursor: "pointer",
};

const settingTitleInline = {
  fontSize: "14px",
  fontWeight: "700",
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const premiumBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "rgba(167,139,250,0.12)",
  border: "1px solid rgba(167,139,250,0.25)",
  color: "#a78bfa",
  fontSize: "12px",
  fontWeight: "600",
  boxShadow: "0 0 12px rgba(167,139,250,0.15)",
};

const premiumUpgradeRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "12px",
  flexWrap: "wrap",
};

const premiumUpgradeButton = {
  border: "1px solid rgba(167,139,250,0.28)",
  background: "rgba(167,139,250,0.12)",
  color: "#c4b5fd",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 0 12px rgba(167,139,250,0.12)",
};

const rankCardPreviewWrap = {
  marginTop: "16px",
};

const rankCardPreviewImage = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "220px",
  objectFit: "cover",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  display: "block",
};

const rankCardDefaultNote = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px dashed rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
};

export default LevelingPage;