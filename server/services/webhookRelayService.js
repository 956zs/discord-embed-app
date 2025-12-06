/**
 * Webhook 中轉服務
 * 管理 webhook 端點、接收、轉換和轉發
 * 支援訊息追蹤和編輯
 */

const axios = require("axios");
const crypto = require("crypto");
const WebhookTransformer = require("./webhookTransformer");

class WebhookRelayService {
  constructor(pool) {
    this.pool = pool;
    this.transformer = new WebhookTransformer();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * 生成唯一的端點 key
   */
  generateEndpointKey() {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * 創建新的 webhook 端點
   */
  async createEndpoint(data) {
    const {
      name,
      description,
      source_type = "custom",
      discord_webhook_url,
      guild_id,
      created_by,
      transformer_config = {},
    } = data;

    const endpoint_key = this.generateEndpointKey();

    const result = await this.pool.query(
      `INSERT INTO webhook_endpoints 
       (endpoint_key, name, description, source_type, discord_webhook_url, guild_id, created_by, transformer_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        endpoint_key,
        name,
        description,
        source_type,
        discord_webhook_url,
        guild_id,
        created_by,
        JSON.stringify(transformer_config),
      ]
    );

    return result.rows[0];
  }

  /**
   * 取得端點列表
   */
  async getEndpoints(guildId = null) {
    let query = "SELECT * FROM webhook_endpoints";
    const params = [];

    if (guildId) {
      query += " WHERE guild_id = $1";
      params.push(guildId);
    }

    query += " ORDER BY created_at DESC";

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * 根據 key 取得端點
   */
  async getEndpointByKey(endpointKey) {
    const result = await this.pool.query(
      "SELECT * FROM webhook_endpoints WHERE endpoint_key = $1",
      [endpointKey]
    );
    return result.rows[0];
  }

  /**
   * 根據 ID 取得端點
   */
  async getEndpointById(id) {
    const result = await this.pool.query(
      "SELECT * FROM webhook_endpoints WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  /**
   * 更新端點
   */
  async updateEndpoint(id, data) {
    const allowedFields = [
      "name",
      "description",
      "source_type",
      "discord_webhook_url",
      "enabled",
      "transformer_config",
    ];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(
          key === "transformer_config" ? JSON.stringify(value) : value
        );
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return this.getEndpointById(id);
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE webhook_endpoints SET ${updates.join(
        ", "
      )} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * 刪除端點
   */
  async deleteEndpoint(id) {
    const result = await this.pool.query(
      "DELETE FROM webhook_endpoints WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }

  /**
   * 取得訊息追蹤記錄
   */
  async getMessageTracking(endpointId, sourceTrackingId) {
    const result = await this.pool.query(
      `SELECT * FROM webhook_message_tracking 
       WHERE endpoint_id = $1 AND source_tracking_id = $2`,
      [endpointId, sourceTrackingId]
    );
    return result.rows[0];
  }

  /**
   * 創建或更新訊息追蹤記錄
   */
  async upsertMessageTracking(endpointId, sourceTrackingId, data) {
    const { discordMessageId, discordChannelId, currentStatus, updates } = data;

    const result = await this.pool.query(
      `INSERT INTO webhook_message_tracking 
       (endpoint_id, source_tracking_id, discord_message_id, discord_channel_id, current_status, updates)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint_id, source_tracking_id) 
       DO UPDATE SET 
         discord_message_id = COALESCE($3, webhook_message_tracking.discord_message_id),
         current_status = COALESCE($5, webhook_message_tracking.current_status),
         updates = COALESCE($6, webhook_message_tracking.updates),
         updated_at = NOW()
       RETURNING *`,
      [
        endpointId,
        sourceTrackingId,
        discordMessageId,
        discordChannelId,
        currentStatus,
        JSON.stringify(updates || []),
      ]
    );

    return result.rows[0];
  }

  /**
   * 從 Discord Webhook URL 解析資訊
   */
  parseWebhookUrl(webhookUrl) {
    // https://discord.com/api/webhooks/{webhook_id}/{webhook_token}
    const match = webhookUrl.match(/\/webhooks\/(\d+)\/([^/?]+)/);
    if (match) {
      return {
        webhookId: match[1],
        webhookToken: match[2],
      };
    }
    return null;
  }

  /**
   * 處理收到的 webhook
   */
  async handleIncomingWebhook(endpointKey, headers, body) {
    const endpoint = await this.getEndpointByKey(endpointKey);

    if (!endpoint) {
      return { success: false, error: "Endpoint not found", status: 404 };
    }

    if (!endpoint.enabled) {
      return { success: false, error: "Endpoint disabled", status: 403 };
    }

    const logEntry = await this.createLog(endpoint.id, headers, body);

    try {
      // 偵測或使用配置的來源類型
      let sourceType = endpoint.source_type;
      if (sourceType === "auto" || sourceType === "custom") {
        const detected = this.transformer.detectSourceType(body, headers);
        if (detected !== "custom") {
          sourceType = detected;
        }
      }

      // 檢查是否有追蹤 ID（用於編輯模式）
      const trackingId = this.transformer.extractTrackingId(sourceType, body);
      let existingTracking = null;

      if (trackingId) {
        existingTracking = await this.getMessageTracking(
          endpoint.id,
          trackingId
        );
      }

      // 轉換 payload（傳入現有資料用於累加）
      const transformerConfig = endpoint.transformer_config || {};
      const transformResult = this.transformer.transform(
        sourceType,
        body,
        transformerConfig,
        existingTracking
      );

      const { discordPayload, isUpdate, updatesData, currentStatus } =
        transformResult;

      // 更新日誌
      await this.updateLog(logEntry.id, {
        transformed_payload: discordPayload,
      });

      let sendResult;

      if (isUpdate && existingTracking?.discord_message_id) {
        // 編輯現有訊息
        console.log(`📝 編輯訊息: ${existingTracking.discord_message_id}`);
        sendResult = await this.editDiscordMessage(
          endpoint.discord_webhook_url,
          existingTracking.discord_message_id,
          discordPayload
        );
      } else {
        // 發送新訊息
        console.log(`📤 發送新訊息`);
        sendResult = await this.sendToDiscord(
          endpoint.discord_webhook_url,
          discordPayload,
          true // 需要返回訊息 ID
        );
      }

      if (sendResult.success) {
        // 更新追蹤記錄
        if (trackingId) {
          await this.upsertMessageTracking(endpoint.id, trackingId, {
            discordMessageId:
              sendResult.messageId || existingTracking?.discord_message_id,
            currentStatus,
            updates: updatesData,
          });
        }

        await this.updateEndpointStats(endpoint.id, "forwarded");
        await this.updateLog(logEntry.id, {
          status: "forwarded",
          forwarded_at: new Date().toISOString(),
        });

        return {
          success: true,
          logId: logEntry.id,
          isUpdate,
          messageId: sendResult.messageId,
        };
      } else {
        await this.updateEndpointStats(endpoint.id, "failed");
        await this.updateLog(logEntry.id, {
          status: "failed",
          error_message: sendResult.error,
        });

        return { success: false, error: sendResult.error, logId: logEntry.id };
      }
    } catch (error) {
      console.error("❌ Webhook 處理錯誤:", error);
      await this.updateEndpointStats(endpoint.id, "failed");
      await this.updateLog(logEntry.id, {
        status: "failed",
        error_message: error.message,
      });

      return { success: false, error: error.message, logId: logEntry.id };
    }
  }

  /**
   * 發送到 Discord Webhook
   */
  async sendToDiscord(webhookUrl, payload, waitForMessage = false) {
    const url = waitForMessage ? `${webhookUrl}?wait=true` : webhookUrl;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await axios.post(url, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });

        return {
          success: true,
          attempt: attempt + 1,
          messageId: response.data?.id,
        };
      } catch (error) {
        const isLastAttempt = attempt === this.retryAttempts - 1;

        if (isLastAttempt) {
          console.error(`❌ Discord Webhook 發送失敗:`, error.message);
          if (error.response?.data) {
            console.error("Discord 回應:", error.response.data);
          }
          return { success: false, error: error.message };
        }

        const delay = this.retryDelay * Math.pow(2, attempt);
        console.warn(`⚠️ Discord Webhook 發送失敗，${delay}ms 後重試`);
        await this.sleep(delay);
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  /**
   * 編輯 Discord 訊息
   */
  async editDiscordMessage(webhookUrl, messageId, payload) {
    const webhookInfo = this.parseWebhookUrl(webhookUrl);
    if (!webhookInfo) {
      return { success: false, error: "Invalid webhook URL" };
    }

    const editUrl = `https://discord.com/api/webhooks/${webhookInfo.webhookId}/${webhookInfo.webhookToken}/messages/${messageId}`;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        await axios.patch(editUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });

        return { success: true, attempt: attempt + 1, messageId };
      } catch (error) {
        const isLastAttempt = attempt === this.retryAttempts - 1;

        // 如果訊息不存在，改為發送新訊息
        if (error.response?.status === 404) {
          console.warn("⚠️ 訊息不存在，改為發送新訊息");
          return this.sendToDiscord(webhookUrl, payload, true);
        }

        if (isLastAttempt) {
          console.error(`❌ Discord 訊息編輯失敗:`, error.message);
          if (error.response?.data) {
            console.error("Discord 回應:", error.response.data);
          }
          return { success: false, error: error.message };
        }

        const delay = this.retryDelay * Math.pow(2, attempt);
        console.warn(`⚠️ Discord 訊息編輯失敗，${delay}ms 後重試`);
        await this.sleep(delay);
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  /**
   * 創建日誌記錄
   */
  async createLog(endpointId, headers, body) {
    const safeHeaders = { ...headers };
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;

    const result = await this.pool.query(
      `INSERT INTO webhook_logs (endpoint_id, raw_headers, raw_body, raw_body_text, status)
       VALUES ($1, $2, $3, $4, 'received')
       RETURNING *`,
      [
        endpointId,
        JSON.stringify(safeHeaders),
        typeof body === "object" ? JSON.stringify(body) : null,
        typeof body === "string" ? body : JSON.stringify(body),
      ]
    );

    await this.pool.query(
      `UPDATE webhook_endpoints 
       SET total_received = total_received + 1, last_received_at = NOW()
       WHERE id = $1`,
      [endpointId]
    );

    return result.rows[0];
  }

  /**
   * 更新日誌記錄
   */
  async updateLog(logId, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(
          key === "transformed_payload" ? JSON.stringify(value) : value
        );
        paramIndex++;
      }
    }

    if (updates.length === 0) return;

    values.push(logId);
    await this.pool.query(
      `UPDATE webhook_logs SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * 更新端點統計
   */
  async updateEndpointStats(endpointId, type) {
    const field = type === "forwarded" ? "total_forwarded" : "total_failed";
    const timeField = type === "forwarded" ? "last_forwarded_at" : null;

    let query = `UPDATE webhook_endpoints SET ${field} = ${field} + 1`;
    if (timeField) {
      query += `, ${timeField} = NOW()`;
    }
    query += ` WHERE id = $1`;

    await this.pool.query(query, [endpointId]);
  }

  /**
   * 取得端點日誌
   */
  async getLogs(endpointId, options = {}) {
    const { limit = 50, status } = options;
    let query = "SELECT * FROM webhook_logs WHERE endpoint_id = $1";
    const params = [endpointId];

    if (status) {
      query += " AND status = $2";
      params.push(status);
    }

    query += " ORDER BY received_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * 測試端點
   */
  async testEndpoint(endpointId) {
    const endpoint = await this.getEndpointById(endpointId);
    if (!endpoint) {
      return { success: false, error: "Endpoint not found" };
    }

    const testPayload = {
      username: "Webhook Relay Test",
      embeds: [
        {
          title: "🧪 測試訊息",
          description: `這是來自 **${endpoint.name}** 的測試訊息`,
          color: 0x3498db,
          fields: [
            { name: "端點 ID", value: String(endpoint.id), inline: true },
            { name: "來源類型", value: endpoint.source_type, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Webhook Relay System" },
        },
      ],
    };

    return this.sendToDiscord(endpoint.discord_webhook_url, testPayload);
  }

  /**
   * 清理舊日誌
   */
  async cleanupOldLogs(days = 30) {
    const result = await this.pool.query(
      `DELETE FROM webhook_logs WHERE received_at < NOW() - INTERVAL '${days} days' RETURNING id`
    );
    return result.rowCount;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = WebhookRelayService;
