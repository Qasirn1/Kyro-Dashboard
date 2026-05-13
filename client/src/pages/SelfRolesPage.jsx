import { useEffect, useMemo, useRef, useState } from "react";
import PageLoader from "../components/PageLoader";
import GlobalEmojiPicker from "../components/GlobalEmojiPicker";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Settings2,
  LayoutPanelTop,
  Hash,
  ShieldCheck,
  Paintbrush,
  ChevronDown,
  Check,
  Palette,
  Image as ImageIcon,
  Crown,
  Save,
  Send,
  PencilLine,
  Lock,
} from "lucide-react";

import API_BASE from "../config/api";

const COLOR_PRESETS = [
  "#5865F2",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#6B7280",
  "#111827",
];


function createPanel() {
  const now = Date.now();

  return {
    id: `panel_${now}`,
    name: "New Role Panel",
    type: "buttons",
    selectionMode: "single",
    channelId: "",
    messageId: "",
    enabled: true,
    buttonStyle: "Secondary",
    placeholder: "Choose your role",
    embed: {
      title: "Pick your roles",
      description: "Choose the roles you want from the panel below.",
      color: "#5865F2",
      footer: "",
      banner: "",
      headerIcon: "",
      thumbnail: "",
    },
    sentPanel: {
      messageId: "",
      channelId: "",
      publishedAt: null,
    },
    options: [],
  };
}

function createOption() {
  const now = Date.now();

  return {
    id: `opt_${now}`,
    roleId: "",
    label: "",
    emoji: "",
    description: "",
  };
}

function normalizeEmojiValue(value, serverEmojis = []) {
  if (!value) return "";

  if (typeof value === "object" && value !== null) {
    return {
      id: value.id || null,
      name: value.name || "",
      animated: !!value.animated,
      url:
        value.url ||
        (value.id
          ? `https://cdn.discordapp.com/emojis/${value.id}.${value.animated ? "gif" : "png"}?size=64`
          : ""),
      identifier:
        value.identifier ||
        (value.id
          ? `<${value.animated ? "a" : ""}:${value.name}:${value.id}>`
          : ""),
    };
  }

  if (typeof value === "string" && value.startsWith("<")) {
    const matched = serverEmojis.find((emoji) => emoji.identifier === value);
    if (matched) {
      return {
        id: matched.id,
        name: matched.name,
        animated: !!matched.animated,
        url: matched.url,
        identifier: matched.identifier,
      };
    }
  }

  return value;
}

function getFocusHandlers() {
  return {
    onFocus: (e) => {
      e.target.style.border = "1px solid rgba(88,101,242,0.34)";
      e.target.style.boxShadow = "0 0 0 4px rgba(88,101,242,0.10)";
      e.target.style.background =
        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))";
    },
    onBlur: (e) => {
      e.target.style.border = "1px solid rgba(255,255,255,0.08)";
      e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03)";
      e.target.style.background =
        "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))";
    },
  };
}
function EmojiVisual({ value, serverEmojis }) {
  const normalized = normalizeEmojiValue(value, serverEmojis);

  if (!normalized) {
    return <span style={{ fontSize: "18px" }}>🙂</span>;
  }

  if (typeof normalized === "object" && normalized?.id) {
    return (
      <img
        src={normalized.url}
        alt={normalized.name}
        style={{ width: 20, height: 20, objectFit: "contain" }}
      />
    );
  }

  return <span style={{ fontSize: "18px" }}>{normalized}</span>;
}

function parseCustomEmojiParts(text, serverEmojis = []) {
  if (!text) return [text];

  const regex = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const full = match[0];
    const name = match[1];
    const id = match[2];
    const animated = full.startsWith("<a:");
    const matchedServerEmoji = serverEmojis.find((emoji) => emoji.id === id);

    parts.push({
      type: "customEmoji",
      id,
      name,
      animated,
      url:
        matchedServerEmoji?.url ||
        `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=64`,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function RichTextWithCustomEmojis({ text, serverEmojis, style }) {
  const parts = parseCustomEmojiParts(text, serverEmojis);

  return (
    <span style={style}>
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return <span key={index}>{part}</span>;
        }

        if (part?.type === "customEmoji") {
          return (
            <img
              key={`${part.id}-${index}`}
              src={part.url}
              alt={part.name}
              style={{
                width: 20,
                height: 20,
                objectFit: "contain",
                verticalAlign: "middle",
                margin: "0 3px",
              }}
            />
          );
        }

        return null;
      })}
    </span>
  );
}

function useOutsideClose(ref, onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleMouseDown(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onClose, enabled]);
}

function useViewportFlags() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 980 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 980);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile };
}

function HoverButton({
  children,
  onClick,
  style,
  hoverStyle,
  disabled,
  title,
  type = "button",
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...style,
        ...(hovered && !disabled ? hoverStyle : {}),
      }}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  const [hovered, setHovered] = useState(false);

  return (
    <label style={toggleWrap}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...toggleTrack,
          background: checked
            ? "linear-gradient(135deg, #4f6bff, #6d5dfc)"
            : "rgba(255,255,255,0.08)",
          justifyContent: checked ? "flex-end" : "flex-start",
          boxShadow: hovered
            ? checked
              ? "0 0 0 1px rgba(109,93,252,0.35), 0 8px 18px rgba(79,107,255,0.22)"
              : "0 0 0 1px rgba(255,255,255,0.12), 0 8px 18px rgba(0,0,0,0.18)"
            : "none",
          transform: hovered ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <span style={toggleKnob} />
      </button>
      {label ? <span style={toggleLabel}>{label}</span> : null}
    </label>
  );
}

