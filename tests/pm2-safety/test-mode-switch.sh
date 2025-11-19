#!/bin/bash

# PM2 Mode Switching Test Script
# Tests the switch-mode functionality to ensure it properly handles process transitions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_PROCESS_NAME="test-mode-switch-safety"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check if test process exists
test_process_exists() {
    pm2 describe "$TEST_PROCESS_NAME" &>/dev/null
}

# Get current process mode from .env
get_current_mode() {
    if [ -f ".env" ]; then
        grep "^PROCESS_MODE=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'"
    else
        echo "dual"
    fi
}

# Check which Discord processes are running
check_discord_processes() {
    local server_running=false
    local client_running=false
    local app_running=false
    
    pm2 describe discord-server &>/dev/null && server_running=true
    pm2 describe discord-client &>/dev/null && client_running=true
    pm2 describe discord-app &>/dev/null && app_running=true
    
    echo "server=$server_running client=$client_running app=$app_running"
}

# Cleanup function
cleanup() {
    log_section "清理測試環境"
    
    # Remove test process
    if test_process_exists; then
        log_info "刪除測試進程: $TEST_PROCESS_NAME"
        pm2 delete "$TEST_PROCESS_NAME" &>/dev/null || true
        log_success "測試進程已刪除"
    fi
    
    # Show final results
    log_section "測試結果總結"
    echo -e "${GREEN}通過: $TESTS_PASSED${NC}"
    echo -e "${RED}失敗: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "所有模式切換測試通過！"
        exit 0
    else
        log_error "有 $TESTS_FAILED 個測試失敗。"
        exit 1
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Main test execution
log_section "PM2 模式切換測試"
log_info "此測試將驗證模式切換功能的安全性"
echo ""

# Test 1: Create test process
log_section "測試 1: 創建測試進程"
log_info "創建測試進程: $TEST_PROCESS_NAME"

cat > /tmp/test-mode-switch.js << 'EOF'
setInterval(() => {
    console.log('Mode switch test process running...');
}, 5000);
EOF

pm2 start /tmp/test-mode-switch.js --name "$TEST_PROCESS_NAME" &>/dev/null

if test_process_exists; then
    log_success "測試進程創建成功"
else
    log_error "測試進程創建失敗"
    exit 1
fi

# Test 2: Check current mode
log_section "測試 2: 檢查當前進程模式"
CURRENT_MODE=$(get_current_mode)
log_info "當前模式: $CURRENT_MODE"

PROCESS_STATE=$(check_discord_processes)
log_info "進程狀態: $PROCESS_STATE"

# Test 3: Verify mode consistency
log_section "測試 3: 驗證模式一致性"

if [ "$CURRENT_MODE" = "dual" ]; then
    if echo "$PROCESS_STATE" | grep -q "server=true" && echo "$PROCESS_STATE" | grep -q "client=true"; then
        log_success "雙進程模式配置正確"
    else
        log_warning "雙進程模式配置可能不一致"
    fi
    
    if echo "$PROCESS_STATE" | grep -q "app=true"; then
        log_error "雙進程模式下不應該有 discord-app 進程"
    else
        log_success "雙進程模式下沒有單進程模式的進程"
    fi
elif [ "$CURRENT_MODE" = "single" ]; then
    if echo "$PROCESS_STATE" | grep -q "app=true"; then
        log_success "單進程模式配置正確"
    else
        log_warning "單進程模式配置可能不一致"
    fi
    
    if echo "$PROCESS_STATE" | grep -q "server=true" || echo "$PROCESS_STATE" | grep -q "client=true"; then
        log_error "單進程模式下不應該有雙進程模式的進程"
    else
        log_success "單進程模式下沒有雙進程模式的進程"
    fi
fi

# Test 4: Test switch-mode command (dry run - just verify test process survives)
log_section "測試 4: 測試模式切換命令"
log_info "注意：此測試不會實際切換模式，只驗證測試進程不受影響"

# Get the target mode
if [ "$CURRENT_MODE" = "dual" ]; then
    TARGET_MODE="single"
else
    TARGET_MODE="dual"
fi

log_info "當前模式: $CURRENT_MODE"
log_info "目標模式: $TARGET_MODE"

# Verify test process before
if test_process_exists; then
    log_success "切換前測試進程存在"
else
    log_error "切換前測試進程不存在"
fi

# Note: We won't actually switch modes in automated tests
# as it would disrupt the running application
log_warning "跳過實際模式切換（避免中斷運行中的應用）"
log_info "在生產環境中，請手動測試: ./manage.sh switch-mode"

# Test 5: Verify test process still exists
log_section "測試 5: 驗證測試進程未受影響"

if test_process_exists; then
    TEST_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$TEST_PROCESS_NAME\") | .pm2_env.status")
    if [ "$TEST_STATUS" = "online" ]; then
        log_success "測試進程仍在運行，狀態: $TEST_STATUS"
    else
        log_warning "測試進程狀態異常: $TEST_STATUS"
    fi
else
    log_error "測試進程不存在"
fi

# Test 6: Verify switch-mode uses safe functions
log_section "測試 6: 驗證 switch-mode 使用安全函數"

if grep -A 40 "switch-mode)" manage.sh | grep -q "cleanup_discord_processes"; then
    log_success "switch-mode 使用 cleanup_discord_processes 函數"
else
    log_error "switch-mode 未使用 cleanup_discord_processes 函數"
fi

if grep -A 40 "switch-mode)" manage.sh | grep -v "^#" | grep -v "echo" | grep -q "pm2 delete all"; then
    log_error "switch-mode 使用了危險的 'pm2 delete all' 命令"
else
    log_success "switch-mode 不使用 'pm2 delete all' 命令"
fi

# Test 7: Verify no process conflicts
log_section "測試 7: 驗證沒有進程衝突"

DUAL_COUNT=0
SINGLE_COUNT=0

pm2 describe discord-server &>/dev/null && DUAL_COUNT=$((DUAL_COUNT + 1))
pm2 describe discord-client &>/dev/null && DUAL_COUNT=$((DUAL_COUNT + 1))
pm2 describe discord-app &>/dev/null && SINGLE_COUNT=$((SINGLE_COUNT + 1))

if [ $DUAL_COUNT -gt 0 ] && [ $SINGLE_COUNT -gt 0 ]; then
    log_error "檢測到雙進程和單進程模式同時運行（端口衝突風險）"
else
    log_success "沒有進程模式衝突"
fi

log_info "雙進程模式進程數: $DUAL_COUNT"
log_info "單進程模式進程數: $SINGLE_COUNT"

# Cleanup will be called by trap
