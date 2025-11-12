# Discord Embedded App 啟動清單 ✅

## 前置準備

- [ ] PostgreSQL 已安裝並運行
- [ ] Node.js 已安裝（v18+）
- [ ] Discord 開發者帳號

## Discord Developer Portal 設置

- [ ] 創建 Discord 應用
- [ ] 複製 Client ID
- [ ] 複製 Client Secret
- [ ] 創建 Bot 並複製 Token
- [ ] 啟用 Server Members Intent
- [ ] 啟用 Message Content Intent
- [ ] 啟用 Activities（Embedded App）
- [ ] 配置 Activity URL: `http://localhost:5173`
- [ ] 添加 OAuth2 Redirect: `http://localhost:5173`
- [ ] 使用 OAuth2 URL Generator 安裝 Bot 到伺服器
- [ ] 獲取伺服器 ID（右鍵伺服器 → 複製伺服器 ID）

## 環境變數配置

### 根目錄 `.env`
- [ ] `DISCORD_CLIENT_ID` - 從 Developer Portal 複製
- [ ] `DISCORD_CLIENT_SECRET` - 從 Developer Portal 複製
- [ ] `DISCORD_BOT_TOKEN` - 從 Bot 頁面複製
- [ ] `ALLOWED_GUILD_IDS` - 你的伺服器 ID
- [ ] `PORT=3001`
- [ ] `VITE_API_URL=http://localhost:3001`

### `bot/.env`
- [ ] `DISCORD_BOT_TOKEN` - 同上
- [ ] `ALLOWED_GUILD_IDS` - 同上
- [ ] `DB_HOST=localhost`
- [ ] `DB_PORT=5432`
- [ ] `DB_NAME=discord_stats`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD` - 你的密碼

### `client/.env`
- [ ] `VITE_DISCORD_CLIENT_ID` - 從 Developer Portal 複製
- [ ] `VITE_API_URL=http://localhost:3001`

## 數據庫設置

```bash
# 創建數據庫
createdb discord_stats

# 執行建表腳本
psql -U postgres -d discord_stats -f bot/database/create_tables.sql
```

- [ ] 數據庫創建成功
- [ ] 表結構創建成功
- [ ] 可以連接數據庫

## 安裝依賴

```bash
# 根目錄
npm install

# Bot
cd bot
npm install
cd ..

# Client
cd client
npm install
cd ..
```

- [ ] 根目錄依賴安裝完成
- [ ] Bot 依賴安裝完成
- [ ] Client 依賴安裝完成

## 啟動服務

### 方式 1: 一次啟動所有服務（推薦）

```bash
npm run dev
```

### 方式 2: 分別啟動

```bash
# 終端 1: Bot
npm run bot

# 終端 2: API 伺服器
npm run server

# 終端 3: 前端
npm run client
```

## 驗證清單

### Bot 驗證
- [ ] Bot 顯示「🤖 Bot 已登入」
- [ ] 顯示「✅ PostgreSQL 連接成功」
- [ ] 顯示白名單伺服器資訊
- [ ] 在 Discord 發送訊息後，數據庫有新記錄

```sql
-- 檢查數據
SELECT COUNT(*) FROM messages;
SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;
```

### API 伺服器驗證
- [ ] 伺服器顯示「🚀 伺服器運行在 http://localhost:3001」
- [ ] 訪問 `http://localhost:3001/health` 返回 `{"status":"ok"}`
- [ ] 訪問 `http://localhost:3001/api/admin/whitelist` 顯示白名單資訊

### 前端驗證
- [ ] Vite 顯示「Local: http://localhost:5173/」
- [ ] 瀏覽器訪問 `http://localhost:5173` 可以看到載入畫面
- [ ] 沒有 TypeScript 編譯錯誤

## Discord 內測試

### 啟動 Embedded App
1. [ ] 打開 Discord 桌面應用或網頁版
2. [ ] 進入安裝了 Bot 的伺服器
3. [ ] 點擊訊息輸入框旁的「+」按鈕
4. [ ] 選擇「Activities」
5. [ ] 找到並點擊「伺服器統計」應用
6. [ ] 應用在 Discord 內打開

### 功能驗證
- [ ] 伺服器概覽顯示正確數據
- [ ] 訊息趨勢圖表正常渲染
- [ ] 頻道使用情況顯示
- [ ] 成員活躍度排行顯示
- [ ] 表情使用統計顯示
- [ ] 關鍵詞雲顯示
- [ ] 沒有 CORS 錯誤
- [ ] 沒有 API 請求失敗

## 常見問題排查

### Bot 無法啟動
- [ ] 檢查 `DISCORD_BOT_TOKEN` 是否正確
- [ ] 檢查 PostgreSQL 是否運行：`pg_isready`
- [ ] 檢查數據庫連接資訊是否正確

### Embedded App 無法載入
- [ ] 檢查 `VITE_DISCORD_CLIENT_ID` 是否正確
- [ ] 確認在 Discord 內打開（不是瀏覽器直接訪問）
- [ ] 檢查瀏覽器控制台錯誤
- [ ] 確認 Activity URL 配置為 `http://localhost:5173`

### API 請求失敗
- [ ] 檢查 API 伺服器是否運行
- [ ] 檢查 CORS 配置
- [ ] 確認 `VITE_API_URL` 正確
- [ ] 檢查白名單配置

### 沒有數據顯示
- [ ] 確認 Bot 正在運行
- [ ] 在 Discord 發送一些測試訊息
- [ ] 檢查數據庫是否有數據
- [ ] 等待至少 1 分鐘讓數據累積

## 成功標誌 🎉

當你看到以下內容時，表示設置成功：

1. **Bot 日誌**：
```
🤖 Bot 已登入: YourBot#1234
📊 監控 1 個伺服器
🔒 白名單已啟用，收集以下伺服器的數據:
   ✅ 我的伺服器 (1234567890)
✅ Bot 已準備就緒，開始收集數據...
```

2. **API 日誌**：
```
🚀 伺服器運行在 http://localhost:3001
🔒 白名單已啟用，允許 1 個伺服器
```

3. **前端**：
```
VITE v5.0.8  ready in 500 ms
➜  Local:   http://localhost:5173/
```

4. **Discord 內**：
- 可以打開 Embedded App
- 看到統計儀表板
- 數據正常顯示

## 下一步

- [ ] 讓 Bot 運行 24 小時收集數據
- [ ] 查看統計趨勢
- [ ] 閱讀 `DISCORD_EMBEDDED_APP_SETUP.md` 了解部署到生產環境
- [ ] 自定義樣式和功能

---

**需要幫助？** 查看以下文檔：
- `QUICK_START.md` - 快速啟動指南
- `BOT_DEVELOPMENT_GUIDE.md` - Bot 開發指南
- `DISCORD_EMBEDDED_APP_SETUP.md` - Embedded App 完整設置
- `WHITELIST_GUIDE.md` - 白名單配置
