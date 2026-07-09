"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Auth from "./Auth";
import Chat from "./Chat";

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!alive) return;
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#000000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#9B30FF",
          fontSize: "14px",
          fontFamily: "Segoe UI, Arial, sans-serif",
          letterSpacing: "4px",
        }}
      >
        INITIALIZING THE VOID...
      </div>
    );
  }

  // ── Extra safety guard ───────────────────────────────
  if (!user) return <Auth />;

  // ── Only render Chat when user is 100% confirmed ────
  if (!user.id || !user.email) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#000000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#9B30FF",
          fontSize: "14px",
          fontFamily: "Segoe UI, Arial, sans-serif",
          letterSpacing: "4px",
        }}
      >
        INITIALIZING THE VOID...
      </div>
    );
  }

  return <Chat user={user} />;
}
