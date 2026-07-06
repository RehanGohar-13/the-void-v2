"use client";

import { useState } from "react";
import {
  X,
  Send,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  FileCode,
  File,
} from "lucide-react";

export default function FileUploadPreview({ file, onSend, onCancel }) {
  const [caption, setCaption] = useState("");

  const isImage = file.type?.startsWith("image/");
  const isVideo = file.type?.startsWith("video/");
  const isAudio = file.type?.startsWith("audio/");
  const ext = file.name?.split(".").pop()?.toUpperCase() || "FILE";

  function getIcon() {
    if (isImage) return <ImageIcon size={32} />;
    if (isVideo) return <Video size={32} />;
    if (isAudio) return <Music size={32} />;
    if (file.name?.endsWith(".pdf")) return <FileText size={32} />;
    if (
      [".py", ".js", ".jsx", ".html", ".css", ".json"].some((e) =>
        file.name?.endsWith(e),
      )
    )
      return <FileCode size={32} />;
    if ([".zip", ".rar", ".7z"].some((e) => file.name?.endsWith(e)))
      return <Archive size={32} />;
    return <File size={32} />;
  }

  function getColor() {
    if (isImage) return "#00BFFF";
    if (isVideo) return "#FF6B6B";
    if (isAudio) return "#FFD700";
    if (file.name?.endsWith(".pdf")) return "#FF4444";
    if (
      [".py", ".js", ".jsx", ".html", ".css", ".json"].some((e) =>
        file.name?.endsWith(e),
      )
    )
      return "#00FF00";
    if ([".zip", ".rar", ".7z"].some((e) => file.name?.endsWith(e)))
      return "#FF8C00";
    return "#9B30FF";
  }

  const color = getColor();
  const sizeKB = (file.size / 1024).toFixed(1);
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const sizeDisplay = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div
      onClick={handleOverlay}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        backgroundColor: "rgba(0,0,0,0.8)",
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
          padding: "24px",
          width: "400px",
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
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
            ATTACH FILE
          </div>
          <button
            onClick={onCancel}
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

        {/* Preview */}
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
          {isImage ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
            />
          ) : isVideo ? (
            <video
              src={URL.createObjectURL(file)}
              controls
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
            />
          ) : isAudio ? (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "12px",
                  backgroundColor: `${color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: color,
                  margin: "0 auto 12px",
                }}
              >
                {getIcon()}
              </div>
              <audio
                src={URL.createObjectURL(file)}
                controls
                style={{ width: "100%" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                backgroundColor: `${color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: color,
                margin: "0 auto 12px",
              }}
            >
              {getIcon()}
            </div>
          )}

          <div
            style={{
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {file.name}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "6px",
            }}
          >
            <span
              style={{
                color: "#2a2a3a",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              {ext}
            </span>
            <span style={{ color: "#2a2a3a", fontSize: "11px" }}>•</span>
            <span
              style={{
                color: "#2a2a3a",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              {sizeDisplay}
            </span>
          </div>
        </div>

        {/* Caption input */}
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend(file, caption)}
          placeholder="Add a caption (optional)..."
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#050508",
            border: "1px solid #1a1a3a",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "16px",
          }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onSend(file, caption)}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #4B0082, #9B30FF)",
              color: "white",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "2px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(155,48,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Send size={14} /> SEND
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "12px 20px",
              border: "1px solid #1a1a3a",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "#4a4a6a",
              fontSize: "13px",
              letterSpacing: "2px",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
