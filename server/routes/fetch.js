const express = require("express");
const router = express.Router();
const { checkGuildWhitelist } = require("../middleware/guildWhitelist");

// 這個路由需要從 bot 實例獲取 historyFetcher
// 將在 server/index.js 中動態設置

let historyFetcher = null;

// 設置 historyFetcher 實例
router.setHistoryFetcher = (fetcher) => {
  historyFetcher = fetcher;
};

// 開始提取任務
router.post("/:guildId/start", checkGuildWhitelist, async (req, res) => {
  try {
    if (!historyFetcher) {
      return res.status(503).json({ error: "提取服務未就緒" });
    }

    const { guildId } = req.params;
    const { channelId, channelName, anchorMessageId, userId } = req.body;

    // 檢查管理員權限
    const isAdmin = await historyFetcher.isAdmin(guildId, userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "需要管理員權限" });
    }

    // 創建任務
    const taskId = await historyFetcher.createTask(
      guildId,
      channelId,
      channelName,
      anchorMessageId,
      userId
    );

    // 異步開始提取
    historyFetcher.startFetch(taskId, guildId, channelId, anchorMessageId);

    res.json({
      success: true,
      taskId,
      message: "提取任務已開始",
    });
  } catch (error) {
    console.error("❌ 開始提取失敗:", error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取任務進度
router.get("/progress/:taskId", async (req, res) => {
  try {
    if (!historyFetcher) {
      return res.status(503).json({ error: "提取服務未就緒" });
    }

    const { taskId } = req.params;
    const progress = historyFetcher.getTaskProgress(parseInt(taskId));

    if (!progress) {
      return res.json({ active: false });
    }

    res.json({
      active: true,
      ...progress,
    });
  } catch (error) {
    console.error("❌ 獲取進度失敗:", error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取所有活躍任務
router.get("/active", async (req, res) => {
  try {
    if (!historyFetcher) {
      return res.status(503).json({ error: "提取服務未就緒" });
    }

    const tasks = historyFetcher.getActiveTasks();
    res.json(tasks);
  } catch (error) {
    console.error("❌ 獲取活躍任務失敗:", error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取伺服器頻道列表
router.get("/:guildId/channels", checkGuildWhitelist, async (req, res) => {
  try {
    if (!historyFetcher) {
      return res.status(503).json({ error: "提取服務未就緒" });
    }

    const { guildId } = req.params;
    const guild = historyFetcher.client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    // 獲取所有頻道
    const channels = Array.from(guild.channels.cache.values())
      .filter((ch) => ch.type === 0) // 僅文字頻道
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
      }))
      .sort((a, b) => a.position - b.position);

    res.json(channels);
  } catch (error) {
    console.error("❌ 獲取頻道列表失敗:", error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取伺服器身分組列表
router.get("/:guildId/roles", checkGuildWhitelist, async (req, res) => {
  try {
    if (!historyFetcher) {
      return res.status(503).json({ error: "提取服務未就緒" });
    }

    const { guildId } = req.params;
    const guild = historyFetcher.client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    // 獲取所有身分組
    const roles = Array.from(guild.roles.cache.values())
      .filter((role) => role.name !== "@everyone")
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
      }))
      .sort((a, b) => b.position - a.position);

    res.json(roles);
  } catch (error) {
    console.error("❌ 獲取身分組列表失敗:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
