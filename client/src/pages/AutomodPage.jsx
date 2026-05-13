import { useEffect, useMemo, useRef, useState } from "react";
import PageLoader from "../components/PageLoader";
import API_BASE from "../config/api";
import {
  Shield,
  Link,
  BadgeAlert,
  MessageSquareWarning,
  MessagesSquare,
  AtSign,
  Smile,
  Type,
  X,
  Check,
} from "lucide-react";

const ACTION_OPTIONS = [
  {
    value: "block",
    label: "Block Message",
    description: "Delete or block the violating message immediately.",
  },
  {
    value: "warn",
    label: "Warn Member",
    description: "Warn the member and log the moderation action.",
  },
  {
    value: "timeout",
    label: "Timeout Member",
    description: "Temporarily prevent the member from sending messages.",
  },
];

const RULE_DEFINITIONS = [
  {
    key: "antiSpam",
    title: "Spam",
    description: "Detect repeated messages sent too quickly.",
    icon: MessageSquareWarning,
  },
  {
    key: "badWords",
    title: "Bad Words",
    description: "Block messages containing blacklisted words.",
    icon: BadgeAlert,
  },
  {
    key: "antiInvites",
    title: "Discord Invites",
    description: "Block Discord invite links from being shared.",
    icon: Link,
  },
  {
    key: "antiLinks",
    title: "Links",
    description: "Block external links or unwanted URLs.",
    icon: Link,
  },
  {
    key: "capsSpam",
    title: "Caps Spam",
    description: "Detect messages with too many capital letters.",
    icon: Type,
  },
  {
    key: "emojiSpam",
    title: "Emoji Spam",
    description: "Detect excessive emoji usage in messages.",
    icon: Smile,
  },
  {
    key: "mentionSpam",
    title: "Mention Spam",
    description: "Detect too many mentions in one message burst.",
    icon: AtSign,
  },
  {
    key: "massPing",
    title: "Mass Mention",
    description: "Block messages that ping too many users.",
    icon: MessagesSquare,
  },
];

function createDefaultRules() {
  const baseRule = {
    enabled: false,
    actionMode: "direct",
    action: "block",
    duration: 10,
    notify: {
      channel: true,
      dm: false,
    },
    warnings: {
      enabled: false,
      maxWarnings: 3,
      punishment: "timeout",
      timeoutDuration: 10,
      expiryHours: 24,
    },
    ignoredChannels: [],
    ignoredRoles: [],
  };

  return {
    antiSpam: {
      ...baseRule,
      threshold: 5,
      interval: 5,
    },
    badWords: {
      ...baseRule,
      blockedWords: [],
      matchPartialWords: false,
    },
    antiInvites: {
      ...baseRule,
    },
    antiLinks: {
      ...baseRule,
    },
    capsSpam: {
      ...baseRule,
      minLength: 8,
      percentage: 70,
    },
    emojiSpam: {
      ...baseRule,
      threshold: 8,
    },
    mentionSpam: {
      ...baseRule,
      threshold: 5,
      interval: 10,
    },
    massPing: {
      ...baseRule,
      threshold: 5,
      interval: 10,
    },
  };
}

function createDefaultAutomodConfig() {
  return {
    enabled: false,
    ignoredChannels: [],
    ignoredRoles: [],
    rules: createDefaultRules(),
  };
}

