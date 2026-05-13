import { Crown, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function PremiumPage() {
  const [billing, setBilling] = useState("monthly");

  return (
    <div>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", margin: 0 }}>
          Kyro Premium
        </h2>

        <p style={{ marginTop: "8px", color: "rgba(255,255,255,0.7)" }}>
          Choose the right plan for your server. Custom bot branding is available as a separate one-time add-on.
        </p>
      </div>

      <div style={toggleWrap}>
        <button
          style={billing === "monthly" ? activeToggle : toggleButton}
          onClick={() => setBilling("monthly")}
        >
          Monthly
        </button>

        <button
          style={billing === "yearly" ? activeToggle : toggleButton}
          onClick={() => setBilling("yearly")}
        >
          Yearly <span style={saveBadge}>Save 16%</span>
        </button>
      </div>

      <div style={pricingGrid}>
        <div style={card}>
          <h3 style={title}>Free Plan</h3>
          <div style={price}>$0</div>
          <p style={planText}>Start managing your server with Kyro’s core tools.</p>

          <Feature>Basic leveling system</Feature>
          <Feature>Welcome system</Feature>
          <Feature>Basic tickets</Feature>
          <Feature>Limited social alerts</Feature>
<Feature>3 RSS feeds</Feature>
<Feature>Advanced server stats</Feature>
          <button style={freeButton}>Current Plan</button>
        </div>

        <div style={{ ...card, ...premiumCard }}>
          <div style={badge}>
            <Crown size={14} /> Most Popular
          </div>

          <h3 style={title}>Kyro Premium</h3>
          <div style={price}>{billing === "monthly" ? "$4.99/mo" : "$50/year"}</div>
          <p style={planText}>Unlock advanced automation, security, and growth tools.</p>

          <Feature>Advanced leveling system</Feature>
          <Feature>Unlimited social alerts</Feature>
          <Feature>Advanced automod & security</Feature>
          <Feature>Premium dashboard customization</Feature>
          <Feature>Priority updates & support</Feature>
<Feature>Unlimited RSS feeds</Feature>
<Feature>Advanced server stats</Feature>
          <button style={premiumButton}>Upgrade Premium</button>
        </div>

        <div style={{ ...card, ...addonCard }}>
          <div style={addonBadge}>
            <Sparkles size={14} /> One-time Add-on
          </div>

          <h3 style={title}>Custom Bot Branding</h3>
          <div style={price}>$10</div>

          <div style={oneTimeText}>One time payment</div>
          <div style={lifetimeText}>🔥 Pay once. Use forever.</div>

          <p style={planText}>
            Perfect for creators and communities who want a unique branded bot without monthly costs.
          </p>

          <Feature>Custom bot name</Feature>
          <Feature>Custom bot avatar</Feature>
          <Feature>Custom activity/status</Feature>
          <Feature>Standalone branded bot setup</Feature>
          <Feature>Powered by Kyro backend</Feature>

          <button style={addonButton}>Get Custom Branding</button>
        </div>
      </div>

      <p style={trustText}>
        🔒 Secure payments • Cancel anytime • Instant activation
      </p>

      <div style={compareSection}>
        <div style={compareHeader}>
          <h3 style={compareTitle}>Compare features</h3>
          <p style={compareText}>See what is included in each Kyro plan.</p>
        </div>

        <div style={compareTable}>
          <CompareHeader />
          <CompareRow feature="Leveling system" free="Basic" premium="Advanced" branding="—" />
          <CompareRow feature="Welcome system" free="Included" premium="Advanced" branding="—" />
          <CompareRow feature="Tickets" free="Basic" premium="Advanced" branding="—" />
         <CompareRow feature="Social alerts" free="Limited" premium="Unlimited" branding="—" />
<CompareRow feature="RSS feeds" free="3 feeds" premium="Unlimited" branding="—" />
<CompareRow feature="Server stats" free="Advanced" premium="Advanced" branding="—" />
<CompareRow feature="Security tools" free="Basic" premium="Advanced" branding="—" />
          <CompareRow feature="Custom bot name/avatar" free="—" premium="—" branding="Included" />
          <CompareRow feature="One-time branded bot setup" free="—" premium="—" branding="Included" />
        </div>
      </div>
    </div>
  );
}

function Feature({ children }) {
  return (
    <div style={featureRow}>
      <CheckCircle2 size={16} color="#93c5fd" />
      <span>{children}</span>
    </div>
  );
}

function CompareHeader() {
  return (
    <div style={{ ...compareRow, ...compareHeadRow }}>
      <div style={compareFeature}>Feature</div>
      <div style={compareCell}>Free</div>
      <div style={compareCell}>Premium</div>
      <div style={compareCell}>Branding</div>
    </div>
  );
}

function CompareRow({ feature, free, premium, branding }) {
  return (
    <div style={compareRow}>
      <div style={compareFeature}>{feature}</div>
      <div style={compareCell}>{free}</div>
      <div style={{ ...compareCell, color: "#93c5fd", fontWeight: "800" }}>
        {premium}
      </div>
      <div style={{ ...compareCell, color: "#c084fc", fontWeight: "800" }}>
        {branding}
      </div>
    </div>
  );
}

const pricingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "24px",
};

