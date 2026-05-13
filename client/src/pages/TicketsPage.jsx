import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import PageLoader from "../components/PageLoader";

import API_BASE from "../config/api";

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function CrownStrokeIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        d="M4 18L3 8l5.2 4.1L12 5l3.8 7.1L21 8l-1 10H4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6 18h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="3" cy="8" r="1.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="5" r="1.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="21" cy="8" r="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SparklesIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 14l.9 2.4L8.3 17l-2.4.9L5 20.3l-.9-2.4L1.7 17l2.4-.6L5 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function createDefaultPanel(name = "New Ticket Panel") {
  return {
    id: makeId("panel"),
    name,
    channelId: "",
    supportRoleIds: [],
    managerRoleIds: [],
    ticketTypeMode: "buttons",

    panelMessage: {
      useEmbed: true,
      title: "How can we help?",
      description:
        "Welcome to our ticket support service! If you have any issues or concerns, please use the button below.",
      color: "#5865F2",
      bannerUrl: "",
      footer: "",
    },

    ticketIntroMessage: {
      useEmbed: true,
      title: "Your ticket has been created.",
      description:
        "Please provide any additional info you deem relevant to help us answer faster.",
      color: "#5865F2",
      bannerUrl: "",
      footer: "",
    },

    options: [
      {
        id: makeId("opt"),
        label: "Open ticket",
        emoji: "📩",
        description: "Open a support ticket",
        buttonStyle: "primary",
        openCategoryId: "",
        claimedCategoryId: "",
        closedCategoryId: "",
        staffRoleId: "",
        staffRoleIds: [],
        formEnabled: false,
        formTitle: "Ticket Form",
        formQuestions: [],
      },
    ],

    transcripts: {
      enabled: false,
      channelId: "",
      sendToUserDm: false,
    },

    logs: {
      enabled: false,
      channelId: "",
    },

    behavior: {
      claimEnabled: true,
      closeEnabled: true,
      reopenEnabled: true,
      deleteEnabled: true,
      autoDeleteClosed: false,
      autoDeleteDuration: "24h",
      maxOpenTicketsPerUser: 1,
      pingStaffOnOpen: true,
    },

    sentPanel: {
      messageId: null,
      channelId: null,
      publishedAt: null,
    },
  };
}

function normalizeOption(option = {}) {
  return {
    id: option.id || makeId("opt"),
    label: option.label || "Open ticket",
    emoji: option.emoji || "📩",
    description: option.description || "",
    buttonStyle: ["primary", "secondary", "success", "danger"].includes(
      option.buttonStyle
    )
      ? option.buttonStyle
      : "primary",
    openCategoryId: option.openCategoryId || "",
    claimedCategoryId: option.claimedCategoryId || "",
    closedCategoryId: option.closedCategoryId || "",
    staffRoleId: option.staffRoleId || "",
    staffRoleIds: Array.isArray(option.staffRoleIds)
      ? option.staffRoleIds
      : option.staffRoleId
      ? [option.staffRoleId]
      : [],
    formEnabled: option.formEnabled ?? false,
    formTitle: option.formTitle || "Ticket Form",
    formQuestions: Array.isArray(option.formQuestions)
      ? option.formQuestions.map((q) => ({
          id: q.id || makeId("q"),
          label: q.label || "New question",
          type: q.type === "paragraph" ? "paragraph" : "short",
          placeholder: q.placeholder || "",
          required: q.required ?? false,
        }))
      : [],
  };
}

function normalizePanel(panel = {}) {
  const defaultPanel = createDefaultPanel(panel.name || "Main Ticket Panel");

  return {
    ...defaultPanel,
    ...panel,
    supportRoleIds: Array.isArray(panel.supportRoleIds)
      ? panel.supportRoleIds
      : [],
    managerRoleIds: Array.isArray(panel.managerRoleIds)
      ? panel.managerRoleIds
      : Array.isArray(panel.supportRoleIds)
      ? panel.supportRoleIds
      : [],
    panelMessage: {
      ...defaultPanel.panelMessage,
      ...(panel.panelMessage || {}),
      color: panel.panelMessage?.color || "#5865F2",
    },
    ticketIntroMessage: {
      ...defaultPanel.ticketIntroMessage,
      ...(panel.ticketIntroMessage || {}),
      color: panel.ticketIntroMessage?.color || "#5865F2",
    },
    options:
      Array.isArray(panel.options) && panel.options.length
        ? panel.options.map(normalizeOption)
        : defaultPanel.options.map(normalizeOption),
    transcripts: {
      ...defaultPanel.transcripts,
      ...(panel.transcripts || {}),
    },
    logs: {
      ...defaultPanel.logs,
      ...(panel.logs || {}),
    },
    behavior: {
      ...defaultPanel.behavior,
      ...(panel.behavior || {}),
    },
    sentPanel: {
      ...defaultPanel.sentPanel,
      ...(panel.sentPanel || {}),
    },
  };
}

function normalizeTicketsResponse(payload = {}) {
  return {
    enabled: payload.enabled ?? false,
    premiumTrial: {
      activatedAt: payload.premiumTrial?.activatedAt || null,
      expiresAt:
        payload.premiumTrial?.expiresAt ||
        payload.premiumTrial?.endsAt ||
        null,
      endsAt:
        payload.premiumTrial?.endsAt ||
        payload.premiumTrial?.expiresAt ||
        null,
      isActive: payload.premiumTrial?.isActive ?? false,
      hasPremium: payload.premiumTrial?.hasPremium ?? false,
      plan: payload.premiumTrial?.plan || "free",
    },
    panels: Array.isArray(payload.panels)
      ? payload.panels.map(normalizePanel)
      : [],
  };
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string") {
    return `rgba(88,101,242,${alpha})`;
  }

  let clean = hex.replace("#", "").trim();

  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (clean.length !== 6) {
    return `rgba(88,101,242,${alpha})`;
  }

  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function useOutsideClick(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleClick(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) {
        onOutside();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") onOutside();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [enabled, onOutside, ref]);
}

function SingleSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  renderPrefix,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useOutsideClick(
    wrapRef,
    () => {
      setOpen(false);
      setQuery("");
    },
    open
  );

  const selected = options.find((item) => item.id === value);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
   <div
  ref={wrapRef}
  style={{
    position: "relative",
    zIndex: open ? 99999 : 1,
  }}
>
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
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {selected ? (
            <>
              {renderPrefix ? renderPrefix(selected) : null}
              {selected.name}
            </>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.45)" }}>
              {placeholder || "Select..."}
            </span>
          )}
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
background: "#050b18",
isolation: "isolate",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              padding: 10,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "#050b18",
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

          <div
  style={{
    maxHeight: 210,
    overflowY: "auto",
    background: "#020817",
  }}
>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "11px 12px",
                cursor: "pointer",
                color: value === "" ? "#fff" : "rgba(255,255,255,0.9)",
                background:
                  value === "" ? "rgba(88,101,242,0.22)" : "#050b18",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                if (value !== "") {
                  e.currentTarget.style.background = "rgba(88,101,242,0.14)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  value === "" ? "rgba(88,101,242,0.22)" : "transparent";
              }}
            >
              {placeholder}
            </button>

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
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
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
                        : "#050b18",
                      border: "none",
                      borderBottom:
                        index !== filteredOptions.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
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
                    {renderPrefix ? renderPrefix(opt) : null}
                    {opt.name}
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

function MultiSelectDropdown({
  options,
  values,
  onChange,
  placeholder = "Select items",
  emptyText = "No items selected",
  renderPrefix,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useOutsideClick(
    wrapRef,
    () => {
      setOpen(false);
      setQuery("");
    },
    open
  );

  const selectedItems = options.filter((item) => values.includes(item.id));

const filteredOptions = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((opt) => opt.name.toLowerCase().includes(q));
}, [options, query]);

  function toggleValue(id) {
    if (values.includes(id)) {
      onChange(values.filter((item) => item !== id));
    } else {
      onChange([...values, id]);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: "48px",
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
          gap: 12,
          fontSize: 14,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          textAlign: "left",
        }}
      >
        <div
          style={{
            minHeight: "20px",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            flex: 1,
            minWidth: 0,
          }}
        >
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <span
                key={item.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "999px",
                  background: "rgba(59,130,246,0.10)",
                  border: "1px solid rgba(59,130,246,0.18)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "700",
                  maxWidth: "100%",
                }}
              >
                {renderPrefix ? renderPrefix(item) : null}
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </span>
              </span>
            ))
          ) : (
            <span style={{ color: "rgba(255,255,255,0.45)" }}>
              {placeholder}
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
            zIndex: 20000,
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.55)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Select roles
            </span>

            {values.length ? (
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                Clear
              </button>
            ) : null}
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
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const checked = values.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleValue(option.id);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "11px 12px",
                      cursor: "pointer",
                      color: checked ? "#fff" : "rgba(255,255,255,0.9)",
                      background: checked
                        ? "rgba(88,101,242,0.22)"
                        : "transparent",
                      border: "none",
                      borderBottom:
                        index !== filteredOptions.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                    onMouseEnter={(e) => {
                      if (!checked) {
                        e.currentTarget.style.background =
                          "rgba(88,101,242,0.14)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = checked
                        ? "rgba(88,101,242,0.22)"
                        : "transparent";
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        minWidth: 16,
                        color: "#60a5fa",
                        fontWeight: 800,
                      }}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    {renderPrefix ? renderPrefix(option) : null}
                    {option.name}
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

function SwitchToggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={switchTrack(checked, disabled)}
    >
      <span style={switchThumb(checked)} />
    </button>
  );
}

function StatusPill({ tone = "neutral", children }) {
  return <span style={statusPill(tone)}>{children}</span>;
}
function PremiumTag({ active = false }) {
  return (
    <span style={premiumBadge}>
      <span style={premiumBadgeIcon}>
        <CrownStrokeIcon size={12} />
      </span>
      {active ? "Active" : "Premium"}
    </span>
  );
}

function DarkNativeSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
}) {
  return (
    <div style={fieldWrap}>
      {label ? <label style={fieldLabel}>{label}</label> : null}

      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={nativeSelectStyle}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <span style={nativeSelectArrow}>▾</span>
      </div>
    </div>
  );
}
export default function TicketsPage({ selectedGuild, setGlobalToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ticketsEnabled, setTicketsEnabled] = useState(false);
 const [premiumTrial, setPremiumTrial] = useState({
  activatedAt: null,
  expiresAt: null,
  endsAt: null,
  isActive: false,
  hasPremium: false,
  plan: "free",
});

  const [panels, setPanels] = useState([]);
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");

  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);

  const [showCreatePanelModal, setShowCreatePanelModal] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [notice, setNotice] = useState("");

  const guildId = selectedGuild?.id || null;

  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.id === selectedPanelId) || null,
    [panels, selectedPanelId]
  );

  const selectedOption = useMemo(() => {
    if (!selectedPanel) return null;
    return (
      selectedPanel.options?.find((option) => option.id === selectedOptionId) ||
      selectedPanel.options?.[0] ||
      null
    );
  }, [selectedPanel, selectedOptionId]);

const trialIsActive = useMemo(() => {
  if (!premiumTrial?.isActive) return false;
  if (!premiumTrial?.expiresAt) return false;
  return new Date(premiumTrial.expiresAt).getTime() > Date.now();
}, [premiumTrial]);

const trialAlreadyUsed = useMemo(() => {
  return Boolean(premiumTrial?.activatedAt);
}, [premiumTrial]);

