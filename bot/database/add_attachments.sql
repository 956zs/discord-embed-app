-- ============================================================================
-- 添加附件支援到 messages 表
-- ============================================================================
-- 執行方式:
--   psql -U your_username -d discord_stats -f bot/database/add_attachments.sql
-- ============================================================================

-- 添加附件相關欄位
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attachment_urls TEXT[];

-- 添加索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_has_attachments 
ON messages(guild_id, has_attachments) 
WHERE has_attachments = TRUE;

-- 顯示結果
\echo ''
\echo '✅ 附件欄位已添加到 messages 表'
\echo ''
\echo '新增欄位:'
\echo '  - has_attachments: 是否包含附件'
\echo '  - attachment_count: 附件數量'
\echo '  - attachment_urls: 附件 URL 陣列'
\echo ''

-- 顯示更新後的表結構
\d messages
