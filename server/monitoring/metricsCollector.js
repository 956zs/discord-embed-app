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

    // 資料庫持久化配置
    this.persistenceEnabled = options.persistenceEnabled || false;
    this.persistenceInterval = options.persistenceInterval || 300000; // 5 分鐘
    this.persistenceTimer = null;
    this.lastPersistenceTime = Date.now();
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

    // 啟動資料庫持久化（如果啟用）
    if (this.persistenceEnabled && this.dbPool) {
      console.log("✅ 啟動資料庫持久化（每 5 分鐘）");
      this.persistenceTimer = setInterval(() => {
        this.persistMetricsToDatabase();
      }, this.persistenceInterval);
    }
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

    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
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
      persistence: {
        enabled: this.persistenceEnabled,
        lastPersistence: this.lastPersistenceTime,
      },
    };
  }

  /**
   * 將記憶體中的指標批次寫入資料庫
   * 每 5 分鐘執行一次
   */
  async persistMetricsToDatabase() {
    if (!this.dbPool) {
      console.warn("⚠️  資料庫連接池未設定，無法持久化指標");
      return;
    }

    try {
      const startTime = Date.now();
      const cutoffTime = this.lastPersistenceTime;
      let totalInserted = 0;

      // 獲取自上次持久化以來的新指標
      const newSystemMetrics = this.metrics.system.filter(
        (m) => m.timestamp > cutoffTime
      );
      const newAppMetrics = this.metrics.application.filter(
        (m) => m.timestamp > cutoffTime
      );
      const newDbMetrics = this.metrics.database.filter(
        (m) => m.timestamp > cutoffTime
      );

      // 批次插入系統指標
      if (newSystemMetrics.length > 0) {
        const systemInserts = [];
        for (const metric of newSystemMetrics) {
          systemInserts.push(
            this.insertMetric(
              "system",
              "cpu_usage",
              metric.cpu,
              metric.timestamp
            ),
            this.insertMetric(
              "system",
              "memory_used",
              metric.memory.used,
              metric.timestamp
            ),
            this.insertMetric(
              "system",
              "memory_percentage",
              metric.memory.percentage,
              metric.timestamp
            ),
            this.insertMetric(
              "system",
              "event_loop_delay",
              metric.eventLoopDelay,
              metric.timestamp
            ),
            this.insertMetric(
              "system",
              "uptime",
              metric.uptime,
              metric.timestamp
            )
          );
        }
        await Promise.all(systemInserts);
        totalInserted += systemInserts.length;
      }

      // 批次插入應用程式指標
      if (newAppMetrics.length > 0) {
        const appInserts = [];
        for (const metric of newAppMetrics) {
          appInserts.push(
            this.insertMetric(
              "application",
              "api_requests_total",
              metric.apiRequests.total,
              metric.timestamp
            ),
            this.insertMetric(
              "application",
              "api_requests_per_minute",
              metric.apiRequests.perMinute,
              metric.timestamp
            ),
            this.insertMetric(
              "application",
              "api_response_time_avg",
              metric.apiRequests.avgResponseTime,
              metric.timestamp
            ),
            this.insertMetric(
              "application",
              "discord_events_total",
              metric.discordEvents.total,
              metric.timestamp
            ),
            this.insertMetric(
              "application",
              "discord_messages_processed",
              metric.discordEvents.messagesProcessed,
              metric.timestamp
            ),
            this.insertMetric(
              "application",
              "api_errors_total",
              metric.errors.api,
              metric.timestamp
            )
          );
        }
        await Promise.all(appInserts);
        totalInserted += appInserts.length;
      }

      // 批次插入資料庫指標
      if (newDbMetrics.length > 0) {
        const dbInserts = [];
        for (const metric of newDbMetrics) {
          dbInserts.push(
            this.insertMetric(
              "database",
              "db_queries_total",
              metric.queries.total,
              metric.timestamp
            ),
            this.insertMetric(
              "database",
              "db_query_time_avg",
              metric.queries.avgTime,
              metric.timestamp
            ),
            this.insertMetric(
              "database",
              "db_connections_active",
              metric.connections.active,
              metric.timestamp
            ),
            this.insertMetric(
              "database",
              "db_connections_idle",
              metric.connections.idle,
              metric.timestamp
            )
          );
        }
        await Promise.all(dbInserts);
        totalInserted += dbInserts.length;
      }

      // 更新最後持久化時間
      this.lastPersistenceTime = Date.now();

      const duration = Date.now() - startTime;
      console.log(`✅ 指標持久化完成: ${totalInserted} 筆記錄 (${duration}ms)`);

      // 清理舊數據（保留 7 天）
      await this.cleanupOldDatabaseMetrics();
    } catch (error) {
      console.error("❌ 指標持久化失敗:", error.message);
    }
  }

  /**
   * 插入單一指標到資料庫
   */
  async insertMetric(metricType, metricName, metricValue, timestamp) {
    if (!this.dbPool) {
      return;
    }

    try {
      await this.dbPool.query(
        `INSERT INTO performance_metrics (timestamp, metric_type, metric_name, metric_value)
         VALUES (to_timestamp($1 / 1000.0), $2, $3, $4)`,
        [timestamp, metricType, metricName, metricValue]
      );
    } catch (error) {
      // 靜默失敗，避免影響主要功能
      console.error(
        `❌ 插入指標失敗 (${metricType}.${metricName}):`,
        error.message
      );
    }
  }

  /**
   * 清理舊的資料庫指標（保留 7 天）
   */
  async cleanupOldDatabaseMetrics() {
    if (!this.dbPool) {
      return;
    }

    try {
      const result = await this.dbPool.query(
        `DELETE FROM performance_metrics 
         WHERE created_at < NOW() - INTERVAL '7 days'`
      );

      if (result.rowCount > 0) {
        console.log(`🗑️  清理舊指標: ${result.rowCount} 筆記錄`);
      }
    } catch (error) {
      console.error("❌ 清理舊指標失敗:", error.message);
    }
  }

  /**
   * 從資料庫載入歷史指標
   */
  async loadHistoricalMetricsFromDatabase(startTime, endTime) {
    if (!this.dbPool) {
      console.warn("⚠️  資料庫連接池未設定");
      return null;
    }

    try {
      const result = await this.dbPool.query(
        `SELECT 
          EXTRACT(EPOCH FROM timestamp) * 1000 AS timestamp,
          metric_type,
          metric_name,
          metric_value
         FROM performance_metrics
         WHERE timestamp >= to_timestamp($1 / 1000.0)
           AND timestamp <= to_timestamp($2 / 1000.0)
         ORDER BY timestamp ASC`,
        [startTime, endTime]
      );

      // 將結果組織成結構化格式
      const metrics = {
        system: [],
        application: [],
        database: [],
      };

      // 按時間戳分組
      const byTimestamp = {};
      for (const row of result.rows) {
        const ts = parseInt(row.timestamp);
        if (!byTimestamp[ts]) {
          byTimestamp[ts] = { timestamp: ts };
        }
        byTimestamp[ts][row.metric_name] = parseFloat(row.metric_value);
      }

      // 轉換為陣列格式
      for (const ts in byTimestamp) {
        const data = byTimestamp[ts];

        // 系統指標
        if (data.cpu_usage !== undefined) {
          metrics.system.push({
            timestamp: data.timestamp,
            cpu: data.cpu_usage,
            memory: {
              used: data.memory_used || 0,
              percentage: data.memory_percentage || 0,
            },
            eventLoopDelay: data.event_loop_delay || 0,
            uptime: data.uptime || 0,
          });
        }

        // 應用程式指標
        if (data.api_requests_total !== undefined) {
          metrics.application.push({
            timestamp: data.timestamp,
            apiRequests: {
              total: data.api_requests_total || 0,
              perMinute: data.api_requests_per_minute || 0,
              avgResponseTime: data.api_response_time_avg || 0,
            },
            discordEvents: {
              total: data.discord_events_total || 0,
              messagesProcessed: data.discord_messages_processed || 0,
            },
            errors: {
              api: data.api_errors_total || 0,
            },
          });
        }

        // 資料庫指標
        if (data.db_queries_total !== undefined) {
          metrics.database.push({
            timestamp: data.timestamp,
            queries: {
              total: data.db_queries_total || 0,
              avgTime: data.db_query_time_avg || 0,
            },
            connections: {
              active: data.db_connections_active || 0,
              idle: data.db_connections_idle || 0,
            },
          });
        }
      }

      return metrics;
    } catch (error) {
      console.error("❌ 從資料庫載入指標失敗:", error.message);
      return null;
    }
  }
}

module.exports = MetricsCollector;
