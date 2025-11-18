const os = require("os");
const { performance, PerformanceObserver } = require("perf_hooks");

/**
 * MetricsCollector - 收集和儲存系統與應用程式效能指標
 *
 * 功能：
 * - 收集系統指標（CPU、記憶體、事件循環延遲）
 * - 收集應用程式指標（API 請求、Discord 事件、資料庫查詢）
 * - 維護時間序列數據（最近 24 小時）
 * - 提供查詢介面
 */
class MetricsCollector {
  constructor(options = {}) {
    this.interval = options.interval || 30000; // 30 秒
    this.retentionPeriod = options.retentionPeriod || 86400000; // 24 小時

    // 時間序列數據儲存
    this.metrics = {
      system: [], // 系統指標歷史
      application: [], // 應用程式指標歷史
      database: [], // 資料庫指標歷史
    };

    // 當前計數器和計時器
    this.counters = {
      api_requests_total: 0,
      api_errors_total: 0,
      discord_events_total: 0,
      discord_messages_processed: 0,
      db_queries_total: 0,
      db_errors_total: 0,
    };

    this.timings = {
      api_response_times: [],
      db_query_times: [],
    };

    // 事件循環延遲監控
    this.eventLoopDelay = 0;
    this.setupEventLoopMonitoring();

    // 收集定時器
    this.collectionTimer = null;
    this.isRunning = false;

    // 進程啟動時間
    this.startTime = Date.now();

    // CPU 使用率追蹤
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuCheck = Date.now();

    // Discord 客戶端引用（可選）
    this.discordClient = null;

    // 資料庫連接池引用（可選）
    this.dbPool = null;

    // 告警管理器引用（可選）
    this.alertManager = null;
  }

  /**
   * 設定 Discord 客戶端以追蹤 Discord 事件
   */
  setDiscordClient(client) {
    this.discordClient = client;
    console.log("✅ Discord 客戶端已連接到 MetricsCollector");
  }

  /**
   * 設定告警管理器以監控指標閾值
   */
  setAlertManager(alertManager) {
    this.alertManager = alertManager;
    console.log("✅ 告警管理器已連接到 MetricsCollector");
  }

  /**
   * 設定資料庫連接池並包裝查詢方法以追蹤指標
   */
  setDatabasePool(pool) {
    this.dbPool = pool;

    // 保存原始的 query 方法
    const originalQuery = pool.query.bind(pool);

    // 包裝 query 方法
    pool.query = async (...args) => {
      const startTime = Date.now();

      try {
        this.incrementCounter("db_queries_total");
        const result = await originalQuery(...args);

        const duration = Date.now() - startTime;
        this.recordTiming("db_query_time", duration);

        // 記錄慢速查詢
        if (duration > 500) {
          const queryText =
            typeof args[0] === "string"
              ? args[0].substring(0, 100)
              : args[0].text?.substring(0, 100) || "unknown";
          console.warn(`⚠️  慢速查詢 (${duration}ms): ${queryText}...`);

          // 觸發告警（如果已配置告警管理器）
          if (this.alertManager) {
            const level = duration > 2000 ? "ERROR" : "WARN";
            this.alertManager.triggerAlert(
              level,
              `慢速資料庫查詢`,
              {
                query: queryText,
                duration,
                threshold: duration > 2000 ? 2000 : 500,
              },
              `slow_query:${queryText.substring(0, 50)}`
            );
          }
        }

        return result;
      } catch (error) {
        this.incrementCounter("db_errors_total");

        // 記錄資料庫錯誤告警
        if (this.alertManager) {
          this.alertManager.triggerAlert(
            "ERROR",
            "資料庫查詢錯誤",
            {
              error: error.message,
              query:
                typeof args[0] === "string"
                  ? args[0].substring(0, 100)
                  : args[0].text?.substring(0, 100) || "unknown",
            },
            "db_query_error"
          );
        }

        throw error;
      }
    };

    console.log("✅ 資料庫連接池已連接到 MetricsCollector");
  }

