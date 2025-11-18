/**
 * 測試 MetricsCollector 的基本功能
 * 執行: node server/monitoring/test-metrics.js
 */

const MetricsCollector = require("./metricsCollector");

console.log("🧪 開始測試 MetricsCollector...\n");

// 創建實例
const collector = new MetricsCollector({
  interval: 5000, // 5 秒收集一次（測試用）
  retentionPeriod: 60000, // 保留 1 分鐘（測試用）
});

console.log("✅ MetricsCollector 實例已創建");
console.log("📊 初始狀態:", collector.getStats());

// 啟動收集
collector.start();
console.log("\n✅ 指標收集已啟動");

// 模擬一些活動
console.log("\n🔄 模擬應用程式活動...");

// 模擬 API 請求
for (let i = 0; i < 10; i++) {
  collector.incrementCounter("api_requests_total");
  collector.recordTiming("api_response_time", Math.random() * 200 + 50);
}
console.log("✅ 模擬了 10 個 API 請求");

// 模擬 Discord 事件
for (let i = 0; i < 5; i++) {
  collector.incrementCounter("discord_events_total");
  collector.incrementCounter("discord_messages_processed");
}
console.log("✅ 模擬了 5 個 Discord 事件");

// 模擬資料庫查詢
for (let i = 0; i < 8; i++) {
  collector.incrementCounter("db_queries_total");
  collector.recordTiming("db_query_time", Math.random() * 100 + 20);
}
console.log("✅ 模擬了 8 個資料庫查詢");

// 模擬一個慢速查詢
collector.incrementCounter("db_queries_total");
collector.recordTiming("db_query_time", 650);
console.log("✅ 模擬了 1 個慢速查詢 (650ms)");

// 等待一次收集週期
setTimeout(() => {
  console.log("\n📊 當前指標:");
  const current = collector.getCurrentMetrics();
  console.log(JSON.stringify(current, null, 2));

  console.log("\n📈 指標摘要:");
  const summary = collector.getMetricsSummary();
  console.log(JSON.stringify(summary, null, 2));

  console.log("\n📊 統計資訊:");
  const stats = collector.getStats();
  console.log(JSON.stringify(stats, null, 2));

  // 停止收集
  collector.stop();
  console.log("\n✅ 測試完成，MetricsCollector 已停止");

  process.exit(0);
}, 6000);
