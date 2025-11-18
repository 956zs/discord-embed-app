/**
 * 測試監控中介軟體的整合功能
 * 執行: node server/monitoring/test-monitoring-middleware.js
 */

const express = require("express");
const request = require("supertest");
const MetricsCollector = require("./metricsCollector");
const AlertManager = require("./alertManager");
const createMonitoringMiddleware = require("../middleware/monitoring");

// 測試套件
async function runTests() {
  console.log("🧪 開始監控中介軟體整合測試\n");

  await testRequestTracking();
  await testResponseTimeMeasurement();
  await testErrorTracking();
  await testSlowRequestAlert();
  await testMultipleRequests();

  console.log("\n✅ 所有測試通過！");
}

/**
 * 測試 1: 請求追蹤的正確性
 */
async function testRequestTracking() {
  console.log("📋 測試 1: 請求追蹤的正確性");

  const metricsCollector = new MetricsCollector();
  const app = express();

  app.use(createMonitoringMiddleware(metricsCollector));
  app.get("/test", (req, res) => {
    res.json({ message: "ok" });
  });

  // 初始計數器應為 0
  const initialCount = metricsCollector.counters.api_requests_total;
  console.log(`  初始請求計數: ${initialCount}`);

  // 發送請求
  await request(app).get("/test").expect(200);

  // 檢查計數器是否增加
  const finalCount = metricsCollector.counters.api_requests_total;
  console.log(`  最終請求計數: ${finalCount}`);

  if (finalCount !== initialCount + 1) {
    throw new Error(
      `請求計數不正確: 預期 ${initialCount + 1}, 實際 ${finalCount}`
    );
  }

  console.log("  ✅ 請求追蹤正確\n");
}

/**
 * 測試 2: 響應時間測量
 */
async function testResponseTimeMeasurement() {
  console.log("📋 測試 2: 響應時間測量");

  const metricsCollector = new MetricsCollector();
  const app = express();

  app.use(createMonitoringMiddleware(metricsCollector));
  app.get("/slow", async (req, res) => {
    // 模擬慢速響應（100ms）
    await new Promise((resolve) => setTimeout(resolve, 100));
    res.json({ message: "slow response" });
  });

  // 初始計時記錄數量
  const initialTimings = metricsCollector.timings.api_response_times.length;
  console.log(`  初始計時記錄數: ${initialTimings}`);

  // 發送請求
  await request(app).get("/slow").expect(200);

  // 檢查計時記錄是否增加
  const finalTimings = metricsCollector.timings.api_response_times.length;
  console.log(`  最終計時記錄數: ${finalTimings}`);

  if (finalTimings !== initialTimings + 1) {
    throw new Error(
      `計時記錄數不正確: 預期 ${initialTimings + 1}, 實際 ${finalTimings}`
    );
  }

  // 檢查響應時間是否合理（應該 >= 100ms）
  const lastTiming =
    metricsCollector.timings.api_response_times[finalTimings - 1];
  console.log(`  測量的響應時間: ${lastTiming.value}ms`);

  if (lastTiming.value < 100) {
    throw new Error(
      `響應時間測量不正確: 預期 >= 100ms, 實際 ${lastTiming.value}ms`
    );
  }

  console.log("  ✅ 響應時間測量正確\n");
}

/**
 * 測試 3: 錯誤追蹤
 */
