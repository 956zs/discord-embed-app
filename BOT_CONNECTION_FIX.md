# Bot 連接問題修復說明

## 問題原因

當 server 使用 `require('../bot/index.js')` 時，會**重新執行 bot 的啟動代碼**，創建一個新的 bot 實例。這導致：

1. 有兩個獨立的 bot 進程在運行
2. Server 連接的是它自己創建的實例，而不是用 `npm run bot` 啟動的實例
3. 兩個實例無法共享狀態

## 解決方案

**讓 server 在同一個進程中啟動 bot**，而不是分開運行。

### 新的啟動方式

```bash
# 開發模式（推薦）- server 會自動啟動 bot
npm run dev

# 這會運行：
# - server (包含 bot)
# - client
```

### 如果需要分開運行（不推薦）

```bash
# 使用這個命令
npm run dev:separate

# 這會分別運行：
# - server (不包含 bot)
# - client  
# - bot (獨立進程)
```

## 優點

✅ **單一進程**：server 和 bot 在同一個 Node.js 進程中
✅ **自動連接**：不需要等待或重試連接
✅ **共享狀態**：可以直接訪問 bot 的實例和數據
✅ **簡化部署**：只需要啟動一個服務

## 生產環境

```bash
# 構建前端
cd client && npm run build

# 啟動 server（會自動啟動 bot）
npm start
```

## 驗證連接

訪問健康檢查端點：

```bash
curl http://localhost:3008/health
```

應該返回：

```json
{
  "status": "ok",
  "server": "running",
  "bot": "connected",
  "timestamp": "2025-11-12T11:10:00.000Z"
}
```

## 注意事項

- 現在 `npm run dev` 只會啟動 server 和 client
- Bot 會由 server 自動啟動
- 如果你看到兩個 bot 登入訊息，說明有重複的進程在運行
- 使用 `ps aux | grep node` 檢查是否有多個 bot 進程

## 故障排除

### 如果 bot 狀態顯示 "disconnected"

1. 檢查 `.env` 中的 `DISCORD_BOT_TOKEN` 是否正確
2. 檢查 bot 是否有權限訪問你的 Discord 伺服器
3. 查看 server 的 console 輸出，確認 bot 是否成功登入

### 如果有多個 bot 實例

```bash
# 停止所有 node 進程
pkill -f "node.*bot"
pkill -f "node.*server"

# 重新啟動
npm run dev
```
