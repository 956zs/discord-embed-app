# 故障排除指南

完整的問題診斷和解決方案。

## 快速診斷

### 檢查所有服務狀態
```bash
# PostgreSQL
pg_isready

# 數據庫數據
psql -U postgres -d discord_stats -c "SELECT COUNT(*) FROM messages;"

# API
curl -s http://localhost:3001/health

# 前端
curl -s http://localhost:5173 | head -5

# 環境變數
grep DISCORD_CLIENT_ID .env client/.env bot/.env 2>/dev/null
```

## 問題 1: 本地 http://localhost:5173 空白

### 可能原因

1. **前端未啟動**
2. **TypeScript 編譯錯誤**
3. **環境變數未配置**
4. **Discord SDK 初始化失敗**

### 解決步驟

#### 1. 檢查前端是否運行

```bash
# 啟動前端
npm run client

# 或
cd client
npm run dev
```

你應該看到：
```
VITE v5.0.8  ready in 500 ms
➜  Local:   http://localhost:5173/
```

#### 2. 檢查瀏覽器控制台

1. 打開 http://localhost:5173
2. 按 F12 打開開發者工具
3. 查看 Console 標籤是否有錯誤

常見錯誤：
- `VITE_DISCORD_CLIENT_ID is not defined` → 環境變數未配置
- `Failed to fetch` → API 伺服器未運行
- `Discord SDK error` → Discord SDK 配置問題

#### 3. 配置環境變數

確保 `client/.env` 存在並包含：

```env
VITE_DISCORD_CLIENT_ID=1401130025411018772
VITE_API_URL=http://localhost:3001
```

**重要**：修改 `.env` 後必須重啟 Vite！

```bash
# 停止 Vite (Ctrl+C)
# 重新啟動
npm run client
```

#### 4. 測試非 Discord 環境

在瀏覽器直接訪問 http://localhost:5173 時，Discord SDK 會失敗（這是正常的）。

臨時修改 `client/src/App.tsx` 以測試：

```typescript
useEffect(() => {
  const setupDiscordSdk = async () => {
    try {
      // 檢查是否在 Discord 環境中
      if (!import.meta.env.VITE_DISCORD_CLIENT_ID) {
        console.error('❌ VITE_DISCORD_CLIENT_ID 未設置');
        setLoading(false);
        return;
      }

      await discordSdk.ready();
      // ... 其他代碼
    } catch (error) {
      console.error("Discord SDK 初始化失敗:", error);
      // 在非 Discord 環境中使用測試數據
      setGuildId('1320005222688624713'); // 你的測試伺服器 ID
      setLoading(false);
    }
  };

  setupDiscordSdk();
}, []);
```

## 問題 2: Discord 顯示 `.discordsays.com` 錯誤

### 原因

Discord Developer Portal 的 URL 映射配置不正確。

### 解決步驟

#### 1. 前往 Discord Developer Portal

1. 訪問 https://discord.com/developers/applications
2. 選擇你的應用（Application ID: 1401130025411018772）

#### 2. 配置 URL Mappings

1. 在左側選單選擇「Activities」
2. 找到「URL Mappings」部分
3. 點擊「Add URL Mapping」

**配置如下**：

| Prefix | Target |
|--------|--------|
| `/` | `http://localhost:5173` |

**重要**：
- ✅ 使用 `http://localhost:5173`（開發環境）
- ❌ 不要使用 `.discordsays.com`
- ✅ Prefix 設為 `/`

#### 3. 保存並測試

1. 點擊「Save Changes」
2. 等待 1-2 分鐘讓配置生效
3. 在 Discord 中重新啟動 Activity

#### 4. 檢查 OAuth2 Redirects

1. 在左側選單選擇「OAuth2」
2. 在「Redirects」部分添加：
   ```
   http://localhost:5173
   ```
3. 點擊「Save Changes」

## 問題 3: 前端顯示但無數據

### 檢查清單

#### 1. API 伺服器是否運行？

```bash
# 測試 API
curl http://localhost:3001/health

# 應該返回
{"status":"ok"}
```

如果失敗，啟動 API：
```bash
npm run server
```

