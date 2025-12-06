-- Webhook 訊息追蹤表（用於編輯訊息）
-- 執行: psql -U postgres -d discord_stats -f server/database/add_webhook_message_tracking.sql

-- 追蹤已發送的 Discord 訊息，用於後續編輯
CREATE TABLE IF NOT EXISTS webhook_message_tracking (
    id SERIAL PRIMARY KEY,
    endpoint_id INTEGER REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    -- 外部來源的追蹤 ID (如 Statuspage incident ID)
    source_tracking_id VARCHAR(255) NOT NULL,
    -- Discord 訊息 ID
    discord_message_id VARCHAR(50) NOT NULL,
    -- Discord 頻道 ID (從 webhook URL 解析)
    discord_channel_id VARCHAR(50),
    -- 當前狀態
    current_status VARCHAR(50),
    -- 累積的更新記錄 (JSON array)
    updates JSONB DEFAULT '[]',
    -- 時間戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_webhook_tracking_endpoint ON webhook_message_tracking(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_tracking_source ON webhook_message_tracking(source_tracking_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_tracking_unique ON webhook_message_tracking(endpoint_id, source_tracking_id);

-- 更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_webhook_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_tracking_updated ON webhook_message_tracking;
CREATE TRIGGER webhook_tracking_updated
    BEFORE UPDATE ON webhook_message_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_tracking_timestamp();

COMMENT ON TABLE webhook_message_tracking IS 'Webhook 訊息追蹤，用於編輯已發送的 Discord 訊息';
