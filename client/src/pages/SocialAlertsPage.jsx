import { useEffect, useMemo, useRef, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import PageLoader from "../components/PageLoader";
import {
  Bell,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Radio,
  Video,
  Music4,
  Sparkles,
  Check,
  X,
  Hash,
  Users,
  Send,
  RefreshCw,
} from "lucide-react";

import API_BASE from "../config/api";

const FREE_SOCIAL_LIMITS = {
  youtube: 1,
  twitch: 1,
  tiktok: 1,
  kick: 1,
};

function pageShell() {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  };
}

function sectionCard() {
  return {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(59,130,246,0.14)",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  };
}

function inputStyle() {
  return {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    padding: "12px 14px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
  };
}

function textareaStyle() {
  return {
    ...inputStyle(),
    minHeight: "96px",
    resize: "vertical",
    fontFamily: "inherit",
  };
}

function labelStyle() {
  return {
    display: "block",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.86)",
  };
}

function primaryButton(disabled = false) {
  return {
    border: "none",
    background: disabled
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(135deg, #3b82f6, #7c3aed)",
    color: "white",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 8px 20px rgba(59,130,246,0.28)",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };
}

function secondaryButton() {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };
}

function cancelButton() {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };
}

function dangerButton() {
  return {
    border: "1px solid rgba(239,68,68,0.22)",
    background: "rgba(239,68,68,0.08)",
    color: "#fca5a5",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };
}

function ghostButton() {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "white",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };
}

function smallToggleButton(active) {
  return {
    border: active
      ? "1px solid rgba(96,165,250,0.45)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "rgba(59,130,246,0.16)"
      : "rgba(255,255,255,0.04)",
    color: "white",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    minWidth: "96px",
  };
}

function platformAccent(platform) {
  switch (platform) {
    case "youtube":
      return {
        bg: "rgba(255,0,0,0.12)",
        border: "rgba(255,0,0,0.22)",
        text: "#fca5a5",
        label: "YouTube",
      };
    case "kick":
      return {
        bg: "rgba(83,252,24,0.12)",
        border: "rgba(83,252,24,0.24)",
        text: "#86efac",
        label: "Kick",
      };
    case "twitch":
      return {
        bg: "rgba(145,70,255,0.12)",
        border: "rgba(145,70,255,0.24)",
        text: "#c4b5fd",
        label: "Twitch",
      };
    case "tiktok":
      return {
        bg: "rgba(255,255,255,0.08)",
        border: "rgba(255,255,255,0.12)",
        text: "#e5e7eb",
        label: "TikTok",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.06)",
        border: "rgba(255,255,255,0.1)",
        text: "#e5e7eb",
        label: "Unknown",
      };
  }
}

function getDefaultTemplates(platform) {
  switch (platform) {
    case "youtube":
      return {
        messageContent: "{role} {creator} just posted a new YouTube alert. {url}",
        embedDescription: "{creator} has a new YouTube update for your server.",
      };
    case "kick":
      return {
        messageContent: "{role} {creator} is now live on Kick. {url}",
        embedDescription:
          "{creator} just went live on Kick. Tap the button and join the stream.",
      };
    case "twitch":
      return {
        messageContent: "{role} {creator} is now live on Twitch. {url}",
        embedDescription:
          "{creator} is live on Twitch right now. Don’t miss the stream.",
      };
    case "tiktok":
      return {
        messageContent: "{role} {creator} posted new TikTok content. {url}",
        embedDescription:
          "{creator} just uploaded fresh TikTok content for your community.",
      };
    default:
      return {
        messageContent: "{role} {creator} has a new update. {url}",
        embedDescription: "{creator} posted a new social update.",
      };
  }
}

