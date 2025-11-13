# OAuth2 認證問題排查指南

## 問題描述

在某些 Discord 伺服器中，OAuth2 認證可能會失敗，導致無法獲取用戶信息。錯誤日誌顯示：

```
❌ OAuth2 認證失敗
⚠️ 無法獲取用戶 ID
```

## 可能的原因

### 1. Discord Developer Portal 配置問題

**檢查項目：**

1. **OAuth2 Redirect URLs**
   - 進入 Discord Developer Portal → 你的應用 → OAuth2
   - 確認已添加正確的 Redirect URL
   - 對於 Embedded Apps，通常不需要 redirect_uri，但某些情況下需要添加：
     ```
     https://discord.com/oauth2/authorized
     ```

2. **OAuth2 Scopes**
   - 確認應用已啟用以下 scopes：
     - `identify` - 獲取用戶基本信息
     - `guilds` - 獲取用戶所在的伺服器列表
     - `guilds.members.read` - 讀取伺服器成員信息

3. **Bot Permissions**
   - 確認 Bot 已加入目標伺服器
   - Bot 需要以下權限：
     - Read Messages/View Channels
     - Read Message History

### 2. 環境變數配置

確認以下環境變數已正確設置：

**根目錄 `.env`：**
```env
DISCORD_CLIENT_ID=你的_client_id
DISCORD_CLIENT_SECRET=你的_client_secret
DISCORD_BOT_TOKEN=你的_bot_token
```

**`client/.env.local`：**
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=你的_client_id
NEXT_PUBLIC_API_URL=http://localhost:3008
```

### 3. 白名單配置

如果伺服器不在白名單中，可能會導致某些功能受限：

```env
# .env 和 bot/.env
ALLOWED_GUILD_IDS=812574421465956373,1320005222688624713
```

## 解決方案

### 方案 1: 更新 Discord Developer Portal 配置

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 選擇你的應用
3. 進入 **OAuth2** 頁面
4. 在 **Redirects** 部分添加：
   ```
   https://discord.com/oauth2/authorized
   ```
5. 保存更改

### 方案 2: 使用備用認證方法

代碼已經實現了多種備用認證方法：

1. **OAuth2 authorize** (主要方法) - 使用 Discord OAuth2 流程
2. **getInstanceConnectedParticipants** (備用方法 1) - 從活動參與者獲取
3. **從 URL 解析** (備用方法 2) - 從 URL fragment 解析用戶信息

如果主要方法失敗，系統會自動嘗試備用方法。

### 方案 3: 檢查 API 連接

確認前端可以正確連接到後端 API：

```bash
# 測試 API 連接
curl http://localhost:3008/health

# 檢查 auth 路由
curl -X POST http://localhost:3008/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```

### 方案 4: 重新授權應用

1. 在 Discord 中，進入 **用戶設置** → **授權的應用**
2. 找到你的應用並撤銷授權
3. 重新打開 Embedded App
4. 重新授權應用

## 調試步驟

### 1. 檢查瀏覽器控制台

打開瀏覽器開發者工具 (F12)，查看 Console 標籤：

```javascript
// 應該看到以下日誌
✅ Discord SDK 已就緒
🔐 開始 OAuth2 認證...
✅ OAuth2 授權成功
✅ 從後端 API 獲取用戶信息成功
```

### 2. 檢查網絡請求

在開發者工具的 Network 標籤中：

1. 找到 `/api/auth/token` 請求
2. 檢查請求狀態碼（應該是 200）
3. 查看響應內容

### 3. 檢查伺服器日誌

在運行 `npm run dev` 的終端中查看：

```bash
🔄 開始 token exchange...
✅ Access token 獲取成功
✅ 用戶信息獲取成功: { userId: '...', username: '...' }
```

## 常見錯誤

### 錯誤 1: "invalid_client"

**原因：** Client ID 或 Client Secret 不正確

**解決：**
```bash
# 檢查 .env 文件
cat .env | grep DISCORD_CLIENT

# 確認與 Discord Developer Portal 中的值一致
```

### 錯誤 2: "invalid_grant"

**原因：** Authorization code 已過期或已使用

**解決：** 刷新頁面重新獲取新的 code

### 錯誤 3: "redirect_uri_mismatch"

**原因：** Redirect URI 配置不匹配

**解決：** 在 Discord Developer Portal 中添加正確的 Redirect URL

### 錯誤 4: 500 Internal Server Error

**原因：** 後端 API 處理失敗

**解決：**
1. 檢查伺服器日誌
2. 確認環境變數已正確設置
3. 重啟服務器

## 測試清單

- [ ] Discord Developer Portal 配置正確
- [ ] OAuth2 Redirect URLs 已添加
- [ ] 環境變數已正確設置
- [ ] Bot 已加入目標伺服器
- [ ] 白名單包含目標伺服器 ID
- [ ] API 服務器正常運行
- [ ] 前端可以連接到後端 API
- [ ] 瀏覽器控制台沒有錯誤

## 仍然無法解決？

如果以上方法都無法解決問題，請提供以下信息：

1. 完整的瀏覽器控制台日誌
2. 伺服器日誌
3. Discord Developer Portal 的 OAuth2 配置截圖
4. 環境變數配置（隱藏敏感信息）

## 相關文檔

- [Discord Embedded App SDK 文檔](https://discord.com/developers/docs/activities/overview)
- [Discord OAuth2 文檔](https://discord.com/developers/docs/topics/oauth2)
- [CONFIGURATION.md](./CONFIGURATION.md) - 完整配置指南
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 一般問題排查
