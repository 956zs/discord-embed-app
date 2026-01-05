const axios = require("axios");

// Discord API 限制常量
const DISCORD_LIMITS = {
  CONTENT_MAX_LENGTH: 2000, // Discord content 最大長度
  EMBED_TITLE_MAX_LENGTH: 256, // Discord embed title 最大長度
  DISCORD_ID_REGEX: /^\d{17,19}$/, // Discord ID 格式（17-19 位數字）
};

/**
 * WebhookNotifier 服務
 * 負責發送 Discord Webhook 通知，包含速率限制和重試邏輯
 * 支援自訂通知模板（tag 用戶/角色、自訂內容）
 */
class WebhookNotifier {
  constructor(webhookUrls = []) {
    this.webhookUrls = Array.isArray(webhookUrls) ? webhookUrls : [];
    this.cooldowns = new Map(); // 追蹤冷卻期
    this.retryAttempts = 3; // 最多重試 3 次
    this.retryDelay = 1000; // 初始重試延遲 1 秒
    this.cooldownPeriod = 300000; // 5 分鐘冷卻期

    // 通知模板設定（可從資料庫載入）
    this.template = {
      mentionUsers: [], // 用戶 ID 列表，如 ["123456789"]
      mentionRoles: [], // 角色 ID 列表，如 ["123456789"]
      customContent: "", // 自訂內容前綴
      embedTitle: "", // 自訂 Embed 標題（留空使用預設）
      embedFooter: "Discord 統計系統監控", // 自訂 Embed 頁尾
    };

    // 資料庫連接池
    this.dbPool = null;
  }

  /**
   * 設定資料庫連接池
   */
  setDatabasePool(pool) {
    this.dbPool = pool;
  }

  /**
   * 從資料庫載入通知模板設定
   */
  async loadTemplateFromDatabase() {
    if (!this.dbPool) {
      return;
    }

    try {
      const result = await this.dbPool.query(
        `SELECT config_key, config_value, config_type
         FROM monitoring_config
         WHERE config_key LIKE 'webhook_%'`
      );

      for (const row of result.rows) {
        const { config_key, config_value, config_type } = row;

        switch (config_key) {
          case "webhook_mention_users":
            try {
              this.template.mentionUsers = JSON.parse(config_value) || [];
            } catch (e) {
              console.warn(`⚠️ 無效的 JSON 格式: ${config_key}`, e.message);
              this.template.mentionUsers = [];
            }
            break;
          case "webhook_mention_roles":
            try {
              this.template.mentionRoles = JSON.parse(config_value) || [];
            } catch (e) {
              console.warn(`⚠️ 無效的 JSON 格式: ${config_key}`, e.message);
              this.template.mentionRoles = [];
            }
            break;
          case "webhook_custom_content":
            this.template.customContent = config_value || "";
            break;
          case "webhook_embed_title":
            this.template.embedTitle = config_value || "";
            break;
          case "webhook_embed_footer":
            this.template.embedFooter = config_value || "Discord 統計系統監控";
            break;
        }
      }

      console.log("✅ Webhook 通知模板已從資料庫載入");
    } catch (error) {
      if (error.code !== "42P01") {
        console.error("❌ 載入 Webhook 模板失敗:", error.message);
      }
    }
  }