const premiumUnlocked = Boolean(
  premiumTrial?.hasPremium ||
    premiumTrial?.plan === "lifetime" ||
    trialIsActive
);

  const textChannels = useMemo(() => {
    if (!Array.isArray(channels)) return [];

    return channels.filter((channel) => {
      const type = channel?.type;
      return (
        type === 0 ||
        type === "GUILD_TEXT" ||
        type === "GuildText" ||
        type === "text" ||
        typeof type === "undefined"
      );
    });
  }, [channels]);

  const panelIsPublished = !!(
    selectedPanel?.sentPanel?.messageId && selectedPanel?.sentPanel?.channelId
  );

  const panelPublishLabel = panelIsPublished ? "Update Panel" : "Publish Panel";
  const panelAccent = selectedPanel?.panelMessage?.color || "#5865F2";
  const introAccent = selectedPanel?.ticketIntroMessage?.color || "#5865F2";

  useEffect(() => {
    if (!guildId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  function resolveChannelName(id) {
    return channels.find((channel) => channel.id === id)?.name || "Not selected";
  }

  function resolveCategoryName(id) {
    return categories.find((category) => category.id === id)?.name || "Not selected";
  }

  async function loadAll() {
    if (!guildId) return;

    try {
      setLoading(true);
      setNotice("");

      const [ticketsRes, channelsRes, categoriesRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE}/api/guilds/${guildId}/tickets`),
        fetch(`${API_BASE}/api/guilds/${guildId}/channels`),
        fetch(`${API_BASE}/api/guilds/${guildId}/categories`),
        fetch(`${API_BASE}/api/guilds/${guildId}/roles`),
      ]);

      const [ticketsJson, channelsJson, categoriesJson, rolesJson] =
        await Promise.all([
          ticketsRes.json(),
          channelsRes.json(),
          categoriesRes.json(),
          rolesRes.json(),
        ]);

      const tickets = normalizeTicketsResponse(ticketsJson?.tickets || {});
      const loadedPanels =
        tickets.panels.length > 0
          ? tickets.panels
          : [createDefaultPanel("Main Ticket Panel")];

      setTicketsEnabled(tickets.enabled ?? false);
      setPremiumTrial(
        tickets.premiumTrial || {
          activatedAt: null,
          expiresAt: null,
          isActive: false,
        }
      );
      setPanels(loadedPanels);
      setSelectedPanelId(loadedPanels[0]?.id || "");
      setSelectedOptionId(loadedPanels[0]?.options?.[0]?.id || "");

      setChannels(Array.isArray(channelsJson?.channels) ? channelsJson.channels : []);
      setCategories(
        Array.isArray(categoriesJson?.categories) ? categoriesJson.categories : []
      );
      setRoles(Array.isArray(rolesJson?.roles) ? rolesJson.roles : []);
    } catch (error) {
      console.error("Tickets page load error:", error);
      setNotice("Failed to load ticket data.");
    } finally {
      setLoading(false);
    }
  }

  function updatePanel(patch) {
    setPanels((prev) =>
      prev.map((panel) =>
        panel.id === selectedPanelId ? { ...panel, ...patch } : panel
      )
    );
  }

  function updateNestedPanel(key, patch) {
    setPanels((prev) =>
      prev.map((panel) =>
        panel.id === selectedPanelId
          ? { ...panel, [key]: { ...(panel[key] || {}), ...patch } }
          : panel
      )
    );
  }

  function updateOption(optionId, patch) {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id !== selectedPanelId) return panel;

        return {
          ...panel,
          options: (panel.options || []).map((option) =>
            option.id === optionId ? { ...option, ...patch } : option
          ),
        };
      })
    );
  }

  function addPanel() {
    const cleanName = newPanelName.trim() || "New Ticket Panel";
    const panel = createDefaultPanel(cleanName);

    setPanels((prev) => [...prev, panel]);
    setSelectedPanelId(panel.id);
    setSelectedOptionId(panel.options[0]?.id || "");
    setNewPanelName("");
    setShowCreatePanelModal(false);
  }

  function duplicatePanel() {
    if (!selectedPanel) return;

    const duplicated = {
      ...normalizePanel(selectedPanel),
      id: makeId("panel"),
      name: `${selectedPanel.name} Copy`,
      options: (selectedPanel.options || []).map((option) => ({
        ...normalizeOption(option),
        id: makeId("opt"),
        formQuestions: (option.formQuestions || []).map((q) => ({
          ...q,
          id: makeId("q"),
        })),
      })),
      sentPanel: {
        messageId: null,
        channelId: null,
        publishedAt: null,
      },
    };

    setPanels((prev) => [...prev, duplicated]);
    setSelectedPanelId(duplicated.id);
    setSelectedOptionId(duplicated.options?.[0]?.id || "");
    setNotice("Panel duplicated. Review the channel before publishing.");
  }

  function deletePanel() {
    if (panels.length <= 1) {
      setNotice("At least one panel must remain.");
      return;
    }

    const remaining = panels.filter((panel) => panel.id !== selectedPanelId);
    setPanels(remaining);
    setSelectedPanelId(remaining[0]?.id || "");
    setSelectedOptionId(remaining[0]?.options?.[0]?.id || "");
    setNotice("Panel removed.");
  }

  function addOption() {
    if (!selectedPanel) return;

    const nextOption = normalizeOption({
      id: makeId("opt"),
      label: "Open ticket",
      emoji: "📩",
      description: "Open a support ticket",
      buttonStyle: "primary",
    });

    setPanels((prev) =>
      prev.map((panel) =>
        panel.id === selectedPanelId
          ? { ...panel, options: [...(panel.options || []), nextOption] }
          : panel
      )
    );

    setSelectedOptionId(nextOption.id);
  }

  function duplicateOption() {
    if (!selectedPanel || !selectedOption) return;

    const duplicated = {
      ...normalizeOption(selectedOption),
      id: makeId("opt"),
      label: `${selectedOption.label} Copy`,
      formQuestions: (selectedOption.formQuestions || []).map((q) => ({
        ...q,
        id: makeId("q"),
      })),
    };

    setPanels((prev) =>
      prev.map((panel) =>
        panel.id === selectedPanelId
          ? { ...panel, options: [...(panel.options || []), duplicated] }
          : panel
      )
    );

    setSelectedOptionId(duplicated.id);
  }

  function removeOption() {
    if (!selectedPanel || !selectedOption) return;
    if ((selectedPanel.options || []).length <= 1) {
      setNotice("A panel needs at least one ticket option.");
      return;
    }

    const remaining = selectedPanel.options.filter(
      (option) => option.id !== selectedOption.id
    );

    setPanels((prev) =>
      prev.map((panel) =>
        panel.id === selectedPanelId ? { ...panel, options: remaining } : panel
      )
    );

    setSelectedOptionId(remaining[0]?.id || "");
  }

  function addQuestion() {
    if (!selectedOption) return;
    if (!premiumUnlocked) {
      setNotice("Forms are premium. Activate the 7-day trial to edit forms.");
      return;
    }

    const question = {
      id: makeId("q"),
      label: "New question",
      type: "short",
      placeholder: "Type here...",
      required: false,
    };

    updateOption(selectedOption.id, {
      formQuestions: [...(selectedOption.formQuestions || []), question],
    });
  }

  function updateQuestion(questionId, patch) {
    if (!selectedOption) return;

    updateOption(selectedOption.id, {
      formQuestions: (selectedOption.formQuestions || []).map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      ),
    });
  }

  function removeQuestion(questionId) {
    if (!selectedOption) return;

    updateOption(selectedOption.id, {
      formQuestions: (selectedOption.formQuestions || []).filter(
        (question) => question.id !== questionId
      ),
    });
  }

async function activateTrial() {
  if (premiumTrial?.activatedAt) {
    if (trialIsActive) {
      setNotice("This server already has an active premium trial.");
    } else {
      setNotice("This server has already used its 7-day premium trial.");
    }
    return;
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const nextTrial = {
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    isActive: true,
  };

  setPremiumTrial(nextTrial);
  setNotice("7-day premium trial activated. Save settings to keep it.");
}

  function buildSavePayload() {
    return {
      enabled: ticketsEnabled === true,
      premiumTrial: {
        activatedAt: premiumTrial?.activatedAt || null,
        expiresAt: premiumTrial?.expiresAt || null,
        isActive: premiumTrial?.isActive === true,
      },
      panels: (panels || []).map((panel, panelIndex) => ({
        id: panel.id || makeId("panel"),
        name: (panel.name || `Ticket Panel ${panelIndex + 1}`).trim(),
        channelId: panel.channelId || "",

        supportRoleIds: Array.isArray(panel.supportRoleIds)
          ? panel.supportRoleIds.filter(Boolean)
          : [],

        managerRoleIds: Array.isArray(panel.managerRoleIds)
          ? panel.managerRoleIds.filter(Boolean)
          : Array.isArray(panel.supportRoleIds)
          ? panel.supportRoleIds.filter(Boolean)
          : [],

        ticketTypeMode:
          panel.ticketTypeMode === "dropdown" ? "dropdown" : "buttons",

        panelMessage: {
          useEmbed: panel.panelMessage?.useEmbed === true,
          title: panel.panelMessage?.title || "How can we help?",
          description:
            panel.panelMessage?.description ||
            "Welcome to our ticket support service! If you have any issues or concerns, please use the button below.",
          color: panel.panelMessage?.color || "#5865F2",
          bannerUrl: panel.panelMessage?.bannerUrl || "",
          footer: panel.panelMessage?.footer || "",
        },

        ticketIntroMessage: {
          useEmbed: panel.ticketIntroMessage?.useEmbed === true,
          title:
            panel.ticketIntroMessage?.title || "Your ticket has been created.",
          description:
            panel.ticketIntroMessage?.description ||
            "Please provide any additional info you deem relevant to help us answer faster.",
          color: panel.ticketIntroMessage?.color || "#5865F2",
          bannerUrl: panel.ticketIntroMessage?.bannerUrl || "",
          footer: panel.ticketIntroMessage?.footer || "",
        },

        options: (panel.options || []).map((option, optionIndex) => ({
          id: option.id || makeId("opt"),
          label: (option.label || `Option ${optionIndex + 1}`).trim(),
          emoji: option.emoji || "📩",
          description: option.description || "",
          buttonStyle: ["primary", "secondary", "success", "danger"].includes(
            option.buttonStyle
          )
            ? option.buttonStyle
            : "primary",

          openCategoryId: option.openCategoryId || "",
          claimedCategoryId: option.claimedCategoryId || "",
          closedCategoryId: option.closedCategoryId || "",

          staffRoleIds: Array.isArray(option.staffRoleIds)
            ? option.staffRoleIds.filter(Boolean)
            : option.staffRoleId
            ? [option.staffRoleId]
            : [],

          staffRoleId:
            option.staffRoleId ||
            (Array.isArray(option.staffRoleIds)
              ? option.staffRoleIds[0] || ""
              : ""),

          formEnabled: option.formEnabled === true,
          formTitle: option.formTitle || "Ticket Form",
          formQuestions: Array.isArray(option.formQuestions)
            ? option.formQuestions.map((question, qIndex) => ({
                id: question.id || makeId("q"),
                label: question.label || `Question ${qIndex + 1}`,
                type: question.type === "paragraph" ? "paragraph" : "short",
                placeholder: question.placeholder || "",
                required: question.required === true,
              }))
            : [],
        })),

        transcripts: {
          enabled: panel.transcripts?.enabled === true,
          channelId: panel.transcripts?.channelId || "",
          sendToUserDm: panel.transcripts?.sendToUserDm === true,
        },

        logs: {
          enabled: panel.logs?.enabled === true,
          channelId: panel.logs?.channelId || "",
        },

        behavior: {
          claimEnabled: panel.behavior?.claimEnabled !== false,
          closeEnabled: panel.behavior?.closeEnabled !== false,
          reopenEnabled: panel.behavior?.reopenEnabled !== false,
          deleteEnabled: panel.behavior?.deleteEnabled !== false,
          autoDeleteClosed: panel.behavior?.autoDeleteClosed === true,
          autoDeleteDuration: panel.behavior?.autoDeleteDuration || "24h",
          maxOpenTicketsPerUser: Math.max(
            1,
            Number(panel.behavior?.maxOpenTicketsPerUser ?? 1)
          ),
          pingStaffOnOpen: panel.behavior?.pingStaffOnOpen !== false,
        },

        sentPanel: {
          messageId: panel.sentPanel?.messageId || null,
          channelId: panel.sentPanel?.channelId || null,
          publishedAt: panel.sentPanel?.publishedAt || null,
        },
      })),
    };
  }

  async function saveTicketsConfig(showSuccessNotice = true) {
    if (!guildId) return null;

    try {
      setSaving(true);
      if (showSuccessNotice) setNotice("");

      const payload = buildSavePayload();

      const response = await fetch(`${API_BASE}/api/guilds/${guildId}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let json = null;

      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(rawText || "Server returned invalid JSON");
      }

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.details || json?.error || "Failed to save ticket config"
        );
      }

      const normalized = normalizeTicketsResponse(json.tickets || {});
      const loadedPanels =
        normalized.panels.length > 0
          ? normalized.panels
          : [createDefaultPanel("Main Ticket Panel")];

      setTicketsEnabled(normalized.enabled ?? false);
      setPremiumTrial(
        normalized.premiumTrial || {
          activatedAt: null,
          expiresAt: null,
          isActive: false,
        }
      );
      setPanels(loadedPanels);

      const nextSelectedPanel =
        loadedPanels.find((panel) => panel.id === selectedPanelId) ||
        loadedPanels[0] ||
        null;

      setSelectedPanelId(nextSelectedPanel?.id || "");
      setSelectedOptionId(
        nextSelectedPanel?.options?.find((option) => option.id === selectedOptionId)
          ?.id ||
          nextSelectedPanel?.options?.[0]?.id ||
          ""
      );

      if (showSuccessNotice) {
        if (setGlobalToast) {
  setGlobalToast({
    type: "success",
    title: "Saved",
    message: "Ticket settings saved successfully.",
  });
} else {
  setNotice("Ticket settings saved successfully.");
}
      }

      return {
        ...normalized,
        panels: loadedPanels,
      };
    } catch (error) {
      console.error("Tickets save error:", error);
     if (setGlobalToast) {
  setGlobalToast({
    type: "error",
    title: "Save Failed",
    message: `Failed to save ticket settings. ${(error.message || "").trim()}`,
  });
} else {
  setNotice(`Failed to save ticket settings. ${(error.message || "").trim()}`);
}
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishOrUpdate() {
    if (!selectedPanel || !guildId) return;

try {
  setSaving(true);

  if (!setGlobalToast) {
    setNotice("");
  }

  const saveResult = await saveTicketsConfig(false);
  if (!saveResult) {
    if (setGlobalToast) {
      setGlobalToast({
        type: "error",
        title: "Save Required",
        message: "Failed to save panel before publishing.",
      });
    } else {
      setNotice("Failed to save panel before publishing.");
    }

    return;
  }

      const response = await fetch(
        `${API_BASE}/api/guilds/${guildId}/tickets/${selectedPanel.id}/publish`,
        {
          method: "POST",
        }
      );

      const rawText = await response.text();
      let json = null;

      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(rawText || "Server returned invalid JSON");
      }

      if (!response.ok || !json?.success) {
        throw new Error(json?.details || json?.error || "Publish failed");
      }

      const normalized = normalizeTicketsResponse(json.tickets || {});
      const loadedPanels =
        normalized.panels.length > 0
          ? normalized.panels
          : [createDefaultPanel("Main Ticket Panel")];

      setTicketsEnabled(normalized.enabled ?? false);
      setPremiumTrial(
        normalized.premiumTrial || {
          activatedAt: null,
          expiresAt: null,
          isActive: false,
        }
      );
      setPanels(loadedPanels);

      const updatedPanel =
        loadedPanels.find((p) => p.id === selectedPanel.id) ||
        loadedPanels[0] ||
        null;

      setSelectedPanelId(updatedPanel?.id || "");
      setSelectedOptionId(
        updatedPanel?.options?.find((option) => option.id === selectedOptionId)
          ?.id ||
          updatedPanel?.options?.[0]?.id ||
          ""
      );

     if (setGlobalToast) {
  setGlobalToast({
    type: "success",
    title: panelIsPublished ? "Panel Updated" : "Panel Published",
    message: panelIsPublished
      ? "Panel updated successfully in Discord."
      : "Panel published successfully to Discord.",
  });
} else {
  setNotice(
    panelIsPublished
      ? "Panel updated successfully in Discord."
      : "Panel published successfully to Discord."
  );
}
    } catch (err) {
      console.error("Tickets publish error:", err);
      if (setGlobalToast) {
  setGlobalToast({
    type: "error",
    title: "Publish Failed",
    message: `Failed to publish panel. ${(err.message || "").trim()}`,
  });
} else {
  setNotice(`Failed to publish panel. ${(err.message || "").trim()}`);
}
    } finally {
      setSaving(false);
    }
  }

  function renderRoleBadges(selectedIds = [], emptyLabel = "No roles selected") {
    if (!selectedIds.length) {
      return <div style={helperText}>{emptyLabel}</div>;
    }

    return (
      <div style={badgeWrap}>
        {selectedIds.map((id) => {
          const role = roles.find((item) => item.id === id);
          return (
            <span key={id} style={roleBadge}>
              {role ? role.name : id}
            </span>
          );
        })}
      </div>
    );
  }

  if (!selectedGuild) {
    return (
      <div style={pageWrap}>
        <div style={heroCard}>
          <h2 style={heroTitle}>Ticket System</h2>
          <p style={heroText}>Select a server first to manage ticket panels.</p>
        </div>
      </div>
    );
  }

if (loading) {
  return (
    <PageLoader
      title="Loading tickets..."
      subtitle="Preparing ticket panels, support roles, categories, transcripts, and behavior settings."
    />
  );
}

  return (
    <div style={pageWrap}>
      <div style={heroCard}>
        <div style={heroTopRow}>
          <div>
            <div style={heroKickerRow}>
              <StatusPill tone={ticketsEnabled ? "success" : "neutral"}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
  🟢 {ticketsEnabled ? "System Active" : "System Inactive"}
</span>
              </StatusPill>
              <StatusPill tone={panelIsPublished ? "primary" : "warning"}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
  🔗 {panelIsPublished ? "Panel Linked" : "Draft Panel"}
</span>
              </StatusPill>
              <StatusPill tone={premiumUnlocked ? "premium" : "neutral"}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
  <CrownStrokeIcon size={12} />
  {premiumUnlocked ? "Premium Trial Active" : "Free Mode"}
</span>
              </StatusPill>
            </div>

            <h2 style={heroTitle}>Ticketing</h2>
            <p style={heroText}>
              Build polished ticket panels, assign categories per option,
              configure manager roles, forms, transcripts, and controls for{" "}
              <strong>{selectedGuild.name}</strong>.
            </p>
          </div>

          <div style={topRightWrap}>
            <label style={toggleInlineWrap}>
              <span style={toggleInlineLabel}>Active</span>
              <SwitchToggle checked={ticketsEnabled} onChange={setTicketsEnabled} />
            </label>
          </div>
        </div>
      </div>


      <div style={toolbarCard}>
        <div style={toolbarLeft}>
          <div
  style={{
    ...panelSelectWrap,
    position: "relative",
    zIndex: 40,
  }}
>
            <label style={smallLabel}>Selected Panel</label>
            <SingleSelectDropdown
              options={panels.map((panel, index) => ({
                id: panel.id,
                name: `${index + 1} | ${panel.name}`,
              }))}
              value={selectedPanelId}
              onChange={(nextPanelId) => {
                const nextPanel = panels.find((p) => p.id === nextPanelId);
                setSelectedPanelId(nextPanelId);
                setSelectedOptionId(nextPanel?.options?.[0]?.id || "");
              }}
              placeholder="Select panel"
            />
          </div>

          <button
            type="button"
            style={createIconButton}
            onClick={() => setShowCreatePanelModal(true)}
            title="Create new panel"
          >
            +
          </button>
        </div>

        <div style={toolbarRight}>
          <button type="button" style={softButton} onClick={duplicatePanel}>
            Duplicate
          </button>
          <button
            type="button"
            style={successButton}
            onClick={handlePublishOrUpdate}
            disabled={saving}
          >
            {saving ? "Working..." : panelPublishLabel}
          </button>
          <button
            type="button"
            style={primaryButton}
            onClick={() => saveTicketsConfig(true)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" style={dangerButton} onClick={deletePanel}>
            Delete
          </button>
        </div>
      </div>

      <div style={premiumCard}>
  <div style={premiumCardGlow} />
        <div>
          <div style={premiumHeaderRow}>
            <h3 style={sectionTitle}>Premium Ticket Features</h3>
            <PremiumTag active={premiumUnlocked} />
          </div>

          <p style={sectionText}>
            Banner / GIF, footer, and forms are premium. Start a 7-day trial
            without payment details.
          </p>
<p
  style={{
    ...helperText,
    color: trialIsActive
      ? "#4ade80"
      : trialAlreadyUsed
      ? "#facc15"
      : "rgba(255,255,255,0.7)",
    fontWeight: trialIsActive ? "700" : "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  {trialIsActive ? (
    <>
      <span>✅ Ticket Premium Trial Active</span>
      <span style={{ opacity: 0.8 }}>
        • Expires{" "}
        {new Date(premiumTrial.expiresAt).toLocaleDateString()}
      </span>
    </>
  ) : trialAlreadyUsed ? (
    <>
      <span>⚠️ Trial Already Used</span>
      <span style={{ opacity: 0.8 }}>
        • Activated{" "}
        {new Date(premiumTrial.activatedAt).toLocaleDateString()}
      </span>
    </>
  ) : (
    "No active ticket premium trial"
  )}
</p>
        </div>

      <button
  type="button"
  style={trialButton(trialIsActive || trialAlreadyUsed)}
  onClick={activateTrial}
  disabled={trialIsActive || trialAlreadyUsed}
>
 {trialIsActive
  ? "Premium Trial Active"
  : trialAlreadyUsed
  ? "Trial Used"
  : "Start 7 Day Trial"}
</button>
      </div>

      <div style={mainGrid}>
        <div style={leftColumn}>
          <div
  style={{
    ...sectionCard,
    position: "relative",
    zIndex: 20,
  }}
>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Panel Setup</div>
                <h3 style={sectionTitle}>General</h3>
                <p style={sectionText}>
                  Choose where the panel is published and who manages tickets.
                </p>
              </div>
            </div>

            <div style={twoColGrid}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Panel Name</label>
                <input
                  value={selectedPanel?.name || ""}
                  onChange={(e) => updatePanel({ name: e.target.value })}
                  style={textInput}
                />
              </div>

<div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 30,
  }}
>
  <label style={fieldLabel}>Publish Channel</label>
  <SingleSelectDropdown
    options={textChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
    }))}
    value={selectedPanel?.channelId || ""}
    onChange={(value) => updatePanel({ channelId: value })}
    placeholder="Select channel"
    renderPrefix={() => <span style={prefixTag}>#</span>}
  />
</div>
            </div>

           <div
  style={{
    ...fieldWrap,
    marginTop: "8px",
    position: "relative",
    zIndex: 1,
  }}
>
              <label style={fieldLabel}>Ticket Manager Roles</label>
              <MultiSelectDropdown
                options={roles.map((role) => ({ id: role.id, name: role.name }))}
                values={
                  selectedPanel?.managerRoleIds ||
                  selectedPanel?.supportRoleIds ||
                  []
                }
                onChange={(values) =>
                  updatePanel({
                    managerRoleIds: values,
                    supportRoleIds: values,
                  })
                }
                placeholder="Select manager roles"
                emptyText="No roles available"
              />
              {renderRoleBadges(
                selectedPanel?.managerRoleIds || selectedPanel?.supportRoleIds || [],
                "No manager roles selected"
              )}
            </div>
          </div>

          <div
  style={{
    ...sectionCard,
    position: "relative",
    zIndex: 1,
  }}
>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Public Panel</div>
                <h3 style={sectionTitle}>Panel Message</h3>
                <p style={sectionText}>
                  Customize the public ticket panel message shown in the support
                  channel.
                </p>
              </div>
            </div>

            <div style={toggleRow}>
              <span style={toggleLabel}>Use Embed</span>
              <SwitchToggle
                checked={!!selectedPanel?.panelMessage?.useEmbed}
                onChange={(value) =>
                  updateNestedPanel("panelMessage", {
                    useEmbed: value,
                  })
                }
              />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Title</label>
              <input
                value={selectedPanel?.panelMessage?.title || ""}
                onChange={(e) =>
                  updateNestedPanel("panelMessage", { title: e.target.value })
                }
                style={textInput}
              />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Description</label>
              <textarea
                value={selectedPanel?.panelMessage?.description || ""}
                onChange={(e) =>
                  updateNestedPanel("panelMessage", {
                    description: e.target.value,
                  })
                }
                style={textareaInput}
              />
            </div>

            <div style={{ ...premiumFieldsGrid, marginTop: "14px" }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Embed Color</label>
                <div style={colorInputWrap}>
                  <input
                    type="color"
                    value={selectedPanel?.panelMessage?.color || "#5865F2"}
                    onChange={(e) =>
                      updateNestedPanel("panelMessage", {
                        color: e.target.value,
                      })
                    }
                    style={colorPicker}
                  />
                  <input
                    value={selectedPanel?.panelMessage?.color || "#5865F2"}
                    onChange={(e) =>
                      updateNestedPanel("panelMessage", {
                        color: e.target.value,
                      })
                    }
                    style={textInput}
                  />
                </div>
              </div>

              <LockedField
                locked={!premiumUnlocked}
        label="Banner / GIF URL"
                helper="Premium"
              >
                <input
                  value={selectedPanel?.panelMessage?.bannerUrl || ""}
                  onChange={(e) =>
                    updateNestedPanel("panelMessage", {
                      bannerUrl: e.target.value,
                    })
                  }
                  style={textInput}
                  placeholder="https://..."
                  disabled={!premiumUnlocked}
                />
              </LockedField>

              <LockedField
                locked={!premiumUnlocked}
   label="Footer"               helper="Premium"
              >
                <input
                  value={selectedPanel?.panelMessage?.footer || ""}
                  onChange={(e) =>
                    updateNestedPanel("panelMessage", {
                      footer: e.target.value,
                    })
                  }
                  style={textInput}
                  placeholder="Footer text"
                  disabled={!premiumUnlocked}
                />
              </LockedField>
            </div>
          </div>

          <div
  style={{
    ...sectionCard,
    position: "relative",
    zIndex: 15,
  }}
>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Ticket Entry Types</div>
                <h3 style={sectionTitle}>Ticket Types</h3>
                <p style={sectionText}>
                  Choose buttons or dropdown mode and configure each option.
                </p>
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Panel Type</label>
              <div style={segmentWrap}>
                <button
                  type="button"
                  style={segmentButton(selectedPanel?.ticketTypeMode === "buttons")}
                  onClick={() => updatePanel({ ticketTypeMode: "buttons" })}
                >
                  Buttons
                </button>
                <button
                  type="button"
                  style={segmentButton(
                    selectedPanel?.ticketTypeMode === "dropdown"
                  )}
                  onClick={() => updatePanel({ ticketTypeMode: "dropdown" })}
                >
                  Dropdown
                </button>
              </div>
            </div>

            <div style={sectionHeaderMini}>
              <div style={fieldLabel}>Options</div>
              <button type="button" style={primarySmallButton} onClick={addOption}>
                Add Option
              </button>
            </div>

            <div style={optionTabsWrap}>
              {(selectedPanel?.options || []).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  style={optionTab(option.id === selectedOptionId)}
                  onClick={() => setSelectedOptionId(option.id)}
                >
                  <span>{option.emoji || "✨"}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>

            {selectedOption ? (
              <>
                <div style={premiumFieldsGrid}>
                  <div style={fieldWrap}>
                    <label style={fieldLabel}>Label</label>
                    <input
                      value={selectedOption.label}
                      onChange={(e) =>
                        updateOption(selectedOption.id, { label: e.target.value })
                      }
                      style={textInput}
                    />
                  </div>

                  <div style={fieldWrap}>
                    <label style={fieldLabel}>Emoji</label>
                    <input
                      value={selectedOption.emoji}
                      onChange={(e) =>
                        updateOption(selectedOption.id, { emoji: e.target.value })
                      }
                      style={textInput}
                    />
                  </div>

<div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 80,
  }}
>
  <label style={fieldLabel}>Button Style</label>
  <SingleSelectDropdown
    options={[
      { id: "primary", name: "Primary" },
      { id: "secondary", name: "Secondary" },
      { id: "success", name: "Success" },
      { id: "danger", name: "Danger" },
    ]}
    value={selectedOption.buttonStyle}
    onChange={(value) =>
      updateOption(selectedOption.id, { buttonStyle: value })
    }
    placeholder="Select style"
  />
</div>
                </div>

                <div style={fieldWrap}>
                  <label style={fieldLabel}>Description</label>
                  <input
                    value={selectedOption.description}
                    onChange={(e) =>
                      updateOption(selectedOption.id, {
                        description: e.target.value,
                      })
                    }
                    style={textInput}
                  />
                </div>

                <div style={{ ...ticketCategoriesGrid, marginTop: "12px" }}>
<div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 20,
  }}
>
  <label style={fieldLabel}>Open Category</label>
  <SingleSelectDropdown
    options={categories.map((category) => ({
      id: category.id,
      name: category.name,
    }))}
    value={selectedOption.openCategoryId || ""}
    onChange={(value) =>
      updateOption(selectedOption.id, {
        openCategoryId: value,
      })
    }
    placeholder="Select category"
  />
</div>

 <div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 20,
  }}
