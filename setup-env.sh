#!/bin/bash

# ============================================================================
# Discord Stats App - Environment Setup Tool
# ============================================================================
# Usage: ./setup-env.sh
# 
# This script will guide you through configuring all environment variables
# ============================================================================

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log_section() {
    echo ""
    echo -e "${CYAN}======================================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}======================================================================${NC}"
}

# Read user input
read_input() {
    local prompt="$1"
    local default="$2"
    local secret="$3"
    
    if [ -n "$default" ]; then
        echo -ne "${BLUE}$prompt${NC} ${YELLOW}[default: $default]${NC}: "
    else
        echo -ne "${BLUE}$prompt${NC}: "
    fi
    
    if [ "$secret" = "true" ]; then
        read -s value
        echo ""
    else
        read value
    fi
    
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    
    echo "$value"
}

# Validate required field
validate_required() {
    local value="$1"
    local name="$2"
    
    if [ -z "$value" ]; then
        log_error "$name cannot be empty!"
        return 1
    fi
    return 0
}

# Test database connection
test_db_connection() {
    local host="$1"
    local port="$2"
    local user="$3"
    local password="$4"
    local dbname="$5"
    
    log_info "Testing database connection..."
    
    if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$dbname" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "Database connection successful!"
        return 0
    else
        log_error "Database connection failed!"
        return 1
    fi
}

# ============================================================================
# Start configuration
# ============================================================================

clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Discord Server Stats & Visualization Embedded App          ║
║   Environment Configuration Tool                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info "This tool will guide you through configuring all environment variables"
echo ""

# Select environment type
log_section "Select Environment Type"
echo ""
echo "  1) Development"
echo "     - For local development and testing"
echo "     - Enable dev mode features"
echo "     - Use localhost"
echo ""
echo "  2) Production"
echo "     - For server deployment"
echo "     - Use actual domain"
echo "     - Optimized security settings"
echo ""

while true; do
    read -p "Select environment type (1 or 2): " ENV_TYPE
    case $ENV_TYPE in
        1)
            ENV_MODE="development"
            log_success "Selected: Development"
            break
            ;;
        2)
            ENV_MODE="production"
            log_success "Selected: Production"
            break
            ;;
        *)
            log_error "Please enter 1 or 2"
            ;;
    esac
done

echo ""
log_warning "Configuration includes 6 steps:"
echo "  Step 1/6 - Discord Configuration (Bot Token, Client ID, Client Secret)"
echo "  Step 2/6 - PostgreSQL Database Configuration"
echo "  Step 3/6 - Server Configuration (Ports, Whitelist)"
echo "  Step 4/6 - Frontend Configuration (Dev Mode, API URL)"
echo "  Step 5/6 - Monitoring Configuration (Optional)"
echo "  Step 6/6 - Generate Configuration Files"
echo ""
log_info "Please prepare the following information:"
echo "  - Discord Bot Token"
echo "  - Discord Application Client ID and Secret"
echo "  - PostgreSQL database connection info"
echo "  - Discord Server ID (optional)"
echo ""
log_info "Estimated time: 5-10 minutes"
echo ""
read -p "Ready? Press Enter to start..."

# ============================================================================
# 1. Discord Configuration
# ============================================================================
log_section "Step 1/6: Discord Configuration"

log_info "Visit Discord Developer Portal to get the following:"
echo "  https://discord.com/developers/applications"
echo ""
log_warning "You need these three items:"
echo "  1. Bot Token (from Bot page)"
echo "  2. Client ID (from General Information page)"
echo "  3. Client Secret (from OAuth2 page)"
echo ""

echo "----------------------------------------------------------------------"
log_info "1/3 - Bot Token"
echo "  This is your Discord Bot authentication token"
echo "  Location: Bot page -> Reset Token"
DISCORD_BOT_TOKEN=$(read_input "Enter Bot Token" "" "true")
validate_required "$DISCORD_BOT_TOKEN" "Bot Token" || exit 1
log_success "Bot Token set"

