---
inclusion: always
---

# Tech Stack

## Frontend (client/)

- **Next.js 16** with **App Router** and **TypeScript** (strict mode enabled)
- **React 19** - UI framework
- **Recharts** - data visualization (via shadcn/ui chart components)
- **shadcn/ui** - UI component library (Radix UI + Tailwind CSS)
- **Tailwind CSS v4** - styling
- **Axios** - HTTP client
- **Lucide React** - icons

TypeScript config: strict type checking, ES2020 target, bundler module resolution

## Backend (server/)

- **Node.js** + **Express** (CommonJS)
- **PostgreSQL** via node-postgres (pg) - real-time data from database
- **CORS** enabled
- **dotenv** for environment configuration
- **Discord.js v14** - Discord API integration

## Bot (bot/)

- **Discord.js v14** (CommonJS)
- **PostgreSQL** via node-postgres (pg)
- **node-cron** - scheduled daily statistics aggregation
- Required intents: Guilds, GuildMembers, GuildMessages, MessageContent

## Database

PostgreSQL with tables:
- `messages` - message records with indexes on guild_id, user_id, channel_id, created_at
- `emoji_usage` - emoji tracking
- `daily_stats` - aggregated statistics (JSONB columns)
- `channel_stats` - per-channel message counts

## Common Commands

```bash
# Install all dependencies
npm install && cd client && npm install && cd ../bot && npm install

# Development (all services)
npm run dev

# Individual services
npm run server    # API server (port 3008)
npm run client    # Next.js dev server (port 3000)
npm run bot       # Data collection bot

# Production
cd client && npm run build  # Build Next.js client
npm start                   # Start API server
npm run start:bot          # Start bot

# Database setup
psql -U username -d discord_stats -f bot/database/create_tables.sql
```

## Environment Variables

Root `.env`: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, PORT (3008), ALLOWED_GUILD_IDS

Bot `.env`: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DISCORD_BOT_TOKEN, ALLOWED_GUILD_IDS

Client `.env.local`: NEXT_PUBLIC_DISCORD_CLIENT_ID, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DEV_GUILD_ID, NEXT_PUBLIC_ENABLE_DEV_MODE
