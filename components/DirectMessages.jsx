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

  // ── Poll friendships/requests every 5 sec ─────────────────
  useEffect(() => {
    let mounted = true;
    let interval;

    async function loadFriendships() {
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

    loadFriendships();

    interval = setInterval(() => {
      if (mounted && !activeChat) {
        loadFriendships();
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentUser.id, activeChat]);

  // ── Poll DM messages every 3 sec when chat open ───────────
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

      if (mounted) {
        setMessages(data || []);
      }
    }

    if (activeChat) {
      loadDMs();

      interval = setInterval(() => {
        if (mounted) loadDMs();
      }, 3000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeChat, currentUser.id]);

  // ── Search user ───────────────────────────────────────────
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

  // ── Send friend request ───────────────────────────────────
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

  async function openChat(friend) {
    setActiveChat(friend);
    setMessages([]);
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

    await supabase.from("direct_messages").insert({
      content,
      username,
      user_id: currentUser.id,
      room_id: roomId,
    });
  }

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
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // ── DM Chat View ──────────────────────────────────────────
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
          <button
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
              <div
                key={msg.id}
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
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

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
            />
            <button
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
              }}
            >
              SEND
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main DM Screen ───────────────────────────────────────
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
          display: "flex",
          gap: "4px",
          marginTop: "16px",
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
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: "11px",
                    }}
                  >
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

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => acceptRequest(r.id)}>ACCEPT</button>
                  <button onClick={() => declineRequest(r.id)}>DECLINE</button>
                  <button onClick={() => blockUser(r.id)}>BLOCK</button>
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
              <button onClick={searchUser}>SEARCH</button>
            </div>

            {searchError && (
              <div
                style={{
                  color: searchError.includes("sent") ? "#00ff00" : "#ff4444",
                  fontSize: "13px",
                  padding: "10px 16px",
                  borderRadius: "8px",
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

                <button onClick={() => sendRequest(searchResult)}>
                  ADD FRIEND
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