echo ""
echo "----------------------------------------------------------------------"
log_info "2/3 - Client ID"
echo "  This is your Discord Application unique identifier"
echo "  Location: General Information page -> Application ID"
DISCORD_CLIENT_ID=$(read_input "Enter Client ID" "")
validate_required "$DISCORD_CLIENT_ID" "Client ID" || exit 1
log_success "Client ID set"

echo ""
echo "----------------------------------------------------------------------"
log_info "3/3 - Client Secret"
echo "  This is your OAuth2 authentication secret"
echo "  Location: OAuth2 page -> Client Secret -> Reset Secret"
DISCORD_CLIENT_SECRET=$(read_input "Enter Client Secret" "" "true")
validate_required "$DISCORD_CLIENT_SECRET" "Client Secret" || exit 1
log_success "Client Secret set"

echo ""
log_success "Discord configuration complete (1/6)"

# ============================================================================
# 2. Database Configuration
# ============================================================================
log_section "Step 2/6: PostgreSQL Database Configuration"

log_info "Configure PostgreSQL database connection"
echo "  If you haven't created the database yet, you can do it later:"
echo "  createdb discord_stats"
echo ""

echo "----------------------------------------------------------------------"
log_info "1/5 - Database Host"
echo "  Usually localhost (local) or remote server IP"
DB_HOST=$(read_input "Enter database host" "localhost")

echo ""
echo "----------------------------------------------------------------------"
log_info "2/5 - Database Port"
echo "  PostgreSQL default port is 5432"
DB_PORT=$(read_input "Enter database port" "5432")

echo ""
echo "----------------------------------------------------------------------"
log_info "3/5 - Database Name"
echo "  Recommended: discord_stats"
DB_NAME=$(read_input "Enter database name" "discord_stats")

echo ""
echo "----------------------------------------------------------------------"
log_info "4/5 - Database User"
echo "  PostgreSQL default user is postgres"
DB_USER=$(read_input "Enter database user" "postgres")

echo ""
echo "----------------------------------------------------------------------"
log_info "5/5 - Database Password"
echo "  Input will be hidden, this is normal"
DB_PASSWORD=$(read_input "Enter database password" "" "true")
validate_required "$DB_PASSWORD" "Database password" || exit 1

echo ""
# Test connection
if ! test_db_connection "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASSWORD" "$DB_NAME"; then
    log_warning "Database connection failed, but configuration will continue"
    log_info "Please ensure you manually create the database later:"
    echo "  createdb $DB_NAME"
    echo ""
    read -p "Press Enter to continue..."
fi

log_success "Database configuration complete (2/6)"

# ============================================================================
# 3. Server Configuration
# ============================================================================
log_section "Step 3/6: Server Configuration"

echo "----------------------------------------------------------------------"
log_info "1/3 - API Server Port"
echo "  Port number for API server"
echo "  Default is 3008, ensure this port is not in use"
PORT=$(read_input "Enter API Server port" "3008")
log_success "Port set to $PORT"

echo ""
echo "----------------------------------------------------------------------"
log_info "2/3 - Client Port (Development)"
echo "  Port number for Next.js frontend dev server"
echo "  Default is 3000, ensure this port is not in use"
CLIENT_PORT=$(read_input "Enter Client port" "3000")
log_success "Client port set to $CLIENT_PORT"

echo ""
echo "----------------------------------------------------------------------"
if [ "$ENV_MODE" = "production" ]; then
    log_info "3/3 - Whitelist Configuration (Strongly recommended for production)"
    log_warning "Production environment strongly recommends setting whitelist for security"
    echo "  Only whitelisted servers can use stats features"
else
    log_info "3/3 - Whitelist Configuration (Optional)"
    echo "  This is an optional security feature"
fi
echo "  If you only want to collect data from specific servers, enter server IDs"
echo "  Multiple servers separated by commas, e.g.: 123456789,987654321"
echo "  Leave empty to allow all servers (not recommended for production)"
echo ""

