# 資料庫架構說明

## 文件說明

### schema.sql（唯一完整架構）
**完整的資料庫架構文件**，包含所有表、索引、視圖和函數。

包含功能：
- ✅ 核心統計功能（訊息、表情、頻道統計）
- ✅ 歷史訊息提取功能
- ✅ 歡迎訊息系統
- ✅ 成員統計功能
- ✅ 討論串支援
- ✅ 附件支援

適用於：
- ✅ 新專案初始化
- ✅ 完整重建資料庫
- ✅ 了解完整的資料庫結構

```bash
# 使用方式
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/schema.sql
```

## 資料庫表結構

### 核心統計表

#### messages
用戶發言記錄表
- `id` - 自增主鍵
- `message_id` - Discord 訊息 ID（唯一，用於去重）
- `guild_id` - 伺服器 ID
- `channel_id` - 頻道 ID
- `user_id` - 用戶 ID
- `username` - 用戶名稱
- `message_length` - 訊息長度
- `has_emoji` - 是否包含表情
- `is_thread` - 是否為討論串訊息
- `thread_id` - 討論串 ID
- `thread_name` - 討論串名稱
- `parent_channel_id` - 父頻道 ID
- `has_attachments` - 是否包含附件
- `attachment_count` - 附件數量
- `attachment_urls` - 附件 URL 陣列
- `created_at` - 創建時間

#### emoji_usage
表情使用記錄表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `emoji_identifier` - 表情識別碼
- `emoji_name` - 表情名稱
- `is_custom` - 是否為自訂表情
- `emoji_url` - 表情圖片 URL
- `user_id` - 使用者 ID
- `used_at` - 使用時間

#### daily_stats
每日統計匯總表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `stat_date` - 統計日期
- `total_messages` - 總訊息數
- `active_users` - 活躍用戶數
- `channel_stats` - 頻道統計（JSONB）
- `top_users` - 排行榜（JSONB）
- `created_at` - 創建時間

#### channel_stats
頻道統計表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `channel_id` - 頻道 ID
- `channel_name` - 頻道名稱
- `message_count` - 訊息數量
- `last_updated` - 最後更新時間

### 歷史提取功能表

#### history_fetch_tasks
提取任務記錄表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `channel_id` - 頻道 ID
- `channel_name` - 頻道名稱
- `status` - 狀態（pending, running, completed, failed, warning）
- `anchor_message_id` - 錨點訊息 ID
- `start_message_id` - 開始訊息 ID
- `end_message_id` - 結束訊息 ID
- `messages_fetched` - 已提取數量
- `messages_saved` - 已儲存數量
- `messages_duplicate` - 重複數量
- `error_message` - 錯誤訊息
- `started_by` - 發起者 ID
- `started_at` - 開始時間
- `completed_at` - 完成時間
- `created_at` - 創建時間

#### history_fetch_ranges
提取範圍記錄表（避免重複提取）
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `channel_id` - 頻道 ID
- `start_message_id` - 開始訊息 ID
- `end_message_id` - 結束訊息 ID
- `start_timestamp` - 開始時間戳
- `end_timestamp` - 結束時間戳
- `message_count` - 訊息數量
- `task_id` - 關聯的任務 ID
- `created_at` - 創建時間

#### admin_users
管理員權限表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `user_id` - 用戶 ID
- `username` - 用戶名稱
- `granted_by` - 授權者 ID
- `granted_at` - 授權時間

### 歡迎訊息與成員統計表

#### welcome_config
歡迎訊息配置表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID（唯一）
- `enabled` - 是否啟用
- `channel_id` - 歡迎訊息頻道 ID
- `message_template` - 訊息模板
- `embed_enabled` - 是否使用 Embed
- `embed_color` - Embed 顏色
- `embed_title` - Embed 標題
- `embed_description` - Embed 描述
- `embed_footer` - Embed 頁腳
- `embed_thumbnail` - 是否顯示用戶頭像
- `embed_image_url` - Embed 主圖片 URL（支援變數）
- `embed_thumbnail_url` - Embed 縮圖 URL（支援變數，優先於 embed_thumbnail）
- `message_content` - Embed 附帶的一般訊息內容
- `dm_enabled` - 是否發送私訊
- `dm_message` - 私訊內容
- `autorole_enabled` - 是否自動給予身分組
- `autorole_ids` - 自動給予的身分組 ID 列表
- `created_at` - 創建時間
- `updated_at` - 更新時間

**支援變數：** `{user}`, `{username}`, `{server}`, `{memberCount}`, `{userAvatar}`

#### member_events
成員變化記錄表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `user_id` - 用戶 ID
- `username` - 用戶名稱
- `discriminator` - 識別碼
- `event_type` - 事件類型（join/leave）
- `member_count` - 事件時的成員總數
- `account_created_at` - 帳號創建時間
- `join_position` - 加入順序
- `created_at` - 事件時間

#### daily_member_stats
每日成員統計表
- `id` - 自增主鍵
- `guild_id` - 伺服器 ID
- `stat_date` - 統計日期
- `member_count_start` - 當天開始時的成員數
- `member_count_end` - 當天結束時的成員數
- `joins_count` - 當天加入人數
- `leaves_count` - 當天離開人數
- `net_change` - 淨變化
- `created_at` - 創建時間

## 視圖

### v_recent_activity
最近 30 天活動統計

### v_user_leaderboard
用戶排行榜（最近 30 天）

### v_member_trends
成員變化趨勢（最近 30 天）

## 函數

### check_range_overlap()
檢查提取範圍是否重疊

### update_daily_member_stats()
更新每日成員統計

## 快速開始

### 1. 新專案初始化

```bash
# 創建資料庫
createdb discord_stats

# 執行完整架構
psql -U postgres -d discord_stats -f bot/database/schema.sql
```

### 2. 使用環境變數

```bash
# 從 .env 載入配置
source bot/.env

# 執行 SQL
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/schema.sql
```

## 維護

### 查看表結構
```sql
\d messages
\d welcome_config
\d member_events
```

### 查看索引
```sql
\di
```

### 查看視圖
```sql
\dv
```

### 清理測試數據
```sql
-- 清空所有表（謹慎使用！）
TRUNCATE messages, emoji_usage, daily_stats, channel_stats, 
         history_fetch_tasks, history_fetch_ranges, admin_users,
         welcome_config, member_events, daily_member_stats
CASCADE;
```

### 備份資料庫
```bash
pg_dump -U postgres discord_stats > backup.sql
```

### 還原資料庫
```bash
psql -U postgres discord_stats < backup.sql
```

## 注意事項

1. **message_id 欄位**：使用 Discord 訊息 ID 來避免重複訊息
2. **唯一索引**：`message_id` 有唯一索引，確保不會插入重複的訊息
3. **ON CONFLICT**：插入訊息時使用 `ON CONFLICT DO NOTHING` 來處理重複
4. **外鍵約束**：`history_fetch_ranges.task_id` 參考 `history_fetch_tasks.id`
5. **JSONB 欄位**：使用 JSONB 儲存複雜的統計數據
6. **討論串支援**：`is_thread`, `thread_id`, `thread_name`, `parent_channel_id` 欄位
7. **附件支援**：`has_attachments`, `attachment_count`, `attachment_urls` 欄位
8. **歡迎訊息變數**：支援 `{user}`, `{username}`, `{server}`, `{memberCount}`, `{userAvatar}`

## 故障排除

### 重建整個資料庫
```bash
dropdb discord_stats
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/schema.sql
```

### 檢查表是否存在
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
