import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Shield,
  Siren,
  UserRoundX,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Radar,
  Lock,
  Search,
  X,
  Save,
  RotateCcw,
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

function NumberField({ value, onChange, disabled = false, min = 1, max = 999 }) {
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

function SearchableMultiSelect({
  values,
  onChange,
  options,
  placeholder,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selectedOptions = options.filter((opt) => values.includes(opt.value));

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((opt) => {
      const matchesQuery = !q || opt.label.toLowerCase().includes(q);
      const notSelected = !values.includes(opt.value);
      return matchesQuery && notSelected;
    });
  }, [options, query, values]);

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

  function addValue(newValue) {
    if (values.includes(newValue)) return;
    onChange([...values, newValue]);
  }

  function removeValue(removeId) {
    onChange(values.filter((id) => id !== removeId));
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: 50,
          padding: "10px 14px",
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
          gap: 10,
          fontSize: 14,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            flex: 1,
            textAlign: "left",
          }}
        >
          {selectedOptions.length ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(88,101,242,0.16)",
                  border: "1px solid rgba(88,101,242,0.28)",
                  color: "#dbe4ff",
                  fontSize: 12,
                  fontWeight: 700,
                  maxWidth: 220,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(opt.value);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))
          ) : (
            <span style={{ color: "rgba(255,255,255,0.75)" }}>
              {placeholder || "Select..."}
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
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
            maxHeight: 300,
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
                placeholder="Search roles..."
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

          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 14,
                }}
              >
                No matching roles
              </div>
            ) : (
              filteredOptions.map((opt, index) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => addValue(opt.value)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 12px",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.92)",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      index !== filteredOptions.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(88,101,242,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityFloatingBar({ visible, onSave, onCancel, saving = false }) {
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
            Unsaved Security Changes
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.45,
            }}
          >
            Save your Anti Raid settings or cancel to restore the last saved state.
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

function getDefaultSecurityState() {
  return {
    antiRaidEnabled: false,
    joinThreshold: 5,
    joinWindow: 10,
    antiRaidAction: "alert",
    cooldownSeconds: 30,
    alertChannel: "",
    pingRoleIds: [],
    quarantineRole: "",

    suspiciousEnabled: false,
    suspiciousAccountAgeDays: 7,
    suspiciousCheckDefaultAvatar: false,
    suspiciousAction: "alert",
    suspiciousAlertChannel: "",
    suspiciousPingRoleIds: [],
    suspiciousQuarantineRole: "",
        antiNukeEnabled: false,
    antiNukePunishment: "quarantine",
    antiNukeTimeframe: 10000,
    antiNukeLogChannel: "",
    antiNukeQuarantineRole: "",
    antiNukeWhitelistUserIds: [],
    antiNukeWhitelistRoleIds: [],

    antiNukeChannelDeleteEnabled: false,
    antiNukeChannelDeleteLimit: 3,

    antiNukeChannelCreateEnabled: false,
    antiNukeChannelCreateLimit: 3,

    antiNukeRoleDeleteEnabled: false,
    antiNukeRoleDeleteLimit: 3,

    antiNukeRoleCreateEnabled: false,
    antiNukeRoleCreateLimit: 3,

    antiNukeRoleUpdateEnabled: false,
    antiNukeRoleUpdateLimit: 3,

    antiNukeBanEnabled: false,
    antiNukeBanLimit: 2,

    antiNukeKickEnabled: false,
    antiNukeKickLimit: 3,
  };
}

export default function SecurityPage({ selectedGuild, setGlobalToast }) {
  const [savedConfig, setSavedConfig] = useState(getDefaultSecurityState());
  const [draftConfig, setDraftConfig] = useState(getDefaultSecurityState());

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
const [configLoading, setConfigLoading] = useState(false);
const [configSaving, setConfigSaving] = useState(false);
const [premiumStatus, setPremiumStatus] = useState({
  hasPremium: false,
  plan: "free",
});

const securityPremiumUnlocked = Boolean(
  premiumStatus?.hasPremium || premiumStatus?.plan === "lifetime"
);
  
useEffect(() => {
  let ignore = false;

  async function loadSecurityConfig() {
    if (!selectedGuild?.id) {
      const defaults = getDefaultSecurityState();
      setSavedConfig(defaults);
      setDraftConfig(defaults);
      return;
    }

    setConfigLoading(true);

    try {
      const res = await axios.get(
        `${API_BASE}/api/guilds/${selectedGuild.id}/security`
      );

      if (ignore) return;

      setPremiumStatus(
  res.data?.premiumStatus || {
    hasPremium: false,
    plan: "free",
  }
);

      const antiRaid = res.data?.security?.antiRaid || {};
      const suspiciousAccount = res.data?.security?.suspiciousAccount || {};
      const antiNuke = res.data?.security?.antiNuke || {};

   const normalized = {
  antiRaidEnabled: !!antiRaid.enabled,
  joinThreshold: Number(antiRaid.joinThreshold ?? 5),
  joinWindow: Number(antiRaid.joinWindow ?? 10),
  antiRaidAction: antiRaid.action || "alert",
  cooldownSeconds: Number(antiRaid.cooldownSeconds ?? 30),
  alertChannel: antiRaid.alertChannelId || "",
  pingRoleIds: Array.isArray(antiRaid.pingRoleIds)
    ? antiRaid.pingRoleIds
    : [],
  quarantineRole: antiRaid.quarantineRoleId || "",

  suspiciousEnabled: !!suspiciousAccount.enabled,
  suspiciousAccountAgeDays: Number(suspiciousAccount.accountAgeDays ?? 7),
  suspiciousCheckDefaultAvatar: !!suspiciousAccount.checkDefaultAvatar,
  suspiciousAction: suspiciousAccount.action || "alert",
  suspiciousAlertChannel: suspiciousAccount.alertChannelId || "",
  suspiciousPingRoleIds: Array.isArray(suspiciousAccount.pingRoleIds)
    ? suspiciousAccount.pingRoleIds
    : [],
  suspiciousQuarantineRole: suspiciousAccount.quarantineRoleId || "",
   antiNukeEnabled: !!antiNuke.enabled,
  antiNukePunishment: antiNuke.punishment || "quarantine",
  antiNukeTimeframe: Number(antiNuke.timeframe ?? 10000),
  antiNukeLogChannel: antiNuke.logChannel || "",
  antiNukeQuarantineRole: antiNuke.quarantineRole || "",
  antiNukeWhitelistUserIds: Array.isArray(antiNuke.whitelistUserIds)
    ? antiNuke.whitelistUserIds
    : [],
  antiNukeWhitelistRoleIds: Array.isArray(antiNuke.whitelistRoleIds)
    ? antiNuke.whitelistRoleIds
    : [],

  antiNukeChannelDeleteEnabled: !!antiNuke.antiChannelDelete?.enabled,
  antiNukeChannelDeleteLimit: Number(antiNuke.antiChannelDelete?.limit ?? 3),

  antiNukeChannelCreateEnabled: !!antiNuke.antiChannelCreate?.enabled,
  antiNukeChannelCreateLimit: Number(antiNuke.antiChannelCreate?.limit ?? 3),

  antiNukeRoleDeleteEnabled: !!antiNuke.antiRoleDelete?.enabled,
  antiNukeRoleDeleteLimit: Number(antiNuke.antiRoleDelete?.limit ?? 3),

  antiNukeRoleCreateEnabled: !!antiNuke.antiRoleCreate?.enabled,
  antiNukeRoleCreateLimit: Number(antiNuke.antiRoleCreate?.limit ?? 3),

  antiNukeRoleUpdateEnabled: !!antiNuke.antiRoleUpdate?.enabled,
  antiNukeRoleUpdateLimit: Number(antiNuke.antiRoleUpdate?.limit ?? 3),

  antiNukeBanEnabled: !!antiNuke.antiBan?.enabled,
  antiNukeBanLimit: Number(antiNuke.antiBan?.limit ?? 2),

  antiNukeKickEnabled: !!antiNuke.antiKick?.enabled,
  antiNukeKickLimit: Number(antiNuke.antiKick?.limit ?? 3),
};

      setSavedConfig(normalized);
      setDraftConfig(normalized);
    } catch (error) {
      console.error("Failed to load security config:", error);

      const defaults = getDefaultSecurityState();
      setSavedConfig(defaults);
      setDraftConfig(defaults);
    } finally {
      if (!ignore) setConfigLoading(false);
    }
  }

  loadSecurityConfig();

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
        console.error("Failed to load security resources:", error);
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

  const actionLabel = useMemo(() => {
    if (draftConfig.antiRaidAction === "alert") return "Alert Only";
    if (draftConfig.antiRaidAction === "kick") return "Kick Users";
    if (draftConfig.antiRaidAction === "ban") return "Ban Users";
    if (draftConfig.antiRaidAction === "quarantine") return "Quarantine Users";
    return "Not set";
  }, [draftConfig.antiRaidAction]);

  const selectedAlertChannelName =
    channels.find((ch) => ch.id === draftConfig.alertChannel)?.name || "";

  const selectedPingRoleNames = roles
    .filter((role) => draftConfig.pingRoleIds.includes(role.id))
    .map((role) => role.name);

  const selectedQuarantineRoleName =
    roles.find((role) => role.id === draftConfig.quarantineRole)?.name || "";

  const isConfigured =
    draftConfig.antiRaidEnabled &&
    draftConfig.joinThreshold > 0 &&
    draftConfig.joinWindow > 0 &&
    draftConfig.cooldownSeconds > 0 &&
    (draftConfig.antiRaidAction !== "quarantine" || draftConfig.quarantineRole);

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
          Select a server to manage Security settings.
        </div>
      </div>
    );
  }

  function updateDraft(patch) {
    setDraftConfig((prev) => ({ ...prev, ...patch }));
  }

  function requireSecurityPremium() {
  if (securityPremiumUnlocked) return true;

  setGlobalToast?.({
    type: "warning",
    title: "Kyro Premium Required",
    message:
      "Anti Raid, Anti Nuke, and Suspicious Account protection require Kyro Premium.",
  });

  return false;
}

async function handleSave() {
  if (!selectedGuild?.id) return;

  try {
    setConfigSaving(true);

const payload = {
  antiRaid: {
    enabled: !!draftConfig.antiRaidEnabled,
    joinThreshold: Number(draftConfig.joinThreshold ?? 5),
    joinWindow: Number(draftConfig.joinWindow ?? 10),
    action: draftConfig.antiRaidAction || "alert",
    cooldownSeconds: Number(draftConfig.cooldownSeconds ?? 30),
    alertChannelId: draftConfig.alertChannel || "",
    pingRoleIds: Array.isArray(draftConfig.pingRoleIds)
      ? draftConfig.pingRoleIds
      : [],
    quarantineRoleId: draftConfig.quarantineRole || "",
  },

  suspiciousAccount: {
    enabled: !!draftConfig.suspiciousEnabled,
    accountAgeDays: Number(draftConfig.suspiciousAccountAgeDays ?? 7),
    checkDefaultAvatar: !!draftConfig.suspiciousCheckDefaultAvatar,
    action: draftConfig.suspiciousAction || "alert",
    alertChannelId: draftConfig.suspiciousAlertChannel || "",
    pingRoleIds: Array.isArray(draftConfig.suspiciousPingRoleIds)
      ? draftConfig.suspiciousPingRoleIds
      : [],
    quarantineRoleId: draftConfig.suspiciousQuarantineRole || "",
  },

  antiNuke: {
    enabled: !!draftConfig.antiNukeEnabled,
    punishment: draftConfig.antiNukePunishment || "quarantine",
    timeframe: Number(draftConfig.antiNukeTimeframe ?? 10000),
    logChannel: draftConfig.antiNukeLogChannel || "",
    quarantineRole: draftConfig.antiNukeQuarantineRole || "",
    whitelistUserIds: Array.isArray(draftConfig.antiNukeWhitelistUserIds)
      ? draftConfig.antiNukeWhitelistUserIds
      : [],
    whitelistRoleIds: Array.isArray(draftConfig.antiNukeWhitelistRoleIds)
      ? draftConfig.antiNukeWhitelistRoleIds
      : [],

    antiChannelDelete: {
      enabled: !!draftConfig.antiNukeChannelDeleteEnabled,
      limit: Number(draftConfig.antiNukeChannelDeleteLimit ?? 3),
    },

    antiChannelCreate: {
      enabled: !!draftConfig.antiNukeChannelCreateEnabled,
      limit: Number(draftConfig.antiNukeChannelCreateLimit ?? 3),
    },

    antiRoleDelete: {
      enabled: !!draftConfig.antiNukeRoleDeleteEnabled,
      limit: Number(draftConfig.antiNukeRoleDeleteLimit ?? 3),
    },

    antiRoleCreate: {
      enabled: !!draftConfig.antiNukeRoleCreateEnabled,
      limit: Number(draftConfig.antiNukeRoleCreateLimit ?? 3),
    },

    antiRoleUpdate: {
      enabled: !!draftConfig.antiNukeRoleUpdateEnabled,
      limit: Number(draftConfig.antiNukeRoleUpdateLimit ?? 3),
    },

    antiBan: {
      enabled: !!draftConfig.antiNukeBanEnabled,
      limit: Number(draftConfig.antiNukeBanLimit ?? 2),
    },

    antiKick: {
      enabled: !!draftConfig.antiNukeKickEnabled,
      limit: Number(draftConfig.antiNukeKickLimit ?? 3),
    },
  },
};

    const res = await axios.post(
      `${API_BASE}/api/guilds/${selectedGuild.id}/security`,
      payload
    );

    const antiRaid = res.data?.security?.antiRaid || payload.antiRaid;
    const suspiciousAccount =
  res.data?.security?.suspiciousAccount || payload.suspiciousAccount || {};

const antiNuke =
  res.data?.security?.antiNuke || payload.antiNuke || {};

const normalized = {
  antiRaidEnabled: !!antiRaid.enabled,
  joinThreshold: Number(antiRaid.joinThreshold ?? 5),
  joinWindow: Number(antiRaid.joinWindow ?? 10),
  antiRaidAction: antiRaid.action || "alert",
  cooldownSeconds: Number(antiRaid.cooldownSeconds ?? 30),
  alertChannel: antiRaid.alertChannelId || "",
  pingRoleIds: Array.isArray(antiRaid.pingRoleIds)
    ? antiRaid.pingRoleIds
    : [],
  quarantineRole: antiRaid.quarantineRoleId || "",

  suspiciousEnabled: !!suspiciousAccount.enabled,
  suspiciousAccountAgeDays: Number(suspiciousAccount.accountAgeDays ?? 7),
  suspiciousCheckDefaultAvatar: !!suspiciousAccount.checkDefaultAvatar,
  suspiciousAction: suspiciousAccount.action || "alert",
  suspiciousAlertChannel: suspiciousAccount.alertChannelId || "",
  suspiciousPingRoleIds: Array.isArray(suspiciousAccount.pingRoleIds)
    ? suspiciousAccount.pingRoleIds
    : [],
  suspiciousQuarantineRole: suspiciousAccount.quarantineRoleId || "",

   antiNukeEnabled: !!antiNuke.enabled,
  antiNukePunishment: antiNuke.punishment || "quarantine",
  antiNukeTimeframe: Number(antiNuke.timeframe ?? 10000),
  antiNukeLogChannel: antiNuke.logChannel || "",
  antiNukeQuarantineRole: antiNuke.quarantineRole || "",
  antiNukeWhitelistUserIds: Array.isArray(antiNuke.whitelistUserIds)
    ? antiNuke.whitelistUserIds
    : [],
  antiNukeWhitelistRoleIds: Array.isArray(antiNuke.whitelistRoleIds)
    ? antiNuke.whitelistRoleIds
    : [],

  antiNukeChannelDeleteEnabled: !!antiNuke.antiChannelDelete?.enabled,
  antiNukeChannelDeleteLimit: Number(antiNuke.antiChannelDelete?.limit ?? 3),

  antiNukeChannelCreateEnabled: !!antiNuke.antiChannelCreate?.enabled,
  antiNukeChannelCreateLimit: Number(antiNuke.antiChannelCreate?.limit ?? 3),

  antiNukeRoleDeleteEnabled: !!antiNuke.antiRoleDelete?.enabled,
  antiNukeRoleDeleteLimit: Number(antiNuke.antiRoleDelete?.limit ?? 3),

  antiNukeRoleCreateEnabled: !!antiNuke.antiRoleCreate?.enabled,
  antiNukeRoleCreateLimit: Number(antiNuke.antiRoleCreate?.limit ?? 3),

  antiNukeRoleUpdateEnabled: !!antiNuke.antiRoleUpdate?.enabled,
  antiNukeRoleUpdateLimit: Number(antiNuke.antiRoleUpdate?.limit ?? 3),

  antiNukeBanEnabled: !!antiNuke.antiBan?.enabled,
  antiNukeBanLimit: Number(antiNuke.antiBan?.limit ?? 2),

  antiNukeKickEnabled: !!antiNuke.antiKick?.enabled,
  antiNukeKickLimit: Number(antiNuke.antiKick?.limit ?? 3),
};


    setSavedConfig(normalized);
    setDraftConfig(normalized);
  } catch (error) {
    console.error("Failed to save security config:", error);
    if (error?.response?.data?.code === "SECURITY_PREMIUM_REQUIRED") {
  setGlobalToast?.({
    type: "warning",
    title: "Kyro Premium Required",
    message:
      "Anti Raid, Anti Nuke, and Suspicious Account protection require Kyro Premium.",
  });
} else {
  setGlobalToast?.({
    type: "error",
    title: "Save Failed",
    message:
      error?.response?.data?.error ||
      "Failed to save security settings.",
  });
}
  } finally {
    setConfigSaving(false);
  }
}

  function handleCancel() {
    setDraftConfig(savedConfig);
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

  const disabledWrap = {
    opacity: draftConfig.antiRaidEnabled ? 1 : 0.46,
    pointerEvents: draftConfig.antiRaidEnabled ? "auto" : "none",
    transition: "all 0.25s ease",
  };

  const placeholderCard = {
    padding: 16,
    borderRadius: 18,
    border: "1px dashed rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.025)",
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 1.6,
  };

const miniPremiumBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 7px",
  borderRadius: "6px",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  background: "rgba(255, 184, 77, 0.16)",
  color: "#ffcc73",
  border: "1px solid rgba(255, 184, 77, 0.28)",
  boxShadow: "0 0 12px rgba(255,184,77,0.14)",
};

  const channelOptions = channels.map((channel) => ({
    value: channel.id,
    label: `# ${channel.name}`,
  }));

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: `@ ${role.name}`,
  }));

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
          <Shield size={15} />
          Security Center
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
          Protect <span style={{ color: "#8ea1ff" }}>{selectedGuild.name}</span>
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
          Build enterprise grade protection against raid waves, suspicious joins, and destructive moderator actions. Kyro’s Security Center is designed to feel strict, intelligent, and instantly trustworthy the moment you open it.
        </p>
      </div>

      <div style={container}>
        <div>
         <div
  style={{
    ...panelCard,
    position: "relative",
    zIndex: 30,
    overflow: "visible",
    transition: "all 0.25s ease",
    border: draftConfig.antiRaidEnabled
      ? "1px solid rgba(88,101,242,0.24)"
      : panelCard.border,
    boxShadow: draftConfig.antiRaidEnabled
      ? "0 24px 80px rgba(0,0,0,0.36), 0 0 0 1px rgba(88,101,242,0.08), 0 0 32px rgba(88,101,242,0.12)"
      : panelCard.boxShadow,
  }}
 onMouseEnter={(e) => {
  e.currentTarget.style.transform = "translateY(-4px)";
  e.currentTarget.style.border =
    "1px solid rgba(88,101,242,0.45)";
  e.currentTarget.style.boxShadow =
    "0 35px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(88,101,242,0.2), 0 0 40px rgba(88,101,242,0.35)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = "translateY(0)";
  e.currentTarget.style.border = draftConfig.antiRaidEnabled
    ? "1px solid rgba(88,101,242,0.24)"
    : "1px solid rgba(255,255,255,0.08)";
  e.currentTarget.style.boxShadow = draftConfig.antiRaidEnabled
    ? "0 24px 80px rgba(0,0,0,0.36), 0 0 0 1px rgba(88,101,242,0.08), 0 0 32px rgba(88,101,242,0.12)"
    : panelCard.boxShadow;
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
              <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  }}