while true; do
    ALLOWED_GUILD_IDS=$(read_input "Allowed server IDs (press Enter to skip)" "")
    
    if [ -n "$ALLOWED_GUILD_IDS" ]; then
        log_success "Whitelist set: $ALLOWED_GUILD_IDS"
        break
    else
        if [ "$ENV_MODE" = "production" ]; then
            log_warning "Production environment without whitelist will allow all servers"
            echo ""
            read -p "Are you sure you want to continue? (y/n): " confirm
            case $confirm in
                [Yy]*)
                    log_info "Confirmed: No whitelist set"
                    break
                    ;;
                [Nn]*)
                    echo ""
                    log_info "Please enter server IDs:"
                    ;;
                *)
                    log_error "Please enter y or n"
                    ;;
            esac
        else
            log_info "No whitelist set, will allow all servers"
            break
        fi
    fi
done

echo ""
log_success "Server configuration complete (3/6)"

# ============================================================================
# 4. Frontend Configuration
# ============================================================================
log_section "Step 4/6: Frontend Configuration"

echo "----------------------------------------------------------------------"
log_info "1/2 - Development Mode Configuration"

if [ "$ENV_MODE" = "development" ]; then
    log_info "Development environment: Auto-enable dev mode"
    NEXT_PUBLIC_ENABLE_DEV_MODE="true"
    echo ""
    echo "  Dev mode requires test server and user IDs"
    echo "  This allows local testing without Discord Embedded App"
    echo ""
    echo "  Test Server ID:"
    echo "  Right-click server icon in Discord -> Copy ID"
    NEXT_PUBLIC_DEV_GUILD_ID=$(read_input "  Enter test server ID" "")
    echo ""
    echo "  Test User ID:"
    echo "  Right-click your username in Discord -> Copy ID"
    NEXT_PUBLIC_DEV_USER_ID=$(read_input "  Enter test user ID" "")
    log_success "Dev mode configuration complete"
else
    log_info "Production environment: Dev mode disabled"
    NEXT_PUBLIC_ENABLE_DEV_MODE="false"
    NEXT_PUBLIC_DEV_GUILD_ID=""
    NEXT_PUBLIC_DEV_USER_ID=""
fi

echo ""
echo "----------------------------------------------------------------------"
log_info "2/2 - Backend API URL"

if [ "$ENV_MODE" = "development" ]; then
    log_info "Development environment: Using localhost"
    NEXT_PUBLIC_API_URL="http://localhost:$PORT"
    log_success "Backend API URL set to $NEXT_PUBLIC_API_URL"
else
    echo "  Production backend API URL"
    echo "  This is where Next.js API routes will proxy requests to"
    echo "  Should be your API server URL, e.g.: http://localhost:$PORT"
    echo "  Or use your domain: https://api.yourdomain.com"
    NEXT_PUBLIC_API_URL=$(read_input "Enter Backend API URL" "http://localhost:$PORT")
    log_success "Backend API URL set to $NEXT_PUBLIC_API_URL"
fi

echo ""
log_success "Frontend configuration complete (4/4)"

# ============================================================================
# 5. Monitoring Configuration (Optional)
# ============================================================================
log_section "Step 5/6: Monitoring Configuration (Optional)"

log_info "Performance monitoring system (optional feature)"
echo "  Monitor system performance, API response times, and database queries"
echo "  Includes alert system and webhook notifications"
echo ""

