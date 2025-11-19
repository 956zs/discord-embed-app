# 文檔中心

歡迎來到 Discord 伺服器統計與可視化 Embedded App 的文檔中心。

## 📖 文檔導航

### 🚀 快速開始

如果你是第一次使用本專案，建議按以下順序閱讀：

1. **[快速部署摘要](../DEPLOYMENT_SUMMARY.md)** - 3 分鐘快速部署指南
2. **[完整部署指南](../COMPLETE_DEPLOYMENT_GUIDE.md)** - 詳細的部署步驟
3. **[快速參考](../QUICK_REFERENCE.md)** - 常用命令速查表

### 📋 配置文檔

| 文檔 | 說明 | 何時閱讀 |
|------|------|----------|
| [環境變數指南](ENVIRONMENT_VARIABLES.md) | 完整的環境變數配置說明 | 配置系統時 |
| [環境變數審查](../ENV_VARS_AUDIT.md) | 環境變數命名一致性報告 | 檢查配置時 |
| [配置指南](CONFIGURATION.md) | 系統配置和設定 | 自訂配置時 |

### 🔧 運維文檔

| 文檔 | 說明 | 重要性 |
|------|------|----------|
| [PM2 安全操作](PM2_SAFETY.md) | 進程管理安全規範 | ⭐⭐⭐ 必讀 |
| [監控系統](MONITORING.md) | 效能監控完整指南 | ⭐⭐ 推薦 |
| [故障排除](guides/TROUBLESHOOTING.md) | 常見問題解決 | 遇到問題時 |

### 💻 開發文檔

| 文檔 | 說明 | 適用對象 |
|------|------|----------|
| [開發指南](DEVELOPMENT.md) | 開發環境設置 | 開發者 |
| [資料庫架構](../bot/database/README.md) | 資料庫表結構 | 開發者 |
| [監控模組](../server/monitoring/README.md) | 監控系統架構 | 開發者 |

### 🎯 功能文檔

| 文檔 | 說明 |
|------|------|
| [討論串支援](THREAD_SUPPORT.md) | Discord 討論串功能 |
| [快取優化](features/CACHE_OPTIMIZATION.md) | 資料快取策略 |
| [監控 API](../server/monitoring/API_USAGE.md) | 監控 API 端點 |
| [Webhook 通知](../server/monitoring/WEBHOOK_IMPLEMENTATION.md) | Discord Webhook 實作 |

### 📦 專案管理

| 文檔 | 說明 |
|------|------|
| [專案組織](../PROJECT_ORGANIZATION_COMPLETE.md) | 專案結構重組 |
| [文檔重組](DOCUMENTATION_REORGANIZATION.md) | 文檔結構調整 |
| [腳本重組](SCRIPTS_REORGANIZATION.md) | 管理腳本整理 |

## 🗂️ 文檔結構

```
docs/
├── README.md                          # 📖 本文件 - 文檔導航中心
├── ENVIRONMENT_VARIABLES.md           # 🔧 環境變數完整指南
├── CONFIGURATION.md                   # ⚙️ 系統配置說明
├── DEVELOPMENT.md                     # 💻 開發指南
├── PM2_SAFETY.md                      # 🔒 PM2 安全操作規範
├── MONITORING.md                      # 📊 監控系統完整指南
├── THREAD_SUPPORT.md                  # 💬 討論串支援說明
├── DOCUMENTATION_REORGANIZATION.md    # 📋 文檔重組記錄
├── SCRIPTS_REORGANIZATION.md          # 📋 腳本重組記錄
│
├── guides/                            # 📚 使用指南
│   ├── README.md                      # 指南索引
│   └── TROUBLESHOOTING.md             # 故障排除
│
├── features/                          # 🎯 功能專題
│   └── CACHE_OPTIMIZATION.md          # 快取優化
│
└── archive/                           # 🗄️ 歷史文檔
    ├── README.md                      # 存檔說明
    └── [舊版文檔...]
```

## 🎯 按場景查找文檔

### 場景 1：首次部署

**目標：** 從零開始部署 Discord 統計應用

