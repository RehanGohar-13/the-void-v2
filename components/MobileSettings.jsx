"use client";

import { supabase } from "../lib/supabaseClient";

export default function MobileSettings({ user }) {
  const username = user.user_metadata?.username || user.email;

  async function handleLogout() {
    await supabase
      .from("presence")
      .update({
        status: "offline",
        last_seen: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    await supabase.auth.signOut();
  }

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
        SETTINGS
      </div>

      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, #9B30FF, #00BFFF, transparent)",
          marginTop: "10px",
          marginBottom: "20px",
        }}
      />

      {/* Profile Card */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "#050508",
          border: "1px solid #1a1a3a",
          borderRadius: "10px",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4B0082, #00BFFF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "24px",
            fontWeight: "700",
            margin: "0 auto 12px",
          }}
        >
          {username.charAt(0).toUpperCase()}
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "600",
            letterSpacing: "1px",
            marginBottom: "4px",
          }}
        >
          {username}
        </div>

        <div
          style={{
            color: "#2a2a3a",
            fontSize: "11px",
          }}
        >
          {user.email}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          padding: "14px",
          backgroundColor: "#440000",
          border: "none",
          borderRadius: "10px",
          color: "#ff4444",
          fontSize: "13px",
          fontWeight: "700",
          letterSpacing: "2px",
          cursor: "pointer",
        }}
      >
        DISCONNECT
      </button>
    </div>
  );
}
