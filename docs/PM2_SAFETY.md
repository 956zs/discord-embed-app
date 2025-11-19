# PM2 安全操作文檔

## 概述

本文檔詳細說明 Discord 統計應用的 PM2 進程管理安全規範。所有管理腳本都遵循嚴格的安全原則，確保只操作 Discord 應用的進程，絕不影響系統中的其他 PM2 進程。

## 為什麼需要 PM2 安全操作？

在多應用環境中，使用 `pm2 delete all`、`pm2 restart all` 等全域命令會影響所有進程，可能導致：

- ❌ 其他應用意外停止
- ❌ 服務中斷
- ❌ 數據丟失
- ❌ 生產環境故障

本專案通過以下方式確保安全：

- ✅ 明確指定進程名稱
- ✅ 使用專屬的進程命名
- ✅ 統一的安全操作函數
- ✅ 完善的錯誤處理
- ✅ 詳細的操作日誌

## 進程命名規範

### 雙進程模式（Dual Mode）

推薦用於生產環境，提供更好的故障隔離和監控：

- **`discord-server`** - API 服務器 + Discord Bot
  - 端口：3008（可配置）
  - 配置文件：`ecosystem.dual.config.js`
  - 日誌：`server/logs/server-*.log`

- **`discord-client`** - Next.js 前端
  - 端口：3000（可配置）
  - 配置文件：`ecosystem.dual.config.js`
  - 日誌：`client/logs/client-*.log`

### 單進程模式（Single Mode）

適合資源受限環境，節省 50-100MB 記憶體：

- **`discord-app`** - API + Bot + Next.js 整合
  - 端口：3008（API）、3000（前端）
  - 配置文件：`ecosystem.single.config.js`
  - 日誌：`server/logs/app-*.log`

### 命名原則


1. **專屬前綴** - 所有進程名稱以 `discord-` 開頭
2. **描述性** - 名稱清楚表明進程功能
3. **一致性** - 所有腳本和配置使用相同名稱
4. **避免通用** - 不使用 `app`、`server`、`client` 等通用名稱

## 安全原則

### 1. 明確性原則

所有 PM2 命令必須明確指定進程名稱：

```bash
# ✅ 正確：明確指定進程
pm2 stop discord-server
pm2 delete discord-client
pm2 restart discord-app

# ❌ 錯誤：使用全域命令
pm2 stop all
pm2 delete all
pm2 restart all
```

### 2. 隔離性原則

絕不使用影響所有進程的全域命令：

```bash
# ❌ 禁止使用的命令
pm2 delete all
pm2 restart all
pm2 stop all
pm2 reload all
pm2 kill

# ✅ 安全的替代方案
safe_pm2_delete "discord-server discord-client"
safe_pm2_restart "discord-server discord-client"
safe_pm2_stop "discord-server discord-client"
```

### 3. 容錯性原則

優雅處理進程不存在的情況：

```bash
# 進程可能不存在時
pm2 delete discord-server 2>/dev/null || true

# 或使用安全函數
safe_pm2_delete "discord-server"
# 函數內部會檢查進程是否存在
```

### 4. 可追蹤性原則

記錄所有 PM2 操作：

```bash
log_info "停止 Discord 應用進程: discord-server"
pm2 stop discord-server
log_success "已停止: discord-server"
```

## 安全操作函數

所有管理腳本使用統一的安全操作函數，位於 `scripts/pm2-utils.sh`。

### 進程名稱常量

```bash
# Discord 應用進程名稱
DISCORD_PROCESSES_DUAL="discord-server discord-client"
DISCORD_PROCESSES_SINGLE="discord-app"
DISCORD_PROCESSES_ALL="discord-server discord-client discord-app"
```

### safe_pm2_stop

安全停止指定的 Discord 進程：

```bash
# 函數簽名
safe_pm2_stop <進程名稱列表>

# 使用範例
safe_pm2_stop "discord-server discord-client"
safe_pm2_stop "$DISCORD_PROCESSES_DUAL"

# 功能
# - 檢查進程是否存在
# - 只停止存在的進程
# - 記錄操作日誌
# - 不會因進程不存在而報錯
```

### safe_pm2_delete

安全刪除指定的 Discord 進程：

```bash
# 函數簽名
safe_pm2_delete <進程名稱列表>

# 使用範例
safe_pm2_delete "discord-server discord-client"
safe_pm2_delete "$DISCORD_PROCESSES_ALL"

# 功能
# - 檢查進程是否存在
# - 只刪除存在的進程
# - 記錄操作日誌
# - 優雅處理進程不存在的情況
```

### safe_pm2_restart

