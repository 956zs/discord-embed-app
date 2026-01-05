const os = require("os");

/**
 * VpsMonitor - VPS 主機層級監控
 *
 * 獨立於進程監控，監控整個 VPS 主機的資源使用情況
 * 主要用於監控：
 * - 系統總記憶體使用量（絕對值，如超過 10GB）
 * - 系統 CPU 使用率
 * - 磁碟使用情況
 *
 * 設定可從資料庫讀取，支援前端即時調整
 */
class VpsMonitor {
  constructor(options = {}) {
    // 監控間隔（預設 30 秒）
    this.interval = options.interval || 30000;

    // 記憶體閾值設定（單位：MB）- 預設值，可從資料庫覆蓋
    this.thresholds = {
      memory: {
        // 記憶體使用量閾值（絕對值 MB）
        warnMB: options.memoryWarnMB || 8192, // 8GB
        errorMB: options.memoryErrorMB || 10240, // 10GB
      },
      memoryPercent: {
        // 記憶體使用率閾值（百分比）
        warn: options.memoryPercentWarn || 80,
        error: options.memoryPercentError || 90,
      },
      swap: {
        // Swap 使用率閾值
        warn: options.swapWarn || 50,
        error: options.swapError || 80,
      },
    };

    // 監控定時器
    this.monitorTimer = null;
    this.isRunning = false;

    // Webhook 通知器引用
    this.webhookNotifier = null;

    // 資料庫連接池引用
    this.dbPool = null;

    // 冷卻期設定（預設 10 分鐘，VPS 告警較嚴重，冷卻期較長）
    this.cooldownPeriod = options.cooldownPeriod || 600000;
    this.cooldowns = new Map();

    // 歷史指標（保留最近 1 小時）
    this.metricsHistory = [];
    this.maxHistorySize = options.maxHistorySize || 120; // 30秒間隔 * 120 = 1小時

    // 告警歷史
    this.alertHistory = [];
    this.maxAlertHistorySize = options.maxAlertHistorySize || 100;

    // 設定是否已從資料庫載入
    this.configLoaded = false;
  }

  /**
   * 設定資料庫連接池
   */
  setDatabasePool(pool) {
    this.dbPool = pool;
    console.log("✅ 資料庫連接池已連接到 VpsMonitor");
  }

  /**
   * 設定 Webhook 通知器
   */
  setWebhookNotifier(notifier) {
    this.webhookNotifier = notifier;
    console.log("✅ Webhook 通知器已連接到 VpsMonitor");
  }

  /**
   * 從資料庫載入設定
   */
  async loadConfigFromDatabase() {
    if (!this.dbPool) {
      console.log("⚠️  資料庫連接池未設定，使用預設設定");
      return;
    }

    try {
      const result = await this.dbPool.query(
        `SELECT config_key, config_value, config_type
         FROM monitoring_config
         WHERE config_key LIKE 'vps_%'`
      );

      if (result.rows.length === 0) {
        console.log("ℹ️  資料庫中無 VPS 監控設定，使用預設值");
        return;
      }

      // 解析設定值
      for (const row of result.rows) {
        const { config_key, config_value, config_type } = row;
        let value = config_value;

        // 根據類型轉換值
        if (config_type === "number") {
          value = parseInt(config_value, 10);
        } else if (config_type === "boolean") {
          value = config_value === "true";
        }

        // 套用設定
        switch (config_key) {
          case "vps_memory_warn_mb":
            this.thresholds.memory.warnMB = value;
            break;
          case "vps_memory_error_mb":
            this.thresholds.memory.errorMB = value;
            break;
          case "vps_memory_percent_warn":
            this.thresholds.memoryPercent.warn = value;
            break;
          case "vps_memory_percent_error":
            this.thresholds.memoryPercent.error = value;
            break;
          case "vps_monitor_interval":
            this.interval = value;
            break;
          case "vps_cooldown_period":
            this.cooldownPeriod = value;
            break;
        }
      }

      this.configLoaded = true;
      console.log("✅ VPS 監控設定已從資料庫載入:", this.thresholds);
    } catch (error) {
      // 如果資料表不存在，靜默失敗
      if (error.code === "42P01") {
        console.log("ℹ️  monitoring_config 資料表不存在，使用預設設定");
      } else {
        console.error("❌ 從資料庫載入 VPS 設定失敗:", error.message);
      }
    }
  }

