import { useEffect, useMemo, useRef, useState } from "react";
import PageLoader from "../components/PageLoader";
import GlobalEmojiPicker from "../components/GlobalEmojiPicker";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  Send,
  FileText,
  Sparkles,
  X,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  Crown,
  Link2,
  GripVertical,
  ChevronDown,
  Check,
  Hash,
  Eye,
  Save,
} from "lucide-react";

import API_BASE from "../config/api";

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return "—";
  }
}

function makeLocalId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseEditorHash() {
  const raw = window.location.hash || "";
  const match = raw.match(/^#\/embed-builder\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return {
    guildId: decodeURIComponent(match[1]),
    embedId: decodeURIComponent(match[2]),
  };
}

function goToEditor(guildId, embedId) {
  window.location.hash = `#/embed-builder/${guildId}/${embedId}`;
}

function goToList() {
  window.location.hash = "#/embedbuilder";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizePickedEmoji(emoji) {
  if (!emoji) return "";

  if (typeof emoji === "object" && emoji.id) {
    return (
      emoji.identifier ||
      emoji.formatted ||
      `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
    );
  }

  return emoji;
}

function normalizeEmojiObject(raw) {
  if (!raw) return null;
  const id = raw.id || raw.emojiId || raw._id || "";
  const name = raw.name || raw.emojiName || "emoji";
  const animated = Boolean(raw.animated);
  const formatted = id
    ? `<${animated ? "a" : ""}:${name}:${id}>`
    : name || "";
  const url = id
    ? `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=96&quality=lossless`
    : "";
  return {
    id,
    name,
    animated,
    formatted,
    url,
  };
}

function parseEmojiValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const customMatch = trimmed.match(/^<a?:([A-Za-z0-9_]+):(\d+)>$/);
  if (customMatch) {
    const animated = trimmed.startsWith("<a:");
    const name = customMatch[1];
    const id = customMatch[2];
    return {
      type: "custom",
      name,
      id,
      animated,
      url: `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=96&quality=lossless`,
      display: trimmed,
    };
  }

  return {
    type: "unicode",
    value: trimmed,
    display: trimmed,
  };
}
function renderDiscordTextParts(text) {
  const input = String(text || "");
  if (!input) return [];

  const regex = /<a?:([A-Za-z0-9_]+):(\d+)>/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const [full, name, id] = match;
    const animated = full.startsWith("<a:");

    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: input.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "emoji",
      name,
      id,
      animated,
      url: `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=96&quality=lossless`,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push({
      type: "text",
      value: input.slice(lastIndex),
    });
  }

  return parts;
}

function DiscordInlineText({ text, style }) {
  const parts = renderDiscordTextParts(text);

  return (
    <span
      style={{
        ...style,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {parts.map((part, index) => {
        if (part.type === "emoji") {
          return (
            <img
              key={`${part.id}_${index}`}
              src={part.url}
              alt={part.name}
              style={{
                width: 20,
                height: 20,
                objectFit: "contain",
                verticalAlign: "middle",
                margin: "0 2px",
              }}
            />
          );
        }

        return <span key={`text_${index}`}>{part.value}</span>;
      })}
    </span>
  );
}

function DiscordBlockText({ text, style }) {
  const parts = renderDiscordTextParts(text);

  return (
    <div
      style={{
        ...style,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {parts.map((part, index) => {
        if (part.type === "emoji") {
          return (
            <img
              key={`${part.id}_${index}`}
              src={part.url}
              alt={part.name}
              style={{
                width: 20,
                height: 20,
                objectFit: "contain",
                verticalAlign: "middle",
                margin: "0 2px",
              }}
            />
          );
        }

        return <span key={`text_${index}`}>{part.value}</span>;
      })}
    </div>
  );
}
function createDefaultEmbedBlock(order = 0) {
  return {
    id: makeLocalId("embed"),
    title: "",
    titleUrl: "",
    description: "",
    color: "#5865F2",
    author: {
      name: "",
      iconUrl: "",
      url: "",
    },
    thumbnailUrl: "",
    imageUrl: "",
    footer: {
      text: "",
      iconUrl: "",
    },
    timestamp: false,
    fields: [],
    order,
  };
}

function createDefaultButton(order = 0) {
  return {
    id: makeLocalId("btn"),
    type: "link",
    label: "",
    emoji: "",
    url: "",
    style: "link",
    row: 0,
    order,
  };
}

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#fff",
    outline: "none",
    padding: "13px 14px",
    fontSize: 14,
    boxSizing: "border-box",
    transition: "all 0.18s ease",
  };
}

function textareaStyle() {
  return {
    ...inputStyle(),
    resize: "vertical",
    minHeight: 120,
    lineHeight: 1.6,
  };
}

function labelStyle() {
  return {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    display: "block",
  };
}

function helperTextStyle() {
  return {
    marginTop: 7,
    color: "rgba(255,255,255,0.52)",
    fontSize: 12,
    lineHeight: 1.5,
  };
}

function sectionCardStyle() {
  return {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.06)",
    background:
      "linear-gradient(180deg, rgba(20,26,40,0.98), rgba(12,16,27,0.98))",
    padding: 18,
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    transition: "all 0.2s ease",
  };
}

function iconButtonStyle() {
  return {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#dbe4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
}

function StatusBadge({ status }) {
  const isPublished = status === "published";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: isPublished ? "#86efac" : "#fcd34d",
        background: isPublished
          ? "rgba(34,197,94,0.14)"
          : "rgba(245,158,11,0.14)",
        border: isPublished
          ? "1px solid rgba(34,197,94,0.28)"
          : "1px solid rgba(245,158,11,0.28)",
        boxShadow: isPublished
          ? "0 0 12px rgba(34,197,94,0.28)"
          : "0 0 10px rgba(245,158,11,0.18)",
        transition: "all 0.18s ease",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isPublished ? "#22c55e" : "#f59e0b",
        }}
      />
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

function ActionButton({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = danger
          ? "0 10px 24px rgba(239,68,68,0.18)"
          : "0 10px 24px rgba(88,101,242,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 12,
        border: danger
          ? "1px solid rgba(239,68,68,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
        background: danger
          ? "rgba(127,29,29,0.2)"
          : "rgba(255,255,255,0.04)",
        color: danger ? "#fca5a5" : "#e5e7eb",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.18s ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ onCreate, creating }) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(10,14,24,0.96))",
        minHeight: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            margin: "0 auto 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, rgba(88,101,242,0.22), rgba(59,130,246,0.12))",
            border: "1px solid rgba(88,101,242,0.28)",
          }}
        >
          <Sparkles size={34} color="#8ea1ff" />
        </div>

        <h2
          style={{
            margin: 0,
            color: "#fff",
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          Build premium Discord embed messages
        </h2>

        <p
          style={{
            marginTop: 12,
            marginBottom: 26,
            color: "rgba(255,255,255,0.68)",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          Create beautiful announcement posts, rules panels, link messages, and
          reusable visual embeds for your server.
        </p>

        <button
          onClick={onCreate}
          disabled={creating}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderRadius: 16,
            border: "1px solid rgba(88,101,242,0.32)",
            background:
              "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(59,130,246,0.95))",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.7 : 1,
          }}
        >
          <Plus size={18} />
          {creating ? "Creating..." : "Create New Embed Message"}
        </button>
      </div>
    </div>
  );
}

function EmbedCard({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  onPublish,
  onUpdate,
  searchTerm = "",
}) {
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();

  const isMatch =
    normalizedSearch &&
    `${item.name || ""} ${item.channelName || ""} ${item.status || ""}`
      .toLowerCase()
      .includes(normalizedSearch);

  return (
    <div
      style={{
        borderRadius: 22,
        border: isMatch
          ? "1px solid rgba(88,101,242,0.38)"
          : "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(20,26,40,0.98), rgba(12,16,27,0.98))",
        padding: 18,
        boxShadow: isMatch
          ? "0 0 0 1px rgba(88,101,242,0.14), 0 18px 42px rgba(88,101,242,0.16)"
          : "0 12px 28px rgba(0,0,0,0.18)",
        transform: isMatch ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.18s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "flex-start",
          flexWrap: "wrap",
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
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isMatch
                  ? "rgba(88,101,242,0.18)"
                  : "rgba(88,101,242,0.14)",
                border: isMatch
                  ? "1px solid rgba(88,101,242,0.34)"
                  : "1px solid rgba(88,101,242,0.22)",
                boxShadow: isMatch
                  ? "0 0 18px rgba(88,101,242,0.18)"
                  : "none",
              }}
            >
              <FileText size={20} color="#9fb0ff" />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 18,
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {item.name || "New Embed"}
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: "rgba(255,255,255,0.58)",
                  fontSize: 13,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <span>Embeds: {item.embeds?.length || 0}</span>
                <span>Buttons: {item.buttons?.length || 0}</span>
                <span>Updated: {formatDate(item.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <StatusBadge status={item.status} />
      </div>

      <div
        style={{
          marginTop: 18,
          padding: "14px 16px",
          borderRadius: 16,
          background: "rgba(255,255,255,0.035)",
          border: isMatch
            ? "1px solid rgba(88,101,242,0.14)"
            : "1px solid rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.72)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <div>
          <strong style={{ color: "#dbe4ff" }}>Channel:</strong>{" "}
          {item.channelName
            ? `# ${item.channelName}`
            : item.channelId
              ? "Selected channel"
              : "Not selected yet"}
        </div>

        <div style={{ marginTop: 6 }}>
          <strong style={{ color: "#dbe4ff" }}>Premium Used:</strong>{" "}
          {item.usesPremium ? "Yes" : "No"}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <ActionButton
          icon={<Pencil size={15} />}
          label="Edit"
          onClick={() => onEdit(item)}
        />
        <ActionButton
          icon={<Copy size={15} />}
          label="Duplicate"
          onClick={() => onDuplicate(item)}
        />
        <ActionButton
          icon={<Send size={15} />}
          label="Publish"
          onClick={() => onPublish?.(item)}
        />
        <ActionButton
          icon={<Send size={15} />}
          label="Update"
          onClick={() => onUpdate?.(item)}
        />
        <ActionButton
          icon={<Trash2 size={15} />}
          label="Delete"
          danger
          onClick={() => onDelete(item)}
        />
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, itemName, onCancel, onConfirm, deleting }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(10,14,24,0.98))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.22)",
              }}
            >
              <AlertTriangle size={20} color="#fca5a5" />
            </div>

            <div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                Delete embed message?
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "rgba(255,255,255,0.58)",
                  fontSize: 13,
                }}
              >
                This action cannot be undone.
              </div>
            </div>
          </div>

          <button onClick={onCancel} style={iconButtonStyle()}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.76)",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            Are you sure you want to delete{" "}
            <span style={{ color: "#fff", fontWeight: 700 }}>
              {itemName || "this embed message"}
            </span>
            ?
          </div>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onCancel}
              disabled={deleting}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#e5e7eb",
                fontWeight: 700,
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.65 : 1,
              }}
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={deleting}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(239,68,68,0.25)",
                background:
                  "linear-gradient(135deg, rgba(220,38,38,0.95), rgba(185,28,28,0.95))",
                color: "#fff",
                fontWeight: 800,
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumLockedSection({ title, description, locked = true, children }) {
  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 18,
        border: locked
          ? "1px solid rgba(255,215,0,0.16)"
          : "1px solid rgba(34,197,94,0.18)",
        background: locked
          ? "linear-gradient(180deg, rgba(39,31,13,0.25), rgba(17,24,39,0.75))"
          : "rgba(34,197,94,0.045)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 800, fontSize: 15 }}>
            {title}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                background: locked ? "rgba(250,204,21,0.12)" : "rgba(34,197,94,0.12)",
                color: locked ? "#fde68a" : "#86efac",
                border: locked ? "1px solid rgba(250,204,21,0.22)" : "1px solid rgba(34,197,94,0.22)",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Crown size={12} />
              {locked ? "Premium" : "Unlocked"}
            </span>
          </div>

          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            {description}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", padding: 16 }}>
        {locked ? (
          <div style={{ filter: "blur(1px)", opacity: 0.72, pointerEvents: "none" }}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function SwitchToggle({ checked, onChange, label, description }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        alignItems: "center",
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <div>
        <div
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {label}
        </div>
        {description ? (
          <div style={helperTextStyle()}>{description}</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 52,
          height: 30,
          borderRadius: 999,
          border: checked
            ? "1px solid rgba(88,101,242,0.45)"
            : "1px solid rgba(255,255,255,0.12)",
          background: checked
            ? "linear-gradient(135deg, #5865F2, #3b82f6)"
            : "rgba(255,255,255,0.06)",
          position: "relative",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 25 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            transition: "all 0.18s ease",
          }}
        />
      </button>
    </div>
  );
}

function ImageInput({ label, value, onChange, onUpload }) {
  const fileRef = useRef(null);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={labelStyle()}>{label}</label>

      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste image URL..."
        style={inputStyle()}
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "11px 14px",
            borderRadius: 12,
            border: "1px solid rgba(88,101,242,0.25)",
            background: "rgba(88,101,242,0.1)",
            color: "#dbe4ff",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ImageIcon size={16} />
          Choose from device
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(127,29,29,0.18)",
              color: "#fca5a5",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Remove image
          </button>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <div
          style={{
            borderRadius: 16,
            border: "1px dashed rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.02)",
            padding: 12,
          }}
        >
          <img
            src={value}
            alt={label}
            style={{
              width: "100%",
              maxHeight: 180,
              objectFit: "cover",
              borderRadius: 12,
              display: "block",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select",
  renderValue,
  getKey = (opt) => opt.id,
  getLabel = (opt) => opt.label,
  searchable = false,
  searchPlaceholder = "Search...",
  maxHeight = 260,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((opt) => String(getKey(opt)) === String(value));

  const filteredOptions = useMemo(() => {
    if (!searchable) return options;
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) =>
      String(getLabel(opt)).toLowerCase().includes(term)
    );
  }, [options, searchable, search, getLabel]);

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
          paddingRight: 12,
          appearance: "none",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            color: selected ? "#fff" : "rgba(255,255,255,0.55)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? renderValue?.(selected) || getLabel(selected) : placeholder}
        </span>

        <ChevronDown
          size={16}
          color="rgba(255,255,255,0.65)"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(9,12,20,0.98))",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          {searchable ? (
            <div
              style={{
                padding: 10,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  ...inputStyle(),
                  background: "rgba(255,255,255,0.04)",
                }}
              />
            </div>
          ) : null}

          <div
            style={{
              maxHeight,
              overflowY: "auto",
              padding: 8,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 13,
                }}
              >
                No results found.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const optValue = String(getKey(opt));
                const isSelected = String(value) === optValue;

                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => {
                      onChange(optValue, opt);
                      setOpen(false);
                      setSearch("");
                    }}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      borderRadius: 12,
                      border: "none",
                      background: isSelected
                        ? "rgba(88,101,242,0.16)"
                        : "transparent",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      {renderValue?.(opt) || getLabel(opt)}
                    </span>

                    {isSelected ? (
                      <Check size={15} color="#9fb0ff" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmojiSelector({ value, onChange, emojiOptions }) {
  const parsed = parseEmojiValue(value);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={labelStyle()}>Button Emoji</label>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <GlobalEmojiPicker
          value={value || ""}
          serverEmojis={emojiOptions || []}
          onChange={(emojiValue) => onChange(normalizePickedEmoji(emojiValue))}
        />

        {parsed ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              padding: "8px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              minHeight: 38,
            }}
          >
            {parsed.type === "custom" && parsed.url ? (
              <img
                src={parsed.url}
                alt={parsed.name}
                style={{
                  width: 20,
                  height: 20,
                  objectFit: "contain",
                }}
              />
            ) : (
              <span style={{ fontSize: 18, lineHeight: 1 }}>
                {parsed.display}
              </span>
            )}

            <span>
              {parsed.type === "custom" ? parsed.name : "Unicode emoji selected"}
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 38,
              padding: "8px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.52)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            No emoji selected
          </div>
        )}
      </div>

      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or type unicode emoji / <:name:id>"
        style={inputStyle()}
      />
    </div>
  );
}

