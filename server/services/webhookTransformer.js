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

      // Discord 不允許 username 包含 "discord"，改用 "DC"
      let username = config.username || page?.name || "Status Update";
      console.log("🔍 原始 username:", username);
      // 使用正則替換所有 discord 變體（不區分大小寫）
      username = username.replace(/discord/gi, "DC");
      console.log("🔍 替換後 username:", username);

      result.discordPayload = {
        username,
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

      // Discord 不允許 username 包含 "discord"，改用 "DC"
      let compUsername = config.username || page?.name || "Status Update";
      if (compUsername.toLowerCase().includes("discord")) {
        compUsername = compUsername.replace(/discord/gi, "DC");
      }

      result.discordPayload = {
        username: compUsername,
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

      // Discord 不允許 username 包含 "discord"，改用 "DC"
      let pageUsername = config.username || page?.name || "Status Update";
      if (pageUsername.toLowerCase().includes("discord")) {
        pageUsername = pageUsername.replace(/discord/gi, "DC");
      }

      result.discordPayload = {
        username: pageUsername,
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
   * 自訂轉換器 - 增強版
   * 支援完整的 Discord Embed 結構自訂
   */
  transformCustom(payload, config = {}) {
    const { template, embedConfig } = config;

    // 新的 embedConfig 格式（推薦）
    if (embedConfig) {
      return {
        trackingId: this.evaluateExpression(embedConfig.trackingId, payload),
        isUpdate: false,
        discordPayload: this.buildCustomEmbed(embedConfig, payload),
      };
    }

    // 舊的 template 格式（向後相容）
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
   * 建構自訂 Embed
   * embedConfig 結構：
   * {
   *   username: "{{source.name}} Bot",
   *   avatar_url: "https://...",
   *   content: "純文字訊息（可選）",
   *   embed: {
   *     title: "{{event.type}}: {{event.name}}",
   *     titleUrl: "{{event.url}}",
   *     description: "{{event.description}}",
   *     color: "#FF5733" 或 "{{status}}" 或數字,
   *     colorMap: { "success": "#00FF00", "error": "#FF0000" },
   *     thumbnail: "{{user.avatar}}",
   *     image: "{{attachment.url}}",
   *     author: {
   *       name: "{{user.name}}",
   *       url: "{{user.profile}}",
   *       icon_url: "{{user.avatar}}"
   *     },
   *     footer: {
   *       text: "{{source.name}}",
   *       icon_url: "{{source.icon}}"
   *     },
   *     timestamp: "{{event.created_at}}" 或 "auto",
   *     fields: [
   *       { name: "狀態", value: "{{status}}", inline: true },
   *       { name: "詳情", value: "{{details}}", inline: false, condition: "{{details}}" }
   *     ],
   *     fieldsFromArray: {
   *       source: "{{items}}",
   *       name: "{{item.title}}",
   *       value: "{{item.description}}",
   *       inline: true,
   *       limit: 10
   *     }
   *   }
   * }
   */
  buildCustomEmbed(embedConfig, payload) {
    const result = {};

    // 基本訊息設定
    if (embedConfig.username) {
      let username =
        this.evaluateExpression(embedConfig.username, payload) || "Webhook";
      // Discord 不允許 username 包含 "discord"
      username = username.replace(/discord/gi, "DC");
      result.username = username;
    }

    if (embedConfig.avatar_url) {
      result.avatar_url = this.evaluateExpression(
        embedConfig.avatar_url,
        payload
      );
    }

    if (embedConfig.content) {
      result.content = this.evaluateExpression(embedConfig.content, payload);
    }

    // 建構 Embed
    if (embedConfig.embed) {
      const embed = this.buildSingleEmbed(embedConfig.embed, payload);
      if (embed && Object.keys(embed).length > 0) {
        result.embeds = [embed];
      }
    }

    // 支援多個 Embeds
    if (embedConfig.embeds && Array.isArray(embedConfig.embeds)) {
      result.embeds = embedConfig.embeds
        .map((e) => this.buildSingleEmbed(e, payload))
        .filter((e) => e && Object.keys(e).length > 0);
    }

    return result;
  }

  /**
   * 建構單個 Embed
   */
  buildSingleEmbed(embedDef, payload) {
    const embed = {};

    // Title
    if (embedDef.title) {
      const title = this.evaluateExpression(embedDef.title, payload);
      if (title) embed.title = title.substring(0, 256);
    }

    // URL
    if (embedDef.titleUrl || embedDef.url) {
      const url = this.evaluateExpression(
        embedDef.titleUrl || embedDef.url,
        payload
      );
      if (url && this.isValidUrl(url)) embed.url = url;
    }

    // Description
    if (embedDef.description) {
      const desc = this.evaluateExpression(embedDef.description, payload);
      if (desc) embed.description = desc.substring(0, 4096);
    }

    // Color
    embed.color = this.resolveColor(embedDef.color, embedDef.colorMap, payload);

    // Thumbnail
    if (embedDef.thumbnail) {
      const url = this.evaluateExpression(embedDef.thumbnail, payload);
      if (url && this.isValidUrl(url)) embed.thumbnail = { url };
    }

    // Image
    if (embedDef.image) {
      const url = this.evaluateExpression(embedDef.image, payload);
      if (url && this.isValidUrl(url)) embed.image = { url };
    }

    // Author
    if (embedDef.author) {
      const author = {};
      if (embedDef.author.name) {
        const name = this.evaluateExpression(embedDef.author.name, payload);
        if (name) author.name = name.substring(0, 256);
      }
      if (embedDef.author.url) {
        const url = this.evaluateExpression(embedDef.author.url, payload);
        if (url && this.isValidUrl(url)) author.url = url;
      }
      if (embedDef.author.icon_url) {
        const url = this.evaluateExpression(embedDef.author.icon_url, payload);
        if (url && this.isValidUrl(url)) author.icon_url = url;
      }
      if (Object.keys(author).length > 0) embed.author = author;
    }

    // Footer
    if (embedDef.footer) {
      const footer = {};
      if (typeof embedDef.footer === "string") {
        const text = this.evaluateExpression(embedDef.footer, payload);
        if (text) footer.text = text.substring(0, 2048);
      } else {
        if (embedDef.footer.text) {
          const text = this.evaluateExpression(embedDef.footer.text, payload);
          if (text) footer.text = text.substring(0, 2048);
        }
        if (embedDef.footer.icon_url) {
          const url = this.evaluateExpression(
            embedDef.footer.icon_url,
            payload
          );
          if (url && this.isValidUrl(url)) footer.icon_url = url;
        }
      }
      if (Object.keys(footer).length > 0) embed.footer = footer;
    }

    // Timestamp
    if (embedDef.timestamp) {
      if (embedDef.timestamp === "auto" || embedDef.timestamp === true) {
        embed.timestamp = new Date().toISOString();
      } else {
        const ts = this.evaluateExpression(embedDef.timestamp, payload);
        if (ts) {
          const date = new Date(ts);
          if (!isNaN(date.getTime())) {
            embed.timestamp = date.toISOString();
          }
        }
      }
    }

    // Fields - 靜態定義
    if (embedDef.fields && Array.isArray(embedDef.fields)) {
      const fields = [];
      for (const fieldDef of embedDef.fields) {
        // 條件檢查
        if (fieldDef.condition) {
          const condValue = this.evaluateExpression(
            fieldDef.condition,
            payload
          );
          if (!condValue || condValue === "undefined" || condValue === "null")
            continue;
        }

        const name = this.evaluateExpression(fieldDef.name, payload);
        const value = this.evaluateExpression(fieldDef.value, payload);

        if (name && value) {
          fields.push({
            name: name.substring(0, 256),
            value: value.substring(0, 1024),
            inline: fieldDef.inline === true,
          });
        }

        if (fields.length >= 25) break; // Discord 限制
      }
      if (fields.length > 0) embed.fields = fields;
    }

    // Fields - 從陣列動態生成
    if (embedDef.fieldsFromArray) {
      const arrayDef = embedDef.fieldsFromArray;
      const sourceArray = this.evaluateExpression(
        arrayDef.source,
        payload,
        true
      );

      if (Array.isArray(sourceArray)) {
        const fields = embed.fields || [];
        const limit = Math.min(arrayDef.limit || 10, 25 - fields.length);

        for (let i = 0; i < Math.min(sourceArray.length, limit); i++) {
          const item = sourceArray[i];
          const itemContext = { ...payload, item, index: i };

          const name = this.evaluateExpression(arrayDef.name, itemContext);
          const value = this.evaluateExpression(arrayDef.value, itemContext);

          if (name && value) {
            fields.push({
              name: name.substring(0, 256),
              value: value.substring(0, 1024),
              inline: arrayDef.inline === true,
            });
          }
        }

        if (fields.length > 0) embed.fields = fields;
      }
    }

    return embed;
  }

  /**
   * 解析顏色值
   */
  resolveColor(colorDef, colorMap, payload) {
    if (!colorDef) return 0x3498db; // 預設藍色

    // 數字直接返回
    if (typeof colorDef === "number") return colorDef;

    // 字串處理
    let colorValue = this.evaluateExpression(colorDef, payload);

    // 如果有 colorMap，嘗試映射
    if (colorMap && colorMap[colorValue]) {
      colorValue = colorMap[colorValue];
    }

    // 解析顏色字串
    if (typeof colorValue === "string") {
      // Hex 格式 (#FF5733 或 FF5733)
      if (colorValue.startsWith("#")) {
        return parseInt(colorValue.slice(1), 16);
      }
      if (/^[0-9A-Fa-f]{6}$/.test(colorValue)) {
        return parseInt(colorValue, 16);
      }
      // 數字字串
      const num = parseInt(colorValue, 10);
      if (!isNaN(num)) return num;
    }

    return 0x3498db;
  }

  /**
   * 評估表達式
   * 支援：
   * - {{path.to.value}} - 取值
   * - {{path.to.value | default: "預設值"}} - 預設值
   * - {{path.to.value | truncate: 100}} - 截斷
   * - {{path.to.value | uppercase}} - 大寫
   * - {{path.to.value | lowercase}} - 小寫
   * - {{path.to.value | date: "YYYY-MM-DD"}} - 日期格式化
   * - {{path.to.value | json}} - JSON 格式化
   */
  evaluateExpression(expr, payload, returnRaw = false) {
    if (expr === null || expr === undefined) return null;
    if (typeof expr !== "string") return expr;

    // 如果整個字串就是一個表達式，可能需要返回原始值
    const singleExprMatch = expr.match(/^\{\{([^}]+)\}\}$/);
    if (singleExprMatch && returnRaw) {
      const result = this.processExpression(singleExprMatch[1].trim(), payload);
      return result;
    }

    // 替換所有表達式
    return expr.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      const result = this.processExpression(expression.trim(), payload);
      if (result === undefined || result === null) return "";
      if (typeof result === "object") return JSON.stringify(result);
      return String(result);
    });
  }

  /**
   * 處理單個表達式
   */
  processExpression(expression, payload) {
    // 分割管道操作
    const parts = expression.split("|").map((p) => p.trim());
    const path = parts[0];

    // 取得原始值
    let value = this.getNestedValue(payload, path);

    // 應用管道操作
    for (let i = 1; i < parts.length; i++) {
      const pipe = parts[i];
      value = this.applyPipe(value, pipe, payload);
    }

    return value;
  }

  /**
   * 應用管道操作
   */
  applyPipe(value, pipe, payload) {
    const [pipeName, ...args] = pipe.split(":").map((p) => p.trim());
    const arg = args.join(":").trim();

    switch (pipeName) {
      case "default":
        return value === undefined || value === null || value === ""
          ? arg.replace(/^["']|["']$/g, "")
          : value;

      case "truncate":
        const maxLen = parseInt(arg, 10) || 100;
        if (typeof value === "string" && value.length > maxLen) {
          return value.substring(0, maxLen) + "...";
        }
        return value;

      case "uppercase":
        return typeof value === "string" ? value.toUpperCase() : value;

      case "lowercase":
        return typeof value === "string" ? value.toLowerCase() : value;

      case "capitalize":
        return typeof value === "string"
          ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          : value;

      case "json":
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }

      case "date":
        if (!value) return value;
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return value;
          // 簡單的日期格式化
          const format = arg || "YYYY-MM-DD HH:mm";
          return this.formatDate(date, format);
        } catch {
          return value;
        }

      case "timestamp":
        // Discord 時間戳格式
        if (!value) return value;
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return value;
          const ts = Math.floor(date.getTime() / 1000);
          const style = arg || "R"; // R=relative, F=full, etc.
          return `<t:${ts}:${style}>`;
        } catch {
          return value;
        }

      case "emoji":
        // 狀態 emoji 映射
        const emojiMap = {
          success: "✅",
          ok: "✅",
          operational: "✅",
          resolved: "✅",
          warning: "⚠️",
          degraded: "⚠️",
          partial: "🟠",
          error: "❌",
          critical: "🔴",
          major: "🔴",
          outage: "🔴",
          info: "ℹ️",
          investigating: "🔍",
          monitoring: "👀",
          pending: "⏳",
          scheduled: "📅",
          maintenance: "🔧",
        };
        const key = String(value).toLowerCase();
        return emojiMap[key] || value;

      case "codeblock":
        const lang = arg || "";
        return `\`\`\`${lang}\n${value}\n\`\`\``;

      case "inline":
        return `\`${value}\``;

      case "link":
        // {{url | link: "顯示文字"}}
        if (arg && this.isValidUrl(String(value))) {
          return `[${arg.replace(/^["']|["']$/g, "")}](${value})`;
        }
        return value;

      case "replace":
        // {{value | replace: "from,to"}}
        if (typeof value === "string" && arg) {
          const [from, to] = arg
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""));
          return value.replace(new RegExp(from, "g"), to || "");
        }
        return value;

      case "join":
        // {{array | join: ", "}}
        if (Array.isArray(value)) {
          const separator = arg.replace(/^["']|["']$/g, "") || ", ";
          return value.join(separator);
        }
        return value;

      case "first":
        if (Array.isArray(value)) return value[0];
        return value;

      case "last":
        if (Array.isArray(value)) return value[value.length - 1];
        return value;

      case "count":
        if (Array.isArray(value)) return value.length;
        if (typeof value === "string") return value.length;
        return 0;

      default:
        return value;
    }
  }

  /**
   * 簡單日期格式化
   */
  formatDate(date, format) {
    const pad = (n) => String(n).padStart(2, "0");
    const replacements = {
      YYYY: date.getFullYear(),
      MM: pad(date.getMonth() + 1),
      DD: pad(date.getDate()),
      HH: pad(date.getHours()),
      mm: pad(date.getMinutes()),
      ss: pad(date.getSeconds()),
    };
    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(key, value);
    }
    return result;
  }

  /**
   * 驗證 URL
   */
  isValidUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
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
