const express = require("express");
const router = express.Router();
const {
  getAdmins,
  checkAdmin,
  addAdmin,
  removeAdmin,
  getTasks,
  getTask,
  getFetchRanges,
  getChannelFetchStats,
  getFetchSummary,
} = require("../controllers/historyController");
const { checkGuildWhitelist } = require("../middleware/guildWhitelist");

// 管理員相關
router.get("/:guildId/admins", checkGuildWhitelist, getAdmins);
router.get("/:guildId/admins/:userId/check", checkGuildWhitelist, checkAdmin);
router.post("/:guildId/admins", checkGuildWhitelist, addAdmin);
router.delete("/:guildId/admins/:userId", checkGuildWhitelist, removeAdmin);

// 任務相關
router.get("/:guildId/tasks", checkGuildWhitelist, getTasks);
router.get("/:guildId/tasks/:taskId", checkGuildWhitelist, getTask);

// 提取範圍
router.get("/:guildId/ranges/:channelId", checkGuildWhitelist, getFetchRanges);

// 統計
router.get(
  "/:guildId/channel-stats",
  checkGuildWhitelist,
  getChannelFetchStats
);
router.get("/:guildId/summary", checkGuildWhitelist, getFetchSummary);

module.exports = router;
