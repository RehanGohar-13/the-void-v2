"use client";

export default function OnlinePanel({ onlineUsers, currentUserId }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "30px 20px",
        backgroundColor: "#000000",
        paddingBottom: "80px",
      }}
    >
      <div
        style={{
          fontSize: "22px",
          fontWeight: "700",
          letterSpacing: "4px",
          background: "linear-gradient(135deg, #9B30FF, #00BFFF)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "6px",
        }}
      >
        ONLINE USERS
      </div>

      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, #9B30FF, #00BFFF, transparent)",
          marginTop: "10px",
          marginBottom: "20px",
        }}
      />

      <div
        style={{
          color: "#2a2a3a",
          fontSize: "11px",
          letterSpacing: "2px",
          marginBottom: "12px",
        }}
      >
        {onlineUsers.length} USER{onlineUsers.length !== 1 ? "S" : ""} CONNECTED
      </div>

      {onlineUsers.map((u) => (
        <div
          key={u.user_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            backgroundColor: "#050508",
            border: "1px solid #1a1a3a",
            borderRadius: "10px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4B0082, #00BFFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            {u.username.charAt(0).toUpperCase()}
          </div>

          <div>
            <div
              style={{
                color: u.user_id === currentUserId ? "#9B30FF" : "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                letterSpacing: "1px",
              }}
            >
              {u.username}
              {u.user_id === currentUserId && " (you)"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "2px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#00ff00",
                }}
              />
              <span
                style={{
                  color: "#00ff00",
                  fontSize: "10px",
                }}
              >
                ONLINE
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
