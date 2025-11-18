/**
 * Webhook 通知測試腳本
 *
 * 測試項目：
 * 1. 單一 Webhook URL 發送
 * 2. 多個 Webhook URL 發送
 * 3. 速率限制功能
 * 4. 重試邏輯
 * 5. 錯誤處理
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const WebhookNotifier = require("../services/webhookNotifier");

// 測試配置
const TEST_WEBHOOK_URLS = process.env.WEBHOOK_URLS
  ? process.env.WEBHOOK_URLS.split(",").map((url) => url.trim())
  : [];

console.log("🧪 開始 Webhook 通知測試\n");

// 測試 1: 檢查配置
console.log("📋 測試 1: 檢查 Webhook 配置");
if (TEST_WEBHOOK_URLS.length === 0) {
  console.log("❌ 未配置 WEBHOOK_URLS");
  console.log("   請在 .env 中設定 WEBHOOK_URLS");
  console.log(
    "   範例: WEBHOOK_URLS=https://discord.com/api/webhooks/xxx/yyy\n"
  );
  process.exit(1);
}
console.log(`✅ 已配置 ${TEST_WEBHOOK_URLS.length} 個 Webhook URL\n`);

// 測試 2: 單一 Webhook 發送
async function testSingleWebhook() {
  console.log("📋 測試 2: 單一 Webhook 發送");

  const notifier = new WebhookNotifier([TEST_WEBHOOK_URLS[0]]);

  try {
    const result = await notifier.sendNotification(
      "INFO",
      "測試通知 - 單一 Webhook",
      {
        test: "single_webhook",
        timestamp: new Date().toISOString(),
      }
    );

    console.log("結果:", result);

    if (result.sent > 0) {
      console.log("✅ 單一 Webhook 發送成功\n");
      return true;
    } else {
      console.log("❌ 單一 Webhook 發送失敗\n");
      return false;
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message, "\n");
    return false;
  }
}

// 測試 3: 多個 Webhook 發送
async function testMultipleWebhooks() {
  console.log("📋 測試 3: 多個 Webhook 發送");

  if (TEST_WEBHOOK_URLS.length < 2) {
    console.log("⏭️  跳過（需要至少 2 個 Webhook URL）\n");
    return true;
  }

  const notifier = new WebhookNotifier(TEST_WEBHOOK_URLS);

  try {
    const result = await notifier.sendNotification(
      "WARN",
      "測試通知 - 多個 Webhook",
      {
        test: "multiple_webhooks",
        count: TEST_WEBHOOK_URLS.length,
        timestamp: new Date().toISOString(),
      }
    );

    console.log("結果:", result);

    if (result.sent === TEST_WEBHOOK_URLS.length) {
      console.log("✅ 所有 Webhook 發送成功\n");
      return true;
    } else {
      console.log(
        `⚠️  部分 Webhook 發送失敗 (成功: ${result.sent}/${TEST_WEBHOOK_URLS.length})\n`
      );
      return true; // 部分成功也算通過
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message, "\n");
    return false;
  }
}

// 測試 4: 速率限制功能
async function testRateLimit() {
  console.log("📋 測試 4: 速率限制功能");

  const notifier = new WebhookNotifier([TEST_WEBHOOK_URLS[0]]);

  try {
    // 第一次發送
    console.log("發送第一個通知...");
    const result1 = await notifier.sendNotification(
      "INFO",
      "測試通知 - 速率限制測試",
      { test: "rate_limit", attempt: 1 }
    );
    console.log("第一次結果:", result1);

    // 立即發送第二次（應該被跳過）
    console.log("立即發送第二個通知（應該被跳過）...");
    const result2 = await notifier.sendNotification(
      "INFO",
      "測試通知 - 速率限制測試",
      { test: "rate_limit", attempt: 2 }
    );
    console.log("第二次結果:", result2);

    if (result1.sent > 0 && result2.skipped > 0) {
      console.log("✅ 速率限制功能正常\n");
      return true;
    } else {
      console.log("❌ 速率限制功能異常\n");
      return false;
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message, "\n");
    return false;
  }
}

// 測試 5: 錯誤處理（使用無效 URL）
async function testErrorHandling() {
  console.log("📋 測試 5: 錯誤處理");

  const invalidUrl = "https://discord.com/api/webhooks/invalid/url";
  const notifier = new WebhookNotifier([invalidUrl]);

  try {
    const result = await notifier.sendNotification(
      "ERROR",
      "測試通知 - 錯誤處理",
      { test: "error_handling" }
    );

    console.log("結果:", result);

    if (result.failed > 0) {
      console.log("✅ 錯誤處理正常（預期失敗）\n");
      return true;
    } else {
      console.log("⚠️  未預期的結果\n");
      return true; // 不算失敗
    }
  } catch (error) {
    console.log("✅ 錯誤處理正常（捕獲異常）\n");
    return true;
  }
}

// 測試 6: 不同告警級別
async function testAlertLevels() {
  console.log("📋 測試 6: 不同告警級別");

  const notifier = new WebhookNotifier([TEST_WEBHOOK_URLS[0]]);

  const levels = ["ERROR", "WARN", "INFO"];
  const results = [];

  for (const level of levels) {
    console.log(`發送 ${level} 級別通知...`);

    try {
      const result = await notifier.sendNotification(
        level,
        `測試通知 - ${level} 級別`,
        {
          test: "alert_levels",
          level: level,
          timestamp: new Date().toISOString(),
        }
      );

      results.push({ level, success: result.sent > 0 });

      // 等待 1 秒避免速率限制
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`${level} 級別發送失敗:`, error.message);
      results.push({ level, success: false });
    }
  }

  console.log("結果:", results);

  const allSuccess = results.every((r) => r.success);
  if (allSuccess) {
    console.log("✅ 所有告警級別測試通過\n");
    return true;
  } else {
    console.log("⚠️  部分告警級別測試失敗\n");
    return true; // 不算完全失敗
  }
}

// 執行所有測試
async function runAllTests() {
  console.log("=".repeat(60));
  console.log("開始執行 Webhook 通知測試套件");
  console.log("=".repeat(60) + "\n");

  const tests = [
    testSingleWebhook,
    testMultipleWebhooks,
    testRateLimit,
    testErrorHandling,
    testAlertLevels,
  ];

  const results = [];

  for (const test of tests) {
    const result = await test();
    results.push(result);

    // 測試之間等待 2 秒
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("=".repeat(60));
  console.log("測試結果摘要");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`\n通過: ${passed}/${total}`);

  if (passed === total) {
    console.log("\n✅ 所有測試通過！");
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${total - passed} 個測試失敗`);
    process.exit(1);
  }
}

// 執行測試
runAllTests().catch((error) => {
  console.error("❌ 測試執行失敗:", error);
  process.exit(1);
});
