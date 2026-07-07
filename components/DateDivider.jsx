"use client";

export default function DateDivider({ date }) {
  if (!date) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        margin: "20px 0 12px",
      }}
    >
      <div style={{ flex: 1, height: "1px", background: "#1a1a3a" }} />
      <div
        style={{
          color: "#2a2a3a",
          fontSize: "11px",
          letterSpacing: "2px",
          whiteSpace: "nowrap",
        }}
      >
        {date}
      </div>
      <div style={{ flex: 1, height: "1px", background: "#1a1a3a" }} />
    </div>
  );
}
