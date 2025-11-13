---
inclusion: always
---

# Product Overview

Discord 伺服器統計與可視化 Embedded App - A full-featured Discord Embedded App for displaying server statistics including member activity, channel usage, message trends, emoji usage, and historical message fetching.

## Core Features

### 📊 Statistics & Analytics
- Server overview (member count, channels, roles)
- Message trends with dual Y-axis charts (messages on left, active users on right)
- Customizable time ranges (7/30/90/180/365 days, all time)
- Channel usage statistics (bar chart)
- Member activity leaderboard (top 10)
- Emoji usage rankings (custom and Unicode emojis, with animated emoji support)
- Real-time data from PostgreSQL database

### 🔧 Admin Features
- Historical message fetching (batch extraction from channels)
- Forum channel support (automatically fetches all threads)
- Thread support (complete Discord threads and forum channels)
- Progress tracking for fetch tasks
- Admin permission system (database-based)
- Intelligent channel analysis (identifies channels needing updates)

### 🎨 User Experience
- Modern UI with shadcn/ui and Tailwind CSS v4
- Responsive design (desktop and mobile)
- Traditional/Simplified Chinese language switcher
- Dark theme optimized
- Client-side routing (no page reloads)

## Architecture

Three-tier application:
- **Bot**: Discord.js v14 bot for data collection and historical fetching, stores to PostgreSQL
- **Server**: Express API (port 3008) serving statistics and admin endpoints
- **Client**: Next.js 16 + TypeScript dashboard with Recharts visualizations and shadcn/ui components

## Environment Configuration

All configuration now uses environment variables (no hardcoded values):
- `client/next.config.ts` - Uses `NEXT_PUBLIC_DISCORD_CLIENT_ID` and `NEXT_PUBLIC_API_URL`
- `ecosystem.config.js` - Uses `process.env.PORT` and `process.env.CLIENT_PORT`
- Interactive setup tool: `./setup-env.sh`

## Guild Whitelist

Production deployments must configure `ALLOWED_GUILD_IDS` in `.env` to restrict data collection and API access to authorized Discord servers only.

## Development Mode

Set `NEXT_PUBLIC_ENABLE_DEV_MODE=true` in `client/.env.local` to enable direct localhost access with a default guild ID. Otherwise, the app requires `guild_id` URL parameter (automatically provided by Discord Embedded App).


Silent Execution (Default): Unless explicitly requested, do not create documents, run tests, compile, execute the target program, or produce summaries during an agent run.