  /**
   * 儲存設定到資料庫
   */
  async saveConfigToDatabase(newConfig) {
    if (!this.dbPool) {
      console.warn("⚠️  資料庫連接池未設定，無法儲存設定");
      return false;
    }

    try {
      const configItems = [];

      if (newConfig.memoryWarnMB !== undefined) {
        configItems.push({
          key: "vps_memory_warn_mb",
          value: String(newConfig.memoryWarnMB),
          type: "number",
        });
      }
      if (newConfig.memoryErrorMB !== undefined) {
        configItems.push({
          key: "vps_memory_error_mb",
          value: String(newConfig.memoryErrorMB),
          type: "number",
        });
      }
      if (newConfig.memoryPercentWarn !== undefined) {
        configItems.push({
          key: "vps_memory_percent_warn",
          value: String(newConfig.memoryPercentWarn),
          type: "number",
        });
      }
      if (newConfig.memoryPercentError !== undefined) {
        configItems.push({
          key: "vps_memory_percent_error",
          value: String(newConfig.memoryPercentError),
          type: "number",
        });
      }

      // 使用 upsert 批量更新
      for (const item of configItems) {
        await this.dbPool.query(
          `INSERT INTO monitoring_config (config_key, config_value, config_type)
           VALUES ($1, $2, $3)
           ON CONFLICT (config_key) DO UPDATE SET
             config_value = EXCLUDED.config_value,
             updated_at = NOW()`,
          [item.key, item.value, item.type]
        );
      }

      console.log("✅ VPS 監控設定已儲存到資料庫");
      return true;
    } catch (error) {
      console.error("❌ 儲存 VPS 設定到資料庫失敗:", error.message);
      return false;
    }
  }

  /**
   * 更新閾值設定（同時更新記憶體和資料庫）
   */
  async updateThresholds(newThresholds) {
    // 更新記憶體中的設定
    if (newThresholds.memoryErrorMB) {
      this.thresholds.memory.errorMB = newThresholds.memoryErrorMB;
    }
    if (newThresholds.memoryWarnMB) {
      this.thresholds.memory.warnMB = newThresholds.memoryWarnMB;
    }
    if (newThresholds.memoryPercentWarn) {
      this.thresholds.memoryPercent.warn = newThresholds.memoryPercentWarn;
    }
    if (newThresholds.memoryPercentError) {
      this.thresholds.memoryPercent.error = newThresholds.memoryPercentError;
    }

    // 儲存到資料庫
    const saved = await this.saveConfigToDatabase(newThresholds);

    console.log("✅ VPS 監控閾值已更新:", this.thresholds);
    return saved;
  }

  /**
   * 啟動監控
   */
  async start() {
    if (this.isRunning) {
      console.log("⚠️  VpsMonitor 已經在運行中");
      return;
    }

    // 先從資料庫載入設定
    await this.loadConfigFromDatabase();

    console.log("✅ 啟動 VPS 主機監控");
    console.log(`   記憶體告警閾值: ${this.thresholds.memory.warnMB}MB (警告), ${this.thresholds.memory.errorMB}MB (錯誤)`);
    this.isRunning = true;

    // 立即執行一次
    this.collectAndCheck();

    // 定期執行
    this.monitorTimer = setInterval(() => {
      this.collectAndCheck();
    }, this.interval);
  }

  /**
   * 停止監控
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log("🛑 停止 VPS 主機監控");
    this.isRunning = false;

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  /**
   * 收集指標並檢查告警
   */
  collectAndCheck() {
    const metrics = this.collectMetrics();
    this.metricsHistory.push(metrics);

    // 限制歷史記錄大小
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // 檢查告警
    this.checkAlerts(metrics);
  }

  /**
   * 收集 VPS 系統指標
   */
  collectMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const cpus = os.cpus();
    const cpuCount = cpus.length;

    // 計算 CPU 平均使用率
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

