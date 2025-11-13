# Environment Variables Guide

This document describes all environment variables used in the Discord Stats App.

## Quick Setup

The easiest way to configure environment variables is to run:

```bash
./setup-env.sh
```

This interactive script will guide you through all configuration steps.

## Manual Setup

If you prefer manual configuration, copy the example files and edit them:

```bash
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.example client/.env.local
```

## Environment Files

### Root `.env`

Main configuration file for the entire application.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_CLIENT_ID` | Yes | - | Discord Application Client ID from Developer Portal |
| `DISCORD_CLIENT_SECRET` | Yes | - | Discord OAuth2 Client Secret |
| `DISCORD_BOT_TOKEN` | Yes | - | Discord Bot Token |
| `PORT` | No | 3008 | API server port |
| `CLIENT_PORT` | No | 3000 | Next.js client port (dev mode) |
| `ALLOWED_GUILD_IDS` | No | - | Comma-separated list of allowed Discord server IDs |
| `NODE_ENV` | No | development | Environment mode: `development` or `production` |

### Bot `bot/.env`

Configuration for the Discord bot data collector.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | No | 5432 | PostgreSQL port |
| `DB_NAME` | Yes | discord_stats | Database name |
| `DB_USER` | Yes | postgres | Database user |
| `DB_PASSWORD` | Yes | - | Database password |
| `DISCORD_BOT_TOKEN` | Yes | - | Discord Bot Token (same as root) |
| `ALLOWED_GUILD_IDS` | No | - | Comma-separated list of allowed server IDs (same as root) |
| `NODE_ENV` | No | development | Environment mode |

### Client `client/.env.local`

Configuration for the Next.js frontend.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Yes | - | Discord Application Client ID |
| `NEXT_PUBLIC_API_URL` | Yes | http://localhost:3008 | API server URL |
| `NEXT_PUBLIC_ENABLE_DEV_MODE` | No | false | Enable dev mode for local testing |
| `NEXT_PUBLIC_DEV_GUILD_ID` | No | - | Test server ID (dev mode only) |
| `NEXT_PUBLIC_DEV_USER_ID` | No | - | Test user ID (dev mode only) |
| `NODE_ENV` | No | development | Environment mode |

## Configuration by Environment

### Development Environment

For local development and testing:

**Root `.env`:**
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
PORT=3008
CLIENT_PORT=3000
ALLOWED_GUILD_IDS=your_test_server_id
NODE_ENV=development
```

**Bot `bot/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=your_test_server_id
NODE_ENV=development
```

**Client `client/.env.local`:**
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_API_URL=http://localhost:3008
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_GUILD_ID=your_test_server_id
NEXT_PUBLIC_DEV_USER_ID=your_user_id
NODE_ENV=development
```

### Production Environment

For server deployment:

**Root `.env`:**
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
PORT=3008
CLIENT_PORT=3000
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=production
```

**Bot `bot/.env`:**
```env
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_secure_password
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=production
```

**Client `client/.env.local`:**
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_ENABLE_DEV_MODE=false
NODE_ENV=production
```

## Getting Discord Credentials

### 1. Discord Application Client ID

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **General Information**
4. Copy the **Application ID**

### 2. Discord Client Secret

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. Click **Reset Secret** (or copy existing secret)
5. Copy the **Client Secret**

### 3. Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **Bot**
4. Click **Reset Token** (or copy existing token)
5. Copy the **Bot Token**

### 4. Discord Server ID (Guild ID)

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Right-click on your server icon
3. Click **Copy ID**

### 5. Discord User ID

1. Enable Developer Mode in Discord (if not already enabled)
2. Right-click on your username
3. Click **Copy ID**

## Security Best Practices

### 1. Never Commit `.env` Files

The `.gitignore` file already excludes `.env` files, but always double-check:

```bash
# Check if .env is ignored
git check-ignore .env bot/.env client/.env.local
```

### 2. Use Strong Passwords

For production databases, use strong, randomly generated passwords:

```bash
# Generate a secure password
openssl rand -base64 32
```

### 3. Restrict Guild Access

In production, always set `ALLOWED_GUILD_IDS` to limit which Discord servers can use your app:

```env
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432
```

### 4. Use Environment-Specific Secrets

Never use the same tokens/secrets across development and production environments.

### 5. Rotate Secrets Regularly

Periodically rotate your Discord tokens and database passwords, especially if:
- A team member leaves
- You suspect a security breach
- As part of regular security maintenance

## Troubleshooting

### Issue: "Cannot connect to database"

**Check:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` are correct
- PostgreSQL is running
- Database exists: `createdb discord_stats`
- User has access permissions

### Issue: "Discord authentication failed"

**Check:**
- `DISCORD_BOT_TOKEN` is correct and not expired
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` match
- Bot has proper intents enabled in Developer Portal

### Issue: "Guild not whitelisted"

**Check:**
- `ALLOWED_GUILD_IDS` includes your server ID
- No extra spaces in the comma-separated list
- Server ID is correct (right-click server → Copy ID)

### Issue: "API URL not working"

**Check:**
- `NEXT_PUBLIC_API_URL` matches your API server URL
- Port matches `PORT` in root `.env`
- No trailing slash in URL

### Issue: "Dev mode not working"

**Check:**
- `NEXT_PUBLIC_ENABLE_DEV_MODE=true` in `client/.env.local`
- `NEXT_PUBLIC_DEV_GUILD_ID` and `NEXT_PUBLIC_DEV_USER_ID` are set
- You're accessing via localhost, not Discord Embedded App

## Environment Variable Loading

### Load Order

1. **Root `.env`**: Loaded by server and ecosystem.config.js
2. **Bot `bot/.env`**: Loaded by bot process
3. **Client `client/.env.local`**: Loaded by Next.js (dev and build)
4. **Client `client/.env.production`**: Loaded by Next.js (production build only)

### Next.js Environment Variables

Next.js has special rules for environment variables:

- **`NEXT_PUBLIC_*`**: Exposed to browser (client-side)
- **Other variables**: Server-side only

**Important:** Only use `NEXT_PUBLIC_` prefix for variables that should be accessible in the browser. Never use it for secrets!

### PM2 Environment Variables

When using PM2 (production), environment variables are loaded from:

1. Root `.env` (via `dotenv` in `ecosystem.config.js`)
2. Process-specific `env` object in `ecosystem.config.js`

## Validation

To validate your environment configuration:

```bash
# Check if all required files exist
ls -la .env bot/.env client/.env.local

# Test database connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Test API server
curl http://localhost:3008/health

# Test client
curl http://localhost:3000
```

## Migration from Old Configuration

If you're upgrading from an older version with hardcoded values:

1. Run `./setup-env.sh` to generate new `.env` files
2. Update `client/next.config.ts` (already uses env vars)
3. Update `ecosystem.config.js` (already uses env vars)
4. Restart all services: `pm2 restart all`

## Additional Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/environment/)