const toggleWrap = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px",
  marginBottom: "26px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const toggleButton = {
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.7)",
  padding: "10px 16px",
  borderRadius: "12px",
  fontWeight: "700",
  cursor: "pointer",
};

const activeToggle = {
  ...toggleButton,
  color: "white",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  boxShadow: "0 8px 22px rgba(59,130,246,0.25)",
};

const saveBadge = {
  marginLeft: "8px",
  fontSize: "10px",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.12)",
};

const card = {
  position: "relative",
  padding: "26px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
};

const premiumCard = {
  border: "1px solid rgba(59,130,246,0.45)",
  boxShadow: "0 16px 55px rgba(59,130,246,0.22)",
};

const addonCard = {
  border: "1px solid rgba(168,85,247,0.38)",
  boxShadow: "0 16px 55px rgba(124,58,237,0.18)",
};

const title = {
  fontSize: "22px",
  fontWeight: "800",
  margin: "0 0 10px 0",
};

const price = {
  fontSize: "32px",
  fontWeight: "900",
  marginBottom: "10px",
};

const oneTimeText = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.6)",
  marginBottom: "10px",
};

const lifetimeText = {
  fontSize: "11px",
  color: "#a78bfa",
  marginBottom: "14px",
  fontWeight: "700",
};

const planText = {
  margin: "0 0 20px 0",
  minHeight: "48px",
  color: "rgba(255,255,255,0.66)",
  lineHeight: 1.6,
};

const featureRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
  color: "rgba(255,255,255,0.78)",
  fontSize: "14px",
};

const freeButton = {
  width: "100%",
  marginTop: "18px",
  padding: "13px",
  borderRadius: "12px",
  border: "none",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontWeight: "700",
};

const premiumButton = {
  width: "100%",
  marginTop: "18px",
  padding: "13px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  color: "white",
  fontWeight: "800",
  cursor: "pointer",
};

const addonButton = {
  ...premiumButton,
  background: "linear-gradient(135deg, #7c3aed, #c084fc)",
};

const badge = {
  position: "absolute",
  top: "-10px",
  right: "16px",
  background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "800",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const addonBadge = {
  ...badge,
  background: "linear-gradient(135deg, #7c3aed, #c084fc)",
};

const compareSection = {
  marginTop: "34px",
  padding: "26px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const compareHeader = {
  marginBottom: "18px",
};

const compareTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: "800",
};

const compareText = {
  margin: "8px 0 0 0",
  color: "rgba(255,255,255,0.62)",
};

const compareTable = {
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
};

const compareRow = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
  gap: "12px",
  padding: "15px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.025)",
};

const compareHeadRow = {
  background: "rgba(59,130,246,0.12)",
  fontWeight: "800",
};

const compareFeature = {
  color: "white",
  fontWeight: "700",
};

const compareCell = {
  color: "rgba(255,255,255,0.68)",
  fontSize: "14px",
};

const trustText = {
  marginTop: "16px",
  marginBottom: "0",
  fontSize: "12px",
  color: "rgba(255,255,255,0.6)",
  textAlign: "center",
};