#### 2. Bot 是否運行並收集數據？

```bash
npm run bot
```

檢查數據庫：
```bash
psql -U postgres -d discord_stats -c "SELECT COUNT(*) FROM messages;"
```

#### 3. 白名單配置是否正確？

檢查 `.env` 和 `bot/.env` 中的 `ALLOWED_GUILD_IDS`：
```env
ALLOWED_GUILD_IDS=1320005222688624713
```

#### 4. CORS 配置

確認 `server/index.js` 包含：
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://discord.com',
    'https://*.discord.com'
  ],
  credentials: true
}));
```

## 問題 4: Discord 中無法啟動 Activity

### 檢查清單

#### 1. Bot 是否已加入伺服器？

在 Discord Developer Portal：
1. OAuth2 → URL Generator
2. 選擇 Scopes: `bot`, `applications.commands`
3. 選擇 Bot Permissions: `Read Messages/View Channels`
4. 複製 URL 並在瀏覽器打開
5. 選擇伺服器並授權

#### 2. Activities 是否已啟用？

在 Discord Developer Portal：
1. 選擇「Activities」
2. 確認「Enable Activities」已開啟
3. 確認 URL Mappings 已配置

#### 3. 在正確的位置啟動

Activities 只能在以下位置啟動：
- ✅ 語音頻道
- ✅ 文字頻道（點擊「+」按鈕）
- ❌ 私訊（不支援）

## 完整啟動檢查清單

### 1. 環境變數

```bash
# 根目錄 .env
cat .env | grep -E "DISCORD|ALLOWED"

# bot/.env
cat bot/.env | grep -E "DISCORD|DB_|ALLOWED"

# client/.env
cat client/.env | grep VITE
```

### 2. 啟動所有服務

```bash
# 方式 1: 一次啟動所有
npm run dev

# 方式 2: 分別啟動（推薦用於調試）
# 終端 1
npm run bot

# 終端 2
npm run server

# 終端 3
npm run client
```

### 3. 驗證服務

```bash
# Bot 日誌應顯示
🤖 Bot 已登入: YourBot#1234
✅ PostgreSQL 連接成功

# API 測試
curl http://localhost:3001/health

# 前端測試
curl http://localhost:5173
```

### 4. Discord Developer Portal 配置

- [ ] Activities 已啟用
- [ ] URL Mapping: `/` → `http://localhost:5173`
- [ ] OAuth2 Redirect: `http://localhost:5173`
- [ ] Bot 已加入伺服器
- [ ] Bot Intents 已啟用（Server Members, Message Content）

## 重置並重新開始

如果以上步驟都無法解決問題：

```bash
# 1. 停止所有服務
pkill -f "node.*bot"
pkill -f "node.*server"
pkill -f "vite"

# 2. 清理
rm -rf client/node_modules/.vite
rm -rf client/dist

# 3. 重新安裝依賴
cd client && npm install && cd ..

# 4. 重新啟動
npm run dev
```

## 需要幫助？

### 收集診斷資訊

提供以下資訊以獲得幫助：

1. 瀏覽器控制台完整錯誤訊息
2. Bot 日誌
3. API 日誌
4. Discord Developer Portal 配置截圖
5. 服務狀態：`ps aux | grep -E "node|postgres"`
6. 端口使用：`netstat -tuln | grep -E "3001|5173|5432"`

## 常見錯誤訊息

### `VITE_DISCORD_CLIENT_ID is not defined`
**解決**：在 `client/.env` 中設置 `VITE_DISCORD_CLIENT_ID`

### `Failed to fetch`
**解決**：確認 API 伺服器運行在 http://localhost:3001

### `Discord SDK initialization failed`
**解決**：只在 Discord 內運行，或修改代碼支援瀏覽器測試

### `CORS error`
**解決**：檢查 `server/index.js` 的 CORS 配置

### `Database connection failed`
**解決**：檢查 PostgreSQL 是否運行，配置是否正確

## 相關文檔

- `SETUP.md` - 完整設置指南
- `CONFIGURATION.md` - 配置說明
- `DEVELOPMENT.md` - 開發指南
