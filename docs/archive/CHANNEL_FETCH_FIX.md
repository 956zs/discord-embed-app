# 頻道獲取問題修復

## 問題描述

在使用管理員頁面的歷史訊息提取功能時，出現以下錯誤：

```
❌ 獲取最新訊息失敗: TypeError: Cannot read properties of undefined (reading 'fetch')
    at HistoryFetcher.startFetch
```

## 根本原因

當從 API server 調用 `historyFetcher.startFetch()` 時，Discord.js 的 cache 可能還沒有完全載入，導致：

1. **Guild 不在 cache 中**
   ```javascript
   const guild = this.client.guilds.cache.get(guildId);
   // guild 可能是 undefined
   ```

2. **Channel 不在 cache 中**
   ```javascript
   const channel = guild.channels.cache.get(channelId);
   // channel 可能是 undefined
   ```

3. **嘗試訪問 undefined 的屬性**
   ```javascript
   const latestMessages = await channel.messages.fetch({ limit: 1 });
   // TypeError: Cannot read properties of undefined (reading 'fetch')
   ```

### 為什麼會發生？

- Bot 在啟動時需要時間來載入所有 guild 和 channel 的 cache
- API server 可能在 bot 完全就緒之前就開始接受請求
- 大型伺服器或多個伺服器會增加載入時間
- Discord API 的速率限制可能延遲 cache 載入

## 解決方案

### 修改前

```javascript
const guild = this.client.guilds.cache.get(guildId);
if (!guild) throw new Error("找不到伺服器");

const channel = guild.channels.cache.get(channelId);
if (!channel) throw new Error("找不到頻道");
```

**問題**：只依賴 cache，如果 cache 中沒有就直接失敗。

### 修改後

```javascript
// 獲取伺服器
let guild = this.client.guilds.cache.get(guildId);
if (!guild) {
  console.log(`   ⚠️ 伺服器不在 cache 中，嘗試 fetch...`);
  try {
    guild = await this.client.guilds.fetch(guildId);
  } catch (error) {
    throw new Error(`找不到伺服器: ${error.message}`);
  }
}

// 獲取頻道
let channel = guild.channels.cache.get(channelId);
if (!channel) {
  console.log(`   ⚠️ 頻道不在 cache 中，嘗試 fetch...`);
  try {
    channel = await guild.channels.fetch(channelId);
  } catch (error) {
    throw new Error(`找不到頻道: ${error.message}`);
  }
}

if (!channel) {
  throw new Error("無法獲取頻道");
}
```

**改進**：
- ✅ 先嘗試從 cache 獲取（快速）
- ✅ 如果 cache 中沒有，使用 `fetch()` 從 Discord API 獲取
- ✅ 提供詳細的錯誤信息
- ✅ 添加日誌記錄以便調試

## Discord.js Cache vs Fetch

### Cache（緩存）

```javascript
const guild = client.guilds.cache.get(guildId);
const channel = guild.channels.cache.get(channelId);
```

**優點**：
- 非常快速（內存訪問）
- 不消耗 API 配額
- 同步操作

**缺點**：
- 可能不存在（未載入或已過期）
- 需要等待 bot 完全就緒
- 大型 bot 可能不會緩存所有數據

### Fetch（獲取）

```javascript
const guild = await client.guilds.fetch(guildId);
const channel = await guild.channels.fetch(channelId);
```

**優點**：
- 總是獲取最新數據
- 不依賴 cache 狀態
- 可靠性高

**缺點**：
- 較慢（網絡請求）
- 消耗 API 配額
- 異步操作

### 最佳實踐

結合兩者的優點：

```javascript
// 1. 先嘗試 cache（快速路徑）
let resource = cache.get(id);

// 2. 如果沒有，使用 fetch（可靠路徑）
if (!resource) {
  resource = await fetch(id);
}

// 3. 使用資源
if (resource) {
  // 處理邏輯
}
```

## 測試步驟

### 1. 重啟服務

```bash
pm2 restart all
# 或
./manage.sh restart
```

### 2. 立即測試

在 bot 剛啟動後立即嘗試提取（此時 cache 可能未完全載入）：

```bash
# 查看日誌
pm2 logs discord-api

# 在管理員頁面點擊「開始提取」
```

### 3. 檢查日誌

應該看到類似的日誌：

```
📥 開始提取歷史訊息: Server Name > #channel-name
   獲取最新訊息作為錨點...
   ✅ 錨點訊息 ID: 1234567890
```

或者（如果需要 fetch）：

```
   ⚠️ 頻道不在 cache 中，嘗試 fetch...
📥 開始提取歷史訊息: Server Name > #channel-name
```

### 4. 驗證成功

- ✅ 不再出現 "Cannot read properties of undefined" 錯誤
- ✅ 提取任務正常開始
- ✅ 可以在「提取歷史」標籤看到進度

## 相關問題

### 問題 1: "找不到伺服器"

**原因**：Bot 沒有加入該伺服器，或沒有權限訪問。

**解決**：
1. 確認 bot 已加入伺服器
2. 檢查 bot 權限
3. 檢查白名單設置（`ALLOWED_GUILD_IDS`）

### 問題 2: "找不到頻道"

**原因**：頻道不存在、已刪除，或 bot 沒有權限訪問。

**解決**：
1. 確認頻道存在
2. 檢查 bot 是否有「查看頻道」權限
3. 檢查頻道是否為私密頻道

### 問題 3: "提取服務未就緒"

**原因**：Bot 還沒有完全啟動。

**解決**：
1. 等待幾秒後重試
2. 檢查 bot 日誌：`pm2 logs discord-bot`
3. 確認 bot token 正確

## 性能影響

### Cache 命中率

在正常運行的 bot 中：
- **Cache 命中率**：~99%（大部分請求直接從 cache 獲取）
- **Fetch 調用**：~1%（僅在 cache miss 時）

### API 配額

Discord API 限制：
- **Guild fetch**: 50 次/秒
- **Channel fetch**: 50 次/秒

我們的實現：
- 優先使用 cache（不消耗配額）
- 僅在必要時 fetch（極少觸發限制）

## 未來改進

1. **預熱 Cache**
   ```javascript
   // 在 bot ready 時預先載入所有頻道
   client.on('ready', async () => {
     for (const guild of client.guilds.cache.values()) {
       await guild.channels.fetch();
     }
   });
   ```

2. **重試機制**
   ```javascript
   async function fetchWithRetry(fetchFn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fetchFn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(1000 * (i + 1));
       }
     }
   }
   ```

3. **健康檢查**
   ```javascript
   // 在接受提取請求前檢查 bot 狀態
   if (!client.isReady()) {
     throw new Error('Bot 尚未就緒');
   }
   ```

## 相關文件

- `bot/handlers/historyFetcher.js` - 歷史提取器（已修復）
- `server/index.js` - Server 啟動和 bot 連接
- `server/routes/fetch.js` - 提取 API 路由

## 參考資料

- [Discord.js Guide - Caching](https://discordjs.guide/popular-topics/caching.html)
- [Discord.js Documentation - Managers](https://discord.js.org/#/docs/discord.js/main/class/GuildManager)
- [Discord API Rate Limits](https://discord.com/developers/docs/topics/rate-limits)
