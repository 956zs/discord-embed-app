const express = require("express");
const router = express.Router();
const {
  checkAdminAuth,
  optionalAdminAuth,
} = require("../middleware/adminAuth");

// 監控系統實例（將由 server/index.js 設定）
let metricsCollector = null;
let alertManager = null;

/**
 * 設定監控系統實例
 */
function setMonitoringInstances(collector, manager) {
  metricsCollector = collector;
  alertManager = manager;
}

/**
 * GET /api/metrics
 * 獲取效能指標
 *
 * Query Parameters:
 * - period: 時間範圍 (1h, 6h, 24h) - 預設 1h
 * - category: 指標類別 (system, application, database, all) - 預設 all
 *
 * 需要管理員權限
 */
router.get("/", checkAdminAuth, (req, res) => {
  try {
    // 檢查監控系統是否啟用
    if (!metricsCollector) {
      return res.status(503).json({
        error: "監控系統未啟用",
        message: "請在 .env 中設定 ENABLE_MONITORING=true",
      });
    }

    // 解析查詢參數
    const period = req.query.period || "1h";
    const category = req.query.category || "all";

    // 計算時間範圍
    const periodMap = {
      "1h": 3600000, // 1 小時
      "6h": 21600000, // 6 小時
      "24h": 86400000, // 24 小時
    };

    const periodMs = periodMap[period] || periodMap["1h"];
    const endTime = Date.now();
    const startTime = endTime - periodMs;

    // 獲取當前指標
    const current = metricsCollector.getCurrentMetrics();

    // 獲取歷史指標
    const historical = metricsCollector.getHistoricalMetrics(
      startTime,
      endTime
    );

    // 獲取指標摘要
    const summary = metricsCollector.getMetricsSummary();

    // 根據類別過濾數據
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

    // 如果指定了特定類別，只返回該類別的數據
    if (category !== "all") {
      if (["system", "application", "database"].includes(category)) {
        response.current = { [category]: current.current[category] };
        response.historical = { [category]: historical[category] };
      } else {
        return res.status(400).json({
          error: "無效的類別",
          message: "類別必須是 system, application, database 或 all",
        });
      }
    }

    res.json(response);
  } catch (error) {
    console.error("❌ 獲取指標失敗:", error.message);
    res.status(500).json({
      error: "獲取指標失敗",
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/alerts
 * 獲取告警歷史
 *
 * Query Parameters:
 * - limit: 返回數量 - 預設 100
 * - level: 告警級別過濾 (ERROR, WARN, INFO)
 * - status: 狀態過濾 (active, resolved)
 *
 * 需要管理員權限
 */
router.get("/alerts", checkAdminAuth, (req, res) => {
  try {
    // 檢查告警系統是否啟用
    if (!alertManager) {
      return res.status(503).json({
        error: "告警系統未啟用",
        message: "請在 .env 中設定 ENABLE_MONITORING=true",
      });
    }

    // 解析查詢參數
    const limit = parseInt(req.query.limit) || 100;
    const level = req.query.level || null;
    const status = req.query.status || null;

    // 驗證參數
    if (level && !["ERROR", "WARN", "INFO"].includes(level)) {
      return res.status(400).json({
        error: "無效的告警級別",
        message: "級別必須是 ERROR, WARN 或 INFO",
      });
    }

    if (status && !["active", "resolved"].includes(status)) {
      return res.status(400).json({
        error: "無效的狀態",
        message: "狀態必須是 active 或 resolved",
      });
    }

    // 獲取告警歷史
    const alerts = alertManager.getAlertHistory({
      limit,
      level,
      status,
    });

    // 獲取統計資訊
    const stats = alertManager.getStats();

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
    console.error("❌ 獲取告警歷史失敗:", error.message);
    res.status(500).json({
      error: "獲取告警歷史失敗",
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/summary
 * 獲取監控系統摘要資訊
 *
 * 需要管理員權限
 */
router.get("/summary", checkAdminAuth, (req, res) => {
  try {
    if (!metricsCollector || !alertManager) {
      return res.status(503).json({
        error: "監控系統未啟用",
      });
    }

    const metricsStats = metricsCollector.getStats();
    const alertStats = alertManager.getStats();
    const summary = metricsCollector.getMetricsSummary();

    res.json({
      metrics: metricsStats,
      alerts: alertStats,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 獲取摘要失敗:", error.message);
    res.status(500).json({
      error: "獲取摘要失敗",
      message: error.message,
    });
  }
});

/**
 * POST /api/metrics/webhook/test
 * 測試 Webhook 通知
 *
 * Request Body:
 * - level: 告警級別 (ERROR, WARN, INFO) - 預設 WARN
 * - message: 測試訊息 - 預設 "測試告警"
 * - details: 詳細資訊 - 可選
 *
 * 需要管理員權限
 */
router.post("/webhook/test", checkAdminAuth, async (req, res) => {
  try {
    // 檢查告警系統是否啟用
    if (!alertManager) {
      return res.status(503).json({
        error: "告警系統未啟用",
        message: "請在 .env 中設定 ENABLE_MONITORING=true",
      });
    }

    // 檢查是否配置了 Webhook
    if (!alertManager.webhookNotifier) {
      return res.status(400).json({
        error: "Webhook 未配置",
        message: "請在 .env 中設定 WEBHOOK_URLS",
      });
    }

    // 檢查是否有 Webhook URL
    const webhookCount = alertManager.webhookNotifier.getWebhookCount();
    if (webhookCount === 0) {
      return res.status(400).json({
        error: "Webhook URL 未配置",
        message: "請在 .env 中設定 WEBHOOK_URLS",
      });
    }

    // 解析請求參數
    const level = req.body.level || "WARN";
    const message = req.body.message || "測試告警";
    const details = req.body.details || {
      test: true,
      timestamp: new Date().toISOString(),
      source: "webhook_test_endpoint",
    };

    // 驗證告警級別
    if (!["ERROR", "WARN", "INFO"].includes(level)) {
      return res.status(400).json({
        error: "無效的告警級別",
        message: "級別必須是 ERROR, WARN 或 INFO",
      });
    }

    console.log(`🧪 測試 Webhook 通知: ${level} - ${message}`);

    // 發送測試通知
    const result = await alertManager.webhookNotifier.sendNotification(
      level,
      message,
      details
    );

    // 返回結果
    res.json({
      success: result.sent > 0,
      result: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
      webhookCount,
      message:
        result.sent > 0
          ? `成功發送 ${result.sent} 個 Webhook 通知`
          : result.skipped > 0
          ? `${result.skipped} 個 Webhook 在冷卻期內被跳過`
          : `發送失敗: ${result.failed} 個 Webhook`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 測試 Webhook 失敗:", error.message);
    res.status(500).json({
      error: "測試 Webhook 失敗",
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/config
 * 取得監控系統設定
 *
 * 需要管理員權限
 */
router.get("/config", checkAdminAuth, (req, res) => {
  try {
    if (!alertManager) {
      return res.status(503).json({
        error: "告警系統未啟用",
      });
    }

    const config = alertManager.getConfig();
    res.json({
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 取得設定失敗:", error.message);
    res.status(500).json({
      error: "取得設定失敗",
      message: error.message,
    });
  }
});

/**
 * PUT /api/metrics/config/slow-request
 * 更新慢速請求警告設定
 *
 * Request Body:
 * - enabled: boolean - 是否啟用慢速請求警告
 * - warnThreshold: number - 警告閾值（毫秒）
 * - errorThreshold: number - 錯誤閾值（毫秒）
 *
 * 需要管理員權限
 */
router.put("/config/slow-request", checkAdminAuth, (req, res) => {
  try {
    if (!alertManager) {
      return res.status(503).json({
        error: "告警系統未啟用",
      });
    }

    const { enabled, warnThreshold, errorThreshold } = req.body;

    // 驗證參數
    if (
      warnThreshold !== undefined &&
      (typeof warnThreshold !== "number" || warnThreshold < 0)
    ) {
      return res.status(400).json({
        error: "無效的 warnThreshold",
        message: "warnThreshold 必須是正數",
      });
    }

    if (
      errorThreshold !== undefined &&
      (typeof errorThreshold !== "number" || errorThreshold < 0)
    ) {
      return res.status(400).json({
        error: "無效的 errorThreshold",
        message: "errorThreshold 必須是正數",
      });
    }

    if (warnThreshold && errorThreshold && warnThreshold >= errorThreshold) {
      return res.status(400).json({
        error: "無效的閾值設定",
        message: "warnThreshold 必須小於 errorThreshold",
      });
    }

    const updatedConfig = alertManager.updateSlowRequestConfig({
      enabled,
      warnThreshold,
      errorThreshold,
    });

    res.json({
      success: true,
      config: updatedConfig,
      message: "慢速請求設定已更新",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 更新設定失敗:", error.message);
    res.status(500).json({
      error: "更新設定失敗",
      message: error.message,
    });
  }
});

module.exports = router;
module.exports.setMonitoringInstances = setMonitoringInstances;
