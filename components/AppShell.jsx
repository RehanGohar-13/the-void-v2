"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Auth from "./Auth";
import Chat from "./Chat";

export default function AppShell() {
  const [user, setUser] = useState(undefined); // ← undefined = not checked yet
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    // Check existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
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

  // ── Still checking session ───────────────────────────
  if (loading || user === undefined) {
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

  // ── Not logged in ────────────────────────────────────
  if (!user) return <Auth />;

  // ── Logged in but user object incomplete ────────────
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

  // ── User fully loaded — safe to render ──────────────
  return <Chat user={user} />;
}
