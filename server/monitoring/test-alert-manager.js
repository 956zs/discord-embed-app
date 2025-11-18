/**
 * AlertManager 單元測試
 *
 * 測試內容：
 * - 閾值檢查邏輯
 * - 告警去重機制
 * - 冷卻期功能
 */

const AlertManager = require("./alertManager");

// 測試輔助函數
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ 測試失敗: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 測試套件
async function runTests() {
  console.log("🧪 開始 AlertManager 單元測試\n");

  await testThresholdChecking();
  await testAlertDeduplication();
  await testCooldownPeriod();
  await testAlertHistory();
  await testAlertResolution();

  console.log("\n✅ 所有測試通過！");
}

/**
 * 測試 1: 閾值檢查邏輯
 */
async function testThresholdChecking() {
  console.log("📋 測試 1: 閾值檢查邏輯");

  const alertManager = new AlertManager({
    thresholds: {
      cpu: { warn: 80, error: 90 },
      memory: { warn: 80, error: 90 },
    },
    cooldownPeriod: 1000, // 1 秒冷卻期（測試用）
  });

  // 測試 CPU 警告閾值
  alertManager.checkCPU(85);
  assert(alertManager.alertHistory.length === 1, "CPU 超過警告閾值應觸發告警");
  assert(
    alertManager.alertHistory[0].level === "WARN",
    "CPU 85% 應觸發 WARN 級別告警"
  );

  // 清空歷史
  alertManager.alertHistory = [];
  alertManager.cooldowns.clear();

  // 測試 CPU 錯誤閾值
  alertManager.checkCPU(95);
  assert(alertManager.alertHistory.length === 1, "CPU 超過錯誤閾值應觸發告警");
  assert(
    alertManager.alertHistory[0].level === "ERROR",
    "CPU 95% 應觸發 ERROR 級別告警"
  );

  // 清空歷史
  alertManager.alertHistory = [];
  alertManager.cooldowns.clear();

  // 測試記憶體警告閾值
  alertManager.checkMemory(85);
  assert(
    alertManager.alertHistory.length === 1,
    "記憶體超過警告閾值應觸發告警"
  );
  assert(
    alertManager.alertHistory[0].level === "WARN",
    "記憶體 85% 應觸發 WARN 級別告警"
  );

  // 清空歷史
  alertManager.alertHistory = [];
  alertManager.cooldowns.clear();

  // 測試未超過閾值
  alertManager.checkCPU(50);
  assert(alertManager.alertHistory.length === 0, "CPU 未超過閾值不應觸發告警");

  console.log("");
}

/**
 * 測試 2: 告警去重機制
 */
async function testAlertDeduplication() {
  console.log("📋 測試 2: 告警去重機制");

  const alertManager = new AlertManager({
    cooldownPeriod: 2000, // 2 秒冷卻期
  });

  // 第一次觸發告警
  const alert1 = alertManager.triggerAlert(
    "WARN",
    "測試告警",
    { value: 100 },
    "test_alert"
  );
  assert(alert1 !== undefined, "第一次觸發應成功");
  assert(alertManager.alertHistory.length === 1, "應有 1 條告警記錄");

  // 立即再次觸發相同告警（應被去重）
  const alert2 = alertManager.triggerAlert(
    "WARN",
    "測試告警",
    { value: 100 },
    "test_alert"
  );
  assert(alert2 === undefined, "冷卻期內的重複告警應被去重");
  assert(alertManager.alertHistory.length === 1, "仍應只有 1 條告警記錄");

  // 等待冷卻期結束
  await sleep(2100);

  // 冷卻期後再次觸發（應成功）
  const alert3 = alertManager.triggerAlert(
    "WARN",
    "測試告警",
    { value: 100 },
    "test_alert"
  );
  assert(alert3 !== undefined, "冷卻期後應可再次觸發");
  assert(alertManager.alertHistory.length === 2, "應有 2 條告警記錄");

  console.log("");
}

/**
 * 測試 3: 冷卻期功能
 */
async function testCooldownPeriod() {
  console.log("📋 測試 3: 冷卻期功能");

  const alertManager = new AlertManager({
    cooldownPeriod: 1000, // 1 秒冷卻期
  });

  const alertKey = "cooldown_test";

  // 檢查初始狀態
  assert(!alertManager.isInCooldown(alertKey), "初始狀態不應在冷卻期");

  // 設定冷卻期
  alertManager.setCooldown(alertKey);
  assert(alertManager.isInCooldown(alertKey), "設定後應在冷卻期");

  // 等待冷卻期結束
  await sleep(1100);
  assert(!alertManager.isInCooldown(alertKey), "冷卻期結束後應可再次觸發");

  console.log("");
}

/**
 * 測試 4: 告警歷史查詢
 */
async function testAlertHistory() {
  console.log("📋 測試 4: 告警歷史查詢");

  const alertManager = new AlertManager({
    cooldownPeriod: 100, // 短冷卻期以便快速測試
  });

  // 創建多個不同級別的告警
  alertManager.triggerAlert("ERROR", "錯誤告警 1", {}, "error1");
  await sleep(150);
  alertManager.triggerAlert("WARN", "警告告警 1", {}, "warn1");
  await sleep(150);
  alertManager.triggerAlert("ERROR", "錯誤告警 2", {}, "error2");
  await sleep(150);
  alertManager.triggerAlert("INFO", "資訊告警 1", {}, "info1");

  // 測試獲取所有告警
  const allAlerts = alertManager.getAlertHistory();
  assert(allAlerts.length === 4, "應有 4 條告警記錄");

  // 測試按級別過濾
  const errorAlerts = alertManager.getAlertHistory({ level: "ERROR" });
  assert(errorAlerts.length === 2, "應有 2 條 ERROR 級別告警");

  const warnAlerts = alertManager.getAlertHistory({ level: "WARN" });
  assert(warnAlerts.length === 1, "應有 1 條 WARN 級別告警");

  // 測試限制數量
  const limitedAlerts = alertManager.getAlertHistory({ limit: 2 });
  assert(limitedAlerts.length === 2, "應只返回 2 條告警");

  // 測試按狀態過濾
  const activeAlerts = alertManager.getAlertHistory({ status: "active" });
  assert(activeAlerts.length === 4, "所有告警應為 active 狀態");

  console.log("");
}

/**
 * 測試 5: 告警解決
 */
async function testAlertResolution() {
  console.log("📋 測試 5: 告警解決");

  const alertManager = new AlertManager();

  // 創建告警
  const alert = alertManager.triggerAlert(
    "WARN",
    "測試告警",
    {},
    "resolution_test"
  );
  assert(alert.status === "active", "新告警應為 active 狀態");

  // 解決告警
  alertManager.resolveAlert(alert.id);
  const resolvedAlert = alertManager.alertHistory.find(
    (a) => a.id === alert.id
  );
  assert(resolvedAlert.status === "resolved", "告警應被標記為 resolved");
  assert(resolvedAlert.resolvedAt !== undefined, "應有解決時間");

  // 測試按狀態過濾
  const activeAlerts = alertManager.getAlertHistory({ status: "active" });
  assert(activeAlerts.length === 0, "不應有 active 狀態的告警");

  const resolvedAlerts = alertManager.getAlertHistory({ status: "resolved" });
  assert(resolvedAlerts.length === 1, "應有 1 條 resolved 狀態的告警");

  console.log("");
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