>
  <div style={sectionTitle}>
    <Siren size={18} />
    Anti Raid
  </div>

  <span style={miniPremiumBadge}>
    Premium
  </span>
</div>
                <div style={sectionDesc}>
                  Detect mass joins in a short window and automatically alert,
                  quarantine, kick, or ban based on your chosen response policy.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <StatusPill tone={draftConfig.antiRaidEnabled ? "blue" : "neutral"}>
                  {draftConfig.antiRaidEnabled ? "Active" : "Disabled"}
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
                    Enable Anti Raid
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.62)",
                      lineHeight: 1.6,
                    }}
                  >
                    When enabled, Kyro will monitor rapid join spikes and trigger
                    your configured protection mode.
                  </div>
                </div>

                <ToggleSwitch
                  checked={draftConfig.antiRaidEnabled}
                  onChange={(checked) => {
  if (checked && !requireSecurityPremium()) return;
  updateDraft({ antiRaidEnabled: checked });
}}
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
      ? "Loading security settings..."
      : "Loading channels and roles from this server..."}
  </div>
) : null}

            <div style={disabledWrap}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <FieldLabel hint="How many users must join before raid protection triggers.">
                    Join Threshold
                  </FieldLabel>
                  <NumberField
                    value={draftConfig.joinThreshold}
                    onChange={(value) => updateDraft({ joinThreshold: value })}
                    disabled={!draftConfig.antiRaidEnabled}
                    min={2}
                    max={100}
                  />
                </div>

                <div>
                  <FieldLabel hint="The time window Kyro should watch for suspicious join bursts.">
                    Time Window (seconds)
                  </FieldLabel>
                  <NumberField
                    value={draftConfig.joinWindow}
                    onChange={(value) => updateDraft({ joinWindow: value })}
                    disabled={!draftConfig.antiRaidEnabled}
                    min={2}
                    max={300}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <FieldLabel hint="Choose how Kyro should respond when a raid is detected.">
                    Protection Action
                  </FieldLabel>
                  <SearchableSelect
                    value={draftConfig.antiRaidAction}
                    onChange={(value) => updateDraft({ antiRaidAction: value })}
                    disabled={!draftConfig.antiRaidEnabled}
                    placeholder="Select action"
                    options={[
                      { value: "alert", label: "Alert Only" },
                      { value: "kick", label: "Kick Users" },
                      { value: "ban", label: "Ban Users" },
                      { value: "quarantine", label: "Quarantine Users" },
                    ]}
                  />
                </div>

                <div>
                  <FieldLabel hint="Prevents repeated triggers from firing too often in a short time.">
                    Protection Cooldown (seconds)
                  </FieldLabel>
                  <NumberField
                    value={draftConfig.cooldownSeconds}
                    onChange={(value) =>
                      updateDraft({ cooldownSeconds: value })
                    }
                    disabled={!draftConfig.antiRaidEnabled}
                    min={5}
                    max={900}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <FieldLabel hint="Security alerts will be sent here when a raid wave is detected.">
                    Alert Channel
                  </FieldLabel>
                  <SearchableSelect
                    value={draftConfig.alertChannel}
                    onChange={(value) => updateDraft({ alertChannel: value })}
                    disabled={!draftConfig.antiRaidEnabled || resourcesLoading}
                    placeholder={
                      resourcesLoading
                        ? "Loading channels..."
                        : channelOptions.length
                        ? "Select alert channel"
                        : "No text channels found"
                    }
                    options={channelOptions}
                  />
                </div>

                <div>
                  <FieldLabel hint="Select one or more roles to mention when anti raid protection is triggered.">
                    Ping Roles
                  </FieldLabel>
                  <SearchableMultiSelect
                    values={draftConfig.pingRoleIds}
                    onChange={(values) => updateDraft({ pingRoleIds: values })}
                    disabled={!draftConfig.antiRaidEnabled || resourcesLoading}
                    placeholder={
                      resourcesLoading
                        ? "Loading roles..."
                        : roleOptions.length
                        ? "Select ping roles"
                        : "No roles found"
                    }
                    options={roleOptions}
                  />
                </div>
              </div>

              {draftConfig.antiRaidAction === "quarantine" ? (
                <div style={{ marginBottom: 18 }}>
                  <FieldLabel hint="Users will receive this role instead of being removed from the server.">
                    Quarantine Role
                  </FieldLabel>
                  <SearchableSelect
                    value={draftConfig.quarantineRole}
                    onChange={(value) =>
                      updateDraft({ quarantineRole: value })
                    }
                    disabled={!draftConfig.antiRaidEnabled || resourcesLoading}
                    placeholder={
                      resourcesLoading
                        ? "Loading roles..."
                        : roleOptions.length
                        ? "Select quarantine role"
                        : "No roles found"
                    }
                    options={roleOptions}
                  />
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.15fr 0.85fr",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <Radar size={16} />
                    Trigger Preview
                  </div>

                  <div
                    style={{
                      color: "rgba(255,255,255,0.74)",
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    Kyro will monitor for{" "}
                    <strong>{draftConfig.joinThreshold} joins</strong> within{" "}
                    <strong>{draftConfig.joinWindow} seconds</strong>. If
                    triggered, it will run <strong>{actionLabel}</strong>
                    {selectedAlertChannelName ? (
                      <>
                        {" "}
                        and post an alert to{" "}
                        <strong>#{selectedAlertChannelName}</strong>
                      </>
                    ) : null}
                    {selectedPingRoleNames.length ? (
                      <>
                        {" "}
                        while pinging{" "}
                        <strong>
                          {selectedPingRoleNames.map((name) => `@${name}`).join(", ")}
                        </strong>
                      </>
                    ) : null}
                    {draftConfig.antiRaidAction === "quarantine" &&
                    selectedQuarantineRoleName ? (
                      <>
                        {" "}
                        using the{" "}
                        <strong>@{selectedQuarantineRoleName}</strong> role.
                      </>
                    ) : (
                      "."
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid rgba(88,101,242,0.18)",
                    background:
                      "linear-gradient(180deg, rgba(88,101,242,0.12), rgba(88,101,242,0.05))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <Sparkles size={16} />
                    Security Confidence
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <StatusPill tone={draftConfig.antiRaidEnabled ? "green" : "neutral"}>
                      {draftConfig.antiRaidEnabled
                        ? "Monitoring enabled"
                        : "Monitoring disabled"}
                    </StatusPill>

                    <StatusPill tone={draftConfig.alertChannel ? "green" : "orange"}>
                      {draftConfig.alertChannel
                        ? "Alert route selected"
                        : "No alert route"}
                    </StatusPill>

                    <StatusPill
                      tone={
                        draftConfig.antiRaidAction !== "quarantine" ||
                        draftConfig.quarantineRole
                          ? "green"
                          : "orange"
                      }
                    >
                      {draftConfig.antiRaidAction !== "quarantine" ||
                      draftConfig.quarantineRole
                        ? "Response ready"
                        : "Quarantine role missing"}
                    </StatusPill>
                  </div>
                </div>
              </div>
            </div>
          </div>

<div
  style={{
    ...panelCard,
    position: "relative",
    zIndex: 20,
    overflow: "visible",
    willChange: "transform, box-shadow",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-4px)";
    e.currentTarget.style.border =
      "1px solid rgba(88,101,242,0.45)";
    e.currentTarget.style.boxShadow =
      "0 35px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(88,101,242,0.2), 0 0 40px rgba(88,101,242,0.35)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.border =
      "1px solid rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = panelCard.boxShadow;
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
  <div style={sectionTitle}>
    <ShieldAlert size={18} />
    Suspicious Accounts
  </div>

  <span style={miniPremiumBadge}>
    Premium
  </span>
</div>
<div style={sectionDesc}>
  Flag newly created accounts, optionally detect default avatar users,
  and automatically alert, quarantine, kick, or ban based on your
  security policy.
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
        Enable Suspicious Account Detection
      </div>
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.62)",
          lineHeight: 1.6,
        }}
      >
        Detect suspicious joins based on account age and optional default-avatar
        checks.
      </div>
    </div>

    <ToggleSwitch
      checked={draftConfig.suspiciousEnabled}
      onChange={(checked) => {
  if (checked && !requireSecurityPremium()) return;
  updateDraft({ suspiciousEnabled: checked });
}}
    />
  </div>
</div>

<div
  style={{
    opacity: draftConfig.suspiciousEnabled ? 1 : 0.46,
    pointerEvents: draftConfig.suspiciousEnabled ? "auto" : "none",
    transition: "all 0.25s ease",
  }}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      marginBottom: 18,
    }}
  >
    <div>
      <FieldLabel hint="Accounts newer than this many days will be treated as suspicious.">
        Minimum Account Age (days)
      </FieldLabel>
      <NumberField
        value={draftConfig.suspiciousAccountAgeDays}
        onChange={(value) =>
          updateDraft({ suspiciousAccountAgeDays: value })
        }
        disabled={!draftConfig.suspiciousEnabled}
        min={1}
        max={365}
      />
    </div>

    <div>
      <FieldLabel hint="Choose how Kyro should respond when a suspicious account joins.">
        Protection Action
      </FieldLabel>
      <SearchableSelect
        value={draftConfig.suspiciousAction}
        onChange={(value) => updateDraft({ suspiciousAction: value })}
        disabled={!draftConfig.suspiciousEnabled}
        placeholder="Select action"
        options={[
          { value: "alert", label: "Alert Only" },
          { value: "kick", label: "Kick User" },
          { value: "ban", label: "Ban User" },
          { value: "quarantine", label: "Quarantine User" },
        ]}
      />
    </div>
  </div>

  <div
    style={{
      marginBottom: 18,
      padding: 16,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
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
        Check Default Avatar
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.58)",
          lineHeight: 1.5,
        }}
      >
        Also flag users who are still using Discord’s default avatar.
      </div>
    </div>

    <ToggleSwitch
      checked={draftConfig.suspiciousCheckDefaultAvatar}
      onChange={(checked) =>
        updateDraft({ suspiciousCheckDefaultAvatar: checked })
      }
    />
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      marginBottom: 18,
    }}
  >
    <div>
      <FieldLabel hint="Security alerts for suspicious joins will be posted here.">
        Alert Channel
      </FieldLabel>
      <SearchableSelect
        value={draftConfig.suspiciousAlertChannel}
        onChange={(value) =>
          updateDraft({ suspiciousAlertChannel: value })
        }
        disabled={!draftConfig.suspiciousEnabled || resourcesLoading}
        placeholder={
          resourcesLoading
            ? "Loading channels..."
            : channelOptions.length
            ? "Select alert channel"
            : "No text channels found"
        }
        options={channelOptions}
      />
    </div>

    <div>
      <FieldLabel hint="Select one or more roles to mention when a suspicious account is detected.">
        Ping Roles
      </FieldLabel>
      <SearchableMultiSelect
        values={draftConfig.suspiciousPingRoleIds}
        onChange={(values) =>
          updateDraft({ suspiciousPingRoleIds: values })
        }
        disabled={!draftConfig.suspiciousEnabled || resourcesLoading}
        placeholder={
          resourcesLoading
            ? "Loading roles..."
            : roleOptions.length
            ? "Select ping roles"
            : "No roles found"
        }
        options={roleOptions}
      />
    </div>
  </div>

  {draftConfig.suspiciousAction === "quarantine" ? (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel hint="Users will receive this role instead of being removed from the server.">
        Quarantine Role
      </FieldLabel>
      <SearchableSelect
        value={draftConfig.suspiciousQuarantineRole}
        onChange={(value) =>
          updateDraft({ suspiciousQuarantineRole: value })
        }
        disabled={!draftConfig.suspiciousEnabled || resourcesLoading}
        placeholder={
          resourcesLoading
            ? "Loading roles..."
            : roleOptions.length
            ? "Select quarantine role"
            : "No roles found"
        }
        options={roleOptions}
      />
    </div>
  ) : null}

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.15fr 0.85fr",
      gap: 16,
    }}
  >
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        <Radar size={16} />
        Detection Preview
      </div>

      <div
        style={{
          color: "rgba(255,255,255,0.74)",
          fontSize: 14,
          lineHeight: 1.75,
        }}
      >
        Kyro will flag accounts newer than{" "}
        <strong>{draftConfig.suspiciousAccountAgeDays} day(s)</strong>
        {draftConfig.suspiciousCheckDefaultAvatar ? (
          <>
            {" "}
            and users with the <strong>default avatar</strong>
          </>
        ) : null}
        . When detected, it will run{" "}
        <strong>
          {draftConfig.suspiciousAction === "alert"
            ? "Alert Only"
            : draftConfig.suspiciousAction === "kick"
            ? "Kick User"
            : draftConfig.suspiciousAction === "ban"
            ? "Ban User"
            : "Quarantine User"}
        </strong>
        .
      </div>
    </div>

    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(88,101,242,0.18)",
        background:
          "linear-gradient(180deg, rgba(88,101,242,0.12), rgba(88,101,242,0.05))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        <Sparkles size={16} />
        Detection Confidence
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <StatusPill tone={draftConfig.suspiciousEnabled ? "green" : "neutral"}>
          {draftConfig.suspiciousEnabled
            ? "Detection enabled"
            : "Detection disabled"}
        </StatusPill>

        <StatusPill
          tone={draftConfig.suspiciousAlertChannel ? "green" : "orange"}
        >
          {draftConfig.suspiciousAlertChannel
            ? "Alert route selected"
            : "No alert route"}
        </StatusPill>

        <StatusPill
          tone={
            draftConfig.suspiciousAction !== "quarantine" ||
            draftConfig.suspiciousQuarantineRole
              ? "green"
              : "orange"
          }
        >
          {draftConfig.suspiciousAction !== "quarantine" ||
          draftConfig.suspiciousQuarantineRole
            ? "Response ready"
            : "Quarantine role missing"}
        </StatusPill>
      </div>
    </div>
  </div>
