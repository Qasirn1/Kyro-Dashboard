import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, Sparkles, Image as ImageIcon, Mail, Shield } from "lucide-react";
import PageLoader from "../components/PageLoader";
import API_BASE from "../config/api";

const DEFAULT_WELCOME = {
  enabled: false,
  channelId: "",
  mode: "embed",
  embed: {
    enabled: true,
    title: "",
    description: "",
    color: "#5865F2",
    footer: "",
    banner: "",
    thumbnail: true,
  },
  card: {
    enabled: true,
    backgroundUrl: "",
    backgroundColor: "#000000",
    textColor: "#ffffff",
    overlayOpacity: 0.45,
    title: "WELCOME",
    subtitle: "{username}",
    showAvatar: true,
  },
  autoRole: {
    enabled: false,
    roleId: "",
    roleIds: [],
  },
  dm: {
    enabled: false,
    mode: "text",
    message: "",
    embed: {
      enabled: true,
      title: "",
      description: "",
      color: "#5865F2",
      footer: "",
      banner: "",
      thumbnail: true,
    },
  },
};

const DEFAULT_GOOBYE = {
  enabled: false,
  channelId: "",
  embed: {
    enabled: true,
    title: "👋 Goodbye {username}",
    description: "",
    color: "#ff4d4d",
    footer: "",
    banner: "",
    thumbnail: true,
  },
};

function normalizeWelcomePayload(payload = {}) {
  const roleIds = Array.isArray(payload?.autoRole?.roleIds)
    ? payload.autoRole.roleIds.filter(Boolean)
    : payload?.autoRole?.roleId
    ? [payload.autoRole.roleId]
    : [];

  const roleId = payload?.autoRole?.roleId || roleIds[0] || "";

  return {
    enabled: payload?.enabled ?? DEFAULT_WELCOME.enabled,
    channelId: payload?.channelId ?? DEFAULT_WELCOME.channelId,
    mode: payload?.mode ?? DEFAULT_WELCOME.mode,
    embed: {
      enabled: payload?.embed?.enabled ?? DEFAULT_WELCOME.embed.enabled,
      title: payload?.embed?.title ?? DEFAULT_WELCOME.embed.title,
      description:
        payload?.embed?.description ?? DEFAULT_WELCOME.embed.description,
      color: payload?.embed?.color ?? DEFAULT_WELCOME.embed.color,
      footer: payload?.embed?.footer ?? DEFAULT_WELCOME.embed.footer,
      banner: payload?.embed?.banner ?? DEFAULT_WELCOME.embed.banner,
      thumbnail: payload?.embed?.thumbnail ?? DEFAULT_WELCOME.embed.thumbnail,
    },
    card: {
      enabled: payload?.card?.enabled ?? DEFAULT_WELCOME.card.enabled,
      backgroundUrl:
        payload?.card?.backgroundUrl ?? DEFAULT_WELCOME.card.backgroundUrl,
      backgroundColor:
        payload?.card?.backgroundColor ?? DEFAULT_WELCOME.card.backgroundColor,
      textColor: payload?.card?.textColor ?? DEFAULT_WELCOME.card.textColor,
      overlayOpacity:
        typeof payload?.card?.overlayOpacity === "number"
          ? payload.card.overlayOpacity
          : DEFAULT_WELCOME.card.overlayOpacity,
      title: payload?.card?.title ?? DEFAULT_WELCOME.card.title,
      subtitle: payload?.card?.subtitle ?? DEFAULT_WELCOME.card.subtitle,
      showAvatar: payload?.card?.showAvatar ?? DEFAULT_WELCOME.card.showAvatar,
    },
    autoRole: {
      enabled: payload?.autoRole?.enabled ?? DEFAULT_WELCOME.autoRole.enabled,
      roleId,
      roleIds,
    },
    dm: {
      enabled: payload?.dm?.enabled ?? DEFAULT_WELCOME.dm.enabled,
      mode: payload?.dm?.mode ?? DEFAULT_WELCOME.dm.mode,
      message: payload?.dm?.message ?? DEFAULT_WELCOME.dm.message,
      embed: {
        enabled: payload?.dm?.embed?.enabled ?? DEFAULT_WELCOME.dm.embed.enabled,
        title: payload?.dm?.embed?.title ?? DEFAULT_WELCOME.dm.embed.title,
        description:
          payload?.dm?.embed?.description ?? DEFAULT_WELCOME.dm.embed.description,
        color: payload?.dm?.embed?.color ?? DEFAULT_WELCOME.dm.embed.color,
        footer: payload?.dm?.embed?.footer ?? DEFAULT_WELCOME.dm.embed.footer,
        banner: payload?.dm?.embed?.banner ?? DEFAULT_WELCOME.dm.embed.banner,
        thumbnail:
          payload?.dm?.embed?.thumbnail ?? DEFAULT_WELCOME.dm.embed.thumbnail,
      },
    },
  };
}

function normalizeGoodbyePayload(payload = {}) {
  return {
    enabled: payload?.enabled ?? DEFAULT_GOOBYE.enabled,
    channelId: payload?.channelId ?? DEFAULT_GOOBYE.channelId,
    embed: {
      enabled: payload?.embed?.enabled ?? DEFAULT_GOOBYE.embed.enabled,
      title: payload?.embed?.title ?? DEFAULT_GOOBYE.embed.title,
      description:
        payload?.embed?.description ?? DEFAULT_GOOBYE.embed.description,
      color: payload?.embed?.color ?? DEFAULT_GOOBYE.embed.color,
      footer: payload?.embed?.footer ?? DEFAULT_GOOBYE.embed.footer,
      banner: payload?.embed?.banner ?? DEFAULT_GOOBYE.embed.banner,
      thumbnail: payload?.embed?.thumbnail ?? DEFAULT_GOOBYE.embed.thumbnail,
    },
  };
}

