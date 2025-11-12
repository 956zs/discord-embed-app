# 開發指南

## 開發環境設置

### 前置需求

- Node.js 18+
- PostgreSQL 12+
- Discord Bot Token
- Discord Application (Embedded App)

### 初始化專案

```bash
# 1. 克隆專案
git clone <repository-url>
cd discord-embed-app

# 2. 安裝依賴
npm install
cd client && npm install
cd ../bot && npm install
cd ..

# 3. 配置環境變數
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.local.example client/.env.local

# 4. 初始化資料庫
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/schema.sql

# 5. 啟動開發服務器
npm run dev
```

## 專案結構

```
discord-embed-app/
├── bot/                    # Discord Bot
│   ├── database/          # 資料庫架構
│   │   ├── schema.sql    # 完整資料庫架構
│   │   └── README.md     # 資料庫文檔
│   ├── handlers/          # 訊息和歷史提取處理
│   │   ├── messageHandler.js
│   │   └── historyFetcher.js
│   ├── jobs/              # 定時任務
│   │   └── statsAggregator.js
│   ├── commands/          # Bot 命令
│   └── index.js           # Bot 入口
├── server/                # Express API
│   ├── controllers/       # 業務邏輯
│   │   ├── statsController.js
│   │   └── historyController.js
│   ├── routes/           # API 路由
│   │   ├── stats.js
│   │   ├── history.js
│   │   ├── fetch.js
│   │   └── auth.js
│   ├── middleware/       # 中間件
│   │   └── guildWhitelist.js
│   └── index.js          # Server 入口
├── client/               # Next.js 前端
│   ├── app/             # App Router 頁面
│   │   ├── page.tsx     # 主頁（統計儀表板）
│   │   └── admin/       # 管理員頁面
│   ├── components/      # React 組件
│   │   ├── charts/      # 圖表組件
│   │   ├── admin/       # 管理員組件
│   │   └── ui/          # shadcn/ui 組件
│   ├── lib/             # 工具函數
│   │   ├── utils.ts
│   │   └── discord-sdk.ts
│   └── types/           # TypeScript 類型
└── docs/                # 文檔
```

## 開發命令

### 啟動服務

```bash
# 啟動所有服務（推薦）
npm run dev

# 分別啟動
npm run server    # API server (port 3008)
npm run client    # Next.js dev server (port 3000)
npm run bot       # Discord bot（已整合到 server）
```

### 資料庫操作

```bash
# 初始化資料庫
psql -U postgres -d discord_stats -f bot/database/schema.sql

# 連接資料庫
psql -U postgres -d discord_stats

# 查看表結構
\d messages
\d history_fetch_tasks

# 查看數據
SELECT COUNT(*) FROM messages;
SELECT * FROM history_fetch_tasks ORDER BY created_at DESC LIMIT 10;

# 清空測試數據
TRUNCATE messages, emoji_usage, daily_stats, channel_stats, 
         history_fetch_tasks, history_fetch_ranges CASCADE;
```

### 前端開發

```bash
cd client

# 開發模式
npm run dev

# 構建
npm run build

# 預覽構建
npm run start

# 類型檢查
npm run type-check

# Lint
npm run lint
```

## 技術棧

### 前端
- **Next.js 16** - React 框架（App Router）
- **React 19** - UI 庫
- **TypeScript** - 類型安全
- **Tailwind CSS v4** - 樣式
- **shadcn/ui** - UI 組件庫
- **Recharts** - 圖表庫
- **Discord Embedded App SDK** - Discord 集成

### 後端
- **Node.js** - 運行環境
- **Express** - Web 框架
- **PostgreSQL** - 資料庫
- **node-postgres (pg)** - 資料庫客戶端
- **Discord.js v14** - Discord API 客戶端

## 開發工作流

### 1. 功能開發

```bash
# 創建功能分支
git checkout -b feature/your-feature

# 開發...
npm run dev

# 提交
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

### 2. 添加新的 API 端點

```javascript
// server/routes/your-route.js
const express = require('express');
const router = express.Router();

