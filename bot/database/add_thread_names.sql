-- ============================================================================
-- 添加討論串名稱支援
-- ============================================================================
-- 此腳本為 messages 表添加 thread_name 欄位，用於儲存討論串名稱
-- 執行方式:
--   psql -U your_username -d discord_stats -f bot/database/add_thread_names.sql
-- ============================================================================

-- 添加 thread_name 欄位到 messages 表
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS thread_name VARCHAR(100);

-- 為 thread_name 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_thread_name 
ON messages(thread_name) 
WHERE thread_name IS NOT NULL;

-- 顯示更新結果
\echo ''
\echo '============================================================================'
\echo '✅ Thread name column added successfully!'
\echo '============================================================================'
\echo ''
\echo 'New column:'
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'thread_name';
\echo ''
