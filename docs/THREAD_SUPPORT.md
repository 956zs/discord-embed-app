# 討論串（Threads）支援

## 功能說明

Bot 現在支援收集 Discord 討論串（Threads）中的訊息，包括：
- 📝 論壇頻道（Forum Channels）中的貼文
- 💬 文字頻道中創建的討論串
- 🔒 私人討論串（如果 Bot 被邀請）

## 資料庫架構

### 新增欄位

`messages` 表新增了三個欄位：

- `is_thread` (BOOLEAN) - 是否為討論串訊息
- `thread_id` (VARCHAR) - 討論串 ID
- `parent_channel_id` (VARCHAR) - 父頻道 ID

### 資料結構

**一般訊息：**
```
channel_id: 頻道 ID
is_thread: false
thread_id: null
parent_channel_id: null
```

**討論串訊息：**
```
channel_id: 父頻道 ID
is_thread: true
thread_id: 討論串 ID
parent_channel_id: 父頻道 ID
```

## 升級現有資料庫

如果你已經有資料庫，需要執行升級腳本：

```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql
```

或者使用環境變數：

```bash
source bot/.env
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql
```

## Bot 行為

### 自動加入討論串

Bot 會自動：
1. 在啟動時加入所有現有的討論串
2. 當創建新討論串時自動加入
3. 收集討論串中的所有訊息

### 訊息收集

- ✅ 即時收集討論串中的新訊息
- ✅ 歷史提取支援討論串
- ✅ 表情符號統計包含討論串
- ✅ 成員活躍度包含討論串

## 統計查詢

### 查看討論串訊息統計

```sql
-- 討論串訊息總數
SELECT COUNT(*) 
FROM messages 
WHERE guild_id = 'YOUR_GUILD_ID' 
  AND is_thread = TRUE;

-- 每個討論串的訊息數
SELECT 
    thread_id,
    COUNT(*) as message_count
FROM messages 
WHERE guild_id = 'YOUR_GUILD_ID' 
  AND is_thread = TRUE
GROUP BY thread_id
ORDER BY message_count DESC;

-- 討論串 vs 一般訊息比例
SELECT 
    is_thread,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM messages 
WHERE guild_id = 'YOUR_GUILD_ID'
GROUP BY is_thread;
```

### 最活躍的討論串

```sql
SELECT 
    thread_id,
    parent_channel_id,
    COUNT(*) as message_count,
    COUNT(DISTINCT user_id) as participant_count,
    MIN(created_at) as first_message,
    MAX(created_at) as last_message
FROM messages 
WHERE guild_id = 'YOUR_GUILD_ID' 
  AND is_thread = TRUE
GROUP BY thread_id, parent_channel_id
ORDER BY message_count DESC
LIMIT 10;
```

## 注意事項

### Bot 權限

確保 Bot 有以下權限：
- ✅ Read Messages/View Channels
- ✅ Read Message History
- ✅ Send Messages in Threads（可選，用於命令回覆）

### 私人討論串

Bot 只能收集它被邀請加入的私人討論串。

### 歸檔的討論串

歸檔的討論串訊息仍然會被保留在資料庫中，但 Bot 無法收集新訊息。

## 歷史提取

歷史提取功能**完全支援討論串**：

### 自動提取流程

當你對一個頻道進行歷史提取時，系統會：

1. **階段 1**: 提取主頻道的歷史訊息（向後）
2. **階段 2**: 提取主頻道的新訊息（向前）
3. **階段 3**: 自動提取該頻道的所有討論串
   - 活躍的討論串
   - 已歸檔的討論串
   - 每個討論串的所有歷史訊息

### 提取範圍

- ✅ 活躍討論串（Active Threads）
- ✅ 已歸檔討論串（Archived Threads）
- ✅ 公開討論串（Public Threads）
- ⚠️ 私人討論串（Private Threads）- 僅限 Bot 已加入的

### 日誌輸出

提取時你會看到類似的日誌：

```
階段 3: 檢查討論串...
找到 5 個討論串
📝 提取討論串: 功能討論
✅ 討論串 "功能討論": 42 則訊息
📝 提取討論串: Bug 回報
✅ 討論串 "Bug 回報": 18 則訊息
```

## 前端顯示

討論串訊息會自動包含在所有統計中：
- 訊息趨勢圖表
- 成員活躍度排行
- 表情符號統計
- 頻道使用統計（計入父頻道）

## 故障排除

### Bot 無法加入討論串

檢查：
1. Bot 是否有 "View Channel" 權限
2. 討論串是否為私人討論串
3. Bot 是否被邀請加入私人討論串

### 討論串訊息未被收集

檢查：
1. Bot 是否已加入該討論串
2. 查看 Bot console 是否有錯誤訊息
3. 確認資料庫已添加新欄位

### 升級後的問題

如果升級後遇到問題：

```sql
-- 檢查欄位是否存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('is_thread', 'thread_id', 'parent_channel_id');

-- 如果欄位不存在，重新執行升級腳本
```

## 未來功能

可能的擴展：
- 📊 討論串專屬統計頁面
- 🔍 按討論串篩選訊息
- 📈 討論串活躍度趨勢
- 🏆 最熱門討論串排行
