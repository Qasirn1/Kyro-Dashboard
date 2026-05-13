import { useEffect, useMemo, useRef, useState } from "react";
import SearchableSelect from "../components/SearchableSelect";
import PageLoader from "../components/PageLoader";
import {
  Mic,
  Settings,
  Hash,
  FolderTree,
  Radio,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";

import API_BASE from "../config/api";

const DEFAULT_TEMP_VOICE = {
  enabled: false,
  entries: [
    {
      id: `tempvc_${Date.now()}_0`,
      name: "Main Temp Voice",
      joinChannelId: "",
      categoryId: "",
      interfaceChannelId: "",
      panelMessageId: "",
      nameFormat: "{username}'s Room",
      userLimit: 0,
      bitrate: 64000,
      enabled: true,
    },
  ],
};

function normalizeTemporaryVoiceEntry(entry = {}, index = 0) {
  return {
    id:
      typeof entry?.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `tempvc_${Date.now()}_${index}`,

    name:
      typeof entry?.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : `Temp Voice Setup ${index + 1}`,

    joinChannelId:
      typeof entry?.joinChannelId === "string" ? entry.joinChannelId : "",

    categoryId:
      typeof entry?.categoryId === "string" ? entry.categoryId : "",

    interfaceChannelId:
      typeof entry?.interfaceChannelId === "string"
        ? entry.interfaceChannelId
        : "",

    panelMessageId:
      typeof entry?.panelMessageId === "string" ? entry.panelMessageId : "",

    nameFormat:
      typeof entry?.nameFormat === "string" && entry.nameFormat.trim()
        ? entry.nameFormat
        : "{username}'s Room",

    userLimit:
      typeof entry?.userLimit === "number" && entry.userLimit >= 0
        ? entry.userLimit
        : 0,

    bitrate:
      typeof entry?.bitrate === "number" && entry.bitrate >= 8000
        ? entry.bitrate
        : 64000,

    enabled: entry?.enabled ?? true,
  };
}

function normalizeTemporaryVoicePayload(payload = {}) {
  const rawEntries = Array.isArray(payload?.entries) ? payload.entries : [];

  return {
    enabled: payload?.enabled ?? false,
    isPremium: payload?.isPremium ?? false,
    plan: payload?.plan || "free",
    entries:
      rawEntries.length > 0
        ? rawEntries.map((entry, index) =>
            normalizeTemporaryVoiceEntry(entry, index)
          )
        : [
            normalizeTemporaryVoiceEntry(
              {
                name: "Main Temp Voice",
              },
              0
            ),
          ],
  };
}

function TemporaryVoicePage({ selectedGuild, setGlobalToast }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tempVoice, setTempVoice] = useState(DEFAULT_TEMP_VOICE);
  const [selectedEntryId, setSelectedEntryId] = useState("");

  const initialStateRef = useRef(null);

  useEffect(() => {
    if (!selectedGuild?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setSaveMessage("");

      try {
        const [tvRes, channelsRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/temporary-voice`),
          fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`),
          fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/categories`),
        ]);

        const [tvData, channelsData, categoriesData] = await Promise.all([
          tvRes.json(),
          channelsRes.json(),
          categoriesRes.json(),
        ]);

        const normalized = normalizeTemporaryVoicePayload(
          tvData?.temporaryVoice || {}
        );

        setTempVoice(normalized);
        setChannels(Array.isArray(channelsData?.channels) ? channelsData.channels : []);
        setCategories(
          Array.isArray(categoriesData?.categories) ? categoriesData.categories : []
        );

        initialStateRef.current = JSON.stringify(normalized);
        setHasChanges(false);
      } catch (error) {
        console.error("Failed to load temporary voice settings:", error);
        setSaveMessage("❌ Failed to load temporary voice settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedGuild?.id]);

useEffect(() => {
  if (!tempVoice?.entries?.length) return;

  const stillExists = tempVoice.entries.some((e) => e.id === selectedEntryId);

  if (!selectedEntryId || !stillExists) {
    setSelectedEntryId(tempVoice.entries[0].id);
  }
}, [tempVoice.entries, selectedEntryId]);

  useEffect(() => {
    if (!initialStateRef.current || loading) return;
    setHasChanges(JSON.stringify(tempVoice) !== initialStateRef.current);
  }, [tempVoice, loading]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [saveMessage]);

const voiceChannels = useMemo(
  () =>
    channels.filter((c) => {
      const type = String(c.type || "").toLowerCase();

      return (
        c.type === 2 ||
        c.type === "2" ||
        type === "guildvoice" ||
        type === "guild_voice" ||
        type === "voice" ||
        type === "guild voice"
      );
    }),
  [channels]
);

  const textChannels = useMemo(
    () => channels.filter((c) => c.type === 0 || c.type === "GuildText"),
    [channels]
  );
const selectedEntry =
  tempVoice.entries.find((entry) => entry.id === selectedEntryId) ||
  tempVoice.entries[0];

const updateSelectedEntry = (updates) => {
  setTempVoice((prev) => ({
    ...prev,
    entries: prev.entries.map((entry) =>
      entry.id === selectedEntryId ? { ...entry, ...updates } : entry
    ),
  }));
};

const addTempVoiceEntry = () => {
  if (isAtFreeLimit) {
  setGlobalToast?.({
    type: "error",
    title: "Premium Required",
    message:
      "Free servers can create 1 Temporary Voice setup. Upgrade to Kyro Premium for unlimited setups.",
  });
  return;
}
  const newEntry = normalizeTemporaryVoiceEntry(
    {
      id: `tempvc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `Temp Voice Setup ${tempVoice.entries.length + 1}`,
    },
    tempVoice.entries.length
  );

  setTempVoice((prev) => ({
    ...prev,
    entries: [...prev.entries, newEntry],
  }));

  setSelectedEntryId(newEntry.id);
};

const deleteSelectedEntry = () => {
  if (!selectedEntry) return;
  if (tempVoice.entries.length <= 1) return;

  const filtered = tempVoice.entries.filter(
    (entry) => entry.id !== selectedEntry.id
  );

  setTempVoice((prev) => ({
    ...prev,
    entries: filtered,
  }));

  setSelectedEntryId(filtered[0]?.id || "");
};
const selectedJoinChannelName =
  voiceChannels.find((c) => c.id === selectedEntry?.joinChannelId)?.name ||
  "Not selected";

const selectedCategoryName =
  categories.find((c) => c.id === selectedEntry?.categoryId)?.name ||
  "Not selected";

const selectedInterfaceChannelName =
  textChannels.find((c) => c.id === selectedEntry?.interfaceChannelId)?.name ||
  "Not selected";

const previewRoomName = (selectedEntry?.nameFormat || "{username}'s Room")
  .replace(/{username}/gi, "Username")
  .replace(/{displayname}/gi, "Display Name")
  .slice(0, 100);

const isPremium = Boolean(tempVoice?.isPremium);
const FREE_TEMP_VOICE_LIMIT = 1;
const isAtFreeLimit =
  !isPremium && (tempVoice.entries || []).length >= FREE_TEMP_VOICE_LIMIT;

  const saveSettings = async () => {
    if (!selectedGuild?.id) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const payload = normalizeTemporaryVoicePayload(tempVoice);

      const res = await fetch(
        `${API_BASE}/api/guilds/${selectedGuild.id}/temporary-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

    if (!res.ok) {
  if (json?.code === "TEMP_VOICE_LIMIT_REACHED") {
    throw new Error(
      `Free plan supports only ${json.limit || 1} temporary voice setup. Upgrade to Kyro Premium for unlimited setups.`
    );
  }

  throw new Error(json?.error || "Failed to save temporary voice settings");
}

      const saved = normalizeTemporaryVoicePayload(json?.temporaryVoice || payload);

      setTempVoice(saved);
      initialStateRef.current = JSON.stringify(saved);
      setHasChanges(false);
      setSaveMessage("✅ Temporary Voice settings saved successfully.");
    } catch (error) {
      console.error("Failed to save temporary voice settings:", error);
      setGlobalToast?.({
  type: "error",
  title: "Premium Upgrade Required",
  message: error.message,
});

setSaveMessage("");
    } finally {
      setSaving(false);
    }
  };
  const publishPanel = async () => {
    if (!selectedGuild?.id) return;

    setPublishing(true);
    setSaveMessage("");

    try {
     const res = await fetch(
  `${API_BASE}/api/guilds/${selectedGuild.id}/temporary-voice/publish`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entryId: selectedEntryId,
    }),
  }
);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to publish panel");
      }

      const updated = normalizeTemporaryVoicePayload(
        json?.temporaryVoice || tempVoice
      );

      setTempVoice(updated);
      initialStateRef.current = JSON.stringify(updated);
      setHasChanges(false);
      setSaveMessage("✅ Temporary Voice panel published successfully.");
    } catch (error) {
      console.error("Failed to publish temp voice panel:", error);
      setSaveMessage(`❌ ${error.message || "Failed to publish panel."}`);
    } finally {
      setPublishing(false);
    }
  };

  const disableSystem = async () => {
    if (!selectedGuild?.id) return;

    setDisabling(true);
    setSaveMessage("");

    try {
      const res = await fetch(
        `${API_BASE}/api/guilds/${selectedGuild.id}/temporary-voice/disable`,
        {
          method: "POST",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to disable Temporary Voice");
      }

      const updated = normalizeTemporaryVoicePayload(
        json?.temporaryVoice || { ...tempVoice, enabled: false }
      );

      setTempVoice(updated);
      initialStateRef.current = JSON.stringify(updated);
      setHasChanges(false);
      setSaveMessage("✅ Temporary Voice disabled successfully.");
    } catch (error) {
      console.error("Failed to disable temp voice:", error);
      setSaveMessage(`❌ ${error.message || "Failed to disable system."}`);
    } finally {
      setDisabling(false);
    }
  };
  const discardChanges = () => {
    if (!initialStateRef.current) return;

    try {
      const parsed = JSON.parse(initialStateRef.current);
      setTempVoice(normalizeTemporaryVoicePayload(parsed));
      setHasChanges(false);
      setSaveMessage("");
    } catch (error) {
      console.error("Failed to discard temp voice changes:", error);
    }
  };

  if (!selectedGuild) {
    return (
      <div style={pageCard}>
        <h2 style={sectionTitle}>Temporary Voice</h2>
        <p style={sectionText}>
          Select a server from the dashboard first, then open Temporary Voice.
        </p>
      </div>
    );
  }

if (loading) {
  return (
    <PageLoader
      title="Loading temporary voice..."
      subtitle="Preparing channels, categories, interface panel, and room behavior settings."
    />
  );
}

  return (
    <div style={{ width: "100%", maxWidth: "1480px", margin: "0 auto" }}>
      <div style={heroCard}>
        <div style={heroGlowA} />
        <div style={heroGlowB} />

        <div style={pageHeaderRow}>
          <div>
            <div style={eyebrow}>ENGAGEMENT • TEMPORARY VOICE</div>
            <h2 style={{ ...sectionTitle, textAlign: "left", marginBottom: 8 }}>
              Temporary Voice Settings
            </h2>
            <p style={{ ...sectionText, textAlign: "left", margin: 0, maxWidth: 780 }}>
              Let members create private voice rooms automatically, manage the
              control panel channel, and define the default room experience for{" "}
              <strong>{selectedGuild.name}</strong>.
            </p>
          </div>

          <div style={heroStatsWrap}>
            <StatPill
              icon={<Mic size={15} />}
              label="Status"
              value={tempVoice.enabled ? "Enabled" : "Disabled"}
            />
            <StatPill
              icon={<Hash size={15} />}
              label="Join Channel"
              value={selectedJoinChannelName}
            />
            <StatPill
              icon={<FolderTree size={15} />}
              label="Category"
              value={selectedCategoryName}
            />
          </div>
        </div>

        <div style={layoutGrid}>
          <div style={{ display: "grid", gap: 22 }}>
            <InteractiveCard>
  <SectionHeader
    icon={<Mic size={16} />}
    title="Temp Voice Entries"
    subtitle="Create and manage multiple join-to-create voice setups for this server."
  />

  <div style={{ display: "grid", gap: 14 }}>
    <Field label="Selected Entry">
    <SearchableSelect
  options={tempVoice.entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
  }))}
  value={selectedEntryId}
  placeholder="Select temp voice entry"
  searchPlaceholder="Search entries..."
  onChange={(value) => setSelectedEntryId(value)}
  zIndex={9999}
/>
    </Field>

    <Field label="Entry Name">
      <input
        type="text"
        value={selectedEntry?.name || ""}
        onChange={(e) => updateSelectedEntry({ name: e.target.value })}
        placeholder="Main Temp Voice"
        style={inputStyle}
      />
    </Field>

    <div style={actionButtonRow}>
      <button
        type="button"
        onClick={addTempVoiceEntry}
        style={primaryActionButton}
      >
        Add Entry
      </button>

      <button
        type="button"
        onClick={deleteSelectedEntry}
        disabled={tempVoice.entries.length <= 1}
        style={{
          ...dangerActionButton,
          opacity: tempVoice.entries.length <= 1 ? 0.55 : 1,
          cursor: tempVoice.entries.length <= 1 ? "not-allowed" : "pointer",
        }}
      >
        Delete Entry
      </button>
    </div>
  </div>
</InteractiveCard>
            <div style={settingsGrid}>
              <InteractiveCard>
                <div style={settingTitle}>Enable Temporary Voice</div>
                <div style={toggleRow}>
                  <ToggleSwitch
                    checked={tempVoice.enabled}
                    onClick={() =>
                      setTempVoice((prev) => ({
                        ...prev,
                        enabled: !prev.enabled,
                      }))
                    }
                  />
                  <span style={settingHelp}>
                    Turn automatic temporary voice room creation on or off.
                  </span>
                </div>
              </InteractiveCard>

          <InteractiveCard>
  <div style={settingTitle}>Join to Create Channel</div>
<SearchableSelect
  options={voiceChannels}
  value={selectedEntry?.joinChannelId || ""}
  placeholder="Select a voice channel"
  searchPlaceholder="Search voice channels..."
  onChange={(value) => updateSelectedEntry({ joinChannelId: value })}
  formatLabel={(item) => `🔊 ${item.name}`}
  zIndex={9999}
/>
  <p style={settingHelp}>
    Members joining this voice channel will get their own temp room.
  </p>
</InteractiveCard>

             <InteractiveCard>
  <div style={settingTitle}>Voice Category</div>
<SearchableSelect
  options={categories}
  value={selectedEntry?.categoryId || ""}
  placeholder="Select a category"
  searchPlaceholder="Search categories..."
  onChange={(value) => updateSelectedEntry({ categoryId: value })}
  formatLabel={(item) => `📁 ${item.name}`}
  zIndex={9999}
/>
  <p style={settingHelp}>
    Newly created temp rooms will be placed inside this category.
  </p>
</InteractiveCard>
            </div>

            <InteractiveCard>
              <SectionHeader
                icon={<Settings size={16} />}
                title="System Configuration"
                subtitle="Choose where the control panel lives and how rooms behave by default."
              />

              <div style={{ display: "grid", gap: 16 }}>
              <Field label="Interface Panel Channel">
 <SearchableSelect
  options={textChannels}
  value={selectedEntry?.interfaceChannelId || ""}
  placeholder="Select a text channel"
  searchPlaceholder="Search text channels..."
  onChange={(value) => updateSelectedEntry({ interfaceChannelId: value })}
  formatLabel={(item) => `# ${item.name}`}
  zIndex={9999}
/>
  <p style={settingHelp}>
    This is the channel where your temp voice control panel will be sent.
  </p>
</Field>

                <Field label="Room Name Format">
  <input
    type="text"
    value={selectedEntry?.nameFormat || ""}
    onChange={(e) => updateSelectedEntry({ nameFormat: e.target.value })}
    placeholder="{username}'s Room"
    style={inputStyle}
  />
  <p style={settingHelp}>
    Supported variables: <code>{`{username}`}</code> and{" "}
    <code>{`{displayname}`}</code>.
  </p>
</Field>

                <div style={doubleGrid}>
                  <Field label="Default User Limit">
  <input
    type="number"
    min="0"
    max="99"
    value={selectedEntry?.userLimit ?? 0}
    onChange={(e) =>
      updateSelectedEntry({
        userLimit: Math.max(
          0,
          Math.min(99, Number(e.target.value || 0))
        ),
      })
    }
    style={inputStyle}
  />
  <p style={settingHelp}>Use 0 for unlimited.</p>
</Field>

               <Field label="Default Bitrate">
  <input
    type="number"
    min="8000"
    max="384000"
    step="1000"
    value={selectedEntry?.bitrate ?? 64000}
    onChange={(e) =>
      updateSelectedEntry({
        bitrate: Math.max(8000, Number(e.target.value || 64000)),
      })
    }
    style={inputStyle}
  />
  <p style={settingHelp}>
    Example: 64000 = normal quality, higher = better quality.
  </p>
</Field>
                </div>

             <Field label="Stored Panel Message ID">
  <input
    type="text"
    value={selectedEntry?.panelMessageId || ""}
    readOnly
    placeholder="No panel published yet"
    style={{
      ...inputStyle,
      opacity: 0.72,
      cursor: "default",
    }}
  />
  <p style={settingHelp}>
    This is filled automatically after a panel is published.
  </p>
</Field>
                                <div style={actionButtonRow}>
                <button
  type="button"
  onClick={publishPanel}
  disabled={
    publishing ||
    !tempVoice.enabled ||
    !selectedEntry?.interfaceChannelId
  }
  style={{
    ...primaryActionButton,
    opacity:
      publishing || !tempVoice.enabled || !selectedEntry?.interfaceChannelId
        ? 0.6
        : 1,
    cursor:
      publishing || !tempVoice.enabled || !selectedEntry?.interfaceChannelId
        ? "not-allowed"
        : "pointer",
  }}
>
  {publishing ? "Publishing..." : "Send Panel"}
</button>

                  <button
                    type="button"
                    onClick={disableSystem}
                    disabled={disabling}
                    style={{
                      ...dangerActionButton,
                      opacity: disabling ? 0.6 : 1,
                      cursor: disabling ? "not-allowed" : "pointer",
                    }}
                  >
                    {disabling ? "Disabling..." : "Disable System"}
                  </button>
                </div>
              </div>
            </InteractiveCard>

            {saveMessage && <div style={saveBox}>{saveMessage}</div>}
          </div>

          <InteractiveCard>
            <SectionHeader
              icon={<Sparkles size={16} />}
              title="Live Preview"
              subtitle="Preview how the temp voice setup will look conceptually inside Discord."
            />

            <div style={previewStack}>
              <div style={previewBlock}>
                <div style={previewBlockTitle}>
                  <Radio size={15} />
                  Join to Create
                </div>
                <div style={discordChannelMock}>
                  <Volume2 size={15} />
                  <span>
                    {tempVoice.joinChannelId
                      ? selectedJoinChannelName
                      : "Join to Create"}
                  </span>
                </div>
              </div>

              <div style={previewArrow}>↓</div>

              <div style={previewBlock}>
                <div style={previewBlockTitle}>
                  <FolderTree size={15} />
                  Created Room
                </div>
                <div style={discordVoiceCard}>
                  <div style={discordVoiceName}>{previewRoomName || "Qasir's Room"}</div>
                  <div style={discordVoiceMeta}>
                    <span>
                      <Users size={13} style={{ marginRight: 6 }} />
                      Limit: {tempVoice.userLimit || "Unlimited"}
                    </span>
                    <span>Bitrate: {tempVoice.bitrate}</span>
                  </div>
                  <div style={discordVoiceSub}>
                    Category: {tempVoice.categoryId ? selectedCategoryName : "Not selected"}
                  </div>
                </div>
              </div>

              <div style={previewArrow}>↓</div>

              <div style={previewBlock}>
                <div style={previewBlockTitle}>
                  <Hash size={15} />
                  Interface Panel
                </div>
                <div style={discordPanelCard}>
                  <div style={discordPanelHeader}>
                    {tempVoice.interfaceChannelId
                      ? `#${selectedInterfaceChannelName}`
                      : "#temp-voice-control"}
                  </div>
                  <div style={discordPanelBody}>
                    <div style={discordPanelTitle}>🎙️ Temporary Voice Interface</div>
                    <div style={discordPanelText}>
                      Members can rename, lock, hide, set limit, set status, and claim
                      ownership through the panel.
                    </div>

                    <div style={mockDropdown}>Change channel settings</div>
                    <div style={mockDropdown}>Change channel permissions</div>
                  </div>
                </div>
              </div>
            </div>
          </InteractiveCard>
        </div>
      </div>

      {hasChanges && (
        <div style={stickySaveBar}>
          <div>
            <div style={stickySaveTitle}>You have unsaved changes</div>
            <div style={stickySaveText}>
              Save your temporary voice settings or discard the recent edits.
            </div>
          </div>

          <div style={stickySaveActions}>
            <button
              type="button"
              onClick={discardChanges}
              style={stickyDiscardButton}
              disabled={saving}
            >
              Discard
            </button>

            <button
              type="button"
              onClick={saveSettings}
              style={{
                ...stickySaveButton,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractiveCard({ children }) {
  return (
    <div
      style={settingCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 18px 40px rgba(59,130,246,0.12)";
        e.currentTarget.style.border = "1px solid rgba(88,101,242,0.24)";
        e.currentTarget.style.zIndex = "50";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.12)";
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";

        if (!e.currentTarget.contains(document.activeElement)) {
          e.currentTarget.style.zIndex = "1";
        }
      }}
      onFocusCapture={(e) => {
        e.currentTarget.style.zIndex = "50";
        e.currentTarget.style.border = "1px solid rgba(88,101,242,0.24)";
      }}
      onBlurCapture={(e) => {
        const nextFocused = e.relatedTarget;

        if (!nextFocused || !e.currentTarget.contains(nextFocused)) {
          e.currentTarget.style.zIndex = "1";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.12)";
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
        }
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={miniLabel}>{label}</div>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionHeaderTitleRow}>
        <div style={sectionHeaderIcon}>{icon}</div>
        <div style={sectionHeaderTitle}>{title}</div>
      </div>
      {subtitle ? <div style={sectionHeaderSubtitle}>{subtitle}</div> : null}
    </div>
  );
}

function StatPill({ icon, label, value }) {
  return (
    <div style={statPill}>
      <div style={statPillIcon}>{icon}</div>
      <div>
        <div style={statPillLabel}>{label}</div>
        <div style={statPillValue}>{value}</div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...toggleButton,
        justifyContent: checked ? "flex-end" : "flex-start",
        background: checked
          ? "linear-gradient(135deg, #3b82f6, #7c3aed)"
          : "rgba(255,255,255,0.08)",
        boxShadow: checked
          ? "0 0 0 1px rgba(88,101,242,0.18), 0 8px 22px rgba(88,101,242,0.28)"
          : "none",
      }}
    >
      <div style={toggleCircle} />
    </button>
  );
}


const sectionTitle = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "800",
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
};

const sectionText = {
  color: "rgba(255,255,255,0.72)",
  fontSize: "15px",
  lineHeight: "1.7",
};

const pageCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "22px",
  padding: "28px",
  backdropFilter: "blur(10px)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  overflow: "visible",
};

const heroCard = {
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "26px",
  padding: "28px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
};

const heroGlowA = {
  position: "absolute",
  top: -80,
  right: -40,
  width: 240,
  height: 240,
  borderRadius: "50%",
  background: "rgba(59,130,246,0.14)",
  filter: "blur(45px)",
  pointerEvents: "none",
};

const heroGlowB = {
  position: "absolute",
  bottom: -80,
  left: -40,
  width: 220,
  height: 220,
  borderRadius: "50%",
  background: "rgba(124,58,237,0.12)",
  filter: "blur(55px)",
  pointerEvents: "none",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(147,197,253,0.88)",
  marginBottom: 10,
};

const pageHeaderRow = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const heroStatsWrap = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const statPill = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
};

const statPillIcon = {
  width: 32,
  height: 32,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(88,101,242,0.14)",
  color: "#c7d2fe",
};

const statPillLabel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.48)",
};