read -p "Enable monitoring system? (y/n): " ENABLE_MONITORING_INPUT
case $ENABLE_MONITORING_INPUT in
    [Yy]*)
        ENABLE_MONITORING="true"
        log_success "Monitoring enabled"
        
        echo ""
        log_info "Monitoring Configuration:"
        
        # Admin token
        echo "----------------------------------------------------------------------"
        log_info "1/3 - Admin Token"
        echo "  Secure token for accessing monitoring endpoints"
        echo "  Generate a random token or use your own"
        echo ""
        read -p "Generate random admin token? (y/n): " GEN_TOKEN
        case $GEN_TOKEN in
            [Yy]*)
                ADMIN_TOKEN=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
                log_success "Generated admin token: $ADMIN_TOKEN"
                ;;
            *)
                ADMIN_TOKEN=$(read_input "Enter admin token" "" "true")
                validate_required "$ADMIN_TOKEN" "Admin token" || exit 1
                ;;
        esac
        
        echo ""
        echo "----------------------------------------------------------------------"
        log_info "2/3 - Webhook Notifications (Optional)"
        echo "  Send ERROR level alerts to Discord via webhook"
        echo "  Get webhook URL from: Server Settings > Integrations > Webhooks"
        echo ""
        read -p "Enable webhook notifications? (y/n): " ENABLE_WEBHOOK_INPUT
        case $ENABLE_WEBHOOK_INPUT in
            [Yy]*)
                WEBHOOK_ENABLED="true"
                echo ""
                log_info "Enter Discord Webhook URLs"
                echo "  Multiple URLs separated by commas"
                echo "  Example: https://discord.com/api/webhooks/xxx/yyy"
                WEBHOOK_URLS=$(read_input "Webhook URLs" "")
                if [ -n "$WEBHOOK_URLS" ]; then
                    log_success "Webhook notifications enabled"
                else
                    log_warning "No webhook URLs provided, webhook disabled"
                    WEBHOOK_ENABLED="false"
                fi
                ;;
            *)
                WEBHOOK_ENABLED="false"
                WEBHOOK_URLS=""
                log_info "Webhook notifications disabled"
                ;;
        esac
        
        echo ""
        echo "----------------------------------------------------------------------"
        log_info "3/3 - Alert Thresholds"
        echo "  Configure when to trigger alerts (percentage)"
        echo ""
        ALERT_CPU_WARN=$(read_input "CPU Warning threshold %" "80")
        ALERT_CPU_ERROR=$(read_input "CPU Error threshold %" "90")
        ALERT_MEMORY_WARN=$(read_input "Memory Warning threshold %" "80")
        ALERT_MEMORY_ERROR=$(read_input "Memory Error threshold %" "90")
        log_success "Alert thresholds configured"
        ;;
    *)
        ENABLE_MONITORING="false"
        ADMIN_TOKEN=""
        WEBHOOK_ENABLED="false"
        WEBHOOK_URLS=""
        ALERT_CPU_WARN="80"
        ALERT_CPU_ERROR="90"
        ALERT_MEMORY_WARN="80"
        ALERT_MEMORY_ERROR="90"
        log_info "Monitoring disabled"
        ;;
esac

echo ""
log_success "Monitoring configuration complete (5/6)"

# ============================================================================
# 6. Generate configuration files
# ============================================================================
log_section "Step 6/6: Generate Configuration Files"

log_info "Generating configuration files..."

# Root .env
cat > .env << 'ENVEOF'
# ============================================================================
# Discord Stats App - Environment Configuration
# ============================================================================
# Environment: ENV_MODE_PLACEHOLDER
# Generated by setup-env.sh at TIMESTAMP_PLACEHOLDER
# ============================================================================

# Discord Configuration
DISCORD_CLIENT_ID=CLIENT_ID_PLACEHOLDER
DISCORD_CLIENT_SECRET=CLIENT_SECRET_PLACEHOLDER
DISCORD_BOT_TOKEN=BOT_TOKEN_PLACEHOLDER

# API Configuration
PORT=PORT_PLACEHOLDER
CLIENT_PORT=CLIENT_PORT_PLACEHOLDER

# Whitelist (optional, comma-separated)
ALLOWED_GUILD_IDS=GUILD_IDS_PLACEHOLDER

# Environment Mode
NODE_ENV=NODE_ENV_PLACEHOLDER

# ============================================================================
# Monitoring Configuration (Optional)
# ============================================================================

# Enable performance monitoring system
ENABLE_MONITORING=ENABLE_MONITORING_PLACEHOLDER

