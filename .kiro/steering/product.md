---
inclusion: always
---

# Product Overview

Discord 伺服器統計與可視化 Embedded App - A full-featured Discord Embedded App for displaying server statistics including member activity, channel usage, message trends, and emoji usage.

## Core Features

- Server overview (member count, channels, roles)
- Message trends (7-day message volume and active user charts with Recharts)
- Channel usage statistics (bar chart)
- Member activity leaderboard (top 10)
- Emoji usage rankings (custom and Unicode emojis)
- Real-time data from PostgreSQL database
- Dynamic guild detection from URL parameters

## Architecture

Three-tier application:
- **Bot**: Discord.js v14 bot for data collection, stores to PostgreSQL
- **Server**: Express API (port 3008) serving statistics endpoints with real database queries
- **Client**: Next.js 16 + TypeScript dashboard with Recharts visualizations and shadcn/ui components

## Guild Whitelist

Production deployments must configure `ALLOWED_GUILD_IDS` in `.env` to restrict data collection and API access to authorized Discord servers only.

## Development Mode

Set `NEXT_PUBLIC_ENABLE_DEV_MODE=true` in `client/.env.local` to enable direct localhost access with a default guild ID. Otherwise, the app requires `guild_id` URL parameter (automatically provided by Discord Embedded App).


Silent Execution (Default): Unless explicitly requested, do not create documents, run tests, compile, execute the target program, or produce summaries during an agent run.
