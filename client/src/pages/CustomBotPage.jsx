import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Paintbrush,
  Power,
  Save,
  Sparkles,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";

import API_BASE from "../config/api";

export default function CustomBotPage({ selectedGuild, setGlobalToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

const [form, setForm] = useState({
  botToken: "",
  botClientId: "",
  name: "",
  avatar: "",
  banner: "",
  bannerType: "image",
  enabled: false,
  activityType: "Listening to",
  activityText: "/help",
  status: "online",
});

  const inviteUrl = useMemo(() => {
    if (!form.botClientId?.trim()) return "";
    return `https://discord.com/oauth2/authorize?client_id=${form.botClientId.trim()}&permissions=8&scope=bot%20applications.commands`;
  }, [form.botClientId]);

  const statusInfo = useMemo(() => {
    const map = {
      online: { label: "Online", color: "#22c55e" },
      idle: { label: "Idle", color: "#f59e0b" },
      dnd: { label: "Do Not Disturb", color: "#ef4444" },
      invisible: { label: "Invisible", color: "#6b7280" },
    };

    return map[form.status] || map.online;
  }, [form.status]);

  useEffect(() => {
    if (!selectedGuild?.id) return;
    fetchData();
  }, [selectedGuild?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/guilds/${selectedGuild.id}/custom-bot`
      );

      if (res.data?.customBot) {
      setForm({
  botToken: data.botToken || "",
  botClientId: data.botClientId || "",
  name: data.name || "",
  avatar: data.avatar || "",
  banner: data.banner || "",
  bannerType: data.bannerType || "image",
  enabled: data.enabled || false,
  activityType: data.activityType || "Listening to",
  activityText: data.activityText || "/help",
  status: data.status || "online",
});
      }
    } catch (error) {
      console.error("Fetch custom bot error:", error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to load custom bot settings.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomBot(enabledValue) {
    await axios.post(`${API_BASE}/api/guilds/${selectedGuild.id}/custom-bot`, {
      ...form,
      enabled: enabledValue,
      status: form.status || "online",
    });

    setForm((prev) => ({ ...prev, enabled: enabledValue }));
  }

  async function handleEnablePersonalizer() {
    if (!form.botToken?.trim()) {
      setGlobalToast?.({ type: "error", message: "Bot token is required." });
      return;
    }

    if (!form.botClientId?.trim()) {
      setGlobalToast?.({
        type: "error",
        message: "Client ID is required to open the Discord invite.",
      });
      return;
    }

    try {
      if (inviteUrl) window.open(inviteUrl, "_blank");

      setSaving(true);
      await saveCustomBot(true);

      setShowToken(false);
      setModalOpen(false);

      setGlobalToast?.({
        type: "success",
        message: "Bot personalizer enabled. Complete the Discord invite.",
      });
    } catch (error) {
      console.error("Enable custom bot error:", error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to enable bot personalizer.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChanges() {
    if (!form.botToken?.trim()) {
      setGlobalToast?.({ type: "error", message: "Bot token is required." });
      return;
    }

    try {
      setSaving(true);
      await saveCustomBot(form.enabled);
      setShowToken(false);

      setGlobalToast?.({
        type: "success",
        message: "Custom bot changes saved.",
      });
    } catch (error) {
      console.error("Save custom bot error:", error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to save custom bot changes.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    try {
      setSaving(true);
      await saveCustomBot(false);

      setGlobalToast?.({
        type: "success",
        message: "Bot personalizer disabled.",
      });
    } catch (error) {
      console.error("Disable custom bot error:", error);
      setGlobalToast?.({
        type: "error",
        message: "Failed to disable bot personalizer.",
      });
    } finally {
      setSaving(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setGlobalToast?.({
        type: "error",
        message: "Please upload a valid image file.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("avatar", reader.result);
      setGlobalToast?.({
        type: "success",
        message: "Avatar uploaded. Save to apply it.",
      });
    };
    reader.readAsDataURL(file);
  }

function handleBannerUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setGlobalToast?.({
      type: "error",
      message: "Please upload a valid banner image.",
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    updateField("banner", reader.result);
    updateField("bannerType", "image");

    setGlobalToast?.({
      type: "success",
      message: "Banner uploaded. Save to apply it.",
    });
  };

  reader.readAsDataURL(file);
}

  if (!selectedGuild) {
    return (
      <div style={styles.emptyState}>
        <Bot size={34} />
        <h2>Select a server first</h2>
        <p>Choose a server to configure bot personalizer.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <style>{spinnerCss}</style>
        <div style={styles.loadingCard}>
          <Loader2 size={34} style={styles.spinIcon} />
          <h2>Loading Bot Personalizer</h2>
          <p>Preparing your branded bot setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{spinnerCss}</style>

      <div style={styles.hero}>
        <div>
          <div style={styles.badge}>
            <Sparkles size={15} />
            Pro Bot Personalizer
          </div>
          <h1 style={styles.title}>Bot Personalizer</h1>
          <p style={styles.subtitle}>
            Give your server a branded bot experience with a custom name,
            avatar, status, activity, and dedicated bot identity.
          </p>
        </div>

        {form.enabled ? (
          <button onClick={handleDisable} disabled={saving} style={styles.dangerButton}>
            {saving ? <Loader2 size={18} style={styles.spinIcon} /> : <Power size={18} />}
            {saving ? "Disabling..." : "Disable Personalizer"}
          </button>
        ) : (
          <button onClick={() => setModalOpen(true)} disabled={saving} style={styles.saveButton}>
            {saving ? <Loader2 size={18} style={styles.spinIcon} /> : <Sparkles size={18} />}
            Enable Bot Personalizer
          </button>
        )}
      </div>

      <div style={styles.statusCard}>
        <div style={styles.statusLeft}>
          <div style={styles.bigBotIcon}>
            {form.avatar ? <img src={form.avatar} alt="" style={styles.previewImg} /> : <Bot size={34} />}
          </div>
          <div>
            <h2 style={styles.statusTitle}>
              {form.enabled ? "Bot Personalizer is enabled" : "Bot Personalizer is disabled"}
            </h2>
            <p style={styles.statusText}>
              {form.enabled
                ? `Your custom bot is saved with ${statusInfo.label} status.`
                : "Enable the personalizer to connect and invite a custom Discord bot."}
            </p>
          </div>
        </div>

        <div
          style={{
            ...styles.statusPill,
            color: form.enabled ? "#bbf7d0" : "#fecaca",
            background: form.enabled ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)",
            border: form.enabled ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(248,113,113,0.28)",
          }}
        >
          <CheckCircle2 size={16} />
          {form.enabled ? "Enabled" : "Not enabled"}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconBox}>
              <Paintbrush size={22} />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Basics</h2>
              <p style={styles.cardText}>Customize what your community sees.</p>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Bot Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Example: Server Assistant"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Avatar URL</label>
            <input
              type="text"
              value={form.avatar}
              onChange={(e) => updateField("avatar", e.target.value)}
              placeholder="https://..."
              style={styles.input}
            />

            <label style={styles.uploadButton}>
              <Upload size={16} />
              Upload avatar from device
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
            </label>
          </div>
{/* Banner feature hidden for now to avoid confusion with Discord profile banners */}
          <div style={styles.field}>
            <label style={styles.label}>Activity Type</label>
<SearchableSelect
  options={[
    { id: "Playing", name: "Playing" },
    { id: "Listening to", name: "Listening to" },
    { id: "Watching", name: "Watching" },
    { id: "Competing in", name: "Competing in" },
  ]}
  value={form.activityType}
  onChange={(val) => updateField("activityType", val)}
  placeholder="Select activity type..."
/>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Activity Text</label>
            <input
              type="text"
              value={form.activityText}
              onChange={(e) => updateField("activityText", e.target.value)}
              placeholder="Example: /help"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Bot Status</label>
<SearchableSelect
  options={[
    { id: "online", name: "🟢 Online" },
    { id: "idle", name: "🟡 Idle" },
    { id: "dnd", name: "🔴 Do Not Disturb" },
    { id: "invisible", name: "⚫ Invisible" },
  ]}
  value={form.status || "online"}
  onChange={(val) => {
    updateField("status", val || "online");
  }}
  placeholder="Select bot status..."
/>
          </div>

          <button onClick={handleSaveChanges} disabled={saving} style={styles.secondarySaveButton}>
            {saving ? <Loader2 size={18} style={styles.spinIcon} /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div style={styles.previewCard}>
          <div style={styles.previewTop}>
            <span style={styles.previewSmall}>Member list preview</span>
            <span style={styles.discordTag}>Discord Preview</span>
          </div>

          <div style={styles.memberPreview}>
            <div style={styles.memberAvatar}>
              {form.avatar ? <img src={form.avatar} alt="" style={styles.previewImg} /> : <Bot size={26} />}
              <span style={{ ...styles.onlineDot, background: statusInfo.color }} />
            </div>
            <div>
              <div style={styles.memberName}>
                {form.name || "Custom Bot"}
                <span style={styles.botBadge}>APP</span>
              </div>
              <p style={styles.memberSub}>
                {form.activityType} {form.activityText || "/help"} • {statusInfo.label}
              </p>
            </div>
          </div>

          <div style={styles.profilePreview}>
            <div
  style={{
    ...styles.profileBanner,
    background: form.banner
      ? `url(${form.banner}) center/cover no-repeat`
      : "linear-gradient(135deg, #5865f2, #8b5cf6)",
  }}
/>
            <div style={styles.profileAvatar}>
              {form.avatar ? <img src={form.avatar} alt="" style={styles.previewImg} /> : <Bot size={36} />}
              <span style={{ ...styles.profileOnlineDot, background: statusInfo.color }} />
            </div>

            <div style={styles.profileBody}>
              <h3 style={styles.profileName}>{form.name || "Custom Bot"}</h3>
              <p style={styles.profileTag}>Custom bot experience</p>

              <div style={styles.activityBox}>
                <span>{form.activityType || "Listening to"}</span>
                <strong>{form.activityText || "/help"}</strong>
                <small style={styles.statusSmall}>{statusInfo.label}</small>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.sideCard}>
          <div style={styles.statusPill}>
            <Lock size={16} />
            Pro Feature
          </div>

          <h2 style={styles.sideTitle}>Setup Guide</h2>

          <div style={styles.steps}>
            <div style={styles.step}><span>1</span> Paste your custom bot token.</div>
            <div style={styles.step}><span>2</span> Add Client ID so Kyro can open the Discord invite.</div>
            <div style={styles.step}><span>3</span> Choose activity/status and save changes.</div>
          </div>

          <p style={styles.sideText}>
            Discord may take a few minutes to visually refresh avatar or username changes.
          </p>
        </div>
      </div>

      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <button onClick={() => setModalOpen(false)} style={styles.closeButton}>
              <X size={18} />
            </button>

            <div style={styles.modalIcon}><Bot size={30} /></div>

            <h2 style={styles.modalTitle}>Enable Bot Personalizer</h2>
            <p style={styles.modalText}>
              Add your custom bot token and client ID. Kyro will save the setup and open the Discord invite window.
            </p>

            <div style={styles.field}>
              <label style={styles.label}>Bot Token</label>
              <div style={styles.passwordWrap}>
                <input
                  type={showToken ? "text" : "password"}
                  value={showToken ? form.botToken : form.botToken ? "••••••••••••••••••••" : ""}
                  onChange={(e) => updateField("botToken", e.target.value)}
                  placeholder="Paste custom bot token"
                  style={styles.input}
                />
                <button type="button" onClick={() => setShowToken((v) => !v)} style={styles.eyeButton}>
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Client ID</label>
              <input
                type="text"
                value={form.botClientId}
                onChange={(e) => updateField("botClientId", e.target.value)}
                placeholder="Discord application client ID"
                style={styles.input}
              />
              <p style={styles.helpText}>Required to open the Discord invite window.</p>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setModalOpen(false)} style={styles.cancelButton}>Cancel</button>

              <button
                onClick={handleEnablePersonalizer}
                disabled={saving}
                style={{ ...styles.saveButton, opacity: saving ? 0.72 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? <Loader2 size={18} style={styles.spinIcon} /> : <ExternalLink size={18} />}
                {saving ? "Enabling..." : "Enable Personalizer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const spinnerCss = `
@keyframes kyroSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
const styles = {
  page: { padding: "28px", color: "#fff" },
  spinIcon: { animation: "kyroSpin 0.9s linear infinite" },
  hero: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "22px" },
  badge: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "999px", background: "rgba(91, 124, 250, 0.12)", border: "1px solid rgba(91, 124, 250, 0.35)", color: "#b7c5ff", fontSize: "13px", fontWeight: 800, marginBottom: "12px" },
  title: { margin: 0, fontSize: "36px", fontWeight: 950, letterSpacing: "-0.05em" },
  subtitle: { margin: "10px 0 0", color: "rgba(255,255,255,0.62)", maxWidth: "760px", lineHeight: 1.6 },

  saveButton: { border: "1px solid rgba(139,92,246,0.45)", background: "linear-gradient(135deg, #5b7cfa, #8b5cf6)", color: "#fff", borderRadius: "14px", padding: "13px 18px", fontWeight: 850, display: "inline-flex", alignItems: "center", gap: "9px", boxShadow: "0 18px 45px rgba(91, 124, 250, 0.25)", cursor: "pointer" },
  secondarySaveButton: { border: "1px solid rgba(91,124,250,0.35)", background: "rgba(91,124,250,0.1)", color: "#c7d2fe", borderRadius: "14px", padding: "12px 16px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "9px", cursor: "pointer" },
  dangerButton: { border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fecaca", borderRadius: "14px", padding: "13px 18px", fontWeight: 850, display: "inline-flex", alignItems: "center", gap: "9px", cursor: "pointer" },

  statusCard: { marginBottom: "18px", padding: "18px", borderRadius: "24px", background: "linear-gradient(180deg, rgba(16, 26, 51, 0.88), rgba(8, 14, 31, 0.92))", border: "1px solid rgba(148, 163, 184, 0.16)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px" },
  statusLeft: { display: "flex", alignItems: "center", gap: "14px" },
  bigBotIcon: { width: "58px", height: "58px", borderRadius: "20px", overflow: "hidden", display: "grid", placeItems: "center", background: "linear-gradient(135deg, rgba(91,124,250,0.3), rgba(139,92,246,0.2))", border: "1px solid rgba(255,255,255,0.14)", color: "#c7d2fe" },
  statusTitle: { margin: 0, fontSize: "18px", fontWeight: 900 },
  statusText: { margin: "5px 0 0", color: "rgba(255,255,255,0.58)", fontSize: "13px" },

  grid: { display: "grid", gridTemplateColumns: "1fr 1.15fr 340px", gap: "18px", alignItems: "stretch" },
  card: { borderRadius: "24px", padding: "22px", background: "linear-gradient(180deg, rgba(16, 26, 51, 0.88), rgba(8, 14, 31, 0.92))", border: "1px solid rgba(148, 163, 184, 0.16)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)" },
  previewCard: { borderRadius: "24px", padding: "22px", background: "radial-gradient(circle at top left, rgba(91,124,250,0.22), transparent 32%), linear-gradient(180deg, rgba(16, 26, 51, 0.9), rgba(8, 14, 31, 0.95))", border: "1px solid rgba(91, 124, 250, 0.22)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)" },
  sideCard: { borderRadius: "24px", padding: "22px", background: "radial-gradient(circle at top, rgba(91,124,250,0.28), transparent 38%), linear-gradient(180deg, rgba(16, 26, 51, 0.9), rgba(8, 14, 31, 0.95))", border: "1px solid rgba(91, 124, 250, 0.25)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)" },

  cardHeader: { display: "flex", gap: "14px", alignItems: "center", marginBottom: "20px" },
  iconBox: { width: "46px", height: "46px", borderRadius: "16px", display: "grid", placeItems: "center", background: "rgba(91,124,250,0.14)", border: "1px solid rgba(91,124,250,0.28)", color: "#b7c5ff" },
  cardTitle: { margin: 0, fontSize: "18px", fontWeight: 850 },
  cardText: { margin: "5px 0 0", color: "rgba(255,255,255,0.58)", fontSize: "13px", lineHeight: 1.5 },

  field: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: 800, color: "rgba(255,255,255,0.82)", marginBottom: "8px" },
  helpText: { margin: "8px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px", lineHeight: 1.5 },

  input: { width: "100%", height: "46px", borderRadius: "14px", border: "1px solid rgba(148, 163, 184, 0.18)", background: "rgba(3, 7, 18, 0.45)", color: "#fff", padding: "0 14px", outline: "none", fontSize: "14px", boxSizing: "border-box" },

  select: {
    width: "100%",
    height: "46px",
    borderRadius: "14px",
    border: "1px solid rgba(91,124,250,0.28)",
    background: "linear-gradient(180deg, rgba(10,16,34,0.96), rgba(3,7,18,0.92))",
    color: "#fff",
    padding: "0 14px",
    outline: "none",
    fontSize: "14px",
    fontWeight: 700,
    boxSizing: "border-box",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 25px rgba(0,0,0,0.18)",
  },

  passwordWrap: { position: "relative" },
  eyeButton: { position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "0", background: "transparent", color: "rgba(255,255,255,0.62)", cursor: "pointer" },
  uploadButton: { marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(91,124,250,0.35)", background: "rgba(91,124,250,0.08)", color: "#c7d2fe", fontSize: "13px", fontWeight: 700, cursor: "pointer" },

  previewTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  previewSmall: { color: "#c7d2fe", fontSize: "13px", fontWeight: 850 },
  discordTag: { color: "rgba(255,255,255,0.45)", fontSize: "12px", fontWeight: 750 },

  memberPreview: { padding: "16px", borderRadius: "16px", background: "rgba(49,51,56,0.95)", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  memberAvatar: { position: "relative", width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", background: "#111827", color: "#c7d2fe" },
  onlineDot: { position: "absolute", right: "0", bottom: "0", width: "12px", height: "12px", borderRadius: "999px", background: "#22c55e", border: "2px solid #313338" },
  memberName: { display: "flex", gap: "7px", alignItems: "center", fontSize: "15px", fontWeight: 900 },
  memberSub: { margin: "3px 0 0", color: "#b5bac1", fontSize: "12px" },
  botBadge: { fontSize: "10px", padding: "2px 5px", borderRadius: "4px", background: "#5865f2", color: "#fff", fontWeight: 900 },

  profilePreview: { borderRadius: "18px", overflow: "hidden", background: "#313338", border: "1px solid rgba(255,255,255,0.08)" },
  profileBanner: {
  height: "176px",
  background: "linear-gradient(135deg, #5865f2, #8b5cf6)",
  backgroundSize: "cover",
  backgroundPosition: "center",
},
  profileAvatar: { position: "relative", marginLeft: "18px", marginTop: "-34px", width: "76px", height: "76px", borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", background: "#111827", border: "6px solid #313338", color: "#c7d2fe" },
  profileOnlineDot: { position: "absolute", right: "6px", bottom: "6px", width: "16px", height: "16px", borderRadius: "999px", background: "#22c55e", border: "3px solid #313338" },
  profileBody: { padding: "10px 18px 18px" },
  profileName: { margin: 0, fontSize: "20px", fontWeight: 950 },
  profileTag: { margin: "4px 0 14px", color: "#b5bac1", fontSize: "13px" },
  activityBox: { padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", display: "grid", gap: "5px", color: "#b5bac1", fontSize: "12px" },
  statusSmall: { color: "rgba(255,255,255,0.52)", fontSize: "11px", fontWeight: 800 },

  previewImg: { width: "100%", height: "100%", objectFit: "cover" },
  statusPill: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 11px", borderRadius: "999px", color: "#bbf7d0", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.28)", fontSize: "13px", fontWeight: 800 },

  sideTitle: { fontSize: "23px", margin: "18px 0 14px" },
  sideText: { color: "rgba(255,255,255,0.62)", lineHeight: 1.6, fontSize: "13px", marginTop: "18px" },
  steps: { display: "grid", gap: "10px" },
  step: { display: "flex", alignItems: "center", gap: "10px", color: "rgba(255,255,255,0.78)", fontSize: "13px", padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)", lineHeight: 1.45 },

  modalOverlay: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(2,6,23,0.72)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: "20px" },
  modal: { position: "relative", width: "520px", maxWidth: "96vw", borderRadius: "28px", padding: "30px", background: "radial-gradient(circle at top, rgba(91,124,250,0.25), transparent 36%), linear-gradient(180deg, rgba(16, 26, 51, 0.98), rgba(8, 14, 31, 0.98))", border: "1px solid rgba(91,124,250,0.28)", boxShadow: "0 30px 120px rgba(0,0,0,0.58)" },
  closeButton: { position: "absolute", right: "18px", top: "18px", width: "36px", height: "36px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" },
  modalIcon: { width: "60px", height: "60px", borderRadius: "20px", display: "grid", placeItems: "center", background: "rgba(91,124,250,0.14)", border: "1px solid rgba(91,124,250,0.3)", color: "#c7d2fe", marginBottom: "18px" },
  modalTitle: { margin: 0, fontSize: "26px", fontWeight: 950, letterSpacing: "-0.04em" },
  modalText: { margin: "9px 0 22px", color: "rgba(255,255,255,0.62)", lineHeight: 1.6 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" },
  cancelButton: { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: "14px", padding: "13px 18px", fontWeight: 800, cursor: "pointer" },

  loadingWrap: { minHeight: "520px", display: "grid", placeItems: "center", color: "#fff" },
  loadingCard: { width: "420px", maxWidth: "90%", textAlign: "center", padding: "34px", borderRadius: "26px", background: "linear-gradient(180deg, rgba(16, 26, 51, 0.9), rgba(8, 14, 31, 0.96))", border: "1px solid rgba(91,124,250,0.25)", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" },
  emptyState: { minHeight: "420px", display: "grid", placeItems: "center", textAlign: "center", color: "#fff" },
};