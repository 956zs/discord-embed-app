#!/bin/bash

# PM2 安全操作工具庫
# 提供安全的 PM2 進程管理函數，確保只操作 Discord 應用進程

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Discord 應用進程名稱常量
DISCORD_PROCESSES_DUAL="discord-server discord-client"
DISCORD_PROCESSES_SINGLE="discord-app"
DISCORD_PROCESSES_ALL="discord-server discord-client discord-app"

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
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 安全停止 Discord 應用進程
# 參數: 進程名稱列表（空格分隔）
# 用法: safe_pm2_stop "discord-server discord-client"
safe_pm2_stop() {
    local processes="$1"
    
    if [ -z "$processes" ]; then
        log_warning "未指定要停止的進程"
        return 0
    fi
    
    log_info "停止 Discord 應用進程: $processes"
    
    for process in $processes; do
        if pm2 describe "$process" &>/dev/null; then
            pm2 stop "$process"
            log_success "已停止: $process"
        else
            log_info "進程不存在，跳過: $process"
        fi
    done
}

# 安全刪除 Discord 應用進程
# 參數: 進程名稱列表（空格分隔）
# 用法: safe_pm2_delete "discord-server discord-client"
safe_pm2_delete() {
    local processes="$1"
    
    if [ -z "$processes" ]; then
        log_warning "未指定要刪除的進程"
        return 0
    fi
    
    log_info "刪除 Discord 應用進程: $processes"
    
    for process in $processes; do
        if pm2 describe "$process" &>/dev/null; then
            pm2 delete "$process"
            log_success "已刪除: $process"
        else
            log_info "進程不存在，跳過: $process"
        fi
    done
}

# 安全重啟 Discord 應用進程
# 參數: 進程名稱列表（空格分隔）
# 用法: safe_pm2_restart "discord-server discord-client"
safe_pm2_restart() {
    local processes="$1"
    
    if [ -z "$processes" ]; then
        log_warning "未指定要重啟的進程"
        return 0
    fi
    
    log_info "重啟 Discord 應用進程: $processes"
    
    for process in $processes; do
        if pm2 describe "$process" &>/dev/null; then
            pm2 restart "$process" --update-env
            log_success "已重啟: $process"
        else
            log_warning "進程不存在: $process"
        fi
    done
}

# 清理所有 Discord 應用進程
# 用於模式切換或完全清理
# 用法: cleanup_discord_processes
cleanup_discord_processes() {
    log_info "清理所有 Discord 應用進程..."
    safe_pm2_delete "$DISCORD_PROCESSES_ALL"
    sleep 2
    log_success "Discord 應用進程清理完成"
}

# 獲取當前運行的 Discord 進程列表
# 返回: 運行中的進程名稱（空格分隔）
# 用法: running=$(get_running_discord_processes)
get_running_discord_processes() {
    local running=""
    
    for process in $DISCORD_PROCESSES_ALL; do
        if pm2 describe "$process" &>/dev/null; then
            local status=$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"$process\"" -A 20 | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
            if [ "$status" = "online" ] || [ "$status" = "stopping" ] || [ "$status" = "stopped" ]; then
                running="$running $process"
            fi
        fi
    done
    
    echo "$running" | xargs
}

# 根據進程模式獲取應該運行的進程列表
# 參數: 模式 (single 或 dual)
# 返回: 進程名稱列表（空格分隔）
# 用法: processes=$(get_processes_for_mode "dual")
get_processes_for_mode() {
    local mode="$1"
    
    if [ "$mode" = "single" ]; then
        echo "$DISCORD_PROCESSES_SINGLE"
    elif [ "$mode" = "dual" ]; then
        echo "$DISCORD_PROCESSES_DUAL"
    else
        log_error "未知的進程模式: $mode (應為 'single' 或 'dual')"
        return 1
    fi
}

# 顯示當前 Discord 進程狀態
# 用法: show_discord_processes_status
show_discord_processes_status() {
    log_info "Discord 應用進程狀態:"
    
    local found=0
    for process in $DISCORD_PROCESSES_ALL; do
        if pm2 describe "$process" &>/dev/null; then
            found=1
            pm2 describe "$process" | grep -E "name|status|uptime|restarts" | head -4
            echo ""
        fi
    done
    
    if [ $found -eq 0 ]; then
        log_info "沒有運行中的 Discord 應用進程"
    fi
}

# 驗證進程模式配置
# 參數: 模式 (single 或 dual)
# 返回: 0 表示有效，1 表示無效
# 用法: validate_process_mode "dual"
validate_process_mode() {
    local mode="$1"
    
    if [ "$mode" != "single" ] && [ "$mode" != "dual" ]; then
        log_error "無效的進程模式: $mode"
        log_info "有效模式: single, dual"
        return 1
    fi
    
    return 0
}

# 等待進程完全停止
# 參數: 進程名稱, 最大等待時間（秒，默認 10）
# 用法: wait_for_process_stop "discord-server" 15
wait_for_process_stop() {
    local process="$1"
    local max_wait="${2:-10}"
    local waited=0
    
    while [ $waited -lt $max_wait ]; do
        if ! pm2 describe "$process" &>/dev/null; then
            return 0
        fi
        
        local status=$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"$process\"" -A 20 | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
        if [ "$status" != "online" ] && [ "$status" != "stopping" ]; then
            return 0
        fi
        
        sleep 1
        waited=$((waited + 1))
    done
    
    log_warning "進程 $process 在 ${max_wait} 秒後仍未完全停止"
    return 1
}

# 導出函數供其他腳本使用
export -f log_info
export -f log_success
export -f log_warning
export -f log_error
export -f safe_pm2_stop
export -f safe_pm2_delete
export -f safe_pm2_restart
export -f cleanup_discord_processes
export -f get_running_discord_processes
export -f get_processes_for_mode
export -f show_discord_processes_status
export -f validate_process_mode
export -f wait_for_process_stop
