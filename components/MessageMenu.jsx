"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { Reply, Smile, Copy, Pencil, Trash2, Pin } from "lucide-react";

export default function MessageMenu({
  message,
  isOwn,
  position,
  onClose,
  onReply,
  onReact,
  onMessagesChanged,
  currentUsername,
}) {
  const [view, setView] = useState("menu");
  const [editText, setEditText] = useState(message.content);
  const [error, setError] = useState("");

  async function deleteMessage() {
    await supabase.from("messages").delete().eq("id", message.id);
    onMessagesChanged();
    onClose();
  }

  async function saveEdit() {
    if (!editText.trim()) {
      setError("Message cannot be empty");
      return;
    }
    await supabase
      .from("messages")
      .update({ content: editText.trim(), edited: true })
      .eq("id", message.id);
    onMessagesChanged();
    onClose();
  }

  async function togglePin() {
    await supabase
      .from("messages")
      .update({
        pinned: !message.pinned,
        pinned_by: message.pinned ? null : currentUsername || "Unknown",
      })
      .eq("id", message.id);
    onMessagesChanged();
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    onClose();
  }
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
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        style={{
          position: "fixed",
          top: Math.min(position.y, window.innerHeight - 340),
          left: Math.min(position.x, window.innerWidth - 240),
          backgroundColor: "#0a0a15",
          border: "1px solid #1a1a3a",
          borderRadius: "10px",
          padding: "8px",
          minWidth: "200px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          zIndex: 1001,
        }}
      >
        {view === "menu" && (
          <>
            <MenuItem
              icon={<Reply size={14} />}
              label="Reply"
              onClick={() => {
                onReply(message);
                onClose();
              }}
            />
            <MenuItem
              icon={<Smile size={14} />}
              label="React"
              onClick={() => {
                onReact(message);
                onClose();
              }}
            />
            <MenuItem
              icon={<Pin size={14} />}
              label={message.pinned ? "Unpin" : "Pin"}
              highlight={message.pinned}
              onClick={togglePin}
            />
            <MenuItem
              icon={<Copy size={14} />}
              label="Copy Text"
              onClick={handleCopy}
            />
            {isOwn && (
              <>
                <div
                  style={{
                    height: "1px",
                    background: "#1a1a3a",
                    margin: "4px 0",
                  }}
                />
                <MenuItem
                  icon={<Pencil size={14} />}
                  label="Edit Message"
                  onClick={() => setView("edit")}
                />
                <MenuItem
                  icon={<Trash2 size={14} />}
                  label="Delete Message"
                  danger
                  onClick={() => setView("delete")}
                />
              </>
            )}
          </>
        )}

        {view === "edit" && (
          <div style={{ padding: "8px" }}>
            <div
              style={{
                color: "#9B30FF",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              EDIT MESSAGE
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                backgroundColor: "#050508",
                border: "1px solid #1a1a3a",
                borderRadius: "6px",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            {error && (
              <div
                style={{ color: "#ff4444", fontSize: "11px", marginTop: "6px" }}
              >
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button
                onClick={saveEdit}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #4B0082, #9B30FF)",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                SAVE
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #1a1a3a",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  color: "#4a4a6a",
                  fontSize: "11px",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {view === "delete" && (
          <div style={{ padding: "8px" }}>
            <div
              style={{
                color: "#ff4444",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "2px",
                marginBottom: "8px",
              }}
            >
              DELETE MESSAGE
            </div>
            <div
              style={{
                color: "#4a4a6a",
                fontSize: "12px",
                marginBottom: "12px",
                padding: "8px 12px",
                backgroundColor: "#050508",
                borderRadius: "6px",
                borderLeft: "3px solid #ff4444",
              }}
            >
              {message.content.length > 50
                ? message.content.substring(0, 50) + "..."
                : message.content}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={deleteMessage}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#440000",
                  color: "#ff4444",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                DELETE
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #1a1a3a",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  color: "#4a4a6a",
                  fontSize: "11px",
                  letterSpacing: "2px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger, highlight }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "8px 12px",
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "6px",
        color: danger ? "#ff4444" : highlight ? "#FFD700" : "#8a8aaa",
        fontSize: "13px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = danger
          ? "rgba(255,68,68,0.1)"
          : highlight
            ? "rgba(255,215,0,0.1)"
            : "rgba(155,48,255,0.1)";
        e.currentTarget.style.color = danger
          ? "#ff4444"
          : highlight
            ? "#FFD700"
            : "#ffffff";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = danger
          ? "#ff4444"
          : highlight
            ? "#FFD700"
            : "#8a8aaa";
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