const statPillValue = {
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  maxWidth: 180,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const layoutGrid = {
  position: "relative",
  zIndex: 2,
  display: "grid",
  gridTemplateColumns: "1.18fr 0.82fr",
  gap: "22px",
  alignItems: "start",
};

const settingsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "22px",
};

const doubleGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const settingCard = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
  transition: "all 0.22s ease",
  overflow: "visible",
  position: "relative",
  zIndex: 1,
  backdropFilter: "blur(12px)",
};

const settingTitle = {
  fontSize: "16px",
  fontWeight: "700",
  marginBottom: "12px",
};

const settingHelp = {
  margin: "10px 0 0 0",
  color: "rgba(255,255,255,0.68)",
  fontSize: "13px",
  lineHeight: "1.5",
};

const sectionHeaderTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const sectionHeaderIcon = {
  width: 30,
  height: 30,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(88,101,242,0.14)",
  color: "#c7d2fe",
};

const sectionHeaderTitle = {
  fontSize: 17,
  fontWeight: 800,
  color: "#fff",
};

const sectionHeaderSubtitle = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.62)",
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
};

const toggleRow = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const toggleButton = {
  width: "56px",
  height: "30px",
  borderRadius: "999px",
  border: "none",
  display: "flex",
  alignItems: "center",
  padding: "4px",
  cursor: "pointer",
  transition: "0.2s",
  flexShrink: 0,
};

