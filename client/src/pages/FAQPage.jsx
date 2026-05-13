import { HelpCircle, ChevronDown, LifeBuoy, Shield, Sparkles } from "lucide-react";
import { useState } from "react";

const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    icon: Sparkles,
    items: [
      {
        question: "What is Kyro?",
        answer:
          "Kyro is an all in one Discord management bot with a premium web dashboard. It helps server owners manage systems like welcome messages, leveling, tickets, verification, logs, security, giveaways, self roles, social alerts, RSS feeds, temporary voice channels, and more from one place.",
      },
      {
        question: "How do I start using Kyro in my server?",
        answer:
          "First invite Kyro to your server, then select that server from the dashboard. Once Kyro is active there, you can open each module page and configure the features you want to use.",
      },
      {
        question: "Do I need the dashboard to use Kyro?",
        answer:
          "The dashboard is the main way to configure Kyro and gives you the best setup experience. Some command based flows may still exist for certain features, but the dashboard is designed to be the primary control center.",
      },
    ],
  },
  {
    title: "Features & Setup",
    icon: HelpCircle,
    items: [
      {
        question: "What features does Kyro include?",
        answer:
          "Kyro supports major server systems such as Welcome, Leveling, Self Roles, Giveaways, Auto Moderation, Security, Logs, Tickets, Verification, Embed Builder, Server Stats, Invite Tracker, Social Alerts, RSS, and Temporary Voice.",
      },
      {
        question: "Can I choose which modules to use?",
        answer:
          "Yes. You can configure only the modules your server needs. Kyro is designed so communities, support servers, creator servers, gaming servers, and business servers can all use different parts of the bot.",
      },
      {
        question: "How do I know if Kyro is active in my server?",
        answer:
          "When you select a server in the dashboard, it will show whether Kyro is active there. If the bot is not installed yet, you can invite it directly from the dashboard flow.",
      },
    ],
  },
  {
    title: "Publishing & Using Modules",
    icon: Shield,
    items: [
      {
        question: "How do I publish something to Discord?",
        answer:
          "For modules that support publishing, configure the settings in the dashboard, choose the correct channel or target, and use the publish or send action for that module. Kyro then sends the configured panel, embed, alert, or system output to Discord.",
      },
      {
        question: "Why is a feature not posting in my server?",
        answer:
          "The most common reasons are missing channel selection, missing permissions, incomplete module setup, or using a server where Kyro is not fully active yet. Double-check the module settings and make sure the selected channel and permissions are correct.",
      },
      {
        question: "Can Kyro manage multiple servers?",
        answer:
          "Yes. If you have permission to manage multiple servers, you can switch between them from the dashboard and configure each one separately.",
      },
    ],
  },
  {
    title: "Security, Support & Plans",
    icon: LifeBuoy,
    items: [
      {
        question: "Is Kyro safe to use?",
        answer:
          "Kyro is built to help server owners manage their communities more efficiently from a controlled dashboard experience. As with any Discord bot, you should only grant the permissions your server needs and review module settings carefully during setup.",
      },
      {
        question: "How do I get help with setup or troubleshooting?",
        answer:
          "Use the Support button in the dashboard or open Support & Resources from the Settings page to join the Kyro support server. That is the best place to get help, report issues, and ask questions.",
      },
      {
        question: "Will Kyro offer premium features?",
        answer:
          "Yes. Kyro is designed with premium ready systems such as advanced branding, expanded limits, and higher end configuration options for servers that want more control and customization.",
      },
    ],
  },
];

export default function FAQPage() {
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
            <HelpCircle size={28} />
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
              Frequently Asked Questions
            </h2>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "14px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Quick answers for setup, modules, dashboard behavior, support, and future Kyro plans.
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
          Help Center
        </div>
      </div>

      <div style={faqGrid}>
        {FAQ_SECTIONS.map((section) => (
          <FAQSectionCard
            key={section.title}
            title={section.title}
            icon={section.icon}
            items={section.items}
          />
        ))}
      </div>
    </div>
  );
}

function FAQSectionCard({ title, icon: Icon, items }) {
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
          alignItems: "center",
          gap: "14px",
          marginBottom: "18px",
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
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {items.map((item, index) => (
          <FAQItem
            key={`${title}-${index}`}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </div>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderRadius: "16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          color: "white",
          textAlign: "left",
          padding: "15px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: "700",
            lineHeight: "1.6",
            color: "white",
          }}
        >
          {question}
        </div>

        <ChevronDown
          size={18}
          style={{
            flexShrink: 0,
            opacity: 0.75,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s ease",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            padding: "0 16px 16px 16px",
            fontSize: "13px",
            lineHeight: "1.8",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}

const faqGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "22px",
};