function EmbedBlockEditor({
  block,
  index,
  onUpdate,
  onDelete,
  onAddField,
  onUpdateField,
  onDeleteField,
  onUploadImage,
  isCollapsed,
  onToggleCollapse,
  isPremium = false,
}) {
 const summaryBadges = [
  block.title ? "Title added" : null,
  block.description ? "Description added" : null,
  block.thumbnailUrl ? "Thumbnail added" : null,
  block.imageUrl ? "Banner added" : null,
  block.fields?.length
    ? `${block.fields.length} field${block.fields.length > 1 ? "s" : ""}`
    : null,
].filter(Boolean);

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(18,23,37,0.98), rgba(10,14,24,0.98))",
        padding: 18,
        boxShadow: isCollapsed
          ? "0 10px 24px rgba(0,0,0,0.14)"
          : "0 18px 42px rgba(0,0,0,0.18)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#fff",
              fontWeight: 800,
              fontSize: 17,
              flexWrap: "wrap",
            }}
          >
            <GripVertical size={16} color="rgba(255,255,255,0.5)" />

            <button
              type="button"
              onClick={onToggleCollapse}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#dbe4ff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.18s ease",
              }}
            >
              <ChevronDown
                size={17}
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.18s ease",
                }}
              />
            </button>

            <span>Embed #{index + 1}</span>
          </div>

          {summaryBadges.length > 0 ? (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                paddingLeft: 26,
              }}
            >
              {summaryBadges.map((badge, badgeIndex) => (
                <span
                  key={`${badge}_${badgeIndex}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(88,101,242,0.10)",
                    border: "1px solid rgba(88,101,242,0.16)",
                    color: "rgba(219,228,255,0.92)",
                    fontSize: 12,
                    fontWeight: 700,
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={badge}
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : isCollapsed ? (
            <div
              style={{
                marginTop: 10,
                paddingLeft: 26,
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
              }}
            >
              Empty embed block
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#dbe4ff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.18)",
              background: "rgba(127,29,29,0.18)",
              color: "#fca5a5",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Remove Embed
          </button>
        </div>
      </div>

      {!isCollapsed ? (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <label style={labelStyle()}>Title</label>
              <input
                value={block.title || ""}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Enter embed title..."
                style={inputStyle()}
              />
            </div>

            <div>
              <label style={labelStyle()}>Title URL</label>
              <input
                value={block.titleUrl || ""}
                onChange={(e) => onUpdate({ titleUrl: e.target.value })}
                placeholder="https://..."
                style={inputStyle()}
              />
              <div style={helperTextStyle()}>
                Makes the embed title clickable in Discord.
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Color</label>
              <div
                style={{
                  ...inputStyle(),
                  padding: 8,
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <input
                  type="color"
                  value={block.color || "#5865F2"}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  style={{
                    width: 42,
                    height: 32,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                />
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  {block.color || "#5865F2"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle()}>Description</label>
            <textarea
              value={block.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Write your embed description..."
              rows={5}
              style={textareaStyle()}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            <ImageInput
              label="Thumbnail"
              value={block.thumbnailUrl || ""}
              onChange={(value) => onUpdate({ thumbnailUrl: value })}
              onUpload={(file) => onUploadImage("thumbnailUrl", file)}
            />

            <ImageInput
              label="Banner / Main Image"
              value={block.imageUrl || ""}
              onChange={(value) => onUpdate({ imageUrl: value })}
              onUpload={(file) => onUploadImage("imageUrl", file)}
            />
          </div>

          <PremiumLockedSection
  title="Header / Author"
  description="Header name, icon, and link are premium-only embed cosmetics."
  locked={!isPremium}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
    }}
  >
    <div>
      <label style={labelStyle()}>Header Name</label>
      <input
        value={block.author?.name || ""}
        onChange={(e) =>
          onUpdate({
            author: {
              ...(block.author || {}),
              name: e.target.value,
            },
          })
        }
        placeholder="Kyro Updates"
        disabled={!isPremium}
        style={inputStyle()}
      />
    </div>

    <div>
      <label style={labelStyle()}>Header Icon URL</label>
      <input
        value={block.author?.iconUrl || ""}
        onChange={(e) =>
          onUpdate({
            author: {
              ...(block.author || {}),
              iconUrl: e.target.value,
            },
          })
        }
        placeholder="https://..."
        disabled={!isPremium}
        style={inputStyle()}
      />
    </div>

    <div>
      <label style={labelStyle()}>Header Link</label>
      <input
        value={block.author?.url || ""}
        onChange={(e) =>
          onUpdate({
            author: {
              ...(block.author || {}),
              url: e.target.value,
            },
          })
        }
        placeholder="https://..."
        disabled={!isPremium}
        style={inputStyle()}
      />
    </div>
  </div>
</PremiumLockedSection>

          <div style={{ marginTop: 16 }}>
            <SwitchToggle
              checked={Boolean(block.timestamp)}
              onChange={(checked) => onUpdate({ timestamp: checked })}
              label="Show timestamp"
              description="Adds a Discord-style timestamp to the footer area of this embed."
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
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
                  fontSize: 16,
                }}
              >
                Fields
              </div>

              <button
                type="button"
                onClick={onAddField}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(88,101,242,0.24)",
                  background: "rgba(88,101,242,0.1)",
                  color: "#dbe4ff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add Field
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {(block.fields || []).map((field, fieldIndex) => (
                <div
                  key={field.id || fieldIndex}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.025)",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={labelStyle()}>Field name</label>
                      <input
                        value={field.name || ""}
                        onChange={(e) =>
                          onUpdateField(fieldIndex, { name: e.target.value })
                        }
                        placeholder="Field name"
                        style={inputStyle()}
                      />
                    </div>

                    <div>
                      <label style={labelStyle()}>Field value</label>
                      <input
                        value={field.value || ""}
                        onChange={(e) =>
                          onUpdateField(fieldIndex, { value: e.target.value })
                        }
                        placeholder="Field value"
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        color: "rgba(255,255,255,0.72)",
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(field.inline)}
                        onChange={(e) =>
                          onUpdateField(fieldIndex, { inline: e.target.checked })
                        }
                      />
                      Inline field
                    </label>

                    <button
                      type="button"
                      onClick={() => onDeleteField(fieldIndex)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(239,68,68,0.18)",
                        background: "rgba(127,29,29,0.18)",
                        color: "#fca5a5",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Delete Field
                    </button>
                  </div>
                </div>
              ))}

              {!block.fields?.length ? (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px dashed rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.015)",
                    padding: 16,
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                  }}
                >
                  No fields added yet.
                </div>
              ) : null}
            </div>
          </div>

        <PremiumLockedSection
  title="Footer"
  description="Footer text and footer icon are premium-only cosmetic controls."
  locked={!isPremium}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
    }}
  >
    <div>
      <label style={labelStyle()}>Footer Text</label>
      <input
        value={block.footer?.text || ""}
        onChange={(e) =>
          onUpdate({
            footer: {
              ...(block.footer || {}),
              text: e.target.value,
            },
          })
        }
        placeholder="Powered by Kyro"
        disabled={!isPremium}
        style={inputStyle()}
      />
    </div>

    <div>
      <label style={labelStyle()}>Footer Icon URL</label>
      <input
        value={block.footer?.iconUrl || ""}
        onChange={(e) =>
          onUpdate({
            footer: {
              ...(block.footer || {}),
              iconUrl: e.target.value,
            },
          })
        }
        placeholder="https://..."
        disabled={!isPremium}
        style={inputStyle()}
      />
    </div>
  </div>
</PremiumLockedSection>
        </>
      ) : null}
    </div>
  );
}

function DiscordPreview({ message }) {
  const timestampText = new Date().toLocaleString();

  return (
    <div
      style={{
        background: "#2b2d31",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(88,101,242,1), rgba(59,130,246,1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
          boxShadow: "0 10px 25px rgba(88,101,242,0.35)",
        }}
      >
        K
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#fff",
              fontSize: 14,
            }}
          >
            Kyro
          </span>
          <span
            style={{
              color: "#fff",
              background: "#5865F2",
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            BOT
          </span>
        </div>

       {message?.messageContent ? (
  <DiscordBlockText
    text={message.messageContent}
    style={{
      marginTop: 8,
      color: "#dcddde",
      fontSize: 14,
      lineHeight: 1.5,
    }}
  />
) : null}

        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {(message?.embeds || []).map((embed, i) => (
            <div
              key={embed.id || i}
              style={{
                borderLeft: `4px solid ${embed.color || "#5865F2"}`,
                background: "#1e1f22",
                borderRadius: 10,
                padding: 14,
                color: "#dbdee1",
                overflow: "hidden",
                boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: embed.thumbnailUrl ? "1fr 88px" : "1fr",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  {embed.author?.name ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {embed.author?.iconUrl ? (
                        <img
                          src={embed.author.iconUrl}
                          alt="author"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : null}

                      <span
                        style={{
                          fontSize: 12,
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {embed.author.name}
                      </span>
                    </div>
                  ) : null}

                  {embed.title ? (
  embed.titleUrl ? (
    <a
      href={embed.titleUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        color: "#ffffff",
        fontWeight: 700,
        fontSize: 16,
        lineHeight: 1.35,
        wordBreak: "break-word",
        textDecoration: "none",
      }}
    >
      <DiscordInlineText text={embed.title} />
    </a>
  ) : (
    <div
      style={{
        color: "#fff",
        fontWeight: 700,
        fontSize: 16,
        lineHeight: 1.35,
        wordBreak: "break-word",
      }}
    >
      <DiscordInlineText text={embed.title} />
    </div>
  )
) : null}

                 {embed.description ? (
  <DiscordBlockText
    text={embed.description}
    style={{
      marginTop: embed.title ? 8 : 0,
      color: "#dbdee1",
      fontSize: 13,
      lineHeight: 1.6,
    }}
  />
) : null}

                  {embed.fields?.length ? (
                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {embed.fields.map((field, fieldIndex) => (
                        <div key={field.id || fieldIndex} style={{ minWidth: 0 }}>
                          <div
  style={{
    color: "#fff",
    fontWeight: 700,
    fontSize: 12,
    wordBreak: "break-word",
  }}
>
  <DiscordInlineText text={field.name || "Field"} />
</div>
                          {field.value && field.value.startsWith("http") ? (
  <a
    href={field.value}
    target="_blank"
    rel="noreferrer"
    style={{
      marginTop: 6,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#fff",
      fontSize: 12,
      fontWeight: 700,
      textDecoration: "none",
      transition: "all 0.18s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(88,101,242,0.18)";
      e.currentTarget.style.border = "1px solid rgba(88,101,242,0.35)";
      e.currentTarget.style.boxShadow =
        "0 6px 18px rgba(88,101,242,0.25)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    {field.name || "Open Link"}
    <span style={{ fontSize: 13 }}>↗</span>
  </a>
) : (
  <DiscordBlockText
    text={field.value || "—"}
    style={{
      marginTop: 4,
      color: "#dbdee1",
      fontSize: 12,
      lineHeight: 1.5,
    }}
  />
)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {embed.thumbnailUrl ? (
                  <img
                    src={embed.thumbnailUrl}
                    alt="thumbnail"
                    style={{
                      width: 88,
                      height: 88,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ) : null}
              </div>

              {embed.imageUrl ? (
                <img
                  src={embed.imageUrl}
                  alt="main"
                  style={{
                    width: "100%",
                    marginTop: 12,
                    borderRadius: 10,
                    objectFit: "cover",
                    maxHeight: 240,
                    display: "block",
                  }}
                />
              ) : null}

              {embed.footer?.text || embed.timestamp ? (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#b5bac1",
                    fontSize: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {embed.footer?.iconUrl ? (
                    <img
                      src={embed.footer.iconUrl}
                      alt="footer"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                  {embed.footer?.text ? <span>{embed.footer.text}</span> : null}
                  {embed.footer?.text && embed.timestamp ? <span>•</span> : null}
                  {embed.timestamp ? <span>{timestampText}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {(message?.buttons || []).length > 0 ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {message.buttons.map((btn, index) => {
              const parsed = parseEmojiValue(btn.emoji);

              return (
                <button
                  key={btn.id || index}
                  type="button"
                  style={{
                    border: "none",
                    background: "#5865F2",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "default",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {parsed?.type === "custom" && parsed.url ? (
                    <img
                      src={parsed.url}
                      alt={parsed.name}
                      style={{
                        width: 18,
                        height: 18,
                        objectFit: "contain",
                      }}
                    />
                  ) : parsed?.display ? (
                    <span>{parsed.display}</span>
                  ) : null}

                  {btn.label || "Button"}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmbedEditorView({ guildId, embedId, setGlobalToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [channels, setChannels] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [message, setMessage] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const hasChanges =
  message && JSON.stringify(message) !== initialSnapshot;
  const [embedNameEdit, setEmbedNameEdit] = useState(false);
  const [collapsedEmbeds, setCollapsedEmbeds] = useState({});
  const [premiumStatus, setPremiumStatus] = useState({
  hasPremium: false,
  plan: "free",
});

const isPremium = Boolean(
  premiumStatus?.hasPremium || premiumStatus?.plan === "lifetime"
);
  

  async function loadData() {
    setLoading(true);

    try {
      const [messageRes, channelsRes, emojisRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/guilds/${guildId}/embed-messages/${embedId}`),
        fetch(`${API_BASE}/api/guilds/${guildId}/channels`),
        fetch(`${API_BASE}/api/guilds/${guildId}/emojis`),
      ]);

      if (messageRes.status === "fulfilled") {
        const messageData = await messageRes.value.json();
        setPremiumStatus(
  messageData?.premiumStatus || {
    hasPremium: false,
    plan: "free",
  }
);
        if (messageData?.success && messageData?.message) {
          const msg = messageData.message;
         const normalizedMessage = {
  ...msg,
  embeds:
    Array.isArray(msg.embeds) && msg.embeds.length > 0
      ? msg.embeds
      : [createDefaultEmbedBlock(0)],
  buttons: Array.isArray(msg.buttons) ? msg.buttons : [],
};

setMessage(normalizedMessage);
setInitialSnapshot(JSON.stringify(normalizedMessage));
        } else {
          setMessage(null);
        }
      } else {
        setMessage(null);
      }

      if (channelsRes.status === "fulfilled") {
        const channelsData = await channelsRes.value.json();
        if (Array.isArray(channelsData)) {
          setChannels(channelsData);
        } else if (
          channelsData?.channels &&
          Array.isArray(channelsData.channels)
        ) {
          setChannels(channelsData.channels);
        } else {
          setChannels([]);
        }
      } else {
        setChannels([]);
      }

      if (emojisRes.status === "fulfilled") {
        const emojiData = await emojisRes.value.json();
        const raw =
          Array.isArray(emojiData)
            ? emojiData
            : Array.isArray(emojiData?.emojis)
              ? emojiData.emojis
              : [];
        setEmojis(raw.map(normalizeEmojiObject).filter(Boolean));
      } else {
        setEmojis([]);
      }
    } catch (error) {
      console.error("[Embed Builder] Failed to load editor:", error);
      setMessage(null);
      setChannels([]);
      setEmojis([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId, embedId]);

  function updateRoot(patch) {
    setMessage((prev) => ({
      ...prev,
      ...patch,
    }));
  }
function toggleEmbedCollapse(blockId) {
  setCollapsedEmbeds((prev) => ({
    ...prev,
    [blockId]: !prev[blockId],
  }));
}
  function updateEmbedBlock(index, patch) {
    setMessage((prev) => {
      const nextEmbeds = [...(prev.embeds || [])];
      nextEmbeds[index] = {
        ...nextEmbeds[index],
        ...patch,
      };
      return { ...prev, embeds: nextEmbeds };
    });
  }

 function addEmbedBlock() {
  const newBlock = createDefaultEmbedBlock((message?.embeds || []).length);

  setMessage((prev) => ({
    ...prev,
    embeds: [...(prev.embeds || []), newBlock],
  }));

  setCollapsedEmbeds((prev) => ({
    ...prev,
    [newBlock.id]: false,
  }));
}

function removeEmbedBlock(index) {
  setMessage((prev) => {
    const current = [...(prev.embeds || [])];
    if (current.length <= 1) return prev;

    const removedBlock = current[index];
    current.splice(index, 1);

    if (removedBlock?.id) {
      setCollapsedEmbeds((prevCollapsed) => {
        const next = { ...prevCollapsed };
        delete next[removedBlock.id];
        return next;
      });
    }

    return { ...prev, embeds: current };
  });
}

  function addField(embedIndex) {
    setMessage((prev) => {
      const nextEmbeds = [...(prev.embeds || [])];
      const currentBlock = { ...nextEmbeds[embedIndex] };
      currentBlock.fields = [
        ...(currentBlock.fields || []),
        {
          id: makeLocalId("field"),
          name: "",
          value: "",
          inline: false,
          order: (currentBlock.fields || []).length,
        },
      ];
      nextEmbeds[embedIndex] = currentBlock;
      return { ...prev, embeds: nextEmbeds };
    });
  }

  function updateField(embedIndex, fieldIndex, patch) {
    setMessage((prev) => {
      const nextEmbeds = [...(prev.embeds || [])];
      const currentBlock = { ...nextEmbeds[embedIndex] };
      const nextFields = [...(currentBlock.fields || [])];
      nextFields[fieldIndex] = { ...nextFields[fieldIndex], ...patch };
      currentBlock.fields = nextFields;
      nextEmbeds[embedIndex] = currentBlock;
      return { ...prev, embeds: nextEmbeds };
    });
  }

  function deleteField(embedIndex, fieldIndex) {
    setMessage((prev) => {
      const nextEmbeds = [...(prev.embeds || [])];
      const currentBlock = { ...nextEmbeds[embedIndex] };
      const nextFields = [...(currentBlock.fields || [])];
      nextFields.splice(fieldIndex, 1);
      currentBlock.fields = nextFields;
      nextEmbeds[embedIndex] = currentBlock;
      return { ...prev, embeds: nextEmbeds };
    });
  }

  async function uploadImageToBlock(embedIndex, key, file) {
    const dataUrl = await readFileAsDataUrl(file);
    updateEmbedBlock(embedIndex, { [key]: dataUrl });
  }

  function addButton() {
    setMessage((prev) => ({
      ...prev,
      buttons: [...(prev.buttons || []), createDefaultButton((prev.buttons || []).length)],
    }));
  }

  function updateButton(index, patch) {
    setMessage((prev) => {
      const nextButtons = [...(prev.buttons || [])];
      nextButtons[index] = { ...nextButtons[index], ...patch };
      return { ...prev, buttons: nextButtons };
    });
  }

  function deleteButton(index) {
    setMessage((prev) => {
      const nextButtons = [...(prev.buttons || [])];
      nextButtons.splice(index, 1);
      return { ...prev, buttons: nextButtons };
    });
  }

  async function saveWithStatus(nextStatus = "draft", mode = "save") {
    if (!message) return false;

    try {
      if (mode === "publish") setPublishing(true);
      else setSaving(true);

      const res = await fetch(
        `${API_BASE}/api/guilds/${guildId}/embed-messages/${embedId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: message.name || "New Embed",
            channelId: message.channelId || "",
            messageContent: message.messageContent || "",
            status: nextStatus,
            embeds: message.embeds || [],
            buttons: message.buttons || [],
          }),
        }
      );

      const data = await res.json();

    if (!data?.success || !data?.message) {
  setGlobalToast?.({
    type: "error",
    message:
      mode === "publish"
        ? "Failed to publish embed ❌"
        : "Failed to save embed ❌",
  });
  return false;
}

    const normalizedSavedMessage = {
  ...data.message,
  embeds:
    Array.isArray(data.message.embeds) && data.message.embeds.length > 0
      ? data.message.embeds
      : [createDefaultEmbedBlock(0)],
  buttons: Array.isArray(data.message.buttons) ? data.message.buttons : [],
};

setMessage(normalizedSavedMessage);
setInitialSnapshot(JSON.stringify(normalizedSavedMessage));

    setGlobalToast?.({
  type: "success",
  message:
    mode === "publish"
      ? "Embed published successfully 🚀"
      : "Embed saved successfully ✨",
});

return true;
    } catch (error) {
      console.error("[Embed Builder] Save failed:", error);
      setGlobalToast?.({
  type: "error",
  message:
    mode === "publish"
      ? "Failed to publish embed ❌"
      : "Failed to save embed ❌",
});
      return false;
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

async function handleSaveDraft() {
  await saveWithStatus("draft", "save");
}

async function handlePublishNew() {
  if (!message?.channelId) {
    setGlobalToast?.({
  type: "error",
  message: "Please select a channel first.",
});
    return;
  }

  try {
    setPublishing(true);

    const res = await fetch(
      `${API_BASE}/api/guilds/${guildId}/embed-messages/${embedId}/publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const rawText = await res.text();

    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Publish returned non-JSON response: ${rawText.slice(0, 200)}`);
    }

    if (!data?.success || !data?.message) {
      setGlobalToast?.({
  type: "error",
  message: data?.error || "Failed to publish embed.",
});
      return;
    }

    const normalizedSavedMessage = {
  ...data.message,
  embeds:
    Array.isArray(data.message.embeds) && data.message.embeds.length > 0
      ? data.message.embeds
      : [createDefaultEmbedBlock(0)],
  buttons: Array.isArray(data.message.buttons) ? data.message.buttons : [],
};

setMessage(normalizedSavedMessage);
setInitialSnapshot(JSON.stringify(normalizedSavedMessage));

    
  } catch (err) {
    console.error("[Embed Builder] Publish editor failed:", err);
    setGlobalToast?.({
  type: "error",
  message: "Failed to publish embed.",
});
  } finally {
    setPublishing(false);
  }
}

async function handleUpdateExisting() {
  if (!message?.messageId) {
    setGlobalToast?.({
  type: "error",
  message: "This embed is not published yet.",
});
    return;
  }

  try {
    setPublishing(true);

    // 1) Save latest local editor changes to DB first
    const saveRes = await fetch(
      `${API_BASE}/api/guilds/${guildId}/embed-messages/${embedId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: message.name || "New Embed",
          channelId: message.channelId || "",
          messageId: message.messageId || "",
          messageContent: message.messageContent || "",
          status: "published",
          embeds: message.embeds || [],
          buttons: message.buttons || [],
        }),
      }
    );

    const saveText = await saveRes.text();

    let saveData = {};
    try {
      saveData = saveText ? JSON.parse(saveText) : {};
    } catch {
      throw new Error(`Save before update returned non-JSON response: ${saveText.slice(0, 200)}`);
    }

    if (!saveData?.success || !saveData?.message) {
      setGlobalToast?.({
  type: "error",
  message:
    saveData?.error || "Failed to save latest changes before update.",
});
      return;
    }

    // 2) Now edit the existing Discord message using updated DB values
    const res = await fetch(
      `${API_BASE}/api/guilds/${guildId}/embed-messages/${embedId}/update-message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const rawText = await res.text();

    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Update returned non-JSON response: ${rawText.slice(0, 200)}`);
    }

    if (!data?.success || !data?.message) {
     setGlobalToast?.({
  type: "error",
  message: data?.error || "Failed to update embed.",
});
      return;
    }

   const normalizedSavedMessage = {
  ...data.message,
  embeds:
    Array.isArray(data.message.embeds) && data.message.embeds.length > 0
      ? data.message.embeds
      : [createDefaultEmbedBlock(0)],
  buttons: Array.isArray(data.message.buttons) ? data.message.buttons : [],
};

