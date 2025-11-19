#!/bin/bash

# Simple environment initialization script
# Just copies example files and reminds you to edit them

echo "🔧 Initializing environment files..."
echo ""

# Copy example files
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example"
else
    echo "⚠️  .env already exists, skipping"
fi

if [ ! -f bot/.env ]; then
    cat > bot/.env << 'EOF'
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_APPLICATION_ID=your_client_id_here
ALLOWED_GUILD_IDS=

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password_here

NODE_ENV=development
EMBEDDED_APP_URL=http://localhost:3000
EOF
    echo "✓ Created bot/.env"
else
    echo "⚠️  bot/.env already exists, skipping"
fi

if [ ! -f client/.env.local ]; then
    cp client/.env.example client/.env.local
    echo "✓ Created client/.env.local from client/.env.example"
else
    echo "⚠️  client/.env.local already exists, skipping"
fi

echo ""
echo "📝 Next steps:"
echo "  1. Edit .env and fill in your Discord credentials"
echo "  2. Edit bot/.env and fill in your database password"
echo "  3. Edit client/.env.local if needed"
echo ""
echo "Quick edit commands:"
echo "  nano .env"
echo "  nano bot/.env"
echo "  nano client/.env.local"