function normalizeAlertForUI(alert = {}) {
  const defaults = getDefaultTemplates(alert.platform || "youtube");
  const pingRoleIds = Array.isArray(alert.pingRoleIds)
    ? alert.pingRoleIds.filter(Boolean).map(String)
    : alert.pingRoleId
    ? [String(alert.pingRoleId)]
    : [];

  return {
    id:
      alert.id || `social_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    platform: alert.platform || "youtube",
    creatorName: alert.creatorName || "",
    creatorUrl: alert.creatorUrl || "",
    creatorId: alert.creatorId || "",
    channelId: alert.channelId || "",
    pingRoleId: alert.pingRoleId || pingRoleIds[0] || "",
    pingRoleIds,
    enabled: alert.enabled ?? true,
    alertUploads: alert.alertUploads ?? true,
    alertLives: alert.alertLives ?? true,
    alertPosts: alert.alertPosts ?? false,
    messageContent: alert.messageContent || defaults.messageContent,
    embedTitle: alert.embedTitle || "",
    embedDescription: alert.embedDescription || defaults.embedDescription,
    lastVideoId: alert.lastVideoId || null,
    lastLiveVideoId: alert.lastLiveVideoId || null,
    isLive: alert.isLive ?? false,
    lastLiveAt: alert.lastLiveAt || null,
    lastPostId: alert.lastPostId || null,
    profileImageUrl: alert.profileImageUrl || null,
    uploadsPlaylistId: alert.uploadsPlaylistId || null,
  };
}

function makeEmptyAlert() {
  return normalizeAlertForUI({
    platform: "youtube",
    creatorName: "",
    creatorUrl: "",
    creatorId: "",
    channelId: "",
    pingRoleId: "",
    pingRoleIds: [],
    enabled: true,
    alertUploads: true,
    alertLives: true,
    alertPosts: false,
  });
}
function getSocialAlertsCollapsedKey(guildId) {
  return `kyro_social_alerts_collapsed_${guildId || "global"}`;
}
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "14px 16px",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>
          {label}
        </div>
        {description ? (
          <div
            style={{
              marginTop: "4px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      <button
        onClick={onChange}
        type="button"
        style={{
          width: "56px",
          height: "30px",
          borderRadius: "999px",
          border: checked
            ? "1px solid rgba(96,165,250,0.35)"
            : "1px solid rgba(255,255,255,0.08)",
          background: checked
            ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
            : "rgba(255,255,255,0.08)",
          position: "relative",
          cursor: "pointer",
          transition: "0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "29px" : "3px",
            width: "22px",
            height: "22px",
            borderRadius: "999px",
            background: "white",
            transition: "0.2s",
          }}
        />
      </button>
    </div>
  );
}

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onClose]);
}


function SingleSelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Select option",
  icon: Icon,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOutsideClose(wrapRef, () => setOpen(false));

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...inputStyle(),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
          minHeight: "44px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {Icon ? <Icon size={15} style={{ opacity: 0.7, flexShrink: 0 }} /> : null}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: selected ? "white" : "rgba(255,255,255,0.48)",
            }}
          >
            {selected ? selected.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          style={{
            opacity: 0.7,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "100%",
            maxHeight: "240px",
            overflowY: "auto",
            background: "#081225",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            padding: "6px",
            zIndex: 9990,
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: "13px",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              No options available
            </div>
          ) : (
            options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    background: active ? "rgba(59,130,246,0.16)" : "transparent",
                    color: "white",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontWeight: active ? "700" : "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                  }}
                >
                  <span>{option.label}</span>
                  {active && <Check size={14} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MultiRoleDropdown({
  selectedValues,
  onChange,
  options,
  placeholder = "Select ping roles",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOutsideClose(wrapRef, () => setOpen(false));

  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  const toggleValue = (roleId) => {
    if (selectedValues.includes(roleId)) {
      onChange(selectedValues.filter((id) => id !== roleId));
    } else {
      onChange([...selectedValues, roleId]);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...inputStyle(),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
          minHeight: "44px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <Users size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
          {selectedOptions.length > 0 ? (
            selectedOptions.slice(0, 3).map((role) => (
              <span
                key={role.value}
                style={{
                  padding: "4px 8px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "700",
                  background: "rgba(59,130,246,0.16)",
                  border: "1px solid rgba(96,165,250,0.22)",
                  color: "#bfdbfe",
                }}
              >
                {role.label}
              </span>
            ))
          ) : (
            <span style={{ color: "rgba(255,255,255,0.48)" }}>{placeholder}</span>
          )}

          {selectedOptions.length > 3 ? (
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.56)" }}>
              +{selectedOptions.length - 3} more
            </span>
          ) : null}
        </div>

        <ChevronDown
          size={16}
          style={{
            opacity: 0.7,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "100%",
            maxHeight: "260px",
            overflowY: "auto",
            background: "#081225",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            padding: "6px",
            zIndex: 9990,
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: "13px",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              No roles available
            </div>
          ) : (
            options.map((option) => {
              const active = selectedValues.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: active ? "rgba(59,130,246,0.16)" : "transparent",
                    color: "white",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontWeight: active ? "700" : "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                  }}
                >
                  <span>{option.label}</span>
                  {active && <Check size={14} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ActionNotice({ notice, onClose }) {
  if (!notice?.text) return null;

  return (
    <div
      style={{
        ...sectionCard(),
        padding: "12px 16px",
        border:
          notice.type === "error"
            ? "1px solid rgba(239,68,68,0.22)"
            : "1px solid rgba(34,197,94,0.22)",
        background:
          notice.type === "error"
            ? "rgba(239,68,68,0.08)"
            : "rgba(34,197,94,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "white",
        }}
      >
        {notice.text}
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function SocialAlertsPage({ selectedGuild, setGlobalToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [initialData, setInitialData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [testingAlertId, setTestingAlertId] = useState("");
  const [resolvingAlertId, setResolvingAlertId] = useState("");
  const [collapsedAlerts, setCollapsedAlerts] = useState({});
  const [collapsedHydrated, setCollapsedHydrated] = useState(false);
  const [data, setData] = useState({
    enabled: true,
    isPremium: false,
    alerts: [],
  });

useEffect(() => {
  if (!selectedGuild?.id) return;
  if (!collapsedHydrated) return; // ✅ IMPORTANT LINE

  try {
    const storageKey = getSocialAlertsCollapsedKey(selectedGuild.id);
    sessionStorage.setItem(storageKey, JSON.stringify(collapsedAlerts || {}));
  } catch {
    // ignore
  }
}, [selectedGuild?.id, collapsedAlerts, collapsedHydrated]);

  useEffect(() => {
    if (!selectedGuild?.id) return;

    setLoading(true);
    setSaveMessage("");

    Promise.all([
      fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/social-alerts`).then((r) =>
        r.json()
      ),
      fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`).then((r) =>
        r.json()
      ),
      fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/roles`).then((r) => r.json()),
    ])
      .then(([socialRes, channelsRes, rolesRes]) => {
        if (socialRes.success) {
          const normalizedData = {
            enabled: socialRes.socialAlerts?.enabled ?? true,
            isPremium: socialRes.socialAlerts?.isPremium ?? false,
            alerts: Array.isArray(socialRes.socialAlerts?.alerts)
              ? socialRes.socialAlerts.alerts.map(normalizeAlertForUI)
              : [],
          };

setData(normalizedData);
setInitialData(JSON.parse(JSON.stringify(normalizedData)));

try {
  const storageKey = getSocialAlertsCollapsedKey(selectedGuild.id);
  const savedCollapsed = sessionStorage.getItem(storageKey);
  const parsedCollapsed = savedCollapsed ? JSON.parse(savedCollapsed) : {};
  setCollapsedAlerts(
    parsedCollapsed && typeof parsedCollapsed === "object" ? parsedCollapsed : {}
  );
  setCollapsedHydrated(true);
} catch {
  setCollapsedAlerts({});
}
        }

        if (channelsRes.success) {
          const formattedChannels = Array.isArray(channelsRes.channels)
            ? channelsRes.channels
                .filter((ch) => ch.type === 0 || ch.type === 5)
                .map((ch) => ({
                  value: ch.id,
                  label: `# ${ch.name}`,
                }))
            : [];
          setChannels(formattedChannels);
        }

        if (rolesRes.success) {
          const formattedRoles = Array.isArray(rolesRes.roles)
            ? rolesRes.roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))
            : [];
          setRoles(formattedRoles);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedGuild]);

  const alertCountByPlatform = useMemo(() => {
    const counts = {
      youtube: 0,
      kick: 0,
      twitch: 0,
      tiktok: 0,
    };

    for (const alert of data.alerts || []) {
      const key = String(alert.platform || "").toLowerCase();
      if (counts[key] !== undefined) counts[key] += 1;
    }

    return counts;
  }, [data.alerts]);

  const hasUnsavedChanges =
    initialData !== null && JSON.stringify(data) !== JSON.stringify(initialData);

  const updateAlert = (id, patch) => {
    setSaveMessage("");
    setData((prev) => ({
      ...prev,
      alerts: prev.alerts.map((alert) =>
        alert.id === id ? { ...alert, ...patch } : alert
      ),
    }));
  };

  const isAlertCollapsed = (id) => !!collapsedAlerts[id];

  const toggleAlertCollapsed = (id) => {
    setCollapsedAlerts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const removeAlert = (id) => {
    setSaveMessage("");
    setData((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((alert) => alert.id !== id),
    }));

    setCollapsedAlerts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

const addAlert = () => {
  setSaveMessage("");

  if (!data.isPremium) {
    const youtubeCount = alertCountByPlatform.youtube || 0;

    if (youtubeCount >= FREE_SOCIAL_LIMITS.youtube) {
      setGlobalToast?.({
        type: "error",
        title: "Premium Required",
        message:
          "Free servers can create 1 alert per platform. Upgrade to Kyro Premium for more social alerts.",
      });
      return;
    }
  }

  const newAlert = makeEmptyAlert();

  setData((prev) => ({
    ...prev,
    alerts: [...prev.alerts, newAlert],
  }));

  setCollapsedAlerts((prev) => ({
    ...prev,
    [newAlert.id]: false,
  }));
};

  const resetChanges = () => {
    if (!initialData) return;
    setData(JSON.parse(JSON.stringify(initialData)));
    setSaveMessage("");
  };

  const save = async () => {
    if (!selectedGuild?.id) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const payload = {
        ...data,
        alerts: data.alerts.map((alert) => ({
          ...alert,
          pingRoleId: alert.pingRoleId || alert.pingRoleIds?.[0] || "",
        })),
      };

      const res = await fetch(
        `${API_BASE}/api/guilds/${selectedGuild.id}/social-alerts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (json.success) {
        const normalizedData = {
          enabled: json.socialAlerts?.enabled ?? true,
          isPremium: json.socialAlerts?.isPremium ?? false,
          alerts: Array.isArray(json.socialAlerts?.alerts)
            ? json.socialAlerts.alerts.map(normalizeAlertForUI)
            : [],
        };

        setData(normalizedData);
        setInitialData(JSON.parse(JSON.stringify(normalizedData)));
        setSaveMessage("");
setGlobalToast?.({
  type: "success",
  title: "Social Alerts Saved",
  message: "Social Alerts saved successfully.",
});
      } else {
      setGlobalToast?.({
  type: "error",
  title: "Error",
  message: json.error || "Failed to save Social Alerts.",
});
      }
    } catch (error) {
    setGlobalToast?.({
  type: "error",
  title: "Error",
  message: "Failed to save Social Alerts.",
});
    } finally {
      setSaving(false);
    }
  };

  const sendTestAlert = async (alert) => {
    if (!selectedGuild?.id) return;

    if (!alert.channelId) {
     setGlobalToast?.({
  type: "error",
  title: "Missing Channel",
  message: "Please select an alert channel before sending a test alert.",
});
      return;
    }

    setTestingAlertId(alert.id);

    try {
      const res = await fetch(
        `${API_BASE}/api/guilds/${selectedGuild.id}/social-alerts/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: alert.platform,
            channelId: alert.channelId,
            alert,
          }),
        }
      );

      const json = await res.json();

      if (json.success) {
     setGlobalToast?.({
  type: "success",
  title: "Test Alert Sent",
  message: "Test alert sent successfully.",
});
      } else {
      setGlobalToast?.({
  type: "error",
  title: "Test Alert Failed",
  message: json.error || "Failed to send test alert.",
});
      }
    } catch (error) {
     setGlobalToast?.({
  type: "error",
  title: "Test Alert Failed",
  message: "Failed to send test alert.",
});
    } finally {
      setTestingAlertId("");
    }
  };

 const resolveCreator = async (alert) => {
  if (!selectedGuild?.id) return;

 const rawSource =
  alert?.creatorUrl?.trim() ||
  alert?.creatorName?.trim() ||
  alert?.creatorId?.trim() ||
  "";

const source = rawSource.replace(/\?+$/, "").trim();

  if (!source) {
 setGlobalToast?.({
  type: "error",
  title: "Missing Creator",
  message: "Please enter a creator link or username before fetching.",
});
    return;
  }

  setResolvingAlertId(alert.id);
  setSaveMessage("");

  const startedAt = Date.now();

  try {
    const res = await fetch(
      `${API_BASE}/api/guilds/${selectedGuild.id}/social-alerts/resolve-creator`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: alert.platform,
          url: source,
        }),
      }
    );

    const json = await res.json();

