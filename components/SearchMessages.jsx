"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Search, X } from "lucide-react";

export default function SearchMessages({ roomId, onClose, onJumpTo }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim() || !roomId) return;
    setSearching(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .ilike("content", `%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    setResults(data || []);
    setSearching(false);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  function highlightMatch(text, q) {
    if (!q.trim()) return text;
    const regex = new RegExp(
      `(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          style={{
            backgroundColor: "rgba(155,48,255,0.4)",
            borderRadius: "2px",
            padding: "0 2px",
          }}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
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
          <div
            style={{
              color: "#9B30FF",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "3px",
            }}
          >
            SEARCH MESSAGES
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

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search in this channel..."
            style={{
              flex: 1,
              padding: "12px 16px",
              backgroundColor: "#050508",
              border: "1px solid #1a1a3a",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #4B0082, #9B30FF)",
              color: "white",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "2px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Search size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {searching && (
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "13px",
                textAlign: "center",
                marginTop: "20px",
                letterSpacing: "2px",
              }}
            >
              SEARCHING...
            </div>
          )}

          {!searching && results.length === 0 && query && (
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "13px",
                textAlign: "center",
                marginTop: "20px",
                letterSpacing: "2px",
              }}
            >
              NO RESULTS FOUND
            </div>
          )}

          {!searching && results.length === 0 && !query && (
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "13px",
                textAlign: "center",
                marginTop: "20px",
                letterSpacing: "1px",
              }}
            >
              Type something to search
            </div>
          )}

          {results.map((msg) => (
            <div
              key={msg.id}
              onClick={() => {
                if (onJumpTo) onJumpTo(msg.id);
                onClose();
              }}
              style={{
                padding: "12px 16px",
                backgroundColor: "#050508",
                border: "1px solid #1a1a3a",
                borderRadius: "8px",
                marginBottom: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#9B30FF";
                e.currentTarget.style.backgroundColor = "#0a0a15";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#1a1a3a";
                e.currentTarget.style.backgroundColor = "#050508";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
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
                <span style={{ color: "#2a2a3a", fontSize: "10px" }}>
                  {formatDate(msg.created_at)}
                </span>
              </div>
              <div
                style={{
                  color: "#8a8aaa",
                  fontSize: "13px",
                  lineHeight: "1.4",
                }}
              >
                {highlightMatch(msg.content, query)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
