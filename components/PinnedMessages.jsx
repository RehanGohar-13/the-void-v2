"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, Pin } from "lucide-react";

export default function PinnedMessages({ roomId, onClose }) {
  const [pinned, setPinned] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("pinned", true)
        .order("created_at", { ascending: false });
      setPinned(data || []);
      setLoading(false);
    }
    load();
  }, [roomId]);

  async function unpin(msgId) {
    await supabase
      .from("messages")
      .update({ pinned: false, pinned_by: null })
      .eq("id", msgId);
    setPinned((prev) => prev.filter((m) => m.id !== msgId));
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "80px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#0a0a15",
          border: "1px solid #1a1a3a",
          borderRadius: "14px",
          padding: "24px",
          width: "500px",
          maxWidth: "90vw",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Pin size={16} style={{ color: "#FFD700" }} />
            <div
              style={{
                color: "#FFD700",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "3px",
              }}
            >
              PINNED MESSAGES
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#4a4a6a",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "13px",
                textAlign: "center",
                marginTop: "20px",
                letterSpacing: "2px",
              }}
            >
              LOADING...
            </div>
          )}

          {!loading && pinned.length === 0 && (
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "13px",
                textAlign: "center",
                marginTop: "20px",
                letterSpacing: "2px",
              }}
            >
              NO PINNED MESSAGES
            </div>
          )}

          {pinned.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "14px 16px",
                backgroundColor: "#050508",
                border: "1px solid rgba(255,215,0,0.2)",
                borderRadius: "8px",
                marginBottom: "8px",
                borderLeft: "3px solid #FFD700",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    color: "#9B30FF",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {msg.username}
                </span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ color: "#2a2a3a", fontSize: "10px" }}>
                    {formatDate(msg.created_at)}
                  </span>
                  <button
                    onClick={() => unpin(msg.id)}
                    title="Unpin"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ff4444",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: "13px",
                  lineHeight: "1.5",
                }}
              >
                {msg.content}
              </div>
              {msg.pinned_by && (
                <div
                  style={{
                    color: "#FFD700",
                    fontSize: "10px",
                    marginTop: "6px",
                    letterSpacing: "1px",
                  }}
                >
                  Pinned by {msg.pinned_by}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
