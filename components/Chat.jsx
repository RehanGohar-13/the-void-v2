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
import EmojiPicker from "./EmojiPicker";
import SettingsPage from "./SettingsPage";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("chat");

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const [contextMenu, setContextMenu] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [reactions, setReactions] = useState({});

  const [isMobile, setIsMobile] = useState(false);

  const bottomRef = useRef(null);
  const prevMessageCount = useRef(0);
  const messagesContainerRef = useRef(null);

  const username = user.user_metadata?.username || user.email;

  // ── Mobile detect ─────────────────────────────────────────
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Load rooms ────────────────────────────────────────────
  useEffect(() => {
    loadRooms();
  }, [user.id]);

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .or(`created_by.eq.${user.id},created_by.is.null,is_private.eq.false`)
      .order("created_at", { ascending: true });

    // Also load private rooms where user is a member
    const { data: memberRooms } = await supabase
      .from("channel_members")
      .select("room_id")
      .eq("user_id", user.id);

    let allRooms = data || [];

    if (memberRooms && memberRooms.length > 0) {
      const memberRoomIds = memberRooms.map((m) => m.room_id);
      const { data: privateRooms } = await supabase
        .from("rooms")
        .select("*")
        .in("id", memberRoomIds);

      if (privateRooms) {
        const existingIds = allRooms.map((r) => r.id);
        privateRooms.forEach((r) => {
          if (!existingIds.includes(r.id)) {
            allRooms.push(r);
          }
        });
      }
    }

    allRooms.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (data && data.length > 0) {
      setRooms(data);
      setActiveRoom((prev) => {
        if (prev) {
          const stillExists = data.find((r) => r.id === prev.id);
          if (stillExists) return stillExists;
        }
        return data[0];
      });
    } else {
      setRooms([]);
      setActiveRoom(null);
    }
  }

  async function refreshRooms() {
    await loadRooms();
  }

  // ── Presence ──────────────────────────────────────────────
  useEffect(() => {
    async function updatePresence() {
      await supabase.from("presence").upsert({
        user_id: user.id,
        username,
        status: "online",
        last_seen: new Date().toISOString(),
      });
    }

    updatePresence();
    const interval = setInterval(updatePresence, 30000);
    return () => clearInterval(interval);
  }, [user.id, username]);

  // ── Poll online users ─────────────────────────────────────
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

  // ── Poll messages for active room ─────────────────────────
  useEffect(() => {
    let interval;
    let mounted = true;

    async function loadMessages() {
      if (!activeRoom || view !== "chat") return;

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

    if (activeRoom && view === "chat") {
      loadMessages();
      interval = setInterval(loadMessages, 5000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeRoom, view]);

  // ── Poll reactions ────────────────────────────────────────
  useEffect(() => {
    loadReactions();
  }, [messages]);

  async function loadReactions() {
    if (!messages.length) {
      setReactions({});
      return;
    }

    const ids = messages.map((m) => m.id);
    const { data } = await supabase
      .from("reactions")
      .select("*")
      .in("message_id", ids);

    const grouped = {};
    (data || []).forEach((r) => {
      if (!grouped[r.message_id]) grouped[r.message_id] = [];
      grouped[r.message_id].push(r);
    });
    setReactions(grouped);
  }

  // ── Poll typing indicators ────────────────────────────────
  useEffect(() => {
    let interval;
    let mounted = true;

    async function checkTyping() {
      if (!activeRoom || view !== "chat") return;

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

  // ── Smart scroll ───────────────────────────────────────────
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (prevMessageCount.current === 0 && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      }, 80);
      prevMessageCount.current = messages.length;
      return;
    }

    if (messages.length > prevMessageCount.current) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;

      if (isNearBottom) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      }
    }

    prevMessageCount.current = messages.length;
  }, [messages]);

  // ── Helpers ────────────────────────────────────────────────
  function handleViewChange(newView) {
    if (newView === view) return;
    setView(newView);
  }

  function switchRoom(room) {
    setActiveRoom(room);
    setMessages([]);
    setLoading(true);
    setView("chat");
  }

  async function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name,
        created_by: user.id,
        is_private: newRoomPrivate,
      })
      .select()
      .single();

    if (!error && data) {
      setRooms((prev) => [...prev, data]);
      setActiveRoom(data);
      setNewRoomName("");
      setNewRoomPrivate(false);
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

    await supabase.from("typing").delete().eq("user_id", user.id);
  }

  async function handleTyping() {
    if (!activeRoom) return;
    await supabase.from("typing").upsert({
      user_id: user.id,
      username,
      room_id: activeRoom.id,
      typing_at: new Date().toISOString(),
    });
  }

  async function addReaction(messageId, emoji) {
    const existing = (reactions[messageId] || []).find(
      (r) => r.user_id === user.id && r.emoji === emoji,
    );

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({
        message_id: messageId,
        user_id: user.id,
        username,
        emoji,
      });
    }

    await loadReactions();
  }

  async function handleFileUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      "image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar,.7z,.py,.js,.html,.css,.json,.xml,.md,.rtf";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !activeRoom) return;

      if (file.size > 50 * 1024 * 1024) {
        alert("File too large. Maximum 50MB.");
        return;
      }

      // Generate unique filename
      const ext = file.name.split(".").pop();
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(uniqueName, file);

      if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(uniqueName);

      // Send message with file
      await supabase.from("messages").insert({
        content: `📎 ${file.name}`,
        username,
        user_id: user.id,
        room_id: activeRoom.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
      });
    };

    input.click();
  }

  function handleRightClick(e, room) {
    e.preventDefault();
    setContextMenu({
      room,
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.min(e.clientY, window.innerHeight - 320),
    });
  }

  function handleMessageRightClick(e, msg) {
    e.preventDefault();
    setMessageMenu({
      message: msg,
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 320),
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

  async function handleLogout() {
    await supabase
      .from("presence")
      .update({
        status: "offline",
        last_seen: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await supabase.auth.signOut();
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function getDateDivider(msg, prevMsg) {
    const date = new Date(msg.created_at).toLocaleDateString();
    if (!prevMsg) return date;
    const prevDate = new Date(prevMsg.created_at).toLocaleDateString();
    return date !== prevDate ? date : null;
  }

  function groupReactionData(msgId) {
    const raw = reactions[msgId] || [];
    return Object.entries(
      raw.reduce((acc, r) => {
        acc[r.emoji] = acc[r.emoji] || {
          count: 0,
          users: [],
          hasOwn: false,
        };
        acc[r.emoji].count++;
        acc[r.emoji].users.push(r.username);
        if (r.user_id === user.id) acc[r.emoji].hasOwn = true;
        return acc;
      }, {}),
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        fontFamily: "Segoe UI, Arial, sans-serif",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      {/* ══ DESKTOP SIDEBAR ══ */}
      {!isMobile && (
        <div
          style={{
            width: "220px",
            minWidth: "220px",
            backgroundColor: "#050508",
            borderRight: "1px solid #0d0d1a",
            display: "flex",
            flexDirection: "column",
            padding: "30px 20px",
            position: "relative",
            height: "100vh",
            overflowY: "auto",
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

          <div style={{ marginBottom: "30px" }}>
            <div
              style={{
                fontFamily: "'Mephisto', sans-serif",
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

          {showNewRoom && (
            <div style={{ marginBottom: "8px", paddingRight: "4px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginBottom: "6px",
                  alignItems: "center",
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
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={createRoom}
                  style={{
                    width: "28px",
                    height: "28px",
                    border: "none",
                    borderRadius: "4px",
                    background: "#9B30FF",
                    color: "white",
                    fontSize: "16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => setNewRoomPrivate(false)}
                  style={{
                    flex: 1,
                    padding: "4px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    cursor: "pointer",
                    letterSpacing: "1px",
                    border: "1px solid",
                    borderColor: !newRoomPrivate ? "#00ff00" : "#1a1a3a",
                    backgroundColor: !newRoomPrivate
                      ? "rgba(0,255,0,0.1)"
                      : "transparent",
                    color: !newRoomPrivate ? "#00ff00" : "#2a2a3a",
                  }}
                >
                  🌐 PUBLIC
                </button>
                <button
                  onClick={() => setNewRoomPrivate(true)}
                  style={{
                    flex: 1,
                    padding: "4px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    cursor: "pointer",
                    letterSpacing: "1px",
                    border: "1px solid",
                    borderColor: newRoomPrivate ? "#ff8c00" : "#1a1a3a",
                    backgroundColor: newRoomPrivate
                      ? "rgba(255,140,0,0.1)"
                      : "transparent",
                    color: newRoomPrivate ? "#ff8c00" : "#2a2a3a",
                  }}
                >
                  🔒 PRIVATE
                </button>
              </div>
            </div>
          )}

          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => switchRoom(room)}
              onContextMenu={(e) => handleRightClick(e, room)}
              onTouchStart={(e) => {
                const timer = setTimeout(() => {
                  handleRightClick(
                    {
                      preventDefault: () => {},
                      clientX: e.touches[0].clientX,
                      clientY: e.touches[0].clientY,
                    },
                    room,
                  );
                }, 500);
                e.currentTarget.dataset.longpress = timer;
              }}
              onTouchEnd={(e) =>
                clearTimeout(Number(e.currentTarget.dataset.longpress))
              }
              onTouchMove={(e) =>
                clearTimeout(Number(e.currentTarget.dataset.longpress))
              }
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
              {room.is_private ? "🔒" : "#"} {room.name}
            </div>
          ))}

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
            }}
          >
            @ messages
          </div>

          <button
            onClick={() => handleViewChange("settings")}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor:
                view === "settings" ? "rgba(155,48,255,0.1)" : "transparent",
              border: "1px solid",
              borderColor:
                view === "settings" ? "rgba(155,48,255,0.2)" : "#1a1a3a",
              borderRadius: "8px",
              color: view === "settings" ? "#9B30FF" : "#2a2a3a",
              fontSize: "12px",
              letterSpacing: "2px",
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            ⚙ SETTINGS
          </button>

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
              marginTop: "20px",
              width: "100%",
            }}
          >
            DISCONNECT
          </button>
        </div>
      )}

      {/* ══ MOBILE HEADER ══ */}
      {isMobile && (
        <div style={{ flexShrink: 0, width: "100%" }}>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#050508",
              borderBottom: "1px solid #0d0d1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontFamily: "'Mephisto', sans-serif",
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

          {view === "chat" && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#020205",
                borderBottom: "1px solid #0d0d1a",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                overflowX: "auto",
              }}
            >
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => switchRoom(room)}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => {
                      handleRightClick(
                        {
                          preventDefault: () => {},
                          clientX: e.touches[0].clientX,
                          clientY: e.touches[0].clientY,
                        },
                        room,
                      );
                    }, 500);
                    e.currentTarget.dataset.longpress = timer;
                  }}
                  onTouchEnd={(e) =>
                    clearTimeout(Number(e.currentTarget.dataset.longpress))
                  }
                  onTouchMove={(e) =>
                    clearTimeout(Number(e.currentTarget.dataset.longpress))
                  }
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor:
                      activeRoom?.id === room.id
                        ? room.color || "#9B30FF"
                        : "#1a1a3a",
                    backgroundColor:
                      activeRoom?.id === room.id
                        ? `${room.color || "#9B30FF"}20`
                        : "transparent",
                    color:
                      activeRoom?.id === room.id
                        ? room.color || "#9B30FF"
                        : "#4a4a6a",
                    fontSize: "12px",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {room.is_private ? "🔒" : "#"} {room.name}
                </button>
              ))}

              <button
                onClick={() => setShowNewRoom(!showNewRoom)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid #1a1a3a",
                  backgroundColor: "transparent",
                  color: "#9B30FF",
                  fontSize: "16px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                +
              </button>
            </div>
          )}

          {view === "chat" && showNewRoom && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#020205",
                borderBottom: "1px solid #0d0d1a",
              }}
            >
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                <input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createRoom()}
                  placeholder="Channel name..."
                  style={{
                    flex: 1,
                    padding: "8px 14px",
                    backgroundColor: "#0a0a15",
                    border: "1px solid #1a1a3a",
                    borderRadius: "20px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={createRoom}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "20px",
                    background: "#9B30FF",
                    color: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ADD
                </button>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setNewRoomPrivate(false)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: !newRoomPrivate ? "#00ff00" : "#1a1a3a",
                    backgroundColor: !newRoomPrivate
                      ? "rgba(0,255,0,0.1)"
                      : "transparent",
                    color: !newRoomPrivate ? "#00ff00" : "#2a2a3a",
                  }}
                >
                  🌐 PUBLIC
                </button>
                <button
                  onClick={() => setNewRoomPrivate(true)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: newRoomPrivate ? "#ff8c00" : "#1a1a3a",
                    backgroundColor: newRoomPrivate
                      ? "rgba(255,140,0,0.1)"
                      : "transparent",
                    color: newRoomPrivate ? "#ff8c00" : "#2a2a3a",
                  }}
                >
                  🔒 PRIVATE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MAIN CONTENT ══ */}
      {view === "chat" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: isMobile ? "100vh" : "100vh",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: isMobile ? "12px 16px" : "20px 30px",
              borderBottom: "1px solid #0d0d1a",
              backgroundColor: "#020205",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: isMobile ? "14px" : "16px",
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
                {activeRoom?.description || "ENCRYPTED CHANNEL"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "12px 12px 140px 12px" : "20px 30px",
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

                  <div
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
                          maxWidth: isMobile ? "260px" : "460px",
                          padding: "10px 16px",
                          borderRadius: isOwn
                            ? "16px 4px 16px 16px"
                            : "4px 16px 16px 16px",
                          background: isOwn
                            ? "linear-gradient(135deg, #4B0082, #9B30FF)"
                            : "#0a0a15",
                          border: isOwn ? "none" : "1px solid #1a1a3a",
                          color: "#ffffff",
                          fontSize: isMobile ? "13px" : "14px",
                          lineHeight: "1.5",
                          boxShadow: isOwn
                            ? "0 4px 20px rgba(155,48,255,0.2)"
                            : "none",
                          wordBreak: "break-word",
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

                    {reactions[msg.id] && reactions[msg.id].length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          marginTop: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        {groupReactionData(msg.id).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
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
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#8a8aaa",
                              }}
                            >
                              {data.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.file_url && (
                      <div
                        style={{
                          marginTop: "6px",
                          maxWidth: isMobile ? "260px" : "460px",
                        }}
                      >
                        {msg.file_type?.startsWith("image/") ? (
                          <img
                            src={msg.file_url}
                            alt={msg.file_name}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "300px",
                              borderRadius: "8px",
                              border: "1px solid #1a1a3a",
                              cursor: "pointer",
                            }}
                            onClick={() => window.open(msg.file_url, "_blank")}
                          />
                        ) : (
                          <a
                            href={msg.file_url}
                            download={msg.file_name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "10px 16px",
                              backgroundColor: "#0a0a15",
                              border: "1px solid #1a1a3a",
                              borderRadius: "8px",
                              color: "#9B30FF",
                              fontSize: "13px",
                              textDecoration: "none",
                            }}
                          >
                            📎 {msg.file_name}
                          </a>
                        )}
                      </div>
                    )}
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
                flexShrink: 0,
              }}
            >
              {typingUsers.map((t) => t.username).join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing...
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
                flexShrink: 0,
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

          <div
            style={{
              padding: isMobile ? "10px 12px" : "20px 30px",
              borderTop: "1px solid #0d0d1a",
              backgroundColor: "#020205",
              flexShrink: 0,
              position: isMobile ? "fixed" : "relative",
              bottom: isMobile ? "56px" : "auto",
              left: isMobile ? 0 : "auto",
              right: isMobile ? 0 : "auto",
              zIndex: isMobile ? 50 : "auto",
            }}
          >
            <form
              onSubmit={sendMessage}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
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
                  padding: isMobile ? "12px 14px" : "14px 20px",
                  backgroundColor: "#0a0a15",
                  border: "1px solid #1a1a3a",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: isMobile ? "13px" : "14px",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={handleFileUpload}
                style={{
                  padding: isMobile ? "12px" : "14px 16px",
                  border: "1px solid #1a1a3a",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "#9B30FF",
                  fontSize: "18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                📎
              </button>

              <button
                type="submit"
                style={{
                  padding: isMobile ? "12px 16px" : "14px 28px",
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
                {isMobile ? "→" : "TRANSMIT"}
              </button>
            </form>
          </div>
        </div>
      ) : view === "dms" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            height: isMobile ? "100vh" : "100vh",
            overflow: "hidden",
            paddingBottom: isMobile ? "56px" : "0",
          }}
        >
          <DirectMessages currentUser={user} />
        </div>
      ) : view === "online" ? (
        <OnlinePanel onlineUsers={onlineUsers} currentUserId={user.id} />
      ) : view === "settings" ? (
        isMobile ? (
          <MobileSettings user={user} />
        ) : (
          <SettingsPage user={user} onClose={() => handleViewChange("chat")} />
        )
      ) : null}

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
              const remaining = rooms.filter((r) => r.id !== id);
              setActiveRoom(remaining[0] || null);
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
          onReact={(msg) => setShowEmojiPicker(msg)}
          onMessagesChanged={refreshMessages}
        />
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(emoji) => {
            addReaction(showEmojiPicker.id, emoji);
            setShowEmojiPicker(null);
          }}
          onClose={() => setShowEmojiPicker(null)}
        />
      )}
    </div>
  );
}
