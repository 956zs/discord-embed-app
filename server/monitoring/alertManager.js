/**
 * AlertManager - 告警管理系統
 *
 * 功能：
 * - 監控指標閾值
 * - 觸發告警
 * - 記錄告警歷史
 * - 防止告警風暴（去重和節流）
 * - 預留 Webhook 整合介面
 * - 運行時設定調整
 */
class AlertManager {
  constructor(options = {}) {
    // 閾值配置
    this.thresholds = options.thresholds || {
      cpu: {
        warn: 80,
        error: 90,
      },
      memory: {
        warn: 80,
        error: 90,
      },
      eventLoopDelay: {
        warn: 100,
        error: 500,
      },
      apiResponseTime: {
        warn: 1000,
        error: 3000,
      },
      dbQueryTime: {
        warn: 500,
        error: 2000,
      },
    };

    // 慢速請求警告設定（預設關閉，透過 API 調整）
    this.slowRequestConfig = options.slowRequestConfig || {
      enabled: false,
      warnThreshold: 1000,
      errorThreshold: 3000,
    };

    // 告警歷史（記憶體中儲存）
    this.alertHistory = [];

    // 冷卻期設定（5 分鐘）
    this.cooldownPeriod = options.cooldownPeriod || 300000;

    // 冷卻期追蹤 Map（key: alertKey, value: timestamp）
    this.cooldowns = new Map();

    // 最大告警歷史記錄數
    this.maxHistorySize = options.maxHistorySize || 1000;

    // Webhook 通知器（預留介面）
    this.webhookNotifier = null;
  }

  /**
   * 取得慢速請求設定
   */
  getSlowRequestConfig() {
    return { ...this.slowRequestConfig };
  }

  /**
   * 更新慢速請求設定
   * @param {Object} config 設定物件
   */
  updateSlowRequestConfig(config) {
    if (typeof config.enabled === "boolean") {
      this.slowRequestConfig.enabled = config.enabled;
    }
    if (typeof config.warnThreshold === "number" && config.warnThreshold > 0) {
      this.slowRequestConfig.warnThreshold = config.warnThreshold;
    }
    if (
      typeof config.errorThreshold === "number" &&
      config.errorThreshold > 0
    ) {
      this.slowRequestConfig.errorThreshold = config.errorThreshold;
    }
    console.log("✅ 慢速請求設定已更新:", this.slowRequestConfig);
    return this.slowRequestConfig;
  }

  /**
   * 取得所有設定
   */
  getConfig() {
    return {
      thresholds: { ...this.thresholds },
      slowRequest: { ...this.slowRequestConfig },
      cooldownPeriod: this.cooldownPeriod,
    };
  }

  /**
   * 設定 Webhook 通知器
   * @param {Object} notifier Webhook 通知器實例
   */
  setWebhookNotifier(notifier) {
    this.webhookNotifier = notifier;
    console.log("✅ Webhook 通知器已連接到 AlertManager");
  }

  /**
   * 檢查指標並觸發告警
   * @param {Object} metrics 當前指標
   */
  checkMetrics(metrics) {
    if (!metrics || !metrics.current) {
      return;
    }

    const { system, application, database } = metrics.current;

    // 檢查系統指標
    if (system) {
      this.checkCPU(system.cpu);
      this.checkMemory(system.memory.percentage);
      this.checkEventLoopDelay(system.eventLoopDelay);
    }

    // 檢查應用程式指標
    if (application) {
      this.checkAPIResponseTime(application.apiRequests.avgResponseTime);
    }

    // 檢查資料庫指標
    if (database) {
      this.checkDBQueryTime(database.queries.avgTime);
    }
  }

  /**
   * 檢查 CPU 使用率
   * @param {number} cpuUsage CPU 使用率百分比
   */
  checkCPU(cpuUsage) {
    const alertKey = "cpu_usage";

    if (cpuUsage >= this.thresholds.cpu.error) {
      this.triggerAlert(
        "ERROR",
        `CPU 使用率超過 ${this.thresholds.cpu.error}%`,
        {
          metric: "cpu",
          value: cpuUsage,
          threshold: this.thresholds.cpu.error,
        },
        alertKey
      );
    } else if (cpuUsage >= this.thresholds.cpu.warn) {
      this.triggerAlert(
        "WARN",
        `CPU 使用率超過 ${this.thresholds.cpu.warn}%`,
        {
          metric: "cpu",
          value: cpuUsage,
          threshold: this.thresholds.cpu.warn,
        },
        alertKey
      );
    }
  }

