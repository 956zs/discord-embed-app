#!/bin/bash

# ============================================================================
# Discord 統計應用 - 管理腳本
# ============================================================================
# 使用方式: ./manage.sh [command]
# 
# 可用命令:
#   start    - 啟動所有服務
#   stop     - 停止 Discord 應用服務（不影響其他進程）
#   restart  - 重啟 Discord 應用服務（不影響其他進程）
#   status   - 查看服務狀態
#   logs     - 查看所有日誌
#   logs-server - 查看 Server 日誌（包含 Bot，根據模式選擇進程）
#   logs-client - 查看 Client 日誌
#   backup   - 備份資料庫
#   restore  - 還原資料庫
#   switch-mode - 切換進程模式（不影響其他進程）
# ============================================================================

# 引入 PM2 安全操作函數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/pm2-utils.sh"

# 載入環境變數
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi
if [ -f "bot/.env" ]; then
    export $(cat bot/.env | grep -v '^#' | xargs)
fi

# 檢測進程模式
PROCESS_MODE=${PROCESS_MODE:-dual}

# 啟動函數
start_dual() {
    log_info "啟動雙進程模式..."
    pm2 start ecosystem.config.js
}

start_single() {
    log_info "啟動單進程模式..."
    pm2 start ecosystem.single.config.js
}

# 命令處理
case "$1" in
    start)
        log_info "啟動所有服務 (模式: $PROCESS_MODE)..."
        if [ "$PROCESS_MODE" = "single" ]; then
            start_single
        else
            start_dual
        fi
        log_success "服務已啟動"
        pm2 status
        ;;
    
    stop)
        log_info "停止 Discord 應用服務（不影響其他進程）..."
        # 根據當前模式停止相應進程
        CURRENT_PROCESSES=$(get_processes_for_mode "$PROCESS_MODE")
        safe_pm2_stop "$CURRENT_PROCESSES"
        
        # 同時檢查並停止其他模式的進程
        OTHER_MODE=$([ "$PROCESS_MODE" = "dual" ] && echo "single" || echo "dual")
        OTHER_PROCESSES=$(get_processes_for_mode "$OTHER_MODE")
        safe_pm2_stop "$OTHER_PROCESSES"
        
        log_success "Discord 應用服務已停止"
        pm2 status
        ;;
    
    restart)
        log_info "重啟 Discord 應用服務（不影響其他進程）..."
        # 根據當前模式重啟相應進程
        CURRENT_PROCESSES=$(get_processes_for_mode "$PROCESS_MODE")
        safe_pm2_restart "$CURRENT_PROCESSES"
        log_success "Discord 應用服務已重啟"
        sleep 2
        pm2 status
        ;;
    
    restart-prod)
        log_info "重啟生產環境（完全重新載入配置，不影響其他進程）..."
        # 使用安全函數清理所有 Discord 進程
        cleanup_discord_processes
        sleep 2
        if [ "$PROCESS_MODE" = "single" ]; then
            start_single
        else
            start_dual
        fi
        pm2 save
        log_success "生產環境已重啟"
        sleep 3
        pm2 status
        ;;
    
    status)
        pm2 status
        ;;
    
    logs)
        pm2 logs
        ;;
    
    logs-server)
        # 根據模式選擇正確的進程
        if [ "$PROCESS_MODE" = "single" ]; then
            pm2 logs discord-app
        else
            pm2 logs discord-server
        fi
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
        API_PORT=${PORT:-3008}
        if curl -s http://localhost:${API_PORT}/health > /dev/null 2>&1; then
            log_success "API 服務正常 (http://localhost:${API_PORT})"
        else
            log_error "API 服務異常"
        fi
        
        # 檢查 Client
        echo "Client 健康檢查:"
        CLIENT_PORT_VAL=${CLIENT_PORT:-3000}
        if curl -s http://localhost:${CLIENT_PORT_VAL} > /dev/null 2>&1; then
            log_success "Client 服務正常 (http://localhost:${CLIENT_PORT_VAL})"
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
    
    switch-mode)
        NEW_MODE=$2
        if [ "$NEW_MODE" != "dual" ] && [ "$NEW_MODE" != "single" ]; then
            log_error "無效的模式: $NEW_MODE"
            echo "使用方式: ./manage.sh switch-mode [dual|single]"
            echo ""
            echo "模式說明:"
            echo "  dual   - 雙進程模式（推薦）- 更好的故障隔離和監控"
            echo "  single - 單進程模式 - 節省約 50-100MB 記憶體"
            exit 1
        fi
        
        log_info "切換到 $NEW_MODE 模式（不影響其他進程）..."
        
        # 更新 .env
        if [ -f ".env" ]; then
            if grep -q "^PROCESS_MODE=" .env; then
                sed -i "s/^PROCESS_MODE=.*/PROCESS_MODE=$NEW_MODE/" .env
            else
                echo "PROCESS_MODE=$NEW_MODE" >> .env
            fi
        else
            echo "PROCESS_MODE=$NEW_MODE" > .env
        fi
        
        # 使用安全函數清理所有 Discord 進程
        log_info "停止現有 Discord 服務..."
        cleanup_discord_processes
        sleep 2
        
        # 重新載入環境變數
        export PROCESS_MODE=$NEW_MODE
        
        # 啟動新模式
        if [ "$NEW_MODE" = "single" ]; then
            start_single
        else
            start_dual
        fi
        
        pm2 save
        log_success "已切換到 $NEW_MODE 模式"
        echo ""
        pm2 status
        ;;
    
    *)
        echo "Discord 統計應用 - 管理腳本"
        echo ""
        echo "使用方式: ./manage.sh [command]"
        echo ""
        echo "可用命令:"
        echo "  start              - 啟動所有服務"
        echo "  stop               - 停止 Discord 應用服務（不影響其他進程）"
        echo "  restart            - 重啟 Discord 應用服務（不影響其他進程）"
        echo "  restart-prod       - 重啟生產環境（重新載入配置，不影響其他進程）"
        echo "  status             - 查看服務狀態"
        echo "  logs               - 查看所有日誌"
        echo "  logs-server        - 查看 Server 日誌（包含 Bot）"
        echo "  logs-client        - 查看 Client 日誌"
        echo "  backup             - 備份資料庫"
        echo "  restore <file>     - 還原資料庫"
        echo "  health             - 健康檢查"
        echo "  clean              - 清理日誌和舊備份"
        echo "  switch-mode <mode> - 切換進程模式 (dual/single，不影響其他進程)"
        echo ""
        echo "當前進程模式: $PROCESS_MODE"
        echo ""
        echo "進程管理安全:"
        echo "  ✅ 所有命令只操作 Discord 應用進程"
        echo "  ✅ 不會影響系統中的其他 PM2 進程"
        echo ""
        exit 1
        ;;
esac
