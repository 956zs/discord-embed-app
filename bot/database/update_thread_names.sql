-- ============================================================================
-- 更新現有討論串訊息的名稱
-- ============================================================================
-- 此腳本會從 channel_stats 表中提取討論串名稱並更新到 messages 表
-- 執行前請確保：
-- 1. 已執行 add_thread_names.sql
-- 2. 已重啟機器人以收集新的討論串名稱
-- ============================================================================

-- 從 channel_stats 更新討論串名稱
-- channel_stats 中的 thread 資料會有 channel_id = thread_id
UPDATE messages m
SET thread_name = cs.channel_name
FROM channel_stats cs
WHERE m.is_thread = true
  AND m.thread_id IS NOT NULL
  AND m.thread_name IS NULL
  AND cs.channel_id = m.thread_id
  AND cs.guild_id = m.guild_id;

-- 顯示更新結果
\echo ''
\echo '============================================================================'
\echo '✅ Thread names updated!'
\echo '============================================================================'
\echo ''
\echo 'Updated messages:'
SELECT COUNT(*) as updated_count
FROM messages 
WHERE is_thread = true 
  AND thread_name IS NOT NULL;

\echo ''
\echo 'Still need update (thread_name is NULL):'
SELECT COUNT(*) as need_update_count
FROM messages 
WHERE is_thread = true 
  AND thread_name IS NULL;
\echo ''