if (json.success) {
  const resolvedAlert =
    Array.isArray(json.socialAlerts?.alerts)
      ? json.socialAlerts.alerts.find((item) => item.id === alert.id)
      : null;

  updateAlert(alert.id, {
    creatorName:
      resolvedAlert?.creatorName || json.creatorName || alert.creatorName || "",
    creatorId:
      resolvedAlert?.creatorId || json.creatorId || alert.creatorId || source,
    creatorUrl:
      resolvedAlert?.creatorUrl || alert.creatorUrl || source,
    profileImageUrl:
      resolvedAlert?.profileImageUrl || json.profileImageUrl || null,
  });

  setGlobalToast?.({
  type: "success",
  title: "Creator Fetched",
  message: "Creator fetched successfully.",
});
} else {
   setGlobalToast?.({
  type: "error",
  title: "Fetch Failed",
  message: json.error || "Failed to fetch creator.",
});
    }
  } catch (error) {
   setGlobalToast?.({
  type: "error",
  title: "Fetch Failed",
  message: "Failed to fetch creator.",
});
  } finally {
    const elapsed = Date.now() - startedAt;
    const minimumVisibleMs = 700;

    if (elapsed < minimumVisibleMs) {
      setTimeout(() => {
        setResolvingAlertId("");
      }, minimumVisibleMs - elapsed);
    } else {
      setResolvingAlertId("");
    }
  }
};

