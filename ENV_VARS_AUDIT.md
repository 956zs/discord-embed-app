# 環境變數審查報告

## ✅ 已修復的問題

### 1. setup-env.sh 修復
- ✅ 修復 `sed -i` 跨平台兼容性（macOS vs Linux）
- ✅ 添加 `BACKEND_URL` 生成（用於 Next.js API routes）
- ✅ 在 `bot/.env` 中添加所有必要欄位（`DISCORD_CLIENT_ID`, `DISCORD_APPLICATION_ID`, `EMBEDDED_APP_URL`）
- ✅ 自動設定 `EMBEDDED_APP_URL` 根據環境

### 2. 環境變數命名統一

## 📋 環境變數清單

### Root `.env`
```bash
DISCORD_CLIENT_ID          # Discord Application Client ID
DISCORD_CLIENT_SECRET      # Discord OAuth2 Client Secret
DISCORD_BOT_TOKEN          # Discord Bot Token
PORT                       # API Server 端口 (預設: 3008)
CLIENT_PORT                # Next.js 端口 (預設: 3000)
ALLOWED_GUILD_IDS          # 白名單伺服器 ID (逗號分隔)
NODE_ENV                   # development | production
ENABLE_MONITORING          # true | false (監控系統)
METRICS_INTERVAL           # 指標收集間隔 (毫秒)
METRICS_RETENTION_HOURS    # 指標保留時間 (小時)
ALERT_CPU_WARN             # CPU 警告閾值 (%)
ALERT_CPU_ERROR            # CPU 錯誤閾值 (%)
ALERT_MEMORY_WARN          # 記憶體警告閾值 (%)
ALERT_MEMORY_ERROR         # 記憶體錯誤閾值 (%)
ADMIN_TOKEN                # 監控端點管理員 Token
WEBHOOK_ENABLED            # true | false (Webhook 通知)
WEBHOOK_URLS               # Discord Webhook URLs (逗號分隔)
```

### Bot `bot/.env`
```bash
DISCORD_BOT_TOKEN          # Discord Bot Token
DISCORD_CLIENT_ID          # Discord Application Client ID
DISCORD_APPLICATION_ID     # Discord Application ID (與 CLIENT_ID 相同)
ALLOWED_GUILD_IDS          # 白名單伺服器 ID (逗號分隔)
EMBEDDED_APP_URL           # Embedded App URL (開發用)
DB_HOST                    # PostgreSQL 主機
DB_PORT                    # PostgreSQL 端口 (預設: 5432)
DB_NAME                    # 資料庫名稱
DB_USER                    # 資料庫使用者
DB_PASSWORD                # 資料庫密碼
NODE_ENV                   # development | production
```

### Client `client/.env.local`
```bash
NEXT_PUBLIC_DISCORD_CLIENT_ID  # Discord Application Client ID (客戶端可見)
BACKEND_URL                     # Backend API URL (僅服務器端，用於 API routes)
NEXT_PUBLIC_ENABLE_DEV_MODE     # true | false (開發模式)
NEXT_PUBLIC_DEV_GUILD_ID        # 測試伺服器 ID (僅開發模式)
NEXT_PUBLIC_DEV_USER_ID         # 測試用戶 ID (僅開發模式)
NODE_ENV                        # development | production
```

## 🔍 使用位置分析

### `DISCORD_CLIENT_ID`
- ✅ Root `.env` - 由 server 使用
- ✅ Bot `bot/.env` - 由 bot 使用
- ✅ Client `client/.env.local` - 作為 `NEXT_PUBLIC_DISCORD_CLIENT_ID`
- ✅ `client/next.config.ts` - 讀取 `NEXT_PUBLIC_DISCORD_CLIENT_ID`

### `DISCORD_BOT_TOKEN`
- ✅ Root `.env` - 主要配置
- ✅ Bot `bot/.env` - bot 實際使用
- ✅ `bot/index.js` - 讀取 `process.env.DISCORD_BOT_TOKEN`

### `PORT`
- ✅ Root `.env` - 定義 API server 端口
- ✅ `server/index.js` - 讀取 `process.env.PORT || 3001`
- ✅ `ecosystem.config.js` - 讀取 `process.env.PORT || 3008`

### `CLIENT_PORT`
- ✅ Root `.env` - 定義 Next.js 端口
- ✅ `ecosystem.config.js` - 讀取 `process.env.CLIENT_PORT || 3000`

