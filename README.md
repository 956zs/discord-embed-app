# Discord 伺服器統計與可視化 Embedded App

一個功能完整的 Discord Embedded App，用於展示伺服器統計數據，包括成員活躍度、頻道使用情況、訊息量趨勢等。

## 功能特色

- 📊 **伺服器概覽** - 顯示總成員數、頻道數量、身分組數等基本資訊
- 📈 **訊息量趨勢** - 7天內的訊息數量與活躍用戶趨勢圖表
- 💬 **頻道使用情況** - 各頻道的訊息數量統計
- 👥 **成員活躍度** - 最活躍成員排行榜
- 😀 **表情使用排行** - 統計自訂表情和 Unicode 表情的使用次數
- ☁️ **關鍵詞雲** - 視覺化展示伺服器中最常出現的關鍵詞

## 技術棧

### 前端
- **React 18** + **TypeScript** 🎯
- Vite（快速構建工具）
- Chart.js + react-chartjs-2（圖表視覺化）
- react-wordcloud（詞雲視覺化）
- Discord Embedded App SDK
- Axios（HTTP 客戶端）

### 後端
- Node.js + Express
- Discord.js v14
- CORS

> 💡 **為什麼選擇 TypeScript？** 提供類型安全、更好的開發體驗和更易維護的代碼。詳見 `TYPESCRIPT_SETUP.md`

## 安裝步驟

### 1. 安裝依賴

```bash
# 安裝後端依賴
npm install

# 安裝前端依賴
cd client
npm install
cd ..
```

### 2. 配置 Discord 應用

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 創建新應用或選擇現有應用
3. 在 "Bot" 頁面創建 Bot 並複製 Token
4. 在 "OAuth2" 頁面複製 Client ID 和 Client Secret
5. 啟用以下 Bot Intents:
   - Guilds
   - Guild Members
   - Guild Messages
   - Message Content

### 3. 環境變數設定

複製 `.env.example` 為 `.env` 並填入你的配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件：
```
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token
PORT=3001
VITE_API_URL=http://localhost:3001
```

### 4. 啟動應用

開發模式（同時啟動前後端）：
```bash
npm run dev
```

或分別啟動：
```bash
# 終端 1 - 後端
npm run server

# 終端 2 - 前端
npm run client
```

### 5. 部署到 Discord

1. 在 Discord Developer Portal 的應用設定中
2. 前往 "URL Mappings" 設定 Embedded App URL
3. 將應用部署到公開的伺服器
4. 在 Discord 伺服器中安裝並啟動應用

## 專案結構

```
discord-embed-app/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/    # React 組件
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ServerOverview.jsx
│   │   │   ├── MessageTrends.jsx
│   │   │   ├── ChannelUsage.jsx
│   │   │   ├── MemberActivity.jsx
│   │   │   └── *.css
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                # Express 後端
│   ├── controllers/
│   │   └── statsController.js
│   ├── routes/
│   │   └── stats.js
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## API 端點

- `GET /api/stats/server/:guildId` - 獲取伺服器總體統計
- `GET /api/stats/members/:guildId` - 獲取成員活躍度
- `GET /api/stats/channels/:guildId` - 獲取頻道使用情況
- `GET /api/stats/messages/:guildId` - 獲取訊息量趨勢
- `GET /api/stats/emojis/:guildId` - 獲取表情使用統計
- `GET /api/stats/keywords/:guildId` - 獲取關鍵詞雲數據

## 伺服器白名單

為了控制資源使用和保護數據，本應用支援伺服器白名單功能。

### 快速設定

在 `.env` 文件中設定允許的伺服器 ID：

```env
# 單個伺服器
ALLOWED_GUILD_IDS=123456789012345678

# 多個伺服器（用逗號分隔）
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432
```

詳細說明請參考 `WHITELIST_GUIDE.md`

## 數據收集

目前使用模擬數據進行展示。要收集真實數據，請參考 **`BOT_DEVELOPMENT_GUIDE.md`** 文件，其中包含：

- ✅ PostgreSQL 數據庫設置
- ✅ Discord Bot 開發（訊息監聽）
- ✅ 用戶發言統計
- ✅ 表情使用統計
- ✅ 頻道使用情況
- ✅ 每日自動統計任務
- ✅ API 整合範例

**快速開始：**
```bash
# 1. 設置數據庫
psql -U your_username -d discord_stats -f bot/database/create_tables.sql

# 2. 配置 Bot
cp bot/.env.example bot/.env
# 編輯 bot/.env 填入你的配置

# 3. 啟動 Bot
npm run bot
```

## 注意事項

- 🔒 **生產環境必須設定白名單**（`ALLOWED_GUILD_IDS`）
- 確保 Bot 有足夠的權限訪問伺服器資訊
- 在 Discord Developer Portal 啟用 Message Content Intent
- 生產環境需要配置 HTTPS 和適當的 CORS 設定
- 遵守隱私法規，妥善處理用戶數據

## 授權

ISC
