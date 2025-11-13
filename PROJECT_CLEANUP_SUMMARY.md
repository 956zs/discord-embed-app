# Project Cleanup Summary

## What Was Fixed

### 1. Environment Variables

**Problem:** 
- Hardcoded values in `client/next.config.ts` (Discord URL, API URL)
- Hardcoded values in `ecosystem.config.js` (ports)
- Chinese characters in `setup-env.sh` causing encoding issues in `.env` files
- Inconsistent environment variable naming across files

**Solution:**
- ✅ Updated `client/next.config.ts` to use environment variables
- ✅ Updated `ecosystem.config.js` to load from `.env` and use `process.env`
- ✅ Rewrote `setup-env.sh` to use English and proper encoding (placeholders + sed)
- ✅ Standardized all `.env.example` files with consistent structure
- ✅ Created comprehensive `docs/ENVIRONMENT_VARIABLES.md` guide

### 2. Configuration Files

**Before:**
```typescript
// client/next.config.ts - HARDCODED
allowedDevOrigins: [
  "https://1401130025411018772.discordsays.com",
],
async rewrites() {
  return [{
    destination: 'http://localhost:3008/api/:path*',
  }];
}
```

**After:**
```typescript
// client/next.config.ts - DYNAMIC
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';
const DISCORD_ORIGIN = `https://${DISCORD_CLIENT_ID}.discordsays.com`;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';

allowedDevOrigins: DISCORD_CLIENT_ID ? [DISCORD_ORIGIN] : [],
async rewrites() {
  return [{
    destination: `${API_URL}/api/:path*`,
  }];
}
```

**Before:**
```javascript
// ecosystem.config.js - HARDCODED
env: {
  NODE_ENV: "production",
  PORT: 3008,
}
args: "start -p 3000",
```

**After:**
```javascript
// ecosystem.config.js - DYNAMIC
require('dotenv').config();

env: {
  NODE_ENV: "production",
  PORT: process.env.PORT || 3008,
}
args: `start -p ${process.env.CLIENT_PORT || 3000}`,
```

### 3. Setup Script

**Problem:**
- Chinese characters written directly to `.env` files
- Caused encoding issues on some systems
- Made files harder to read/edit

**Solution:**
- Use heredoc with placeholders
- Replace placeholders with `sed` command
- All comments and structure in English
- Proper encoding handling

### 4. Documentation Structure

**Created:**
- `docs/ENVIRONMENT_VARIABLES.md` - Comprehensive env vars guide
- `cleanup-project.sh` - Interactive cleanup script
- `PROJECT_CLEANUP_SUMMARY.md` - This file

**Improved:**
- `.env.example` - Cleaner structure with English comments
- `bot/.env.example` - Consistent format
- `client/.env.example` - Better documentation

## File Changes

### Modified Files

1. **client/next.config.ts**
   - Now uses `NEXT_PUBLIC_DISCORD_CLIENT_ID` for Discord origin
   - Now uses `NEXT_PUBLIC_API_URL` for API rewrites
   - Dynamic CORS headers based on env vars

2. **ecosystem.config.js**
   - Loads `.env` file with `dotenv`
   - Uses `process.env.PORT` and `process.env.CLIENT_PORT`
   - No more hardcoded values

3. **setup-env.sh**
   - Complete rewrite in English
   - Uses placeholder + sed approach
   - No Chinese character encoding issues
   - Better error handling and validation

4. **.env.example**
   - Cleaner structure
   - English comments
   - Better organization

5. **bot/.env.example**
   - Consistent with root `.env.example`
   - Clear documentation

6. **client/.env.example**
   - Expanded with all variables
   - Better descriptions
   - Development and production examples

### New Files

1. **docs/ENVIRONMENT_VARIABLES.md**
   - Complete guide to all environment variables
   - Configuration examples for dev and prod
   - Troubleshooting section
   - Security best practices

2. **cleanup-project.sh**
   - Interactive script to organize project
   - Archive old documentation
   - Clean up logs and test files
   - Validate configuration

3. **PROJECT_CLEANUP_SUMMARY.md**
   - This file
   - Documents all changes
   - Migration guide

## Environment Variables Reference

### Root `.env`

```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
PORT=3008
CLIENT_PORT=3000
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=development
```

### Bot `bot/.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=development
```

### Client `client/.env.local`

```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_API_URL=http://localhost:3008
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_GUILD_ID=your_test_server_id
NEXT_PUBLIC_DEV_USER_ID=your_user_id
NODE_ENV=development
```

## Migration Guide

### For Existing Installations

If you already have the project running:

1. **Backup current configuration:**
   ```bash
   cp .env .env.backup
   cp bot/.env bot/.env.backup
   cp client/.env.local client/.env.local.backup
   ```

2. **Update configuration files:**
   ```bash
   # Pull latest changes
   git pull
   
   # Or manually update:
   # - client/next.config.ts
   # - ecosystem.config.js
   # - setup-env.sh
   ```

3. **Verify environment variables:**
   ```bash
   # Check if all required vars are set
   cat .env
   cat bot/.env
   cat client/.env.local
   ```

4. **Rebuild and restart:**
   ```bash
   # Rebuild client
   cd client && npm run build && cd ..
   
   # Restart services
   pm2 restart all
   # or
   ./manage.sh restart-prod
   ```

### For New Installations

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd discord-embed-app
   ```

