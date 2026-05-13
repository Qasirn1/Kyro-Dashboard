import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageLoader from "../components/PageLoader";
import API_BASE from "../config/api";
import {
  Plus,
  Search,
  FileText,
  Pencil,
  Copy,
  Send,
  RefreshCw,
  Trash2,
} from "lucide-react";

function generatePanelId() {
  return `verif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultEmbed() {
  return {
    id: `embed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    collapsed: false,
    title: "Verify Yourself",
    description: "Click the button below to verify and get access to the server.",
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

export default function VerificationPage({ selectedGuild, guildId, setGlobalToast }) {
  const activeGuildId =
    selectedGuild?.id || selectedGuild?.guildId || guildId || null;

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channels, setChannels] = useState([]);
  const [publishingPanelId, setPublishingPanelId] = useState(null);
const [updatingPanelId, setUpdatingPanelId] = useState(null);
const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [verificationConfig, setVerificationConfig] = useState({
    enabled: false,
    premiumTrial: {
      activatedAt: null,
      expiresAt: null,
      isActive: false,
    },
    panels: [],
  });

  useEffect(() => {
    if (!activeGuildId) {
      setLoading(false);
      return;
    }

    const fetchVerification = async () => {
      try {
        const [verificationRes, channelsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/guilds/${activeGuildId}/verification`),
          axios.get(`${API_BASE}/api/guilds/${activeGuildId}/channels`),
        ]);

        setVerificationConfig({
          enabled: verificationRes.data?.enabled ?? false,
          premiumTrial: {
            activatedAt: verificationRes.data?.premiumTrial?.activatedAt || null,
            expiresAt: verificationRes.data?.premiumTrial?.expiresAt || null,
            isActive: verificationRes.data?.premiumTrial?.isActive ?? false,
          },
          panels: Array.isArray(verificationRes.data?.panels)
            ? verificationRes.data.panels
            : [],
        });

        setChannels(
          Array.isArray(channelsRes.data?.channels) ? channelsRes.data.channels : []
        );
      } catch (error) {
        console.error("Failed to load verification panels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [activeGuildId]);

  const filteredPanels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return verificationConfig.panels;

    return verificationConfig.panels.filter((panel) => {
      return (
        panel.name?.toLowerCase().includes(q) ||
        panel.mode?.toLowerCase().includes(q)
      );
    });
  }, [verificationConfig.panels, search]);

  const getChannelName = (channelId) => {
    if (!channelId) return null;
    return channels.find((c) => c.id === channelId)?.name || null;
  };

  const saveVerificationConfig = async (nextConfig) => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/guilds/${activeGuildId}/verification`,
        nextConfig
      );
      setVerificationConfig(nextConfig);
      return { ok: true, data: res.data };
    } catch (error) {
      console.error("Failed to save verification config:", error);
      console.error("Response data:", error?.response?.data);
      if (setGlobalToast) {
const errorCode = error?.response?.data?.code;

let premiumMessage =
  error?.response?.data?.details ||
  error?.response?.data?.error ||
  "Failed to save verification config.";

if (errorCode === "VERIFICATION_LIMIT_REACHED") {
  premiumMessage =
    `Free plan supports only ${
      error?.response?.data?.limit || 2
    } verification panels. Upgrade to Kyro Premium for unlimited panels.`;
}

if (errorCode === "CAPTCHA_PREMIUM_REQUIRED") {
  premiumMessage =
    "Captcha verification requires Kyro Premium.";
}

setGlobalToast({
  type: "error",
  title: "Premium Upgrade Required",
  message: premiumMessage,
});
}
      return { ok: false, error };
    }
  };

  const refreshVerificationPanels = async () => {
    try {
      const [verificationRes, channelsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/guilds/${activeGuildId}/verification`),
        axios.get(`${API_BASE}/api/guilds/${activeGuildId}/channels`),
      ]);

      setVerificationConfig({
        enabled: verificationRes.data?.enabled ?? false,
        premiumTrial: {
          activatedAt: verificationRes.data?.premiumTrial?.activatedAt || null,
          expiresAt: verificationRes.data?.premiumTrial?.expiresAt || null,
          isActive: verificationRes.data?.premiumTrial?.isActive ?? false,
        },
        panels: Array.isArray(verificationRes.data?.panels)
          ? verificationRes.data.panels
          : [],
      });

      setChannels(
        Array.isArray(channelsRes.data?.channels) ? channelsRes.data.channels : []
      );
    } catch (error) {
      console.error("Failed to refresh verification panels:", error);
    }
  };

  const handleCreatePanel = async () => {
    const firstEmbed = createDefaultEmbed();

    const newPanel = {
      id: generatePanelId(),
      name: `Verification Panel ${verificationConfig.panels.length + 1}`,
      enabled: true,
      mode: "button",
      channelId: null,
      roleId: null,
      logChannelId: null,
      autoKick: {
        enabled: false,
        minutes: 10,
      },
      embed: { ...firstEmbed },
      embeds: [{ ...firstEmbed }],
      interaction: {
        button: {
          label: "Verify",
          style: "Success",
          emoji: "",
        },
        reaction: {
          emoji: "✅",
        },
        captcha: {
          attempts: 3,
          timeout: 60,
        },
      },
      sentPanel: {
        messageId: null,
        channelId: null,
        publishedAt: null,
      },
    };

    const nextConfig = {
      ...verificationConfig,
      panels: [newPanel, ...verificationConfig.panels],
    };

    const result = await saveVerificationConfig(nextConfig);
    if (!result.ok) return;

    window.location.hash = `#/verification-editor/${activeGuildId}/${newPanel.id}`;
  };

  const handleDuplicatePanel = async (panelId) => {
    const panel = verificationConfig.panels.find((p) => p.id === panelId);
    if (!panel) return;

    const duplicate = {
      ...panel,
      id: generatePanelId(),
      name: `${panel.name} Copy`,
      sentPanel: {
        messageId: null,
        channelId: null,
        publishedAt: null,
      },
    };

    const nextConfig = {
      ...verificationConfig,
      panels: [duplicate, ...verificationConfig.panels],
    };

    const result = await saveVerificationConfig(nextConfig);
    if (!result.ok) return;
  };

  const handleDeletePanel = async (panelId) => {
  if (deleteConfirmId !== panelId) {
  setDeleteConfirmId(panelId);
  setGlobalToast?.({
    type: "warning",
    message: "Click Delete again to confirm this verification panel deletion.",
  });
  return;
}

setDeleteConfirmId(null);

    const nextConfig = {
      ...verificationConfig,
      panels: verificationConfig.panels.filter((p) => p.id !== panelId),
    };

    const result = await saveVerificationConfig(nextConfig);
    if (!result.ok) return;
  };

  const handleEditPanel = (panelId) => {
    const targetGuildId = activeGuildId || guildId || selectedGuild?.id;

if (!targetGuildId) {
  setGlobalToast?.({
    type: "error",
    title: "Missing Server",
    message: "Please select a server before editing this verification panel.",
  });
  return;
}

window.location.hash = `#/verification-editor/${targetGuildId}/${panelId}`;
  };

const handlePublishPanel = async (panelId) => {
  try {
    setPublishingPanelId(panelId);

    await axios.post(
      `${API_BASE}/api/guilds/${activeGuildId}/verification/${panelId}/publish?forceNew=true`
    );

    await refreshVerificationPanels();

    setGlobalToast?.({
      type: "success",
      title: "Panel Published",
      message: "Verification panel published successfully.",
    });
  } catch (error) {
    console.error("Failed to publish verification panel:", error);

    setGlobalToast?.({
      type: "error",
      title: "Publish Failed",
      message:
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        "Failed to publish verification panel.",
    });
  } finally {
    setPublishingPanelId(null);
  }
};

const handleUpdatePanel = async (panelId) => {
  try {
    setUpdatingPanelId(panelId);

    await axios.post(
      `${API_BASE}/api/guilds/${activeGuildId}/verification/${panelId}/update-message`
    );

    await refreshVerificationPanels();

    setGlobalToast?.({
      type: "success",
      title: "Panel Updated",
      message: "Verification panel updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update verification panel:", error);

    setGlobalToast?.({
      type: "error",
      title: "Update Failed",
      message:
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        "Failed to update verification panel.",
    });
  } finally {
    setUpdatingPanelId(null);
  }
};

if (loading) {
  return (
    <PageLoader
      title="Loading verification..."
      subtitle="Preparing verification modes, roles, channels, and panel configuration."
    />
  );
}

  return (
    <div
      style={{
        padding: "28px 28px 40px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(17,24,39,0.92))",
          border: "1px solid rgba(88,101,242,0.14)",
          borderRadius: 28,
          padding: "28px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(88,101,242,0.16), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 26,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 38,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Manage Verification Panels
            </h1>
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                color: "rgba(255,255,255,0.76)",
                fontSize: 18,
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              Create and manage button, reaction, or captcha verification panels
              for your server.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 16,
              background: "rgba(88,101,242,0.12)",
              border: "1px solid rgba(88,101,242,0.22)",
              color: "#fff",
              fontWeight: 700,
              minWidth: 130,
              justifyContent: "space-between",
            }}
          >
            <span>Active</span>
            <div
              style={{
                width: 50,
                height: 28,
                borderRadius: 999,
                background: verificationConfig.enabled ? "#5865F2" : "#2a2f3c",
                position: "relative",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onClick={async () => {
                const nextConfig = {
                  ...verificationConfig,
                  enabled: !verificationConfig.enabled,
                };
                await saveVerificationConfig(nextConfig);
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: verificationConfig.enabled ? 25 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
            position: "relative",
            zIndex: 1,
          }}
        >
          <button
            onClick={handleCreatePanel}
            style={createPanelButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 14px 34px rgba(88,101,242,0.24)";
              e.currentTarget.style.border =
                "1px solid rgba(88,101,242,0.44)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 28px rgba(0,0,0,0.22)";
              e.currentTarget.style.border =
                "1px solid rgba(88,101,242,0.32)";
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>
                Create new verification panel
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.62)",
                  marginTop: 6,
                }}
              >
                Start a new verification flow for your server.
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "rgba(88,101,242,0.18)",
                border: "1px solid rgba(88,101,242,0.24)",
                flexShrink: 0,
              }}
            >
              <Plus size={22} />
            </div>
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 18px",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.04)",
              minHeight: 84,
            }}
          >
            <Search size={18} color="rgba(255,255,255,0.55)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search verification panels..."
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 15,
              }}
            />
            <div
              style={{
                minWidth: 64,
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                background: "rgba(88,101,242,0.12)",
                border: "1px solid rgba(88,101,242,0.16)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {verificationConfig.panels.length === 0
                ? "0 panels"
                : `${filteredPanels.length} / ${verificationConfig.panels.length}`}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(4,10,24,0.62)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 24,
            padding: 22,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                Your verification panels
              </h2>
              <div
                style={{
                  marginTop: 8,
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 14,
                }}
              >
                Saved drafts and published verification panels
              </div>
            </div>
          </div>

          {filteredPanels.length === 0 ? (
            <div
              style={{
                padding: "34px 20px",
                borderRadius: 20,
                border: "1px dashed rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.68)",
                textAlign: "center",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              No verification panels yet. Create your first verification panel to
              get started.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredPanels.map((panel) => {
                const isPublished = !!panel?.sentPanel?.messageId;
                const premiumUsed =
                  panel.mode === "captcha" ||
                  panel.autoKick?.enabled ||
                  panel.embed?.header ||
                  panel.embed?.footer ||
                  (Array.isArray(panel.embeds) &&
                    panel.embeds.some(
                      (embed) =>
                        embed?.header ||
                        embed?.footer ||
                        (Array.isArray(embed?.fields) && embed.fields.length > 0)
                    ));

                const isSearchMatch =
                  !!search.trim() &&
                  (panel.name?.toLowerCase().includes(search.trim().toLowerCase()) ||
                    panel.mode?.toLowerCase().includes(search.trim().toLowerCase()));

                const publishedChannelName = getChannelName(panel.sentPanel?.channelId);
                const selectedChannelName = getChannelName(panel.channelId);

                return (
                  <div
                    key={panel.id}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(16,24,43,0.96), rgba(18,27,46,0.9))",
                      border: isSearchMatch
                        ? "1px solid rgba(88,101,242,0.34)"
                        : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 22,
                      padding: 18,
                      boxShadow: isSearchMatch
                        ? "0 0 30px rgba(88,101,242,0.22), 0 10px 30px rgba(0,0,0,0.18)"
                        : "0 10px 30px rgba(0,0,0,0.18)",
                      transition: "all 0.22s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", gap: 14 }}>
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 16,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(88,101,242,0.12)",
                            border: "1px solid rgba(88,101,242,0.2)",
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={22} color="#9db2ff" />
                        </div>

                        <div>
                          <div
                            style={{
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: 18,
                            }}
                          >
                            {panel.name || "Unnamed Verification Panel"}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              color: "rgba(255,255,255,0.66)",
                              fontSize: 14,
                            }}
                          >
                            Mode: {panel.mode || "button"} · Updated verification
                            draft
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "7px 14px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 700,
                          color: isPublished ? "#53f58d" : "#f6c76f",
                          background: isPublished
                            ? "rgba(27, 133, 74, 0.14)"
                            : "rgba(182, 127, 21, 0.14)",
                          border: isPublished
                            ? "1px solid rgba(83,245,141,0.18)"
                            : "1px solid rgba(246,199,111,0.18)",
                        }}
                      >
                        {isPublished ? "Published" : "Draft"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 16,
                        padding: "14px 16px",
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        color: "#fff",
                        lineHeight: 1.7,
                        fontSize: 14,
                      }}
                    >
                      <div>
                        <strong>Channel:</strong>{" "}
                        {isPublished
                          ? publishedChannelName
                            ? `# ${publishedChannelName}`
                            : "Unknown channel"
                          : selectedChannelName
                          ? `# ${selectedChannelName}`
                          : "Not selected"}
                      </div>
                      <div>
                        <strong>Premium Used:</strong>{" "}
                        {premiumUsed ? "Yes" : "No"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        marginTop: 16,
                      }}
                    >
                      <HoverButton
                        onClick={() => handleEditPanel(panel.id)}
                        style={actionButtonStyle()}
                        glow="blue"
                      >
                        <Pencil size={15} />
                        <span>Edit</span>
                      </HoverButton>

                      <HoverButton
                        onClick={() => handleDuplicatePanel(panel.id)}
                        style={actionButtonStyle()}
                        glow="blue"
                      >
                        <Copy size={15} />
                        <span>Duplicate</span>
                      </HoverButton>

                      <HoverButton
  onClick={() => handlePublishPanel(panel.id)}
  style={actionButtonStyle()}
  glow="blue"
  disabled={publishingPanelId === panel.id}