  /**
   * 設定事件循環延遲監控
   */
  setupEventLoopMonitoring() {
    // 定期測量事件循環延遲
    setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const delay = performance.now() - start;
        this.eventLoopDelay = delay;
      });
    }, 1000);
  }

  /**
   * 啟動指標收集
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️  MetricsCollector 已經在運行中");
      return;
    }

    console.log("✅ 啟動 MetricsCollector");
    this.isRunning = true;

    // 立即收集一次
    this.collectSystemMetrics();

    // 定期收集
    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics();
      this.cleanupOldMetrics();
    }, this.interval);
  }

  /**
   * 停止指標收集
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log("🛑 停止 MetricsCollector");
    this.isRunning = false;

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
  }

  /**
   * 收集系統指標
   */
  collectSystemMetrics() {
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const systemMetric = {
      timestamp: Date.now(),
      cpu: cpuUsage,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      eventLoopDelay: Math.round(this.eventLoopDelay * 100) / 100, // 保留兩位小數
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // 秒
    };

    this.metrics.system.push(systemMetric);

    // 同時收集應用程式和資料庫指標
    this.collectApplicationMetrics();
    this.collectDatabaseMetrics();

    // 檢查告警（如果已配置告警管理器）
    if (this.alertManager) {
      this.checkAlerts();
    }
  }

  /**
   * 收集應用程式指標
   */
  collectApplicationMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 計算每分鐘請求數
    const recentResponseTimes = this.timings.api_response_times.filter(
      (t) => t.timestamp > oneMinuteAgo
    );
    const requestsPerMinute = recentResponseTimes.length;

    // 計算平均響應時間
    const avgResponseTime =
      recentResponseTimes.length > 0
        ? Math.round(
            recentResponseTimes.reduce((sum, t) => sum + t.value, 0) /
              recentResponseTimes.length
          )
        : 0;

    // Discord 狀態
    let discordStatus = {
      websocket: "unknown",
      guilds: 0,
      latency: 0,
    };

    if (this.discordClient) {
      try {
        discordStatus = {
          websocket:
            this.discordClient.ws.status === 0 ? "connected" : "disconnected",
          guilds: this.discordClient.guilds.cache.size,
          latency: Math.round(this.discordClient.ws.ping),
        };
      } catch (error) {
        // Discord 客戶端可能未就緒
      }
    }

    const appMetric = {
      timestamp: now,
      apiRequests: {
        total: this.counters.api_requests_total,
        perMinute: requestsPerMinute,
        avgResponseTime: avgResponseTime,
      },
      discordEvents: {
        total: this.counters.discord_events_total,
        messagesProcessed: this.counters.discord_messages_processed,
        websocket: discordStatus.websocket,
        guilds: discordStatus.guilds,
        latency: discordStatus.latency,
      },
      errors: {
        api: this.counters.api_errors_total,
        database: this.counters.db_errors_total,
      },
    };

    this.metrics.application.push(appMetric);
  }

  /**
   * 收集資料庫指標
   */
  collectDatabaseMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 計算平均查詢時間
    const recentQueryTimes = this.timings.db_query_times.filter(
      (t) => t.timestamp > oneMinuteAgo
    );
    const avgQueryTime =
      recentQueryTimes.length > 0
        ? Math.round(
            recentQueryTimes.reduce((sum, t) => sum + t.value, 0) /
              recentQueryTimes.length
          )
        : 0;

    // 獲取連接池狀態
    let connectionStats = {
      active: 0,
      idle: 0,
      total: 0,
      waiting: 0,
    };

    if (this.dbPool) {
      try {
        connectionStats = {
          active: this.dbPool.totalCount - this.dbPool.idleCount,
          idle: this.dbPool.idleCount,
          total: this.dbPool.totalCount,
          waiting: this.dbPool.waitingCount,
        };
      } catch (error) {
        // 連接池可能未就緒
      }
    }

    const dbMetric = {
      timestamp: now,
      queries: {
        total: this.counters.db_queries_total,
        avgTime: avgQueryTime,
      },
      connections: connectionStats,
    };

    this.metrics.database.push(dbMetric);
  }

  /**
   * 獲取 CPU 使用率（進程級別）
   * 使用 process.cpuUsage() 計算實際的 CPU 使用百分比
   */
  getCPUUsage() {
    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastCpuCheck;

    // 計算 CPU 使用率百分比
    // cpuUsage 返回微秒，timeDiff 是毫秒
    const totalCpuTime = (currentUsage.user + currentUsage.system) / 1000; // 轉換為毫秒
    const cpuPercent = (totalCpuTime / timeDiff) * 100;

    // 更新追蹤值
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuCheck = currentTime;

    // 限制在 0-100 之間並四捨五入到一位小數
    return Math.min(100, Math.max(0, Math.round(cpuPercent * 10) / 10));
  }

  /**
   * 記錄自定義指標
   */
  recordMetric(category, name, value, tags = {}) {
    if (!this.metrics[category]) {
      console.warn(`⚠️  未知的指標類別: ${category}`);
      return;
    }

    const metric = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    this.metrics[category].push(metric);
  }

  /**
   * 增加計數器
   */
  incrementCounter(name, value = 1) {
    if (this.counters.hasOwnProperty(name)) {
      this.counters[name] += value;
    } else {
      console.warn(`⚠️  未知的計數器: ${name}`);
    }
  }

  /**
   * 記錄計時
   */
  recordTiming(name, duration) {
    const timing = {
      timestamp: Date.now(),
      value: duration,
    };

    if (name === "api_response_time") {
      this.timings.api_response_times.push(timing);

      // 只保留最近 5 分鐘的數據
      const fiveMinutesAgo = Date.now() - 300000;
      this.timings.api_response_times = this.timings.api_response_times.filter(
        (t) => t.timestamp > fiveMinutesAgo
      );
    } else if (name === "db_query_time") {
      this.timings.db_query_times.push(timing);

      // 只保留最近 5 分鐘的數據
      const fiveMinutesAgo = Date.now() - 300000;
      this.timings.db_query_times = this.timings.db_query_times.filter(
        (t) => t.timestamp > fiveMinutesAgo
      );
    }
  }

  /**
   * 獲取當前指標
   */
  getCurrentMetrics() {
    const latest = {
      system: this.metrics.system[this.metrics.system.length - 1] || null,
      application:
        this.metrics.application[this.metrics.application.length - 1] || null,
      database: this.metrics.database[this.metrics.database.length - 1] || null,
    };

    return {
      timestamp: Date.now(),
      current: latest,
      counters: { ...this.counters },
    };
  }

  /**
   * 獲取歷史指標
   */
  getHistoricalMetrics(startTime, endTime) {
    const filterByTime = (metrics) => {
      return metrics.filter((m) => {
        return m.timestamp >= startTime && m.timestamp <= endTime;
      });
    };

    return {
      system: filterByTime(this.metrics.system),
      application: filterByTime(this.metrics.application),
      database: filterByTime(this.metrics.database),
    };
  }

  /**
   * 獲取指標摘要
   */
  getMetricsSummary() {
    const systemMetrics = this.metrics.system;
    const appMetrics = this.metrics.application;

    if (systemMetrics.length === 0) {
      return null;
    }

    // 計算平均值
    const avgCpu = Math.round(
      systemMetrics.reduce((sum, m) => sum + m.cpu, 0) / systemMetrics.length
    );

    const avgMemory = Math.round(
      systemMetrics.reduce((sum, m) => sum + m.memory.used, 0) /
        systemMetrics.length
    );

    const avgEventLoopDelay =
      Math.round(
        (systemMetrics.reduce((sum, m) => sum + m.eventLoopDelay, 0) /
          systemMetrics.length) *
          100
      ) / 100;

    const totalApiRequests = this.counters.api_requests_total;
    const totalErrors =
      this.counters.api_errors_total + this.counters.db_errors_total;

    return {
      avgCpu,
      avgMemory,
      avgEventLoopDelay,
      totalApiRequests,
      totalErrors,
      dataPoints: systemMetrics.length,
      period: {
        start: systemMetrics[0].timestamp,
        end: systemMetrics[systemMetrics.length - 1].timestamp,
      },
    };
  }

  /**
   * 清理舊指標（保留最近 24 小時）
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - this.retentionPeriod;

    this.metrics.system = this.metrics.system.filter(
      (m) => m.timestamp > cutoffTime
    );
    this.metrics.application = this.metrics.application.filter(
      (m) => m.timestamp > cutoffTime
    );
    this.metrics.database = this.metrics.database.filter(
      (m) => m.timestamp > cutoffTime
    );
  }

  /**
   * 檢查告警
   * 將當前指標傳遞給告警管理器進行閾值檢查
   */
  checkAlerts() {
    if (!this.alertManager) {
      return;
    }

    try {
      const currentMetrics = this.getCurrentMetrics();
      this.alertManager.checkMetrics(currentMetrics);
    } catch (error) {
      console.error("❌ 告警檢查失敗:", error.message);
    }
  }

  /**
   * 獲取統計資訊
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      interval: this.interval,
      retentionPeriod: this.retentionPeriod,
      dataPoints: {
        system: this.metrics.system.length,
        application: this.metrics.application.length,
        database: this.metrics.database.length,
      },
      counters: { ...this.counters },
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

module.exports = MetricsCollector;
