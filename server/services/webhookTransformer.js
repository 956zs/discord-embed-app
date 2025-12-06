/**
 * Webhook 轉換器服務
 * 將各種來源的 webhook 格式轉換為 Discord Webhook 格式
 */

class WebhookTransformer {
  constructor() {
    // 內建轉換器
    this.transformers = {
      statuspage: this.transformStatuspage.bind(this),
      github: this.transformGitHub.bind(this),
      gitlab: this.transformGitLab.bind(this),
      custom: this.transformCustom.bind(this),
      raw: this.transformRaw.bind(this),
    };
  }

  /**
   * 轉換 webhook payload
   * @param {string} sourceType - 來源類型
   * @param {object} payload - 原始 payload
   * @param {object} config - 轉換器配置
   * @param {object} existingData - 現有訊息資料（用於編輯模式）
   * @returns {object} Discord webhook payload 和追蹤資訊
   */
  transform(sourceType, payload, config = {}, existingData = null) {
    const transformer = this.transformers[sourceType] || this.transformers.raw;
    return transformer(payload, config, existingData);
  }

  /**
   * 自動偵測來源類型
   */
  detectSourceType(payload, headers = {}) {
    if (
      payload.page &&
      (payload.incident || payload.component || payload.component_update)
    ) {
      return "statuspage";
    }
    if (headers["x-github-event"] || payload.repository?.full_name) {
      return "github";
    }
    if (headers["x-gitlab-event"] || payload.object_kind) {
      return "gitlab";
    }
    return "custom";
  }

  /**
   * 從 Statuspage payload 提取追蹤 ID
   */
  extractTrackingId(sourceType, payload) {
    if (sourceType === "statuspage") {
      if (payload.incident?.id) {
        return `incident_${payload.incident.id}`;
      }
      if (payload.component?.id) {
        return `component_${payload.component.id}`;
      }
    }
    return null;
  }