</div>
          </div>
<div
  style={{
    ...panelCard,
    position: "relative",
    zIndex: 0,
    willChange: "transform, box-shadow",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-4px)";
    e.currentTarget.style.border =
      "1px solid rgba(88,101,242,0.35)";
    e.currentTarget.style.boxShadow =
      "0 30px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(88,101,242,0.15), 0 0 30px rgba(88,101,242,0.25)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.border =
      "1px solid rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = panelCard.boxShadow;
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
  <div style={sectionTitle}>
    <ShieldAlert size={18} />
    Anti Nuke
  </div>

  <span style={miniPremiumBadge}>
    Premium
  </span>
</div>
            <div style={sectionDesc}>
              Protect channels, roles, bans, kicks, and destructive admin actions
              using strict module based limits.
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
    }}
  >
    <div>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>
        Enable Anti Nuke
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
        Protect your server from destructive admin actions.
      </div>
    </div>

    <ToggleSwitch
      checked={draftConfig.antiNukeEnabled}
      onChange={(v) => {
  if (v && !requireSecurityPremium()) return;
  updateDraft({ antiNukeEnabled: v });
}}
    />
  </div>
</div>

<div
  style={{
    opacity: draftConfig.antiNukeEnabled ? 1 : 0.5,
    pointerEvents: draftConfig.antiNukeEnabled ? "auto" : "none",
  }}
