-- 歷史訊息提取記錄表
-- 執行: psql -U your_username -d discord_stats -f bot/database/history_tables.sql

-- 提取任務記錄表
CREATE TABLE IF NOT EXISTS history_fetch_tasks (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    channel_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, warning
    anchor_message_id VARCHAR(20), -- 錨點訊息 ID
    start_message_id VARCHAR(20), -- 開始提取的訊息 ID
    end_message_id VARCHAR(20), -- 結束提取的訊息 ID
    messages_fetched INTEGER DEFAULT 0,
    messages_saved INTEGER DEFAULT 0,
    messages_duplicate INTEGER DEFAULT 0,
    error_message TEXT,
    started_by VARCHAR(20), -- 發起提取的用戶 ID
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

-- 顯示創建結果
\dt history_*
\dt admin_users

SELECT 'History fetch tables created successfully!' as status;