>
  <label style={fieldLabel}>Claimed Category</label>
  <SingleSelectDropdown
    options={categories.map((category) => ({
      id: category.id,
      name: category.name,
    }))}
    value={selectedOption.claimedCategoryId || ""}
    onChange={(value) =>
      updateOption(selectedOption.id, {
        claimedCategoryId: value,
      })
    }
    placeholder="Select category"
  />
</div>

  <div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 20,
  }}
>
  <label style={fieldLabel}>Closed Category</label>
  <SingleSelectDropdown
    options={categories.map((category) => ({
      id: category.id,
      name: category.name,
    }))}
    value={selectedOption.closedCategoryId || ""}
    onChange={(value) =>
      updateOption(selectedOption.id, {
        closedCategoryId: value,
      })
    }
    placeholder="Select category"
  />
</div>
                </div>

                <div
  style={{
    ...staffRolesBlock,
    position: "relative",
    zIndex: 10,
  }}
>
                  <div style={fieldWrap}>
                    <label style={fieldLabel}>Staff Roles</label>
                    <MultiSelectDropdown
                      options={roles.map((role) => ({
                        id: role.id,
                        name: role.name,
                      }))}
                      values={selectedOption.staffRoleIds || []}
                      onChange={(values) =>
                        updateOption(selectedOption.id, {
                          staffRoleIds: values,
                          staffRoleId: values[0] || "",
                        })
                      }
                      placeholder="Select staff roles"
                      emptyText="No roles available"
                    />
                  </div>

                  {renderRoleBadges(
                    selectedOption.staffRoleIds || [],
                    "No staff roles selected"
                  )}
                </div>

                <div style={optionMetaGrid}>
                  <InfoMiniCard
                    label="Open"
                    value={resolveCategoryName(selectedOption.openCategoryId)}
                  />
                  <InfoMiniCard
                    label="Claimed"
                    value={resolveCategoryName(selectedOption.claimedCategoryId)}
                  />
                  <InfoMiniCard
                    label="Closed"
                    value={resolveCategoryName(selectedOption.closedCategoryId)}
                  />
                </div>

                <div style={actionRow}>
                  <button
                    type="button"
                    style={softButton}
                    onClick={duplicateOption}
                  >
                    Duplicate Option
                  </button>
                  <button
                    type="button"
                    style={dangerSoftButton}
                    onClick={removeOption}
                  >
                    Remove Option
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Pre-Create Form</div>
                <h3 style={sectionTitle}>Forms</h3>
                <p style={sectionText}>
                  Ask users questions before a ticket is created.
                </p>
              </div>
            </div>

         <LockedBlock
  locked={!premiumUnlocked}
  message="Forms are premium. Start the 7-day trial to edit forms."
  minHeight={260}
