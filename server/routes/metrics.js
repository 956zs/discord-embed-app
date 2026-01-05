const express = require("express");
const router = express.Router();
const {
  checkAdminAuth,
  optionalAdminAuth,
} = require("../middleware/adminAuth");

// 監控系統實例（將由 server/index.js 設定）
let metricsCollector = null;
let alertManager = null;
let vpsMonitor = null;
let webhookNotifier = null;

/**
 * 設定監控系統實例
 */
function setMonitoringInstances(collector, manager) {
  metricsCollector = collector;
  alertManager = manager;
}

/**
 * 設定 VPS 監控實例
 */
function setVpsMonitor(monitor) {
  vpsMonitor = monitor;
}

/**
 * 設定 Webhook 通知器實例
 */
function setWebhookNotifier(notifier) {
  webhookNotifier = notifier;
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

// ============================================================================
// VPS 主機監控 API 端點
// ============================================================================

/**
 * GET /api/metrics/vps
 * 獲取 VPS 主機監控指標
 *
 * 需要管理員權限
 */
router.get("/vps", checkAdminAuth, (req, res) => {
  try {
    if (!vpsMonitor) {
      return res.status(503).json({
        error: "VPS 監控系統未啟用",
        message: "請在 .env 中設定 ENABLE_VPS_MONITORING=true",
      });
    }

    const currentMetrics = vpsMonitor.getCurrentMetrics();
    const history = vpsMonitor.getMetricsHistory();
    const stats = vpsMonitor.getStats();

    // 檢查是否有數據（監控剛啟動時可能尚未收集）
    if (!currentMetrics) {
      // 統一處理：即使 current 為 null，也獲取其他可用數據
      return res.json({
        current: null,
        history: history || [],
        stats: stats || null,
        status: "collecting",
        message: "VPS 監控數據收集中，請稍後重試",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      current: currentMetrics,
      history,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 獲取 VPS 指標失敗:", error.message);
    res.status(500).json({
      error: "獲取 VPS 指標失敗",
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/vps/alerts
 * 獲取 VPS 監控告警歷史
 *
 * Query Parameters:
 * - limit: 返回數量 - 預設 50
 * - level: 告警級別過濾 (ERROR, WARN)
 *
 * 需要管理員權限
 */
router.get("/vps/alerts", checkAdminAuth, (req, res) => {
  try {
    if (!vpsMonitor) {
      return res.status(503).json({
        error: "VPS 監控系統未啟用",
        message: "請在 .env 中設定 ENABLE_VPS_MONITORING=true",
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const level = req.query.level || null;

    const alerts = vpsMonitor.getAlertHistory({ limit, level });

    res.json({
      alerts,
      total: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 獲取 VPS 告警歷史失敗:", error.message);
    res.status(500).json({
      error: "獲取 VPS 告警歷史失敗",
      message: error.message,
    });
  }
});

/**
 * GET /api/metrics/vps/config
 * 獲取 VPS 監控設定
 *
 * 需要管理員權限
 */
router.get("/vps/config", checkAdminAuth, (req, res) => {
  try {
    if (!vpsMonitor) {
      return res.status(503).json({
        error: "VPS 監控系統未啟用",
        message: "請在 .env 中設定 ENABLE_VPS_MONITORING=true",
      });
    }

    const config = vpsMonitor.getConfig();

    res.json({
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 獲取 VPS 設定失敗:", error.message);
    res.status(500).json({
      error: "獲取 VPS 設定失敗",
      message: error.message,
    });
  }
});

/**
 * PUT /api/metrics/vps/config
 * 更新 VPS 監控閾值設定
 *
 * Request Body:
 * - memoryWarnMB: number - 記憶體警告閾值 (MB)
 * - memoryErrorMB: number - 記憶體錯誤閾值 (MB)
 * - memoryPercentWarn: number - 記憶體使用率警告閾值 (%)
 * - memoryPercentError: number - 記憶體使用率錯誤閾值 (%)
 *
 * 需要管理員權限
 */
router.put("/vps/config", checkAdminAuth, async (req, res) => {
  try {
    if (!vpsMonitor) {
      return res.status(503).json({
        error: "VPS 監控系統未啟用",
        message: "請在 .env 中設定 ENABLE_VPS_MONITORING=true",
      });
    }

    const { memoryWarnMB, memoryErrorMB, memoryPercentWarn, memoryPercentError } = req.body;

    // 驗證參數
    if (memoryWarnMB !== undefined && (typeof memoryWarnMB !== "number" || memoryWarnMB <= 0)) {
      return res.status(400).json({
        error: "無效的 memoryWarnMB",
        message: "memoryWarnMB 必須是正數",
      });
    }

    if (memoryErrorMB !== undefined && (typeof memoryErrorMB !== "number" || memoryErrorMB <= 0)) {
      return res.status(400).json({
        error: "無效的 memoryErrorMB",
        message: "memoryErrorMB 必須是正數",
      });
    }

    if (memoryWarnMB && memoryErrorMB && memoryWarnMB >= memoryErrorMB) {
      return res.status(400).json({
        error: "無效的閾值設定",
        message: "memoryWarnMB 必須小於 memoryErrorMB",
      });
    }

    // 驗證百分比參數（0-100 範圍）
    if (memoryPercentWarn !== undefined) {
      if (typeof memoryPercentWarn !== "number" || memoryPercentWarn < 0 || memoryPercentWarn > 100) {
        return res.status(400).json({
          error: "無效的 memoryPercentWarn",
          message: "memoryPercentWarn 必須是 0-100 之間的數字",
        });
      }
    }

    if (memoryPercentError !== undefined) {
      if (typeof memoryPercentError !== "number" || memoryPercentError < 0 || memoryPercentError > 100) {
        return res.status(400).json({
          error: "無效的 memoryPercentError",
          message: "memoryPercentError 必須是 0-100 之間的數字",
        });
      }
    }

    // 驗證百分比閾值關係（warn < error）
    const currentConfig = vpsMonitor.getConfig();
    const finalPercentWarn = memoryPercentWarn ?? currentConfig.memoryPercentWarn;
    const finalPercentError = memoryPercentError ?? currentConfig.memoryPercentError;
    if (finalPercentWarn >= finalPercentError) {
      return res.status(400).json({
        error: "無效的百分比閾值設定",
        message: "memoryPercentWarn 必須小於 memoryPercentError",
      });
    }

    // 更新閾值（會同時儲存到資料庫）
    const saved = await vpsMonitor.updateThresholds({
      memoryWarnMB,
      memoryErrorMB,
      memoryPercentWarn,
      memoryPercentError,
    });

    const config = vpsMonitor.getConfig();

    res.json({
      success: true,
      savedToDatabase: saved,
      config,
      message: saved ? "VPS 監控閾值已更新並儲存到資料庫" : "VPS 監控閾值已更新（資料庫儲存失敗）",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 更新 VPS 設定失敗:", error.message);
    res.status(500).json({
      error: "更新 VPS 設定失敗",
      message: error.message,
    });
  }
});

/**
 * POST /api/metrics/vps/webhook/test
 * 測試 VPS 監控 Webhook 通知
 *
 * 需要管理員權限
 */
router.post("/vps/webhook/test", checkAdminAuth, async (req, res) => {
  try {
    if (!vpsMonitor) {
      return res.status(503).json({
        error: "VPS 監控系統未啟用",
        message: "請在 .env 中設定 ENABLE_VPS_MONITORING=true",
      });
    }

    // 使用封裝的方法發送測試通知
    const testResult = await vpsMonitor.sendTestNotification();

    if (!testResult.success && testResult.error === "Webhook 通知器未配置") {
      return res.status(400).json({
        error: "VPS 監控 Webhook 未配置",
        message: "請在 .env 中設定 WEBHOOK_URLS",
      });
    }

    res.json({
      success: testResult.success,
      result: testResult.result,
      currentMetrics: testResult.currentMetrics,
      message: testResult.success
        ? "成功發送 VPS 監控測試通知"
        : testResult.result?.skipped > 0
        ? "通知在冷卻期內被跳過"
        : testResult.error || "發送失敗",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 測試 VPS Webhook 失敗:", error.message);
    res.status(500).json({
      error: "測試 VPS Webhook 失敗",
      message: error.message,
    });
  }
});

// ============================================================================
// Webhook 通知模板 API 端點
// ============================================================================

/**
 * GET /api/metrics/webhook/template
 * 獲取 Webhook 通知模板設定
 *
 * 需要管理員權限
 */
router.get("/webhook/template", checkAdminAuth, (req, res) => {
  try {
    if (!webhookNotifier) {
      return res.status(503).json({
        error: "Webhook 通知系統未啟用",
        message: "請在 .env 中設定 WEBHOOK_ENABLED=true 和 WEBHOOK_URLS",
      });
    }

    const template = webhookNotifier.getTemplate();

    res.json({
      template,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 獲取 Webhook 模板失敗:", error.message);
    res.status(500).json({
      error: "獲取 Webhook 模板失敗",
      message: error.message,
    });
  }
});

/**
 * PUT /api/metrics/webhook/template
 * 更新 Webhook 通知模板設定
 *
 * Request Body:
 * - mentionUsers: string[] - 要 tag 的用戶 ID 列表
 * - mentionRoles: string[] - 要 tag 的角色 ID 列表
 * - customContent: string - 自訂通知內容前綴（最多 2000 字元）
 * - embedTitle: string - 自訂 Embed 標題（最多 256 字元）
 * - embedFooter: string - 自訂 Embed 頁尾
 *
 * 需要管理員權限
 */
router.put("/webhook/template", checkAdminAuth, async (req, res) => {
  // Discord API 限制
  const CONTENT_MAX_LENGTH = 2000;
  const EMBED_TITLE_MAX_LENGTH = 256;
  const DISCORD_ID_REGEX = /^\d{17,19}$/;

  try {
    if (!webhookNotifier) {
      return res.status(503).json({
        error: "Webhook 通知系統未啟用",
        message: "請在 .env 中設定 WEBHOOK_ENABLED=true 和 WEBHOOK_URLS",
      });
    }

    const { mentionUsers, mentionRoles, customContent, embedTitle, embedFooter } = req.body;

    // 驗證陣列參數
    if (mentionUsers !== undefined && !Array.isArray(mentionUsers)) {
      return res.status(400).json({
        error: "無效的 mentionUsers",
        message: "mentionUsers 必須是字串陣列",
      });
    }

    if (mentionRoles !== undefined && !Array.isArray(mentionRoles)) {
      return res.status(400).json({
        error: "無效的 mentionRoles",
        message: "mentionRoles 必須是字串陣列",
      });
    }

    // 驗證字串參數類型
    if (customContent !== undefined && typeof customContent !== "string") {
      return res.status(400).json({
        error: "無效的 customContent",
        message: "customContent 必須是字串",
      });
    }

    if (embedTitle !== undefined && typeof embedTitle !== "string") {
      return res.status(400).json({
        error: "無效的 embedTitle",
        message: "embedTitle 必須是字串",
      });
    }

    if (embedFooter !== undefined && typeof embedFooter !== "string") {
      return res.status(400).json({
        error: "無效的 embedFooter",
        message: "embedFooter 必須是字串",
      });
    }

    // 驗證長度限制
    if (customContent && customContent.length > CONTENT_MAX_LENGTH) {
      return res.status(400).json({
        error: "customContent 過長",
        message: `最多 ${CONTENT_MAX_LENGTH} 字元，目前 ${customContent.length} 字元`,
      });
    }

    if (embedTitle && embedTitle.length > EMBED_TITLE_MAX_LENGTH) {
      return res.status(400).json({
        error: "embedTitle 過長",
        message: `最多 ${EMBED_TITLE_MAX_LENGTH} 字元，目前 ${embedTitle.length} 字元`,
      });
    }

    // 過濾空值並驗證 ID 格式（Discord ID 是 17-19 位數字）並記錄過濾數量
    let filteredUserCount = 0;
    const cleanMentionUsers = mentionUsers
      ? mentionUsers
          .map((id) => id?.trim()) // 安全地 trim，處理 null/undefined
          .filter((trimmedId) => {
            if (!trimmedId) return false;
            if (!DISCORD_ID_REGEX.test(trimmedId)) {
              filteredUserCount++;
              return false;
            }
            return true;
          })
      : undefined;

    let filteredRoleCount = 0;
    const cleanMentionRoles = mentionRoles
      ? mentionRoles
          .map((id) => id?.trim()) // 安全地 trim，處理 null/undefined
          .filter((trimmedId) => {
            if (!trimmedId) return false;
            if (!DISCORD_ID_REGEX.test(trimmedId)) {
              filteredRoleCount++;
              return false;
            }
            return true;
          })
      : undefined;

    // 更新模板
    const saved = await webhookNotifier.updateTemplate({
      mentionUsers: cleanMentionUsers,
      mentionRoles: cleanMentionRoles,
      customContent,
      embedTitle,
      embedFooter,
    });

    const template = webhookNotifier.getTemplate();

    // 構建回應訊息
    let message = saved ? "Webhook 模板已更新並儲存到資料庫" : "Webhook 模板已更新（資料庫儲存失敗）";
    const warnings = [];
    if (filteredUserCount > 0) {
      warnings.push(`${filteredUserCount} 個無效的用戶 ID 已過濾`);
    }
    if (filteredRoleCount > 0) {
      warnings.push(`${filteredRoleCount} 個無效的角色 ID 已過濾`);
    }

    res.json({
      success: true,
      savedToDatabase: saved,
      template,
      message,
      warnings: warnings.length > 0 ? warnings : undefined,
      filteredIds: (filteredUserCount > 0 || filteredRoleCount > 0) ? {
        users: filteredUserCount,
        roles: filteredRoleCount,
      } : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 更新 Webhook 模板失敗:", error.message);
    res.status(500).json({
      error: "更新 Webhook 模板失敗",
      message: error.message,
    });
  }
});

/**
 * POST /api/metrics/webhook/template/preview
 * 預覽 Webhook 通知模板效果
 *
 * 需要管理員權限
 */
router.post("/webhook/template/preview", checkAdminAuth, (req, res) => {
  try {
    if (!webhookNotifier) {
      return res.status(503).json({
        error: "Webhook 通知系統未啟用",
      });
    }

    // 使用當前模板生成預覽
    const preview = webhookNotifier.formatDiscordWebhook(
      "INFO",
      "這是一個預覽訊息，實際通知會顯示系統告警內容。",
      {
        type: "preview",
        example: "這是詳細資訊的範例",
      }
    );

    res.json({
      preview,
      template: webhookNotifier.getTemplate(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 預覽 Webhook 模板失敗:", error.message);
    res.status(500).json({
      error: "預覽 Webhook 模板失敗",
      message: error.message,
    });
  }
});

module.exports = router;
module.exports.setMonitoringInstances = setMonitoringInstances;
module.exports.setVpsMonitor = setVpsMonitor;
module.exports.setWebhookNotifier = setWebhookNotifier;
