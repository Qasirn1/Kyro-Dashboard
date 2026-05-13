import { TerminalSquare, Ticket, Sparkles, Shield, Radio, Users } from "lucide-react";

const COMMAND_SECTIONS = [
  {
    title: "Tickets",
    icon: Ticket,
    description: "Manage ticket panels, buttons, questions, categories, staff roles, and logs.",
    commands: [
      {
        command: "/tickets create-panel",
        description: "Create a new ticket panel.",
      },
      {
        command: "/tickets panel",
        description: "Send the default ticket panel.",
      },
      {
        command: "/tickets send-dashboard-panel",
        description: "Send a ticket panel using Kyro dashboard configuration.",
      },
      {
        command: "/tickets button add",
        description: "Add a button to a ticket panel.",
      },
      {
        command: "/tickets button list",
        description: "List panel buttons.",
      },
      {
        command: "/tickets button remove",
        description: "Remove a button from a ticket panel.",
      },
      {
        command: "/tickets question add",
        description: "Add a question to a ticket button form.",
      },
      {
        command: "/tickets question list",
        description: "List the questions configured for a ticket button.",
      },
      {
        command: "/tickets question remove",
        description: "Remove a question from a ticket button form.",
      },
      {
        command: "/tickets set-staff-role",
        description: "Set the staff role used for ticket access and management.",
      },
      {
        command: "/tickets set-logs-channel",
        description: "Set the channel used for ticket logs.",
      },
      {
        command: "/tickets set-transcript-channel",
        description: "Set the channel used for ticket transcripts.",
      },
      {
        command: "/tickets set-open-category",
        description: "Set the open tickets fallback category.",
      },
      {
        command: "/tickets set-closed-category",
        description: "Set the closed tickets category.",
      },
      {
        command: "/tickets set-support-category",
        description: "Set the support ticket category.",
      },
      {
        command: "/tickets set-report-category",
        description: "Set the report ticket category.",
      },
      {
        command: "/tickets set-application-category",
        description: "Set the application ticket category.",
      },
    ],
  },
  {
    title: "Welcome & Leveling",
    icon: Sparkles,
    description: "Welcome messages, leveling setup, rewards, XP control, and rank tools.",
    commands: [
      {
        command: "/rank",
        description: "View a member rank card or leveling progress.",
      },
      {
        command: "/give-xp",
        description: "Give XP manually to a member.",
      },
      {
        command: "/remove-xp",
        description: "Remove XP from a member.",
      },
      {
        command: "/setup-level-channel",
        description: "Set the level-up announcement channel.",
      },
      {
        command: "/setup-level-reward",
        description: "Set or manage level reward roles.",
      },
      {
        command: "/setup-xp",
        description: "Configure XP settings for the server.",
      },
      {
        command: "/xp-disable-channel",
        description: "Disable XP gain in a channel.",
      },
      {
        command: "/xp-enable-channel",
        description: "Enable XP gain in a channel.",
      },
      {
        command: "/xp-disabled-list",
        description: "View channels where XP is disabled.",
      },
      {
        command: "/welcome-channel",
        description: "Set the welcome channel.",
      },
      {
        command: "/welcome-message",
        description: "Configure the welcome message.",
      },
      {
        command: "/welcome-toggle",
        description: "Enable or disable the welcome system.",
      },
      {
        command: "/welcome-test",
        description: "Send a test welcome message.",
      },
    ],
  },
  {
    title: "Roles, Panels & Verification",
    icon: Users,
    description: "Self-role panels, panel builder actions, and verification controls.",
    commands: [
      {
        command: "/roles-create",
        description: "Create a self-role panel.",
      },
      {
        command: "/roles-add",
        description: "Add a role option to a panel.",
      },
      {
        command: "/roles-edit",
        description: "Edit an existing self-role panel.",
      },
      {
        command: "/roles-remove",
        description: "Remove a role option from a panel.",
      },
      {
        command: "/roles-type",
        description: "Change the panel type or role selection mode.",
      },
      {
        command: "/roles-buttoncolor",
        description: "Change role button colors.",
      },
      {
        command: "/roles-move",
        description: "Move or reorder role items.",
      },
      {
        command: "/roles-panel-edit",
        description: "Edit an existing role panel message.",
      },
      {
        command: "/roles-reorder",
        description: "Reorder server roles where allowed.",
      },
      {
        command: "/panel-send",
        description: "Send a universal panel message.",
      },
      {
        command: "/panel-add-link",
        description: "Add a link button to a panel.",
      },
      {
        command: "/panel-add-message",
        description: "Add a message action to a panel.",
      },
      {
        command: "/panel-add-navigation",
        description: "Add navigation buttons between panel pages.",
      },
      {
        command: "/panel-create-page",
        description: "Create a new page in a panel flow.",
      },
      {
        command: "/panel-edit-button",
        description: "Edit a panel button.",
      },
      {
        command: "/panel-remove-button",
        description: "Remove a panel button.",
      },
      {
        command: "/verification-setup",
        description: "Set up verification for the server.",
      },
      {
        command: "/verification-edit",
        description: "Edit the verification configuration.",
      },
      {
        command: "/verification-resend",
        description: "Resend or republish the verification panel.",
      },
    ],
  },
  {
    title: "Moderation, Logs & Utility",
    icon: Shield,
    description: "Moderation tools, logs, invites, RSS, social alerts, polls, and server utilities.",
    commands: [
      {
        command: "/setup",
        description: "Run a general Kyro setup flow.",
      },
      {
        command: "/automod-punishment",
        description: "Configure automod punishment behavior.",
      },
      {
        command: "/ban-unban-logs",
        description: "Configure ban and unban log settings.",
      },
      {
        command: "/channel-logs",
        description: "Configure channel log events.",
      },
      {
        command: "/message-logs",
        description: "Configure message log events.",
      },
      {
        command: "/setup-join-leave-logs",
        description: "Configure join and leave log channels.",
      },
      {
        command: "/invites",
        description: "View invite information or tracking data.",
      },
      {
        command: "/jail",
        description: "Jail a member.",
      },
      {
        command: "/unjail",
        description: "Remove a member from jail.",
      },
      {
        command: "/jail-info",
        description: "View jail-related information.",
      },
      {
        command: "/setup-jail-role",
        description: "Set the jail role for the server.",
      },
      {
        command: "/poll",
        description: "Create a poll.",
      },
      {
        command: "/embed",
        description: "Send an embed using Kyro.",
      },
      {
        command: "/market",
        description: "Open or manage market-related features.",
      },
      {
        command: "/serverstats",
        description: "Manage live server statistics channels.",
      },
      {
        command: "/rss",
        description: "Manage RSS feeds and posting.",
      },
      {
        command: "/socialalerts",
        description: "Manage creator alerts like YouTube, TikTok, Kick, or Twitch.",
      },
      {
        command: "/tempvoice-setup",
        description: "Configure temporary voice channels.",
      },
      {
        command: "/tempvoice-panel",
        description: "Send or manage the temporary voice control panel.",
      },
      {
        command: "/tempvoice-disable",
        description: "Disable temporary voice configuration.",
      },
      {
        command: "/ping",
        description: "Check bot responsiveness.",
      },
    ],
  },
];

export default function CommandsPage() {
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
            <TerminalSquare size={28} />
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
              Commands
            </h2>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "14px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              A structured reference for Kyro slash commands across tickets, setup, roles, moderation, and server tools.
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
          Slash Commands
        </div>
      </div>

      <div style={commandsGrid}>
        {COMMAND_SECTIONS.map((section) => (
          <CommandSectionCard
            key={section.title}
            title={section.title}
            icon={section.icon}
            description={section.description}
            commands={section.commands}
          />
        ))}
      </div>
    </div>
  );
}

function CommandSectionCard({ title, icon: Icon, description, commands }) {
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
        {commands.map((item, index) => (
          <CommandRow
            key={`${title}-${index}`}
            command={item.command}
            description={item.description}
          />
        ))}
      </div>
    </div>
  );
}

function CommandRow({ command, description }) {
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
          fontSize: "14px",
          fontWeight: "800",
          color: "white",
          marginBottom: "6px",
          wordBreak: "break-word",
        }}
      >
        {command}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: "1.7",
          color: "rgba(255,255,255,0.72)",
        }}
      >
        {description}
      </div>
    </div>
  );
}

const commandsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "22px",
};