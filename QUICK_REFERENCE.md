# 快速參考指南

## 環境設置

### 首次設置
```bash
./setup-env.sh
```

### 手動設置
```bash
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.example client/.env.local
# 編輯文件並填入你的值
```

## 環境變數

### 必需變數

| 文件 | 變數 | 獲取位置 |
|------|----------|--------------|
| `.env` | `DISCORD_CLIENT_ID` | Discord Developer Portal → General Information |
| `.env` | `DISCORD_CLIENT_SECRET` | Discord Developer Portal → OAuth2 |
| `.env` | `DISCORD_BOT_TOKEN` | Discord Developer Portal → Bot |
| `bot/.env` | `DB_PASSWORD` | 你的 PostgreSQL 密碼 |
| `client/.env.local` | `NEXT_PUBLIC_API_URL` | 你的 API URL（例如：http://localhost:3008）|

### 可選變數

| 文件 | 變數 | 用途 |
|------|----------|---------|
| `.env` | `ALLOWED_GUILD_IDS` | 白名單特定 Discord 伺服器 |
| `client/.env.local` | `NEXT_PUBLIC_ENABLE_DEV_MODE` | 啟用本地測試（無需 Discord）|
| `client/.env.local` | `NEXT_PUBLIC_DEV_GUILD_ID` | 開發模式的測試伺服器 ID |

## 常用命令

### 開發
```bash
npm run dev          # 啟動所有服務（開發模式）
npm run server       # 只啟動 API 伺服器
npm run client       # 只啟動 Next.js 前端
npm run bot          # 只啟動 bot
```

### 生產
```bash
./deploy.sh          # 一鍵部署
./update.sh          # 快速更新並重啟
./manage.sh restart  # 重啟所有服務
pm2 logs             # 查看日誌
```

### 資料庫
```bash
# 初始化資料庫
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/schema.sql

# 備份
./manage.sh backup

# 還原
./manage.sh restore backups/discord_stats_YYYYMMDD_HHMMSS.sql.gz
```

### 管理
```bash
./manage.sh status   # 查看服務狀態
./manage.sh logs     # 查看所有日誌
./manage.sh health   # 健康檢查
./manage.sh clean    # 清理日誌
```

## 專案結構

```
discord-embed-app/
├── .env                    # 根目錄配置
├── bot/
│   ├── .env               # Bot 配置
│   └── database/          # 資料庫架構
├── client/
│   ├── .env.local         # 前端配置
│   └── next.config.ts     # Next.js 配置（使用環境變數）
├── server/                # API 伺服器
├── docs/                  # 文檔
│   ├── ENVIRONMENT_VARIABLES.md
│   └── ...
├── ecosystem.config.js    # PM2 配置（使用環境變數）
├── setup-env.sh          # 互動式設置
├── deploy.sh             # 部署腳本
├── manage.sh             # 管理腳本
└── cleanup-project.sh    # 清理腳本
```

## 配置文件

### client/next.config.ts
- ✅ 使用 `NEXT_PUBLIC_DISCORD_CLIENT_ID`
- ✅ 使用 `NEXT_PUBLIC_API_URL`
- ✅ 動態 CORS 和 rewrites

### ecosystem.config.js
- ✅ 使用 dotenv 載入 `.env`
- ✅ 使用 `process.env.PORT`
- ✅ 使用 `process.env.CLIENT_PORT`

## 故障排除

### 無法連接資料庫
```bash
# 檢查連接
psql -h localhost -U postgres -d discord_stats -c "SELECT 1"

# 檢查 .env 值
cat bot/.env | grep DB_
```

### API 無響應
```bash
# 檢查是否運行
curl http://localhost:3008/health

# 檢查 .env 中的端口
cat .env | grep PORT

# 重啟
pm2 restart discord-server
```

### 前端無法載入
```bash
# 檢查是否運行
curl http://localhost:3000

# 重新構建
cd client && npm run build && cd ..

# 重啟
pm2 restart discord-client
```

### 環境變數無效
```bash
# 清除緩存
rm -rf client/.next

# 重新構建
cd client && npm run build && cd ..

# 重啟所有服務
pm2 restart all
```

## 安全檢查清單

- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 開發和生產使用不同的 token
- [ ] 生產環境設置了 `ALLOWED_GUILD_IDS`
- [ ] 使用強密碼保護資料庫
- [ ] 定期輪換密鑰

## 端口參考

| 服務 | 預設端口 | 環境變數 |
|---------|--------------|---------------------|
| API 伺服器 | 3008 | `PORT` |
| Next.js 前端 | 3000 | `CLIENT_PORT` |
| PostgreSQL | 5432 | `DB_PORT` |

## URL 參考

| 環境 | API URL | 前端 URL |
|-------------|---------|------------|
| 開發 | http://localhost:3008 | http://localhost:3000 |
| 生產 | https://api.yourdomain.com | https://yourdomain.com |
| Discord Embedded | - | https://{CLIENT_ID}.discordsays.com |

## 獲取 Discord ID

### Application Client ID
1. Discord Developer Portal
2. 你的應用 → General Information
3. 複製 "Application ID"

### 伺服器 ID (Guild ID)
1. 在 Discord 中啟用開發者模式
2. 右鍵點擊伺服器圖標
3. 複製 ID

### 用戶 ID
1. 在 Discord 中啟用開發者模式
2. 右鍵點擊用戶名
3. 複製 ID

## 文檔

- `README.md` - 專案概覽
- `SETUP.md` - 設置說明
- `CONFIGURATION.md` - 配置指南
- `DEVELOPMENT.md` - 開發指南
- `TROUBLESHOOTING.md` - 故障排除指南
- `docs/ENVIRONMENT_VARIABLES.md` - 完整環境變數參考
- `PROJECT_CLEANUP_SUMMARY.md` - 最近變更和遷移指南

## 支援

需要幫助？查看：
1. `docs/ENVIRONMENT_VARIABLES.md` - 詳細配置
2. `TROUBLESHOOTING.md` - 常見問題
3. `pm2 logs` - 服務日誌
4. `./manage.sh health` - 健康檢查

---

**提示：** 執行 `./cleanup-project.sh` 來整理和驗證你的專案結構。
