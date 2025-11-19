# 配置指南

本指南涵蓋白名單設置、Discord Portal 配置和 Application Commands 註冊。

## 白名單配置

白名單功能限制只有特定的 Discord 伺服器可以使用統計功能。

### 為什麼需要白名單？

- 🔒 **控制訪問** - 只允許授權的伺服器使用
- 💰 **節省資源** - 減少不必要的數據收集和處理
- 🛡️ **安全性** - 防止未授權的伺服器濫用 API
- 📊 **專注數據** - 只收集你關心的伺服器數據

### 快速設定

#### 1. 獲取伺服器 ID
1. 在 Discord 開啟「開發者模式」（設定 → 進階 → 開發者模式）
2. 右鍵點擊伺服器圖標
3. 選擇「複製伺服器 ID」

#### 2. 配置環境變數

編輯 `.env` 和 `bot/.env` 文件：

```env
# 單個伺服器
ALLOWED_GUILD_IDS=123456789012345678

# 多個伺服器（用逗號分隔）
ALLOWED_GUILD_IDS=123456789012345678,987654321098765432,555666777888999000

# 允許所有伺服器（留空，不推薦用於生產環境）
ALLOWED_GUILD_IDS=
```

#### 3. 重啟服務
```bash
# 停止當前服務（Ctrl+C）
# 重新啟動
npm run dev
```

### 白名單行為

#### 啟用白名單時
- ✅ 白名單中的伺服器可以正常訪問所有統計功能
- ❌ 其他伺服器會收到 403 錯誤：「此伺服器未被授權使用統計功能」

#### 未設定白名單時
- ⚠️ 允許所有伺服器訪問（開發模式）
- 控制台會顯示警告訊息

### 檢查白名單狀態

#### 查看啟動日誌
```
🚀 伺服器運行在 http://localhost:3001
🔒 白名單已啟用，允許 2 個伺服器
   伺服器 ID: 123456789012345678, 987654321098765432
```

#### API 端點
```bash
curl http://localhost:3001/api/admin/whitelist
```

回應：
```json
{
  "enabled": true,
  "count": 2,
  "guilds": ["123456789012345678", "987654321098765432"]
}
```

### 測試白名單

#### 測試允許的伺服器
```bash
curl http://localhost:3001/api/stats/server/123456789012345678
# 應該返回伺服器統計數據
```

#### 測試被拒絕的伺服器
```bash
curl http://localhost:3001/api/stats/server/999999999999999999
# 應該返回 403 錯誤
```

### 生產環境建議

1. **必須設定白名單** - 不要在生產環境留空
2. **定期審查** - 定期檢查白名單中的伺服器
3. **監控訪問** - 查看日誌中的訪問記錄
4. **備份配置** - 定期備份 `.env` 文件（不要提交到 Git）

## Discord Portal 配置

### 必需配置

#### 1. General Information
- Application ID
- Application Name
- Description
- Icon

#### 2. Bot
- Bot Token
- Privileged Gateway Intents:
  - ✅ Server Members Intent
  - ✅ Message Content Intent

#### 3. OAuth2
- Client ID
- Client Secret
- Redirects:
  - 開發: `http://localhost:5173`
  - 生產: `https://your-domain.com`

#### 4. Activities
- Enable Activities: 已開啟
- URL Mappings:
  - Prefix: `/`
  - Target (開發): `http://localhost:5173`
  - Target (生產): `https://your-domain.com`

### 安裝 Bot 到伺服器

1. OAuth2 → URL Generator
2. Scopes: 
   - ✅ `bot`
   - ✅ `applications.commands`
3. Bot Permissions:
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
4. 複製生成的 URL 並在瀏覽器打開
5. 選擇伺服器並授權

## Application Commands 註冊

Discord Embedded App 可以通過以下方式啟動：
1. **Activities 按鈕**（主要方式）
2. **斜線命令**（可選快捷方式）

### 註冊命令

#### 1. 配置環境變數

