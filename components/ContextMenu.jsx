"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { Pencil, Palette, Info, Users, Trash2 } from "lucide-react";

export default function ContextMenu({
  room,
  isOwner,
  position,
  onClose,
  onRoomUpdated,
  onRoomDeleted,
}) {
  const [view, setView] = useState("menu");
  const [name, setName] = useState(room.name);
  const [description, setDesc] = useState(room.description || "");
  const [color, setColor] = useState(room.color || "#9B30FF");
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [addUsername, setAddUsername] = useState("");
  const [memberError, setMemberError] = useState("");

  const colors = [
    "#9B30FF",
    "#00BFFF",
    "#FF4444",
    "#00FF00",
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#FF69B4",
    "#00CED1",
    "#FF8C00",
    "#7B68EE",
    "#20B2AA",
  ];

  useEffect(() => {
    if (view === "members") loadMembers();
  }, [view]);

  async function loadMembers() {
    const { data } = await supabase
      .from("channel_members")
      .select("*")
      .eq("room_id", room.id);
    setMembers(data || []);
  }

  async function addMember() {
    if (!addUsername.trim()) return;
    setMemberError("");
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", addUsername.trim())
      .single();
    if (!profile) {
      setMemberError("User not found");
      return;
    }
    const { error } = await supabase.from("channel_members").insert({
      room_id: room.id,
      user_id: profile.id,
      username: profile.username,
    });
    if (error) {
      setMemberError("Already a member");
    } else {
      setAddUsername("");
      loadMembers();
    }
  }

  async function removeMember(memberId) {
    await supabase.from("channel_members").delete().eq("id", memberId);
    loadMembers();
  }

  async function saveChanges() {
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    const { error: err } = await supabase
      .from("rooms")
      .update({
        name: name.trim(),
        description: description.trim(),
        color,
      })
      .eq("id", room.id);
    if (err) {
      setError(err.message);
    } else {
      onRoomUpdated();
      onClose();
    }
  }

  async function deleteRoom() {
    await supabase.from("messages").delete().eq("room_id", room.id);
    await supabase.from("rooms").delete().eq("id", room.id);
    onRoomDeleted(room.id);
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            top: position?.y || "50%",
            left: position?.x || "50%",
            backgroundColor: "#0a0a15",
            border: "1px solid #1a1a3a",
            borderRadius: "10px",
            padding: "8px",
            minWidth: "220px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            zIndex: 1001,
          }}
        >
          {view === "menu" && (
            <>
              <div
                style={{
                  padding: "8px 12px",
                  marginBottom: "4px",
                  borderBottom: "1px solid #1a1a3a",
                }}
              >
                <div
                  style={{
                    color,
                    fontSize: "13px",
                    fontWeight: "600",
                    letterSpacing: "1px",
                  }}
                >
                  {room.is_private ? "🔒" : "#"} {room.name}
                </div>
                {room.description && (
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    {room.description}
                  </div>
                )}
              </div>
              {isOwner ? (
                <>
                  <MenuItem
                    icon={<Pencil size={14} />}
                    label="Edit Channel"
                    onClick={() => setView("edit")}
                  />
                  <MenuItem
                    icon={<Palette size={14} />}
                    label="Change Color"
                    onClick={() => setView("color")}
                  />
                  <MenuItem
                    icon={<Info size={14} />}
                    label="Channel Info"
                    onClick={() => setView("info")}
                  />
                  {room.is_private && (
                    <MenuItem
                      icon={<Users size={14} />}
                      label="Manage Members"
                      onClick={() => setView("members")}
                    />
                  )}
                  <div
                    style={{
                      height: "1px",
                      background: "#1a1a3a",
                      margin: "4px 0",
                    }}
                  />
                  <MenuItem
                    icon={<Trash2 size={14} />}
                    label="Delete Channel"
                    danger
                    onClick={() => setView("delete")}
                  />
                </>
              ) : (
                <MenuItem
                  icon={<Info size={14} />}
                  label="Channel Info"
                  onClick={() => setView("info")}
                />
              )}
            </>
          )}

          {view === "edit" && (
            <div style={{ padding: "8px" }}>
              <div
                style={{
                  color: "#9B30FF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "12px",
                }}
              >
                EDIT CHANNEL
              </div>
              <label style={labelStyle}>NAME</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="Channel name"
              />
              <label style={labelStyle}>DESCRIPTION</label>
              <input
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                style={inputStyle}
                placeholder="What is this channel about?"
              />
              {error && (
                <div
                  style={{
                    color: "#ff4444",
                    fontSize: "11px",
                    marginTop: "8px",
                  }}
                >
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button onClick={saveChanges} style={btnSave}>
                  SAVE
                </button>
                <button onClick={onClose} style={btnCancel}>
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {view === "color" && (
            <div style={{ padding: "8px" }}>
              <div
                style={{
                  color: "#9B30FF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "12px",
                }}
              >
                CHANNEL COLOR
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {colors.map((c) => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border:
                        color === c
                          ? "3px solid white"
                          : "3px solid transparent",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={saveChanges} style={btnSave}>
                  SAVE
                </button>
                <button onClick={onClose} style={btnCancel}>
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {view === "info" && (
            <div style={{ padding: "8px" }}>
              <div
                style={{
                  color: "#9B30FF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "12px",
                }}
              >
                CHANNEL INFO
              </div>
              <InfoLine
                label="Name"
                value={`${room.is_private ? "🔒" : "#"} ${room.name}`}
              />
              <InfoLine
                label="Description"
                value={room.description || "No description"}
              />
              <InfoLine
                label="Created"
                value={new Date(room.created_at).toLocaleDateString()}
              />
              <InfoLine
                label="Owner"
                value={isOwner ? "You" : "Someone else"}
              />
              <InfoLine
                label="Type"
                value={room.is_private ? "Private" : "Public"}
              />
              <button
                onClick={onClose}
                style={{ ...btnCancel, marginTop: "12px", width: "100%" }}
              >
                CLOSE
              </button>
            </div>
          )}

          {view === "members" && (
            <div style={{ padding: "8px" }}>
              <div
                style={{
                  color: "#9B30FF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "12px",
                }}
              >
                MANAGE MEMBERS
              </div>
              <div
                style={{ display: "flex", gap: "4px", marginBottom: "12px" }}
              >
                <input
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                  placeholder="Exact username"
                  style={inputStyle}
                />
                <button
                  onClick={addMember}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    background: "#9B30FF",
                    color: "white",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  ADD
                </button>
              </div>
              {memberError && (
                <div
                  style={{
                    color: "#ff4444",
                    fontSize: "11px",
                    marginBottom: "8px",
                  }}
                >
                  {memberError}
                </div>
              )}
              {members.length === 0 ? (
                <div
                  style={{
                    color: "#2a2a3a",
                    fontSize: "12px",
                    textAlign: "center",
                  }}
                >
                  No members yet
                </div>
              ) : (
                members.map((m) => {
                  const isCreator = m.user_id === room.created_by;
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid #0d0d1a",
                      }}
                    >
                      <span
                        style={{
                          color: isCreator ? "#9B30FF" : "#8a8aaa",
                          fontSize: "12px",
                        }}
                      >
                        {m.username || "Owner"} {isCreator ? "(owner)" : ""}
                      </span>
                      {!isCreator && (
                        <button
                          onClick={() => removeMember(m.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ff4444",
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              <button
                onClick={onClose}
                style={{ ...btnCancel, marginTop: "12px", width: "100%" }}
              >
                CLOSE
              </button>
            </div>
          )}

          {view === "delete" && (
            <div style={{ padding: "8px" }}>
              <div
                style={{
                  color: "#ff4444",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                DELETE CHANNEL
              </div>
              <div
                style={{
                  color: "#4a4a6a",
                  fontSize: "12px",
                  marginBottom: "16px",
                  lineHeight: "1.5",
                }}
              >
                This will permanently delete{" "}
                <span style={{ color }}> #{room.name} </span> and all its
                messages.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={deleteRoom} style={btnDanger}>
                  DELETE FOREVER
                </button>
                <button onClick={onClose} style={btnCancel}>
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
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
        e.currentTarget.style.color = danger ? "#ff4444" : "#ffffff";
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

function InfoLine({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #0d0d1a",
      }}
    >
      <span style={{ color: "#4a4a6a", fontSize: "12px" }}>{label}</span>
      <span style={{ color: "#8a8aaa", fontSize: "12px" }}>{value}</span>
    </div>
  );
}

const labelStyle = {
  display: "block",
  color: "#4a4a6a",
  fontSize: "10px",
  letterSpacing: "2px",
  marginBottom: "4px",
  marginTop: "8px",
};
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  backgroundColor: "#050508",
  border: "1px solid #1a1a3a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};
const btnSave = {
  flex: 1,
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  background: "linear-gradient(135deg, #4B0082, #9B30FF)",
  color: "white",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "2px",
  cursor: "pointer",
};
const btnCancel = {
  flex: 1,
  padding: "10px",
  border: "1px solid #1a1a3a",
  borderRadius: "6px",
  backgroundColor: "transparent",
  color: "#4a4a6a",
  fontSize: "11px",
  letterSpacing: "2px",
  cursor: "pointer",
};
const btnDanger = {
  flex: 1,
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  background: "#440000",
  color: "#ff4444",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "2px",
  cursor: "pointer",
};
