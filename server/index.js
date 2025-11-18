require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
require("dotenv").config({
  path: require("path").resolve(__dirname, "../bot/.env"),
});
const express = require("express");
const cors = require("cors");
const statsRoutes = require("./routes/stats");
const historyRoutes = require("./routes/history");
const fetchRoutes = require("./routes/fetch");
const authRoutes = require("./routes/auth");
const welcomeRoutes = require("./routes/welcome");
const metricsRoutes = require("./routes/metrics");
const { getAllowedGuilds } = require("./utils/guildManager");
const pool = require("./database/db");
const MetricsCollector = require("./monitoring/metricsCollector");
const HealthCheckService = require("./monitoring/healthCheck");
const AlertManager = require("./monitoring/alertManager");
const WebhookNotifier = require("./services/webhookNotifier");
const createMonitoringMiddleware = require("./middleware/monitoring");

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化監控系統（如果啟用）
let metricsCollector = null;
let healthCheckService = null;
let alertManager = null;

if (process.env.ENABLE_MONITORING === "true") {
  console.log("✅ 啟用效能監控系統");

  // 創建 MetricsCollector
  metricsCollector = new MetricsCollector({
    interval: parseInt(process.env.METRICS_INTERVAL) || 30000,
    retentionPeriod:
      (parseInt(process.env.METRICS_RETENTION_HOURS) || 24) * 3600000,
  });

  // 創建 AlertManager
  alertManager = new AlertManager({
    thresholds: {
      cpu: {
        warn: parseInt(process.env.ALERT_CPU_WARN) || 80,
        error: parseInt(process.env.ALERT_CPU_ERROR) || 90,
      },
      memory: {
        warn: parseInt(process.env.ALERT_MEMORY_WARN) || 80,
        error: parseInt(process.env.ALERT_MEMORY_ERROR) || 90,
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
    },
  });

  // 創建並配置 WebhookNotifier（如果啟用）
  if (process.env.WEBHOOK_ENABLED === "true" && process.env.WEBHOOK_URLS) {
    const webhookUrls = process.env.WEBHOOK_URLS.split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (webhookUrls.length > 0) {
      const webhookNotifier = new WebhookNotifier(webhookUrls);
      alertManager.setWebhookNotifier(webhookNotifier);
      console.log(`✅ Webhook 通知已啟用 (${webhookUrls.length} 個 URL)`);
    } else {
      console.log("⚠️  WEBHOOK_URLS 已設定但為空，Webhook 通知未啟用");
    }
  } else {
    console.log("ℹ️  Webhook 通知未啟用");
  }

  // 連接 AlertManager 到 MetricsCollector
  metricsCollector.setAlertManager(alertManager);

  // 設定資料庫連接池
  metricsCollector.setDatabasePool(pool);

  // 啟動指標收集
  metricsCollector.start();

  // 設定監控路由的實例
  metricsRoutes.setMonitoringInstances(metricsCollector, alertManager);
}

// CORS 配置（支援 Discord Embedded App）
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://discord.com",
      "https://1401130025411018772.discordsays.com",
      /\.discord\.com$/,
      /\.discordsays\.com$/,
    ],
    credentials: true,
  })
);
app.use(express.json());

// 監控中介軟體（必須在所有路由之前註冊）
if (metricsCollector) {
  app.use(createMonitoringMiddleware(metricsCollector, alertManager));
  console.log("✅ 監控中介軟體已註冊");
}

// 路由（添加日誌）
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});
app.use("/api/stats", statsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/fetch", fetchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/welcome", welcomeRoutes);
app.use("/api/metrics", metricsRoutes);

