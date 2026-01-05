-- ============================================
-- VPS 主機監控設定資料庫遷移腳本
-- 版本: 1.0
-- 說明: 創建 VPS 主機監控設定資料表
-- ============================================

-- 創建 monitoring_config 表
-- 用於儲存各類監控系統的設定（通用設計，可擴展）
CREATE TABLE IF NOT EXISTS monitoring_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,  -- 設定鍵，如 vps_memory_error_mb
  config_value TEXT NOT NULL,                -- 設定值
  config_type VARCHAR(20) DEFAULT 'string',  -- 值類型: string, number, boolean, json
  description TEXT,                          -- 設定說明
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 為 monitoring_config 創建索引
CREATE INDEX IF NOT EXISTS idx_monitoring_config_key
  ON monitoring_config(config_key);

-- 插入 VPS 監控預設設定
-- 使用 ON CONFLICT 避免重複插入
INSERT INTO monitoring_config (config_key, config_value, config_type, description) VALUES
  ('vps_monitoring_enabled', 'true', 'boolean', '是否啟用 VPS 主機監控'),
  ('vps_monitor_interval', '30000', 'number', 'VPS 監控間隔（毫秒）'),
  ('vps_memory_warn_mb', '8192', 'number', 'VPS 記憶體警告閾值（MB）'),
  ('vps_memory_error_mb', '10240', 'number', 'VPS 記憶體錯誤閾值（MB），超過會發送 Webhook'),
  ('vps_memory_percent_warn', '80', 'number', 'VPS 記憶體使用率警告閾值（%）'),
  ('vps_memory_percent_error', '90', 'number', 'VPS 記憶體使用率錯誤閾值（%）'),
  ('vps_cooldown_period', '600000', 'number', 'VPS 告警冷卻期（毫秒），預設 10 分鐘'),
  -- Webhook 通知模板設定
  ('webhook_mention_users', '[]', 'json', '通知時 tag 的用戶 ID 列表，如 ["123456789","987654321"]'),
  ('webhook_mention_roles', '[]', 'json', '通知時 tag 的角色 ID 列表，如 ["123456789"]'),
  ('webhook_custom_content', '', 'string', '自訂通知內容前綴文字'),
  ('webhook_embed_title', '', 'string', '自訂 Embed 標題，留空使用預設'),
  ('webhook_embed_footer', 'Discord 統計系統監控', 'string', '自訂 Embed 頁尾文字')
ON CONFLICT (config_key) DO NOTHING;

-- 創建更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_monitoring_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_monitoring_config_updated_at'
  ) THEN
    CREATE TRIGGER trg_monitoring_config_updated_at
      BEFORE UPDATE ON monitoring_config
      FOR EACH ROW
      EXECUTE FUNCTION update_monitoring_config_timestamp();
  END IF;
END $$;

-- 創建輔助函數：獲取設定值
CREATE OR REPLACE FUNCTION get_monitoring_config(p_key VARCHAR)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT config_value INTO v_value
  FROM monitoring_config
  WHERE config_key = p_key;

  RETURN v_value;
END;
$$ LANGUAGE plpgsql;

-- 創建輔助函數：設定值（upsert）
CREATE OR REPLACE FUNCTION set_monitoring_config(
  p_key VARCHAR,
  p_value TEXT,
  p_type VARCHAR DEFAULT 'string',
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO monitoring_config (config_key, config_value, config_type, description)
  VALUES (p_key, p_value, p_type, p_description)
  ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = COALESCE(EXCLUDED.config_type, monitoring_config.config_type),
    description = COALESCE(EXCLUDED.description, monitoring_config.description),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 創建視圖：VPS 監控設定
CREATE OR REPLACE VIEW vps_monitoring_settings AS
SELECT
  config_key,
  config_value,
  config_type,
  description,
  updated_at
FROM monitoring_config
WHERE config_key LIKE 'vps_%'
ORDER BY config_key;

-- 創建視圖：Webhook 通知模板設定
CREATE OR REPLACE VIEW webhook_template_settings AS
SELECT
  config_key,
  config_value,
  config_type,
  description,
  updated_at
FROM monitoring_config
WHERE config_key LIKE 'webhook_%'
ORDER BY config_key;

-- 添加註釋
COMMENT ON TABLE monitoring_config IS '監控系統設定儲存表';
COMMENT ON FUNCTION get_monitoring_config(VARCHAR) IS '獲取監控設定值';
COMMENT ON FUNCTION set_monitoring_config(VARCHAR, TEXT, VARCHAR, TEXT) IS '設定監控設定值（upsert）';
COMMENT ON VIEW vps_monitoring_settings IS 'VPS 監控相關設定視圖';

-- 顯示創建結果
DO $$
BEGIN
  RAISE NOTICE '✅ VPS 監控設定資料表創建完成';
  RAISE NOTICE '   - monitoring_config: 監控設定儲存表';
  RAISE NOTICE '   - vps_monitoring_settings: VPS 設定視圖';
  RAISE NOTICE '   - get_monitoring_config(): 獲取設定函數';
  RAISE NOTICE '   - set_monitoring_config(): 設定值函數';
  RAISE NOTICE '';
  RAISE NOTICE '💡 使用範例:';
  RAISE NOTICE '   - SELECT * FROM vps_monitoring_settings;';
  RAISE NOTICE '   - SELECT get_monitoring_config(''vps_memory_error_mb'');';
  RAISE NOTICE '   - SELECT set_monitoring_config(''vps_memory_error_mb'', ''12288'');';
END $$;