async function testErrorTracking() {
  console.log("📋 測試 3: 錯誤追蹤");

  const metricsCollector = new MetricsCollector();
  const app = express();

  app.use(createMonitoringMiddleware(metricsCollector));
  app.get("/error", (req, res) => {
    res.status(500).json({ error: "Internal Server Error" });
  });
  app.get("/not-found", (req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  // 初始錯誤計數
  const initialErrors = metricsCollector.counters.api_errors_total;
  console.log(`  初始錯誤計數: ${initialErrors}`);

  // 發送 500 錯誤請求
  await request(app).get("/error").expect(500);

  // 發送 404 錯誤請求
  await request(app).get("/not-found").expect(404);

  // 檢查錯誤計數是否增加
  const finalErrors = metricsCollector.counters.api_errors_total;
  console.log(`  最終錯誤計數: ${finalErrors}`);

  if (finalErrors !== initialErrors + 2) {
    throw new Error(
      `錯誤計數不正確: 預期 ${initialErrors + 2}, 實際 ${finalErrors}`
    );
  }

  console.log("  ✅ 錯誤追蹤正確\n");
}

/**
 * 測試 4: 慢速請求告警
 */
async function testSlowRequestAlert() {
  console.log("📋 測試 4: 慢速請求告警");

  const metricsCollector = new MetricsCollector();
  const alertManager = new AlertManager({
    cooldownPeriod: 1000, // 1 秒冷卻期（測試用）
  });

  const app = express();

  app.use(createMonitoringMiddleware(metricsCollector, alertManager));
  app.get("/very-slow", async (req, res) => {
    // 模擬非常慢的響應（1.5 秒）
    await new Promise((resolve) => setTimeout(resolve, 1500));
    res.json({ message: "very slow response" });
  });

  // 初始告警數量
  const initialAlerts = alertManager.alertHistory.length;
  console.log(`  初始告警數量: ${initialAlerts}`);

  // 發送慢速請求
  await request(app).get("/very-slow").expect(200);

  // 檢查是否觸發告警
  const finalAlerts = alertManager.alertHistory.length;
  console.log(`  最終告警數量: ${finalAlerts}`);

  if (finalAlerts <= initialAlerts) {
    throw new Error("慢速請求未觸發告警");
  }

  // 檢查告警內容
  const lastAlert = alertManager.alertHistory[finalAlerts - 1];
  console.log(`  告警級別: ${lastAlert.level}`);
  console.log(`  告警訊息: ${lastAlert.message}`);
  console.log(`  響應時間: ${lastAlert.details.duration}ms`);

  if (lastAlert.level !== "WARN" && lastAlert.level !== "ERROR") {
    throw new Error(`告警級別不正確: ${lastAlert.level}`);
  }

  if (lastAlert.details.duration < 1500) {
    throw new Error(`告警中的響應時間不正確: ${lastAlert.details.duration}ms`);
  }

  console.log("  ✅ 慢速請求告警正確\n");
}

/**
 * 測試 5: 多個請求的追蹤
 */
async function testMultipleRequests() {
  console.log("📋 測試 5: 多個請求的追蹤");

  const metricsCollector = new MetricsCollector();
  const app = express();

  app.use(createMonitoringMiddleware(metricsCollector));
  app.get("/test1", (req, res) => res.json({ id: 1 }));
  app.get("/test2", (req, res) => res.json({ id: 2 }));
  app.get("/test3", (req, res) => res.json({ id: 3 }));

  // 初始計數
  const initialCount = metricsCollector.counters.api_requests_total;
  console.log(`  初始請求計數: ${initialCount}`);

  // 發送多個請求
  await Promise.all([
    request(app).get("/test1").expect(200),
    request(app).get("/test2").expect(200),
    request(app).get("/test3").expect(200),
  ]);

  // 檢查計數
  const finalCount = metricsCollector.counters.api_requests_total;
  console.log(`  最終請求計數: ${finalCount}`);

  if (finalCount !== initialCount + 3) {
    throw new Error(
      `請求計數不正確: 預期 ${initialCount + 3}, 實際 ${finalCount}`
    );
  }

  // 檢查計時記錄
  const timings = metricsCollector.timings.api_response_times.length;
  console.log(`  計時記錄數: ${timings}`);

  if (timings < 3) {
    throw new Error(`計時記錄數不足: 預期 >= 3, 實際 ${timings}`);
  }

  console.log("  ✅ 多個請求追蹤正確\n");
}

/**
 * 測試 6: 無 MetricsCollector 的情況
 */
async function testNoMetricsCollector() {
  console.log("📋 測試 6: 無 MetricsCollector 的情況");

  const app = express();

  // 不提供 MetricsCollector
  app.use(createMonitoringMiddleware(null));
  app.get("/test", (req, res) => {
    res.json({ message: "ok" });
  });

  // 應該正常運行，不會拋出錯誤
  await request(app).get("/test").expect(200);

  console.log("  ✅ 無 MetricsCollector 時中介軟體正常運行\n");
}

// 執行測試
if (require.main === module) {
  runTests()
    .then(() => {
      console.log("\n🎉 測試完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 測試失敗:", error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { runTests };
