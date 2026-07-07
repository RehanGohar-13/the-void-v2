"use client";

import { useState } from "react";
import FilePreview from "./FilePreview";

export default function MessageBubble({
  msg,
  isOwn,
  showName,
  isMobile,
  reactions,
  onReaction,
  onContextMenu,
  formatTime,
  groupReactionData,
}) {
  const hasContent = msg.content && msg.content.trim() !== "";
  const hasFile = !!msg.file_url;

  return (
    <div
      onContextMenu={onContextMenu}
      onTouchStart={(e) => {
        const t = setTimeout(() => {
          onContextMenu({
            preventDefault: () => {},
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
          });
        }, 500);
        e.currentTarget.dataset.longpress = t;
      }}
      onTouchEnd={(e) =>
        clearTimeout(Number(e.currentTarget.dataset.longpress))
      }
      onTouchMove={(e) =>
        clearTimeout(Number(e.currentTarget.dataset.longpress))
      }
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isOwn ? "flex-end" : "flex-start",
        marginTop: showName ? "16px" : "2px",
      }}
    >
      {/* Username */}
      {showName && (
        <div
          style={{
            color: isOwn ? "#9B30FF" : "#00BFFF",
            fontSize: "11px",
            letterSpacing: "1px",
            marginBottom: "4px",
          }}
        >
          {isOwn ? "YOU" : msg.username}
        </div>
      )}

      {/* Reply preview */}
      {msg.reply_to_content && (
        <div
          style={{
            padding: "6px 12px",
            marginBottom: "4px",
            borderLeft: "3px solid #4B0082",
            backgroundColor: "rgba(75,0,130,0.1)",
            borderRadius: "0 6px 6px 0",
            maxWidth: isMobile ? "250px" : "300px",
          }}
        >
          <div style={{ color: "#9B30FF", fontSize: "10px" }}>
            {msg.reply_to_username}
          </div>
          <div
            style={{
              color: "#4a4a6a",
              fontSize: "11px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {msg.reply_to_content}
          </div>
        </div>
      )}

      {/* Text bubble - only show if there is actual text content */}
      {hasContent && !(hasFile && !msg.content.trim()) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            flexDirection: isOwn ? "row-reverse" : "row",
            marginBottom: hasFile ? "4px" : 0,
          }}
        >
          <div
            style={{
              maxWidth: isMobile ? "260px" : "460px",
              padding: "10px 16px",
              borderRadius: isOwn ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
              background: isOwn
                ? "linear-gradient(135deg, #4B0082, #9B30FF)"
                : "#0a0a15",
              border: isOwn ? "none" : "1px solid #1a1a3a",
              color: "#ffffff",
              fontSize: isMobile ? "13px" : "14px",
              lineHeight: "1.5",
              wordBreak: "break-word",
              boxShadow: isOwn ? "0 4px 20px rgba(155,48,255,0.2)" : "none",
            }}
          >
            {msg.content}
            {msg.edited && (
              <span
                style={{
                  color: "#4a4a6a",
                  fontSize: "10px",
                  marginLeft: "8px",
                }}
              >
                (edited)
              </span>
            )}
          </div>
          {!hasFile && (
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "10px",
                whiteSpace: "nowrap",
              }}
            >
              {formatTime(msg.created_at)}
            </div>
          )}
        </div>
      )}

      {/* File preview */}
      {hasFile && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            flexDirection: isOwn ? "row-reverse" : "row",
          }}
        >
          <FilePreview
            url={msg.file_url}
            name={msg.file_name}
            type={msg.file_type}
            isMobile={isMobile}
          />
          <div
            style={{
              color: "#2a2a3a",
              fontSize: "10px",
              whiteSpace: "nowrap",
            }}
          >
            {formatTime(msg.created_at)}
          </div>
        </div>
      )}

      {/* No content and no file - just timestamp */}
      {!hasContent && !hasFile && (
        <div
          style={{
            color: "#2a2a3a",
            fontSize: "10px",
            whiteSpace: "nowrap",
          }}
        >
          {formatTime(msg.created_at)}
        </div>
      )}

      {/* Reactions */}
      {reactions && reactions.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "4px",
            flexWrap: "wrap",
          }}
        >
          {groupReactionData.map(([emoji, data]) => (
            <button
              key={emoji}
              onClick={() => onReaction(msg.id, emoji)}
              title={data.users.join(", ")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "13px",
                cursor: "pointer",
                border: "1px solid",
                borderColor: data.hasOwn ? "#9B30FF" : "#1a1a3a",
                backgroundColor: data.hasOwn
                  ? "rgba(155,48,255,0.15)"
                  : "rgba(255,255,255,0.03)",
                color: "#ffffff",
              }}
            >
              <span>{emoji}</span>
              <span style={{ fontSize: "11px", color: "#8a8aaa" }}>
                {data.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
