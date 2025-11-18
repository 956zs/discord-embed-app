/**
 * 資料庫遷移驗證測試
 *
 * 測試內容：
 * 1. 驗證 performance_metrics 表結構
 * 2. 驗證 alert_history 表結構
 * 3. 驗證索引的存在
 * 4. 驗證視圖的存在
 * 5. 驗證函數的存在
 */

require("dotenv").config({ path: "../.env" });
const { Pool } = require("pg");

// 創建資料庫連接池
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "discord_stats",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

// 測試結果統計
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * 執行測試並記錄結果
 */
async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`✅ ${testName}`);
    passedTests++;
    return true;
  } catch (error) {
    console.error(`❌ ${testName}`);
    console.error(`   錯誤: ${error.message}`);
    failedTests++;
    return false;
  }
}

/**
 * 測試 1: 驗證 performance_metrics 表結構
 */
async function testPerformanceMetricsTable() {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'performance_metrics'
    ORDER BY ordinal_position
  `);

  const columns = result.rows;

  // 驗證必要的欄位
  const requiredColumns = [
    { name: "id", type: "integer" },
    { name: "timestamp", type: "timestamp with time zone" },
    { name: "metric_type", type: "character varying" },
    { name: "metric_name", type: "character varying" },
    { name: "metric_value", type: "numeric" },
    { name: "tags", type: "jsonb" },
    { name: "created_at", type: "timestamp with time zone" },
  ];

  for (const required of requiredColumns) {
    const column = columns.find((c) => c.column_name === required.name);
    if (!column) {
      throw new Error(`缺少欄位: ${required.name}`);
    }
    if (!column.data_type.includes(required.type.split(" ")[0])) {
      throw new Error(
        `欄位 ${required.name} 類型錯誤: 預期 ${required.type}, 實際 ${column.data_type}`
      );
    }
  }

  if (columns.length < requiredColumns.length) {
    throw new Error(
      `表結構不完整: 預期至少 ${requiredColumns.length} 個欄位, 實際 ${columns.length} 個`
    );
  }
}

/**
 * 測試 2: 驗證 alert_history 表結構
 */
async function testAlertHistoryTable() {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'alert_history'
    ORDER BY ordinal_position
  `);

  const columns = result.rows;

  // 驗證必要的欄位
  const requiredColumns = [
    { name: "id", type: "integer" },
    { name: "alert_level", type: "character varying" },
    { name: "alert_message", type: "text" },
    { name: "alert_details", type: "jsonb" },
    { name: "triggered_at", type: "timestamp with time zone" },
    { name: "resolved_at", type: "timestamp with time zone" },
    { name: "status", type: "character varying" },
    { name: "created_at", type: "timestamp with time zone" },
  ];

  for (const required of requiredColumns) {
    const column = columns.find((c) => c.column_name === required.name);
    if (!column) {
      throw new Error(`缺少欄位: ${required.name}`);
    }
    if (!column.data_type.includes(required.type.split(" ")[0])) {
      throw new Error(
        `欄位 ${required.name} 類型錯誤: 預期 ${required.type}, 實際 ${column.data_type}`
      );
    }
  }

  if (columns.length < requiredColumns.length) {
    throw new Error(
      `表結構不完整: 預期至少 ${requiredColumns.length} 個欄位, 實際 ${columns.length} 個`
    );
  }
}

/**
 * 測試 3: 驗證 performance_metrics 索引
 */
async function testPerformanceMetricsIndexes() {
  const result = await pool.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'performance_metrics'
  `);

  const indexes = result.rows.map((r) => r.indexname);

  const requiredIndexes = [
    "idx_performance_metrics_timestamp",
    "idx_performance_metrics_type_name",
    "idx_performance_metrics_created_at",
    "idx_performance_metrics_tags",
  ];

  for (const required of requiredIndexes) {
    if (!indexes.includes(required)) {
      throw new Error(`缺少索引: ${required}`);
    }
  }
}

/**
 * 測試 4: 驗證 alert_history 索引
 */
async function testAlertHistoryIndexes() {
  const result = await pool.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'alert_history'
  `);

  const indexes = result.rows.map((r) => r.indexname);

  const requiredIndexes = [
    "idx_alert_history_triggered_at",
    "idx_alert_history_status",
    "idx_alert_history_level",
    "idx_alert_history_created_at",
    "idx_alert_history_details",
  ];

  for (const required of requiredIndexes) {
    if (!indexes.includes(required)) {
      throw new Error(`缺少索引: ${required}`);
    }
  }
}

/**
 * 測試 5: 驗證約束條件
 */