確保 `bot/.env` 包含：
```env
DISCORD_BOT_TOKEN=你的_bot_token
DISCORD_CLIENT_ID=你的_client_id
EMBEDDED_APP_URL=http://localhost:5173
```

#### 2. 執行註冊腳本
```bash
cd bot
npm run register
```

你應該看到：
```
🔄 開始註冊 Application Commands...
✅ Application Commands 註冊成功！
   已註冊 1 個命令
```

#### 3. 測試命令

1. 打開 Discord
2. 進入你的伺服器
3. 在聊天框輸入 `/`
4. 你應該看到 `/伺服器統計` 命令
5. 點擊命令或按 Enter

### 命令說明

#### `/伺服器統計`

**功能**：顯示伺服器統計儀表板的入口

**回覆內容**：
- 📈 訊息趨勢
- 👥 成員活躍度
- 💬 頻道統計
- 😀 表情統計
- ☁️ 關鍵詞雲
- 🏠 伺服器概覽

**按鈕**：「📊 開啟統計儀表板」（連結到 Embedded App）

### 更新命令

如果修改了命令，重新執行：
```bash
cd bot
npm run register
```

命令會自動更新，通常在 1 小時內生效（全域命令）。

### 刪除命令

創建 `bot/commands/deleteCommands.js`：
```javascript
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: [] })
  .then(() => console.log('✅ 所有命令已刪除'))
  .catch(console.error);
```

執行：
```bash
node bot/commands/deleteCommands.js
```

### 伺服器專屬命令（可選）

如果只想在特定伺服器註冊命令（更快生效），修改 `registerCommands.js`：

```javascript
// 替換
await rest.put(
  Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
  { body: commands }
);

// 改為
await rest.put(
  Routes.applicationGuildCommands(
    process.env.DISCORD_CLIENT_ID,
    'YOUR_GUILD_ID'
  ),
  { body: commands }
);
```

伺服器專屬命令會立即生效，但只在該伺服器可用。

## 環境變數完整參考

### 根目錄 `.env`
```env
# Discord 應用配置
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token

# 伺服器配置
PORT=3008                    # API Server 端口
CLIENT_PORT=3000             # Next.js 開發伺服器端口

# 白名單
ALLOWED_GUILD_IDS=你的伺服器ID
```

### `bot/.env`
```env
# Discord Bot Token
DISCORD_BOT_TOKEN=你的_bot_token

# Discord Client ID（用於註冊命令）
DISCORD_CLIENT_ID=你的_client_id

# Embedded App URL
EMBEDDED_APP_URL=http://localhost:5173

# 白名單
ALLOWED_GUILD_IDS=你的伺服器ID

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=你的密碼
```

### `client/.env`
```env
# Discord Client ID
VITE_DISCORD_CLIENT_ID=你的_client_id

# API URL
VITE_API_URL=http://localhost:3001
```

## CORS 配置

