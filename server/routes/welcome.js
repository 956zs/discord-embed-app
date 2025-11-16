const express = require("express");
const router = express.Router();
const welcomeController = require("../controllers/welcomeController");

// 歡迎訊息配置路由
router.get("/:guildId/config", welcomeController.getWelcomeConfig);
router.put("/:guildId/config", welcomeController.updateWelcomeConfig);
router.post("/:guildId/test", welcomeController.testWelcomeMessage);

// 成員統計路由
router.get("/:guildId/stats", welcomeController.getMemberStats);
router.get("/:guildId/events", welcomeController.getMemberEvents);
router.get("/:guildId/summary", welcomeController.getMemberSummary);

module.exports = router;
