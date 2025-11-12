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
║   Discord 伺服器統計與可視化 Embedded App                     ║
║   環境配置工具                                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info "此工具將引導你完成所有環境變數的配置"
echo ""

# 選擇環境類型
log_section "選擇環境類型"
echo ""
echo "  1) 開發環境 (Development)"
echo "     - 適合本地開發和測試"
echo "     - 啟用開發模式功能"
echo "     - 使用 localhost"
echo ""
echo "  2) 生產環境 (Production)"
echo "     - 適合部署到伺服器"
echo "     - 使用實際域名"
echo "     - 優化的安全設置"
echo ""

while true; do
    read -p "請選擇環境類型 (1 或 2): " ENV_TYPE
    case $ENV_TYPE in
        1)
            ENV_MODE="development"
            log_success "已選擇：開發環境"
            break
            ;;
        2)
            ENV_MODE="production"
            log_success "已選擇：生產環境"
            break
            ;;
        *)
            log_error "請輸入 1 或 2"
            ;;
    esac
done

echo ""
log_warning "配置流程包含 4 個步驟："
echo "  步驟 1/4 - Discord 配置（Bot Token、Client ID、Client Secret）"
echo "  步驟 2/4 - PostgreSQL 資料庫配置"
echo "  步驟 3/4 - 伺服器配置（端口、白名單）"
echo "  步驟 4/4 - 前端配置（開發模式、API URL）"
echo ""
log_info "請準備好以下資訊："
echo "  ✓ Discord Bot Token"
echo "  ✓ Discord Application Client ID 和 Secret"
echo "  ✓ PostgreSQL 資料庫連接資訊"
echo "  ○ Discord 伺服器 ID（可選）"
echo ""
log_info "預計需要 5-10 分鐘完成配置"
echo ""
read -p "準備好了嗎？按 Enter 開始配置..."

# ============================================================================
# 1. Discord 配置
# ============================================================================
log_section "步驟 1/4: Discord 配置"

log_info "請前往 Discord Developer Portal 獲取以下資訊："
echo "  https://discord.com/developers/applications"
echo ""
log_warning "需要以下三項資訊："
echo "  1. Bot Token（在 Bot 頁面）"
echo "  2. Client ID（在 General Information 頁面）"
echo "  3. Client Secret（在 OAuth2 頁面）"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "1/3 - Bot Token"
echo "  這是你的 Discord Bot 的認證令牌"
echo "  位置：Bot 頁面 → Reset Token"
DISCORD_BOT_TOKEN=$(read_input "請輸入 Bot Token" "" "true")
validate_required "$DISCORD_BOT_TOKEN" "Bot Token" || exit 1
log_success "Bot Token 已設置"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "2/3 - Client ID"
echo "  這是你的 Discord Application 的唯一識別碼"
echo "  位置：General Information 頁面 → Application ID"
DISCORD_CLIENT_ID=$(read_input "請輸入 Client ID" "")
validate_required "$DISCORD_CLIENT_ID" "Client ID" || exit 1
log_success "Client ID 已設置"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "3/3 - Client Secret"
echo "  這是你的 OAuth2 認證密鑰"
echo "  位置：OAuth2 頁面 → Client Secret → Reset Secret"
DISCORD_CLIENT_SECRET=$(read_input "請輸入 Client Secret" "" "true")
validate_required "$DISCORD_CLIENT_SECRET" "Client Secret" || exit 1
log_success "Client Secret 已設置"

echo ""
log_success "✓ Discord 配置完成 (1/4)"

# ============================================================================
# 2. 資料庫配置
# ============================================================================
log_section "步驟 2/4: PostgreSQL 資料庫配置"

log_info "配置 PostgreSQL 資料庫連接資訊"
echo "  如果你還沒有創建資料庫，可以稍後執行："
echo "  createdb discord_stats"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "1/5 - 資料庫主機"
echo "  通常是 localhost（本地）或遠端伺服器 IP"
DB_HOST=$(read_input "請輸入資料庫主機" "localhost")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "2/5 - 資料庫端口"
echo "  PostgreSQL 預設端口是 5432"
DB_PORT=$(read_input "請輸入資料庫端口" "5432")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "3/5 - 資料庫名稱"
echo "  建議使用 discord_stats"
DB_NAME=$(read_input "請輸入資料庫名稱" "discord_stats")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "4/5 - 資料庫用戶"
echo "  PostgreSQL 預設用戶是 postgres"
DB_USER=$(read_input "請輸入資料庫用戶" "postgres")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "5/5 - 資料庫密碼"
echo "  輸入時不會顯示，這是正常的"
DB_PASSWORD=$(read_input "請輸入資料庫密碼" "" "true")
validate_required "$DB_PASSWORD" "資料庫密碼" || exit 1

echo ""
# 測試連接
if ! test_db_connection "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASSWORD" "$DB_NAME"; then
    log_warning "資料庫連接失敗，但配置將繼續"
    log_info "請確保稍後手動創建資料庫："
    echo "  createdb $DB_NAME"
    echo ""
    read -p "按 Enter 繼續..."
fi

log_success "✓ 資料庫配置完成 (2/4)"

# ============================================================================
# 3. 伺服器配置
# ============================================================================
log_section "步驟 3/4: 伺服器配置"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "1/2 - API Server 端口"
echo "  API 伺服器運行的端口號"
echo "  預設是 3008，確保此端口未被佔用"
PORT=$(read_input "請輸入 API Server 端口" "3008")
log_success "端口已設置為 $PORT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "2/2 - 白名單配置（可選）"
echo "  這是可選的安全功能"
echo "  如果你只想收集特定伺服器的數據，請輸入伺服器 ID"
echo "  多個伺服器用逗號分隔，例如：123456789,987654321"
echo "  ${CYAN}留空表示允許所有伺服器${NC}"
echo ""
ALLOWED_GUILD_IDS=$(read_input "允許的伺服器 ID（可選，直接按 Enter 跳過）" "")

