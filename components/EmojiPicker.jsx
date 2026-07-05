"use client";

import { useState } from "react";

const CATEGORIES = [
  {
    key: "recent",
    label: "⭐",
    emojis: [
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
    ],
  },
  {
    key: "smileys",
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
      "🥳",
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
      "😌",
      "😔",
      "😪",
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
      "😈",
      "👿",
      "💀",
      "☠️",
      "🤡",
      "👻",
      "👾",
      "🤖",
      "😺",
    ],
  },
  {
    key: "gestures",
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
      "🦾",
      "🖐️",
      "☝️",
      "🤙",
      "💅",
      "🤳",
      "🫵",
    ],
  },
  {
    key: "hearts",
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
      "💌",
      "💋",
      "😻",
    ],
  },
  {
    key: "objects",
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
      "🎯",
      "🎮",
      "🎲",
      "💎",
      "💰",
      "💡",
      "🔔",
      "🎵",
      "🎶",
      "🚀",
      "✈️",
      "🌍",
      "🌙",
      "☀️",
      "🌈",
      "⛄",
      "🎁",
      "🎀",
      "🎈",
      "🪄",
      "🔮",
    ],
  },
  {
    key: "symbols",
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
      "♻️",
      "⚠️",
      "🚫",
      "📛",
      "♾️",
      "💤",
      "🔞",
      "📵",
      "🆒",
      "🆓",
      "🆕",
      "🆙",
      "🆚",
      "🉐",
      "🈵",
      "🈶",
    ],
  },
  {
    key: "food",
    label: "🍕",
    emojis: [
      "🍕",
      "🍔",
      "🍟",
      "🌭",
      "🍿",
      "🥓",
      "🥚",
      "🍳",
      "🧇",
      "🥞",
      "🍞",
      "🥐",
      "🧀",
      "🥗",
      "🍖",
      "🍗",
      "🌮",
      "🌯",
      "🍣",
      "🍜",
      "🍝",
      "🍛",
      "🍲",
      "🥘",
      "🍰",
      "🎂",
      "🧁",
      "🍩",
      "🍪",
      "🍫",
      "🍦",
      "🧃",
    ],
  },
  {
    key: "animals",
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
      "🦋",
      "🐛",
      "🐝",
      "🐢",
      "🦎",
      "🐍",
      "🦕",
      "🦖",
    ],
  },
  {
    key: "flags",
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
      "🇸🇦",
      "🇦🇪",
      "🇶🇦",
      "🇪🇬",
      "🇹🇷",
      "🇷🇺",
      "🇮🇹",
      "🇪🇸",
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState("recent");

  const current = CATEGORIES.find((c) => c.key === activeTab);

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleOverlay}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#0a0a15",
          border: "1px solid #1a1a3a",
          borderRadius: "14px",
          padding: "16px",
          width: "340px",
          maxHeight: "420px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div
          style={{
            color: "#9B30FF",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "3px",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          REACT TO MESSAGE
        </div>

        {/* Category tabs */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            marginBottom: "12px",
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              style={{
                padding: "6px 8px",
                borderRadius: "8px",
                fontSize: "16px",
                background: "transparent",
                border:
                  activeTab === cat.key
                    ? "1px solid rgba(155,48,255,0.5)"
                    : "1px solid transparent",
                backgroundColor:
                  activeTab === cat.key
                    ? "rgba(155,48,255,0.15)"
                    : "transparent",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
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
            flex: 1,
          }}
        >
          {current?.emojis.map((emoji, idx) => (
            <button
              key={`${activeTab}-${idx}`}
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
