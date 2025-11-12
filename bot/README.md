# Discord 數據收集機器人

這是一個用於收集 Discord 伺服器統計數據的機器人。

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置環境變數

複製 `.env.example` 為 `.env` 並填入你的配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件：

```env
# Discord Bot Token（從 Discord Developer Portal 獲取）
DISCORD_BOT_TOKEN=your_bot_token_here

# 白名單伺服器 ID（只收集這些伺服器的數據）
ALLOWED_GUILD_IDS=123456789012345678

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. 初始化數據庫

```bash
# 創建數據庫
createdb discord_stats

# 執行建表腳本
psql -U postgres -d discord_stats -f database/create_tables.sql
```

### 4. 啟動 Bot

```bash
# 開發模式（自動重啟）
npm run dev

# 生產模式
npm start
```

## 功能特性

- ✅ 收集用戶發言記錄
- ✅ 統計頻道使用情況
- ✅ 記錄表情使用
- ✅ 每日自動統計（凌晨 2:00）
- ✅ 白名單控制
- ✅ 優雅關閉處理

## 文件結構

```
bot/
├── database/
│   ├── db.js              # 數據庫連接
│   └── create_tables.sql  # 建表腳本
├── handlers/
│   └── messageHandler.js  # 訊息處理器
├── jobs/
│   └── statsAggregator.js # 統計任務
├── index.js               # 主程序
├── package.json
├── .env                   # 環境變數（不提交到 Git）
└── .env.example           # 環境變數範例
```

## 數據收集說明

### 收集的數據

- **訊息記錄**: 伺服器 ID、頻道 ID、用戶 ID、用戶名、訊息長度、是否包含表情、時間戳
- **表情使用**: 表情標識符、表情名稱、是否自訂、URL、使用者、時間戳
- **頻道統計**: 頻道 ID、頻道名稱、訊息數量
- **每日統計**: 總訊息數、活躍用戶數、頻道排行、用戶排行

### 不收集的數據

- ❌ 完整訊息內容（只記錄長度）
- ❌ 私人訊息
- ❌ Bot 訊息

## 白名單設置

在 `.env` 中設定 `ALLOWED_GUILD_IDS`：

```env
# 單個伺服器
ALLOWED_GUILD_IDS=123456789012345678

# 多個伺服器（用逗號分隔）
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432

# 允許所有伺服器（留空）
ALLOWED_GUILD_IDS=
```

## 獲取伺服器 ID

1. 在 Discord 開啟「開發者模式」（設定 → 進階 → 開發者模式）
2. 右鍵點擊伺服器圖標
3. 選擇「複製伺服器 ID」

## 監控與日誌

Bot 會顯示以下日誌：

```
🤖 Bot 已登入: YourBot#1234
📊 監控 1 個伺服器
🔒 白名單已啟用，收集以下伺服器的數據:
   ✅ 我的伺服器 (123456789012345678)
✅ PostgreSQL 連接成功
⏰ 每日統計任務已啟動（每天凌晨 2:00）
✅ Bot 已準備就緒，開始收集數據...

📝 已收集訊息: 我的伺服器 > #一般 > 用戶名
```

## 故障排除

### Bot 無法啟動

- 檢查 `DISCORD_BOT_TOKEN` 是否正確
- 確認 Bot 有 Message Content Intent 權限

### 無法連接數據庫

- 檢查 PostgreSQL 是否正在運行
- 確認數據庫配置是否正確
- 測試連接：`psql -U postgres -d discord_stats -c "SELECT 1"`

### 數據未被收集

- 確認伺服器在白名單中
- 檢查 Bot 是否有讀取訊息的權限
- 查看 Bot 日誌是否有錯誤

## 手動觸發統計

如果需要手動生成統計（例如測試），可以在 `index.js` 中添加：

```javascript
const { manualGenerateStats } = require('./jobs/statsAggregator');

// 在 ready 事件中
client.on('ready', async () => {
  // ... 其他代碼
  
  // 手動生成今天的統計
  await manualGenerateStats(pool, 'your_guild_id', 0);
});
```

## 性能優化

- 使用連接池（已配置，最大 20 個連接）
- 批量插入（可選，適合高流量伺服器）
- 定期清理舊數據（建議保留 90 天）

## 安全建議

- ✅ 不要將 `.env` 文件提交到 Git
- ✅ 定期更換 Bot Token
- ✅ 使用白名單限制數據收集範圍
- ✅ 遵守 Discord ToS 和隱私政策

## 支援

如有問題，請查看主項目的 `BOT_DEVELOPMENT_GUIDE.md` 文件。