### `ALLOWED_GUILD_IDS`
- ✅ Root `.env` - 主要配置
- ✅ Bot `bot/.env` - bot 使用
- ✅ `bot/index.js` - 讀取並分割為陣列
- ✅ `server/utils/guildManager.js` - 讀取並驗證

### `BACKEND_URL` (服務器端)
- ✅ Client `client/.env.local` - Next.js API routes 使用
- ✅ `client/app/api/auth/token/route.ts` - 讀取 `process.env.BACKEND_URL`
- ✅ `client/app/api/stats/[...path]/route.ts` - 讀取 `process.env.BACKEND_URL`
- ✅ `client/app/api/fetch/[...path]/route.ts` - 讀取 `process.env.BACKEND_URL`
- ✅ `client/app/api/welcome/[...path]/route.ts` - 讀取 `process.env.BACKEND_URL`

### `NEXT_PUBLIC_*` (客戶端可見)
- ✅ `NEXT_PUBLIC_DISCORD_CLIENT_ID` - Discord SDK 初始化
- ✅ `NEXT_PUBLIC_ENABLE_DEV_MODE` - 開發模式開關
- ✅ `NEXT_PUBLIC_DEV_GUILD_ID` - 開發模式測試伺服器
- ✅ `NEXT_PUBLIC_DEV_USER_ID` - 開發模式測試用戶

### 資料庫連線 (僅 Bot)
- ✅ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- ✅ `bot/database/db.js` - 建立 PostgreSQL 連接池
- ⚠️ Server 不直接連接資料庫，透過 bot 模組使用

### 監控系統
- ✅ `ENABLE_MONITORING` - 啟用/停用監控
- ✅ `METRICS_INTERVAL` - 指標收集間隔
- ✅ `METRICS_RETENTION_HOURS` - 指標保留時間
- ✅ `ALERT_*` - 警報閾值
- ✅ `ADMIN_TOKEN` - 監控端點認證
- ✅ `WEBHOOK_ENABLED`, `WEBHOOK_URLS` - Webhook 通知

## ⚠️ 注意事項

### 1. 環境變數載入順序
```
Root .env → Bot bot/.env → Client client/.env.local
```

### 2. Next.js 環境變數規則
- `NEXT_PUBLIC_*` - 暴露給瀏覽器（客戶端）
- 其他變數 - 僅服務器端（API routes）

### 3. 安全性
- ❌ 不要在 `NEXT_PUBLIC_*` 中放敏感資訊
- ✅ `BACKEND_URL` 是服務器端變數，不會暴露給瀏覽器
- ✅ `DISCORD_BOT_TOKEN`, `DB_PASSWORD` 等敏感資訊僅在服務器端

### 4. 白名單機制
- Root `.env` 和 `bot/.env` 中的 `ALLOWED_GUILD_IDS` 應該相同
- 空值 = 允許所有伺服器（不建議用於生產環境）

## 🎯 建議

### 1. 使用 setup-env.sh
```bash
./setup-env.sh
```
這是最簡單且最安全的配置方式。

### 2. 驗證配置
```bash
# 檢查所有 .env 檔案是否存在
ls -la .env bot/.env client/.env.local

# 測試資料庫連接
cd bot && node -e "require('./database/db')"

# 測試 API server
curl http://localhost:3008/health
```

### 3. 生產環境檢查清單
- [ ] 設定 `ALLOWED_GUILD_IDS`
- [ ] 使用強密碼 `DB_PASSWORD`
- [ ] 設定 `NODE_ENV=production`
- [ ] 停用 `NEXT_PUBLIC_ENABLE_DEV_MODE`
- [ ] 配置 `BACKEND_URL` 為實際 API URL
- [ ] 考慮啟用 `ENABLE_MONITORING`
- [ ] 設定 `ADMIN_TOKEN` 保護監控端點

## 📝 變更歷史

### 2024-11-19
- ✅ 修復 `setup-env.sh` 的 `sed -i` 跨平台問題
- ✅ 添加 `BACKEND_URL` 生成
- ✅ 統一 `bot/.env` 格式
- ✅ 添加 `EMBEDDED_APP_URL` 自動配置
- ✅ 完成環境變數審查

## 🔗 相關文檔

- `docs/ENVIRONMENT_VARIABLES.md` - 完整環境變數指南
- `.env.example` - Root 環境變數範例
- `client/.env.example` - Client 環境變數範例
- `QUICK_REFERENCE.md` - 快速參考指南
