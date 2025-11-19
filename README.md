# Discord 伺服器統計與可視化 Embedded App

完整的 Discord Embedded App，提供伺服器統計、成員活動分析、歷史訊息提取等功能。支援簡繁體中文切換。

## ✨ 功能特色

### 📊 統計與分析
- **即時統計**：伺服器概覽、成員數、頻道數、角色數
- **趨勢分析**：可自訂時間範圍（7天/30天/90天/180天/一年/所有時間）的訊息量和活躍用戶趨勢圖表
- **頻道分析**：各頻道使用率統計和排行
- **成員排行**：活躍度排行榜（Top 10）
- **表情統計**：自訂和 Unicode 表情使用排名，支援動畫 emoji

### 🔧 管理員功能
- **歷史訊息提取**：批量提取頻道歷史訊息
- **智能分析**：自動識別需要更新的頻道
- **討論串支援**：完整支援 Discord 討論串（threads）和論壇頻道
- **進度追蹤**：即時查看提取任務進度和歷史記錄
- **權限管理**：基於資料庫的管理員權限系統
- **效能監控**：即時系統效能指標、告警系統、Webhook 通知

### 🎨 用戶體驗
- **現代化 UI**：使用 shadcn/ui 和 Tailwind CSS v4
- **響應式設計**：完美適配桌面和手機，針對手機優化
- **手機側邊欄**：使用 Sheet 組件的流暢側邊欄導航
- **簡繁體切換**：支援繁體中文和簡體中文
- **深色主題**：護眼的深色配色方案
- **智能圖表**：手機上自動簡化數據點，優化可讀性
- **安全區域**：完美適配 Discord Embedded App 的頂部 UI
- **錯誤處理**：友好的錯誤提示和後備方案

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

## 🚀 快速開始

### 方法一：互動式配置（最簡單，推薦）

```bash
# 1. 克隆專案
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 2. 執行互動式配置工具
./setup-env.sh
# 按照提示輸入 Discord Token、資料庫連接等資訊
# 工具會自動生成所有配置文件並測試資料庫連接
# ✅ 無中文編碼問題
# ✅ 自動驗證配置
# ✅ 支援開發和生產環境

# 3. 執行一鍵部署
./deploy.sh
```

> **注意：** 新版本的 `setup-env.sh` 已完全重寫，使用英文和正確的編碼處理，不會再有中文字符寫入 `.env` 文件的問題。

### 方法二：手動配置

```bash
# 1. 克隆專案
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 2. 複製配置文件
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.example client/.env.local

# 3. 編輯配置文件（填入你的 Discord Token、資料庫連接等）
nano .env
nano bot/.env
nano client/.env.local

# 4. 執行一鍵部署
./deploy.sh
```

部署腳本會自動：
- ✅ 檢查環境和依賴
- ✅ 安裝所有 npm 套件
- ✅ 設置資料庫
- ✅ 構建前端
- ✅ 使用 PM2 啟動所有服務

### 方法三：完全手動設置

如果你想完全控制每個步驟：

#### 1. 環境需求

- Node.js 18+
- PostgreSQL 14+
- Discord Bot Token
- Discord Application (Embedded App)
- PM2（生產環境必需）

#### 2. 安裝依賴

```bash
npm install
cd client && npm install && cd ..
cd bot && npm install && cd ..
```

#### 3. 配置環境變數

詳細配置說明請參考 [CONFIGURATION.md](CONFIGURATION.md)

#### 4. 初始化資料庫

```bash
# 創建資料庫
createdb discord_stats

# 執行架構腳本
psql -U postgres -d discord_stats -f bot/database/schema.sql
psql -U postgres -d discord_stats -f bot/database/add_thread_support.sql
psql -U postgres -d discord_stats -f bot/database/add_attachments.sql
```

#### 5. 啟動服務

**開發模式：**
```bash
npm run dev
```

