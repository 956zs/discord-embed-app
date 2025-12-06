-- Webhook 中轉系統資料表
-- 執行: psql -U postgres -d discord_stats -f server/database/add_webhook_relay.sql

-- Webhook 端點配置表
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id SERIAL PRIMARY KEY,
    -- 唯一識別碼，用於生成接收 URL
    endpoint_key VARCHAR(64) UNIQUE NOT NULL,
    -- 名稱
    name VARCHAR(255) NOT NULL,
    -- 描述
    description TEXT,
    -- 來源類型: statuspage, github, gitlab, custom 等
    source_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    -- 目標 Discord Webhook URL
    discord_webhook_url TEXT NOT NULL,
    -- 是否啟用
    enabled BOOLEAN DEFAULT true,
    -- Guild ID (用於權限控制)
    guild_id VARCHAR(50),
    -- 創建者 User ID
    created_by VARCHAR(50),
    -- 轉換器配置 (JSON)
    transformer_config JSONB DEFAULT '{}',
    -- 統計
    total_received INTEGER DEFAULT 0,
    total_forwarded INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    last_received_at TIMESTAMP WITH TIME ZONE,
    last_forwarded_at TIMESTAMP WITH TIME ZONE,
    -- 時間戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook 接收記錄表 (用於除錯和格式探測)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    endpoint_id INTEGER REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    -- 原始請求資訊
    raw_headers JSONB,
    raw_body JSONB,
    raw_body_text TEXT,
    -- 處理結果
    status VARCHAR(20) NOT NULL, -- received, forwarded, failed, skipped
    error_message TEXT,
    -- 轉換後的 Discord payload
    transformed_payload JSONB,
    -- 時間戳
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    forwarded_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_key ON webhook_endpoints(endpoint_key);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_guild ON webhook_endpoints(guild_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_endpoint ON webhook_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

-- 自動清理舊日誌的函數 (保留 30 天)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM webhook_logs WHERE received_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_webhook_endpoints_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_endpoints_updated ON webhook_endpoints;
CREATE TRIGGER webhook_endpoints_updated
    BEFORE UPDATE ON webhook_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_endpoints_timestamp();

COMMENT ON TABLE webhook_endpoints IS 'Webhook 中轉端點配置';
COMMENT ON TABLE webhook_logs IS 'Webhook 接收和轉發記錄';
