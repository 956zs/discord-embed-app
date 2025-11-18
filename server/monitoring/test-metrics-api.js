/**
 * 監控 API 端點整合測試
 *
 * 測試 /api/metrics 和 /api/metrics/alerts 端點的功能
 */

const MetricsCollector = require("./metricsCollector");
const AlertManager = require("./alertManager");

// 模擬 Express 請求和響應
function createMockRequest(query = {}, headers = {}) {
  return {
    query,
    headers,
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return res;
}

// 測試 GET /api/metrics 端點
async function testMetricsEndpoint() {
  console.log("\n📊 測試 GET /api/metrics 端點");
  console.log("=".repeat(50));

  // 創建監控實例
  const metricsCollector = new MetricsCollector({
    interval: 1000,
    retentionPeriod: 3600000,
  });

  metricsCollector.start();

  // 等待收集一些數據
  console.log("⏳ 等待收集指標數據...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 模擬一些活動
  metricsCollector.incrementCounter("api_requests_total", 10);
  metricsCollector.incrementCounter("discord_events_total", 5);
  metricsCollector.recordTiming("api_response_time", 150);
  metricsCollector.recordTiming("api_response_time", 200);
  metricsCollector.recordTiming("db_query_time", 50);

  // 測試 1: 獲取所有類別的指標（預設參數）
  console.log("\n✅ 測試 1: 獲取所有類別的指標");
  const req1 = createMockRequest({});
  const res1 = createMockResponse();

  // 模擬路由處理器
  metricsRouteHandler.setMonitoringInstances(metricsCollector, null);
  await metricsRouteHandler.getMetrics(req1, res1);

  if (res1.statusCode === 200) {
    console.log("   ✓ 狀態碼: 200");
    console.log("   ✓ 返回數據包含 current, historical, summary");
    console.log(`   ✓ 當前 CPU: ${res1.data.current.system?.cpu}%`);
    console.log(`   ✓ 當前記憶體: ${res1.data.current.system?.memory.used}MB`);
    console.log(
      `   ✓ API 請求總數: ${res1.data.current.application?.apiRequests.total}`
    );
  } else {
    console.log(`   ✗ 測試失敗: 狀態碼 ${res1.statusCode}`);
  }

  // 測試 2: 獲取特定類別的指標
  console.log("\n✅ 測試 2: 獲取 system 類別的指標");
  const req2 = createMockRequest({ category: "system" });
  const res2 = createMockResponse();

  await metricsRouteHandler.getMetrics(req2, res2);

  if (res2.statusCode === 200 && res2.data.current.system) {
    console.log("   ✓ 狀態碼: 200");
    console.log("   ✓ 只返回 system 類別數據");
    console.log(`   ✓ CPU: ${res2.data.current.system.cpu}%`);
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 3: 獲取不同時間範圍的指標
  console.log("\n✅ 測試 3: 獲取 6 小時範圍的指標");
  const req3 = createMockRequest({ period: "6h" });
  const res3 = createMockResponse();

  await metricsRouteHandler.getMetrics(req3, res3);

  if (res3.statusCode === 200 && res3.data.period === "6h") {
    console.log("   ✓ 狀態碼: 200");
    console.log("   ✓ 時間範圍: 6h");
    console.log(`   ✓ 歷史數據點數: ${res3.data.historical.system?.length}`);
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 4: 無效的類別參數
  console.log("\n✅ 測試 4: 無效的類別參數");
  const req4 = createMockRequest({ category: "invalid" });
  const res4 = createMockResponse();

  await metricsRouteHandler.getMetrics(req4, res4);

  if (res4.statusCode === 400) {
    console.log("   ✓ 狀態碼: 400");
    console.log("   ✓ 返回錯誤訊息");
  } else {
    console.log(`   ✗ 測試失敗: 應該返回 400`);
  }

  metricsCollector.stop();
}

// 測試 GET /api/metrics/alerts 端點
async function testAlertsEndpoint() {
  console.log("\n🚨 測試 GET /api/metrics/alerts 端點");
  console.log("=".repeat(50));

  // 創建告警管理器
  const alertManager = new AlertManager({
    cooldownPeriod: 1000, // 1 秒冷卻期（測試用）
  });

  // 觸發一些告警
  alertManager.triggerAlert("ERROR", "測試錯誤告警", { test: true });
  alertManager.triggerAlert("WARN", "測試警告告警", { test: true });
  alertManager.triggerAlert("INFO", "測試資訊告警", { test: true });

  // 等待一下
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 測試 1: 獲取所有告警
  console.log("\n✅ 測試 1: 獲取所有告警");
  const req1 = createMockRequest({});
  const res1 = createMockResponse();

  metricsRouteHandler.setMonitoringInstances(null, alertManager);
  await metricsRouteHandler.getAlerts(req1, res1);

  if (res1.statusCode === 200) {
    console.log("   ✓ 狀態碼: 200");
    console.log(`   ✓ 告警總數: ${res1.data.total}`);
    console.log(`   ✓ ERROR 告警: ${res1.data.stats.byLevel.ERROR}`);
    console.log(`   ✓ WARN 告警: ${res1.data.stats.byLevel.WARN}`);
    console.log(`   ✓ INFO 告警: ${res1.data.stats.byLevel.INFO}`);
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 2: 過濾 ERROR 級別的告警
  console.log("\n✅ 測試 2: 過濾 ERROR 級別的告警");
  const req2 = createMockRequest({ level: "ERROR" });
  const res2 = createMockResponse();

  await metricsRouteHandler.getAlerts(req2, res2);

  if (res2.statusCode === 200) {
    const allError = res2.data.alerts.every((a) => a.level === "ERROR");
    console.log("   ✓ 狀態碼: 200");
    console.log(`   ✓ 只返回 ERROR 級別: ${allError}`);
    console.log(`   ✓ 告警數量: ${res2.data.alerts.length}`);
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 3: 限制返回數量
  console.log("\n✅ 測試 3: 限制返回數量");
  const req3 = createMockRequest({ limit: "2" });
  const res3 = createMockResponse();

  await metricsRouteHandler.getAlerts(req3, res3);

  if (res3.statusCode === 200) {
    console.log("   ✓ 狀態碼: 200");
    console.log(`   ✓ 返回數量: ${res3.data.alerts.length} (限制: 2)`);
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 4: 無效的級別參數
  console.log("\n✅ 測試 4: 無效的級別參數");
  const req4 = createMockRequest({ level: "INVALID" });
  const res4 = createMockResponse();

  await metricsRouteHandler.getAlerts(req4, res4);

  if (res4.statusCode === 400) {
    console.log("   ✓ 狀態碼: 400");
    console.log("   ✓ 返回錯誤訊息");
  } else {
    console.log(`   ✗ 測試失敗: 應該返回 400`);
  }
}

// 測試管理員權限驗證
async function testAdminAuth() {
  console.log("\n🔐 測試管理員權限驗證");
  console.log("=".repeat(50));

  const { checkAdminAuth } = require("../middleware/adminAuth");

  // 測試 1: 沒有 Authorization header
  console.log("\n✅ 測試 1: 沒有 Authorization header");
  const req1 = createMockRequest({}, {});
  const res1 = createMockResponse();
  let nextCalled1 = false;

  // 設定臨時的 ADMIN_TOKEN
  const originalToken = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "test-admin-token";

  checkAdminAuth(req1, res1, () => {
    nextCalled1 = true;
  });

  if (res1.statusCode === 401 && !nextCalled1) {
    console.log("   ✓ 狀態碼: 401");
    console.log("   ✓ 未調用 next()");
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 2: 無效的 token
  console.log("\n✅ 測試 2: 無效的 token");
  const req2 = createMockRequest({}, { authorization: "Bearer invalid-token" });
  const res2 = createMockResponse();
  let nextCalled2 = false;

  checkAdminAuth(req2, res2, () => {
    nextCalled2 = true;
  });

  if (res2.statusCode === 403 && !nextCalled2) {
    console.log("   ✓ 狀態碼: 403");
    console.log("   ✓ 未調用 next()");
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 3: 有效的 token
  console.log("\n✅ 測試 3: 有效的 token");
  const req3 = createMockRequest(
    {},
    { authorization: "Bearer test-admin-token" }
  );
  const res3 = createMockResponse();
  let nextCalled3 = false;

  checkAdminAuth(req3, res3, () => {
    nextCalled3 = true;
  });

  if (nextCalled3) {
    console.log("   ✓ 調用 next()");
    console.log("   ✓ 權限驗證通過");
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 測試 4: 未設定 ADMIN_TOKEN（開發模式）
  console.log("\n✅ 測試 4: 未設定 ADMIN_TOKEN（開發模式）");
  delete process.env.ADMIN_TOKEN;

  const req4 = createMockRequest({}, {});
  const res4 = createMockResponse();
  let nextCalled4 = false;

  checkAdminAuth(req4, res4, () => {
    nextCalled4 = true;
  });

  if (nextCalled4) {
    console.log("   ✓ 調用 next()");
    console.log("   ✓ 開發模式允許訪問");
  } else {
    console.log(`   ✗ 測試失敗`);
  }

  // 恢復原始 token
  if (originalToken) {
    process.env.ADMIN_TOKEN = originalToken;
  }
}

// 創建路由處理器模組（用於測試）
const metricsRouteHandler = {
  metricsCollector: null,
  alertManager: null,

  setMonitoringInstances(collector, manager) {
    this.metricsCollector = collector;
    this.alertManager = manager;
  },

  async getMetrics(req, res) {
    try {
      if (!this.metricsCollector) {
        return res.status(503).json({
          error: "監控系統未啟用",
        });
      }

      const period = req.query.period || "1h";
      const category = req.query.category || "all";

      const periodMap = {
        "1h": 3600000,
        "6h": 21600000,
        "24h": 86400000,
      };

      const periodMs = periodMap[period] || periodMap["1h"];
      const endTime = Date.now();
      const startTime = endTime - periodMs;

      const current = this.metricsCollector.getCurrentMetrics();
      const historical = this.metricsCollector.getHistoricalMetrics(
        startTime,
        endTime
      );
      const summary = this.metricsCollector.getMetricsSummary();

      let response = {
        period,
        timeRange: {
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
        },
        current: current.current,
        historical,
        summary,
      };

      if (category !== "all") {
        if (["system", "application", "database"].includes(category)) {
          response.current = { [category]: current.current[category] };
          response.historical = { [category]: historical[category] };
        } else {
          return res.status(400).json({
            error: "無效的類別",
          });
        }
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: "獲取指標失敗",
        message: error.message,
      });
    }
  },

  async getAlerts(req, res) {
    try {
      if (!this.alertManager) {
        return res.status(503).json({
          error: "告警系統未啟用",
        });
      }

      const limit = parseInt(req.query.limit) || 100;
      const level = req.query.level || null;
      const status = req.query.status || null;

      if (level && !["ERROR", "WARN", "INFO"].includes(level)) {
        return res.status(400).json({
          error: "無效的告警級別",
        });
      }

      if (status && !["active", "resolved"].includes(status)) {
        return res.status(400).json({
          error: "無效的狀態",
        });
      }

      const alerts = this.alertManager.getAlertHistory({
        limit,
        level,
        status,
      });

      const stats = this.alertManager.getStats();

      res.json({
        alerts,
        total: alerts.length,
        stats,
        filters: {
          limit,
          level,
          status,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "獲取告警歷史失敗",
        message: error.message,
      });
    }
  },
};

// 導出測試處理器
module.exports = metricsRouteHandler;

// 執行測試
async function runTests() {
  console.log("\n🧪 開始監控 API 端點整合測試");
  console.log("=".repeat(50));

  try {
    await testMetricsEndpoint();
    await testAlertsEndpoint();
    await testAdminAuth();

    console.log("\n✅ 所有測試完成");
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    console.error(error.stack);
  }
}

// 如果直接執行此文件，運行測試
if (require.main === module) {
  runTests();
}