**生產模式：**
```bash
# 構建前端
cd client && npm run build && cd ..

# 使用 PM2 啟動
pm2 start ecosystem.config.js

# 或使用管理腳本
./manage.sh start
```

服務將運行在：
- Server + Bot: http://localhost:3008
- Client: http://localhost:3000

## 📚 文檔

### 🚀 快速開始
- [快速參考](QUICK_REFERENCE.md) - **常用命令和配置速查表**（推薦收藏）
- [部署指南](DEPLOYMENT_GUIDE.md) - 完整的部署和管理指南
- [環境變數指南](docs/ENVIRONMENT_VARIABLES.md) - **詳細的環境變數配置說明**（推薦閱讀）
- [配置指南](CONFIGURATION.md) - 環境變數和配置說明
- [開發指南](DEVELOPMENT.md) - 開發環境設置和常用命令
- [專案清理摘要](PROJECT_CLEANUP_SUMMARY.md) - 最新的專案結構改進說明

### 📖 功能文檔
- [手機優化指南](MOBILE_OPTIMIZATION.md) - **手機界面優化詳細說明**（v2.3.0 新增）
- [監控系統文檔](docs/MONITORING.md) - **效能監控系統完整指南**（v2.4.0 新增）
- [歷史提取指南](HISTORY_FETCH_GUIDE.md) - 歷史訊息提取功能使用說明
- [討論串支援](docs/THREAD_SUPPORT.md) - Discord 討論串功能說明
- [資料庫架構](bot/database/README.md) - 資料庫表結構說明
- [生產環境架構](PRODUCTION_ARCHITECTURE.md) - 生產環境部署架構說明

### 🔧 問題修復
- [Emoji 修復](EMOJI_FIX.md) - Emoji 圖片顯示問題修復
- [導航修復](NAVIGATION_FIX.md) - 頁面導航問題修復
- [頻道獲取修復](CHANNEL_FETCH_FIX.md) - 生產環境頻道獲取問題修復
- [故障排除](TROUBLESHOOTING.md) - 常見問題解決方案

### 📝 其他文檔
- [UI 升級](UI_UPGRADE.md) - shadcn/ui 升級記錄
- [主題自訂](THEME_CUSTOMIZATION.md) - 主題配色自訂指南

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

## 🛠️ 管理命令

### 部署腳本

```bash
# 初始配置
./setup-env.sh           # 互動式環境配置工具（首次使用）

# 部署
./deploy.sh              # 完整部署（首次使用）
./update.sh              # 快速更新（更新代碼、依賴、重新構建和重啟）

# 日常管理
./manage.sh start        # 啟動所有服務
./manage.sh stop         # 停止所有服務
./manage.sh restart      # 重啟所有服務
./manage.sh restart-prod # 重啟生產環境（重新載入配置）
./manage.sh status       # 查看服務狀態
./manage.sh logs         # 查看所有日誌
./manage.sh logs-server  # 查看 Server 日誌（包含 Bot）
./manage.sh logs-client  # 查看 Client 日誌
./manage.sh backup       # 備份資料庫
./manage.sh restore <file> # 還原資料庫
./manage.sh health       # 健康檢查
./manage.sh clean        # 清理日誌和舊備份

# 進程模式切換
./manage.sh switch-mode dual   # 切換到雙進程模式（推薦）
./manage.sh switch-mode single # 切換到單進程模式（節省資源）
```

### NPM 腳本

```bash
# 開發
npm run dev              # 啟動所有服務（推薦）
npm run server           # 只啟動 server（包含 bot）
npm run client           # 只啟動 client
npm run bot              # 只啟動 bot

# 生產
npm run build            # 構建前端
npm start                # 啟動生產服務器
npm run start:bot        # 啟動 bot
```

### PM2 命令

```bash
pm2 status               # 查看所有服務狀態
pm2 logs                 # 查看所有日誌
pm2 logs discord-server  # 查看 Server 日誌（包含 Bot）
pm2 logs discord-client  # 查看 Client 日誌
pm2 restart all          # 重啟所有服務
pm2 stop all             # 停止所有服務
pm2 monit                # 監控面板
pm2 save                 # 保存當前進程列表
```