    // 計算系統負載（1 分鐘、5 分鐘、15 分鐘平均）
    const loadAvg = os.loadavg();

    const metrics = {
      timestamp: Date.now(),
      memory: {
        totalMB: Math.round(totalMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        usedPercent: Math.round((usedMemory / totalMemory) * 100),
      },
      cpu: {
        count: cpuCount,
        usage: cpuUsage,
      },
      load: {
        avg1: Math.round(loadAvg[0] * 100) / 100,
        avg5: Math.round(loadAvg[1] * 100) / 100,
        avg15: Math.round(loadAvg[2] * 100) / 100,
      },
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
    };

    return metrics;
  }

  /**
   * 檢查告警
   */
  checkAlerts(metrics) {
    // 檢查記憶體使用量（絕對值）
    this.checkMemoryUsage(metrics.memory.usedMB, metrics.memory.totalMB);

    // 檢查記憶體使用率（百分比）
    this.checkMemoryPercent(metrics.memory.usedPercent);
  }

  /**
   * 檢查記憶體使用量（絕對值 MB）
   */
  checkMemoryUsage(usedMB, totalMB) {
    const alertKey = "vps_memory_usage_mb";

    if (usedMB >= this.thresholds.memory.errorMB) {
      this.triggerAlert(
        "ERROR",
        `VPS 記憶體使用量超過 ${this.thresholds.memory.errorMB}MB`,
        {
          type: "vps_memory",
          usedMB,
          totalMB,
          threshold: this.thresholds.memory.errorMB,
          usedGB: (usedMB / 1024).toFixed(2),
          totalGB: (totalMB / 1024).toFixed(2),
        },
        alertKey
      );
    } else if (usedMB >= this.thresholds.memory.warnMB) {
      this.triggerAlert(
        "WARN",
        `VPS 記憶體使用量超過 ${this.thresholds.memory.warnMB}MB`,
        {
          type: "vps_memory",
          usedMB,
          totalMB,
          threshold: this.thresholds.memory.warnMB,
          usedGB: (usedMB / 1024).toFixed(2),
          totalGB: (totalMB / 1024).toFixed(2),
        },
        alertKey
      );
    }
  }

  /**
   * 檢查記憶體使用率（百分比）
   */
  checkMemoryPercent(usedPercent) {
    const alertKey = "vps_memory_usage_percent";

    if (usedPercent >= this.thresholds.memoryPercent.error) {
      this.triggerAlert(
        "ERROR",
        `VPS 記憶體使用率超過 ${this.thresholds.memoryPercent.error}%`,
        {
          type: "vps_memory_percent",
          usedPercent,
          threshold: this.thresholds.memoryPercent.error,
        },
        alertKey
      );
    } else if (usedPercent >= this.thresholds.memoryPercent.warn) {
      this.triggerAlert(
        "WARN",
        `VPS 記憶體使用率超過 ${this.thresholds.memoryPercent.warn}%`,
        {
          type: "vps_memory_percent",
          usedPercent,
          threshold: this.thresholds.memoryPercent.warn,
        },
        alertKey
      );
    }
  }

  /**
   * 觸發告警
   */
  triggerAlert(level, message, details, alertKey) {
    // 檢查冷卻期
    if (this.isInCooldown(alertKey)) {
      return;
    }

    // 創建告警記錄
    const alert = {
      id: Date.now(),
      level,
      message,
      details,
      triggeredAt: new Date().toISOString(),
      source: "VpsMonitor",
    };

    // 添加到歷史記錄
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxAlertHistorySize) {
      this.alertHistory.shift();
    }

    // 設定冷卻期
    this.setCooldown(alertKey);

    // 記錄日誌
    this.logAlert(level, message, details);

    // 發送 Webhook 通知（ERROR 級別）
    if (this.webhookNotifier && level === "ERROR") {
      this.sendWebhookNotification(alert, level, message, details);
    }

