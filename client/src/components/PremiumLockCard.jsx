import { Crown, Sparkles, Bot, Check, ArrowRight, Zap, ShieldCheck } from "lucide-react";

export default function PremiumLockCard({
  badge,
  title = "Premium Feature",
  description = "Upgrade to unlock this feature.",
  buttonText = "Upgrade to Premium",
  features = [],
  onClick,
  children,
  className = "",
  compact = false,
  variant = "premium",
}) {
  const isBranding = variant === "branding";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 26,
        padding: 1,
        border: "1px solid rgba(168,85,247,0.55)",
        background:
          "linear-gradient(135deg, rgba(168,85,247,0.32), rgba(59,130,246,0.18), rgba(251,191,36,0.12))",
        boxShadow:
          "0 0 55px rgba(168,85,247,0.20), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 25%, rgba(251,191,36,0.22), transparent 28%), radial-gradient(circle at 78% 45%, rgba(168,85,247,0.28), transparent 34%), linear-gradient(135deg, rgba(9,14,35,0.95), rgba(15,23,42,0.88))",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.13,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: compact ? 22 : 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, flex: 1 }}>
          <div
            style={{
              width: 118,
              height: 118,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, rgba(251,191,36,0.24), rgba(168,85,247,0.18))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 40px rgba(168,85,247,0.28)",
              flexShrink: 0,
            }}
          >
            {isBranding ? (
              <Bot size={54} color="#c4b5fd" />
            ) : (
              <Crown size={58} color="#fbbf24" />
            )}
          </div>

          <div style={{ minWidth: 260 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 11px",
                borderRadius: 999,
                marginBottom: 12,
                color: "#d8b4fe",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "rgba(168,85,247,0.14)",
                border: "1px solid rgba(216,180,254,0.18)",
              }}
            >
              <Sparkles size={14} />
              {badge || (isBranding ? "Custom Branding" : "Kyro Premium")}
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 950,
                color: "#ffffff",
                letterSpacing: "-0.04em",
              }}
            >
              {title}
            </h3>

            <p
              style={{
                margin: "10px 0 0",
                maxWidth: 760,
                color: "rgba(255,255,255,0.74)",
                fontSize: 15,
                lineHeight: 1.65,
              }}
            >
              {description}
            </p>

            {features.length ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {features.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 11px",
                      borderRadius: 999,
                      color: "rgba(255,255,255,0.86)",
                      fontSize: 13,
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.065)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    {index % 2 === 0 ? (
                      <Check size={14} color="#c084fc" />
                    ) : (
                      <Zap size={14} color="#60a5fa" />
                    )}
                    {feature}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            style={{
              minWidth: 230,
              height: 58,
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 18,
              cursor: "pointer",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background:
                "linear-gradient(135deg, #a855f7, #6366f1 55%, #2563eb)",
              boxShadow:
                "0 18px 50px rgba(99,102,241,0.38), 0 0 30px rgba(168,85,247,0.22)",
            }}
          >
            <ShieldCheck size={18} />
            {buttonText}
            <ArrowRight size={18} />
          </button>
        ) : null}
      </div>

      {children ? (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            margin: compact ? "0 22px 22px" : "0 28px 28px",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}