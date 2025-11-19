# 腳本目錄

本目錄包含專案的各種腳本文件。

## 📁 目錄結構

```
scripts/
├── pm2-utils.sh           # PM2 安全操作函數庫
├── utils/                 # 工具腳本
│   ├── check-oauth-config.sh
│   ├── troubleshoot.sh
│   └── reorganize-docs.sh
└── archive/               # 過時腳本（已被取代）
    └── restart-production.sh
```

## 🔧 核心腳本（根目錄）

這些腳本位於專案根目錄，是日常使用的核心工具：

### deploy.sh
一鍵部署腳本，用於首次部署或完整重新部署。

**功能**：
- 檢查環境和依賴
- 安裝所有 npm 套件
- 初始化資料庫
- 構建前端
- 使用 PM2 啟動服務

**使用**：
```bash
./deploy.sh
```

### manage.sh
服務管理腳本，提供所有日常管理命令。

**功能**：
- 啟動/停止/重啟服務
- 查看狀態和日誌
- 備份/還原資料庫
- 健康檢查
- 進程模式切換

**使用**：
```bash
./manage.sh start           # 啟動服務
./manage.sh stop            # 停止服務
./manage.sh restart         # 重啟服務
./manage.sh status          # 查看狀態
./manage.sh logs            # 查看日誌
./manage.sh backup          # 備份資料庫
./manage.sh health          # 健康檢查
./manage.sh switch-mode dual    # 切換進程模式
```

### update.sh
快速更新腳本，用於更新代碼和重啟服務。

**功能**：
- 備份資料庫
- 拉取最新代碼
- 更新依賴（可選）
- 執行資料庫升級（可選）
- 重新構建前端
- 重啟服務

**使用**：
```bash
./update.sh
```

### setup-env.sh
互動式環境配置工具，用於首次設置或重新配置環境變數。

**功能**：
- 互動式收集配置信息
- 生成所有 .env 文件
- 驗證配置正確性
- 測試資料庫連接

**使用**：
```bash
./setup-env.sh
```

## 🛠️ PM2 工具函數

### pm2-utils.sh
PM2 安全操作函數庫，被所有管理腳本引用。

**功能**：
- `safe_pm2_stop` - 安全停止進程
- `safe_pm2_delete` - 安全刪除進程
- `safe_pm2_restart` - 安全重啟進程
- `cleanup_discord_processes` - 清理所有 Discord 進程
- `get_running_discord_processes` - 獲取運行中的進程
- `get_processes_for_mode` - 根據模式獲取進程列表

**特點**：
- 只操作 Discord 應用進程
- 不影響其他 PM2 進程
- 優雅處理錯誤
- 完整的操作日誌

**使用**：
```bash
# 在其他腳本中引用
source scripts/pm2-utils.sh

# 使用函數
safe_pm2_stop "discord-server discord-client"
safe_pm2_restart "$DISCORD_PROCESSES_DUAL"
cleanup_discord_processes
```

詳細說明請參考 [PM2 安全操作文檔](../docs/PM2_SAFETY.md)。

## 🔨 工具腳本

### utils/check-oauth-config.sh
檢查 OAuth 配置是否正確。

**功能**：
- 驗證 Discord Client ID
- 驗證 Discord Client Secret
- 檢查配置文件一致性

**使用**：
```bash
./scripts/utils/check-oauth-config.sh
```

### utils/troubleshoot.sh
故障排除工具，自動診斷常見問題。

**功能**：
- 檢查服務狀態
- 檢查資料庫連接
- 檢查環境變數
- 檢查端口占用
- 生成診斷報告

**使用**：
```bash
./scripts/utils/troubleshoot.sh
```

### utils/reorganize-docs.sh
文檔重組工具（已執行完成）。

**功能**：
- 整理根目錄散落的文檔
- 移動文檔到適當目錄
- 創建目錄索引

**使用**：
```bash
./scripts/utils/reorganize-docs.sh
```

## 📦 過時腳本

### archive/restart-production.sh
舊的生產環境重啟腳本，已被 `manage.sh restart-prod` 取代。

**替代命令**：
```bash
./manage.sh restart-prod
```

## 📝 腳本開發規範

### 命名規範
- 使用小寫字母和連字符
- 描述性命名，清楚表明用途
- 例如：`setup-env.sh`、`check-oauth-config.sh`

### 結構規範
```bash
#!/bin/bash

# 腳本說明
# 功能描述

# 設置錯誤處理（可選）
set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日誌函數
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

# 主要邏輯
main() {
    # 腳本內容
}

# 執行主函數
main "$@"
```

### 安全規範
1. **錯誤處理**：使用 `set -e` 或手動檢查命令返回值
2. **輸入驗證**：驗證用戶輸入和參數
3. **權限檢查**：檢查必要的文件和目錄權限
4. **備份優先**：修改重要文件前先備份
5. **日誌記錄**：記錄所有重要操作

### PM2 安全規範
1. **絕不使用** `pm2 delete all`、`pm2 restart all`、`pm2 stop all`
2. **明確指定**進程名稱
3. **使用安全函數**：引用 `scripts/pm2-utils.sh`
4. **優雅處理**進程不存在的情況
5. **完整日誌**：記錄所有 PM2 操作

詳細說明請參考 [PM2 安全操作文檔](../docs/PM2_SAFETY.md)。

## 🧪 測試腳本

PM2 安全操作測試腳本位於 `tests/pm2-safety/` 目錄：

- `test-pm2-safety.sh` - 基本安全測試
- `test-mode-switch.sh` - 模式切換測試

詳細說明請參考 [測試文檔](../tests/pm2-safety/README.md)。

## 📚 相關文檔

- [完整部署指南](../COMPLETE_DEPLOYMENT_GUIDE.md)
- [快速參考](../QUICK_REFERENCE.md)
- [PM2 安全操作](../docs/PM2_SAFETY.md)
- [開發指南](../docs/guides/DEVELOPMENT.md)

---

**需要幫助？** 查看相關文檔或提交 [Issue](https://github.com/956zs/discord-embed-app/issues)。
