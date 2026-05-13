import { useEffect, useState } from "react";
import API_BASE from "../config/api";
export default function Leveling({ guildId, token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  const [config, setConfig] = useState({
    enabled: true,
    chatXpRate: 10,
    voiceXpRate: 5,
    disabledChannels: [],
    levelUpChannelId: "",
    levelUpMessage: "",
    roleRewards: [],
  });

  useEffect(() => {
    if (!guildId) return;

    const fetchLevelingData = async () => {
      setLoading(true);
      setSaveMessage("");

      try {
        const [levelingRes, channelsRes, rolesRes] = await Promise.all([
          fetch(`${API_BASE}/api/guilds/${guildId}/leveling`, {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {},
          }),
          fetch(`${API_BASE}/api/guilds/${guildId}/channels`),
          fetch(`${API_BASE}/api/guilds/${guildId}/roles`),
        ]);

        const levelingData = await levelingRes.json();
        const channelsData = await channelsRes.json();
        const rolesData = await rolesRes.json();

        if (levelingData.success && levelingData.leveling) {
          setConfig({
            enabled: levelingData.leveling.enabled ?? true,
            chatXpRate: levelingData.leveling.chatXpRate ?? 10,
            voiceXpRate: levelingData.leveling.voiceXpRate ?? 5,
            disabledChannels: levelingData.leveling.disabledChannels ?? [],
            levelUpChannelId: levelingData.leveling.levelUpChannelId ?? "",
            levelUpMessage: levelingData.leveling.levelUpMessage ?? "",
            roleRewards: levelingData.leveling.roleRewards ?? [],
          });
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
      }
    };

    fetchLevelingData();
  }, [guildId, token]);

  const saveSettings = async () => {
    if (!guildId) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/leveling`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (data.success) {
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
    setConfig({
      ...config,
      roleRewards: [...config.roleRewards, { level: 1, roleId: "" }],
    });
  };

  const updateRoleReward = (index, key, value) => {
    const updated = [...config.roleRewards];
    updated[index] = {
      ...updated[index],
      [key]: key === "level" ? Number(value) : value,
    };

    setConfig({
      ...config,
      roleRewards: updated,
    });
  };

  const removeRoleReward = (index) => {
    setConfig({
      ...config,
      roleRewards: config.roleRewards.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div style={pageCard}>
        <h2 style={titleStyle}>Leveling Settings</h2>
        <p style={helpText}>Loading leveling settings...</p>
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div style={pageCard}>
        <div style={headerRow}>
          <div>
            <h2 style={titleStyle}>Leveling Settings</h2>
            <p style={subTitle}>Manage XP, rewards, and level-up behavior.</p>
          </div>

          <button
            style={{
              ...primaryButton,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div style={grid}>
          <div style={card}>
            <div style={sectionTitle}>Enable Leveling</div>

            <div style={toggleRow}>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    enabled: !config.enabled,
                  })
                }
                style={{
                  ...toggleButton,
                  justifyContent: config.enabled ? "flex-end" : "flex-start",
                  background: config.enabled
                    ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                <div style={toggleCircle} />
              </button>

              <span style={helpText}>
                Turn the leveling system on or off for this server.
              </span>
            </div>
          </div>

          <div style={card}>
            <div style={sectionTitle}>Chat XP Rate</div>
            <input
              type="number"
              value={config.chatXpRate}
              onChange={(e) =>
                setConfig({
                  ...config,
                  chatXpRate: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
            <p style={helpText}>XP awarded per eligible message.</p>
          </div>

          <div style={card}>
            <div style={sectionTitle}>Voice XP Rate</div>
            <input
              type="number"
              value={config.voiceXpRate}
              onChange={(e) =>
                setConfig({
                  ...config,
                  voiceXpRate: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
            <p style={helpText}>XP awarded per minute in voice.</p>
          </div>

          <div style={card}>
            <div style={sectionTitle}>Level-Up Channel</div>
            <select
              value={config.levelUpChannelId}
              onChange={(e) =>
                setConfig({
                  ...config,
                  levelUpChannelId: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">Select a channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
            <p style={helpText}>
              Channel where level-up messages will be sent.
            </p>
          </div>
        </div>

        <div style={{ ...card, marginTop: 22 }}>
          <div style={sectionTitle}>Level-Up Message</div>
          <textarea
            value={config.levelUpMessage}
            onChange={(e) =>
              setConfig({
                ...config,
                levelUpMessage: e.target.value,
              })
            }
            placeholder="Enter custom level-up message..."
            style={textareaStyle}
          />
          <p style={helpText}>
            Later we can add variables and live preview here.
          </p>
        </div>

        <div style={{ ...card, marginTop: 22, opacity: 0.8 }}>
          <div style={sectionTitle}>
            Level-Up Banner <span style={{ color: "#a78bfa" }}>• Premium</span>
          </div>
          <input
            type="text"
            disabled
            placeholder="Premium feature — banner URL will go here"
            style={inputStyle}
          />
          <p style={helpText}>
            Premium servers will be able to set a custom banner for level-up messages.
          </p>
        </div>

        <div style={{ ...card, marginTop: 22 }}>
          <div style={sectionTitle}>Disabled XP Channels</div>

          <div style={multiSelectWrap}>
            {channels.map((channel) => {
              const selected = config.disabledChannels.includes(channel.id);

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    const updated = selected
                      ? config.disabledChannels.filter((id) => id !== channel.id)
                      : [...config.disabledChannels, channel.id];

                    setConfig({
                      ...config,
                      disabledChannels: updated,
                    });
                  }}
                  style={{
                    ...tagButton,
                    background: selected
                      ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
                      : "rgba(255,255,255,0.05)",
                    border: selected
                      ? "1px solid rgba(124,58,237,0.8)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  #{channel.name}
                </button>
              );
            })}
          </div>

          <p style={helpText}>
            Select channels where members should not gain XP.
          </p>
        </div>

        <div style={{ ...card, marginTop: 22 }}>
          <div style={sectionTitle}>Role Rewards</div>

          {config.roleRewards.map((reward, index) => (
            <div key={index} style={rewardRow}>
              <input
                type="number"
                min="1"
                value={reward.level}
                onChange={(e) =>
                  updateRoleReward(index, "level", e.target.value)
                }
                style={{ ...inputStyle, maxWidth: 120 }}
                placeholder="Level"
              />

              <select
                value={reward.roleId}
                onChange={(e) =>
                  updateRoleReward(index, "roleId", e.target.value)
                }
                style={inputStyle}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => removeRoleReward(index)}
                style={dangerButton}
              >
                Remove
              </button>
            </div>
          ))}

          <button type="button" onClick={addRoleReward} style={secondaryButton}>
            + Add Role Reward
          </button>

          <p style={helpText}>
            Add reward roles that members unlock at specific levels.
          </p>
        </div>

        {saveMessage && <div style={saveBox}>{saveMessage}</div>}
      </div>
    </div>
  );
}

const wrapper = {
  maxWidth: "980px",
  margin: "0 auto",
  color: "white",
  fontFamily: "Arial, sans-serif",
};

const pageCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "22px",
  padding: "28px",
  backdropFilter: "blur(10px)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "24px",
};

const titleStyle = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "700",
  textAlign: "left",
};

const subTitle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "15px",
  lineHeight: "1.6",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "22px",
};

const card = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "18px",
  padding: "18px",
};

const sectionTitle = {
  fontSize: "16px",
  fontWeight: "700",
  marginBottom: "12px",
};

const helpText = {
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

const primaryButton = {
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

const toggleRow = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
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

const multiSelectWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const tagButton = {
  borderRadius: "999px",
  color: "white",
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const rewardRow = {
  display: "grid",
  gridTemplateColumns: "120px 1fr auto",
  gap: "12px",
  marginBottom: "12px",
  alignItems: "center",
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