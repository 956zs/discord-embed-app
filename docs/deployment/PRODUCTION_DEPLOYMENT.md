# 生產環境部署指南

## 概述

本指南說明如何將 Discord Embedded App 部署到生產環境。

## 部署前準備

### 1. 環境變數配置

#### Bot 環境變數 (`bot/.env`)
```bash
# Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token_here

# 資料庫配置
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# 白名單（生產環境必須設定）
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2
```

#### Server 環境變數 (根目錄 `.env`)
```bash
# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token

# Server 配置
PORT=3008

# 白名單（必須與 bot 一致）
ALLOWED_GUILD_IDS=guild_id_1,guild_id_2
```

#### Client 環境變數 (`client/.env.production`)
```bash
# Discord Client ID
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id

# API URL（使用你的實際域名或留空使用相對路徑）
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# 生產環境關閉開發模式
NEXT_PUBLIC_ENABLE_DEV_MODE=false
```

### 2. 資料庫設置

確保生產資料庫已創建所有必要的表：

```bash
# 基本表
psql -U your_user -d discord_stats -f bot/database/create_tables.sql

# 歷史提取表
psql -U your_user -d discord_stats -f bot/database/history_tables.sql
```

### 3. 添加管理員

在生產資料庫中添加管理員用戶：

```sql
INSERT INTO admin_users (guild_id, user_id, username, granted_by)
VALUES ('YOUR_GUILD_ID', 'ADMIN_USER_ID', 'Admin Username', 'system');
```

## 部署方式

### 方式 1: 傳統 VPS/伺服器部署

#### 步驟 1: 構建 Next.js 應用

```bash
cd client
npm run build
```

這會在 `client/.next` 目錄生成優化的生產版本。

#### 步驟 2: 使用 PM2 管理進程

安裝 PM2：
```bash
npm install -g pm2
```

