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
- React 18 + TypeScript (strict mode)
- Vite - 構建工具
- Chart.js + react-chartjs-2 - 圖表視覺化
- react-wordcloud - 詞雲視覺化
- Discord Embedded App SDK
- Axios - HTTP 客戶端

### 後端
- Node.js + Express
- Discord.js v14
- PostgreSQL + node-postgres
- node-cron - 定時任務

## 快速開始

### 1. 安裝依賴
```bash
npm install && cd client && npm install && cd ../bot && npm install && cd ..
```

### 2. 設置數據庫
```bash
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/create_tables.sql
```

### 3. 配置環境變數
複製 `.env.example` 為 `.env` 並填入你的 Discord 配置。

詳細設置步驟請參考 **`SETUP.md`**

### 4. 啟動應用
```bash
npm run dev
```

### 5. 在 Discord 中測試
在 Discord 頻道中點擊「+」→「Activities」→ 選擇你的應用

## 專案結構

```
discord-embed-app/
├── client/                 # React + TypeScript 前端
│   ├── src/
│   │   ├── components/    # React 組件
│   │   ├── types/         # TypeScript 類型定義
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── server/                # Express API
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── index.js
├── bot/                   # Discord Bot
│   ├── database/          # 數據庫配置和腳本
│   ├── handlers/          # 訊息處理器
│   ├── jobs/              # 定時任務
│   └── index.js
├── SETUP.md               # 設置指南
├── DEVELOPMENT.md         # 開發指南
├── CONFIGURATION.md       # 配置說明
├── TROUBLESHOOTING.md     # 故障排除
└── README.md
```

## API 端點

- `GET /api/stats/server/:guildId` - 獲取伺服器總體統計
- `GET /api/stats/members/:guildId` - 獲取成員活躍度
- `GET /api/stats/channels/:guildId` - 獲取頻道使用情況
- `GET /api/stats/messages/:guildId` - 獲取訊息量趨勢
- `GET /api/stats/emojis/:guildId` - 獲取表情使用統計
- `GET /api/stats/keywords/:guildId` - 獲取關鍵詞雲數據

## 文檔

- **`SETUP.md`** - 完整設置指南（必讀）
- **`DEVELOPMENT.md`** - 開發指南和數據庫設計
- **`CONFIGURATION.md`** - 白名單、Discord Portal 和命令配置
- **`TROUBLESHOOTING.md`** - 故障排除

## 注意事項

- 🔒 生產環境必須設定白名單（`ALLOWED_GUILD_IDS`）
- 確保 Bot 有足夠的權限訪問伺服器資訊
- 在 Discord Developer Portal 啟用 Message Content Intent
- 生產環境需要配置 HTTPS 和適當的 CORS 設定
- 遵守隱私法規，妥善處理用戶數據

## 授權

ISC
