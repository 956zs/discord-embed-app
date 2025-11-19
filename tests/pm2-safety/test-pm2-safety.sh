#!/bin/bash

# PM2 Safety Verification Test Script
# This script tests that all PM2 operations only affect Discord app processes

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
TEST_PROCESS_NAME="test-app-pm2-safety"

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

# Check if any Discord process exists
discord_process_exists() {
    pm2 describe discord-server &>/dev/null || \
    pm2 describe discord-client &>/dev/null || \
    pm2 describe discord-app &>/dev/null
}

# Get count of Discord processes
count_discord_processes() {
    local count=0
    pm2 describe discord-server &>/dev/null && count=$((count + 1))
    pm2 describe discord-client &>/dev/null && count=$((count + 1))
    pm2 describe discord-app &>/dev/null && count=$((count + 1))
    echo $count
}

# Cleanup function
cleanup() {
    log_section "清理測試環境"
    
    # Remove test process
    if test_process_exists; then
        log_info "刪除測試進程: $TEST_PROCESS_NAME"
        pm2 delete "$TEST_PROCESS_NAME" &>/dev/null || true
        log_success "測試進程已刪除"
    else
        log_info "測試進程不存在，無需清理"
    fi
    
    # Show final results
    log_section "測試結果總結"
    echo -e "${GREEN}通過: $TESTS_PASSED${NC}"
    echo -e "${RED}失敗: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "所有測試通過！PM2 安全操作驗證成功。"
        exit 0
    else
        log_error "有 $TESTS_FAILED 個測試失敗。請檢查上述錯誤。"
        exit 1
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Main test execution
log_section "PM2 安全操作驗證測試"
log_info "此測試將驗證所有 PM2 操作只影響 Discord 應用進程"
echo ""

# Test 1: Create test process
log_section "測試 1: 創建測試進程"
log_info "創建非 Discord 的測試進程: $TEST_PROCESS_NAME"

# Create a simple test process
cat > /tmp/test-pm2-app.js << 'EOF'
setInterval(() => {
    console.log('Test process running...');
}, 5000);
EOF

pm2 start /tmp/test-pm2-app.js --name "$TEST_PROCESS_NAME" &>/dev/null

if test_process_exists; then
    log_success "測試進程創建成功"
else
    log_error "測試進程創建失敗"
    exit 1
fi

# Test 2: Verify test process is running
log_section "測試 2: 驗證測試進程狀態"
TEST_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$TEST_PROCESS_NAME\") | .pm2_env.status")

if [ "$TEST_STATUS" = "online" ]; then
    log_success "測試進程狀態正常: $TEST_STATUS"
else
    log_error "測試進程狀態異常: $TEST_STATUS"
fi

# Test 3: Test manage.sh stop command
log_section "測試 3: 測試 manage.sh stop 命令"
log_info "執行 ./manage.sh stop"

DISCORD_COUNT_BEFORE=$(count_discord_processes)
log_info "執行前 Discord 進程數: $DISCORD_COUNT_BEFORE"

./manage.sh stop &>/dev/null || true
sleep 2

if test_process_exists; then
    log_success "測試進程未受影響（仍在運行）"
else
    log_error "測試進程被錯誤停止"
fi

DISCORD_COUNT_AFTER=$(count_discord_processes)
log_info "執行後 Discord 進程數: $DISCORD_COUNT_AFTER"

# Test 4: Test manage.sh start command
log_section "測試 4: 測試 manage.sh start 命令"
log_info "執行 ./manage.sh start"

./manage.sh start &>/dev/null || true
sleep 3

if test_process_exists; then
    log_success "測試進程未受影響（仍在運行）"
else
    log_error "測試進程被錯誤刪除"
fi

# Test 5: Test manage.sh restart command
log_section "測試 5: 測試 manage.sh restart 命令"
log_info "執行 ./manage.sh restart"

./manage.sh restart &>/dev/null || true
sleep 2

if test_process_exists; then
    log_success "測試進程未受影響（仍在運行）"
else
    log_error "測試進程被錯誤刪除"
fi

# Test 6: Test deploy.sh (if Discord processes exist)
log_section "測試 6: 測試 deploy.sh 腳本"

if discord_process_exists; then
    log_info "檢測到 Discord 進程，測試 deploy.sh"
    log_warning "注意：此測試將重新部署 Discord 應用"
    
    # We won't actually run deploy.sh in automated tests
    # Instead, we'll verify the script doesn't use dangerous commands
    # Exclude comments and documentation lines
    if grep -v "^#" deploy.sh | grep -v "echo" | grep -q "pm2 delete all"; then
        log_error "deploy.sh 仍包含 'pm2 delete all' 命令"
    else
        log_success "deploy.sh 不包含危險的 'pm2 delete all' 命令"
    fi
    
    if grep -v "^#" deploy.sh | grep -v "echo" | grep -q "pm2 restart all"; then
        log_error "deploy.sh 仍包含 'pm2 restart all' 命令"
    else
        log_success "deploy.sh 不包含 'pm2 restart all' 命令"
    fi
    
    if grep -v "^#" deploy.sh | grep -v "echo" | grep -q "pm2 stop all"; then
        log_error "deploy.sh 仍包含 'pm2 stop all' 命令"
    else
        log_success "deploy.sh 不包含 'pm2 stop all' 命令"
    fi