創建 PM2 配置文件 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'discord-bot',
      cwd: './bot',
      script: 'index.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'discord-api',
      cwd: './server',
      script: 'index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3008
      }
    },
    {
      name: 'discord-client',
      cwd: './client',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

啟動所有服務：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 步驟 3: 配置 Nginx 反向代理

創建 Nginx 配置 `/etc/nginx/sites-available/discord-stats`：

```nginx
# API Server
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Client
server {
    listen 80;
    server_name your-domain.com;

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

啟用配置：
```bash
sudo ln -s /etc/nginx/sites-available/discord-stats /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 步驟 4: 配置 SSL (使用 Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### 方式 2: Docker 部署

創建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: discord_stats
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./bot/database:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  bot:
    build:
      context: ./bot
      dockerfile: Dockerfile
    depends_on:
      - postgres
    env_file:
      - ./bot/.env
    restart: unless-stopped

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    depends_on:
      - postgres
      - bot
    env_file:
      - ./.env
    ports:
      - "3008:3008"
    restart: unless-stopped

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    depends_on:
      - server
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  postgres_data:
```

創建 Dockerfile（每個服務目錄）：

**bot/Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]
```

**server/Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3008
CMD ["node", "index.js"]
```

**client/Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

啟動：
```bash
docker-compose up -d
```

### 方式 3: Vercel + Railway 部署

#### Client (Vercel)

1. 將代碼推送到 GitHub
2. 在 Vercel 導入項目
3. 設置根目錄為 `client`
4. 配置環境變數：
   - `NEXT_PUBLIC_DISCORD_CLIENT_ID`
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_ENABLE_DEV_MODE=false`
5. 部署

#### Server + Bot (Railway)

1. 在 Railway 創建新項目
2. 添加 PostgreSQL 服務
3. 添加兩個服務：
   - Bot: 根目錄 `bot`，啟動命令 `node index.js`
   - Server: 根目錄 `server`，啟動命令 `node index.js`
4. 配置環境變數
5. 部署

## Discord 開發者門戶配置

### 1. 設置 Embedded App

在 Discord Developer Portal:

1. 進入你的應用
2. 在 "Activities" 標籤中：
   - Embedded App URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/api/auth/callback`
3. 在 "OAuth2" 標籤中：
   - 添加 Redirect URL: `https://your-domain.com/api/auth/callback`
4. 保存更改

### 2. 設置 Bot 權限

確保 Bot 有以下權限：
- Read Messages/View Channels
- Read Message History
- Send Messages

### 3. 邀請 Bot 到伺服器

使用 OAuth2 URL Generator 生成邀請連結，包含：
- Scopes: `bot`, `applications.commands`
- Bot Permissions: 上述權限

## 測試生產環境

### 1. 本地測試生產構建

```bash
# 構建
cd client
npm run build

# 啟動生產模式
npm start
```

訪問 `http://localhost:3000` 測試。

### 2. 在 Discord 中測試

1. 在 Discord 伺服器中打開你的 Embedded App
2. 確認 `guild_id` 和 `user_id` 正確傳遞
3. 測試管理員功能
4. 測試歷史訊息提取

## 監控和日誌

### PM2 日誌

```bash
# 查看所有日誌
pm2 logs

# 查看特定服務
pm2 logs discord-bot
pm2 logs discord-api
pm2 logs discord-client

# 監控
pm2 monit
```

### Docker 日誌

```bash
# 查看所有服務
docker-compose logs -f

# 查看特定服務
docker-compose logs -f bot
docker-compose logs -f server
docker-compose logs -f client
```

## 故障排除

### 問題 1: 無法連接到 API

- 檢查 CORS 配置
- 確認 API URL 正確
- 檢查防火牆設置

### 問題 2: Bot 無法連接資料庫

- 檢查資料庫連接字串
- 確認資料庫服務運行中
- 檢查網絡連接

### 問題 3: 管理員功能無法使用

- 確認用戶已添加到 `admin_users` 表
- 檢查 `guild_id` 和 `user_id` 是否正確
- 查看瀏覽器控制台錯誤

### 問題 4: Discord Embedded App 無法載入

- 確認 URL 配置正確
- 檢查 SSL 證書
- 確認 Discord Developer Portal 設置

## 安全建議

1. **使用環境變數**: 永遠不要在代碼中硬編碼敏感信息
2. **啟用 HTTPS**: 生產環境必須使用 SSL
3. **設置白名單**: 限制允許訪問的伺服器
4. **定期更新**: 保持依賴項最新
5. **備份資料庫**: 定期備份 PostgreSQL 資料庫
6. **監控日誌**: 設置日誌監控和告警
7. **限制 API 訪問**: 使用 rate limiting 防止濫用

## 維護

### 更新應用

```bash
# 拉取最新代碼
git pull

# 更新依賴
npm install

# 重新構建
cd client && npm run build

# 重啟服務
pm2 restart all
```

### 資料庫維護

```bash
# 備份
pg_dump -U your_user discord_stats > backup_$(date +%Y%m%d).sql

# 恢復
psql -U your_user discord_stats < backup_20250112.sql
```

## 效能優化

1. **使用 CDN**: 靜態資源使用 CDN 加速
2. **資料庫索引**: 確保關鍵查詢有索引
3. **連接池**: 配置適當的資料庫連接池大小
4. **快取**: 使用 Redis 快取常用數據
5. **壓縮**: 啟用 gzip 壓縮

## 成本估算

### VPS 方案
- 小型伺服器 (2GB RAM): $5-10/月
- 中型伺服器 (4GB RAM): $20-40/月
- 資料庫備份存儲: $5/月

### Serverless 方案
- Vercel (Hobby): 免費
- Railway: $5-20/月（根據使用量）
- 總計: $5-20/月

## 支援

如有問題，請查看：
- [故障排除文檔](TROUBLESHOOTING.md)
- [開發文檔](DEVELOPMENT.md)
- [歷史提取指南](HISTORY_FETCH_GUIDE.md)
