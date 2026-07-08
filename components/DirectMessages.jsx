"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import {
  Reply,
  Smile,
  Copy,
  Pencil,
  Trash2,
  Paperclip,
  Send,
  ArrowLeft,
  Search as SearchIcon,
  UserPlus,
  UserCheck,
  UserX,
  Ban,
  Pin,
  Search,
} from "lucide-react";
import FilePreview from "./FilePreview";
import FileUploadPreview from "./FileUploadPreview";
import MessageBubble from "./MessageBubble";
import DateDivider from "./DateDivider";
import SearchMessages from "./SearchMessages";
import PinnedMessages from "./PinnedMessages";
import EmojiPicker from "./EmojiPicker";

export default function DirectMessages({ currentUser }) {
  const [tab, setTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [notification, setNotification] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [reactions, setReactions] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);

  // ── Sprint 5 new states ──────────────────────────────
  const [showDMSearch, setShowDMSearch] = useState(false);
  const [showDMPinned, setShowDMPinned] = useState(false);
  const [dmUnreadCounts, setDmUnreadCounts] = useState({});
  // ────────────────────────────────────────────────────

  const bottomRef = useRef(null);
  const prevMsgCount = useRef(0);
  const msgContainerRef = useRef(null);
  const username = currentUser.user_metadata?.username || currentUser.email;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ── Load friends & requests ──────────────────────────
  useEffect(() => {
    let mounted = true;
    let interval;
    async function load() {
      const { data: accepted } = await supabase
        .from("friendships")
        .select("*")
        .or(`from_user.eq.${currentUser.id},to_user.eq.${currentUser.id}`)
        .eq("status", "accepted");
      const { data: pending } = await supabase
        .from("friendships")
        .select("*")
        .eq("to_user", currentUser.id)
        .eq("status", "pending");
      if (!mounted) return;
      setFriends(accepted || []);
      setRequests(pending || []);
      setNotification((pending || []).length);
    }
    load();
    interval = setInterval(() => {
      if (mounted && !activeChat) load();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentUser.id, activeChat]);

  // ── Load DM messages ─────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let interval;
    async function loadDMs() {
      if (!activeChat) return;
      const fid =
        activeChat.from_user === currentUser.id
          ? activeChat.to_user
          : activeChat.from_user;
      const rid = getRoomId(currentUser.id, fid);
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("room_id", rid)
        .order("created_at", { ascending: true })
        .limit(100);
      if (mounted) setMessages(data || []);
    }
    if (activeChat) {
      loadDMs();
      interval = setInterval(loadDMs, 3000);
    }
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeChat, currentUser.id]);

  // ── Load reactions ───────────────────────────────────
  useEffect(() => {
    if (!messages.length) return;
    async function lr() {
      const ids = messages.map((m) => m.id);
      const { data } = await supabase
        .from("reactions")
        .select("*")
        .in("message_id", ids);
      const g = {};
      (data || []).forEach((r) => {
        if (!g[r.message_id]) g[r.message_id] = [];
        g[r.message_id].push(r);
      });
      setReactions(g);
    }
    lr();
  }, [messages]);

  // ── Typing indicator ─────────────────────────────────
  useEffect(() => {
    let interval;
    let mounted = true;
    async function check() {
      if (!activeChat) return;
      const fid =
        activeChat.from_user === currentUser.id
          ? activeChat.to_user
          : activeChat.from_user;
      const rid = getRoomId(currentUser.id, fid);
      const cutoff = new Date(Date.now() - 3000).toISOString();
      const { data } = await supabase
        .from("typing")
        .select("*")
        .eq("room_id", rid)
        .gte("typing_at", cutoff)
        .neq("user_id", currentUser.id);
      if (mounted) setTypingUsers(data || []);
    }
    if (activeChat) {
      check();
      interval = setInterval(check, 2000);
    }
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeChat, currentUser.id]);

  // ── Auto scroll ──────────────────────────────────────
  useEffect(() => {
    const c = msgContainerRef.current;
    if (!c) return;
    if (prevMsgCount.current === 0 && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      }, 80);
      prevMsgCount.current = messages.length;
      return;
    }
    if (messages.length > prevMsgCount.current) {
      const near = c.scrollHeight - c.scrollTop - c.clientHeight < 150;
      if (near)
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  // ── Unread counts ──────────────────────────
  useEffect(() => {
    if (activeChat) return; // Don't track when inside a chat
    async function loadUnread() {
      if (!friends.length) return;
      const counts = {};
      for (const f of friends) {
        const fid = f.from_user === currentUser.id ? f.to_user : f.from_user;
        const rid = getRoomId(currentUser.id, fid);

        // Get last read time for this DM room
        const { data: lr } = await supabase
          .from("last_read")
          .select("read_at")
          .eq("user_id", currentUser.id)
          .eq("room_id", rid)
          .single();

        // Count messages after last read
        let query = supabase
          .from("direct_messages")
          .select("id", { count: "exact" })
          .eq("room_id", rid)
          .neq("user_id", currentUser.id);

        if (lr?.read_at) {
          query = query.gt("created_at", lr.read_at);
        }

        const { count } = await query;
        if (count > 0) counts[f.id] = count;
      }
      setDmUnreadCounts(counts);
    }
    loadUnread();
  }, [friends, activeChat, currentUser.id]);

  // ── Mark as read when opening DM ──────────
  useEffect(() => {
    if (!activeChat) return;
    const fid =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    const rid = getRoomId(currentUser.id, fid);
    supabase.from("last_read").upsert({
      user_id: currentUser.id,
      room_id: rid,
      read_at: new Date().toISOString(),
    });
    // Clear badge immediately
    setDmUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[activeChat.id];
      return next;
    });
  }, [activeChat, currentUser.id]);

  // ── Helpers ──────────────────────────────────────────
  function getRoomId(a, b) {
    return [a, b].sort().join("_");
  }
  function getFriendName(f) {
    return f.from_user === currentUser.id ? f.to_username : f.from_username;
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
  function groupReactionData(mid) {
    return Object.entries(
      (reactions[mid] || []).reduce((a, r) => {
        a[r.emoji] = a[r.emoji] || { count: 0, users: [], hasOwn: false };
        a[r.emoji].count++;
        a[r.emoji].users.push(r.username);
        if (r.user_id === currentUser.id) a[r.emoji].hasOwn = true;
        return a;
      }, {}),
    );
  }

  // ── Friend / request actions ─────────────────────────
  async function searchUser() {
    setSearchError("");
    setSearchResult(null);
    if (!searchQuery.trim()) return;
    if (searchQuery.trim() === username) {
      setSearchError("You cannot add yourself.");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", searchQuery.trim())
      .single();
    if (!data) {
      setSearchError("No user found.");
      return;
    }
    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .or(
        `and(from_user.eq.${currentUser.id},to_user.eq.${data.id}),and(from_user.eq.${data.id},to_user.eq.${currentUser.id})`,
      )
      .single();
    if (existing) {
      if (existing.status === "accepted") setSearchError("Already friends.");
      else if (existing.status === "pending")
        setSearchError("Request pending.");
      else if (existing.status === "blocked") setSearchError("Cannot send.");
      return;
    }
    setSearchResult(data);
  }
  async function sendRequest(toUser) {
    const { error } = await supabase.from("friendships").insert({
      from_user: currentUser.id,
      to_user: toUser.id,
      from_username: username,
      to_username: toUser.username,
      status: "pending",
    });
    if (!error) {
      setSearchResult(null);
      setSearchQuery("");
      setSearchError("Request sent!");
    }
  }
  async function acceptRequest(id) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id);
  }
  async function declineRequest(id) {
    await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", id);
  }
  async function blockUser(id) {
    await supabase
      .from("friendships")
      .update({ status: "blocked" })
      .eq("id", id);
  }

  // ── Message actions ──────────────────────────────────
  async function sendDM(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeChat) return;
    setText("");
    const fid =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    const rid = getRoomId(currentUser.id, fid);
    const msgData = {
      content,
      username,
      user_id: currentUser.id,
      room_id: rid,
    };
    if (replyTo) {
      msgData.reply_to = replyTo.id;
      msgData.reply_to_content = replyTo.content.substring(0, 100);
      msgData.reply_to_username = replyTo.username;
      setReplyTo(null);
    }
    await supabase.from("direct_messages").insert(msgData);
    await supabase.from("typing").delete().eq("user_id", currentUser.id);
  }
  async function handleDMTyping() {
    if (!activeChat) return;
    const fid =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    await supabase.from("typing").upsert({
      user_id: currentUser.id,
      username,
      room_id: getRoomId(currentUser.id, fid),
      typing_at: new Date().toISOString(),
    });
  }
  async function addDMReaction(mid, emoji) {
    const existing = (reactions[mid] || []).find(
      (r) => r.user_id === currentUser.id && r.emoji === emoji,
    );
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("reactions")
        .insert({ message_id: mid, user_id: currentUser.id, username, emoji });
    }
  }
  async function handleDMFileUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      "image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.zip,.rar,.7z,.py,.js,.html,.css,.json,.xml,.md,.rtf";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        alert("Max 25MB.");
        return;
      }
      setPendingFile(file);
    };
    input.click();
  }
  async function confirmDMFileUpload(file, caption) {
    if (!file || !activeChat) return;
    setPendingFile(null);
    const ext = file.name.split(".").pop();
    const un = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const { error: ue } = await supabase.storage
      .from("attachments")
      .upload(un, file);
    if (ue) {
      alert("Upload failed.");
      return;
    }
    const { data: ud } = supabase.storage.from("attachments").getPublicUrl(un);
    const fid =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    await supabase.from("direct_messages").insert({
      content: caption || "",
      username,
      user_id: currentUser.id,
      room_id: getRoomId(currentUser.id, fid),
      file_url: ud.publicUrl,
      file_name: file.name,
      file_type: file.type,
    });
  }
  async function editDMMessage(msg, nc) {
    await supabase
      .from("direct_messages")
      .update({ content: nc, edited: true })
      .eq("id", msg.id);
  }
  async function deleteDMMessage(id) {
    await supabase.from("direct_messages").delete().eq("id", id);
  }

  // ── Pin action ─────────────────────────────
  async function pinDMMessage(msg) {
    const isPinned = msg.pinned;
    await supabase
      .from("direct_messages")
      .update({
        pinned: !isPinned,
        pinned_by: !isPinned ? username : null,
      })
      .eq("id", msg.id);
  }

  function handleDMMessageMenu(e, msg) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    setMessageMenu({
      message: msg,
      x: Math.min(e.clientX || 0, window.innerWidth - 240),
      y: Math.min(e.clientY || 0, window.innerHeight - 320),
    });
  }

  // ── Active DM chat view ──────────────────────────────
  if (activeChat) {
    const fn = getFriendName(activeChat);
    const fid =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    const rid = getRoomId(currentUser.id, fid);

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          maxHeight: "100%",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: isMobile ? "12px 16px" : "20px 30px",
            borderBottom: "1px solid #0d0d1a",
            backgroundColor: "#020205",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              setActiveChat(null);
              setMessages([]);
              setShowDMSearch(false);
              setShowDMPinned(false);
              prevMsgCount.current = 0;
            }}
            style={{
              background: "transparent",
              border: "1px solid #1a1a3a",
              borderRadius: "6px",
              color: "#9B30FF",
              padding: "6px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
            }}
          >
            <ArrowLeft size={14} /> BACK
          </button>

          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4B0082, #00BFFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            {fn.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "600",
                letterSpacing: "1px",
              }}
            >
              {fn}
            </div>
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "10px",
                letterSpacing: "1px",
              }}
            >
              PRIVATE TRANSMISSION
            </div>
          </div>

          {/* ── Search & Pin buttons ── */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                setShowDMSearch((prev) => !prev);
                setShowDMPinned(false);
              }}
              title="Search Messages"
              style={{
                background: showDMSearch
                  ? "rgba(155,48,255,0.15)"
                  : "transparent",
                border: "1px solid",
                borderColor: showDMSearch ? "#9B30FF" : "#1a1a3a",
                borderRadius: "6px",
                color: showDMSearch ? "#9B30FF" : "#4a4a6a",
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s",
              }}
            >
              <SearchIcon size={15} />
            </button>
            <button
              onClick={() => {
                setShowDMPinned((prev) => !prev);
                setShowDMSearch(false);
              }}
              title="Pinned Messages"
              style={{
                background: showDMPinned
                  ? "rgba(155,48,255,0.15)"
                  : "transparent",
                border: "1px solid",
                borderColor: showDMPinned ? "#9B30FF" : "#1a1a3a",
                borderRadius: "6px",
                color: showDMPinned ? "#9B30FF" : "#4a4a6a",
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s",
              }}
            >
              <Pin size={15} />
            </button>
          </div>
        </div>

        {/* ── Search Modal ── */}
        {showDMSearch && (
          <SearchMessages
            roomId={rid}
            tableName="direct_messages"
            onClose={() => setShowDMSearch(false)}
          />
        )}

        {/* ── Pinned Modal ── */}
        {showDMPinned && (
          <PinnedMessages
            roomId={rid}
            tableName="direct_messages"
            currentUser={currentUser}
            onClose={() => setShowDMPinned(false)}
            onUnpin={pinDMMessage}
          />
        )}

        {/* ── Messages ── */}
        <div
          ref={msgContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "12px 12px 140px 12px" : "20px 30px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#2a2a3a",
                fontSize: "13px",
                letterSpacing: "2px",
                marginTop: "40px",
              }}
            >
              START YOUR PRIVATE TRANSMISSION
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.user_id === currentUser.id;
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
                  onReaction={addDMReaction}
                  onContextMenu={(e) => handleDMMessageMenu(e, msg)}
                  formatTime={formatTime}
                  groupReactionData={groupReactionData(msg.id)}
                />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Typing indicator ── */}
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
            {typingUsers.map((t) => t.username).join(", ")} is typing...
          </div>
        )}

        {/* ── Reply bar ── */}
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
                  maxWidth: "300px",
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

        {/* ── Input bar ── */}
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
            onSubmit={sendDM}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleDMTyping();
              }}
              placeholder={`Message ${fn}...`}
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
              onClick={handleDMFileUpload}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isMobile ? <Send size={16} /> : "SEND"}
            </button>
          </form>
        </div>

        {/* ── Menus & Pickers ── */}
        {messageMenu && (
          <DMMessageMenu
            message={messageMenu.message}
            isOwn={messageMenu.message.user_id === currentUser.id}
            position={{ x: messageMenu.x, y: messageMenu.y }}
            onClose={() => setMessageMenu(null)}
            onReply={(msg) => setReplyTo(msg)}
            onReact={(msg) => setShowEmojiPicker(msg)}
            onEdit={editDMMessage}
            onDelete={deleteDMMessage}
            onPin={pinDMMessage}
          />
        )}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={(emoji) => {
              addDMReaction(showEmojiPicker.id, emoji);
              setShowEmojiPicker(null);
            }}
            onClose={() => setShowEmojiPicker(null)}
          />
        )}
        {pendingFile && (
          <FileUploadPreview
            file={pendingFile}
            onSend={confirmDMFileUpload}
            onCancel={() => setPendingFile(null)}
          />
        )}
      </div>
    );
  }

  // ── Friends list view ────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "30px",
        backgroundColor: "#000000",
        paddingBottom: isMobile ? "80px" : "30px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: "22px",
          fontWeight: "700",
          letterSpacing: "4px",
          background: "linear-gradient(135deg, #9B30FF, #00BFFF)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "6px",
        }}
      >
        DIRECT MESSAGES
      </div>
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, #9B30FF, #00BFFF, transparent)",
          marginTop: "10px",
          marginBottom: "20px",
        }}
      />

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {[
          { key: "friends", label: "FRIENDS" },
          {
            key: "requests",
            label: `REQUESTS${notification > 0 ? ` (${notification})` : ""}`,
          },
          { key: "search", label: "ADD FRIEND" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: tab === t.key ? "#9B30FF" : "#1a1a3a",
              backgroundColor:
                tab === t.key ? "rgba(155,48,255,0.1)" : "transparent",
              color: tab === t.key ? "#9B30FF" : "#2a2a3a",
              fontSize: "11px",
              letterSpacing: "2px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Friends tab ── */}
        {tab === "friends" && (
          <motion.div
            key="friends"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            {friends.length === 0 && (
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  textAlign: "center",
                  marginTop: "40px",
                }}
              >
                NO FRIENDS YET.
              </div>
            )}
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActiveChat(f);
                  setMessages([]);
                  prevMsgCount.current = 0;
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 20px",
                  backgroundColor: "#050508",
                  border: "1px solid #1a1a3a",
                  borderRadius: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative", // needed for badge
                }}
              >
                {/* Avatar */}
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #4B0082, #00BFFF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    {getFriendName(f).charAt(0).toUpperCase()}
                  </div>
                  {/* ── Sprint 5: Unread badge ── */}
                  {dmUnreadCounts[f.id] > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        backgroundColor: "#ff4444",
                        color: "white",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "700",
                        border: "2px solid #000000",
                      }}
                    >
                      {dmUnreadCounts[f.id] > 9 ? "9+" : dmUnreadCounts[f.id]}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {getFriendName(f)}
                  </div>
                  <div style={{ color: "#2a2a3a", fontSize: "11px" }}>
                    {dmUnreadCounts[f.id] > 0
                      ? `${dmUnreadCounts[f.id]} new message${dmUnreadCounts[f.id] > 1 ? "s" : ""}`
                      : "Click to open DM"}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Requests tab ── */}
        {tab === "requests" && (
          <motion.div
            key="requests"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            {requests.length === 0 && (
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  textAlign: "center",
                  marginTop: "40px",
                }}
              >
                NO PENDING REQUESTS.
              </div>
            )}
            {requests.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 20px",
                  backgroundColor: "#050508",
                  border: "1px solid #1a1a3a",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4B0082, #00BFFF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "700",
                  }}
                >
                  {r.from_username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {r.from_username}
                  </div>
                  <div style={{ color: "#2a2a3a", fontSize: "11px" }}>
                    Wants to connect
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => acceptRequest(r.id)}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "rgba(0,255,0,0.2)",
                      color: "#00ff00",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <UserCheck size={12} /> ACCEPT
                  </button>
                  <button
                    onClick={() => declineRequest(r.id)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #1a1a3a",
                      borderRadius: "6px",
                      backgroundColor: "transparent",
                      color: "#2a2a3a",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <UserX size={12} /> DECLINE
                  </button>
                  <button
                    onClick={() => blockUser(r.id)}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#440000",
                      color: "#ff4444",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Ban size={12} /> BLOCK
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Search / Add Friend tab ── */}
        {tab === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              style={{
                color: "#2a2a3a",
                fontSize: "11px",
                letterSpacing: "2px",
                marginBottom: "12px",
              }}
            >
              ENTER EXACT USERNAME
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchResult(null);
                  setSearchError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && searchUser()}
                placeholder="Exact username..."
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  backgroundColor: "#0a0a15",
                  border: "1px solid #1a1a3a",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <button
                onClick={searchUser}
                style={{
                  padding: "12px 24px",
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
                <Search size={14} /> SEARCH
              </button>
            </div>
            {searchError && (
              <div
                style={{
                  color: searchError.includes("sent") ? "#00ff00" : "#ff4444",
                  fontSize: "13px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  backgroundColor: searchError.includes("sent")
                    ? "rgba(0,255,0,0.05)"
                    : "rgba(255,68,68,0.05)",
                  border: `1px solid ${
                    searchError.includes("sent")
                      ? "rgba(0,255,0,0.2)"
                      : "rgba(255,68,68,0.2)"
                  }`,
                }}
              >
                {searchError}
              </div>
            )}
            {searchResult && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 20px",
                  backgroundColor: "#050508",
                  border: "1px solid #9B30FF",
                  borderRadius: "10px",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4B0082, #00BFFF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "700",
                  }}
                >
                  {searchResult.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {searchResult.username}
                  </div>
                  <div style={{ color: "#2a2a3a", fontSize: "11px" }}>
                    User found
                  </div>
                </div>
                <button
                  onClick={() => sendRequest(searchResult)}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "6px",
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
                  <UserPlus size={14} /> ADD FRIEND
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── DMMessageMenu (with Pin added) ───────────────────────
function DMMessageMenu({
  message,
  isOwn,
  position,
  onClose,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
}) {
  const [view, setView] = useState("menu");
  const [editText, setEditText] = useState(message.content);
  const isPinned = message.pinned;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: Math.min(position.y, window.innerHeight - 320),
          left: Math.min(position.x, window.innerWidth - 220),
          backgroundColor: "#0a0a15",
          border: "1px solid #1a1a3a",
          borderRadius: "10px",
          padding: "8px",
          minWidth: "200px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          zIndex: 1001,
        }}
      >
        {view === "menu" && (
          <>
            <MItem
              icon={<Reply size={14} />}
              label="Reply"
              onClick={() => {
                onReply(message);
                onClose();
              }}
            />
            <MItem
              icon={<Smile size={14} />}
              label="React"
              onClick={() => {
                onReact(message);
                onClose();
              }}
            />
            <MItem
              icon={<Copy size={14} />}
              label="Copy"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                onClose();
              }}
            />
            {/* ── Sprint 5: Pin option ── */}
            <MItem
              icon={<Pin size={14} />}
              label={isPinned ? "Unpin Message" : "Pin Message"}
              onClick={() => {
                onPin(message);
                onClose();
              }}
            />
            {isOwn && (
              <>
                <div
                  style={{
                    height: "1px",
                    background: "#1a1a3a",
                    margin: "4px 0",
                  }}
                />
                <MItem
                  icon={<Pencil size={14} />}
                  label="Edit"
                  onClick={() => setView("edit")}
                />
                <MItem
                  icon={<Trash2 size={14} />}
                  label="Delete"
                  danger
                  onClick={() => setView("delete")}
                />
              </>
            )}
          </>
        )}
        {view === "edit" && (
          <div style={{ padding: "8px" }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#050508",
                border: "1px solid #1a1a3a",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={() => {
                  onEdit(message, editText.trim());
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #4B0082, #9B30FF)",
                  color: "white",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                SAVE
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid #1a1a3a",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  color: "#4a4a6a",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        {view === "delete" && (
          <div style={{ padding: "8px" }}>
            <div
              style={{
                color: "#ff4444",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              DELETE?
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  onDelete(message.id);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#440000",
                  color: "#ff4444",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                DELETE
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid #1a1a3a",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  color: "#4a4a6a",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MItem helper (unchanged) ─────────────────────────────
function MItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "8px 12px",
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "6px",
        color: danger ? "#ff4444" : "#8a8aaa",
        fontSize: "13px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = danger
          ? "rgba(255,68,68,0.1)"
          : "rgba(155,48,255,0.1)";
        e.currentTarget.style.color = danger ? "#ff4444" : "#fff";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = danger ? "#ff4444" : "#8a8aaa";
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
