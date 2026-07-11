"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

function getRoomId(a, b) {
  return [a, b].sort().join("_");
}

/**
 * useUnreadBadges — single hook for both channels and DMs
 *
 * Usage:
 *   For group channels:
 *     const { unreadCounts, markRoomRead } = useUnreadBadges("channels", rooms, null, user);
 *
 *   For direct messages:
 *     const { unreadCounts, markRoomRead } = useUnreadBadges("dms", null, friends, user);
 *     // Active friend row is passed directly to markRoomRead when opened
 */

export default function useUnreadBadges(mode, rooms, friends, user) {
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeRoomId, setActiveRoomId] = useState(null); // used to skip badge while viewing

  // ── markRoomRead — call when user opens a room ──────────
  const markRoomRead = useCallback(
    async (roomId, badgeKey) => {
      // badgeKey is the UI key (room.id for channels, friendship.id for DMs)
      if (!user?.id || !roomId) return;

      const now = new Date().toISOString();

      await supabase.from("last_read").upsert(
        {
          user_id: user.id,
          room_id: roomId,
          read_at: now,
        },
        { onConflict: "user_id,room_id" },
      );

      setActiveRoomId(roomId);

      // Immediately remove the badge
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[badgeKey];
        return next;
      });
    },
    [user?.id],
  );

  // ── clearActive — call when user leaves a room ─────────
  const clearActive = useCallback(() => {
    setActiveRoomId(null);
  }, []);

  // ── Poll unread counts ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let alive = true;

    async function loadUnread() {
      const counts = {};

      if (mode === "channels" && rooms?.length) {
        for (const room of rooms) {
          try {
            const { data: lrData, error: lrError } = await supabase
              .from("last_read")
              .select("read_at")
              .eq("user_id", user.id)
              .eq("room_id", room.id)
              .order("read_at", { ascending: false })
              .limit(1);

            if (lrError) continue;

            const readAt = lrData?.[0]?.read_at || "1970-01-01T00:00:00.000Z";

            const { count, error: countError } = await supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("room_id", room.id)
              .neq("user_id", user.id)
              .gt("created_at", readAt);

            if (countError) continue;

            if (count > 0) counts[room.id] = count;
          } catch {
            continue;
          }
        }
      }

      if (mode === "dms" && friends?.length) {
        for (const f of friends) {
          try {
            const fid = f.from_user === user.id ? f.to_user : f.from_user;
            const rid = getRoomId(user.id, fid);

            const { data: lrData, error: lrError } = await supabase
              .from("last_read")
              .select("read_at")
              .eq("user_id", user.id)
              .eq("room_id", rid)
              .order("read_at", { ascending: false })
              .limit(1);

            if (lrError) continue;

            const readAt = lrData?.[0]?.read_at || "1970-01-01T00:00:00.000Z";

            const { count, error: countError } = await supabase
              .from("direct_messages")
              .select("id", { count: "exact", head: true })
              .eq("room_id", rid)
              .neq("user_id", user.id)
              .gt("created_at", readAt);

            if (countError) continue;

            if (count > 0) counts[f.id] = count;
          } catch {
            continue;
          }
        }
      }

      if (!alive) return;

      // Remove badge for the room that is currently open
      if (activeRoomId) {
        // activeRoomId is the DB room_id; find the friend/channel key and delete
        setUnreadCounts((prev) => {
          const next = { ...prev };
          // We don't know the badge key so we let markRoomRead handle removal
          return next;
        });
        return;
      }

      setUnreadCounts(counts);
    }

    loadUnread();

    const i = setInterval(loadUnread, 5000);

    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [mode, rooms, friends, user?.id, activeRoomId]);

  return { unreadCounts, markRoomRead, clearActive };
}
