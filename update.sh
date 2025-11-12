#!/bin/bash

# ============================================================================
# Discord 統計應用 - 快速更新腳本
# ============================================================================
# 使用方式: ./update.sh
# 
# 此腳本用於快速更新已部署的應用，會：
# 1. 拉取最新代碼（如果使用 git）
# 2. 更新依賴
# 3. 重新構建前端
# 4. 重啟服務
# ============================================================================

set -e

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

# ============================================================================
# 1. 拉取最新代碼
# ============================================================================
log_section "步驟 1: 更新代碼"

if [ -d ".git" ]; then
    log_info "拉取最新代碼..."
    git pull
    log_success "代碼更新完成"
else
    log_warning "不是 Git 倉庫，跳過代碼拉取"
fi

# ============================================================================
# 2. 更新依賴
# ============================================================================
log_section "步驟 2: 更新依賴"

read -p "是否要更新依賴？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "更新根目錄依賴..."
    npm install
    
    log_info "更新 bot 依賴..."
    cd bot && npm install && cd ..
    
    log_info "更新 client 依賴..."
    cd client && npm install && cd ..
    
    log_success "依賴更新完成"
else
    log_warning "跳過依賴更新"
fi

# ============================================================================
# 3. 資料庫升級
# ============================================================================
log_section "步驟 3: 資料庫升級"

read -p "是否要執行資料庫升級？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "bot/.env" ]; then
        export $(cat bot/.env | grep -v '^#' | xargs)
    fi
    
    # 執行討論串支援升級
    if [ -f "bot/database/add_thread_support.sql" ]; then
        log_info "添加討論串支援..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql 2>/dev/null || log_warning "討論串支援可能已存在"
    fi
    
    # 執行附件支援升級
    if [ -f "bot/database/add_attachments.sql" ]; then
        log_info "添加附件支援..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql 2>/dev/null || log_warning "附件支援可能已存在"
    fi
    
    log_success "資料庫升級完成"
else
    log_warning "跳過資料庫升級"
fi

# ============================================================================
# 4. 重新構建前端
# ============================================================================
log_section "步驟 4: 重新構建前端"

log_info "構建 Next.js 應用..."
cd client && npm run build && cd ..
log_success "前端構建完成"

# ============================================================================
# 5. 重啟服務
# ============================================================================
log_section "步驟 5: 重啟服務"

log_info "重啟所有服務..."
pm2 restart all
log_success "服務重啟完成"

# 等待服務啟動
sleep 3

# ============================================================================
# 6. 顯示狀態
# ============================================================================
log_section "更新完成！"

pm2 status

echo ""
log_success "應用已更新並重啟"
echo ""
echo "📝 查看日誌: pm2 logs"
echo ""
