import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  UserPlus,
  Gift,
  Hash,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import API_BASE from "../config/api";

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        border: checked
          ? "1px solid rgba(88,101,242,0.55)"
          : "1px solid rgba(255,255,255,0.08)",
        background: checked
          ? "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(99,102,241,0.9))"
          : "rgba(255,255,255,0.08)",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.25s ease",
        boxShadow: checked
          ? "0 0 0 4px rgba(88,101,242,0.12), 0 10px 24px rgba(88,101,242,0.22)"
          : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 27 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          transition: "all 0.25s ease",
          boxShadow: "0 4px 12px rgba(0,0,0,0.28)",
        }}
      />
    </button>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#f8fafc",
          marginBottom: 4,
        }}
      >
        {children}
      </div>
      {hint ? (
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.52)",
            lineHeight: 1.45,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function NumberField({ value, onChange, disabled = false, min = 1, max = 9999 }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: disabled
          ? "rgba(255,255,255,0.035)"
          : "rgba(255,255,255,0.055)",
        color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
        outline: "none",
        fontSize: 14,
        transition: "all 0.2s ease",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    />
  );
}

function StatusPill({ children, tone = "neutral" }) {
  const tones = {
    neutral: {
      color: "rgba(255,255,255,0.78)",
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    green: {
      color: "#c8ffe1",
      background: "rgba(34,197,94,0.16)",
      border: "1px solid rgba(34,197,94,0.28)",
    },
    blue: {
      color: "#d8ddff",
      background: "rgba(88,101,242,0.16)",
      border: "1px solid rgba(88,101,242,0.28)",
    },
    orange: {
      color: "#ffe8c7",
      background: "rgba(245,158,11,0.16)",
      border: "1px solid rgba(245,158,11,0.28)",
    },
  };

  const style = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selected = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: disabled
            ? "rgba(255,255,255,0.035)"
            : "rgba(255,255,255,0.055)",
          color: disabled ? "rgba(255,255,255,0.45)" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? selected.label : placeholder || "Select..."}
        </span>

        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            marginLeft: 10,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s ease",
            color: "rgba(255,255,255,0.75)",
          }}
        />
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            maxHeight: 280,
            overflow: "hidden",
            borderRadius: 14,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              padding: 10,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.5)",
                }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 34px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  outline: "none",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 210, overflowY: "auto" }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 14,
                }}
              >
                No matching results
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "11px 12px",
                      cursor: "pointer",
                      color: isSelected ? "#fff" : "rgba(255,255,255,0.9)",
                      background: isSelected
                        ? "rgba(88,101,242,0.22)"
                        : "transparent",
                      border: "none",
                      borderBottom:
                        index !== filteredOptions.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      fontSize: 14,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background =
                          "rgba(88,101,242,0.14)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected
                        ? "rgba(88,101,242,0.22)"
                        : "transparent";
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteFloatingBar({ visible, onSave, onCancel, saving = false }) {
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: visible
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(20px)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "all 0.25s ease",
        zIndex: 20000,
        width: "min(720px, calc(100vw - 32px))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 16px",
          borderRadius: 18,
          border: "1px solid rgba(88,101,242,0.24)",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(17,24,39,0.96))",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(88,101,242,0.08)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: "#fff",
              marginBottom: 2,
            }}
          >
            Unsaved Invite Tracker Changes
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.45,
            }}
          >
            Save your invite tracker settings or cancel to restore the last saved state.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            <RotateCcw size={15} />
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(88,101,242,0.35)",
              background:
                "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(99,102,241,0.9))",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(88,101,242,0.24)",
            }}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function createDefaultState() {
  return {
    enabled: false,
    logChannelId: "",
    fakeAccountDays: 7,
    countFakeAsInvites: false,
    rewards: [],
  };
}

