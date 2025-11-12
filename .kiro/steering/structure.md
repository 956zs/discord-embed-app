---
inclusion: always
---

# Project Structure

## Root Level

- Monorepo with three main directories: `bot/`, `server/`, `client/`
- Root `package.json` orchestrates all services via npm scripts
- Documentation files in root (Chinese language): README.md, SETUP.md, CONFIGURATION.md, etc.
- `.kiro/steering/` - AI assistant context and guidelines

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

## client/ - Next.js Frontend

```
client/
├── app/
│   ├── layout.tsx        # Root layout (dark mode)
│   ├── page.tsx          # Main dashboard page
│   └── globals.css       # Global styles with CSS variables
├── components/
│   ├── dashboard-nav.tsx      # Navigation menu
│   ├── charts/
│   │   ├── message-trends-chart.tsx  # Line chart (Recharts)
│   │   └── channel-usage-chart.tsx   # Bar chart (Recharts)
│   └── ui/               # shadcn/ui components
│       ├── card.tsx
│       ├── button.tsx
│       ├── chart.tsx
│       └── navigation-menu.tsx
├── hooks/
│   └── use-mobile.tsx    # Mobile detection hook
├── lib/
│   └── utils.ts          # Utility functions (cn)
├── types/
│   └── index.ts          # TypeScript interfaces
├── next.config.ts        # Next.js config (rewrites, CORS)
├── tailwind.config.ts    # Tailwind v3 config
├── tsconfig.json         # Strict TypeScript config
├── components.json       # shadcn/ui config
└── package.json
```

Next.js 16 App Router. All components are TypeScript (.tsx). Uses shadcn/ui for consistent design.

## Conventions

- **Language**: Documentation and UI text in Traditional Chinese (繁體中文)
- **Module System**: Bot and server use CommonJS (`require`), client uses ESM (`import`)
- **TypeScript**: Client only, strict mode enabled
- **Styling**: Tailwind CSS with shadcn/ui components
- **Error Handling**: Console logging with emoji prefixes (✅ ❌ ⚠️ 📊 🤖)
- **Whitelist**: Always check `ALLOWED_GUILD_IDS` for guild authorization
- **Data Source**: Real data from PostgreSQL database (no mock data)
- **Guild ID**: Obtained from URL parameters (`guild_id`) in Discord Embedded App

Silent Execution (Default): Unless explicitly requested, do not create documents, run tests, compile, execute the target program, or produce summaries during an agent run.