setMessage(normalizedSavedMessage);
setInitialSnapshot(JSON.stringify(normalizedSavedMessage));

    
  } catch (err) {
    console.error("[Embed Builder] Update editor failed:", err);
    setGlobalToast?.({
  type: "error",
  message: "Failed to update embed.",
});
  } finally {
    setPublishing(false);
  }
}

  const channelOptions = useMemo(() => {
    return (channels || [])
      .filter((channel) => {
        const type = channel.type;
        return (
          type === 0 ||
          type === "GUILD_TEXT" ||
          type === "text" ||
          type === undefined
        );
      })
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }));
  }, [channels]);

if (loading) {
  return (
    <PageLoader
      title="Loading embed builder..."
      subtitle="Preparing saved embeds, panels, buttons, and message builder settings."
    />
  );
}

  if (!message) {
    return (
      <div
        style={{
          minHeight: "100%",
          padding: 24,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.06)",
            background:
              "linear-gradient(180deg, rgba(20,26,40,0.98), rgba(12,16,27,0.98))",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            Embed not found
          </div>

          <div
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.65)",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            This embed editor link is invalid or the draft no longer exists.
          </div>

          <button
            onClick={() => {
              window.location.hash = "#";
            }}
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(88,101,242,0.28)",
              background:
                "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(59,130,246,0.95))",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Back to Embed Builder
          </button>
        </div>
      </div>
    );
  }

  return (
  <div
      style={{
        minHeight: "100%",
        padding: 24,
background:
  "radial-gradient(circle at top left, rgba(88,101,242,0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(59,130,246,0.06), transparent 30%), #0b1020",
        color: "#fff",
      }}
    >
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <button onClick={goToList} style={iconButtonStyle()}>
              <ArrowLeft size={18} />
            </button>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {embedNameEdit ? (
                  <input
                    value={message.name || ""}
                    onChange={(e) => updateRoot({ name: e.target.value })}
                    onBlur={() => setEmbedNameEdit(false)}
                    autoFocus
                    style={{
                      ...inputStyle(),
                      width: 280,
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {message.name || "New Embed"}
                  </div>
                )}

                <button
                  onClick={() => setEmbedNameEdit((prev) => !prev)}
                  style={iconButtonStyle()}
                >
                  <Pencil size={16} />
                </button>

                <StatusBadge status={message.status || "draft"} />
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "rgba(255,255,255,0.62)",
                  fontSize: 14,
                }}
              >
                Build your embed message layout, media, buttons, and premium visual
                styling from one place.
              </div>
            </div>
          </div>

          <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  }}