function PremiumPill({ text = "Premium" }) {
  return (
    <span style={premiumPill}>
      <Crown size={12} />
      <span>{text}</span>
    </span>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, right, style: customStyle }) {
  const [hovered, setHovered] = useState(false);

  return (
<div
  style={{
    ...sectionCard,
    ...customStyle,
    position: "relative",
    overflow: "visible",
    zIndex: customStyle?.zIndex ?? 1,
    transform: hovered ? "translateY(-2px)" : "translateY(0)",
    boxShadow: hovered
      ? "0 20px 50px rgba(0,0,0,0.28), 0 0 0 1px rgba(88,101,242,0.08) inset"
      : sectionCard.boxShadow,
  }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={sectionHeader}>
        <div style={sectionHeaderLeft}>
          {Icon ? (
            <div style={sectionIconWrap}>
              <Icon size={16} />
            </div>
          ) : null}
          <div>
            <div style={sectionTitle}>{title}</div>
            {subtitle ? <div style={sectionSubtitle}>{subtitle}</div> : null}
          </div>
        </div>
        {right || null}
      </div>

      <div style={sectionDivider} />
      <div>{children}</div>
    </div>
  );
}

function SingleSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  getLabel,
  getValue,
  getSearchText,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useOutsideClose(
    ref,
    () => {
      setOpen(false);
      setQuery("");
    },
    open
  );

  const selected = options.find((item) => getValue(item) === value);

  const filteredOptions = options.filter((item) => {
    const label = getLabel(item) || "";
    const searchText = getSearchText ? getSearchText(item) : label;
    return searchText.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div ref={ref} style={selectWrap}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (open) setQuery("");
        }}
        style={{
          ...selectButton,
          boxShadow: open ? "0 0 0 1px rgba(88,101,242,0.28)" : "none",
        }}
      >
        <span style={selectButtonText(selected)}>
          {selected ? getLabel(selected) : placeholder}
        </span>
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
        <div style={selectMenu}>
          <div style={selectSearchWrap}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              style={selectSearchInput}
              {...getFocusHandlers()}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            style={selectOption}
          >
            <span style={{ color: "rgba(255,255,255,0.55)" }}>{placeholder}</span>
          </button>

          {filteredOptions.length ? (
            filteredOptions.map((item) => {
              const itemValue = getValue(item);
              const active = itemValue === value;
              const label = getLabel(item);

              return (
                <button
                  key={itemValue}
                  type="button"
                  onClick={() => {
                    onChange(itemValue);
                    setOpen(false);
                    setQuery("");
                  }}
                  title={getSearchText ? getSearchText(item) : label}
                  style={{
                    ...selectOption,
                    background: active ? "rgba(88,101,242,0.14)" : "transparent",
                  }}
                >
                  <span style={selectOptionText}>{label}</span>
                  {active ? <Check size={15} /> : null}
                </button>
              );
            })
          ) : (
            <div style={selectEmptyState}>No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeTabs({ value, onChange, options }) {
  return (
    <div style={modeTabsWrap}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            style={{
              ...modeTabButton,
              ...(active ? modeTabButtonActive : {}),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorPickerRow({ value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClose(ref, () => setPickerOpen(false), pickerOpen);

  return (
    <div style={fieldBlock}>
      <label style={labelStyle}>Embed Color</label>

      <div style={colorRow}>
        <div style={{ flex: 1 }}>
          <input
            value={value || "#5865F2"}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#5865F2"
            style={inputStyle}
            {...getFocusHandlers()}
          />
        </div>

        <div ref={ref} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setPickerOpen((prev) => !prev)}
            style={{
              ...colorPreviewButton,
              background: value || "#5865F2",
            }}
            title="Open color picker"
          >
            <Palette size={16} color="#fff" />
          </button>

          {pickerOpen && (
            <div style={colorPopover}>
              <div style={colorPopoverTitle}>Quick colors</div>
              <div style={presetGrid}>
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onChange(preset);
                      setPickerOpen(false);
                    }}
                    style={{
                      ...presetSwatch,
                      background: preset,
                    }}
                    title={preset}
                  />
                ))}
              </div>

              <div style={colorPopoverDivider} />

              <label style={colorNativeLabel}>
                <span style={colorPopoverTitle}>Custom</span>
                <input
                  type="color"
                  value={value || "#5865F2"}
                  onChange={(e) => onChange(e.target.value)}
                  style={nativeColorInput}
                  {...getFocusHandlers()}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmojiPicker({ value, onChange, serverEmojis = [] }) {
  return (
    <GlobalEmojiPicker
      value={value}
      onChange={onChange}
      serverEmojis={serverEmojis}
    />
  );
}

function ButtonStyleChooser({ value, onChange }) {
  const styles = [
    { id: "Primary", label: "Primary", color: "#5865F2" },
    { id: "Secondary", label: "Secondary", color: "#6B7280" },
    { id: "Success", label: "Success", color: "#22C55E" },
    { id: "Danger", label: "Danger", color: "#EF4444" },
  ];

  return (
    <div style={fieldBlock}>
      <label style={labelStyle}>Button Style</label>
      <div style={buttonStyleRow}>
        {styles.map((style) => {
          const active = style.id === value;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              style={{
                ...styleSwatchButton,
                ...(active ? styleSwatchButtonActive : {}),
              }}
            >
              <span
                style={{
                  ...styleDot,
                  background: style.color,
                }}
              />
              <span>{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AssetField({
  label,
  value,
  onChange,
  premium = false,
  locked = false,
  placeholder = "https://...",
}) {
  return (
    <div style={fieldBlock}>
      <div style={assetLabelRow}>
        <label style={labelStyle}>{label}</label>
        {premium ? <PremiumPill /> : null}
      </div>

      <input
        value={value || ""}
        onChange={(e) => !locked && onChange(e.target.value)}
        placeholder={locked ? "Premium field" : placeholder}
        style={{
          ...inputStyle,
          ...(locked ? lockedInputStyle : {}),
        }}
        {...getFocusHandlers()}
        disabled={locked}
      />

      {locked ? (
        <div style={lockedHelperRow}>
          <Lock size={13} />
          <span>Available on premium only</span>
        </div>
      ) : (
        <div style={assetUrlHint}>
          Paste a direct image URL for this field.
        </div>
      )}

      {value ? (
        <div style={assetPreviewWrap}>
          <img
            src={value}
            alt={label}
            style={assetPreviewImage}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function PanelPreview({ panel, serverEmojis, roles }) {
  const previewColor = panel.embed?.color || "#5865F2";

  function getRoleName(roleId) {
    return roles.find((role) => role.id === roleId)?.name || "Role";
  }

  return (
    <div style={previewCard}>
      <div style={previewHeader}>
        <div style={previewAvatar}>K</div>
        <div>
          <div style={previewName}>Kyro</div>
          <div style={previewMeta}>BOT • Preview</div>
        </div>
      </div>

      <div style={{ ...discordEmbedPreview, borderLeft: `4px solid ${previewColor}` }}>
        {(panel.embed?.headerIcon || panel.name) && (
          <div style={previewAuthorRow}>
            {panel.embed?.headerIcon ? (
              <img src={panel.embed.headerIcon} alt="Header icon" style={previewAuthorIcon} />
            ) : null}
            <span>{panel.name || "Self Roles"}</span>
          </div>
        )}

        <div style={previewBodyRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {panel.embed?.title ? (
              <div style={previewEmbedTitle}>
                <RichTextWithCustomEmojis
                  text={panel.embed.title}
                  serverEmojis={serverEmojis}
                />
              </div>
            ) : null}

            {panel.embed?.description ? (
              <div style={previewEmbedDescription}>
                <RichTextWithCustomEmojis
                  text={panel.embed.description}
                  serverEmojis={serverEmojis}
                />
              </div>
            ) : null}
          </div>

          {panel.embed?.thumbnail ? (
            <img src={panel.embed.thumbnail} alt="Thumbnail" style={previewThumb} />
          ) : null}
        </div>

              {panel.embed?.banner &&
        typeof panel.embed.banner === "string" &&
        panel.embed.banner.startsWith("http") ? (
          <div style={previewBannerWrap}>
            <img src={panel.embed.banner} alt="Banner" style={previewBannerImage} />
          </div>
        ) : null}

        {panel.type === "buttons" && panel.options?.length ? (
          <div style={previewButtonRow}>
            {panel.options.slice(0, 5).map((option) => (
              <div key={option.id} style={previewButtonChip(panel.buttonStyle)}>
                <EmojiVisual value={option.emoji} serverEmojis={serverEmojis} />
                <span>{option.label || getRoleName(option.roleId)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {panel.type === "dropdown" && (
          <div style={previewDropdownBox}>
            <span>{panel.placeholder || "Choose your role"}</span>
            <ChevronDown size={16} />
          </div>
        )}

        {panel.type === "reactions" && panel.options?.length ? (
          <div style={previewReactionRow}>
            {panel.options.map((option) => (
              <div key={option.id} style={previewReactionChip}>
                <EmojiVisual value={option.emoji} serverEmojis={serverEmojis} />
                <span>{getRoleName(option.roleId)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {panel.embed?.footer ? (
          <div style={previewFooter}>
            <RichTextWithCustomEmojis
              text={panel.embed.footer}
              serverEmojis={serverEmojis}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
function PremiumGlowButton({
  children,
  onClick,
  style,
  hoverStyle,
  disabled,
  title,
  type = "button",
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...style,
        ...(hovered && !disabled ? hoverStyle : {}),
      }}
    >
      <span style={premiumGlowInner}>{children}</span>

      <span
        style={{
          ...premiumGlowSweep,
          transform: hovered ? "translateX(180%) skewX(-24deg)" : "translateX(-180%) skewX(-24deg)",
          opacity: hovered ? 1 : 0,
        }}
      />
    </button>
  );
}
export default function SelfRolesPage({ selectedGuild, setGlobalToast }) {
  const guildId = selectedGuild?.id || "";
  const { isMobile } = useViewportFlags();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
const [publishingPanelId, setPublishingPanelId] = useState(null);
const [updatingPanelId, setUpdatingPanelId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [serverEmojis, setServerEmojis] = useState([]);

  const [selfRoles, setSelfRoles] = useState({
    enabled: false,
    panels: [],
  });

  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
const [view, setView] = useState("overview");
const [searchQuery, setSearchQuery] = useState("");
const [draggedOptionId, setDraggedOptionId] = useState(null);
const [deleteTargetPanel, setDeleteTargetPanel] = useState(null);

function reorderArray(list, startId, targetId) {
  const startIndex = list.findIndex((item) => item.id === startId);
  const targetIndex = list.findIndex((item) => item.id === targetId);

  if (startIndex === -1 || targetIndex === -1 || startIndex === targetIndex) {
    return list;
  }

  const updated = [...list];
  const [moved] = updated.splice(startIndex, 1);
  updated.splice(targetIndex, 0, moved);
  return updated;
}

function reorderSelectedPanelOptions(startId, targetId) {
  if (!selectedPanelId || !startId || !targetId || startId === targetId) return;

  setSelfRoles((prev) => ({
    ...prev,
    panels: prev.panels.map((panel) => {
      if (panel.id !== selectedPanelId) return panel;

      return {
        ...panel,
        options: reorderArray(panel.options || [], startId, targetId),
      };
    }),
  }));
}
  const selectedPanel = useMemo(() => {
    return selfRoles.panels.find((panel) => panel.id === selectedPanelId) || null;
  }, [selfRoles.panels, selectedPanelId]);

  const selectedOption = useMemo(() => {
    if (!selectedPanel) return null;
    return (selectedPanel.options || []).find((option) => option.id === selectedOptionId) || null;
  }, [selectedPanel, selectedOptionId]);

  const filteredPanels = useMemo(() => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return selfRoles.panels;

  return selfRoles.panels.filter((panel) => {
    const channelName =
      channels.find((channel) => channel.id === panel.channelId)?.name || "";

    return (
      (panel.name || "").toLowerCase().includes(query) ||
      (panel.type || "").toLowerCase().includes(query) ||
      (panel.selectionMode || "").toLowerCase().includes(query) ||
      channelName.toLowerCase().includes(query)
    );
  });
}, [selfRoles.panels, searchQuery, channels]);

  useEffect(() => {
    if (!guildId) {
      setLoading(false);
      return;
    }

    fetchSelfRoles();
    fetchResources();
  }, [guildId]);
useEffect(() => {
  if (!saveMessage) return;

  const timeout = setTimeout(() => {
    setSaveMessage("");
  }, 3000);

  return () => clearTimeout(timeout);
}, [saveMessage]);
  async function fetchSelfRoles() {
    try {
      setLoading(true);
      setError("");
      setSaveMessage("");

      const response = await fetch(`${API_BASE}/api/guilds/${guildId}/selfroles`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load self roles settings");
      }

      const incoming = data.selfRoles || {
        enabled: false,
        panels: [],
      };

      const safePanels = Array.isArray(incoming.panels)
        ? incoming.panels.map((panel) => ({
            ...panel,
            embed: {
              title: panel.embed?.title || "Pick your roles",
              description:
                panel.embed?.description ||
                "Choose the roles you want from the panel below.",
              color: panel.embed?.color || "#5865F2",
              footer: panel.embed?.footer || "",
              banner: panel.embed?.banner || "",
              headerIcon: panel.embed?.headerIcon || "",
              thumbnail: panel.embed?.thumbnail || "",
            },
            sentPanel: {
              messageId: panel.sentPanel?.messageId || panel.messageId || "",
              channelId: panel.sentPanel?.channelId || panel.channelId || "",
              publishedAt: panel.sentPanel?.publishedAt || null,
            },
            options: Array.isArray(panel.options)
              ? panel.options.map((option) => ({
                  ...option,
                  emoji: normalizeEmojiValue(option.emoji, serverEmojis),
                }))
              : [],
          }))
        : [];

      setSelfRoles({
        enabled: incoming.enabled ?? false,
        panels: safePanels,
      });

      if (safePanels.length && !selectedPanelId) {
        setSelectedPanelId(safePanels[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load self roles settings");
    } finally {
      setLoading(false);
    }
  }

  async function fetchResources() {
    try {
      setLoadingResources(true);

      const [channelsRes, rolesRes, emojisRes] = await Promise.all([
        fetch(`${API_BASE}/api/guilds/${guildId}/channels`),
        fetch(`${API_BASE}/api/guilds/${guildId}/roles`),
        fetch(`${API_BASE}/api/guilds/${guildId}/emojis`).catch(() => null),
      ]);

      const channelsData = await channelsRes.json();
      const rolesData = await rolesRes.json();
      const emojisData = emojisRes ? await emojisRes.json() : { success: false, emojis: [] };

      setChannels(channelsData.success ? channelsData.channels || [] : []);
      setRoles(rolesData.success ? rolesData.roles || [] : []);
      setServerEmojis(emojisData.success ? emojisData.emojis || [] : []);
    } catch (err) {
      console.error("Failed to fetch self roles resources:", err);
    } finally {
      setLoadingResources(false);
    }
  }

  function updateSelfRolesField(field, value) {
    setSelfRoles((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateSelectedPanel(field, value) {
    setSelfRoles((prev) => ({
      ...prev,
      panels: prev.panels.map((panel) =>
        panel.id === selectedPanelId ? { ...panel, [field]: value } : panel
      ),
    }));
  }

function updateSelectedPanelEmbed(field, value) {
  const safeValue =
    typeof value === "string" && value.startsWith("data:image/")
      ? ""
      : value;

  setSelfRoles((prev) => ({
    ...prev,
    panels: prev.panels.map((panel) =>
      panel.id === selectedPanelId
        ? {
            ...panel,
            embed: {
              ...panel.embed,
              [field]: safeValue,
            },
          }
        : panel
    ),
  }));
}
  function addPanel() {
    const panel = createPanel();

    setSelfRoles((prev) => ({
      ...prev,
      panels: [...prev.panels, panel],
    }));

    setSelectedPanelId(panel.id);
    setSelectedOptionId("");
    setView("editor");
  }

  function openPanel(panelId) {
    const panel = selfRoles.panels.find((item) => item.id === panelId);
    setSelectedPanelId(panelId);
    setSelectedOptionId(panel?.options?.[0]?.id || "");
    setView("editor");
  }

  function duplicateSelectedPanel() {
    if (!selectedPanel) return;

    const copyId = `panel_${Date.now()}`;
    const duplicated = {
      ...selectedPanel,
      id: copyId,
      messageId: "",
      sentPanel: {
        messageId: "",
        channelId: "",
        publishedAt: null,
      },
      name: `${selectedPanel.name || "Role Panel"} Copy`,
      options: Array.isArray(selectedPanel.options)
        ? selectedPanel.options.map((opt, index) => ({
            ...opt,
            id: `opt_${Date.now()}_${index}`,
          }))
        : [],
    };

    setSelfRoles((prev) => ({
      ...prev,
      panels: [...prev.panels, duplicated],
    }));

    setSelectedPanelId(copyId);
    setSelectedOptionId(duplicated.options?.[0]?.id || "");
    setView("editor");
  }

  function deleteSelectedPanel() {
    if (!selectedPanelId) return;

    const filtered = selfRoles.panels.filter((panel) => panel.id !== selectedPanelId);

    setSelfRoles((prev) => ({
      ...prev,
      panels: filtered,
    }));

    setSelectedPanelId("");
    setSelectedOptionId("");
    setView("overview");
  }

  function addOption() {
    if (!selectedPanelId) return;

    const option = createOption();

    setSelfRoles((prev) => ({
      ...prev,
      panels: prev.panels.map((panel) =>
        panel.id === selectedPanelId
          ? {
              ...panel,
              options: [...(panel.options || []), option],
            }
          : panel
      ),
    }));

    setSelectedOptionId(option.id);
  }

  function updateOption(optionId, field, value) {
    setSelfRoles((prev) => ({
      ...prev,
      panels: prev.panels.map((panel) =>
        panel.id === selectedPanelId
          ? {
              ...panel,
              options: (panel.options || []).map((option) =>
                option.id === optionId ? { ...option, [field]: value } : option
              ),
            }
          : panel
      ),
    }));
  }

  function removeOption(optionId) {
    setSelfRoles((prev) => ({
      ...prev,
      panels: prev.panels.map((panel) => {
        if (panel.id !== selectedPanelId) return panel;

        const filteredOptions = (panel.options || []).filter((option) => option.id !== optionId);

        return {
          ...panel,
          options: filteredOptions,
        };
      }),
    }));

    if (selectedOptionId === optionId) {
      const next = (selectedPanel?.options || []).find((opt) => opt.id !== optionId);
      setSelectedOptionId(next?.id || "");
    }
  }
function confirmDeletePanel(panelId) {
  if (!panelId) return;

  setSelfRoles((prev) => ({
    ...prev,
    panels: prev.panels.filter((panel) => panel.id !== panelId),
  }));

  if (selectedPanelId === panelId) {
    setSelectedPanelId("");
    setSelectedOptionId("");
    setView("overview");
  }

  if (setGlobalToast) {
    setGlobalToast({
      type: "success",
      title: "Panel Removed",
      message: "Self-role panel removed locally. Click Save Settings to keep this change.",
    });
  } else {
    setSaveMessage("Self-role panel removed locally. Click Save Settings to keep this change.");
  }
}
  function buildCleanSelfRolesPayload(payload) {
  return {
    ...payload,
    panels: (payload.panels || []).map((panel) => ({
      ...panel,
      embed: {
        ...panel.embed,
        banner:
          typeof panel.embed?.banner === "string" &&
          panel.embed.banner.startsWith("data:image/")
            ? ""
            : panel.embed?.banner || "",
        thumbnail:
          typeof panel.embed?.thumbnail === "string" &&
          panel.embed.thumbnail.startsWith("data:image/")
            ? ""
            : panel.embed?.thumbnail || "",
        headerIcon:
          typeof panel.embed?.headerIcon === "string" &&
          panel.embed.headerIcon.startsWith("data:image/")
            ? ""
            : panel.embed?.headerIcon || "",
      },
    })),
  };
}
  async function saveSelfRoles() {
    try {
      setSaving(true);
      setError("");
      setSaveMessage("");
const cleanedSelfRoles = buildCleanSelfRolesPayload(selfRoles);
      const response = await fetch(`${API_BASE}/api/guilds/${guildId}/selfroles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedSelfRoles),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save self roles settings");
      }

      const safePanels = Array.isArray(data.selfRoles?.panels)
        ? data.selfRoles.panels.map((panel) => ({
            ...panel,
            options: Array.isArray(panel.options)
              ? panel.options.map((option) => ({
                  ...option,
                  emoji: normalizeEmojiValue(option.emoji, serverEmojis),
                }))
              : [],
          }))
        : selfRoles.panels;

      setSelfRoles({
        enabled: data.selfRoles?.enabled ?? selfRoles.enabled,
        panels: safePanels,
      });

      setSaveMessage("Self roles settings saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save self roles settings");
    } finally {
      setSaving(false);
    }
  }

  async function updateSelectedPanelMessage() {
  if (!selectedPanel) return;

  try {
    setPublishing(true);
    setError("");
    setSaveMessage("");
const cleanedSelfRoles = buildCleanSelfRolesPayload(selfRoles);
    const saveResponse = await fetch(`${API_BASE}/api/guilds/${guildId}/selfroles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      
      body: JSON.stringify(cleanedSelfRoles),
    });

    const saveData = await saveResponse.json();

    if (!saveResponse.ok) {
      throw new Error(saveData.error || "Failed to save panel before updating");
    }

    const publishResponse = await fetch(
      `${API_BASE}/api/guilds/${guildId}/selfroles/${selectedPanel.id}/publish`,
      {
        method: "POST",
      }
    );

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      throw new Error(publishData.error || "Failed to update self-role panel");
    }

    const safePanels = Array.isArray(publishData.selfRoles?.panels)
      ? publishData.selfRoles.panels.map((panel) => ({
          ...panel,
          options: Array.isArray(panel.options)
            ? panel.options.map((option) => ({
                ...option,
                emoji: normalizeEmojiValue(option.emoji, serverEmojis),
              }))
            : [],
        }))
      : selfRoles.panels;

    setSelfRoles((prev) => ({
      ...prev,
      enabled: publishData.selfRoles?.enabled ?? prev.enabled,
      panels: safePanels,
    }));

    setSaveMessage("Self-role panel updated in Discord successfully.");
  } catch (err) {
    setError(err.message || "Failed to update self-role panel");
  } finally {
    setPublishing(false);
  }
}
async function publishSelectedPanel() {
  if (!selectedPanel) return;

  try {
    setPublishing(true);
    setError("");
    setSaveMessage("");
const cleanedSelfRoles = buildCleanSelfRolesPayload(selfRoles);
    // ✅ SAVE FIRST
    const saveResponse = await fetch(`${API_BASE}/api/guilds/${guildId}/selfroles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanedSelfRoles),
    });

    const saveData = await saveResponse.json();

    if (!saveResponse.ok) {
      throw new Error(saveData.error || "Failed to save panel before publishing");
    }

    // ✅ FORCE NEW PANEL
    const publishResponse = await fetch(
      `${API_BASE}/api/guilds/${guildId}/selfroles/${selectedPanel.id}/publish?forceNew=true`,
      {
        method: "POST",
      }
    );

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      throw new Error(publishData.error || "Failed to publish self-role panel");
    }

    // ✅ UPDATE LOCAL STATE
    const safePanels = Array.isArray(publishData.selfRoles?.panels)
      ? publishData.selfRoles.panels.map((panel) => ({
          ...panel,
          options: Array.isArray(panel.options)
            ? panel.options.map((option) => ({
                ...option,
                emoji: normalizeEmojiValue(option.emoji, serverEmojis),
              }))
            : [],
        }))
      : selfRoles.panels;

    setSelfRoles((prev) => ({
      ...prev,
      enabled: publishData.selfRoles?.enabled ?? prev.enabled,
      panels: safePanels,
    }));

    setSaveMessage("Self-role panel published to Discord successfully.");
  } catch (err) {
    setError(err.message || "Failed to publish self-role panel");
  } finally {
    setPublishing(false);
  }
}
  function getRoleName(roleId) {
    return roles.find((role) => role.id === roleId)?.name || "Role";
  }

  if (!guildId) {
    return (
      <div style={pageWrap}>
        <div style={emptyMainCard}>Select a server first.</div>
      </div>
    );
  }

if (loading) {
  return (
    <PageLoader
      title="Loading self roles..."
      subtitle="Preparing role panels, buttons, dropdowns, and panel configuration."
    />
  );
}

  return (
    <div style={pageWrap}>
      <div style={topBar}>
        <div>
          <div style={eyebrow}>KYRO SELF ROLES</div>
          <h1 style={pageTitle}>Self Roles</h1>
          <p style={pageSubtitle}>
            Create Premium Role Panels With Buttons, Dropdowns, and Reactions.
          </p>
        </div>

        <div style={topBarActions}>
          <HoverButton
            type="button"
            onClick={saveSelfRoles}
            disabled={saving}
            style={{
              ...secondaryButton,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
            hoverStyle={secondaryButtonHover}
          >
            <Save size={15} />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </HoverButton>
        </div>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}
      {saveMessage ? <div style={successBox}>{saveMessage}</div> : null}

     {view === "overview" ? (
  <>
    <div style={heroShell}>
      <div style={heroHeaderRow}>
        <div>
          <div style={heroTitle}>Manage Self Role Panels</div>
          <div style={heroSubtitle}>
            Create and manage button, dropdown, or reaction self-role panels for your server.
          </div>
        </div>

        <div style={heroToggleWrap}>
          <ToggleSwitch
            checked={selfRoles.enabled}
            onChange={(value) => updateSelfRolesField("enabled", value)}
            label={selfRoles.enabled ? "Active" : "Inactive"}
          />
        </div>
      </div>

      <div style={heroActionGrid}>
        <button type="button" onClick={addPanel} style={createPanelCard}>
          <div>
            <div style={createPanelTitle}>Create new self-role panel</div>
            <div style={createPanelSubtitle}>
              Start a new self-role flow for your server.
            </div>
          </div>

          <div style={createPanelPlus}>
            <Plus size={20} />
          </div>
        </button>

        <div style={searchCard}>
          <div style={searchInputWrap}>
            <span style={searchIcon}>⌕</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search self-role panels..."
              style={searchInput}
            />
          </div>

          <div style={panelCountPill}>
            {filteredPanels.length} / {selfRoles.panels.length}
          </div>
        </div>
      </div>

      <div style={listShell}>
        <div style={listHeader}>
          <div>
            <div style={listTitle}>Your self-role panels</div>
            <div style={listSubtitle}>
              Saved drafts and published self-role panels
            </div>
          </div>

          <HoverButton
            type="button"
            onClick={saveSelfRoles}
            disabled={saving}
            style={{
              ...secondaryButton,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
            hoverStyle={secondaryButtonHover}
          >
            <Save size={15} />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </HoverButton>
        </div>

        {!filteredPanels.length ? (
          <div style={bigEmptyCard}>
            <div style={bigEmptyTitle}>
              {selfRoles.panels.length ? "No matching panels" : "No self-role panels yet"}
            </div>
            <div style={bigEmptyText}>
              {selfRoles.panels.length
                ? "Try a different search term."
                : "Create your first panel to start building buttons, dropdowns, or emoji reaction role menus."}
            </div>

            {!selfRoles.panels.length ? (
              <HoverButton
                type="button"
                onClick={addPanel}
                style={primaryButton}
                hoverStyle={primaryButtonHover}
              >
                <Plus size={16} />
                <span>Create First Panel</span>
              </HoverButton>
            ) : null}
          </div>
        ) : (
          <div style={panelListStack}>
            {filteredPanels.map((panel) => {
              const channelName =
                channels.find((channel) => channel.id === panel.channelId)?.name ||
                "No channel selected";

              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => openPanel(panel.id)}
                  style={managementCard}
                >
                  <div style={managementCardHeader}>
                    <div style={managementCardIcon}>
                      <LayoutPanelTop size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={managementCardTitle}>
                        {panel.name || "Untitled Panel"}
                      </div>
                      <div style={managementCardMeta}>
                        Mode: {panel.type === "reactions" ? "emoji" : panel.type} ·{" "}
                        {panel.selectionMode === "multi" ? "Multiple Roles" : "Single Role"}
                      </div>
                    </div>

                    <div style={panel.sentPanel?.messageId ? panelBadgeEnabled : panelTypeChip}>
                      {panel.sentPanel?.messageId ? "Published" : "Draft"}
                    </div>
                  </div>

                  <div style={managementCardInfoBox}>
                    <div style={managementInfoLine}>
                      <strong>Channel:</strong> #{channelName}
                    </div>
                    <div style={managementInfoLine}>
                      <strong>Role Options:</strong> {panel.options?.length || 0}
                    </div>
                    <div style={managementInfoLine}>
                      <strong>Status:</strong> {panel.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>

               <div style={managementCardActions}>
  <HoverButton
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      openPanel(panel.id);
    }}
    style={overviewActionButton}
    hoverStyle={overviewActionButtonHover}
  >
    Edit
  </HoverButton>

  <HoverButton
    type="button"
    disabled={publishingPanelId === panel.id}
    onClick={async (e) => {
      e.stopPropagation();

      const targetPanel = selfRoles.panels.find((p) => p.id === panel.id);
      if (!targetPanel) return;

      try {
        setPublishingPanelId(panel.id);
        setError("");
        setSaveMessage("");

        const cleanedSelfRoles = buildCleanSelfRolesPayload(selfRoles);

        const saveResponse = await fetch(`${API_BASE}/api/guilds/${guildId}/selfroles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedSelfRoles),
        });

        const saveData = await saveResponse.json();

        if (!saveResponse.ok) {
          throw new Error(saveData.error || "Failed to save panel before publishing");
        }

        const publishResponse = await fetch(
          `${API_BASE}/api/guilds/${guildId}/selfroles/${panel.id}/publish?forceNew=true`,
          {
            method: "POST",
          }
        );

        const publishData = await publishResponse.json();

        if (!publishResponse.ok) {
          throw new Error(publishData.error || "Failed to publish self-role panel");
        }

        const safePanels = Array.isArray(publishData.selfRoles?.panels)
          ? publishData.selfRoles.panels.map((savedPanel) => ({
              ...savedPanel,
              options: Array.isArray(savedPanel.options)
                ? savedPanel.options.map((option) => ({
                    ...option,
                    emoji: normalizeEmojiValue(option.emoji, serverEmojis),
                  }))
                : [],
            }))
          : selfRoles.panels;

        setSelfRoles((prev) => ({
          ...prev,
          enabled: publishData.selfRoles?.enabled ?? prev.enabled,
          panels: safePanels,
        }));

        if (setGlobalToast) {
          setGlobalToast({
            type: "success",
            title: "Panel Published",
            message: `"${panel.name || "Self-role panel"}" was published successfully.`,
          });
        } else {
          setSaveMessage("Self-role panel published to Discord successfully.");
        }
      } catch (err) {
        if (setGlobalToast) {
          setGlobalToast({
            type: "error",
            title: "Publish Failed",
            message: err.message || "Failed to publish self-role panel",
          });
        } else {
          setError(err.message || "Failed to publish self-role panel");
        }
      } finally {
        setPublishingPanelId(null);
      }
    }}
    style={{
      ...overviewActionButton,
      opacity: publishingPanelId === panel.id ? 0.75 : 1,
      cursor: publishingPanelId === panel.id ? "not-allowed" : "pointer",
    }}
    hoverStyle={publishingPanelId === panel.id ? {} : overviewActionButtonHover}
  >
    {publishingPanelId === panel.id ? "Publishing..." : "Publish"}
  </HoverButton>

  <HoverButton
    type="button"
    disabled={updatingPanelId === panel.id}
    onClick={async (e) => {
      e.stopPropagation();

      const targetPanel = selfRoles.panels.find((p) => p.id === panel.id);
      if (!targetPanel) return;

      if (!targetPanel?.sentPanel?.messageId || !targetPanel?.sentPanel?.channelId) {
        if (setGlobalToast) {
          setGlobalToast({
            type: "info",
            title: "Publish First",
            message: "This panel must be published once before it can be updated.",
          });
        }
        return;
      }

      try {
        setUpdatingPanelId(panel.id);
        setError("");
        setSaveMessage("");

        const cleanedSelfRoles = buildCleanSelfRolesPayload(selfRoles);

        const saveResponse = await fetch(`${API_BASE}/api/guilds/${guildId}/selfroles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedSelfRoles),
        });

        const saveData = await saveResponse.json();

        if (!saveResponse.ok) {
          throw new Error(saveData.error || "Failed to save panel before updating");
        }

        const publishResponse = await fetch(
          `${API_BASE}/api/guilds/${guildId}/selfroles/${panel.id}/publish`,
          {
            method: "POST",
          }
        );

        const publishData = await publishResponse.json();

        if (!publishResponse.ok) {
          throw new Error(publishData.error || "Failed to update self-role panel");
        }

        const safePanels = Array.isArray(publishData.selfRoles?.panels)
          ? publishData.selfRoles.panels.map((savedPanel) => ({
              ...savedPanel,
              options: Array.isArray(savedPanel.options)
                ? savedPanel.options.map((option) => ({
                    ...option,
                    emoji: normalizeEmojiValue(option.emoji, serverEmojis),
                  }))
                : [],
            }))
          : selfRoles.panels;

        setSelfRoles((prev) => ({
          ...prev,
          enabled: publishData.selfRoles?.enabled ?? prev.enabled,
          panels: safePanels,
        }));

        if (setGlobalToast) {
          setGlobalToast({
            type: "success",
            title: "Panel Updated",
            message: `"${panel.name || "Self-role panel"}" was updated successfully.`,
          });
        } else {
          setSaveMessage("Self-role panel updated in Discord successfully.");
        }
      } catch (err) {
        if (setGlobalToast) {
          setGlobalToast({
            type: "error",
            title: "Update Failed",
            message: err.message || "Failed to update self-role panel",
          });
        } else {
          setError(err.message || "Failed to update self-role panel");
        }
      } finally {
        setUpdatingPanelId(null);
      }
    }}
    style={{
      ...overviewUpdateButton,
      opacity: updatingPanelId === panel.id ? 0.75 : 1,
      cursor: updatingPanelId === panel.id ? "not-allowed" : "pointer",
    }}
    hoverStyle={updatingPanelId === panel.id ? {} : overviewUpdateButtonHover}
  >
    {updatingPanelId === panel.id ? "Updating..." : "Update"}
  </HoverButton>

  <HoverButton
    type="button"
    onClick={(e) => {
      e.stopPropagation();

      setGlobalToast({
        type: "error",
        title: "Delete Panel",
        message: `Delete "${panel.name || "this panel"}"?`,
        action: {
          label: "Delete",
          onClick: () => confirmDeletePanel(panel.id),
        },
      });
    }}
    style={overviewDeleteButton}
    hoverStyle={overviewDeleteButtonHover}
  >
    Delete
  </HoverButton>
</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </>
      ) : (
        <>
          <div style={{ ...editorTopBar, ...(isMobile ? editorTopBarMobile : {}) }}>
            <div style={{ ...editorTopLeftGroup, ...(isMobile ? editorTopLeftGroupMobile : {}) }}>
              <HoverButton
                type="button"
                onClick={() => setView("overview")}
                style={backButton}
                hoverStyle={backButtonHover}
              >
                <ArrowLeft size={16} />
              </HoverButton>

              <select
                value={selectedPanel?.id || ""}
                onChange={(e) => {
                  const panel = selfRoles.panels.find((p) => p.id === e.target.value);
                  if (panel) {
                    setSelectedPanelId(panel.id);
                    setSelectedOptionId(panel.options?.[0]?.id || "");
                  }
                }}
                style={panelSelect}
              >
                {selfRoles.panels.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.name}
                  </option>
                ))}
              </select>

              <div
  style={{
    ...panelNameWrap,
    ...(isMobile ? { gridColumn: "1 / -1" } : {}),
  }}
>
  <input
    value={selectedPanel?.name || ""}
    onChange={(e) => updateSelectedPanel("name", e.target.value)}
    placeholder="Panel name"
    style={{
      ...panelNameInput,
      ...(isMobile ? panelNameInputMobile : {}),
    }}
    {...getFocusHandlers()}
  />
  <span style={panelNamePencil}>
    <PencilLine size={16} />
  </span>
</div>
            </div>

            <div style={editorActions}>
              <HoverButton
                type="button"
                onClick={duplicateSelectedPanel}
                style={secondaryButton}
                hoverStyle={secondaryButtonHover}
              >
                <Copy size={15} />
                <span>Duplicate</span>
              </HoverButton>

              <HoverButton
                type="button"
                onClick={publishSelectedPanel}
                disabled={publishing}
                style={{
                  ...primaryButton,
                  opacity: publishing ? 0.7 : 1,
                  cursor: publishing ? "not-allowed" : "pointer",
                }}
                hoverStyle={primaryButtonHover}
              >
                <Send size={15} />
                <span>{publishing ? "Publishing..." : "Publish Panel"}</span>
              </HoverButton>

              <HoverButton
                type="button"
                onClick={updateSelectedPanelMessage}
                disabled={
                  publishing ||
                  !selectedPanel?.sentPanel?.messageId ||
                  !selectedPanel?.sentPanel?.channelId
                }
                title={
                  !selectedPanel?.sentPanel?.messageId || !selectedPanel?.sentPanel?.channelId
                    ? "Publish this panel first before updating it"
                    : "Update the existing published panel message"
                }
                style={{
                  ...updateButton,
                  opacity:
                    publishing ||
                    !selectedPanel?.sentPanel?.messageId ||
                    !selectedPanel?.sentPanel?.channelId
                      ? 0.6
                      : 1,
                  cursor:
                    publishing ||
                    !selectedPanel?.sentPanel?.messageId ||
                    !selectedPanel?.sentPanel?.channelId
                      ? "not-allowed"
                      : "pointer",
                }}
                hoverStyle={updateButtonHover}
              >
                <Save size={15} />
                <span>{publishing ? "Updating..." : "Update Panel"}</span>
              </HoverButton>

              <HoverButton
                type="button"
                onClick={deleteSelectedPanel}
                style={dangerActionButton}
                hoverStyle={dangerActionButtonHover}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </HoverButton>
            </div>
          </div>

          {selectedPanel ? (
            <div
              style={{
                ...editorLayout,
                ...(isMobile ? editorLayoutMobile : {}),
              }}
            >
              <div style={editorMainColumn}>
                <SectionCard
  style={{ zIndex: 50 }}
  icon={LayoutPanelTop}
  title="Panel Settings"
  subtitle="Control the mode, selection behavior, and panel status."
  right={
                    <ToggleSwitch
                      checked={selectedPanel.enabled ?? true}
                      onChange={(value) => updateSelectedPanel("enabled", value)}
                      label={selectedPanel.enabled ? "Enabled" : "Disabled"}
                    />
                  }
                >
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>Interaction Mode</label>
                    <div style={{ marginTop: 10 }}>
                      <ModeTabs
                        value={selectedPanel.type || "buttons"}
                        onChange={(value) => updateSelectedPanel("type", value)}
                        options={[
                          { id: "reactions", label: "Emoji" },
                          { id: "buttons", label: "Button" },
                          { id: "dropdown", label: "Dropdown" },
                        ]}
                      />
                    </div>
                  </div>

                  <div style={{ ...fieldGrid, ...(isMobile ? fieldGridMobile : {}) }}>
                    <div style={fieldBlock}>
                      <label style={labelStyle}>Selection Mode</label>
                      <SingleSelect
                        options={[
                          { id: "single", name: "Single Role" },
                          { id: "multi", name: "Multiple Roles" },
                        ]}
                        value={selectedPanel.selectionMode || "single"}
                        onChange={(value) =>
                          updateSelectedPanel("selectionMode", value || "single")
                        }
                        placeholder="Select mode"
                        getLabel={(item) => item.name}
                        getValue={(item) => item.id}
                      />
                    </div>

                 <div style={{ ...fieldBlock, position: "relative", zIndex: 200 }}>
  <label style={labelStyle}>Target Channel</label>
  <SingleSelect
    options={channels}
    value={selectedPanel.channelId || ""}
    onChange={(value) => updateSelectedPanel("channelId", value)}
    placeholder={loadingResources ? "Loading channels..." : "Select a channel"}
    getLabel={(item) => `# ${item.name}`}
    getValue={(item) => item.id}
    getSearchText={(item) => item.name}
  />
</div>

                    {selectedPanel.type === "dropdown" ? (
                      <div style={{ ...fieldBlock, gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Dropdown Placeholder</label>
                        <input
                          value={selectedPanel.placeholder || ""}
                          onChange={(e) => updateSelectedPanel("placeholder", e.target.value)}
                          placeholder="Choose your role"
                          style={inputStyle}
                          {...getFocusHandlers()}
                        />
                      </div>
                    ) : null}
                  </div>

                  {selectedPanel.type === "buttons" ? (
                    <div style={{ marginTop: 18 }}>
                      <ButtonStyleChooser
                        value={selectedPanel.buttonStyle || "Secondary"}
                        onChange={(value) => updateSelectedPanel("buttonStyle", value)}
                      />
                    </div>
                  ) : null}

                  {selectedPanel.sentPanel?.messageId ? (
                    <div style={publishStatusBox}>
                      This panel is already published in Discord. Clicking{" "}
                      <strong>Update Panel</strong> will edit the existing message instead of
                      reposting.
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard
  style={{ zIndex: 1 }}
  icon={Paintbrush}
  title="Message Builder"
  subtitle="Customize how this self-role panel will look in Discord."
>
                  <div style={{ ...fieldGrid, ...(isMobile ? fieldGridMobile : {}) }}>
                    <div style={fieldBlock}>
                      <label style={labelStyle}>Embed Title</label>
                      <input
                        value={selectedPanel.embed?.title || ""}
                        onChange={(e) => updateSelectedPanelEmbed("title", e.target.value)}
                        placeholder="Pick your roles"
                        style={inputStyle}
                        {...getFocusHandlers()}
                      />
                    </div>

                    <ColorPickerRow
                      value={selectedPanel.embed?.color || "#5865F2"}
                      onChange={(value) => updateSelectedPanelEmbed("color", value)}
                    />

                    <div style={{ ...fieldBlock, gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Embed Description</label>
                      <textarea
                        value={selectedPanel.embed?.description || ""}
                        onChange={(e) =>
                          updateSelectedPanelEmbed("description", e.target.value)
                        }
                        placeholder="Choose the roles you want from the panel below."
                        style={textareaStyle}
                        {...getFocusHandlers()}
                      />
                    </div>

                    <div style={fieldBlock}>
                      <div style={assetLabelRow}>
                        <label style={labelStyle}>Footer Text</label>
                        <PremiumPill />
                      </div>
                      <input
                        value={selectedPanel.embed?.footer || ""}
                        onChange={() => {}}
                        placeholder="Premium field"
                        style={{
                          ...inputStyle,
                          ...lockedInputStyle,
                        }}
                        {...getFocusHandlers()}
                        disabled
                      />
                      <div style={lockedHelperRow}>
                        <Lock size={13} />
                        <span>Available on premium only</span>
                      </div>
                    </div>

                    <AssetField
                      label="Banner"
                      value={selectedPanel.embed?.banner || ""}
                      onChange={(value) => updateSelectedPanelEmbed("banner", value)}
                    />

                    <AssetField
                      label="Header Icon"
                      value={selectedPanel.embed?.headerIcon || ""}
                      onChange={(value) => updateSelectedPanelEmbed("headerIcon", value)}
                      premium
                      locked
                    />

                    <AssetField
                      label="Thumbnail"
                      value={selectedPanel.embed?.thumbnail || ""}
                      onChange={(value) => updateSelectedPanelEmbed("thumbnail", value)}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  icon={ShieldCheck}
                  title={
                    selectedPanel.type === "reactions"
                      ? "Reactions and Roles"
                      : selectedPanel.type === "dropdown"
                      ? "Dropdown Options"
                      : "Buttons and Roles"
                  }
                  subtitle="Add the roles users can pick from this panel."
                  right={
                    <HoverButton
                      type="button"
                      onClick={addOption}
                      style={secondaryButton}
                      hoverStyle={secondaryButtonHover}
                    >
                      <Plus size={15} />
                      <span>
                        {selectedPanel.type === "dropdown"
                          ? "Add Option"
                          : selectedPanel.type === "reactions"
                          ? "Add Reaction"
                          : "Add Button"}
                      </span>
                    </HoverButton>
                  }
                >
                  {selectedPanel.options?.length ? (
                    <>
                      {selectedPanel.type === "buttons" ? (
                        <>
                          <div style={builderChipRow}>
                            {selectedPanel.options.map((option) => {
  const active = option.id === selectedOptionId;
  const dragging = draggedOptionId === option.id;

  return (
    <button
      key={option.id}
      type="button"
      draggable
      onDragStart={() => setDraggedOptionId(option.id)}
      onDragEnd={() => setDraggedOptionId(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        reorderSelectedPanelOptions(draggedOptionId, option.id);
        setDraggedOptionId(null);
      }}
      onClick={() => setSelectedOptionId(option.id)}
      style={{
        ...builderButtonChip(selectedPanel.buttonStyle),
        ...(active ? builderButtonChipActive : {}),
        ...(dragging ? draggableChipDragging : {}),
        ...(draggedOptionId && draggedOptionId !== option.id
          ? draggableDropTarget
          : {}),
      }}
    >
      <span style={dragHandleStyle}>⋮⋮</span>
      <EmojiVisual value={option.emoji} serverEmojis={serverEmojis} />
      <span>{option.label || getRoleName(option.roleId)}</span>
    </button>
  );
})}

                            <HoverButton
                              type="button"
                              onClick={addOption}
                              style={addInlineButton}
                              hoverStyle={addInlineButtonHover}
                            >
                              <Plus size={14} />
                            </HoverButton>
                          </div>
<div style={dragHintText}>
  Drag buttons to reorder them.
</div>
                          {selectedOption ? (
                            <div style={optionEditorCard}>
                              <div style={optionEditorTitle}>Button Editor</div>

                              <div style={{ ...fieldGrid, ...(isMobile ? fieldGridMobile : {}) }}>
                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Emoji</label>
                                  <EmojiPicker
                                    value={selectedOption.emoji}
                                    onChange={(value) =>
                                      updateOption(selectedOption.id, "emoji", value)
                                    }
                                    serverEmojis={serverEmojis}
                                  />
                                </div>

                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Label</label>
                                  <input
                                    value={selectedOption.label || ""}
                                    onChange={(e) =>
                                      updateOption(selectedOption.id, "label", e.target.value)
                                    }
                                    placeholder="Your button"
                                    style={inputStyle}
                                    {...getFocusHandlers()}
                                  />
                                </div>

                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Role</label>
                                  <SingleSelect
                                    options={roles}
                                    value={selectedOption.roleId || ""}
                                    onChange={(value) =>
                                      updateOption(selectedOption.id, "roleId", value)
                                    }
                                    placeholder={loadingResources ? "Loading roles..." : "Select a role"}
                                    getLabel={(item) => `@ ${item.name}`}
                                    getValue={(item) => item.id}
                                    getSearchText={(item) => item.name}
                                  />
                                </div>

                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Description</label>
                                  <input
                                    value={selectedOption.description || ""}
                                    onChange={(e) =>
                                      updateOption(
                                        selectedOption.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Optional helper text"
                                    style={inputStyle}
                                    {...getFocusHandlers()}
                                  />
                                </div>
                              </div>

                              <div style={{ marginTop: 14 }}>
                                <HoverButton
                                  type="button"
                                  onClick={() => removeOption(selectedOption.id)}
                                  style={dangerButton}
                                  hoverStyle={dangerButtonHover}
                                >
                                  <Trash2 size={14} />
                                  <span>Delete Button</span>
                                </HoverButton>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      {selectedPanel.type === "dropdown" ? (
                        <>
                          <div style={optionsStack}>
                            {(selectedPanel.options || []).map((option, index) => {
  const active = option.id === selectedOptionId;
  const dragging = draggedOptionId === option.id;

  return (
    <button
      key={option.id}
      type="button"
      draggable
      onDragStart={() => setDraggedOptionId(option.id)}
      onDragEnd={() => setDraggedOptionId(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        reorderSelectedPanelOptions(draggedOptionId, option.id);
        setDraggedOptionId(null);
      }}
      onClick={() => setSelectedOptionId(option.id)}
      style={{
        ...dropdownOptionRow,
        ...(active ? dropdownOptionRowActive : {}),
        ...(dragging ? draggableChipDragging : {}),
        ...(draggedOptionId && draggedOptionId !== option.id
          ? draggableDropTarget
          : {}),
      }}
    >
                                  <div style={dropdownOptionLeft}>
                                    <span style={dragHandleStyle}>⋮⋮</span>
                                    <EmojiVisual value={option.emoji} serverEmojis={serverEmojis} />
                                    <span>{option.label || `Option ${index + 1}`}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeOption(option.id);
                                    }}
                                    style={miniDangerButton}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </button>
                              );
                            })}
                          </div>
<div style={dragHintText}>Drag options to reorder them.</div>

                          {selectedOption ? (
                            <div style={optionEditorCard}>
                              <div style={optionEditorTitle}>Option Editor</div>

                              <div style={{ ...fieldGrid, ...(isMobile ? fieldGridMobile : {}) }}>
                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Emoji</label>
                                  <EmojiPicker
                                    value={selectedOption.emoji}
                                    onChange={(value) =>
                                      updateOption(selectedOption.id, "emoji", value)
                                    }
                                    serverEmojis={serverEmojis}
                                  />
                                </div>

                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Label</label>
                                  <input
                                    value={selectedOption.label || ""}
                                    onChange={(e) =>
                                      updateOption(selectedOption.id, "label", e.target.value)
                                    }
                                    placeholder="Your option"
                                    style={inputStyle}
                                    {...getFocusHandlers()}
                                  />
                                </div>

                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Role</label>
                                  <SingleSelect
                                    options={roles}
                                    value={selectedOption.roleId || ""}
                                    onChange={(value) =>
                                      updateOption(selectedOption.id, "roleId", value)
                                    }
                                    placeholder={loadingResources ? "Loading roles..." : "Select a role"}
                                    getLabel={(item) => `@ ${item.name}`}
                                    getValue={(item) => item.id}
                                    getSearchText={(item) => item.name}
                                  />
                                </div>

                                <div style={fieldBlock}>
                                  <label style={labelStyle}>Description</label>
                                  <input
                                    value={selectedOption.description || ""}
                                    onChange={(e) =>
                                      updateOption(
                                        selectedOption.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Optional description"
                                    style={inputStyle}
                                    {...getFocusHandlers()}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}

                     {selectedPanel.type === "reactions" ? (
  <>
    <div style={reactionBuilderStack}>
      {(selectedPanel.options || []).map((option) => {
        const dragging = draggedOptionId === option.id;

        return (
          <div
            key={option.id}
            draggable
            onDragStart={() => setDraggedOptionId(option.id)}
            onDragEnd={() => setDraggedOptionId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              reorderSelectedPanelOptions(draggedOptionId, option.id);
              setDraggedOptionId(null);
            }}
            style={{
              ...reactionRowCard,
              ...(dragging ? draggableChipDragging : {}),
              ...(draggedOptionId && draggedOptionId !== option.id
                ? draggableDropTarget
                : {}),
            }}
          >
            <div style={reactionRowLeft}>
              <span style={dragHandleStyle}>⋮⋮</span>

              <EmojiPicker
                value={option.emoji}
                onChange={(value) => updateOption(option.id, "emoji", value)}
                serverEmojis={serverEmojis}
              />

              <div style={reactionRoleWrap}>
                <SingleSelect
                  options={roles}
                  value={option.roleId || ""}
                  onChange={(value) => updateOption(option.id, "roleId", value)}
                  placeholder={loadingResources ? "Loading roles..." : "Select a role"}
                  getLabel={(item) => `@ ${item.name}`}
                  getValue={(item) => item.id}
                  getSearchText={(item) => item.name}
                />
              </div>
            </div>

            <div style={reactionRowRightSimple}>
              <div style={reactionRolePreviewText}>
                {option.roleId ? getRoleName(option.roleId) : "No role selected"}
              </div>

              <button
                type="button"
                onClick={() => removeOption(option.id)}
                style={miniDangerButton}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>

 <div
  style={{
    marginTop: "12px",
    marginBottom: "8px",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "rgba(88,101,242,0.08)",
    border: "1px solid rgba(88,101,242,0.15)",
    fontSize: "12px",
    color: "rgba(255,255,255,0.65)",
    transition: "all 0.25s ease",
    cursor: "default",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "rgba(88,101,242,0.14)";
    e.currentTarget.style.boxShadow =
      "0 0 20px rgba(88,101,242,0.25), inset 0 0 10px rgba(88,101,242,0.15)";
    e.currentTarget.style.transform = "translateY(-1px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = "rgba(88,101,242,0.08)";
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.transform = "translateY(0)";
  }}
>
  ↕ Drag reactions to reorder them.
</div>
  </>
) : null}
                    </>
                  ) : (
                    <div style={inlineEmptyCard}>
                      <div style={bigEmptyTitle}>No role options yet</div>
                      <div style={bigEmptyText}>Add the first option for this panel.</div>
                      <HoverButton
                        type="button"
                        onClick={addOption}
                        style={secondaryButton}
                        hoverStyle={secondaryButtonHover}
                      >
                        <Plus size={15} />
                        <span>Add First Option</span>
                      </HoverButton>
                    </div>
                  )}
                </SectionCard>
              </div>

              <div style={{ ...editorPreviewColumn, ...(isMobile ? editorPreviewColumnMobile : {}) }}>
                <SectionCard
                  icon={ImageIcon}
                  title="Live Preview"
                  subtitle="How this panel could look in Discord."
                >
                  <PanelPreview panel={selectedPanel} serverEmojis={serverEmojis} roles={roles} />
                </SectionCard>
              </div>
            </div>
            ) : (
            <div style={bigEmptyCard}>
              <div style={bigEmptyTitle}>No panel selected</div>
              <div style={bigEmptyText}>Go back and create a panel first.</div>
            </div>
          )}
        </>
      )}

     
    </div>
  );
}

const pageWrap = {
  color: "#fff",
  padding: "0",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const topBarActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const eyebrow = {
  fontSize: "12px",
  letterSpacing: "0.22em",
  color: "rgba(255,255,255,0.52)",
  marginBottom: "10px",
};

const pageTitle = {
  margin: 0,
  fontSize: "52px",
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const pageSubtitle = {
  marginTop: "10px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "18px",
  lineHeight: 1.6,
};

const overviewHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const overviewTitle = {
  fontSize: "28px",
  fontWeight: 800,
};

const overviewSubtitle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.62)",
  fontSize: "15px",
  lineHeight: 1.6,
};

const sectionCard = {
  background:
    "linear-gradient(180deg, rgba(14,23,48,0.98), rgba(9,17,39,0.98))",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "24px",
  padding: "22px",
  boxShadow:
    "0 16px 40px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.03)",
  transition: "all 0.22s ease",
  backdropFilter: "blur(10px)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const sectionHeaderLeft = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const sectionIconWrap = {
  width: "34px",
  height: "34px",
  borderRadius: "12px",
  background: "rgba(88,101,242,0.14)",
  border: "1px solid rgba(88,101,242,0.24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#a8b0ff",
  flexShrink: 0,
};

const sectionTitle = {
  fontSize: "24px",
  fontWeight: 800,
};

const sectionSubtitle = {
  marginTop: "6px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "14px",
};

const sectionDivider = {
  height: "1px",
  background: "rgba(255,255,255,0.07)",
  margin: "18px 0 18px 0",
};

const toggleWrap = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const toggleTrack = {
  width: "54px",
  height: "30px",
  borderRadius: "999px",
  border: "none",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const toggleKnob = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
};

const toggleLabel = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#fff",
};

const premiumPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.25)",
  color: "#ffd68a",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const panelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
};

const panelCard = {
  background:
    "linear-gradient(180deg, rgba(14,23,48,0.98), rgba(9,17,39,0.98))",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "24px",
  padding: "20px",
  cursor: "pointer",
  color: "#fff",
  textAlign: "left",
  boxShadow:
    "0 14px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)",
  transition: "all 0.22s ease",
  position: "relative",
  overflow: "hidden",
};

const panelCardHover = {
  transform: "translateY(-4px)",
  boxShadow:
    "0 24px 54px rgba(0,0,0,0.32), 0 0 0 1px rgba(88,101,242,0.16) inset",
  border: "1px solid rgba(88,101,242,0.2)",
  background:
    "linear-gradient(180deg, rgba(18,28,58,0.98), rgba(10,18,42,0.98))",
};

const panelCardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const panelBadgeEnabled = {
  fontSize: "12px",
  fontWeight: 700,
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(34,197,94,0.14)",
  color: "#9ff3bc",
  border: "1px solid rgba(34,197,94,0.18)",
};

const panelBadgeDisabled = {
  fontSize: "12px",
  fontWeight: 700,
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(239,68,68,0.12)",
  color: "#ffbbbb",
  border: "1px solid rgba(239,68,68,0.18)",
};

const panelTypeChip = {
  fontSize: "12px",
  fontWeight: 700,
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(88,101,242,0.14)",
  color: "#b7beff",
  border: "1px solid rgba(88,101,242,0.2)",
  textTransform: "capitalize",
};

const panelCardTitle = {
  fontSize: "22px",
  fontWeight: 800,
  marginBottom: "8px",
};

const panelCardMeta = {
  color: "rgba(255,255,255,0.6)",
  fontSize: "14px",
  marginBottom: "16px",
};

const panelCardInfoRow = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "14px",
  marginBottom: "10px",
};

const publishedMetaRow = {
  marginTop: "10px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#8cc9ff",
};

const bigEmptyCard = {
  marginTop: "10px",
  background: "linear-gradient(180deg, rgba(14,23,48,0.98), rgba(9,17,39,0.98))",
  border: "1px dashed rgba(255,255,255,0.12)",
  borderRadius: "24px",
  padding: "34px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  alignItems: "flex-start",
  boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
};

const inlineEmptyCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px dashed rgba(255,255,255,0.12)",
  borderRadius: "20px",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  alignItems: "flex-start",
};

const bigEmptyTitle = {
  fontSize: "24px",
  fontWeight: 800,
};

const bigEmptyText = {
  color: "rgba(255,255,255,0.62)",
  fontSize: "15px",
  lineHeight: 1.7,
  maxWidth: "720px",
};

const emptyMiniText = {
  color: "rgba(255,255,255,0.62)",
  fontSize: "15px",
  lineHeight: 1.7,
};

const emptyMainCard = {
  background: "linear-gradient(180deg, rgba(14,23,48,0.98), rgba(9,17,39,0.98))",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "24px",
  padding: "24px",
  color: "#fff",
};

const editorTopBar = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "16px",
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "22px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const editorTopBarMobile = {
  gridTemplateColumns: "1fr",
  alignItems: "stretch",
};

const editorTopLeftGroup = {
  display: "grid",
  gridTemplateColumns: "42px 170px minmax(260px, 1fr)",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const editorTopLeftGroupMobile = {
  gridTemplateColumns: "42px 1fr",
};

const editorActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
};

const backButton = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  transition: "all 0.2s ease",
};

const backButtonHover = {
  transform: "translateY(-2px)",
  background: "rgba(88,101,242,0.12)",
  boxShadow: "0 10px 22px rgba(88,101,242,0.16)",
  border: "1px solid rgba(88,101,242,0.2)",
};

const panelSelect = {
  background: "rgba(15,23,42,0.95)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  boxShadow: "0 0 0 1px rgba(59,130,246,0.2)",
};

const panelNameWrap = {
  position: "relative",
  minWidth: 0,
  width: "100%",
};

const panelNameInput = {
  minWidth: 0,
  width: "100%",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.035))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "14px 48px 14px 16px",
  color: "#fff",
  fontSize: "26px",
  fontWeight: 800,
  outline: "none",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  height: "52px",
};

const panelNamePencil = {
  position: "absolute",
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 0.78,
  color: "#c7cbff",
  pointerEvents: "none",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const editorLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
  gap: "18px",
  alignItems: "start",
};

const editorLayoutMobile = {
  gridTemplateColumns: "1fr",
};

const editorMainColumn = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  minWidth: 0,
};

const editorPreviewColumn = {
  position: "sticky",
  top: "24px",
  minWidth: 0,
};

const editorPreviewColumnMobile = {
  position: "static",
  top: "auto",
};

const fieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const fieldGridMobile = {
  gridTemplateColumns: "1fr",
};

const fieldBlock = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.82)",
};

const assetLabelRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "13px 14px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.2s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const lockedInputStyle = {
  background: "rgba(255,255,255,0.025)",
  color: "rgba(255,255,255,0.42)",
  cursor: "not-allowed",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "130px",
  resize: "vertical",
  background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "14px",
  color: "#fff",
  fontSize: "14px",
  lineHeight: 1.6,
  outline: "none",
  transition: "all 0.2s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const assetPreviewWrap = {
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
};

const assetPreviewImage = {
  width: "100%",
  maxHeight: "160px",
  objectFit: "cover",
  display: "block",
};

const uploadButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  width: "fit-content",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const lockedHelperRow = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  color: "rgba(255,255,255,0.5)",
  fontSize: "12px",
  fontWeight: 600,
};

const assetUrlHint = {
  color: "rgba(255,255,255,0.52)",
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: 1.5,
};

const selectWrap = {
  position: "relative",
  zIndex: 20,
};

const selectButton = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "13px 14px",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "all 0.18s ease",
};

const selectButtonText = (selected) => ({
  color: selected ? "#fff" : "rgba(255,255,255,0.52)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
});

const selectMenu = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#0d1730",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "8px",
  zIndex: 9999,
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  maxHeight: "260px",
  overflowY: "auto",
};

const selectSearchWrap = {
  marginBottom: "8px",
};

const selectSearchInput = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "10px 12px",
  color: "#fff",
  outline: "none",
  fontSize: "14px",
};

const selectEmptyState = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "13px",
  padding: "10px 12px",
  textAlign: "center",
};

const selectOption = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#fff",
  padding: "11px 12px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "14px",
};

const selectOptionText = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const modeTabsWrap = {
  display: "inline-flex",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "6px",
  gap: "6px",
};

const modeTabButton = {
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.68)",
  borderRadius: "12px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.18s ease",
};

const modeTabButtonActive = {
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.06) inset",
};

const colorRow = {
  display: "flex",
  gap: "10px",
  alignItems: "stretch",
};

const colorPreviewButton = {
  width: "50px",
  height: "50px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const colorPopover = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "250px",
  background: "#0d1730",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "12px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  zIndex: 40,
};

const colorPopoverTitle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#fff",
};

const presetGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "10px",
  marginTop: "12px",
};

const presetSwatch = {
  width: "100%",
  aspectRatio: "1 / 1",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  cursor: "pointer",
};

const colorPopoverDivider = {
  height: 1,
  background: "rgba(255,255,255,0.08)",
  margin: "12px 0",
};

const colorNativeLabel = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const nativeColorInput = {
  width: 44,
  height: 32,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const buttonStyleRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "8px",
};

const styleSwatchButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  borderRadius: "14px",
  padding: "10px 14px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  transition: "all 0.18s ease",
};

const styleSwatchButtonActive = {
  boxShadow: "0 0 0 1px rgba(88,101,242,0.45) inset, 0 10px 22px rgba(88,101,242,0.12)",
  background: "rgba(88,101,242,0.12)",
};

const styleDot = {
  width: "12px",
  height: "12px",
  borderRadius: "999px",
};

const previewCard = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const previewHeader = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const previewAvatar = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #4b63ff, #6c5cff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
};

const previewName = {
  fontWeight: 800,
  fontSize: "14px",
};

const previewMeta = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.55)",
};

const discordEmbedPreview = {
  background: "rgba(255,255,255,0.03)",
  borderRadius: "16px",
  padding: "14px",
};

const previewBannerWrap = {
  marginTop: "14px",
  borderRadius: "12px",
  overflow: "hidden",
};

const previewBannerImage = {
  width: "100%",
  height: "140px",
  objectFit: "cover",
  display: "block",
};

const previewAuthorRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.65)",
  marginBottom: "10px",
};

const previewAuthorIcon = {
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  objectFit: "cover",
};

const previewBodyRow = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
};

const previewThumb = {
  width: "72px",
  height: "72px",
  borderRadius: "12px",
  objectFit: "cover",
  flexShrink: 0,
};

const previewEmbedTitle = {
  fontSize: "16px",
  fontWeight: 800,
  marginBottom: "8px",
  lineHeight: 1.4,
};

const previewEmbedDescription = {
  fontSize: "14px",
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.82)",
  whiteSpace: "pre-wrap",
};

const previewButtonRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px",
};

const previewButtonChip = (style) => {
  let bg = "#6B7280";
  if (style === "Primary") bg = "#5865F2";
  if (style === "Success") bg = "#22C55E";
  if (style === "Danger") bg = "#EF4444";

  return {
    background: bg,
    color: "#fff",
    borderRadius: "10px",
    padding: "8px 12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
  };
};

const previewDropdownBox = {
  marginTop: "14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "14px",
};

const previewReactionRow = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "14px",
};

const previewReactionChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "9px 12px",
  width: "fit-content",
};

const previewFooter = {
  marginTop: "14px",
  fontSize: "12px",
  color: "rgba(255,255,255,0.55)",
  lineHeight: 1.6,
};

const builderChipRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "16px",
};

const builderButtonChip = (style) => {
  let bg = "rgba(255,255,255,0.06)";
  let border = "1px solid rgba(255,255,255,0.08)";
  if (style === "Primary") bg = "rgba(88,101,242,0.28)";
  if (style === "Success") bg = "rgba(34,197,94,0.22)";
  if (style === "Danger") bg = "rgba(239,68,68,0.2)";
  if (style === "Secondary") bg = "rgba(107,114,128,0.24)";

  return {
    border,
    background: bg,
    color: "#fff",
    borderRadius: "14px",
    padding: "12px 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    transition: "all 0.18s ease",
  };
};

const builderButtonChipActive = {
  boxShadow: "0 0 0 2px rgba(255,255,255,0.16) inset, 0 10px 22px rgba(88,101,242,0.12)",
};

const addInlineButton = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  border: "1px dashed rgba(255,255,255,0.14)",
  background: "transparent",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.18s ease",
};

const addInlineButtonHover = {
  transform: "translateY(-2px)",
  border: "1px dashed rgba(88,101,242,0.35)",
  background: "rgba(88,101,242,0.08)",
};

const optionEditorCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "20px",
  padding: "18px",
};

const optionEditorTitle = {
  fontSize: "15px",
  fontWeight: 800,
  marginBottom: "14px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.8)",
};

const dropdownOptionRow = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#fff",
  borderRadius: "16px",
  padding: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  cursor: "pointer",
  transition: "all 0.18s ease",
};

const dropdownOptionRowActive = {
  boxShadow: "0 0 0 1px rgba(88,101,242,0.45) inset",
  background: "rgba(88,101,242,0.08)",
};

const dropdownOptionLeft = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontWeight: 700,
};

const reactionBuilderStack = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const reactionRowCard = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 0.8fr) minmax(220px, 1.2fr)",
  gap: "12px",
  alignItems: "center",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "18px",
  padding: "14px",
};

const reactionRowLeft = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const reactionRoleWrap = {
  minWidth: 0,
  flex: 1,
};

const reactionRowRightSimple = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
  alignItems: "center",
};

const reactionRolePreviewText = {
  fontSize: "14px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.8)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const optionsStack = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const primaryButton = {
  border: "1px solid rgba(123, 108, 255, 0.24)",
  background:
    "linear-gradient(135deg, rgba(96,110,255,1) 0%, rgba(123,99,255,1) 55%, rgba(147,92,255,1) 100%)",
  color: "white",
  borderRadius: "18px",
  padding: "14px 20px",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow:
    "0 16px 34px rgba(99,102,241,0.34), inset 0 1px 0 rgba(255,255,255,0.16)",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.22s ease",
  position: "relative",
  overflow: "hidden",
};

const primaryButtonHover = {
  transform: "translateY(-2px)",
  boxShadow:
    "0 22px 40px rgba(99,102,241,0.42), inset 0 1px 0 rgba(255,255,255,0.2)",
  filter: "brightness(1.05)",
};

const secondaryButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
  color: "#fff",
  borderRadius: "14px",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const secondaryButtonHover = {
  transform: "translateY(-2px)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.055))",
  boxShadow: "0 12px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
};

const updateButton = {
  border: "1px solid rgba(88,101,242,0.25)",
  background: "linear-gradient(180deg, rgba(88,101,242,0.16), rgba(88,101,242,0.1))",
  color: "#d7dcff",
  borderRadius: "14px",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const updateButtonHover = {
  transform: "translateY(-2px)",
  background:
    "linear-gradient(180deg, rgba(88,101,242,0.22), rgba(88,101,242,0.14))",
  boxShadow: "0 14px 28px rgba(88,101,242,0.2)",
};

const dangerActionButton = {
  border: "1px solid rgba(255, 77, 77, 0.18)",
  background: "linear-gradient(180deg, rgba(255, 0, 0, 0.12), rgba(255, 0, 0, 0.08))",
  color: "#ff8d8d",
  borderRadius: "14px",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const dangerActionButtonHover = {
  transform: "translateY(-2px)",
  background:
    "linear-gradient(180deg, rgba(255, 77, 77, 0.16), rgba(255, 77, 77, 0.1))",
  boxShadow: "0 12px 24px rgba(239,68,68,0.16)",
};

const dangerButton = {
  border: "1px solid rgba(239,68,68,0.22)",
  background: "rgba(239,68,68,0.12)",
  color: "#ffb5b5",
  borderRadius: "14px",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.22s ease",
};

const dangerButtonHover = {
  transform: "translateY(-2px)",
  background: "rgba(239,68,68,0.16)",
  boxShadow: "0 12px 24px rgba(239,68,68,0.14)",
};

const miniDangerButton = {
  width: "34px",
  height: "34px",
  border: "1px solid rgba(239,68,68,0.22)",
  background: "rgba(239,68,68,0.12)",
  color: "#ffb5b5",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const publishStatusBox = {
  marginTop: "18px",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.22)",
  color: "#bfdbfe",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
  lineHeight: 1.6,
};

const emojiPickerWrap = {
  position: "relative",
};

const emojiButton = {
  width: "56px",
  height: "50px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.18s ease",
};

const emojiPopover = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  width: "320px",
  background: "#0d1730",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "18px",
  padding: "12px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  zIndex: 50,
};

const emojiSearchRow = {
  marginBottom: "10px",
};

const emojiSearchInput = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "11px 12px",
  color: "#fff",
  outline: "none",
  fontSize: "14px",
};

const emojiSectionTitle = {
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.52)",
  marginTop: "10px",
  marginBottom: "8px",
};

const emojiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 40px)",
  gap: "8px",
  maxWidth: "100%",
  maxHeight: "176px",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "4px",
};

const serverEmojiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 40px)",
  gap: "8px",
  maxWidth: "100%",
  maxHeight: "176px",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "4px",
};

const emojiCell = {
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  lineHeight: 1,
  boxSizing: "border-box",
};

const serverEmojiCell = {
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const emojiEmptyState = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "13px",
  padding: "8px 2px",
  gridColumn: "1 / -1",
};

const emojiClearButton = {
  marginTop: "12px",
  width: "100%",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  borderRadius: "12px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700,
};
const heroShell = {
  background:
    "linear-gradient(180deg, rgba(18,26,48,0.96), rgba(11,18,37,0.96))",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "30px",
  padding: "28px",
  boxShadow:
    "0 22px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
};

const heroHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const heroTitle = {
  fontSize: "44px",
  fontWeight: 900,
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
};

const heroSubtitle = {
  marginTop: "12px",
  color: "rgba(255,255,255,0.76)",
  fontSize: "16px",
  lineHeight: 1.6,
};

const heroToggleWrap = {
  padding: "10px 14px",
  borderRadius: "20px",
  border: "1px solid rgba(88,101,242,0.16)",
  background: "rgba(88,101,242,0.08)",
  boxShadow: "0 0 30px rgba(88,101,242,0.10)",
};

const heroActionGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)",
  gap: "18px",
  marginBottom: "24px",
};

