"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Ban,
} from "lucide-react";

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

  const bottomRef = useRef(null);
  const prevMsgCount = useRef(0);
  const msgContainerRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const username = currentUser.user_metadata?.username || currentUser.email;

  // ── Poll friendships ──────────────────────────────────────
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

  // ── Poll DM messages ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let interval;

    async function loadDMs() {
      if (!activeChat) return;
      const friendId =
        activeChat.from_user === currentUser.id
          ? activeChat.to_user
          : activeChat.from_user;
      const roomId = getRoomId(currentUser.id, friendId);
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("room_id", roomId)
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

  // ── Poll DM reactions ─────────────────────────────────────
  useEffect(() => {
    loadDMReactions();
  }, [messages]);

  async function loadDMReactions() {
    if (!messages.length) {
      setReactions({});
      return;
    }
    const ids = messages.map((m) => m.id);
    // We reuse the reactions table but with direct_message ids
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

  // ── Poll DM typing ────────────────────────────────────────
  useEffect(() => {
    let interval;
    let mounted = true;
    async function checkTyping() {
      if (!activeChat) return;
      const friendId =
        activeChat.from_user === currentUser.id
          ? activeChat.to_user
          : activeChat.from_user;
      const roomId = getRoomId(currentUser.id, friendId);
      const cutoff = new Date(Date.now() - 3000).toISOString();
      const { data } = await supabase
        .from("typing")
        .select("*")
        .eq("room_id", roomId)
        .gte("typing_at", cutoff)
        .neq("user_id", currentUser.id);
      if (mounted) setTypingUsers(data || []);
    }
    if (activeChat) {
      checkTyping();
      interval = setInterval(checkTyping, 2000);
    }
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeChat, currentUser.id]);

  // ── Smart scroll ──────────────────────────────────────────
  useEffect(() => {
    const container = msgContainerRef.current;
    if (!container) return;
    if (prevMsgCount.current === 0 && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      }, 80);
      prevMsgCount.current = messages.length;
      return;
    }
    if (messages.length > prevMsgCount.current) {
      const near =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;
      if (near)
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  // ── Helpers ───────────────────────────────────────────────
  function getRoomId(a, b) {
    return [a, b].sort().join("_");
  }

  function getFriendName(f) {
    return f.from_user === currentUser.id ? f.to_username : f.from_username;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  function getDateDivider(msg, prev) {
    const d = new Date(msg.created_at).toLocaleDateString();
    if (!prev) return d;
    return d !== new Date(prev.created_at).toLocaleDateString() ? d : null;
  }

  function groupReactionData(msgId) {
    return Object.entries(
      (reactions[msgId] || []).reduce((acc, r) => {
        acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], hasOwn: false };
        acc[r.emoji].count++;
        acc[r.emoji].users.push(r.username);
        if (r.user_id === currentUser.id) acc[r.emoji].hasOwn = true;
        return acc;
      }, {}),
    );
  }

  // ── Actions ───────────────────────────────────────────────
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
      setSearchError("No user found with that exact username.");
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
        setSearchError("Request already pending.");
      else if (existing.status === "blocked")
        setSearchError("Cannot send request.");
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

  async function sendDM(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeChat) return;
    setText("");
    const friendId =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    const roomId = getRoomId(currentUser.id, friendId);
    const msgData = {
      content,
      username,
      user_id: currentUser.id,
      room_id: roomId,
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
    const friendId =
      activeChat.from_user === currentUser.id
        ? activeChat.to_user
        : activeChat.from_user;
    const roomId = getRoomId(currentUser.id, friendId);
    await supabase.from("typing").upsert({
      user_id: currentUser.id,
      username,
      room_id: roomId,
      typing_at: new Date().toISOString(),
    });
  }

  async function addDMReaction(messageId, emoji) {
    const existing = (reactions[messageId] || []).find(
      (r) => r.user_id === currentUser.id && r.emoji === emoji,
    );
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({
        message_id: messageId,
        user_id: currentUser.id,
        username,
        emoji,
      });
    }
    await loadDMReactions();
  }

  async function handleDMFileUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.zip,.rar";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !activeChat) return;
      if (file.size > 25 * 1024 * 1024) {
        alert("File too large. Max 25MB.");
        return;
      }
      const ext = file.name.split(".").pop();
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
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
      const friendId =
        activeChat.from_user === currentUser.id
          ? activeChat.to_user
          : activeChat.from_user;
      const roomId = getRoomId(currentUser.id, friendId);
      await supabase.from("direct_messages").insert({
        content: `📎 ${file.name}`,
        username,
        user_id: currentUser.id,
        room_id: roomId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
      });
    };
    input.click();
  }

  async function editDMMessage(msg, newContent) {
    await supabase
      .from("direct_messages")
      .update({ content: newContent, edited: true })
      .eq("id", msg.id);
  }

  async function deleteDMMessage(id) {
    await supabase.from("direct_messages").delete().eq("id", id);
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

  // ── DM Chat View ──────────────────────────────────────────
  if (activeChat) {
    const friendName = getFriendName(activeChat);

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
        {/* Header */}
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
              letterSpacing: "1px",
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
            {friendName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div
              style={{
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "600",
                letterSpacing: "1px",
              }}
            >
              {friendName}
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
        </div>

        {/* Messages */}
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
                {dd && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      margin: "20px 0 12px",
                    }}
                  >
                    <div
                      style={{ flex: 1, height: "1px", background: "#1a1a3a" }}
                    />
                    <div
                      style={{
                        color: "#2a2a3a",
                        fontSize: "11px",
                        letterSpacing: "2px",
                      }}
                    >
                      {dd}
                    </div>
                    <div
                      style={{ flex: 1, height: "1px", background: "#1a1a3a" }}
                    />
                  </div>
                )}

                <div
                  onContextMenu={(e) => handleDMMessageMenu(e, msg)}
                  onTouchStart={(e) => {
                    const t = setTimeout(() => {
                      handleDMMessageMenu(
                        {
                          preventDefault: () => {},
                          clientX: e.touches[0].clientX,
                          clientY: e.touches[0].clientY,
                        },
                        msg,
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
                        wordBreak: "break-word",
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
                          onClick={() => addDMReaction(msg.id, emoji)}
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
                          <Paperclip size={14} /> {msg.file_name}
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
            {typingUsers.map((t) => t.username).join(", ")} is typing...
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
            onSubmit={sendDM}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleDMTyping();
              }}
              placeholder={`Message ${friendName}...`}
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

        {/* DM Message Menu */}
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
          />
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <DMEmojiPicker
            onSelect={(emoji) => {
              addDMReaction(showEmojiPicker.id, emoji);
              setShowEmojiPicker(null);
            }}
            onClose={() => setShowEmojiPicker(null)}
          />
        )}
      </div>
    );
  }

  // ── Main DM Screen ────────────────────────────────────────
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

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {[
          { key: "friends", label: "FRIENDS" },
          {
            key: "requests",
            label: `REQUESTS${notification > 0 ? ` (${notification})` : ""}`,
          },
          { key: "search", label: "SEARCH" },
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
                  {getFriendName(f).charAt(0).toUpperCase()}
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
                    Click to open DM
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}

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
                  border: `1px solid ${searchError.includes("sent") ? "rgba(0,255,0,0.2)" : "rgba(255,68,68,0.2)"}`,
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

// ── DM Message Menu ─────────────────────────────────────────
function DMMessageMenu({
  message,
  isOwn,
  position,
  onClose,
  onReply,
  onReact,
  onEdit,
  onDelete,
}) {
  const [view, setView] = useState("menu");
  const [editText, setEditText] = useState(message.content);

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleOverlay}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        style={{
          position: "fixed",
          top: Math.min(position.y, window.innerHeight - 280),
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

// ── DM Emoji Picker (reuses same logic) ─────────────────────
function DMEmojiPicker({ onSelect, onClose }) {
  const emojis = [
    "👍",
    "❤️",
    "😂",
    "😮",
    "😢",
    "😡",
    "🔥",
    "🎉",
    "💯",
    "👀",
    "🚀",
    "⚡",
    "💀",
    "🙏",
    "💜",
    "✅",
    "❌",
    "🤔",
    "😎",
    "🤯",
    "💪",
    "🫡",
    "👑",
    "⭐",
  ];
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        backgroundColor: "rgba(0,0,0,0.6)",
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
          padding: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
        }}
      >
        <div
          style={{
            color: "#9B30FF",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "3px",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          REACT
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "2px",
          }}
        >
          {emojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              style={{
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(155,48,255,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