  /**
   * 儲存通知模板到資料庫
   */
  async saveTemplateToDatabase(newTemplate) {
    if (!this.dbPool) {
      return false;
    }

    try {
      const configItems = [];

      if (newTemplate.mentionUsers !== undefined) {
        configItems.push({
          key: "webhook_mention_users",
          value: JSON.stringify(newTemplate.mentionUsers),
          type: "json",
        });
        this.template.mentionUsers = newTemplate.mentionUsers;
      }
      if (newTemplate.mentionRoles !== undefined) {
        configItems.push({
          key: "webhook_mention_roles",
          value: JSON.stringify(newTemplate.mentionRoles),
          type: "json",
        });
        this.template.mentionRoles = newTemplate.mentionRoles;
      }
      if (newTemplate.customContent !== undefined) {
        configItems.push({
          key: "webhook_custom_content",
          value: newTemplate.customContent,
          type: "string",
        });
        this.template.customContent = newTemplate.customContent;
      }
      if (newTemplate.embedTitle !== undefined) {
        configItems.push({
          key: "webhook_embed_title",
          value: newTemplate.embedTitle,
          type: "string",
        });
        this.template.embedTitle = newTemplate.embedTitle;
      }
      if (newTemplate.embedFooter !== undefined) {
        configItems.push({
          key: "webhook_embed_footer",
          value: newTemplate.embedFooter,
          type: "string",
        });
        this.template.embedFooter = newTemplate.embedFooter;
      }

      for (const item of configItems) {
        await this.dbPool.query(
          `INSERT INTO monitoring_config (config_key, config_value, config_type)
           VALUES ($1, $2, $3)
           ON CONFLICT (config_key) DO UPDATE SET
             config_value = EXCLUDED.config_value,
             updated_at = NOW()`,
          [item.key, item.value, item.type]
        );
      }

      console.log("✅ Webhook 通知模板已儲存到資料庫");
      return true;
    } catch (error) {
      console.error("❌ 儲存 Webhook 模板失敗:", error.message);
      return false;
    }
  }

  /**
   * 更新通知模板（記憶體 + 資料庫）
   */
  async updateTemplate(newTemplate) {
    const saved = await this.saveTemplateToDatabase(newTemplate);
    return saved;
  }

  /**
   * 獲取當前模板設定
   */
  getTemplate() {
    return { ...this.template };
  }

  /**
   * 生成 mention 字串
   * Discord ID 格式驗證：17-19 位數字
   * @returns {{mentionString: string, validUserIds: string[], validRoleIds: string[]}}
   */
  buildMentionString() {
    const mentions = [];
    const validUserIds = [];
    const validRoleIds = [];

    // 防禦性檢查：確保 mentionUsers 是陣列
    const mentionUsers = Array.isArray(this.template.mentionUsers)
      ? this.template.mentionUsers
      : [];

    // 防禦性檢查：確保 mentionRoles 是陣列
    const mentionRoles = Array.isArray(this.template.mentionRoles)
      ? this.template.mentionRoles
      : [];

    // 添加用戶 mentions（類型檢查 + ID 格式驗證）
    for (const userId of mentionUsers) {
      if (typeof userId !== "string") continue;
      const trimmedId = userId.trim();
      if (trimmedId && DISCORD_LIMITS.DISCORD_ID_REGEX.test(trimmedId)) {
        mentions.push(`<@${trimmedId}>`);
        validUserIds.push(trimmedId);
      }
    }

    // 添加角色 mentions（類型檢查 + ID 格式驗證）
    for (const roleId of mentionRoles) {
      if (typeof roleId !== "string") continue;
      const trimmedId = roleId.trim();
      if (trimmedId && DISCORD_LIMITS.DISCORD_ID_REGEX.test(trimmedId)) {
        mentions.push(`<@&${trimmedId}>`);
        validRoleIds.push(trimmedId);
      }
    }

    // 限制 mentions 總長度，避免超過 Discord content 限制
    let mentionString = mentions.join(" ");
    if (mentionString.length > DISCORD_LIMITS.CONTENT_MAX_LENGTH) {
      mentionString = mentionString.substring(0, DISCORD_LIMITS.CONTENT_MAX_LENGTH);
    }

    return { mentionString, validUserIds, validRoleIds };
  }

