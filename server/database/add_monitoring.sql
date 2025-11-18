-- ============================================
-- 監控系統資料庫遷移腳本
-- 版本: 1.0
-- 說明: 創建效能監控和告警系統所需的資料表
-- ============================================

-- 檢查並創建 performance_metrics 表
-- 用於儲存系統效能指標的時間序列數據
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_type VARCHAR(50) NOT NULL,  -- 指標類型: system, application, database
  metric_name VARCHAR(100) NOT NULL, -- 指標名稱: cpu_usage, memory_usage, api_requests_total 等
  metric_value NUMERIC NOT NULL,     -- 指標數值
  tags JSONB,                        -- 額外的標籤和元數據
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 為 performance_metrics 創建索引以優化查詢效能
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
  ON performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_name 
  ON performance_metrics(metric_type, metric_name);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at 
  ON performance_metrics(created_at DESC);

-- 為 JSONB 標籤創建 GIN 索引以支援快速查詢
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tags 
  ON performance_metrics USING GIN (tags);

-- 檢查並創建 alert_history 表
-- 用於儲存系統告警的歷史記錄
CREATE TABLE IF NOT EXISTS alert_history (
  id SERIAL PRIMARY KEY,
  alert_level VARCHAR(20) NOT NULL,      -- 告警級別: ERROR, WARN, INFO
  alert_message TEXT NOT NULL,           -- 告警訊息
  alert_details JSONB,                   -- 告警詳細資訊（JSON 格式）
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 告警觸發時間
  resolved_at TIMESTAMPTZ,               -- 告警解決時間（NULL 表示未解決）
  status VARCHAR(20) DEFAULT 'active',   -- 告警狀態: active, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 為 alert_history 創建索引以優化查詢效能
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at 
  ON alert_history(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_status 
  ON alert_history(status);

CREATE INDEX IF NOT EXISTS idx_alert_history_level 
  ON alert_history(alert_level);

CREATE INDEX IF NOT EXISTS idx_alert_history_created_at 
  ON alert_history(created_at DESC);

-- 為 JSONB 詳細資訊創建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_alert_history_details 
  ON alert_history USING GIN (alert_details);

-- 添加約束以確保數據完整性（使用 DO 塊處理已存在的約束）
DO $$
BEGIN
  -- 添加 alert_level 約束
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_alert_level' 
    AND conrelid = 'alert_history'::regclass
  ) THEN
    ALTER TABLE alert_history 
      ADD CONSTRAINT chk_alert_level 
      CHECK (alert_level IN ('ERROR', 'WARN', 'INFO'));
  END IF;

  -- 添加 status 約束
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_alert_status' 
    AND conrelid = 'alert_history'::regclass
  ) THEN
    ALTER TABLE alert_history 
      ADD CONSTRAINT chk_alert_status 
      CHECK (status IN ('active', 'resolved'));
  END IF;
END $$;

-- 創建視圖以便快速查詢最近的告警
CREATE OR REPLACE VIEW recent_alerts AS
SELECT 
  id,
  alert_level,
  alert_message,
  alert_details,
  triggered_at,
  resolved_at,
  status,
  EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - triggered_at)) AS duration_seconds
FROM alert_history
WHERE triggered_at > NOW() - INTERVAL '7 days'
ORDER BY triggered_at DESC;

-- 創建視圖以便查詢指標摘要
CREATE OR REPLACE VIEW metrics_summary AS
SELECT 
  metric_type,
  metric_name,
  COUNT(*) AS data_points,
  AVG(metric_value) AS avg_value,
  MIN(metric_value) AS min_value,
  MAX(metric_value) AS max_value,
  MIN(timestamp) AS first_timestamp,
  MAX(timestamp) AS last_timestamp
FROM performance_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY metric_type, metric_name
ORDER BY metric_type, metric_name;

-- 創建函數以自動清理舊數據（保留 7 天）
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- 刪除 7 天前的效能指標
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- 刪除 30 天前的已解決告警
  DELETE FROM alert_history 
  WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '30 days';
  
  -- 記錄清理操作
  RAISE NOTICE '監控數據清理完成: 已刪除 7 天前的指標和 30 天前的已解決告警';
END;
$$ LANGUAGE plpgsql;

-- 創建註釋以說明表的用途
COMMENT ON TABLE performance_metrics IS '效能監控指標時間序列數據';
COMMENT ON TABLE alert_history IS '系統告警歷史記錄';
COMMENT ON VIEW recent_alerts IS '最近 7 天的告警記錄（含持續時間）';
COMMENT ON VIEW metrics_summary IS '最近 24 小時的指標摘要統計';
COMMENT ON FUNCTION cleanup_old_monitoring_data() IS '清理舊的監控數據（保留 7 天指標，30 天已解決告警）';

-- 顯示創建結果
DO $$
BEGIN
  RAISE NOTICE '✅ 監控系統資料表創建完成';
  RAISE NOTICE '   - performance_metrics: 效能指標儲存';
  RAISE NOTICE '   - alert_history: 告警歷史記錄';
  RAISE NOTICE '   - recent_alerts: 最近告警視圖';
  RAISE NOTICE '   - metrics_summary: 指標摘要視圖';
  RAISE NOTICE '   - cleanup_old_monitoring_data(): 數據清理函數';
  RAISE NOTICE '';
  RAISE NOTICE '💡 使用建議:';
  RAISE NOTICE '   - 定期執行 SELECT cleanup_old_monitoring_data(); 清理舊數據';
  RAISE NOTICE '   - 使用 SELECT * FROM recent_alerts; 查看最近告警';
  RAISE NOTICE '   - 使用 SELECT * FROM metrics_summary; 查看指標摘要';
END $$;
