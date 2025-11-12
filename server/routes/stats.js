const express = require("express");
const router = express.Router();
const {
  getServerStats,
  getMemberActivity,
  getChannelUsage,
  getMessageTrends,
  getEmojiStats,
  getKeywordCloud,
} = require("../controllers/statsController");
const { checkGuildWhitelist } = require("../middleware/guildWhitelist");

// 所有路由都需要通過白名單檢查
router.use(checkGuildWhitelist);

router.get("/server/:guildId", getServerStats);
router.get("/members/:guildId", getMemberActivity);
router.get("/channels/:guildId", getChannelUsage);
router.get("/messages/:guildId", getMessageTrends);
router.get("/emojis/:guildId", getEmojiStats);
router.get("/keywords/:guildId", getKeywordCloud);

module.exports = router;