async function testConstraints() {
  const result = await pool.query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'alert_history'
      AND constraint_type = 'CHECK'
  `);

  const constraints = result.rows.map((r) => r.constraint_name);

  const requiredConstraints = ["chk_alert_level", "chk_alert_status"];

  for (const required of requiredConstraints) {
    if (!constraints.includes(required)) {
      throw new Error(`缺少約束: ${required}`);
    }
  }
}

/**
 * 測試 6: 驗證視圖
 */
async function testViews() {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name IN ('recent_alerts', 'metrics_summary')
  `);

  const views = result.rows.map((r) => r.table_name);

  const requiredViews = ["recent_alerts", "metrics_summary"];

  for (const required of requiredViews) {
    if (!views.includes(required)) {
      throw new Error(`缺少視圖: ${required}`);
    }
  }
}

/**
 * 測試 7: 驗證函數
 */
async function testFunctions() {
  const result = await pool.query(`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'cleanup_old_monitoring_data'
  `);

  if (result.rows.length === 0) {
    throw new Error("缺少函數: cleanup_old_monitoring_data");
  }
}

/**
 * 測試 8: 測試插入和查詢功能
 */
async function testInsertAndQuery() {
  // 插入測試數據
  await pool.query(`
    INSERT INTO performance_metrics (timestamp, metric_type, metric_name, metric_value, tags)
    VALUES (NOW(), 'system', 'test_metric', 100, '{"test": true}'::jsonb)
  `);

  // 查詢測試數據
  const result = await pool.query(`
    SELECT * FROM performance_metrics
    WHERE metric_name = 'test_metric'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    throw new Error("無法查詢插入的測試數據");
  }

  const row = result.rows[0];
  if (row.metric_value !== "100") {
    throw new Error(`數據不匹配: 預期 100, 實際 ${row.metric_value}`);
  }

  // 清理測試數據
  await pool.query(`
    DELETE FROM performance_metrics WHERE metric_name = 'test_metric'
  `);
}

/**
 * 測試 9: 測試告警插入和查詢
 */
async function testAlertInsertAndQuery() {
  // 插入測試告警
  await pool.query(`
    INSERT INTO alert_history (alert_level, alert_message, alert_details, status)
    VALUES ('WARN', 'Test alert', '{"test": true}'::jsonb, 'active')
  `);

  // 查詢測試告警
  const result = await pool.query(`
    SELECT * FROM alert_history
    WHERE alert_message = 'Test alert'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    throw new Error("無法查詢插入的測試告警");
  }

  const row = result.rows[0];
  if (row.alert_level !== "WARN") {
    throw new Error(`告警級別不匹配: 預期 WARN, 實際 ${row.alert_level}`);
  }

  // 清理測試數據
  await pool.query(`
    DELETE FROM alert_history WHERE alert_message = 'Test alert'
  `);
}

/**
 * 測試 10: 測試視圖查詢
 */
async function testViewQueries() {
  // 測試 recent_alerts 視圖
  const alertsResult = await pool.query(`
    SELECT * FROM recent_alerts LIMIT 1
  `);

  // 測試 metrics_summary 視圖
  const summaryResult = await pool.query(`
    SELECT * FROM metrics_summary LIMIT 1
  `);

  // 視圖應該可以查詢（即使沒有數據）
  if (!alertsResult || !summaryResult) {
    throw new Error("視圖查詢失敗");
  }
}

/**
 * 主測試函數
 */
async function runAllTests() {
  console.log("");
  console.log("========================================");
  console.log("  資料庫遷移驗證測試");
  console.log("========================================");
  console.log("");

  try {
    // 測試資料庫連接
    await pool.query("SELECT NOW()");
    console.log("✅ 資料庫連接成功");
    console.log("");

    // 執行所有測試
    await runTest(
      "測試 1: performance_metrics 表結構",
      testPerformanceMetricsTable
    );
    await runTest("測試 2: alert_history 表結構", testAlertHistoryTable);
    await runTest(
      "測試 3: performance_metrics 索引",
      testPerformanceMetricsIndexes
    );
    await runTest("測試 4: alert_history 索引", testAlertHistoryIndexes);
    await runTest("測試 5: 約束條件", testConstraints);
    await runTest("測試 6: 視圖", testViews);
    await runTest("測試 7: 函數", testFunctions);
    await runTest("測試 8: 插入和查詢功能", testInsertAndQuery);
    await runTest("測試 9: 告警插入和查詢", testAlertInsertAndQuery);
    await runTest("測試 10: 視圖查詢", testViewQueries);

    // 顯示測試結果
    console.log("");
    console.log("========================================");
    console.log("  測試結果");
    console.log("========================================");
    console.log(`總測試數: ${totalTests}`);
    console.log(`✅ 通過: ${passedTests}`);
    console.log(`❌ 失敗: ${failedTests}`);
    console.log("");

    if (failedTests === 0) {
      console.log("🎉 所有測試通過！資料庫遷移驗證成功。");
    } else {
      console.log("⚠️  部分測試失敗，請檢查資料庫遷移腳本。");
      process.exit(1);
    }
  } catch (error) {
    console.error("");
    console.error("❌ 測試執行失敗:", error.message);
    console.error("");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 執行測試
runAllTests();
