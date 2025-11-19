#!/bin/bash

# ============================================================================
# Discord 統計應用 - 一鍵部署腳本
# ============================================================================
# 使用方式: ./deploy.sh
# 
# 此腳本會：
# 1. 檢查環境和依賴
# 2. 安裝所有 npm 套件
# 3. 設置資料庫
# 4. 構建前端
# 5. 停止現有 Discord 應用進程（不影響其他 PM2 進程）
# 6. 使用 PM2 啟動所有服務
# 
# 安全保證：
# - 只操作 Discord 應用的進程（discord-server, discord-client, discord-app）
# - 不使用 pm2 delete all 等全域命令
# - 不會影響系統中的其他 PM2 進程
# ============================================================================

set -e  # 遇到錯誤立即退出

# 引入 PM2 安全操作函數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/pm2-utils.sh"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}$1${NC}"
    echo "============================================================================"
}

# 檢查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安裝"
        return 1
    else
        log_success "$1 已安裝"
        return 0
    fi
}

# 檢查文件是否存在
check_file() {
    if [ ! -f "$1" ]; then
        log_error "找不到文件: $1"
        return 1
    else
        log_success "找到文件: $1"
        return 0
    fi
}

# ============================================================================
# 1. 環境檢查
# ============================================================================
log_section "步驟 1: 檢查環境"

log_info "檢查必要的命令..."
MISSING_DEPS=0

check_command "node" || MISSING_DEPS=1
check_command "npm" || MISSING_DEPS=1
check_command "psql" || MISSING_DEPS=1
check_command "pm2" || {
    log_warning "PM2 未安裝，正在安裝..."
    npm install -g pm2
    log_success "PM2 安裝完成"
}

if [ $MISSING_DEPS -eq 1 ]; then
    log_error "缺少必要的依賴，請先安裝 Node.js 和 PostgreSQL"
    exit 1
fi

# 顯示版本信息
log_info "環境信息:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  PostgreSQL: $(psql --version | head -n 1)"
echo "  PM2: $(pm2 --version)"

# ============================================================================
# 2. 檢查配置文件
# ============================================================================
log_section "步驟 2: 檢查配置文件"

MISSING_CONFIG=0

# 檢查根目錄 .env
if [ ! -f ".env" ]; then
    log_warning "根目錄 .env 不存在，從範例創建..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning "請編輯 .env 文件並填入正確的配置"
        MISSING_CONFIG=1
    else
        log_error "找不到 .env.example"
        exit 1
    fi
else
    log_success "根目錄 .env 存在"
fi

# 檢查 bot/.env
if [ ! -f "bot/.env" ]; then
    log_warning "bot/.env 不存在，從範例創建..."
    if [ -f "bot/.env.example" ]; then
        cp bot/.env.example bot/.env
        log_warning "請編輯 bot/.env 文件並填入正確的配置"
        MISSING_CONFIG=1
    else
        log_error "找不到 bot/.env.example"
        exit 1
    fi
else
    log_success "bot/.env 存在"
fi

# 檢查 client/.env.local
if [ ! -f "client/.env.local" ]; then
    log_warning "client/.env.local 不存在，從範例創建..."
    if [ -f "client/.env.example" ]; then
        cp client/.env.example client/.env.local
        log_warning "請編輯 client/.env.local 文件並填入正確的配置"
        MISSING_CONFIG=1
    else
        log_error "找不到 client/.env.example"
        exit 1
    fi
else
    log_success "client/.env.local 存在"
fi

if [ $MISSING_CONFIG -eq 1 ]; then
    log_error "配置文件不完整，請先完成配置後再運行此腳本"
    exit 1
fi

# ============================================================================
# 3. 安裝依賴
# ============================================================================
log_section "步驟 3: 安裝依賴"

log_info "安裝根目錄依賴..."
npm install
log_success "根目錄依賴安裝完成"

log_info "安裝 bot 依賴..."
cd bot && npm install && cd ..
log_success "Bot 依賴安裝完成"

log_info "安裝 client 依賴..."
cd client && npm install && cd ..
log_success "Client 依賴安裝完成"

# ============================================================================
# 4. 資料庫設置
# ============================================================================
log_section "步驟 4: 資料庫設置"

# 載入環境變數
if [ -f "bot/.env" ]; then
    export $(cat bot/.env | grep -v '^#' | xargs)
fi

log_info "資料庫連接信息:"
echo "  Host: ${DB_HOST:-localhost}"
echo "  Port: ${DB_PORT:-5432}"
echo "  Database: ${DB_NAME:-discord_stats}"
echo "  User: ${DB_USER:-postgres}"

# 詢問是否要初始化資料庫
read -p "是否要初始化/更新資料庫？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "執行資料庫架構..."
    
    # 執行主架構
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/schema.sql
    log_success "主架構執行完成"
    
    # 執行討論串支援升級
    if [ -f "bot/database/add_thread_support.sql" ]; then
        log_info "添加討論串支援..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql
        log_success "討論串支援添加完成"
    fi
    
    # 執行附件支援升級
    if [ -f "bot/database/add_attachments.sql" ]; then
        log_info "添加附件支援..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql
        log_success "附件支援添加完成"
    fi
    
    log_success "資料庫設置完成"
else
    log_warning "跳過資料庫初始化"
fi

# ============================================================================
# 4.5. 進程模式選擇
# ============================================================================
log_section "步驟 4.5: 進程模式選擇"

