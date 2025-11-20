const os = require("os");
const pm2Info = require("../utils/pm2Info");

/**
 * HealthCheckService - 健康檢查服務
 *
 * 功能：
 * - 檢查資料庫連接狀態（包含連接池資訊）
 * - 檢查 Discord Bot 狀態（WebSocket 狀態、延遲）
 * - 檢查系統資源（CPU、記憶體）
 * - 檢查 PM2 進程狀態
 * - 提供詳細的診斷資訊
 */
class HealthCheckService {
  constructor(dependencies = {}) {
    this.pool = dependencies.pool; // 資料庫連接池
    this.client = dependencies.client; // Discord 客戶端
    this.metricsCollector = dependencies.metricsCollector; // 指標收集器

    // 健康檢查超時設定（5 秒）
    this.timeout = dependencies.timeout || 5000;

    // 進程啟動時間
    this.startTime = Date.now();
  }

  /**
   * 執行完整健康檢查
   * @returns {Promise<Object>} 健康檢查結果
   */
  async performHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkDiscordBot(),
      this.checkSystemResources(),
      this.checkPM2Processes(),
    ]);

    const [dbCheck, botCheck, systemCheck, pm2Check] = checks.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : { status: "error", error: result.reason?.message }
    );

    // 判斷整體健康狀態
    const overallStatus = this.determineOverallStatus(
      dbCheck,
      botCheck,
      systemCheck
    );

    // 獲取指標摘要
    const metrics = this.getMetricsSummary();

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database: dbCheck,
        discordBot: botCheck,
        system: systemCheck,
        pm2: pm2Check,
      },
      metrics,
    };
  }

  /**
   * 檢查資料庫健康
   * @returns {Promise<Object>} 資料庫健康狀態
   */
  async checkDatabase() {
    if (!this.pool) {
      return {
        status: "unavailable",
        message: "資料庫連接池未配置",
      };
    }

    try {
      const startTime = Date.now();

      // 執行簡單查詢測試連接
      await Promise.race([
        this.pool.query("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("查詢超時")), this.timeout)
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // 獲取連接池資訊
      const connections = {
        total: this.pool.totalCount || 0,
        active: (this.pool.totalCount || 0) - (this.pool.idleCount || 0),
        idle: this.pool.idleCount || 0,
        waiting: this.pool.waitingCount || 0,
      };

      return {
        status: "healthy",
        responseTime,
        connections,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        connections: {
          total: 0,
          active: 0,
          idle: 0,
          waiting: 0,
        },
      };
    }
  }

  /**
   * 檢查 Discord Bot 健康
   * @returns {Promise<Object>} Discord Bot 健康狀態
   */
  async checkDiscordBot() {
    if (!this.client) {
      return {
        status: "unavailable",
        message: "Discord 客戶端未配置",
      };
    }

    try {
      // 檢查 WebSocket 狀態
      // 0 = READY, 1 = CONNECTING, 2 = RECONNECTING, 3 = IDLE, 4 = NEARLY, 5 = DISCONNECTED, 6 = WAITING_FOR_GUILDS, 7 = IDENTIFYING, 8 = RESUMING
      const wsStatus = this.client.ws.status;
      const isConnected = wsStatus === 0; // READY

      const statusMap = {
        0: "connected",
        1: "connecting",
        2: "reconnecting",
        3: "idle",
        4: "nearly",
        5: "disconnected",
        6: "waiting_for_guilds",
        7: "identifying",
        8: "resuming",
      };

      const websocketStatus = statusMap[wsStatus] || "unknown";

      // 獲取 Bot 資訊
      const guilds = this.client.guilds.cache.size;
      const latency = Math.round(this.client.ws.ping);

      // 判斷健康狀態
      let status = "healthy";
      if (!isConnected) {
        status = "degraded";
      }
      if (wsStatus === 5) {
        // DISCONNECTED
        status = "unhealthy";
      }

      return {
        status,
        websocket: websocketStatus,
        guilds,
        latency,
        user: this.client.user
          ? {
              id: this.client.user.id,
              tag: this.client.user.tag,
            }
          : null,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        websocket: "error",
        guilds: 0,
        latency: 0,
      };
    }
  }

  /**
   * 檢查系統資源
   * @returns {Promise<Object>} 系統資源狀態
   */
  async checkSystemResources() {
    try {
      // 記憶體資訊
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const systemUsedMemory = totalMemory - freeMemory;

      // 進程記憶體使用率（RSS / heap total）
      const processMemoryPercentage = Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      );

      // 系統記憶體使用率
      const systemMemoryPercentage = Math.round(
        (systemUsedMemory / totalMemory) * 100
      );

      // CPU 資訊（從 MetricsCollector 獲取，如果可用）
      let cpuUsage = 0;
      if (this.metricsCollector) {
        const currentMetrics = this.metricsCollector.getCurrentMetrics();
        if (currentMetrics.current.system) {
          cpuUsage = currentMetrics.current.system.cpu;
        }
      }

      // 事件循環延遲（從 MetricsCollector 獲取，如果可用）
      let eventLoopDelay = 0;
      if (this.metricsCollector) {
        eventLoopDelay = this.metricsCollector.eventLoopDelay || 0;
      }

      // 判斷健康狀態（基於系統記憶體使用率）
      let status = "healthy";
      if (systemMemoryPercentage > 90 || cpuUsage > 90) {
        status = "unhealthy";
      } else if (systemMemoryPercentage > 80 || cpuUsage > 80) {
        status = "degraded";
      }

      return {
        status,
        cpu: cpuUsage,
        memory: {
          // 進程記憶體
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB - RSS（實際記憶體，與 PM2 一致）
          heap: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB - V8 heap used
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB - V8 heap total
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB - C++ objects
          processPercentage: processMemoryPercentage, // heap used / heap total
          // 系統記憶體
          system: {
            total: Math.round(totalMemory / 1024 / 1024), // MB
            free: Math.round(freeMemory / 1024 / 1024), // MB
            used: Math.round(systemUsedMemory / 1024 / 1024), // MB
            percentage: systemMemoryPercentage, // system used / system total
          },
        },
        eventLoopDelay: Math.round(eventLoopDelay * 100) / 100,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * 判斷整體健康狀態
   * @param {Object} dbCheck 資料庫檢查結果
   * @param {Object} botCheck Bot 檢查結果
   * @param {Object} systemCheck 系統檢查結果
   * @returns {string} 整體狀態 (healthy|degraded|unhealthy)
   */
  determineOverallStatus(dbCheck, botCheck, systemCheck) {
    const statuses = [dbCheck.status, botCheck.status, systemCheck.status];

    // 如果任何關鍵服務不健康，整體狀態為 unhealthy
    if (
      dbCheck.status === "unhealthy" ||
      dbCheck.status === "unavailable" ||
      botCheck.status === "unhealthy"
    ) {
      return "unhealthy";
    }

    // 如果任何服務降級，整體狀態為 degraded
    if (statuses.includes("degraded")) {
      return "degraded";
    }

    // 如果有錯誤但不是關鍵服務，狀態為 degraded
    if (statuses.includes("error")) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * 獲取指標摘要
   * @returns {Object|null} 指標摘要
   */
  getMetricsSummary() {
    if (!this.metricsCollector) {
      return null;
    }

    try {
      const currentMetrics = this.metricsCollector.getCurrentMetrics();
      const counters = currentMetrics.counters;

      return {
        apiRequests: counters.api_requests_total || 0,
        apiErrors: counters.api_errors_total || 0,
        discordEvents: counters.discord_events_total || 0,
        discordMessages: counters.discord_messages_processed || 0,
        dbQueries: counters.db_queries_total || 0,
        dbErrors: counters.db_errors_total || 0,
      };
    } catch (error) {
      console.error("❌ 獲取指標摘要失敗:", error.message);
      return null;
    }
  }

  /**
   * 檢查 PM2 進程狀態
   * @returns {Promise<Object>} PM2 進程狀態
   */
  async checkPM2Processes() {
    try {
      const summary = await pm2Info.getProcessSummary();

      // 判斷健康狀態
      let status = "healthy";
      if (!summary.summary.allRunning) {
        status = "unhealthy";
      } else if (summary.summary.totalRestarts > 10) {
        status = "degraded";
      }

      return {
        status,
        mode: summary.mode,
        count: summary.count,
        processes: summary.processes,
        summary: summary.summary,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        mode: "unknown",
        count: 0,
        processes: [],
      };
    }
  }

  /**
   * 獲取健康狀態摘要（簡化版本）
   * @returns {Promise<Object>} 健康狀態摘要
   */
  async getHealthSummary() {
    const fullCheck = await this.performHealthCheck();

    return {
      status: fullCheck.status,
      timestamp: fullCheck.timestamp,
      uptime: fullCheck.uptime,
      services: {
        database: fullCheck.services.database.status,
        discordBot: fullCheck.services.discordBot.status,
        system: fullCheck.services.system.status,
        pm2: fullCheck.services.pm2?.status || "unknown",
      },
    };
  }
}

module.exports = HealthCheckService;
