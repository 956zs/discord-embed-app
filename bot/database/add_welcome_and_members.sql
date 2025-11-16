-- ============================================================================
-- 歡迎訊息系統與成員統計功能
-- ============================================================================
-- 此腳本添加以下功能：
-- 1. 歡迎訊息配置表
-- 2. 成員變化記錄表
-- 3. 每日成員統計表
-- 執行方式:
--   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_welcome_and_members.sql
-- ============================================================================

-- ============================================================================
-- 歡迎訊息配置表
-- ============================================================================
CREATE TABLE IF NOT EXISTS welcome_config (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    channel_id VARCHAR(20),                    -- 發送歡迎訊息的頻道 ID
    message_template TEXT,                     -- 歡迎訊息模板
    -- 可用變數: {user}, {username}, {server}, {memberCount}
    embed_enabled BOOLEAN DEFAULT false,       -- 是否使用 Embed 格式
    embed_color VARCHAR(7) DEFAULT '#5865F2',  -- Embed 顏色（十六進制）
    embed_title TEXT,                          -- Embed 標題
    embed_description TEXT,                    -- Embed 描述
    embed_footer TEXT,                         -- Embed 頁腳
    embed_thumbnail BOOLEAN DEFAULT true,      -- 是否顯示用戶頭像
    dm_enabled BOOLEAN DEFAULT false,          -- 是否發送私訊
    dm_message TEXT,                           -- 私訊內容
    autorole_enabled BOOLEAN DEFAULT false,    -- 是否自動給予身分組
    autorole_ids TEXT[],                       -- 自動給予的身分組 ID 列表
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 為 guild_id 創建索引
CREATE INDEX IF NOT EXISTS idx_welcome_config_guild ON welcome_config(guild_id);

-- ============================================================================
-- 成員變化記錄表
-- ============================================================================
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

-- ============================================================================
-- 每日成員統計表
-- ============================================================================
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
-- 視圖：成員變化趨勢
-- ============================================================================
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
-- 函數：更新每日成員統計
-- ============================================================================
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
\echo 'New Tables:'
\echo '============================================================================'
\dt welcome_config
\dt member_events
\dt daily_member_stats

\echo ''
\echo '============================================================================'
\echo 'New View:'
\echo '============================================================================'
\dv v_member_trends

\echo ''
\echo '============================================================================'
\echo 'New Function:'
\echo '============================================================================'
\df update_daily_member_stats

\echo ''
SELECT '✅ Welcome system and member stats schema created successfully!' as status;
\echo ''