2. **Run setup script:**
   ```bash
   ./setup-env.sh
   ```

3. **Follow the guided setup** - it will create all necessary `.env` files

4. **Deploy:**
   ```bash
   ./deploy.sh
   ```

## Testing

### Verify Configuration

1. **Check environment files exist:**
   ```bash
   ls -la .env bot/.env client/.env.local
   ```

2. **Verify no hardcoded values:**
   ```bash
   # Should NOT find hardcoded Discord URL
   grep -n "1401130025411018772" client/next.config.ts
   
   # Should NOT find hardcoded port
   grep -n "PORT: 3008" ecosystem.config.js
   ```

3. **Test environment variable loading:**
   ```bash
   # Start services
   npm run dev
   
   # Check if correct values are used
   curl http://localhost:${PORT}/health
   curl http://localhost:${CLIENT_PORT}
   ```

### Verify Next.js Config

```bash
# Build should succeed without errors
cd client
npm run build

# Check build output for correct API URL
# Should show your NEXT_PUBLIC_API_URL value
```

### Verify PM2 Config

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Check environment variables
pm2 env 0  # Check first process

# Should show correct PORT and CLIENT_PORT
```

## Troubleshooting

### Issue: "Environment variable not found"

**Solution:**
1. Check if `.env` file exists
2. Verify variable name matches exactly
3. Restart the service after changing `.env`

### Issue: "Still seeing hardcoded values"

**Solution:**
1. Clear Next.js cache: `rm -rf client/.next`
2. Rebuild: `cd client && npm run build`
3. Restart PM2: `pm2 restart all`

### Issue: "Chinese characters in .env file"

**Solution:**
1. Delete current `.env` files
2. Run `./setup-env.sh` again
3. Or manually copy from `.env.example` and edit

### Issue: "PM2 not loading environment variables"

**Solution:**
1. Ensure `dotenv` is installed: `npm install dotenv`
2. Check `ecosystem.config.js` has `require('dotenv').config()`
3. Restart with: `pm2 delete all && pm2 start ecosystem.config.js`

## Benefits

### 1. Flexibility
- Easy to change Discord app without code changes
- Simple port configuration
- Environment-specific settings

### 2. Security
- No secrets in code
- Easy to use different tokens for dev/prod
- `.env` files in `.gitignore`

### 3. Maintainability
- Clear configuration structure
- Documented environment variables
- Consistent across all components

### 4. Deployment
- Same code for all environments
- Configuration through `.env` files only
- No code changes needed for different deployments

## Scripts Reference

### Setup and Configuration

```bash
# Interactive environment setup
./setup-env.sh

# Project cleanup and organization
./cleanup-project.sh
```

### Deployment

```bash
# One-click deployment
./deploy.sh

# Quick update (pull + rebuild + restart)
./update.sh
```

### Management

```bash
# Start services
./manage.sh start

# Stop services
./manage.sh stop

# Restart services
./manage.sh restart

# Restart with config reload
./manage.sh restart-prod

# View status
./manage.sh status

# View logs
./manage.sh logs

# Health check
./manage.sh health

# Backup database
./manage.sh backup

# Restore database
./manage.sh restore <backup_file>

# Clean logs
./manage.sh clean
```

## Next Steps

1. **Review changes:**
   ```bash
   git status
   git diff
   ```

2. **Test configuration:**
   ```bash
   ./setup-env.sh  # If not done yet
   npm run dev     # Test in development
   ```

3. **Update production:**
   ```bash
   ./deploy.sh     # Deploy to production
   ```

4. **Read documentation:**
   - `docs/ENVIRONMENT_VARIABLES.md` - Environment variables guide
   - `README.md` - Project overview
   - `SETUP.md` - Setup instructions

## Additional Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/environment/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

If you encounter issues:

1. Check `docs/ENVIRONMENT_VARIABLES.md` for detailed configuration guide
2. Run `./cleanup-project.sh` to validate and fix common issues
3. Check logs: `pm2 logs` or `./manage.sh logs`
4. Review this document for migration steps

---

**Last Updated:** $(date)
**Version:** 2.0 (Environment Variables Refactor)
