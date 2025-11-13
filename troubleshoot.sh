#!/bin/bash

# ============================================================================
# Discord 統計應用 - 故障排查腳本
# ============================================================================

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "============================================================================"
echo "Discord 統計應用 - 故障排查"
echo "============================================================================"
echo ""

# 1. 檢查環境變數文件
log_info "步驟 1: 檢查環境變數文件"
echo ""

if [ -f ".env" ]; then
    log_success "根目錄 .env 存在"
    echo "內容:"
    cat .env | grep -v "PASSWORD\|SECRET\|TOKEN" | grep -v "^#" | grep -v "^$"
else
    log_warning "根目錄 .env 不存在"
fi
echo ""

if [ -f "bot/.env" ]; then
    log_success "bot/.env 存在"
    echo "內容:"
    cat bot/.env | grep -v "PASSWORD\|SECRET\|TOKEN" | grep -v "^#" | grep -v "^$"
else
    log_error "bot/.env 不存在"
fi
echo ""

if [ -f "client/.env.local" ]; then
    log_success "client/.env.local 存在"
    echo "內容:"
    cat client/.env.local | grep -v "PASSWORD\|SECRET\|TOKEN" | grep -v "^#" | grep -v "^$"
else
    log_warning "client/.env.local 不存在"
fi
echo ""

# 2. 檢查 PM2 進程
log_info "步驟 2: 檢查 PM2 進程狀態"
echo ""
pm2 list
echo ""

# 3. 檢查端口占用
log_info "步驟 3: 檢查端口占用"
echo ""

# 從環境變數讀取端口
if [ -f "bot/.env" ]; then
    export $(cat bot/.env | grep -v '^#' | grep -v '^$' | xargs)
fi
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

SERVER_PORT=${PORT:-3008}
CLIENT_PORT=${CLIENT_PORT:-3000}

log_info "檢查 Server 端口 ${SERVER_PORT}..."
if netstat -tuln 2>/dev/null | grep ":${SERVER_PORT}" > /dev/null; then
    log_success "端口 ${SERVER_PORT} 正在監聽"
    netstat -tuln | grep ":${SERVER_PORT}"
else
    if ss -tuln 2>/dev/null | grep ":${SERVER_PORT}" > /dev/null; then
        log_success "端口 ${SERVER_PORT} 正在監聽"
        ss -tuln | grep ":${SERVER_PORT}"
    else
        log_error "端口 ${SERVER_PORT} 沒有監聽"
    fi
fi
echo ""

log_info "檢查 Client 端口 ${CLIENT_PORT}..."
if netstat -tuln 2>/dev/null | grep ":${CLIENT_PORT}" > /dev/null; then
    log_success "端口 ${CLIENT_PORT} 正在監聽"
    netstat -tuln | grep ":${CLIENT_PORT}"
else
    if ss -tuln 2>/dev/null | grep ":${CLIENT_PORT}" > /dev/null; then
        log_success "端口 ${CLIENT_PORT} 正在監聽"
        ss -tuln | grep ":${CLIENT_PORT}"
    else
        log_error "端口 ${CLIENT_PORT} 沒有監聽"
    fi
fi
echo ""

# 4. 測試 API 端點
log_info "步驟 4: 測試 API 端點"
echo ""

log_info "測試 /health 端點 (http://localhost:${SERVER_PORT}/health)..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:${SERVER_PORT}/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "API 健康檢查成功"
    echo "響應: $RESPONSE_BODY"
else
    log_error "API 健康檢查失敗 (HTTP $HTTP_CODE)"
    echo "響應: $RESPONSE_BODY"
fi
echo ""

log_info "測試 /api/auth/token 端點..."
if curl -s http://localhost:${SERVER_PORT}/api/auth/token > /dev/null 2>&1; then
    log_success "/api/auth/token 端點可訪問"
else
    log_error "/api/auth/token 端點無法訪問"
fi
echo ""

# 5. 檢查資料庫連接
log_info "步驟 5: 檢查資料庫連接"
echo ""

if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    log_info "資料庫配置:"
    echo "  Host: $DB_HOST"
    echo "  Port: ${DB_PORT:-5432}"
    echo "  User: $DB_USER"
    echo "  Database: $DB_NAME"
    echo ""
    
    if command -v psql &> /dev/null; then
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
            log_success "資料庫連接正常"
        else
            log_error "資料庫連接失敗"
        fi
    else
        log_warning "psql 未安裝，無法測試資料庫連接"
    fi
else
    log_warning "資料庫配置不完整"
fi
echo ""

# 6. 查看最近的日誌
log_info "步驟 6: 查看最近的服務日誌"
echo ""

log_info "discord-server 最近 20 行日誌:"
echo "----------------------------------------"
pm2 logs discord-server --lines 20 --nostream 2>/dev/null || log_warning "無法獲取 discord-server 日誌"
echo ""

log_info "discord-client 最近 20 行日誌:"
echo "----------------------------------------"
pm2 logs discord-client --lines 20 --nostream 2>/dev/null || log_warning "無法獲取 discord-client 日誌"
echo ""

# 7. 檢查 Next.js 構建
log_info "步驟 7: 檢查 Next.js 構建"
echo ""

if [ -d "client/.next" ]; then
    log_success "client/.next 目錄存在"
    BUILD_TIME=$(stat -c %y client/.next 2>/dev/null || stat -f "%Sm" client/.next 2>/dev/null)
    echo "構建時間: $BUILD_TIME"
else
    log_error "client/.next 目錄不存在，需要重新構建"
fi
echo ""

# 8. 總結
echo "============================================================================"
log_info "排查完成！"
echo "============================================================================"
echo ""
echo "📝 常見問題解決方案:"
echo ""
echo "1. 如果 API 服務異常:"
echo "   - 檢查 .env 或 bot/.env 中的 PORT 設定"
echo "   - 查看 pm2 logs discord-server 的錯誤訊息"
echo "   - 嘗試重啟: pm2 restart discord-server --update-env"
echo ""
echo "2. 如果前端無法獲取用戶 ID:"
echo "   - 確認 client/.env.local 中有 BACKEND_URL"
echo "   - 確認 Next.js 已重新構建: cd client && npm run build"
echo "   - 重啟前端: pm2 restart discord-client --update-env"
echo ""
echo "3. 如果資料庫連接失敗:"
echo "   - 檢查 bot/.env 中的資料庫配置"
echo "   - 確認 PostgreSQL 服務正在運行"
echo ""
echo "4. 查看詳細日誌:"
echo "   pm2 logs discord-server --lines 50"
echo "   pm2 logs discord-client --lines 50"
echo ""
