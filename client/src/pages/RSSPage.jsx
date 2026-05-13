import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import PremiumLockCard from "../components/PremiumLockCard";
import FloatingSaveBar from "../components/FloatingSaveBar";
import { ui } from "../theme/uiStyles";
import SearchableSelect from "../components/SearchableSelect";
import PageLoader from "../components/PageLoader";
import {
  Rss,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Globe,
  Link as LinkIcon,
  Hash,
  Bell,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown,
  Wand2,
  Send,
  Loader2,
} from "lucide-react";

import API_BASE from "../config/api";

const FREE_RSS_FEED_LIMIT = 2;

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    padding: "10px 12px 10px 36px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };
}

function labelStyle() {
  return {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "rgba(255,255,255,0.82)",
    marginBottom: "8px",
  };
}

function sectionCardStyle() {
  return {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
  };
}

function buttonStyle(primary = false) {
  return {
    border: primary ? "none" : "1px solid rgba(255,255,255,0.08)",
    background: primary
      ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
      : "rgba(255,255,255,0.04)",
    color: "white",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: primary ? "0 10px 24px rgba(59,130,246,0.28)" : "none",
  };
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: checked
          ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
          : "rgba(255,255,255,0.08)",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "white",
          position: "absolute",
          top: 3,
          left: checked ? 28 : 4,
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  icon = null,
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef(null);

  const selectedOption = options.find((option) => option.id === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={fieldRef} style={{ position: "relative" }}>
      <label style={labelStyle()}>{label}</label>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...inputStyle(),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
          textAlign: "left",
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flex: 1,
          }}
        >
          {icon ? (
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          ) : null}

          <span
            style={{
              color: selectedOption ? "white" : "rgba(255,255,255,0.45)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {selectedOption?.name || placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          style={{
            color: "rgba(255,255,255,0.55)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s ease",
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
            right: 0,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            zIndex: 40,
            overflow: "hidden",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {placeholder}
          </button>

          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                background:
                  value === option.id
                    ? "rgba(59,130,246,0.16)"
                    : "transparent",
                border: "none",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                color: "white",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onMouseEnter={(e) => {
                if (value !== option.id) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedOptionsDropdown({ feed, updateFeed, inputStyle }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (feed.showOptions) {
          updateFeed(feed.id, { showOptions: false });
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [feed.id, feed.showOptions, updateFeed]);

  if (!Array.isArray(feed.feedOptions) || feed.feedOptions.length <= 1) {
    return null;
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <div
        onClick={() =>
          updateFeed(feed.id, {
            showOptions: !feed.showOptions,
          })
        }
        style={{
          ...inputStyle(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            paddingRight: 12,
          }}
        >
          {feed.feedUrl || "Select discovered feed"}
        </span>
        <span style={{ opacity: 0.7 }}>▾</span>
      </div>

      {feed.showOptions && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
            zIndex: 1000,
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          }}
        >
          {feed.feedOptions.map((option) => (
            <div
              key={option}
              onClick={() =>
                updateFeed(feed.id, {
                  feedUrl: option,
                  showOptions: false,
                })
              }
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                color: "#fff",
                background:
                  option === feed.feedUrl
                    ? "rgba(99,102,241,0.16)"
                    : "transparent",
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => {
                if (option !== feed.feedUrl) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (option !== feed.feedUrl) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function makeFeed(index = 0) {
  return {
    id: `rss_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    url: "",
    feedUrl: "",
    feedOptions: [],
    showOptions: false,
    channelId: "",
    roleId: "",
    enabled: true,
    paused: false,
    pauseReason: "",
    lastPostId: null,
    lastPostDate: null,
    lastError: null,
    lastErrorCode: null,
    lastErrorStatus: null,
    lastSuccessfulCheck: null,
    createdAt: new Date().toISOString(),
  };
}

function normalizeRssState(raw = {}) {
  return {
    enabled: raw.enabled ?? false,
    isPremium: raw.isPremium ?? false,
feeds: Array.isArray(raw.feeds)
  ? raw.feeds.map((feed, index) => ({
      ...makeFeed(index),
      ...feed,
      channelId: feed.channelId || "",
      roleId: feed.roleId || "",
      lastChecked: feed.lastChecked || null,
      lastSuccessfulCheck: feed.lastSuccessfulCheck || null,
      feedOptions: Array.isArray(feed.feedOptions) ? feed.feedOptions : [],
      showOptions: false,
    }))
  : []
  };
}

function StatusBadge({ feed }) {
  const paused = !!feed?.paused;
  const hasError = !!feed?.lastError;

  if (paused) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(239,68,68,0.12)",
          color: "#fca5a5",
          fontSize: 12,
          fontWeight: 700,
          border: "1px solid rgba(239,68,68,0.22)",
        }}
      >
        <PauseCircle size={14} />
        Paused
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(245,158,11,0.12)",
          color: "#fcd34d",
          fontSize: 12,
          fontWeight: 700,
          border: "1px solid rgba(245,158,11,0.22)",
        }}
      >
        <AlertTriangle size={14} />
        Error
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(34,197,94,0.12)",
        color: "#86efac",
        fontSize: 12,
        fontWeight: 700,
        border: "1px solid rgba(34,197,94,0.22)",
      }}
    >
      <CheckCircle2 size={14} />
      Active
    </div>
  );
}
function formatRssDate(value) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatRssRelative(value) {
  if (!value) return "No checks yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No checks yet";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function RSSPage({ selectedGuild, setGlobalToast, navigateToPage }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rss, setRss] = useState(normalizeRssState({}));
  const [initialRss, setInitialRss] = useState(normalizeRssState({}));
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [discoveringFeedId, setDiscoveringFeedId] = useState(null);
const [testingFeedId, setTestingFeedId] = useState(null);


  useEffect(() => {
    if (!selectedGuild?.id) return;

    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [rssRes, channelsRes, rolesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/guilds/${selectedGuild.id}/rss`),
          axios.get(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`),
          axios.get(`${API_BASE}/api/guilds/${selectedGuild.id}/roles`),
        ]);

        if (!mounted) return;

        const normalized = normalizeRssState(rssRes.data?.rss || {});
        setRss(normalized);
        setInitialRss(normalized);
        setChannels(Array.isArray(channelsRes.data?.channels) ? channelsRes.data.channels : []);
        setRoles(Array.isArray(rolesRes.data?.roles) ? rolesRes.data.roles : []);
      } catch (error) {
      console.error("RSS load error:", error);

const msg = error?.response?.data?.error || "";

// ❌ Ignore "Guild not found" errors (bot not in server)
if (msg.includes("Guild not found")) return;

setGlobalToast?.({
  type: "error",
  title: "Failed to load RSS",
  message: "Could not load RSS settings for this server.",
});
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [selectedGuild?.id, setGlobalToast]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(rss) !== JSON.stringify(initialRss);
  }, [rss, initialRss]);

    const isPremium = Boolean(rss.isPremium);
  const isAtFreeLimit = !isPremium && rss.feeds.length >= FREE_RSS_FEED_LIMIT;

  function updateFeed(feedId, patch) {
    setRss((prev) => ({
      ...prev,
      feeds: prev.feeds.map((feed) =>
        feed.id === feedId ? { ...feed, ...patch } : feed
      ),
    }));
  }

  function addFeed() {
    if (!isPremium && rss.feeds.length >= FREE_RSS_FEED_LIMIT) {
      setGlobalToast?.({
        type: "error",
        title: "Free limit reached",
        message: `Free plan supports up to ${FREE_RSS_FEED_LIMIT} RSS feeds per server.`,
      });
      return;
    }

    setRss((prev) => ({
      ...prev,
      feeds: [...prev.feeds, makeFeed(prev.feeds.length)],
    }));
  }

  function removeFeed(feedId) {
    setRss((prev) => ({
      ...prev,
      feeds: prev.feeds.filter((feed) => feed.id !== feedId),
    }));
  }

  function resetChanges() {
    setRss(initialRss);
  }
    async function handleDiscoverFeed(feed) {
    if (!selectedGuild?.id) return;

    if (!feed.url?.trim()) {
      setGlobalToast?.({
        type: "error",
        title: "Website URL required",
        message: "Please enter a website URL first.",
      });
      return;
    }

    try {
      setDiscoveringFeedId(feed.id);

      const res = await axios.post(
        `${API_BASE}/api/guilds/${selectedGuild.id}/rss/discover`,
        {
          websiteUrl: feed.url,
        }
      );

      if (!res.data?.success || !res.data?.feedUrl) {
        const suggested = Array.isArray(res.data?.suggestedFeedUrls)
          ? res.data.suggestedFeedUrls
          : [];

        if (suggested.length > 0) {
          updateFeed(feed.id, {
            feedUrl: suggested[0],
          });

          setGlobalToast?.({
            type: "error",
            title: "Exact feed not confirmed",
            message:
              "No confirmed RSS feed was found, but Kyro filled the most likely feed URL candidate for you to test manually.",
          });
          return;
        }

        setGlobalToast?.({
          type: "error",
          title: "Feed not found",
          message:
            res.data?.reason || "No RSS or Atom feed was discovered for that website.",
        });
        return;
      }

          updateFeed(feed.id, {
        feedUrl: res.data.feedUrl,
        title: feed.title || res.data.feedTitle || "",
        paused: false,
        pauseReason: "",
        feedOptions: Array.isArray(res.data.suggestedFeedUrls)
          ? res.data.suggestedFeedUrls
          : [],
      });

      setGlobalToast?.({
        type: "success",
        title: "Feed discovered",
        message: "RSS feed URL was found successfully.",
      });
    } catch (error) {
      console.error("Discover feed error:", error);
      setGlobalToast?.({
        type: "error",
        title: "Discover failed",
        message: "Could not discover a feed URL from that website.",
      });
    } finally {
      setDiscoveringFeedId(null);
    }
  }

  async function handleTestFeed(feed) {
    if (!selectedGuild?.id) return;

    if (!feed.channelId) {
      setGlobalToast?.({
        type: "error",
        title: "Channel required",
        message: "Please select an alert channel first.",
      });
      return;
    }

    if (!feed.feedUrl?.trim()) {
      setGlobalToast?.({
        type: "error",
        title: "Feed URL required",
        message: "Please enter or discover a feed URL first.",
      });
      return;
    }

    try {
      setTestingFeedId(feed.id);

      const res = await axios.post(
        `${API_BASE}/api/guilds/${selectedGuild.id}/rss/test`,
        {
          channelId: feed.channelId,
          roleId: feed.roleId || null,
          feedUrl: feed.feedUrl,
          title: feed.title || "",
        }
      );

      setGlobalToast?.({
        type: "success",
        title: "Test sent",
        message: res.data?.message || "Test RSS alert was sent successfully.",
      });
    } catch (error) {
      console.error("Test feed error:", error);
      setGlobalToast?.({
        type: "error",
        title: "Test failed",
        message:
          error.response?.data?.error ||
          error.response?.data?.details ||
          "Could not send the RSS test alert.",
      });
    } finally {
      setTestingFeedId(null);
    }
  }
  async function saveSettings() {
    if (!selectedGuild?.id) return;

    try {
      setSaving(true);

      const payload = {
        ...rss,
        feeds: rss.feeds.map((feed) => ({
          ...feed,
          channelId: feed.channelId || null,
          roleId: feed.roleId || null,
        })),
      };

      const res = await axios.post(
        `${API_BASE}/api/guilds/${selectedGuild.id}/rss`,
        payload
      );

      const normalized = normalizeRssState(res.data?.rss || {});
      setRss(normalized);
      setInitialRss(normalized);

      setGlobalToast?.({
        type: "success",
        title: "RSS saved",
        message: "RSS settings were saved successfully.",
      });
      } catch (error) {
      console.error("RSS save error:", error);

      const serverMessage =
        error.response?.data?.error || "Could not save RSS settings.";

      setGlobalToast?.({
        type: "error",
        title: "Save failed",
        message: serverMessage,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!selectedGuild?.id) {
    return (
      <div style={sectionCardStyle()}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
          Select a server first
        </div>
        <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 14 }}>
          Choose a server from the sidebar to manage RSS feeds.
        </div>
      </div>
    );
  }

if (loading) {
  return (
    <PageLoader
      title="Loading RSS feeds..."
      subtitle="Preparing feed URLs, alert channels, role mentions, and feed status settings."
    />
  );
}

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={sectionCardStyle()}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 22,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              <Rss size={22} />
              RSS Feed Manager
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.68)",
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Add website and feed URLs, choose alert channels, mention roles, and manage
              paused or failing feeds from one place.
            </div>
          </div>

          <div
            style={{
              minWidth: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Enable RSS</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 4 }}>
                Turn RSS alerts on or off for this server
              </div>
            </div>
            <ToggleSwitch
              checked={rss.enabled}
              onChange={(value) => setRss((prev) => ({ ...prev, enabled: value }))}
            />
          </div>
        </div>
      </div>
      {!isPremium && (
        <div
          style={{
            ...sectionCardStyle(),
            border: "1px solid rgba(245,158,11,0.22)",
            background: "rgba(245,158,11,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <AlertTriangle size={18} style={{ color: "#fbbf24", marginTop: 2 }} />

            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                Free Plan Limit
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.7,
                }}
              >
                Free servers can use up to{" "}
                <strong>{FREE_RSS_FEED_LIMIT} RSS feeds</strong>. Add more later with
                Kyro Premium.
              </div>
            </div>
          </div>
             </div>
      )}

      {isAtFreeLimit && (
     <PremiumLockCard
  badge="KYRO PREMIUM"
  title="Unlock Unlimited RSS Feeds"
  description={`Upgrade to Kyro Premium and unlock unlimited RSS feeds, priority support, premium automations, and advanced server tools.`}
  features={[
    "Unlimited RSS Feeds",
    "Priority Support",
    "Premium Features",
    "Advanced Automations",
  ]}
  buttonText="Upgrade to Premium"
  glow
  onClick={() => navigateToPage?.("premium")}
/>
      )}

      <div style={sectionCardStyle()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Configured Feeds</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", marginTop: 6 }}>
              Manage multiple blog, news, and website RSS feeds.
            </div>
          </div>

                  <button
            type="button"
            onClick={addFeed}
            disabled={isAtFreeLimit}
            style={{
              ...buttonStyle(true),
              opacity: isAtFreeLimit ? 0.65 : 1,
              cursor: isAtFreeLimit ? "not-allowed" : "pointer",
            }}
          >
            <Plus size={16} />
            {isAtFreeLimit ? "Free Limit Reached" : "Add Feed"}
          </button>
        </div>

        {rss.feeds.length === 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px dashed rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)",
              padding: "28px 22px",
              color: "rgba(255,255,255,0.66)",
              fontSize: 14,
            }}
          >
            No RSS feeds yet. Click <strong>Add Feed</strong> to create your first feed.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {rss.feeds.map((feed, index) => (
              <div
                key={feed.id}
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.025)",
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 14,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Rss size={17} />
                      Feed #{index + 1}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <StatusBadge feed={feed} />
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: feed.enabled
                            ? "rgba(59,130,246,0.12)"
                            : "rgba(255,255,255,0.06)",
                          color: feed.enabled ? "#93c5fd" : "rgba(255,255,255,0.7)",
                          fontSize: 12,
                          fontWeight: 700,
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {feed.enabled ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                        {feed.enabled ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                  </div>

              <div
  style={{
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16,
    flexWrap: "wrap",
  }}
>
  <div>
    {/* Feed title + badges */}
  </div>

  {/* ✅ PASTE HERE */}
  <div
    style={{
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    }}
  >
    <button
      type="button"
      onClick={() => handleDiscoverFeed(feed)}
      disabled={discoveringFeedId === feed.id}
      style={{
        ...buttonStyle(false),
        opacity: discoveringFeedId === feed.id ? 0.75 : 1,
      }}
    >
    {discoveringFeedId === feed.id ? (
  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
) : (
  <Wand2 size={16} />
)}
      {discoveringFeedId === feed.id ? "Discovering..." : "Auto Discover"}
    </button>

    <button
      type="button"
      onClick={() => handleTestFeed(feed)}
      disabled={testingFeedId === feed.id}
      style={{
        ...buttonStyle(false),
        opacity: testingFeedId === feed.id ? 0.75 : 1,
      }}
    >
    {testingFeedId === feed.id ? (
  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
) : (
  <Send size={16} />
)}
      {testingFeedId === feed.id ? "Sending..." : "Test Feed"}
    </button>

    <button
      type="button"
      onClick={() => removeFeed(feed.id)}
      style={{
        ...buttonStyle(false),
        color: "#fca5a5",
      }}
    >
      <Trash2 size={16} />
      Remove
    </button>
  </div>
</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={labelStyle()}>Feed Title</label>
                    <input
                      value={feed.title}
                      onChange={(e) => updateFeed(feed.id, { title: e.target.value })}
                      placeholder="Gaming News, Blog Updates, etc"
                      style={inputStyle()}
                    />
                  </div>

                  <div>
                    <label style={labelStyle()}>Website URL</label>
                    <div style={{ position: "relative" }}>
                      <Globe
                        size={16}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: 14,
                          color: "rgba(255,255,255,0.5)",
                        }}
                      />
                      <input
                        value={feed.url}
                        onChange={(e) => updateFeed(feed.id, { url: e.target.value })}
                        placeholder="Enter website URL (e.g. https://blog.site.com)"
                        style={{ ...inputStyle(), paddingLeft: 38 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle()}>Feed URL</label>
                    <div style={{ position: "relative" }}>
                      <LinkIcon
                        size={16}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: 14,
                          color: "rgba(255,255,255,0.5)",
                        }}
                      />
<div style={{ display: "grid", gap: 8, position: "relative" }}>
  <input
    value={feed.feedUrl}
    onChange={(e) => updateFeed(feed.id, { feedUrl: e.target.value })}
    placeholder="Enter or discover feed URL"
    style={inputStyle()}
  />

 <FeedOptionsDropdown
  feed={feed}
  updateFeed={updateFeed}
  inputStyle={inputStyle}
/>
</div>
                    </div>
                  </div>

                  <div>
  <label style={labelStyle()}>Alert Channel</label>
  <SearchableSelect
 options={channels
  .filter((channel) =>
    ["GUILD_TEXT", "text", 0].includes(channel.type)
  )
  .map((channel) => ({
    ...channel,
    id: channel.id || channel.channelId,
    name: channel.name || channel.label,
  }))}
    value={feed.channelId}
    onChange={(value) => updateFeed(feed.id, { channelId: value })}
    placeholder="Select channel"
    searchPlaceholder="Search channels..."
    formatLabel={(item) => `# ${item.name || item.label || "Unknown Channel"}`}
    zIndex={5000}
  />
</div>

               <div>
  <label style={labelStyle()}>Ping Role</label>
 <SearchableSelect
  options={roles.map((role) => ({
    ...role,
    id: role.id || role.roleId,
    name: role.name || role.label,
  }))}
  value={feed.roleId}
  onChange={(value) => updateFeed(feed.id, { roleId: value })}
  placeholder="Optional role mention"
  searchPlaceholder="Search roles..."
  formatLabel={(item) =>
    `@ ${item.name || item.label || "Unknown Role"}`
  }
  zIndex={5000}
/>
</div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginBottom: 6 }}>
                      Last Checked
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>
  {formatRssDate(feed.lastChecked)}
</div>
<div
  style={{
    marginTop: 6,
    fontSize: 12,
    color: "rgba(255,255,255,0.52)",
    fontWeight: 600,
  }}
>
  {formatRssRelative(feed.lastChecked)}
</div>
                  </div>

                  <div
                    style={{
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))",
border: "1px solid rgba(255,255,255,0.08)",
boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginBottom: 6 }}>
                      Last Error Status
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {feed.lastErrorStatus ?? "None"}
                    </div>
                  </div>
                  <div
                    style={{
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))",
border: "1px solid rgba(255,255,255,0.08)",
boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginBottom: 6 }}>
                      Last Successful Check
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>
  {formatRssDate(feed.lastSuccessfulCheck)}
</div>
<div
  style={{
    marginTop: 6,
    fontSize: 12,
    color: "rgba(255,255,255,0.52)",
    fontWeight: 600,
  }}
>
  {formatRssRelative(feed.lastSuccessfulCheck)}
</div>
                  </div>

                  <div
                    style={{
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))",
border: "1px solid rgba(255,255,255,0.08)",
boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginBottom: 6 }}>
                      Pause Reason
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {feed.pauseReason || "—"}
                    </div>
                  </div>
                </div>

                {feed.lastError ? (
                  <div
                    style={{
                      marginTop: 14,
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.16)",
                      color: "#fecaca",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 6 }}>Last Error</strong>
                    {feed.lastError}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Feed Enabled</div>
                    <ToggleSwitch
                      checked={feed.enabled}
                      onChange={(value) => updateFeed(feed.id, { enabled: value })}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Paused</div>
                    <ToggleSwitch
                      checked={feed.paused}
                      onChange={(value) =>
                        updateFeed(feed.id, {
                          paused: value,
                          pauseReason: value ? feed.pauseReason || "Paused from dashboard" : "",
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasChanges && (
        <div
          style={{
            position: "fixed",
            left: 340,
            right: 36,
            bottom: 24,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 18px",
            borderRadius: 18,
            background: "rgba(10,18,35,0.94)",
            border: "1px solid rgba(59,130,246,0.22)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Unsaved RSS changes</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", marginTop: 4 }}>
              Save your feed settings to sync them with Kyro.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={resetChanges} style={buttonStyle(false)}>
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              style={{
                ...buttonStyle(true),
                opacity: saving ? 0.75 : 1,
              }}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}