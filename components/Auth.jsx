"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        display: "flex",
        fontFamily: "Segoe UI, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── LEFT PANEL ── */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{
          flex: 1,
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #0d0020 50%, #000820 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid #1a0040",
        }}
      >
        {/* Glow orb top */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(155,48,255,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Glow orb bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,191,255,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
            linear-gradient(rgba(155,48,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(155,48,255,0.03) 1px, transparent 1px)
          `,
            backgroundSize: "50px 50px",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          style={{ textAlign: "center", zIndex: 1 }}
        >
          {/* Eclipse logo */}
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "transparent",
              border: "3px solid #9B30FF",
              boxShadow:
                "0 0 40px rgba(155,48,255,0.5), inset 0 0 40px rgba(0,0,0,0.9)",
              margin: "0 auto 40px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "-20px",
                top: "-10px",
                width: "110px",
                height: "110px",
                borderRadius: "50%",
                backgroundColor: "#000000",
                boxShadow: "4px 0 20px rgba(155,48,255,0.3)",
              }}
            />
            {/* Blue rim */}
            <div
              style={{
                position: "absolute",
                inset: "3px",
                borderRadius: "50%",
                border: "1px solid rgba(0,191,255,0.3)",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "56px",
              fontWeight: "900",
              letterSpacing: "12px",
              background: "linear-gradient(135deg, #9B30FF 0%, #00BFFF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "16px",
            }}
          >
            THE VOID
          </div>

          <div
            style={{
              color: "#3a3a5c",
              fontSize: "11px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginBottom: "60px",
            }}
          >
            Encrypted Logic Terminal
          </div>

          {/* Feature pills */}
          {[
            "⚡ Real-time messaging",
            "🔒 End-to-end encrypted",
            "👁 Invite-only access",
          ].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
              style={{
                display: "inline-block",
                padding: "8px 20px",
                margin: "5px",
                borderRadius: "20px",
                border: "1px solid rgba(155,48,255,0.3)",
                backgroundColor: "rgba(155,48,255,0.05)",
                color: "#7a7a9a",
                fontSize: "12px",
                letterSpacing: "1px",
              }}
            >
              {text}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom version tag */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            position: "absolute",
            bottom: "30px",
            color: "#2a2a3a",
            fontSize: "11px",
            letterSpacing: "2px",
          }}
        >
          VERSION 2.0 — BUILT IN PAKISTAN
        </motion.div>
      </motion.div>

      {/* ── RIGHT PANEL ── */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{
          width: "480px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 50px",
          backgroundColor: "#050508",
          position: "relative",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #9B30FF, #00BFFF, transparent)",
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Form header */}
            <div style={{ marginBottom: "40px" }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#ffffff",
                  marginBottom: "8px",
                  letterSpacing: "2px",
                }}
              >
                {mode === "signup" ? "REQUEST ACCESS" : "OPEN THE VOID"}
              </div>
              <div
                style={{
                  color: "#3a3a5c",
                  fontSize: "13px",
                  letterSpacing: "1px",
                }}
              >
                {mode === "signup"
                  ? "Create your identity in the void"
                  : "Enter your credentials to proceed"}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>IDENTITY</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Choose your identity"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>EMAIL</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>PASS-KEY</label>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    color: "#ff4444",
                    fontSize: "13px",
                    marginBottom: "16px",
                    padding: "10px 16px",
                    backgroundColor: "rgba(255,68,68,0.1)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,68,68,0.2)",
                  }}
                >
                  ⚠ {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "16px",
                  border: "none",
                  borderRadius: "8px",
                  background: loading
                    ? "#1a1a2e"
                    : "linear-gradient(135deg, #4B0082 0%, #9B30FF 50%, #00BFFF 100%)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "700",
                  letterSpacing: "3px",
                  cursor: loading ? "not-allowed" : "pointer",
                  marginBottom: "20px",
                  boxShadow: loading ? "none" : "0 0 30px rgba(155,48,255,0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                {loading
                  ? "CONNECTING..."
                  : mode === "signup"
                    ? "REQUEST ACCESS"
                    : "ENTER THE VOID"}
              </motion.button>
            </form>

            {/* Switch mode */}
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setError("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#3a3a5c",
                  fontSize: "13px",
                  cursor: "pointer",
                  letterSpacing: "1px",
                  transition: "color 0.3s",
                }}
                onMouseOver={(e) => (e.target.style.color = "#9B30FF")}
                onMouseOut={(e) => (e.target.style.color = "#3a3a5c")}
              >
                {mode === "signup"
                  ? "Already have access? Sign in →"
                  : "No access yet? Request it →"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, #00BFFF, transparent)",
          }}
        />
      </motion.div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  color: "#3a3a5c",
  fontSize: "11px",
  letterSpacing: "2px",
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 18px",
  border: "1px solid #1a1a3a",
  borderRadius: "8px",
  backgroundColor: "#0a0a15",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.3s",
  letterSpacing: "1px",
};