## 🔐 管理員功能

訪問 `/admin` 頁面使用管理員功能：

### 功能列表

1. **批量提取**
   - 智能識別需要更新的頻道
   - 一鍵批量提取多個頻道
   - 支援討論串和論壇頻道
   - 即時進度顯示

2. **頻道管理**
   - 查看所有頻道和討論串
   - 顯示提取狀態和統計
   - 單獨提取特定頻道

3. **提取歷史**
   - 查看所有提取任務
   - 即時進度追蹤
   - 詳細的統計信息
   - 錯誤日誌查看

4. **效能監控**（訪問 `/admin/monitoring`）
   - 即時系統效能指標（CPU、記憶體、事件循環延遲）
   - 應用程式指標（API 請求、Discord 事件、資料庫查詢）
   - 健康檢查狀態（資料庫、Bot、系統資源）
   - 告警列表和歷史記錄
   - 進程資訊和運行狀態
   - 自動更新（30 秒間隔）

### 監控系統

系統提供全面的效能監控功能：

**核心功能：**
- ✅ 即時效能指標收集（每 30 秒）
- ✅ 自動告警系統（CPU、記憶體、響應時間等）
- ✅ Discord Webhook 通知（ERROR 級別告警）
- ✅ 視覺化監控儀表板
- ✅ 健康檢查 API 端點
- ✅ 雙進程/單進程模式切換

**進程模式：**
- **雙進程模式**（預設，推薦）：更好的故障隔離和監控，適合生產環境
- **單進程模式**：節省約 50-100MB 記憶體，適合資源受限環境

**快速啟用：**
```bash
# 在 .env 中設定
ENABLE_MONITORING=true
ADMIN_TOKEN=your_secure_token

# 可選：配置 Webhook 通知
WEBHOOK_ENABLED=true
WEBHOOK_URLS=https://discord.com/api/webhooks/xxx/yyy
```

詳細說明請參考 [監控系統文檔](docs/MONITORING.md)。

### 權限管理

管理員權限基於資料庫 `admin_users` 表：

```sql
-- 添加管理員
INSERT INTO admin_users (guild_id, user_id, username) 
VALUES ('your_guild_id', 'user_id', 'username');

-- 查看管理員
SELECT * FROM admin_users WHERE guild_id = 'your_guild_id';

-- 移除管理員
DELETE FROM admin_users 
WHERE guild_id = 'your_guild_id' AND user_id = 'user_id';
```

同一個用戶可以在多個伺服器擁有管理員權限，權限是按伺服器獨立管理的。

## 🌟 最新更新

### v2.4.0 (2025-01) - 效能監控系統

**全新監控功能：**
- ✅ **效能指標收集**：CPU、記憶體、事件循環延遲、API 響應時間
- ✅ **告警系統**：自動檢測異常並記錄，支援可配置閾值
- ✅ **Webhook 通知**：ERROR 級別告警自動發送到 Discord
- ✅ **監控儀表板**：管理員頁面新增 `/admin/monitoring` 監控分頁
- ✅ **健康檢查**：增強的 `/health` 端點，提供詳細診斷資訊
- ✅ **進程模式切換**：支援雙進程和單進程部署模式
- ✅ **API 端點**：`/api/metrics`、`/api/metrics/alerts` 等監控 API

**監控特性：**
- 🔧 每 30 秒自動收集系統和應用程式指標
- 🔧 保留最近 24 小時的歷史數據
- 🔧 告警去重機制（5 分鐘冷卻期）
- 🔧 支援多個 Webhook URL
- 🔧 速率限制和重試機制
- 🔧 輕量級設計（CPU < 1%，記憶體 ~10-20MB）

**進程模式：**
- 🔧 雙進程模式（預設）：更好的故障隔離，適合生產環境
- 🔧 單進程模式：節省 50-100MB 記憶體，適合資源受限環境
- 🔧 使用 `./manage.sh switch-mode` 命令輕鬆切換