const createPanelCard = {
  width: "100%",
  border: "1px solid rgba(88,101,242,0.24)",
  background:
    "linear-gradient(180deg, rgba(7,12,28,0.9), rgba(9,16,35,0.92))",
  borderRadius: "22px",
  padding: "20px 22px",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
  transition: "all 0.22s ease",
};

const createPanelTitle = {
  fontSize: "17px",
  fontWeight: 800,
  marginBottom: "6px",
};

const createPanelSubtitle = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.5,
};

const createPanelPlus = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  border: "1px solid rgba(88,101,242,0.24)",
  background: "rgba(88,101,242,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#dbe1ff",
  flexShrink: 0,
};

const searchCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "22px",
  padding: "14px 16px",
};

const searchInputWrap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flex: 1,
  minWidth: 0,
};

const searchIcon = {
  color: "rgba(255,255,255,0.45)",
  fontSize: "18px",
  flexShrink: 0,
};

const searchInput = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#fff",
  fontSize: "15px",
};

const panelCountPill = {
  padding: "9px 14px",
  borderRadius: "999px",
  background: "rgba(88,101,242,0.14)",
  border: "1px solid rgba(88,101,242,0.22)",
  color: "#d6dcff",
  fontSize: "13px",
  fontWeight: 800,
  flexShrink: 0,
};

