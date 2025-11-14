const express = require("express");
const router = express.Router();
const {
  getServerStats,
  getMemberActivity,
  getChannelUsage,
  getMessageTrends,
  getEmojiStats,
  getKeywordCloud,
  getTodayStats,
} = require("../controllers/statsController");
const { checkGuildWhitelist } = require("../middleware/guildWhitelist");

// 每個路由單獨應用白名單檢查
router.get("/server/:guildId", checkGuildWhitelist, getServerStats);
router.get("/members/:guildId", checkGuildWhitelist, getMemberActivity);
router.get("/channels/:guildId", checkGuildWhitelist, getChannelUsage);
router.get("/messages/:guildId", checkGuildWhitelist, getMessageTrends);
router.get("/emojis/:guildId", checkGuildWhitelist, getEmojiStats);
router.get("/keywords/:guildId", checkGuildWhitelist, getKeywordCloud);
router.get("/today/:guildId", checkGuildWhitelist, getTodayStats);

module.exports = router;
