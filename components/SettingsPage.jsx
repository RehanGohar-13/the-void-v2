"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

export default function SettingsPage({ user, onClose }) {
  const [profile, setProfile] = useState(null);
  const [statusMessage, setStatusMsg] = useState("");
  const [avatarColor, setAvatarColor] = useState("#9B30FF");
  const [nameColor, setNameColor] = useState("#ffffff");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("profile");

  const username = user.user_metadata?.username || user.email;

  const avatarColors = [
    "#9B30FF",
    "#00BFFF",
    "#FF4444",
    "#00FF00",
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#FF69B4",
    "#00CED1",
    "#FF8C00",
    "#7B68EE",
    "#20B2AA",
  ];

  const nameColors = [
    "#ffffff",
    "#9B30FF",
    "#00BFFF",
    "#FF4444",
    "#00FF00",
    "#FFD700",
    "#FF69B4",
    "#00CED1",
    "#FF8C00",
    "#7B68EE",
    "#4ECDC4",
    "#FF6B6B",
  ];

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setStatusMsg(data.status_message || "");
        setAvatarColor(data.avatar_color || "#9B30FF");
        setNameColor(data.name_color || "#ffffff");
      }
    }
    loadProfile();
  }, [user.id]);

  async function saveProfile() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        status_message: statusMessage.trim(),
        avatar_color: avatarColor,
        name_color: nameColor,
      })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase
      .from("presence")
      .update({ status: "offline", last_seen: new Date().toISOString() })
      .eq("user_id", user.id);
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    if (!window.confirm("REALLY sure? All your data will be deleted.")) return;

    await supabase.from("messages").delete().eq("user_id", user.id);
    await supabase.from("direct_messages").delete().eq("user_id", user.id);
    await supabase
      .from("friendships")
      .delete()
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);
    await supabase.from("channel_members").delete().eq("user_id", user.id);
    await supabase.from("presence").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#000000",
        overflow: "hidden",
        height: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 30px",
          borderBottom: "1px solid #0d0d1a",
          backgroundColor: "#020205",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              letterSpacing: "2px",
            }}
          >
            SETTINGS
          </div>
          <div
            style={{
              color: "#2a2a3a",
              fontSize: "11px",
              letterSpacing: "1px",
              marginTop: "2px",
            }}
          >
            CUSTOMIZE YOUR IDENTITY
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #1a1a3a",
              borderRadius: "6px",
              color: "#9B30FF",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "12px",
              letterSpacing: "1px",
            }}
          >
            ← BACK
          </button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "30px",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "30px",
          }}
        >
          {[
            { key: "profile", label: "PROFILE" },
            { key: "appearance", label: "APPEARANCE" },
            { key: "account", label: "ACCOUNT" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: tab === t.key ? "#9B30FF" : "#1a1a3a",
                backgroundColor:
                  tab === t.key ? "rgba(155,48,255,0.1)" : "transparent",
                color: tab === t.key ? "#9B30FF" : "#2a2a3a",
                fontSize: "11px",
                letterSpacing: "2px",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Preview Card */}
            <div
              style={{
                padding: "30px",
                backgroundColor: "#050508",
                border: "1px solid #1a1a3a",
                borderRadius: "12px",
                marginBottom: "30px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: avatarColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "32px",
                  fontWeight: "700",
                  margin: "0 auto 16px",
                  boxShadow: `0 0 30px ${avatarColor}40`,
                }}
              >
                {username.charAt(0).toUpperCase()}
              </div>

              <div
                style={{
                  color: nameColor,
                  fontSize: "18px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "6px",
                }}
              >
                {username}
              </div>

              <div
                style={{
                  color: "#4a4a6a",
                  fontSize: "12px",
                  fontStyle: "italic",
                }}
              >
                {statusMessage || "No status set"}
              </div>
            </div>

            {/* Status Message */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>STATUS MESSAGE</label>
              <input
                value={statusMessage}
                onChange={(e) => setStatusMsg(e.target.value)}
                placeholder="What are you up to?"
                maxLength={100}
                style={inputStyle}
              />
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "10px",
                  textAlign: "right",
                  marginTop: "4px",
                }}
              >
                {statusMessage.length}/100
              </div>
            </div>

            {/* Avatar Color */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>AVATAR COLOR</label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                {avatarColors.map((c) => (
                  <div
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border:
                        avatarColor === c
                          ? "3px solid white"
                          : "3px solid transparent",
                      transition: "all 0.2s",
                      boxShadow: avatarColor === c ? `0 0 15px ${c}60` : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Name Color */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>DISPLAY NAME COLOR</label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                {nameColors.map((c) => (
                  <div
                    key={c}
                    onClick={() => setNameColor(c)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border:
                        nameColor === c
                          ? "3px solid #9B30FF"
                          : "3px solid transparent",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Save */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveProfile}
              disabled={saving}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "8px",
                background: saved
                  ? "linear-gradient(135deg, #004B00, #00ff00)"
                  : "linear-gradient(135deg, #4B0082, #9B30FF)",
                color: "white",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "2px",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(155,48,255,0.3)",
              }}
            >
              {saving ? "SAVING..." : saved ? "✓ SAVED" : "SAVE CHANGES"}
            </motion.button>
          </motion.div>
        )}

        {/* APPEARANCE TAB */}
        {tab === "appearance" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              style={{
                padding: "20px",
                backgroundColor: "#050508",
                border: "1px solid #1a1a3a",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  color: "#9B30FF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "16px",
                }}
              >
                CHAT PREVIEW
              </div>

              {/* Preview messages */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#00BFFF",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      marginBottom: "4px",
                    }}
                  >
                    Someone
                  </div>
                  <div
                    style={{
                      padding: "10px 16px",
                      borderRadius: "4px 16px 16px 16px",
                      backgroundColor: "#0a0a15",
                      border: "1px solid #1a1a3a",
                      color: "#ffffff",
                      fontSize: "14px",
                      display: "inline-block",
                    }}
                  >
                    Hey, how is The Void going?
                  </div>
                </div>

                <div style={{ alignSelf: "flex-end" }}>
                  <div
                    style={{
                      color: nameColor,
                      fontSize: "11px",
                      letterSpacing: "1px",
                      marginBottom: "4px",
                      textAlign: "right",
                    }}
                  >
                    YOU
                  </div>
                  <div
                    style={{
                      padding: "10px 16px",
                      borderRadius: "16px 4px 16px 16px",
                      background: "linear-gradient(135deg, #4B0082, #9B30FF)",
                      color: "#ffffff",
                      fontSize: "14px",
                      display: "inline-block",
                    }}
                  >
                    Building something amazing 🚀
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                color: "#2a2a3a",
                fontSize: "12px",
                textAlign: "center",
                letterSpacing: "1px",
              }}
            >
              More appearance options coming soon...
            </div>
          </motion.div>
        )}

        {/* ACCOUNT TAB */}
        {tab === "account" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Account Info */}
            <div
              style={{
                padding: "20px",
                backgroundColor: "#050508",
                border: "1px solid #1a1a3a",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  color: "#9B30FF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "16px",
                }}
              >
                ACCOUNT INFO
              </div>

              <InfoLine label="Username" value={username} />
              <InfoLine label="Email" value={user.email} />
              <InfoLine
                label="User ID"
                value={user.id.substring(0, 8) + "..."}
              />
              <InfoLine
                label="Joined"
                value={new Date(user.created_at).toLocaleDateString()}
              />
            </div>

            {/* Danger Zone */}
            <div
              style={{
                padding: "20px",
                backgroundColor: "#050508",
                border: "1px solid #440000",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  color: "#ff4444",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "16px",
                }}
              >
                DANGER ZONE
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "14px",
                  marginBottom: "10px",
                  border: "1px solid #1a1a3a",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "#ff4444",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                DISCONNECT (LOGOUT)
              </button>

              <button
                onClick={deleteAccount}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#440000",
                  color: "#ff4444",
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                DELETE ACCOUNT PERMANENTLY
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid #0d0d1a",
      }}
    >
      <span style={{ color: "#4a4a6a", fontSize: "12px" }}>{label}</span>
      <span style={{ color: "#8a8aaa", fontSize: "12px" }}>{value}</span>
    </div>
  );
}

const labelStyle = {
  display: "block",
  color: "#4a4a6a",
  fontSize: "10px",
  letterSpacing: "2px",
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  backgroundColor: "#0a0a15",
  border: "1px solid #1a1a3a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};
