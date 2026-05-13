import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE from "../config/api";
import SearchableSelect from "../components/SearchableSelect";
import GlobalEmojiPicker from "../components/GlobalEmojiPicker";
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Eye,
  Pencil,
  Plus,
  Save,
  Send,
  Smile,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

function getHashParts() {
  const hash = window.location.hash || "";
  const cleaned = hash.replace(/^#\/?/, "").split("?")[0];
  return cleaned.split("/").filter(Boolean).map(decodeURIComponent);
}

function createDefaultField() {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    value: "",
    inline: false,
  };
}

function createDefaultEmbed(index = 1) {
  return {
    id: `embed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    collapsed: false,
    title: index === 1 ? "Verify Yourself" : `Verification Embed ${index}`,
    description:
      "Click the button below to verify and get access to the server.",
    color: "#5865F2",
    authorName: "",
    authorIcon: "",
    thumbnail: "",
    image: "",
    header: "",
    footer: "",
    footerIcon: "",
    fields: [],
  };
}

function normalizeEmbed(rawEmbed, index = 1) {
  const base = createDefaultEmbed(index);
  return {
    ...base,
    ...(rawEmbed || {}),
    id:
      rawEmbed?.id ||
      `embed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: rawEmbed?.enabled ?? true,
    collapsed: rawEmbed?.collapsed ?? false,
    fields: Array.isArray(rawEmbed?.fields)
      ? rawEmbed.fields.map((field, fieldIndex) => ({
          id:
            field?.id ||
            `field_${Date.now()}_${fieldIndex}_${Math.random()
              .toString(36)
              .slice(2, 7)}`,
          name: field?.name || "",
          value: field?.value || "",
          inline: !!field?.inline,
        }))
      : [],
  };
}

function getNormalizedEmbeds(panel) {
  if (Array.isArray(panel?.embeds) && panel.embeds.length > 0) {
    return panel.embeds.map((embed, index) => normalizeEmbed(embed, index + 1));
  }

  return [normalizeEmbed(panel?.embed || {}, 1)];
}

function syncPanelEmbeds(nextPanel) {
  const normalizedEmbeds = Array.isArray(nextPanel?.embeds)
    ? nextPanel.embeds.map((embed, index) => normalizeEmbed(embed, index + 1))
    : [normalizeEmbed(nextPanel?.embed || {}, 1)];

  return {
    ...nextPanel,
    embeds: normalizedEmbeds,
    embed: { ...normalizedEmbeds[0] },
  };
}

function getButtonStylePreview(style) {
  switch (style) {
    case "Primary":
      return {
        background: "rgba(88,101,242,0.22)",
        border: "1px solid rgba(88,101,242,0.36)",
      };
    case "Secondary":
      return {
        background: "rgba(120,130,150,0.20)",
        border: "1px solid rgba(170,180,200,0.20)",
      };
    case "Danger":
      return {
        background: "rgba(237,66,69,0.18)",
        border: "1px solid rgba(237,66,69,0.34)",
      };
    case "Success":
    default:
      return {
        background: "rgba(87,242,135,0.16)",
        border: "1px solid rgba(87,242,135,0.30)",
      };
  }
}

function renderDiscordContent(text) {
  if (!text) return text;

  const parts = String(text).split(/(<a?:\w+:\d+>)/g);

  return parts.map((part, index) => {
    const match = part.match(/^<(a)?:(\w+):(\d+)>$/);

    if (!match) {
      return <span key={index}>{part}</span>;
    }

    const isAnimated = !!match[1];
    const emojiName = match[2];
    const emojiId = match[3];
    const ext = isAnimated ? "gif" : "png";
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;

    return (
      <img
        key={index}
        src={emojiUrl}
        alt={emojiName}
        title={emojiName}
        style={{
          width: 20,
          height: 20,
          objectFit: "contain",
          verticalAlign: "middle",
          margin: "0 2px",
        }}
      />
    );
  });
}

function MotionButton({
  children,
  style,
  onClick,
  disabled = false,
  type = "button",
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        ...style,
        transform: disabled
          ? "none"
          : pressed
          ? "translateY(1px) scale(0.985)"
          : hovered
          ? "translateY(-2px)"
          : "translateY(0px)",
        boxShadow: disabled
          ? style?.boxShadow
          : hovered
          ? `${style?.boxShadow || "0 8px 18px rgba(0,0,0,0.12)"}, 0 0 26px rgba(88,101,242,0.18)`
          : style?.boxShadow,
        filter: disabled ? "none" : hovered ? "brightness(1.04)" : "none",
        transition:
          "transform 0.16s ease, box-shadow 0.18s ease, filter 0.18s ease, background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease",
      }}
    >
      {children}
    </button>
  );
}

function createComparablePanelSnapshot(panel) {
  if (!panel) return null;

  const cloned = JSON.parse(JSON.stringify(panel));

  if (Array.isArray(cloned.embeds)) {
    cloned.embeds = cloned.embeds.map((embed) => {
      const copy = { ...embed };
      delete copy.collapsed;
      return copy;
    });
  }

  if (cloned.embed) {
    const copy = { ...cloned.embed };
    delete copy.collapsed;
    cloned.embed = copy;
  }

  return JSON.stringify(cloned);
}

function getEmojiImageInfo(emoji) {
  if (!emoji) return null;

  if (typeof emoji === "object" && emoji.id) {
    return {
      name: emoji.name || "emoji",
      url:
        emoji.url ||
        `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=64`,
    };
  }

  if (typeof emoji === "string") {
    const match = emoji.match(/^<(a)?:(\w+):(\d+)>$/);
    if (match) {
      const animated = !!match[1];
      const emojiId = match[3];
      const emojiName = match[2];
      const ext = animated ? "gif" : "png";
      return {
        name: emojiName,
        url: `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64`,
      };
    }
  }

  return null;
}

function getEmojiDisplayLabel(emoji) {
  if (!emoji) return "Select emoji";

  if (typeof emoji === "object" && emoji.name) {
    return emoji.name;
  }

  if (typeof emoji === "string") {
    const match = emoji.match(/^<(a)?:(\w+):(\d+)>$/);
    if (match) return match[2];

    if (emoji.length <= 4) return emoji;

    return "Custom emoji selected";
  }

  return "Select emoji";
}

