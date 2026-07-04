"use client";

export default function EmojiPicker({ onSelect, onClose }) {
  const emojis = [
    "👍",
    "❤️",
    "😂",
    "😮",
    "😢",
    "😡",
    "🔥",
    "🎉",
    "💯",
    "👀",
    "🚀",
    "⚡",
    "💀",
    "🙏",
    "💜",
    "✅",
    "❌",
    "🤔",
    "😎",
    "🤯",
    "💪",
    "🫡",
    "👑",
    "⭐",
  ];

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "#0a0a15",
          border: "1px solid #1a1a3a",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
        }}
      >
        <div
          style={{
            color: "#9B30FF",
            fontSize: "12px",
            fontWeight: "600",
            letterSpacing: "2px",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          REACT
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "4px",
          }}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              style={{
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(155,48,255,0.2)";
                e.currentTarget.style.transform = "scale(1.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
