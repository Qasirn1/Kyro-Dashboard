import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SearchableSelect from "../components/SearchableSelect";
import PageLoader from "../components/PageLoader";
import {
  BarChart3,
  Clock3,
  CalendarDays,
  Users,
  Bot,
  Activity,
  Layers3,
  Hash,
  MessageSquare,
  Volume2,
  FolderTree,
  Rocket,
  Shield,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ChevronDown,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

import API_BASE from "../config/api";

const STAT_TYPE_OPTIONS = [
  { value: "members", label: "Members", icon: Users },
  { value: "humans", label: "Humans", icon: Users },
  { value: "bots", label: "Bots", icon: Bot },
  { value: "online", label: "Online", icon: Activity },
  { value: "roles", label: "Roles", icon: Shield },
  { value: "role_count", label: "Specific Role Count", icon: Shield },
  { value: "channels", label: "Channels", icon: Hash },
  { value: "text_channels", label: "Text Channels", icon: MessageSquare },
  { value: "voice_channels", label: "Voice Channels", icon: Volume2 },
  { value: "categories", label: "Categories", icon: FolderTree },
  { value: "boosts", label: "Boosts", icon: Rocket },
  { value: "time", label: "Time", icon: Clock3 },
  { value: "social", label: "Social", icon: BarChart3 },
  { value: "custom", label: "Custom", icon: Layers3 },
];

const TIMEZONE_OPTIONS = [
  { name: "Karachi — Asia/Karachi", value: "Asia/Karachi" },
  { name: "Lahore — Asia/Karachi", value: "Asia/Karachi" },
  { name: "Dubai — Asia/Dubai", value: "Asia/Dubai" },
  { name: "Riyadh — Asia/Riyadh", value: "Asia/Riyadh" },
  { name: "Doha — Asia/Qatar", value: "Asia/Qatar" },
  { name: "Istanbul — Europe/Istanbul", value: "Europe/Istanbul" },
  { name: "London — Europe/London", value: "Europe/London" },
  { name: "Manchester — Europe/London", value: "Europe/London" },
  { name: "Birmingham — Europe/London", value: "Europe/London" },
  { name: "Paris — Europe/Paris", value: "Europe/Paris" },
  { name: "Berlin — Europe/Berlin", value: "Europe/Berlin" },
  { name: "Rome — Europe/Rome", value: "Europe/Rome" },
  { name: "Madrid — Europe/Madrid", value: "Europe/Madrid" },
  { name: "Amsterdam — Europe/Amsterdam", value: "Europe/Amsterdam" },
  { name: "Athens — Europe/Athens", value: "Europe/Athens" },
  { name: "Moscow — Europe/Moscow", value: "Europe/Moscow" },
  { name: "Cairo — Africa/Cairo", value: "Africa/Cairo" },
  { name: "Johannesburg — Africa/Johannesburg", value: "Africa/Johannesburg" },
  { name: "Lagos — Africa/Lagos", value: "Africa/Lagos" },
  { name: "Nairobi — Africa/Nairobi", value: "Africa/Nairobi" },
  { name: "New York — America/New_York", value: "America/New_York" },
  { name: "Chicago — America/Chicago", value: "America/Chicago" },
  { name: "Denver — America/Denver", value: "America/Denver" },
  { name: "Los Angeles — America/Los_Angeles", value: "America/Los_Angeles" },
  { name: "Toronto — America/Toronto", value: "America/Toronto" },
  { name: "Vancouver — America/Vancouver", value: "America/Vancouver" },
  { name: "Mexico City — America/Mexico_City", value: "America/Mexico_City" },
  { name: "São Paulo — America/Sao_Paulo", value: "America/Sao_Paulo" },
  {
    name: "Buenos Aires — America/Argentina/Buenos_Aires",
    value: "America/Argentina/Buenos_Aires",
  },
  { name: "Tokyo — Asia/Tokyo", value: "Asia/Tokyo" },
  { name: "Seoul — Asia/Seoul", value: "Asia/Seoul" },
  { name: "Beijing — Asia/Shanghai", value: "Asia/Shanghai" },
  { name: "Shanghai — Asia/Shanghai", value: "Asia/Shanghai" },
  { name: "Hong Kong — Asia/Hong_Kong", value: "Asia/Hong_Kong" },
  { name: "Singapore — Asia/Singapore", value: "Asia/Singapore" },
  { name: "Bangkok — Asia/Bangkok", value: "Asia/Bangkok" },
  { name: "Jakarta — Asia/Jakarta", value: "Asia/Jakarta" },
  { name: "Delhi — Asia/Kolkata", value: "Asia/Kolkata" },
  { name: "Mumbai — Asia/Kolkata", value: "Asia/Kolkata" },
  { name: "Kolkata — Asia/Kolkata", value: "Asia/Kolkata" },
  { name: "Dhaka — Asia/Dhaka", value: "Asia/Dhaka" },
  { name: "Kathmandu — Asia/Kathmandu", value: "Asia/Kathmandu" },
  { name: "Colombo — Asia/Colombo", value: "Asia/Colombo" },
  { name: "Sydney — Australia/Sydney", value: "Australia/Sydney" },
  { name: "Melbourne — Australia/Melbourne", value: "Australia/Melbourne" },
  { name: "Brisbane — Australia/Brisbane", value: "Australia/Brisbane" },
  { name: "Adelaide — Australia/Adelaide", value: "Australia/Adelaide" },
  { name: "Perth — Australia/Perth", value: "Australia/Perth" },
  { name: "Auckland — Pacific/Auckland", value: "Pacific/Auckland" },
];

function createEmptyEntry(type = "members") {
  return {
    id: `stat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    channelId: null,
    enabled: true,
    type,
    label: getDefaultLabel(type),
    roleId: null,
    emoji: "",
    timezone: "Asia/Karachi",
    format: "12h",
    display: type === "time" ? "time" : "time",
    numberStyle: "full",
    platform: null,
    statType: null,
    value: null,
    fallbackValue: null,
    lastValue: null,
    lastFetchedAt: null,
  };
}

function getDefaultLabel(type) {
  switch (type) {
    case "members":
      return "Members";
    case "humans":
      return "Humans";
    case "bots":
      return "Bots";
    case "online":
      return "Online";
    case "roles":
      return "Roles";
    case "role_count":
      return "Role Members";
    case "channels":
      return "Channels";
    case "text_channels":
      return "Text Channels";
    case "voice_channels":
      return "Voice Channels";
    case "categories":
      return "Categories";
    case "boosts":
      return "Boosts";
    case "time":
      return "Time";
    case "social":
      return "Social";
    case "custom":
      return "Count";
    default:
      return "Stat";
  }
}

function getTypeMeta(type) {
  return (
    STAT_TYPE_OPTIONS.find((item) => item.value === type) || STAT_TYPE_OPTIONS[0]
  );
}

function normalizeIncomingServerStats(payload = {}) {
  return {
    enabled: payload.enabled ?? false,
    categoryId: payload.categoryId || null,
    refreshMinutes:
  Number(payload.refreshMinutes) >= 5 ? Number(payload.refreshMinutes) : 5,
    entries: Array.isArray(payload.entries)
      ? payload.entries.map((entry, index) => ({
          id: entry.id || `stat_${Date.now()}_${index}`,
          channelId: entry.channelId || null,
          enabled: entry.enabled !== false,
          type: entry.type || "members",
          label:
            typeof entry.label === "string"
              ? entry.label
              : getDefaultLabel(entry.type || "members"),
          roleId: entry.roleId || null,
          emoji: typeof entry.emoji === "string" ? entry.emoji : "",
          timezone:
            typeof entry.timezone === "string" && entry.timezone.trim()
              ? entry.timezone
              : "UTC",
          format: entry.format === "24h" ? "24h" : "12h",
          display: ["time", "date", "datetime"].includes(entry.display)
            ? entry.display
            : "time",
          numberStyle: entry.numberStyle === "compact" ? "compact" : "full",
          platform: entry.platform || null,
          statType: entry.statType || null,
          value: typeof entry.value === "number" ? entry.value : null,
          fallbackValue:
            typeof entry.fallbackValue === "number" ? entry.fallbackValue : null,
          lastValue: typeof entry.lastValue === "number" ? entry.lastValue : null,
          lastFetchedAt: entry.lastFetchedAt || null,
        }))
      : [],
    lastUpdated: payload.lastUpdated || null,
  };
}

export default function ServerStatsPage({ selectedGuild, onBack, setGlobalToast }) {
 const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [creatingStats, setCreatingStats] = useState(false);
const [updatingStats, setUpdatingStats] = useState(false);
const [needsStatsSync, setNeedsStatsSync] = useState(false);
const [categoriesLoading, setCategoriesLoading] = useState(false);
const [rolesLoading, setRolesLoading] = useState(false);
const isPremium = false;

  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);

  const [serverStats, setServerStats] = useState(() =>
    normalizeIncomingServerStats({})
  );
  const [initialSnapshot, setInitialSnapshot] = useState("");

  const guildId = selectedGuild?.id;

  useEffect(() => {
    if (!guildId) return;

    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setCategoriesLoading(true);
      setRolesLoading(true);

      try {
        const [configRes, categoriesRes, rolesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/guilds/${guildId}/server-stats`),
          axios.get(`${API_BASE}/api/guilds/${guildId}/categories`),
          axios.get(`${API_BASE}/api/guilds/${guildId}/roles`),
        ]);

        if (cancelled) return;

        const normalized = normalizeIncomingServerStats(
          configRes.data?.serverStats || {}
        );

        setServerStats(normalized);
        setInitialSnapshot(JSON.stringify(normalized));
        setNeedsStatsSync(false);

        setCategories(Array.isArray(categoriesRes.data?.categories) ? categoriesRes.data.categories : []);
        setRoles(Array.isArray(rolesRes.data?.roles) ? rolesRes.data.roles : []);
      } catch (error) {
        console.error("Server stats load error:", error);
        if (!cancelled) {
          const empty = normalizeIncomingServerStats({});
          setServerStats(empty);
          setInitialSnapshot(JSON.stringify(empty));
          setGlobalToast?.({
            type: "error",
            message: "Failed to load server stats settings.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCategoriesLoading(false);
          setRolesLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(serverStats) !== initialSnapshot;
  }, [serverStats, initialSnapshot]);
    const canCreateStats = useMemo(() => {
    return (
      !creatingStats &&
      !saving &&
      serverStats.enabled &&
      !!serverStats.categoryId &&
      serverStats.entries.some((entry) => entry.enabled && !entry.channelId)
    );
  }, [creatingStats, saving, serverStats]);

 const canUpdateStats = useMemo(() => {
  return (
    !updatingStats &&
    !saving &&
    !creatingStats &&
    serverStats.enabled &&
    !!serverStats.categoryId &&
    serverStats.entries.length > 0 &&
    needsStatsSync
  );
}, [updatingStats, saving, creatingStats, serverStats, needsStatsSync]);

  const connectedChannelsCount = useMemo(() => {
    return serverStats.entries.filter((entry) => !!entry.channelId).length;
  }, [serverStats.entries]);

 function updateTopLevel(key, value) {
  setServerStats((prev) => ({
    ...prev,
    [key]: value,
  }));
  setNeedsStatsSync(true);
}

function updateEntry(entryId, patch) {
  setServerStats((prev) => ({
    ...prev,
    entries: prev.entries.map((entry) =>
      entry.id === entryId ? { ...entry, ...patch } : entry
    ),
  }));
  setNeedsStatsSync(true);
}

  function handleTypeChange(entryId, newType) {
    setServerStats((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => {
        if (entry.id !== entryId) return entry;

        const next = {
          ...entry,
          type: newType,
          label:
            entry.label === getDefaultLabel(entry.type) || !entry.label
              ? getDefaultLabel(newType)
              : entry.label,
        };

if (newType === "time" && !isPremium) {
  setGlobalToast?.({
    type: "warning",
    title: "Premium Feature",
    message: "Time statistics require Kyro Premium.",
  });

  return entry;
}

        if (newType === "time") {
          next.display = entry.display || "time";
          next.timezone = entry.timezone || "Asia/Karachi";
          next.format = entry.format || "12h";
        }

        if (newType !== "role_count") {
          next.roleId = null;
        }

        if (newType !== "custom") {
          next.value = null;
        }

        if (newType !== "social") {
          next.platform = null;
          next.statType = null;
          next.fallbackValue = null;
        }

        return next;
      }),
    }));
      setNeedsStatsSync(true);
  }

 function addEntry(type = "members") {
  setServerStats((prev) => ({
    ...prev,
    entries: [...prev.entries, createEmptyEntry(type)],
  }));
  setNeedsStatsSync(true);
}

