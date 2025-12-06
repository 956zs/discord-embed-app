/**
 * Monitoring Middleware - Express 監控中介軟體
 *
 * 功能：
 * - 攔截 HTTP 請求並記錄到 MetricsCollector
 * - 測量響應時間並記錄
 * - 追蹤錯誤請求（4xx, 5xx）
 * - 檢測慢速請求並觸發告警
 */

/**
 * 創建監控中介軟體
 * @param {MetricsCollector} metricsCollector 指標收集器實例
 * @param {AlertManager} alertManager 告警管理器實例（可選）
 * @returns {Function} Express 中介軟體函數
 */
function createMonitoringMiddleware(metricsCollector, alertManager = null) {
  if (!metricsCollector) {
    console.warn(
      "⚠️  監控中介軟體：未提供 MetricsCollector，中介軟體將不執行任何操作"
    );
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const startTime = Date.now();

    // 記錄請求
    metricsCollector.incrementCounter("api_requests_total");

    // 保存原始的 res.send, res.json, res.end 方法
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // 標記是否已經記錄過（避免重複記錄）
    let recorded = false;

    // 記錄響應的通用函數
    const recordResponse = () => {
      if (recorded) return;
      recorded = true;

      const duration = Date.now() - startTime;

      // 記錄響應時間
      metricsCollector.recordTiming("api_response_time", duration);

      // 記錄錯誤請求
      if (res.statusCode >= 400) {
        metricsCollector.incrementCounter("api_errors_total");

        // 記錄錯誤詳情
        const errorType = res.statusCode >= 500 ? "5xx" : "4xx";
        console.warn(
          `⚠️  API 錯誤 [${res.statusCode}]: ${req.method} ${req.path} (${duration}ms)`
        );
      }

      // 檢測慢速請求（從 alertManager 取得設定，預設關閉）
      let slowRequestConfig = {
        enabled: false,
        warnThreshold: 1000,
        errorThreshold: 3000,
      };

      // 從 alertManager 取得設定（支援運行時調整）
      if (
        alertManager &&
        typeof alertManager.getSlowRequestConfig === "function"
      ) {
        slowRequestConfig = alertManager.getSlowRequestConfig();
      }

      if (
        slowRequestConfig.enabled &&
        duration > slowRequestConfig.warnThreshold
      ) {
        console.warn(`⚠️  慢速請求: ${req.method} ${req.path} (${duration}ms)`);

        // 觸發告警（如果已配置告警管理器）
        if (alertManager) {
          const level =
            duration > slowRequestConfig.errorThreshold ? "ERROR" : "WARN";
          const alertKey = `slow_request:${req.method}:${req.path}`;

          alertManager.triggerAlert(
            level,
            `慢速 API 請求`,
            {
              method: req.method,
              path: req.path,
              duration,
              threshold:
                duration > slowRequestConfig.errorThreshold
                  ? slowRequestConfig.errorThreshold
                  : slowRequestConfig.warnThreshold,
              statusCode: res.statusCode,
            },
            alertKey
          );
        }
      }

      // 記錄成功的請求（僅在開發模式或詳細日誌模式）
      if (process.env.VERBOSE_LOGGING === "true" && res.statusCode < 400) {
        console.log(
          `✅ API 請求: ${req.method} ${req.path} [${res.statusCode}] (${duration}ms)`
        );
      }
    };

    // 包裝 res.send
    res.send = function (data) {
      recordResponse();
      return originalSend.call(this, data);
    };

    // 包裝 res.json
    res.json = function (data) {
      recordResponse();
      return originalJson.call(this, data);
    };

    // 包裝 res.end
    res.end = function (chunk, encoding) {
      recordResponse();
      return originalEnd.call(this, chunk, encoding);
    };

    // 處理錯誤（如果中介軟體鏈中發生錯誤）
    res.on("finish", () => {
      recordResponse();
    });

    next();
  };
}

module.exports = createMonitoringMiddleware;