# Metrics collection interval (milliseconds)
METRICS_INTERVAL=30000

# Metrics retention period (hours)
METRICS_RETENTION_HOURS=24

# Alert thresholds
ALERT_CPU_WARN=ALERT_CPU_WARN_PLACEHOLDER
ALERT_CPU_ERROR=ALERT_CPU_ERROR_PLACEHOLDER
ALERT_MEMORY_WARN=ALERT_MEMORY_WARN_PLACEHOLDER
ALERT_MEMORY_ERROR=ALERT_MEMORY_ERROR_PLACEHOLDER

# Admin token for accessing monitoring endpoints
ADMIN_TOKEN=ADMIN_TOKEN_PLACEHOLDER

# ============================================================================
# Webhook Notification Configuration (Optional)
# ============================================================================

# Enable webhook notifications for ERROR level alerts
WEBHOOK_ENABLED=WEBHOOK_ENABLED_PLACEHOLDER

# Discord Webhook URLs (comma-separated for multiple webhooks)
WEBHOOK_URLS=WEBHOOK_URLS_PLACEHOLDER
ENVEOF

# Replace placeholders (cross-platform compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|ENV_MODE_PLACEHOLDER|$ENV_MODE|g" .env
    sed -i '' "s|TIMESTAMP_PLACEHOLDER|$(date)|g" .env
    sed -i '' "s|CLIENT_ID_PLACEHOLDER|$DISCORD_CLIENT_ID|g" .env
    sed -i '' "s|CLIENT_SECRET_PLACEHOLDER|$DISCORD_CLIENT_SECRET|g" .env
    sed -i '' "s|BOT_TOKEN_PLACEHOLDER|$DISCORD_BOT_TOKEN|g" .env
    sed -i '' "s|PORT_PLACEHOLDER|$PORT|g" .env
    sed -i '' "s|CLIENT_PORT_PLACEHOLDER|$CLIENT_PORT|g" .env
    sed -i '' "s|GUILD_IDS_PLACEHOLDER|$ALLOWED_GUILD_IDS|g" .env
    sed -i '' "s|NODE_ENV_PLACEHOLDER|$ENV_MODE|g" .env
    sed -i '' "s|ENABLE_MONITORING_PLACEHOLDER|$ENABLE_MONITORING|g" .env
    sed -i '' "s|ALERT_CPU_WARN_PLACEHOLDER|$ALERT_CPU_WARN|g" .env
    sed -i '' "s|ALERT_CPU_ERROR_PLACEHOLDER|$ALERT_CPU_ERROR|g" .env
    sed -i '' "s|ALERT_MEMORY_WARN_PLACEHOLDER|$ALERT_MEMORY_WARN|g" .env
    sed -i '' "s|ALERT_MEMORY_ERROR_PLACEHOLDER|$ALERT_MEMORY_ERROR|g" .env
    sed -i '' "s|ADMIN_TOKEN_PLACEHOLDER|$ADMIN_TOKEN|g" .env
    sed -i '' "s|WEBHOOK_ENABLED_PLACEHOLDER|$WEBHOOK_ENABLED|g" .env
    sed -i '' "s|WEBHOOK_URLS_PLACEHOLDER|$WEBHOOK_URLS|g" .env