const toggleCircle = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#ffffff",
};

const saveBox = {
  marginTop: "18px",
  padding: "14px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: "14px",
  fontWeight: "600",
};

const dropdownWrap = {
  position: "relative",
  width: "100%",
};

const dropdownButton = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

const dropdownArrow = {
  fontSize: "11px",
  opacity: 0.8,
};

const dropdownItem = (selected) => ({
  width: "100%",
  textAlign: "left",
  background: selected
    ? "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(124,58,237,0.35))"
    : "transparent",
  color: "white",
  border: selected
    ? "1px solid rgba(88,101,242,0.4)"
    : "1px solid transparent",
  borderRadius: "10px",
  padding: "10px 12px",
  cursor: "pointer",
  fontSize: "14px",
  marginBottom: "4px",
  transition: "all 0.18s ease",
});

const miniLabel = {
  fontSize: "12px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.65)",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const previewStack = {
  display: "grid",
  gap: 14,
};

const previewBlock = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 16,
};

const previewBlockTitle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
  marginBottom: 12,
};

const previewArrow = {
  textAlign: "center",
  fontSize: 22,
  color: "rgba(255,255,255,0.45)",
};

const discordChannelMock = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#1f2430",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#dbdee1",
  fontSize: 14,
};

const discordVoiceCard = {
  padding: 14,
  borderRadius: 14,
  background: "#2b2d31",
  border: "1px solid rgba(255,255,255,0.06)",
};

