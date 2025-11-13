# Quick Reference Guide

## Environment Setup

### First Time Setup
```bash
./setup-env.sh
```

### Manual Setup
```bash
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.example client/.env.local
# Edit files with your values
```

## Environment Variables

### Required Variables

| File | Variable | Where to Get |
|------|----------|--------------|
| `.env` | `DISCORD_CLIENT_ID` | Discord Developer Portal → General Information |
| `.env` | `DISCORD_CLIENT_SECRET` | Discord Developer Portal → OAuth2 |
| `.env` | `DISCORD_BOT_TOKEN` | Discord Developer Portal → Bot |
| `bot/.env` | `DB_PASSWORD` | Your PostgreSQL password |
| `client/.env.local` | `NEXT_PUBLIC_API_URL` | Your API URL (e.g., http://localhost:3008) |

### Optional Variables

| File | Variable | Purpose |
|------|----------|---------|
| `.env` | `ALLOWED_GUILD_IDS` | Whitelist specific Discord servers |
| `client/.env.local` | `NEXT_PUBLIC_ENABLE_DEV_MODE` | Enable local testing without Discord |
| `client/.env.local` | `NEXT_PUBLIC_DEV_GUILD_ID` | Test server ID for dev mode |

## Common Commands

### Development
```bash
npm run dev          # Start all services (dev mode)
npm run server       # Start API server only
npm run client       # Start Next.js client only
npm run bot          # Start bot only
```

### Production
```bash
./deploy.sh          # One-click deployment
./update.sh          # Quick update and restart
./manage.sh restart  # Restart all services
pm2 logs             # View logs
```

### Database
```bash
# Initialize database
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/schema.sql

# Backup
./manage.sh backup

# Restore
./manage.sh restore backups/discord_stats_YYYYMMDD_HHMMSS.sql.gz
```

### Management
```bash
./manage.sh status   # View service status
./manage.sh logs     # View all logs
./manage.sh health   # Health check
./manage.sh clean    # Clean logs
```

## Project Structure

```
discord-embed-app/
├── .env                    # Root configuration
├── bot/
│   ├── .env               # Bot configuration
│   └── database/          # Database schemas
├── client/
│   ├── .env.local         # Client configuration
│   └── next.config.ts     # Next.js config (uses env vars)
├── server/                # API server
├── docs/                  # Documentation
│   ├── ENVIRONMENT_VARIABLES.md
│   └── ...
├── ecosystem.config.js    # PM2 config (uses env vars)
├── setup-env.sh          # Interactive setup
├── deploy.sh             # Deployment script
├── manage.sh             # Management script
└── cleanup-project.sh    # Cleanup script
```

## Configuration Files

### client/next.config.ts
- ✅ Uses `NEXT_PUBLIC_DISCORD_CLIENT_ID`
- ✅ Uses `NEXT_PUBLIC_API_URL`
- ✅ Dynamic CORS and rewrites

### ecosystem.config.js
- ✅ Loads `.env` with dotenv
- ✅ Uses `process.env.PORT`
- ✅ Uses `process.env.CLIENT_PORT`

## Troubleshooting

### Can't connect to database
```bash
# Check connection
psql -h localhost -U postgres -d discord_stats -c "SELECT 1"

# Check .env values
cat bot/.env | grep DB_
```

### API not responding
```bash
# Check if running
curl http://localhost:3008/health

# Check port in .env
cat .env | grep PORT

# Restart
pm2 restart discord-server
```

### Client not loading
```bash
# Check if running
curl http://localhost:3000

# Rebuild
cd client && npm run build && cd ..

# Restart
pm2 restart discord-client
```

### Environment variables not working
```bash
# Clear cache
rm -rf client/.next

# Rebuild
cd client && npm run build && cd ..

# Restart all
pm2 restart all
```

## Security Checklist

- [ ] `.env` files are in `.gitignore`
- [ ] Different tokens for dev and production
- [ ] `ALLOWED_GUILD_IDS` set in production
- [ ] Strong database password
- [ ] Regular secret rotation

## Port Reference

| Service | Default Port | Environment Variable |
|---------|--------------|---------------------|
| API Server | 3008 | `PORT` |
| Next.js Client | 3000 | `CLIENT_PORT` |
| PostgreSQL | 5432 | `DB_PORT` |

## URLs

| Environment | API URL | Client URL |
|-------------|---------|------------|
| Development | http://localhost:3008 | http://localhost:3000 |
| Production | https://api.yourdomain.com | https://yourdomain.com |
| Discord Embedded | - | https://{CLIENT_ID}.discordsays.com |

## Getting Discord IDs

### Application Client ID
1. Discord Developer Portal
2. Your Application → General Information
3. Copy "Application ID"

### Server ID (Guild ID)
1. Enable Developer Mode in Discord
2. Right-click server icon
3. Copy ID

### User ID
1. Enable Developer Mode in Discord
2. Right-click username
3. Copy ID

## Documentation

- `README.md` - Project overview
- `SETUP.md` - Setup instructions
- `CONFIGURATION.md` - Configuration guide
- `DEVELOPMENT.md` - Development guide
- `TROUBLESHOOTING.md` - Troubleshooting guide
- `docs/ENVIRONMENT_VARIABLES.md` - Complete env vars reference
- `PROJECT_CLEANUP_SUMMARY.md` - Recent changes and migration

## Support

Need help? Check:
1. `docs/ENVIRONMENT_VARIABLES.md` - Detailed configuration
2. `TROUBLESHOOTING.md` - Common issues
3. `pm2 logs` - Service logs
4. `./manage.sh health` - Health check

---

**Tip:** Run `./cleanup-project.sh` to organize and validate your project structure.