else
    # Linux
    sed -i "s|ENV_MODE_PLACEHOLDER|$ENV_MODE|g" .env
    sed -i "s|TIMESTAMP_PLACEHOLDER|$(date)|g" .env
    sed -i "s|CLIENT_ID_PLACEHOLDER|$DISCORD_CLIENT_ID|g" .env
    sed -i "s|CLIENT_SECRET_PLACEHOLDER|$DISCORD_CLIENT_SECRET|g" .env
    sed -i "s|BOT_TOKEN_PLACEHOLDER|$DISCORD_BOT_TOKEN|g" .env
    sed -i "s|PORT_PLACEHOLDER|$PORT|g" .env
    sed -i "s|CLIENT_PORT_PLACEHOLDER|$CLIENT_PORT|g" .env
    sed -i "s|GUILD_IDS_PLACEHOLDER|$ALLOWED_GUILD_IDS|g" .env
    sed -i "s|NODE_ENV_PLACEHOLDER|$ENV_MODE|g" .env
    sed -i "s|ENABLE_MONITORING_PLACEHOLDER|$ENABLE_MONITORING|g" .env
    sed -i "s|ALERT_CPU_WARN_PLACEHOLDER|$ALERT_CPU_WARN|g" .env
    sed -i "s|ALERT_CPU_ERROR_PLACEHOLDER|$ALERT_CPU_ERROR|g" .env
    sed -i "s|ALERT_MEMORY_WARN_PLACEHOLDER|$ALERT_MEMORY_WARN|g" .env
    sed -i "s|ALERT_MEMORY_ERROR_PLACEHOLDER|$ALERT_MEMORY_ERROR|g" .env
    sed -i "s|ADMIN_TOKEN_PLACEHOLDER|$ADMIN_TOKEN|g" .env
    sed -i "s|WEBHOOK_ENABLED_PLACEHOLDER|$WEBHOOK_ENABLED|g" .env
    sed -i "s|WEBHOOK_URLS_PLACEHOLDER|$WEBHOOK_URLS|g" .env
fi

log_success "Created .env"

# Bot .env
cat > bot/.env << 'ENVEOF'
# ============================================================================
# Discord Bot Configuration
# ============================================================================
# Environment: ENV_MODE_PLACEHOLDER
# Generated by setup-env.sh at TIMESTAMP_PLACEHOLDER
# ============================================================================

# Discord Configuration
DISCORD_BOT_TOKEN=BOT_TOKEN_PLACEHOLDER
DISCORD_CLIENT_ID=CLIENT_ID_PLACEHOLDER
DISCORD_APPLICATION_ID=CLIENT_ID_PLACEHOLDER

# Whitelist (comma-separated server IDs)
ALLOWED_GUILD_IDS=GUILD_IDS_PLACEHOLDER

# Embedded App URL (for development)
EMBEDDED_APP_URL=EMBEDDED_APP_URL_PLACEHOLDER

# Database Configuration
DB_HOST=DB_HOST_PLACEHOLDER
DB_PORT=DB_PORT_PLACEHOLDER
DB_NAME=DB_NAME_PLACEHOLDER
DB_USER=DB_USER_PLACEHOLDER
DB_PASSWORD=DB_PASSWORD_PLACEHOLDER

# Environment Mode
NODE_ENV=NODE_ENV_PLACEHOLDER
ENVEOF

# Set EMBEDDED_APP_URL based on environment
if [ "$ENV_MODE" = "development" ]; then
    EMBEDDED_APP_URL="http://localhost:$CLIENT_PORT"
else
    EMBEDDED_APP_URL="$NEXT_PUBLIC_API_URL"
fi

# Replace placeholders (cross-platform compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|ENV_MODE_PLACEHOLDER|$ENV_MODE|g" bot/.env
    sed -i '' "s|TIMESTAMP_PLACEHOLDER|$(date)|g" bot/.env
    sed -i '' "s|CLIENT_ID_PLACEHOLDER|$DISCORD_CLIENT_ID|g" bot/.env
    sed -i '' "s|BOT_TOKEN_PLACEHOLDER|$DISCORD_BOT_TOKEN|g" bot/.env
    sed -i '' "s|GUILD_IDS_PLACEHOLDER|$ALLOWED_GUILD_IDS|g" bot/.env
    sed -i '' "s|EMBEDDED_APP_URL_PLACEHOLDER|$EMBEDDED_APP_URL|g" bot/.env
    sed -i '' "s|DB_HOST_PLACEHOLDER|$DB_HOST|g" bot/.env
    sed -i '' "s|DB_PORT_PLACEHOLDER|$DB_PORT|g" bot/.env
    sed -i '' "s|DB_NAME_PLACEHOLDER|$DB_NAME|g" bot/.env
    sed -i '' "s|DB_USER_PLACEHOLDER|$DB_USER|g" bot/.env
    sed -i '' "s|DB_PASSWORD_PLACEHOLDER|$DB_PASSWORD|g" bot/.env
    sed -i '' "s|NODE_ENV_PLACEHOLDER|$ENV_MODE|g" bot/.env
