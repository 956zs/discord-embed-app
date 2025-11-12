# 🚨 快速修復指南

## 問題 1: 本地空白頁面

### 原因
`client/.env` 中的 `VITE_DISCORD_CLIENT_ID` 未設置

### 解決
已自動修復！`client/.env` 現在包含正確的 Client ID。

**重要：必須重啟 Vite！**

```bash
# 停止當前的 npm run client (Ctrl+C)
# 重新啟動
npm run client
```

## 問題 2: Discord 顯示 `.discordsays.com` 錯誤

### 原因
Discord Developer Portal 的 URL Mapping 配置不正確

### 解決步驟

#### 1. 前往 Discord Developer Portal
https://discord.com/developers/applications/1401130025411018772

#### 2. 配置 URL Mappings

1. 點擊左側「Activities」
2. 找到「URL Mappings」
3. 點擊「Add URL Mapping」或編輯現有的

**正確配置**：
```
Prefix: /
Target: http://localhost:5173
```

**截圖示例**：
```
┌─────────────────────────────────────┐
│ URL Mappings                        │
├─────────────┬───────────────────────┤
│ Prefix      │ Target                │
├─────────────┼───────────────────────┤
│ /           │ http://localhost:5173 │
└─────────────┴───────────────────────┘
```

#### 3. 保存
點擊「Save Changes」

#### 4. 等待生效
等待 1-2 分鐘

## 完整啟動流程

### 1. 確認環境變數

```bash
# 檢查 client/.env
cat client/.env
```

應該顯示：
```env
VITE_DISCORD_CLIENT_ID=1401130025411018772
VITE_API_URL=http://localhost:3001
```

### 2. 啟動所有服務

```bash
# 一次啟動所有（推薦）
npm run dev
```

或分別啟動：
```bash
# 終端 1: Bot
npm run bot

# 終端 2: API
npm run server

# 終端 3: 前端
npm run client
```

### 3. 驗證服務

#### Bot
應該顯示：
```
🤖 Bot 已登入: YourBot#1234
✅ PostgreSQL 連接成功
✅ Bot 已準備就緒，開始收集數據...
```

#### API
測試：
```bash
curl http://localhost:3001/health
```
應該返回：
```json
{"status":"ok"}
```

#### 前端
訪問：http://localhost:5173

應該看到載入畫面（不是空白）

### 4. 在 Discord 中測試

#### 方式 1: Activities 按鈕（主要方式）
1. 打開 Discord
2. 進入你的伺服器
3. 在任意文字頻道，點擊訊息輸入框旁的「+」按鈕
4. 選擇「Activities」
5. 點擊「伺服器統計」

#### 方式 2: 語音頻道
1. 加入語音頻道
2. 點擊「Activities」按鈕
3. 選擇「伺服器統計」

## 如果仍然空白

### 檢查瀏覽器控制台

1. 在瀏覽器訪問 http://localhost:5173
2. 按 F12 打開開發者工具
3. 查看 Console 標籤

#### 常見錯誤

**錯誤 1**: `VITE_DISCORD_CLIENT_ID is not defined`
```
解決：重啟 Vite（Ctrl+C 然後 npm run client）
```

**錯誤 2**: `Failed to fetch http://localhost:3001/api/...`
```
解決：啟動 API 伺服器（npm run server）
```

**錯誤 3**: `Discord SDK initialization failed`
```
這是正常的！在瀏覽器直接訪問時 Discord SDK 會失敗。
必須在 Discord 內通過 Activities 啟動。
```

### 臨時測試模式

如果想在瀏覽器測試（不通過 Discord），修改 `client/src/App.tsx`：

```typescript
useEffect(() => {
  const setupDiscordSdk = async () => {
    try {
      await discordSdk.ready();
      // ... 原有代碼
    } catch (error) {
      console.error("Discord SDK 初始化失敗:", error);
      // 使用測試數據
      setGuildId('1320005222688624713'); // 你的伺服器 ID
      setLoading(false);
    }
  };

  setupDiscordSdk();
}, []);
```

## Discord Developer Portal 完整配置

### 必需配置

#### 1. General Information
- ✅ Application ID: `1401130025411018772`
- ✅ 已複製 Client ID 和 Client Secret

#### 2. Bot
- ✅ Bot Token 已複製
- ✅ Privileged Gateway Intents:
  - ✅ Server Members Intent
  - ✅ Message Content Intent

#### 3. OAuth2
- ✅ Redirects:
  - `http://localhost:5173`

#### 4. Activities
- ✅ Enable Activities: 已開啟
- ✅ URL Mappings:
  - Prefix: `/`
  - Target: `http://localhost:5173`

### 安裝 Bot 到伺服器

如果 Bot 還沒加入伺服器：

1. OAuth2 → URL Generator
2. Scopes: 
   - ✅ `bot`
   - ✅ `applications.commands`
3. Bot Permissions:
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
4. 複製生成的 URL
5. 在瀏覽器打開並選擇伺服器

## 檢查清單

- [ ] `client/.env` 包含正確的 `VITE_DISCORD_CLIENT_ID`
- [ ] Vite 已重啟（修改 .env 後必須重啟）
- [ ] Bot 正在運行
- [ ] API 伺服器正在運行
- [ ] 前端正在運行（http://localhost:5173）
- [ ] Discord Developer Portal URL Mapping 設為 `http://localhost:5173`
- [ ] Bot 已加入伺服器
- [ ] 在 Discord 內通過 Activities 啟動（不是瀏覽器直接訪問）

## 仍然有問題？

查看完整的故障排除指南：`TROUBLESHOOTING.md`

或執行診斷：
```bash
# 檢查所有服務
echo "Bot:" && ps aux | grep "node.*bot/index.js" | grep -v grep
echo "API:" && ps aux | grep "node.*server/index.js" | grep -v grep
echo "Vite:" && ps aux | grep "vite" | grep -v grep

# 檢查端口
netstat -tuln | grep -E "3001|5173|5432"

# 測試 API
curl http://localhost:3001/health

# 檢查環境變數
grep VITE_DISCORD_CLIENT_ID client/.env
```