echo ""
echo "選擇進程模式:"
echo "  1) 雙進程模式（推薦）- 更好的故障隔離和監控"
echo "     • discord-server (API + Bot)"
echo "     • discord-client (Next.js)"
echo "     • 記憶體使用: ~350-550MB"
echo "     • 適合生產環境"
echo ""
echo "  2) 單進程模式 - 節省約 50-100MB 記憶體"
echo "     • discord-app (API + Bot + Next.js)"
echo "     • 記憶體使用: ~300-450MB"
echo "     • 適合資源受限環境"
echo ""
read -p "請選擇 [1-2] (預設: 1): " process_mode

case $process_mode in
    2)
        PROCESS_MODE="single"
        log_success "選擇單進程模式"
        ;;
    *)
        PROCESS_MODE="dual"
        log_success "選擇雙進程模式"
        ;;
esac

# 寫入 .env
if [ -f ".env" ]; then
    if grep -q "^PROCESS_MODE=" .env; then
        sed -i "s/^PROCESS_MODE=.*/PROCESS_MODE=$PROCESS_MODE/" .env
    else
        echo "PROCESS_MODE=$PROCESS_MODE" >> .env
    fi
else
    echo "PROCESS_MODE=$PROCESS_MODE" > .env
fi

log_success "進程模式已設定為: $PROCESS_MODE"

# ============================================================================
# 5. 構建前端
# ============================================================================
log_section "步驟 5: 構建前端"

log_info "構建 Next.js 應用..."
cd client && npm run build && cd ..
log_success "前端構建完成"

# ============================================================================
# 6. 停止現有 Discord 應用服務
# ============================================================================
log_section "步驟 6: 停止現有 Discord 應用服務"

log_info "清理現有的 Discord 應用進程（不影響其他 PM2 進程）..."
cleanup_discord_processes
log_success "Discord 應用進程已清理"

# ============================================================================
# 7. 啟動服務
# ============================================================================
log_section "步驟 7: 啟動服務"

log_info "使用 PM2 啟動所有服務（模式: $PROCESS_MODE）..."

# 根據進程模式選擇配置文件
if [ "$PROCESS_MODE" = "single" ]; then
    CONFIG_FILE="ecosystem.single.config.js"
else
    CONFIG_FILE="ecosystem.dual.config.js"
fi

# 檢查配置文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "找不到 $CONFIG_FILE"
    exit 1
fi

# 啟動服務
pm2 start $CONFIG_FILE
log_success "服務啟動完成"

# 保存 PM2 配置
pm2 save
log_success "PM2 配置已保存"

# 設置 PM2 開機自啟
pm2 startup | tail -n 1 | bash || log_warning "無法設置開機自啟，可能需要 sudo 權限"

# ============================================================================
# 8. 顯示狀態
# ============================================================================
log_section "步驟 8: 服務狀態"

sleep 3  # 等待服務啟動

pm2 status

# ============================================================================
# 9. 健康檢查
# ============================================================================
log_section "步驟 9: 健康檢查"

log_info "等待服務啟動..."
sleep 5

# 載入環境變數
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# 檢查 API 服務
log_info "檢查 API 服務..."
API_PORT=${PORT:-3008}
if curl -s http://localhost:${API_PORT}/health > /dev/null 2>&1; then
    log_success "API 服務運行正常 (http://localhost:${API_PORT})"
else
    log_warning "API 服務可能未正常啟動"
fi

# 檢查 Client 服務
log_info "檢查 Client 服務..."
CLIENT_PORT_VAL=${CLIENT_PORT:-3000}
if curl -s http://localhost:${CLIENT_PORT_VAL} > /dev/null 2>&1; then
    log_success "Client 服務運行正常 (http://localhost:${CLIENT_PORT_VAL})"
else
    log_warning "Client 服務可能未正常啟動"
fi

# ============================================================================
# 完成
# ============================================================================
log_section "部署完成！"

echo ""
log_success "所有服務已成功部署並啟動"
echo ""
echo "📊 服務信息:"
echo "  - API Server: http://localhost:${PORT:-3008}"
echo "  - Client: http://localhost:${CLIENT_PORT:-3000}"
echo "  - Bot: 運行中"
echo ""
echo "📝 常用命令:"
echo "  - 查看狀態: pm2 status"
echo "  - 查看日誌: pm2 logs"
echo "  - 管理服務: ./manage.sh [start|stop|restart|status]"
echo "  - 查看 Server 日誌: pm2 logs discord-server (雙進程) 或 pm2 logs discord-app (單進程)"
echo "  - 查看 Client 日誌: pm2 logs discord-client (僅雙進程模式)"
echo ""
echo "⚠️  安全提醒:"
echo "   • 本腳本只操作 Discord 應用進程（discord-server, discord-client, discord-app）"
echo "   • 不會影響系統中的其他 PM2 進程"
echo "   • 請使用 ./manage.sh 管理服務，避免使用 pm2 全域命令（如 pm2 stop all, pm2 delete all）"
echo ""
echo "🔧 下一步:"
echo "  1. 確認所有服務運行正常: pm2 status"
echo "  2. 檢查日誌是否有錯誤: pm2 logs"
echo "  3. 在 Discord 開發者平台配置 Activity URL"
echo "  4. 測試應用功能"
echo ""
log_info "如有問題，請查看日誌: pm2 logs"
echo ""