>
  <Send size={15} />
  <span>{publishingPanelId === panel.id ? "Publishing..." : "Publish"}</span>
</HoverButton>

                     <HoverButton
  onClick={() => handleUpdatePanel(panel.id)}
  style={actionButtonStyle()}
  glow="purple"
  disabled={!isPublished || updatingPanelId === panel.id}
>
  <RefreshCw size={15} />
  <span>
    {updatingPanelId === panel.id ? "Updating..." : "Update"}
  </span>
</HoverButton>

                      <HoverButton
                        onClick={() => handleDeletePanel(panel.id)}
                        style={dangerButtonStyle()}
                        glow="red"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </HoverButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HoverButton({
  children,
  onClick,
  style,
  glow = "blue",
  disabled = false,
}) {
  const [hovered, setHovered] = useState(false);

  const glowMap = {
    blue: {
      shadow: "0 10px 28px rgba(88,101,242,0.34)",
      border: "1px solid rgba(88,101,242,0.44)",
      background: "rgba(88,101,242,0.14)",
    },
    purple: {
      shadow: "0 10px 28px rgba(139,92,246,0.34)",
      border: "1px solid rgba(139,92,246,0.42)",
      background: "rgba(139,92,246,0.14)",
    },
    red: {
      shadow: "0 10px 28px rgba(239,68,68,0.28)",
      border: "1px solid rgba(239,68,68,0.36)",
      background: "rgba(160,30,45,0.22)",
    },
  };

  const hoverStyle = glowMap[glow] || glowMap.blue;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...style,
        opacity: disabled ? 0.48 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? hoverStyle.shadow : style.boxShadow,
        border: hovered ? hoverStyle.border : style.border,
        background: hovered ? hoverStyle.background : style.background,
        transition:
          "all 0.22s ease, transform 0.18s ease, box-shadow 0.22s ease",
      }}
    >
      {children}
    </button>
  );
}

const createPanelButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "18px 20px",
  borderRadius: 22,
  border: "1px solid rgba(88,101,242,0.32)",
  background:
    "linear-gradient(135deg, rgba(7,13,29,0.96), rgba(10,18,38,0.92))",
  color: "#fff",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
  transition: "all 0.2s ease",
};

function actionButtonStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    transition: "all 0.2s ease",
    boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
  };
}

function dangerButtonStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,80,80,0.18)",
    background: "rgba(120, 21, 33, 0.16)",
    color: "#ffb3b3",
    cursor: "pointer",
    fontWeight: 700,
    transition: "all 0.2s ease",
    boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
  };
}