router.get('/:guildId/your-endpoint', async (req, res) => {
  try {
    const { guildId } = req.params;
    // 業務邏輯...
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// server/index.js
const yourRoutes = require('./routes/your-route');
app.use('/api/your-route', yourRoutes);
```

### 3. 添加新的前端頁面

```typescript
// client/app/your-page/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function YourPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/your-endpoint')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>Your Page</div>;
}
```

### 4. 添加新的 shadcn/ui 組件

```bash
cd client
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

## 調試技巧

### 後端調試

```javascript
// 添加日誌
console.log('📊 數據:', data);
console.error('❌ 錯誤:', error);

// 使用 Node.js 調試器
node --inspect server/index.js
```

### 前端調試

```typescript
// 使用 console.log
console.log('🔍 State:', state);

// 使用 React DevTools
// 安裝瀏覽器擴展

// 檢查網絡請求
// 打開瀏覽器開發者工具 → Network
```

### 資料庫調試

```sql
-- 查看最近的訊息
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- 查看提取任務
SELECT id, channel_name, status, messages_fetched, messages_saved 
FROM history_fetch_tasks 
ORDER BY created_at DESC;

-- 查看活躍任務
SELECT * FROM history_fetch_tasks WHERE status = 'running';
```

## 常見開發任務

### 添加新的統計指標

1. 修改資料庫架構（如需要）
2. 更新 bot 的訊息處理邏輯
3. 添加 API 端點
4. 創建前端組件
5. 更新類型定義

### 修改 UI 主題

```typescript
// client/app/globals.css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  // ...
}
```

### 添加新的管理員功能

1. 在 `admin_users` 表中添加管理員
2. 創建新的 API 端點（使用 `checkAdminPermission` 中間件）
3. 在 `/admin` 頁面添加 UI

## 性能優化

### 前端優化

- 使用 React.memo 避免不必要的重渲染
- 使用 useMemo 和 useCallback 優化計算
- 圖片使用 Next.js Image 組件
- 代碼分割和懶加載

### 後端優化

- 使用資料庫索引
- 實施查詢緩存
- 使用連接池
- 批量操作而非逐條處理

### 資料庫優化

```sql
-- 創建索引
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- 分析查詢性能
EXPLAIN ANALYZE SELECT * FROM messages WHERE guild_id = '123';

-- 清理舊數據
DELETE FROM messages WHERE created_at < NOW() - INTERVAL '90 days';
```

## 測試

### 手動測試

```bash
# 測試 API
curl http://localhost:3008/health
curl http://localhost:3008/api/stats/server/YOUR_GUILD_ID

# 測試 Bot 連接
# 在 Discord 發送訊息，檢查資料庫是否有新記錄
```

### 測試歷史提取

1. 訪問 `/admin` 頁面
2. 選擇頻道
3. 點擊「開始批量提取」
4. 查看進度和結果

## 故障排除

### Bot 無法啟動
- 檢查 `DISCORD_BOT_TOKEN`
- 檢查資料庫連接
- 查看 console 錯誤訊息

### 前端無法連接 API
- 檢查 `NEXT_PUBLIC_API_URL`
- 檢查 CORS 配置
- 查看瀏覽器 console

### 資料庫錯誤
- 檢查資料庫是否運行：`pg_isready`
- 檢查連接資訊
- 查看 PostgreSQL 日誌

## 貢獻指南

1. Fork 專案
2. 創建功能分支
3. 提交變更
4. 推送到分支
5. 創建 Pull Request

### Commit 訊息規範

```
feat: 新功能
fix: 修復 bug
docs: 文檔更新
style: 代碼格式
refactor: 重構
test: 測試
chore: 構建/工具變更
```

## 相關資源

- [Next.js 文檔](https://nextjs.org/docs)
- [Discord.js 指南](https://discordjs.guide/)
- [shadcn/ui 文檔](https://ui.shadcn.com/)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)
- [Discord Developer Portal](https://discord.com/developers/docs)
