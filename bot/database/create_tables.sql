-- Discord 統計數據庫表結構
-- 執行: psql -U your_username -d discord_stats -f bot/database/create_tables.sql

-- 用戶發言記錄表
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    message_length INTEGER,
    has_emoji BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_messages_guild_created ON messages(guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_guild ON messages(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_guild_date ON messages(guild_id, DATE(created_at));

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

-- 創建視圖：最近 30 天活動
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

-- 創建視圖：用戶排行榜
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

-- 顯示創建結果
\dt
\di
\dv

SELECT 'Database tables created successfully!' as status;
