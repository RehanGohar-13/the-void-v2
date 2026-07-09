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
import SettingsPage from "./SettingsPage";
import EmojiPicker from "./EmojiPicker";
import FilePreview from "./FilePreview";
import FileUploadPreview from "./FileUploadPreview";
import MessageBubble from "./MessageBubble";
import DateDivider from "./DateDivider";
import SearchMessages from "./SearchMessages";
import PinnedMessages from "./PinnedMessages";
import {
  Settings,
  LogOut,
  Plus,
  Hash,
  Lock,
  MessageCircle,
  Paperclip,
  Send,
  Search as SearchIcon,
  Pin,
} from "lucide-react";

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
  const [pendingFile, setPendingFile] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const bottomRef = useRef(null);
  const prevMessageCount = useRef(0);
  const messagesContainerRef = useRef(null);
  const dmRef = useRef(null); // ← ref to DirectMessages reset fn
  const username = user.user_metadata?.username || user.email;

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadRooms();
  }, [user.id]);

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .or(`created_by.eq.${user.id},created_by.is.null,is_private.eq.false`)
      .order("created_at", { ascending: true });
    const { data: memberRooms } = await supabase
      .from("channel_members")
      .select("room_id")
      .eq("user_id", user.id);
    let allRooms = data || [];
    if (memberRooms && memberRooms.length > 0) {
      const ids = memberRooms.map((m) => m.room_id);
      const { data: privateRooms } = await supabase
        .from("rooms")
        .select("*")
        .in("id", ids);
      if (privateRooms) {
        const existingIds = allRooms.map((r) => r.id);
        privateRooms.forEach((r) => {
          if (!existingIds.includes(r.id)) allRooms.push(r);
        });
      }
    }
    allRooms.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (allRooms.length > 0) {
      setRooms(allRooms);
      setActiveRoom((prev) => {
        if (prev) {
          const s = allRooms.find((r) => r.id === prev.id);
          if (s) return s;
        }
        return allRooms[0];
      });
    } else {
      setRooms([]);
      setActiveRoom(null);
    }
  }

  async function refreshRooms() {
    await loadRooms();
  }

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
    const i = setInterval(updatePresence, 30000);
    return () => clearInterval(i);
  }, [user.id, username]);

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
    const i = setInterval(loadOnline, 10000);
    return () => {
      mounted = false;
      clearInterval(i);
    };
  }, []);

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

  useEffect(() => {
    if (!messages.length) {
      setReactions({});
      return;
    }
    async function lr() {
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
    lr();
  }, [messages]);

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
      const near =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;
      if (near)
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  // Track read status
  useEffect(() => {
    async function trackRead() {
      if (!activeRoom || view !== "chat" || !user?.id) return;

      const now = new Date().toISOString();

      await supabase.from("last_read").upsert(
        {
          user_id: user.id,
          room_id: activeRoom.id,
          read_at: now,
        },
        {
          onConflict: "user_id,room_id",
        },
      );

      // Clear unread badge immediately for the room you are reading
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[activeRoom.id];
        return next;
      });
    }

    trackRead();
  }, [activeRoom?.id, view, messages.length, user?.id]);

  useEffect(() => {
    if (!rooms.length || !user?.id) return;
    let alive = true;
    async function loadUnread() {
      const counts = {};
      for (const room of rooms) {
        const { data: lrRows } = await supabase
          .from("last_read")
          .select("read_at")
          .eq("user_id", user.id)
          .eq("room_id", room.id)
          .order("read_at", { ascending: false })
          .limit(1);
        const readAt = lrRows?.[0]?.read_at || "1970-01-01T00:00:00.000Z";
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id)
          .neq("user_id", user.id)
          .gt("created_at", readAt);
        if (count > 0) counts[room.id] = count;
      }
      if (!alive) return;
      if (view === "chat" && activeRoom?.id) {
        delete counts[activeRoom.id];
      }
      setUnreadCounts(counts);
    }
    loadUnread();
    const i = setInterval(loadUnread, 5000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [rooms, user?.id, view, activeRoom?.id]);

  // ── View switching — resets ALL overlays ────────────
  function handleViewChange(v) {
    if (v === view) return;
    // Reset Chat.jsx overlays
    setShowSearch(false);
    setShowPinned(false);
    setMessageMenu(null);
    setContextMenu(null);
    setShowEmojiPicker(null);
    setReplyTo(null);
    setPendingFile(null);
    // Reset DirectMessages overlays via ref
    if (dmRef.current?.reset) {
      dmRef.current.reset();
    }
    setView(v);
  }

  function switchRoom(room) {
    setActiveRoom(room);
    setMessages([]);
    setLoading(true);
    setShowSearch(false);
    setShowPinned(false);
    setMessageMenu(null);
    setShowEmojiPicker(null);
    setReplyTo(null);
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
  }

  async function handleFileUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      "image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar,.7z,.py,.js,.html,.css,.json,.xml,.md,.rtf";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        alert("File too large. Maximum 25MB.");
        return;
      }
      setPendingFile(file);
    };
    input.click();
  }

  async function confirmFileUpload(file, caption) {
    if (!file || !activeRoom) return;
    setPendingFile(null);
    const ext = file.name.split(".").pop();
    const uniqueName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(uniqueName, file);
    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("attachments")
      .getPublicUrl(uniqueName);
    await supabase.from("messages").insert({
      content: caption || "",
      username,
      user_id: user.id,
      room_id: activeRoom.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
    });
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

  function formatTime(ts) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  function getDateDivider(msg, prev) {
    const d = new Date(msg.created_at).toLocaleDateString();
    if (!prev) return d;
    return d !== new Date(prev.created_at).toLocaleDateString() ? d : null;
  }

  function groupReactionData(msgId) {
    return Object.entries(
      (reactions[msgId] || []).reduce((acc, r) => {
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

  const pinnedCount = messages.filter((m) => m.pinned).length;

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
      {/* ── Desktop Sidebar ── */}
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
                cursor: "pointer",
                padding: "0 4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Plus size={16} />
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
                  <Plus size={14} />
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
                  PUBLIC
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
                  PRIVATE
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
                const t = setTimeout(() => {
                  handleRightClick(
                    {
                      preventDefault: () => {},
                      clientX: e.touches[0].clientX,
                      clientY: e.touches[0].clientY,
                    },
                    room,
                  );
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
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid",
                backgroundColor:
                  activeRoom?.id === room.id && view === "chat"
                    ? `${room.color || "#9B30FF"}15`
                    : "transparent",
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {room.is_private ? <Lock size={11} /> : <Hash size={11} />}
                {room.name}
              </span>
              {unreadCounts[room.id] > 0 && activeRoom?.id !== room.id && (
                <span
                  style={{
                    backgroundColor: "#9B30FF",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {unreadCounts[room.id] > 99 ? "99+" : unreadCounts[room.id]}
                </span>
              )}
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
              borderRadius: "6px",
              border: "1px solid",
              backgroundColor:
                view === "dms" ? "rgba(0,191,255,0.1)" : "transparent",
              borderColor:
                view === "dms" ? "rgba(0,191,255,0.2)" : "transparent",
              color: view === "dms" ? "#00BFFF" : "#2a2a3a",
              fontSize: "13px",
              letterSpacing: "1px",
              marginBottom: "auto",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <MessageCircle size={13} /> messages
          </div>

          <button
            onClick={() => handleViewChange("settings")}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid",
              backgroundColor:
                view === "settings" ? "rgba(155,48,255,0.1)" : "transparent",
              borderColor:
                view === "settings" ? "rgba(155,48,255,0.2)" : "#1a1a3a",
              borderRadius: "8px",
              color: view === "settings" ? "#9B30FF" : "#2a2a3a",
              fontSize: "12px",
              letterSpacing: "2px",
              cursor: "pointer",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Settings size={14} /> SETTINGS
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
              marginTop: "12px",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <LogOut size={14} /> DISCONNECT
          </button>
        </div>
      )}

      {/* ── Mobile Header ── */}
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
                    const t = setTimeout(() => {
                      handleRightClick(
                        {
                          preventDefault: () => {},
                          clientX: e.touches[0].clientX,
                          clientY: e.touches[0].clientY,
                        },
                        room,
                      );
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
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    position: "relative",
                  }}
                >
                  {room.is_private ? <Lock size={10} /> : <Hash size={10} />}{" "}
                  {room.name}
                  {unreadCounts[room.id] > 0 && activeRoom?.id !== room.id && (
                    <span
                      style={{
                        backgroundColor: "#9B30FF",
                        color: "white",
                        fontSize: "9px",
                        fontWeight: "700",
                        padding: "1px 5px",
                        borderRadius: "8px",
                        marginLeft: "4px",
                      }}
                    >
                      {unreadCounts[room.id] > 99
                        ? "99+"
                        : unreadCounts[room.id]}
                    </span>
                  )}
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
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Plus size={16} />
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
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
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
                  PUBLIC
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
                  PRIVATE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Content ── */}
      {view === "chat" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* Channel header */}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {activeRoom?.is_private ? (
                  <Lock size={14} />
                ) : (
                  <Hash size={14} />
                )}{" "}
                {activeRoom?.name || "loading"}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {pinnedCount > 0 && (
                <button
                  onClick={() => setShowPinned(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#FFD700",
                    fontSize: "11px",
                    letterSpacing: "1px",
                  }}
                >
                  <Pin size={12} /> {pinnedCount}
                </button>
              )}
              <button
                onClick={() => setShowSearch(true)}
                style={{
                  background: "transparent",
                  border: "1px solid #1a1a3a",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#4a4a6a",
                  fontSize: "11px",
                  letterSpacing: "1px",
                }}
              >
                <SearchIcon size={12} /> SEARCH
              </button>
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
          </div>

          {/* Messages */}
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
              const dd = getDateDivider(msg, messages[i - 1]);
              return (
                <div key={msg.id}>
                  <DateDivider date={dd} />
                  <MessageBubble
                    msg={msg}
                    isOwn={isOwn}
                    showName={showName}
                    isMobile={isMobile}
                    reactions={reactions[msg.id] || []}
                    onReaction={addReaction}
                    onContextMenu={(e) => handleMessageRightClick(e, msg)}
                    formatTime={formatTime}
                    groupReactionData={groupReactionData(msg.id)}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Typing */}
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

          {/* Reply bar */}
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

          {/* Input */}
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
              style={{
                display: "flex",
                gap: "8px",
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
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Paperclip size={18} />
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isMobile ? <Send size={16} /> : "TRANSMIT"}
              </button>
            </form>
          </div>
        </div>
      ) : view === "dms" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            height: "100vh",
            overflow: "hidden",
            paddingBottom: isMobile ? "56px" : "0",
          }}
        >
          {/* ── Key change: pass dmRef so Chat can reset DM state ── */}
          <DirectMessages currentUser={user} ref={dmRef} />
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

      {/* ── Mobile Nav ── */}
      {isMobile && (
        <MobileNav view={view} onNavigate={handleViewChange} notification={0} />
      )}

      {/* ── File Upload ── */}
      {pendingFile && (
        <FileUploadPreview
          file={pendingFile}
          onSend={confirmFileUpload}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {/* ── Search Modal — only when in chat view ── */}
      {showSearch && activeRoom && view === "chat" && (
        <SearchMessages
          roomId={activeRoom.id}
          tableName="messages"
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* ── Pinned Modal — only when in chat view ── */}
      {showPinned && activeRoom && view === "chat" && (
        <PinnedMessages
          roomId={activeRoom.id}
          tableName="messages"
          currentUser={user}
          onClose={() => setShowPinned(false)}
        />
      )}

      {/* ── Context Menu ── */}
      {contextMenu && (
        <ContextMenu
          room={contextMenu.room}
          isOwner={contextMenu.room.created_by === user.id}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onRoomUpdated={refreshRooms}
          onRoomDeleted={(id) => {
            setRooms((p) => p.filter((r) => r.id !== id));
            if (activeRoom?.id === id) {
              const rem = rooms.filter((r) => r.id !== id);
              setActiveRoom(rem[0] || null);
            }
            setContextMenu(null);
          }}
        />
      )}

      {/* ── Message Menu ── */}
      {messageMenu && view === "chat" && (
        <MessageMenu
          message={messageMenu.message}
          isOwn={messageMenu.message.user_id === user.id}
          position={{ x: messageMenu.x, y: messageMenu.y }}
          onClose={() => setMessageMenu(null)}
          onReply={(msg) => setReplyTo(msg)}
          onReact={(msg) => setShowEmojiPicker(msg)}
          onMessagesChanged={refreshMessages}
          currentUsername={username}
        />
      )}

      {/* ── Emoji Picker ── */}
      {showEmojiPicker && view === "chat" && (
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
