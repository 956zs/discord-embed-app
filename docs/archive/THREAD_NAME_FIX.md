# 討論串名稱顯示修復指南

## 問題說明

在統計數據中，討論串會顯示 ID 而不是名稱。這是因為：

1. 討論串訊息儲存時，`channel_id` 欄位存的是父頻道 ID
2. 但 `channel_stats` 表記錄的是討論串 ID 和名稱
3. SQL JOIN 時無法正確匹配，導致顯示 ID

## 解決方案

此修復新增了 `thread_name` 欄位到 `messages` 表，並更新相關邏輯以正確顯示討論串名稱。

## 安裝步驟

### 1. 更新資料庫結構

執行以下指令添加 `thread_name` 欄位：

```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_names.sql
```

或直接使用 psql：

```bash
psql -U your_username -d discord_stats -f bot/database/add_thread_names.sql
```

### 2. 重啟機器人

資料庫更新後，重啟機器人以應用新的程式碼：

```bash
# 如果使用 PM2
pm2 restart discord-bot

# 或者如果使用其他方式
# 停止現有進程，然後重新啟動
```

### 3. 重啟伺服器

同樣重啟 API 伺服器：

```bash
# 如果使用 PM2
pm2 restart discord-server

# 或使用專案的管理腳本
./manage.sh restart server
```

## 修改內容

### 1. 資料庫變更 (`bot/database/add_thread_names.sql`)

- 新增 `thread_name VARCHAR(100)` 欄位到 `messages` 表
- 為新欄位建立索引以提高查詢效能

### 2. 訊息處理器 (`bot/handlers/messageHandler.js`)

- 提取討論串名稱並儲存到資料庫
- 更新 INSERT 語句包含 `thread_name` 欄位

### 3. 統計控制器 (`server/controllers/statsController.js`)

**`getChannelUsage()` 函數：**
- 使用 `CASE` 語句判斷是否為討論串
- 如果是討論串，優先顯示 `thread_name`，否則顯示頻道名稱
- 按討論串 ID 或頻道 ID 正確分組

**`getTodayStats()` 函數：**
- 同樣更新查詢邏輯以正確顯示討論串名稱

## 驗證修復

### 1. 檢查資料庫

確認欄位已添加：

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'thread_name';
```

### 2. 檢查新訊息

發送一些討論串訊息後，查詢資料庫：

```sql
SELECT message_id, thread_id, thread_name, is_thread 
FROM messages 
WHERE is_thread = true 
ORDER BY created_at DESC 
LIMIT 10;
```

應該看到 `thread_name` 欄位有值。

### 3. 檢查統計頁面

1. 打開統計頁面
2. 查看「頻道使用情況」圖表
3. 討論串應該顯示名稱而不是 ID

## 遷移現有資料（可選）

如果你想更新現有的討論串訊息，可以執行以下腳本。但請注意：

- 這需要機器人有權限訪問所有討論串
- 可能需要較長時間
- 建議在低峰時段執行

```sql
-- 此腳本僅供參考，需要根據實際情況調整
-- 因為我們無法從資料庫直接獲取歷史討論串名稱
-- 最好的方式是等待新訊息自然更新

-- 或者可以手動標記一些已知的討論串：
UPDATE messages 
SET thread_name = '討論串名稱' 
WHERE thread_id = '討論串ID' 
AND is_thread = true;
```

## 故障排除

### 問題：新訊息仍然顯示 ID

**解決方案：**
1. 確認資料庫已更新
2. 確認機器人和伺服器都已重啟
3. 檢查日誌是否有錯誤
4. 清除瀏覽器快取

### 問題：舊訊息仍然顯示 ID

**解決方案：**
這是正常的。只有新發送的訊息才會有 `thread_name`。舊訊息的 `thread_name` 為 NULL，會退回到顯示 ID。

要更新舊訊息，可以：
1. 等待討論串有新訊息時自然更新
2. 手動更新重要討論串的名稱（見上方 SQL）

### 問題：SQL 錯誤

**解決方案：**
1. 檢查資料庫連接
2. 確認使用的資料庫使用者有足夠權限
3. 查看詳細錯誤訊息

## 技術細節

### 為什麼不直接修改 `channel_stats`？

因為：
1. `channel_stats` 表用於快速查詢所有時間的統計
2. 討論串和頻道混在一起會造成資料混亂
3. 使用 `thread_name` 欄位可以更精確地記錄訊息來源

### JOIN 邏輯說明

修復後的查詢使用以下邏輯：

```sql
CASE 
  WHEN m.is_thread THEN COALESCE(m.thread_name, m.thread_id)
  ELSE COALESCE(cs.channel_name, m.channel_id)
END as name
```

這表示：
- 如果是討論串訊息：優先使用 `thread_name`，如果為空則用 `thread_id`
- 如果是普通訊息：優先使用 `channel_name`（從 JOIN 獲得），如果為空則用 `channel_id`

## 完成

修復完成後，所有新的討論串訊息都會在統計中正確顯示名稱！ 🎉
