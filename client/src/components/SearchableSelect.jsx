import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X, CheckCircle2 } from "lucide-react";

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  formatLabel,
  zIndex = 4000,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

const selected =
  options.find((item) => String(item.id) === String(value)) || null;

const filteredOptions = options.filter((item) => {
  const raw = `${item.name || ""}`.toLowerCase();
  return raw.includes(query.trim().toLowerCase());
});
  return (
  <div
    ref={wrapRef}
    style={{
      position: "relative",
      zIndex: open ? zIndex : "auto",
    }}
  >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 10px 28px rgba(88,101,242,0.22)";
          e.currentTarget.style.border =
            "1px solid rgba(88,101,242,0.32)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0px)";
          e.currentTarget.style.boxShadow =
            "0 6px 14px rgba(0,0,0,0.10)";
          e.currentTarget.style.border =
            open
              ? "1px solid rgba(88,101,242,0.34)"
              : "1px solid rgba(255,255,255,0.08)";
        }}
        style={{
          ...searchableSelectButtonStyle,
          border: open
            ? "1px solid rgba(88,101,242,0.34)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
        }}
      >
       <span
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: selected ? "#fff" : "rgba(255,255,255,0.52)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
  }}
>
  {selected
    ? formatLabel
      ? formatLabel(selected)
      : selected.name
    : placeholder}
</span>

        <ChevronDown
          size={17}
          style={{
            color: "rgba(255,255,255,0.72)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div style={{ ...searchableSelectMenuStyle, zIndex }}>
          <div style={searchableSelectSearchWrapStyle}>
           <Search
  size={15}
  color="rgba(255,255,255,0.55)"
  style={{ flexShrink: 0 }}
/>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={searchableSelectSearchInputStyle}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={searchableSelectClearButtonStyle}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
         onMouseDown={(e) => {
  e.preventDefault();
  e.stopPropagation();

  onChange("");
  setOpen(false);
  setQuery("");
}}
            style={searchableSelectOptionStyle(false)}
          >
            {placeholder}
          </button>

          <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
            {filteredOptions.length ? (
              filteredOptions.map((item) => {
                const active = String(item.id) === String(value);
                return (
                  <button
                    key={item.id}
                    type="button"
                  onMouseDown={(e) => {
  e.preventDefault();
  e.stopPropagation();

  onChange(item.id);
  setOpen(false);
  setQuery("");
}}
                    style={searchableSelectOptionStyle(active)}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                     {formatLabel ? formatLabel(item) : item.name}
                    </span>

                    {active ? (
                      <CheckCircle2 size={15} color="#9db2ff" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div style={searchableSelectEmptyStyle}>No results found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const searchableSelectButtonStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#fff",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s ease",
};

const searchableSelectMenuStyle = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  right: 0,
  borderRadius: 18,
  border: "1px solid rgba(88,101,242,0.18)",
  background:
    "linear-gradient(180deg, rgba(10,14,24,0.985), rgba(8,12,20,0.985))",
  boxShadow:
    "0 24px 60px rgba(0,0,0,0.48), 0 0 0 1px rgba(255,255,255,0.02) inset",
  overflow: "hidden",
  backdropFilter: "blur(14px)",
  padding: 12,
};

const searchableSelectSearchWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  padding: "0 12px",
  marginBottom: 10,
  boxSizing: "border-box",
};

const searchableSelectSearchInputStyle = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#fff",
  fontSize: 14,
  lineHeight: "20px",
  padding: "10px 0",
  margin: 0,
  height: "100%",
  boxSizing: "border-box",
};

const searchableSelectClearButtonStyle = {
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.55)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
};

const searchableSelectOptionStyle = (active) => ({
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: active
    ? "1px solid rgba(88,101,242,0.30)"
    : "1px solid transparent",
  background: active
    ? "rgba(88,101,242,0.16)"
    : "rgba(255,255,255,0.02)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
  marginBottom: 6,
  fontSize: 14,
  transition: "all 0.18s ease",
});

const searchableSelectEmptyStyle = {
  padding: "12px 10px 4px",
  color: "rgba(255,255,255,0.55)",
  fontSize: 13,
};