import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import PageLoader from "../components/PageLoader";
import {
  Gift,
  Plus,
  Search,
  Trash2,
  Send,
  Trophy,
  Clock,
  Users,
  Image as ImageIcon,
  Hash,
  Check,
  ChevronDown,
  FileText,
  ArrowLeft,
  Save,
  Shield,
  Copy,
  Pencil,
  Megaphone,
} from "lucide-react";

import API_BASE from "../config/api";

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#fff",
    outline: "none",
    padding: "12px 14px",
    fontSize: 14,
    boxSizing: "border-box",
    transition: "all 0.18s ease",
  };
}

function textareaStyle() {
  return {
    ...inputStyle(),
    resize: "vertical",
    minHeight: 110,
    lineHeight: 1.6,
  };
}

function sectionCard() {
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
    transition: "all 0.18s ease",
  };
}

function formatDate(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not set";
  }
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

function parseEditorHash() {
  const raw = window.location.hash || "";
  const match = raw.match(/^#\/giveaways\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return {
    guildId: decodeURIComponent(match[1]),
    giveawayId: decodeURIComponent(match[2]),
  };
}

function goToGiveawayEditor(guildId, giveawayId) {
  window.location.hash = `#/giveaways/${guildId}/${giveawayId}`;
}

function goToGiveawayList() {
  window.location.hash = "#/giveaways";
}

function isHttpUrl(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  );
}

function isDataImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function makeEmptyGiveawayDraft() {
  return {
    id: "",
    name: "New Giveaway",
    prize: "",
    description: "",
    winners: 1,
    duration: "1h",
    channelId: "",
    channelName: "",
    bannerUrl: "",
    requiredRoleMode: "none",
    requiredRoleId: "",
    winnerAnnouncementChannelId: "",
    winnerAnnouncementChannelName: "",
    winnerMessage:
      "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.",
    winnerBannerUrl: "",
    ended: false,
    createdAt: null,
    endAt: null,
    messageId: null,
  };
}

function normalizeGiveawayToForm(giveawayItem, giveawayId) {
  return {
    id: giveawayItem?.id || giveawayId || "",
    name: giveawayItem?.name || "New Giveaway",
    prize: giveawayItem?.prize || "",
    description: giveawayItem?.description || "",
    winners: giveawayItem?.winnerCount || giveawayItem?.winners || 1,
    duration: giveawayItem?.duration || "1h",
    channelId: giveawayItem?.channelId || "",
    channelName: giveawayItem?.channelName || "",
    bannerUrl: giveawayItem?.bannerUrl || "",
    requiredRoleMode: giveawayItem?.requiredRoleMode || "none",
    requiredRoleId: giveawayItem?.requiredRoleId || "",
    winnerAnnouncementChannelId:
      giveawayItem?.winnerAnnouncementChannelId || "",
    winnerAnnouncementChannelName:
      giveawayItem?.winnerAnnouncementChannelName || "",
    winnerMessage:
      giveawayItem?.winnerMessage ||
      "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.",
    winnerBannerUrl: giveawayItem?.winnerBannerUrl || "",
    ended: Boolean(giveawayItem?.ended),
    createdAt: giveawayItem?.createdAt || null,
    endAt: giveawayItem?.endAt || null,
    messageId: giveawayItem?.messageId || null,
  };
}

