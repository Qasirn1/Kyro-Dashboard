import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import kyroLogo from "./assets/kyro.png";
import landingBg from "./assets/landing-bg.jpg";
import LevelingPage from "./pages/LevelingPage";
import GiveawaysPage from "./pages/GiveawaysPage";
import WelcomePage from "./pages/WelcomePage";
import TicketsPage from "./pages/TicketsPage";
import SelfRolesPage from "./pages/SelfRolesPage";
import LogsPage from "./pages/LogsPage";
import ServerStatsPage from "./pages/ServerStatsPage";
import EmbedBuilderPage from "./pages/EmbedBuilderPage";
import VerificationPage from "./pages/VerificationPage";
import VerificationEditorPage from "./pages/VerificationEditorPage";
import AutomodPage from "./pages/AutomodPage";
import GlobalToast from "./components/GlobalToast";
import SecurityPage from "./pages/SecurityPage";
import InviteTrackerPage from "./pages/InviteTrackerPage";
import TemporaryVoicePage from "./pages/TemporaryVoicePage";
import SocialAlertsPage from "./pages/SocialAlertsPage";
import RSSPage from "./pages/RSSPage";
import SettingsPage from "./pages/SettingsPage";
import CustomBotPage from "./pages/CustomBotPage";
import FAQPage from "./pages/FAQPage";
import CommandsPage from "./pages/CommandsPage";
import DocsPage from "./pages/DocsPage";
import PremiumPage from "./pages/PremiumPage";
import "./theme/global.css";
import {
  LayoutDashboard,
  BarChart3,
  Ticket,
  Shield,
  ShieldCheck,
  Search,
  Bell,
  MessageSquareMore,
  ChevronDown,
  Settings,
  Users,
  ScrollText,
  PenSquare,
  AudioLines,
  Gift,
  Rss,
  Sparkles,
  Radio,
  UserPlus,
  Wrench,
  BadgeCheck,
  Crown,
} from "lucide-react";

const BOT_CLIENT_ID = "1471853928034467870";
const KYRO_SUPPORT_INVITE = "https://discord.gg/82S4wK3sCm";
axios.defaults.withCredentials = true;

