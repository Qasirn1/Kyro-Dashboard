import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

function getToastStyles(type) {
  if (type === "success") {
    return {
      icon: <CheckCircle2 size={18} color="#86efac" />,
      border: "1px solid rgba(34,197,94,0.24)",
      background:
        "linear-gradient(180deg, rgba(15,23,18,0.96), rgba(10,16,13,0.98))",
      glow: "0 18px 50px rgba(34,197,94,0.16)",
      dot: "#22c55e",
      actionBg: "rgba(34,197,94,0.14)",
      actionBorder: "1px solid rgba(34,197,94,0.24)",
      actionColor: "#bbf7d0",
    };
  }

  if (type === "error") {
    return {
      icon: <XCircle size={18} color="#fca5a5" />,
      border: "1px solid rgba(239,68,68,0.24)",
      background:
        "linear-gradient(180deg, rgba(28,16,18,0.96), rgba(18,10,12,0.98))",
      glow: "0 18px 50px rgba(239,68,68,0.16)",
      dot: "#ef4444",
      actionBg: "rgba(239,68,68,0.14)",
      actionBorder: "1px solid rgba(239,68,68,0.24)",
      actionColor: "#fecaca",
    };
  }

  return {
    icon: <Info size={18} color="#93c5fd" />,
    border: "1px solid rgba(59,130,246,0.24)",
    background:
      "linear-gradient(180deg, rgba(15,18,30,0.96), rgba(10,14,24,0.98))",
    glow: "0 18px 50px rgba(59,130,246,0.16)",
    dot: "#3b82f6",
    actionBg: "rgba(59,130,246,0.14)",
    actionBorder: "1px solid rgba(59,130,246,0.24)",
    actionColor: "#bfdbfe",
  };
}

export default function GlobalToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast?.message) return;
    if (toast?.action) return;

    const timeout = setTimeout(() => {
      onClose?.();
    }, toast.duration || 3200);

    return () => clearTimeout(timeout);
  }, [toast, onClose]);

  if (!toast?.message) return null;

  const styles = getToastStyles(toast.type);

  return (
    <div
      style={{
        position: "fixed",
        top: 22,
        right: 22,
        zIndex: 999999,
        width: "min(460px, calc(100vw - 32px))",
        borderRadius: 18,
        border: styles.border,
        background: styles.background,
        boxShadow: styles.glow,
        backdropFilter: "blur(14px)",
        overflow: "hidden",
        animation: "toastSlideIn 0.22s ease",
      }}
    >
      <div
        style={{
          height: 3,
          background: styles.dot,
          opacity: 0.9,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 16px",
        }}
      >
        <div style={{ marginTop: 1, flexShrink: 0 }}>{styles.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title ? (
            <div
              style={{
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.35,
                marginBottom: 4,
                wordBreak: "break-word",
              }}
            >
              {toast.title}
            </div>
          ) : null}

          <div
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {toast.message}
          </div>

          {toast.action ? (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                  onClose?.();
                }}
                style={{
                  borderRadius: 12,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: styles.actionBg,
                  border: styles.actionBorder,
                  color: styles.actionColor,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {toast.action.label || "Confirm"}
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={15} />
        </button>
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0);
          }
        }
      `}</style>
    </div>
  );
}