const listShell = {
  background: "rgba(3, 8, 22, 0.34)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: "26px",
  padding: "22px",
};

const listHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const listTitle = {
  fontSize: "18px",
  fontWeight: 800,
};

const listSubtitle = {
  marginTop: "6px",
  color: "rgba(255,255,255,0.62)",
  fontSize: "14px",
};

const panelListStack = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const managementCard = {
  width: "100%",
  textAlign: "left",
  background:
    "linear-gradient(180deg, rgba(18,27,49,0.96), rgba(11,18,36,0.96))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "22px",
  padding: "18px",
  color: "#fff",
  cursor: "pointer",
  transition: "all 0.22s ease",
  boxShadow:
    "0 14px 36px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.03)",
};

const managementCardHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "14px",
};

const managementCardIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(88,101,242,0.12)",
  border: "1px solid rgba(88,101,242,0.24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#cfd5ff",
  flexShrink: 0,
};

const managementCardTitle = {
  fontSize: "18px",
  fontWeight: 800,
  marginBottom: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const managementCardMeta = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.66)",
};

const managementCardInfoBox = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
  padding: "14px 16px",
  marginBottom: "14px",
};

const managementInfoLine = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.86)",
  lineHeight: 1.7,
};

const managementCardActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const miniActionChip = {
  padding: "8px 12px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.82)",
  fontSize: "13px",
  fontWeight: 700,
};

const overviewActionButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))",
  color: "#fff",
  borderRadius: "14px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const overviewActionButtonHover = {
  transform: "translateY(-2px)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.06))",
  border: "1px solid rgba(88,101,242,0.22)",
  boxShadow:
    "0 12px 26px rgba(0,0,0,0.2), 0 0 22px rgba(88,101,242,0.18)",
};

const overviewUpdateButton = {
  border: "1px solid rgba(88,101,242,0.24)",
  background: "linear-gradient(180deg, rgba(88,101,242,0.16), rgba(88,101,242,0.10))",
  color: "#dbe1ff",
  borderRadius: "14px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const overviewUpdateButtonHover = {
  transform: "translateY(-2px)",
  background:
    "linear-gradient(180deg, rgba(88,101,242,0.22), rgba(88,101,242,0.14))",
  border: "1px solid rgba(88,101,242,0.32)",
  boxShadow:
    "0 14px 28px rgba(88,101,242,0.2), 0 0 24px rgba(88,101,242,0.22)",
};

const overviewDeleteButton = {
  border: "1px solid rgba(239,68,68,0.22)",
  background: "linear-gradient(180deg, rgba(239,68,68,0.14), rgba(239,68,68,0.09))",
  color: "#ffb8b8",
  borderRadius: "14px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.22s ease",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const overviewDeleteButtonHover = {
  transform: "translateY(-2px)",
  background:
    "linear-gradient(180deg, rgba(239,68,68,0.18), rgba(239,68,68,0.12))",
  border: "1px solid rgba(239,68,68,0.3)",
  boxShadow:
    "0 14px 28px rgba(239,68,68,0.16), 0 0 24px rgba(239,68,68,0.14)",
};

const deleteModalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(3, 8, 20, 0.68)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 9999,
};

