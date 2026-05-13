import { useEffect, useMemo, useRef, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import PageLoader from "../components/PageLoader";
import API_BASE from "../config/api";

const LOG_DEFINITIONS = [
  { key: "memberJoin", label: "Member Joined" },
  { key: "memberLeave", label: "Member Left" },

  { key: "messageDelete", label: "Message Deleted" },
  { key: "messageEdit", label: "Message Edited" },

  { key: "memberBan", label: "Member Banned" },
  { key: "memberUnban", label: "Member Unbanned" },
  { key: "memberKick", label: "Member Kicked" },
  { key: "timeout", label: "Timeout (Given / Removed)" },

  { key: "channelCreate", label: "Channel Created" },
  { key: "channelDelete", label: "Channel Deleted" },
  { key: "channelUpdate", label: "Channel Updated" },

  { key: "roleCreate", label: "Role Created" },
  { key: "roleDelete", label: "Role Deleted" },
  { key: "roleUpdate", label: "Role Updated" },
];

const DEFAULT_LOGS_STATE = {
  enabled: false,

  memberJoin: { enabled: false, channelId: null, color: "#57F287" },
  memberLeave: { enabled: false, channelId: null, color: "#ED4245" },

  messageDelete: { enabled: false, channelId: null, color: "#ED4245" },
  messageEdit: { enabled: false, channelId: null, color: "#FEE75C" },

  memberBan: { enabled: false, channelId: null, color: "#ED4245" },
  memberUnban: { enabled: false, channelId: null, color: "#57F287" },
  memberKick: { enabled: false, channelId: null, color: "#FAA61A" },
  timeout: { enabled: false, channelId: null, color: "#5865F2" },

  channelCreate: { enabled: false, channelId: null, color: "#57F287" },
  channelDelete: { enabled: false, channelId: null, color: "#ED4245" },
  channelUpdate: { enabled: false, channelId: null, color: "#FEE75C" },

  roleCreate: { enabled: false, channelId: null, color: "#57F287" },
  roleDelete: { enabled: false, channelId: null, color: "#ED4245" },
  roleUpdate: { enabled: false, channelId: null, color: "#FEE75C" },
};

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: "54px",
        height: "30px",
        borderRadius: "999px",
        border: checked
          ? "1px solid rgba(88,101,242,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        background: checked
          ? "linear-gradient(135deg, #5865F2, #7c3aed)"
          : "rgba(255,255,255,0.08)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        boxShadow: checked
          ? "0 6px 18px rgba(88,101,242,0.35)"
          : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: checked ? "27px" : "3px",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: "#ffffff",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

export default function LogsPage({ selectedGuild }) {
  const [logsConfig, setLogsConfig] = useState(DEFAULT_LOGS_STATE);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveMessageType, setSaveMessageType] = useState("success");
  const [hasChanges, setHasChanges] = useState(false);
  const hideMessageTimeoutRef = useRef(null);

  useEffect(() => {
    if (!selectedGuild?.id) return;

    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setSaveMessage("");

        const [logsRes, channelsRes] = await Promise.all([
          fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs`),
          fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`),
        ]);

        const logsData = await logsRes.json();
        const channelsData = await channelsRes.json();

        if (!ignore) {
          setLogsConfig({
            ...DEFAULT_LOGS_STATE,
            ...(logsData.logs || {}),
          });

          setChannels(
            channelsData.success && Array.isArray(channelsData.channels)
              ? channelsData.channels
              : []
          );

          setHasChanges(false);
        }
      } catch (error) {
        console.error("Failed to load logs page:", error);
        if (!ignore) {
          setSaveMessageType("error");
          setSaveMessage("Failed to load logs settings.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [selectedGuild]);

  useEffect(() => {
    return () => {
      if (hideMessageTimeoutRef.current) {
        clearTimeout(hideMessageTimeoutRef.current);
      }
    };
  }, []);

  const activeLogsCount = useMemo(() => {
    return LOG_DEFINITIONS.filter((log) => logsConfig?.[log.key]?.enabled).length;
  }, [logsConfig]);

  function showTemporaryMessage(message, type = "success") {
    setSaveMessageType(type);
    setSaveMessage(message);

    if (hideMessageTimeoutRef.current) {
      clearTimeout(hideMessageTimeoutRef.current);
    }

    hideMessageTimeoutRef.current = setTimeout(() => {
      setSaveMessage("");
    }, 3000);
  }

  function updateMainEnabled(value) {
    setLogsConfig((prev) => ({
      ...prev,
      enabled: value,
    }));
    setHasChanges(true);
  }

  function updateLogField(logKey, field, value) {
    setLogsConfig((prev) => ({
      ...prev,
      [logKey]: {
        ...prev[logKey],
        [field]: value,
      },
    }));
    setHasChanges(true);
  }

  async function handleSave() {
    if (!selectedGuild?.id) return;

    try {
      setSaving(true);
      setSaveMessage("");

      const res = await fetch(
        `${API_BASE}/api/guilds/${selectedGuild.id}/logs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logsConfig),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save logs settings");
      }

      setLogsConfig({
        ...DEFAULT_LOGS_STATE,
        ...(data.logs || {}),
      });
      setHasChanges(false);
      showTemporaryMessage("Logs settings saved successfully.", "success");
    } catch (error) {
      console.error("Failed to save logs settings:", error);
      showTemporaryMessage(
        error.message || "Failed to save logs settings.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!selectedGuild) {
    return (
      <div style={emptyCard}>
        Select a server first to manage logs settings.
      </div>
    );
  }

if (loading) {
  return (
    <PageLoader
      title="Loading logs..."
      subtitle="Preparing moderation, message, member, channel, and role log settings."
    />
  );
}

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div style={topCard}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={topCardTitle}>Logs</div>
          <div style={topCardText}>
            Enable logs for this server, then choose a channel and embed color
            for each log type.
          </div>

          {!logsConfig.enabled && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Logs are currently disabled.
            </div>
          )}

          {saveMessage ? (
            <div
              style={{
                ...topStatusMessage,
                background:
                  saveMessageType === "error"
                    ? "rgba(237, 66, 69, 0.12)"
                    : "rgba(87, 242, 135, 0.12)",
                border:
                  saveMessageType === "error"
                    ? "1px solid rgba(237, 66, 69, 0.22)"
                    : "1px solid rgba(87, 242, 135, 0.22)",
                color:
                  saveMessageType === "error"
                    ? "#ff9b9d"
                    : "#8ff0b1",
              }}
            >
              {saveMessage}
            </div>
          ) : null}
        </div>

        <div style={topControls}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              ...topSaveButton,
              opacity: saving || !hasChanges ? 0.65 : 1,
              cursor: saving || !hasChanges ? "not-allowed" : "pointer",
              boxShadow: hasChanges
                ? "0 10px 30px rgba(88,101,242,0.45)"
                : "0 6px 12px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
            }}
          >
            {saving ? "Saving..." : "Save settings"}
          </button>

          <div
            style={{
              ...summaryBadge,
              background:
                activeLogsCount > 0
                  ? "rgba(88,101,242,0.14)"
                  : "rgba(255,255,255,0.05)",
              border:
                activeLogsCount > 0
                  ? "1px solid rgba(88,101,242,0.24)"
                  : "1px solid rgba(255,255,255,0.08)",
              color:
                activeLogsCount > 0
                  ? "#b8c0ff"
                  : "rgba(255,255,255,0.5)",
            }}
          >
            {activeLogsCount} active
          </div>

          <ToggleSwitch
            checked={logsConfig.enabled}
            onChange={updateMainEnabled}
          />
        </div>
      </div>

      <div
        style={{
          ...gridStyle,
          opacity: logsConfig.enabled ? 1 : 0.6,
          transition: "opacity 0.2s ease",
        }}
      >
        {LOG_DEFINITIONS.map((log) => {
          const current = logsConfig[log.key] || {
            enabled: false,
            channelId: null,
            color: "#5865F2",
          };

          const disabledBySystem = !logsConfig.enabled;

          return (
<div
  key={log.key}
  style={logCard}
  onMouseEnter={(e) => {
    e.currentTarget.style.border = "1px solid rgba(88,101,242,0.35)";
    e.currentTarget.style.boxShadow =
      "0 12px 40px rgba(88,101,242,0.15)";
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.zIndex = "50";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.05)";
    e.currentTarget.style.boxShadow =
      "0 10px 28px rgba(0,0,0,0.16)";
    e.currentTarget.style.transform = "translateY(0px)";

    if (!e.currentTarget.contains(document.activeElement)) {
      e.currentTarget.style.zIndex = "1";
    }
  }}
  onFocusCapture={(e) => {
    e.currentTarget.style.zIndex = "50";
    e.currentTarget.style.border = "1px solid rgba(88,101,242,0.35)";
  }}
  onBlurCapture={(e) => {
    const nextFocused = e.relatedTarget;

    if (!nextFocused || !e.currentTarget.contains(nextFocused)) {
      e.currentTarget.style.zIndex = "1";
      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.05)";
      e.currentTarget.style.boxShadow =
        "0 10px 28px rgba(0,0,0,0.16)";
      e.currentTarget.style.transform = "translateY(0px)";
    }
  }}
>
              <div style={cardHeader}>
                <div style={cardTitle}>{log.label}</div>
                <ToggleSwitch
                  checked={current.enabled}
                  onChange={(value) => updateLogField(log.key, "enabled", value)}
                  disabled={disabledBySystem}
                />
              </div>

              <div style={fieldLabel}>CHANNEL</div>
              <SearchableSelect
                options={channels.filter((channel) => channel.type === 0 || channel.type === 5)}
                value={current.channelId || ""}
                onChange={(value) =>
                  updateLogField(log.key, "channelId", value || null)
                }
                placeholder="Select channel..."
                searchPlaceholder="Search channels..."
                formatLabel={(item) => `# ${item.name}`}
                zIndex={5000}
              />

              <div style={{ height: "14px" }} />

              <div style={fieldLabel}>COLOR</div>
              <div style={colorFieldWrap}>
                <input
                  type="color"
                  value={current.color || "#5865F2"}
                  onChange={(e) => updateLogField(log.key, "color", e.target.value)}
                  disabled={disabledBySystem}
                  style={{
                    ...colorPickerStyle,
                    opacity: disabledBySystem ? 0.55 : 1,
                    cursor: disabledBySystem ? "not-allowed" : "pointer",
                  }}
                />

                <input
                  type="text"
                  value={current.color || "#5865F2"}
                  onChange={(e) => updateLogField(log.key, "color", e.target.value)}
                  disabled={disabledBySystem}
                  style={{
                    ...colorHexInputStyle,
                    opacity: disabledBySystem ? 0.55 : 1,
                    cursor: disabledBySystem ? "not-allowed" : "text",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptyCard = {
  padding: "28px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "rgba(255,255,255,0.72)",
  fontSize: "14px",
};

const topCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  padding: "22px 24px",
  borderRadius: "24px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))",
  border: "1px solid rgba(88,101,242,0.16)",
  boxShadow:
    "0 16px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)",
  backdropFilter: "blur(12px)",
};

const topCardTitle = {
  fontSize: "24px",
  fontWeight: "800",
  color: "#ffffff",
};

const topCardText = {
  marginTop: "8px",
  fontSize: "14px",
  lineHeight: "1.7",
  color: "rgba(255,255,255,0.68)",
  maxWidth: "720px",
};

const topStatusMessage = {
  marginTop: "14px",
  padding: "10px 12px",
  borderRadius: "12px",
  fontSize: "13px",
  fontWeight: "600",
};

const topControls = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexShrink: 0,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const topSaveButton = {
  border: "none",
  background: "linear-gradient(135deg, #5865F2, #7c3aed)",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: "700",
};

const summaryBadge = {
  padding: "10px 14px",
  borderRadius: "12px",
  fontSize: "13px",
  fontWeight: "700",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "22px",
};

const logCard = {
  padding: "22px",
  borderRadius: "22px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.05)",
  boxShadow:
    "0 10px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.03)",
  transition: "all 0.25s ease",
  backdropFilter: "blur(12px)",
  overflow: "visible",
  position: "relative",
  zIndex: 1,
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "18px",
};

const cardTitle = {
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: "1.35",
  color: "#ffffff",
};

const fieldLabel = {
  marginBottom: "8px",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.5)",
};

const colorFieldWrap = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const colorPickerStyle = {
  width: "52px",
  height: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#0b1020",
  padding: "4px",
  outline: "none",
  boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.4)",
  flexShrink: 0,
};

const colorHexInputStyle = {
  width: "100%",
  height: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#ffffff",
  padding: "0 14px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};