function normalizePickedEmoji(emoji) {
  if (!emoji) return "";

  if (typeof emoji === "object" && emoji.id) {
    return (
      emoji.identifier ||
      `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
    );
  }

  return emoji;
}

function renderSelectedEmojiPreview(emoji) {
  const imageInfo = getEmojiImageInfo(emoji);

  if (imageInfo) {
    return (
      <img
        src={imageInfo.url}
        alt={imageInfo.name}
        style={{
          width: 18,
          height: 18,
          objectFit: "contain",
          verticalAlign: "middle",
        }}
      />
    );
  }

  if (!emoji) return <span style={{ fontSize: 18 }}>✅</span>;
  return <span style={{ fontSize: 18 }}>{emoji}</span>;
}

const emojiTileStyle = {
  width: "100%",
  aspectRatio: "1 / 1",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  transition: "all 0.18s ease",
};

const unicodeEmojiGroups = {
  Smileys: ["😀", "😄", "😁", "😎", "🥳", "😍", "🤩", "😂", "🙂", "😇", "😉", "😌"],
  Symbols: ["✅", "❌", "⚠️", "⭐", "🔥", "✨", "💎", "🎯", "🎉", "📣", "🔔", "🛡️"],
  Hearts: ["💚", "💙", "💜", "💖", "❤️", "🩷", "🤍", "🖤", "💔", "💕", "💞", "💘"],
  Utility: ["🛠️", "🔒", "🔓", "📌", "📨", "📩", "🧠", "👑", "🎮", "🎵", "🚀", "💬"],
};

function EmojiPickerDropdown({
  emojis = [],
  onSelect,
  onClose,
  title = "Choose emoji",
  currentEmoji = "",
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("unicode");

  const normalizedServerEmojis = Array.isArray(emojis) ? emojis : [];

  const isSelected = (value) => {
    if (!currentEmoji) return false;
    return String(currentEmoji) === String(value);
  };

  const filteredUnicodeGroups = Object.entries(unicodeEmojiGroups)
    .map(([group, values]) => ({
      group,
      values: values.filter((emoji) =>
        search.trim() ? emoji.includes(search.trim()) : true
      ),
    }))
    .filter((group) => group.values.length > 0);

  const serverResults = normalizedServerEmojis.filter((emoji) => {
    if (!search.trim()) return true;
    return String(emoji.name || "")
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 12px)",
        right: 0,
        width: 380,
        maxWidth: "min(380px, 92vw)",
        zIndex: 3000,
        borderRadius: 22,
        border: "1px solid rgba(88,101,242,0.18)",
        background:
          "linear-gradient(180deg, rgba(10,14,24,0.985), rgba(8,12,20,0.985))",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.48), 0 0 0 1px rgba(255,255,255,0.02) inset",
        overflow: "hidden",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 12,
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <Search size={15} color="rgba(255,255,255,0.55)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 14,
            }}
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.55)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <MotionButton
            onClick={() => setTab("unicode")}
            style={{
              ...emojiTabButtonStyle,
              justifyContent: "center",
              background:
                tab === "unicode"
                  ? "rgba(88,101,242,0.18)"
                  : "rgba(255,255,255,0.03)",
              border:
                tab === "unicode"
                  ? "1px solid rgba(88,101,242,0.32)"
                  : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            Universal
          </MotionButton>

          <MotionButton
            onClick={() => setTab("server")}
            style={{
              ...emojiTabButtonStyle,
              justifyContent: "center",
              background:
                tab === "server"
                  ? "rgba(88,101,242,0.18)"
                  : "rgba(255,255,255,0.03)",
              border:
                tab === "server"
                  ? "1px solid rgba(88,101,242,0.32)"
                  : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            Server Emojis
          </MotionButton>
        </div>
      </div>

      <div
        style={{
          maxHeight: 320,
          overflowY: "auto",
          padding: 14,
        }}
      >
        {tab === "unicode" ? (
          filteredUnicodeGroups.length > 0 ? (
            filteredUnicodeGroups.map(({ group, values }) => (
              <div key={group} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    color: "rgba(255,255,255,0.56)",
                    fontSize: 11,
                    fontWeight: 800,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {group}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {values.map((emoji) => {
                    const selected = isSelected(emoji);

                    return (
                      <button
                        key={`${group}-${emoji}`}
                        onClick={() => {
                          onSelect(emoji);
                          onClose();
                        }}
                        style={{
                          ...emojiTileStyle,
                          background: selected
                            ? "rgba(88,101,242,0.18)"
                            : "rgba(255,255,255,0.03)",
                          border: selected
                            ? "1px solid rgba(88,101,242,0.36)"
                            : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: selected
                            ? "0 8px 18px rgba(88,101,242,0.18)"
                            : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.055)";
                            e.currentTarget.style.border =
                              "1px solid rgba(255,255,255,0.10)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) {
                            e.currentTarget.style.transform = "translateY(0px)";
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.03)";
                            e.currentTarget.style.border =
                              "1px solid rgba(255,255,255,0.06)";
                          }
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={emptyPickerTextStyle}>No universal emoji found.</div>
          )
        ) : serverResults.length > 0 ? (
          <>
            <div
              style={{
                color: "rgba(255,255,255,0.56)",
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Server Emojis
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {serverResults.map((emoji) => {
                const emojiValue =
                  emoji.identifier ||
                  `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;

                const selected = isSelected(emojiValue);

                return (
                  <button
                    key={emoji.id}
                    onClick={() => {
                      onSelect(emojiValue);
                      onClose();
                    }}
                    title={emoji.name}
                    style={{
                      ...emojiTileStyle,
                      background: selected
                        ? "rgba(88,101,242,0.18)"
                        : "rgba(255,255,255,0.03)",
                      border: selected
                        ? "1px solid rgba(88,101,242,0.36)"
                        : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: selected
                        ? "0 8px 18px rgba(88,101,242,0.18)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.055)";
                        e.currentTarget.style.border =
                          "1px solid rgba(255,255,255,0.10)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        e.currentTarget.style.transform = "translateY(0px)";
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.03)";
                        e.currentTarget.style.border =
                          "1px solid rgba(255,255,255,0.06)";
                      }
                    }}
                  >
                    <img
                      src={emoji.url}
                      alt={emoji.name}
                      style={{
                        width: 24,
                        height: 24,
                        objectFit: "contain",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div style={emptyPickerTextStyle}>No server emoji found.</div>
        )}
      </div>

      <div
        style={{
          padding: 14,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function CustomSelect({ value, onChange, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} style={selectStyle}>
        {children}
      </select>

      <div
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.72)",
        }}
      >
        <ChevronDown size={17} />
      </div>
    </div>
  );
}


function SelectedEmojiCard({ emoji, labelFallback = "Select emoji" }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "#fff",
        fontWeight: 700,
        minHeight: 46,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {renderSelectedEmojiPreview(emoji)}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.82)",
          fontSize: 14,
          lineHeight: 1.2,
        }}
      >
        {getEmojiDisplayLabel(emoji) || labelFallback}
      </span>
    </div>
  );
}