確認 `server/index.js` 包含正確的 CORS 配置：

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://discord.com',
    'https://*.discord.com',
    'https://your-domain.com'  // 生產環境
  ],
  credentials: true
}));
```

## 安全建議

1. ✅ **永遠不要**將 `.env` 文件提交到 Git
2. ✅ 使用環境變數管理敏感資訊
3. ✅ 定期更換 Bot Token
4. ✅ 啟用白名單限制訪問
5. ✅ 使用 HTTPS（生產環境）
6. ✅ 實施 Rate Limiting
7. ✅ 定期備份數據庫

## 常見問題

### Q: 命令未出現
**A:** 
1. 等待時間 - 全域命令需要最多 1 小時才會生效
2. 重新載入 Discord - 完全關閉並重新打開
3. 檢查權限 - 確認 Bot 有 `applications.commands` 權限

### Q: 白名單檢查會影響性能嗎？
**A:** 不會。白名單檢查非常快速，對性能影響可忽略不計。

### Q: 如何臨時禁用白名單？
**A:** 將 `ALLOWED_GUILD_IDS` 設為空值並重啟服務。

### Q: 可以動態添加伺服器嗎？
**A:** 目前需要編輯 `.env` 文件並重啟服務。未來可以實現動態管理功能。

## PM2 安全操作

本專案的所有管理腳本都遵循嚴格的 PM2 安全操作規範，確保不會影響系統中的其他 PM2 進程。

### 進程命名規範

Discord 應用使用專屬的進程名稱：

**雙進程模式**：
- `discord-server` - API 服務器 + Bot
- `discord-client` - Next.js 前端

**單進程模式**：
- `discord-app` - API + Bot + Next.js 整合

### 安全原則

所有管理腳本（`deploy.sh`、`update.sh`、`manage.sh`）都遵循以下原則：

1. **明確性** - 所有 PM2 命令必須明確指定進程名稱
2. **隔離性** - 絕不使用影響所有進程的全域命令
3. **容錯性** - 優雅處理進程不存在的情況
4. **可追蹤性** - 記錄所有 PM2 操作

### 禁止的命令

以下命令**永遠不會**在管理腳本中使用：

```bash
# ❌ 危險命令（會影響所有進程）
pm2 delete all
pm2 restart all
pm2 stop all
pm2 reload all
```

### 安全的命令

管理腳本只使用明確指定進程名稱的命令：

```bash
# ✅ 安全命令（只影響 Discord 應用）
pm2 stop discord-server
pm2 delete discord-client
pm2 restart discord-app
pm2 logs discord-server
```

### 多應用環境

如果你的伺服器運行多個 PM2 應用，本專案的管理腳本保證不會干擾其他應用：

```bash
# 查看所有進程
pm2 list

# 執行 Discord 應用管理命令
./manage.sh stop          # 只停止 discord-server 和 discord-client
./manage.sh restart       # 只重啟 Discord 應用進程
./deploy.sh               # 只清理和部署 Discord 應用

# 其他應用完全不受影響
```

### 安全操作函數

所有腳本使用統一的安全操作函數（`scripts/pm2-utils.sh`）：

```bash
# 安全停止
safe_pm2_stop "discord-server discord-client"

# 安全刪除
safe_pm2_delete "discord-server discord-client"

# 安全重啟
safe_pm2_restart "discord-server discord-client"

# 清理所有 Discord 進程（模式切換時使用）
cleanup_discord_processes
```

### 錯誤處理

當操作不存在的進程時，腳本會優雅處理：

```bash
# 進程不存在時
pm2 delete discord-server 2>/dev/null || log_info "discord-server 不存在"

# 繼續執行，不會中斷腳本
```

### 操作日誌

所有 PM2 操作都會記錄詳細日誌：

```
🔄 停止 Discord 應用進程: discord-server discord-client
✅ 已停止: discord-server
✅ 已停止: discord-client
```

### 驗證安全性

你可以通過以下方式驗證管理腳本的安全性：

```bash
# 1. 創建測試進程
pm2 start "sleep 3600" --name test-app

# 2. 執行 Discord 應用管理命令
./manage.sh restart

# 3. 驗證測試進程未受影響
pm2 list
# test-app 應該仍在運行

# 4. 清理測試進程
pm2 delete test-app
```

### 最佳實踐

1. **定期檢查** - 使用 `pm2 list` 查看所有進程狀態
2. **備份配置** - 在執行管理命令前備份重要數據
3. **查看日誌** - 使用 `./manage.sh logs` 查看操作日誌
4. **測試環境** - 在測試環境先驗證管理命令
5. **文檔參考** - 查看 [PM2 安全操作文檔](docs/PM2_SAFETY.md) 了解更多細節

## 下一步

- 閱讀 `DEVELOPMENT.md` 了解開發指南
- 閱讀 `TROUBLESHOOTING.md` 了解故障排除
- 閱讀 `docs/PM2_SAFETY.md` 了解 PM2 安全操作詳情
- 查看 API 文檔了解所有端點
