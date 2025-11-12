# Discord Embedded App 設置指南

本指南將幫助你將統計儀表板配置為 Discord Embedded App，讓用戶可以直接在 Discord 內查看伺服器統計。

## 什麼是 Discord Embedded App？

Discord Embedded App（Activities）是可以直接在 Discord 內運行的網頁應用，提供無縫的用戶體驗。

**重要**：Embedded App 主要通過 Activities 按鈕啟動，**不需要**註冊斜線命令。斜線命令是可選的快捷方式。

## 步驟 1: Discord Developer Portal 設置

### 1.1 創建應用

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊「New Application」
3. 輸入應用名稱（例如：伺服器統計）
4. 點擊「Create」

### 1.2 配置 OAuth2

1. 在左側選單選擇「OAuth2」
2. 添加 Redirect URLs：
   ```
   http://localhost:5173
   https://your-domain.com
   ```
3. 複製 **Client ID** 和 **Client Secret**

### 1.3 啟用 Embedded App

1. 在左側選單選擇「Activities」
2. 點擊「Enable Activities」
3. 配置 Activity Settings：
   - **Activity Name**: 伺服器統計
   - **Description**: 查看伺服器的詳細統計數據
   - **Activity URL Mappings**:
     - Development: `http://localhost:5173`
     - Production: `https://your-domain.com`

### 1.4 配置 Bot

1. 在左側選單選擇「Bot」
2. 點擊「Add Bot」
3. 啟用以下 Privileged Gateway Intents：
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. 複製 **Bot Token**

### 1.5 安裝到伺服器

1. 在左側選單選擇「OAuth2」→「URL Generator」
2. 選擇 Scopes：
   - ✅ `bot`
   - ✅ `applications.commands`
3. 選擇 Bot Permissions：
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
4. 複製生成的 URL 並在瀏覽器中打開
5. 選擇要安裝的伺服器

## 步驟 2: 環境變數配置

### 2.1 根目錄 `.env`

```env
# Discord 應用配置
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token

# 伺服器配置
PORT=3001
VITE_API_URL=http://localhost:3001

# 白名單（你的伺服器 ID）
ALLOWED_GUILD_IDS=你的伺服器ID
```

### 2.2 Bot `.env`

```env
# Discord Bot Token
DISCORD_BOT_TOKEN=你的_bot_token

# 白名單
ALLOWED_GUILD_IDS=你的伺服器ID

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=你的密碼
```

### 2.3 Client `.env` (創建新文件)

在 `client/` 目錄創建 `.env` 文件：

```env
VITE_DISCORD_CLIENT_ID=你的_client_id
VITE_API_URL=http://localhost:3001
```

## 步驟 3: 更新前端配置

### 3.1 確認 Discord SDK 已安裝

```bash
cd client
npm install @discord/embedded-app-sdk
```

### 3.2 配置 Vite

`client/vite.config.ts` 已配置好，確認包含：

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

## 步驟 4: 本地測試

### 4.1 啟動所有服務

```bash
# 終端 1: 啟動數據庫（如果還沒運行）
# PostgreSQL 應該已經在運行

# 終端 2: 啟動 Bot
npm run bot

# 終端 3: 啟動 API 伺服器
npm run server

# 終端 4: 啟動前端
npm run client
```

或使用一個命令啟動所有服務：

```bash
npm run dev
```

### 4.2 在 Discord 中測試

1. 打開 Discord 桌面應用或網頁版
2. 進入你安裝了 Bot 的伺服器
3. 在任意頻道中，點擊訊息輸入框旁的「+」按鈕
4. 選擇「Activities」
5. 找到並點擊你的應用「伺服器統計」
6. 應用會在 Discord 內打開

### 4.3 驗證功能

確認以下功能正常：
- ✅ 伺服器概覽顯示正確數據
- ✅ 訊息趨勢圖表正常渲染
- ✅ 頻道使用情況顯示
- ✅ 成員活躍度排行
- ✅ 表情使用統計
- ✅ 關鍵詞雲顯示

## 步驟 5: 部署到生產環境

### 5.1 準備部署

1. **構建前端**：
```bash
cd client
npm run build
```