function createRewardRow() {
  return {
    id: `reward_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    invites: 1,
    roleId: "",
  };
}

export default function InviteTrackerPage({ selectedGuild, setGlobalToast }) {
  const [savedConfig, setSavedConfig] = useState(createDefaultState());
  const [draftConfig, setDraftConfig] = useState(createDefaultState());

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadConfig() {
      if (!selectedGuild?.id) {
        const defaults = createDefaultState();
        setSavedConfig(defaults);
        setDraftConfig(defaults);
        return;
      }

      setConfigLoading(true);

      try {
        const res = await axios.get(
          `${API_BASE}/api/guilds/${selectedGuild.id}/invite-tracker`
        );

        if (ignore) return;

        const inviteTracker = res.data?.inviteTracker || {};

      const normalized = {
  enabled: !!inviteTracker.enabled,
  logChannelId: inviteTracker.logChannelId || "",
  fakeAccountDays: Number(inviteTracker.fakeAccountDays ?? 7),
  countFakeAsInvites: !!inviteTracker.countFakeAsInvites,
  rewards: Array.isArray(inviteTracker.rewards)
    ? inviteTracker.rewards.map((reward, index) => ({
        id: `reward_loaded_${index}_${reward.roleId || "x"}`,
        invites: Number(reward.invites ?? 1),
        roleId: reward.roleId || "",
      }))
    : [],
};

        setSavedConfig(normalized);
        setDraftConfig(normalized);
      } catch (error) {
        console.error("Failed to load invite tracker config:", error);
        const defaults = createDefaultState();
        setSavedConfig(defaults);
        setDraftConfig(defaults);
      } finally {
        if (!ignore) setConfigLoading(false);
      }
    }

    loadConfig();

    return () => {
      ignore = true;
    };
  }, [selectedGuild?.id]);

  useEffect(() => {
    let ignore = false;

    async function loadResources() {
      if (!selectedGuild?.id) {
        setChannels([]);
        setRoles([]);
        return;
      }

      setResourcesLoading(true);

      try {
        const [channelsRes, rolesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`),
          axios.get(`${API_BASE}/api/guilds/${selectedGuild.id}/roles`),
        ]);

        if (ignore) return;

        const fetchedChannels = Array.isArray(channelsRes.data)
          ? channelsRes.data
          : channelsRes.data?.channels || [];

        const fetchedRoles = Array.isArray(rolesRes.data)
          ? rolesRes.data
          : rolesRes.data?.roles || [];

        const textLikeChannels = fetchedChannels.filter((ch) => {
          const type = String(ch.type ?? "");
          return (
            type === "0" ||
            type === "5" ||
            type.toLowerCase().includes("text") ||
            type.toLowerCase().includes("announcement")
          );
        });

        const usableRoles = fetchedRoles.filter(
          (role) => role && role.name && role.name !== "@everyone"
        );

        setChannels(textLikeChannels);
        setRoles(usableRoles);
      } catch (error) {
        console.error("Failed to load invite tracker resources:", error);
        if (!ignore) {
          setChannels([]);
          setRoles([]);
        }
      } finally {
        if (!ignore) setResourcesLoading(false);
      }
    }

    loadResources();

    return () => {
      ignore = true;
    };
  }, [selectedGuild?.id]);

  const isDirty = useMemo(
    () => JSON.stringify(savedConfig) !== JSON.stringify(draftConfig),
    [savedConfig, draftConfig]
  );

  const channelOptions = channels.map((channel) => ({
    value: channel.id,
    label: `# ${channel.name}`,
  }));

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: `@ ${role.name}`,
  }));

  const selectedLogChannelName =
    channels.find((ch) => ch.id === draftConfig.logChannelId)?.name || "";

  const rewardPreview = draftConfig.rewards
    .filter((reward) => reward.invites > 0 && reward.roleId)
    .map((reward) => {
      const roleName = roles.find((r) => r.id === reward.roleId)?.name || "Unknown role";
      return `${reward.invites} invite${reward.invites === 1 ? "" : "s"} → @${roleName}`;
    });

      const insight = useMemo(() => {
    if (!draftConfig.enabled) {
      return "Enable invite tracking to start growing your server.";
    }

    if (!draftConfig.rewards || draftConfig.rewards.length === 0) {
      return "You haven’t set up invite rewards yet. Adding rewards increases engagement.";
    }

    if (draftConfig.rewards.length < 2) {
      return "Consider adding more reward milestones like 3, 5, and 10 invites to encourage stronger server growth.";
    }

    return "Your invite system looks strong. Consider adding higher-tier rewards to maintain momentum and scale growth.";
  }, [draftConfig]);

  function updateDraft(patch) {
    setDraftConfig((prev) => ({ ...prev, ...patch }));
  }

  function updateReward(id, patch) {
    setDraftConfig((prev) => ({
      ...prev,
      rewards: prev.rewards.map((reward) =>
        reward.id === id ? { ...reward, ...patch } : reward
      ),
    }));
  }

  function addReward() {
    setDraftConfig((prev) => ({
      ...prev,
      rewards: [...prev.rewards, createRewardRow()],
    }));
  }

  function removeReward(id) {
    setDraftConfig((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((reward) => reward.id !== id),
    }));
  }

  async function handleSave() {
    if (!selectedGuild?.id) return;

    try {
      setConfigSaving(true);

      const payload = {
  enabled: !!draftConfig.enabled,
  logChannelId: draftConfig.logChannelId || "",
  fakeAccountDays: Number(draftConfig.fakeAccountDays ?? 7),
  countFakeAsInvites: !!draftConfig.countFakeAsInvites,

  rewards: (draftConfig.rewards || [])
    .map((reward) => ({
      invites: Number(reward.invites ?? 0),
      roleId: reward.roleId || "",
    }))
    .filter((reward) => reward.invites > 0 && reward.roleId),
};

      const res = await axios.post(
        `${API_BASE}/api/guilds/${selectedGuild.id}/invite-tracker`,
        payload
      );

      const inviteTracker = res.data?.inviteTracker || payload;

    const normalized = {
  enabled: !!inviteTracker.enabled,
  logChannelId: inviteTracker.logChannelId || "",
  fakeAccountDays: Number(inviteTracker.fakeAccountDays ?? 7),
  countFakeAsInvites: !!inviteTracker.countFakeAsInvites,
  rewards: Array.isArray(inviteTracker.rewards)
    ? inviteTracker.rewards.map((reward, index) => ({
        id: `reward_saved_${index}_${reward.roleId || "x"}`,
        invites: Number(reward.invites ?? 1),
        roleId: reward.roleId || "",
      }))
    : [],
};

      setSavedConfig(normalized);
      setDraftConfig(normalized);

      setGlobalToast?.({
        type: "success",
        title: "Invite Tracker saved",
        message: "Your invite tracker settings were updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save invite tracker config:", error);

      setGlobalToast?.({
        type: "error",
        title: "Save failed",
        message: "Could not save invite tracker settings.",
      });
    } finally {
      setConfigSaving(false);
    }
  }

  function handleCancel() {
    setDraftConfig(savedConfig);
  }

  if (!selectedGuild) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "32px",
          color: "#fff",
          background:
            "radial-gradient(circle at top, rgba(88,101,242,0.18), transparent 26%), linear-gradient(180deg, #0b1020 0%, #111827 45%, #0f172a 100%)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: 24,
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          Select a server to manage Invite Tracker settings.
        </div>
      </div>
    );
  }

  const pageWrap = {
    minHeight: "100vh",
    padding: "32px 32px 110px",
    color: "#fff",
    background:
      "radial-gradient(circle at top, rgba(88,101,242,0.18), transparent 26%), linear-gradient(180deg, #0b1020 0%, #111827 45%, #0f172a 100%)",
  };

  const container = {
    maxWidth: 1300,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 24,
    alignItems: "start",
  };

  const card = {
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.035))",
    boxShadow: "0 24px 80px rgba(0,0,0,0.36)",
    backdropFilter: "blur(16px)",
  };

  const panelCard = {
    ...card,
    padding: 22,
    marginBottom: 20,
    position: "relative",
    overflow: "visible",
    transition: "all 0.25s ease",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const sectionTitle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 19,
    fontWeight: 900,
    marginBottom: 8,
    letterSpacing: -0.2,
  };

  const sectionDesc = {
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 1.65,
    marginBottom: 18,
  };

  const overviewCard = {
    ...card,
    padding: 22,
    position: "sticky",
    top: 24,
  };

  const statRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontSize: 14,
    gap: 12,
  };

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 1300, margin: "0 auto 24px auto" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(88,101,242,0.14)",
            border: "1px solid rgba(88,101,242,0.28)",
            color: "#c7d2fe",
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 14,
            boxShadow: "0 10px 30px rgba(88,101,242,0.12)",
          }}
        >
          <UserPlus size={15} />
          Invite Growth
        </div>

        <h1
          style={{
            fontSize: 36,
            lineHeight: 1.08,
            fontWeight: 900,
            margin: 0,
            letterSpacing: -0.8,
          }}
        >
          Grow <span style={{ color: "#8ea1ff" }}>{selectedGuild.name}</span> with invites
        </h1>

        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: "rgba(255,255,255,0.72)",
            fontSize: 15,
            lineHeight: 1.75,
            maxWidth: 800,
          }}
        >
          Reward members for bringing new people into your server. Configure invite
          logs, milestone rewards, and growth incentives from one clean dashboard.
        </p>
      </div>

      <div style={container}>
        <div>
          <div
            style={{
              ...panelCard,
              position: "relative",
              zIndex: 20,
              overflow: "visible",
              transition: "all 0.25s ease",
              border: draftConfig.enabled
                ? "1px solid rgba(88,101,242,0.24)"
                : panelCard.border,
              boxShadow: draftConfig.enabled
                ? "0 24px 80px rgba(0,0,0,0.36), 0 0 0 1px rgba(88,101,242,0.08), 0 0 32px rgba(88,101,242,0.12)"
                : panelCard.boxShadow,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div style={sectionTitle}>
                  <UserPlus size={18} />
                  Invite Tracker
                </div>
                <div style={sectionDesc}>
                  Track who invited new members, send logs to a channel, and
                  automatically reward members when they hit invite milestones.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <StatusPill tone={draftConfig.enabled ? "blue" : "neutral"}>
                  {draftConfig.enabled ? "Active" : "Disabled"}
                </StatusPill>
              </div>
            </div>

            <div
              style={{
                borderRadius: 20,
                padding: 18,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#fff",
                      marginBottom: 4,
                    }}
                  >
                    Enable Invite Tracker
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.62)",
                      lineHeight: 1.6,
                    }}
                  >
                    When enabled, Kyro will detect inviters, log new joins, and
                    apply reward roles based on your configured milestones.
                  </div>
                </div>

                <ToggleSwitch
                  checked={draftConfig.enabled}
                  onChange={(checked) => updateDraft({ enabled: checked })}
                />
              </div>
            </div>

            {(resourcesLoading || configLoading) ? (
              <div
                style={{
                  marginBottom: 18,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(88,101,242,0.18)",
                  background: "rgba(88,101,242,0.08)",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 13,
                }}
              >
                {configLoading
                  ? "Loading invite tracker settings..."
                  : "Loading channels and roles from this server..."}
              </div>
            ) : null}

            <div
              style={{
                opacity: draftConfig.enabled ? 1 : 0.46,
                pointerEvents: draftConfig.enabled ? "auto" : "none",
                transition: "all 0.25s ease",
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <FieldLabel hint="Invite join logs will be sent to this channel.">
                  Invite Logs Channel
                </FieldLabel>
                <SearchableSelect
                  value={draftConfig.logChannelId}
                  onChange={(value) => updateDraft({ logChannelId: value })}
                  disabled={!draftConfig.enabled || resourcesLoading}
                  placeholder={
                    resourcesLoading
                      ? "Loading channels..."
                      : channelOptions.length
                      ? "Select invite logs channel"
                      : "No text channels found"
                  }
                  options={channelOptions}
                />
              </div>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 18,
  }}