function Toast({ toast, onClose }) {
  const tones = {
    success: {
      bg: "linear-gradient(135deg, rgba(10,30,18,0.96), rgba(15,45,28,0.94))",
      border: "1px solid rgba(83,245,141,0.24)",
      icon: "#53f58d",
      glow: "0 14px 34px rgba(27,133,74,0.24)",
      Icon: CheckCircle2,
    },
    error: {
      bg: "linear-gradient(135deg, rgba(38,12,18,0.96), rgba(46,16,20,0.94))",
      border: "1px solid rgba(255,120,120,0.24)",
      icon: "#ff8b8b",
      glow: "0 14px 34px rgba(160,30,45,0.24)",
      Icon: AlertCircle,
    },
    info: {
      bg: "linear-gradient(135deg, rgba(12,18,38,0.96), rgba(14,21,43,0.94))",
      border: "1px solid rgba(88,101,242,0.22)",
      icon: "#9db2ff",
      glow: "0 14px 34px rgba(88,101,242,0.18)",
      Icon: Info,
    },
  };

  const tone = tones[toast.type] || tones.info;
  const IconComp = tone.Icon;

  return (
    <div
      style={{
        minWidth: 320,
        maxWidth: 420,
        borderRadius: 18,
        padding: "14px 14px 14px 16px",
        background: tone.bg,
        border: tone.border,
        boxShadow: tone.glow,
        backdropFilter: "blur(10px)",
        color: "#fff",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}
      >
        <IconComp size={18} color={tone.icon} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#fff",
            marginBottom: 4,
          }}
        >
          {toast.title}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.78)",
            whiteSpace: "pre-wrap",
          }}
        >
          {toast.message}
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.62)",
          cursor: "pointer",
          padding: 0,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ToastViewport({ toasts, removeToast }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 92,
        right: 22,
        zIndex: 9999,
        display: "grid",
        gap: 12,
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default function VerificationEditorPage() {
  const [, guildId, panelId] = useMemo(() => {
    const parts = getHashParts();
    return [parts[0], parts[1], parts[2]];
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [updatingPublished, setUpdatingPublished] = useState(false);
  const [verificationConfig, setVerificationConfig] = useState(null);
  const hasPremium =
  verificationConfig?.premiumStatus?.hasPremium || false;
  const [panel, setPanel] = useState(null);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [editingPanelName, setEditingPanelName] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedPanelState, setSavedPanelState] = useState(null);
const [savedPanelSnapshot, setSavedPanelSnapshot] = useState(null);
  const [guildEmojis, setGuildEmojis] = useState([]);
  const [buttonEmojiPickerOpen, setButtonEmojiPickerOpen] = useState(false);
  const [reactionEmojiPickerOpen, setReactionEmojiPickerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const buttonEmojiPickerRef = useRef(null);
  const reactionEmojiPickerRef = useRef(null);

  const pushToast = (type, title, message) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        buttonEmojiPickerRef.current &&
        !buttonEmojiPickerRef.current.contains(event.target)
      ) {
        setButtonEmojiPickerOpen(false);
      }

      if (
        reactionEmojiPickerRef.current &&
        !reactionEmojiPickerRef.current.contains(event.target)
      ) {
        setReactionEmojiPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadPanel = async () => {
      try {
        const [verificationRes, rolesRes, channelsRes, emojisRes] =
          await Promise.all([
            axios.get(`${API_BASE}/api/guilds/${guildId}/verification`),
axios.get(`${API_BASE}/api/guilds/${guildId}/roles`),
axios.get(`${API_BASE}/api/guilds/${guildId}/channels`),
axios.get(`${API_BASE}/api/guilds/${guildId}/emojis`),
          ]);

        const config = verificationRes.data || {
          enabled: false,
          premiumTrial: {},
          panels: [],
        };

        setRoles(Array.isArray(rolesRes.data?.roles) ? rolesRes.data.roles : []);
        setChannels(
          Array.isArray(channelsRes.data?.channels)
            ? channelsRes.data.channels
            : []
        );

        setGuildEmojis(
          Array.isArray(emojisRes.data?.emojis) ? emojisRes.data.emojis : []
        );

        const foundPanel = Array.isArray(config.panels)
          ? config.panels.find((p) => String(p.id) === String(panelId))
          : null;

      setVerificationConfig(config);

const syncedPanel = foundPanel ? syncPanelEmbeds(foundPanel) : null;

setPanel(syncedPanel);
setSavedPanelState(
  syncedPanel ? JSON.parse(JSON.stringify(syncedPanel)) : null
);
setSavedPanelSnapshot(createComparablePanelSnapshot(syncedPanel));
setHasChanges(false);
      } catch (error) {
        console.error("Failed to load verification editor:", error);
        pushToast(
          "error",
          "Failed to load editor",
          "Could not load verification panel data."
        );
      } finally {
        setLoading(false);
      }
    };

    if (guildId && panelId) {
      loadPanel();
    } else {
      setLoading(false);
    }
  }, [guildId, panelId]);

  const isPremiumUsed = useMemo(() => {
   if (!panel || hasPremium) return false;

    const embeds = getNormalizedEmbeds(panel);

    return (
      panel.mode === "captcha" ||
      panel.autoKick?.enabled ||
      embeds.some(
        (embed) =>
          embed.header ||
          embed.footer ||
          embed.authorIcon ||
          embed.footerIcon ||
          embed.fields?.length > 0
      )
    );
  }, [panel]);

  useEffect(() => {
    if (!panel) {
      setHasChanges(false);
      return;
    }

    const currentSnapshot = createComparablePanelSnapshot(panel);
    setHasChanges(currentSnapshot !== savedPanelSnapshot);
  }, [panel, savedPanelSnapshot]);

  const updatePanel = (updater) => {
    setPanel((prev) => {
      if (!prev) return prev;
      const next = typeof updater === "function" ? updater(prev) : updater;
      return syncPanelEmbeds(next);
    });
  };

  const updateEmbeds = (updater) => {
    updatePanel((prev) => {
      const currentEmbeds = getNormalizedEmbeds(prev);
      const nextEmbeds =
        typeof updater === "function" ? updater(currentEmbeds) : updater;

      return {
        ...prev,
        embeds: nextEmbeds.map((embed, index) =>
          normalizeEmbed(embed, index + 1)
        ),
      };
    });
  };

  const updateEmbedAt = (embedId, updater) => {
    updateEmbeds((prevEmbeds) =>
      prevEmbeds.map((embed) =>
        embed.id === embedId
          ? normalizeEmbed(
              typeof updater === "function" ? updater(embed) : updater
            )
          : embed
      )
    );
  };

  const addEmbed = () => {
    updateEmbeds((prevEmbeds) => {
      if (prevEmbeds.length >= 3) {
        pushToast(
          "info",
          "Embed limit reached",
          "For now, keep verification embeds to a maximum of 3."
        );
        return prevEmbeds;
      }

      return [...prevEmbeds, createDefaultEmbed(prevEmbeds.length + 1)];
    });
  };

  const removeEmbed = (embedId) => {
    updateEmbeds((prevEmbeds) => {
      if (prevEmbeds.length <= 1) {
        pushToast(
          "info",
          "At least one embed required",
          "You need to keep at least one verification embed."
        );
        return prevEmbeds;
      }
      return prevEmbeds.filter((embed) => embed.id !== embedId);
    });
  };

  const addFieldToEmbed = (embedId) => {
    updateEmbedAt(embedId, (embed) => ({
      ...embed,
      fields: [...(embed.fields || []), createDefaultField()],
    }));
  };

  const removeFieldFromEmbed = (embedId, fieldId) => {
    updateEmbedAt(embedId, (embed) => ({
      ...embed,
      fields: (embed.fields || []).filter((field) => field.id !== fieldId),
    }));
  };

  const refreshVerificationConfig = async () => {
    const res = await axios.get(
      `${API_BASE}/api/guilds/${guildId}/verification`
    );

    const config = res.data || {
      enabled: false,
      premiumTrial: {},
      panels: [],
    };

    const foundPanel = Array.isArray(config.panels)
      ? config.panels.find((p) => String(p.id) === String(panelId))
      : null;

    setVerificationConfig(config);

 if (foundPanel) {
  const syncedPanel = syncPanelEmbeds(foundPanel);

  setPanel(syncedPanel);
  setSavedPanelState(JSON.parse(JSON.stringify(syncedPanel)));
  setSavedPanelSnapshot(createComparablePanelSnapshot(syncedPanel));
  setHasChanges(false);
}
  };

  const savePanel = async (showToast = true) => {
    if (!verificationConfig || !panel) return false;

    try {
      setSaving(true);

      const syncedPanel = syncPanelEmbeds(panel);

      const nextPanels = (verificationConfig.panels || []).map((p) =>
        p.id === syncedPanel.id ? syncedPanel : p
      );

      const nextConfig = {
        ...verificationConfig,
        panels: nextPanels,
      };

      await axios.post(
        `${API_BASE}/api/guilds/${guildId}/verification`,
        nextConfig
      );

      setVerificationConfig(nextConfig);
setPanel(syncedPanel);
setSavedPanelState(JSON.parse(JSON.stringify(syncedPanel)));
setSavedPanelSnapshot(createComparablePanelSnapshot(syncedPanel));
setHasChanges(false);

      if (showToast) {
        pushToast(
          "success",
          "Draft saved",
          "Your verification panel draft has been saved."
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to save verification panel:", error);
   const errorCode = error?.response?.data?.code;

let premiumMessage =
  error?.response?.data?.details ||
  error?.response?.data?.error ||
  "Failed to save verification panel.";

if (errorCode === "CAPTCHA_PREMIUM_REQUIRED") {
  premiumMessage =
    "Captcha verification requires Kyro Premium.";
}

if (errorCode === "VERIFICATION_LIMIT_REACHED") {
  premiumMessage =
    `Free plan supports only ${
      error?.response?.data?.limit || 2
    } verification panels. Upgrade to Kyro Premium for unlimited panels.`;
}

pushToast(
  "error",
  "Premium Upgrade Required",
  premiumMessage
);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNew = async () => {
    try {
      setPublishing(true);

      const saved = await savePanel(false);
      if (!saved) return;

      await axios.post(
        `${API_BASE}/api/guilds/${guildId}/verification/${panel.id}/publish?forceNew=true`
      );

      await refreshVerificationConfig();

      pushToast(
        "success",
        "Panel published",
        "Verification panel has been published successfully."
      );
    } catch (error) {
      console.error(error);
      pushToast(
        "error",
        "Publish failed",
        error?.response?.data?.error ||
          error?.response?.data?.details ||
          "Failed to publish verification panel."
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateExisting = async () => {
  try {
    setUpdatingPublished(true);

    const saved = await savePanel(false);
    if (!saved) return;

    const res = await axios.post(
      `${API_BASE}/api/guilds/${guildId}/verification/${panel.id}/update-message`
    );

    await refreshVerificationConfig();

    pushToast(
      "success",
      "Panel updated",
      res?.data?.message || "Existing verification message has been updated."
    );
  } catch (error) {
    console.error("Update existing failed:", error);
    pushToast(
      "error",
      "Update failed",
      error?.response?.data?.error ||
        error?.response?.data?.details ||
        error?.message ||
        "Failed to update verification panel"
    );
  } finally {
    setUpdatingPublished(false);
  }
};

  const selectedChannelName =
    channels.find((ch) => ch.id === panel?.channelId)?.name ||
    "No channel selected";

  const embeds = panel ? getNormalizedEmbeds(panel) : [];
  const buttonPreviewStyle = getButtonStylePreview(
    panel?.interaction?.button?.style || "Success"
  );

if (loading) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
        position: "relative",
      }}
    >
      <ToastViewport toasts={toasts} removeToast={removeToast} />

      <div
        style={{
          width: 420,
          borderRadius: 28,
          padding: 32,
          background:
            "linear-gradient(135deg, rgba(88,101,242,0.18), rgba(139,92,246,0.12))",
          border: "1px solid rgba(139,92,246,0.28)",
          boxShadow:
            "0 0 40px rgba(88,101,242,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
          backdropFilter: "blur(18px)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            margin: "0 auto 20px",
            borderRadius: "50%",
            border: "4px solid rgba(139,92,246,0.18)",
            borderTop: "4px solid #8b5cf6",
            animation: "spin 1s linear infinite",
          }}
        />

        <h2
          style={{
            color: "#fff",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          Loading Verification Editor
        </h2>

        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Preparing your premium verification workspace...
        </p>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

  if (!panel) {
    return (
      <div style={{ color: "white", padding: 30 }}>
        <ToastViewport toasts={toasts} removeToast={removeToast} />
        Verification panel not found.
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <ToastViewport toasts={toasts} removeToast={removeToast} />

      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(10,18,38,0.98), rgba(14,21,43,0.96))",
            border: "1px solid rgba(88,101,242,0.14)",
            borderRadius: 26,
            padding: "18px 18px 16px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.24)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -140,
              right: -120,
              width: 360,
              height: 360,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(88,101,242,0.12), transparent 72%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <MotionButton
                  onClick={() => {
                    window.location.hash = "#/verification";
                  }}
                  style={topGhostButtonStyle}
                >
                  <ArrowLeft size={16} />
                </MotionButton>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {editingPanelName ? (
                    <input
                      autoFocus
                      value={panel.name || ""}
                      onChange={(e) =>
                        updatePanel((prev) => ({ ...prev, name: e.target.value }))
                      }
                      onBlur={() => setEditingPanelName(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditingPanelName(false);
                      }}
                      style={{
                        ...inputStyle,
                        fontSize: 26,
                        fontWeight: 800,
                        minWidth: 280,
                        padding: "10px 14px",
                      }}
                    />
                  ) : (
                    <>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: 26,
                          fontWeight: 800,
                          color: "#fff",
                          letterSpacing: "-0.02em",
                          lineHeight: 1.1,
                        }}
                      >
                        {panel.name || "Verification Panel"}
                      </h1>

                      <MotionButton
                        onClick={() => setEditingPanelName(true)}
                        style={editPillButtonStyle}
                      >
                        <Pencil size={14} />
                      </MotionButton>
                    </>
                  )}

                  <StatusPill
                    label={panel.sentPanel?.messageId ? "Published" : "Draft"}
                    tone={panel.sentPanel?.messageId ? "green" : "gold"}
                  />
                </div>
              </div>

              <p
                style={{
                  margin: "14px 0 0 52px",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 16,
                  lineHeight: 1.6,
                  maxWidth: 820,
                }}
              >
                Build your verification panel layout, interaction mode, and
                premium controls from one place.
              </p>

              <div
                style={{
                  marginTop: 14,
                  marginLeft: 52,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(88,101,242,0.08)",
                  border: "1px solid rgba(88,101,242,0.16)",
                  color: "#d7e1ff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Selected Channel: #{selectedChannelName}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                padding: 6,
                borderRadius: 20,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
              }}
            >
              <MotionButton
                onClick={() => (window.location.hash = "#/verification")}
                style={headerSecondaryButtonStyle}
              >
                Discard
              </MotionButton>

              <MotionButton
                onClick={() => savePanel(true)}
                disabled={saving}
                style={{
                  ...headerOutlineButtonStyle,
                  opacity: saving ? 0.72 : 1,
                }}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Draft"}
              </MotionButton>

              <MotionButton
                onClick={handlePublishNew}
                disabled={publishing}
                style={{
                  ...headerPrimaryButtonStyle,
                  opacity: publishing ? 0.72 : 1,
                }}
              >
                <Send size={16} />
                {publishing ? "Publishing..." : "Publish New"}
              </MotionButton>

              <MotionButton
                onClick={handleUpdateExisting}
                disabled={updatingPublished || !panel.sentPanel?.messageId}
                style={{
                  ...headerOutlineButtonStyle,
                  opacity:
                    updatingPublished || !panel.sentPanel?.messageId ? 0.55 : 1,
                }}
              >
                <Send size={16} />
                {updatingPublished ? "Updating..." : "Update Existing"}
              </MotionButton>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.95fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <SectionCard title="Basic Settings">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
<Field label="Verification Channel">
  <SearchableSelect
    options={channels}
    value={panel?.channelId || ""}
    onChange={(nextId) =>
      updatePanel((prev) => ({
        ...prev,
        channelId: nextId,
      }))
    }
    placeholder="Select a channel"
    searchPlaceholder="Search channels..."
    formatLabel={(item) => `# ${item.name}`}
  />
</Field>

                <Field label="Verification Panel Name">
                  <input
                    value={panel.name || ""}
                    onChange={(e) =>
                      updatePanel((prev) => ({ ...prev, name: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>

            <Field label="Verified Role">
  <SearchableSelect
    options={roles}
    value={panel?.roleId || ""}
    onChange={(nextId) =>
      updatePanel((prev) => ({ ...prev, roleId: nextId }))
    }
    placeholder="Select a role"
    searchPlaceholder="Search roles..."
    formatLabel={(item) => item.name}
  />
</Field>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
             <Field label="Verification Mode">
  <SearchableSelect
    options={[
      { id: "button", name: "Button" },
      { id: "reaction", name: "Reaction" },
      { id: "captcha", name: "Captcha (Premium)" },
    ]}
    value={panel.mode || "button"}
    onChange={(nextId) =>
      updatePanel((prev) => ({ ...prev, mode: nextId }))
    }
    placeholder="Select verification mode"
    searchPlaceholder="Search modes..."
    formatLabel={(item) => item.name}
  />
</Field>

          <Field label="Log Channel">
  <SearchableSelect
    options={channels}
    value={panel?.logChannelId || ""}
    onChange={(nextId) =>
      updatePanel((prev) => ({
        ...prev,
        logChannelId: nextId,
      }))
    }
    placeholder="Select a log channel"
    searchPlaceholder="Search log channels..."
    formatLabel={(item) => `# ${item.name}`}
  />
</Field>
              </div>
            </SectionCard>

            {embeds.map((embed, index) => {
              const badgeCount = [
                embed.title ? "Title added" : null,
                embed.description ? "Description added" : null,
                embed.image ? "Banner added" : null,
                embed.thumbnail ? "Thumbnail added" : null,
                (embed.fields || []).length > 0
                  ? `${embed.fields.length} field${
                      embed.fields.length > 1 ? "s" : ""
                    }`
                  : null,
              ].filter(Boolean);

              return (
                <div
                  key={embed.id}
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(12,18,34,0.98), rgba(9,14,28,0.94))",
                    border: "1px solid rgba(88,101,242,0.14)",
                    borderRadius: 24,
                    padding: 18,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
                    transition: "all 0.22s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 14,
                      marginBottom: embed.collapsed ? 0 : 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <MotionButton
                          style={collapseDropdownButtonStyle}
                          onClick={() =>
                            updateEmbedAt(embed.id, (prev) => ({
                              ...prev,
                              collapsed: !prev.collapsed,
                            }))
                          }
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: embed.collapsed
                                ? "rotate(-90deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </MotionButton>

                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: 18,
                          }}
                        >
                          Embed #{index + 1}
                        </div>

                        {!embed.collapsed &&
                          badgeCount.map((badge) => (
                            <span key={badge} style={embedBadgeStyle}>
                              {badge}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <MotionButton
                        onClick={() =>
                          updateEmbedAt(embed.id, (prev) => ({
                            ...prev,
                            collapsed: !prev.collapsed,
                          }))
                        }
                        style={darkActionButtonStyle}
                      >
                        {embed.collapsed ? "Expand" : "Collapse"}
                      </MotionButton>

                      {embeds.length > 1 && (
                        <MotionButton
                          onClick={() => removeEmbed(embed.id)}
                          style={dangerButtonStyle}
                        >
                          Remove Embed
                        </MotionButton>
                      )}
                    </div>
                  </div>

                  {!embed.collapsed && (
                    <div style={{ display: "grid", gap: 18 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 14,
                        }}
                      >
                        <Field label="Title">
                          <input
                            value={embed.title || ""}
                            onChange={(e) =>
                              updateEmbedAt(embed.id, (prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            placeholder="Enter embed title..."
                            style={inputStyle}
                          />
                        </Field>

                        <Field label="Hex Color">
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 160px",
                              gap: 10,
                            }}
                          >
                            <input
                              value={embed.color || "#5865F2"}
                              onChange={(e) =>
                                updateEmbedAt(embed.id, (prev) => ({
                                  ...prev,
                                  color: e.target.value,
                                }))
                              }
                              placeholder="#5865F2"
                              style={inputStyle}
                            />
                            <input
                              type="color"
                              value={embed.color || "#5865F2"}
                              onChange={(e) =>
                                updateEmbedAt(embed.id, (prev) => ({
                                  ...prev,
                                  color: e.target.value,
                                }))
                              }
                              style={colorPickerStyle}
                            />
                          </div>
                        </Field>
                      </div>

                      <Field label="Description">
                        <textarea
                          value={embed.description || ""}
                          onChange={(e) =>
                            updateEmbedAt(embed.id, (prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          rows={6}
                          placeholder="Write your verification embed description..."
                          style={{
                            ...inputStyle,
                            resize: "vertical",
                            minHeight: 140,
                          }}
                        />
                      </Field>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 14,
                        }}
                      >
                        <Field label="Thumbnail URL">
                          <input
                            value={embed.thumbnail || ""}
                            onChange={(e) =>
                              updateEmbedAt(embed.id, (prev) => ({
                                ...prev,
                                thumbnail: e.target.value,
                              }))
                            }
                            placeholder="Paste image URL..."
                            style={inputStyle}
                          />
                        </Field>

                        <Field label="Banner / Main Image URL">
                          <input
                            value={embed.image || ""}
                            onChange={(e) =>
                              updateEmbedAt(embed.id, (prev) => ({
                                ...prev,
                                image: e.target.value,
                              }))
                            }
                            placeholder="Paste banner image URL..."
                            style={inputStyle}
                          />
                        </Field>
                      </div>

                      <div
                        style={{
                          borderRadius: 20,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "16px 18px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: 18,
                            }}
                          >
                            Fields
                          </div>

                          <MotionButton
                            onClick={() => addFieldToEmbed(embed.id)}
                            style={outlineGlowButtonStyle}
                          >
                            <Plus size={14} />
                            Add Field
                          </MotionButton>
                        </div>

                        {(embed.fields || []).length === 0 ? (
                          <div
                            style={{
                              padding: "0 18px 18px",
                              color: "rgba(255,255,255,0.55)",
                              fontSize: 14,
                            }}
                          >
                            No fields added yet.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gap: 12,
                              padding: "0 18px 18px",
                            }}
                          >
                            {embed.fields.map((field) => (
                              <div
                                key={field.id}
                                style={{
                                  borderRadius: 18,
                                  padding: 16,
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr auto",
                                    gap: 12,
                                    alignItems: "end",
                                  }}
                                >
                                  <Field label="Field name">
                                    <input
                                      value={field.name}
                                      onChange={(e) =>
                                        updateEmbedAt(embed.id, (prev) => ({
                                          ...prev,
                                          fields: (prev.fields || []).map((f) =>
                                            f.id === field.id
                                              ? { ...f, name: e.target.value }
                                              : f
                                          ),
                                        }))
                                      }
                                      placeholder="Field name"
                                      style={inputStyle}
                                    />
                                  </Field>

                                  <Field label="Field value">
                                    <input
                                      value={field.value}
                                      onChange={(e) =>
                                        updateEmbedAt(embed.id, (prev) => ({
                                          ...prev,
                                          fields: (prev.fields || []).map((f) =>
                                            f.id === field.id
                                              ? { ...f, value: e.target.value }
                                              : f
                                          ),
                                        }))
                                      }
                                      placeholder="Field value"
                                      style={inputStyle}
                                    />
                                  </Field>

                                  <MotionButton
                                    onClick={() =>
                                      removeFieldFromEmbed(embed.id, field.id)
                                    }
                                    style={{
                                      ...dangerButtonStyle,
                                      height: 48,
                                      alignSelf: "end",
                                    }}
                                  >
                                    Delete Field
                                  </MotionButton>
                                </div>

                                <div
                                  style={{
                                    marginTop: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    color: "#fff",
                                    fontWeight: 600,
                                    fontSize: 14,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!field.inline}
                                    onChange={() =>
                                      updateEmbedAt(embed.id, (prev) => ({
                                        ...prev,
                                        fields: (prev.fields || []).map((f) =>
                                          f.id === field.id
                                            ? { ...f, inline: !f.inline }
                                            : f
                                        ),
                                      }))
                                    }
                                    style={{
                                      width: 16,
                                      height: 16,
                                      accentColor: "#a855f7",
                                      cursor: "pointer",
                                    }}
                                  />
                                  <span>Inline field</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                   <PremiumField
  label="Header Text"
  value={embed.header || ""}
  unlocked={hasPremium}
  onChange={(value) =>
    updateEmbedField(embed.id, "header", value)
  }
/>

<PremiumField
  label="Footer Text"
  value={embed.footer || ""}
  unlocked={hasPremium}
  onChange={(value) =>
    updateEmbedField(embed.id, "footer", value)
  }
/>
                    </div>
                  )}
                </div>
              );
            })}

            <MotionButton
              onClick={addEmbed}
              style={{
                ...bigBottomAddButtonStyle,
                marginTop: -2,
              }}
            >
              <Plus size={18} />
              Add Embed
            </MotionButton>

            <SectionCard title="Interaction Settings">
              {(panel.mode === "button" || panel.mode === "captcha") && (
                <>
                  <Field label="Button Label">
                    <input
                      value={panel.interaction?.button?.label || ""}
                      onChange={(e) =>
                        updatePanel((prev) => ({
                          ...prev,
                          interaction: {
                            ...prev.interaction,
                            button: {
                              ...prev.interaction?.button,
                              label: e.target.value,
                            },
                          },
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

               <Field label="Button Style">
  <SearchableSelect
    options={[
      { id: "Primary", name: "Primary" },
      { id: "Secondary", name: "Secondary" },
      { id: "Success", name: "Success" },
      { id: "Danger", name: "Danger" },
    ]}
    value={panel.interaction?.button?.style || "Success"}
    onChange={(nextId) =>
      updatePanel((prev) => ({
        ...prev,
        interaction: {
          ...prev.interaction,
          button: {
            ...prev.interaction?.button,
            style: nextId,
          },
        },
      }))
    }
    placeholder="Select button style"
    searchPlaceholder="Search styles..."
   formatLabel={(item) => {
  const styles = {
    Primary: "rgba(88,101,242,0.9)",
    Secondary: "rgba(120,130,150,0.9)",
    Success: "rgba(87,242,135,0.9)",
    Danger: "rgba(237,66,69,0.9)",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: styles[item.id] || "#fff",
        }}
      />
      {item.name}
    </div>
  );
}}
  />
</Field>

   <Field label="Button Emoji">
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <GlobalEmojiPicker
      value={panel.interaction?.button?.emoji}
      serverEmojis={guildEmojis}
      onChange={(emojiValue) =>
        updatePanel((prev) => ({
          ...prev,
          interaction: {
            ...prev.interaction,
            button: {
              ...prev.interaction?.button,
              emoji: normalizePickedEmoji(emojiValue),
            },
          },
        }))
      }
    />

    <SelectedEmojiCard
      emoji={panel.interaction?.button?.emoji}
      labelFallback="Select emoji"
    />
  </div>
</Field>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 12,
                      color: "#fff",
                      fontWeight: 800,
                      width: "fit-content",
                      ...buttonPreviewStyle,
                    }}
                  >
                    {renderSelectedEmojiPreview(
                      panel.interaction?.button?.emoji || "✅"
                    )}
                    {panel.interaction?.button?.label || "Verify"}
                  </div>
                </>
              )}

              {panel.mode === "reaction" && (
               <Field label="Reaction Emoji">
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <GlobalEmojiPicker
      value={panel.interaction?.reaction?.emoji}
      serverEmojis={guildEmojis}
      onChange={(emojiValue) =>
        updatePanel((prev) => ({
          ...prev,
          interaction: {
            ...prev.interaction,
            reaction: {
              ...(prev.interaction?.reaction || {}),
              emoji: normalizePickedEmoji(emojiValue),
            },
          },
        }))
      }
    />

    <SelectedEmojiCard
      emoji={panel.interaction?.reaction?.emoji}
      labelFallback="Select emoji"
    />
  </div>
</Field>
)}

              {panel.mode === "captcha" && (
                <>
                  <Field label="Captcha Attempts">
                    <input
                      type="number"
                      min="1"
                      value={panel.interaction?.captcha?.attempts ?? 3}
                      onChange={(e) =>
                        updatePanel((prev) => ({
                          ...prev,
                          interaction: {
                            ...prev.interaction,
                            captcha: {
                              ...prev.interaction?.captcha,
                              attempts: Number(e.target.value) || 3,
                            },
                          },
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Captcha Timeout (seconds)">
                    <input
                      type="number"
                      min="10"
                      value={panel.interaction?.captcha?.timeout ?? 60}
                      onChange={(e) =>
                        updatePanel((prev) => ({
                          ...prev,
                          interaction: {
                            ...prev.interaction,
                            captcha: {
                              ...prev.interaction?.captcha,
                              timeout: Number(e.target.value) || 60,
                            },
                          },
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>
                </>
              )}
            </SectionCard>
          </div>

          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <SectionCard
              title="Live Preview"
              headerRight={
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#dbe2ff",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <Eye size={16} />
                  Live Preview
                </div>
              }
            >
              <div
                style={{
                  borderRadius: 22,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))",
                  border: "1px solid rgba(255,255,255,0.05)",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #5b6cff, #6ea7ff)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      color: "#fff",
                      flexShrink: 0,
                      boxShadow: "0 8px 22px rgba(88,101,242,0.24)",
                    }}
                  >
                    K
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 15,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      Kyro
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#fff",
                          padding: "3px 7px",
                          borderRadius: 8,
                          background: "#5865F2",
                        }}
                      >
                        BOT
                      </span>
                    </div>
                  </div>
                </div>

                {embeds.map((embed, index) => (
                  <div
                    key={embed.id}
                    style={{
                      borderRadius: 18,
                      background: "rgba(20,22,29,0.92)",
                      borderLeft: `4px solid ${embed.color || "#5865F2"}`,
                      padding: 16,
                      marginBottom: index === embeds.length - 1 ? 0 : 14,
                    }}
                  >
                    {embed.header && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 12,
                          fontSize: 13,
                          color: "rgba(255,255,255,0.72)",
                          lineHeight: 1.4,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "#5865F2",
                            flexShrink: 0,
                          }}
                        />
                        <span>{renderDiscordContent(embed.header)}</span>
                      </div>
                    )}

                    {embed.title && (
                      <div
                        style={{
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 18,
                          marginBottom: 10,
                          lineHeight: 1.4,
                        }}
                      >
                        {renderDiscordContent(embed.title)}
                      </div>
                    )}

                    {embed.description && (
                      <div
                        style={{
                          color: "rgba(255,255,255,0.9)",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.7,
                          fontSize: 14,
                        }}
                      >
                        {renderDiscordContent(embed.description)}
                      </div>
                    )}

                    {embed.image && (
                      <div
                        style={{
                          marginTop: 14,
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.05)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <img
                          src={embed.image}
                          alt="Embed banner"
                          style={{
                            width: "100%",
                            maxHeight: 200,
                            objectFit: "cover",
                            display: "block",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {(embed.fields || []).length > 0 && (
                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        {embed.fields.map((field) => (
                          <div
                            key={field.id}
                            style={{
                              gridColumn: field.inline ? "span 1" : "span 3",
                              borderRadius: 12,
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.04)",
                              padding: 12,
                            }}
                          >
                            <div
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 13,
                                marginBottom: 6,
                              }}
                            >
                              {field.name || "Field"}
                            </div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.66)",
                                fontSize: 13,
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {renderDiscordContent(field.value || "—")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {embed.footer && (
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 12,
                          color: "rgba(255,255,255,0.52)",
                          lineHeight: 1.4,
                        }}
                      >
                        {renderDiscordContent(embed.footer)}
                      </div>
                    )}
                  </div>
                ))}

                <div
                  style={{
                    marginTop: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 12,
                    color: "#fff",
                    fontWeight: 800,
                    ...buttonPreviewStyle,
                  }}
                >
                  {panel.mode === "reaction"
                    ? renderSelectedEmojiPreview(
                        panel.interaction?.reaction?.emoji
                      )
                    : renderSelectedEmojiPreview(
                        panel.interaction?.button?.emoji ||
                          panel.interaction?.reaction?.emoji ||
                          "✅"
                      )}

                  {panel.mode === "reaction"
                    ? "React to Verify"
                    : panel.interaction?.button?.label || "Verify"}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Premium Features">
            <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.04)",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: "#fff",
      fontWeight: 700,
      flexWrap: "wrap",
    }}
  >
    <span>Auto Kick Unverified</span>

    <span style={premiumBadgeStyle}>
      <Crown size={12} />
      Premium
    </span>
  </div>

<button
  type="button"
  onClick={() =>
    hasPremium &&
    setPanel((prev) => ({
      ...prev,
      autoKick: {
        ...(prev.autoKick || {}),
        enabled: !prev.autoKick?.enabled,
      },
    }))
  }
  style={{
    width: 54,
    height: 30,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: panel.autoKick?.enabled ? "#5865F2" : "#2a2f3c",
    position: "relative",
    cursor: hasPremium ? "pointer" : "not-allowed",
    opacity: hasPremium ? 1 : 0.55,
  }}
>
  <span
    style={{
      position: "absolute",
      top: 3,
      left: panel.autoKick?.enabled ? 27 : 3,
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "#fff",
      transition: "all 0.2s ease",
    }}
  />
</button>
</div>

<PremiumField
  label="Auto Kick Minutes"
  value={String(panel.autoKick?.minutes ?? 10)}
  unlocked={hasPremium}
  onChange={(value) =>
    setPanel((prev) => ({
      ...prev,
      autoKick: {
        ...(prev.autoKick || {}),
        minutes: Number(value) || 10,
      },
    }))
  }
/>
            </SectionCard>

            <SectionCard title="Quick Summary">
              <SummaryRow
                label="Status"
                value={panel.sentPanel?.messageId ? "Published" : "Draft"}
              />
              <SummaryRow label="Embeds" value={String(embeds.length)} />
              <SummaryRow
                label="Verification Mode"
                value={panel.mode || "button"}
              />
              <SummaryRow
                label="Verified Role"
                value={
                  roles.find((r) => r.id === panel.roleId)?.name ||
                  "Not selected"
                }
              />
              <SummaryRow
                label="Verification Channel"
                value={
                  channels.find((c) => c.id === panel.channelId)?.name ||
                  "Not selected"
                }
              />
              <SummaryRow
                label="Premium Used"
                value={isPremiumUsed ? "Yes" : "No"}
              />
            </SectionCard>
          </div>
        </div>

        {hasChanges && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              bottom: 22,
              transform: "translateX(-50%)",
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 20,
              background: "rgba(10,14,24,0.95)",
              border: "1px solid rgba(88,101,242,0.16)",
              boxShadow: "0 14px 36px rgba(0,0,0,0.34)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.82)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              You have unsaved changes
            </div>

   <MotionButton
  onClick={() => {
    if (!savedPanelState) return;

    const restoredPanel = syncPanelEmbeds(
      JSON.parse(JSON.stringify(savedPanelState))
    );

    setPanel(restoredPanel);
    setHasChanges(false);

    if (hasChanges) {
      pushToast("info", "Changes discarded", "Your edits were reverted.");
    }
  }}
  style={darkActionButtonStyle}
>
  Cancel
</MotionButton>
            <MotionButton
              onClick={() => savePanel(true)}
              disabled={saving}
              style={{
                ...headerPrimaryButtonStyle,
                minWidth: 152,
                justifyContent: "center",
                opacity: saving ? 0.78 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </MotionButton>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, headerRight, children }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(10,16,30,0.96), rgba(8,13,26,0.94))",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 24,
        padding: 18,
        boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#fff",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {title}
        </h3>

        {headerRight || null}
      </div>

      <div style={{ display: "grid", gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div
        style={{
          marginBottom: 8,
          color: "rgba(255,255,255,0.84)",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function PremiumField({ label, value, unlocked = false, onChange }) {
  return (
    <div>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "rgba(255,255,255,0.82)",
          fontWeight: 700,
          fontSize: 14,
          flexWrap: "wrap",
        }}
      >
        <span>{label}</span>
        <span style={premiumBadgeStyle}>
          <Crown size={12} />
          Premium
        </span>
      </div>

      <input
        value={value}
        readOnly={!unlocked}
        onChange={(e) => unlocked && onChange?.(e.target.value)}
        placeholder={unlocked ? "" : "Upgrade to unlock"}
        style={{
          ...inputStyle,
          opacity: unlocked ? 1 : 0.55,
          cursor: unlocked ? "text" : "not-allowed",
          background: unlocked
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.02)",
        }}
      />
    </div>
  );
}

function LockedPremiumToggleRow({ label, enabled }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#fff",
          fontWeight: 700,
          flexWrap: "wrap",
        }}
      >
        <span>{label}</span>
        <span style={premiumBadgeStyle}>
          <Crown size={12} />
          Premium
        </span>
      </div>

      <div
        style={{
          width: 50,
          height: 28,
          borderRadius: 999,
          background: enabled ? "#5865F2" : "#2a2f3c",
          position: "relative",
          transition: "all 0.2s ease",
          cursor: "not-allowed",
          flexShrink: 0,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 25 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            transition: "all 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 14 }}>
        {label}
      </div>
      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ label, tone = "gold" }) {
  const styles =
    tone === "green"
      ? {
          color: "#53f58d",
          background: "rgba(27, 133, 74, 0.14)",
          border: "1px solid rgba(83,245,141,0.18)",
        }
      : {
          color: "#f6c76f",
          background: "rgba(182, 127, 21, 0.14)",
          border: "1px solid rgba(246,199,111,0.18)",
        };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 800,
        ...styles,
      }}
    >
      {label}
    </span>
  );
}

const premiumBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 999,
  background: "rgba(245, 158, 11, 0.12)",
  border: "1px solid rgba(245, 158, 11, 0.18)",
  color: "#ffd98e",
  fontSize: 12,
  fontWeight: 800,
};

const embedBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(88,101,242,0.10)",
  border: "1px solid rgba(88,101,242,0.18)",
  color: "#dbe2ff",
  fontSize: 12,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#fff",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
  transition: "all 0.18s ease",
};

const selectStyle = {
  width: "100%",
  padding: "13px 42px 13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#111827",
  color: "#fff",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  transition: "all 0.18s ease",
};


const colorPickerStyle = {
  width: "100%",
  height: 49,
  padding: 6,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#111827",
  cursor: "pointer",
  boxSizing: "border-box",
};

const topGhostButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  transition: "all 0.2s ease",
  boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
};

const editPillButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  transition: "all 0.2s ease",
  boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
};

const headerPrimaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "12px 20px",
  borderRadius: 16,
  border: "1px solid rgba(120,132,255,0.20)",
  background:
    "linear-gradient(180deg, rgba(124,137,255,0.98), rgba(93,108,255,0.98))",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 22px rgba(88,101,242,0.16)",
  transition: "all 0.2s ease",
};

const headerOutlineButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "12px 18px",
  borderRadius: 16,
  border: "1px solid rgba(105,118,255,0.14)",
  background: "rgba(88,101,242,0.05)",
  color: "#eef1ff",
  cursor: "pointer",
  fontWeight: 750,
  boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
  transition: "all 0.2s ease",
};

const headerSecondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  padding: "12px 18px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.035)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 750,
  boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
  transition: "all 0.2s ease",
};

const outlineGlowButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 16,
  border: "1px solid rgba(88,101,242,0.12)",
  background: "rgba(88,101,242,0.06)",
  color: "#e4e9ff",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
  transition: "all 0.2s ease",
};

const darkActionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  transition: "all 0.2s ease",
  boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
};

const dangerButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 16,
  border: "1px solid rgba(255,80,80,0.16)",
  background: "rgba(120, 21, 33, 0.14)",
  color: "#ffb3b3",
  cursor: "pointer",
  fontWeight: 700,
  transition: "all 0.2s ease",
  boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
};

const collapseDropdownButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  transition: "all 0.2s ease",
  boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
};

const bigBottomAddButtonStyle = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "16px 18px",
  borderRadius: 18,
  border: "1px solid rgba(88,101,242,0.12)",
  background: "rgba(88,101,242,0.06)",
  color: "#e4e9ff",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
  transition: "all 0.2s ease",
};

const emojiTabButtonStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
};

const emptyPickerTextStyle = {
  color: "rgba(255,255,255,0.55)",
  fontSize: 13,
  padding: "14px 6px 6px",
};