app.get("/health", async (req, res) => {
  try {
    // 如果健康檢查服務未初始化，使用簡單版本
    if (!healthCheckService) {
      const botModule = require("../bot/index.js");
      const getHistoryFetcher = botModule.historyFetcher;
      const fetcher = getHistoryFetcher ? getHistoryFetcher() : null;

      return res.json({
        status: "ok",
        server: "running",
        bot: fetcher ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      });
    }

    // 使用完整的健康檢查服務
    const healthCheck = await healthCheckService.performHealthCheck();

    // 根據健康狀態設定 HTTP 狀態碼
    const statusCode = healthCheck.status === "unhealthy" ? 503 : 200;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error("❌ 健康檢查失敗:", error.message);
    res.status(503).json({
      status: "error",
      server: "running",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 白名單資訊端點（僅供管理員查看）
app.get("/api/admin/whitelist", (req, res) => {
  const allowedGuilds = getAllowedGuilds();

  if (allowedGuilds.length === 0) {
    return res.json({
      enabled: false,
      message: "白名單未啟用，允許所有伺服器",
      guilds: [],
    });
  }

  res.json({
    enabled: true,
    count: allowedGuilds.length,
    guilds: allowedGuilds,
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);

  const allowedGuilds = getAllowedGuilds();
  if (allowedGuilds.length > 0) {
    console.log(`🔒 白名單已啟用，允許 ${allowedGuilds.length} 個伺服器`);
    console.log(`   伺服器 ID: ${allowedGuilds.join(", ")}`);
  } else {
    console.log(`⚠️  白名單未設定，允許所有伺服器訪問`);
    console.log(`   建議在 .env 中設定 ALLOWED_GUILD_IDS`);
  }

  // 啟動 bot（僅在開發模式或單進程模式）
  const startBot = async () => {
    // 檢查是否應該在同一進程中啟動 bot
    const shouldStartBot =
      process.env.NODE_ENV !== "production" ||
      process.env.START_BOT_IN_SERVER === "true";

    if (!shouldStartBot) {
      console.log("⚠️  生產模式：Bot 應該作為獨立進程運行（使用 PM2）");
      console.log("   歷史提取功能將在 bot 進程中運行");
      console.log("   Server 將通過資料庫與 bot 通信");

      // 初始化健康檢查服務（不包含 Discord 客戶端）
      if (metricsCollector) {
        healthCheckService = new HealthCheckService({
          pool,
          client: null,
          metricsCollector,
        });
        console.log("✅ 健康檢查服務已初始化（無 Bot 連接）");
      }

      return;
    }

    try {
      console.log("🤖 正在啟動 Discord Bot（同進程模式）...");
      const botModule = require("../bot/index.js");
      const getHistoryFetcher = botModule.historyFetcher;
      const getClient = botModule.client;

      if (!getHistoryFetcher) {
        console.log("⚠️  bot 模組未導出 historyFetcher");
        return false;
      }

      // 重試機制：最多嘗試 10 次，每次間隔 2 秒
      let attempts = 0;
      const maxAttempts = 10;
      const retryInterval = 2000;

      const tryConnect = () => {
        attempts++;
        console.log(`🔄 等待 bot 就緒... (${attempts}/${maxAttempts})`);

        const fetcher = getHistoryFetcher();
        const client = getClient;

        if (fetcher) {
          fetchRoutes.setHistoryFetcher(fetcher);
          console.log("✅ 歷史訊息提取器已連接");

          // 設定 Discord 客戶端到 MetricsCollector
          if (metricsCollector && client) {
            metricsCollector.setDiscordClient(client);
          }

          // 初始化健康檢查服務
          if (metricsCollector) {
            healthCheckService = new HealthCheckService({
              pool,
              client,
              metricsCollector,
            });
            console.log("✅ 健康檢查服務已初始化");
          }

          return true;
        } else {
          if (attempts < maxAttempts) {
            setTimeout(tryConnect, retryInterval);
          } else {
            console.log("❌ Bot 啟動超時");

            // 即使 Bot 未連接，也初始化健康檢查服務
            if (metricsCollector) {
              healthCheckService = new HealthCheckService({
                pool,
                client: null,
                metricsCollector,
              });
              console.log("✅ 健康檢查服務已初始化（Bot 未連接）");
            }
          }
          return false;
        }
      };

      // 首次嘗試延遲 3 秒（等待 bot ready 事件）
      setTimeout(tryConnect, 3000);
    } catch (error) {
      console.log("❌ Bot 啟動失敗:", error.message);
      console.log("   請確保 bot 作為獨立進程運行");

      // 即使出錯，也初始化健康檢查服務
      if (metricsCollector) {
        healthCheckService = new HealthCheckService({
          pool,
          client: null,
          metricsCollector,
        });
        console.log("✅ 健康檢查服務已初始化（Bot 啟動失敗）");
      }
    }
  };

  startBot();
});