else
    # Linux
    sed -i "s|ENV_MODE_PLACEHOLDER|$ENV_MODE|g" bot/.env
    sed -i "s|TIMESTAMP_PLACEHOLDER|$(date)|g" bot/.env
    sed -i "s|CLIENT_ID_PLACEHOLDER|$DISCORD_CLIENT_ID|g" bot/.env
    sed -i "s|BOT_TOKEN_PLACEHOLDER|$DISCORD_BOT_TOKEN|g" bot/.env
    sed -i "s|GUILD_IDS_PLACEHOLDER|$ALLOWED_GUILD_IDS|g" bot/.env
    sed -i "s|EMBEDDED_APP_URL_PLACEHOLDER|$EMBEDDED_APP_URL|g" bot/.env
    sed -i "s|DB_HOST_PLACEHOLDER|$DB_HOST|g" bot/.env
    sed -i "s|DB_PORT_PLACEHOLDER|$DB_PORT|g" bot/.env
    sed -i "s|DB_NAME_PLACEHOLDER|$DB_NAME|g" bot/.env
    sed -i "s|DB_USER_PLACEHOLDER|$DB_USER|g" bot/.env
    sed -i "s|DB_PASSWORD_PLACEHOLDER|$DB_PASSWORD|g" bot/.env
    sed -i "s|NODE_ENV_PLACEHOLDER|$ENV_MODE|g" bot/.env
fi

log_success "Created bot/.env"

# Client .env.local
cat > client/.env.local << 'ENVEOF'
# ============================================================================
# Next.js Frontend Configuration
# ============================================================================
# Environment: ENV_MODE_PLACEHOLDER
# Generated by setup-env.sh at TIMESTAMP_PLACEHOLDER
# ============================================================================

# Discord Configuration
NEXT_PUBLIC_DISCORD_CLIENT_ID=CLIENT_ID_PLACEHOLDER

# Backend URL (Server-side only, for Next.js API routes)
BACKEND_URL=BACKEND_URL_PLACEHOLDER

# Development Mode
NEXT_PUBLIC_ENABLE_DEV_MODE=DEV_MODE_PLACEHOLDER
NEXT_PUBLIC_DEV_GUILD_ID=DEV_GUILD_PLACEHOLDER
NEXT_PUBLIC_DEV_USER_ID=DEV_USER_PLACEHOLDER

# Environment Mode
NODE_ENV=NODE_ENV_PLACEHOLDER
ENVEOF

# Set BACKEND_URL (server-side API URL for Next.js API routes)
if [ "$ENV_MODE" = "development" ]; then
    BACKEND_URL="http://localhost:$PORT"
else
    BACKEND_URL="$NEXT_PUBLIC_API_URL"
fi

# Replace placeholders (cross-platform compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|ENV_MODE_PLACEHOLDER|$ENV_MODE|g" client/.env.local
    sed -i '' "s|TIMESTAMP_PLACEHOLDER|$(date)|g" client/.env.local
    sed -i '' "s|CLIENT_ID_PLACEHOLDER|$DISCORD_CLIENT_ID|g" client/.env.local
    sed -i '' "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" client/.env.local
    sed -i '' "s|DEV_MODE_PLACEHOLDER|$NEXT_PUBLIC_ENABLE_DEV_MODE|g" client/.env.local
    sed -i '' "s|DEV_GUILD_PLACEHOLDER|$NEXT_PUBLIC_DEV_GUILD_ID|g" client/.env.local
    sed -i '' "s|DEV_USER_PLACEHOLDER|$NEXT_PUBLIC_DEV_USER_ID|g" client/.env.local
    sed -i '' "s|NODE_ENV_PLACEHOLDER|$ENV_MODE|g" client/.env.local