function normalizeAutomodClientPayload(payload = {}) {
  const defaults = createDefaultAutomodConfig();

  return {
    enabled: payload.enabled ?? defaults.enabled,
    ignoredChannels: Array.isArray(payload.ignoredChannels)
      ? payload.ignoredChannels.filter(Boolean).map(String)
      : [],
    ignoredRoles: Array.isArray(payload.ignoredRoles)
      ? payload.ignoredRoles.filter(Boolean).map(String)
      : [],
    rules: {
      antiSpam: {
        ...defaults.rules.antiSpam,
        ...(payload.rules?.antiSpam || {}),
        ignoredChannels: Array.isArray(payload.rules?.antiSpam?.ignoredChannels)
          ? payload.rules.antiSpam.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.antiSpam.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.antiSpam?.ignoredRoles)
          ? payload.rules.antiSpam.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.antiSpam.ignoredRoles,
      },
      badWords: {
        ...defaults.rules.badWords,
        ...(payload.rules?.badWords || {}),
        blockedWords: Array.isArray(payload.rules?.badWords?.blockedWords)
          ? payload.rules.badWords.blockedWords.filter(Boolean).map(String)
          : defaults.rules.badWords.blockedWords,
        ignoredChannels: Array.isArray(payload.rules?.badWords?.ignoredChannels)
          ? payload.rules.badWords.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.badWords.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.badWords?.ignoredRoles)
          ? payload.rules.badWords.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.badWords.ignoredRoles,
      },
      antiInvites: {
        ...defaults.rules.antiInvites,
        ...(payload.rules?.antiInvites || {}),
        ignoredChannels: Array.isArray(payload.rules?.antiInvites?.ignoredChannels)
          ? payload.rules.antiInvites.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.antiInvites.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.antiInvites?.ignoredRoles)
          ? payload.rules.antiInvites.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.antiInvites.ignoredRoles,
      },
      antiLinks: {
        ...defaults.rules.antiLinks,
        ...(payload.rules?.antiLinks || {}),
        ignoredChannels: Array.isArray(payload.rules?.antiLinks?.ignoredChannels)
          ? payload.rules.antiLinks.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.antiLinks.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.antiLinks?.ignoredRoles)
          ? payload.rules.antiLinks.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.antiLinks.ignoredRoles,
      },
      capsSpam: {
        ...defaults.rules.capsSpam,
        ...(payload.rules?.capsSpam || {}),
        ignoredChannels: Array.isArray(payload.rules?.capsSpam?.ignoredChannels)
          ? payload.rules.capsSpam.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.capsSpam.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.capsSpam?.ignoredRoles)
          ? payload.rules.capsSpam.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.capsSpam.ignoredRoles,
      },
      emojiSpam: {
        ...defaults.rules.emojiSpam,
        ...(payload.rules?.emojiSpam || {}),
        ignoredChannels: Array.isArray(payload.rules?.emojiSpam?.ignoredChannels)
          ? payload.rules.emojiSpam.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.emojiSpam.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.emojiSpam?.ignoredRoles)
          ? payload.rules.emojiSpam.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.emojiSpam.ignoredRoles,
      },
      mentionSpam: {
        ...defaults.rules.mentionSpam,
        ...(payload.rules?.mentionSpam || {}),
        ignoredChannels: Array.isArray(payload.rules?.mentionSpam?.ignoredChannels)
          ? payload.rules.mentionSpam.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.mentionSpam.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.mentionSpam?.ignoredRoles)
          ? payload.rules.mentionSpam.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.mentionSpam.ignoredRoles,
      },
      massPing: {
        ...defaults.rules.massPing,
        ...(payload.rules?.massPing || {}),
        ignoredChannels: Array.isArray(payload.rules?.massPing?.ignoredChannels)
          ? payload.rules.massPing.ignoredChannels.filter(Boolean).map(String)
          : defaults.rules.massPing.ignoredChannels,
        ignoredRoles: Array.isArray(payload.rules?.massPing?.ignoredRoles)
          ? payload.rules.massPing.ignoredRoles.filter(Boolean).map(String)
          : defaults.rules.massPing.ignoredRoles,
      },
    },
  };
}

async function parseJsonSafely(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const preview = text.slice(0, 160).trim();
    throw new Error(
      preview.startsWith("<!DOCTYPE") || preview.startsWith("<html")
        ? "Dashboard backend returned HTML instead of JSON. Restart the backend and make sure /api/guilds/:guildId/automod exists."
        : "Received an invalid response from the server."
    );
  }
}

function showToastMessage(setLocalToast, setGlobalToast, payload) {
  setLocalToast(payload);
  if (typeof setGlobalToast === "function") {
    setGlobalToast(payload);
  }
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 54,
        minWidth: 54,
        height: 30,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "#4ade80" : "rgba(255,255,255,0.18)",
        position: "relative",
        transition: "all 0.2s ease",
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
        boxShadow: checked
          ? "0 0 0 1px rgba(74,222,128,0.25), 0 8px 18px rgba(74,222,128,0.25)"
          : "inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 27 : 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

function RuleActionCard({ selected, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        padding: "16px 18px",
        border: selected
          ? "1px solid rgba(88,101,242,0.55)"
          : "1px solid rgba(255,255,255,0.07)",
        background: selected
          ? "linear-gradient(180deg, rgba(88,101,242,0.16), rgba(88,101,242,0.08))"
          : "rgba(255,255,255,0.025)",
        color: "#fff",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "#5865F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 18px rgba(88,101,242,0.35)",
          }}
        >
          <Check size={12} />
        </div>
      )}

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.62)",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </button>
  );
}
function SelectCard({ selected, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        padding: "16px 18px",
        border: selected
          ? "1px solid rgba(88,101,242,0.55)"
          : "1px solid rgba(255,255,255,0.07)",
        background: selected
          ? "linear-gradient(180deg, rgba(88,101,242,0.16), rgba(88,101,242,0.08))"
          : "rgba(255,255,255,0.025)",
        color: "#fff",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "#5865F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 18px rgba(88,101,242,0.35)",
          }}
        >
          <Check size={12} />
        </div>
      )}

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.5 }}>
        {description}
      </div>
    </button>
  );
}

