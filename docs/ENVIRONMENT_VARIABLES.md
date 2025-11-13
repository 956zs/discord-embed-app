# 環境變數指南

本文檔描述 Discord 統計應用中使用的所有環境變數。

## 快速設置

配置環境變數最簡單的方法是執行：

```bash
./setup-env.sh
```

這個互動式腳本會引導你完成所有配置步驟。

## 手動設置

如果你偏好手動配置，複製範例文件並編輯它們：

```bash
cp .env.example .env
cp bot/.env.example bot/.env
cp client/.env.example client/.env.local
```

## 環境文件

### 根目錄 `.env`

整個應用程式的主要配置文件。

| 變數 | 必需 | 預設值 | 說明 |
|----------|----------|---------|-------------|
| `DISCORD_CLIENT_ID` | 是 | - | Discord Developer Portal 的 Application Client ID |
| `DISCORD_CLIENT_SECRET` | 是 | - | Discord OAuth2 Client Secret |
| `DISCORD_BOT_TOKEN` | 是 | - | Discord Bot Token |
| `PORT` | 否 | 3008 | API 伺服器端口 |
| `CLIENT_PORT` | 否 | 3000 | Next.js 前端端口（開發模式）|
| `ALLOWED_GUILD_IDS` | 否 | - | 允許的 Discord 伺服器 ID（逗號分隔）|
| `NODE_ENV` | 否 | development | 環境模式：`development` 或 `production` |

### Bot `bot/.env`

Discord bot 資料收集器的配置。

| 變數 | 必需 | 預設值 | 說明 |
|----------|----------|---------|-------------|
| `DB_HOST` | 是 | localhost | PostgreSQL 主機 |
| `DB_PORT` | 否 | 5432 | PostgreSQL 端口 |
| `DB_NAME` | 是 | discord_stats | 資料庫名稱 |
| `DB_USER` | 是 | postgres | 資料庫用戶 |
| `DB_PASSWORD` | 是 | - | 資料庫密碼 |
| `DISCORD_BOT_TOKEN` | 是 | - | Discord Bot Token（與根目錄相同）|
| `ALLOWED_GUILD_IDS` | 否 | - | 允許的伺服器 ID（逗號分隔，與根目錄相同）|
| `NODE_ENV` | 否 | development | 環境模式 |

### Client `client/.env.local`

Next.js 前端的配置。

| 變數 | 必需 | 預設值 | 說明 |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | 是 | - | Discord Application Client ID |
| `NEXT_PUBLIC_API_URL` | 是 | http://localhost:3008 | API 伺服器 URL |
| `NEXT_PUBLIC_ENABLE_DEV_MODE` | 否 | false | 啟用開發模式進行本地測試 |
| `NEXT_PUBLIC_DEV_GUILD_ID` | 否 | - | 測試伺服器 ID（僅開發模式）|
| `NEXT_PUBLIC_DEV_USER_ID` | 否 | - | 測試用戶 ID（僅開發模式）|
| `NODE_ENV` | 否 | development | 環境模式 |

## 按環境配置

### 開發環境

用於本地開發和測試：

**Root `.env`:**
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
PORT=3008
CLIENT_PORT=3000
ALLOWED_GUILD_IDS=your_test_server_id
NODE_ENV=development
```

**Bot `bot/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=your_test_server_id
NODE_ENV=development
```

**Client `client/.env.local`:**
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_API_URL=http://localhost:3008
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_GUILD_ID=your_test_server_id
NEXT_PUBLIC_DEV_USER_ID=your_user_id
NODE_ENV=development
```

### 生產環境

用於伺服器部署：

**Root `.env`:**
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
PORT=3008
CLIENT_PORT=3000
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=production
```

**Bot `bot/.env`:**
```env
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_secure_password
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=production
```

**Client `client/.env.local`:**
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_ENABLE_DEV_MODE=false
NODE_ENV=production
```

## 獲取 Discord 憑證

### 1. Discord Application Client ID

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 選擇你的應用程式
3. 前往 **General Information**
4. 複製 **Application ID**

### 2. Discord Client Secret

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 選擇你的應用程式
3. 前往 **OAuth2** → **General**
4. 點擊 **Reset Secret**（或複製現有密鑰）
5. 複製 **Client Secret**

### 3. Discord Bot Token

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 選擇你的應用程式
3. 前往 **Bot**
4. 點擊 **Reset Token**（或複製現有 token）
5. 複製 **Bot Token**

### 4. Discord 伺服器 ID (Guild ID)

