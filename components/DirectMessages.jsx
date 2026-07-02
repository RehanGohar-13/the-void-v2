"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

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
  const bottomRef = useRef(null);
  const username = currentUser.user_metadata?.username || currentUser.email;

  // ── Load friends and requests ──
  useEffect(() => {
    loadFriendships();
    subscribeToFriendships();
  }, []);

  async function loadFriendships() {
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`from_user.eq.${currentUser.id},to_user.eq.${currentUser.id}`)
      .eq("status", "accepted");

    setFriends(data || []);

    const { data: reqs } = await supabase
      .from("friendships")
      .select("*")
      .eq("to_user", currentUser.id)
      .eq("status", "pending");

    setRequests(reqs || []);
    setNotification(reqs?.length || 0);
  }

  function subscribeToFriendships() {
    const channel = supabase
      .channel("friendships:" + currentUser.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => loadFriendships(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  // ── Search user ──
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

    // Check if already friends or pending
    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .or(
        `and(from_user.eq.${currentUser.id},to_user.eq.${data.id}),` +
          `and(from_user.eq.${data.id},to_user.eq.${currentUser.id})`,
      )
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        setSearchError("You are already friends.");
      } else if (existing.status === "pending") {
        setSearchError("Request already sent or received.");
      } else if (existing.status === "blocked") {
        setSearchError("Cannot send request to this user.");
      }
      return;
    }

    setSearchResult(data);
  }

  // ── Send friend request ──
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
      setSearchError("Request sent successfully!");
    }
  }

  // ── Accept request ──
  async function acceptRequest(id) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id);
    loadFriendships();
  }

  // ── Decline request ──
  async function declineRequest(id) {
    await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", id);
    loadFriendships();
  }

  // ── Block user ──
  async function blockUser(id) {
    await supabase
      .from("friendships")
      .update({ status: "blocked" })
      .eq("id", id);
    loadFriendships();
  }

  // ── Open DM chat ──
  async function openChat(friend) {
    setActiveChat(friend);
    setMessages([]);

    const roomId = getRoomId(
      currentUser.id,
      friend.from_user === currentUser.id ? friend.to_user : friend.from_user,
    );

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages(data || []);

    // Subscribe to new messages
    const channel = supabase
      .channel("dm:" + roomId + ":" + Date.now())
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  // ── Send DM ──
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

    await supabase.from("direct_messages").insert({
      content,
      username,
      user_id: currentUser.id,
      room_id: roomId,
    });
  }

  // ── Auto scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getRoomId(a, b) {
    return [a, b].sort().join("_");
  }

  function getFriendName(friendship) {
    return friendship.from_user === currentUser.id
      ? friendship.to_username
      : friendship.from_username;
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // ── If chat is open show DM window ──
  if (activeChat) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
        }}
      >
        {/* DM Header */}
        <div
          style={{
            padding: "20px 30px",
            borderBottom: "1px solid #0d0d1a",
            backgroundColor: "#020205",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveChat(null)}
            style={{
              background: "transparent",
              border: "1px solid #1a1a3a",
              borderRadius: "6px",
              color: "#9B30FF",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "12px",
              letterSpacing: "1px",
            }}
          >
            ← BACK
          </motion.button>

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
            {getFriendName(activeChat).charAt(0).toUpperCase()}
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
              {getFriendName(activeChat)}
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
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 30px",
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

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "20px 30px",
            borderTop: "1px solid #0d0d1a",
            backgroundColor: "#020205",
          }}
        >
          <form onSubmit={sendDM} style={{ display: "flex", gap: "12px" }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${getFriendName(activeChat)}...`}
              style={{
                flex: 1,
                padding: "14px 20px",
                backgroundColor: "#0a0a15",
                border: "1px solid #1a1a3a",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
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
              }}
            >
              SEND
            </motion.button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main DM screen ──
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "30px",
        backgroundColor: "#000000",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "24px" }}
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
          }}
        />
      </motion.div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "24px",
        }}
      >
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
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {/* FRIENDS TAB */}
        {tab === "friends" && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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
                <br />
                <span style={{ fontSize: "11px" }}>
                  Use SEARCH to find users.
                </span>
              </div>
            )}

            {friends.map((f, i) => (
              <motion.button
                key={f.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openChat(f)}
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
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#9B30FF";
                  e.currentTarget.style.backgroundColor = "#0a0a15";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#1a1a3a";
                  e.currentTarget.style.backgroundColor = "#050508";
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
                    flexShrink: 0,
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
                      letterSpacing: "1px",
                    }}
                  >
                    {getFriendName(f)}
                  </div>
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      marginTop: "2px",
                    }}
                  >
                    Click to open DM
                  </div>
                </div>

                <div style={{ color: "#2a2a3a", fontSize: "18px" }}>→</div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* REQUESTS TAB */}
        {tab === "requests" && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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

            {requests.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
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
                    flexShrink: 0,
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
                      letterSpacing: "1px",
                    }}
                  >
                    {r.from_username}
                  </div>
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      marginTop: "2px",
                    }}
                  >
                    Wants to connect
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => acceptRequest(r.id)}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      background: "linear-gradient(135deg, #004B00, #00ff00)",
                      color: "white",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      cursor: "pointer",
                    }}
                  >
                    ACCEPT
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => declineRequest(r.id)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #1a1a3a",
                      borderRadius: "6px",
                      backgroundColor: "transparent",
                      color: "#2a2a3a",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      cursor: "pointer",
                    }}
                  >
                    DECLINE
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => blockUser(r.id)}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#440000",
                      color: "#ff4444",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      cursor: "pointer",
                    }}
                  >
                    BLOCK
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* SEARCH TAB */}
        {tab === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
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
                onFocus={(e) => (e.target.style.borderColor = "#9B30FF")}
                onBlur={(e) => (e.target.style.borderColor = "#1a1a3a")}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
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
                }}
              >
                SEARCH
              </motion.button>
            </div>

            {/* Search error or success message */}
            {searchError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  color: searchError.includes("sent") ? "#00ff00" : "#ff4444",
                  fontSize: "13px",
                  letterSpacing: "1px",
                  padding: "10px 16px",
                  backgroundColor: searchError.includes("sent")
                    ? "rgba(0,255,0,0.05)"
                    : "rgba(255,68,68,0.05)",
                  borderRadius: "8px",
                  border: `1px solid ${
                    searchError.includes("sent")
                      ? "rgba(0,255,0,0.2)"
                      : "rgba(255,68,68,0.2)"
                  }`,
                }}
              >
                {searchError.includes("sent") ? "✓" : "⚠"} {searchError}
              </motion.div>
            )}

            {/* Search result */}
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                      letterSpacing: "1px",
                    }}
                  >
                    {searchResult.username}
                  </div>
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: "11px",
                      letterSpacing: "1px",
                      marginTop: "2px",
                    }}
                  >
                    User found
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
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
                    boxShadow: "0 0 15px rgba(155,48,255,0.3)",
                  }}
                >
                  ADD FRIEND
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