安全重啟指定的 Discord 進程：

```bash
# 函數簽名
safe_pm2_restart <進程名稱列表>

# 使用範例
safe_pm2_restart "discord-server discord-client"
safe_pm2_restart "$DISCORD_PROCESSES_DUAL"

# 功能
# - 檢查進程是否存在
# - 只重啟存在的進程
# - 使用 --update-env 更新環境變數
# - 記錄操作日誌
```

### cleanup_discord_processes

清理所有 Discord 應用進程（用於模式切換）：

```bash
# 函數簽名
cleanup_discord_processes

# 使用範例
cleanup_discord_processes

# 功能
# - 刪除所有 Discord 進程（雙模式和單模式）
# - 確保模式切換時沒有殘留進程
# - 等待 2 秒確保進程完全停止
# - 記錄操作日誌
```

### get_running_discord_processes

獲取當前運行的 Discord 進程列表：

```bash
# 函數簽名
get_running_discord_processes

# 使用範例
RUNNING=$(get_running_discord_processes)
echo "運行中的進程: $RUNNING"

# 返回值
# 空格分隔的進程名稱列表
# 例如: "discord-server discord-client"
```

### get_processes_for_mode

根據進程模式獲取應該運行的進程列表：

```bash
# 函數簽名
get_processes_for_mode <模式>

# 使用範例
PROCESSES=$(get_processes_for_mode "dual")
echo "雙進程模式: $PROCESSES"
# 輸出: discord-server discord-client

PROCESSES=$(get_processes_for_mode "single")
echo "單進程模式: $PROCESSES"
# 輸出: discord-app

# 參數
# - dual: 返回雙進程模式的進程列表
# - single: 返回單進程模式的進程列表
```

## 管理腳本安全實現

### deploy.sh

部署腳本在步驟 6 清理現有進程時使用安全函數：

```bash
# 步驟 6: 停止現有服務
log_section "步驟 6: 停止現有 Discord 服務"

log_info "清理現有的 Discord 應用進程..."
cleanup_discord_processes
log_success "Discord 應用進程已清理"

# ✅ 只清理 Discord 應用進程
# ✅ 不影響其他 PM2 進程
# ✅ 優雅處理進程不存在的情況
```

### update.sh

更新腳本根據進程模式選擇正確的進程：

```bash
# 步驟 6: 重啟服務
log_section "步驟 6: 重啟服務"

# 根據模式選擇配置文件
if [ "$PROCESS_MODE" = "single" ]; then
    CONFIG_FILE="ecosystem.single.config.js"
    PROCESSES="$DISCORD_PROCESSES_SINGLE"
else
    CONFIG_FILE="ecosystem.dual.config.js"
    PROCESSES="$DISCORD_PROCESSES_DUAL"
fi

# 安全刪除舊進程
safe_pm2_delete "$PROCESSES"

# 啟動新進程
pm2 start "$CONFIG_FILE"

# ✅ 只操作當前模式的進程
# ✅ 明確指定進程名稱
# ✅ 優雅處理進程不存在的情況
```

### manage.sh

管理腳本的所有命令都使用安全函數：

```bash
stop)
    # 根據當前模式停止相應進程
    CURRENT_PROCESSES=$(get_processes_for_mode "$PROCESS_MODE")
    safe_pm2_stop "$CURRENT_PROCESSES"
    
    # 同時檢查並停止其他模式的進程
    OTHER_MODE=$([ "$PROCESS_MODE" = "dual" ] && echo "single" || echo "dual")
    OTHER_PROCESSES=$(get_processes_for_mode "$OTHER_MODE")
    safe_pm2_stop "$OTHER_PROCESSES"
    ;;

restart)
    # 根據當前模式重啟相應進程
    CURRENT_PROCESSES=$(get_processes_for_mode "$PROCESS_MODE")
    safe_pm2_restart "$CURRENT_PROCESSES"
    ;;

restart-prod)
    # 完全重啟（重新載入配置）
    CURRENT_PROCESSES=$(get_processes_for_mode "$PROCESS_MODE")
    safe_pm2_delete "$CURRENT_PROCESSES"
    
    if [ "$PROCESS_MODE" = "single" ]; then
        pm2 start ecosystem.single.config.js
    else
        pm2 start ecosystem.dual.config.js
    fi
    ;;

switch-mode)
    # 切換進程模式
    cleanup_discord_processes
    
    if [ "$NEW_MODE" = "single" ]; then
        pm2 start ecosystem.single.config.js
    else
        pm2 start ecosystem.dual.config.js
    fi
    ;;
```

## 錯誤處理

### 進程不存在

