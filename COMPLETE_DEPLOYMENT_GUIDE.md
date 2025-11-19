# Discord 統計應用 - 完整部署指南

> **最後更新**: 2024年  
> **版本**: v2.4.0  
> **適用環境**: 開發環境、測試環境、生產環境

## 📋 目錄

1. [系統需求](#系統需求)
2. [前置準備](#前置準備)
3. [快速部署](#快速部署)
4. [詳細部署步驟](#詳細部署步驟)
5. [環境配置](#環境配置)
6. [進程管理](#進程管理)
7. [生產環境部署](#生產環境部署)
8. [更新與維護](#更新與維護)
9. [監控與告警](#監控與告警)
10. [故障排除](#故障排除)
11. [安全最佳實踐](#安全最佳實踐)

---

## 系統需求

### 最低需求
- **作業系統**: Linux (Ubuntu 20.04+, CentOS 8+) 或 macOS
- **CPU**: 1 核心
- **記憶體**: 2GB RAM
- **硬碟**: 5GB 可用空間
- **Node.js**: 18.0.0 或更高版本
- **PostgreSQL**: 14.0 或更高版本
- **網路**: 穩定的網路連接（用於 Discord API）

### 推薦配置
- **作業系統**: Ubuntu 22.04 LTS
- **CPU**: 2 核心或更多
- **記憶體**: 4GB RAM 或更多
- **硬碟**: 20GB 可用空間（含日誌和備份）
- **Node.js**: 20.0.0 LTS
- **PostgreSQL**: 15.0 或更高版本
- **PM2**: 最新版本（用於進程管理）

### 網路需求
- 能夠訪問 Discord API (discord.com)
- 能夠訪問 Discord CDN (cdn.discordapp.com)
- 開放端口 3008（API 服務器）
- 開放端口 3000（前端服務）

---

## 前置準備

### 1. Discord 應用設置

#### 1.1 創建 Discord 應用

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊「New Application」創建新應用
3. 記錄以下資訊：
   - **Application ID** (在 General Information 頁面)
   - **Client Secret** (在 OAuth2 頁面，點擊 Reset Secret)
   - **Bot Token** (在 Bot 頁面，點擊 Reset Token)

#### 1.2 配置 Bot 權限

1. 前往「Bot」頁面
2. 啟用以下 Privileged Gateway Intents：
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
   - ✅ **Presence Intent** (可選)

3. Bot Permissions 設置：
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
   - ✅ Send Messages (可選，用於通知)

#### 1.3 配置 OAuth2

1. 前往「OAuth2」頁面
2. 添加 Redirect URLs：
   ```
   開發環境: http://localhost:3000
   生產環境: https://your-domain.com
   ```

#### 1.4 啟用 Activities (Embedded App)

1. 前往「Activities」頁面
2. 點擊「Enable Activities」
3. 配置 URL Mappings：
   - **Prefix**: `/`
   - **Target** (開發): `http://localhost:3000`
   - **Target** (生產): `https://your-domain.com`

#### 1.5 安裝 Bot 到伺服器

1. 前往「OAuth2」→「URL Generator」
2. 選擇 Scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. 選擇 Bot Permissions:
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
4. 複製生成的 URL 並在瀏覽器中打開
5. 選擇要安裝的伺服器並授權

#### 1.6 獲取伺服器 ID

1. 在 Discord 開啟「開發者模式」：
   - 設定 → 進階 → 開發者模式 (開啟)
2. 右鍵點擊伺服器圖標
3. 選擇「複製伺服器 ID」
4. 記錄此 ID，稍後配置時需要

### 2. 安裝系統依賴

#### Ubuntu/Debian

```bash
# 更新套件列表
sudo apt update

# 安裝 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安裝 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安裝 PM2
sudo npm install -g pm2

# 安裝 Git
sudo apt install -y git

# 驗證安裝
node --version    # 應顯示 v20.x.x
npm --version     # 應顯示 10.x.x
psql --version    # 應顯示 PostgreSQL 14+
pm2 --version     # 應顯示 5.x.x
```

#### CentOS/RHEL

```bash
# 安裝 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 安裝 PostgreSQL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安裝 PM2
sudo npm install -g pm2

# 安裝 Git
sudo yum install -y git
```

#### macOS

```bash
# 使用 Homebrew 安裝
brew install node@20
brew install postgresql@15
brew install git
npm install -g pm2

# 啟動 PostgreSQL
brew services start postgresql@15
```

### 3. 配置 PostgreSQL

```bash
# 切換到 postgres 用戶
sudo -u postgres psql

# 在 PostgreSQL 中執行以下命令：
```

```sql
-- 創建資料庫
CREATE DATABASE discord_stats;

-- 創建用戶（可選，使用自訂密碼）
CREATE USER discord_user WITH PASSWORD 'your_secure_password';

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE discord_stats TO discord_user;

-- 退出
\q
```

```bash
# 測試連接
psql -U discord_user -d discord_stats -h localhost
# 輸入密碼後應該能成功連接
```

---

## 快速部署

### 方法一：一鍵部署（推薦）

```bash
# 1. 克隆專案
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 2. 執行互動式配置工具
./setup-env.sh
# 按照提示輸入：
# - Discord Client ID
# - Discord Client Secret  
# - Discord Bot Token
# - 伺服器 ID
# - 資料庫連接資訊
# - API 端口（預設 3008）
# - 前端端口（預設 3000）

# 3. 執行一鍵部署
./deploy.sh
# 腳本會自動：
# ✅ 檢查環境和依賴
# ✅ 安裝所有 npm 套件
# ✅ 初始化資料庫
# ✅ 構建前端
# ✅ 使用 PM2 啟動服務

# 4. 驗證部署
./manage.sh health
pm2 status
```

部署完成後，服務將運行在：
- **API 服務器**: http://localhost:3008
- **前端應用**: http://localhost:3000

### 方法二：手動部署

如果你想完全控制每個步驟，請參考下一節「詳細部署步驟」。

---

## 詳細部署步驟

### 步驟 1: 克隆專案

```bash
# 克隆到指定目錄
cd ~
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 查看專案結構
ls -la
```

### 步驟 2: 配置環境變數

#### 2.1 根目錄 `.env`

```bash
cp .env.example .env
nano .env
```

```env
# Discord 應用配置
DISCORD_CLIENT_ID=你的_application_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token

# 伺服器配置
PORT=3008
CLIENT_PORT=3000

# 白名單（多個伺服器用逗號分隔）
ALLOWED_GUILD_IDS=你的伺服器id1,你的伺服器id2

# 環境
NODE_ENV=production

# 進程模式（dual 或 single）
PROCESS_MODE=dual

# 監控配置（可選）
ENABLE_MONITORING=true
ADMIN_TOKEN=your_secure_admin_token
WEBHOOK_ENABLED=false
WEBHOOK_URLS=
```

#### 2.2 Bot 配置 `bot/.env`

```bash
cp bot/.env.example bot/.env
nano bot/.env
```

```env
# Discord Bot Token
DISCORD_BOT_TOKEN=你的_bot_token

# 白名單
ALLOWED_GUILD_IDS=你的伺服器id1,你的伺服器id2

# 資料庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=discord_user
DB_PASSWORD=your_secure_password

# 環境
NODE_ENV=production
```

#### 2.3 前端配置 `client/.env.local`

```bash
cp client/.env.example client/.env.local
nano client/.env.local
```

```env
# Discord Client ID
NEXT_PUBLIC_DISCORD_CLIENT_ID=你的_application_id

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3008

# 開發模式（生產環境設為 false）
NEXT_PUBLIC_ENABLE_DEV_MODE=false

# 環境
NODE_ENV=production
```

### 步驟 3: 安裝依賴

```bash
# 安裝根目錄依賴
npm install

# 安裝 Bot 依賴
cd bot
npm install
cd ..

# 安裝前端依賴
cd client
npm install
cd ..
```

### 步驟 4: 初始化資料庫

```bash
# 執行主架構
psql -h localhost -U discord_user -d discord_stats -f bot/database/schema.sql

# 執行討論串支援升級
psql -h localhost -U discord_user -d discord_stats -f bot/database/add_thread_support.sql

# 執行附件支援升級
psql -h localhost -U discord_user -d discord_stats -f bot/database/add_attachments.sql

# 執行監控系統升級（如果啟用監控）
psql -h localhost -U discord_user -d discord_stats -f server/database/add_monitoring.sql

# 驗證表結構
psql -h localhost -U discord_user -d discord_stats -c "\dt"
```

### 步驟 5: 構建前端

```bash
cd client
npm run build
cd ..
```

### 步驟 6: 啟動服務

#### 選擇進程模式

**雙進程模式（推薦）**：
- 更好的故障隔離
- 獨立的日誌和監控
- 適合生產環境
- 記憶體使用: ~350-550MB

**單進程模式**：
- 節省 50-100MB 記憶體
- 適合資源受限環境
- 記憶體使用: ~300-450MB

```bash
# 使用雙進程模式（預設）
pm2 start ecosystem.dual.config.js

# 或使用單進程模式
pm2 start ecosystem.single.config.js

# 或使用管理腳本
./manage.sh start

# 保存 PM2 配置
pm2 save

# 設置開機自啟
pm2 startup
# 執行輸出的命令
```

### 步驟 7: 驗證部署

```bash
# 查看服務狀態
pm2 status

# 查看日誌
pm2 logs --lines 50

# 健康檢查
./manage.sh health

# 測試 API
curl http://localhost:3008/health

# 測試前端
curl http://localhost:3000

# 檢查資料庫連接
psql -h localhost -U discord_user -d discord_stats -c "SELECT COUNT(*) FROM messages;"
```

---


## 環境配置

### 環境變數詳解

#### 根目錄 `.env`

| 變數名 | 說明 | 範例 | 必填 |
|--------|------|------|------|
| `DISCORD_CLIENT_ID` | Discord Application ID | `123456789012345678` | ✅ |
| `DISCORD_CLIENT_SECRET` | Discord Client Secret | `abcdef123456...` | ✅ |
| `DISCORD_BOT_TOKEN` | Discord Bot Token | `MTIzNDU2Nzg5...` | ✅ |
| `PORT` | API 服務器端口 | `3008` | ✅ |
| `CLIENT_PORT` | 前端服務端口 | `3000` | ✅ |
| `ALLOWED_GUILD_IDS` | 白名單伺服器 ID | `123,456,789` | ✅ |
| `NODE_ENV` | 環境模式 | `production` | ✅ |
| `PROCESS_MODE` | 進程模式 | `dual` 或 `single` | ✅ |
| `ENABLE_MONITORING` | 啟用監控 | `true` 或 `false` | ❌ |
| `ADMIN_TOKEN` | 管理員 Token | `your_secure_token` | ❌ |
| `WEBHOOK_ENABLED` | 啟用 Webhook | `true` 或 `false` | ❌ |
| `WEBHOOK_URLS` | Webhook URLs | `https://...` | ❌ |

#### Bot `.env`

| 變數名 | 說明 | 範例 | 必填 |
|--------|------|------|------|
| `DISCORD_BOT_TOKEN` | Bot Token | `MTIzNDU2Nzg5...` | ✅ |
| `ALLOWED_GUILD_IDS` | 白名單伺服器 ID | `123,456,789` | ✅ |
| `DB_HOST` | 資料庫主機 | `localhost` | ✅ |
| `DB_PORT` | 資料庫端口 | `5432` | ✅ |
| `DB_NAME` | 資料庫名稱 | `discord_stats` | ✅ |
| `DB_USER` | 資料庫用戶 | `discord_user` | ✅ |
| `DB_PASSWORD` | 資料庫密碼 | `your_password` | ✅ |
| `NODE_ENV` | 環境模式 | `production` | ✅ |

#### 前端 `.env.local`

| 變數名 | 說明 | 範例 | 必填 |
|--------|------|------|------|
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Discord Client ID | `123456789012345678` | ✅ |
| `NEXT_PUBLIC_API_URL` | API 服務器 URL | `http://localhost:3008` | ✅ |
| `NEXT_PUBLIC_ENABLE_DEV_MODE` | 開發模式 | `false` | ❌ |
| `NODE_ENV` | 環境模式 | `production` | ✅ |

### 配置驗證

```bash
# 使用配置工具驗證
./setup-env.sh

# 或手動驗證
node -e "require('dotenv').config(); console.log(process.env.DISCORD_CLIENT_ID ? '✅ 配置正確' : '❌ 配置錯誤')"
```

---

## 進程管理

### PM2 安全操作規範

本專案的所有管理腳本都遵循嚴格的安全規範，**只操作 Discord 應用的進程**，絕不影響系統中的其他 PM2 進程。

#### 進程命名

**雙進程模式**：
- `discord-server` - API 服務器 + Bot
- `discord-client` - Next.js 前端

**單進程模式**：
- `discord-app` - API + Bot + Next.js 整合

#### 安全保證

✅ **絕不使用** `pm2 delete all`  
✅ **絕不使用** `pm2 restart all`  
✅ **絕不使用** `pm2 stop all`  
✅ **明確指定**進程名稱進行所有操作  
✅ **優雅處理**進程不存在的情況  
✅ **完整記錄**所有操作日誌

### 管理腳本使用

#### 基本命令

```bash
# 啟動服務
./manage.sh start

# 停止服務
./manage.sh stop

# 重啟服務（零停機）
./manage.sh restart

# 重啟並重新載入配置
./manage.sh restart-prod

# 查看狀態
./manage.sh status

# 查看日誌
./manage.sh logs              # 所有日誌
./manage.sh logs-server       # Server 日誌
./manage.sh logs-client       # Client 日誌

# 健康檢查
./manage.sh health

# 備份資料庫
./manage.sh backup

# 還原資料庫
./manage.sh restore backups/discord_stats_20240101_120000.sql.gz

# 清理日誌和舊備份
./manage.sh clean
```

#### 進程模式切換

```bash
# 切換到雙進程模式（推薦）
./manage.sh switch-mode dual

# 切換到單進程模式（節省資源）
./manage.sh switch-mode single

# 查看當前模式
grep PROCESS_MODE .env
```

#### 更新應用

```bash
# 快速更新（推薦）
./update.sh
# 自動執行：
# 1. 備份資料庫
# 2. 拉取最新代碼
# 3. 更新依賴
# 4. 重新構建前端
# 5. 重啟服務

# 手動更新
git pull
npm install
cd client && npm install && npm run build && cd ..
cd bot && npm install && cd ..
./manage.sh restart-prod
```

### PM2 直接命令

```bash
# 查看所有進程
pm2 list

# 查看特定進程
pm2 describe discord-server

# 查看日誌
pm2 logs discord-server --lines 100

# 監控資源使用
pm2 monit

# 重啟特定進程
pm2 restart discord-server

# 停止特定進程
pm2 stop discord-client

# 刪除進程
pm2 delete discord-server

# 保存配置
pm2 save

# 查看啟動腳本
pm2 startup
```

### 多應用環境支援

如果你的伺服器運行多個 PM2 應用，本專案的管理腳本保證不會干擾其他應用：

```bash
# 範例：伺服器上同時運行多個應用
pm2 list
# ┌─────┬──────────────────┬─────────┬─────────┐
# │ id  │ name             │ status  │ memory  │
# ├─────┼──────────────────┼─────────┼─────────┤
# │ 0   │ discord-server   │ online  │ 150 MB  │  ← Discord 應用
# │ 1   │ discord-client   │ online  │ 200 MB  │  ← Discord 應用
# │ 2   │ my-blog          │ online  │ 100 MB  │  ← 其他應用
# │ 3   │ api-gateway      │ online  │ 180 MB  │  ← 其他應用
# └─────┴──────────────────┴─────────┴─────────┘

# 執行 Discord 應用管理命令
./manage.sh restart
# ✅ 只重啟 discord-server 和 discord-client
# ✅ my-blog 和 api-gateway 完全不受影響
```

詳細說明請參考 [PM2 安全操作文檔](docs/PM2_SAFETY.md)。

---

## 生產環境部署

### 1. 伺服器準備

#### 1.1 安全設置

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 配置防火牆
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3008/tcp    # API（可選，如果需要外部訪問）
sudo ufw enable

# 創建專用用戶
sudo useradd -m -s /bin/bash discord
sudo usermod -aG sudo discord

# 切換到專用用戶
sudo su - discord
```

#### 1.2 安裝 HTTPS 證書

Discord Embedded App **必須使用 HTTPS**（本地開發除外）。

**使用 Let's Encrypt（推薦）**：

```bash
# 安裝 Certbot
sudo apt install certbot

# 獲取證書
sudo certbot certonly --standalone -d your-domain.com

# 證書位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 設置自動更新
sudo certbot renew --dry-run
```

#### 1.3 配置反向代理

**使用 Nginx**：

```bash
# 安裝 Nginx
sudo apt install nginx

# 創建配置文件
sudo nano /etc/nginx/sites-available/discord-stats
```

```nginx
# API 服務器
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 前端應用
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

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

```bash
# 啟用配置
sudo ln -s /etc/nginx/sites-available/discord-stats /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. 生產環境配置

#### 2.1 更新環境變數

```bash
# 根目錄 .env
nano .env
```

```env
# 使用生產環境 URL
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# 確保環境設為 production
NODE_ENV=production

# 啟用監控
ENABLE_MONITORING=true
ADMIN_TOKEN=your_very_secure_admin_token

# 配置 Webhook 通知
WEBHOOK_ENABLED=true
WEBHOOK_URLS=https://discord.com/api/webhooks/your/webhook
```

#### 2.2 更新 Discord Developer Portal

1. 前往 Discord Developer Portal
2. 更新「Activities」URL Mappings：
   - Prefix: `/`
   - Target: `https://your-domain.com`
3. 更新「OAuth2」Redirects：
   - 添加: `https://your-domain.com`

### 3. 部署到生產環境

```bash
# 1. 克隆專案
cd /home/discord
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 2. 配置環境變數
./setup-env.sh

# 3. 執行部署
./deploy.sh

# 4. 驗證部署
./manage.sh health
pm2 status
curl https://api.your-domain.com/health
curl https://your-domain.com

# 5. 設置開機自啟
pm2 startup
pm2 save
```

### 4. 資料庫優化

```bash
# 連接到資料庫
psql -h localhost -U discord_user -d discord_stats
```

```sql
-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_guild_timestamp 
ON messages(guild_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp 
ON messages(channel_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_messages_author_timestamp 
ON messages(author_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_emoji_usage_guild_timestamp 
ON emoji_usage(guild_id, timestamp);

-- 啟用自動清理
ALTER TABLE messages SET (autovacuum_enabled = true);
ALTER TABLE emoji_usage SET (autovacuum_enabled = true);

-- 查看資料庫大小
SELECT pg_size_pretty(pg_database_size('discord_stats'));

-- 退出
\q
```

### 5. 效能調優

#### 5.1 Node.js 優化

```bash
# 在 ecosystem.config.js 中設置
max_memory_restart: '500M',  # 記憶體超過 500MB 自動重啟
node_args: '--max-old-space-size=512',  # 限制堆記憶體
```

#### 5.2 PostgreSQL 優化

```bash
# 編輯 PostgreSQL 配置
sudo nano /etc/postgresql/15/main/postgresql.conf
```

```conf
# 根據伺服器記憶體調整
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB

# 連接設置
max_connections = 100

# 日誌設置
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
```

```bash
# 重啟 PostgreSQL
sudo systemctl restart postgresql
```

---


## 更新與維護

### 日常更新流程

#### 方法一：使用更新腳本（推薦）

```bash
# 執行更新腳本
./update.sh

# 腳本會自動：
# 1. 備份資料庫
# 2. 拉取最新代碼
# 3. 更新依賴（可選）
# 4. 執行資料庫升級（可選）
# 5. 重新構建前端
# 6. 重啟服務
```

#### 方法二：手動更新

```bash
# 1. 備份資料庫
./manage.sh backup

# 2. 拉取最新代碼
git pull origin main

# 3. 更新依賴
npm install
cd client && npm install && cd ..
cd bot && npm install && cd ..

# 4. 執行資料庫升級（如果有）
psql -h localhost -U discord_user -d discord_stats -f bot/database/upgrade.sql

# 5. 重新構建前端
cd client && npm run build && cd ..

# 6. 重啟服務
./manage.sh restart-prod

# 7. 驗證
./manage.sh health
pm2 logs --lines 50
```

### 常見更新場景

#### 場景 1：只更新代碼（無依賴變更）

```bash
git pull
cd client && npm run build && cd ..
./manage.sh restart
```

#### 場景 2：更新代碼 + 依賴

```bash
git pull
npm install
cd client && npm install && npm run build && cd ..
cd bot && npm install && cd ..
./manage.sh restart-prod
```

#### 場景 3：更新代碼 + 資料庫

```bash
# 1. 備份
./manage.sh backup

# 2. 更新代碼
git pull

# 3. 執行資料庫遷移
psql -h localhost -U discord_user -d discord_stats -f bot/database/upgrade.sql

# 4. 更新依賴和構建
npm install
cd client && npm install && npm run build && cd ..
cd bot && npm install && cd ..

# 5. 重啟
./manage.sh restart-prod
```

#### 場景 4：緊急回滾

```bash
# 1. 停止服務
./manage.sh stop

# 2. 回滾代碼
git log --oneline -10  # 找到要回滾的版本
git reset --hard <commit-hash>

# 3. 還原資料庫（如果需要）
./manage.sh restore backups/discord_stats_20240101_120000.sql.gz

# 4. 重新構建
cd client && npm run build && cd ..

# 5. 重啟
./manage.sh start
```

### 定期維護任務

#### 每日

```bash
# 查看服務狀態
pm2 status

# 查看日誌（檢查錯誤）
pm2 logs --err --lines 50

# 檢查磁碟空間
df -h
```

#### 每週

```bash
# 備份資料庫
./manage.sh backup

# 清理舊日誌
./manage.sh clean

# 檢查資料庫大小
psql -h localhost -U discord_user -d discord_stats -c "SELECT pg_size_pretty(pg_database_size('discord_stats'));"

# 查看進程資源使用
pm2 monit
```

#### 每月

```bash
# 更新依賴（謹慎）
npm outdated
npm update

# 檢查安全更新
npm audit
npm audit fix

# 優化資料庫
psql -h localhost -U discord_user -d discord_stats -c "VACUUM ANALYZE;"

# 清理舊備份（保留最近 10 個）
ls -t backups/*.sql.gz | tail -n +11 | xargs rm -f
```

#### 每季

```bash
# 檢查系統更新
sudo apt update
sudo apt list --upgradable

# 更新 Node.js（如果需要）
# 更新 PostgreSQL（如果需要）

# 檢查證書有效期（如果使用 HTTPS）
sudo certbot certificates

# 審查日誌和監控數據
# 評估效能和資源使用
```

### 備份策略

#### 自動備份

```bash
# 創建備份腳本
nano ~/backup-discord-stats.sh
```

```bash
#!/bin/bash
cd /home/discord/discord-embed-app
./manage.sh backup
# 清理 30 天前的備份
find backups/ -name "*.sql.gz" -mtime +30 -delete
```

```bash
# 設置執行權限
chmod +x ~/backup-discord-stats.sh

# 添加到 crontab（每天凌晨 2 點執行）
crontab -e
```

```cron
0 2 * * * /home/discord/backup-discord-stats.sh >> /home/discord/backup.log 2>&1
```

#### 異地備份

```bash
# 使用 rsync 同步到遠程伺服器
rsync -avz backups/ user@backup-server:/path/to/backups/

# 或使用雲端儲存（如 AWS S3）
aws s3 sync backups/ s3://your-bucket/discord-stats-backups/
```

---

## 監控與告警

### 啟用監控系統

#### 1. 配置監控

```bash
# 編輯 .env
nano .env
```

```env
# 啟用監控
ENABLE_MONITORING=true

# 設置管理員 Token（用於訪問監控 API）
ADMIN_TOKEN=your_very_secure_admin_token

# 啟用 Webhook 通知
WEBHOOK_ENABLED=true
WEBHOOK_URLS=https://discord.com/api/webhooks/your/webhook
```

#### 2. 重啟服務

```bash
./manage.sh restart-prod
```

#### 3. 訪問監控儀表板

在 Discord Embedded App 中訪問：
- 主儀表板: `/admin/monitoring`
- 健康檢查 API: `https://api.your-domain.com/health`
- 監控指標 API: `https://api.your-domain.com/api/metrics`

### 監控功能

#### 即時指標

- **系統指標**：
  - CPU 使用率
  - 記憶體使用率
  - 事件循環延遲
  - 運行時間

- **應用指標**：
  - API 請求數
  - Discord 事件數
  - 資料庫查詢數
  - 平均響應時間

- **健康檢查**：
  - 資料庫連接狀態
  - Discord Bot 狀態
  - 系統資源狀態

#### 告警系統

自動檢測以下異常情況：

- ❌ CPU 使用率 > 80%
- ❌ 記憶體使用率 > 85%
- ❌ 事件循環延遲 > 100ms
- ❌ API 響應時間 > 1000ms
- ❌ 資料庫連接失敗
- ❌ Discord Bot 離線

告警會：
1. 記錄到資料庫
2. 顯示在監控儀表板
3. 發送到 Discord Webhook（ERROR 級別）

#### Webhook 通知

配置 Discord Webhook 接收告警通知：

```bash
# 1. 在 Discord 伺服器創建 Webhook
# 2. 複製 Webhook URL
# 3. 添加到 .env
WEBHOOK_URLS=https://discord.com/api/webhooks/123/abc,https://discord.com/api/webhooks/456/def

# 4. 重啟服務
./manage.sh restart-prod
```

通知範例：
```
🚨 告警：高 CPU 使用率
嚴重程度：ERROR
CPU 使用率：85.3%
閾值：80%
時間：2024-01-01 12:00:00
```

### 監控 API

#### 獲取指標

```bash
# 需要 Admin Token
curl -H "Authorization: Bearer your_admin_token" \
  https://api.your-domain.com/api/metrics
```

#### 獲取告警

```bash
curl -H "Authorization: Bearer your_admin_token" \
  https://api.your-domain.com/api/metrics/alerts
```

#### 健康檢查

```bash
# 公開端點，無需認證
curl https://api.your-domain.com/health
```

詳細說明請參考 [監控系統文檔](docs/MONITORING.md)。

---

## 故障排除

### 常見問題

#### 1. Bot 無法啟動

**症狀**：Bot 進程顯示錯誤或不斷重啟

**檢查步驟**：

```bash
# 查看 Bot 日誌
pm2 logs discord-server --err --lines 100

# 檢查 Bot Token
grep DISCORD_BOT_TOKEN bot/.env

# 測試資料庫連接
psql -h localhost -U discord_user -d discord_stats -c "SELECT 1;"

# 檢查 Bot 權限
# 確認在 Discord Developer Portal 啟用了必要的 Intents
```

**常見原因**：
- ❌ Bot Token 錯誤或過期
- ❌ 資料庫連接失敗
- ❌ 未啟用 Privileged Gateway Intents
- ❌ 網路連接問題

**解決方案**：
```bash
# 重新生成 Bot Token
# 1. 前往 Discord Developer Portal
# 2. Bot → Reset Token
# 3. 更新 bot/.env 中的 DISCORD_BOT_TOKEN
# 4. 重啟服務
./manage.sh restart-prod
```

#### 2. 前端無法載入

**症狀**：訪問前端顯示錯誤或空白頁面

**檢查步驟**：

```bash
# 查看前端日誌
pm2 logs discord-client --lines 100

# 檢查前端構建
cd client
npm run build

# 檢查環境變數
cat .env.local

# 測試 API 連接
curl http://localhost:3008/health
```

**常見原因**：
- ❌ 前端構建失敗
- ❌ API URL 配置錯誤
- ❌ Discord Client ID 錯誤
- ❌ CORS 問題

**解決方案**：
```bash
# 重新構建前端
cd client
rm -rf .next
npm install
npm run build
cd ..

# 重啟服務
./manage.sh restart-prod
```

#### 3. 資料庫連接失敗

**症狀**：應用無法連接到資料庫

**檢查步驟**：

```bash
# 檢查 PostgreSQL 狀態
sudo systemctl status postgresql

# 測試連接
psql -h localhost -U discord_user -d discord_stats

# 檢查連接配置
grep DB_ bot/.env

# 查看 PostgreSQL 日誌
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

**常見原因**：
- ❌ PostgreSQL 未啟動
- ❌ 資料庫不存在
- ❌ 用戶名或密碼錯誤
- ❌ 防火牆阻擋連接

**解決方案**：
```bash
# 啟動 PostgreSQL
sudo systemctl start postgresql

# 重新創建資料庫
sudo -u postgres psql
CREATE DATABASE discord_stats;
\q

# 執行架構腳本
psql -h localhost -U discord_user -d discord_stats -f bot/database/schema.sql
```

#### 4. 記憶體不足

**症狀**：進程頻繁重啟，系統變慢

**檢查步驟**：

```bash
# 查看記憶體使用
free -h
pm2 monit

# 查看進程記憶體
ps aux | grep node

# 查看 PM2 日誌
pm2 logs --err
```

**解決方案**：

```bash
# 方案 1：切換到單進程模式（節省 50-100MB）
./manage.sh switch-mode single

# 方案 2：限制 Node.js 記憶體
# 編輯 ecosystem.config.js
node_args: '--max-old-space-size=512'

# 方案 3：增加伺服器記憶體
# 或使用 swap

# 方案 4：優化資料庫查詢
# 添加索引，限制查詢範圍
```

#### 5. API 響應緩慢

**症狀**：API 請求超時或響應時間過長

**檢查步驟**：

```bash
# 查看監控指標
curl -H "Authorization: Bearer your_admin_token" \
  http://localhost:3008/api/metrics

# 查看資料庫查詢
psql -h localhost -U discord_user -d discord_stats
SELECT * FROM pg_stat_activity;

# 檢查 CPU 和記憶體
top
```

**解決方案**：

```bash
# 1. 優化資料庫
psql -h localhost -U discord_user -d discord_stats
VACUUM ANALYZE;
REINDEX DATABASE discord_stats;

# 2. 添加索引
# 參考「生產環境部署 → 資料庫優化」章節

# 3. 增加伺服器資源
# 或優化查詢邏輯
```

#### 6. Discord Embedded App 無法載入

**症狀**：在 Discord 中打開應用顯示錯誤

**檢查步驟**：

```bash
# 檢查 HTTPS 配置
curl https://your-domain.com

# 檢查 Discord Developer Portal 配置
# Activities → URL Mappings

# 查看瀏覽器控制台錯誤
# 在 Discord 中按 Ctrl+Shift+I
```

**常見原因**：
- ❌ 未使用 HTTPS（生產環境必須）
- ❌ URL Mapping 配置錯誤
- ❌ CORS 問題
- ❌ Client ID 不匹配

**解決方案**：
```bash
# 1. 確保使用 HTTPS
# 2. 更新 Discord Developer Portal 配置
# 3. 檢查 .env 中的 NEXT_PUBLIC_DISCORD_CLIENT_ID
# 4. 重啟服務
./manage.sh restart-prod
```

### 日誌分析

#### 查看日誌

```bash
# PM2 日誌
pm2 logs                          # 所有日誌
pm2 logs discord-server           # Server 日誌
pm2 logs discord-client           # Client 日誌
pm2 logs --err                    # 只看錯誤
pm2 logs --lines 200              # 最近 200 行

# 管理腳本日誌
./manage.sh logs
./manage.sh logs-server
./manage.sh logs-client

# 系統日誌
sudo journalctl -u pm2-discord    # PM2 服務日誌
sudo tail -f /var/log/nginx/error.log  # Nginx 錯誤日誌
```

#### 常見錯誤模式

**錯誤 1：`ECONNREFUSED`**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- 原因：無法連接到 PostgreSQL
- 解決：檢查 PostgreSQL 是否運行，檢查連接配置

**錯誤 2：`Invalid token`**
```
Error: An invalid token was provided
```
- 原因：Discord Bot Token 錯誤
- 解決：重新生成 Token 並更新配置

**錯誤 3：`Missing Intents`**
```
Error: Privileged intent provided is not enabled or whitelisted
```
- 原因：未啟用必要的 Gateway Intents
- 解決：在 Discord Developer Portal 啟用 Intents

**錯誤 4：`CORS error`**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
- 原因：CORS 配置問題
- 解決：檢查 server/index.js 中的 CORS 配置

### 效能診斷

```bash
# 1. 查看系統資源
top
htop
free -h
df -h

# 2. 查看進程資源
pm2 monit
ps aux | grep node

# 3. 查看資料庫效能
psql -h localhost -U discord_user -d discord_stats
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database WHERE datname = 'discord_stats';

# 4. 查看網路連接
netstat -tulpn | grep node
ss -tulpn | grep node

# 5. 查看監控指標
curl -H "Authorization: Bearer your_admin_token" \
  http://localhost:3008/api/metrics
```

---


## 安全最佳實踐

### 1. 環境變數安全

```bash
# 設置正確的文件權限
chmod 600 .env
chmod 600 bot/.env
chmod 600 client/.env.local

# 確保 .env 文件不被提交到 Git
echo ".env" >> .gitignore
echo "bot/.env" >> .gitignore
echo "client/.env.local" >> .gitignore

# 定期更換敏感資訊
# - Discord Bot Token
# - Admin Token
# - 資料庫密碼
```

### 2. 資料庫安全

```bash
# 使用強密碼
# 至少 16 個字符，包含大小寫字母、數字和特殊字符

# 限制資料庫訪問
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

```conf
# 只允許本地連接
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

```bash
# 重啟 PostgreSQL
sudo systemctl restart postgresql

# 定期備份
./manage.sh backup

# 加密備份（可選）
gpg --encrypt backups/discord_stats_20240101_120000.sql.gz
```

### 3. 網路安全

```bash
# 配置防火牆
sudo ufw status
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3008/tcp     # 不對外開放 API 端口
sudo ufw deny 5432/tcp     # 不對外開放資料庫端口

# 使用 fail2ban 防止暴力破解
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. 應用安全

```bash
# 使用專用用戶運行應用
# 不要使用 root 用戶

# 限制文件權限
chmod 755 manage.sh deploy.sh update.sh
chmod 644 *.md *.json

# 定期更新依賴
npm audit
npm audit fix

# 檢查安全漏洞
npm audit --production
```

### 5. 監控和日誌

```bash
# 啟用監控系統
ENABLE_MONITORING=true

# 配置告警
WEBHOOK_ENABLED=true

# 定期檢查日誌
pm2 logs --err --lines 100

# 設置日誌輪轉
# PM2 自動處理日誌輪轉
```

### 6. 訪問控制

```bash
# 管理員權限管理
psql -h localhost -U discord_user -d discord_stats
```

```sql
-- 只授予必要的管理員權限
INSERT INTO admin_users (guild_id, user_id, username) 
VALUES ('guild_id', 'user_id', 'username');

-- 定期審查管理員列表
SELECT * FROM admin_users;

-- 移除不需要的管理員
DELETE FROM admin_users WHERE user_id = 'old_admin_id';
```

### 7. HTTPS 和證書

```bash
# 使用 HTTPS（生產環境必須）
# 使用 Let's Encrypt 免費證書

# 設置自動更新
sudo certbot renew --dry-run

# 檢查證書有效期
sudo certbot certificates

# 配置 HSTS
# 在 Nginx 配置中添加：
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 8. 備份策略

```bash
# 每日自動備份
# 參考「更新與維護 → 備份策略」章節

# 異地備份
# 將備份同步到遠程伺服器或雲端

# 測試還原
# 定期測試備份還原流程
./manage.sh restore backups/test_backup.sql.gz
```

### 9. 更新策略

```bash
# 定期更新系統
sudo apt update && sudo apt upgrade

# 定期更新應用
./update.sh

# 測試環境驗證
# 在測試環境先測試更新

# 準備回滾方案
# 更新前備份，出問題時快速回滾
```

### 10. 安全檢查清單

部署前檢查：

- [ ] 所有 `.env` 文件權限設為 600
- [ ] 資料庫使用強密碼
- [ ] 防火牆已配置
- [ ] 只開放必要端口
- [ ] 使用 HTTPS（生產環境）
- [ ] 證書有效且自動更新
- [ ] 啟用監控和告警
- [ ] 配置自動備份
- [ ] 限制管理員權限
- [ ] 定期更新依賴
- [ ] 日誌輪轉已配置
- [ ] 使用專用用戶運行
- [ ] Discord Bot Token 安全保存
- [ ] Admin Token 足夠複雜
- [ ] 白名單正確配置

---

## 附錄

### A. 完整命令參考

#### 部署命令

```bash
./setup-env.sh              # 互動式環境配置
./deploy.sh                 # 完整部署
./update.sh                 # 快速更新
```

#### 管理命令

```bash
./manage.sh start           # 啟動服務
./manage.sh stop            # 停止服務
./manage.sh restart         # 重啟服務（零停機）
./manage.sh restart-prod    # 重啟並重新載入配置
./manage.sh status          # 查看狀態
./manage.sh logs            # 查看所有日誌
./manage.sh logs-server     # 查看 Server 日誌
./manage.sh logs-client     # 查看 Client 日誌
./manage.sh health          # 健康檢查
./manage.sh backup          # 備份資料庫
./manage.sh restore <file>  # 還原資料庫
./manage.sh clean           # 清理日誌和舊備份
./manage.sh switch-mode dual    # 切換到雙進程模式
./manage.sh switch-mode single  # 切換到單進程模式
```

#### PM2 命令

```bash
pm2 list                    # 查看所有進程
pm2 status                  # 查看狀態
pm2 logs                    # 查看日誌
pm2 logs discord-server     # 查看特定進程日誌
pm2 monit                   # 監控面板
pm2 restart discord-server  # 重啟特定進程
pm2 stop discord-client     # 停止特定進程
pm2 delete discord-app      # 刪除進程
pm2 save                    # 保存配置
pm2 startup                 # 設置開機自啟
```

#### 資料庫命令

```bash
# 連接資料庫
psql -h localhost -U discord_user -d discord_stats

# 備份資料庫
pg_dump -h localhost -U discord_user discord_stats | gzip > backup.sql.gz

# 還原資料庫
gunzip -c backup.sql.gz | psql -h localhost -U discord_user -d discord_stats

# 查看表結構
psql -h localhost -U discord_user -d discord_stats -c "\dt"

# 查看資料庫大小
psql -h localhost -U discord_user -d discord_stats -c "SELECT pg_size_pretty(pg_database_size('discord_stats'));"
```

### B. 環境變數完整列表

#### 根目錄 `.env`

```env
# Discord 配置
DISCORD_CLIENT_ID=          # Discord Application ID
DISCORD_CLIENT_SECRET=      # Discord Client Secret
DISCORD_BOT_TOKEN=          # Discord Bot Token

# 伺服器配置
PORT=3008                   # API 服務器端口
CLIENT_PORT=3000            # 前端服務端口

# 白名單
ALLOWED_GUILD_IDS=          # 允許的伺服器 ID（逗號分隔）

# 環境
NODE_ENV=production         # 環境模式

# 進程模式
PROCESS_MODE=dual           # dual 或 single

# 監控配置
ENABLE_MONITORING=true      # 啟用監控
ADMIN_TOKEN=                # 管理員 Token
WEBHOOK_ENABLED=false       # 啟用 Webhook
WEBHOOK_URLS=               # Webhook URLs（逗號分隔）
```

#### Bot `.env`

```env
# Discord Bot
DISCORD_BOT_TOKEN=          # Bot Token

# 白名單
ALLOWED_GUILD_IDS=          # 允許的伺服器 ID

# 資料庫
DB_HOST=localhost           # 資料庫主機
DB_PORT=5432                # 資料庫端口
DB_NAME=discord_stats       # 資料庫名稱
DB_USER=discord_user        # 資料庫用戶
DB_PASSWORD=                # 資料庫密碼

# 環境
NODE_ENV=production         # 環境模式
```

#### 前端 `.env.local`

```env
# Discord Client ID
NEXT_PUBLIC_DISCORD_CLIENT_ID=  # Application ID

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3008  # API 服務器 URL

# 開發模式
NEXT_PUBLIC_ENABLE_DEV_MODE=false  # 開發模式開關

# 環境
NODE_ENV=production         # 環境模式
```

### C. 端口使用

| 服務 | 端口 | 說明 | 對外開放 |
|------|------|------|----------|
| API 服務器 | 3008 | Express API | ❌ (通過 Nginx) |
| 前端應用 | 3000 | Next.js | ❌ (通過 Nginx) |
| PostgreSQL | 5432 | 資料庫 | ❌ (僅本地) |
| Nginx HTTP | 80 | HTTP (重定向到 HTTPS) | ✅ |
| Nginx HTTPS | 443 | HTTPS | ✅ |

### D. 資料庫表結構

主要表：

- `messages` - 訊息記錄
- `emoji_usage` - 表情使用記錄
- `daily_stats` - 每日統計
- `channel_stats` - 頻道統計
- `history_fetch_tasks` - 歷史提取任務
- `history_fetch_ranges` - 提取範圍記錄
- `admin_users` - 管理員用戶
- `monitoring_metrics` - 監控指標（如果啟用）
- `monitoring_alerts` - 監控告警（如果啟用）

詳細結構請參考 `bot/database/schema.sql`。

### E. 相關文檔

- [README.md](README.md) - 專案概述
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 快速參考
- [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) - 環境變數詳解
- [docs/PM2_SAFETY.md](docs/PM2_SAFETY.md) - PM2 安全操作
- [docs/MONITORING.md](docs/MONITORING.md) - 監控系統
- [DEVELOPMENT.md](DEVELOPMENT.md) - 開發指南
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除

### F. 支援和社群

如有問題或建議：

1. 查看本部署指南
2. 查看故障排除文檔
3. 查看相關文檔
4. 提交 [GitHub Issue](https://github.com/956zs/discord-embed-app/issues)
5. 查看日誌：`./manage.sh logs`

### G. 更新日誌

#### v2.4.0 (2025-01)
- ✅ 新增效能監控系統
- ✅ 新增告警和 Webhook 通知
- ✅ 支援雙進程/單進程模式切換
- ✅ 完整的 PM2 安全操作規範

#### v2.3.0 (2025-01)
- ✅ 手機界面大幅優化
- ✅ 新增側邊欄導航
- ✅ 圖表智能優化
- ✅ 新增今日統計功能

#### v2.2.0 (2025-01)
- ✅ 環境變數完全重構
- ✅ setup-env.sh 重寫
- ✅ 動態配置支援
- ✅ 專案清理工具

#### v2.1.0 (2025-01)
- ✅ 互動式配置工具
- ✅ 生產環境優化
- ✅ 管理腳本增強

#### v2.0.0 (2024-12)
- ✅ 簡繁體中文切換
- ✅ 討論串完整支援
- ✅ 一鍵部署腳本
- ✅ 完整的管理工具

---

## 總結

本指南涵蓋了 Discord 統計應用從零到生產環境的完整部署流程。

### 快速開始（3 步驟）

```bash
# 1. 克隆專案
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 2. 配置環境
./setup-env.sh

# 3. 部署
./deploy.sh
```

### 關鍵要點

1. **安全第一**：
   - 使用強密碼
   - 配置防火牆
   - 啟用 HTTPS
   - 定期備份

2. **監控重要**：
   - 啟用監控系統
   - 配置告警
   - 定期檢查日誌

3. **維護必要**：
   - 定期更新
   - 定期備份
   - 定期優化資料庫

4. **PM2 安全**：
   - 只操作 Discord 進程
   - 不影響其他應用
   - 使用管理腳本

### 下一步

- 閱讀 [快速參考](QUICK_REFERENCE.md) 了解常用命令
- 閱讀 [監控系統文檔](docs/MONITORING.md) 了解監控功能
- 閱讀 [PM2 安全文檔](docs/PM2_SAFETY.md) 了解安全操作
- 加入社群獲取支援

---

**祝你部署順利！** 🚀

如有任何問題，請查看故障排除章節或提交 Issue。

