import { useEffect, useMemo, useRef, useState } from "react";
import EmojiPickerReact from "emoji-picker-react";

function useOutsideClose(ref, onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleMouseDown(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onClose, enabled]);
}

export default function GlobalEmojiPicker({
  value,
  onChange,
  serverEmojis = [],
  placeholder = "🙂",
}) {
const [open, setOpen] = useState(false);
const [query, setQuery] = useState("");
const ref = useRef(null);

const filteredServerEmojis = useMemo(() => {
  if (!query.trim()) return serverEmojis;

  return serverEmojis.filter((emoji) =>
    emoji.name?.toLowerCase().includes(query.toLowerCase())
  );
}, [query, serverEmojis]);

  useOutsideClose(ref, () => setOpen(false), open);

  function renderPreview() {
    if (!value) return placeholder;

    if (typeof value === "object" && value?.id) {
      return (
        <img
          src={value.url}
          alt={value.name}
          style={{ width: 22, height: 22, objectFit: "contain" }}
        />
      );
    }

    const match = String(value).match(/^<(a)?:(\w+):(\d+)>$/);

if (match) {
  const animated = !!match[1];
  const name = match[2];
  const id = match[3];

  return (
    <img
      src={`https://cdn.discordapp.com/emojis/${id}.${
        animated ? "gif" : "png"
      }?size=64`}
      alt={name}
      style={{ width: 22, height: 22, objectFit: "contain" }}
    />
  );
}

return value;
  }

  return (
    <div ref={ref} style={wrap}>
      <button type="button" onClick={() => setOpen((p) => !p)} style={button}>
        <span style={preview}>{renderPreview()}</span>
      </button>

      {open && (
        <div style={popover}>
            <div style={searchWrap}>
  <input
    type="text"
    placeholder="Search server emojis..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    style={searchInput}
  />
</div>
          <div style={sectionTitle}>Global Emojis</div>

          <div style={emojiPickerWrap}>
            <EmojiPickerReact
              width="100%"
              height={360}
              theme="dark"
              searchPlaceholder="Search emoji..."
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emojiData) => {
                onChange?.(emojiData.emoji);
                setOpen(false);
              }}
            />
          </div>

          <div style={sectionTitle}>Server Emojis</div>

          <div style={serverGrid}>
            {filteredServerEmojis.length ? (
              filteredServerEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  type="button"
                  onClick={() => {
                    onChange?.({
                      id: emoji.id,
                      name: emoji.name,
                      animated: !!emoji.animated,
                      url: emoji.url,
                      identifier: emoji.identifier,
                    });
                    setOpen(false);
                  }}
                  style={serverCell}
                  title={emoji.name}
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    style={{
                      width: 24,
                      height: 24,
                      objectFit: "contain",
                      imageRendering: "auto",
                    }}
                  />
                </button>
              ))
            ) : (
              <div style={empty}>No server emojis found</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange?.("");
              setOpen(false);
            }}
            style={clearButton}
          >
            Clear emoji
          </button>
        </div>
      )}
    </div>
  );
}

const wrap = {
  position: "relative",
  display: "inline-block",
};

const button = {
  width: 54,
  height: 50,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const preview = {
  fontSize: 20,
  display: "flex",
  alignItems: "center",
};

const popover = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  width: 330,
  maxHeight: 560,
  overflowY: "auto",
  overflowX: "hidden",
  zIndex: 9999,
  padding: 12,
  borderRadius: 18,
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
};

const searchWrap = {
  marginBottom: 10,
};

const searchInput = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "#fff",
  outline: "none",
  fontSize: 13,
  boxSizing: "border-box",
};

const sectionTitle = {
  margin: "10px 0 8px",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.52)",
};

const emojiPickerWrap = {
  width: "100%",
  maxHeight: 360,
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.18)",
};

const serverGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 40px)",
  gap: 8,
  maxHeight: 176,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 4,
};

const serverCell = {
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const empty = {
  gridColumn: "1 / -1",
  padding: "10px 2px",
  fontSize: 13,
  color: "rgba(255,255,255,0.52)",
};

const clearButton = {
  width: "100%",
  marginTop: 14,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  padding: "11px 12px",
  fontSize: 13,
  fontWeight: 800,
};