---
inclusion: always
---

# Project Structure

## Root Level

- Monorepo with three main directories: `bot/`, `server/`, `client/`
- Root `package.json` orchestrates all services via npm scripts
- Documentation files in root (Chinese language): README.md, BOT_DEVELOPMENT_GUIDE.md, TYPESCRIPT_SETUP.md, WHITELIST_GUIDE.md, etc.

## bot/ - Data Collection Bot

```
bot/
├── index.js              # Main bot entry, event handlers, whitelist logic
├── database/
│   ├── db.js            # PostgreSQL connection pool
│   └── create_tables.sql # Database schema
├── handlers/
│   └── messageHandler.js # Message/emoji processing and storage
└── jobs/
    └── statsAggregator.js # Daily cron job for statistics
```

CommonJS module system. Bot monitors Discord messages, extracts data, stores to PostgreSQL.

## server/ - Express API

```
server/
├── index.js              # Express app, CORS, routes
├── controllers/
│   └── statsController.js # Database queries, API logic
├── middleware/
│   └── guildWhitelist.js  # Guild authorization middleware
├── routes/
│   └── stats.js          # API route definitions
└── utils/
    └── guildManager.js    # Whitelist helper functions
```

CommonJS. API endpoints: `/api/stats/server/:guildId`, `/api/stats/members/:guildId`, `/api/stats/channels/:guildId`, `/api/stats/messages/:guildId`, `/api/stats/emojis/:guildId`, `/api/stats/keywords/:guildId`

## client/ - React Frontend

```
client/
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Root component, Discord SDK init
│   ├── components/
│   │   ├── Dashboard.tsx      # Main dashboard container
│   │   ├── ServerOverview.tsx # Server stats card
│   │   ├── MessageTrends.tsx  # Line chart component
│   │   ├── ChannelUsage.tsx   # Bar chart component
│   │   ├── MemberActivity.tsx # Member leaderboard
│   │   ├── EmojiStats.tsx     # Emoji rankings
│   │   ├── KeywordCloud.tsx   # Word cloud
│   │   ├── Dashboard.css      # Dashboard styles
│   │   └── Card.css           # Shared card styles
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces
│   ├── App.css
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json         # Strict TypeScript config
└── package.json          # ESM type
```

ES modules. All components are TypeScript (.tsx). Shared type definitions in `types/index.ts`.

## Conventions

- **Language**: Documentation and UI text in Traditional Chinese (繁體中文)
- **Module System**: Bot and server use CommonJS (`require`), client uses ESM (`import`)
- **TypeScript**: Client only, strict mode enabled
- **Styling**: CSS files co-located with components
- **Error Handling**: Console logging with emoji prefixes (✅ ❌ ⚠️ 📊 🤖)
- **Whitelist**: Always check `ALLOWED_GUILD_IDS` for guild authorization



Silent Execution (Default): Unless explicitly requested, do not create documents, run tests, compile, execute the target program, or produce summaries during an agent run.