else
    # Linux
    sed -i "s|ENV_MODE_PLACEHOLDER|$ENV_MODE|g" client/.env.local
    sed -i "s|TIMESTAMP_PLACEHOLDER|$(date)|g" client/.env.local
    sed -i "s|CLIENT_ID_PLACEHOLDER|$DISCORD_CLIENT_ID|g" client/.env.local
    sed -i "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" client/.env.local
    sed -i "s|DEV_MODE_PLACEHOLDER|$NEXT_PUBLIC_ENABLE_DEV_MODE|g" client/.env.local
    sed -i "s|DEV_GUILD_PLACEHOLDER|$NEXT_PUBLIC_DEV_GUILD_ID|g" client/.env.local
    sed -i "s|DEV_USER_PLACEHOLDER|$NEXT_PUBLIC_DEV_USER_ID|g" client/.env.local
    sed -i "s|NODE_ENV_PLACEHOLDER|$ENV_MODE|g" client/.env.local
fi

log_success "Created client/.env.local"

# ============================================================================
# 6. Display summary
# ============================================================================
log_section "Configuration Complete!"

echo ""
log_success "All configuration files generated:"
echo "  - .env"
echo "  - bot/.env"
echo "  - client/.env.local"
echo ""

log_info "Configuration Summary:"
echo "  Environment: $ENV_MODE"
echo "  Discord Client ID: $DISCORD_CLIENT_ID"
echo "  Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  API Server Port: $PORT"
echo "  Client Port: $CLIENT_PORT"
echo "  Backend API URL: $NEXT_PUBLIC_API_URL"
if [ -n "$ALLOWED_GUILD_IDS" ]; then
    echo "  Whitelist: $ALLOWED_GUILD_IDS"
else
    echo "  Whitelist: Not set (allows all servers)"
fi
if [ "$NEXT_PUBLIC_ENABLE_DEV_MODE" = "true" ]; then
    echo "  Dev Mode: Enabled"
    echo "  Test Server: $NEXT_PUBLIC_DEV_GUILD_ID"
    echo "  Test User: $NEXT_PUBLIC_DEV_USER_ID"
else
    echo "  Dev Mode: Disabled"
fi
if [ "$ENABLE_MONITORING" = "true" ]; then
    echo "  Monitoring: Enabled"
    echo "  Admin Token: ${ADMIN_TOKEN:0:8}..."
    if [ "$WEBHOOK_ENABLED" = "true" ]; then
        echo "  Webhook Notifications: Enabled"
    else
        echo "  Webhook Notifications: Disabled"
    fi
else
    echo "  Monitoring: Disabled"
fi
echo ""

log_warning "Next Steps:"
echo ""

if [ "$ENV_MODE" = "development" ]; then
    echo "Development Setup:"
    echo ""
    echo "1. Initialize database:"
    echo "   createdb $DB_NAME  # if database doesn't exist"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/schema.sql"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql"
    echo ""
    echo "2. Install dependencies:"
    echo "   npm install"
    echo "   cd client && npm install && cd .."
    echo "   cd bot && npm install && cd .."
    echo ""
    echo "3. Start development servers:"
    echo "   npm run dev"
    echo ""
    echo "4. Access application:"
    echo "   http://localhost:$CLIENT_PORT"
else
    echo "Production Setup:"
    echo ""
    echo "1. Initialize database:"
    echo "   createdb $DB_NAME  # if database doesn't exist"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/schema.sql"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql"
    echo ""
    echo "2. Run one-click deployment:"
    echo "   ./deploy.sh"
    echo ""
    echo "3. Or manual deployment:"
    echo "   npm install && cd client && npm install && cd .. && cd bot && npm install && cd .."
    echo "   cd client && npm run build && cd .."
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
fi
echo ""

log_info "Need to modify configuration?"
echo "  Just edit the corresponding .env files"
echo ""

log_success "Configuration complete! Enjoy!"
echo ""
