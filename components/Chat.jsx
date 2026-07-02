"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import DirectMessages from "./DirectMessages";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("chat");
  const bottomRef = useRef(null);
  const username = user.user_metadata?.username || user.email;

  useEffect(() => {
    let channel;
    let mounted = true;

    function handleViewChange(newView) {
      if (newView === view) return;
      // Small delay to let old channel clean up properly
      setLoading(true);
      setTimeout(() => {
        setView(newView);
        setLoading(false);
      }, 300);
    }

    async function init() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(100);

        if (!mounted) return;
        if (!error) setMessages(data || []);
        setLoading(false);

        channel = supabase.channel("void:messages:" + Date.now()).on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            if (mounted) {
              setMessages((prev) => [...prev, payload.new]);
            }
          },
        );

        await channel.subscribe();
      } catch (err) {
        console.error("Channel error:", err);
      }
    }

    if (view === "chat") {
      init();
    }

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");

    const { error } = await supabase.from("messages").insert({
      content,
      username,
      user_id: user.id,
    });

    if (error) {
      console.error(error);
      setText(content);
    }
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
      {/* ── SIDEBAR ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "220px",
          backgroundColor: "#050508",
          borderRight: "1px solid #0d0d1a",
          display: "flex",
          flexDirection: "column",
          padding: "30px 20px",
          position: "relative",
        }}
      >
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

        {/* Logo */}
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: "900",
              letterSpacing: "6px",
              background: "linear-gradient(135deg, #9B30FF, #00BFFF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            THE VOID
          </div>
          <div
            style={{
              color: "#2a2a3a",
              fontSize: "9px",
              letterSpacing: "2px",
              marginTop: "4px",
            }}
          >
            V2.0
          </div>
        </div>

        {/* User info */}
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#0a0a15",
            borderRadius: "8px",
            border: "1px solid #1a1a3a",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#00ff00",
                boxShadow: "0 0 6px #00ff00",
              }}
            />
            <div
              style={{
                color: "#9B30FF",
                fontSize: "13px",
                fontWeight: "600",
                letterSpacing: "1px",
              }}
            >
              {username}
            </div>
          </div>
          <div
            style={{
              color: "#2a2a3a",
              fontSize: "10px",
              letterSpacing: "1px",
              paddingLeft: "16px",
            }}
          >
            ONLINE
          </div>
        </div>

        {/* Navigation */}
        <div
          style={{
            color: "#2a2a3a",
            fontSize: "10px",
            letterSpacing: "2px",
            marginBottom: "8px",
          }}
        >
          CHANNELS
        </div>

        <div
          onClick={() => handleViewChange("chat")}
          style={{
            padding: "10px 14px",
            backgroundColor:
              view === "chat" ? "rgba(155,48,255,0.1)" : "transparent",
            borderRadius: "6px",
            border: "1px solid",
            borderColor:
              view === "chat" ? "rgba(155,48,255,0.2)" : "transparent",
            color: view === "chat" ? "#9B30FF" : "#2a2a3a",
            fontSize: "13px",
            letterSpacing: "1px",
            marginBottom: "4px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          # the-void
        </div>

        <div
          style={{
            color: "#2a2a3a",
            fontSize: "10px",
            letterSpacing: "2px",
            marginBottom: "8px",
            marginTop: "16px",
          }}
        >
          DIRECT MESSAGES
        </div>

        <div
          onClick={() => handleViewChange("dms")}
          style={{
            padding: "10px 14px",
            backgroundColor:
              view === "dms" ? "rgba(0,191,255,0.1)" : "transparent",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: view === "dms" ? "rgba(0,191,255,0.2)" : "transparent",
            color: view === "dms" ? "#00BFFF" : "#2a2a3a",
            fontSize: "13px",
            letterSpacing: "1px",
            marginBottom: "auto",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          @ messages
        </div>

        {/* Logout */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => supabase.auth.signOut()}
          style={{
            padding: "12px",
            backgroundColor: "transparent",
            border: "1px solid #1a0020",
            borderRadius: "8px",
            color: "#3a1a3a",
            fontSize: "12px",
            letterSpacing: "2px",
            cursor: "pointer",
            transition: "all 0.3s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "#440000";
            e.currentTarget.style.color = "#ff4444";
            e.currentTarget.style.backgroundColor = "rgba(255,68,68,0.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "#1a0020";
            e.currentTarget.style.color = "#3a1a3a";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          DISCONNECT
        </motion.button>
      </motion.div>

      {/* ── MAIN CONTENT ── */}
      {view === "chat" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              padding: "20px 30px",
              borderBottom: "1px solid #0d0d1a",
              backgroundColor: "#020205",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
                # the-void
              </div>
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  marginTop: "2px",
                }}
              >
                ENCRYPTED GROUP CHANNEL
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#00BFFF",
                  boxShadow: "0 0 6px #00BFFF",
                }}
              />
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "11px",
                  letterSpacing: "1px",
                }}
              >
                LIVE
              </div>
            </div>
          </motion.div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {loading && (
              <div
                style={{
                  textAlign: "center",
                  color: "#2a2a3a",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  marginTop: "40px",
                }}
              >
                LOADING TRANSMISSION...
              </div>
            )}

            {!loading && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  textAlign: "center",
                  color: "#2a2a3a",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  marginTop: "40px",
                }}
              >
                THE VOID IS SILENT.
                <br />
                <span style={{ fontSize: "11px" }}>
                  Be the first to transmit.
                </span>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg, i) => {
                const isOwn = msg.user_id === user.id;
                const showName =
                  i === 0 || messages[i - 1]?.user_id !== msg.user_id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isOwn ? "flex-end" : "flex-start",
                      marginTop: showName ? "16px" : "2px",
                    }}
                  >
                    {showName && (
                      <div
                        style={{
                          color: isOwn ? "#9B30FF" : "#00BFFF",
                          fontSize: "11px",
                          letterSpacing: "1px",
                          marginBottom: "4px",
                          paddingLeft: isOwn ? 0 : "4px",
                          paddingRight: isOwn ? "4px" : 0,
                        }}
                      >
                        {isOwn ? "YOU" : msg.username}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "8px",
                        flexDirection: isOwn ? "row-reverse" : "row",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "460px",
                          padding: "10px 16px",
                          borderRadius: isOwn
                            ? "16px 4px 16px 16px"
                            : "4px 16px 16px 16px",
                          background: isOwn
                            ? "linear-gradient(135deg, #4B0082, #9B30FF)"
                            : "#0a0a15",
                          border: isOwn ? "none" : "1px solid #1a1a3a",
                          color: "#ffffff",
                          fontSize: "14px",
                          lineHeight: "1.5",
                          boxShadow: isOwn
                            ? "0 4px 20px rgba(155,48,255,0.2)"
                            : "none",
                        }}
                      >
                        {msg.content}
                      </div>

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
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              padding: "20px 30px",
              borderTop: "1px solid #0d0d1a",
              backgroundColor: "#020205",
            }}
          >
            <form
              onSubmit={sendMessage}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Transmit a message..."
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  backgroundColor: "#0a0a15",
                  border: "1px solid #1a1a3a",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                  letterSpacing: "0.5px",
                  transition: "border-color 0.3s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#9B30FF")}
                onBlur={(e) => (e.target.style.borderColor = "#1a1a3a")}
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                style={{
                  padding: "14px 28px",
                  border: "none",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #4B0082, #9B30FF)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "2px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(155,48,255,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                TRANSMIT
              </motion.button>
            </form>
          </motion.div>
        </div>
      ) : (
        <DirectMessages currentUser={user} />
      )}
    </div>
  );
}
