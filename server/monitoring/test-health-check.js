/**
 * 健康檢查整合測試
 *
 * 測試內容：
 * - 各個服務的健康檢查邏輯
 * - HTTP 狀態碼的正確性
 * - 健康狀態判斷邏輯
 */

const HealthCheckService = require("./healthCheck");

// 模擬資料庫連接池
class MockPool {
  constructor(shouldFail = false, shouldTimeout = false) {
    this.shouldFail = shouldFail;
    this.shouldTimeout = shouldTimeout;
    this.totalCount = 10;
    this.idleCount = 8;
    this.waitingCount = 0;
  }

  async query(sql) {
    if (this.shouldTimeout) {
      return new Promise(() => {}); // 永不解決，模擬超時
    }
    if (this.shouldFail) {
      throw new Error("資料庫連接失敗");
    }
    return { rows: [{ result: 1 }] };
  }
}

// 模擬 Discord 客戶端
class MockDiscordClient {
  constructor(status = 0, guilds = 5, ping = 45) {
    this.ws = {
      status, // 0 = READY
      ping,
    };
    this.guilds = {
      cache: {
        size: guilds,
      },
    };
    this.user = {
      id: "123456789",
      tag: "TestBot#1234",
    };
  }
}

// 模擬 MetricsCollector
class MockMetricsCollector {
  constructor() {
    this.eventLoopDelay = 2.5;
  }

  getCurrentMetrics() {
    return {
      current: {
        system: {
          cpu: 25.5,
        },
      },
      counters: {
        api_requests_total: 1500,
        api_errors_total: 5,
        discord_events_total: 3200,
        discord_messages_processed: 2800,
        db_queries_total: 2100,
        db_errors_total: 2,
      },
    };
  }
}

// 測試工具函數
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ 測試失敗: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// 測試 1: 所有服務健康
async function testAllServicesHealthy() {
  console.log("\n📋 測試 1: 所有服務健康");

  const pool = new MockPool();
  const client = new MockDiscordClient();
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(result.status === "healthy", "整體狀態應為 healthy");
  assert(
    result.services.database.status === "healthy",
    "資料庫狀態應為 healthy"
  );
  assert(
    result.services.discordBot.status === "healthy",
    "Discord Bot 狀態應為 healthy"
  );
  assert(result.services.system.status === "healthy", "系統狀態應為 healthy");
  assert(result.metrics !== null, "應包含指標摘要");
  assert(result.metrics.apiRequests === 1500, "API 請求數應為 1500");
}

// 測試 2: 資料庫連接失敗
async function testDatabaseUnhealthy() {
  console.log("\n📋 測試 2: 資料庫連接失敗");

  const pool = new MockPool(true); // 模擬失敗
  const client = new MockDiscordClient();
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(result.status === "unhealthy", "整體狀態應為 unhealthy（資料庫失敗）");
  assert(
    result.services.database.status === "unhealthy",
    "資料庫狀態應為 unhealthy"
  );
  assert(result.services.database.error !== undefined, "應包含錯誤訊息");
}

// 測試 3: Discord Bot 斷線
async function testDiscordBotDisconnected() {
  console.log("\n📋 測試 3: Discord Bot 斷線");

  const pool = new MockPool();
  const client = new MockDiscordClient(5); // 5 = DISCONNECTED
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(result.status === "unhealthy", "整體狀態應為 unhealthy（Bot 斷線）");
  assert(
    result.services.discordBot.status === "unhealthy",
    "Discord Bot 狀態應為 unhealthy"
  );
  assert(
    result.services.discordBot.websocket === "disconnected",
    "WebSocket 狀態應為 disconnected"
  );
}

// 測試 4: 系統資源降級
async function testSystemDegraded() {
  console.log("\n📋 測試 4: 系統資源降級");

  const pool = new MockPool();
  const client = new MockDiscordClient();

  // 模擬高 CPU 使用率
  const metricsCollector = new MockMetricsCollector();
  metricsCollector.getCurrentMetrics = () => ({
    current: {
      system: {
        cpu: 85, // 超過 80% 閾值
      },
    },
    counters: {
      api_requests_total: 1500,
      api_errors_total: 5,
      discord_events_total: 3200,
      discord_messages_processed: 2800,
      db_queries_total: 2100,
      db_errors_total: 2,
    },
  });

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(result.status === "degraded", "整體狀態應為 degraded（高 CPU）");
  assert(result.services.system.status === "degraded", "系統狀態應為 degraded");
  assert(result.services.system.cpu === 85, "CPU 使用率應為 85%");
}

// 測試 5: 無 Discord 客戶端
async function testNoDiscordClient() {
  console.log("\n📋 測試 5: 無 Discord 客戶端");

  const pool = new MockPool();
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client: null, // 無客戶端
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(
    result.services.discordBot.status === "unavailable",
    "Discord Bot 狀態應為 unavailable"
  );
  assert(result.services.discordBot.message !== undefined, "應包含說明訊息");
}

// 測試 6: 資料庫查詢超時
async function testDatabaseTimeout() {
  console.log("\n📋 測試 6: 資料庫查詢超時");

  const pool = new MockPool(false, true); // 模擬超時
  const client = new MockDiscordClient();
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(result.status === "unhealthy", "整體狀態應為 unhealthy（資料庫超時）");
  assert(
    result.services.database.status === "unhealthy",
    "資料庫狀態應為 unhealthy"
  );
}

// 測試 7: 連接池資訊
async function testConnectionPoolInfo() {
  console.log("\n📋 測試 7: 連接池資訊");

  const pool = new MockPool();
  const client = new MockDiscordClient();
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const result = await healthCheck.performHealthCheck();

  assert(
    result.services.database.connections !== undefined,
    "應包含連接池資訊"
  );
  assert(result.services.database.connections.total === 10, "總連接數應為 10");
  assert(result.services.database.connections.active === 2, "活躍連接數應為 2");
  assert(result.services.database.connections.idle === 8, "閒置連接數應為 8");
}

// 測試 8: 健康狀態摘要
async function testHealthSummary() {
  console.log("\n📋 測試 8: 健康狀態摘要");

  const pool = new MockPool();
  const client = new MockDiscordClient();
  const metricsCollector = new MockMetricsCollector();

  const healthCheck = new HealthCheckService({
    pool,
    client,
    metricsCollector,
    timeout: 1000,
  });

  const summary = await healthCheck.getHealthSummary();

  assert(summary.status === "healthy", "摘要狀態應為 healthy");
  assert(summary.services !== undefined, "應包含服務狀態");
  assert(summary.services.database === "healthy", "資料庫狀態應為 healthy");
  assert(
    summary.services.discordBot === "healthy",
    "Discord Bot 狀態應為 healthy"
  );
  assert(summary.services.system === "healthy", "系統狀態應為 healthy");
}

// 執行所有測試
async function runAllTests() {
  console.log("🧪 開始執行健康檢查整合測試\n");
  console.log("=".repeat(50));

  const tests = [
    testAllServicesHealthy,
    testDatabaseUnhealthy,
    testDiscordBotDisconnected,
    testSystemDegraded,
    testNoDiscordClient,
    testDatabaseTimeout,
    testConnectionPoolInfo,
    testHealthSummary,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(error.message);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 測試結果: ${passed} 通過, ${failed} 失敗`);

  if (failed === 0) {
    console.log("✅ 所有測試通過！\n");
    process.exit(0);
  } else {
    console.log("❌ 部分測試失敗\n");
    process.exit(1);
  }
}

// 執行測試
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("❌ 測試執行失敗:", error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
