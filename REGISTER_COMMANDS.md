# 註冊 Discord Application Commands

Discord Embedded App 需要註冊 Application Commands（斜線命令）才能讓用戶啟動應用。

## 為什麼需要註冊命令？

Discord Embedded App 可以通過以下方式啟動：
1. **Activities 按鈕**（點擊「+」→「Activities」）
2. **斜線命令**（輸入 `/伺服器統計`）← 需要註冊

註冊命令後，用戶可以直接在聊天中輸入 `/伺服器統計` 來打開統計儀表板。

## 步驟 1: 配置環境變數

確保 `bot/.env` 包含以下配置：

```env
# Discord 配置
DISCORD_BOT_TOKEN=你的_bot_token
DISCORD_CLIENT_ID=你的_client_id
DISCORD_APPLICATION_ID=你的_application_id  # 通常與 CLIENT_ID 相同

# Embedded App URL
EMBEDDED_APP_URL=http://localhost:5173
```

**如何獲取這些值？**

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 選擇你的應用
3. 在「General Information」頁面：
   - **Application ID** = **Client ID**（複製這個值）
4. 在「Bot」頁面：
   - **Token**（點擊「Reset Token」或「Copy」）

## 步驟 2: 註冊命令

```bash
cd bot
npm run register
```

你應該看到：

```
🔄 開始註冊 Application Commands...
✅ Application Commands 註冊成功！
   已註冊 1 個命令

✅ 完成！你現在可以在 Discord 中使用 /伺服器統計 命令
```

## 步驟 3: 測試命令

1. 打開 Discord
2. 進入你的伺服器
3. 在聊天框輸入 `/`
4. 你應該看到 `/伺服器統計` 命令
5. 點擊命令或按 Enter

Bot 會回覆一個嵌入訊息，包含：
- 📊 統計功能說明
- 🔗 「開啟統計儀表板」按鈕

## 命令說明

### `/伺服器統計`

**功能**：顯示伺服器統計儀表板的入口

**回覆內容**：
- 📈 訊息趨勢
- 👥 成員活躍度
- 💬 頻道統計
- 😀 表情統計
- ☁️ 關鍵詞雲
- 🏠 伺服器概覽

**按鈕**：「📊 開啟統計儀表板」（連結到 Embedded App）

## 命令處理流程

```
用戶輸入 /伺服器統計
    ↓
Bot 接收 interactionCreate 事件
    ↓
檢查白名單
    ↓
創建 Embed 訊息
    ↓
添加「開啟儀表板」按鈕
    ↓
回覆用戶
```

## 更新命令

如果你修改了命令（例如改名稱或描述），重新執行：

```bash
cd bot
npm run register
```

命令會自動更新，通常在 1 小時內生效（全域命令）。

## 刪除命令

如果需要刪除命令，創建 `bot/commands/deleteCommands.js`：

```javascript
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: [] })
  .then(() => console.log('✅ 所有命令已刪除'))
  .catch(console.error);
```

然後執行：
```bash
node bot/commands/deleteCommands.js
```

## 伺服器專屬命令（可選）

如果你只想在特定伺服器註冊命令（更快生效），修改 `registerCommands.js`：

```javascript
// 替換這行
await rest.put(
  Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
  { body: commands }
);

// 改為
await rest.put(
  Routes.applicationGuildCommands(
    process.env.DISCORD_CLIENT_ID,
    'YOUR_GUILD_ID'  // 你的伺服器 ID
  ),
  { body: commands }
);
```

伺服器專屬命令會立即生效，但只在該伺服器可用。

## 故障排除

### 命令未出現

1. **等待時間**：全域命令需要最多 1 小時才會在所有伺服器生效
2. **重新載入 Discord**：完全關閉並重新打開 Discord
3. **檢查權限**：確認 Bot 有 `applications.commands` 權限

### 註冊失敗

1. **檢查 Token**：確認 `DISCORD_BOT_TOKEN` 正確
2. **檢查 Client ID**：確認 `DISCORD_CLIENT_ID` 正確
3. **網路問題**：檢查網路連接

### 命令執行失敗

1. **檢查 Bot 是否運行**：`npm run bot`
2. **查看日誌**：檢查 Bot 控制台輸出
3. **檢查白名單**：確認伺服器在 `ALLOWED_GUILD_IDS` 中

## 命令權限（進階）

如果你想限制誰可以使用命令，可以在 Discord 伺服器設定中配置：

1. 伺服器設定 → 整合
2. 找到你的 Bot
3. 點擊「管理」
4. 配置 `/伺服器統計` 命令的權限

## 多語言支援

當前命令支援：
- 🇹🇼 繁體中文：`/伺服器統計`
- 🇺🇸 英文：`/Server Stats`

Discord 會根據用戶的語言設定自動顯示對應的命令名稱。

## 下一步

- ✅ 註冊命令完成
- ✅ 測試 `/伺服器統計` 命令
- ✅ 啟動 Bot：`npm run bot`
- ✅ 在 Discord 中使用命令

現在用戶可以通過斜線命令快速訪問統計儀表板了！🎉