    return alert;
  }

  /**
   * 檢查是否在冷卻期
   */
  isInCooldown(alertKey) {
    const lastTriggered = this.cooldowns.get(alertKey);
    if (!lastTriggered) {
      return false;
    }

    const now = Date.now();
    return now - lastTriggered < this.cooldownPeriod;
  }

  /**
   * 設定冷卻期
   */
  setCooldown(alertKey) {
    this.cooldowns.set(alertKey, Date.now());

    // 自動清理
    setTimeout(() => {
      this.cooldowns.delete(alertKey);
    }, this.cooldownPeriod + 60000);
  }

  /**
   * 記錄告警日誌
   */
  logAlert(level, message, details) {
    const emoji = {
      ERROR: "🚨",
      WARN: "⚠️",
      INFO: "ℹ️",
    };

    const logMessage = `${emoji[level]} [VPS ${level}] ${message}`;

    if (level === "ERROR") {
      console.error(logMessage, details);
    } else if (level === "WARN") {
      console.warn(logMessage, details);
    } else {
      console.log(logMessage, details);
    }
  }

  /**
   * 發送 Webhook 通知
   */
  async sendWebhookNotification(alert, level, message, details) {
    try {
      // 為 VPS 監控添加額外資訊
      const enrichedDetails = {
        ...details,
        hostname: os.hostname(),
        platform: os.platform(),
        source: "VPS 主機監控",
      };

      const result = await this.webhookNotifier.sendNotification(
        level,
        `[VPS] ${message}`,
        enrichedDetails
      );

      if (result.sent > 0) {
        console.log(`✅ VPS 監控 Webhook 通知已發送`);
      }
    } catch (error) {
      console.error("❌ VPS 監控 Webhook 通知發送失敗:", error.message);
    }
  }

  /**
   * 獲取當前指標
   */
  getCurrentMetrics() {
    if (this.metricsHistory.length === 0) {
      return this.collectMetrics();
    }
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  /**
   * 獲取歷史指標
   */
  getMetricsHistory() {
    return [...this.metricsHistory];
  }

  /**
   * 獲取告警歷史
   */
  getAlertHistory(options = {}) {
    const { limit = 50, level = null } = options;

    let alerts = [...this.alertHistory];

    if (level) {
      alerts = alerts.filter((a) => a.level === level);
    }

    // 按時間倒序
    alerts.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));

    return alerts.slice(0, limit);
  }

  /**
   * 獲取統計資訊
   */
  getStats() {
    const currentMetrics = this.getCurrentMetrics();

    return {
      isRunning: this.isRunning,
      interval: this.interval,
      thresholds: this.thresholds,
      currentMetrics,
      alertsCount: this.alertHistory.length,
      cooldownsActive: this.cooldowns.size,
      historySize: this.metricsHistory.length,
    };
  }

  /**
   * 獲取設定
   */
  getConfig() {
    return {
      interval: this.interval,
      thresholds: { ...this.thresholds },
      cooldownPeriod: this.cooldownPeriod,
      // 為了向後相容，也提供扁平化的閾值
      memoryWarnMB: this.thresholds.memory.warnMB,
      memoryErrorMB: this.thresholds.memory.errorMB,
      memoryPercentWarn: this.thresholds.memoryPercent.warn,
      memoryPercentError: this.thresholds.memoryPercent.error,
    };
  }

  /**
   * 發送測試通知（封裝 webhookNotifier 的調用）
   * @returns {Promise<{success: boolean, result?: object, error?: string}>}
   */
  async sendTestNotification() {
    if (!this.webhookNotifier) {
      return {
        success: false,
        error: "Webhook 通知器未配置",
      };
    }

    const currentMetrics = this.getCurrentMetrics();

    try {
      const result = await this.webhookNotifier.sendNotification(
        "INFO",
        "[VPS 測試] 這是一個測試通知",
        {
          type: "vps_test",
          memory: currentMetrics?.memory || null,
          cpu: currentMetrics?.cpu || null,
          hostname: currentMetrics?.hostname || os.hostname(),
          timestamp: new Date().toISOString(),
        }
      );

      return {
        success: result.sent > 0,
        result: {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
        },
        currentMetrics: currentMetrics ? {
          memoryUsedMB: currentMetrics.memory.usedMB,
          memoryUsedPercent: currentMetrics.memory.usedPercent,
          cpuUsage: currentMetrics.cpu.usage,
        } : null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = VpsMonitor;
