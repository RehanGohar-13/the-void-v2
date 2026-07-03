"use client";

export default function MobileNav({ view, onNavigate, notification }) {
  const tabs = [
    { key: "chat", icon: "💬", label: "Chat" },
    { key: "dms", icon: "✉️", label: "DMs", badge: notification },
    { key: "online", icon: "👥", label: "Online" },
    { key: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 0",
        backgroundColor: "#050508",
        borderTop: "1px solid #0d0d1a",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onNavigate(tab.key)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            background: "transparent",
            border: "none",
            color: view === tab.key ? "#9B30FF" : "#2a2a3a",
            fontSize: "20px",
            cursor: "pointer",
            position: "relative",
            padding: "4px 16px",
            transition: "color 0.2s",
          }}
        >
          <span>{tab.icon}</span>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "1px",
            }}
          >
            {tab.label}
          </span>

          {/* Notification badge */}
          {tab.badge > 0 && (
            <div
              style={{
                position: "absolute",
                top: "0",
                right: "8px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "#ff4444",
                color: "white",
                fontSize: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
              }}
            >
              {tab.badge}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