2. **配置生產環境變數**：
```env
# 生產環境 .env
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token
PORT=3001
VITE_API_URL=https://api.your-domain.com
ALLOWED_GUILD_IDS=你的伺服器ID

# 數據庫配置（使用生產數據庫）
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your-user
DB_PASSWORD=your-password
```

### 5.2 部署選項

#### 選項 A: Cloudflare Pages + Workers

**前端（Cloudflare Pages）**：
```bash
cd client
npm run build
# 上傳 dist/ 目錄到 Cloudflare Pages
```

**後端（Cloudflare Workers）**：
- 將 Express API 改寫為 Workers 格式
- 或使用其他服務託管 API

#### 選項 B: Vercel

**前端**：
```bash
cd client
vercel --prod
```

**後端**：
```bash
# 在根目錄
vercel --prod
```

#### 選項 C: 自託管（VPS）

```bash
# 安裝 PM2
npm install -g pm2

# 啟動服務
pm2 start server/index.js --name "discord-stats-api"
pm2 start bot/index.js --name "discord-stats-bot"

# 使用 Nginx 反向代理前端
# 配置 SSL 證書（Let's Encrypt）
```

### 5.3 更新 Discord Developer Portal

1. 前往 Discord Developer Portal
2. 在「Activities」→「Activity URL Mappings」中添加生產環境 URL：
   ```
   https://your-domain.com
   ```
3. 在「OAuth2」→「Redirects」中添加生產環境 URL

### 5.4 配置 HTTPS

Discord Embedded App **必須使用 HTTPS**（本地開發除外）。

使用 Let's Encrypt 獲取免費 SSL 證書：
```bash
sudo certbot --nginx -d your-domain.com
```

## 步驟 6: 監控與維護

### 6.1 日誌監控

```bash
# 查看 Bot 日誌
pm2 logs discord-stats-bot

# 查看 API 日誌
pm2 logs discord-stats-api
```

### 6.2 數據庫維護

```sql
-- 清理 90 天前的數據
DELETE FROM messages WHERE created_at < NOW() - INTERVAL '90 days';

-- 查看數據庫大小
SELECT pg_size_pretty(pg_database_size('discord_stats'));

-- 優化表
VACUUM ANALYZE messages;
VACUUM ANALYZE emoji_usage;
```

### 6.3 性能優化

1. **啟用 Redis 快取**（可選）
2. **配置 CDN**（Cloudflare）
3. **數據庫索引優化**
4. **API 響應快取**

## 常見問題

### Q: Embedded App 無法載入
**A:** 
1. 檢查 CORS 設置是否正確
2. 確認 Activity URL 配置正確
3. 檢查瀏覽器控制台錯誤

### Q: Discord SDK 初始化失敗
**A:**
1. 確認 `VITE_DISCORD_CLIENT_ID` 正確
2. 檢查是否在 Discord 內運行（不是瀏覽器直接訪問）
3. 查看 `App.tsx` 中的錯誤處理

### Q: API 請求失敗（CORS 錯誤）
**A:**
在 `server/index.js` 中確認 CORS 配置：
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-domain.com'],
  credentials: true
}));
```

### Q: 數據不更新
**A:**
1. 確認 Bot 正在運行
2. 檢查白名單配置
3. 查看數據庫是否有新數據

### Q: 如何在 Discord 中啟動 Embedded App？
**A:**
1. 在頻道中點擊訊息輸入框旁的「+」按鈕
2. 選擇「Activities」
3. 點擊你的應用圖標

## 安全建議

1. ✅ **永遠不要**將 `.env` 文件提交到 Git
2. ✅ 使用環境變數管理敏感資訊
3. ✅ 定期更換 Bot Token
4. ✅ 啟用白名單限制訪問
5. ✅ 使用 HTTPS（生產環境）
6. ✅ 實施 Rate Limiting
7. ✅ 定期備份數據庫

## 下一步

1. ✅ 完成本地測試
2. ✅ 部署到生產環境
3. ✅ 在 Discord Developer Portal 更新 URL
4. ✅ 邀請用戶測試
5. ✅ 收集反饋並優化

## 資源連結

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord Embedded App SDK 文檔](https://discord.com/developers/docs/activities/overview)
- [Discord.js 文檔](https://discord.js.org/)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)

祝你部署順利！🚀