else
    log_info "未檢測到 Discord 進程，跳過 deploy.sh 測試"
fi

# Test 7: Verify scripts use pm2-utils.sh
log_section "測試 7: 驗證腳本使用 pm2-utils.sh"

if grep -q "source.*pm2-utils.sh" manage.sh; then
    log_success "manage.sh 引入了 pm2-utils.sh"
else
    log_error "manage.sh 未引入 pm2-utils.sh"
fi

if grep -q "source.*pm2-utils.sh" deploy.sh; then
    log_success "deploy.sh 引入了 pm2-utils.sh"
else
    log_error "deploy.sh 未引入 pm2-utils.sh"
fi

if grep -q "source.*pm2-utils.sh" update.sh; then
    log_success "update.sh 引入了 pm2-utils.sh"
else
    log_error "update.sh 未引入 pm2-utils.sh"
fi

# Test 8: Verify pm2-utils.sh functions exist
log_section "測試 8: 驗證 pm2-utils.sh 函數"

if [ -f "scripts/pm2-utils.sh" ]; then
    log_success "pm2-utils.sh 文件存在"
    
    # Check for required functions
    if grep -q "safe_pm2_stop()" scripts/pm2-utils.sh; then
        log_success "safe_pm2_stop 函數存在"
    else
        log_error "safe_pm2_stop 函數不存在"
    fi
    
    if grep -q "safe_pm2_delete()" scripts/pm2-utils.sh; then
        log_success "safe_pm2_delete 函數存在"
    else
        log_error "safe_pm2_delete 函數不存在"
    fi
    
    if grep -q "safe_pm2_restart()" scripts/pm2-utils.sh; then
        log_success "safe_pm2_restart 函數存在"
    else
        log_error "safe_pm2_restart 函數不存在"
    fi
    
    if grep -q "cleanup_discord_processes()" scripts/pm2-utils.sh; then
        log_success "cleanup_discord_processes 函數存在"
    else
        log_error "cleanup_discord_processes 函數不存在"
    fi
else
    log_error "pm2-utils.sh 文件不存在"
fi

# Test 9: Test error handling (non-existent process)
log_section "測試 9: 測試錯誤處理"
log_info "測試操作不存在的進程"

# Source pm2-utils.sh to test functions
source scripts/pm2-utils.sh

# Test safe_pm2_stop with non-existent process
log_info "測試 safe_pm2_stop 處理不存在的進程"
safe_pm2_stop "non-existent-process" &>/dev/null
if [ $? -eq 0 ]; then
    log_success "safe_pm2_stop 正確處理不存在的進程"
else
    log_error "safe_pm2_stop 未正確處理不存在的進程"
fi

# Test safe_pm2_delete with non-existent process
log_info "測試 safe_pm2_delete 處理不存在的進程"
safe_pm2_delete "non-existent-process" &>/dev/null
if [ $? -eq 0 ]; then
    log_success "safe_pm2_delete 正確處理不存在的進程"
else
    log_error "safe_pm2_delete 未正確處理不存在的進程"
fi

# Test 10: Verify process constants
log_section "測試 10: 驗證進程名稱常量"

if grep -q "DISCORD_PROCESSES_DUAL=" scripts/pm2-utils.sh; then
    log_success "DISCORD_PROCESSES_DUAL 常量已定義"
else
    log_error "DISCORD_PROCESSES_DUAL 常量未定義"
fi

if grep -q "DISCORD_PROCESSES_SINGLE=" scripts/pm2-utils.sh; then
    log_success "DISCORD_PROCESSES_SINGLE 常量已定義"
else
    log_error "DISCORD_PROCESSES_SINGLE 常量未定義"
fi

if grep -q "DISCORD_PROCESSES_ALL=" scripts/pm2-utils.sh; then
    log_success "DISCORD_PROCESSES_ALL 常量已定義"
else
    log_error "DISCORD_PROCESSES_ALL 常量未定義"
fi

# Test 11: Final verification - test process still exists
log_section "測試 11: 最終驗證"
log_info "驗證測試進程在所有操作後仍然存在"

if test_process_exists; then
    TEST_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$TEST_PROCESS_NAME\") | .pm2_env.status")
    if [ "$TEST_STATUS" = "online" ]; then
        log_success "測試進程仍在運行，狀態: $TEST_STATUS"
        log_success "所有 PM2 操作都正確隔離了 Discord 應用進程"
    else
        log_warning "測試進程存在但狀態異常: $TEST_STATUS"
    fi
else
    log_error "測試進程不存在 - 可能被錯誤刪除"
fi

# Cleanup will be called by trap