**閱讀順序：**
1. [快速部署摘要](../DEPLOYMENT_SUMMARY.md) - 了解部署流程
2. [環境變數指南](ENVIRONMENT_VARIABLES.md) - 準備配置資訊
3. 執行 `./setup-env.sh` - 互動式配置
4. 執行 `./deploy.sh` - 一鍵部署
5. [快速參考](../QUICK_REFERENCE.md) - 學習常用命令

### 場景 2：生產環境部署

**目標：** 在生產伺服器上安全部署

**閱讀順序：**
1. [完整部署指南](../COMPLETE_DEPLOYMENT_GUIDE.md) - 詳細步驟
2. [PM2 安全操作](PM2_SAFETY.md) - 了解安全規範
3. [環境變數指南](ENVIRONMENT_VARIABLES.md) - 配置生產環境
4. [監控系統](MONITORING.md) - 啟用效能監控
5. [故障排除](guides/TROUBLESHOOTING.md) - 預防常見問題

### 場景 3：日常維護

**目標：** 管理和維護運行中的應用

**常用文檔：**
- [快速參考](../QUICK_REFERENCE.md) - 常用命令
- [故障排除](guides/TROUBLESHOOTING.md) - 解決問題
- [監控系統](MONITORING.md) - 查看系統狀態

**常用命令：**
```bash
./manage.sh status      # 查看狀態
./manage.sh logs        # 查看日誌
./manage.sh restart     # 重啟服務
./manage.sh backup      # 備份資料庫
./manage.sh health      # 健康檢查
```

### 場景 4：開發貢獻

**目標：** 參與專案開發

**閱讀順序：**
1. [開發指南](DEVELOPMENT.md) - 設置開發環境
2. [資料庫架構](../bot/database/README.md) - 了解資料結構
3. [專案組織](../PROJECT_ORGANIZATION_COMPLETE.md) - 了解專案結構
4. [監控模組](../server/monitoring/README.md) - 了解監控系統

### 場景 5：問題排查

**目標：** 解決運行中的問題

**步驟：**
1. 查看 [故障排除](guides/TROUBLESHOOTING.md) - 常見問題
2. 執行 `./manage.sh logs` - 查看日誌
3. 執行 `./manage.sh health` - 健康檢查
4. 查看 [監控系統](MONITORING.md) - 檢查效能指標
5. 查看 [環境變數指南](ENVIRONMENT_VARIABLES.md) - 驗證配置

### 場景 6：效能優化

**目標：** 提升系統效能

**相關文檔：**
- [監控系統](MONITORING.md) - 監控效能指標
- [快取優化](features/CACHE_OPTIMIZATION.md) - 優化資料存取
- [PM2 安全操作](PM2_SAFETY.md) - 進程模式選擇

## 📝 文檔版本

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v2.4.0 | 2025-01 | 新增監控系統文檔 |
| v2.3.0 | 2025-01 | 新增手機優化文檔 |
| v2.2.0 | 2025-01 | 環境變數重構，新增審查報告 |
| v2.1.0 | 2025-01 | 新增 PM2 安全操作文檔 |
| v2.0.0 | 2024-12 | 文檔結構重組 |

## 🔗 外部資源

### Discord 相關
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js 文檔](https://discord.js.org/)
- [Discord Embedded App SDK](https://discord.com/developers/docs/activities/overview)

### 技術棧
- [Next.js 文檔](https://nextjs.org/docs)
- [React 文檔](https://react.dev/)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)
- [PM2 文檔](https://pm2.keymetrics.io/docs/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 💡 文檔貢獻

發現文檔問題或有改進建議？

1. 提交 [Issue](https://github.com/956zs/discord-embed-app/issues)
2. 或直接提交 Pull Request

### 文檔撰寫規範

- 使用繁體中文
- 使用 Markdown 格式
- 包含清晰的標題和章節
- 提供實際的範例代碼
- 添加適當的表格和列表
- 使用 emoji 增加可讀性

## 🆘 需要幫助？

如果文檔無法解決你的問題：

1. 查看 [故障排除](guides/TROUBLESHOOTING.md)
2. 查看 [GitHub Issues](https://github.com/956zs/discord-embed-app/issues)
3. 提交新的 Issue 描述你的問題

---

**提示：** 建議將 [快速參考](../QUICK_REFERENCE.md) 加入書籤，方便日常使用。
