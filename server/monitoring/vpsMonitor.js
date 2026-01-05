const os = require("os");
const prometheusService = require("../services/prometheusService");

/**
 * VpsMonitor - VPS 主機層級監控
 *
 * 使用 Prometheus + Node Exporter 獲取系統指標
 * 提供更準確、更豐富的監控數據
 *
 * 主要監控項目：
 * - CPU 使用率（整體及每核心）
 * - 記憶體使用情況（含 Swap）
 * - 硬碟空間及 I/O
 * - 網路流量
 * - 系統負載
 */
class VpsMonitor {
  constructor(options = {}) {
    // 監控間隔（預設 30 秒）
    this.interval = options.interval || 30000;

    // 記憶體閾值設定（單位：MB）- 預設值，可從資料庫覆蓋
    // 改為監控「可用記憶體」而非「使用量」，更符合實際運維需求
    this.thresholds = {
      memoryAvailable: {
        // 可用記憶體閾值（低於此值告警）
        warnMB: options.memoryAvailableWarnMB || 4096, // 低於 4GB 警告
        errorMB: options.memoryAvailableErrorMB || 2048, // 低於 2GB 錯誤
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

    // 靜態主機資訊，避免每次收集重複取得
    this.hostInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
    };

    // 環形緩衝區索引（用於歷史指標）
    this.metricsHistoryStart = 0;
    this.metricsHistoryCount = 0;
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
          case "vps_memory_available_warn_mb":
            this.thresholds.memoryAvailable.warnMB = value;
            break;
          case "vps_memory_available_error_mb":
            this.thresholds.memoryAvailable.errorMB = value;
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

      if (newConfig.memoryAvailableWarnMB !== undefined) {
        configItems.push({
          key: "vps_memory_available_warn_mb",
          value: String(newConfig.memoryAvailableWarnMB),
          type: "number",
        });
      }
      if (newConfig.memoryAvailableErrorMB !== undefined) {
        configItems.push({
          key: "vps_memory_available_error_mb",
          value: String(newConfig.memoryAvailableErrorMB),
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

      // 無配置項時直接返回
      if (configItems.length === 0) {
        return true;
      }

      // 批量 upsert：合併為單條 SQL，減少數據庫往返次數
      const values = [];
      const placeholders = configItems
        .map((item, index) => {
          const baseIndex = index * 3;
          values.push(item.key, item.value, item.type);
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
        })
        .join(", ");

      await this.dbPool.query(
        `INSERT INTO monitoring_config (config_key, config_value, config_type)
         VALUES ${placeholders}
         ON CONFLICT (config_key) DO UPDATE SET
           config_value = EXCLUDED.config_value,
           config_type = EXCLUDED.config_type,
           updated_at = NOW()`,
        values
      );

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
    // 更新記憶體中的設定（可用記憶體閾值）
    if (newThresholds.memoryAvailableErrorMB !== undefined) {
      this.thresholds.memoryAvailable.errorMB = newThresholds.memoryAvailableErrorMB;
    }
    if (newThresholds.memoryAvailableWarnMB !== undefined) {
      this.thresholds.memoryAvailable.warnMB = newThresholds.memoryAvailableWarnMB;
    }
    if (newThresholds.memoryPercentWarn !== undefined) {
      this.thresholds.memoryPercent.warn = newThresholds.memoryPercentWarn;
    }
    if (newThresholds.memoryPercentError !== undefined) {
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
    console.log(`   可用記憶體告警閾值: 低於 ${this.thresholds.memoryAvailable.warnMB}MB (警告), 低於 ${this.thresholds.memoryAvailable.errorMB}MB (錯誤)`);
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
  async collectAndCheck() {
    const metrics = await this.collectMetrics();
    if (metrics) {
      this.appendMetrics(metrics);
      this.checkAlerts(metrics);
    }
  }

  /**
   * 將指標添加到歷史記錄（使用環形緩衝區，O(1) 複雜度）
   */
  appendMetrics(metrics) {
    if (this.maxHistorySize <= 0) {
      return;
    }

    if (this.metricsHistoryCount < this.maxHistorySize) {
      // 緩衝區未滿，直接 push
      this.metricsHistory.push(metrics);
      this.metricsHistoryCount += 1;
    } else {
      // 緩衝區已滿，覆蓋最舊的元素（O(1) 而非 shift 的 O(n)）
      this.metricsHistory[this.metricsHistoryStart] = metrics;
      this.metricsHistoryStart = (this.metricsHistoryStart + 1) % this.maxHistorySize;
    }
  }

  /**
   * 收集 VPS 系統指標（優先使用 Prometheus，fallback 到 os 模組）
   */
  async collectMetrics() {
    try {
      // 嘗試從 Prometheus 獲取完整指標
      const prometheusData = await prometheusService.getAllMetrics();

      // 返回擴展的指標結構（包含 disk, network, diskIO 等）
      return {
        timestamp: prometheusData.timestamp,
        memory: {
          totalMB: prometheusData.memory.totalMB,
          usedMB: prometheusData.memory.usedMB,
          freeMB: prometheusData.memory.totalMB - prometheusData.memory.usedMB,
          availableMB: prometheusData.memory.availableMB,
          buffersCacheMB: prometheusData.memory.cachedMB,
          usedPercent: prometheusData.memory.usedPercent,
          activeMB: prometheusData.memory.activeMB,
          inactiveMB: prometheusData.memory.inactiveMB,
          swap: prometheusData.memory.swap,
        },
        cpu: {
          count: prometheusData.system.cpuCores,
          usage: prometheusData.cpu.usage,
          user: prometheusData.cpu.user,
          system: prometheusData.cpu.system,
          iowait: prometheusData.cpu.iowait,
          steal: prometheusData.cpu.steal,
          idle: prometheusData.cpu.idle,
          perCore: prometheusData.cpu.perCore,
        },
        load: prometheusData.load,
        disk: prometheusData.disk,
        diskIO: prometheusData.diskIO,
        network: prometheusData.network,
        connections: prometheusData.connections,
        uptime: prometheusData.uptime,
        platform: prometheusData.system.platform || this.hostInfo.platform,
        hostname: prometheusData.system.hostname || this.hostInfo.hostname,
        vendor: prometheusData.system.vendor,
        source: "prometheus",
      };
    } catch (error) {
      // Prometheus 不可用，fallback 到 Node.js os 模組
      console.warn("⚠️ Prometheus 查詢失敗，使用 os 模組 fallback:", error.message);
      return this.collectMetricsFallback();
    }
  }

  /**
   * Fallback: 使用 Node.js os 模組收集基本指標
   */
  collectMetricsFallback() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const cpus = os.cpus();
    const cpuCount = cpus.length;

    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

    const loadAvg = os.loadavg();

    return {
      timestamp: Date.now(),
      memory: {
        totalMB: Math.round(totalMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        availableMB: Math.round(freeMemory / 1024 / 1024),
        buffersCacheMB: 0,
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
      platform: this.hostInfo.platform,
      hostname: this.hostInfo.hostname,
      source: "os_fallback",
    };
  }

  /**
   * 檢查告警
   */
  checkAlerts(metrics) {
    // 檢查可用記憶體（絕對值）
    this.checkMemoryAvailable(metrics.memory.availableMB, metrics.memory.totalMB);

    // 檢查記憶體使用率（百分比）
    this.checkMemoryPercent(metrics.memory.usedPercent);
  }

  /**
   * 檢查可用記憶體（低於閾值告警）
   */
  checkMemoryAvailable(availableMB, totalMB) {
    const alertKey = "vps_memory_available_mb";

    // 注意：這裡是「低於」閾值，所以 error 閾值比 warn 閾值小
    if (availableMB <= this.thresholds.memoryAvailable.errorMB) {
      this.triggerAlert(
        "ERROR",
        `VPS 可用記憶體低於 ${this.thresholds.memoryAvailable.errorMB}MB`,
        {
          type: "vps_memory_available",
          availableMB,
          totalMB,
          threshold: this.thresholds.memoryAvailable.errorMB,
          availableGB: (availableMB / 1024).toFixed(2),
          totalGB: (totalMB / 1024).toFixed(2),
        },
        alertKey
      );
    } else if (availableMB <= this.thresholds.memoryAvailable.warnMB) {
      this.triggerAlert(
        "WARN",
        `VPS 可用記憶體低於 ${this.thresholds.memoryAvailable.warnMB}MB`,
        {
          type: "vps_memory_available",
          availableMB,
          totalMB,
          threshold: this.thresholds.memoryAvailable.warnMB,
          availableGB: (availableMB / 1024).toFixed(2),
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
    // 惰性清理：檢查時順便清除過期的冷卻記錄
    if (now - lastTriggered >= this.cooldownPeriod) {
      this.cooldowns.delete(alertKey);
      return false;
    }
    return true;
  }

  /**
   * 設定冷卻期
   */
  setCooldown(alertKey) {
    this.cooldowns.set(alertKey, Date.now());
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
        hostname: this.hostInfo.hostname,
        platform: this.hostInfo.platform,
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
   * 獲取當前指標（返回最近一次收集的數據）
   */
  getCurrentMetrics() {
    if (this.metricsHistoryCount === 0) {
      // 歷史為空時返回 null，等待定時收集填充
      return null;
    }
    // 環形緩衝區：計算最後一個元素的索引
    const lastIndex =
      (this.metricsHistoryStart + this.metricsHistoryCount - 1) % this.maxHistorySize;
    return this.metricsHistory[lastIndex];
  }

  /**
   * 獲取歷史指標（按時間順序返回）
   */
  getMetricsHistory() {
    if (this.metricsHistoryCount === 0) {
      return [];
    }
    if (this.metricsHistoryCount < this.maxHistorySize) {
      // 緩衝區未滿，直接返回
      return this.metricsHistory.slice(0, this.metricsHistoryCount);
    }
    // 緩衝區已滿，需要按正確順序重組
    return this.metricsHistory
      .slice(this.metricsHistoryStart)
      .concat(this.metricsHistory.slice(0, this.metricsHistoryStart));
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
      historySize: this.metricsHistoryCount,
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
      // 扁平化的閾值（用於 API 和前端）
      memoryAvailableWarnMB: this.thresholds.memoryAvailable.warnMB,
      memoryAvailableErrorMB: this.thresholds.memoryAvailable.errorMB,
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