function buildWelcomeSavePayload(welcome) {
  const selectedRoleId = welcome?.autoRole?.roleId || "";
  return {
    ...welcome,
    autoRole: {
      ...welcome.autoRole,
      roleId: selectedRoleId || null,
      roleIds: selectedRoleId ? [selectedRoleId] : [],
    },
  };
}

function WelcomePage({ selectedGuild }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("welcome");

  const initialStateRef = useRef(null);

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);


const [premiumStatus, setPremiumStatus] = useState({
  hasPremium: false,
  plan: "free",
});

const isPremium = Boolean(
  premiumStatus?.hasPremium || premiumStatus?.plan === "lifetime"
);

  const [welcome, setWelcome] = useState(DEFAULT_WELCOME);
  const [goodbye, setGoodbye] = useState(DEFAULT_GOOBYE);

  useEffect(() => {
    if (!selectedGuild?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setSaveMessage("");

      try {
        const [welcomeRes, goodbyeRes, channelsRes, rolesRes] =
          await Promise.all([
            fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/welcome`),
            fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/goodbye`),
            fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/channels`),
            fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/roles`),
          ]);

        const [welcomeData, goodbyeData, channelsData, rolesData] =
          await Promise.all([
            welcomeRes.json(),
            goodbyeRes.json(),
            channelsRes.json(),
            rolesRes.json(),
          ]);

setPremiumStatus(
  welcomeData?.premiumStatus ||
    goodbyeData?.premiumStatus || {
      hasPremium: false,
      plan: "free",
    }
);

        const normalizedWelcome = normalizeWelcomePayload(welcomeData?.welcome || {});
        const normalizedGoodbye = normalizeGoodbyePayload(goodbyeData?.goodbye || {});

        setWelcome(normalizedWelcome);
        setGoodbye(normalizedGoodbye);

        setChannels(Array.isArray(channelsData?.channels) ? channelsData.channels : []);
        setRoles(Array.isArray(rolesData?.roles) ? rolesData.roles : []);

        initialStateRef.current = JSON.stringify({
          welcome: normalizedWelcome,
          goodbye: normalizedGoodbye,
        });
        setHasChanges(false);
      } catch (error) {
        console.error("Failed to fetch welcome/goodbye data:", error);
        setSaveMessage("❌ Failed to load welcome settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedGuild?.id]);

  useEffect(() => {
    if (!initialStateRef.current || loading) return;

    const currentString = JSON.stringify({ welcome, goodbye });
    setHasChanges(currentString !== initialStateRef.current);
  }, [welcome, goodbye, loading]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  const saveSettings = async () => {
    if (!selectedGuild?.id) return;

    setSaving(true);
    setSaveMessage("");

    try {
     const welcomePayload = buildWelcomeSavePayload({
  ...welcome,
  embed: {
    ...welcome.embed,
    footer: isPremium ? welcome.embed.footer : "",
  },
  dm: {
    ...welcome.dm,
    embed: {
      ...welcome.dm.embed,
      footer: isPremium ? welcome.dm.embed.footer : "",
    },
  },
});

const goodbyePayload = {
  ...goodbye,
  embed: {
    ...goodbye.embed,
    footer: isPremium ? goodbye.embed.footer : "",
    banner: isPremium ? goodbye.embed.banner : "",
  },
};

      const [welcomeRes, goodbyeRes] = await Promise.all([
        fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/welcome`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(welcomePayload),
        }),
        fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/goodbye`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(goodbyePayload),
        }),
      ]);

      const [welcomeJson, goodbyeJson] = await Promise.all([
        welcomeRes.json(),
        goodbyeRes.json(),
      ]);

      if (!welcomeRes.ok || !goodbyeRes.ok) {
        throw new Error(
          welcomeJson?.error ||
            goodbyeJson?.error ||
            "Failed to save welcome / goodbye settings"
        );
      }

      const savedWelcome = normalizeWelcomePayload(welcomeJson?.welcome || welcomePayload);
      const savedGoodbye = normalizeGoodbyePayload(goodbyeJson?.goodbye || goodbye);

      setWelcome(savedWelcome);
      setGoodbye(savedGoodbye);

      const savedState = {
        welcome: savedWelcome,
        goodbye: savedGoodbye,
      };

      initialStateRef.current = JSON.stringify(savedState);
      setHasChanges(false);
      setSaveMessage("✅ Welcome & goodbye settings saved successfully.");
    } catch (error) {
      console.error("Failed to save welcome/goodbye config:", error);
      setSaveMessage("❌ Failed to save welcome/goodbye settings.");
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (!initialStateRef.current) return;

    try {
      const originalData = JSON.parse(initialStateRef.current);
      setWelcome(normalizeWelcomePayload(originalData.welcome));
      setGoodbye(normalizeGoodbyePayload(originalData.goodbye));
      setSaveMessage("");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to discard changes:", error);
    }
  };

  const insertWelcomeVariable = (variable) => {
    setWelcome((prev) => ({
      ...prev,
      embed: {
        ...prev.embed,
        description: `${prev.embed.description || ""}${variable}`,
      },
    }));
  };

  const insertGoodbyeVariable = (variable) => {
    setGoodbye((prev) => ({
      ...prev,
      embed: {
        ...prev.embed,
        description: `${prev.embed.description || ""}${variable}`,
      },
    }));
  };

const replacePreviewVars = (text) => {
  return (text || "")
    .replaceAll("{user}", "@username")
    .replaceAll("{username}", "username")
    .replaceAll("{server}", selectedGuild?.name || "Your Server")
    .replaceAll("{memberCount}", "1234")
    .replaceAll("{rules}", "#rules")
    .replaceAll("{support}", "#support")
    .replaceAll("{user.idname}", "username")
    .replaceAll("{server.member_count}", "1234");
};

  const renderDiscordText = (text) => {
    const parsedText = replacePreviewVars(text || "");
    const lines = parsedText.split("\n");

    return lines.map((line, lineIndex) => {
      const parts = [];
      const regex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;

      let lastIndex = 0;
      let match;
      let emojiIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        const [fullMatch, animatedFlag, emojiName, emojiId] = match;

        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }

        const isAnimated = animatedFlag === "a";
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${
          isAnimated ? "gif" : "png"
        }?size=64&quality=lossless`;

        parts.push(
          <img
            key={`emoji-${lineIndex}-${emojiIndex}`}
            src={emojiUrl}
            alt={emojiName}
            style={{
              width: "22px",
              height: "22px",
              verticalAlign: "middle",
              display: "inline-block",
              margin: "0 2px",
            }}
          />
        );

        lastIndex = match.index + fullMatch.length;
        emojiIndex++;
      }

      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      return (
        <span key={`line-${lineIndex}`}>
          {parts}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      );
    });
  };

  const selectedWelcomeChannelName = useMemo(
    () => channels.find((c) => c.id === welcome.channelId)?.name || "No channel selected",
    [channels, welcome.channelId]
  );

  if (!selectedGuild) {
    return (
      <div style={pageCard}>
        <h2 style={sectionTitle}>Welcome & Goodbye</h2>
        <p style={sectionText}>
          Select a server from the dashboard first, then open Welcome.
        </p>
      </div>
    );
  }

if (loading) {
  return (
    <PageLoader
      title="Loading welcome..."
      subtitle="Preparing welcome channels, cards, embeds, auto roles, and DM settings."
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
            <div style={eyebrow}>ENGAGEMENT • WELCOME SYSTEM</div>
            <h2 style={{ ...sectionTitle, textAlign: "left", marginBottom: 8 }}>
              Welcome & Goodbye Settings
            </h2>
            <p style={{ ...sectionText, textAlign: "left", margin: 0, maxWidth: 780 }}>
              Manage join embeds, background cards, auto role, DM messages, and goodbye
              flows for <strong>{selectedGuild.name}</strong>.
            </p>
          </div>

          <div style={heroStatsWrap}>
            <StatPill
              icon={<Sparkles size={15} />}
              label="Welcome Mode"
              value={welcome.mode === "both" ? "Embed + Card" : welcome.mode}
            />
            <StatPill
              icon={<ImageIcon size={15} />}
              label="Channel"
              value={selectedWelcomeChannelName}
            />
          </div>
        </div>

        <div style={tabRow}>
          <TabButton
            active={activeTab === "welcome"}
            onClick={() => setActiveTab("welcome")}
            label="Welcome"
          />
          <TabButton
            active={activeTab === "goodbye"}
            onClick={() => setActiveTab("goodbye")}
            label="Goodbye"
          />
        </div>

        <div style={layoutGrid}>
          <div style={{ display: "grid", gap: 22 }}>
            {activeTab === "welcome" && (
              <>
                <div style={settingsGrid}>
                  <InteractiveCard>
                    <div style={settingTitle}>Enable Welcome Message</div>
                    <div style={toggleRow}>
                      <ToggleSwitch
                        checked={welcome.enabled}
                        onClick={() =>
                          setWelcome((prev) => ({
                            ...prev,
                            enabled: !prev.enabled,
                          }))
                        }
                      />
                      <span style={settingHelp}>
                        Turn welcome messages on or off for this server.
                      </span>
                    </div>
                  </InteractiveCard>

                  <InteractiveCard>
                    <div style={settingTitle}>Welcome Channel</div>
                    <SingleSelectDropdown
                      options={channels.filter((channel) => channel.type === 0 || channel.type === 5)}
                      value={welcome.channelId}
                      placeholder="Select a channel"
                      onChange={(value) =>
                        setWelcome((prev) => ({
                          ...prev,
                          channelId: value,
                        }))
                      }
                    />
                    <p style={settingHelp}>
                      Channel where welcome messages will be sent.
                    </p>
                  </InteractiveCard>

                  <InteractiveCard>
                    <div style={settingTitle}>Welcome Mode</div>
                    <SimpleSelectDropdown
                      options={[
                        { id: "embed", name: "Embed Only" },
                        { id: "background", name: "Background Card" },
                        { id: "both", name: "Embed + Card" },
                      ]}
                      value={welcome.mode}
                      placeholder="Select mode"
                      onChange={(value) =>
                        setWelcome((prev) => ({
                          ...prev,
                          mode: value,
                        }))
                      }
                    />
                    <p style={settingHelp}>
                      Choose how Kyro should send the welcome message.
                    </p>
                  </InteractiveCard>
                </div>

                <InteractiveCard>
                  <SectionHeader
                    icon={<Sparkles size={16} />}
                    title="Welcome Embed Builder"
                    subtitle="Customize the main welcome embed shown in the selected channel."
                  />

                  <div style={{ display: "grid", gap: 16 }}>
                    <Field label="Embed Title">
                      <input
                        type="text"
                        value={welcome.embed.title}
                        onChange={(e) =>
                          setWelcome((prev) => ({
                            ...prev,
                            embed: {
                              ...prev.embed,
                              title: e.target.value,
                            },
                          }))
                        }
                        placeholder="👋 Welcome to {server}"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Embed Description">
                      <textarea
                        value={welcome.embed.description}
                        onChange={(e) =>
                          setWelcome((prev) => ({
                            ...prev,
                            embed: {
                              ...prev.embed,
                              description: e.target.value,
                            },
                          }))
                        }
                        placeholder="{user} joined! Member #{memberCount}"
                        style={textareaStyle}
                      />
                      <div style={{ marginTop: 12 }}>
                        <div style={miniLabel}>Variables</div>
                        <div style={variableChipsWrap}>
                          <VariableChip onClick={() => insertWelcomeVariable("{user}")}>
                            + user
                          </VariableChip>
                          <VariableChip onClick={() => insertWelcomeVariable("{username}")}>
                            + username
                          </VariableChip>
                          <VariableChip onClick={() => insertWelcomeVariable("{server}")}>
                            + server
                          </VariableChip>
                          <VariableChip onClick={() => insertWelcomeVariable("{memberCount}")}>
                            + memberCount
                          </VariableChip>
                          <VariableChip onClick={() => insertWelcomeVariable("{rules}")}>
                            + rules
                          </VariableChip>
                          <VariableChip onClick={() => insertWelcomeVariable("{support}")}>
                            + support
                          </VariableChip>
                        </div>
                      </div>
                    </Field>

                    <Field label="Embed Color">
                      <div style={colorRow}>
                        <input
                          type="color"
                          value={welcome.embed.color || "#5865F2"}
                          onChange={(e) =>
                            setWelcome((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                color: e.target.value,
                              },
                            }))
                          }
                          style={colorInput}
                        />
                        <input
                          type="text"
                          value={welcome.embed.color || "#5865F2"}
                          onChange={(e) =>
                            setWelcome((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                color: e.target.value,
                              },
                            }))
                          }
                          style={inputStyle}
                        />
                      </div>
                    </Field>

                    {!isPremium ? (
                      <PremiumLockedInputRow
                        label="Footer Text"
                        description="Footer text is available for Kyro Premium servers only."
                        placeholder="Premium only"
                        value={welcome.embed.footer || ""}
                      />
                    ) : (
                      <Field label="Footer Text">
                        <input
                          type="text"
                          value={welcome.embed.footer || ""}
                          onChange={(e) =>
                            setWelcome((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                footer: e.target.value,
                              },
                            }))
                          }
                          placeholder="Welcome aboard 🚀"
                          style={inputStyle}
                        />
                      </Field>
                    )}

              <Field label="Banner / GIF URL">
  <input
    type="text"
    value={welcome.embed.banner || ""}
    onChange={(e) =>
      setWelcome((prev) => ({
        ...prev,
        embed: {
          ...prev.embed,
          banner: e.target.value,
        },
      }))
    }
    placeholder="https://..."
    style={inputStyle}
  />
</Field>

                    <Field label="Show Thumbnail">
                      <div style={toggleRow}>
                        <ToggleSwitch
                          checked={welcome.embed.thumbnail !== false}
                          onClick={() =>
                            setWelcome((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                thumbnail: prev.embed.thumbnail === false ? true : false,
                              },
                            }))
                          }
                        />
                        <span style={settingHelp}>
                          Show the member avatar as embed thumbnail.
                        </span>
                      </div>
                    </Field>
                  </div>
                </InteractiveCard>

                <InteractiveCard>
                  <SectionHeader
                    icon={<ImageIcon size={16} />}
                    title="Welcome Card Builder"
                    subtitle="Design the image-based welcome card shown in background or combined mode."
                  />

                 <div style={{ display: "grid", gap: 16 }}>
  <Field label="Background URL">
    <input
      type="text"
      value={welcome.card.backgroundUrl}
      onChange={(e) =>
        setWelcome((prev) => ({
          ...prev,
          card: {
            ...prev.card,
            backgroundUrl: e.target.value,
          },
        }))
      }
      placeholder="https://..."
      style={inputStyle}
    />
  </Field>

                    <div style={doubleGrid}>
                      <Field label="Background Color">
                        <div style={colorRow}>
                          <input
                            type="color"
                            value={welcome.card.backgroundColor || "#000000"}
                            onChange={(e) =>
                              setWelcome((prev) => ({
                                ...prev,
                                card: {
                                  ...prev.card,
                                  backgroundColor: e.target.value,
                                },
                              }))
                            }
                            style={colorInput}
                          />
                          <input
                            type="text"
                            value={welcome.card.backgroundColor || "#000000"}
                            onChange={(e) =>
                              setWelcome((prev) => ({
                                ...prev,
                                card: {
                                  ...prev.card,
                                  backgroundColor: e.target.value,
                                },
                              }))
                            }
                            style={inputStyle}
                          />
                        </div>
                      </Field>

                      <Field label="Text Color">
                        <div style={colorRow}>
                          <input
                            type="color"
                            value={welcome.card.textColor || "#ffffff"}
                            onChange={(e) =>
                              setWelcome((prev) => ({
                                ...prev,
                                card: {
                                  ...prev.card,
                                  textColor: e.target.value,
                                },
                              }))
                            }
                            style={colorInput}
                          />
                          <input
                            type="text"
                            value={welcome.card.textColor || "#ffffff"}
                            onChange={(e) =>
                              setWelcome((prev) => ({
                                ...prev,
                                card: {
                                  ...prev.card,
                                  textColor: e.target.value,
                                },
                              }))
                            }
                            style={inputStyle}
                          />
                        </div>
                      </Field>
                    </div>

                    <Field label="Overlay Opacity">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={welcome.card.overlayOpacity}
                        onChange={(e) =>
                          setWelcome((prev) => ({
                            ...prev,
                            card: {
                              ...prev.card,
                              overlayOpacity: Number(e.target.value),
                            },
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                      <p style={settingHelp}>
                        Current opacity: {welcome.card.overlayOpacity}
                      </p>
                    </Field>

                    <Field label="Card Title">
                      <input
                        type="text"
                        value={welcome.card.title}
                        onChange={(e) =>
                          setWelcome((prev) => ({
                            ...prev,
                            card: {
                              ...prev.card,
                              title: e.target.value,
                            },
                          }))
                        }
                        placeholder="WELCOME"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Card Subtitle">
                      <input
                        type="text"
                        value={welcome.card.subtitle}
                        onChange={(e) =>
                          setWelcome((prev) => ({
                            ...prev,
                            card: {
                              ...prev.card,
                              subtitle: e.target.value,
                            },
                          }))
                        }
                        placeholder="{username}"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Show Avatar">
                      <div style={toggleRow}>
                        <ToggleSwitch
                          checked={welcome.card.showAvatar}
                          onClick={() =>
                            setWelcome((prev) => ({
                              ...prev,
                              card: {
                                ...prev.card,
                                showAvatar: !prev.card.showAvatar,
                              },
                            }))
                          }
                        />
                        <span style={settingHelp}>Show avatar on welcome card</span>
                      </div>
                    </Field>
                  </div>
                </InteractiveCard>

                <InteractiveCard>
                  <SectionHeader
                    icon={<Shield size={16} />}
                    title="Auto Role on Join"
                    subtitle="Give a starter role to new members automatically."
                  />

                  <div style={toggleRow}>
                    <ToggleSwitch
                      checked={welcome.autoRole?.enabled}
                      onClick={() =>
                        setWelcome((prev) => ({
                          ...prev,
                          autoRole: {
                            ...prev.autoRole,
                            enabled: !prev.autoRole.enabled,
                          },
                        }))
                      }
                    />
                    <span style={settingHelp}>
                      Automatically give a selected role when a user joins.
                    </span>
                  </div>

                  {welcome.autoRole?.enabled && (
                    <div style={{ marginTop: 14 }}>
                      <div style={miniLabel}>Role to Give</div>
                      <SingleSelectDropdown
          options={roles}
                        value={welcome.autoRole?.roleId || ""}
                        placeholder="Select a role"
                        onChange={(value) =>
                          setWelcome((prev) => ({
                            ...prev,
                            autoRole: {
                              ...prev.autoRole,
                              roleId: value,
                              roleIds: value ? [value] : [],
                            },
                          }))
                        }
                      />
                      <p style={settingHelp}>
                        Kyro will give this role to new members on join.
                      </p>
                    </div>
                  )}
                </InteractiveCard>

                <InteractiveCard>
                  <SectionHeader
                    icon={<Mail size={16} />}
                    title="Send Private DM Message"
                    subtitle="Deliver a direct message to new users after they join."
                  />

                  <div style={toggleRow}>
                    <ToggleSwitch
                      checked={welcome.dm?.enabled}
                      onClick={() =>
                        setWelcome((prev) => ({
                          ...prev,
                          dm: {
                            ...prev.dm,
                            enabled: !prev.dm.enabled,
                          },
                        }))
                      }
                    />
                    <span style={settingHelp}>
                      Send a private DM message to new users after they join.
                    </span>
                  </div>

                  {welcome.dm?.enabled && (
                    <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                      <Field label="DM Mode">
                        <SimpleSelectDropdown
                          options={[
                            { id: "text", name: "Text Message" },
                            { id: "embed", name: "Embed Message" },
                          ]}
                          value={welcome.dm?.mode || "text"}
                          placeholder="Select DM mode"
                          onChange={(value) =>
                            setWelcome((prev) => ({
                              ...prev,
                              dm: {
                                ...prev.dm,
                                mode: value,
                              },
                            }))
                          }
                        />
                      </Field>

                      {welcome.dm?.mode === "text" && (
                        <Field label="DM Text Message">
                          <textarea
                            value={welcome.dm?.message || ""}
                            onChange={(e) =>
                              setWelcome((prev) => ({
                                ...prev,
                                dm: {
                                  ...prev.dm,
                                  message: e.target.value,
                                },
                              }))
                            }
                            placeholder="Welcome to {server}, {user}"
                            style={textareaStyle}
                          />
                        </Field>
                      )}

                      {welcome.dm?.mode === "embed" && (
                        <>
                          <Field label="DM Embed Title">
                            <input
                              type="text"
                              value={welcome.dm?.embed?.title || ""}
                              onChange={(e) =>
                                setWelcome((prev) => ({
                                  ...prev,
                                  dm: {
                                    ...prev.dm,
                                    embed: {
                                      ...prev.dm.embed,
                                      title: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Welcome to {server}"
                              style={inputStyle}
                            />
                          </Field>

                          <Field label="DM Embed Description">
                            <textarea
                              value={welcome.dm?.embed?.description || ""}
                              onChange={(e) =>
                                setWelcome((prev) => ({
                                  ...prev,
                                  dm: {
                                    ...prev.dm,
                                    embed: {
                                      ...prev.dm.embed,
                                      description: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="We’re glad to have you here, {user}"
                              style={textareaStyle}
                            />
                          </Field>

                          <Field label="DM Embed Color">
                            <div style={colorRow}>
                              <input
                                type="color"
                                value={welcome.dm?.embed?.color || "#5865F2"}
                                onChange={(e) =>
                                  setWelcome((prev) => ({
                                    ...prev,
                                    dm: {
                                      ...prev.dm,
                                      embed: {
                                        ...prev.dm.embed,
                                        color: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                style={colorInput}
                              />
                              <input
                                type="text"
                                value={welcome.dm?.embed?.color || "#5865F2"}
                                onChange={(e) =>
                                  setWelcome((prev) => ({
                                    ...prev,
                                    dm: {
                                      ...prev.dm,
                                      embed: {
                                        ...prev.dm.embed,
                                        color: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                style={inputStyle}
                              />
                            </div>
                          </Field>

                          <Field label="DM Footer Text">
                            <input
                              type="text"
                              value={welcome.dm?.embed?.footer || ""}
                              onChange={(e) =>
                                setWelcome((prev) => ({
                                  ...prev,
                                  dm: {
                                    ...prev.dm,
                                    embed: {
                                      ...prev.dm.embed,
                                      footer: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Enjoy your stay 💙"
                              style={inputStyle}
                            />
                          </Field>

                          <Field label="DM Banner / GIF URL">
                            <input
                              type="text"
                              value={welcome.dm?.embed?.banner || ""}
                              onChange={(e) =>
                                setWelcome((prev) => ({
                                  ...prev,
                                  dm: {
                                    ...prev.dm,
                                    embed: {
                                      ...prev.dm.embed,
                                      banner: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="https://..."
                              style={inputStyle}
                            />
                          </Field>

                          <Field label="Show DM Thumbnail">
                            <div style={toggleRow}>
                              <ToggleSwitch
                                checked={welcome.dm?.embed?.thumbnail !== false}
                                onClick={() =>
                                  setWelcome((prev) => ({
                                    ...prev,
                                    dm: {
                                      ...prev.dm,
                                      embed: {
                                        ...prev.dm.embed,
                                        thumbnail:
                                          prev.dm.embed.thumbnail === false
                                            ? true
                                            : false,
                                      },
                                    },
                                  }))
                                }
                              />
                              <span style={settingHelp}>
                                Show the member avatar as DM embed thumbnail.
                              </span>
                            </div>
                          </Field>
                        </>
                      )}
                    </div>
                  )}
                </InteractiveCard>
              </>
            )}

            {activeTab === "goodbye" && (
              <>
                <div style={settingsGrid}>
                  <InteractiveCard>
                    <div style={settingTitle}>Enable Goodbye Message</div>
                    <div style={toggleRow}>
                      <ToggleSwitch
                        checked={goodbye.enabled}
                        onClick={() =>
                          setGoodbye((prev) => ({
                            ...prev,
                            enabled: !prev.enabled,
                          }))
                        }
                      />
                      <span style={settingHelp}>
                        Turn goodbye messages on or off for this server.
                      </span>
                    </div>
                  </InteractiveCard>

                  <InteractiveCard>
                    <div style={settingTitle}>Goodbye Channel</div>
                    <SingleSelectDropdown
                      options={channels.filter((channel) => channel.type === 0 || channel.type === 5)}
                      value={goodbye.channelId}
                      placeholder="Select a channel"
                      onChange={(value) =>
                        setGoodbye((prev) => ({
                          ...prev,
                          channelId: value,
                        }))
                      }
                    />
                    <p style={settingHelp}>
                      Channel where goodbye messages will be sent.
                    </p>
                  </InteractiveCard>
                </div>

                <InteractiveCard>
                  <SectionHeader
                    icon={<Sparkles size={16} />}
                    title="Goodbye Embed Builder"
                    subtitle="Customize the goodbye embed shown when members leave."
                  />

                  <div style={{ display: "grid", gap: 16 }}>
                    <Field label="Embed Title">
                      <input
                        type="text"
                        value={goodbye.embed.title}
                        onChange={(e) =>
                          setGoodbye((prev) => ({
                            ...prev,
                            embed: {
                              ...prev.embed,
                              title: e.target.value,
                            },
                          }))
                        }
                        placeholder="👋 Goodbye {username}"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Embed Description">
                      <textarea
                        value={goodbye.embed.description}
                        onChange={(e) =>
                          setGoodbye((prev) => ({
                            ...prev,
                            embed: {
                              ...prev.embed,
                              description: e.target.value,
                            },
                          }))
                        }
                        placeholder="We will miss you!"
                        style={textareaStyle}
                      />
                      <div style={{ marginTop: 12 }}>
                        <div style={miniLabel}>Variables</div>
                        <div style={variableChipsWrap}>
                          <VariableChip onClick={() => insertGoodbyeVariable("{user}")}>
                            + user
                          </VariableChip>
                          <VariableChip onClick={() => insertGoodbyeVariable("{username}")}>
                            + username
                          </VariableChip>
                          <VariableChip onClick={() => insertGoodbyeVariable("{server}")}>
                            + server
                          </VariableChip>
                        </div>
                      </div>
                    </Field>

                    <Field label="Embed Color">
                      <div style={colorRow}>
                        <input
                          type="color"
                          value={goodbye.embed.color || "#ff4d4d"}
                          onChange={(e) =>
                            setGoodbye((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                color: e.target.value,
                              },
                            }))
                          }
                          style={colorInput}
                        />
                        <input
                          type="text"
                          value={goodbye.embed.color || "#ff4d4d"}
                          onChange={(e) =>
                            setGoodbye((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                color: e.target.value,
                              },
                            }))
                          }
                          style={inputStyle}
                        />
                      </div>
                    </Field>

                    {!isPremium ? (
                      <PremiumLockedInputRow
                        label="Footer Text"
                        description="Footer text is available for Kyro Premium servers only."
                        placeholder="Premium only"
                        value={goodbye.embed.footer || ""}
                      />
                    ) : (
                      <Field label="Footer Text">
                        <input
                          type="text"
                          value={goodbye.embed.footer || ""}
                          onChange={(e) =>
                            setGoodbye((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                footer: e.target.value,
                              },
                            }))
                          }
                          placeholder="Left the server"
                          style={inputStyle}
                        />
                      </Field>
                    )}

                    {!isPremium ? (
                      <PremiumLockedInputRow
                        label="Banner / GIF URL"
                        description="Banner and GIF support is available for Kyro Premium servers only."
                        placeholder="Premium only"
                        value={goodbye.embed.banner || ""}
                      />
                    ) : (
                      <Field label="Banner / GIF URL">
                        <input
                          type="text"
                          value={goodbye.embed.banner || ""}
                          onChange={(e) =>
                            setGoodbye((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                banner: e.target.value,
                              },
                            }))
                          }
                          placeholder="https://..."
                          style={inputStyle}
                        />
                      </Field>
                    )}

                    <Field label="Show Thumbnail">
                      <div style={toggleRow}>
                        <ToggleSwitch
                          checked={goodbye.embed.thumbnail !== false}
                          onClick={() =>
                            setGoodbye((prev) => ({
                              ...prev,
                              embed: {
                                ...prev.embed,
                                thumbnail:
                                  prev.embed.thumbnail === false ? true : false,
                              },
                            }))
                          }
                        />
                        <span style={settingHelp}>
                          Show the member avatar as embed thumbnail.
                        </span>
                      </div>
                    </Field>
                  </div>
                </InteractiveCard>
              </>
            )}

            {saveMessage && <div style={saveBox}>{saveMessage}</div>}
          </div>

          <InteractiveCard>
            <SectionHeader
              icon={<Sparkles size={16} />}
              title="Live Preview"
              subtitle="See how the current configuration will look inside Discord."
            />

            {activeTab === "welcome" && (
              <>
                <div style={previewOuter}>
                  <div
                    style={{
                      ...previewEmbed,
                      borderLeft: `4px solid ${welcome.embed?.color || "#5865F2"}`,
                    }}
                  >
                    <div style={previewAuthorRow}>
                      <div style={previewBotAvatar}>K</div>
                      <div style={previewAuthorText}>
                        <span style={previewAuthorName}>Kyro</span>
                        <span style={previewBotTag}>APP</span>
                      </div>
                    </div>

                    <div style={previewTitle}>
                      {renderDiscordText(welcome.embed?.title || "👋 Welcome to {server}")}
                    </div>

                    <div style={previewDescription}>
                      {renderDiscordText(
                        welcome.embed?.description ||
                          "{user} joined!\nMember #{memberCount}"
                      )}
                    </div>

                    {welcome.embed?.banner ? (
                      <img
                        src={welcome.embed.banner}
                        alt="Welcome banner preview"
                        style={previewBanner}
                      />
                    ) : null}

                    {welcome.embed?.footer && isPremium ? (
                      <div style={previewFooterRow}>
                        <div style={previewFooterIcon}>K</div>
                        <div style={previewFooter}>
                          {renderDiscordText(welcome.embed.footer)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {(welcome.mode === "background" || welcome.mode === "both") && (
                  <div style={cardPreviewWrap}>
                    <div
                      style={{
                        ...cardPreview,
                        background: welcome.card.backgroundUrl
                          ? `linear-gradient(rgba(0,0,0,${welcome.card.overlayOpacity}), rgba(0,0,0,${welcome.card.overlayOpacity})), url(${welcome.card.backgroundUrl}) center/cover no-repeat`
                          : welcome.card.backgroundColor || "#000000",
                        color: welcome.card.textColor || "#ffffff",
                      }}
                    >
                      {welcome.card.showAvatar && <div style={cardPreviewAvatar} />}
                      <div style={cardPreviewTitle}>
                        {replacePreviewVars(welcome.card.title || "WELCOME")}
                      </div>
                      <div style={cardPreviewSubtitle}>
                        {replacePreviewVars(welcome.card.subtitle || "{username}")}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "goodbye" && (
              <div style={previewOuter}>
                <div
                  style={{
                    ...previewEmbed,
                    borderLeft: `4px solid ${goodbye.embed?.color || "#ff4d4d"}`,
                  }}
                >
                  <div style={previewAuthorRow}>
                    <div style={previewBotAvatar}>K</div>
                    <div style={previewAuthorText}>
                      <span style={previewAuthorName}>Kyro</span>
                      <span style={previewBotTag}>APP</span>
                    </div>
                  </div>

                  <div style={previewTitle}>
                    {renderDiscordText(goodbye.embed?.title || "👋 Goodbye {username}")}
                  </div>

                  <div style={previewDescription}>
                    {renderDiscordText(goodbye.embed?.description || "We will miss you!")}
                  </div>

                  {goodbye.embed?.banner ? (
                    <img
                      src={goodbye.embed.banner}
                      alt="Goodbye banner preview"
                      style={previewBanner}
                    />
                  ) : null}

                  {goodbye.embed?.footer && isPremium ? (
                    <div style={previewFooterRow}>
                      <div style={previewFooterIcon}>K</div>
                      <div style={previewFooter}>
                        {renderDiscordText(goodbye.embed.footer)}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </InteractiveCard>
        </div>
      </div>

      {hasChanges && (
        <div style={stickySaveBar}>
          <div>
            <div style={stickySaveTitle}>You have unsaved changes</div>
            <div style={stickySaveText}>
              Save your welcome and goodbye settings or discard the recent edits.
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
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.12)";
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
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

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButton,
        ...(active ? tabButtonActive : {}),
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
        }
      }}
    >
      {label}
    </button>
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

function VariableChip({ children, onClick }) {
  return (
    <button
      type="button"
      style={variableChip}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.border = "1px solid rgba(88,101,242,0.22)";
        e.currentTarget.style.boxShadow = "0 8px 18px rgba(88,101,242,0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </button>
  );
}

function SingleSelectDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const dropdownRef = useRef(null);
const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.id === value);

  useEffect(() => {
    function handleClickOutside(event) {
  const clickedInsideDropdown =
    dropdownRef.current && dropdownRef.current.contains(event.target);

  const clickedInsideMenu =
    menuRef.current && menuRef.current.contains(event.target);

  if (!clickedInsideDropdown && !clickedInsideMenu) {
    setOpen(false);
  }
}

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open]);

  function updateMenuPosition() {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();

    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 999999,
    });
  }

  const menu = open
    ? createPortal(
        <div
  ref={menuRef}
  style={{
            ...menuStyle,
            background: "rgba(19,28,46,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "8px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            backdropFilter: "blur(16px)",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            style={dropdownItem(value === "")}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {placeholder}
          </button>

          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              style={dropdownItem(option.id === value)}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              {option.name}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={dropdownRef}
        style={{
          ...dropdownWrap,
          position: "relative",
        }}
      >
        <button
          type="button"
          style={dropdownButton}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>{selectedOption ? selectedOption.name : placeholder}</span>
          <span style={dropdownArrow}>{open ? "▲" : "▼"}</span>
        </button>
      </div>

      {menu}
    </>
  );
}

function SimpleSelectDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = options.find((option) => option.id === value);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideDropdown =
        dropdownRef.current && dropdownRef.current.contains(event.target);

      const clickedInsideMenu =
        menuRef.current && menuRef.current.contains(event.target);

      if (!clickedInsideDropdown && !clickedInsideMenu) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open]);

  function updateMenuPosition() {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();

    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 999999,
    });
  }

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{
            ...menuStyle,
            background: "rgba(19,28,46,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "8px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            backdropFilter: "blur(16px)",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              style={dropdownItem(option.id === value)}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.01)";
                e.currentTarget.style.background =
                  "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(124,58,237,0.25))";
                e.currentTarget.style.border =
                  "1px solid rgba(88,101,242,0.5)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(88,101,242,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.background =
                  option.id === value
                    ? "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(124,58,237,0.35))"
                    : "transparent";
                e.currentTarget.style.border =
                  option.id === value
                    ? "1px solid rgba(88,101,242,0.4)"
                    : "1px solid transparent";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {option.name}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={dropdownRef}
        style={{
          ...dropdownWrap,
          position: "relative",
        }}
      >
        <button
          type="button"
          style={dropdownButton}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>{selectedOption ? selectedOption.name : placeholder}</span>
          <span style={dropdownArrow}>{open ? "▲" : "▼"}</span>
        </button>
      </div>

      {menu}
    </>
  );
}
function PremiumLockedInputRow({
  label,
  description,
  placeholder = "Premium only",
  buttonText = "Upgrade to Premium",
  value = "",
  onUpgrade,
}) {
  return (
    <div>
      <div style={settingTitleInline}>
        {label}{" "}
        <span style={premiumBadge}>
          <Crown size={14} strokeWidth={2} />
          Premium
        </span>
      </div>

      <input
        type="text"
        value={value}
        readOnly
        disabled
        placeholder={placeholder}
        style={{
          ...inputStyle,
          opacity: 0.65,
          cursor: "not-allowed",
        }}
      />

      <div style={premiumUpgradeRow}>
        <p style={{ ...settingHelp, margin: 0 }}>{description}</p>

        <button
          type="button"
          style={premiumUpgradeButton}
          onClick={() => {
            if (onUpgrade) {
              onUpgrade();
            } else {
           window.dispatchEvent(new Event("kyro:navigate-premium"));

setTimeout(() => {
  window.dispatchEvent(new Event("hashchange"));
}, 0);
            }
          }}
        >
          <Crown size={14} strokeWidth={2} />
          {buttonText}
        </button>
      </div>
    </div>
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

const tabRow = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  gap: "12px",
  marginBottom: "22px",
  flexWrap: "wrap",
};

const tabButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const tabButtonActive = {
  background:
    "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(124,58,237,0.25))",
  border: "1px solid rgba(88,101,242,0.9)",
  boxShadow: "0 0 0 1px rgba(88,101,242,0.2), 0 12px 28px rgba(88,101,242,0.18)",
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

const textareaStyle = {
  width: "100%",
  minHeight: "110px",
  resize: "vertical",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  lineHeight: "1.5",
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

const dropdownMenu = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#131c2e",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "8px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
  zIndex: 9999, 
  maxHeight: "260px",
  overflowY: "auto",
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

const variableChipsWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "10px",
};

const variableChip = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const previewOuter = {
  background: "transparent",
};

const previewEmbed = {
  background: "#2b2d31",
  borderRadius: "4px",
  padding: "12px 14px 14px 12px",
  maxWidth: "520px",
};

const previewAuthorRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "10px",
};

const previewBotAvatar = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "700",
};

const previewAuthorText = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const previewAuthorName = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#ffffff",
};

const previewBotTag = {
  fontSize: "10px",
  fontWeight: "700",
  color: "#ffffff",
  background: "#5865F2",
  borderRadius: "4px",
  padding: "2px 4px",
};

const previewTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#ffffff",
  marginBottom: "6px",
  whiteSpace: "pre-wrap",
};

const previewDescription = {
  fontSize: "14px",
  lineHeight: "1.45",
  color: "#dbdee1",
  whiteSpace: "pre-wrap",
};

const previewBanner = {
  width: "100%",
  maxHeight: "220px",
  objectFit: "contain",
  borderRadius: "4px",
  marginTop: "12px",
};

const previewFooterRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "10px",
};

const previewFooterIcon = {
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
};

const previewFooter = {
  fontSize: "12px",
  color: "#b5bac1",
};

const cardPreviewWrap = {
  marginTop: "18px",
};

const cardPreview = {
  minHeight: "240px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: "28px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const cardPreviewAvatar = {
  width: "92px",
  height: "92px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  border: "4px solid white",
  marginBottom: "18px",
};

const cardPreviewTitle = {
  fontSize: "34px",
  fontWeight: "800",
  lineHeight: "1.1",
  whiteSpace: "pre-wrap",
};

const cardPreviewSubtitle = {
  marginTop: "10px",
  fontSize: "18px",
  fontWeight: "600",
  opacity: 0.9,
  whiteSpace: "pre-wrap",
};

const colorRow = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const colorInput = {
  width: "52px",
  height: "44px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  background: "transparent",
  padding: "4px",
  cursor: "pointer",
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

const settingTitleInline = {
  fontSize: "14px",
  fontWeight: "700",
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const premiumBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "rgba(167,139,250,0.12)",
  border: "1px solid rgba(167,139,250,0.25)",
  color: "#a78bfa",
  fontSize: "12px",
  fontWeight: "600",
  boxShadow: "0 0 12px rgba(167,139,250,0.15)",
};

const premiumUpgradeRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "12px",
  flexWrap: "wrap",
};

const premiumUpgradeButton = {
  border: "1px solid rgba(167,139,250,0.28)",
  background: "rgba(167,139,250,0.12)",
  color: "#c4b5fd",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 0 12px rgba(167,139,250,0.12)",
};

export default WelcomePage;