>
              {selectedOption ? (
                <>
                  <div style={toggleRow}>
                    <span style={toggleLabel}>Enable Form</span>
                    <SwitchToggle
                      checked={!!selectedOption.formEnabled}
                      onChange={(value) =>
                        updateOption(selectedOption.id, {
                          formEnabled: value,
                        })
                      }
                      disabled={!premiumUnlocked}
                    />
                  </div>

                  <div style={fieldWrap}>
                    <label style={fieldLabel}>Form Title</label>
                    <input
                      value={selectedOption.formTitle || ""}
                      onChange={(e) =>
                        updateOption(selectedOption.id, {
                          formTitle: e.target.value,
                        })
                      }
                      style={textInput}
                      disabled={!premiumUnlocked}
                    />
                  </div>

                  <div style={sectionHeaderMini}>
                    <div style={fieldLabel}>Questions</div>
                    <button
                      type="button"
                      style={primarySmallButton}
                      onClick={addQuestion}
                      disabled={!premiumUnlocked}
                    >
                      Add Question
                    </button>
                  </div>

                  {(selectedOption.formQuestions || []).length > 0 ? (
                    <div style={questionListWrap}>
                      {selectedOption.formQuestions.map((question) => (
                        <div key={question.id} style={questionCard}>
                          <div style={premiumFieldsGrid}>
                            <div style={fieldWrap}>
                              <label style={fieldLabel}>Question Label</label>
                              <input
                                value={question.label}
                                onChange={(e) =>
                                  updateQuestion(question.id, {
                                    label: e.target.value,
                                  })
                                }
                                style={textInput}
                                disabled={!premiumUnlocked}
                              />
                            </div>

                            <div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 1000,
  }}
>
                              <label style={fieldLabel}>Type</label>
                              <SingleSelectDropdown
                                options={[
                                  { id: "short", name: "Short Text" },
                                  { id: "paragraph", name: "Paragraph" },
                                ]}
                                value={question.type}
                                onChange={(value) =>
                                  updateQuestion(question.id, { type: value })
                                }
                                placeholder="Select type"
                              />
                            </div>

                            <div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 999,
  }}
>
                              <label style={fieldLabel}>Required</label>
                              <SingleSelectDropdown
                                options={[
                                  { id: "yes", name: "Required" },
                                  { id: "no", name: "Optional" },
                                ]}
                                value={question.required ? "yes" : "no"}
                                onChange={(value) =>
                                  updateQuestion(question.id, {
                                    required: value === "yes",
                                  })
                                }
                                placeholder="Select"
                              />
                            </div>
                          </div>

                          <div style={fieldWrap}>
                            <label style={fieldLabel}>Placeholder</label>
                            <input
                              value={question.placeholder}
                              onChange={(e) =>
                                updateQuestion(question.id, {
                                  placeholder: e.target.value,
                                })
                              }
                              style={textInput}
                              disabled={!premiumUnlocked}
                            />
                          </div>

                          <div style={actionRow}>
                            <button
                              type="button"
                              style={dangerSoftButton}
                              onClick={() => removeQuestion(question.id)}
                              disabled={!premiumUnlocked}
                            >
                              Remove Question
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={helperEmptyBox}>No form questions yet.</div>
                  )}
                </>
              ) : (
                <div style={helperEmptyBox}>Select a ticket option first.</div>
              )}
            </LockedBlock>
          </div>

          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Inside Ticket</div>
                <h3 style={sectionTitle}>Ticket Introduction Message</h3>
                <p style={sectionText}>
                  This message is posted inside the ticket channel after it is
                  created.
                </p>
              </div>
            </div>

            <div style={toggleRow}>
              <span style={toggleLabel}>Use Embed</span>
              <SwitchToggle
                checked={!!selectedPanel?.ticketIntroMessage?.useEmbed}
                onChange={(value) =>
                  updateNestedPanel("ticketIntroMessage", {
                    useEmbed: value,
                  })
                }
              />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Title</label>
              <input
                value={selectedPanel?.ticketIntroMessage?.title || ""}
                onChange={(e) =>
                  updateNestedPanel("ticketIntroMessage", { title: e.target.value })
                }
                style={textInput}
              />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Description</label>
              <textarea
                value={selectedPanel?.ticketIntroMessage?.description || ""}
                onChange={(e) =>
                  updateNestedPanel("ticketIntroMessage", {
                    description: e.target.value,
                  })
                }
                style={textareaInput}
              />
            </div>

            <div style={{ ...premiumFieldsGrid, marginTop: "14px" }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Embed Color</label>
                <div style={colorInputWrap}>
                  <input
                    type="color"
                    value={selectedPanel?.ticketIntroMessage?.color || "#5865F2"}
                    onChange={(e) =>
                      updateNestedPanel("ticketIntroMessage", {
                        color: e.target.value,
                      })
                    }
                    style={colorPicker}
                  />
                  <input
                    value={selectedPanel?.ticketIntroMessage?.color || "#5865F2"}
                    onChange={(e) =>
                      updateNestedPanel("ticketIntroMessage", {
                        color: e.target.value,
                      })
                    }
                    style={textInput}
                  />
                </div>
              </div>

              <LockedField
                locked={!premiumUnlocked}
    label="Banner / GIF URL"
                helper="Premium"
              >
                <input
                  value={selectedPanel?.ticketIntroMessage?.bannerUrl || ""}
                  onChange={(e) =>
                    updateNestedPanel("ticketIntroMessage", {
                      bannerUrl: e.target.value,
                    })
                  }
                  style={textInput}
                  disabled={!premiumUnlocked}
                />
              </LockedField>

              <LockedField
                locked={!premiumUnlocked}
   label="Footer"
                helper="Premium"
              >
                <input
                  value={selectedPanel?.ticketIntroMessage?.footer || ""}
                  onChange={(e) =>
                    updateNestedPanel("ticketIntroMessage", {
                      footer: e.target.value,
                    })
                  }
                  style={textInput}
                  disabled={!premiumUnlocked}
                />
              </LockedField>
            </div>
          </div>

          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Delivery</div>
                <h3 style={sectionTitle}>Transcripts & Logs</h3>
                <p style={sectionText}>
                  Choose where transcript links and ticket logs should go.
                </p>
              </div>
            </div>

            <div style={twoColGrid}>
              <div
  style={{
    ...subCard,
    position: "relative",
    zIndex: 10,
  }}
>
                <div style={subCardStack}>
                  <div style={toggleRow}>
                    <span style={toggleLabel}>Enable Transcripts</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.transcripts?.enabled}
                      onChange={(value) =>
                        updateNestedPanel("transcripts", {
                          enabled: value,
                        })
                      }
                    />
                  </div>

              <div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 20,
  }}