if (loading) {
  return (
    <PageLoader
      title="Loading social alerts..."
      subtitle="Preparing creators, platforms, channels, roles, and alert message settings."
    />
  );
}

  return (
    <div style={pageShell()}>
      <style>{`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>
      

      <div style={sectionCard()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(124,58,237,0.22))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 22px rgba(59,130,246,0.2)",
            }}
          >
            <Bell size={22} />
          </div>

          <div>
            <div
              style={{
                fontSize: "30px",
                fontWeight: "800",
                color: "white",
              }}
            >
              Social Alerts
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "14px",
                color: "rgba(255,255,255,0.64)",
              }}
            >
              Manage creator notifications for YouTube, Kick, Twitch, and TikTok.
            </div>
          </div>
        </div>

        <ToggleRow
          label="Enable Social Alerts"
          description="Turn the Social Alerts module on or off for this server."
          checked={data.enabled}
          onChange={() => {
            setSaveMessage("");
            setData((prev) => ({
              ...prev,
              enabled: !prev.enabled,
            }));
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          { key: "youtube", label: "YouTube", icon: Video },
          { key: "kick", label: "Kick", icon: Radio },
          { key: "twitch", label: "Twitch", icon: Sparkles },
          { key: "tiktok", label: "TikTok", icon: Music4 },
        ].map((item) => {
          const Icon = item.icon;
          const accent = platformAccent(item.key);

          return (
            <div
              key={item.key}
              style={{
                ...sectionCard(),
                padding: "18px",
                border: `1px solid ${accent.border}`,
                background: accent.bg,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Icon size={18} color={accent.text} />
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  {item.label}
                </span>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  fontSize: "28px",
                  fontWeight: "800",
                  color: "white",
                }}
              >
                {alertCountByPlatform[item.key]}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  marginTop: "4px",
                }}
              >
                Active configured alerts
              </div>
            </div>
          );
        })}
      </div>

      <div style={sectionCard()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "white",
              }}
            >
              Alerts
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Add and configure creator alerts for your Discord server.
            </div>
          </div>

          <button type="button" onClick={addAlert} style={secondaryButton()}>
            <Plus size={16} />
            Add Alert
          </button>
        </div>

        {data.alerts.length === 0 ? (
          <div
            style={{
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: "18px",
              padding: "28px",
              textAlign: "center",
              color: "rgba(255,255,255,0.62)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            No alerts yet. Create your first Social Alert to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {data.alerts.map((alert, index) => {
              const accent = platformAccent(alert.platform);
              const channelLabel =
                channels.find((ch) => ch.value === alert.channelId)?.label ||
                "No channel selected";
              const roleLabels =
                roles
                  .filter((role) => (alert.pingRoleIds || []).includes(role.value))
                  .map((role) => role.label)
                  .join(", ") || "No ping roles";

              const collapsed = isAlertCollapsed(alert.id);

              return (
                <div
                  key={alert.id}
                  style={{
                    border: `1px solid ${accent.border}`,
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "20px",
                    padding: "20px",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.14)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "14px",
                      marginBottom: collapsed ? 0 : "18px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "800",
                            color: "white",
                          }}
                        >
                          Alert #{index + 1}
                        </div>

                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            background: accent.bg,
                            border: `1px solid ${accent.border}`,
                            color: accent.text,
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          {accent.label}
                        </div>

                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            background: alert.enabled
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(255,255,255,0.05)",
                            border: alert.enabled
                              ? "1px solid rgba(34,197,94,0.22)"
                              : "1px solid rgba(255,255,255,0.08)",
                            color: alert.enabled ? "#86efac" : "rgba(255,255,255,0.6)",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          {alert.enabled ? "Enabled" : "Disabled"}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(255,255,255,0.03)",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            minWidth: 0,
                          }}
                        >
                          <div
  style={{
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "800",
    color: "white",
    flexShrink: 0,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
  }}
>
  {alert.profileImageUrl ? (
    <img
      src={alert.profileImageUrl}
      alt={alert.creatorName || "Creator"}
      referrerPolicy="no-referrer"
      onError={() => updateAlert(alert.id, { profileImageUrl: null })}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  ) : (
    <span>{(alert.creatorName || "C").charAt(0).toUpperCase()}</span>
  )}
</div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.08em",
                                color: "rgba(255,255,255,0.42)",
                                textTransform: "uppercase",
                              }}
                            >
                              Creator
                            </div>
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "14px",
                                fontWeight: "700",
                                color: "white",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={alert.creatorName || "Unknown Creator"}
                            >
                              {alert.creatorName || "Unknown Creator"}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              letterSpacing: "0.08em",
                              color: "rgba(255,255,255,0.42)",
                              textTransform: "uppercase",
                            }}
                          >
                            Channel
                          </div>
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "white",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={channelLabel}
                          >
                            {channelLabel}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              letterSpacing: "0.08em",
                              color: "rgba(255,255,255,0.42)",
                              textTransform: "uppercase",
                            }}
                          >
                            Ping Roles
                          </div>
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "white",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={roleLabels}
                          >
                            {roleLabels}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => sendTestAlert(alert)}
                        disabled={testingAlertId === alert.id}
                        style={ghostButton()}
                      >
                        <Send size={14} />
                        {testingAlertId === alert.id ? "Sending..." : "Test Alert"}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleAlertCollapsed(alert.id)}
                        style={ghostButton()}
                      >
                        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        {collapsed ? "Expand" : "Collapse"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeAlert(alert.id)}
                        style={dangerButton()}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>

                  {collapsed ? null : (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "16px",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <label style={labelStyle()}>Platform</label>
                          <SearchableSelect
  options={[
    { id: "youtube", name: "YouTube" },
    { id: "kick", name: "Kick" },
    { id: "twitch", name: "Twitch" },
    { id: "tiktok", name: "TikTok" },
  ]}
  value={alert.platform || "youtube"}
  onChange={(platform) => {
    const oldDefaults = getDefaultTemplates(alert.platform);
    const newDefaults = getDefaultTemplates(platform);

    const shouldReplaceMessage =
      !alert.messageContent ||
      alert.messageContent === oldDefaults.messageContent;

    const shouldReplaceDescription =
      !alert.embedDescription ||
      alert.embedDescription === oldDefaults.embedDescription;

    updateAlert(alert.id, {
      platform,
      alertLives:
        platform === "kick" || platform === "twitch"
          ? true
          : platform === "youtube",
      alertUploads: platform === "youtube",
      alertPosts: platform === "tiktok",
      messageContent: shouldReplaceMessage
        ? newDefaults.messageContent
        : alert.messageContent,
      embedDescription: shouldReplaceDescription
        ? newDefaults.embedDescription
        : alert.embedDescription,
    });
  }}
  placeholder="Select platform"
  searchPlaceholder="Search platforms..."
  zIndex={9995}
/>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <label style={labelStyle()}>Creator Name</label>
                          <input
                            value={alert.creatorName || ""}
                            onChange={(e) =>
                              updateAlert(alert.id, { creatorName: e.target.value })
                            }
                            placeholder="Example: Qasir Gaming"
                            style={inputStyle()}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                          <label style={labelStyle()}>Creator Link / Username</label>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: "10px",
                            }}
                          >
                         <input
  value={alert.creatorUrl || ""}
  onChange={(e) =>
    updateAlert(alert.id, {
      creatorUrl: e.target.value,
      creatorId: e.target.value,
    })
  }
  placeholder="https://youtube.com/@creator or twitch username"
  style={inputStyle()}
/>

<button
  type="button"
  onClick={() => resolveCreator(alert)}
  disabled={resolvingAlertId === alert.id}
  style={{
    ...ghostButton(),
    opacity: resolvingAlertId === alert.id ? 0.8 : 1,
    cursor: resolvingAlertId === alert.id ? "not-allowed" : "pointer",
  }}
>
  <RefreshCw
    size={14}
    style={{
      animation: resolvingAlertId === alert.id ? "spin 0.8s linear infinite" : "none",
    }}
  />
  {resolvingAlertId === alert.id ? "Fetching..." : "Fetch"}
</button>
                          </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <label style={labelStyle()}>Alert Channel</label>
                         <SearchableSelect
  options={channels.map((ch) => ({
    id: ch.value,
    name: ch.label,
  }))}
  value={alert.channelId || ""}
  onChange={(channelId) => updateAlert(alert.id, { channelId })}
  placeholder="Select alert channel"
  searchPlaceholder="Search channels..."
  zIndex={9995}
/>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <label style={labelStyle()}>Ping Roles</label>
                          <MultiRoleDropdown
                            selectedValues={alert.pingRoleIds || []}
                            onChange={(roleIds) =>
                              updateAlert(alert.id, {
                                pingRoleIds: roleIds,
                                pingRoleId: roleIds[0] || "",
                              })
                            }
                            options={roles}
                            placeholder="Select one or more roles"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                          <label style={labelStyle()}>Custom Alert Message</label>
                          <textarea
                            value={alert.messageContent || ""}
                            onChange={(e) =>
                              updateAlert(alert.id, { messageContent: e.target.value })
                            }
                            placeholder="Example: {role} {creator} is live now! {url}"
                            style={textareaStyle()}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                          <label style={labelStyle()}>Embed Description</label>
                          <textarea
                            value={alert.embedDescription || ""}
                            onChange={(e) =>
                              updateAlert(alert.id, { embedDescription: e.target.value })
                            }
                            placeholder="Default alert description"
                            style={textareaStyle()}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "18px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => updateAlert(alert.id, { enabled: !alert.enabled })}
                          style={smallToggleButton(alert.enabled)}
                        >
                          {alert.enabled ? "Enabled" : "Disabled"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateAlert(alert.id, {
                              alertLives: !alert.alertLives,
                            })
                          }
                          style={smallToggleButton(!!alert.alertLives)}
                        >
                          Live
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateAlert(alert.id, {
                              alertUploads: !alert.alertUploads,
                            })
                          }
                          style={smallToggleButton(!!alert.alertUploads)}
                        >
                          Uploads
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateAlert(alert.id, {
                              alertPosts: !alert.alertPosts,
                            })
                          }
                          style={smallToggleButton(!!alert.alertPosts)}
                        >
                          Posts
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: "14px",
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.54)",
                          lineHeight: "1.6",
                        }}
                      >
                        Variables supported: <strong>{"{creator}"}</strong>,{" "}
                        <strong>{"{platform}"}</strong>, <strong>{"{role}"}</strong>,{" "}
                        <strong>{"{url}"}</strong>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasUnsavedChanges && (
        <div
          style={{
            position: "sticky",
            bottom: "16px",
            zIndex: 10002,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              width: "fit-content",
              minWidth: "520px",
              maxWidth: "720px",
              padding: "12px 16px",
              borderRadius: "16px",
              background: "rgba(8,18,37,0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "white",
                }}
              >
                Unsaved Social Alerts Changes
              </div>

              <div
                style={{
                  marginTop: "2px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {saveMessage || "Save or cancel your changes."}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={resetChanges} style={cancelButton()}>
                <X size={14} />
                Cancel
              </button>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={primaryButton(saving)}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}