if [ -n "$ALLOWED_GUILD_IDS" ]; then
    log_success "白名單已設置：$ALLOWED_GUILD_IDS"
else
    log_info "未設置白名單，將允許所有伺服器"
fi

echo ""
log_success "✓ 伺服器配置完成 (3/4)"

# ============================================================================
# 4. 前端配置
# ============================================================================
log_section "步驟 4/4: 前端配置"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "1/2 - 開發模式配置"

if [ "$ENV_MODE" = "development" ]; then
    log_info "開發環境：自動啟用開發模式"
    NEXT_PUBLIC_ENABLE_DEV_MODE="true"
    echo ""
    echo "  開發模式需要測試用的伺服器和用戶 ID"
    echo "  這樣你可以在本地測試，無需 Discord Embedded App"
    echo ""
    echo "  測試用伺服器 ID："
    echo "  在 Discord 中右鍵點擊伺服器圖標 → 複製 ID"
    NEXT_PUBLIC_DEV_GUILD_ID=$(read_input "  請輸入測試用伺服器 ID" "")
    echo ""
    echo "  測試用用戶 ID："
    echo "  在 Discord 中右鍵點擊你的用戶名 → 複製 ID"
    NEXT_PUBLIC_DEV_USER_ID=$(read_input "  請輸入測試用用戶 ID" "")
    log_success "開發模式配置完成"
else
    log_info "生產環境：開發模式已禁用"
    NEXT_PUBLIC_ENABLE_DEV_MODE="false"
    NEXT_PUBLIC_DEV_GUILD_ID=""
    NEXT_PUBLIC_DEV_USER_ID=""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "2/2 - API URL"

if [ "$ENV_MODE" = "development" ]; then
    log_info "開發環境：使用 localhost"
    NEXT_PUBLIC_API_URL="http://localhost:3008"
    log_success "API URL 已設置為 $NEXT_PUBLIC_API_URL"
else
    echo "  生產環境中前端訪問 API 的 URL"
    echo "  應該是你的域名，例如：https://api.yourdomain.com"
    echo "  或使用 localhost 進行本地測試"
    NEXT_PUBLIC_API_URL=$(read_input "請輸入 API URL" "http://localhost:3008")
    log_success "API URL 已設置為 $NEXT_PUBLIC_API_URL"
fi

echo ""
log_success "✓ 前端配置完成 (4/4)"

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
# 環境類型: $ENV_MODE
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

# 環境模式
NODE_ENV=$ENV_MODE
EOF

log_success "已創建 .env"

# Bot .env
cat > bot/.env << EOF
# ============================================================================
# Discord Bot 配置
# ============================================================================
# 環境類型: $ENV_MODE
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

# 環境模式
NODE_ENV=$ENV_MODE
EOF

log_success "已創建 bot/.env"

# Client .env.local
cat > client/.env.local << EOF
# ============================================================================
# Next.js 前端配置
# ============================================================================
# 環境類型: $ENV_MODE
# 由 setup-env.sh 自動生成於 $(date)
# ============================================================================

# Discord 配置
NEXT_PUBLIC_DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID

# API URL
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 開發模式
NEXT_PUBLIC_ENABLE_DEV_MODE=$NEXT_PUBLIC_ENABLE_DEV_MODE
NEXT_PUBLIC_DEV_GUILD_ID=$NEXT_PUBLIC_DEV_GUILD_ID
NEXT_PUBLIC_DEV_USER_ID=$NEXT_PUBLIC_DEV_USER_ID

# 環境模式
NODE_ENV=$ENV_MODE
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
echo "  環境類型: $ENV_MODE"
echo "  Discord Client ID: $DISCORD_CLIENT_ID"
echo "  資料庫: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  API 端口: $PORT"
echo "  API URL: $NEXT_PUBLIC_API_URL"
if [ -n "$ALLOWED_GUILD_IDS" ]; then
    echo "  白名單: $ALLOWED_GUILD_IDS"
else
    echo "  白名單: 未設置（允許所有伺服器）"
fi
if [ "$NEXT_PUBLIC_ENABLE_DEV_MODE" = "true" ]; then
    echo "  開發模式: 已啟用"
    echo "  測試伺服器: $NEXT_PUBLIC_DEV_GUILD_ID"
    echo "  測試用戶: $NEXT_PUBLIC_DEV_USER_ID"
else
    echo "  開發模式: 未啟用"
fi
echo ""

log_warning "下一步："
echo ""

if [ "$ENV_MODE" = "development" ]; then
    echo "開發環境設置："
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
    echo "3. 啟動開發服務器："
    echo "   npm run dev"
    echo ""
    echo "4. 訪問應用："
    echo "   http://localhost:3000"
else
    echo "生產環境設置："
    echo ""
    echo "1. 初始化資料庫："
    echo "   createdb $DB_NAME  # 如果資料庫不存在"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/schema.sql"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql"
    echo "   psql -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql"
    echo ""
    echo "2. 執行一鍵部署："
    echo "   ./deploy.sh"
    echo ""
    echo "3. 或手動部署："
    echo "   npm install && cd client && npm install && cd .. && cd bot && npm install && cd .."
    echo "   cd client && npm run build && cd .."
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
fi
echo ""

log_info "需要修改配置？"
echo "  直接編輯對應的 .env 文件即可"
echo ""

log_success "配置完成！祝你使用愉快 🎉"
echo ""
