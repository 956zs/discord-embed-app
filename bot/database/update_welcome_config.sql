-- ============================================================================
-- 擴展歡迎訊息配置欄位
-- ============================================================================
-- 此腳本添加以下欄位：
-- 1. embed_image_url - Embed 主圖片 URL（選填）
-- 2. embed_thumbnail_url - Embed 縮圖 URL（選填，優先於 embed_thumbnail boolean）
-- 3. message_content - Embed 附帶的一般訊息內容（選填）
-- 執行方式:
--   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/update_welcome_config.sql
-- ============================================================================

-- 添加新欄位
ALTER TABLE welcome_config 
ADD COLUMN IF NOT EXISTS embed_image_url TEXT,
ADD COLUMN IF NOT EXISTS embed_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS message_content TEXT;

-- 添加欄位註解
COMMENT ON COLUMN welcome_config.embed_image_url IS 'Embed 主圖片 URL，支援變數 {user}, {username}, {server}, {memberCount}, {userAvatar}';
COMMENT ON COLUMN welcome_config.embed_thumbnail_url IS 'Embed 縮圖 URL，支援變數。如果設定則優先使用此 URL，否則使用 embed_thumbnail boolean';
COMMENT ON COLUMN welcome_config.message_content IS '當啟用 Embed 時，可額外發送的一般訊息內容';

-- 顯示更新結果
\echo ''
\echo '============================================================================'
\echo 'Updated welcome_config table:'
\echo '============================================================================'
\d welcome_config

\echo ''
SELECT '✅ Welcome config extended successfully!' as status;
\echo ''