>
  <div style={{ marginBottom: 16 }}>
    <FieldLabel>Global Punishment</FieldLabel>
    <SearchableSelect
      value={draftConfig.antiNukePunishment}
      onChange={(v) => updateDraft({ antiNukePunishment: v })}
      options={[
        { value: "quarantine", label: "Quarantine" },
        { value: "kick", label: "Kick" },
        { value: "ban", label: "Ban" },
      ]}
    />
  </div>

  <div style={{ marginBottom: 16 }}>
    <FieldLabel>Detection Timeframe (ms)</FieldLabel>
    <NumberField
      value={draftConfig.antiNukeTimeframe}
      onChange={(v) => updateDraft({ antiNukeTimeframe: v })}
    />
  </div>

  <div style={{ marginBottom: 16 }}>
    <FieldLabel>Log Channel</FieldLabel>
    <SearchableSelect
      value={draftConfig.antiNukeLogChannel}
      onChange={(v) => updateDraft({ antiNukeLogChannel: v })}
      options={channelOptions}
    />
  </div>

  <div style={{ marginBottom: 16 }}>
    <FieldLabel>Quarantine Role</FieldLabel>
    <SearchableSelect
      value={draftConfig.antiNukeQuarantineRole}
      onChange={(v) =>
        updateDraft({ antiNukeQuarantineRole: v })
      }
      options={roleOptions}
    />
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      marginBottom: 18,
    }}
  >
    <div>
      <FieldLabel hint="Trusted role holders will be ignored by Anti Nuke. Use this for admins, managers, and senior staff.">
        Trusted Roles / Whitelist Roles
      </FieldLabel>
      <SearchableMultiSelect
        values={draftConfig.antiNukeWhitelistRoleIds}
        onChange={(values) =>
          updateDraft({ antiNukeWhitelistRoleIds: values })
        }
        disabled={!draftConfig.antiNukeEnabled || resourcesLoading}
        placeholder={
          resourcesLoading
            ? "Loading roles..."
            : roleOptions.length
            ? "Select trusted roles"
            : "No roles found"
        }
        options={roleOptions}
      />
    </div>

    <div>
      <FieldLabel hint="Paste Discord user IDs for trusted users who should bypass Anti-Nuke. Separate multiple IDs with commas.">
        Trusted Users / Whitelist Users
      </FieldLabel>
      <input
        type="text"
        value={draftConfig.antiNukeWhitelistUserIds.join(", ")}
        onChange={(e) =>
          updateDraft({
            antiNukeWhitelistUserIds: e.target.value
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean),
          })
        }
        placeholder="123456789012345678, 987654321098765432"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: !draftConfig.antiNukeEnabled
            ? "rgba(255,255,255,0.035)"
            : "rgba(255,255,255,0.055)",
          color: !draftConfig.antiNukeEnabled
            ? "rgba(255,255,255,0.45)"
            : "#fff",
          outline: "none",
          fontSize: 14,
          transition: "all 0.2s ease",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
        disabled={!draftConfig.antiNukeEnabled}
      />
    </div>
  </div>

  <div style={{ marginTop: 20 }}>
    <div style={{ fontWeight: 800, marginBottom: 10 }}>
      Module Limits
    </div>

    {[
      ["Channel Delete", "antiNukeChannelDeleteEnabled", "antiNukeChannelDeleteLimit"],
      ["Channel Create", "antiNukeChannelCreateEnabled", "antiNukeChannelCreateLimit"],
      ["Role Delete", "antiNukeRoleDeleteEnabled", "antiNukeRoleDeleteLimit"],
      ["Role Create", "antiNukeRoleCreateEnabled", "antiNukeRoleCreateLimit"],
      ["Role Update", "antiNukeRoleUpdateEnabled", "antiNukeRoleUpdateLimit"],
      ["Ban", "antiNukeBanEnabled", "antiNukeBanLimit"],
      ["Kick", "antiNukeKickEnabled", "antiNukeKickLimit"],
   ].map(([label, toggleKey, limitKey]) => (
      <div
        key={label}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span>{label}</span>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ToggleSwitch
            checked={draftConfig[toggleKey]}
            onChange={(v) => updateDraft({ [toggleKey]: v })}
          />

          <input
            type="number"
            value={draftConfig[limitKey]}
            onChange={(e) =>
              updateDraft({ [limitKey]: Number(e.target.value) })
            }
            style={{
              width: 60,
              padding: "6px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
            }}
          />
        </div>
      </div>
    ))}
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
                Security Summary
              </div>

              <StatusPill tone={isConfigured ? "green" : "orange"}>
                {isConfigured ? "Protected" : "Needs setup"}
              </StatusPill>
            </div>

            <div style={statRow}>
              <span>Anti Raid</span>
              <span
                style={{
                  color: draftConfig.antiRaidEnabled
                    ? "#c8ffe1"
                    : "rgba(255,255,255,0.75)",
                }}
              >
                {draftConfig.antiRaidEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div style={statRow}>
              <span>Protection Action</span>
              <span style={{ color: "rgba(255,255,255,0.78)" }}>
                {actionLabel}
              </span>
            </div>

            <div style={statRow}>
              <span>Trigger Rule</span>
              <span style={{ color: "rgba(255,255,255,0.78)" }}>
                {draftConfig.joinThreshold}/{draftConfig.joinWindow}s
              </span>
            </div>

            <div style={statRow}>
              <span>Alert Channel</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.78)",
                  textAlign: "right",
                }}
              >
                {selectedAlertChannelName
                  ? `#${selectedAlertChannelName}`
                  : "Not selected"}
              </span>
            </div>

           <div style={statRow}>
  <span>Ping Roles</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
      maxWidth: 180,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}
  >
    {selectedPingRoleNames.length
      ? selectedPingRoleNames.map((name) => `@${name}`).join(", ")
      : "None"}
  </span>
