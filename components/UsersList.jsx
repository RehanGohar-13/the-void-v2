"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

export default function UsersList({ currentUser, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser.id)
        .order("username", { ascending: true });

      if (!error) setUsers(data || []);
      setLoading(false);
    }

    loadUsers();
  }, [currentUser.id]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px 30px",
        backgroundColor: "#000000",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "30px" }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "4px",
            background: "linear-gradient(135deg, #9B30FF, #00BFFF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "8px",
          }}
        >
          DIRECT MESSAGES
        </div>
        <div
          style={{
            color: "#2a2a3a",
            fontSize: "11px",
            letterSpacing: "2px",
          }}
        >
          SELECT A USER TO START A PRIVATE TRANSMISSION
        </div>
      </motion.div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, #9B30FF, #00BFFF, transparent)",
          marginBottom: "20px",
        }}
      />

      {/* Users list */}
      {loading && (
        <div
          style={{
            color: "#2a2a3a",
            fontSize: "13px",
            letterSpacing: "2px",
            textAlign: "center",
            marginTop: "40px",
          }}
        >
          SCANNING FOR USERS...
        </div>
      )}

      {!loading && users.length === 0 && (
        <div
          style={{
            color: "#2a2a3a",
            fontSize: "13px",
            letterSpacing: "2px",
            textAlign: "center",
            marginTop: "40px",
          }}
        >
          NO OTHER USERS FOUND.
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {users.map((u, i) => (
          <motion.button
            key={u.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectUser(u)}
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
              transition: "all 0.3s",
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
            {/* Avatar */}
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
              {u.username.charAt(0).toUpperCase()}
            </div>

            {/* Username */}
            <div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  letterSpacing: "1px",
                  marginBottom: "2px",
                }}
              >
                {u.username}
              </div>
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "11px",
                  letterSpacing: "1px",
                }}
              >
                Click to open DM
              </div>
            </div>

            {/* Arrow */}
            <div
              style={{
                marginLeft: "auto",
                color: "#2a2a3a",
                fontSize: "18px",
              }}
            >
              →
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
