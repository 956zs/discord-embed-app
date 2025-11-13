#!/bin/bash

# ============================================================================
# Discord 統計應用 - 生產環境更新腳本
# ============================================================================
# 使用方式: ./update.sh [選項]
# 
# 選項:
#   --skip-backup    跳過備份（不推薦）
#   --skip-deps      跳過依賴更新
#   --skip-db        跳過資料庫升級
#   --auto           自動模式（不詢問）
#   --help           顯示幫助
#
# 此腳本會：
# 1. 備份資料庫和配置
# 2. 拉取最新代碼
# 3. 更新依賴
# 4. 執行資料庫升級
# 5. 重新構建前端
# 6. 重啟服務
# 7. 驗證更新
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

# 解析命令行參數
SKIP_BACKUP=false
SKIP_DEPS=false
SKIP_DB=false
AUTO_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --auto)
            AUTO_MODE=true
            shift
            ;;
        --help)
            echo "使用方式: ./update.sh [選項]"
            echo ""
            echo "選項:"
            echo "  --skip-backup    跳過備份（不推薦）"
            echo "  --skip-deps      跳過依賴更新"
            echo "  --skip-db        跳過資料庫升級"
            echo "  --auto           自動模式（不詢問）"
            echo "  --help           顯示此幫助"
            exit 0
            ;;
        *)
            log_error "未知選項: $1"
            echo "使用 --help 查看可用選項"
            exit 1
            ;;
    esac
done

# 確認函數
confirm() {
    if [ "$AUTO_MODE" = true ]; then
        return 0
    fi
    
    local prompt="$1"
    local default="${2:-n}"
    
    if [ "$default" = "y" ]; then
        read -p "$prompt (Y/n) " -n 1 -r
    else
        read -p "$prompt (y/N) " -n 1 -r
    fi
    echo
    
    if [ -z "$REPLY" ]; then
        [[ "$default" = "y" ]]
    else
        [[ $REPLY =~ ^[Yy]$ ]]
    fi
}

# ============================================================================
# 0. 預檢查
# ============================================================================
log_section "步驟 0: 預檢查"

# 檢查是否在專案根目錄
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "bot" ]; then
    log_error "請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 PM2 是否運行
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 未安裝或不在 PATH 中"
    exit 1
fi

# 載入環境變數
if [ -f "bot/.env" ]; then
    export $(cat bot/.env | grep -v '^#' | grep -v '^$' | xargs)
fi

log_success "預檢查完成"

# ============================================================================
# 1. 備份
# ============================================================================
if [ "$SKIP_BACKUP" = false ]; then
    log_section "步驟 1: 備份"
    
    # 創建備份目錄
    BACKUP_DIR="backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # 備份資料庫
    if confirm "是否備份資料庫？" "y"; then
        log_info "備份資料庫..."
        BACKUP_FILE="$BACKUP_DIR/discord_stats_${TIMESTAMP}.sql"
        
        if PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE 2>/dev/null; then
            gzip $BACKUP_FILE
            log_success "資料庫備份完成: ${BACKUP_FILE}.gz"
            
            # 顯示備份大小
            SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            echo "  備份大小: $SIZE"
        else
            log_error "資料庫備份失敗"
            if ! confirm "是否繼續更新？" "n"; then
                exit 1
            fi
        fi
    fi
    
    # 備份配置文件
    log_info "備份配置文件..."
    cp .env ".env.backup.${TIMESTAMP}" 2>/dev/null || log_warning ".env 不存在"
    cp bot/.env "bot/.env.backup.${TIMESTAMP}" 2>/dev/null || log_warning "bot/.env 不存在"
    cp client/.env.local "client/.env.local.backup.${TIMESTAMP}" 2>/dev/null || log_warning "client/.env.local 不存在"
    log_success "配置文件備份完成"
    
    # 記錄當前版本
    if [ -d ".git" ]; then
        git log -1 --oneline > "version.backup.${TIMESTAMP}.txt"
        log_success "當前版本已記錄"
    fi
else
    log_warning "跳過備份步驟（使用了 --skip-backup）"
fi

# ============================================================================
# 2. 拉取最新代碼
# ============================================================================
log_section "步驟 2: 更新代碼"

if [ -d ".git" ]; then
    # 檢查是否有未提交的變更
    if ! git diff-index --quiet HEAD --; then
        log_warning "檢測到未提交的變更"
        git status --short
        echo ""
        
        if confirm "是否暫存這些變更？" "y"; then
            git stash
            log_success "變更已暫存"
            STASHED=true
        else
            echo ""
            if confirm "是否丟棄這些變更並用遠端版本覆蓋？" "n"; then
                log_warning "丟棄本地變更..."
                git reset --hard HEAD
                log_success "本地變更已丟棄"
            else
                log_error "請先處理未提交的變更"
                echo ""
                echo "💡 你可以："
                echo "  1. 手動暫存: git stash"
                echo "  2. 手動丟棄: git reset --hard HEAD"
                echo "  3. 手動提交: git add . && git commit -m 'update'"
                exit 1
            fi
        fi
    fi
    
    # 記錄當前版本
    CURRENT_VERSION=$(git rev-parse --short HEAD)
    log_info "當前版本: $CURRENT_VERSION"
    
    # 拉取最新代碼
    log_info "拉取最新代碼..."
    if git pull; then
        NEW_VERSION=$(git rev-parse --short HEAD)
        log_success "代碼更新完成"
        log_info "新版本: $NEW_VERSION"
        
        # 顯示變更
        if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
            echo ""
            log_info "變更內容:"
            git log --oneline ${CURRENT_VERSION}..${NEW_VERSION}
            echo ""
        else
            log_info "已是最新版本"
        fi
    else
        log_error "代碼拉取失敗"
        exit 1
    fi
    
    # 恢復暫存的變更
    if [ "$STASHED" = true ]; then
        if confirm "是否恢復暫存的變更？" "y"; then
            git stash pop
            log_success "變更已恢復"
        fi
    fi
