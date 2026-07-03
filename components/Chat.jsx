"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import DirectMessages from "./DirectMessages";
import ContextMenu from "./ContextMenu";
import MessageMenu from "./MessageMenu";
import MobileNav from "./MobileNav";
import OnlinePanel from "./OnlinePanel";
import MobileSettings from "./MobileSettings";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("chat");
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const bottomRef = useRef(null);
  const username = user.user_metadata?.username || user.email;
  const [contextMenu, setContextMenu] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // Load rooms on mount
  useEffect(() => {
    async function loadRooms() {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setRooms(data);
        setActiveRoom(data[0]);
      }
    }
    loadRooms();
  }, []);

  // Update presence
  useEffect(() => {
    async function updatePresence() {
      await supabase.from("presence").upsert({
        user_id: user.id,
        username: username,
        status: "online",
        last_seen: new Date().toISOString(),
      });
    }

    updatePresence();

    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [user.id, username]);

  // Poll online users
  useEffect(() => {
    let mounted = true;

    async function loadOnline() {
      const cutoff = new Date(Date.now() - 60000).toISOString();
      const { data } = await supabase
        .from("presence")
        .select("*")
        .gte("last_seen", cutoff);

      if (mounted) setOnlineUsers(data || []);
    }

    loadOnline();
    const interval = setInterval(loadOnline, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Poll messages for active room
  useEffect(() => {
    let interval;
    let mounted = true;

    async function loadMessages() {
      if (!activeRoom) return;

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", activeRoom.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (mounted && data) {
        setMessages(data);
        setLoading(false);
      }
    }

    if (view === "chat" && activeRoom) {
      loadMessages();
      interval = setInterval(loadMessages, 5000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [view, activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll typing indicators - ADD THIS BLOCK RIGHT HERE
  useEffect(() => {
    let interval;
    let mounted = true;

    async function checkTyping() {
      if (!activeRoom) return;
      const cutoff = new Date(Date.now() - 3000).toISOString();
      const { data } = await supabase
        .from("typing")
        .select("*")
        .eq("room_id", activeRoom.id)
        .gte("typing_at", cutoff)
        .neq("user_id", user.id);

      if (mounted) setTypingUsers(data || []);
    }

    if (view === "chat") {
      checkTyping();
      interval = setInterval(checkTyping, 2000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [view, activeRoom, user.id]);

  // Detect mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function handleViewChange(newView) {
    if (newView === view) return;
    setView(newView);
  }

  // ADD THIS RIGHT HERE
  async function handleTyping() {
    if (!activeRoom) return;
    await supabase.from("typing").upsert({
      user_id: user.id,
      username: username,
      room_id: activeRoom.id,
      typing_at: new Date().toISOString(),
    });
  }

  function handleRightClick(e, room) {
    e.preventDefault();
    setContextMenu({
      room,
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.min(e.clientY, window.innerHeight - 300),
    });
  }

  async function refreshRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setRooms(data);
  }

  function switchRoom(room) {
    setActiveRoom(room);
    setMessages([]);
    setLoading(true);
    setView("chat");
  }

  async function createRoom() {
    const name = newRoomName.trim().toLowerCase();
    if (!name) return;

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name: name,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setRooms((prev) => [...prev, data]);
      setActiveRoom(data);
      setNewRoomName("");
      setShowNewRoom(false);
      setView("chat");
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeRoom) return;
    setText("");

    const msgData = {
      content,
      username,
      user_id: user.id,
      room_id: activeRoom.id,
    };

    if (replyTo) {
      msgData.reply_to = replyTo.id;
      msgData.reply_to_content = replyTo.content.substring(0, 100);
      msgData.reply_to_username = replyTo.username;
      setReplyTo(null);
    }

    const { error } = await supabase.from("messages").insert(msgData);

    if (error) setText(content);

    // Clear typing
    await supabase.from("typing").delete().eq("user_id", user.id);
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function handleMessageRightClick(e, msg) {
    e.preventDefault();
    setMessageMenu({
      message: msg,
      x: e.clientX,
      y: e.clientY,
    });
  }

  async function refreshMessages() {
    if (!activeRoom) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", activeRoom.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  }

  function getDateDivider(msg, prevMsg) {
    const date = new Date(msg.created_at).toLocaleDateString();
    if (!prevMsg) return date;
    const prevDate = new Date(prevMsg.created_at).toLocaleDateString();
    return date !== prevDate ? date : null;
  }

  async function handleLogout() {
    await supabase
      .from("presence")
      .update({ status: "offline", last_seen: new Date().toISOString() })
      .eq("user_id", user.id);
    await supabase.auth.signOut();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        fontFamily: "Segoe UI, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── SIDEBAR ── */}
      {!isMobile && (
        <div
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
          <div style={{ marginBottom: "30px" }}>
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

          {/* Online Users */}
          <div
            style={{
              color: "#2a2a3a",
              fontSize: "10px",
              letterSpacing: "2px",
              marginBottom: "8px",
            }}
          >
            ONLINE — {onlineUsers.length}
          </div>

          <div
            style={{
              marginBottom: "16px",
              maxHeight: "80px",
              overflowY: "auto",
            }}
          >
            {onlineUsers.map((u) => (
              <div
                key={u.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  color: u.user_id === user.id ? "#9B30FF" : "#4a4a6a",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#00ff00",
                  }}
                />
                {u.username}
              </div>
            ))}
          </div>

          {/* Channels */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "10px",
                letterSpacing: "2px",
              }}
            >
              CHANNELS
            </div>
            <button
              onClick={() => setShowNewRoom(!showNewRoom)}
              style={{
                background: "transparent",
                border: "none",
                color: "#9B30FF",
                fontSize: "18px",
                cursor: "pointer",
                padding: "0 4px",
              }}
            >
              +
            </button>
          </div>

          {/* New Room Input */}
          {showNewRoom && (
            <div
              style={{
                display: "flex",
                gap: "4px",
                marginBottom: "8px",
              }}
            >
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                placeholder="room name"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  backgroundColor: "#0a0a15",
                  border: "1px solid #1a1a3a",
                  borderRadius: "4px",
                  color: "#ffffff",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
              <button
                onClick={createRoom}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "4px",
                  background: "#9B30FF",
                  color: "white",
                  fontSize: "10px",
                  cursor: "pointer",
                }}
              >
                ADD
              </button>
            </div>
          )}

          {/* Room List */}
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => switchRoom(room)}
              onContextMenu={(e) => handleRightClick(e, room)}
              style={{
                padding: "8px 14px",
                backgroundColor:
                  activeRoom?.id === room.id && view === "chat"
                    ? `${room.color || "#9B30FF"}15`
                    : "transparent",
                borderRadius: "6px",
                border: "1px solid",
                borderColor:
                  activeRoom?.id === room.id && view === "chat"
                    ? `${room.color || "#9B30FF"}40`
                    : "transparent",
                color:
                  activeRoom?.id === room.id && view === "chat"
                    ? room.color || "#9B30FF"
                    : "#2a2a3a",
                fontSize: "13px",
                letterSpacing: "1px",
                marginBottom: "2px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {room.icon || "#"} {room.name}
            </div>
          ))}

          {/* DMs */}
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
              padding: "8px 14px",
              backgroundColor:
                view === "dms" ? "rgba(0,191,255,0.1)" : "transparent",
              borderRadius: "6px",
              border: "1px solid",
              borderColor:
                view === "dms" ? "rgba(0,191,255,0.2)" : "transparent",
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
          <button
            onClick={handleLogout}
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
              marginTop: "20px",
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
          </button>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "#050508",
            borderBottom: "1px solid #0d0d1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "900",
              letterSpacing: "4px",
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
                backgroundColor: "#00ff00",
              }}
            />
            <span
              style={{
                color: "#9B30FF",
                fontSize: "12px",
                letterSpacing: "1px",
              }}
            >
              {username}
            </span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {view === "chat" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingBottom: isMobile ? "60px" : "0",
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
                # {activeRoom?.name || "loading"}
              </div>
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  marginTop: "2px",
                }}
              >
                ENCRYPTED CHANNEL
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
          </div>

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
              <div
                style={{
                  textAlign: "center",
                  color: "#2a2a3a",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  marginTop: "40px",
                }}
              >
                THIS CHANNEL IS SILENT.
                <br />
                <span style={{ fontSize: "11px" }}>
                  Be the first to transmit.
                </span>
              </div>
            )}

            {messages.map((msg, i) => {
              const isOwn = msg.user_id === user.id;
              const showName =
                i === 0 || messages[i - 1]?.user_id !== msg.user_id;
              const dateDivider = getDateDivider(msg, messages[i - 1]);

              return (
                <div key={msg.id}>
                  {/* Date Divider */}
                  {dateDivider && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        margin: "20px 0 12px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: "1px",
                          background: "#1a1a3a",
                        }}
                      />
                      <div
                        style={{
                          color: "#2a2a3a",
                          fontSize: "11px",
                          letterSpacing: "2px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dateDivider}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: "1px",
                          background: "#1a1a3a",
                        }}
                      />
                    </div>
                  )}

                  {/* Message */}
                  <div
                    key={msg.id}
                    onContextMenu={(e) => handleMessageRightClick(e, msg)}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        handleMessageRightClick(
                          {
                            preventDefault: () => {},
                            clientX: e.touches[0].clientX,
                            clientY: e.touches[0].clientY,
                          },
                          msg,
                        );
                      }, 500);

                      e.currentTarget.dataset.longpress = timer;
                    }}
                    onTouchEnd={(e) => {
                      clearTimeout(Number(e.currentTarget.dataset.longpress));
                    }}
                    onTouchMove={(e) => {
                      clearTimeout(Number(e.currentTarget.dataset.longpress));
                    }}
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
                          maxWidth: "300px",
                        }}
                      >
                        <div
                          style={{
                            color: "#9B30FF",
                            fontSize: "10px",
                          }}
                        >
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
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {typingUsers.length > 0 && (
            <div
              style={{
                padding: "4px 30px",
                color: "#4a4a6a",
                fontSize: "12px",
                fontStyle: "italic",
                letterSpacing: "0.5px",
              }}
            >
              {typingUsers.map((t) => t.username).join(", ")}
              {typingUsers.length === 1 ? " is" : " are"} typing...
            </div>
          )}

          {replyTo && (
            <div
              style={{
                padding: "10px 30px",
                backgroundColor: "#050508",
                borderTop: "1px solid #1a1a3a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ color: "#9B30FF", fontSize: "11px" }}>
                  Replying to {replyTo.username}
                </div>
                <div
                  style={{
                    color: "#4a4a6a",
                    fontSize: "12px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    maxWidth: "400px",
                  }}
                >
                  {replyTo.content}
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ff4444",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Input */}
          <div
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
                onChange={(e) => {
                  setText(e.target.value);
                  handleTyping();
                }}
                placeholder={`Transmit to #${activeRoom?.name || ""}...`}
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
          </div>
        </div>
      ) : (
        <DirectMessages currentUser={user} />
      )}

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav view={view} onNavigate={handleViewChange} notification={0} />
      )}

      {contextMenu && (
        <ContextMenu
          room={contextMenu.room}
          isOwner={contextMenu.room.created_by === user.id}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onRoomUpdated={refreshRooms}
          onRoomDeleted={(id) => {
            setRooms((prev) => prev.filter((r) => r.id !== id));
            if (activeRoom?.id === id) {
              setActiveRoom(rooms[0]);
            }
            setContextMenu(null);
          }}
        />
      )}

      {messageMenu && (
        <MessageMenu
          message={messageMenu.message}
          isOwn={messageMenu.message.user_id === user.id}
          position={{ x: messageMenu.x, y: messageMenu.y }}
          onClose={() => setMessageMenu(null)}
          onReply={(msg) => setReplyTo(msg)}
          onMessagesChanged={refreshMessages}
        />
      )}
    </div>
  );
}