當嘗試操作不存在的進程時，腳本會優雅處理：

```bash
# 方法 1: 使用 2>/dev/null
pm2 delete discord-server 2>/dev/null || true

# 方法 2: 使用安全函數
safe_pm2_delete "discord-server"
# 函數內部會檢查進程是否存在

# 輸出範例
ℹ️  進程不存在，跳過: discord-server
```

### 進程操作失敗

當 PM2 命令失敗時，提供清晰的錯誤信息：

```bash
if ! pm2 start ecosystem.config.js; then
    log_error "啟動失敗"
    log_info "請檢查: pm2 logs --err"
    log_info "或執行: ./manage.sh health"
    exit 1
fi
```

### 模式衝突

當檢測到雙模式進程同時運行時，自動清理：

```bash
if [ -n "$(get_running_discord_processes)" ]; then
    log_warning "檢測到運行中的 Discord 進程"
    log_info "將清理現有進程以避免衝突"
    cleanup_discord_processes
fi
```

## 多應用環境支援

### 場景說明

假設你的伺服器運行多個應用：

```bash
pm2 list
# ┌─────┬──────────────────┬─────────┬─────────┐
# │ id  │ name             │ status  │ memory  │
# ├─────┼──────────────────┼─────────┼─────────┤
# │ 0   │ discord-server   │ online  │ 150 MB  │  ← Discord 應用
# │ 1   │ discord-client   │ online  │ 200 MB  │  ← Discord 應用
# │ 2   │ my-blog          │ online  │ 100 MB  │  ← 其他應用
# │ 3   │ api-gateway      │ online  │ 180 MB  │  ← 其他應用
# │ 4   │ worker-service   │ online  │ 120 MB  │  ← 其他應用
# └─────┴──────────────────┴─────────┴─────────┘
```

### 安全保證

執行 Discord 應用的管理命令時：

```bash
# 停止 Discord 應用
./manage.sh stop
# ✅ 只停止 discord-server 和 discord-client
# ✅ my-blog、api-gateway、worker-service 完全不受影響

# 重啟 Discord 應用
./manage.sh restart
# ✅ 只重啟 discord-server 和 discord-client
# ✅ 其他應用繼續正常運行

# 部署 Discord 應用
./deploy.sh
# ✅ 只清理和部署 Discord 應用進程
# ✅ 其他應用不受任何影響

# 切換進程模式
./manage.sh switch-mode single
# ✅ 只清理 discord-server 和 discord-client
# ✅ 啟動 discord-app
# ✅ 其他應用完全不受影響
```

### 驗證方法

你可以通過以下步驟驗證安全性：

```bash
# 1. 創建測試進程
pm2 start "sleep 3600" --name test-app-1
pm2 start "sleep 3600" --name test-app-2

# 2. 查看所有進程
pm2 list
# 應該看到 test-app-1 和 test-app-2

# 3. 執行 Discord 應用管理命令
./manage.sh restart
./deploy.sh
./manage.sh switch-mode single

# 4. 再次查看進程
pm2 list
# test-app-1 和 test-app-2 應該仍在運行

# 5. 清理測試進程
pm2 delete test-app-1 test-app-2
```

## 操作日誌

所有 PM2 操作都會記錄詳細日誌，使用顏色編碼：

### 日誌級別

- 🔵 **INFO** - 一般信息（藍色）
- ✅ **SUCCESS** - 操作成功（綠色）
- ⚠️ **WARNING** - 警告信息（黃色）
- ❌ **ERROR** - 錯誤信息（紅色）

### 日誌範例

```bash
# 停止進程
🔵 停止 Discord 應用進程: discord-server discord-client
✅ 已停止: discord-server
✅ 已停止: discord-client

# 刪除進程
🔵 刪除 Discord 應用進程: discord-server discord-client
✅ 已刪除: discord-server
ℹ️  進程不存在，跳過: discord-client

# 重啟進程
🔵 重啟 Discord 應用進程: discord-server discord-client
✅ 已重啟: discord-server
✅ 已重啟: discord-client

# 清理進程
🔵 清理所有 Discord 應用進程...
✅ 已刪除: discord-server
✅ 已刪除: discord-client
ℹ️  進程不存在，跳過: discord-app
```

## 最佳實踐

### 1. 定期檢查進程狀態

```bash
# 查看所有進程
pm2 list

# 查看 Discord 應用進程
pm2 list | grep discord

# 查看詳細信息
pm2 describe discord-server
```

### 2. 使用管理腳本

優先使用管理腳本而非直接使用 PM2 命令：