else
    log_warning "不是 Git 倉庫，跳過代碼拉取"
fi

# ============================================================================
# 3. 更新依賴
# ============================================================================
if [ "$SKIP_DEPS" = false ]; then
    log_section "步驟 3: 更新依賴"
    
    if confirm "是否要更新依賴？" "y"; then
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
else
    log_warning "跳過依賴更新（使用了 --skip-deps）"
fi

# ============================================================================
# 4. 資料庫升級
# ============================================================================
if [ "$SKIP_DB" = false ]; then
    log_section "步驟 4: 資料庫升級"
    
    if confirm "是否要執行資料庫升級？" "n"; then
        # 檢查資料庫連接
        log_info "檢查資料庫連接..."
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
            log_success "資料庫連接正常"
            
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
            
            # 執行通用升級腳本
            if [ -f "bot/database/upgrade.sql" ]; then
                log_info "執行資料庫升級..."
                PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/upgrade.sql 2>/dev/null || log_warning "升級腳本可能已執行過"
            fi
            
            log_success "資料庫升級完成"
        else
            log_error "資料庫連接失敗"
            if ! confirm "是否繼續更新？" "n"; then
                exit 1
            fi
        fi
    else
        log_warning "跳過資料庫升級"
    fi
else
    log_warning "跳過資料庫升級（使用了 --skip-db）"
fi

# ============================================================================
# 5. 重新構建前端
# ============================================================================
log_section "步驟 5: 重新構建前端"

log_info "清除舊構建..."
rm -rf client/.next

log_info "構建 Next.js 應用..."
if cd client && npm run build && cd ..; then
    log_success "前端構建完成"
else
    log_error "前端構建失敗"
    log_info "嘗試清除 node_modules 並重新安裝..."
    cd client
    rm -rf node_modules
    npm install
    npm run build
    cd ..
    log_success "前端構建完成（重新安裝後）"
fi

# ============================================================================
# 6. 重啟服務
# ============================================================================
log_section "步驟 6: 重啟服務"

# 顯示當前服務狀態
log_info "當前服務狀態:"
pm2 status

echo ""
if confirm "是否重啟服務？" "y"; then
    log_info "重啟 Discord 應用服務（零停機）..."
    
    # 只重啟這個專案的服務，不影響其他 PM2 進程
    # 使用 reload 實現零停機更新
    
    # 重啟 server（包含 bot）
    log_info "重啟 discord-server..."
    if pm2 reload discord-server; then
        log_success "discord-server reload 完成"
    else
        log_warning "discord-server reload 失敗，嘗試 restart..."
        pm2 restart discord-server
        log_success "discord-server restart 完成"
    fi
    
    # 重啟 client
    log_info "重啟 discord-client..."
    if pm2 reload discord-client; then
        log_success "discord-client reload 完成"
    else
        log_warning "discord-client reload 失敗，嘗試 restart..."
        pm2 restart discord-client
        log_success "discord-client restart 完成"
    fi
    
    # 等待服務穩定
    log_info "等待服務穩定..."
    sleep 5
else
    log_warning "跳過服務重啟"
    log_warning "請手動執行:"
    echo "  pm2 reload discord-server"
    echo "  pm2 reload discord-client"
fi

# ============================================================================
# 7. 驗證更新
# ============================================================================
log_section "步驟 7: 驗證更新"

# 檢查 PM2 狀態
log_info "檢查服務狀態..."
pm2 status

echo ""

# 檢查 API
log_info "檢查 API 服務..."
if curl -s http://localhost:${PORT:-3008}/health > /dev/null 2>&1; then
    log_success "API 服務正常"
else
    log_error "API 服務異常"
fi

# 檢查前端
log_info "檢查前端服務..."
if curl -s http://localhost:${CLIENT_PORT:-3000} > /dev/null 2>&1; then
    log_success "前端服務正常"
else
    log_error "前端服務異常"
fi

# 檢查資料庫
log_info "檢查資料庫連接..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    log_success "資料庫連接正常"
else
    log_error "資料庫連接異常"
fi

# ============================================================================
# 8. 完成
# ============================================================================
log_section "更新完成！"

echo ""
log_success "應用已成功更新"
echo ""
echo "📊 服務狀態:"
pm2 status
echo ""
echo "📝 常用命令:"
echo "  查看日誌: pm2 logs"
echo "  查看錯誤: pm2 logs --err"
echo "  健康檢查: ./manage.sh health"
echo "  重啟服務: pm2 restart all"
echo ""
echo "🔄 如果遇到問題:"
echo "  1. 查看日誌: pm2 logs --lines 100"
echo "  2. 檢查配置: cat .env"
echo "  3. 重新構建: cd client && npm run build && cd .."
echo "  4. 回滾: git reset --hard <commit-hash>"
echo ""

# 詢問是否查看日誌
if confirm "是否查看最近的日誌？" "n"; then
    pm2 logs --lines 50
fi
