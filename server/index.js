require("dotenv").config();
const express = require("express");
const cors = require("cors");
const statsRoutes = require("./routes/stats");
const { getAllowedGuilds } = require("./utils/guildManager");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 配置（支援 Discord Embedded App）
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://discord.com",
      "https://*.discord.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

// 路由
app.use("/api/stats", statsRoutes);

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

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);

  const allowedGuilds = getAllowedGuilds();
  if (allowedGuilds.length > 0) {
    console.log(`🔒 白名單已啟用，允許 ${allowedGuilds.length} 個伺服器`);
    console.log(`   伺服器 ID: ${allowedGuilds.join(", ")}`);
  } else {
    console.log(`⚠️  白名單未設定，允許所有伺服器訪問`);
    console.log(`   建議在 .env 中設定 ALLOWED_GUILD_IDS`);
  }
});