  /**
   * Statuspage 轉換器 (Discord Status, etc.)
   * 支援編輯模式：累加 fields
   */
  transformStatuspage(payload, config = {}, existingData = null) {
    const { page, incident, component, component_update } = payload;

    // 狀態顏色映射
    const statusColors = {
      operational: 0x2ecc71, // 綠色
      degraded_performance: 0xf1c40f, // 黃色
      partial_outage: 0xe67e22, // 橙色
      major_outage: 0xe74c3c, // 紅色
      under_maintenance: 0x3498db, // 藍色
      investigating: 0xe74c3c, // 紅色
      identified: 0xe67e22, // 橙色
      monitoring: 0xf1c40f, // 黃色
      resolved: 0x2ecc71, // 綠色
      scheduled: 0x3498db,
      in_progress: 0xe67e22,
      verifying: 0xf1c40f,
      completed: 0x2ecc71,
      none: 0x95a5a6,
      minor: 0xf1c40f,
      major: 0xe67e22,
      critical: 0xe74c3c,
    };

    // 狀態 emoji 映射
    const statusEmojis = {
      operational: "✅",
      degraded_performance: "⚠️",
      partial_outage: "🟠",
      major_outage: "🔴",
      under_maintenance: "🔧",
      investigating: "🔍",
      identified: "🎯",
      monitoring: "👀",
      resolved: "✅",
      scheduled: "📅",
      in_progress: "🔄",
      verifying: "🔎",
      completed: "✅",
      none: "⚪",
      minor: "🟡",
      major: "🟠",
      critical: "🔴",
    };

    // 狀態中文映射
    const statusNames = {
      investigating: "調查中",
      identified: "已確認",
      monitoring: "監控中",
      resolved: "已解決",
      scheduled: "已排程",
      in_progress: "進行中",
      verifying: "驗證中",
      completed: "已完成",
    };

    let result = {
      trackingId: null,
      isUpdate: false,
      discordPayload: null,
    };

    // 處理 Incident
    if (incident) {
      const status = incident.status || "investigating";
      const impact = incident.impact || "none";
      const color = statusColors[status] || statusColors[impact] || 0x95a5a6;
      const emoji = statusEmojis[status] || "📢";
      const trackingId = `incident_${incident.id}`;

      result.trackingId = trackingId;

      // 建立 fields（累加模式）
      let fields = [];

      if (existingData?.updates && Array.isArray(existingData.updates)) {
        // 已有更新記錄，使用現有的 fields
        fields = [...existingData.updates];
      }

      // 處理新的更新
      if (incident.incident_updates?.length > 0) {
        const latestUpdate = incident.incident_updates[0];
        const updateStatus = latestUpdate.status || status;
        const updateEmoji = statusEmojis[updateStatus] || "📢";
        const updateStatusName = statusNames[updateStatus] || updateStatus;

        // 使用 Discord 時間戳格式
        const timestamp = new Date(
          latestUpdate.created_at || latestUpdate.display_at
        ).getTime();
        const discordTimestamp = Math.floor(timestamp / 1000);

        const newField = {
          name: `${updateEmoji} ${updateStatusName} (<t:${discordTimestamp}:R>)`,
          value: latestUpdate.body?.substring(0, 1000) || "無內容",
          inline: false,
          _timestamp: timestamp, // 用於排序
          _status: updateStatus,
        };

        // 檢查是否已存在相同時間戳的更新
        const exists = fields.some((f) => f._timestamp === timestamp);
        if (!exists) {
          fields.push(newField);
          result.isUpdate = existingData !== null;
        }
      }

      // 按時間排序 fields
      fields.sort((a, b) => (a._timestamp || 0) - (b._timestamp || 0));

      // 清理內部欄位，只保留 Discord 需要的
      const cleanFields = fields.map((f) => ({
        name: f.name,
        value: f.value,
        inline: f.inline,
      }));

      result.discordPayload = {
        username: config.username || page?.name || "Status Update",
        avatar_url: config.avatar_url,
        embeds: [
          {
            title: `${incident.name || "Incident Update"}`,
            url: incident.shortlink || undefined,
            description: `• Impact: ${impact}`,
            color,
            fields: cleanFields,
            timestamp: incident.updated_at || new Date().toISOString(),
            footer: {
              text: page?.id || incident.organization_id || "Statuspage",
            },
          },
        ],
      };

      // 保存完整的 fields 資料（包含內部欄位）用於下次更新
      result.updatesData = fields;
      result.currentStatus = status;
    }

    // 處理 Component 更新
    if (component_update && component) {
      const newStatus = component_update.new_status || component.status;
      const oldStatus = component_update.old_status;
      const color = statusColors[newStatus] || 0x95a5a6;
      const emoji = statusEmojis[newStatus] || "📢";
      const trackingId = `component_${component.id}`;

      result.trackingId = trackingId;

      result.discordPayload = {
        username: config.username || page?.name || "Status Update",
        avatar_url: config.avatar_url,
        embeds: [
          {
            title: `${emoji} 元件狀態變更: ${component.name}`,
            description: page?.name ? `來自 ${page.name}` : undefined,
            color,
            fields: [
              { name: "元件", value: component.name, inline: true },
              {
                name: "新狀態",
                value: `${emoji} ${this.formatStatus(newStatus)}`,
                inline: true,
              },
              {
                name: "舊狀態",
                value: oldStatus ? this.formatStatus(oldStatus) : "N/A",
                inline: true,
              },
            ],
            timestamp: component_update.created_at || new Date().toISOString(),
            footer: { text: page?.name || "Statuspage" },
          },
        ],
      };

      result.currentStatus = newStatus;
    }

    // 頁面整體狀態（不追蹤）
    if (page && !incident && !component_update) {
      const indicator = page.status_indicator || "none";
      const color = statusColors[indicator] || 0x95a5a6;
      const emoji = statusEmojis[indicator] || "📢";

      result.discordPayload = {
        username: config.username || page?.name || "Status Update",
        avatar_url: config.avatar_url,
        embeds: [
          {
            title: `${emoji} ${page.name || "Status Update"}`,
            description: page.status_description || "狀態更新",
            color,
            timestamp: new Date().toISOString(),
            footer: { text: "Statuspage" },
          },
        ],
      };
    }

    // 如果沒有產生任何 payload
    if (!result.discordPayload) {
      result.discordPayload = {
        username: config.username || "Status Update",
        avatar_url: config.avatar_url,
        embeds: [
          {
            title: "📢 狀態更新",
            description: "收到狀態更新通知",
            color: 0x95a5a6,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    return result;
  }

  /**
   * GitHub 轉換器
   */
  transformGitHub(payload, config = {}) {
    const { repository, sender, action } = payload;

    let title = "📦 GitHub 事件";
    let description = "";
    let color = 0x24292e;
    const fields = [];

    if (payload.pusher && payload.commits) {
      title = `📤 Push to ${repository?.name || "repository"}`;
      description = `${payload.pusher.name} pushed ${payload.commits.length} commit(s)`;
      color = 0x2ecc71;

      payload.commits.slice(0, 5).forEach((commit, i) => {
        fields.push({
          name: `Commit ${i + 1}`,
          value: `[\`${commit.id.substring(0, 7)}\`](${
            commit.url
          }) ${commit.message.substring(0, 100)}`,
          inline: false,
        });
      });
    } else if (payload.pull_request) {
      const pr = payload.pull_request;
      title = `🔀 PR ${action}: ${pr.title}`;
      description = `#${pr.number} by ${pr.user?.login}`;
      color =
        action === "opened"
          ? 0x2ecc71
          : action === "closed"
          ? 0xe74c3c
          : 0xf1c40f;
      fields.push({
        name: "連結",
        value: `[查看 PR](${pr.html_url})`,
        inline: true,
      });
    } else if (payload.issue) {
      const issue = payload.issue;
      title = `📋 Issue ${action}: ${issue.title}`;
      description = `#${issue.number} by ${issue.user?.login}`;
      color =
        action === "opened"
          ? 0x2ecc71
          : action === "closed"
          ? 0xe74c3c
          : 0xf1c40f;
      fields.push({
        name: "連結",
        value: `[查看 Issue](${issue.html_url})`,
        inline: true,
      });
    }

    return {
      trackingId: null,
      isUpdate: false,
      discordPayload: {
        username: config.username || "GitHub",
        avatar_url:
          config.avatar_url ||
          "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
        embeds: [
          {
            title,
            description,
            color,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: repository?.full_name || "GitHub" },
          },
        ],
      },
    };
  }

  /**
   * GitLab 轉換器
   */
  transformGitLab(payload, config = {}) {
    const { object_kind, project, user } = payload;

    let title = "🦊 GitLab 事件";
    let description = "";
    let color = 0xfc6d26;
    const fields = [];

    if (object_kind === "push") {
      title = `📤 Push to ${project?.name || "repository"}`;
      description = `${user?.name || "Someone"} pushed ${
        payload.total_commits_count || 0
      } commit(s)`;
      color = 0x2ecc71;
    } else if (object_kind === "merge_request") {
      const mr = payload.object_attributes;
      title = `🔀 MR ${mr?.action}: ${mr?.title}`;
      description = `!${mr?.iid} by ${user?.name}`;
      color =
        mr?.action === "open"
          ? 0x2ecc71
          : mr?.action === "close"
          ? 0xe74c3c
          : 0xf1c40f;
      if (mr?.url)
        fields.push({
          name: "連結",
          value: `[查看 MR](${mr.url})`,
          inline: true,
        });
    } else if (object_kind === "issue") {
      const issue = payload.object_attributes;
      title = `📋 Issue ${issue?.action}: ${issue?.title}`;
      description = `#${issue?.iid} by ${user?.name}`;
      color =
        issue?.action === "open"
          ? 0x2ecc71
          : issue?.action === "close"
          ? 0xe74c3c
          : 0xf1c40f;
      if (issue?.url)
        fields.push({
          name: "連結",
          value: `[查看 Issue](${issue.url})`,
          inline: true,
        });
    }

    return {
      trackingId: null,
      isUpdate: false,
      discordPayload: {
        username: config.username || "GitLab",
        avatar_url:
          config.avatar_url ||
          "https://about.gitlab.com/images/press/logo/png/gitlab-icon-rgb.png",
        embeds: [
          {
            title,
            description,
            color,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: project?.path_with_namespace || "GitLab" },
          },
        ],
      },
    };
  }

  /**
   * 自訂轉換器
   */
  transformCustom(payload, config = {}) {
    const { template } = config;
    if (template) {
      return {
        trackingId: null,
        isUpdate: false,
        discordPayload: this.applyTemplate(template, payload),
      };
    }
    return this.transformRaw(payload, config);
  }

  /**
   * 原始格式轉換器
   */
  transformRaw(payload, config = {}) {
    const jsonStr = JSON.stringify(payload, null, 2);
    const truncated =
      jsonStr.length > 4000
        ? jsonStr.substring(0, 4000) + "\n... (truncated)"
        : jsonStr;

    return {
      trackingId: null,
      isUpdate: false,
      discordPayload: {
        username: config.username || "Webhook Relay",
        avatar_url: config.avatar_url,
        embeds: [
          {
            title: "📥 Webhook 收到",
            description: `\`\`\`json\n${truncated}\n\`\`\``,
            color: 0x3498db,
            timestamp: new Date().toISOString(),
            footer: { text: "原始 Webhook 資料" },
          },
        ],
      },
    };
  }

  formatStatus(status) {
    const statusMap = {
      operational: "正常運作",
      degraded_performance: "效能降低",
      partial_outage: "部分中斷",
      major_outage: "重大中斷",
      under_maintenance: "維護中",
      investigating: "調查中",
      identified: "已確認",
      monitoring: "監控中",
      resolved: "已解決",
      scheduled: "已排程",
      in_progress: "進行中",
      verifying: "驗證中",
      completed: "已完成",
      none: "無",
      minor: "輕微",
      major: "重大",
      critical: "嚴重",
    };
    return statusMap[status] || status;
  }

  applyTemplate(template, data) {
    const result = JSON.parse(JSON.stringify(template));
    const replaceVars = (obj) => {
      if (typeof obj === "string") {
        return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const value = this.getNestedValue(data, path.trim());
          return value !== undefined ? String(value) : match;
        });
      }
      if (Array.isArray(obj)) return obj.map(replaceVars);
      if (obj && typeof obj === "object") {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
          newObj[key] = replaceVars(value);
        }
        return newObj;
      }
      return obj;
    };
    return replaceVars(result);
  }

  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

module.exports = WebhookTransformer;
