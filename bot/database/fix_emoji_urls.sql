-- ============================================================================
-- 修復 Emoji URL 格式
-- ============================================================================
-- Discord 更新了 CDN URL 格式，需要使用 .webp 和 animated 參數
-- 執行方式:
--   psql -U your_username -d discord_stats -f bot/database/fix_emoji_urls.sql
-- ============================================================================

-- 備份舊數據（可選）
-- CREATE TABLE emoji_usage_backup AS SELECT * FROM emoji_usage WHERE is_custom = true;

-- 更新靜態 emoji URL (.png -> .webp)
UPDATE emoji_usage
SET emoji_url = REGEXP_REPLACE(
    emoji_url,
    'https://cdn\.discordapp\.com/emojis/(\d+)\.png(\?.*)?',
    'https://cdn.discordapp.com/emojis/\1.webp?size=96',
    'g'
)
WHERE is_custom = true 
  AND emoji_url LIKE '%.png%';

-- 更新動畫 emoji URL (.gif -> .webp with animated=true)
UPDATE emoji_usage
SET emoji_url = REGEXP_REPLACE(
    emoji_url,
    'https://cdn\.discordapp\.com/emojis/(\d+)\.gif(\?.*)?',
    'https://cdn.discordapp.com/emojis/\1.webp?size=96&animated=true',
    'g'
)
WHERE is_custom = true 
  AND emoji_url LIKE '%.gif%';

-- 顯示更新結果
SELECT 
    '✅ Emoji URL 已更新' as status,
    COUNT(*) as total_custom_emojis,
    COUNT(CASE WHEN emoji_url LIKE '%animated=true%' THEN 1 END) as animated_emojis,
    COUNT(CASE WHEN emoji_url LIKE '%.webp%' AND emoji_url NOT LIKE '%animated=true%' THEN 1 END) as static_emojis
FROM emoji_usage
WHERE is_custom = true;

-- 顯示一些範例
\echo ''
\echo '範例 URL:'
SELECT DISTINCT emoji_name, emoji_url
FROM emoji_usage
WHERE is_custom = true
LIMIT 5;
