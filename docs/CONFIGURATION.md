# 配置指南

## 環境變數配置

### 根目錄 `.env`
```env
# Discord 應用配置
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token

# 伺服器配置
PORT=3008

# 白名單（多個伺服器用逗號分隔）
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432
```

### Bot `.env` (bot/.env)
```env
# Discord Bot Token
DISCORD_BOT_TOKEN=你的_bot_token

# 白名單
ALLOWED_GUILD_IDS=123456789012345678

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=你的密碼
```

### Client `.env.local` (client/.env.local)
```env
# Discord Client ID
NEXT_PUBLIC_DISCORD_CLIENT_ID=你的_client_id

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3008

# 開發模式配置（可選）
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_GUILD_ID=你的伺服器ID
NEXT_PUBLIC_DEV_USER_ID=你的用戶ID
```

## 白名單配置

### 為什麼需要白名單？

- 🔒 控制訪問 - 只允許授權的伺服器使用
- 💰 節省資源 - 減少不必要的數據收集
- 🛡️ 安全性 - 防止未授權的伺服器濫用 API

### 獲取伺服器 ID

1. 在 Discord 開啟「開發者模式」（設定 → 進階 → 開發者模式）
2. 右鍵點擊伺服器圖標
3. 選擇「複製伺服器 ID」

### 配置白名單

```env
# 單個伺服器
ALLOWED_GUILD_IDS=123456789012345678

# 多個伺服器（用逗號分隔）
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432

# 允許所有伺服器（留空，不推薦用於生產環境）
ALLOWED_GUILD_IDS=
```

### 檢查白名單狀態

```bash
# 查看健康狀態
curl http://localhost:3008/health

# 查看白名單配置
curl http://localhost:3008/api/admin/whitelist
```

## Discord Developer Portal 配置

### 1. General Information
- Application ID
- Application Name
- Description
- Icon

### 2. Bot
- Bot Token
- Privileged Gateway Intents:
  - ✅ Server Members Intent
  - ✅ Message Content Intent
  - ✅ Guilds Intent
  - ✅ Guild Messages Intent

### 3. OAuth2
- Client ID
- Client Secret
- Redirects:
  - 開發: `http://localhost:3000`
  - 生產: `https://your-domain.com`

### 4. Embedded App (Activities)
- Enable Activities: 已開啟
- URL Mappings:
  - Prefix: `/`
  - Target (開發): `http://localhost:3000`
  - Target (生產): `https://your-domain.com`

### 5. 安裝 Bot 到伺服器

1. OAuth2 → URL Generator
2. Scopes: 
   - ✅ `bot`
   - ✅ `applications.commands`
3. Bot Permissions:
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
   - ✅ Send Messages (可選，用於命令回覆)
4. 複製生成的 URL 並在瀏覽器打開
5. 選擇伺服器並授權

## 開發模式配置

開發模式允許你在本地瀏覽器直接訪問應用，無需通過 Discord。

### 啟用開發模式

在 `client/.env.local` 中設置：

```env
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_GUILD_ID=你的伺服器ID
NEXT_PUBLIC_DEV_USER_ID=你的用戶ID
```

### 獲取用戶 ID

1. 在 Discord 開啟「開發者模式」
2. 右鍵點擊你的用戶名
3. 選擇「複製用戶 ID」

### 使用開發模式

直接訪問 `http://localhost:3000` 即可，無需通過 Discord Embedded App。

## 生產環境配置

### 環境變數

```env
# 使用生產資料庫
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your-user
DB_PASSWORD=your-secure-password

# 使用生產 URL
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# 禁用開發模式
NEXT_PUBLIC_ENABLE_DEV_MODE=false

# 必須設置白名單
ALLOWED_GUILD_IDS=your-guild-ids
```

### Discord Portal 更新

1. 在「Activities」→「URL Mappings」中添加生產環境 URL
2. 在「OAuth2」→「Redirects」中添加生產環境 URL
3. 確保使用 HTTPS（Discord 要求）

### CORS 配置

確認 `server/index.js` 包含正確的 CORS 配置：

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://discord.com',
    'https://*.discord.com',
    'https://your-domain.com'
  ],
  credentials: true
}));
```

## 安全建議

1. ✅ 永遠不要將 `.env` 文件提交到 Git
2. ✅ 使用環境變數管理敏感資訊
3. ✅ 定期更換 Bot Token
4. ✅ 啟用白名單限制訪問
5. ✅ 使用 HTTPS（生產環境）
6. ✅ 定期備份資料庫
7. ✅ 監控 API 訪問日誌

## 常見問題

### Q: 如何臨時禁用白名單？
**A:** 將 `ALLOWED_GUILD_IDS` 設為空值並重啟服務。

### Q: 開發模式下無法獲取用戶信息？
**A:** 確保設置了 `NEXT_PUBLIC_DEV_USER_ID`。

### Q: CORS 錯誤？
**A:** 檢查 `NEXT_PUBLIC_API_URL` 是否正確，確認 server 的 CORS 配置包含前端 URL。

### Q: Bot 無法讀取訊息？
**A:** 確認已啟用 Message Content Intent。
