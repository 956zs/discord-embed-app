# Discord 伺服器統計與可視化 Embedded App

完整的 Discord Embedded App，提供伺服器統計、成員活動分析、歷史訊息提取等功能。

## 功能特色

- 📊 **即時統計**：伺服器概覽、成員數、頻道數、角色數
- 📈 **趨勢分析**：7 天訊息量和活躍用戶趨勢圖表
- 💬 **頻道分析**：各頻道使用率統計
- 👥 **成員排行**：活躍度排行榜（Top 10）
- 😀 **表情統計**：自訂和 Unicode 表情使用排名
- 🕐 **歷史提取**：批量提取頻道歷史訊息（管理員功能）
- 🎨 **現代化 UI**：使用 shadcn/ui 和 Tailwind CSS

## 技術架構

### 前端 (client/)
- Next.js 16 + App Router
- React 19 + TypeScript (strict mode)
- shadcn/ui + Tailwind CSS v4
- Recharts 數據可視化
- Discord Embedded App SDK

### 後端 (server/)
- Node.js + Express
- PostgreSQL 資料庫
- RESTful API

### Bot (bot/)
- Discord.js v14
- 即時訊息收集
- 歷史訊息提取
- 每日統計聚合

## 快速開始

### 1. 環境需求

- Node.js 18+
- PostgreSQL 12+
- Discord Bot Token
- Discord Application (Embedded App)

### 2. 安裝依賴

```bash
# 安裝所有依賴
npm install
cd client && npm install
cd ../bot && npm install
```

### 3. 配置環境變數

複製並編輯環境變數文件：

```bash
# 根目錄 .env
cp .env.example .env

# Bot .env
cp bot/.env.example bot/.env

# Client .env.local
cp client/.env.local.example client/.env.local
```

詳細配置說明請參考 [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

### 4. 初始化資料庫

```bash
# 創建資料庫
createdb discord_stats

# 執行架構腳本
psql -U postgres -d discord_stats -f bot/database/schema.sql
```

### 5. 啟動服務

```bash
# 開發模式（啟動所有服務）
npm run dev

# 服務將運行在：
# - Server: http://localhost:3008
# - Client: http://localhost:3000
# - Bot: 自動啟動
```

## 文檔

- [配置指南](docs/CONFIGURATION.md) - 環境變數和配置說明
- [開發指南](docs/DEVELOPMENT.md) - 開發環境設置和常用命令
- [部署指南](docs/DEPLOYMENT.md) - 生產環境部署步驟
- [資料庫架構](bot/database/README.md) - 資料庫表結構說明
- [故障排除](docs/TROUBLESHOOTING.md) - 常見問題解決方案

## 專案結構

```
discord-embed-app/
├── bot/                    # Discord Bot
│   ├── database/          # 資料庫架構
│   ├── handlers/          # 訊息和歷史提取處理
│   ├── jobs/              # 定時任務
│   └── commands/          # Bot 命令
├── server/                # Express API
│   ├── controllers/       # 業務邏輯
│   ├── routes/           # API 路由
│   └── middleware/       # 中間件
├── client/               # Next.js 前端
│   ├── app/             # App Router 頁面
│   ├── components/      # React 組件
│   ├── lib/             # 工具函數
│   └── types/           # TypeScript 類型
└── docs/                # 文檔
```

## 主要命令

```bash
# 開發
npm run dev              # 啟動所有服務（推薦）
npm run server           # 只啟動 server（包含 bot）
npm run client           # 只啟動 client

# 生產
npm run build            # 構建前端
npm start                # 啟動生產服務器

# 資料庫
psql -d discord_stats -f bot/database/schema.sql  # 初始化資料庫
```

## 管理員功能

訪問 `/admin` 頁面使用歷史訊息提取功能：

1. **批量提取**：智能識別需要更新的頻道，一鍵批量提取
2. **頻道管理**：查看所有頻道和提取狀態
3. **提取歷史**：查看所有提取任務的進度和結果

## 授權

ISC License

## 貢獻

歡迎提交 Issue 和 Pull Request！
