/**
 * Webhook 中轉路由
 *
 * 公開端點 (接收外部 webhook):
 *   POST /api/webhook/relay/:endpointKey
 *
 * 管理端點 (需要認證):
 *   GET    /api/webhook/endpoints          - 列出所有端點
 *   POST   /api/webhook/endpoints          - 創建端點
 *   GET    /api/webhook/endpoints/:id      - 取得端點詳情
 *   PUT    /api/webhook/endpoints/:id      - 更新端點
 *   DELETE /api/webhook/endpoints/:id      - 刪除端點
 *   POST   /api/webhook/endpoints/:id/test - 測試端點
 *   GET    /api/webhook/endpoints/:id/logs - 取得端點日誌
 */

const express = require("express");
const router = express.Router();

let webhookRelayService = null;
let checkAdminAuth = null;

/**
 * 設定服務實例
 */
function setWebhookRelayService(service, adminAuthMiddleware) {
  webhookRelayService = service;
  checkAdminAuth = adminAuthMiddleware;
}

/**
 * 檢查服務是否可用
 */
function checkServiceAvailable(req, res, next) {
  if (!webhookRelayService) {
    return res.status(503).json({
      error: "Webhook relay service not available",
    });
  }
  next();
}

// ============================================
// 公開端點 - 接收外部 Webhook
// ============================================

/**
 * POST /api/webhook/relay/:endpointKey
 * 接收外部 webhook 並轉發到 Discord
 *
 * 這是公開端點，不需要認證
 * 外部服務 (如 Discord Status) 會發送 webhook 到這個 URL
 */
