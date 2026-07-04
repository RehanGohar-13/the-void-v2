"use client";

import { useState } from "react";

export default function EmojiPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState("smileys");

  const categories = {
    smileys: {
      label: "😀",
      emojis: [
        "😀",
        "😁",
        "😂",
        "🤣",
        "😃",
        "😄",
        "😅",
        "😆",
        "😉",
        "😊",
        "😋",
        "😎",
        "😍",
        "🥰",
        "😘",
        "😗",
        "😙",
        "😚",
        "🙂",
        "🤗",
        "🤩",
        "🤔",
        "🤨",
        "😐",
        "😑",
        "😶",
        "😏",
        "😒",
        "🙄",
        "😬",
        "🤥",
        "😌",
        "😔",
        "😪",
        "🤤",
        "😴",
        "😷",
        "🤒",
        "🤕",
        "🤢",
        "🤮",
        "🥵",
        "🥶",
        "😵",
        "🤯",
        "🥳",
        "🥺",
        "😢",
        "😭",
        "😤",
        "😠",
        "😡",
        "🤬",
        "😈",
        "👿",
        "💀",
      ],
    },
    gestures: {
      label: "👋",
      emojis: [
        "👋",
        "🤚",
        "✋",
        "🖖",
        "👌",
        "🤌",
        "🤏",
        "✌️",
        "🤞",
        "🫰",
        "🤟",
        "🤘",
        "🤙",
        "👈",
        "👉",
        "👆",
        "👇",
        "👍",
        "👎",
        "✊",
        "👊",
        "🤛",
        "🤜",
        "👏",
        "🙌",
        "🫶",
        "👐",
        "🤲",
        "🤝",
        "🙏",
        "💪",
        "🫡",
      ],
    },
    hearts: {
      label: "❤️",
      emojis: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "🤍",
        "🤎",
        "💔",
        "❤️‍🔥",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "💝",
        "💟",
        "♥️",
        "❣️",
      ],
    },
    objects: {
      label: "⭐",
      emojis: [
        "⭐",
        "🌟",
        "💫",
        "✨",
        "⚡",
        "🔥",
        "💥",
        "🎉",
        "🎊",
        "🏆",
        "🥇",
        "🥈",
        "🥉",
        "🎯",
        "🎮",
        "🎲",
        "💎",
        "💰",
        "💸",
        "🔑",
        "🗝️",
        "💡",
        "🔔",
        "🎵",
        "🎶",
        "🚀",
        "✈️",
        "🌍",
        "🌙",
        "☀️",
        "⛈️",
        "🌈",
      ],
    },
    symbols: {
      label: "✅",
      emojis: [
        "✅",
        "❌",
        "⭕",
        "❗",
        "❓",
        "‼️",
        "⁉️",
        "💯",
        "🔴",
        "🟠",
        "🟡",
        "🟢",
        "🔵",
        "🟣",
        "⚫",
        "⚪",
        "🟤",
        "🔺",
        "🔻",
        "💠",
        "🔷",
        "🔶",
        "▪️",
        "▫️",
        "♻️",
        "⚠️",
        "🚫",
        "📛",
        "♾️",
        "💤",
        "🏳️",
        "🏴",
      ],
    },
    food: {
      label: "🍕",
      emojis: [
        "🍕",
        "🍔",
        "🍟",
        "🌭",
        "🍿",
        "🧂",
        "🥓",
        "🥚",
        "🍳",
        "🧇",
        "🥞",
        "🧈",
        "🍞",
        "🥐",
        "🥨",
        "🧀",
        "🥗",
        "🍖",
        "🍗",
        "🥩",
        "🌮",
        "🌯",
        "🫔",
        "🥙",
        "🍰",
        "🎂",
        "🧁",
        "🍩",
        "🍪",
        "🍫",
        "🍬",
        "🍭",
      ],
    },
    animals: {
      label: "🐱",
      emojis: [
        "🐱",
        "🐶",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐻‍❄️",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐸",
        "🐵",
        "🙈",
        "🙉",
        "🙊",
        "🐔",
        "🐧",
        "🐦",
        "🦅",
        "🦆",
        "🦉",
        "🐺",
        "🐗",
        "🐴",
        "🦄",
        "🐝",
        "🐛",
        "🦋",
      ],
    },
    flags: {
      label: "🏁",
      emojis: [
        "🏁",
        "🚩",
        "🎌",
        "🏴",
        "🏳️",
        "🏳️‍🌈",
        "🏴‍☠️",
        "🇵🇰",
        "🇺🇸",
        "🇬🇧",
        "🇨🇦",
        "🇦🇺",
        "🇩🇪",
        "🇫🇷",
        "🇯🇵",
        "🇰🇷",
        "🇨🇳",
        "🇮🇳",
        "🇧🇷",
        "🇲🇽",
        "🇪🇸",
        "🇮🇹",
        "🇷🇺",
        "🇹🇷",
        "🇸🇦",
        "🇦🇪",
        "🇶🇦",
        "🇪🇬",
      ],
    },
  };

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
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#0a0a15",
          border: "1px solid #1a1a3a",
          borderRadius: "12px",
          padding: "16px",
          width: "320px",
          maxHeight: "400px",
          display: "flex",
          flexDirection: "column",
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

        {/* Category tabs */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            marginBottom: "12px",
            overflowX: "auto",
            paddingBottom: "4px",
          }}
        >
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                fontSize: "18px",
                background:
                  tab === key ? "rgba(155,48,255,0.2)" : "transparent",
                border:
                  tab === key
                    ? "1px solid rgba(155,48,255,0.3)"
                    : "1px solid transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "2px",
            overflowY: "auto",
            maxHeight: "250px",
          }}
        >
          {categories[tab].emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              style={{
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.1s",
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