>
  <label style={fieldLabel}>Transcript Channel</label>
  <SingleSelectDropdown
    options={textChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
    }))}
    value={selectedPanel?.transcripts?.channelId || ""}
    onChange={(value) =>
      updateNestedPanel("transcripts", {
        channelId: value,
      })
    }
    placeholder="Select channel"
    renderPrefix={() => <span style={prefixTag}>#</span>}
  />
</div>

                  <div style={toggleRow}>
                    <span style={toggleLabel}>DM Transcript To User</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.transcripts?.sendToUserDm}
                      onChange={(value) =>
                        updateNestedPanel("transcripts", {
                          sendToUserDm: value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div
  style={{
    ...subCard,
    position: "relative",
    zIndex: 10,
  }}
>
                <div style={subCardStack}>
                  <div style={toggleRow}>
                    <span style={toggleLabel}>Enable Logs</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.logs?.enabled}
                      onChange={(value) =>
                        updateNestedPanel("logs", {
                          enabled: value,
                        })
                      }
                    />
                  </div>

               <div
  style={{
    ...fieldWrap,
    position: "relative",
    zIndex: 20,
  }}
>
  <label style={fieldLabel}>Logs Channel</label>
  <SingleSelectDropdown
    options={textChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
    }))}
    value={selectedPanel?.logs?.channelId || ""}
    onChange={(value) =>
      updateNestedPanel("logs", {
        channelId: value,
      })
    }
    placeholder="Select channel"
    renderPrefix={() => <span style={prefixTag}>#</span>}
  />
</div>
                </div>
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Rules</div>
                <h3 style={sectionTitle}>Limits & Behavior</h3>
                <p style={sectionText}>
                  Configure claim, close, reopen, delete, max tickets, and
                  auto-delete.
                </p>
              </div>
            </div>

            <div style={twoColGrid}>
              <div style={subCard}>
                <div style={subCardStack}>
                  <div style={toggleRow}>
                    <span style={toggleLabel}>Claim Enabled</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.behavior?.claimEnabled}
                      onChange={(value) =>
                        updateNestedPanel("behavior", {
                          claimEnabled: value,
                        })
                      }
                    />
                  </div>

                  <div style={toggleRow}>
                    <span style={toggleLabel}>Close Enabled</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.behavior?.closeEnabled}
                      onChange={(value) =>
                        updateNestedPanel("behavior", {
                          closeEnabled: value,
                        })
                      }
                    />
                  </div>

                  <div style={toggleRow}>
                    <span style={toggleLabel}>Reopen Enabled</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.behavior?.reopenEnabled}
                      onChange={(value) =>
                        updateNestedPanel("behavior", {
                          reopenEnabled: value,
                        })
                      }
                    />
                  </div>

                  <div style={toggleRow}>
                    <span style={toggleLabel}>Delete Enabled</span>
                    <SwitchToggle
                      checked={!!selectedPanel?.behavior?.deleteEnabled}
                      onChange={(value) =>
                        updateNestedPanel("behavior", {
                          deleteEnabled: value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

<LockedBlock
  locked={!premiumUnlocked}
  message="Upgrade to Kyro Premium to unlock automatic deletion for closed tickets."
  minHeight={240}
>
  <div
  style={{
    ...subCard,
    opacity: !premiumUnlocked ? 0.6 : 1,
    position: "relative",
  }}
>
    <div style={subCardStack}>
      <div style={toggleRow}>
   <span
  style={{
    ...toggleLabel,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  Auto Delete Closed
 {!premiumUnlocked && <PremiumTag active={false} />}
</span>
        <SwitchToggle
          checked={!!selectedPanel?.behavior?.autoDeleteClosed}
          onChange={(value) =>
            premiumUnlocked &&
            updateNestedPanel("behavior", {
              autoDeleteClosed: value,
            })
          }
          disabled={!premiumUnlocked}
        />
      </div>

      <div style={fieldWrap}>
  <label style={fieldLabel}>Auto Delete Duration</label>

  <div style={{ position: "relative" }}>
  <select
    value={selectedPanel?.behavior?.autoDeleteDuration || "24h"}
    onChange={(e) => {
      const value = e.target.value;
      if (!premiumUnlocked) return;

      updateNestedPanel("behavior", {
        autoDeleteDuration: value,
      });
    }}
    disabled={!premiumUnlocked}
    style={{
      ...textInput,
      background: "rgba(15, 23, 42, 0.6)",
      color: "#e5e7eb",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "14px",
      height: "48px",
      padding: "0 14px",
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      cursor: "pointer",
    }}
  >
    <option value="5m">5 minutes</option>
    <option value="10m">10 minutes</option>
    <option value="30m">30 minutes</option>
    <option value="1h">1 hour</option>
    <option value="6h">6 hours</option>
    <option value="12h">12 hours</option>
    <option value="24h">24 hours</option>
    <option value="3d">3 days</option>
    <option value="7d">7 days</option>
  </select>

  <span
    style={{
      position: "absolute",
      right: "14px",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "#94a3b8",
      fontSize: "12px",
    }}
  >
    ▾
  </span>
</div>

  {!premiumUnlocked ? (
    <div style={helperText}>Premium required to use auto delete.</div>
  ) : !selectedPanel?.behavior?.autoDeleteClosed ? (
    <div style={helperText}>
      Enable auto delete to activate this setting
    </div>
  ) : null}
</div>

      <div style={fieldWrap}>
        <label style={fieldLabel}>Max Open Tickets Per User</label>
        <input
          type="number"
          min="1"
          value={selectedPanel?.behavior?.maxOpenTicketsPerUser ?? 1}
          onChange={(e) =>
            updateNestedPanel("behavior", {
              maxOpenTicketsPerUser: Number(e.target.value) || 1,
            })
          }
          style={textInput}
        />
      </div>

      <div style={toggleRow}>
        <span style={toggleLabel}>Ping Staff On Open</span>
        <SwitchToggle
          checked={!!selectedPanel?.behavior?.pingStaffOnOpen}
          onChange={(value) =>
            updateNestedPanel("behavior", {
              pingStaffOnOpen: value,
            })
          }
        />
      </div>
    </div>
  </div>
</LockedBlock>
            </div>
          </div>
        </div>

        <div style={rightColumn}>
          <div style={sectionCard}>
            <div style={sectionHeaderCompact}>
              <div>
                <div style={sectionEyebrow}>Preview</div>
                <h3 style={sectionTitle}>Live Panel Preview</h3>
              </div>
              <span style={previewLiveBadge}>
                <SparklesIcon size={13} />
                Live
              </span>
            </div>

            <p style={sectionText}>
              This preview reflects the current ticket panel settings.
            </p>

            <div
              style={{
                ...previewCard,
                borderColor: hexToRgba(panelAccent, 0.38),
                boxShadow: `0 12px 30px ${hexToRgba(panelAccent, 0.14)}`,
              }}
            >
              {selectedPanel?.panelMessage?.bannerUrl ? (
                <img
                  src={selectedPanel.panelMessage.bannerUrl}
                  alt="Panel banner"
                  style={previewImage}
                />
              ) : null}

              <div style={previewMessage}>
                <div
                  style={{
                    ...previewAccentBar,
                    background: `linear-gradient(90deg, ${panelAccent}, ${hexToRgba(
                      panelAccent,
                      0.42
                    )})`,
                  }}
                />
                <div style={previewTitle}>
                  {selectedPanel?.panelMessage?.title || "How can we help?"}
                </div>
                <div style={previewDescription}>
                  {selectedPanel?.panelMessage?.description ||
                    "Welcome to our ticket support service!"}
                </div>

                {selectedPanel?.ticketTypeMode === "dropdown" ? (
                  <div style={previewDropdown}>
                    <div style={previewDropdownLabel}>Select ticket type</div>
                    {(selectedPanel?.options || []).map((option) => (
                      <div key={option.id} style={previewDropdownItem}>
                        <strong>
                          {option.emoji} {option.label}
                        </strong>
                        <div style={previewDropdownDesc}>
                          {option.description}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={previewButtonsWrap}>
                    {(selectedPanel?.options || []).map((option) => (
                      <div key={option.id} style={previewButton(option.buttonStyle)}>
                        {option.emoji} {option.label}
                      </div>
                    ))}
                  </div>
                )}

                {selectedPanel?.panelMessage?.footer ? (
                  <div style={previewFooter}>
                    {selectedPanel.panelMessage.footer}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <div style={sectionHeaderCompact}>
              <div>
                <div style={sectionEyebrow}>Preview</div>
                <h3 style={sectionTitle}>Intro Message Preview</h3>
              </div>
            </div>
            <div
              style={{
                ...previewCard,
                borderColor: hexToRgba(introAccent, 0.38),
                boxShadow: `0 12px 30px ${hexToRgba(introAccent, 0.14)}`,
              }}
            >
              {selectedPanel?.ticketIntroMessage?.bannerUrl ? (
                <img
                  src={selectedPanel.ticketIntroMessage.bannerUrl}
                  alt="Ticket intro banner"
                  style={previewImage}
                />
              ) : null}

              <div style={previewMessage}>
                <div
                  style={{
                    ...previewAccentBar,
                    background: `linear-gradient(90deg, ${introAccent}, ${hexToRgba(
                      introAccent,
                      0.42
                    )})`,
                  }}
                />
                <div style={previewTitle}>
                  {selectedPanel?.ticketIntroMessage?.title ||
                    "Your ticket has been created."}
                </div>
                <div style={previewDescription}>
                  {selectedPanel?.ticketIntroMessage?.description ||
                    "Please provide any additional info you deem relevant to help us answer faster."}
                </div>

                <div style={previewActionControls}>
                  {selectedPanel?.behavior?.claimEnabled ? (
                    <span style={previewControl("primary")}>Claim</span>
                  ) : null}
                  {selectedPanel?.behavior?.closeEnabled ? (
                    <span style={previewControl("danger")}>Close</span>
                  ) : null}
                  {selectedPanel?.behavior?.reopenEnabled ? (
                    <span style={previewControl("success")}>Reopen</span>
                  ) : null}
                  {selectedPanel?.behavior?.deleteEnabled ? (
                    <span style={previewControl("secondary")}>Delete</span>
                  ) : null}
                </div>

                {selectedPanel?.ticketIntroMessage?.footer ? (
                  <div style={previewFooter}>
                    {selectedPanel.ticketIntroMessage.footer}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <div style={sectionHeaderCompact}>
              <div>
                <div style={sectionEyebrow}>Overview</div>
                <h3 style={sectionTitle}>Panel Summary</h3>
              </div>
            </div>

            <div style={summaryRow}>
              <span style={summaryKey}>Name</span>
              <span style={summaryValue}>{selectedPanel?.name || "-"}</span>
            </div>
            <div style={summaryRow}>
              <span style={summaryKey}>Type</span>
              <span style={summaryValue}>
                {selectedPanel?.ticketTypeMode || "-"}
              </span>
            </div>
            <div style={summaryRow}>
              <span style={summaryKey}>Options</span>
              <span style={summaryValue}>{selectedPanel?.options?.length || 0}</span>
            </div>
            <div style={summaryRow}>
              <span style={summaryKey}>Published Channel</span>
              <span style={summaryValue}>
                {resolveChannelName(selectedPanel?.channelId)}
              </span>
            </div>
            <div style={summaryRow}>
              <span style={summaryKey}>Published</span>
              <span style={summaryValue}>
                {selectedPanel?.sentPanel?.publishedAt
                  ? new Date(selectedPanel.sentPanel.publishedAt).toLocaleString()
                  : "Not published"}
              </span>
            </div>
            <div style={summaryRow}>
              <span style={summaryKey}>Linked Message</span>
              <span style={summaryValue}>
                {selectedPanel?.sentPanel?.messageId || "No linked panel yet"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showCreatePanelModal ? (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={modalTitle}>Create New Panel</h3>
            <p style={sectionText}>
              Enter the panel name. You can configure the rest after creation.
            </p>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Panel Name</label>
              <input
                value={newPanelName}
                onChange={(e) => setNewPanelName(e.target.value)}
                style={textInput}
                placeholder="Support Panel"
              />
            </div>

            <div style={modalActions}>
              <button
                type="button"
                style={softButton}
                onClick={() => {
                  setShowCreatePanelModal(false);
                  setNewPanelName("");
                }}
              >
                Cancel
              </button>
              <button type="button" style={primaryButton} onClick={addPanel}>
                Create Panel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LockedField({ locked, label, helper, children }) {
  return (
    <div style={fieldWrap}>
      <div style={fieldTopRow}>
        <label style={fieldLabel}>{label}</label>
        {helper ? (
          <span style={premiumMiniBadge}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <CrownStrokeIcon size={12} />
            </span>
            {helper}
          </span>
        ) : null}
      </div>
      <div style={lockedFieldShell(locked)}>{children}</div>
    </div>
  );
}

function LockedBlock({ locked, message, children, minHeight = 220 }) {
  return (
    <div
      style={{
        position: "relative",
        minHeight,
        borderRadius: "20px",
        overflow: locked ? "hidden" : "visible",
      }}
    >
      <div
        style={{
          opacity: locked ? 0.45 : 1,
          filter: locked ? "blur(2.5px)" : "none",
          pointerEvents: locked ? "none" : "auto",
          userSelect: locked ? "none" : "auto",
          transition: "all 0.25s ease",
        }}
      >
        {children}
      </div>

      {locked ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, rgba(8,12,24,0.34), rgba(15,23,42,0.26))",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(251,191,36,0.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
              }}
            >
              <div
                style={{
                  ...lockedCard,
                  background: "rgba(5, 10, 24, 0.72)",
                  border: "1px solid rgba(251,191,36,0.16)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow:
                    "0 18px 40px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                <div style={lockedIconWrap}>
                  <CrownStrokeIcon size={18} />
                </div>
                <div style={lockedTitle}>Premium Feature</div>
                <div style={lockedText}>
                  {message || "This feature is available on the premium plan."}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InfoMiniCard({ label, value }) {
  return (
    <div style={infoMiniCard}>
      <div style={infoMiniLabel}>{label}</div>
      <div style={infoMiniValue}>{value || "Not selected"}</div>
    </div>
  );
}

const pageWrap = {
  display: "grid",
  gap: "18px",
};

const heroCard = {
  borderRadius: "24px",
  padding: "24px",
  background:
    "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.08))",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.20)",
};

const heroTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const heroKickerRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "12px",
};

const heroTitle = {
  margin: 0,
  fontSize: "32px",
  fontWeight: "800",
  color: "white",
};

const heroText = {
  margin: "10px 0 0 0",
  fontSize: "15px",
  lineHeight: "1.8",
  color: "rgba(255,255,255,0.72)",
  maxWidth: "900px",
};

const topRightWrap = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const toggleInlineWrap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const toggleInlineLabel = {
  color: "white",
  fontWeight: "700",
};

const toolbarCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(59,130,246,0.16)",
};

const toolbarLeft = {
  display: "flex",
  alignItems: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
};

const toolbarRight = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const panelSelectWrap = {
  minWidth: "260px",
  maxWidth: "360px",
  display: "grid",
  gap: "8px",
  flex: 1,
};

const smallLabel = {
  fontSize: "12px",
  fontWeight: "700",
  color: "rgba(255,255,255,0.62)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const createIconButton = {
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  color: "white",
  fontSize: "22px",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(34,197,94,0.22)",
};

const premiumCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  padding: "22px 24px",
  borderRadius: "22px",

  // ✨ GLASS BACKGROUND
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.55), rgba(30,41,59,0.45))",

  // ✨ GLASS EFFECT
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",

  // ✨ BORDER + GLOW
  border: "1px solid rgba(129,140,248,0.25)",

  // ✨ DEPTH
  boxShadow:
    "0 18px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",

  position: "relative",
  overflow: "hidden",
};

const premiumCardGlow = {
  position: "absolute",
  inset: 0,
  borderRadius: "22px",
  background:
    "radial-gradient(circle at top right, rgba(99,102,241,0.18), transparent 60%)",
  pointerEvents: "none",
};

const premiumHeaderRow = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const premiumBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.4px",
  color: "#f5c542",
  background: "rgba(245, 197, 66, 0.12)",
  border: "1px solid rgba(245, 197, 66, 0.35)",
  boxShadow: "0 0 10px rgba(245, 197, 66, 0.2)",
};

const premiumBadgeIcon = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const sectionCard = {
  borderRadius: "22px",
  padding: "26px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  minWidth: 0,
  overflow: "visible",
  position: "relative",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const sectionHeaderCompact = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "8px",
  flexWrap: "wrap",
};

const sectionHeaderMini = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginTop: "16px",
  marginBottom: "12px",
  flexWrap: "wrap",
};

const sectionEyebrow = {
  marginBottom: "10px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(125,211,252,0.76)",
};

const sectionTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: "700",
  color: "white",
};

const sectionText = {
  margin: "10px 0 0 0",
  fontSize: "14px",
  lineHeight: "1.8",
  color: "rgba(255,255,255,0.68)",
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.82fr)",
  gap: "22px",
  alignItems: "start",
};

const leftColumn = {
  display: "grid",
  gap: "22px",
  minWidth: 0,
  position: "relative",
  zIndex: 2,
};

const rightColumn = {
  display: "grid",
  gap: "22px",
  alignSelf: "start",
};

const twoColGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "18px",
};

const premiumFieldsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  alignItems: "start",
  marginTop: "8px",
};

const ticketCategoriesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  alignItems: "start",
  marginTop: "10px",
};

const optionMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const fieldWrap = {
  display: "grid",
  gap: "14px",
  minWidth: 0,
  alignContent: "start",
  marginBottom: "6px",
  position: "relative",
  zIndex: 1,
};

const fieldTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const fieldLabel = {
  display: "block",
  fontSize: "13px",
  fontWeight: "700",
  color: "rgba(255,255,255,0.88)",
  lineHeight: 1.45,
  margin: "0 0 4px 0",
};

const textInput = {
  minHeight: "48px",
  borderRadius: "14px",
  padding: "13px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "white",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "block",
};

const textareaInput = {
  minHeight: "132px",
  borderRadius: "16px",
  padding: "16px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "white",
  fontSize: "14px",
  outline: "none",
  resize: "vertical",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  fontFamily: "inherit",
  lineHeight: "1.7",
  display: "block",
  marginTop: "2px",
};

const dropdownWrap = {
  position: "relative",
  width: "100%",
  zIndex: 20,
};

function dropdownButton(open) {
  return {
    minHeight: "46px",
    width: "100%",
    borderRadius: "14px",
    padding: "12px 14px",
    background: open ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
    border: open
      ? "1px solid rgba(96,165,250,0.34)"
      : "1px solid rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    cursor: "pointer",
    boxShadow: open ? "0 0 0 4px rgba(59,130,246,0.08)" : "none",
  };
}

const dropdownButtonText = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
  flex: 1,
};
const nativeSelectStyle = {
  width: "100%",
  minHeight: "48px",
  borderRadius: "14px",
  padding: "0 42px 0 14px",
  background: "#182338",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "white",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
};

const nativeSelectArrow = {
  position: "absolute",
  right: "14px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "rgba(255,255,255,0.7)",
  pointerEvents: "none",
  fontSize: "14px",
};

const dropdownPlaceholder = {
  color: "rgba(255,255,255,0.45)",
};

const dropdownArrow = {
  color: "rgba(255,255,255,0.68)",
  fontSize: "12px",
};

const dropdownMenu = {
  position: "absolute",
  top: "100%", // clean attach
  left: 0,
  right: 0,

  marginTop: "8px",

  zIndex: 9999,

  maxHeight: "260px",
  overflowY: "auto",

  borderRadius: "14px",

  background: "#0b1220", // 🔥 DARK solid instead of glass
  border: "1px solid rgba(255,255,255,0.06)",

  boxShadow: "0 18px 40px rgba(0,0,0,0.55)",

  padding: "6px",

  animation: "dropdownFade 0.15s ease",
};

function dropdownOption(active) {
  return {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "10px 12px",

    background: active
      ? "rgba(59,130,246,0.15)"
      : "transparent",

    color: "white",
    fontSize: "14px",
    textAlign: "left",
    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    gap: "10px",

    marginBottom: "4px",
  };
}

const dropdownMenuHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "6px 6px 12px 6px",
  marginBottom: "4px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const dropdownMenuTitle = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.55)",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "6px 10px",
};

const dropdownEmpty = {
  padding: "12px 8px",
  color: "rgba(255,255,255,0.54)",
  fontSize: "14px",
};

const clearMiniButton = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: "999px",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "700",
};