**新增文檔：**
- 📖 `docs/MONITORING.md` - 完整的監控系統指南
- 📖 `server/monitoring/README.md` - 監控模組技術文檔
- 📖 `server/monitoring/API_USAGE.md` - API 使用說明
- 📖 `server/monitoring/WEBHOOK_IMPLEMENTATION.md` - Webhook 實作指南

### v2.3.0 (2025-01) - 手機界面優化

**手機體驗大幅提升：**
- ✅ **側邊欄導航**：使用 shadcn Sheet 組件，從左側滑出的流暢菜單
- ✅ **圖表優化**：
  - 智能數據採樣（超過 15 個點自動簡化到 12 個）
  - 優化的邊距和字體大小
  - 簡化的日期格式（月/日）
  - 減少 Y 軸刻度，更清爽
  - 淡化網格線，突出數據
- ✅ **時間範圍擴展**：新增「今日」、「昨日」、「最近 3 天」選項
- ✅ **今日前三統計**：顯示今日最活躍的頻道、用戶和表情
- ✅ **單日數據優化**：今日/昨日數據顯示為統計卡片而非折線圖
- ✅ **安全區域支持**：所有頁面適配 Discord Embedded App 頂部 UI
- ✅ **響應式組件**：UserInfo、LanguageSwitcher 在手機上更緊湊
- ✅ **桌面版對齊**：導航欄元素居中對齊，視覺更美觀

**技術改進：**
- 🔧 使用 `useIsMobile` hook 檢測設備類型
- 🔧 動態調整圖表參數（邊距、字體、刻度）
- 🔧 頻道使用統計支持時間範圍過濾
- 🔧 後端 API 支持 `today`、`yesterday` 參數
- 🔧 全局樣式支持 Discord 安全區域

**新增文檔：**
- 📖 `MOBILE_OPTIMIZATION.md` - 手機優化詳細說明

### v2.2.0 (2025-01) - 環境變數重構

**重大改進：**
- ✅ **環境變數完全重構**：所有配置文件現在使用環境變數，無硬編碼值
- ✅ **setup-env.sh 重寫**：修復中文編碼問題，使用英文和正確的編碼處理
- ✅ **動態配置**：`next.config.ts` 和 `ecosystem.config.js` 現在從環境變數讀取
- ✅ **專案清理工具**：新增 `cleanup-project.sh` 互動式專案整理工具
- ✅ **完整文檔**：新增詳細的環境變數指南和快速參考

**配置文件改進：**
- 🔧 `client/next.config.ts`：使用 `NEXT_PUBLIC_DISCORD_CLIENT_ID` 和 `NEXT_PUBLIC_API_URL`
- 🔧 `ecosystem.config.js`：使用 `process.env.PORT` 和 `process.env.CLIENT_PORT`
- 🔧 所有 `.env.example` 文件：統一格式，清晰的英文註釋

**新增文檔：**
- 📖 `docs/ENVIRONMENT_VARIABLES.md` - 完整的環境變數配置指南
- 📖 `QUICK_REFERENCE.md` - 常用命令和配置速查表
- 📖 `PROJECT_CLEANUP_SUMMARY.md` - 專案重構詳細說明

**遷移指南：**
如果你已經在使用舊版本，請參考 [PROJECT_CLEANUP_SUMMARY.md](PROJECT_CLEANUP_SUMMARY.md) 了解如何遷移。

### v2.1.0 (2025-01)

**新功能：**
- ✅ **互動式配置工具**：`setup-env.sh` 引導式環境配置
- ✅ **生產環境優化**：改進的 PM2 配置，Server 和 Bot 合併運行
- ✅ **管理腳本增強**：新增 `restart-prod` 命令
- ✅ **頻道獲取修復**：解決生產環境頻道獲取問題
- ✅ **Emoji URL 更新**：支援 Discord 新的 WebP 格式

