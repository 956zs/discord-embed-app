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
- `messages` - message records with thread support (is_thread, thread_id, parent_channel_id)
- `emoji_usage` - emoji tracking with custom emoji URLs
- `daily_stats` - aggregated statistics (JSONB columns)
- `channel_stats` - per-channel message counts
- `history_fetch_tasks` - historical fetch task tracking
- `history_fetch_ranges` - fetch range records (prevents duplicate fetching)
- `admin_users` - admin permission management (per-guild)

## Common Commands

```bash
# Setup (first time)
./setup-env.sh              # Interactive environment setup
./deploy.sh                 # One-click deployment

# Development
npm run dev                 # Start all services
npm run server              # API server (port 3008)
npm run client              # Next.js dev server (port 3000)
npm run bot                 # Data collection bot

# Production
./update.sh                 # Update with backup
./manage.sh start           # Start services
./manage.sh restart         # Restart services
./manage.sh restart-prod    # Restart with config reload
./manage.sh backup          # Backup database
./manage.sh restore <file>  # Restore database
./manage.sh health          # Health check
pm2 logs                    # View logs

# Database
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/schema.sql
psql -U postgres -d discord_stats -f bot/database/add_thread_support.sql
psql -U postgres -d discord_stats -f bot/database/add_attachments.sql
```

## Environment Variables

**Root `.env`:**
- DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN
- PORT (3008), CLIENT_PORT (3000)
- ALLOWED_GUILD_IDS, NODE_ENV

**Bot `bot/.env`:**
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- DISCORD_BOT_TOKEN, ALLOWED_GUILD_IDS, NODE_ENV

**Client `client/.env.local`:**
- NEXT_PUBLIC_DISCORD_CLIENT_ID, NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_ENABLE_DEV_MODE, NEXT_PUBLIC_DEV_GUILD_ID, NEXT_PUBLIC_DEV_USER_ID
- NODE_ENV

**Configuration Files (use env vars):**
- `client/next.config.ts` - Uses NEXT_PUBLIC_DISCORD_CLIENT_ID, NEXT_PUBLIC_API_URL
- `ecosystem.config.js` - Uses process.env.PORT, process.env.CLIENT_PORT

See `docs/ENVIRONMENT_VARIABLES.md` for complete guide.


Silent Execution (Default): Unless explicitly requested, do not create documents, run tests, compile, execute the target program, or produce summaries during an agent run.
