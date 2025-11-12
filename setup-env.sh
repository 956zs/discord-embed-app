#!/bin/bash

# ============================================================================
# Discord 統計應用 - 環境配置工具
# ============================================================================
# 使用方式: ./setup-env.sh
# 
# 此腳本會引導你完成所有環境變數的配置
# ============================================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 讀取用戶輸入
read_input() {
    local prompt="$1"
    local default="$2"
    local secret="$3"
    
    if [ -n "$default" ]; then
        echo -ne "${BLUE}$prompt${NC} ${YELLOW}[預設: $default]${NC}: "
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

# 驗證必填項
validate_required() {
    local value="$1"
    local name="$2"
    
    if [ -z "$value" ]; then
        log_error "$name 不能為空！"
        return 1
    fi
    return 0
}

# 測試資料庫連接
test_db_connection() {
    local host="$1"
    local port="$2"
    local user="$3"
    local password="$4"
    local dbname="$5"
    
    log_info "測試資料庫連接..."
    
    if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$dbname" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "資料庫連接成功！"
        return 0
    else
        log_error "資料庫連接失敗！"
        return 1
    fi
}

# ============================================================================
# 開始配置
# ============================================================================

clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Discord 伺服器統計與可視化 Embedded App                    ║
║   環境配置工具                                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info "此工具將引導你完成所有環境變數的配置"
log_warning "請準備好以下資訊："
echo "  • Discord Bot Token"
echo "  • Discord Application Client ID 和 Secret"
echo "  • PostgreSQL 資料庫連接資訊"
echo "  • Discord 伺服器 ID（可選）"
echo ""
read -p "按 Enter 繼續..."

# ============================================================================
# 1. Discord 配置
# ============================================================================
log_section "步驟 1: Discord 配置"

log_info "請前往 Discord Developer Portal 獲取以下資訊："
echo "  https://discord.com/developers/applications"
echo ""

DISCORD_BOT_TOKEN=$(read_input "Discord Bot Token" "" "true")
validate_required "$DISCORD_BOT_TOKEN" "Bot Token" || exit 1

DISCORD_CLIENT_ID=$(read_input "Discord Client ID" "")
validate_required "$DISCORD_CLIENT_ID" "Client ID" || exit 1

DISCORD_CLIENT_SECRET=$(read_input "Discord Client Secret" "" "true")
validate_required "$DISCORD_CLIENT_SECRET" "Client Secret" || exit 1

log_success "Discord 配置完成"

# ============================================================================
# 2. 資料庫配置
# ============================================================================
log_section "步驟 2: PostgreSQL 資料庫配置"

DB_HOST=$(read_input "資料庫主機" "localhost")
DB_PORT=$(read_input "資料庫端口" "5432")
DB_NAME=$(read_input "資料庫名稱" "discord_stats")
DB_USER=$(read_input "資料庫用戶" "postgres")
DB_PASSWORD=$(read_input "資料庫密碼" "" "true")

validate_required "$DB_PASSWORD" "資料庫密碼" || exit 1

# 測試連接
if ! test_db_connection "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASSWORD" "$DB_NAME"; then
    log_warning "資料庫連接失敗，但配置將繼續"
    log_info "請確保稍後手動創建資料庫："
    echo "  createdb $DB_NAME"
    echo ""
    read -p "按 Enter 繼續..."
fi

log_success "資料庫配置完成"

# ============================================================================
# 3. 伺服器配置
# ============================================================================
log_section "步驟 3: 伺服器配置"

PORT=$(read_input "API Server 端口" "3008")

log_info "白名單配置（可選）"
echo "  如果你只想收集特定伺服器的數據，請輸入伺服器 ID"
echo "  多個伺服器用逗號分隔，留空表示允許所有伺服器"
echo ""
ALLOWED_GUILD_IDS=$(read_input "允許的伺服器 ID（可選）" "")

log_success "伺服器配置完成"

# ============================================================================
# 4. 前端配置
# ============================================================================
log_section "步驟 4: 前端配置"

log_info "開發模式配置（可選）"
echo "  開發模式允許你在本地測試，無需 Discord Embedded App"
echo ""

ENABLE_DEV_MODE=$(read_input "啟用開發模式？(y/n)" "n")
if [[ "$ENABLE_DEV_MODE" =~ ^[Yy]$ ]]; then
    NEXT_PUBLIC_ENABLE_DEV_MODE="true"
    NEXT_PUBLIC_DEV_GUILD_ID=$(read_input "測試用伺服器 ID" "")
    NEXT_PUBLIC_DEV_USER_ID=$(read_input "測試用用戶 ID" "")
else
    NEXT_PUBLIC_ENABLE_DEV_MODE="false"
    NEXT_PUBLIC_DEV_GUILD_ID=""
    NEXT_PUBLIC_DEV_USER_ID=""
fi

NEXT_PUBLIC_API_URL=$(read_input "API URL（生產環境）" "http://localhost:3008")

log_success "前端配置完成"

# ============================================================================
# 5. 生成配置文件
# ============================================================================
log_section "步驟 5: 生成配置文件"

log_info "正在生成配置文件..."

# 根目錄 .env
cat > .env << EOF
# ============================================================================
# Discord 統計應用 - 環境配置
# ============================================================================
# 由 setup-env.sh 自動生成於 $(date)
# ============================================================================

# Discord 配置
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN

# API 配置
PORT=$PORT

# 白名單（可選，逗號分隔）
ALLOWED_GUILD_IDS=$ALLOWED_GUILD_IDS
EOF

log_success "已創建 .env"

# Bot .env
cat > bot/.env << EOF
# ============================================================================
# Discord Bot 配置
# ============================================================================
# 由 setup-env.sh 自動生成於 $(date)
# ============================================================================

# 資料庫配置
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Discord Bot Token
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN

# 白名單（與根目錄相同）
ALLOWED_GUILD_IDS=$ALLOWED_GUILD_IDS
EOF

log_success "已創建 bot/.env"

# Client .env.local
cat > client/.env.local << EOF
# ============================================================================
# Next.js 前端配置
# ============================================================================
# 由 setup-env.sh 自動生成於 $(date)
# ============================================================================

# Discord 配置
NEXT_PUBLIC_DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID

# API URL（生產環境）
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 開發模式（可選）
NEXT_PUBLIC_ENABLE_DEV_MODE=$NEXT_PUBLIC_ENABLE_DEV_MODE
NEXT_PUBLIC_DEV_GUILD_ID=$NEXT_PUBLIC_DEV_GUILD_ID
NEXT_PUBLIC_DEV_USER_ID=$NEXT_PUBLIC_DEV_USER_ID
EOF

log_success "已創建 client/.env.local"

# ============================================================================
# 6. 顯示摘要
# ============================================================================
log_section "配置完成！"

echo ""
log_success "所有配置文件已生成："
echo "  ✓ .env"
echo "  ✓ bot/.env"
echo "  ✓ client/.env.local"
echo ""

log_info "配置摘要："
echo "  Discord Client ID: $DISCORD_CLIENT_ID"
echo "  資料庫: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  API 端口: $PORT"
if [ -n "$ALLOWED_GUILD_IDS" ]; then
    echo "  白名單: $ALLOWED_GUILD_IDS"
else
    echo "  白名單: 未設置（允許所有伺服器）"
fi
echo ""

log_warning "下一步："
echo ""
echo "1. 初始化資料庫："
echo "   createdb $DB_NAME  # 如果資料庫不存在"
echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/schema.sql"
echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql"
echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql"
echo ""
echo "2. 安裝依賴："
echo "   npm install"
echo "   cd client && npm install && cd .."
echo "   cd bot && npm install && cd .."
echo ""
echo "3. 啟動應用："
echo "   開發模式: npm run dev"
echo "   生產模式: ./deploy.sh"
echo ""

log_info "需要修改配置？"
echo "  直接編輯對應的 .env 文件即可"
echo ""

log_success "配置完成！祝你使用愉快 🎉"
echo ""