const discordVoiceName = {
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  marginBottom: 8,
};

const discordVoiceMeta = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  fontSize: 13,
  color: "#c9d1d9",
  marginBottom: 8,
};

const discordVoiceSub = {
  fontSize: 12,
  color: "rgba(255,255,255,0.6)",
};

const discordPanelCard = {
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "#1e1f22",
};

const discordPanelHeader = {
  padding: "12px 14px",
  background: "#2b2d31",
  color: "#c9d1d9",
  fontSize: 13,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const discordPanelBody = {
  padding: 14,
};

const discordPanelTitle = {
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  marginBottom: 8,
};

const discordPanelText = {
  fontSize: 13,
  lineHeight: 1.55,
  color: "#c9d1d9",
  marginBottom: 14,
};

const mockDropdown = {
  width: "100%",
  background: "rgba(88,101,242,0.12)",
  border: "1px solid rgba(88,101,242,0.28)",
  color: "#fff",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 13,
  marginBottom: 10,
};

const stickySaveBar = {
  position: "fixed",
  left: "50%",
  bottom: "20px",
  transform: "translateX(-50%)",
  width: "min(760px, calc(100vw - 32px))",
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(8, 15, 30, 0.96)",
  border: "1px solid rgba(88, 101, 242, 0.24)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  backdropFilter: "blur(10px)",
  zIndex: 999999,
};

const stickySaveTitle = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
  marginBottom: "4px",
};

const stickySaveText = {
  fontSize: "13px",
  color: "rgba(255,255,255,0.68)",
  lineHeight: "1.5",
};

const stickySaveActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const stickyDiscardButton = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

const stickySaveButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(59,130,246,0.35)",
};
const actionButtonRow = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const primaryActionButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: "700",
  boxShadow: "0 8px 20px rgba(59,130,246,0.30)",
  cursor: "pointer",
};

const dangerActionButton = {
  border: "1px solid rgba(239,68,68,0.28)",
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
};
export default TemporaryVoicePage;