function RuleEditModal({
  open,
  ruleKey,
  ruleLabel,
  draft,
  setDraft,
  onClose,
  onSave,
  channelOptions,
  roleOptions,
  disableActions = false,
}) {
  if (!open || !draft) return null;
const [blockedWordsInput, setBlockedWordsInput] = useState("");

useEffect(() => {
  if (open) {
    setBlockedWordsInput((draft?.blockedWords || []).join(", "));
  }
}, [open, ruleKey]);
  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateNotify = (patch) => {
  setDraft((prev) => ({
    ...prev,
    notify: {
      ...(prev.notify || {}),
      ...patch,
    },
  }));
};

const updateWarnings = (patch) => {
  setDraft((prev) => ({
    ...prev,
    warnings: {
      ...(prev.warnings || {}),
      ...patch,
    },
  }));
};

  const renderRuleSpecificFields = () => {
    if (
      ruleKey === "antiSpam" ||
      ruleKey === "mentionSpam" ||
      ruleKey === "massPing"
    ) {
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <label style={labelStyle}>Threshold</label>
            <input
              type="number"
              min="1"
              value={draft.threshold ?? ""}
              onChange={(e) =>
                updateDraft({ threshold: Number(e.target.value || 0) })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Interval (seconds)</label>
            <input
              type="number"
              min="1"
              value={draft.interval ?? ""}
              onChange={(e) =>
                updateDraft({ interval: Number(e.target.value || 0) })
              }
              style={inputStyle}
            />
          </div>
        </div>
      );
    }

    if (ruleKey === "badWords") {
      return (
        <>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Blocked Words</label>
<input
  type="text"
  value={blockedWordsInput}
  onChange={(e) => {
    const raw = e.target.value;
    setBlockedWordsInput(raw);

    updateDraft({
      blockedWords: raw
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean),
    });
  }}
  placeholder="scam, abuse, toxic-word"
  style={inputStyle}
/>
            <div style={helperStyle}>
              Separate words with commas. These words will be blocked by automod.
            </div>
          </div>

          <div style={toggleRowStyle}>
            <div>
              <div style={toggleTitleStyle}>Match partial words</div>
              <div style={helperStyle}>
                Enable this if blocked words should also match inside longer
                words.
              </div>
            </div>
            <Toggle
              checked={Boolean(draft.matchPartialWords)}
              onChange={(value) => updateDraft({ matchPartialWords: value })}
              disabled={disableActions}
            />
          </div>
        </>
      );
    }

    if (ruleKey === "capsSpam") {
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <label style={labelStyle}>Minimum Length</label>
            <input
              type="number"
              min="1"
              value={draft.minLength ?? ""}
              onChange={(e) =>
                updateDraft({ minLength: Number(e.target.value || 0) })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Caps Percentage</label>
            <input
              type="number"
              min="1"
              max="100"
              value={draft.percentage ?? ""}
              onChange={(e) =>
                updateDraft({ percentage: Number(e.target.value || 0) })
              }
              style={inputStyle}
            />
          </div>
        </div>
      );
    }

    if (ruleKey === "emojiSpam") {
      return (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Emoji Threshold</label>
          <input
            type="number"
            min="1"
            value={draft.threshold ?? ""}
            onChange={(e) =>
              updateDraft({ threshold: Number(e.target.value || 0) })
            }
            style={inputStyle}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div
        style={modalCardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={modalHeaderStyle}>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {ruleLabel}
            </div>
            <div
              style={{
                marginTop: 6,
                color: "rgba(255,255,255,0.55)",
                fontSize: 13,
              }}
            >
              Configure how Kyro should handle this moderation rule.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={modalCloseButtonStyle}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {renderRuleSpecificFields()}

          <div style={{ marginBottom: 18 }}>
  <div style={sectionTitleStyle}>Handling Mode</div>
  <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
    <SelectCard
      selected={(draft.actionMode || "direct") === "direct"}
      label="Direct Action"
      description="Apply block, warn, or timeout immediately when this rule is triggered."
      onClick={() => updateDraft({ actionMode: "direct" })}
    />
    <SelectCard
      selected={draft.actionMode === "warnings"}
      label="Warning System"
      description="Warn members first, then punish them after repeated violations."
      onClick={() =>
        updateDraft({
          actionMode: "warnings",
          warnings: {
            ...(draft.warnings || {}),
            enabled: true,
          },
        })
      }
    />
  </div>

  {(draft.actionMode || "direct") === "direct" ? (
    <>
      <div style={sectionTitleStyle}>Choose the Response</div>
      <div style={{ display: "grid", gap: 12 }}>
        {ACTION_OPTIONS.map((option) => (
          <RuleActionCard
            key={option.value}
            selected={draft.action === option.value}
            label={option.label}
            description={option.description}
            onClick={() => updateDraft({ action: option.value })}
          />
        ))}
      </div>

      {draft.action === "timeout" && (
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Timeout Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={draft.duration ?? 10}
            onChange={(e) =>
              updateDraft({ duration: Number(e.target.value || 1) })
            }
            style={inputStyle}
          />
        </div>
      )}
    </>
  ) : (
    <>
      <div style={sectionTitleStyle}>Warning System</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={labelStyle}>Max Warnings Before Punishment</label>
          <input
            type="number"
            min="1"
            value={draft.warnings?.maxWarnings ?? 3}
            onChange={(e) =>
              updateWarnings({ maxWarnings: Number(e.target.value || 1) })
            }
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Warning Expiry (hours)</label>
          <input
            type="number"
            min="1"
            value={draft.warnings?.expiryHours ?? 24}
            onChange={(e) =>
              updateWarnings({ expiryHours: Number(e.target.value || 1) })
            }
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Punishment After Max Warnings</label>
      <select
  value={draft.warnings?.punishment ?? "timeout"}
  onChange={(e) => updateWarnings({ punishment: e.target.value })}
  style={selectStyle}
>
  <option style={selectOptionStyle} value="timeout">Timeout</option>
  <option style={selectOptionStyle} value="kick">Kick</option>
  <option style={selectOptionStyle} value="ban">Ban</option>
</select>
      </div>

      {draft.warnings?.punishment === "timeout" && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Timeout Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={draft.warnings?.timeoutDuration ?? 10}
            onChange={(e) =>
              updateWarnings({
                timeoutDuration: Number(e.target.value || 1),
              })
            }
            style={inputStyle}
          />
        </div>
      )}

      <div style={sectionTitleStyle}>Warning Notifications</div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={toggleRowStyle}>
          <div>
            <div style={toggleTitleStyle}>Send warning in channel</div>
            <div style={helperStyle}>
              Show a visible automod warning message in the channel.
            </div>
          </div>
          <Toggle
            checked={draft.notify?.channel ?? true}
            onChange={(value) => updateNotify({ channel: value })}
          />
        </div>

        <div style={toggleRowStyle}>
          <div>
            <div style={toggleTitleStyle}>Send warning in DM</div>
            <div style={helperStyle}>
              Send the member a private warning message in direct messages.
            </div>
          </div>
          <Toggle
            checked={draft.notify?.dm ?? false}
            onChange={(value) => updateNotify({ dm: value })}
          />
        </div>
      </div>
    </>
  )}
</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <MultiSelectDropdown
              label="Ignored Channels"
              placeholder="Select channels..."
              options={channelOptions}
              selected={draft.ignoredChannels || []}
              onChange={(values) => updateDraft({ ignoredChannels: values })}
            />

            <MultiSelectDropdown
              label="Ignored Roles"
              placeholder="Select roles..."
              options={roleOptions}
              selected={draft.ignoredRoles || []}
              onChange={(values) => updateDraft({ ignoredRoles: values })}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.42)",
              lineHeight: 1.6,
              paddingTop: 6,
            }}
          >
            Members with Administrator or Manage Server permissions are excluded
            from automod rules by default.
          </div>
        </div>

        <div style={modalFooterStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="button" onClick={onSave} style={primaryButtonStyle}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function MultiSelectDropdown({
  label,
  placeholder,
  options = [],
  selected = [],
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItems = options.filter((option) =>
    selected.includes(option.value)
  );

  function toggleValue(value) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function removeValue(value) {
    onChange(selected.filter((item) => item !== value));
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {label ? <label style={labelStyle}>{label}</label> : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={multiSelectTriggerStyle}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <span key={item.value} style={multiSelectChipStyle}>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  {item.label}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(item.value);
                  }}
                  style={multiSelectChipCloseStyle}
                >
                  ×
                </span>
              </span>
            ))
          ) : (
            <span style={{ color: "rgba(255,255,255,0.42)" }}>{placeholder}</span>
          )}
        </div>

        <span
          style={{
            color: "rgba(255,255,255,0.58)",
            fontSize: 16,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div style={multiSelectMenuStyle}>
          {options.length ? (
            options.map((option) => {
              const isSelected = selected.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  style={{
                    ...multiSelectOptionStyle,
                    background: isSelected
                      ? "rgba(88,101,242,0.16)"
                      : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: isSelected
                        ? "#dbe3ff"
                        : "rgba(255,255,255,0.84)",
                    }}
                  >
                    {option.label}
                  </span>

                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: isSelected
                        ? "1px solid rgba(88,101,242,0.9)"
                        : "1px solid rgba(255,255,255,0.16)",
                      background: isSelected ? "#5865F2" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </button>
              );
            })
          ) : (
            <div
              style={{
                padding: "12px 10px",
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
              }}
            >
              No options available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AutomodPage({
  selectedGuild,
  guildId,
  setGlobalToast,
}) {
  const [automodEnabled, setAutomodEnabled] = useState(false);
  const [rules, setRules] = useState(createDefaultRules());
  const [ignoredChannels, setIgnoredChannels] = useState([]);
  const [ignoredRoles, setIgnoredRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeRuleKey, setActiveRuleKey] = useState(null);
  const [draftRule, setDraftRule] = useState(null);
  const [savedConfig, setSavedConfig] = useState(createDefaultAutomodConfig());
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  useEffect(() => {
    if (!localToast) return;

    const timer = setTimeout(() => {
      setLocalToast(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [localToast]);

  useEffect(() => {
    if (!guildId) return;

    async function fetchGuildData() {
      try {
        const [channelsRes, rolesRes] = await Promise.all([
          fetch(`${API_BASE}/api/guilds/${guildId}/channels`),
          fetch(`${API_BASE}/api/guilds/${guildId}/roles`),
        ]);

        const channelsData = await parseJsonSafely(channelsRes);
        const rolesData = await parseJsonSafely(rolesRes);

        const safeChannels = Array.isArray(channelsData)
          ? channelsData
          : Array.isArray(channelsData?.channels)
          ? channelsData.channels
          : [];

        const safeRoles = Array.isArray(rolesData)
          ? rolesData
          : Array.isArray(rolesData?.roles)
          ? rolesData.roles
          : [];

        const filteredChannels = safeChannels
          .filter((c) => c && c.id && c.name)
          .map((c) => ({
            value: c.id,
            label: `# ${c.name}`,
          }));

        const filteredRoles = safeRoles
          .filter((r) => r && r.name && r.name !== "@everyone")
          .map((r) => ({
            value: r.id,
            label: r.name,
          }));

        setChannels(filteredChannels);
        setRoles(filteredRoles);
      } catch (error) {
        console.error("Automod resources fetch error:", error);
        setChannels([]);
        setRoles([]);

        showToastMessage(setLocalToast, setGlobalToast, {
          type: "error",
          message: "Failed to load channels and roles.",
        });
      }
    }

    fetchGuildData();
  }, [guildId, setGlobalToast]);

  useEffect(() => {
    if (!guildId) return;

    async function fetchAutomodConfig() {
      try {
        setIsLoadingConfig(true);

        const response = await fetch(
          `${API_BASE}/api/guilds/${guildId}/automod`
        );
        const data = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load automod config");
        }

        const normalized = normalizeAutomodClientPayload(data?.automod || {});

        setAutomodEnabled(normalized.enabled);
        setIgnoredChannels(normalized.ignoredChannels);
        setIgnoredRoles(normalized.ignoredRoles);
        setRules(normalized.rules);
        setSavedConfig(normalized);
      } catch (error) {
        console.error("Failed to fetch automod config:", error);

        const fallback = createDefaultAutomodConfig();
        setAutomodEnabled(fallback.enabled);
        setIgnoredChannels(fallback.ignoredChannels);
        setIgnoredRoles(fallback.ignoredRoles);
        setRules(fallback.rules);
        setSavedConfig(fallback);

        showToastMessage(setLocalToast, setGlobalToast, {
          type: "error",
          message: error.message || "Failed to load automod settings.",
        });
      } finally {
        setIsLoadingConfig(false);
      }
    }

    fetchAutomodConfig();
  }, [guildId, setGlobalToast]);

  const currentConfig = useMemo(
    () =>
      normalizeAutomodClientPayload({
        enabled: automodEnabled,
        ignoredChannels,
        ignoredRoles,
        rules,
      }),
    [automodEnabled, ignoredChannels, ignoredRoles, rules]
  );

  const hasChanges =
    JSON.stringify(currentConfig) !== JSON.stringify(savedConfig);

  const activeRuleDefinition = useMemo(
    () => RULE_DEFINITIONS.find((rule) => rule.key === activeRuleKey),
    [activeRuleKey]
  );

  const openRuleEditor = (ruleKey) => {
    setActiveRuleKey(ruleKey);
    setDraftRule({ ...rules[ruleKey] });
  };

  const closeRuleEditor = () => {
    setActiveRuleKey(null);
    setDraftRule(null);
  };

  const saveRuleEditor = () => {
    if (!activeRuleKey || !draftRule) return;

    setRules((prev) => ({
      ...prev,
      [activeRuleKey]: { ...draftRule },
    }));

    closeRuleEditor();
  };

  const handleCancelChanges = () => {
    const restored = normalizeAutomodClientPayload(savedConfig);

    setAutomodEnabled(restored.enabled);
    setIgnoredChannels(restored.ignoredChannels);
    setIgnoredRoles(restored.ignoredRoles);
    setRules(restored.rules);
    closeRuleEditor();

    showToastMessage(setLocalToast, setGlobalToast, {
      type: "success",
      message: "Automod changes were reverted.",
    });
  };

  const handleSaveChanges = async () => {
    if (!guildId) {
      showToastMessage(setLocalToast, setGlobalToast, {
        type: "error",
        message: "No guild selected.",
      });
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `${API_BASE}/api/guilds/${guildId}/automod`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(currentConfig),
        }
      );

      const data = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save automod config");
      }

      const normalized = normalizeAutomodClientPayload(
        data?.automod || currentConfig
      );

      setSavedConfig(normalized);
      setAutomodEnabled(normalized.enabled);
      setIgnoredChannels(normalized.ignoredChannels);
      setIgnoredRoles(normalized.ignoredRoles);
      setRules(normalized.rules);

      showToastMessage(setLocalToast, setGlobalToast, {
        type: "success",
        message: "Automod settings saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save automod config:", error);

      showToastMessage(setLocalToast, setGlobalToast, {
        type: "error",
        message: error.message || "Failed to save automod settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSummary = (ruleKey, config) => {
    if (!config.enabled) return "Disabled";

    if (ruleKey === "antiSpam") {
      return `${config.threshold || 5} msgs / ${config.interval || 5}s`;
    }

    if (ruleKey === "badWords") {
      return `${(config.blockedWords || []).length} blocked words`;
    }

    if (ruleKey === "capsSpam") {
      return `${config.percentage || 70}% caps threshold`;
    }

    if (ruleKey === "emojiSpam") {
      return `${config.threshold || 8} emoji threshold`;
    }

    if (ruleKey === "mentionSpam" || ruleKey === "massPing") {
      return `${config.threshold || 5} mentions / ${config.interval || 10}s`;
    }

    return (
      ACTION_OPTIONS.find((item) => item.value === config.action)?.label ||
      "Configured"
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(88,101,242,0.10), transparent 28%), #0b0f19",
        padding: "32px 28px 96px",
        position: "relative",
      }}
    >
      {localToast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(7,18,38,0.96)",
            backdropFilter: "blur(10px)",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
            border:
              localToast.type === "success"
                ? "1px solid rgba(52,211,153,0.30)"
                : "1px solid rgba(248,113,113,0.30)",
            maxWidth: 360,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              flexShrink: 0,
              background:
                localToast.type === "success" ? "#34d399" : "#f87171",
            }}
          />
          <span>{localToast.message}</span>
        </div>
      )}

      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
      {isLoadingConfig && (
  <PageLoader
    title="Loading auto moderation..."
    subtitle="Preparing anti-spam, bad words, links, caps, emoji, and punishment settings."
    compact
  />
)}

        <div style={heroCardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={heroIconWrapStyle}>
              <Shield size={28} />
            </div>

            <div>
              <div style={heroTitleStyle}>Auto Moderation</div>
              <div style={heroTextStyle}>
                Protect your server with message-based moderation rules like
                spam, links, invites, bad words, caps abuse, emoji spam, and
                mention abuse.
              </div>
            </div>
          </div>

          <div style={heroStatusWrapStyle}>
            <div style={{ textAlign: "right" }}>
              <div style={heroStatusLabelStyle}>Automod Status</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: 700,
                  color: automodEnabled ? "#4ade80" : "#fff",
                }}
              >
                {automodEnabled ? "Enabled" : "Disabled"}
              </div>
            </div>

            <Toggle
              checked={automodEnabled}
              onChange={setAutomodEnabled}
              disabled={isLoadingConfig}
            />
          </div>
        </div>

        <div style={ruleGridStyle}>
          {RULE_DEFINITIONS.map((rule) => {
            const Icon = rule.icon;
            const config = rules[rule.key];

            return (
              <div
                key={rule.key}
                style={ruleCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 22px 48px rgba(0,0,0,0.34)";
                  e.currentTarget.style.border =
                    "1px solid rgba(88,101,242,0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow =
                    "0 16px 40px rgba(0,0,0,0.28)";
                  e.currentTarget.style.border =
                    "1px solid rgba(255,255,255,0.07)";
                }}
              >
                <div style={ruleCardTopStyle}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={ruleIconWrapStyle}>
                      <Icon size={20} />
                    </div>

                    <div>
                      <div style={ruleTitleStyle}>{rule.title}</div>
                      <div style={ruleDescriptionStyle}>{rule.description}</div>
                    </div>
                  </div>

                  <Toggle
                    checked={Boolean(config.enabled)}
                    onChange={(value) =>
                      setRules((prev) => ({
                        ...prev,
                        [rule.key]: {
                          ...prev[rule.key],
                          enabled: value,
                        },
                      }))
                    }
                    disabled={isLoadingConfig}
                  />
                </div>

                <div style={ruleSummaryBoxStyle}>
                  <div style={ruleSummaryLabelStyle}>Current Rule</div>
                  <div style={ruleSummaryValueStyle}>
                    {getSummary(rule.key, config)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openRuleEditor(rule.key)}
                  style={ruleEditButtonStyle}
                >
                  Edit Rule
                </button>
              </div>
            );
          })}
        </div>

        <div style={exceptionsCardStyle}>
          <div style={exceptionsTitleStyle}>Global Exceptions</div>
          <div style={exceptionsTextStyle}>
            These channels and roles will be ignored by all automod rules.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <MultiSelectDropdown
              label="Ignored Channels"
              placeholder="Select channels..."
              options={channels}
              selected={ignoredChannels}
              onChange={setIgnoredChannels}
            />

            <MultiSelectDropdown
              label="Ignored Roles"
              placeholder="Select roles..."
              options={roles}
              selected={ignoredRoles}
              onChange={setIgnoredRoles}
            />
          </div>
        </div>
      </div>

      {hasChanges && !isLoadingConfig && (
        <div style={floatingBarStyle}>
          <div>
            <div style={floatingBarTitleStyle}>Unsaved automod changes</div>
            <div style={floatingBarTextStyle}>
              Save your moderation settings or cancel to restore the last saved
              version.
            </div>
          </div>

          <div style={floatingBarActionsStyle}>
            <button
              type="button"
              onClick={handleCancelChanges}
              disabled={isSaving}
              style={{
                ...secondaryButtonStyle,
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              style={{
                ...primaryButtonStyle,
                opacity: isSaving ? 0.75 : 1,
                cursor: isSaving ? "not-allowed" : "pointer",
                minWidth: 150,
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      <RuleEditModal
        open={Boolean(activeRuleKey)}
        ruleKey={activeRuleKey}
        ruleLabel={activeRuleDefinition?.title || "Edit Rule"}
        draft={draftRule}
        setDraft={setDraftRule}
        onClose={closeRuleEditor}
        onSave={saveRuleEditor}
        channelOptions={channels}
        roleOptions={roles}
        disableActions={isSaving}
      />
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  fontWeight: 600,
};

const sectionTitleStyle = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 12,
};

const inputStyle = {
  width: "100%",
  height: 46,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  backgroundColor: "#111827",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.12)",
};

const selectOptionStyle = {
  backgroundColor: "#111827",
  color: "#ffffff",
};

const helperStyle = {
  fontSize: 12,
  color: "rgba(255,255,255,0.45)",
  lineHeight: 1.5,
  marginTop: 8,
};

const toggleRowStyle = {
  marginBottom: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "14px 16px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const toggleTitleStyle = {
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 4,
};

const secondaryButtonStyle = {
  height: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const primaryButtonStyle = {
  height: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #5865F2, #6d7cff)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(88,101,242,0.35)",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(4,6,18,0.74)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 9999,
};

const modalCardStyle = {
  width: "100%",
  maxWidth: 720,
  maxHeight: "88vh",
  overflowY: "auto",
  borderRadius: 24,
  background:
    "linear-gradient(180deg, rgba(20,22,34,0.98), rgba(14,16,26,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const modalHeaderStyle = {
  padding: "24px 24px 18px",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const modalCloseButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const modalFooterStyle = {
  padding: 24,
  borderTop: "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};

const multiSelectTriggerStyle = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: "10px 14px",
  fontSize: 14,
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const multiSelectChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(88,101,242,0.16)",
  border: "1px solid rgba(88,101,242,0.28)",
  color: "#dbe3ff",
  fontSize: 12,
  fontWeight: 600,
  maxWidth: "100%",
};

const multiSelectChipCloseStyle = {
  cursor: "pointer",
  color: "rgba(255,255,255,0.7)",
  fontWeight: 700,
};

const multiSelectMenuStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  boxShadow: "0 20px 50px rgba(0,0,0,0.38)",
  zIndex: 200,
  maxHeight: 260,
  overflowY: "auto",
  padding: 8,
};

const multiSelectOptionStyle = {
  width: "100%",
  border: "none",
  color: "#fff",
  borderRadius: 12,
  padding: "12px 12px",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 4,
};

const loadingCardStyle = {
  marginBottom: 20,
  padding: "14px 18px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.78)",
  fontSize: 14,
  fontWeight: 600,
};

const heroCardStyle = {
  marginBottom: 28,
  padding: "26px 28px",
  borderRadius: 28,
  background:
    "linear-gradient(135deg, rgba(88,101,242,0.16), rgba(88,101,242,0.06))",
  border: "1px solid rgba(88,101,242,0.22)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
};

const heroIconWrapStyle = {
  width: 58,
  height: 58,
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(88,101,242,0.28), rgba(88,101,242,0.10))",
  border: "1px solid rgba(88,101,242,0.24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  boxShadow: "0 16px 34px rgba(88,101,242,0.22)",
};

const heroTitleStyle = {
  fontSize: 32,
  fontWeight: 800,
  color: "#fff",
  letterSpacing: "-0.03em",
};

const heroTextStyle = {
  marginTop: 6,
  fontSize: 14,
  color: "rgba(255,255,255,0.64)",
  maxWidth: 760,
  lineHeight: 1.6,
};

const heroStatusWrapStyle = {
  minWidth: 220,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 14,
};

const heroStatusLabelStyle = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(255,255,255,0.48)",
};

const ruleGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
  marginBottom: 28,
};

const ruleCardStyle = {
  borderRadius: 24,
  padding: 20,
  background:
    "linear-gradient(180deg, rgba(20,22,34,0.96), rgba(14,16,26,0.96))",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
  transition: "all 0.2s ease",
};

const ruleCardTopStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const ruleIconWrapStyle = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#dbe3ff",
  flexShrink: 0,
};

const ruleTitleStyle = {
  fontSize: 18,
  fontWeight: 800,
  color: "#fff",
  marginBottom: 6,
};

const ruleDescriptionStyle = {
  fontSize: 13,
  color: "rgba(255,255,255,0.56)",
  lineHeight: 1.5,
};

const ruleSummaryBoxStyle = {
  marginBottom: 18,
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
};

const ruleSummaryLabelStyle = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(255,255,255,0.42)",
  marginBottom: 6,
};

const ruleSummaryValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
};

