# The Void V2

A real-time chat platform with a dark luxury aesthetic. Built as a Discord clone for portfolio and university applications.

## Live Demo

🌐 [the-void-v2.vercel.app](https://the-void-v2.vercel.app)

## Features

- **Group Channels** — Public and private channels with creation, editing, and member management
- **Direct Messages** — Friend system with add, accept, decline, and block
- **Real-time Chat** — Polling-based instant messaging with typing indicators
- **Message Reactions** — Emoji picker with 9 categories and 200+ emojis
- **File Attachments** — Upload images, videos, audio, PDFs, code files (25MB limit)
- **Pinned Messages** — Pin important messages with golden indicator
- **Message Search** — Full-text search within channels and DMs
- **Unread Badges** — Red notification badges on channels
- **Online Presence** — Live online user list with 30-second heartbeat
- **Reply System** — Thread replies with context preview
- **Message Editing** — Edit or delete your own messages
- **Mobile Responsive** — Bottom navigation, horizontal channel pills, touch-optimized
- **Dark Theme** — Custom purple (#9B30FF) + electric blue (#00BFFF) color scheme
- **Custom Font** — Mephisto font for titles and branding

## Tech Stack

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Framework       | Next.js 14 (App Router)                        |
| Frontend        | React, JavaScript/JSX, Framer Motion           |
| Backend         | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Icons           | Lucide React                                   |
| Font            | Mephisto (custom TTF)                          |
| Hosting         | Vercel                                         |
| Version Control | GitHub                                         |

## Database Scheme

- `messages` — Group channel messages (with pin, reply, file support)
- `direct_messages` — DM conversation messages
- `rooms` — Channels (public/private, color, icon)
- `profiles` — User profiles (avatar color, status message)
- `friendships` — Friend relationships (pending, accepted, blocked)
- `presence` — Online/offline status tracking
- `typing` — Typing indicator data
- `reactions` — Emoji reactions (shared between messages and direct_messages)
- `channel_members` — Private channel member lists
- `last_read` — Read receipt timestamps per user per room

## Project Structure

```bash
the-void-v2/
├── app/
│ ├── layout.js
│ ├── page.js
│ └── globals.css
├── components/
│ ├── AppShell.jsx
│ ├── Auth.jsx
│ ├── Chat.jsx
│ ├── DirectMessages.jsx
│ ├── MessageBubble.jsx
│ ├── DateDivider.jsx
│ ├── FilePreview.jsx
│ ├── FileUploadPreview.jsx
│ ├── EmojiPicker.jsx
│ ├── ContextMenu.jsx
│ ├── MessageMenu.jsx
│ ├── SearchMessages.jsx
│ ├── PinnedMessages.jsx
│ ├── SettingsPage.jsx
│ ├── MobileNav.jsx
│ ├── MobileSettings.jsx
│ └── OnlinePanel.jsx
├── hooks/
│ └── useUnreadBadges.js
├── lib/
│ └── supabaseClient.js
├── public/
│ └── fonts/
│ └── Mephisto.ttf
├── README.md
└── .env.local
```

## Getting Started

```bash
git clone https://github.com/RehanGohar-13/the-void-v2.git
cd the-void-v2
npm install
# Create .env.local with Supabase credentials
npm run dev
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Author

### Rehan Gohar

- Location: Pakistan
- Self-taught developer
- Portfolio project for career and university applications

## Previous Version

The Void V1 was built with Python Flask + CustomTkinter and self-hosted on Linux with Cloudflare tunnel. It is archived at:

```bash
github.com/RehanGohar-13/The-Void
```

## Acknowledgments

- Uncle (Chachu) for suggesting the Next.js + Supabase stack
- Halper 2.0 & Helper 3.0 for AI-assisted development (and yes the Halper is intentional)
