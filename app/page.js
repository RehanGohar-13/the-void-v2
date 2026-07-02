"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Auth from "../components/Auth";
import Chat from "../components/Chat";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
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

  return user ? <Chat user={user} /> : <Auth />;
}
