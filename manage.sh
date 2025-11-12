#!/bin/bash

# ============================================================================
# Discord 統計應用 - 管理腳本
# ============================================================================
# 使用方式: ./manage.sh [command]
# 
# 可用命令:
#   start    - 啟動所有服務
#   stop     - 停止所有服務
#   restart  - 重啟所有服務
#   status   - 查看服務狀態
#   logs     - 查看所有日誌
#   logs-api - 查看 API 日誌
#   logs-bot - 查看 Bot 日誌
#   logs-client - 查看 Client 日誌
#   backup   - 備份資料庫
#   restore  - 還原資料庫
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

# 載入環境變數
if [ -f "bot/.env" ]; then
    export $(cat bot/.env | grep -v '^#' | xargs)
fi

# 命令處理
case "$1" in
    start)
        log_info "啟動所有服務..."
        pm2 start ecosystem.config.js
        log_success "服務已啟動"
        pm2 status
        ;;
    
    stop)
        log_info "停止所有服務..."
        pm2 stop all
        log_success "服務已停止"
        pm2 status
        ;;
    
    restart)
        log_info "重啟所有服務..."
        pm2 restart all
        log_success "服務已重啟"
        sleep 2
        pm2 status
        ;;
    
    status)
        pm2 status
        ;;
    
    logs)
        pm2 logs
        ;;
    
    logs-api)
        pm2 logs discord-api
        ;;
    
    logs-bot)
        pm2 logs discord-bot
        ;;
    
    logs-client)
        pm2 logs discord-client
        ;;
    
    backup)
        BACKUP_DIR="backups"
        mkdir -p $BACKUP_DIR
        BACKUP_FILE="$BACKUP_DIR/discord_stats_$(date +%Y%m%d_%H%M%S).sql"
        
        log_info "備份資料庫到 $BACKUP_FILE..."
        PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
        
        if [ $? -eq 0 ]; then
            log_success "資料庫備份完成: $BACKUP_FILE"
            
            # 壓縮備份
            gzip $BACKUP_FILE
            log_success "備份已壓縮: ${BACKUP_FILE}.gz"
            
            # 顯示備份大小
            SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            echo "備份大小: $SIZE"
        else
            log_error "資料庫備份失敗"
            exit 1
        fi
        ;;
    
    restore)
        if [ -z "$2" ]; then
            log_error "請指定備份文件"
            echo "使用方式: ./manage.sh restore <backup_file>"
            echo ""
            echo "可用的備份:"
            ls -lh backups/*.sql.gz 2>/dev/null || echo "  沒有找到備份文件"
            exit 1
        fi
        
        BACKUP_FILE="$2"
        
        if [ ! -f "$BACKUP_FILE" ]; then
            log_error "找不到備份文件: $BACKUP_FILE"
            exit 1
        fi
        
        log_info "還原資料庫從 $BACKUP_FILE..."
        
        # 如果是壓縮文件，先解壓
        if [[ $BACKUP_FILE == *.gz ]]; then
            log_info "解壓備份文件..."
            gunzip -c $BACKUP_FILE | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
        else
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE
        fi
        
        if [ $? -eq 0 ]; then
            log_success "資料庫還原完成"
        else
            log_error "資料庫還原失敗"
            exit 1
        fi
        ;;
    
    health)
        log_info "檢查服務健康狀態..."
        echo ""
        
        # 檢查 PM2 服務
        echo "PM2 服務狀態:"
        pm2 status
        echo ""
        
        # 檢查 API
        echo "API 健康檢查:"
        if curl -s http://localhost:3008/health > /dev/null 2>&1; then
            log_success "API 服務正常 (http://localhost:3008)"
        else
            log_error "API 服務異常"
        fi
        
        # 檢查 Client
        echo "Client 健康檢查:"
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            log_success "Client 服務正常 (http://localhost:3000)"
        else
            log_error "Client 服務異常"
        fi
        
        # 檢查資料庫
        echo "資料庫健康檢查:"
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
            log_success "資料庫連接正常"
        else
            log_error "資料庫連接異常"
        fi
        ;;
    
    clean)
        log_info "清理日誌和臨時文件..."
        pm2 flush
        log_success "PM2 日誌已清理"
        
        # 清理舊的備份（保留最近 10 個）
        if [ -d "backups" ]; then
            BACKUP_COUNT=$(ls -1 backups/*.sql.gz 2>/dev/null | wc -l)
            if [ $BACKUP_COUNT -gt 10 ]; then
                log_info "清理舊備份（保留最近 10 個）..."
                ls -t backups/*.sql.gz | tail -n +11 | xargs rm -f
                log_success "舊備份已清理"
            fi
        fi
        ;;
    
    *)
        echo "Discord 統計應用 - 管理腳本"
        echo ""
        echo "使用方式: ./manage.sh [command]"
        echo ""
        echo "可用命令:"
        echo "  start         - 啟動所有服務"
        echo "  stop          - 停止所有服務"
        echo "  restart       - 重啟所有服務"
        echo "  status        - 查看服務狀態"
        echo "  logs          - 查看所有日誌"
        echo "  logs-api      - 查看 API 日誌"
        echo "  logs-bot      - 查看 Bot 日誌"
        echo "  logs-client   - 查看 Client 日誌"
        echo "  backup        - 備份資料庫"
        echo "  restore <file>- 還原資料庫"
        echo "  health        - 健康檢查"
        echo "  clean         - 清理日誌和舊備份"
        echo ""
        exit 1
        ;;
esac
