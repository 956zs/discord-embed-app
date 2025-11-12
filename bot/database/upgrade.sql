-- 升級現有資料庫到最新版本
-- 執行: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/upgrade.sql

\echo '開始升級資料庫...'
\echo ''

-- 1. 添加 message_id 欄位（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_id VARCHAR(20);
        RAISE NOTICE '✅ 已添加 message_id 欄位';
    ELSE
        RAISE NOTICE '⏭️  message_id 欄位已存在';
    END IF;
END $$;

-- 2. 創建唯一索引（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_messages_unique_id'
    ) THEN
        CREATE UNIQUE INDEX idx_messages_unique_id 
        ON messages(message_id) 
        WHERE message_id IS NOT NULL;
        RAISE NOTICE '✅ 已創建唯一索引 idx_messages_unique_id';
    ELSE
        RAISE NOTICE '⏭️  唯一索引已存在';
    END IF;
END $$;

-- 3. 創建一般索引（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_messages_message_id'
    ) THEN
        CREATE INDEX idx_messages_message_id 
        ON messages(message_id) 
        WHERE message_id IS NOT NULL;
        RAISE NOTICE '✅ 已創建索引 idx_messages_message_id';
    ELSE
        RAISE NOTICE '⏭️  索引已存在';
    END IF;
END $$;

-- 4. 創建歷史提取表（如果不存在）
CREATE TABLE IF NOT EXISTS history_fetch_tasks (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    channel_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    anchor_message_id VARCHAR(20),
    start_message_id VARCHAR(20),
    end_message_id VARCHAR(20),
    messages_fetched INTEGER DEFAULT 0,
    messages_saved INTEGER DEFAULT 0,
    messages_duplicate INTEGER DEFAULT 0,
    error_message TEXT,
    started_by VARCHAR(20),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    granted_by VARCHAR(20),
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
);

-- 5. 創建索引
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_guild ON history_fetch_tasks(guild_id);
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_channel ON history_fetch_tasks(channel_id);
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_status ON history_fetch_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fetch_tasks_created ON history_fetch_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fetch_ranges_guild_channel ON history_fetch_ranges(guild_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_fetch_ranges_timestamps ON history_fetch_ranges(start_timestamp, end_timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_users_guild ON admin_users(guild_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);

-- 6. 創建函數（如果不存在）
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

\echo ''
\echo '✅ 資料庫升級完成！'
\echo ''

-- 顯示 messages 表結構
\d messages
