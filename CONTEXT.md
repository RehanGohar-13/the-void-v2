# The Void V2 — Project Context

## Stack

- Next.js 14 (App Router)
- React, TypeScript (well, mostly JavaScript with JSX)
- Supabase (Auth + PostgreSQL + Storage)
- Framer Motion
- Lucide React icons
- Vercel hosting

## Current State

- All core features working
- Auth, group chat, DMs, friends, reactions, file uploads, typing indicators all functional
- Sprint 5 features (Search, Pin, Unread badges) are working in Chat.jsx
- Sprint 5 features were just ported to DirectMessages.jsx
- Unread badges in CHANNELS work correctly
- Unread badges in DMs DO NOT clear properly

## Known Issue (CURRENT FOCUS)

DirectMessages.jsx — Unread badge bug:

- Badge shows when message received ✅
- Badge does NOT clear when DM is opened ❌
- Badge does NOT clear when navigating away and back ❌

## Database Tables (relevant)

- direct_messages (id, content, username, user_id, room_id, reply_to, reply_to_content, reply_to_username, edited, file_url, file_name, file_type, pinned, pinned_by, created_at)
- last_read (id, user_id, room_id, read_at) — NEEDS UNIQUE INDEX on (user_id, room_id)

## Important Files

- app/page.js — entry point
- components/AppShell.jsx — auth wrapper
- components/Chat.jsx — main group chat (reference: working unread implementation)
- components/DirectMessages.jsx — DM system (BROKEN unread implementation)
- components/SearchMessages.jsx — search modal
- components/PinnedMessages.jsx — pinned messages modal
- lib/supabaseClient.js — Supabase client