const multiDropdownTriggerInner = {
  minHeight: "20px",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  flex: 1,
};

const dropdownCheck = {
  width: "16px",
  minWidth: "16px",
  color: "#60a5fa",
  fontWeight: "800",
};

const colorInputWrap = {
  display: "grid",
  gridTemplateColumns: "56px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
};

const colorPicker = {
  width: "56px",
  height: "46px",
  padding: 0,
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  cursor: "pointer",
};

const segmentWrap = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

function segmentButton(active) {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
      : "rgba(255,255,255,0.04)",
    color: "white",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: active ? "0 8px 18px rgba(59,130,246,0.22)" : "none",
  };
}

const optionTabsWrap = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

function optionTab(active) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "999px",
    padding: "10px 14px",
    color: "white",
    cursor: "pointer",
    border: active
      ? "1px solid rgba(96,165,250,0.34)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
    boxShadow: active ? "0 10px 24px rgba(59,130,246,0.12)" : "none",
  };
}

const actionRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const questionListWrap = {
  display: "grid",
  gap: "14px",
};

const questionCard = {
  borderRadius: "18px",
  padding: "16px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "visible",
  position: "relative",
};

const helperEmptyBox = {
  padding: "16px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.62)",
  fontSize: "14px",
};

const subCard = {
  borderRadius: "18px",
  padding: "18px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "visible",
  position: "relative",
  minHeight: "190px",
};

