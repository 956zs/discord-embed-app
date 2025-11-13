# 生產環境架構說明

## 架構概述

### 開發環境（單進程模式）

在開發環境中，所有服務運行在同一個進程：

```
npm run dev
  ├── Server (Express API)
  ├── Bot (Discord.js) ← 在 server 進程中啟動
  └── Client (Next.js dev server)
```

**特點**：
- Server 直接 `require("../bot/index.js")` 啟動 bot
- Server 可以直接訪問 bot 的 `historyFetcher` 實例
- 簡單、方便調試

### 生產環境（多進程模式）

在生產環境中，使用 PM2 管理三個獨立進程：

```
PM2
  ├── discord-bot (獨立進程)
  ├── discord-api (獨立進程)
  └── discord-client (獨立進程)
```

**特點**：
- 每個服務獨立運行，互不影響
- 可以獨立重啟、擴展
- 更好的資源隔離和錯誤恢復

## 歷史提取功能的實現

### 開發環境

```
用戶 → Client → API → historyFetcher (同進程)
                 ↓
              直接調用 startFetch()
```

### 生產環境

```
用戶 → Client → API → 創建任務到資料庫
                       ↓
                    history_fetch_tasks (status='pending')
                       ↓
                    Bot 定時檢查 (每 5 秒)
                       ↓
                    執行 startFetch()
```

**工作流程**：

1. **用戶發起提取請求**
   - 前端調用 `/api/fetch/:guildId/start`
   - API 創建一條 `status='pending'` 的任務記錄

2. **Bot 監聽任務**
   - Bot 每 5 秒查詢一次待處理任務
   - 發現任務後，更新狀態為 `running`
   - 執行 `historyFetcher.startFetch()`

3. **任務執行**
   - Bot 提取歷史訊息
   - 更新任務狀態和進度
   - 完成後設置 `status='completed'`

4. **前端查詢進度**
   - 前端定時調用 `/api/history/:guildId/tasks`
   - 從資料庫讀取任務狀態和進度

## 配置

### 環境變數

**開發環境** (`.env`):
```env
NODE_ENV=development
# 不需要特殊配置
```

**生產環境** (`.env`):
```env
NODE_ENV=production
# Bot 和 Server 分開運行
```

### PM2 配置 (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: "discord-bot",
      cwd: "./bot",
      script: "index.js",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "discord-api",
      cwd: "./server",
      script: "index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3008,
      },
    },
    {
      name: "discord-client",
      cwd: "./client",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

## 部署步驟

### 1. 構建前端

```bash
cd client
npm run build
cd ..
```

### 2. 啟動所有服務

```bash
pm2 start ecosystem.config.js
```

### 3. 驗證服務

```bash
pm2 status
pm2 logs
```

### 4. 測試歷史提取

1. 訪問管理員頁面
2. 點擊「開始提取」
3. 檢查 bot 日誌：`pm2 logs discord-bot`
4. 應該看到：「發現待處理任務 X，開始執行...」

## 故障排除

### 問題 1: "Cannot read properties of undefined (reading 'fetch')"

**原因**：生產環境中 bot 和 server 是分開的進程，server 無法直接訪問 bot 的 client。

**解決**：
- ✅ 已修復：Bot 現在通過資料庫監聽任務
- ✅ Server 只負責創建任務記錄
- ✅ Bot 獨立執行提取邏輯

### 問題 2: 任務一直處於 pending 狀態

**檢查**：
```bash
# 檢查 bot 是否運行
pm2 status

# 檢查 bot 日誌
pm2 logs discord-bot

# 檢查資料庫
psql -d discord_stats -c "SELECT * FROM history_fetch_tasks WHERE status='pending';"
```

**可能原因**：
- Bot 進程未啟動
- Bot 沒有啟動任務監聽器
- 資料庫連接問題

### 問題 3: 任務執行失敗

**檢查 bot 日誌**：
```bash
pm2 logs discord-bot --lines 100
```

**常見錯誤**：
- 找不到伺服器/頻道：檢查 bot 權限
- 無法獲取訊息：檢查頻道類型和權限
- 資料庫錯誤：檢查連接和表結構

## 監控

### 查看服務狀態

```bash
# 所有服務
pm2 status

# 特定服務
pm2 show discord-bot
pm2 show discord-api
```

### 查看日誌

```bash
# 實時日誌
pm2 logs

# 特定服務
pm2 logs discord-bot
pm2 logs discord-api

# 最近 100 行
pm2 logs --lines 100
```

### 查看任務狀態

```sql
-- 待處理任務
SELECT * FROM history_fetch_tasks WHERE status='pending';

-- 運行中任務
SELECT * FROM history_fetch_tasks WHERE status='running';

-- 最近完成的任務
SELECT * FROM history_fetch_tasks 
WHERE status='completed' 
ORDER BY completed_at DESC 
LIMIT 10;
```

## 性能優化

### 1. 調整任務檢查頻率

在 `bot/index.js` 中修改：

```javascript
setInterval(async () => {
  // 檢查任務
}, 5000); // 5 秒 → 可以調整為 3000 (3秒) 或 10000 (10秒)
```

### 2. 並行處理多個任務

目前一次只處理一個任務。如需並行：

```javascript
// 修改 LIMIT 1 為 LIMIT 5
const result = await pool.query(
  `SELECT id, guild_id, channel_id, anchor_message_id 
   FROM history_fetch_tasks 
   WHERE status = 'pending' 
   ORDER BY created_at ASC 
   LIMIT 5` // 一次處理 5 個任務
);
```

### 3. 資源限制

在 `ecosystem.config.js` 中調整：

```javascript
{
  name: "discord-bot",
  max_memory_restart: "500M", // 記憶體限制
  instances: 1, // 實例數量
}
```

## 遷移指南

### 從開發環境到生產環境

1. **更新環境變數**
   ```bash
   # 設置 NODE_ENV
   export NODE_ENV=production
   ```

2. **構建前端**
   ```bash
   cd client && npm run build && cd ..
   ```

3. **使用 PM2 啟動**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

4. **設置開機自啟**
   ```bash
   pm2 startup
   # 執行輸出的命令
   ```

### 從生產環境回到開發環境

1. **停止 PM2 服務**
   ```bash
   pm2 stop all
   pm2 delete all
   ```

2. **使用開發模式**
   ```bash
   npm run dev
   ```

## 相關文件

- `bot/index.js` - Bot 主文件（包含任務監聽器）
- `server/index.js` - Server 主文件（生產環境不啟動 bot）
- `ecosystem.config.js` - PM2 配置
- `bot/handlers/historyFetcher.js` - 歷史提取邏輯
- `server/routes/fetch.js` - 提取 API 路由

## 總結

生產環境使用**基於資料庫的任務隊列**模式：

- ✅ **解耦**：Bot 和 Server 完全獨立
- ✅ **可靠**：任務持久化到資料庫
- ✅ **可擴展**：可以輕鬆添加多個 bot 實例
- ✅ **可監控**：所有任務狀態都在資料庫中
- ✅ **容錯**：任一服務崩潰不影響其他服務
