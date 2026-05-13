import { BookOpen, Rocket, Shield, Bell, Ticket, Radio, ChevronRight } from "lucide-react";

const DOC_SECTIONS = [
  {
    title: "Getting Started",
    icon: Rocket,
    description: "Begin with the core Kyro setup flow and understand how to activate the bot in your server.",
    guides: [
      {
        title: "Invite Kyro to your server",
        text: "Select your server from the dashboard and invite Kyro if it is not active there yet.",
      },
      {
        title: "Choose your server in the dashboard",
        text: "Use the server switcher in the sidebar to manage the correct community.",
      },
      {
        title: "Open modules one by one",
        text: "Configure only the systems you need, such as Welcome, Tickets, Verification, Logs, or Security.",
      },
    ],
  },
  {
    title: "Tickets & Verification",
    icon: Ticket,
    description: "Set up support systems and publish interactive flows into Discord.",
    guides: [
      {
        title: "Configure ticket categories and staff roles",
        text: "Set open, closed, support, report, or application categories and define the correct staff role.",
      },
      {
        title: "Publish a ticket panel",
        text: "Use the Tickets page or the send-dashboard-panel command to send your configured ticket panel into Discord.",
      },
      {
        title: "Set up verification",
        text: "Choose your verification method, configure the role, and publish the panel in the correct channel.",
      },
    ],
  },
  {
    title: "Alerts, Feeds & Tracking",
    icon: Bell,
    description: "Use creator alerts, RSS feeds, invite tracking, and activity systems effectively.",
    guides: [
      {
        title: "Social Alerts",
        text: "Choose the platform, creator, alert channel, and optional ping role, then save the configuration for your server.",
      },
      {
        title: "RSS Feeds",
        text: "Add the feed, select the channel, and verify that the source URL is valid and the bot can post there.",
      },
      {
        title: "Invite Tracker & Server Stats",
        text: "Use these systems to monitor growth and automatically update stat channels or invite progress.",
      },
    ],
  },
  {
    title: "Security & Best Practices",
    icon: Shield,
    description: "Protect your setup and avoid the most common configuration mistakes.",
    guides: [
      {
        title: "Check permissions first",
        text: "If a module is not posting or updating properly, confirm that Kyro has the required Discord permissions in the target channel.",
      },
      {
        title: "Review categories and channels carefully",
        text: "Incorrect channel selection is one of the most common reasons dashboards and modules appear broken.",
      },
      {
        title: "Use Support when in doubt",
        text: "If a setup feels wrong, use the Support server link in the dashboard instead of guessing your way through production settings.",
      },
    ],
  },
];

export default function DocsPage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #111827, #1e293b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
              flexShrink: 0,
            }}
          >
            <BookOpen size={28} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "800",
                color: "white",
              }}
            >
              Documentation
            </h2>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "14px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Practical Kyro setup guidance for getting started, publishing modules, and avoiding common mistakes.
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
          Docs Center
        </div>
      </div>

      <div style={docsGrid}>
        {DOC_SECTIONS.map((section) => (
          <DocSectionCard
            key={section.title}
            title={section.title}
            icon={section.icon}
            description={section.description}
            guides={section.guides}
          />
        ))}
      </div>
    </div>
  );
}

function DocSectionCard({ title, icon: Icon, description, guides }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
        border: "1px solid rgba(59,130,246,0.16)",
        borderRadius: "22px",
        padding: "22px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          marginBottom: "16px",
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

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {guides.map((guide, index) => (
          <DocGuideRow
            key={`${title}-${index}`}
            title={guide.title}
            text={guide.text}
          />
        ))}
      </div>
    </div>
  );
}

function DocGuideRow({ title, text }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          marginBottom: "6px",
        }}
      >
        <ChevronRight
          size={16}
          style={{ color: "rgba(255,255,255,0.72)", marginTop: "2px", flexShrink: 0 }}
        />
        <div
          style={{
            fontSize: "14px",
            fontWeight: "800",
            color: "white",
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: "1.75",
          color: "rgba(255,255,255,0.72)",
          paddingLeft: "26px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

const docsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "22px",
};