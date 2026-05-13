import { Loader2 } from "lucide-react";

export default function PageLoader({
  title = "Loading...",
  subtitle = "Please wait while Kyro prepares your dashboard.",
  compact = false,
}) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: compact ? "40px 16px" : "72px 24px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(760px, 100%)",
          borderRadius: "26px",
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))",
          border: "1px solid rgba(88,101,242,0.16)",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
          backdropFilter: "blur(14px)",
          padding: compact ? "24px 22px" : "34px 30px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -70,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.12)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -50,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(124,58,237,0.12)",
            filter: "blur(55px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: compact ? 54 : 64,
              height: compact ? 54 : 64,
              borderRadius: "18px",
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(124,58,237,0.22))",
              border: "1px solid rgba(88,101,242,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 26px rgba(59,130,246,0.18)",
              flexShrink: 0,
            }}
          >
            <Loader2
              size={compact ? 24 : 28}
              style={{
                color: "#c7d2fe",
                animation: "kyroSpin 0.9s linear infinite",
              }}
            />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: compact ? "24px" : "34px",
                fontWeight: "800",
                letterSpacing: "-0.03em",
                color: "#ffffff",
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: compact ? "14px" : "15px",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.66)",
                maxWidth: "620px",
              }}
            >
              {subtitle}
            </div>

            <div
              style={{
                marginTop: "18px",
                height: "8px",
                width: "100%",
                maxWidth: "420px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  width: "42%",
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #5865F2, #7c3aed)",
                  boxShadow: "0 0 18px rgba(88,101,242,0.38)",
                  animation: "kyroLoaderPulse 1.4s ease-in-out infinite",
                  transformOrigin: "left center",
                }}
              />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes kyroSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes kyroLoaderPulse {
            0% { transform: scaleX(0.55); opacity: 0.82; }
            50% { transform: scaleX(1); opacity: 1; }
            100% { transform: scaleX(0.55); opacity: 0.82; }
          }
        `}</style>
      </div>
    </div>
  );
}