const SIDEBAR_SECTIONS = [
  {
  title: "BRANDING",
  items: [
    { id: "custom-bot", label: "Custom Branding", icon: Sparkles },
  ],
},
{
  title: "OVERVIEW",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "premium", label: "Premium", icon: Crown },
  ],
},
  {
    title: "ENGAGEMENT",
    items: [
      { id: "welcome", label: "Welcome", icon: MessageSquareMore },
      { id: "leveling", label: "Leveling", icon: BarChart3 },
      { id: "selfroles", label: "Self Roles", icon: Users },
      { id: "giveaways", label: "Giveaways", icon: Gift },
    ],
  },
  {
    title: "MODERATION & SECURITY",
    items: [
      { id: "automod", label: "Auto Moderation", icon: Shield },
      { id: "security", label: "Security", icon: Shield },
      { id: "logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    title: "SUPPORT & PANELS",
    items: [
      { id: "tickets", label: "Tickets", icon: Ticket },
      { id: "panels", label: "Verification", icon: ShieldCheck },
      { id: "embedbuilder", label: "Embed Builder", icon: PenSquare },
    ],
  },
  {
    title: "UTILITIES",
    items: [
      { id: "serverstats", label: "Server Stats", icon: BarChart3 },
      { id: "invitetracker", label: "Invite Tracker", icon: Users },
      { id: "social-alerts", label: "Social Alerts", icon: Bell },
      { id: "rss", label: "RSS Feeds", icon: Rss },
      { id: "tempvoice", label: "Temporary Voice", icon: AudioLines },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");
const [token, setToken] = useState("");
const [guilds, setGuilds] = useState([]);
const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [topbarSearch, setTopbarSearch] = useState("");
const [notificationsOpen, setNotificationsOpen] = useState(false);
const notificationRef = useRef(null);
const [searchOpen, setSearchOpen] = useState(false);
const searchRef = useRef(null);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [botGuildIds, setBotGuildIds] = useState([]);
  const [serverSearch, setServerSearch] = useState("");
  const [serverSwitcherOpen, setServerSwitcherOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState(null);
  const serverSwitcherRef = useRef(null);
  const contentScrollRef = useRef(null);
const [currentHash, setCurrentHash] = useState(window.location.hash || "#/");
const isVerificationEditorRoute = currentHash.startsWith("#/verification-editor/");
  const isKyroInstalled = !!selectedGuild && botGuildIds.includes(selectedGuild.id);

  const SEARCH_PAGES = [
  { name: "dashboard", keywords: ["home", "main"] },
  { name: "welcome", keywords: ["join", "leave", "greet"] },
  { name: "leveling", keywords: ["xp", "levels", "rank"] },
  { name: "selfroles", keywords: ["roles", "reaction roles"] },
  { name: "giveaways", keywords: ["giveaway", "winners"] },
  { name: "automod", keywords: ["moderation", "spam", "filter"] },
  { name: "security", keywords: ["anti raid", "protection"] },
  { name: "logs", keywords: ["logging", "events"] },
  { name: "tickets", keywords: ["support", "help tickets"] },
  { name: "panels", keywords: ["verification", "captcha"] },
  { name: "embedbuilder", keywords: ["embed", "message"] },
  { name: "serverstats", keywords: ["stats", "channels"] },
  { name: "invitetracker", keywords: ["invites", "referrals"] },
  { name: "social-alerts", keywords: ["youtube", "tiktok", "twitch"] },
  { name: "rss", keywords: ["feeds", "blogs"] },
  { name: "tempvoice", keywords: ["voice", "vc"] },
  { name: "settings", keywords: ["config", "options"] },
];

const filteredSearchPages = topbarSearch.trim()
  ? SEARCH_PAGES.filter((page) => {
      const query = topbarSearch.toLowerCase().trim();
      return (
        page.name.toLowerCase().includes(query) ||
        page.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        )
      );
    }).slice(0, 6)
  : [];

function handleSearchSubmit() {
  const query = topbarSearch.toLowerCase().trim();
  if (!query) return;

  const found = SEARCH_PAGES.find((p) =>
    p.name.includes(query) ||
    p.keywords.some((k) => k.includes(query))
  );

  if (found) {
    navigateToPage(found.name);
    setTopbarSearch("");
  }
}
  function navigateToPage(pageId) {

  setActivePage(pageId);

const hashMap = {
  dashboard: "#/",
    premium: "#/premium",
  welcome: "#/welcome",
  leveling: "#/leveling",
  giveaways: "#/giveaways",
  tickets: "#/tickets",
  automod: "#/automod",
  security: "#/security",
  logs: "#/logs",
  selfroles: "#/selfroles",
  panels: "#/verification",
  embedbuilder: "#/embedbuilder",
  serverstats: "#/serverstats",
  invitetracker: "#/invitetracker",
    "social-alerts": "#/social-alerts",
      rss: "#/rss",
  tempvoice: "#/tempvoice",
  settings: "#/settings",
  "custom-bot": "#/custom-bot",
  faq: "#/faq",
  commands: "#/commands",
  docs: "#/docs",
};

  window.location.hash = hashMap[pageId] || "#/";
}

useEffect(() => {
 const handlePremiumNavigation = () => {
  navigateToPage("premium");

  setTimeout(() => {
    contentScrollRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 50);
};

  window.addEventListener("kyro:navigate-premium", handlePremiumNavigation);

  return () => {
    window.removeEventListener("kyro:navigate-premium", handlePremiumNavigation);
  };
}, []);

useEffect(() => {
  if (activePage !== "premium") return;

  setTimeout(() => {
    contentScrollRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, 80);
}, [activePage]);

 useEffect(() => {
  const fetchDiscordData = async () => {
    try {
      setAuthLoading(true);

      const userRes = await axios.get("https://kyro-dashboard-production.up.railway.app/api/discord/user");
      const userData = userRes.data;
      setUser(userData);
      setToken("session");

      const guildsRes = await axios.get("https://kyro-dashboard-production.up.railway.app/api/discord/guilds");
      const guildsData = guildsRes.data;
      const safeGuilds = Array.isArray(guildsData) ? guildsData : [];
      setGuilds(safeGuilds);

      const botGuildsRes = await axios.get("https://kyro-dashboard-production.up.railway.app/api/discord/bot-guilds");
      const botGuildsData = botGuildsRes.data;
      const installedIds = botGuildsData.success ? botGuildsData.guildIds || [] : [];
      setBotGuildIds(installedIds);

      const savedGuildId = localStorage.getItem("kyro_selected_guild_id");

      const sortedGuilds = [...safeGuilds].sort((a, b) => {
        const aInstalled = installedIds.includes(a.id);
        const bInstalled = installedIds.includes(b.id);

        if (aInstalled !== bInstalled) return aInstalled ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      const restoredGuild =
        safeGuilds.find((g) => g.id === savedGuildId) || null;

           if (restoredGuild) {
        setSelectedGuild(restoredGuild);
      } else {
        setSelectedGuild(null);
      }

    } catch (error) {
      if (error.response?.status === 401) {
        setToken("");
        setUser(null);
        setGuilds([]);
        setBotGuildIds([]);
        setSelectedGuild(null);
      } else {
        console.error("Failed to fetch Discord data:", error);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  fetchDiscordData();
}, []);

useEffect(() => {
  if (selectedGuild?.id) {
    localStorage.setItem("kyro_selected_guild_id", selectedGuild.id);
  }
}, [selectedGuild]);

  useEffect(() => {
    if (authLoading) return;
    if (!selectedGuild) return;

    const isInstalledForSelectedGuild = botGuildIds.includes(selectedGuild.id);

    if (!isInstalledForSelectedGuild && activePage !== "dashboard") {
      navigateToPage("dashboard");
    }
  }, [authLoading, selectedGuild, botGuildIds, activePage]);

   useEffect(() => {
    function handleClickOutside(event) {
      if (
        serverSwitcherRef.current &&
        !serverSwitcherRef.current.contains(event.target)
      ) {
        setServerSwitcherOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

    useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash || "#/";
      setCurrentHash(hash);

      if (hash.startsWith("#/verification-editor/")) return;
if (hash.startsWith("#/embed-builder/")) {
  setActivePage("embedbuilder");
  return;
}
      const cleaned = hash.replace(/^#\/?/, "");

      if (!cleaned) {
        setActivePage("dashboard");
        return;
      }

      const routeMap = {
        dashboard: "dashboard",
        premium: "premium",
        welcome: "welcome",
        leveling: "leveling",
        giveaways: "giveaways",
        tickets: "tickets",
        automod: "automod",
        antiraid: "antiraid",
        suspicious: "suspicious",
        logs: "logs",
        selfroles: "selfroles",
        verification: "panels",
        embedbuilder: "embedbuilder",
        "embed-builder": "embedbuilder",
        serverstats: "serverstats",
        invitetracker: "invitetracker",
          "social-alerts": "social-alerts",
            rss: "rss",
        tempvoice: "tempvoice",
      settings: "settings",
"custom-bot": "custom-bot",
faq: "faq",
commands: "commands",
docs: "docs",
      };

      if (routeMap[cleaned]) {
        setActivePage(routeMap[cleaned]);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  const sortedGuilds = useMemo(() => {
    return [...guilds].sort((a, b) => {
      const aInstalled = botGuildIds.includes(a.id);
      const bInstalled = botGuildIds.includes(b.id);

      if (aInstalled !== bInstalled) return aInstalled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [guilds, botGuildIds]);

  const filteredGuilds = useMemo(() => {
    const query = serverSearch.trim().toLowerCase();

    if (!query) return sortedGuilds;

    return sortedGuilds.filter((guild) =>
      guild.name.toLowerCase().includes(query)
    );
  }, [sortedGuilds, serverSearch]);

  const kyroActiveGuilds = filteredGuilds.filter((guild) =>
    botGuildIds.includes(guild.id)
  );

  const availableGuilds = filteredGuilds.filter(
    (guild) => !botGuildIds.includes(guild.id)
  );

  function getSelectedGuildIcon(guild) {
    if (!guild?.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  }

    function getUserAvatarUrl(user) {
    if (!user?.id || !user?.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  }

  function getPageTitle() {
    if (activePage === "dashboard") return "Dashboard";
    if (activePage === "leveling") return "Leveling";
    if (activePage === "giveaways") return "Giveaways";
    if (activePage === "welcome") return "Welcome & Goodbye";
    if (activePage === "tickets") return "Tickets";
    if (activePage === "automod") return "Auto Moderation";
    if (activePage === "antiraid") return "Anti Raid";
    if (activePage === "suspicious") return "Suspicious Accounts";
    if (activePage === "logs") return "Logs";
    if (activePage === "selfroles") return "Self Roles";
    if (activePage === "panels") return "Verification";
    if (activePage === "embedbuilder") return "Embed Builder";
    if (activePage === "serverstats") return "Server Stats";
    if (activePage === "invitetracker") return "Invite Tracker";
        if (activePage === "social-alerts") return "Social Alerts";
            if (activePage === "rss") return "RSS Feeds";
    if (activePage === "tempvoice") return "Temporary Voice";
    if (activePage === "settings") return "Settings";
    return "Dashboard";
  }

  function getPageDescription() {
    if (activePage === "dashboard") {
      return "Manage your Kyro server systems from one premium dashboard.";
    }
    if (activePage === "leveling") {
      return "Configure chat XP, voice XP, rewards, and level-up settings.";
    }
    if (activePage === "giveaways") {
  return "Create, manage, and end Discord giveaways with a premium dashboard workflow.";
}
    if (activePage === "welcome") {
      return "Manage join and leave messages, welcome embeds, cards, and goodbye settings.";
    }
    if (activePage === "tickets") {
      return "Manage ticket panels, support settings, and ticket behavior.";
    }
    if (activePage === "automod") {
      return "Control spam protection, punishments, filters, and moderation rules.";
    }
    if (activePage === "antiraid") {
      return "Manage raid detection, thresholds, alerts, and safety actions.";
    }
    if (activePage === "suspicious") {
      return "Control suspicious account checks, actions, quarantine, and alerts.";
    }
    if (activePage === "logs") {
      return "Configure moderation, join, leave, and system log channels.";
    }
    if (activePage === "selfroles") {
      return "Manage self-role panels, role selection behavior, and role menus.";
    }
   if (activePage === "panels") {
  return "Build custom verification panels with button, reaction, or captcha modes.";
}
    if (activePage === "embedbuilder") {
      return "Design and manage your Discord embeds.";
    }
    if (activePage === "serverstats") {
      return "Manage live server stat channels, counters, and time displays.";
    }
    if (activePage === "invitetracker") {
      return "Track invites, joins, and invite performance across your server.";
    }
        if (activePage === "social-alerts") {
      return "Manage YouTube, TikTok, Kick, and Twitch creator alerts for your server.";
    }
        if (activePage === "rss") {
      return "Manage blog, website, and news RSS feeds for automatic Discord alerts.";
    }
    if (activePage === "tempvoice") {
      return "Manage temporary voice channels and ownership behavior.";
    }
    if (activePage === "settings") {
      return "Configure general dashboard and server-level settings.";
    }
    return "Manage your Kyro server systems from one premium dashboard.";
  }

function handleGuildSelect(guild) {
  setSelectedGuild(guild);
  localStorage.setItem("kyro_selected_guild_id", guild.id);
  setServerSwitcherOpen(false);
  setServerSearch("");

  navigateToPage("dashboard");
}

    const selectedGuildIcon = getSelectedGuildIcon(selectedGuild);
  const userAvatarUrl = getUserAvatarUrl(user);
if (authLoading) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 35%), linear-gradient(180deg, #020817 0%, #06112b 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.08), transparent 30%, transparent 70%, rgba(59,130,246,0.08))",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          padding: "36px 42px",
          borderRadius: "24px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(59,130,246,0.12)",
          backdropFilter: "blur(14px)",
        }}
      >
     <div
  style={{
    width: "74px",
    height: "74px",
    borderRadius: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(124,58,237,0.25))",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 0 30px rgba(59,130,246,0.18)",
    overflow: "hidden",
  }}
>
  <img
    src={kyroLogo}
    alt="Kyro Logo"
    style={{
      width: "48px",
      height: "48px",
      objectFit: "contain",
    }}
  />
</div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "6px",
            }}
          >
            Kyro
          </div>
          <div
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.68)",
              lineHeight: 1.6,
            }}
          >
            Loading Kyro dashboard...
          </div>
        </div>

        <div
          style={{
            width: "220px",
            height: "10px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #3b82f6, #7c3aed)",
              animation: "kyroLoaderSlide 1.2s ease-in-out infinite",
              boxShadow: "0 0 20px rgba(59,130,246,0.35)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
  return (
      <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#020817",
        fontFamily: "Arial, sans-serif",
        color: "white",
      }}
    >
 <GlobalToast
  toast={globalToast}
  onClose={() => setGlobalToast(null)}
/>
          <div
        style={{
          width: "300px",
          minWidth: "300px",
          height: "100vh",
          background: "#020617",
          padding: "20px 16px 20px 16px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxSizing: "border-box",
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            marginBottom: "22px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 8px",
          }}
        >
          <img
            src={kyroLogo}
            alt="Kyro Logo"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              objectFit: "cover",
              boxShadow: "0 0 12px rgba(59,130,246,0.55)",
            }}
          />
          <span
            style={{
              fontSize: "28px",
              fontWeight: "700",
            }}
          >
            Kyro
          </span>
        </div>

        <div
          ref={serverSwitcherRef}
          style={{ position: "relative", marginBottom: "18px", padding: "0 6px" }}
        >
          <button
            type="button"
            onClick={() => setServerSwitcherOpen((prev) => !prev)}
            style={{
              width: "100%",
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
              borderRadius: "16px",
              padding: "14px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textAlign: "left",
              boxShadow: isKyroInstalled
                ? "0 12px 30px rgba(59,130,246,0.15)"
                : "none",
            }}
          >
            {selectedGuild ? (
              <>
                {selectedGuildIcon ? (
                  <img
                    src={selectedGuildIcon}
                    alt={selectedGuild.name}
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #111827, #1e293b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {selectedGuild.name?.charAt(0) || "K"}
                  </div>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selectedGuild.name}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      color: isKyroInstalled ? "#93c5fd" : "rgba(255,255,255,0.58)",
                    }}
                  >
                    {isKyroInstalled ? "Kyro Active" : "Ready to Invite"}
                  </div>
                </div>

                <ChevronDown
                  size={18}
                  style={{
                    opacity: 0.7,
                    flexShrink: 0,
                    transform: serverSwitcherOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "0.2s",
                  }}
                />
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #111827, #1e293b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                >
                  K
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>
                    Select Server
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.58)",
                    }}
                  >
                    Choose a server to manage
                  </div>
                </div>
                <ChevronDown size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
              </>
            )}
          </button>

          {serverSwitcherOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: "6px",
                right: "6px",
                background: "#071226",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px",
                padding: "12px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
                zIndex: 30,
                maxHeight: "420px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  marginBottom: "14px",
                }}
              >
                <Search size={16} color="rgba(255,255,255,0.65)" />
                <input
                  value={serverSearch}
                  onChange={(e) => setServerSearch(e.target.value)}
                  placeholder="Search servers..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>

              {kyroActiveGuilds.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={groupLabel}>KYRO ACTIVE</div>
                  {kyroActiveGuilds.map((guild) => (
                    <ServerRow
                      key={guild.id}
                      guild={guild}
                      active={selectedGuild?.id === guild.id}
                      installed
                      onClick={() => handleGuildSelect(guild)}
                    />
                  ))}
                </div>
              )}

              {availableGuilds.length > 0 && (
                <div>
                  <div style={groupLabel}>AVAILABLE TO ADD</div>
                  {availableGuilds.map((guild) => (
                    <ServerRow
                      key={guild.id}
                      guild={guild}
                      active={selectedGuild?.id === guild.id}
                      installed={false}
                      onClick={() => handleGuildSelect(guild)}
                    />
                  ))}
                </div>
              )}

              {kyroActiveGuilds.length === 0 && availableGuilds.length === 0 && (
                <div
                  style={{
                    padding: "12px 8px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  No servers found.
                </div>
              )}
            </div>
          )}
        </div>

              <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: "4px",
            minHeight: 0,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(88,101,242,0.45) transparent",
          }}
        >
          {SIDEBAR_SECTIONS.map((section) => {
            const visibleItems =
              section.title === "OVERVIEW"
                ? section.items
                : isKyroInstalled
                ? section.items
                : [];

            if (!visibleItems.length) return null;

            return (
              <div key={section.title} style={{ marginBottom: "18px" }}>
                <div style={sidebarSectionTitle}>{section.title}</div>

                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      style={menuItem(activePage === item.id)}
                      onClick={() => navigateToPage(item.id)}
                      onMouseEnter={(e) => {
                        if (activePage !== item.id) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activePage !== item.id) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

          <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "82px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "#06112b",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 15,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "700",
              }}
            >
              {getPageTitle()}
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {getPageDescription()}
            </p>
          </div>

                  <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginRight: "4px",
              }}
            >
              <button
                type="button"
                style={topbarNavButton}
                onClick={() => navigateToPage("faq")}
              >
                FAQ
              </button>

              <button
                type="button"
                style={topbarNavButton}
                onClick={() => navigateToPage("commands")}
              >
                Commands
              </button>

              <button
                type="button"
                style={topbarNavButton}
                onClick={() => navigateToPage("docs")}
              >
                Docs
              </button>

              <button
                type="button"
                style={topbarSupportButton}
                onClick={() => window.open(KYRO_SUPPORT_INVITE, "_blank")}
              >
                Support
              </button>
            </div>

            <div
              ref={searchRef}
              style={{
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "0 14px",
                  borderRadius: "12px",
                  minWidth: "260px",
                  height: "44px",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <Search size={16} />
                <input
                  value={topbarSearch}
                  onChange={(e) => {
                    setTopbarSearch(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit();
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search pages..."
                  style={{
                    flex: 1,
                    height: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>

              {searchOpen && topbarSearch.trim() && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    left: 0,
                    width: "100%",
                    background: "#071226",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {filteredSearchPages.length > 0 ? (
                    <div style={{ padding: "10px" }}>
                      {filteredSearchPages.map((page) => (
                        <button
                          key={page.name}
                          type="button"
                          onClick={() => {
                            navigateToPage(page.name);
                            setTopbarSearch("");
                            setSearchOpen(false);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(255,255,255,0.03)",
                            color: "white",
                            borderRadius: "12px",
                            padding: "12px 14px",
                            marginBottom: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          <div style={{ textTransform: "capitalize" }}>
                            {page.name === "panels" ? "Verification" : page.name.replace("-", " ")}
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.58)",
                              fontWeight: "500",
                            }}
                          >
                            {page.keywords.join(" • ")}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      No matching pages found.
                    </div>
                  )}
                </div>
              )}
            </div>

                       <div ref={notificationRef} style={{ position: "relative" }}>
              <button
                type="button"
                style={iconButton}
                onClick={() => setNotificationsOpen((prev) => !prev)}
              >
                <Bell size={18} />
              </button>

              {notificationsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: "320px",
                    background: "#071226",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "white",
                    }}
                  >
                    Notifications
                  </div>

                  <div style={{ padding: "10px" }}>
                    <div style={notificationItemStyle}>
                      <div style={notificationTitleStyle}>Dashboard ready</div>
                      <div style={notificationTextStyle}>
                        Kyro dashboard is loaded and ready to manage your server.
                      </div>
                    </div>

                    {selectedGuild ? (
                      <div style={notificationItemStyle}>
                        <div style={notificationTitleStyle}>Selected server</div>
                        <div style={notificationTextStyle}>
                          You are currently managing <strong>{selectedGuild.name}</strong>.
                        </div>
                      </div>
                    ) : null}

                    <div style={notificationItemStyle}>
                      <div style={notificationTitleStyle}>Support available</div>
                      <div style={notificationTextStyle}>
                        Need help? Use the Support button in the top bar to join the Kyro server.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

                       {token ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 10px 6px 6px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: "42px",
                  }}
                >
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={user?.username || "User"}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "999px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #1e293b, #334155)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "white",
                      }}
                    >
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div style={{ lineHeight: 1.1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "white",
                        maxWidth: "120px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user?.global_name || user?.username || "Discord User"}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.6)",
                        marginTop: "4px",
                      }}
                    >
                      Connected
                    </div>
                  </div>
                </div>

                <button
                  style={authButton}
                  onClick={() => {
                    localStorage.removeItem("discord_token");
                    localStorage.removeItem("kyro_selected_guild_id");
                    setToken("");
                    setGuilds([]);
                    setUser(null);
                    setSelectedGuild(null);
                    setBotGuildIds([]);
                    navigateToPage("dashboard");
                    setServerSearch("");
                    setServerSwitcherOpen(false);
                    setNotificationsOpen(false);
                    setTopbarSearch("");
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                style={authButton}
                onClick={() => {
                  window.location.href = "https://kyro-dashboard-production.up.railway.app/auth/discord";
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>

              <div
              ref={contentScrollRef}
          style={{
            flex: 1,
            padding: "24px",
            position: "relative",
            overflowX: "hidden",
            overflowY: "auto",
            minHeight: 0,
            backgroundImage: !token ? `url(${landingBg})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
            backgroundColor: !token ? "transparent" : "#081225",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: !token
                ? "linear-gradient(90deg, rgba(8,18,37,1) 20%, rgba(8,18,37,0.95) 45%, rgba(8,18,37,0.7) 70%, rgba(8,18,37,0.4) 100%)"
                : "linear-gradient(180deg, rgba(8,18,37,0.96), rgba(8,18,37,0.96))",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: "1500px",
              margin: "0 auto",
              width: "100%",
              position: "relative",
              zIndex: 2,
              padding: "24px",
              paddingBottom: "120px",
              minHeight: "calc(100vh - 130px)",
              boxSizing: "border-box",
              overflow: "visible",
            }}
          >
            
           {isVerificationEditorRoute ? (
  <VerificationEditorPage />
) : (
  <>
    {activePage === "dashboard" && (
    <DashboardPage
  guilds={guilds}
  token={token}
  user={user}
  selectedGuild={selectedGuild}
  setSelectedGuild={setSelectedGuild}
  navigateToPage={navigateToPage}
  botGuildIds={botGuildIds}
/>
    )}

{activePage === "premium" && <PremiumPage />}

    {activePage === "leveling" && (
      <LevelingPage selectedGuild={selectedGuild} />
    )}

{activePage === "giveaways" && (
<GiveawaysPage
  selectedGuild={selectedGuild}
  setGlobalToast={setGlobalToast}
  currentUser={user}
/>
)}
    {activePage === "embedbuilder" && (
      <EmbedBuilderPage
  selectedGuild={selectedGuild}
  setGlobalToast={setGlobalToast}
/>
    )}

   {activePage === "welcome" && (
  <WelcomePage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
  />
)}

   {activePage === "tickets" && (
  <TicketsPage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
  />
)}


    {activePage === "security" && (
  <SecurityPage
  selectedGuild={selectedGuild}
  setGlobalToast={setGlobalToast}
/>
)}

    {activePage === "suspicious" && (
      <PlaceholderPage
        title="Suspicious Accounts"
        text="Later we will connect suspicious account settings, actions, age checks, quarantine, and alert behavior here."
      />
    )}

    {activePage === "logs" && (
      <LogsPage selectedGuild={selectedGuild} />
    )}

{activePage === "social-alerts" && (
  <SocialAlertsPage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
  />
)}

{activePage === "rss" && (
  <RSSPage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
    navigateToPage={navigateToPage}
  />
)}

   {activePage === "selfroles" && (
  <SelfRolesPage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
  />
)}

 {activePage === "panels" && (
  <VerificationPage
    selectedGuild={selectedGuild}
    guildId={selectedGuild?.id}
    setGlobalToast={setGlobalToast}
  />
)}

{activePage === "serverstats" && (
  <ServerStatsPage
    selectedGuild={selectedGuild}
    onBack={() => navigateToPage("dashboard")}
    setGlobalToast={setGlobalToast}
  />
)}

   {activePage === "invitetracker" && (
  <InviteTrackerPage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
  />
)}

  {activePage === "tempvoice" && (
  <TemporaryVoicePage
  selectedGuild={selectedGuild}
  setGlobalToast={setGlobalToast}
/>
)}

{activePage === "settings" && (
  <SettingsPage
    selectedGuild={selectedGuild}
    navigateToPage={navigateToPage}
    supportInvite={KYRO_SUPPORT_INVITE}
  />
)}

{activePage === "custom-bot" && (
  <CustomBotPage
    selectedGuild={selectedGuild}
    setGlobalToast={setGlobalToast}
  />
)}

{activePage === "faq" && <FAQPage />}

{activePage === "commands" && <CommandsPage />}
{activePage === "docs" && <DocsPage />}

 {activePage === "automod" && (
  <AutomodPage
    selectedGuild={selectedGuild}
    guildId={selectedGuild?.id}
    setGlobalToast={setGlobalToast}
  />
)}
  </>
)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServerRow({ guild, active, installed, onClick }) {
  const guildIcon = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        background: active ? "rgba(59,130,246,0.14)" : "transparent",
        borderRadius: "12px",
        padding: "10px",
        color: "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        textAlign: "left",
        marginBottom: "6px",
      }}
    >
      {guildIcon ? (
        <img
          src={guildIcon}
          alt={guild.name}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #111827, #1e293b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "14px",
            flexShrink: 0,
          }}
        >
          {guild.name?.charAt(0) || "K"}
        </div>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {guild.name}
        </div>
        <div
          style={{
            marginTop: "3px",
            fontSize: "11px",
            color: installed ? "#93c5fd" : "rgba(255,255,255,0.56)",
          }}
        >
          {installed ? "Kyro Active" : "Ready to Invite"}
        </div>
      </div>
    </button>
  );
}

function DashboardPage({
  guilds,
  token,
  user,
  selectedGuild,
  setSelectedGuild,
  navigateToPage,
  botGuildIds,
}) {
    const [serverSearch, setServerSearch] = useState("");
  if (!token) {
    return (
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "40px",
          padding: "52px",
          minHeight: "640px",
          borderRadius: "28px",
          overflow: "hidden",
          background:
            "linear-gradient(90deg, rgba(5,12,28,0.55) 0%, rgba(5,12,28,0.35) 40%, rgba(5,12,28,0.15) 100%)",
          backdropFilter: "blur(4px)",
          border: "none",
          boxShadow: "0 20px 80px rgba(0,0,0,0.4)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${landingBg})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
            filter: "brightness(0.9) saturate(1.1)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(8,18,37,1) 22%, rgba(8,18,37,0.92) 48%, rgba(8,18,37,0.45) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "560px",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "800",
              margin: 0,
              lineHeight: "1.05",
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Manage your
            <br />
            Discord servers
            <br />
            with Kyro
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: "1.7",
              color: "rgba(255,255,255,0.72)",
              marginTop: "24px",
              marginBottom: "0",
              maxWidth: "520px",
            }}
          >
            All-in-one premium dashboard to control, automate, and scale your
            Discord servers.
          </p>

         <div
  style={{
    display: "flex",
    gap: "16px",
    marginTop: "32px",
    flexWrap: "wrap",
  }}
>
  <button
    style={{
      border: "none",
      padding: "15px 28px",
      borderRadius: "14px",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      color: "white",
      background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
      boxShadow: "0 10px 30px rgba(59,130,246,0.4)",
    }}
    onClick={() => {
      window.location.href = "https://kyro-dashboard-production.up.railway.app/auth/discord";
    }}
  >
    Login with Discord
  </button>

  <button
    style={{
      border: "1px solid rgba(255,255,255,0.12)",
      padding: "15px 28px",
      borderRadius: "14px",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      color: "white",
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    }}
    onClick={() => {
      window.open(
        "https://discord.com/oauth2/authorize?client_id=1471853928034467870&permissions=8&scope=bot%20applications.commands",
        "_blank"
      );
    }}
  >
    Invite Kyro
  </button>
</div>
        </div>
      </div>
    );
  }
  const normalizedServerSearch = serverSearch.trim().toLowerCase();
  const servers = [...guilds]
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      role: "Manage Server",
      botInstalled: botGuildIds.includes(guild.id),
      icon: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null,
      banner:
        selectedGuild?.id === guild.id
          ? "linear-gradient(135deg, rgba(59,130,246,0.28), rgba(124,58,237,0.25))"
          : "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(124,58,237,0.18))",
    }))
        .filter((server) => {
      if (!normalizedServerSearch) return true;
      return server.name.toLowerCase().includes(normalizedServerSearch);
    })
    .sort((a, b) => {
      if (a.botInstalled !== b.botInstalled) return a.botInstalled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

      const installedServers = servers.filter((server) => server.botInstalled);
  const notInstalledServers = servers.filter((server) => !server.botInstalled);

  if (servers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={sectionTitle}>No manageable servers found</h2>
        <p style={sectionText}>
          Kyro will show servers where you have Manage Server or Administrator
          permission.
        </p>
      </div>
    );
  }

   if (selectedGuild && botGuildIds.includes(selectedGuild.id)) {
    const moduleCards = [
      {
        title: "Welcome",
        description: "Manage welcome messages, cards, auto roles, and DMs.",
        buttonText: "Open Welcome",
        page: "welcome",
        icon: Sparkles,
        badge: "Engagement",
      },
      {
        title: "Leveling",
        description: "Configure XP, voice activity, rewards, and level-up settings.",
        buttonText: "Open Leveling",
        page: "leveling",
        icon: BarChart3,
        badge: "Engagement",
      },
      {
        title: "Self Roles",
        description: "Manage self-role panels, dropdowns, buttons, reactions, and selection behavior.",
        buttonText: "Open Self Roles",
        page: "selfroles",
        icon: Users,
        badge: "Engagement",
      },
      {
        title: "Giveaways",
        description: "Create, manage, and end giveaways with a polished dashboard workflow.",
        buttonText: "Open Giveaways",
        page: "giveaways",
        icon: Gift,
        badge: "Engagement",
      },
      {
        title: "Auto Moderation",
        description: "Set punishments, spam limits, and moderation rules.",
        buttonText: "Open Auto Moderation",
        page: "automod",
        icon: Shield,
        badge: "Security",
      },
      {
        title: "Security",
        description: "Manage anti-raid, suspicious account checks, and server protection systems.",
        buttonText: "Open Security",
        page: "security",
        icon: BadgeCheck,
        badge: "Security",
      },
      {
        title: "Logs",
        description: "Control moderation logs, join logs, leave logs, and more.",
        buttonText: "Open Logs",
        page: "logs",
        icon: ScrollText,
        badge: "Moderation",
      },
      {
        title: "Tickets",
        description: "Manage ticket panels, support flow, and ticket settings.",
        buttonText: "Open Tickets",
        page: "tickets",
        icon: Ticket,
        badge: "Support",
      },
      {
        title: "Verification",
        description: "Build verification panels with button, reaction, or captcha flows.",
        buttonText: "Open Verification",
        page: "panels",
        icon: ShieldCheck,
        badge: "Panels",
      },
      {
        title: "Embed Builder",
        description: "Create rich embed messages and prepare dashboard to bot sending.",
        buttonText: "Open Embed Builder",
        page: "embedbuilder",
        icon: PenSquare,
        badge: "Utility",
      },
      {
        title: "Server Stats",
        description: "Manage live server stat channels, counters, and time displays.",
        buttonText: "Open Server Stats",
        page: "serverstats",
        icon: Radio,
        badge: "Utility",
      },
      {
        title: "Invite Tracker",
        description: "Track invites, joins, fake accounts, and reward progress.",
        buttonText: "Open Invite Tracker",
        page: "invitetracker",
        icon: UserPlus,
        badge: "Utility",
      },
      {
        title: "Social Alerts",
        description: "Send alerts for YouTube, TikTok, Kick, and Twitch creators.",
        buttonText: "Open Social Alerts",
        page: "social-alerts",
        icon: Bell,
        badge: "Utility",
      },
      {
        title: "RSS Feeds",
        description: "Track blogs, websites, and news feeds with automatic Discord posting.",
        buttonText: "Open RSS Feeds",
        page: "rss",
        icon: Rss,
        badge: "Utility",
      },
      {
        title: "Temporary Voice",
        description: "Manage join-to-create voice channels and ownership behavior.",
        buttonText: "Open Temporary Voice",
        page: "tempvoice",
        icon: AudioLines,
        badge: "Utility",
      },
      {
        title: "Settings",
        description: "Configure general dashboard and server-level settings.",
        buttonText: "Open Settings",
        page: "settings",
        icon: Wrench,
        badge: "Core",
      },
    ];

    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "28px",
            padding: "24px",
            borderRadius: "22px",
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.08))",
            border: "1px solid rgba(59,130,246,0.16)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
            {selectedGuild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
                alt={selectedGuild.name}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "18px",
                  objectFit: "cover",
                  flexShrink: 0,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #111827, #1e293b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {selectedGuild.name?.charAt(0) || "K"}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: "800",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedGuild.name}
              </h2>
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Kyro is active in this server. Use the sidebar to manage modules or jump into a section below.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(59,130,246,0.14)",
              border: "1px solid rgba(96,165,250,0.22)",
              fontSize: "13px",
              fontWeight: "700",
              color: "#93c5fd",
              flexShrink: 0,
            }}
          >
            Kyro Active
          </div>
        </div>

        <div style={quickGrid}>
          {moduleCards.map((card) => (
            <QuickAccessCard
              key={card.page}
              title={card.title}
              description={card.description}
              buttonText={card.buttonText}
              icon={card.icon}
              badge={card.badge}
              onClick={() => navigateToPage(card.page)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={sectionTitle}>Select a server</h2>
      <p style={sectionText}>
        {user?.username
          ? `Welcome ${user.username}. Choose a server to manage with Kyro.`
          : "Choose a server to manage with Kyro."}
      </p>
      <div style={serverSearchWrap}>
        <Search size={18} color="rgba(255,255,255,0.65)" />
        <input
          value={serverSearch}
          onChange={(e) => setServerSearch(e.target.value)}
          placeholder="Search your servers..."
          style={serverSearchInput}
        />
      </div>
     <div style={serverGrid}>

  {installedServers.length > 0 && (
    <>
      <div style={serverGroupTitle}>KYRO ACTIVE</div>

      {installedServers.map((server) => (
        <ServerCard
          key={server.id}
          server={server}
          selectedGuild={selectedGuild}
          guilds={guilds}
          setSelectedGuild={setSelectedGuild}
          navigateToPage={navigateToPage}
        />
      ))}
    </>
  )}

  {notInstalledServers.length > 0 && (
    <>
      <div style={serverGroupTitle}>AVAILABLE TO ADD</div>

      {notInstalledServers.map((server) => (
        <ServerCard
          key={server.id}
          server={server}
          selectedGuild={selectedGuild}
          guilds={guilds}
          setSelectedGuild={setSelectedGuild}
          navigateToPage={navigateToPage}
        />
      ))}
    </>
  )}

</div>
    </div>
  );
}

function ServerCard({
  server,
  selectedGuild,
  guilds,
  setSelectedGuild,
  navigateToPage,
}) {
  return (
    <div
      style={{
        ...serverCard,
        border:
          selectedGuild?.id === server.id
            ? "1px solid rgba(59,130,246,0.55)"
            : "1px solid rgba(59,130,246,0.15)",
        boxShadow:
          selectedGuild?.id === server.id
            ? "0 12px 35px rgba(59,130,246,0.25)"
            : "none",
      }}
      onClick={() => {
        const guild = guilds.find((g) => g.id === server.id);
        setSelectedGuild(guild || null);
      }}
    >
      <div
        style={{
          ...serverBanner,
          background: server.banner,
        }}
      >
        <div style={bannerBlur}></div>

        <div style={serverAvatarWrap}>
          {server.icon ? (
            <img src={server.icon} alt={server.name} style={serverImage} />
          ) : (
            <div style={serverAvatar}>{server.name.charAt(0)}</div>
          )}
        </div>
      </div>

      <div style={serverBottom}>
        <div style={serverTextWrap}>
          <h3 style={serverTitle} title={server.name}>
            {server.name}
          </h3>

          <p style={serverSubtitle}>
            {server.botInstalled
              ? selectedGuild?.id === server.id
                ? "Selected Server"
                : "Manage Server"
              : "Invite Kyro Bot"}
          </p>
        </div>

        <button
          style={manageButton}
          onClick={(e) => {
            e.stopPropagation();

            if (!server.botInstalled) {
              const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&integration_type=0&scope=bot%20applications.commands&guild_id=${server.id}&disable_guild_select=true`;
              window.open(inviteUrl, "_blank");
              return;
            }

            const guild = guilds.find((g) => g.id === server.id);
            setSelectedGuild(guild || null);
            navigateToPage("dashboard");
          }}
        >
          {server.botInstalled ? "Manage" : "Invite Bot"}
        </button>
      </div>
    </div>
  );
}

function QuickAccessCard({
  title,
  description,
  buttonText,
  onClick,
  icon: Icon,
  badge,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
        border: "1px solid rgba(59,130,246,0.16)",
        borderRadius: "22px",
        padding: "22px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        transition: "all 0.25s ease",
        cursor: "pointer",
        overflow: "hidden",
        minHeight: "240px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow =
          "0 20px 45px rgba(59,130,246,0.18)";
        e.currentTarget.style.border =
          "1px solid rgba(59,130,246,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
        e.currentTarget.style.boxShadow =
          "0 12px 30px rgba(0,0,0,0.18)";
        e.currentTarget.style.border =
          "1px solid rgba(59,130,246,0.16)";
      }}
    >
            <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {Icon ? <Icon size={22} /> : null}
          </div>

          {badge ? (
            <div
              style={{
                padding: "7px 10px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.78)",
                whiteSpace: "nowrap",
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: "800",
            color: "white",
            lineHeight: "1.2",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "12px 0 0 0",
            fontSize: "14px",
            lineHeight: "1.8",
            color: "rgba(255,255,255,0.68)",
            minHeight: "78px",
          }}
        >
          {description}
        </p>
      </div>

      <button
        style={{
          marginTop: "20px",
          alignSelf: "flex-start",
          border: "none",
          background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
          color: "white",
          borderRadius: "12px",
          padding: "11px 16px",
          fontSize: "14px",
          fontWeight: "700",
          cursor: "pointer",
          boxShadow: "0 8px 18px rgba(59,130,246,0.28)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {buttonText}
      </button>
    </div>
  );
}

function PlaceholderPage({ title, text }) {
  return (
    <div>
      <h2 style={sectionTitle}>{title}</h2>
      <p style={sectionText}>{text}</p>
    </div>
  );
}

function menuItem(active = false) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
    cursor: "pointer",
    padding: "12px 14px",
    borderRadius: "12px",
    background: active ? "rgba(59,130,246,0.18)" : "transparent",
    boxShadow: active
      ? "0 0 0 1px rgba(59,130,246,0.25), 0 6px 20px rgba(59,130,246,0.15)"
      : "none",
    color: "white",
    transition: "all 0.2s ease",
    userSelect: "none",
    fontSize: "14px",
    fontWeight: active ? "600" : "500",
    borderLeft: active
      ? "3px solid rgba(96,165,250,0.95)"
      : "3px solid transparent",
  };
}

const groupLabel = {
  padding: "0 6px",
  marginBottom: "8px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.42)",
};

const sidebarSectionTitle = {
  padding: "0 14px",
  marginBottom: "10px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  color: "rgba(255,255,255,0.35)",
};

const iconButton = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const topbarNavButton = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.86)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const topbarSupportButton = {
  border: "1px solid rgba(88,101,242,0.35)",
  background: "rgba(88,101,242,0.14)",
  color: "#c7d2fe",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const notificationItemStyle = {
  padding: "12px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  marginBottom: "10px",
};

const notificationTitleStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "white",
  marginBottom: "6px",
};

const notificationTextStyle = {
  fontSize: "12px",
  lineHeight: "1.6",
  color: "rgba(255,255,255,0.68)",
};

const authButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: "10px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(59,130,246,0.35)",
};

const sectionTitle = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "700",
  textAlign: "center",
};

const sectionText = {
  marginTop: "10px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "15px",
  lineHeight: "1.6",
  textAlign: "center",
};

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "22px",
  marginTop: "10px",
};

const serverGroupTitle = {
  gridColumn: "1 / -1",
  marginTop: "10px",
  marginBottom: "-8px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.12em",
  color: "rgba(255,255,255,0.48)",
};

const serverGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  justifyContent: "center",
  gap: "28px",
  marginTop: "32px",
};

const serverCard = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(59,130,246,0.15)",
  borderRadius: "18px",
  padding: "16px",
  transition: "all 0.25s ease",
  cursor: "pointer",
};

const serverBanner = {
  position: "relative",
  height: "120px",
  borderRadius: "14px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const bannerBlur = {
  position: "absolute",
  inset: 0,
  backdropFilter: "blur(8px)",
  background: "rgba(255,255,255,0.03)",
};

const serverAvatarWrap = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const serverAvatar = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #111827, #1e293b)",
  border: "2px solid rgba(255,255,255,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: "700",
  color: "white",
  boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
};

const serverImage = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  objectFit: "cover",
  border: "2px solid rgba(255,255,255,0.9)",
  boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
};

const serverBottom = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  paddingTop: "14px",
};

const serverTextWrap = {
  minWidth: 0,
  flex: 1,
  paddingRight: "6px",
};

const serverTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "700",
  color: "white",
  lineHeight: "1.2",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const serverSubtitle = {
  margin: "6px 0 0 0",
  fontSize: "12px",
  color: "rgba(255,255,255,0.65)",
};

const manageButton = {
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  borderRadius: "10px",
  padding: "10px 18px",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  minWidth: "90px",
  transition: "0.2s",
  boxShadow: "0 6px 16px rgba(59,130,246,0.35)",
  flexShrink: 0,
};

const serverSearchWrap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "12px 14px",
  marginTop: "18px",
  marginBottom: "24px",
  maxWidth: "420px",
};

const serverSearchInput = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white",
  fontSize: "14px",
};

export default App;