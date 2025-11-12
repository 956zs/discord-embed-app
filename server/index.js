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
const { getAllowedGuilds } = require("./utils/guildManager");

const app = express();
const PORT = process.env.PORT || 3001;

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

// 路由（添加日誌）
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});
app.use("/api/stats", statsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/fetch", fetchRoutes);
app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  try {
    const botModule = require("../bot/index.js");
    const getHistoryFetcher = botModule.historyFetcher;
    const fetcher = getHistoryFetcher ? getHistoryFetcher() : null;

    res.json({
      status: "ok",
      server: "running",
      bot: fetcher ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      status: "ok",
      server: "running",
      bot: "error",
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
      return;
    }

    try {
      console.log("🤖 正在啟動 Discord Bot（同進程模式）...");
      const botModule = require("../bot/index.js");
      const getHistoryFetcher = botModule.historyFetcher;

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
        if (fetcher) {
          fetchRoutes.setHistoryFetcher(fetcher);
          console.log("✅ 歷史訊息提取器已連接");
          return true;
        } else {
          if (attempts < maxAttempts) {
            setTimeout(tryConnect, retryInterval);
          } else {
            console.log("❌ Bot 啟動超時");
          }
          return false;
        }
      };

      // 首次嘗試延遲 3 秒（等待 bot ready 事件）
      setTimeout(tryConnect, 3000);
    } catch (error) {
      console.log("❌ Bot 啟動失敗:", error.message);
      console.log("   請確保 bot 作為獨立進程運行");
    }
  };

  startBot();
});