>
  <div>
    <FieldLabel hint="Accounts newer than this threshold will be marked as fake invites.">
      Fake Account Age Threshold (Days)
    </FieldLabel>
    <NumberField
      value={draftConfig.fakeAccountDays}
      onChange={(value) =>
        updateDraft({ fakeAccountDays: Math.max(1, Number(value || 1)) })
      }
      disabled={!draftConfig.enabled}
      min={1}
      max={365}
    />
  </div>

  <div
    style={{
      borderRadius: 18,
      padding: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 4,
        }}
      >
        Count Fake As Invites
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.62)",
          lineHeight: 1.55,
        }}
      >
        Enable this only if you want fake joins to still increase raw invite totals.
      </div>
    </div>

    <ToggleSwitch
      checked={draftConfig.countFakeAsInvites}
      onChange={(checked) => updateDraft({ countFakeAsInvites: checked })}
    />
  </div>
</div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 15,
                        fontWeight: 900,
                      }}
                    >
                      <Gift size={16} />
                      Invite Rewards
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.62)",
                        lineHeight: 1.6,
                      }}
                    >
                      Give members a role when they reach specific invite milestones.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addReward}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(88,101,242,0.32)",
                      background:
                        "linear-gradient(135deg, rgba(88,101,242,0.18), rgba(99,102,241,0.14))",
                      color: "#e5e7ff",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    <Plus size={15} />
                    Add Reward
                  </button>
                </div>

                {draftConfig.rewards.length === 0 ? (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      border: "1px dashed rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.025)",
                      color: "rgba(255,255,255,0.72)",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    No invite rewards added yet. Add your first reward milestone to
                    encourage growth in your server.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {draftConfig.rewards.map((reward, index) => (
                      <div
                        key={reward.id}
                        style={{
                          padding: 16,
                          borderRadius: 18,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "0.85fr 1.15fr auto",
                            gap: 14,
                            alignItems: "end",
                          }}
                        >
                          <div>
                            <FieldLabel hint="How many successful invites are required.">
                              Required Invites
                            </FieldLabel>
                            <NumberField
                              value={reward.invites}
                              onChange={(value) => updateReward(reward.id, { invites: value })}
                              disabled={!draftConfig.enabled}
                              min={1}
                              max={9999}
                            />
                          </div>

                          <div>
                            <FieldLabel hint="This role will be granted when the milestone is reached.">
                              Reward Role
                            </FieldLabel>
                            <SearchableSelect
                              value={reward.roleId}
                              onChange={(value) => updateReward(reward.id, { roleId: value })}
                              disabled={!draftConfig.enabled || resourcesLoading}
                              placeholder={
                                resourcesLoading
                                  ? "Loading roles..."
                                  : roleOptions.length
                                  ? "Select reward role"
                                  : "No roles found"
                              }
                              options={roleOptions}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeReward(reward.id)}
                            style={{
                              height: 46,
                              minWidth: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(239,68,68,0.24)",
                              background: "rgba(239,68,68,0.12)",
                              color: "#fecaca",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title={`Remove reward ${index + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={overviewCard}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                }}
              >
                Invite Summary
              </div>

              <StatusPill
                tone={
                  draftConfig.enabled &&
                  draftConfig.logChannelId &&
                  rewardPreview.length > 0
                    ? "green"
                    : "orange"
                }
              >
                {draftConfig.enabled &&
                draftConfig.logChannelId &&
                rewardPreview.length > 0
                  ? "Growth Ready"
                  : "Needs setup"}
              </StatusPill>
            </div>

            <div style={statRow}>
              <span>Invite Tracker</span>
              <span
                style={{
                  color: draftConfig.enabled
                    ? "#c8ffe1"
                    : "rgba(255,255,255,0.75)",
                }}
              >
                {draftConfig.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div style={statRow}>
              <span>Logs Channel</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.78)",
                  textAlign: "right",
                }}
              >
                {selectedLogChannelName ? `#${selectedLogChannelName}` : "Not selected"}
              </span>
            </div>

            <div style={statRow}>
              <span>Reward Rules</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.78)",
                  textAlign: "right",
                }}
              >
                {draftConfig.rewards.length}
              </span>
            </div>

            <div style={statRow}>
  <span>Fake Filter</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.fakeAccountDays} day{draftConfig.fakeAccountDays === 1 ? "" : "s"}
  </span>
</div>

<div style={statRow}>
  <span>Count Fake Invites</span>
  <span
    style={{
      color: draftConfig.countFakeAsInvites
        ? "#ffe8c7"
        : "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.countFakeAsInvites ? "Enabled" : "Disabled"}
  </span>
</div>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 18,
                background:
                  "linear-gradient(180deg, rgba(88,101,242,0.12), rgba(88,101,242,0.05))",
                border: "1px solid rgba(88,101,242,0.22)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 13,
                lineHeight: 1.7,
                boxShadow: "0 16px 40px rgba(88,101,242,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                <ShieldCheck size={15} />
                Reward Preview
              </div>

              {rewardPreview.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rewardPreview.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : (
                <div>No reward milestones configured yet.</div>
              )}
            </div>

                        <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 18,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={15} />
                Growth Insight
              </div>
              {insight}
            </div>
          </div>
        </div>
      </div>

      <InviteFloatingBar
        visible={isDirty}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={configSaving}
      />
    </div>
  );
}