function getBannerValidationError(form) {
  if (form.bannerUrl && isDataImage(form.bannerUrl)) {
    return "Giveaway banner must be a direct image URL. Device uploads are temporarily disabled because Discord attachment banners break after button interactions.";
  }

  if (form.winnerBannerUrl && isDataImage(form.winnerBannerUrl)) {
    return "Winner announcement banner must be a direct image URL. Device uploads are temporarily disabled for stable publishing.";
  }

  return "";
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
          <Gift size={34} color="#8ea1ff" />
        </div>

        <h2
          style={{
            margin: 0,
            color: "#fff",
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          Build premium Discord giveaways
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
          Create multiple giveaways, manage restrictions, banners, winner
          announcements, and participation rules from one serious dashboard.
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
          {creating ? "Creating..." : "Create New Giveaway"}
        </button>
      </div>
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

                    {isSelected ? <Check size={15} color="#9fb0ff" /> : null}
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

function ImageInput({
  label,
  value,
  onChange,
  helperText,
  disabled = false,
  lockedMessage = "This banner requires Kyro Premium.",
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={labelStyle()}>{label}</label>

     <input
  value={value || ""}
  disabled={disabled}
  onChange={(e) => {
    if (disabled) return;
    onChange(e.target.value);
  }}
  placeholder={disabled ? lockedMessage : "Paste direct image URL..."}
  style={{
    ...inputStyle(),
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "text",
  }}
/>

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            width: "fit-content",
            padding: "11px 14px",
            borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.2)",
            background: "rgba(127,29,29,0.18)",
            color: "#fca5a5",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Remove banner
        </button>
      ) : null}

      {helperText ? <div style={helperTextStyle()}>{helperText}</div> : null}

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

function GiveawayCard({ giveaway, onEdit, onDuplicate, onEnd, onDelete }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: giveaway.ended
          ? "1px solid rgba(239,68,68,0.18)"
          : "1px solid rgba(88,101,242,0.18)",
        background:
          "linear-gradient(180deg, rgba(18,23,37,0.98), rgba(10,14,24,0.98))",
        padding: 18,
        boxShadow: giveaway.ended
          ? "0 12px 28px rgba(127,29,29,0.12)"
          : "0 12px 28px rgba(0,0,0,0.18)",
        overflow: "hidden",
        transition: "all 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = giveaway.ended
          ? "0 18px 40px rgba(127,29,29,0.18)"
          : "0 18px 40px rgba(88,101,242,0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = giveaway.ended
          ? "0 12px 28px rgba(127,29,29,0.12)"
          : "0 12px 28px rgba(0,0,0,0.18)";
      }}
    >
      {giveaway.bannerUrl ? (
        <div
          style={{
            marginBottom: 14,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <img
            src={giveaway.bannerUrl}
            alt={giveaway.prize || "Giveaway banner"}
            style={{
              width: "100%",
              height: 150,
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {giveaway.prize || "Untitled Giveaway"}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                background: giveaway.ended
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(34,197,94,0.12)",
                border: giveaway.ended
                  ? "1px solid rgba(239,68,68,0.18)"
                  : "1px solid rgba(34,197,94,0.18)",
                color: giveaway.ended ? "#fca5a5" : "#86efac",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {giveaway.ended ? "Ended" : "Active"}
            </span>

            <StatusBadge
              status={giveaway.messageId ? "published" : "draft"}
            />
          </div>
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(88,101,242,0.12)",
            border: "1px solid rgba(88,101,242,0.18)",
            flexShrink: 0,
          }}
        >
          <Trophy size={20} color="#9fb0ff" />
        </div>
      </div>

      {giveaway.description ? (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.025)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {giveaway.description}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 10,
          color: "rgba(255,255,255,0.72)",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={15} color="rgba(255,255,255,0.52)" />
          Winners: {giveaway.winnerCount ?? 1}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} color="rgba(255,255,255,0.52)" />
          Ends: {formatDate(giveaway.endAt)}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <ActionButton
          icon={<Pencil size={15} />}
          label="Edit"
          onClick={() => onEdit(giveaway)}
        />
        <ActionButton
          icon={<Copy size={15} />}
          label="Duplicate"
          onClick={() => onDuplicate(giveaway)}
        />
        {!giveaway.ended && (
          <ActionButton
            icon={<Send size={15} />}
            label="End"
            onClick={() => onEnd(giveaway.id)}
          />
        )}
        <ActionButton
          icon={<Trash2 size={15} />}
          label="Delete"
          danger
          onClick={() => onDelete(giveaway.id)}
        />
      </div>
    </div>
  );
}

function GiveawayListView({ selectedGuild, setGlobalToast, currentUser }) {
  const guildId = selectedGuild?.id;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [giveaways, setGiveaways] = useState([]);
  const [search, setSearch] = useState("");
  const [channels, setChannels] = useState([]);

  async function loadChannels() {
    if (!guildId) return;

    try {
      const res = await axios.get(`${API_BASE}/api/guilds/${guildId}/channels`);
      const raw = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.channels)
        ? res.data.channels
        : [];

      const textChannels = raw
        .filter((channel) => {
          const type = channel.type;
          return (
            type === 0 ||
            type === "GUILD_TEXT" ||
            type === "text" ||
            type === 5 ||
            type === "GUILD_ANNOUNCEMENT"
          );
        })
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
        }));

      setChannels(textChannels);
    } catch (err) {
      console.error("Failed to load channels:", err);
      setChannels([]);
    }
  }

  async function loadGiveaways() {
    if (!guildId) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/guilds/${guildId}/giveaways`);

      if (res.data?.success) {
        setGiveaways(res.data.giveaways || []);
      } else {
        setGiveaways([]);
      }
    } catch (err) {
      console.error("Failed to load giveaways:", err);
      setGiveaways([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGiveaways();
    loadChannels();
  }, [guildId]);

  const filteredGiveaways = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return giveaways;

    return giveaways.filter((g) => {
      const haystack = `${g.prize || ""} ${g.description || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [giveaways, search]);

  async function handleCreateNew() {
    if (!guildId || creating) return;

    try {
      setCreating(true);

      if (!channels.length) {
        setGlobalToast?.({
          type: "error",
          message: "No text channels found for this server.",
        });
        return;
      }

      const firstChannel = channels?.[0];

      const res = await axios.post(`${API_BASE}/api/guilds/${guildId}/giveaways`, {
        name: "New Giveaway",
        prize: "New Giveaway",
        description: "",
        winners: 1,
        duration: "1h",
        channelId: firstChannel?.id || "",
        bannerUrl: "",
        requiredRoleMode: "none",
        requiredRoleId: "",
        winnerAnnouncementChannelId: firstChannel?.id || "",
        winnerBannerUrl: "",
        winnerMessage:
          "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.",
        hostId: currentUser?.id || null,
      });

      if (!res.data?.success || !res.data?.giveaway) {
        setGlobalToast?.({
          type: "error",
          message: "Failed to create giveaway.",
        });
        return;
      }

      goToGiveawayEditor(guildId, res.data.giveaway.id);
    } catch (error) {
      console.error(error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to create giveaway.",
      });
    } finally {
      setCreating(false);
    }
  }

  function handleEdit(item) {
    if (!guildId || !item?.id) return;
    goToGiveawayEditor(guildId, item.id);
  }

  async function handleDuplicate(item) {
    if (!guildId || !item?.id) return;

    try {
      const payload = {
        name: item.name ? `${item.name} Copy` : "New Giveaway Copy",
        prize: item.prize || "New Giveaway",
        description: item.description || "",
        winners: item.winnerCount || 1,
        duration: "1h",
        channelId: item.channelId || channels?.[0]?.id || "",
        bannerUrl: item.bannerUrl || "",
        requiredRoleMode: item.requiredRoleMode || "none",
        requiredRoleId: item.requiredRoleId || "",
        winnerAnnouncementChannelId:
          item.winnerAnnouncementChannelId || item.channelId || "",
        winnerBannerUrl: item.winnerBannerUrl || "",
        winnerMessage:
          item.winnerMessage ||
          "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.",
        hostId: currentUser?.id || null,
      };

      const res = await axios.post(
        `${API_BASE}/api/guilds/${guildId}/giveaways`,
        payload
      );

      if (res.data?.success && res.data?.giveaway) {
        setGiveaways((prev) => [res.data.giveaway, ...prev]);
        setGlobalToast?.({
          type: "success",
          message: "Giveaway duplicated ✨",
        });
      } else {
        setGlobalToast?.({
          type: "error",
          message: "Failed to duplicate giveaway.",
        });
      }
    } catch (error) {
      console.error(error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to duplicate giveaway.",
      });
    }
  }

  async function handleEnd(giveawayId) {
    try {
      const res = await axios.post(
        `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}/end`
      );

      if (res.data?.success) {
        setGiveaways((prev) =>
          prev.map((g) => (g.id === giveawayId ? { ...g, ended: true } : g))
        );

        setGlobalToast?.({
          type: "success",
          message: "Giveaway ended 🏁",
        });
      } else {
        setGlobalToast?.({
          type: "error",
          message: "Failed to end giveaway.",
        });
      }
    } catch (err) {
      console.error(err);
      setGlobalToast?.({
        type: "error",
        message: "Failed to end giveaway.",
      });
    }
  }

  async function handleDelete(giveawayId) {
    try {
      await axios.delete(
        `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}`
      );

      setGiveaways((prev) => prev.filter((g) => g.id !== giveawayId));

      setGlobalToast?.({
        type: "success",
        message: "Giveaway deleted 🗑️",
      });
    } catch (err) {
      console.error(err);
      setGlobalToast?.({
        type: "error",
        message: "Failed to delete giveaway.",
      });
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
                  Design Your Giveaways
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
                  Create beautiful giveaway drafts, set restrictions, banners,
                  winner announcements, and manage multiple server giveaways
                  from one premium page.
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
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (creating) return;
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 18px 38px rgba(88,101,242,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    {creating ? "Creating..." : "New giveaway"}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 13,
                    }}
                  >
                    Start a new giveaway draft
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
                  placeholder="Search giveaways..."
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
                  {giveaways.length === 0
                    ? "0 giveaways"
                    : `${filteredGiveaways.length} / ${giveaways.length}`}
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
                  Your giveaways
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                  }}
                >
                  Saved drafts and active/ended giveaways
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
                  Loading giveaways...
                </div>
              ) : filteredGiveaways.length === 0 ? (
                <EmptyState onCreate={handleCreateNew} creating={creating} />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 16,
                  }}
                >
                  {filteredGiveaways.map((item) => (
                    <GiveawayCard
                      key={item.id}
                      giveaway={item}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onEnd={handleEnd}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RoleModeSelector({ form, setForm, roles }) {
  const roleOptions = Array.isArray(roles) ? roles : [];

  const radioRow = (mode, label) => (
    <button
      type="button"
      onClick={() =>
        setForm((prev) => ({
          ...prev,
          requiredRoleMode: mode,
          requiredRoleId: mode === "none" ? "" : prev.requiredRoleId,
        }))
      }
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border:
          form.requiredRoleMode === mode
            ? "1px solid rgba(88,101,242,0.28)"
            : "1px solid rgba(255,255,255,0.08)",
        background:
          form.requiredRoleMode === mode
            ? "rgba(88,101,242,0.10)"
            : "rgba(255,255,255,0.03)",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        transition: "all 0.18s ease",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border:
            form.requiredRoleMode === mode
              ? "5px solid #60a5fa"
              : "2px solid rgba(255,255,255,0.28)",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
    </button>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle()}>Roles allowed to participate</label>

      <div style={{ display: "grid", gap: 10 }}>
        {radioRow("none", "Everyone can participate")}
        {radioRow("deny_except", "Deny for all roles except")}
        {radioRow("allow_except", "Allow for all roles except")}
      </div>

      {form.requiredRoleMode !== "none" ? (
        <div style={{ marginTop: 2 }}>
          <SelectDropdown
            options={roleOptions}
            value={form.requiredRoleId || ""}
            onChange={(nextValue) =>
              setForm((prev) => ({ ...prev, requiredRoleId: nextValue }))
            }
            placeholder="Select a role"
            searchable
            searchPlaceholder="Search roles..."
            getKey={(opt) => opt.id}
            getLabel={(opt) => opt.name}
            renderValue={(opt) => (
              <>
                <Shield size={15} color="rgba(255,255,255,0.55)" />
                <span>{opt.name}</span>
              </>
            )}
          />
        </div>
      ) : null}

      <div style={helperTextStyle()}>
        Choose whether everyone can join, or restrict participation using a
        specific role mode.
      </div>
    </div>
  );
}
function GiveawayEditorView({
  selectedGuild,
  setGlobalToast,
  giveawayId,
  currentUser,
}) {
  const guildId = selectedGuild?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(makeEmptyGiveawayDraft());
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [nameEdit, setNameEdit] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState({
  hasPremium: false,
  plan: "free",
});

const isPremium = Boolean(
  premiumStatus?.hasPremium || premiumStatus?.plan === "lifetime"
);

  const hasChanges = JSON.stringify(form) !== initialSnapshot;

  async function loadGiveaway() {
    if (!guildId || !giveawayId) return;

    try {
      setLoading(true);

      const [giveawaysRes, channelsRes, rolesRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/guilds/${guildId}/giveaways`),
        axios.get(`${API_BASE}/api/guilds/${guildId}/channels`),
        axios.get(`${API_BASE}/api/guilds/${guildId}/roles`),
      ]);

if (giveawaysRes.status === "fulfilled") {
  setPremiumStatus(
    giveawaysRes.value.data?.premiumStatus || {
      hasPremium: false,
      plan: "free",
    }
  );
}
      let giveawayItem = null;
      let textChannels = [];

      if (channelsRes.status === "fulfilled") {
        const raw = Array.isArray(channelsRes.value.data)
          ? channelsRes.value.data
          : Array.isArray(channelsRes.value.data?.channels)
          ? channelsRes.value.data.channels
          : [];

        textChannels = raw
          .filter((channel) => {
            const type = channel.type;
            return (
              type === 0 ||
              type === "GUILD_TEXT" ||
              type === "text" ||
              type === 5 ||
              type === "GUILD_ANNOUNCEMENT"
            );
          })
          .map((channel) => ({
            id: channel.id,
            name: channel.name,
          }));

        setChannels(textChannels);
      } else {
        setChannels([]);
      }

      if (giveawaysRes.status === "fulfilled") {
        const list = giveawaysRes.value.data?.giveaways || [];
        giveawayItem =
          list.find((g) => String(g.id) === String(giveawayId)) || null;
      }

      if (rolesRes.status === "fulfilled") {
        const raw = Array.isArray(rolesRes.value.data)
          ? rolesRes.value.data
          : Array.isArray(rolesRes.value.data?.roles)
          ? rolesRes.value.data.roles
          : [];

        const safeRoles = raw
          .filter((role) => role.name !== "@everyone")
          .map((role) => ({
            id: role.id,
            name: role.name,
          }));

        setRoles(safeRoles);
      } else {
        setRoles([]);
      }

      const normalized = normalizeGiveawayToForm(giveawayItem, giveawayId);

      if (!normalized.winnerAnnouncementChannelId && normalized.channelId) {
        normalized.winnerAnnouncementChannelId = normalized.channelId;
      }

      if (!normalized.winnerAnnouncementChannelName) {
        const foundWinnerChannel = textChannels.find(
          (channel) =>
            String(channel.id) === String(normalized.winnerAnnouncementChannelId)
        );
        normalized.winnerAnnouncementChannelName = foundWinnerChannel?.name || "";
      }

      if (!normalized.channelName) {
        const foundMainChannel = textChannels.find(
          (channel) => String(channel.id) === String(normalized.channelId)
        );
        normalized.channelName = foundMainChannel?.name || "";
      }

      setForm(normalized);
      setInitialSnapshot(JSON.stringify(normalized));
    } catch (error) {
      console.error("[Giveaways] Failed to load editor:", error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to load giveaway editor.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGiveaway();
  }, [guildId, giveawayId]);

  async function handleBannerUpload() {
    setGlobalToast?.({
      type: "error",
      message:
        "For giveaway stability, use a direct image URL for banners right now. Device uploads are temporarily disabled because Discord attachment banners break after button interactions.",
    });
  }

  async function handleWinnerBannerUpload() {
    setGlobalToast?.({
      type: "error",
      message:
        "For stable winner announcements, use a direct image URL for the winner banner right now.",
    });
  }

  function buildSavePayload() {
    return {
      name: form.name || "New Giveaway",
      prize: form.prize,
      description: form.description || null,
      winners: Number(form.winners) || 1,
      duration: form.duration,
      channelId: form.channelId,
      bannerUrl: isPremium ? form.bannerUrl || null : null,
      requiredRoleMode: form.requiredRoleMode || "none",
      requiredRoleId:
        form.requiredRoleMode !== "none" ? form.requiredRoleId || null : null,
      winnerAnnouncementChannelId:
        form.winnerAnnouncementChannelId || form.channelId || null,
     winnerBannerUrl: isPremium ? form.winnerBannerUrl || null : null,
      winnerMessage:
        form.winnerMessage?.trim() ||
        "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}.",
      hostId: currentUser?.id || null,
    };
  }

  async function handleSave() {
    if (!form.prize.trim()) {
      setGlobalToast?.({
        type: "error",
        message: "Enter giveaway prize.",
      });
      return;
    }

    if (!form.channelId) {
      setGlobalToast?.({
        type: "error",
        message: "Select a channel first.",
      });
      return;
    }

    const bannerError = getBannerValidationError(form);
    if (bannerError) {
      setGlobalToast?.({
        type: "error",
        message: bannerError,
      });
      return;
    }

    try {
      setSaving(true);

      const res = await axios.put(
        `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}`,
        buildSavePayload()
      );

      if (!res.data?.success || !res.data?.giveaway) {
        setGlobalToast?.({
          type: "error",
          message: "Failed to save giveaway.",
        });
        return;
      }

      const saved = normalizeGiveawayToForm(res.data.giveaway, giveawayId);
      setForm(saved);
      setInitialSnapshot(JSON.stringify(saved));

      setGlobalToast?.({
        type: "success",
        message: "Giveaway saved ✨",
      });
    } catch (error) {
      console.error(error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to save giveaway.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
  if (!form.prize.trim()) {
    setGlobalToast?.({
      type: "error",
      message: "Enter giveaway prize.",
    });
    return;
  }

  if (!form.channelId) {
    setGlobalToast?.({
      type: "error",
      message: "Select a channel first.",
    });
    return;
  }

  const bannerError = getBannerValidationError(form);
  if (bannerError) {
    setGlobalToast?.({
      type: "error",
      message: bannerError,
    });
    return;
  }

  try {
    setPublishing(true);

    const saveRes = await axios.put(
      `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}`,
      buildSavePayload()
    );

    if (!saveRes.data?.success) {
      setGlobalToast?.({
        type: "error",
        message: "Failed to save giveaway before publishing.",
      });
      return;
    }

    let actionUrl = `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}/publish`;
    let successMessage = "Giveaway published 🚀";

    if (form.ended) {
      actionUrl = `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}/republish`;
      successMessage = "Giveaway republished 🔁";
    } else if (form.messageId) {
      actionUrl = `${API_BASE}/api/guilds/${guildId}/giveaways/${giveawayId}/update-message`;
      successMessage = "Giveaway updated ✨";
    }

    const publishRes = await axios.post(actionUrl);

    if (!publishRes.data?.success || !publishRes.data?.giveaway) {
      setGlobalToast?.({
        type: "error",
        message: publishRes.data?.error || "Giveaway action failed.",
      });
      return;
    }

    const saved = normalizeGiveawayToForm(
      publishRes.data.giveaway,
      giveawayId
    );

    setForm(saved);
    setInitialSnapshot(JSON.stringify(saved));

    setGlobalToast?.({
      type: "success",
      message: successMessage,
    });
  } catch (error) {
    console.error(error);
    setGlobalToast?.({
      type: "error",
      message: error?.response?.data?.error || "Failed to process giveaway.",
    });
  } finally {
    setPublishing(false);
  }
}

if (loading) {
  return (
    <PageLoader
      title="Loading giveaways..."
      subtitle="Preparing giveaway panels, rewards, schedules, and announcement settings."
    />
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
            <button onClick={goToGiveawayList} style={iconButtonStyle()}>
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
                {nameEdit ? (
                  <input
                    value={form.name || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    onBlur={() => setNameEdit(false)}
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
                    {form.name || "New Giveaway"}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setNameEdit((prev) => !prev)}
                  style={iconButtonStyle()}
                >
                  <Pencil size={16} />
                </button>

                <StatusBadge status={form.messageId ? "published" : "draft"} />
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "rgba(255,255,255,0.62)",
                  fontSize: 14,
                }}
              >
                Build your giveaway settings, visual banner, and winner
                announcement from one place.
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
              onClick={goToGiveawayList}
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
              Back
            </button>

            <button
              onClick={handleSave}
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
              }}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              onClick={handlePublish}
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
                opacity: saving || publishing ? 0.8 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 14px 35px rgba(88,101,242,0.32)",
              }}
            >
              <Send size={16} />
             {publishing
  ? form.ended
    ? "Republishing..."
    : form.messageId
    ? "Updating..."
    : "Publishing..."
  : form.ended
  ? "Republish Giveaway"
  : form.messageId
  ? "Update Existing"
  : "Publish Giveaway"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(360px, 0.95fr)",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div style={sectionCard()}>
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

              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle()}>Prize</label>
                  <input
                    value={form.prize}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, prize: e.target.value }))
                    }
                    placeholder="Discord Nitro, VIP Role, $50 Gift Card..."
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label style={labelStyle()}>Description (optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional details about the giveaway..."
                    style={textareaStyle()}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div>
                    <label style={labelStyle()}>Winners</label>
                    <input
                      type="number"
                      min="1"
                      value={form.winners}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          winners: Number(e.target.value) || 1,
                        }))
                      }
                      style={inputStyle()}
                    />
                  </div>

                  <div>
                    <label style={labelStyle()}>Duration</label>
                    <input
                      value={form.duration}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      placeholder="1h, 2d, 30m"
                      style={inputStyle()}
                    />
                    <div style={helperTextStyle()}>
                      Supports s, m, h, d, w
                    </div>
                  </div>
                </div>

                <div>
                  <label style={labelStyle()}>Giveaway channel</label>
                  <SelectDropdown
                    options={channels}
                    value={form.channelId}
                    onChange={(nextValue, opt) =>
                      setForm((prev) => ({
                        ...prev,
                        channelId: nextValue,
                        channelName: opt?.name || "",
                        winnerAnnouncementChannelId:
                          prev.winnerAnnouncementChannelId || nextValue,
                        winnerAnnouncementChannelName:
                          prev.winnerAnnouncementChannelName ||
                          opt?.name ||
                          "",
                      }))
                    }
                    placeholder="Select a giveaway channel"
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
              </div>
            </div>

            <div style={sectionCard()}>
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
                <ImageIcon size={18} />
                Giveaway banner
              </div>

              <ImageInput
  label="Banner (optional)"
  value={form.bannerUrl}
  disabled={!isPremium}
 onChange={(value) => {
  if (!isPremium) {
    setGlobalToast?.({
      type: "warning",
      message: "Giveaway banners require Kyro Premium.",
    });
    return;
  }

  setForm((prev) => ({ ...prev, bannerUrl: value }));
}}
  helperText="Use a direct image URL for giveaway banners so the banner stays inside the embed after interactions."
/>
            </div>

            <div style={sectionCard()}>
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
                <Megaphone size={18} />
                Winner announcement
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle()}>Announcement channel</label>
                  <SelectDropdown
                    options={channels}
                    value={form.winnerAnnouncementChannelId}
                    onChange={(nextValue, opt) =>
                      setForm((prev) => ({
                        ...prev,
                        winnerAnnouncementChannelId: nextValue,
                        winnerAnnouncementChannelName: opt?.name || "",
                      }))
                    }
                    placeholder="Select winner announcement channel"
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
                  <div style={helperTextStyle()}>
                    Choose where the winner announcement message should be sent.
                  </div>
                </div>

                <div>
                  <label style={labelStyle()}>
                    Winner announcement message
                  </label>
                  <textarea
                    value={form.winnerMessage}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        winnerMessage: e.target.value,
                      }))
                    }
                    placeholder="🎉 Congratulations {winners}! You won **{prize}** hosted by {host}."
                    style={textareaStyle()}
                  />
                  <div style={helperTextStyle()}>
                    Supported variables: {"{winners}"}, {"{prize}"}, {"{host}"}
                  </div>
                </div>

               <ImageInput
  label="Winner announcement banner (optional)"
  value={form.winnerBannerUrl}
  disabled={!isPremium}
 onChange={(value) => {
  if (!isPremium) {
    setGlobalToast?.({
      type: "warning",
      message: "Winner announcement banners require Kyro Premium.",
    });
    return;
  }

  setForm((prev) => ({ ...prev, winnerBannerUrl: value }));
}}
  helperText="Use a direct image URL for the winner announcement banner."
/>
              </div>
            </div>

            <div style={sectionCard()}>
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
                <Shield size={18} />
                Participation rules
              </div>

              <RoleModeSelector form={form} setForm={setForm} roles={roles} />
            </div>
          </div>

          <div
            style={{
              ...sectionCard(),
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
              <FileText size={18} />
              Live Preview
            </div>

            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
                marginBottom: 16,
              }}
            >
              {form.bannerUrl ? (
                <img
                  src={form.bannerUrl}
                  alt="Giveaway preview banner"
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : null}

              <div style={{ padding: 16 }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 20,
                    lineHeight: 1.35,
                    wordBreak: "break-word",
                  }}
                >
                  {form.prize || "Discord Nitro, VIP Role, $50 Gift Card..."}
                </div>

                {form.description ? (
                  <div
                    style={{
                      marginTop: 10,
                      color: "rgba(255,255,255,0.68)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {form.description}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(88,101,242,0.12)",
                      border: "1px solid rgba(88,101,242,0.18)",
                      color: "#dbe4ff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <Users size={13} />
                    {form.winners || 1} winner
                    {Number(form.winners) > 1 ? "s" : ""}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <Clock size={13} />
                    {form.duration || "1h"}
                  </span>

                  {form.requiredRoleMode !== "none" && form.requiredRoleId ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.18)",
                        color: "#fcd34d",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <Shield size={13} />
                      Restricted role mode
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {form.winnerBannerUrl ? (
                <img
                  src={form.winnerBannerUrl}
                  alt="Winner announcement preview"
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : null}

              <div style={{ padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  <Megaphone size={16} />
                  Winner Announcement Preview
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "rgba(255,255,255,0.72)",
                    fontSize: 13,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {form.winnerMessage ||
                    "🎉 Congratulations {winners}! You won **{prize}** hosted by {host}."}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    color: "rgba(255,255,255,0.52)",
                    fontSize: 12,
                  }}
                >
                  Channel: #
                  {form.winnerAnnouncementChannelName ||
                    form.channelName ||
                    "not-selected"}
                </div>
              </div>
            </div>
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
                      setForm(JSON.parse(initialSnapshot));
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
                  transition: "all 0.18s ease",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: "9px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(88,101,242,0.25)",
                  background:
                    "linear-gradient(135deg, rgba(88,101,242,0.95), rgba(59,130,246,0.95))",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
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

export default function GiveawaysPage({
  selectedGuild,
  setGlobalToast,
  currentUser,
}) {
  const [hash, setHash] = useState(window.location.hash || "");
  const hashState = parseEditorHash();

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash || "");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (
    hashState &&
    selectedGuild?.id &&
    hashState.guildId === selectedGuild.id &&
    hashState.giveawayId
  ) {
    return (
      <GiveawayEditorView
        selectedGuild={selectedGuild}
        setGlobalToast={setGlobalToast}
        giveawayId={hashState.giveawayId}
        currentUser={currentUser}
      />
    );
  }

  return (
    <GiveawayListView
      key={hash}
      selectedGuild={selectedGuild}
      setGlobalToast={setGlobalToast}
      currentUser={currentUser}
    />
  );
}