---
inclusion: always
---

# Tech Stack

## Frontend (client/)

- **React 18** with **TypeScript** (strict mode enabled)
- **Vite** - build tool and dev server
- **Chart.js** + react-chartjs-2 - data visualization
- **react-wordcloud** + d3-cloud - word cloud rendering
- **Discord Embedded App SDK** - Discord integration
- **Axios** - HTTP client

TypeScript config: strict type checking, ES2020 target, bundler module resolution

## Backend (server/)

- **Node.js** + **Express** (CommonJS)
- **CORS** enabled
- **dotenv** for environment configuration

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
npm run server    # API server
npm run client    # Frontend dev server
npm run bot       # Data collection bot

# Production
npm run build     # Build client
npm start         # Start API server
npm run start:bot # Start bot

# Database setup
psql -U username -d discord_stats -f bot/database/create_tables.sql
```

## Environment Variables

Root `.env`: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, PORT, VITE_API_URL, ALLOWED_GUILD_IDS

Bot `.env`: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DISCORD_BOT_TOKEN, ALLOWED_GUILD_IDS
