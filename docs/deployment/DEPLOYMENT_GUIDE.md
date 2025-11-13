# Discord 統計應用 - 完整部署指南

## 📋 目錄

1. [前置需求](#前置需求)
2. [快速部署](#快速部署)
3. [手動部署](#手動部署)
4. [配置說明](#配置說明)
5. [管理命令](#管理命令)
6. [故障排除](#故障排除)
7. [更新應用](#更新應用)

---

## 前置需求

### 必要軟體

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **npm** >= 9.0.0
- **PM2** (會自動安裝)

### Discord 配置

1. Discord 應用程式（在 Discord Developer Portal 創建）
2. Bot Token
3. Client ID 和 Client Secret
4. 已配置的 Activity URL

### 系統需求

- **記憶體**: 至少 2GB RAM
- **硬碟**: 至少 5GB 可用空間
- **作業系統**: Linux / macOS / Windows (WSL)

---

## 快速部署

### 1. 克隆專案

```bash
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app
```

### 2. 配置環境變數

複製範例配置文件：

```bash
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.example client/.env.local
```

編輯這些文件並填入正確的值（參考[配置說明](#配置說明)）。

### 3. 執行一鍵部署

```bash
./deploy.sh
```

這個腳本會自動：
- ✅ 檢查環境和依賴
- ✅ 安裝所有 npm 套件
- ✅ 設置資料庫
- ✅ 構建前端
- ✅ 使用 PM2 啟動所有服務

### 4. 驗證部署

```bash
./manage.sh health
```

---

## 手動部署

如果你想手動控制每個步驟：

### 1. 安裝依賴

```bash
# 根目錄
npm install

# Bot
cd bot && npm install && cd ..

# Client
cd client && npm install && cd ..
```

### 2. 設置資料庫

```bash
# 載入環境變數
source bot/.env

# 執行資料庫架構
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/schema.sql

# 添加討論串支援
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql

# 添加附件支援
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql
```

### 3. 構建前端

```bash
cd client
npm run build
cd ..
```

### 4. 啟動服務

```bash
# 使用 PM2
pm2 start ecosystem.config.js

# 或手動啟動
npm run server &    # API Server
npm run bot &       # Discord Bot
cd client && npm start &  # Next.js Client
```

---

## 配置說明

### 根目錄 `.env`

```env
# Discord 配置
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token

# API 配置
PORT=3008

# 白名單（可選，逗號分隔）
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2
```

### Bot `.env`

```env
# 資料庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password

# Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token

# 白名單（與根目錄相同）
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2
```

### Client `.env.local`

```env
# Discord 配置
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id

# API URL（生產環境）
NEXT_PUBLIC_API_URL=https://your-domain.com

# 開發模式（可選）
NEXT_PUBLIC_ENABLE_DEV_MODE=false
NEXT_PUBLIC_DEV_GUILD_ID=your_test_guild_id
NEXT_PUBLIC_DEV_USER_ID=your_test_user_id
```

---

## 管理命令

我們提供了三個管理腳本：

### `deploy.sh` - 一鍵部署

完整部署應用，包含所有步驟。

```bash
./deploy.sh
```

### `update.sh` - 快速更新

更新已部署的應用（拉取代碼、更新依賴、重新構建、重啟）。

```bash
./update.sh
```

### `manage.sh` - 日常管理

```bash
# 啟動服務
./manage.sh start

# 停止服務
./manage.sh stop

# 重啟服務
./manage.sh restart

# 查看狀態
./manage.sh status

# 查看所有日誌
./manage.sh logs

# 查看特定服務日誌
./manage.sh logs-api
./manage.sh logs-bot
./manage.sh logs-client

# 備份資料庫
./manage.sh backup

# 還原資料庫
./manage.sh restore backups/discord_stats_20240101_120000.sql.gz

# 健康檢查
./manage.sh health

# 清理日誌和舊備份
./manage.sh clean
```

### PM2 命令

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs

# 重啟特定服務
pm2 restart discord-api
pm2 restart discord-bot
pm2 restart discord-client

# 停止所有服務
pm2 stop all

# 刪除所有服務
pm2 delete all

# 監控
pm2 monit

# 保存配置
pm2 save

# 設置開機自啟
pm2 startup
```

---

## 故障排除

### 服務無法啟動

1. **檢查日誌**
   ```bash
   pm2 logs
   ```

2. **檢查端口佔用**
   ```bash
   # 檢查 3008 端口（API）
   lsof -i :3008
   
   # 檢查 3000 端口（Client）
   lsof -i :3000
   ```

3. **檢查環境變數**
   ```bash
   # 確認配置文件存在
   ls -la .env bot/.env client/.env.local
   ```

### 資料庫連接失敗

1. **測試連接**
   ```bash
   psql -h localhost -p 5432 -U postgres -d discord_stats
   ```

2. **檢查 PostgreSQL 服務**
   ```bash
   # Linux
   sudo systemctl status postgresql
   
   # macOS
   brew services list
   ```

3. **檢查防火牆**
   ```bash
   # 確保 PostgreSQL 端口開放
   sudo ufw status
   ```

### Bot 無法連接 Discord

1. **檢查 Token**
   - 確認 `DISCORD_BOT_TOKEN` 正確
   - 在 Discord Developer Portal 重新生成 Token

2. **檢查權限**
   - Bot 需要以下權限：
     - Read Messages/View Channels
     - Send Messages
     - Read Message History
     - Add Reactions

3. **檢查 Intents**
   - 在 Discord Developer Portal 啟用：
     - Server Members Intent
     - Message Content Intent

### 前端無法載入

1. **檢查構建**
   ```bash
   cd client
   npm run build
   ```

2. **檢查 Next.js 日誌**
   ```bash
   pm2 logs discord-client
   ```

3. **清除快取**
   ```bash
   cd client
   rm -rf .next
   npm run build
   ```

### 記憶體不足

1. **增加 Node.js 記憶體限制**
   
   編輯 `ecosystem.config.js`：
   ```javascript
   node_args: '--max-old-space-size=2048'
   ```

2. **重啟服務**
   ```bash
   pm2 restart all
   ```

---

## 更新應用

### 自動更新

```bash
./update.sh
```

### 手動更新

```bash
# 1. 拉取最新代碼
git pull

# 2. 更新依賴
npm install
cd bot && npm install && cd ..
cd client && npm install && cd ..

# 3. 執行資料庫升級（如果有）
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_attachments.sql

# 4. 重新構建前端
cd client && npm run build && cd ..

# 5. 重啟服務
pm2 restart all
```

---

## 備份與還原

### 自動備份

```bash
# 創建備份
./manage.sh backup

# 備份會保存在 backups/ 目錄
# 格式: discord_stats_YYYYMMDD_HHMMSS.sql.gz
```

### 還原備份

```bash
./manage.sh restore backups/discord_stats_20240101_120000.sql.gz
```

### 定期備份（Cron）

添加到 crontab：

```bash
# 每天凌晨 2 點備份
0 2 * * * cd /path/to/discord-embed-app && ./manage.sh backup

# 每週日凌晨 3 點清理舊備份
0 3 * * 0 cd /path/to/discord-embed-app && ./manage.sh clean
```

---

## 生產環境建議

### 1. 使用反向代理

使用 Nginx 作為反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # API
    location /api {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Client
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 啟用 HTTPS

使用 Let's Encrypt：

```bash
sudo certbot --nginx -d your-domain.com
```

### 3. 設置防火牆

```bash
# 只開放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 4. 監控

```bash
# 使用 PM2 Plus（可選）
pm2 link <secret_key> <public_key>

# 或使用其他監控工具
# - Grafana + Prometheus
# - New Relic
# - DataDog
```

### 5. 日誌輪轉

PM2 自動處理日誌輪轉，但你也可以配置：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 效能優化

### 1. 資料庫索引

確保所有必要的索引都已創建（schema.sql 已包含）。

### 2. 連接池

調整 `bot/database/db.js` 中的連接池設置：

```javascript
const pool = new Pool({
  max: 20,           // 最大連接數
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Next.js 優化

在 `client/next.config.ts` 中：

```typescript
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // ... 其他配置
};
```

---

## 安全建議

1. **不要提交 .env 文件到 Git**
2. **定期更新依賴** (`npm audit fix`)
3. **使用強密碼** 保護資料庫
4. **限制 API 訪問** 使用白名單
5. **啟用 HTTPS** 在生產環境
6. **定期備份** 資料庫
7. **監控日誌** 檢查異常活動

---

## 支援

如有問題，請：

1. 查看日誌: `pm2 logs`
2. 檢查健康狀態: `./manage.sh health`
3. 查看故障排除章節
4. 提交 Issue 到 GitHub

---

## 授權

請參考 LICENSE 文件。