const ruleEditButtonStyle = {
  width: "100%",
  height: 44,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const exceptionsCardStyle = {
  borderRadius: 28,
  padding: 24,
  background:
    "linear-gradient(180deg, rgba(20,22,34,0.96), rgba(14,16,26,0.96))",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
};

const exceptionsTitleStyle = {
  fontSize: 22,
  fontWeight: 800,
  color: "#fff",
  marginBottom: 8,
};

const exceptionsTextStyle = {
  fontSize: 14,
  color: "rgba(255,255,255,0.58)",
  lineHeight: 1.6,
  marginBottom: 20,
};

const floatingBarStyle = {
  position: "fixed",
  left: "50%",
  bottom: 24,
  transform: "translateX(-50%)",
  width: "min(720px, calc(100vw - 32px))",
  zIndex: 9998,
  borderRadius: 22,
  padding: "16px 18px",
  background: "rgba(7,18,38,0.96)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(88,101,242,0.22)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const floatingBarTitleStyle = {
  color: "#fff",
  fontSize: 15,
  fontWeight: 800,
  marginBottom: 4,
};

const floatingBarTextStyle = {
  color: "rgba(255,255,255,0.62)",
  fontSize: 13,
  lineHeight: 1.5,
};

const floatingBarActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginLeft: "auto",
};