1. 在 Discord 中啟用開發者模式：
   - 用戶設置 → 進階 → 開發者模式
2. 右鍵點擊你的伺服器圖標
3. 點擊 **複製 ID**

### 5. Discord 用戶 ID

1. 在 Discord 中啟用開發者模式（如果尚未啟用）
2. 右鍵點擊你的用戶名
3. 點擊 **複製 ID**

## 安全最佳實踐

### 1. 永遠不要提交 `.env` 文件

`.gitignore` 文件已經排除了 `.env` 文件，但請務必再次確認：

```bash
# 檢查 .env 是否被忽略
git check-ignore .env bot/.env client/.env.local
```

### 2. 使用強密碼

對於生產資料庫，使用強隨機生成的密碼：

```bash
# 生成安全密碼
openssl rand -base64 32
```

### 3. 限制伺服器訪問

在生產環境中，務必設置 `ALLOWED_GUILD_IDS` 來限制哪些 Discord 伺服器可以使用你的應用：

```env
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432
```

### 4. 使用環境特定的密鑰

永遠不要在開發和生產環境中使用相同的 token/密鑰。

### 5. 定期輪換密鑰

定期輪換你的 Discord token 和資料庫密碼，特別是在以下情況：
- 團隊成員離職
- 懷疑安全漏洞
- 作為定期安全維護的一部分

## 故障排除

### 問題："無法連接資料庫"

**檢查：**
- `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` 是否正確
- PostgreSQL 是否正在運行
- 資料庫是否存在：`createdb discord_stats`
- 用戶是否有訪問權限

### 問題："Discord 認證失敗"

**檢查：**
- `DISCORD_BOT_TOKEN` 是否正確且未過期
- `DISCORD_CLIENT_ID` 和 `DISCORD_CLIENT_SECRET` 是否匹配
- Bot 在 Developer Portal 中是否啟用了適當的 intents

### 問題："伺服器未在白名單中"

**檢查：**
- `ALLOWED_GUILD_IDS` 是否包含你的伺服器 ID
- 逗號分隔列表中沒有多餘的空格
- 伺服器 ID 是否正確（右鍵伺服器 → 複製 ID）

### 問題："API URL 無效"

**檢查：**
- `NEXT_PUBLIC_API_URL` 是否與你的 API 伺服器 URL 匹配
- 端口是否與根目錄 `.env` 中的 `PORT` 匹配
- URL 末尾沒有斜線

### 問題："開發模式無效"

**檢查：**
- `client/.env.local` 中 `NEXT_PUBLIC_ENABLE_DEV_MODE=true`
- `NEXT_PUBLIC_DEV_GUILD_ID` 和 `NEXT_PUBLIC_DEV_USER_ID` 是否已設置
- 你是通過 localhost 訪問，而不是 Discord Embedded App

## 環境變數載入

### 載入順序

1. **根目錄 `.env`**：由 server 和 ecosystem.config.js 載入
2. **Bot `bot/.env`**：由 bot 進程載入
3. **Client `client/.env.local`**：由 Next.js 載入（開發和構建）
4. **Client `client/.env.production`**：由 Next.js 載入（僅生產構建）

### Next.js 環境變數

Next.js 對環境變數有特殊規則：

- **`NEXT_PUBLIC_*`**：暴露給瀏覽器（客戶端）
- **其他變數**：僅伺服器端

**重要：** 只對應該在瀏覽器中訪問的變數使用 `NEXT_PUBLIC_` 前綴。永遠不要用於密鑰！

### PM2 環境變數

使用 PM2（生產環境）時，環境變數從以下位置載入：

1. 根目錄 `.env`（通過 `ecosystem.config.js` 中的 `dotenv`）
2. `ecosystem.config.js` 中進程特定的 `env` 對象

## 驗證

驗證你的環境配置：

```bash
# 檢查所有必需文件是否存在
ls -la .env bot/.env client/.env.local

# 測試資料庫連接
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1"

# 測試 API 伺服器
curl http://localhost:3008/health

# 測試前端
curl http://localhost:3000
```

## 從舊配置遷移

如果你正在從具有硬編碼值的舊版本升級：

1. 執行 `./setup-env.sh` 生成新的 `.env` 文件
2. 更新 `client/next.config.ts`（已使用環境變數）
3. 更新 `ecosystem.config.js`（已使用環境變數）
4. 重啟所有服務：`pm2 restart all`

## 其他資源

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Next.js 環境變數](https://nextjs.org/docs/basic-features/environment-variables)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)
- [PM2 文檔](https://pm2.keymetrics.io/docs/usage/environment/)