>
  <button
    onClick={goToList}
    style={{
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Discard
  </button>

  <button
    onClick={handleSaveDraft}
    disabled={saving || publishing}
    style={{
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(88,101,242,0.18)",
  background:
    "linear-gradient(135deg, rgba(88,101,242,0.10), rgba(59,130,246,0.06))",
  color: "#fff",
  fontWeight: 800,
  cursor: saving || publishing ? "not-allowed" : "pointer",
  opacity: saving || publishing ? 0.75 : 1,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 8px 24px rgba(88,101,242,0.12)",
  transition: "all 0.18s ease",
}}
  >
    <Save size={16} />
   {saving ? "Saving..." : message?.status === "published" ? "Save Settings" : "Save Draft"}
  </button>

  <button
    onClick={handlePublishNew}
    disabled={saving || publishing}
   style={{
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(88,101,242,0.28)",
  background:
    "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(59,130,246,0.95))",
  color: "#fff",
  fontWeight: 800,
  cursor: saving || publishing ? "not-allowed" : "pointer",
  opacity: saving || publishing ? 0.75 : 1,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 14px 35px rgba(88,101,242,0.32)",
  transition: "all 0.18s ease",
}}
  >
    <Send size={16} />
    {publishing ? "Publishing..." : "Publish New"}
  </button>

  <button
  onClick={handleUpdateExisting}
  disabled={saving || publishing || !message?.messageId}
  style={{
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: message?.messageId
      ? "rgba(255,255,255,0.06)"
      : "rgba(255,255,255,0.03)",
    color: "#fff",
    fontWeight: 800,
    cursor: saving || publishing || !message?.messageId ? "not-allowed" : "pointer",
    opacity: saving || publishing || !message?.messageId ? 0.55 : 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s ease",
  }}
>
  <Send size={16} />
  {publishing ? "Updating..." : "Update Existing"}
</button>
</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, 0.92fr)",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <div style={sectionCardStyle()}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 18,
                  marginBottom: 14,
                }}
              >
                Basic settings
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <label style={labelStyle()}>Channel</label>
                  <SelectDropdown
                    options={channelOptions}
                    value={message.channelId || ""}
                    onChange={(nextValue) => updateRoot({ channelId: nextValue })}
                    placeholder="Select a channel"
                    searchable
                    searchPlaceholder="Search channels..."
                    getKey={(opt) => opt.id}
                    getLabel={(opt) => opt.name}
                    renderValue={(opt) => (
                      <>
                        <Hash size={15} color="rgba(255,255,255,0.55)" />
                        <span>{opt.name}</span>
                      </>
                    )}
                  />
                </div>

                <div>
                  <label style={labelStyle()}>Embed message name</label>
                  <input
                    value={message.name || ""}
                    onChange={(e) => updateRoot({ name: e.target.value })}
                    placeholder="New Embed"
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle()}>Message content</label>
                <textarea
                  value={message.messageContent || ""}
                  onChange={(e) => updateRoot({ messageContent: e.target.value })}
                  placeholder="Optional message shown above the embeds..."
                  rows={4}
                  style={{
                    ...textareaStyle(),
                    minHeight: 110,
                  }}
                />
              </div>
            </div>

          {(message.embeds || []).map((block, index) => (
  <EmbedBlockEditor
    key={block.id || index}
    block={block}
    index={index}
    isPremium={isPremium}
    isCollapsed={Boolean(collapsedEmbeds[block.id])}
    onToggleCollapse={() => toggleEmbedCollapse(block.id)}
    onUpdate={(patch) => updateEmbedBlock(index, patch)}
    onDelete={() => removeEmbedBlock(index)}
    onAddField={() => addField(index)}
    onUpdateField={(fieldIndex, patch) =>
      updateField(index, fieldIndex, patch)
    }
    onDeleteField={(fieldIndex) => deleteField(index, fieldIndex)}
    onUploadImage={(key, file) => uploadImageToBlock(index, key, file)}
  />
))}

            <button
              type="button"
              onClick={addEmbedBlock}
              style={{
                padding: "15px 16px",
                borderRadius: 16,
                border: "1px solid rgba(88,101,242,0.24)",
                background: "rgba(88,101,242,0.1)",
                color: "#dbe4ff",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <Plus size={18} />
              Add Embed
            </button>

            <div style={sectionCardStyle()}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 18,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Link2 size={18} />
                Link Buttons
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {(message.buttons || []).map((btn, index) => (
                  <div
                    key={btn.id || index}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.025)",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <div>
                        <label style={labelStyle()}>Button label</label>
                        <input
                          value={btn.label || ""}
                          onChange={(e) =>
                            updateButton(index, { label: e.target.value })
                          }
                          placeholder="Button label"
                          style={inputStyle()}
                        />
                      </div>

                      <div>
                        <label style={labelStyle()}>Button URL</label>
                        <input
                          value={btn.url || ""}
                          onChange={(e) =>
                            updateButton(index, { url: e.target.value })
                          }
                          placeholder="https://..."
                          style={inputStyle()}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <EmojiSelector
                        value={btn.emoji || ""}
                        onChange={(nextValue) =>
                          updateButton(index, { emoji: nextValue })
                        }
                        emojiOptions={emojis}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => deleteButton(index)}
                        style={{
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(239,68,68,0.18)",
                          background: "rgba(127,29,29,0.18)",
                          color: "#fca5a5",
                          fontWeight: 700,
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                      >
                        Delete Button
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addButton}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(88,101,242,0.24)",
                    background: "rgba(88,101,242,0.1)",
                    color: "#dbe4ff",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  <Plus size={16} />
                  Add link button
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              ...sectionCardStyle(),
              alignSelf: "start",
              position: "sticky",
              top: 18,
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Eye size={18} />
              Live Preview
            </div>

            <DiscordPreview message={message} />

            
          </div>
                {hasChanges ? (
        <div
      style={{
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 999999,
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 18px",
  borderRadius: 18,
  background:
    "linear-gradient(180deg, rgba(15,18,30,0.96), rgba(10,14,24,0.98))",
  border: "1px solid rgba(88,101,242,0.26)",
  boxShadow:
    "0 18px 55px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.03) inset",
  backdropFilter: "blur(12px)",
  transition: "all 0.22s ease",
}}
        >
 <span
  style={{
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.01em",
  }}
>
  You have unsaved changes
</span>

         <button
  type="button"
  onClick={() => {
    try {
      if (initialSnapshot) {
        setMessage(JSON.parse(initialSnapshot));
      }
    } catch (e) {
      console.error("Failed to restore snapshot:", e);
    }
  }}
  style={{
  padding: "9px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  pointerEvents: "auto",
  transition: "all 0.18s ease",
}}
>
  Cancel
</button>

        <button
  type="button"
  onClick={handleSaveDraft}
style={{
  padding: "9px 16px",
  borderRadius: 12,
  border: "1px solid rgba(88,101,242,0.25)",
  background:
    "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(59,130,246,0.95))",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  pointerEvents: "auto",
  boxShadow: "0 10px 24px rgba(88,101,242,0.28)",
  transition: "all 0.18s ease",
}}
>
  {saving ? "Saving..." : "Save Changes"}
</button>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}

function EmbedListView({ selectedGuild, setGlobalToast }) {
  const guildId = selectedGuild?.id;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadMessages() {
    if (!guildId) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/embed-messages`);
      const data = await res.json();

      if (data?.success) {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, [guildId]);

  const filteredMessages = useMemo(() => {
  const term = search.trim().toLowerCase();
  if (!term) return messages;

  return messages.filter((item) => {
    const haystack = [
      item.name || "",
      item.status || "",
      item.channelName || "",
      item.channelId ? "selected channel" : "",
      item.usesPremium ? "premium yes" : "premium no",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}, [messages, search]);

  async function handleCreateNew() {
    if (!guildId || creating) return;

    try {
      setCreating(true);

      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/embed-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Embed",
          channelId: "",
          messageContent: "",
          embeds: [],
          buttons: [],
        }),
      });

      const data = await res.json();

      if (!data?.success || !data?.message) {
        setGlobalToast?.({
  type: "error",
  message: "Failed to create embed message.",
});
        return;
      }

      setMessages((prev) => [data.message, ...prev]);
      goToEditor(guildId, data.message.embedId);
    } catch {
      setGlobalToast?.({
  type: "error",
  message: "Failed to create embed message.",
});
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(item) {
    if (!guildId || !item?.embedId) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/guilds/${guildId}/embed-messages/${item.embedId}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const data = await res.json();

      if (!data?.success || !data?.message) {
        setGlobalToast?.({
  type: "error",
  message: "Failed to duplicate embed message.",
});
        return;
      }

      setMessages((prev) => [data.message, ...prev]);
    } catch {
      setGlobalToast?.({
  type: "error",
  message: "Failed to duplicate embed message.",
});
    }
  }

  function handleDelete(item) {
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    if (!guildId || !deleteTarget?.embedId) return;

    try {
      setDeleting(true);

      const res = await fetch(
        `${API_BASE}/api/guilds/${guildId}/embed-messages/${deleteTarget.embedId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!data?.success) {
        setGlobalToast?.({
  type: "error",
  message: "Failed to delete embed message.",
});
        return;
      }

      setMessages((prev) =>
        prev.filter((item) => item.embedId !== deleteTarget.embedId)
      );
      setDeleteTarget(null);
    } catch {
      setGlobalToast?.({
  type: "error",
  message: "Failed to delete embed message.",
});
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(item) {
    if (!guildId || !item?.embedId) return;
    goToEditor(guildId, item.embedId);
  }
async function handlePublishFromList(item) {
  if (!guildId || !item?.embedId) return;

  try {
    const publishUrl = `${API_BASE}/api/guilds/${guildId}/embed-messages/${item.embedId}/publish`;


    const res = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });


    const rawText = await res.text();

    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Publish returned non-JSON response: ${rawText.slice(0, 200)}`);
    }

    if (!data?.success || !data?.message) {
      alert(data?.error || "Failed to publish embed.");
      return;
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.embedId === item.embedId ? data.message : msg
      )
    );

    
  } catch (error) {
    console.error("[Embed Builder] Publish from list failed:", error);
    alert("Failed to publish embed.");
  }
}

async function handleUpdateFromList(item) {
  if (!guildId || !item?.embedId) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/guilds/${guildId}/embed-messages/${item.embedId}/update-message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await res.json();

    if (!data?.success || !data?.message) {
      alert(data?.error || "Failed to update embed.");
      return;
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.embedId === item.embedId ? data.message : msg
      )
    );

    
  } catch (error) {
    console.error("[Embed Builder] Update from list failed:", error);
    alert("Failed to update embed.");
  }
}
  return (
    <>
      <div
        style={{
          minHeight: "100%",
          padding: "24px",
          background:
            "radial-gradient(circle at top left, rgba(88,101,242,0.08), transparent 28%), #0b1020",
          color: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.06)",
              background:
                "linear-gradient(180deg, rgba(24,30,46,0.98), rgba(16,20,34,0.98))",
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "#fff",
                  }}
                >
                  Design Your Embeds
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "rgba(255,255,255,0.68)",
                    fontSize: 15,
                    maxWidth: 760,
                    lineHeight: 1.7,
                  }}
                >
                  Create beautiful embed messages for rules, announcements, link
                  panels, and premium visual posts.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: "rgba(88,101,242,0.1)",
                  border: "1px solid rgba(88,101,242,0.22)",
                  color: "#dbe4ff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Active
                <div
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #5865F2, #3b82f6)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 26,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              <button
                onClick={handleCreateNew}
                disabled={creating}
                style={{
                  width: "100%",
                  minHeight: 78,
                  borderRadius: 20,
                  border: "1px solid rgba(88,101,242,0.35)",
                  background:
                    "linear-gradient(180deg, rgba(14,18,31,1), rgba(11,14,25,1))",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 22px",
                  cursor: creating ? "not-allowed" : "pointer",
                  opacity: creating ? 0.8 : 1,
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    {creating ? "Creating..." : "New embed message"}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 13,
                    }}
                  >
                    Start a new visual message draft
                  </div>
                </div>

                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(88,101,242,0.12)",
                    border: "1px solid rgba(88,101,242,0.28)",
                  }}
                >
                  <Plus size={20} color="#9fb0ff" />
                </div>
              </button>

              <div
                style={{
                  minHeight: 78,
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 16px",
                  gap: 12,
                }}
              >
                <Search size={18} color="rgba(255,255,255,0.5)" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search embed messages..."
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#fff",
                    fontSize: 14,
                  }}
                />
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.72)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {messages.length === 0 ? "0 messages" : `${filteredMessages.length} / ${messages.length}`}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(12,16,28,0.9)",
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 18,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 22,
                    color: "#fff",
                  }}
                >
                  Your embed messages
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                  }}
                >
                  Saved drafts and published visual messages
                </div>
              </div>

              {loading ? (
                <div
                  style={{
                    padding: "36px 10px",
                    color: "rgba(255,255,255,0.68)",
                    fontSize: 14,
                  }}
                >
                  Loading embed messages...
                </div>
              ) : filteredMessages.length === 0 ? (
                <EmptyState onCreate={handleCreateNew} creating={creating} />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 16,
                  }}
                >
 {filteredMessages.map((item) => (
  <EmbedCard
    key={item.embedId}
    item={item}
    searchTerm={search}
    onEdit={handleEdit}
    onDuplicate={handleDuplicate}
    onDelete={handleDelete}
    onPublish={handlePublishFromList}
    onUpdate={handleUpdateFromList}
  />
))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        itemName={deleteTarget?.name}
        deleting={deleting}
        onCancel={() => {
          if (deleting) return;
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default function EmbedBuilderPage({ selectedGuild, setGlobalToast }) {
  const [hash, setHash] = useState(window.location.hash || "");

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash || "");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const hashState = parseEditorHash();

  if (
    hashState &&
    selectedGuild?.id &&
    hashState.guildId === selectedGuild.id &&
    hashState.embedId
  ) {
 return (
  <EmbedEditorView
    guildId={hashState.guildId}
    embedId={hashState.embedId}
    setGlobalToast={setGlobalToast}
  />
);
  }

  return (
  <EmbedListView
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
    key={hash}
  />
);
}