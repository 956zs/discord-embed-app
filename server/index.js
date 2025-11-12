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
  res.json({ status: "ok" });
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

  // 嘗試連接到 bot 的 historyFetcher
  try {
    const botModule = require("../bot/index.js");
    const getHistoryFetcher = botModule.historyFetcher;

    // 等待 bot 就緒
    setTimeout(() => {
      const fetcher = getHistoryFetcher();
      if (fetcher) {
        fetchRoutes.setHistoryFetcher(fetcher);
        console.log("✅ 已連接到歷史訊息提取器");
      }
    }, 5000);
  } catch (error) {
    console.log("⚠️  無法連接到 bot，歷史提取功能將不可用");
  }
});