```bash
# ✅ 推薦：使用管理腳本
./manage.sh restart
./manage.sh stop
./manage.sh logs

# ⚠️ 不推薦：直接使用 PM2 命令
pm2 restart discord-server
pm2 stop discord-client
```

### 3. 備份重要數據

在執行管理命令前備份數據：

```bash
# 備份資料庫
./manage.sh backup

# 然後執行管理命令
./manage.sh restart-prod
```

### 4. 查看操作日誌

執行管理命令後查看日誌：

```bash
# 查看所有日誌
./manage.sh logs

# 查看特定進程日誌
./manage.sh logs-server
./manage.sh logs-client

# 查看 PM2 日誌
pm2 logs discord-server --lines 50
```

### 5. 測試環境驗證

在生產環境執行前，先在測試環境驗證：

```bash
# 測試環境
./manage.sh restart
# 驗證功能正常

# 生產環境
./manage.sh restart-prod
```

### 6. 監控進程健康

定期執行健康檢查：

```bash
# 健康檢查
./manage.sh health

# 查看進程狀態
./manage.sh status

# 查看系統資源
pm2 monit
```

## 故障排除

### 問題：進程無法停止

```bash
# 檢查進程狀態
pm2 describe discord-server

# 強制停止
pm2 stop discord-server --force

# 如果仍無法停止，刪除進程
pm2 delete discord-server
```

### 問題：進程名稱衝突

```bash
# 查看所有進程
pm2 list

# 如果發現名稱衝突，刪除衝突的進程
pm2 delete <衝突的進程名稱>

# 重新啟動 Discord 應用
./manage.sh start
```

### 問題：模式切換失敗

```bash
# 清理所有 Discord 進程
cleanup_discord_processes

# 或手動清理
pm2 delete discord-server discord-client discord-app 2>/dev/null || true

# 重新啟動
./manage.sh start
```

### 問題：其他應用受影響

如果發現其他應用受到影響：

1. **立即檢查**：
   ```bash
   pm2 list
   # 查看哪些進程受影響
   ```

2. **查看日誌**：
   ```bash
   # 查看管理腳本日誌
   cat logs/manage.log
   
   # 查看 PM2 日誌
   pm2 logs --err
   ```

3. **報告問題**：
   - 記錄執行的命令
   - 記錄進程狀態
   - 提交 Issue 到 GitHub

4. **恢復服務**：
   ```bash
   # 重啟受影響的應用
   pm2 restart <受影響的應用名稱>
   ```

## 配置文件

### ecosystem.dual.config.js

雙進程模式配置：

```javascript
module.exports = {
  apps: [
    {
      name: 'discord-server',  // ← 專屬進程名稱
      script: './server/index.js',
      // ... 其他配置
    },
    {
      name: 'discord-client',  // ← 專屬進程名稱
      script: 'npm',
      args: 'start',
      cwd: './client',
      // ... 其他配置
    }
  ]
};
```

### ecosystem.single.config.js

單進程模式配置：

```javascript
module.exports = {
  apps: [
    {
      name: 'discord-app',  // ← 專屬進程名稱
      script: './server/index.js',
      // ... 其他配置
    }
  ]
};
```

### 配置原則

1. **進程名稱** - 必須使用 `discord-` 前綴
2. **一致性** - 所有配置文件使用相同的命名規範
3. **文檔化** - 在配置文件中添加註釋說明進程名稱

## 安全檢查清單

在執行管理命令前，確認以下事項：

- [ ] 已備份重要數據
- [ ] 了解命令的影響範圍
- [ ] 查看當前進程狀態（`pm2 list`）
- [ ] 確認沒有其他用戶正在使用應用
- [ ] 準備好回滾方案
- [ ] 知道如何查看日誌
- [ ] 了解如何恢復服務

## 相關文檔

- [README.md](../README.md) - 專案概述和快速開始
- [CONFIGURATION.md](../CONFIGURATION.md) - 配置指南
- [DEVELOPMENT.md](../DEVELOPMENT.md) - 開發指南
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - 快速參考
- [管理腳本原始碼](../scripts/pm2-utils.sh) - 安全操作函數實現

## 總結

本專案的 PM2 安全操作規範確保：

1. ✅ **隔離性** - 只操作 Discord 應用進程
2. ✅ **安全性** - 絕不使用全域命令
3. ✅ **可靠性** - 優雅處理錯誤情況
4. ✅ **可追蹤性** - 完整的操作日誌
5. ✅ **可維護性** - 統一的安全操作函數
6. ✅ **多應用支援** - 不影響其他 PM2 進程

通過遵循這些規範，你可以安全地在多應用環境中管理 Discord 統計應用，而不用擔心影響其他服務。
