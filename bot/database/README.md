# 資料庫架構說明

## 文件說明

### schema.sql（推薦使用）
**完整的資料庫架構文件**，包含所有表、索引、視圖和函數。

適用於：
- ✅ 新專案初始化
- ✅ 完整重建資料庫
- ✅ 了解完整的資料庫結構

```bash
# 使用方式
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/schema.sql
```

### create_tables.sql（舊版，保留用於參考）
原始的基礎表結構，**不包含** `message_id` 欄位和歷史提取功能。

### history_tables.sql（已整合到 schema.sql）
歷史提取功能的表結構，包含：
- `history_fetch_tasks` - 提取任務記錄
- `history_fetch_ranges` - 提取範圍記錄
- `admin_users` - 管理員權限

### add_message_id.sql（升級腳本）
為現有的 `messages` 表添加 `message_id` 欄位。

適用於：
- ✅ 從舊版升級到新版
- ✅ 已有數據的資料庫

```bash
# 使用方式
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_message_id.sql
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

## 視圖

### v_recent_activity
最近 30 天活動統計

### v_user_leaderboard
用戶排行榜（最近 30 天）

## 函數

### check_range_overlap()
檢查提取範圍是否重疊

## 快速開始

### 1. 新專案初始化

```bash
# 創建資料庫
createdb discord_stats

# 執行完整架構
psql -U postgres -d discord_stats -f bot/database/schema.sql
```

### 2. 從舊版升級

```bash
# 如果你已經有舊版的資料庫，只需要執行升級腳本
psql -U postgres -d discord_stats -f bot/database/add_message_id.sql
psql -U postgres -d discord_stats -f bot/database/history_tables.sql
```

### 3. 使用環境變數

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
\d history_fetch_tasks
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
         history_fetch_tasks, history_fetch_ranges, admin_users 
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

1. **message_id 欄位**：新版本使用 `message_id` 來避免重複訊息，舊版本沒有此欄位
2. **唯一索引**：`message_id` 有唯一索引，確保不會插入重複的訊息
3. **ON CONFLICT**：插入訊息時使用 `ON CONFLICT DO NOTHING` 來處理重複
4. **外鍵約束**：`history_fetch_ranges.task_id` 參考 `history_fetch_tasks.id`
5. **JSONB 欄位**：`daily_stats` 使用 JSONB 儲存複雜的統計數據

## 故障排除

### 錯誤：column "message_id" does not exist
執行升級腳本：
```bash
psql -U postgres -d discord_stats -f bot/database/add_message_id.sql
```

### 錯誤：relation "history_fetch_tasks" does not exist
執行歷史表創建腳本：
```bash
psql -U postgres -d discord_stats -f bot/database/history_tables.sql
```

### 重建整個資料庫
```bash
dropdb discord_stats
createdb discord_stats
psql -U postgres -d discord_stats -f bot/database/schema.sql
```