const deleteModalCard = {
  width: "100%",
  maxWidth: "460px",
  background:
    "linear-gradient(180deg, rgba(18,27,49,0.98), rgba(10,18,36,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow:
    "0 28px 70px rgba(0,0,0,0.36), 0 0 0 1px rgba(239,68,68,0.08) inset",
};

const deleteModalTitle = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#fff",
  marginBottom: "10px",
};

const deleteModalText = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.84)",
};

const deleteModalSubtext = {
  marginTop: "10px",
  fontSize: "13px",
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.58)",
};

const deleteModalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "22px",
};

const errorBox = {
  marginBottom: "16px",
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.22)",
  color: "#ffbbbb",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
};

const successBox = {
  marginBottom: "16px",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.22)",
  color: "#bbf7d0",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
};
const premiumGlowInner = {
  position: "relative",
  zIndex: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const premiumGlowSweep = {
  position: "absolute",
  top: "-30%",
  left: "-20%",
  width: "42%",
  height: "160%",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))",
  pointerEvents: "none",
  transition: "all 0.55s ease",
  filter: "blur(2px)",
};
const draggableChipDragging = {
  opacity: 0.45,
  transform: "scale(0.97)",
};

const draggableDropTarget = {
  boxShadow: "0 0 0 2px rgba(88,101,242,0.35) inset",
  borderColor: "rgba(88,101,242,0.35)",
};

const dragHintText = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.5)",
  marginTop: "12px",
  marginBottom: "8px",
  paddingLeft: "4px",
  letterSpacing: "0.3px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};
const dragHandleStyle = {
  opacity: 0.5,
  fontSize: "14px",
  lineHeight: 1,
  marginRight: "2px",
};

const emojiPickerReactWrap = {
  width: "100%",
  maxHeight: 360,
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.18)",
};