const subCardStack = {
  display: "grid",
  gap: "18px",
  alignContent: "start",
};

const toggleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  minHeight: "34px",
  marginBottom: "10px",
};

const toggleLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "rgba(255,255,255,0.84)",
  lineHeight: 1.4,
};

const previewCard = {
  marginTop: "12px",
  borderRadius: "18px",
  padding: "18px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const previewImage = {
  width: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "14px",
  display: "block",
  marginBottom: "14px",
};

const previewMessage = {
  display: "grid",
  gap: "10px",
};

const previewAccentBar = {
  height: "4px",
  borderRadius: "999px",
  width: "76px",
  marginBottom: "4px",
};

const previewTitle = {
  fontSize: "22px",
  fontWeight: "800",
  color: "white",
  lineHeight: 1.2,
};

const previewDescription = {
  fontSize: "14px",
  lineHeight: "1.8",
  color: "rgba(255,255,255,0.72)",
};

const previewDropdown = {
  borderRadius: "14px",
  padding: "12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: "8px",
};

const staffRolesBlock = {
  marginTop: "22px",
  display: "grid",
  gap: "12px",
  position: "relative",
  zIndex: 6,
};

const previewDropdownLabel = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.52)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: "800",
};

const previewDropdownItem = {
  borderRadius: "12px",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "white",
};

const previewDropdownDesc = {
  marginTop: "4px",
  color: "rgba(255,255,255,0.64)",
  fontSize: "13px",
};

const previewButtonsWrap = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

function previewButton(style) {
  const styles = {
    primary: {
      background:
        "linear-gradient(135deg, rgba(88,101,242,0.22), rgba(88,101,242,0.12))",
      border: "1px solid rgba(88,101,242,0.42)",
    },
    secondary: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
    },
    success: {
      background:
        "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))",
      border: "1px solid rgba(34,197,94,0.34)",
    },
    danger: {
      background:
        "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.08))",
      border: "1px solid rgba(239,68,68,0.34)",
    },
  };

  return {
    borderRadius: "12px",
    padding: "10px 14px",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    ...styles[style || "secondary"],
  };
}

const previewActionControls = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

function previewControl(style) {
  return {
    ...previewButton(style),
    fontSize: "13px",
    padding: "8px 12px",
  };
}

const previewFooter = {
  marginTop: "6px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.52)",
  fontSize: "12px",
};

const previewLiveBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 10px",
  borderRadius: "999px",
  background: "rgba(34,197,94,0.10)",
  border: "1px solid rgba(34,197,94,0.20)",
  color: "#bbf7d0",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const summaryRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const summaryKey = {
  color: "rgba(255,255,255,0.54)",
  fontSize: "13px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const summaryValue = {
  color: "white",
  fontSize: "14px",
  fontWeight: "600",
  textAlign: "right",
  wordBreak: "break-word",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.64)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 100,
};

const modalCard = {
  width: "100%",
  maxWidth: "520px",
  borderRadius: "24px",
  padding: "24px",
  background: "rgba(11,16,28,0.98)",
  border: "1px solid rgba(96,165,250,0.18)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

const modalTitle = {
  margin: 0,
  color: "white",
  fontSize: "24px",
  fontWeight: "800",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
  flexWrap: "wrap",
};

const helperText = {
  color: "rgba(255,255,255,0.56)",
  fontSize: "13px",
  lineHeight: "1.7",
};

const badgeWrap = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const roleBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 10px",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.10)",
  border: "1px solid rgba(59,130,246,0.18)",
  color: "white",
  fontSize: "12px",
  fontWeight: "700",
};

const prefixTag = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.72)",
  fontSize: "12px",
  fontWeight: "800",
};

const noticeBox = {
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(59,130,246,0.08)",
  border: "1px solid rgba(59,130,246,0.16)",
  color: "white",
  fontSize: "14px",
  lineHeight: "1.7",
};

const premiumMiniBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#fde68a",
  background: "rgba(251,191,36,0.12)",
  border: "1px solid rgba(251,191,36,0.22)",
};

const lockedOverlay = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "rgba(3,6,14,0.52)",
  borderRadius: "18px",
  backdropFilter: "blur(4px)",
};

function lockedFieldShell(locked) {
  return {
    opacity: locked ? 0.6 : 1,
    padding: "2px",
    borderRadius: "16px",
    background: locked ? "rgba(251,191,36,0.03)" : "transparent",
    border: locked ? "1px dashed rgba(251,191,36,0.12)" : "1px solid transparent",
  };
}

const lockedCard = {
  maxWidth: "420px",
  textAlign: "center",
  borderRadius: "20px",
  padding: "20px",
  background: "rgba(11,16,28,0.96)",
  border: "1px solid rgba(251,191,36,0.16)",
  boxShadow: "0 16px 44px rgba(0,0,0,0.38)",
};

const lockedIconWrap = {
  width: "42px",
  height: "42px",
  margin: "0 auto 10px auto",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fde68a",
  background: "rgba(251,191,36,0.10)",
  border: "1px solid rgba(251,191,36,0.18)",
};

const lockedTitle = {
  color: "white",
  fontSize: "18px",
  fontWeight: "800",
  marginBottom: "6px",
};

const lockedText = {
  color: "rgba(255,255,255,0.68)",
  fontSize: "14px",
  lineHeight: "1.7",
};

const primaryButton = {
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  fontWeight: "800",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(59,130,246,0.24)",
};

const successButton = {
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  color: "white",
  fontWeight: "800",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(34,197,94,0.22)",
};

const softButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
};

const dangerButton = {
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  color: "white",
  fontWeight: "800",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(239,68,68,0.24)",
};

const dangerSoftButton = {
  border: "1px solid rgba(239,68,68,0.22)",
  borderRadius: "12px",
  padding: "12px 16px",
  background: "rgba(239,68,68,0.08)",
  color: "#fca5a5",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
};

const primarySmallButton = {
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
};

function trialButton(active) {
  return {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    background: active
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "white",
    fontWeight: "800",
    fontSize: "14px",
    cursor: active ? "default" : "pointer",
    boxShadow: active ? "none" : "0 10px 22px rgba(245,158,11,0.22)",
  };
}

function statusPill(tone) {
  const tones = {
    neutral: {
      background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
      border: "1px solid rgba(255,255,255,0.14)",
      color: "rgba(255,255,255,0.9)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
    success: {
      background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.08))",
      border: "1px solid rgba(16,185,129,0.30)",
      color: "#d1fae5",
      boxShadow: "0 0 18px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
    },
    warning: {
      background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))",
      border: "1px solid rgba(245,158,11,0.30)",
      color: "#fde68a",
      boxShadow: "0 0 18px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
    },
    primary: {
      background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.08))",
      border: "1px solid rgba(59,130,246,0.30)",
      color: "#dbeafe",
      boxShadow: "0 0 18px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
    },
    premium: {
      background: "linear-gradient(135deg, rgba(245,158,11,0.20), rgba(251,191,36,0.10))",
      border: "1px solid rgba(245,158,11,0.34)",
      color: "#fef3c7",
      boxShadow: "0 0 18px rgba(245,158,11,0.14), inset 0 1px 0 rgba(255,255,255,0.05)",
    },
  };

 return {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 14px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  backdropFilter: "blur(10px)",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
  cursor: "default",
  transform: "translateY(0px)",
  ...tones[tone || "neutral"],
};
}

function switchTrack(active, disabled = false) {
  return {
    width: "52px",
    height: "30px",
    borderRadius: "999px",
    border: active
      ? "1px solid rgba(34,197,94,0.36)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))"
      : "rgba(255,255,255,0.08)",
    padding: "3px",
    position: "relative",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    opacity: disabled ? 0.6 : 1,
    boxShadow: active ? "0 8px 20px rgba(34,197,94,0.22)" : "none",
    flexShrink: 0,
  };
}

function switchThumb(active) {
  return {
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    background: "#ffffff",
    display: "block",
    transform: active ? "translateX(22px)" : "translateX(0px)",
    transition: "transform 0.2s ease",
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
  };
}

const infoMiniCard = {
  borderRadius: "16px",
  padding: "14px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const infoMiniLabel = {
  fontSize: "11px",
  fontWeight: "800",
  color: "rgba(255,255,255,0.48)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const infoMiniValue = {
  color: "white",
  fontSize: "14px",
  fontWeight: "700",
  lineHeight: "1.5",
};
