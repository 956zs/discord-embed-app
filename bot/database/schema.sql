-- ============================================================================
-- Discord 統計與歷史提取完整資料庫架構
-- ============================================================================
-- 執行方式:
--   psql -U your_username -d discord_stats -f bot/database/schema.sql
--
-- 或使用環境變數:
--   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/schema.sql
-- ============================================================================

-- ============================================================================
-- 核心統計表
-- ============================================================================

-- 用戶發言記錄表
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(20),                    -- Discord 訊息 ID（用於去重）
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    message_length INTEGER,
    has_emoji BOOLEAN DEFAULT FALSE,
    is_thread BOOLEAN DEFAULT FALSE,           -- 是否為討論串訊息
    thread_id VARCHAR(20),                     -- 討論串 ID（如果是討論串訊息）
    thread_name VARCHAR(100),                  -- 討論串名稱
    parent_channel_id VARCHAR(20),             -- 父頻道 ID（如果是討論串訊息）
    has_attachments BOOLEAN DEFAULT FALSE,     -- 是否包含附件
    attachment_count INTEGER DEFAULT 0,        -- 附件數量
    attachment_urls TEXT[],                    -- 附件 URL 陣列
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_messages_guild_created ON messages(guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_guild ON messages(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_guild_date ON messages(guild_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_is_thread ON messages(is_thread) WHERE is_thread = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_thread_name ON messages(thread_name) WHERE thread_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_has_attachments ON messages(guild_id, has_attachments) WHERE has_attachments = TRUE;

-- 創建唯一索引（避免重複訊息）
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_id 
ON messages(message_id) 
WHERE message_id IS NOT NULL;

-- 表情使用記錄表
CREATE TABLE IF NOT EXISTS emoji_usage (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    emoji_identifier VARCHAR(100) NOT NULL,
    emoji_name VARCHAR(100),
    is_custom BOOLEAN DEFAULT FALSE,
    emoji_url TEXT,
    user_id VARCHAR(20),
    used_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_emoji_guild_emoji ON emoji_usage(guild_id, emoji_identifier);
CREATE INDEX IF NOT EXISTS idx_emoji_guild_used ON emoji_usage(guild_id, used_at);
CREATE INDEX IF NOT EXISTS idx_emoji_guild_date ON emoji_usage(guild_id, DATE(used_at));

-- 每日統計匯總表
CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    stat_date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    channel_stats JSONB,
    top_users JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, stat_date)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_daily_guild_date ON daily_stats(guild_id, stat_date);

-- 頻道統計表
CREATE TABLE IF NOT EXISTS channel_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    channel_name VARCHAR(100),
    message_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, channel_id)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_channel_guild ON channel_stats(guild_id);
CREATE INDEX IF NOT EXISTS idx_channel_count ON channel_stats(message_count DESC);

-- ============================================================================
-- 歷史提取功能表
-- ============================================================================

-- 提取任務記錄表
CREATE TABLE IF NOT EXISTS history_fetch_tasks (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    channel_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, warning
    anchor_message_id VARCHAR(20),                 -- 錨點訊息 ID
    start_message_id VARCHAR(20),                  -- 開始提取的訊息 ID
    end_message_id VARCHAR(20),                    -- 結束提取的訊息 ID
    messages_fetched INTEGER DEFAULT 0,
    messages_saved INTEGER DEFAULT 0,
    messages_duplicate INTEGER DEFAULT 0,
    error_message TEXT,
    started_by VARCHAR(20),                        -- 發起提取的用戶 ID
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_guild ON history_fetch_tasks(guild_id);
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_channel ON history_fetch_tasks(channel_id);
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_status ON history_fetch_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_created ON history_fetch_tasks(created_at DESC);

-- 提取範圍記錄表（避免重複提取）
CREATE TABLE IF NOT EXISTS history_fetch_ranges (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    start_message_id VARCHAR(20) NOT NULL,
    end_message_id VARCHAR(20) NOT NULL,
    start_timestamp TIMESTAMP NOT NULL,
    end_timestamp TIMESTAMP NOT NULL,
    message_count INTEGER DEFAULT 0,
    task_id INTEGER REFERENCES history_fetch_tasks(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_fetch_ranges_guild_channel ON history_fetch_ranges(guild_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_fetch_ranges_timestamps ON history_fetch_ranges(start_timestamp, end_timestamp);

-- 管理員權限表
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    granted_by VARCHAR(20),
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_admin_users_guild ON admin_users(guild_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);

-- ============================================================================
-- 歡迎訊息系統與成員統計表
-- ============================================================================

-- 歡迎訊息配置表
CREATE TABLE IF NOT EXISTS welcome_config (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    channel_id VARCHAR(20),                    -- 發送歡迎訊息的頻道 ID
    message_template TEXT,                     -- 歡迎訊息模板
    -- 可用變數: {user}, {username}, {server}, {memberCount}, {userAvatar}
    embed_enabled BOOLEAN DEFAULT false,       -- 是否使用 Embed 格式
    embed_color VARCHAR(7) DEFAULT '#5865F2',  -- Embed 顏色（十六進制）
    embed_title TEXT,                          -- Embed 標題
    embed_description TEXT,                    -- Embed 描述
    embed_footer TEXT,                         -- Embed 頁腳
    embed_thumbnail BOOLEAN DEFAULT true,      -- 是否顯示用戶頭像（當 embed_thumbnail_url 未設定時）
    embed_image_url TEXT,                      -- Embed 主圖片 URL（支援變數）
    embed_thumbnail_url TEXT,                  -- Embed 縮圖 URL（支援變數，優先於 embed_thumbnail）
    message_content TEXT,                      -- Embed 附帶的一般訊息內容（選填）
    dm_enabled BOOLEAN DEFAULT false,          -- 是否發送私訊
    dm_message TEXT,                           -- 私訊內容
    autorole_enabled BOOLEAN DEFAULT false,    -- 是否自動給予身分組
    autorole_ids TEXT[],                       -- 自動給予的身分組 ID 列表
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加欄位註解
COMMENT ON COLUMN welcome_config.embed_image_url IS 'Embed 主圖片 URL，支援變數 {user}, {username}, {server}, {memberCount}, {userAvatar}';
COMMENT ON COLUMN welcome_config.embed_thumbnail_url IS 'Embed 縮圖 URL，支援變數。如果設定則優先使用此 URL，否則使用 embed_thumbnail boolean';
COMMENT ON COLUMN welcome_config.message_content IS '當啟用 Embed 時，可額外發送的一般訊息內容';

-- 為 guild_id 創建索引
CREATE INDEX IF NOT EXISTS idx_welcome_config_guild ON welcome_config(guild_id);

-- 成員變化記錄表
CREATE TABLE IF NOT EXISTS member_events (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    discriminator VARCHAR(4),
    event_type VARCHAR(20) NOT NULL,           -- 'join' 或 'leave'
    member_count INTEGER,                      -- 事件發生時的成員總數
    account_created_at TIMESTAMP,              -- 帳號創建時間
    join_position INTEGER,                     -- 第幾位加入的成員（僅 join 事件）
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_member_events_guild ON member_events(guild_id);
CREATE INDEX IF NOT EXISTS idx_member_events_user ON member_events(user_id);
CREATE INDEX IF NOT EXISTS idx_member_events_type ON member_events(event_type);
CREATE INDEX IF NOT EXISTS idx_member_events_created ON member_events(created_at);
CREATE INDEX IF NOT EXISTS idx_member_events_guild_created ON member_events(guild_id, created_at);

-- 每日成員統計表
CREATE TABLE IF NOT EXISTS daily_member_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    stat_date DATE NOT NULL,
    member_count_start INTEGER DEFAULT 0,      -- 當天開始時的成員數
    member_count_end INTEGER DEFAULT 0,        -- 當天結束時的成員數
    joins_count INTEGER DEFAULT 0,             -- 當天加入人數
    leaves_count INTEGER DEFAULT 0,            -- 當天離開人數
    net_change INTEGER DEFAULT 0,              -- 淨變化 (joins - leaves)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, stat_date)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_daily_member_stats_guild ON daily_member_stats(guild_id);
CREATE INDEX IF NOT EXISTS idx_daily_member_stats_date ON daily_member_stats(stat_date);

-- ============================================================================
-- 視圖
-- ============================================================================

-- 最近 30 天活動視圖
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
  guild_id,
  DATE(created_at) as activity_date,
  COUNT(*) as message_count,
  COUNT(DISTINCT user_id) as active_users
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY guild_id, DATE(created_at)
ORDER BY activity_date DESC;

-- 用戶排行榜視圖
CREATE OR REPLACE VIEW v_user_leaderboard AS
SELECT 
  guild_id,
  user_id,
  username,
  COUNT(*) as total_messages,
  MAX(created_at) as last_active,
  DATE_PART('day', NOW() - MAX(created_at)) as days_since_active
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY guild_id, user_id, username
ORDER BY total_messages DESC;

-- 成員變化趨勢視圖
CREATE OR REPLACE VIEW v_member_trends AS
SELECT 
    guild_id,
    DATE(created_at) as event_date,
    COUNT(CASE WHEN event_type = 'join' THEN 1 END) as joins,
    COUNT(CASE WHEN event_type = 'leave' THEN 1 END) as leaves,
    COUNT(CASE WHEN event_type = 'join' THEN 1 END) - 
    COUNT(CASE WHEN event_type = 'leave' THEN 1 END) as net_change
FROM member_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY guild_id, DATE(created_at)
ORDER BY guild_id, event_date DESC;

-- ============================================================================
-- 函數
-- ============================================================================

-- 檢查範圍重疊的函數
CREATE OR REPLACE FUNCTION check_range_overlap(
    p_guild_id VARCHAR(20),
    p_channel_id VARCHAR(20),
    p_start_ts TIMESTAMP,
    p_end_ts TIMESTAMP
) RETURNS TABLE (
    overlap_count INTEGER,
    overlapping_ranges JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as overlap_count,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', id,
                'start_message_id', start_message_id,
                'end_message_id', end_message_id,
                'start_timestamp', start_timestamp,
                'end_timestamp', end_timestamp,
                'message_count', message_count,
                'created_at', created_at
            )
        ) as overlapping_ranges
    FROM history_fetch_ranges
    WHERE guild_id = p_guild_id
        AND channel_id = p_channel_id
        AND (
            (start_timestamp <= p_end_ts AND end_timestamp >= p_start_ts)
        );
END;
$$ LANGUAGE plpgsql;

-- 更新每日成員統計函數
CREATE OR REPLACE FUNCTION update_daily_member_stats(
    p_guild_id VARCHAR(20),
    p_date DATE
) RETURNS void AS $$
DECLARE
    v_joins INTEGER;
    v_leaves INTEGER;
    v_start_count INTEGER;
    v_end_count INTEGER;
BEGIN
    -- 統計當天加入和離開人數
    SELECT 
        COUNT(CASE WHEN event_type = 'join' THEN 1 END),
        COUNT(CASE WHEN event_type = 'leave' THEN 1 END)
    INTO v_joins, v_leaves
    FROM member_events
    WHERE guild_id = p_guild_id
        AND DATE(created_at) = p_date;
    
    -- 獲取當天開始和結束時的成員數
    SELECT member_count INTO v_start_count
    FROM member_events
    WHERE guild_id = p_guild_id
        AND DATE(created_at) = p_date
    ORDER BY created_at ASC
    LIMIT 1;
    
    SELECT member_count INTO v_end_count
    FROM member_events
    WHERE guild_id = p_guild_id
        AND DATE(created_at) = p_date
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- 插入或更新統計
    INSERT INTO daily_member_stats (
        guild_id, stat_date, member_count_start, member_count_end,
        joins_count, leaves_count, net_change
    ) VALUES (
        p_guild_id, p_date, 
        COALESCE(v_start_count, 0), 
        COALESCE(v_end_count, 0),
        v_joins, v_leaves, v_joins - v_leaves
    )
    ON CONFLICT (guild_id, stat_date)
    DO UPDATE SET
        member_count_start = COALESCE(v_start_count, daily_member_stats.member_count_start),
        member_count_end = COALESCE(v_end_count, daily_member_stats.member_count_end),
        joins_count = v_joins,
        leaves_count = v_leaves,
        net_change = v_joins - v_leaves;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 顯示創建結果
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'Tables:'
\echo '============================================================================'
\dt

\echo ''
\echo '============================================================================'
\echo 'Indexes:'
\echo '============================================================================'
\di

\echo ''
\echo '============================================================================'
\echo 'Views:'
\echo '============================================================================'
\dv

\echo ''
\echo '============================================================================'
\echo 'Functions:'
\echo '============================================================================'
\df check_range_overlap
\df update_daily_member_stats

\echo ''
SELECT '✅ Database schema created successfully!' as status;
\echo ''
