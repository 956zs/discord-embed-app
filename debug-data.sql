-- 診斷數據問題的 SQL 腳本
-- 使用方式: psql -U postgres -d discord_stats -f debug-data.sql
-- 或者在 psql 中逐行執行

-- 設置你的 GUILD_ID
\set guild_id '1320005222688624713'

\echo '========================================='
\echo '1. 檢查訊息總數和時間範圍'
\echo '========================================='
SELECT 
    COUNT(*) as total_messages, 
    COUNT(message_id) as with_message_id,
    COUNT(CASE WHEN message_id IS NULL THEN 1 END) as without_message_id,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT channel_id) as unique_channels
FROM messages 
WHERE guild_id = :'guild_id';

\echo ''
\echo '========================================='
\echo '2. 檢查最近 10 天的訊息分佈'
\echo '========================================='
SELECT 
    DATE(created_at) as date, 
    COUNT(*) as message_count,
    COUNT(DISTINCT user_id) as active_users
FROM messages 
WHERE guild_id = :'guild_id' 
  AND created_at >= NOW() - INTERVAL '10 days'
GROUP BY DATE(created_at) 
ORDER BY date DESC;

\echo ''
\echo '========================================='
\echo '3. 檢查表情符號數據'
\echo '========================================='
SELECT 
    COUNT(*) as total_emoji_usage,
    COUNT(DISTINCT emoji_identifier) as unique_emojis,
    COUNT(CASE WHEN is_custom THEN 1 END) as custom_emojis,
    COUNT(CASE WHEN NOT is_custom THEN 1 END) as unicode_emojis,
    MIN(used_at) as oldest_emoji,
    MAX(used_at) as newest_emoji
FROM emoji_usage 
WHERE guild_id = :'guild_id';

\echo ''
\echo '========================================='
\echo '4. 檢查最常用的表情符號 (Top 10)'
\echo '========================================='
SELECT 
    emoji_name,
    emoji_identifier,
    is_custom,
    COUNT(*) as usage_count
FROM emoji_usage 
WHERE guild_id = :'guild_id'
GROUP BY emoji_name, emoji_identifier, is_custom
ORDER BY usage_count DESC
LIMIT 10;

\echo ''
\echo '========================================='
\echo '5. 檢查成員活躍度 (Top 10)'
\echo '========================================='
SELECT 
    username,
    user_id,
    COUNT(*) as message_count,
    MIN(created_at) as first_message,
    MAX(created_at) as last_message
FROM messages 
WHERE guild_id = :'guild_id'
GROUP BY username, user_id
ORDER BY message_count DESC
LIMIT 10;

\echo ''
\echo '========================================='
\echo '6. 檢查最近 5 則訊息的詳細信息'
\echo '========================================='
SELECT 
    id,
    message_id,
    username,
    message_length,
    has_emoji,
    created_at,
    channel_id
FROM messages 
WHERE guild_id = :'guild_id' 
ORDER BY created_at DESC 
LIMIT 5;

\echo ''
\echo '========================================='
\echo '7. 檢查頻道統計'
\echo '========================================='
SELECT 
    channel_name,
    channel_id,
    message_count,
    last_updated
FROM channel_stats 
WHERE guild_id = :'guild_id'
ORDER BY message_count DESC;

\echo ''
\echo '========================================='
\echo '8. 檢查歷史提取任務'
\echo '========================================='
SELECT 
    id,
    channel_name,
    status,
    messages_fetched,
    messages_saved,
    messages_duplicate,
    started_at,
    completed_at
FROM history_fetch_tasks 
WHERE guild_id = :'guild_id'
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '診斷完成！'
