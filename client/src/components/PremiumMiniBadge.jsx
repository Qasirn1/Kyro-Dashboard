export default function PremiumMiniBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 7px",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "rgba(255, 184, 77, 0.16)",
        color: "#ffcc73",
        border: "1px solid rgba(255, 184, 77, 0.28)",
        boxShadow: "0 0 12px rgba(255,184,77,0.14)",
      }}
    >
      Premium
    </span>
  );
}