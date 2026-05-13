import {
  Settings,
  Shield,
  Sparkles,
  LifeBuoy,
  BookOpen,
  TerminalSquare,
  HelpCircle,
  AlertTriangle,
  Crown,
} from "lucide-react";

export default function SettingsPage({
  selectedGuild,
  navigateToPage,
  supportInvite,
}) {
  const guildIcon = selectedGuild?.icon
    ? `https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`
    : null;

  const guildName = selectedGuild?.name || "No server selected";
  const guildId = selectedGuild?.id || "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          padding: "24px",
          borderRadius: "22px",
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.08))",
          border: "1px solid rgba(59,130,246,0.16)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            minWidth: 0,
          }}
        >
          {guildIcon ? (
            <img
              src={guildIcon}
              alt={guildName}
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
                color: "white",
              }}
            >
              {guildName?.charAt(0) || "K"}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "800",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Settings
            </h2>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "14px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Manage server preferences, future branding options, resources, and account level controls.
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
          Kyro Settings
        </div>
      </div>

      <div style={settingsGrid}>
        <SectionCard
          icon={Shield}
          title="General Server"
          description="Basic details for the server currently connected to Kyro."
        >
          <InfoRow label="Server Name" value={guildName} />
          <InfoRow label="Server ID" value={guildId} mono />
          <InfoRow label="Kyro Status" value={selectedGuild ? "Connected" : "No server selected"} />
        </SectionCard>

        <SectionCard
          icon={Sparkles}
          title="Branding & Personalization"
          description="Future premium controls for making Kyro feel native to each server."
          badge="Premium Soon"
        >
          <FeaturePill text="Custom bot name" />
          <FeaturePill text="Custom bot avatar" />
          <FeaturePill text="Embed accent color" />
          <FeaturePill text="Footer branding" />
          <ComingSoonText text="These options will be added after the Settings foundation is complete." />
        </SectionCard>

        <SectionCard
          icon={LifeBuoy}
          title="Support & Resources"
          description="Quick access to help, setup guides, and product resources."
        >
          <LinkRow
  icon={LifeBuoy}
  label="Support Server"
  onClick={() => window.open(supportInvite, "_blank")}
/>

<LinkRow
  icon={BookOpen}
  label="Documentation"
  onClick={() => navigateToPage("docs")}
/>

<LinkRow
  icon={TerminalSquare}
  label="Commands"
  onClick={() => navigateToPage("commands")}
/>

<LinkRow
  icon={HelpCircle}
  label="FAQ"
  onClick={() => navigateToPage("faq")}
/>
        </SectionCard>

        <SectionCard
          icon={Crown}
          title="Premium Overview"
          description="A quick preview of premium ready areas that will live here later."
          badge="Planned"
        >
          <FeaturePill text="Advanced server branding" />
          <FeaturePill text="Expanded module limits" />
          <FeaturePill text="Premium-only automation controls" />
          <ComingSoonText text="Billing and plan controls can be connected here after premium rollout." />
        </SectionCard>
      </div>

      <SectionCard
        icon={AlertTriangle}
        title="Danger Zone"
        description="Future controls for resetting or disabling major settings."
        badge="Use with care"
        fullWidth
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <button style={dangerButtonMuted}>Reset Server Configuration</button>
          <button style={dangerButtonMuted}>Disable All Modules</button>
        </div>

        <ComingSoonText text="These actions are placeholders for now and should be wired carefully later." />
      </SectionCard>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  badge,
  fullWidth = false,
}) {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
        border: "1px solid rgba(59,130,246,0.16)",
        borderRadius: "22px",
        padding: "22px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        minHeight: fullWidth ? "unset" : "240px",
      }}
    >
          <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
                <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "16px",
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
            }}
          >
            {Icon ? <Icon size={21} /> : null}
          </div>

          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "800",
                color: "white",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "13px",
                lineHeight: "1.7",
                color: "rgba(255,255,255,0.68)",
              }}
            >
              {description}
            </p>
          </div>
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
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: "12px 14px",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "rgba(255,255,255,0.76)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "white",
          fontFamily: mono ? "monospace" : "inherit",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FeaturePill({ text }) {
  return (
    <div
      style={{
        padding: "11px 14px",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "white",
        fontSize: "13px",
        fontWeight: "600",
      }}
    >
      {text}
    </div>
  );
}

function LinkRow({ icon: Icon, label, onClick }) {
  return (
    <button
  type="button"
  onClick={onClick}
  style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "white",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "12px",
          background: "rgba(99,102,241,0.14)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {Icon ? <Icon size={16} /> : null}
      </div>

      <div
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "white",
        }}
      >
        {label}
      </div>
    </button>
  );
}

function ComingSoonText({ text }) {
  return (
    <div
      style={{
        fontSize: "12px",
        lineHeight: "1.7",
        color: "rgba(255,255,255,0.58)",
        paddingTop: "4px",
      }}
    >
      {text}
    </div>
  );
}

const settingsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "22px",
};

const dangerButtonMuted = {
  border: "1px solid rgba(239,68,68,0.20)",
  background: "rgba(239,68,68,0.10)",
  color: "#fecaca",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
};