router.post("/relay/:endpointKey", checkServiceAvailable, async (req, res) => {
  try {
    const { endpointKey } = req.params;

    console.log(`📥 收到 Webhook: ${endpointKey}`);

    const result = await webhookRelayService.handleIncomingWebhook(
      endpointKey,
      req.headers,
      req.body
    );

    if (result.success) {
      console.log(`✅ Webhook 已轉發: ${endpointKey}`);
      res.status(200).json({ success: true, logId: result.logId });
    } else {
      console.error(`❌ Webhook 處理失敗: ${result.error}`);
      res.status(result.status || 500).json({
        success: false,
        error: result.error,
        logId: result.logId,
      });
    }
  } catch (error) {
    console.error("❌ Webhook 處理錯誤:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 管理端點 - 需要認證
// ============================================

/**
 * GET /api/webhook/endpoints
 * 列出所有 webhook 端點
 */
router.get("/endpoints", checkServiceAvailable, async (req, res) => {
  try {
    // 如果有 admin auth middleware，使用它
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const guildId = req.query.guild_id;
        const endpoints = await webhookRelayService.getEndpoints(guildId);

        // 隱藏敏感資訊
        const safeEndpoints = endpoints.map((ep) => ({
          ...ep,
          discord_webhook_url: ep.discord_webhook_url ? "***hidden***" : null,
        }));

        res.json({ endpoints: safeEndpoints });
      });
    }

    // 無認證時返回空列表
    res.json({ endpoints: [] });
  } catch (error) {
    console.error("❌ 取得端點列表失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhook/endpoints
 * 創建新的 webhook 端點
 */
router.post("/endpoints", checkServiceAvailable, async (req, res) => {
  try {
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const {
          name,
          description,
          source_type,
          discord_webhook_url,
          guild_id,
          transformer_config,
        } = req.body;

        if (!name || !discord_webhook_url) {
          return res.status(400).json({
            error: "缺少必要欄位",
            message: "name 和 discord_webhook_url 為必填",
          });
        }

        // 驗證 Discord Webhook URL 格式
        if (
          !discord_webhook_url.startsWith(
            "https://discord.com/api/webhooks/"
          ) &&
          !discord_webhook_url.startsWith(
            "https://discordapp.com/api/webhooks/"
          )
        ) {
          return res.status(400).json({
            error: "無效的 Discord Webhook URL",
          });
        }

        const endpoint = await webhookRelayService.createEndpoint({
          name,
          description,
          source_type: source_type || "statuspage",
          discord_webhook_url,
          guild_id,
          created_by: req.userId,
          transformer_config,
        });

        // 生成接收 URL
        const baseUrl =
          process.env.WEBHOOK_RELAY_BASE_URL ||
          `${req.protocol}://${req.get("host")}`;
        const receiveUrl = `${baseUrl}/api/webhook/relay/${endpoint.endpoint_key}`;

        res.status(201).json({
          endpoint: {
            ...endpoint,
            discord_webhook_url: "***hidden***",
          },
          receive_url: receiveUrl,
          message: "端點創建成功，請將 receive_url 設定到外部服務",
        });
      });
    }

    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("❌ 創建端點失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhook/endpoints/:id
 * 取得端點詳情
 */
router.get("/endpoints/:id", checkServiceAvailable, async (req, res) => {
  try {
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const endpoint = await webhookRelayService.getEndpointById(
          req.params.id
        );

        if (!endpoint) {
          return res.status(404).json({ error: "端點不存在" });
        }

        // 生成接收 URL
        const baseUrl =
          process.env.WEBHOOK_RELAY_BASE_URL ||
          `${req.protocol}://${req.get("host")}`;
        const receiveUrl = `${baseUrl}/api/webhook/relay/${endpoint.endpoint_key}`;

        res.json({
          endpoint: {
            ...endpoint,
            discord_webhook_url: "***hidden***",
          },
          receive_url: receiveUrl,
        });
      });
    }

    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("❌ 取得端點失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/webhook/endpoints/:id
 * 更新端點
 */
router.put("/endpoints/:id", checkServiceAvailable, async (req, res) => {
  try {
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const {
          name,
          description,
          source_type,
          discord_webhook_url,
          enabled,
          transformer_config,
        } = req.body;

        // 如果更新 webhook URL，驗證格式
        if (discord_webhook_url) {
          if (
            !discord_webhook_url.startsWith(
              "https://discord.com/api/webhooks/"
            ) &&
            !discord_webhook_url.startsWith(
              "https://discordapp.com/api/webhooks/"
            )
          ) {
            return res.status(400).json({
              error: "無效的 Discord Webhook URL",
            });
          }
        }

        const endpoint = await webhookRelayService.updateEndpoint(
          req.params.id,
          {
            name,
            description,
            source_type,
            discord_webhook_url,
            enabled,
            transformer_config,
          }
        );

        if (!endpoint) {
          return res.status(404).json({ error: "端點不存在" });
        }

        res.json({
          endpoint: {
            ...endpoint,
            discord_webhook_url: "***hidden***",
          },
        });
      });
    }

    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("❌ 更新端點失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/webhook/endpoints/:id
 * 刪除端點
 */
router.delete("/endpoints/:id", checkServiceAvailable, async (req, res) => {
  try {
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const endpoint = await webhookRelayService.deleteEndpoint(
          req.params.id
        );

        if (!endpoint) {
          return res.status(404).json({ error: "端點不存在" });
        }

        res.json({ success: true, message: "端點已刪除" });
      });
    }

    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("❌ 刪除端點失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhook/endpoints/:id/test
 * 測試端點 (發送測試訊息到 Discord)
 */
router.post("/endpoints/:id/test", checkServiceAvailable, async (req, res) => {
  try {
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const result = await webhookRelayService.testEndpoint(req.params.id);

        if (result.success) {
          res.json({ success: true, message: "測試訊息已發送" });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
      });
    }

    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("❌ 測試端點失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhook/endpoints/:id/logs
 * 取得端點日誌
 */
router.get("/endpoints/:id/logs", checkServiceAvailable, async (req, res) => {
  try {
    if (checkAdminAuth) {
      return checkAdminAuth(req, res, async () => {
        const { limit = 50, status } = req.query;

        const logs = await webhookRelayService.getLogs(req.params.id, {
          limit: parseInt(limit, 10),
          status,
        });

        res.json({ logs });
      });
    }

    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("❌ 取得日誌失敗:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhook/source-types
 * 取得支援的來源類型
 */
router.get("/source-types", (req, res) => {
  res.json({
    source_types: [
      {
        id: "statuspage",
        name: "Statuspage",
        description: "Atlassian Statuspage (Discord Status, etc.)",
      },
      { id: "github", name: "GitHub", description: "GitHub Webhooks" },
      { id: "gitlab", name: "GitLab", description: "GitLab Webhooks" },
      { id: "custom", name: "Custom", description: "自訂格式 (使用模板)" },
      { id: "raw", name: "Raw", description: "原始格式 (直接顯示 JSON)" },
    ],
  });
});

module.exports = router;
module.exports.setWebhookRelayService = setWebhookRelayService;