**改進：**
- 🔧 更好的錯誤處理和日誌記錄
- 🔧 優化的資料庫連接測試
- 🔧 改進的文檔結構和說明
- 🔧 統一的部署流程

### v2.0.0 (2024-12)

**核心功能：**
- ✅ **簡繁體中文切換**：完整的國際化支援
- ✅ **討論串支援**：完整支援 Discord 討論串和論壇頻道
- ✅ **附件支援**：記錄訊息中的圖片和文件附件
- ✅ **時間範圍選擇**：可自訂統計時間範圍（7天到所有時間）
- ✅ **Emoji 優化**：修復自定義 emoji 顯示問題，支援動畫 emoji
- ✅ **導航優化**：使用 Next.js 客戶端路由，避免頁面重載
- ✅ **響應式設計**：完美適配手機和平板
- ✅ **一鍵部署**：提供完整的部署和管理腳本
- ✅ **健康檢查**：自動監控服務狀態
- ✅ **備份還原**：資料庫備份和還原功能

**技術棧：**
- Next.js 16 + React 19
- Tailwind CSS v4
- shadcn/ui (Sheet, Separator, Button 等組件)
- Recharts 圖表庫
- Discord.js v14
- PostgreSQL 14+
- PM2 進程管理
- 完整的 TypeScript 類型支援

## 🔧 系統需求

### 最低需求
- CPU: 1 核心
- RAM: 2GB
- 硬碟: 5GB
- Node.js: 18.0.0+
- PostgreSQL: 14.0+

### 推薦配置
- CPU: 2 核心
- RAM: 4GB
- 硬碟: 20GB
- Node.js: 20.0.0+
- PostgreSQL: 15.0+

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 開發流程

1. Fork 本專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 代碼規範

- 使用 TypeScript（前端）
- 遵循 ESLint 規則
- 添加適當的註釋
- 更新相關文檔

## 📝 授權

ISC License

## 💬 支援

如有問題或建議：

1. 查看 [故障排除文檔](TROUBLESHOOTING.md)
2. 查看 [部署指南](DEPLOYMENT_GUIDE.md)
3. 查看 [生產環境架構](PRODUCTION_ARCHITECTURE.md)
4. 提交 [Issue](https://github.com/956zs/discord-embed-app/issues)
5. 查看日誌：`./manage.sh logs`

### 常見問題

**Q: 如何快速開始？**
A: 執行 `./setup-env.sh` 配置環境，然後執行 `./deploy.sh` 部署。

**Q: 生產環境如何部署？**
A: 參考 [部署指南](DEPLOYMENT_GUIDE.md) 和 [生產環境架構](PRODUCTION_ARCHITECTURE.md)。

**Q: 如何添加管理員？**
A: 使用 SQL 命令添加到 `admin_users` 表，詳見上方「管理員功能」章節。

**Q: Emoji 圖片無法顯示？**
A: 參考 [Emoji 修復文檔](EMOJI_FIX.md)，Discord 已更新 CDN URL 格式。

**Q: 歷史提取功能無法使用？**
A: 檢查 bot 是否正常運行，參考 [頻道獲取修復](CHANNEL_FETCH_FIX.md)。

**Q: 如何備份資料庫？**
A: 執行 `./manage.sh backup`，備份文件會保存在 `backups/` 目錄。

**Q: 如何啟用監控系統？**
A: 在 `.env` 中設定 `ENABLE_MONITORING=true` 和 `ADMIN_TOKEN`，然後重啟服務。詳見 [監控系統文檔](docs/MONITORING.md)。

**Q: 如何切換進程模式？**
A: 執行 `./manage.sh switch-mode dual` 或 `./manage.sh switch-mode single`。雙進程模式推薦用於生產環境。

## 🙏 致謝

- [Discord.js](https://discord.js.org/) - Discord API 封裝
- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 組件庫
- [Recharts](https://recharts.org/) - 圖表庫
- [PostgreSQL](https://www.postgresql.org/) - 資料庫