  /**
   * 檢查記憶體使用率
   * @param {number} memoryPercentage 記憶體使用率百分比
   */
  checkMemory(memoryPercentage) {
    const alertKey = "memory_usage";

    if (memoryPercentage >= this.thresholds.memory.error) {
      this.triggerAlert(
        "ERROR",
        `記憶體使用率超過 ${this.thresholds.memory.error}%`,
        {
          metric: "memory",
          value: memoryPercentage,
          threshold: this.thresholds.memory.error,
        },
        alertKey
      );
    } else if (memoryPercentage >= this.thresholds.memory.warn) {
      this.triggerAlert(
        "WARN",
        `記憶體使用率超過 ${this.thresholds.memory.warn}%`,
        {
          metric: "memory",
          value: memoryPercentage,
          threshold: this.thresholds.memory.warn,
        },
        alertKey
      );
    }
  }

  /**
   * 檢查事件循環延遲
   * @param {number} delay 事件循環延遲（毫秒）
   */
  checkEventLoopDelay(delay) {
    const alertKey = "event_loop_delay";

    if (delay >= this.thresholds.eventLoopDelay.error) {
      this.triggerAlert(
        "ERROR",
        `事件循環延遲超過 ${this.thresholds.eventLoopDelay.error}ms`,
        {
          metric: "eventLoopDelay",
          value: delay,
          threshold: this.thresholds.eventLoopDelay.error,
        },
        alertKey
      );
    } else if (delay >= this.thresholds.eventLoopDelay.warn) {
      this.triggerAlert(
        "WARN",
        `事件循環延遲超過 ${this.thresholds.eventLoopDelay.warn}ms`,
        {
          metric: "eventLoopDelay",
          value: delay,
          threshold: this.thresholds.eventLoopDelay.warn,
        },
        alertKey
      );
    }
  }

  /**
   * 檢查 API 響應時間
   * @param {number} responseTime 平均響應時間（毫秒）
   */
  checkAPIResponseTime(responseTime) {
    const alertKey = "api_response_time";

    if (responseTime >= this.thresholds.apiResponseTime.error) {
      this.triggerAlert(
        "ERROR",
        `API 平均響應時間超過 ${this.thresholds.apiResponseTime.error}ms`,
        {
          metric: "apiResponseTime",
          value: responseTime,
          threshold: this.thresholds.apiResponseTime.error,
        },
        alertKey
      );
    } else if (responseTime >= this.thresholds.apiResponseTime.warn) {
      this.triggerAlert(
        "WARN",
        `API 平均響應時間超過 ${this.thresholds.apiResponseTime.warn}ms`,
        {
          metric: "apiResponseTime",
          value: responseTime,
          threshold: this.thresholds.apiResponseTime.warn,
        },
        alertKey
      );
    }
  }

  /**
   * 檢查資料庫查詢時間
   * @param {number} queryTime 平均查詢時間（毫秒）
   */
  checkDBQueryTime(queryTime) {
    const alertKey = "db_query_time";

    if (queryTime >= this.thresholds.dbQueryTime.error) {
      this.triggerAlert(
        "ERROR",
        `資料庫平均查詢時間超過 ${this.thresholds.dbQueryTime.error}ms`,
        {
          metric: "dbQueryTime",
          value: queryTime,
          threshold: this.thresholds.dbQueryTime.error,
        },
        alertKey
      );
    } else if (queryTime >= this.thresholds.dbQueryTime.warn) {
      this.triggerAlert(
        "WARN",
        `資料庫平均查詢時間超過 ${this.thresholds.dbQueryTime.warn}ms`,
        {
          metric: "dbQueryTime",
          value: queryTime,
          threshold: this.thresholds.dbQueryTime.warn,
        },
        alertKey
      );
    }
  }

  /**
   * 觸發告警
   * @param {string} level 告警級別 (ERROR|WARN|INFO)
   * @param {string} message 告警訊息
   * @param {Object} details 詳細資訊
   * @param {string} alertKey 告警唯一鍵（用於去重）
   */
  triggerAlert(level, message, details = {}, alertKey = null) {
    // 生成告警鍵（用於去重）
    const key = alertKey || `${level}:${message}`;

    // 檢查是否在冷卻期
    if (this.isInCooldown(key)) {
      return;
    }

    // 創建告警記錄
    const alert = {
      id: this.alertHistory.length + 1,
      level,
      message,
      details,
      triggeredAt: new Date().toISOString(),
      status: "active",
      webhookSent: false,
    };

    // 添加到歷史記錄
    this.alertHistory.push(alert);

    // 限制歷史記錄大小
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    // 設定冷卻期
    this.setCooldown(key);

    // 記錄到日誌
    this.logAlert(level, message, details);

    // 如果有 Webhook 通知器且級別為 ERROR，發送通知
    if (this.webhookNotifier && level === "ERROR") {
      this.sendWebhookNotification(alert, level, message, details);
    }

    return alert;
  }