</div>

<div style={statRow}>
  <span>Quarantine Role</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.antiRaidAction === "quarantine"
      ? selectedQuarantineRoleName
        ? `@${selectedQuarantineRoleName}`
        : "Required"
      : "Not needed"}
  </span>
</div>

<div style={statRow}>
  <span>Suspicious Accounts</span>
  <span
    style={{
      color: draftConfig.suspiciousEnabled
        ? "#c8ffe1"
        : "rgba(255,255,255,0.75)",
      textAlign: "right",
    }}
  >
    {draftConfig.suspiciousEnabled ? "Enabled" : "Disabled"}
  </span>
</div>

<div style={statRow}>
  <span>Min Age Rule</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.suspiciousAccountAgeDays} day(s)
  </span>
</div>

<div style={statRow}>
  <span>Default Avatar Check</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.suspiciousCheckDefaultAvatar ? "Enabled" : "Disabled"}
  </span>
</div>

<div style={statRow}>
  <span>Suspicious Action</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.suspiciousAction === "alert"
      ? "Alert Only"
      : draftConfig.suspiciousAction === "kick"
      ? "Kick User"
      : draftConfig.suspiciousAction === "ban"
      ? "Ban User"
      : "Quarantine User"}
  </span>
</div>

<div style={statRow}>
  <span>Anti Nuke</span>
  <span
    style={{
      color: draftConfig.antiNukeEnabled
        ? "#c8ffe1"
        : "rgba(255,255,255,0.75)",
      textAlign: "right",
    }}
  >
    {draftConfig.antiNukeEnabled ? "Enabled" : "Disabled"}
  </span>
