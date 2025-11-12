# 設置指南

完整的 Discord 伺服器統計 Embedded App 設置流程。

## 前置需求

- Node.js 18+
- PostgreSQL
- Discord 開發者帳號

## 快速啟動

### 1. 創建 Discord 應用

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊「New Application」創建應用
3. 記錄以下資訊：
   - **Application ID** (General Information)
   - **Client Secret** (OAuth2)
   - **Bot Token** (Bot → Reset Token)

### 2. 配置 Discord 應用

#### Bot 設置
1. 前往「Bot」頁面
2. 啟用 Privileged Gateway Intents：
   - ✅ Server Members Intent
   - ✅ Message Content Intent

#### OAuth2 設置
1. 前往「OAuth2」頁面
2. 添加 Redirect URLs：
   ```
   http://localhost:5173
   ```

#### Activities 設置
1. 前往「Activities」頁面
2. 點擊「Enable Activities」
3. 配置 URL Mappings：
   - Prefix: `/`
   - Target: `http://localhost:5173`

#### 安裝 Bot
1. 前往「OAuth2」→「URL Generator」
2. 選擇 Scopes: `bot`, `applications.commands`
3. 選擇 Bot Permissions: `Read Messages/View Channels`, `Read Message History`
4. 複製生成的 URL 並在瀏覽器中打開
5. 選擇要安裝的伺服器

### 3. 初始化數據庫

```bash
# 創建數據庫
createdb discord_stats

# 執行建表腳本
psql -U postgres -d discord_stats -f bot/database/create_tables.sql
```

### 4. 配置環境變數

#### 根目錄 `.env`
```env
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token
PORT=3001
VITE_API_URL=http://localhost:3001
ALLOWED_GUILD_IDS=你的伺服器ID
```

#### `bot/.env`
```env
DISCORD_BOT_TOKEN=你的_bot_token
ALLOWED_GUILD_IDS=你的伺服器ID
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=你的密碼
```

#### `client/.env`
```env
VITE_DISCORD_CLIENT_ID=你的_client_id
VITE_API_URL=http://localhost:3001
```

**如何獲取伺服器 ID？**
1. 在 Discord 開啟「開發者模式」（設定 → 進階 → 開發者模式）
2. 右鍵點擊伺服器圖標
3. 選擇「複製伺服器 ID」

### 5. 安裝依賴

```bash
# 安裝所有依賴
npm install && cd client && npm install && cd ../bot && npm install && cd ..
```

### 6. 啟動應用

```bash
# 一次啟動所有服務（推薦）
npm run dev
```

或分別啟動：
```bash
# 終端 1: Bot
npm run bot

# 終端 2: API 伺服器
npm run server

# 終端 3: 前端
npm run client
```

### 7. 驗證安裝

#### Bot 驗證
應該看到：
```
🤖 Bot 已登入: YourBot#1234
✅ PostgreSQL 連接成功
📊 監控 1 個伺服器
✅ Bot 已準備就緒，開始收集數據...
```

在 Discord 發送幾則訊息，然後檢查數據庫：
```bash
psql -U postgres -d discord_stats -c "SELECT COUNT(*) FROM messages;"
```

#### API 驗證
```bash
curl http://localhost:3001/health
# 應該返回: {"status":"ok"}
```

#### 前端驗證
訪問 http://localhost:5173 應該看到載入畫面

### 8. 在 Discord 中測試

1. 打開 Discord 桌面應用或網頁版
2. 進入安裝了 Bot 的伺服器
3. 在任意頻道中，點擊訊息輸入框旁的「+」按鈕
4. 選擇「Activities」
5. 找到並點擊你的應用
6. 應用會在 Discord 內打開並顯示統計數據

## 設置檢查清單

### Discord Developer Portal
- [ ] 創建應用並記錄 Client ID、Client Secret、Bot Token
- [ ] 啟用 Server Members Intent
- [ ] 啟用 Message Content Intent
- [ ] 啟用 Activities
- [ ] 配置 URL Mapping: `/` → `http://localhost:5173`
- [ ] 添加 OAuth2 Redirect: `http://localhost:5173`
- [ ] 使用 OAuth2 URL Generator 安裝 Bot 到伺服器
- [ ] 獲取伺服器 ID

### 環境變數
- [ ] 根目錄 `.env` 配置完成
- [ ] `bot/.env` 配置完成
- [ ] `client/.env` 配置完成
- [ ] 所有 ID 和 Token 正確無誤

### 數據庫
- [ ] PostgreSQL 已安裝並運行
- [ ] 數據庫 `discord_stats` 已創建
- [ ] 表結構已創建
- [ ] 可以連接數據庫

### 依賴安裝
- [ ] 根目錄依賴已安裝
- [ ] Bot 依賴已安裝
- [ ] Client 依賴已安裝

### 服務運行
- [ ] Bot 顯示「Bot 已登入」
- [ ] Bot 顯示「PostgreSQL 連接成功」
- [ ] API 伺服器運行在 http://localhost:3001
- [ ] 前端運行在 http://localhost:5173
- [ ] 在 Discord 發送訊息後，數據庫有新記錄

### Discord 測試
- [ ] 可以通過 Activities 按鈕啟動應用
- [ ] 應用在 Discord 內正常顯示
- [ ] 伺服器概覽顯示正確數據
- [ ] 所有圖表正常渲染
- [ ] 沒有 CORS 錯誤

## 生產環境部署

### 1. 構建前端
```bash
cd client
npm run build
```

### 2. 配置生產環境變數
```env
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token
PORT=3001
VITE_API_URL=https://api.your-domain.com
ALLOWED_GUILD_IDS=你的伺服器ID

# 使用生產數據庫
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your-user
DB_PASSWORD=your-password
```

### 3. 更新 Discord Developer Portal
1. 在「Activities」→「URL Mappings」中添加生產環境 URL：
   ```
   https://your-domain.com
   ```
2. 在「OAuth2」→「Redirects」中添加生產環境 URL

### 4. 配置 HTTPS
Discord Embedded App **必須使用 HTTPS**（本地開發除外）。

### 5. 使用 PM2 管理進程
```bash
npm install -g pm2

# 啟動服務
pm2 start server/index.js --name "discord-stats-api"
pm2 start bot/index.js --name "discord-stats-bot"

# 設置開機自啟
pm2 startup
pm2 save
```

## 常見問題

### Bot 無法啟動
- 檢查 `DISCORD_BOT_TOKEN` 是否正確
- 檢查 PostgreSQL 是否運行：`pg_isready`
- 檢查數據庫連接資訊是否正確

### Embedded App 無法載入
- 檢查 `VITE_DISCORD_CLIENT_ID` 是否正確
- 確認在 Discord 內打開（不是瀏覽器直接訪問）
- 檢查瀏覽器控制台錯誤
- 確認 Activity URL 配置為 `http://localhost:5173`

### API 請求失敗
- 檢查 API 伺服器是否運行
- 檢查 CORS 配置
- 確認 `VITE_API_URL` 正確
- 檢查白名單配置

### 沒有數據顯示
- 確認 Bot 正在運行
- 在 Discord 發送一些測試訊息
- 檢查數據庫是否有數據
- 等待至少 1 分鐘讓數據累積

## 下一步

- 閱讀 `DEVELOPMENT.md` 了解開發指南
- 閱讀 `CONFIGURATION.md` 了解進階配置
- 閱讀 `TROUBLESHOOTING.md` 了解故障排除

