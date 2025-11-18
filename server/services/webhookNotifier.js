const axios = require("axios");

/**
 * WebhookNotifier 服務
 * 負責發送 Discord Webhook 通知，包含速率限制和重試邏輯
 */
class WebhookNotifier {
  constructor(webhookUrls = []) {
    this.webhookUrls = Array.isArray(webhookUrls) ? webhookUrls : [];
    this.cooldowns = new Map(); // 追蹤冷卻期
    this.retryAttempts = 3; // 最多重試 3 次
    this.retryDelay = 1000; // 初始重試延遲 1 秒
    this.cooldownPeriod = 300000; // 5 分鐘冷卻期
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

    return {
      embeds: [
        {
          title: `${emojis[level]} 系統告警 - ${level}`,
          description: message,
          color: colors[level],
          fields: fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: "Discord 統計系統監控",
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
