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
│   ├── schema.sql       # Complete database schema
│   ├── add_thread_support.sql    # Thread support upgrade
│   ├── add_attachments.sql       # Attachment support upgrade
│   └── upgrade.sql      # General upgrade script
├── handlers/
│   ├── messageHandler.js    # Message/emoji processing and storage
│   └── historyFetcher.js    # Historical message fetching (supports forum channels)
├── jobs/
│   └── statsAggregator.js   # Daily cron job for statistics
└── commands/
    └── listCommands.js      # Bot slash commands
```

CommonJS module system. Bot monitors Discord messages, extracts data, stores to PostgreSQL, and handles historical message fetching with forum channel support.

## server/ - Express API

```
server/
├── index.js              # Express app, CORS, routes
├── controllers/
│   ├── statsController.js    # Database queries, API logic
│   └── historyController.js  # Historical fetch API logic
├── middleware/
│   └── guildWhitelist.js     # Guild authorization middleware
├── routes/
│   ├── stats.js              # Statistics API routes
│   ├── fetch.js              # Historical fetch routes
│   └── auth.js               # Authentication routes
└── utils/
    └── guildManager.js       # Whitelist helper functions
```

CommonJS. API endpoints: 
- Statistics: `/api/stats/server/:guildId`, `/api/stats/members/:guildId`, `/api/stats/channels/:guildId`, `/api/stats/messages/:guildId`, `/api/stats/emojis/:guildId`
- Admin: `/api/fetch/channels/:guildId`, `/api/fetch/start`, `/api/fetch/tasks/:guildId`, `/api/fetch/progress/:taskId`

## client/ - Next.js Frontend

```
client/
├── app/
│   ├── layout.tsx        # Root layout (dark mode)
│   ├── page.tsx          # Main dashboard page
│   ├── admin/
│   │   └── page.tsx      # Admin panel for historical fetching
│   └── globals.css       # Global styles with CSS variables
├── components/
│   ├── dashboard-nav.tsx      # Navigation menu
│   ├── language-switcher.tsx # Traditional/Simplified Chinese switcher
│   ├── emoji-image.tsx        # Emoji display component
│   ├── charts/
│   │   ├── message-trends-chart.tsx  # Dual Y-axis line chart (Recharts)
│   │   └── channel-usage-chart.tsx   # Bar chart (Recharts)
│   ├── admin/
│   │   ├── channel-tree.tsx          # Channel selection tree
│   │   ├── batch-fetch.tsx           # Batch fetch interface
│   │   ├── fetch-progress.tsx        # Real-time progress tracking
│   │   └── fetch-history.tsx         # Fetch task history
│   └── ui/               # shadcn/ui components
│       ├── card.tsx
│       ├── button.tsx
│       ├── chart.tsx
│       ├── progress.tsx
│       ├── badge.tsx
│       └── navigation-menu.tsx
├── contexts/
│   └── LanguageContext.tsx   # Language context provider
├── hooks/
│   └── use-mobile.tsx    # Mobile detection hook
├── lib/
│   ├── utils.ts          # Utility functions (cn)
│   ├── i18n.ts           # Internationalization
│   └── discord-sdk.ts    # Discord SDK integration
├── types/
│   └── index.ts          # TypeScript interfaces
├── next.config.ts        # Next.js config (uses env vars)
├── tailwind.config.ts    # Tailwind v4 config
├── tsconfig.json         # Strict TypeScript config
├── components.json       # shadcn/ui config
└── package.json
```

Next.js 16 App Router. All components are TypeScript (.tsx). Uses shadcn/ui for consistent design.

## Management Scripts

```
Root directory:
├── setup-env.sh          # Interactive environment setup (English, no encoding issues)
├── deploy.sh             # One-click deployment
├── update.sh             # Production update script (with backup)
├── manage.sh             # Service management (start/stop/restart/backup/restore)
├── cleanup-project.sh    # Interactive project cleanup
└── ecosystem.config.js   # PM2 configuration (uses env vars)
```

## Documentation Structure

```
Root documentation:
├── README.md                      # Project overview (Traditional Chinese)
├── QUICK_REFERENCE.md             # Quick reference guide (Traditional Chinese)
├── PROJECT_CLEANUP_SUMMARY.md     # Environment variables refactor summary
├── PRODUCTION_UPDATE_GUIDE.md     # Production update guide
├── VERIFICATION_CHECKLIST.md      # Project verification checklist
└── CLEANUP_COMPLETE.md            # Cleanup completion report

docs/:
├── ENVIRONMENT_VARIABLES.md       # Complete env vars guide (Traditional Chinese)
├── DEVELOPMENT.md                 # Development guide
├── CONFIGURATION.md               # Configuration guide
└── THREAD_SUPPORT.md              # Thread support documentation
```

## Conventions

- **Language**: Documentation and UI text in Traditional Chinese (繁體中文)
- **Module System**: Bot and server use CommonJS (`require`), client uses ESM (`import`)
- **TypeScript**: Client only, strict mode enabled
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Error Handling**: Console logging with emoji prefixes (✅ ❌ ⚠️ 📊 🤖)
- **Whitelist**: Always check `ALLOWED_GUILD_IDS` for guild authorization
- **Data Source**: Real data from PostgreSQL database (no mock data)
- **Guild ID**: Obtained from URL parameters (`guild_id`) in Discord Embedded App
- **Environment Variables**: All configuration uses env vars (no hardcoded values)
- **Backup Strategy**: Always backup before updates (`./manage.sh backup`)

Silent Execution (Default): Unless explicitly requested, do not create documents, run tests, compile, execute the target program, or produce summaries during an agent run.