function removeEntry(entryId) {
  setServerStats((prev) => ({
    ...prev,
    entries: prev.entries.filter((entry) => entry.id !== entryId),
  }));
  setNeedsStatsSync(true);
}

  async function handleSave() {
    if (!guildId) return;

    setSaving(true);

    try {
      const payload = {
        ...serverStats,
       refreshMinutes: Math.max(5, Number(serverStats.refreshMinutes) || 5),
      };

      const response = await axios.post(
        `${API_BASE}/api/guilds/${guildId}/server-stats`,
        payload
      );

      const normalized = normalizeIncomingServerStats(
        response.data?.serverStats || payload
      );

      setServerStats(normalized);
      setInitialSnapshot(JSON.stringify(normalized));
      setNeedsStatsSync(true);
      setGlobalToast?.({
        type: "success",
        message: "Server stats settings saved successfully.",
      });
    } catch (error) {
      console.error("Server stats save error:", error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to save server stats settings.",
      });
    } finally {
      setSaving(false);
    }
  }

    async function handleCreateStats() {
    if (!guildId) return;

    setCreatingStats(true);

    try {
      const response = await axios.post(
        `${API_BASE}/api/guilds/${guildId}/server-stats/create`
      );

      const normalized = normalizeIncomingServerStats(
        response.data?.serverStats || {}
      );

      setServerStats(normalized);
      setInitialSnapshot(JSON.stringify(normalized));
      setNeedsStatsSync(false);
      setGlobalToast?.({
        type: "success",
        message: response.data?.message || "Stats channels created successfully.",
      });
    } catch (error) {
      console.error("Create stats error:", error);
      setGlobalToast?.({
        type: "error",
        message:
          error?.response?.data?.error ||
          "Failed to create stats channels.",
      });
    } finally {
      setCreatingStats(false);
    }
  }

  async function handleUpdateStats() {
    if (!guildId) return;

    setUpdatingStats(true);

    const updateResetTimer = setTimeout(() => {
  setUpdatingStats(false);
}, 10000);

    try {
      const response = await axios.post(
        `${API_BASE}/api/guilds/${guildId}/server-stats/update`
      );

      const normalized = normalizeIncomingServerStats(
        response.data?.serverStats || {}
      );

      setServerStats(normalized);
      setInitialSnapshot(JSON.stringify(normalized));
      setNeedsStatsSync(false);
      setGlobalToast?.({
        type: "success",
        message: response.data?.message || "Stats channels updated successfully.",
      });
    } catch (error) {
      console.error("Update stats error:", error);
      setGlobalToast?.({
        type: "error",
        message:
          error?.response?.data?.error ||
          "Failed to update stats channels.",
      });
    } finally {
      clearTimeout(updateResetTimer);
setUpdatingStats(false);
    }
  }

  function formatLastUpdated(value) {
    if (!value) return "Never";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";

    return date.toLocaleString();
  }

  if (!selectedGuild) {
    return (
      <div style={emptyWrap}>
        <h2 style={emptyTitle}>Select a server first</h2>
        <p style={emptyText}>
          Choose a server from the sidebar to manage Server Stats.
        </p>
      </div>
    );
  }

 if (loading) {
  return (
    <PageLoader
      title="Loading server stats..."
      subtitle="Preparing counters, stat channels, time displays, and live server metrics."
    />
  );
}

  return (
    <div style={{ position: "relative" }}>
      <div style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={{ position: "relative", zIndex: 2 }}>
                    <div style={heroTopRow}>
            <div style={{ minWidth: 0 }}>
              <button
                type="button"
                onClick={onBack}
                style={backButton}
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>

              <div style={eyebrow}>UTILITY MODULE</div>
              <h2 style={heroTitle}>Server Stats</h2>
              <p style={heroText}>
                Manage live stat channels, counters, and time displays for{" "}
                <strong>{selectedGuild.name}</strong>.
              </p>
            </div>

            <div style={statusPill}>
              <Sparkles size={15} />
              <span>{connectedChannelsCount} Live Channel{connectedChannelsCount === 1 ? "" : "s"}</span>
            </div>
          </div>

                   <div style={overviewGrid}>
            <OverviewCard
              icon={Layers3}
              label="Total Entries"
              value={String(serverStats.entries.length)}
            />
            <OverviewCard
              icon={FolderTree}
              label="Category"
              value={
                categories.find((cat) => cat.id === serverStats.categoryId)?.name ||
                "Not selected"
              }
            />
            <OverviewCard
              icon={BarChart3}
              label="Connected Channels"
              value={String(connectedChannelsCount)}
            />
            <OverviewCard
              icon={RefreshCw}
              label="Refresh Interval"
              value={`${serverStats.refreshMinutes || 5} min`}
            />
            <OverviewCard
              icon={Clock3}
              label="Last Updated"
              value={formatLastUpdated(serverStats.lastUpdated)}
            />
          </div>
        </div>
      </div>

      <div style={pageGrid}>
        <div style={leftColumn}>
         <SectionCard
  title="System Settings"
  subtitle="Base configuration for your live server stat channels."
   rightContent={
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={handleCreateStats}
        disabled={!canCreateStats}
        style={{
          ...secondaryButton,
          opacity: canCreateStats ? 1 : 0.5,
          cursor: canCreateStats ? "pointer" : "not-allowed",
        }}
      >
        {creatingStats ? <RefreshCw size={16} className="spin" /> : <Plus size={16} />}
        {creatingStats ? "Creating..." : "Create Stats"}
      </button>

      <button
        type="button"
        onClick={handleUpdateStats}
        disabled={!canUpdateStats}
        style={{
          ...primaryButton,
          opacity: canUpdateStats ? 1 : 0.5,
          cursor: canUpdateStats ? "pointer" : "not-allowed",
        }}
      >
        {updatingStats ? (
          <RefreshCw size={16} className="spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        {updatingStats ? "Updating..." : "Update Stats"}
      </button>
    </div>
  }
>
            <div style={formGrid}>
              <ConfigTile
                title="Enable Server Stats"
                subtitle="Turn the whole module on or off."
              >
                <SwitchToggle
                  checked={serverStats.enabled}
                  onChange={(checked) => updateTopLevel("enabled", checked)}
                />
              </ConfigTile>

                        <ConfigTile
  title="Stats Category"
  subtitle="Choose the category where stat channels live."
>
  <SearchableSelect
    options={categories.map((category) => ({
      id: category.id,
      name: category.name,
    }))}
    value={serverStats.categoryId || ""}
    onChange={(nextId) => updateTopLevel("categoryId", nextId || null)}
    placeholder={categoriesLoading ? "Loading categories..." : "Select category"}
    searchPlaceholder="Search categories..."
    formatLabel={(item) => item.name}
  />
</ConfigTile>

              <ConfigTile
                title="Refresh Minutes"
                subtitle="Minimum 5 minutes. Discord may delay frequent channel name updates."
              >
                <input
  type="number"
  min="5"
  value={serverStats.refreshMinutes}
  onChange={(e) =>
    updateTopLevel(
      "refreshMinutes",
      Math.max(5, Number(e.target.value) || 5)
    )
  }
  style={darkInput}
/>
              </ConfigTile>
            </div>
          </SectionCard>

          <SectionCard
            title="Stat Entries"
            subtitle="Add, edit, and manage every live stat channel entry."
            rightContent={
              <button
                type="button"
                onClick={() => addEntry("members")}
                style={primaryButton}
              >
                <Plus size={16} />
                Add Stat
              </button>
            }
          >
            {serverStats.entries.length === 0 ? (
              <div style={emptyEntriesCard}>
                <BarChart3 size={26} color="rgba(147,197,253,0.85)" />
                <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700 }}>
                  No stat entries yet
                </div>
                <div style={emptyEntriesText}>
                  Add your first live counter to start building server stats.
                </div>
                <button
                  type="button"
                  onClick={() => addEntry("members")}
                  style={{ ...primaryButton, marginTop: 18 }}
                >
                  <Plus size={16} />
                  Add First Stat
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                {serverStats.entries.map((entry, index) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    index={index}
                    roles={roles}
                    rolesLoading={rolesLoading}
                    onUpdate={updateEntry}
                    onTypeChange={handleTypeChange}
                    onRemove={removeEntry}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={rightColumn}>
          <SectionCard
            title="Quick Add"
            subtitle="Drop in common stat presets fast."
          >
            <div style={quickAddGrid}>
              {STAT_TYPE_OPTIONS.slice(0, 12).map((item) => {
                const Icon = item.icon;

                return (
                <button
  key={item.value}
  type="button"
  onClick={() => {
  if (item.value === "time" && !isPremium) {
    setGlobalToast?.({
      type: "warning",
      title: "Premium Feature",
      message: "Time statistics require Kyro Premium.",
    });

    return;
  }

  addEntry(item.value);
}}
  style={quickAddButton}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.border = "1px solid rgba(96,165,250,0.22)";
    e.currentTarget.style.boxShadow =
      "0 10px 24px rgba(59,130,246,0.10)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0px)";
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = "0 0 0 rgba(59,130,246,0)";
  }}
>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Tips"
            subtitle="Best practices for clean server stat setup."
          >
            <div style={tipsWrap}>
              <TipLine text="Start with Members and Bots, then expand slowly." />
              <TipLine text="Use a dedicated category to keep your stats clean." />
              <TipLine text="Use role count entries for staff, boosters, or premium roles." />
              <TipLine text="Use time entries to show your city or community timezone." />
            </div>
          </SectionCard>
        </div>
      </div>

      <div
        style={{
          ...saveBar,
          opacity: hasChanges ? 1 : 0,
          transform: hasChanges ? "translateY(0px)" : "translateY(18px)",
          pointerEvents: hasChanges ? "auto" : "none",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Unsaved changes</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
            Save your server stats configuration to sync with Kyro.
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            ...primaryButton,
            opacity: saving ? 0.75 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>



      <style>
        {`
          .spin {
            animation: spin 0.9s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value }) {
  return (
    <div style={overviewCard}>
      <div style={overviewIconWrap}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={overviewLabel}>{label}</div>
        <div style={overviewValue} title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, rightContent, children }) {
  return (
    <div
  style={sectionCard}
  onMouseEnter={(e) => {
    e.currentTarget.style.border = "1px solid rgba(96,165,250,0.18)";
    e.currentTarget.style.boxShadow = "0 16px 36px rgba(59,130,246,0.08)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.16)";
  }}
>
      <div style={sectionHeader}>
        <div>
          <h3 style={sectionTitle}>{title}</h3>
          {subtitle ? <p style={sectionSubtitle}>{subtitle}</p> : null}
        </div>
        {rightContent ? <div>{rightContent}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ConfigTile({ title, subtitle, children }) {
  return (
    <div style={configTile}>
      <div style={{ marginBottom: 12 }}>
        <div style={configTileTitle}>{title}</div>
        <div style={configTileSubtitle}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function TipLine({ text }) {
  return (
    <div style={tipLine}>
      <div style={tipDot} />
      <span>{text}</span>
    </div>
  );
}

function SwitchToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 58,
        height: 32,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: checked
          ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
          : "rgba(255,255,255,0.12)",
        position: "relative",
        transition: "all 0.25s ease",
        boxShadow: checked ? "0 0 20px rgba(59,130,246,0.25)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          left: checked ? 30 : 4,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: "white",
          transition: "all 0.25s ease",
        }}
      />
    </button>
  );
}

function EntryCard({
  entry,
  index,
  roles,
  rolesLoading,
  onUpdate,
  onTypeChange,
  onRemove,
}) {
  const typeMeta = getTypeMeta(entry.type);
  const TypeIcon = typeMeta.icon;
  const isPremiumTimeStat = entry.type === "time";

  const filteredTimezones = useMemo(() => TIMEZONE_OPTIONS.slice(0, 60), []);

  return (
    <div
  style={entryCard}
  onMouseEnter={(e) => {
    e.currentTarget.style.border = "1px solid rgba(96,165,250,0.18)";
    e.currentTarget.style.boxShadow = "0 14px 34px rgba(59,130,246,0.08)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
    e.currentTarget.style.boxShadow = "none";
  }}
>
      <div style={entryTopBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={entryNumber}>{index + 1}</div>

         <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <div style={entryTypeBadge}>
    <TypeIcon size={15} />
    <span>{typeMeta.label}</span>
  </div>

  {isPremiumTimeStat && (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 7px",
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "rgba(255, 184, 77, 0.16)",
        color: "#ffcc73",
        border: "1px solid rgba(255, 184, 77, 0.28)",
        boxShadow: "0 0 12px rgba(255,184,77,0.14)",
      }}
    >
      Premium
    </div>
  )}
</div>

          <div style={{ minWidth: 0 }}>
            <div style={entryTitleText}>
              {entry.label || getDefaultLabel(entry.type)}
            </div>
            <div style={entrySmallText}>
              {entry.channelId ? `Linked channel: ${entry.channelId}` : "Channel will be assigned by bot setup flow"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SwitchToggle
            checked={entry.enabled}
            onChange={(checked) => onUpdate(entry.id, { enabled: checked })}
          />

          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            style={dangerIconButton}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={entryGrid}>
      <div style={fieldWrap}>
  <label style={fieldLabel}>Stat Type</label>
  <SearchableSelect
    options={STAT_TYPE_OPTIONS.map((option) => ({
      id: option.value,
      name: option.label,
    }))}
    value={entry.type}
    onChange={(nextId) => onTypeChange(entry.id, nextId)}
    placeholder="Select stat type"
    searchPlaceholder="Search stat types..."
    formatLabel={(item) => item.name}
  />
</div>

        <div style={fieldWrap}>
          <label style={fieldLabel}>Label</label>
          <input
            value={entry.label || ""}
            onChange={(e) => onUpdate(entry.id, { label: e.target.value })}
            placeholder="Enter label"
            style={darkInput}
          />
        </div>

        <div style={fieldWrap}>
          <label style={fieldLabel}>Emoji</label>
          <input
            value={entry.emoji || ""}
            onChange={(e) => onUpdate(entry.id, { emoji: e.target.value })}
            placeholder="Optional emoji"
            style={darkInput}
          />
        </div>

       <div style={fieldWrap}>
  <label style={fieldLabel}>Number Style</label>
  <SearchableSelect
    options={[
      { id: "full", name: "Full" },
      { id: "compact", name: "Compact" },
    ]}
    value={entry.numberStyle}
    onChange={(nextId) =>
      onUpdate(entry.id, { numberStyle: nextId })
    }
    placeholder="Select number style"
    searchPlaceholder="Search number styles..."
    formatLabel={(item) => item.name}
  />
</div>

           {entry.type === "role_count" && (
        <div style={fieldWrapWide}>
  <label style={fieldLabel}>Role</label>
  <SearchableSelect
    options={roles.map((role) => ({
      id: role.id,
      name: role.name,
    }))}
    value={entry.roleId || ""}
    onChange={(nextId) => onUpdate(entry.id, { roleId: nextId || null })}
    placeholder={rolesLoading ? "Loading roles..." : "Select role"}
    searchPlaceholder="Search roles..."
    formatLabel={(item) => item.name}
  />
</div>
        )}

        {entry.type === "time" && (
          <>
              <div style={fieldWrap}>
  <label style={fieldLabel}>Display</label>
  <SearchableSelect
    options={[
      { id: "time", name: "Time" },
      { id: "date", name: "Date" },
      { id: "datetime", name: "Date & Time" },
    ]}
    value={entry.display}
    onChange={(nextId) => onUpdate(entry.id, { display: nextId })}
    placeholder="Select display"
    searchPlaceholder="Search display types..."
    formatLabel={(item) => item.name}
  />
</div>

            <div style={fieldWrap}>
  <label style={fieldLabel}>Clock Format</label>
  <SearchableSelect
    options={[
      { id: "12h", name: "12 Hour" },
      { id: "24h", name: "24 Hour" },
    ]}
    value={entry.format}
    onChange={(nextId) => onUpdate(entry.id, { format: nextId })}
    placeholder="Select format"
    searchPlaceholder="Search formats..."
    formatLabel={(item) => item.name}
  />
</div>

                 <div style={fieldWrapWide}>
  <label style={fieldLabel}>Timezone</label>
  <SearchableSelect
    options={filteredTimezones.map((timezone) => ({
      id: timezone.value,
      name: timezone.name,
    }))}
    value={entry.timezone || "UTC"}
    onChange={(nextId) =>
      onUpdate(entry.id, { timezone: nextId || "UTC" })
    }
    placeholder="Select timezone"
    searchPlaceholder="Search timezones..."
    formatLabel={(item) => item.name}
  />
</div>
          </>
        )}

        {entry.type === "custom" && (
          <div style={fieldWrap}>
            <label style={fieldLabel}>Custom Value</label>
            <input
              type="number"
              value={entry.value ?? ""}
              onChange={(e) =>
                onUpdate(entry.id, {
                  value:
                    e.target.value === "" ? null : Number(e.target.value) || 0,
                })
              }
              placeholder="0"
              style={darkInput}
            />
          </div>
        )}

        {entry.type === "social" && (
          <>
            <div style={fieldWrap}>
              <label style={fieldLabel}>Platform</label>
              <select
                value={entry.platform || ""}
                onChange={(e) =>
                  onUpdate(entry.id, {
                    platform: e.target.value || null,
                  })
                }
                style={darkSelect}
              >
                <option value="">Select platform</option>
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
                <option value="x">X / Twitter</option>
                <option value="kick">Kick</option>
              </select>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Stat Type</label>
              <input
                value={entry.statType || ""}
                onChange={(e) =>
                  onUpdate(entry.id, { statType: e.target.value || null })
                }
                placeholder="subs, followers, views..."
                style={darkInput}
              />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Fallback Value</label>
              <input
                type="number"
                value={entry.fallbackValue ?? ""}
                onChange={(e) =>
                  onUpdate(entry.id, {
                    fallbackValue:
                      e.target.value === "" ? null : Number(e.target.value) || 0,
                  })
                }
                placeholder="0"
                style={darkInput}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const heroCard = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "30px 30px 28px",
  background:
    "linear-gradient(135deg, rgba(88,101,242,0.14), rgba(59,130,246,0.08), rgba(124,58,237,0.08))",
  border: "1px solid rgba(88,101,242,0.18)",
  boxShadow: "0 14px 48px rgba(0,0,0,0.24)",
  marginBottom: 24,
};

const heroGlowOne = {
  position: "absolute",
  top: -70,
  right: -70,
  width: 220,
  height: 220,
  borderRadius: 999,
  background: "rgba(59,130,246,0.16)",
  filter: "blur(30px)",
};

const heroGlowTwo = {
  position: "absolute",
  bottom: -90,
  left: -60,
  width: 220,
  height: 220,
  borderRadius: 999,
  background: "rgba(124,58,237,0.12)",
  filter: "blur(34px)",
};

const heroTopRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 26,
};

const eyebrow = {
  fontSize: 11,
  letterSpacing: "0.12em",
  fontWeight: 800,
  color: "rgba(147,197,253,0.84)",
  marginBottom: 10,
};

const heroTitle = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  color: "white",
};

const heroText = {
  margin: "10px 0 0 0",
  fontSize: 15,
  lineHeight: 1.75,
  color: "rgba(255,255,255,0.74)",
  maxWidth: 760,
};

const heroBadge = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#c4b5fd",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
};

const overviewCard = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "16px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const overviewIconWrap = {
  width: 38,
  height: 38,
  borderRadius: 12,
  background: "rgba(88,101,242,0.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#c4b5fd",
  flexShrink: 0,
};

const overviewLabel = {
  fontSize: 12,
  color: "rgba(255,255,255,0.58)",
  marginBottom: 5,
};

const overviewValue = {
  fontSize: 15,
  fontWeight: 700,
  color: "white",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const pageGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.8fr)",
  gap: 24,
  alignItems: "start",
};

const leftColumn = {
  display: "grid",
  gap: 24,
};

const rightColumn = {
  display: "grid",
  gap: 24,
};

const sectionCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
  transition: "all 0.22s ease",
};

const sectionHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
};

const sectionTitle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: "white",
};

const sectionSubtitle = {
  margin: "8px 0 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.66)",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const configTile = {
  padding: 18,
  borderRadius: 20,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const configTileTitle = {
  fontSize: 15,
  fontWeight: 700,
  color: "white",
};

const configTileSubtitle = {
  marginTop: 6,
  fontSize: 13,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.62)",
};

const darkInput = {
  width: "100%",
  background: "#0f172a",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const darkSelect = {
  width: "100%",
  background: "#0f172a",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
};

const primaryButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 10px 24px rgba(59,130,246,0.28)",
};

const secondaryButton = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const emptyEntriesCard = {
  borderRadius: 22,
  padding: "38px 24px",
  textAlign: "center",
  background:
    "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.05))",
  border: "1px dashed rgba(147,197,253,0.24)",
};

const emptyEntriesText = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.64)",
};

const entryCard = {
  padding: 20,
  borderRadius: 22,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  transition: "all 0.22s ease",
};
const backButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: 14,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
  transition: "all 0.22s ease",
};

const statusPill = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#c4b5fd",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};
const entryTopBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const entryNumber = {
  width: 34,
  height: 34,
  borderRadius: 12,
  background: "rgba(59,130,246,0.16)",
  color: "#bfdbfe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 800,
  flexShrink: 0,
};

const entryTypeBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};

const entryTitleText = {
  fontSize: 16,
  fontWeight: 700,
  color: "white",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const entrySmallText = {
  marginTop: 5,
  fontSize: 12,
  color: "rgba(255,255,255,0.58)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const dangerIconButton = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: "1px solid rgba(248,113,113,0.16)",
  background: "rgba(248,113,113,0.08)",
  color: "#fca5a5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const entryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const fieldWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const fieldWrapWide = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  gridColumn: "span 2",
};

const fieldLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,0.62)",
  letterSpacing: "0.04em",
};

const selectWrap = {
  position: "relative",
};

const selectArrow = {
  position: "absolute",
  top: "50%",
  right: 14,
  transform: "translateY(-50%)",
  color: "rgba(255,255,255,0.56)",
  pointerEvents: "none",
};

const quickAddGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const quickAddButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: 16,
  padding: "14px 14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  fontWeight: 700,
  textAlign: "left",
  transition: "all 0.22s ease",
  boxShadow: "0 0 0 rgba(59,130,246,0)",
};

const tipsWrap = {
  display: "grid",
  gap: 12,
};

const tipLine = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  color: "rgba(255,255,255,0.74)",
  fontSize: 14,
  lineHeight: 1.7,
};

const tipDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#60a5fa",
  marginTop: 8,
  flexShrink: 0,
};

const saveBar = {
  position: "fixed",
  right: 28,
  bottom: 28,
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "rgba(7,18,38,0.95)",
  border: "1px solid rgba(88,101,242,0.22)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
  zIndex: 50,
  transition: "all 0.25s ease",
};

const loadingWrap = {
  minHeight: 320,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
};

const spinner = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "3px solid rgba(255,255,255,0.14)",
  borderTop: "3px solid #60a5fa",
  animation: "spin 1s linear infinite",
};

const emptyWrap = {
  minHeight: 280,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
};

const emptyTitle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
};

const emptyText = {
  marginTop: 10,
  color: "rgba(255,255,255,0.68)",
  fontSize: 15,
};
