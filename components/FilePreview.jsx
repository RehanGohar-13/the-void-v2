"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  FileText,
  FileCode,
  Music,
  Video,
  Archive,
  File,
  Download,
  X,
  ZoomIn,
} from "lucide-react";

export default function FilePreview({ url, name, type, isMobile }) {
  const [lightbox, setLightbox] = useState(false);
  const maxWidth = isMobile ? "260px" : "400px";

  // ── Determine file category ───────────────────────────
  const isImage = type?.startsWith("image/");
  const isVideo = type?.startsWith("video/");
  const isAudio = type?.startsWith("audio/");
  const isPDF = type === "application/pdf" || name?.endsWith(".pdf");
  const isCode = [
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".html",
    ".css",
    ".json",
    ".xml",
    ".md",
  ].some((ext) => name?.endsWith(ext));
  const isArchive = [".zip", ".rar", ".7z", ".tar", ".gz"].some((ext) =>
    name?.endsWith(ext),
  );

  // ── Get file extension ────────────────────────────────
  const ext = name?.split(".").pop()?.toUpperCase() || "FILE";

  // ── Get icon and color based on type ──────────────────
  function getFileStyle() {
    if (isImage)
      return {
        icon: <ImageIcon size={20} />,
        color: "#00BFFF",
        bg: "rgba(0,191,255,0.1)",
      };
    if (isVideo)
      return {
        icon: <Video size={20} />,
        color: "#FF6B6B",
        bg: "rgba(255,107,107,0.1)",
      };
    if (isAudio)
      return {
        icon: <Music size={20} />,
        color: "#FFD700",
        bg: "rgba(255,215,0,0.1)",
      };
    if (isPDF)
      return {
        icon: <FileText size={20} />,
        color: "#FF4444",
        bg: "rgba(255,68,68,0.1)",
      };
    if (isCode)
      return {
        icon: <FileCode size={20} />,
        color: "#00FF00",
        bg: "rgba(0,255,0,0.1)",
      };
    if (isArchive)
      return {
        icon: <Archive size={20} />,
        color: "#FF8C00",
        bg: "rgba(255,140,0,0.1)",
      };
    return {
      icon: <File size={20} />,
      color: "#9B30FF",
      bg: "rgba(155,48,255,0.1)",
    };
  }

  const fileStyle = getFileStyle();

  // ── Image Preview ─────────────────────────────────────
  if (isImage) {
    return (
      <>
        <div
          onClick={() => setLightbox(true)}
          style={{
            marginTop: "6px",
            maxWidth,
            cursor: "pointer",
            position: "relative",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #1a1a3a",
          }}
        >
          <img
            src={url}
            alt={name}
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              display: "block",
              borderRadius: "10px",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              display: "flex",
              gap: "4px",
            }}
          >
            <div
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "#ffffff",
                fontSize: "10px",
                letterSpacing: "1px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ZoomIn size={12} /> VIEW
            </div>
          </div>
        </div>

        {lightbox && (
          <div
            onClick={() => setLightbox(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 3000,
              backgroundColor: "rgba(0,0,0,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <button
              onClick={() => setLightbox(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              <X size={28} />
            </button>

            <img
              src={url}
              alt={name}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: "8px",
                cursor: "default",
              }}
            />

            <a
              href={url}
              download={name}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                padding: "10px 20px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #4B0082, #9B30FF)",
                color: "white",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "2px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Download size={14} /> DOWNLOAD
            </a>
          </div>
        )}
      </>
    );
  }

  // ── Video Preview ─────────────────────────────────────
  if (isVideo) {
    return (
      <div style={{ marginTop: "6px", maxWidth }}>
        <video
          src={url}
          controls
          style={{
            maxWidth: "100%",
            maxHeight: "300px",
            borderRadius: "10px",
            border: "1px solid #1a1a3a",
            backgroundColor: "#000",
          }}
        />
        <FileCard name={name} ext={ext} style={fileStyle} url={url} />
      </div>
    );
  }

  // ── Audio Preview ─────────────────────────────────────
  if (isAudio) {
    return (
      <div style={{ marginTop: "6px", maxWidth }}>
        <div
          style={{
            padding: "16px",
            backgroundColor: "#050508",
            border: "1px solid #1a1a3a",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: fileStyle.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: fileStyle.color,
              }}
            >
              {fileStyle.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "10px",
                  letterSpacing: "1px",
                }}
              >
                {ext} AUDIO
              </div>
            </div>
          </div>

          <audio
            src={url}
            controls
            style={{
              width: "100%",
              height: "36px",
              outline: "none",
            }}
          />
        </div>
      </div>
    );
  }

  // ── Generic File Card (PDF, Code, Archive, Other) ─────
  return (
    <div style={{ marginTop: "6px", maxWidth }}>
      <FileCard name={name} ext={ext} style={fileStyle} url={url} />
    </div>
  );
}

// ── Reusable File Card Component ────────────────────────
function FileCard({ name, ext, style, url }) {
  return (
    <a
      href={url}
      download={name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        backgroundColor: "#050508",
        border: "1px solid #1a1a3a",
        borderRadius: "10px",
        textDecoration: "none",
        transition: "all 0.2s",
        cursor: "pointer",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = style.color;
        e.currentTarget.style.backgroundColor = "#0a0a15";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = "#1a1a3a";
        e.currentTarget.style.backgroundColor = "#050508";
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "8px",
          backgroundColor: style.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: style.color,
          flexShrink: 0,
        }}
      >
        {style.icon}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <div
          style={{
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "600",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        <div
          style={{
            color: "#2a2a3a",
            fontSize: "10px",
            letterSpacing: "1px",
            marginTop: "2px",
          }}
        >
          {ext} FILE
        </div>
      </div>

      <div
        style={{
          color: style.color,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Download size={16} />
      </div>
    </a>
  );
}