  /**
   * 發送通知到所有配置的 Webhook URL
   * @param {string} level - 告警級別 (ERROR, WARN, INFO)
   * @param {string} message - 告警訊息
   * @param {object} details - 詳細資訊
   * @returns {Promise<{sent: number, failed: number, skipped: number}>}
   */
  async sendNotification(level, message, details = {}) {
    if (this.webhookUrls.length === 0) {
      console.log("ℹ️  未配置 Webhook URL，跳過通知發送");
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const results = await Promise.allSettled(
      this.webhookUrls.map((url) =>
        this.sendToWebhook(url, level, message, details)
      )
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success && !r.value.skipped)
    ).length;
    const skipped = results.filter(
      (r) => r.status === "fulfilled" && r.value.skipped
    ).length;

    console.log(
      `📤 Webhook 通知結果: 成功 ${sent}, 失敗 ${failed}, 跳過 ${skipped}`
    );

    return { sent, failed, skipped };
  }

  /**
   * 發送到單一 Webhook URL
   * @param {string} url - Webhook URL
   * @param {string} level - 告警級別
   * @param {string} message - 告警訊息
   * @param {object} details - 詳細資訊
   * @returns {Promise<{success: boolean, skipped?: boolean, attempt?: number}>}
   */
  async sendToWebhook(url, level, message, details) {
    // 檢查冷卻期
    if (this.isInCooldown(url, message)) {
      console.log(
        `⏳ Webhook 在冷卻期內，跳過發送: ${message.substring(0, 50)}...`
      );
      return { success: false, skipped: true, reason: "cooldown" };
    }

    const payload = this.formatDiscordWebhook(level, message, details);

    // 重試邏輯
    for (let i = 0; i < this.retryAttempts; i++) {
      try {
        await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000, // 5 秒超時
        });

        // 發送成功，設定冷卻期
        this.setCooldown(url, message);

        if (i > 0) {
          console.log(`✅ Webhook 發送成功 (重試 ${i} 次)`);
        }

        return { success: true, attempt: i + 1 };
      } catch (error) {
        const isLastAttempt = i === this.retryAttempts - 1;

        if (isLastAttempt) {
          console.error(
            `❌ Webhook 發送失敗 (已重試 ${this.retryAttempts} 次):`,
            error.message
          );
          return { success: false, skipped: false, error: error.message };
        }

        // 指數退避延遲
        const delay = this.retryDelay * Math.pow(2, i);
        console.warn(
          `⚠️  Webhook 發送失敗，${delay}ms 後重試 (${i + 1}/${
            this.retryAttempts
          }):`,
          error.message
        );
        await this.sleep(delay);
      }
    }

    return { success: false, skipped: false };
  }

  /**
   * 格式化 Discord Webhook 訊息
   * @param {string} level - 告警級別
   * @param {string} message - 告警訊息
   * @param {object} details - 詳細資訊
   * @returns {object} Discord Webhook payload
   */
  formatDiscordWebhook(level, message, details) {
    const colors = {
      ERROR: 0xff0000, // 紅色
      WARN: 0xffa500, // 橘色
      INFO: 0x0099ff, // 藍色
    };

    const emojis = {
      ERROR: "🚨",
      WARN: "⚠️",
      INFO: "ℹ️",
    };

    const fields = [
      {
        name: "時間",
        value: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
        inline: true,
      },
      {
        name: "級別",
        value: level,
        inline: true,
      },
    ];

    // 添加詳細資訊
    if (details && Object.keys(details).length > 0) {
      const detailsStr = JSON.stringify(details, null, 2);
      // Discord 限制 field value 最多 1024 字元
      const truncatedDetails =
        detailsStr.length > 1000
          ? detailsStr.substring(0, 1000) + "...\n```"
          : detailsStr;

      fields.push({
        name: "詳細資訊",
        value: `\`\`\`json\n${truncatedDetails}\n\`\`\``,
        inline: false,
      });
    }

    // 構建 content（mentions + 自訂內容）
    const { mentionString, validUserIds, validRoleIds } = this.buildMentionString();
    const contentParts = [];

    if (mentionString) {
      contentParts.push(mentionString);
    }

    // 計算 customContent 可用長度（考慮 mentions 已佔用的空間）
    if (this.template.customContent) {
      const usedLength = mentionString ? mentionString.length + 1 : 0; // +1 for space
      const availableLength = DISCORD_LIMITS.CONTENT_MAX_LENGTH - usedLength;
      if (availableLength > 0) {
        const sanitizedContent = this.template.customContent.substring(0, availableLength);
        contentParts.push(sanitizedContent);
      }
    }

    // 構建最終 content
    const content = contentParts.length > 0 ? contentParts.join(" ") : undefined;

    // 使用自訂標題或預設標題（動態計算 emoji 長度）
    let embedTitle;
    const emoji = emojis[level] || "";
    const emojiWithSpace = emoji ? emoji + " " : "";
    if (this.template.embedTitle) {
      const maxTitleLength = DISCORD_LIMITS.EMBED_TITLE_MAX_LENGTH - emojiWithSpace.length;
      const truncatedTitle = this.template.embedTitle.substring(0, maxTitleLength);
      embedTitle = `${emojiWithSpace}${truncatedTitle}`;
    } else {
      embedTitle = `${emoji} 系統告警 - ${level}`;
    }

    // 使用自訂頁尾（使用 ?? 避免空字串被替換）
    const footerText = this.template.embedFooter ?? "Discord 統計系統監控";

    return {
      content, // Discord 會自動處理 mentions
      allowed_mentions: {
        parse: [], // 禁止解析 @everyone/@here，防止濫用
        users: validUserIds,
        roles: validRoleIds,
      },
      embeds: [
        {
          title: embedTitle,
          description: message,
          color: colors[level],
          fields: fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: footerText,
          },
        },
      ],
    };
  }

  /**
   * 檢查是否在冷卻期內
   * @param {string} url - Webhook URL
   * @param {string} message - 告警訊息
   * @returns {boolean}
   */
  isInCooldown(url, message) {
    const key = this.getCooldownKey(url, message);
    const lastSent = this.cooldowns.get(key);

    if (!lastSent) {
      return false;
    }

    const timeSinceLastSent = Date.now() - lastSent;
    return timeSinceLastSent < this.cooldownPeriod;
  }

  /**
   * 設定冷卻期
   * @param {string} url - Webhook URL
   * @param {string} message - 告警訊息
   */
  setCooldown(url, message) {
    const key = this.getCooldownKey(url, message);
    this.cooldowns.set(key, Date.now());

    // 清理過期的冷卻期記錄（超過 10 分鐘）
    this.cleanupOldCooldowns();
  }

  /**
   * 生成冷卻期鍵值
   * @param {string} url - Webhook URL
   * @param {string} message - 告警訊息
   * @returns {string}
   */
  getCooldownKey(url, message) {
    // 使用 URL 的最後部分和訊息的前 50 個字元作為鍵值
    const urlPart = url.split("/").slice(-2).join("/");
    const messagePart = message.substring(0, 50);
    return `${urlPart}:${messagePart}`;
  }

  /**
   * 清理過期的冷卻期記錄
   */
  cleanupOldCooldowns() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, timestamp] of this.cooldowns.entries()) {
      if (now - timestamp > this.cooldownPeriod * 2) {
        // 10 分鐘
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cooldowns.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 清理了 ${expiredKeys.length} 個過期的冷卻期記錄`);
    }
  }

  /**
   * 延遲函數
   * @param {number} ms - 延遲毫秒數
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 更新 Webhook URLs
   * @param {string[]} urls - 新的 Webhook URLs
   */
  updateWebhookUrls(urls) {
    this.webhookUrls = Array.isArray(urls) ? urls : [];
    console.log(`🔄 更新 Webhook URLs: ${this.webhookUrls.length} 個`);
  }

  /**
   * 獲取當前配置的 Webhook URLs 數量
   * @returns {number}
   */
  getWebhookCount() {
    return this.webhookUrls.length;
  }
}

module.exports = WebhookNotifier;