  /**
   * 發送 Webhook 通知（非同步，不阻塞主流程）
   * @param {Object} alert 告警物件
   * @param {string} level 告警級別
   * @param {string} message 告警訊息
   * @param {Object} details 詳細資訊
   */
  async sendWebhookNotification(alert, level, message, details) {
    try {
      const result = await this.webhookNotifier.sendNotification(
        level,
        message,
        details
      );

      // 更新告警記錄的 webhook 發送狀態
      alert.webhookSent = result.sent > 0;
      alert.webhookResult = result;

      if (result.sent > 0) {
        console.log(
          `✅ Webhook 通知已發送: ${result.sent} 個成功, ${result.failed} 個失敗, ${result.skipped} 個跳過`
        );
      } else if (result.failed > 0) {
        console.error(`❌ Webhook 通知發送失敗: ${result.failed} 個失敗`);
      } else if (result.skipped > 0) {
        console.log(`⏭️  Webhook 通知已跳過（冷卻期）: ${result.skipped} 個`);
      }
    } catch (error) {
      console.error("❌ Webhook 通知發送異常:", error.message);
      alert.webhookSent = false;
      alert.webhookError = error.message;
    }
  }

  /**
   * 檢查是否在冷卻期
   * @param {string} alertKey 告警鍵
   * @returns {boolean} 是否在冷卻期
   */
  isInCooldown(alertKey) {
    const lastTriggered = this.cooldowns.get(alertKey);
    if (!lastTriggered) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastAlert = now - lastTriggered;

    return timeSinceLastAlert < this.cooldownPeriod;
  }

  /**
   * 設定冷卻期
   * @param {string} alertKey 告警鍵
   */
  setCooldown(alertKey) {
    this.cooldowns.set(alertKey, Date.now());

    // 清理過期的冷卻期記錄（避免 Map 無限增長）
    setTimeout(() => {
      this.cooldowns.delete(alertKey);
    }, this.cooldownPeriod + 60000); // 冷卻期 + 1 分鐘緩衝
  }

  /**
   * 記錄告警到日誌
   * @param {string} level 告警級別
   * @param {string} message 告警訊息
   * @param {Object} details 詳細資訊
   */
  logAlert(level, message, details) {
    const emoji = {
      ERROR: "🚨",
      WARN: "⚠️",
      INFO: "ℹ️",
    };

    const logMessage = `${emoji[level]} [${level}] ${message}`;

    if (level === "ERROR") {
      console.error(logMessage, details);
    } else if (level === "WARN") {
      console.warn(logMessage, details);
    } else {
      console.log(logMessage, details);
    }
  }

  /**
   * 獲取告警歷史
   * @param {Object} options 查詢選項
   * @returns {Array} 告警列表
   */
  getAlertHistory(options = {}) {
    const { limit = 100, level = null, status = null } = options;

    let alerts = [...this.alertHistory];

    // 過濾級別
    if (level) {
      alerts = alerts.filter((a) => a.level === level);
    }

    // 過濾狀態
    if (status) {
      alerts = alerts.filter((a) => a.status === status);
    }

    // 按時間倒序排列
    alerts.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));

    // 限制數量
    return alerts.slice(0, limit);
  }

  /**
   * 清除舊告警
   * @param {number} maxAge 最大保留時間（毫秒）
   */
  clearOldAlerts(maxAge = 86400000) {
    // 預設保留 24 小時
    const cutoffTime = Date.now() - maxAge;

    this.alertHistory = this.alertHistory.filter((alert) => {
      const alertTime = new Date(alert.triggeredAt).getTime();
      return alertTime > cutoffTime;
    });
  }

  /**
   * 解決告警
   * @param {number} alertId 告警 ID
   */
  resolveAlert(alertId) {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (alert) {
      alert.status = "resolved";
      alert.resolvedAt = new Date().toISOString();
    }
  }

  /**
   * 獲取統計資訊
   * @returns {Object} 統計資訊
   */
  getStats() {
    const activeAlerts = this.alertHistory.filter(
      (a) => a.status === "active"
    ).length;
    const errorAlerts = this.alertHistory.filter(
      (a) => a.level === "ERROR"
    ).length;
    const warnAlerts = this.alertHistory.filter(
      (a) => a.level === "WARN"
    ).length;

    return {
      total: this.alertHistory.length,
      active: activeAlerts,
      byLevel: {
        ERROR: errorAlerts,
        WARN: warnAlerts,
        INFO: this.alertHistory.length - errorAlerts - warnAlerts,
      },
      cooldowns: this.cooldowns.size,
    };
  }
}

module.exports = AlertManager;