</div>

<div style={statRow}>
  <span>Anti Nuke Punishment</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.antiNukePunishment === "quarantine"
      ? "Quarantine"
      : draftConfig.antiNukePunishment === "kick"
      ? "Kick"
      : "Ban"}
  </span>
</div>

<div style={statRow}>
  <span>Trusted Roles</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.antiNukeWhitelistRoleIds.length}
  </span>
</div>

<div style={{ ...statRow, borderBottom: "none" }}>
  <span>Trusted Users</span>
  <span
    style={{
      color: "rgba(255,255,255,0.78)",
      textAlign: "right",
    }}
  >
    {draftConfig.antiNukeWhitelistUserIds.length}
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
Security Status
              </div>

           Kyro is actively protecting this server. Anti Raid is <strong>{draftConfig.antiRaidEnabled ? "enabled" : "disabled"}</strong>, Suspicious Accounts are <strong>{draftConfig.suspiciousEnabled ? "enabled" : "disabled"}</strong>, and Anti Nuke is <strong>{draftConfig.antiNukeEnabled ? "enabled" : "disabled"}</strong>.
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
                <Lock size={15} />
                Protection Coverage
              </div>
              Kyro is actively monitoring for rapid join spikes, newly created or suspicious accounts, and destructive moderator actions such as mass bans, role changes, and channel deletions.
            </div>
          </div>
        </div>
      </div>

  <SecurityFloatingBar
  visible={isDirty}
  onSave={handleSave}
  onCancel={handleCancel}
  saving={configSaving}
/>
    </div>
  );
}

