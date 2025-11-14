const { Client, GatewayIntentBits } = require("discord.js");
const pool = require("../database/db");

// 初始化 Discord 客戶端
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.login(process.env.DISCORD_BOT_TOKEN);

// 獲取伺服器總體統計
exports.getServerStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    const stats = {
      name: guild.name,
      memberCount: guild.memberCount,
      channelCount: guild.channels.cache.size,
      roleCount: guild.roles.cache.size,
      createdAt: guild.createdAt,
    };

    res.json(stats);
  } catch (error) {
    console.error("❌ getServerStats 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取成員活躍度
exports.getMemberActivity = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days } = req.query; // 可選的天數參數

    // 根據 days 參數決定時間過濾
    let timeFilter = "";
    if (days === "today") {
      timeFilter = `AND created_at >= CURRENT_DATE`;
    } else if (days === "yesterday") {
      timeFilter = `AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`;
    } else if (days && days !== "all") {
      const daysNum = parseInt(days);
      if (!isNaN(daysNum)) {
        timeFilter = `AND created_at >= NOW() - INTERVAL '${daysNum} days'`;
      }
    }

    const result = await pool.query(
      `SELECT 
        user_id as id,
        username,
        COUNT(*) as message_count,
        MAX(created_at) as last_active
      FROM messages
      WHERE guild_id = $1
        ${timeFilter}
      GROUP BY user_id, username
      ORDER BY message_count DESC
      LIMIT 20`,
      [guildId]
    );

    const activity = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      messageCount: parseInt(row.message_count),
      lastActive: row.last_active,
    }));

    res.json(activity);
  } catch (error) {
    console.error("❌ getMemberActivity 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取頻道使用情況
exports.getChannelUsage = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days } = req.query; // 可選的天數參數

    // 根據 days 參數決定時間過濾
    let timeFilter = "";
    if (days === "today") {
      timeFilter = `AND m.created_at >= CURRENT_DATE`;
    } else if (days === "yesterday") {
      timeFilter = `AND m.created_at >= CURRENT_DATE - INTERVAL '1 day' AND m.created_at < CURRENT_DATE`;
    } else if (days && days !== "all") {
      const daysNum = parseInt(days);
      if (!isNaN(daysNum)) {
        timeFilter = `AND m.created_at >= NOW() - INTERVAL '${daysNum} days'`;
      }
    }

    // 如果有時間過濾，從 messages 表實時統計；否則使用 channel_stats 表
    let result;
    if (timeFilter) {
      result = await pool.query(
        `SELECT 
          m.channel_id as id,
          COALESCE(cs.channel_name, m.channel_id) as name,
          COUNT(m.id) as message_count,
          0 as type
        FROM messages m
        LEFT JOIN channel_stats cs ON m.channel_id = cs.channel_id AND m.guild_id = cs.guild_id
        WHERE m.guild_id = $1
          ${timeFilter}
        GROUP BY m.channel_id, cs.channel_name
        ORDER BY message_count DESC
        LIMIT 15`,
        [guildId]
      );
    } else {
      // 使用預先統計的數據（所有時間）
      result = await pool.query(
        `SELECT 
          channel_id as id,
          channel_name as name,
          message_count,
          0 as type
        FROM channel_stats
        WHERE guild_id = $1
        ORDER BY message_count DESC
        LIMIT 15`,
        [guildId]
      );
    }

    const channels = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      messageCount: parseInt(row.message_count),
      type: row.type,
    }));

    res.json(channels);
  } catch (error) {
    console.error("❌ getChannelUsage 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取訊息量趨勢
exports.getMessageTrends = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days } = req.query;

    // 根據 days 參數決定時間過濾
    let timeFilter = "";
    let displayDays = 30; // 用於限制顯示的天數

    if (days === "today") {
      timeFilter = `AND created_at >= CURRENT_DATE`;
      displayDays = 1;
    } else if (days === "yesterday") {
      timeFilter = `AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`;
      displayDays = 1;
    } else if (days && days !== "all") {
      const daysNum = parseInt(days);
      timeFilter = `AND created_at >= NOW() - INTERVAL '${daysNum} days'`;
      displayDays = daysNum;
    } else {
      // "all" 或未指定：顯示最近 365 天（避免數據過多）
      timeFilter = `AND created_at >= NOW() - INTERVAL '365 days'`;
      displayDays = 365;
    }

    // 直接從 messages 表統計，不依賴 daily_stats
    const result = await pool.query(
      `SELECT 
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
        COUNT(*) as messages,
        COUNT(DISTINCT user_id) as active_users
      FROM messages
      WHERE guild_id = $1
        ${timeFilter}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC`,
      [guildId]
    );

    const trends = result.rows.map((row) => ({
      date: row.date,
      messages: parseInt(row.messages),
      activeUsers: parseInt(row.active_users),
    }));

    res.json(trends);
  } catch (error) {
    console.error("❌ getMessageTrends 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取表情使用統計
exports.getEmojiStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days } = req.query; // 可選的天數參數

    // 根據 days 參數決定時間過濾
    let timeFilter = "";
    if (days === "today") {
      timeFilter = `AND used_at >= CURRENT_DATE`;
    } else if (days === "yesterday") {
      timeFilter = `AND used_at >= CURRENT_DATE - INTERVAL '1 day' AND used_at < CURRENT_DATE`;
    } else if (days && days !== "all") {
      const daysNum = parseInt(days);
      if (!isNaN(daysNum)) {
        timeFilter = `AND used_at >= NOW() - INTERVAL '${daysNum} days'`;
      }
    }

    const result = await pool.query(
      `SELECT 
        emoji_identifier as emoji,
        emoji_name as name,
        COUNT(*) as count,
        is_custom,
        emoji_url as url
      FROM emoji_usage
      WHERE guild_id = $1
        ${timeFilter}
      GROUP BY emoji_identifier, emoji_name, is_custom, emoji_url
      ORDER BY count DESC
      LIMIT 20`,
      [guildId]
    );

    const emojis = result.rows.map((row) => ({
      emoji: row.emoji,
      name: row.name,
      count: parseInt(row.count),
      isCustom: row.is_custom,
      url: row.url,
    }));

    res.json(emojis);
  } catch (error) {
    console.error("❌ getEmojiStats 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取關鍵詞雲數據
exports.getKeywordCloud = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days } = req.query; // 可選的天數參數

    // 根據 days 參數決定時間過濾
    let timeFilter = "";
    if (days === "today") {
      timeFilter = `AND created_at >= CURRENT_DATE`;
    } else if (days === "yesterday") {
      timeFilter = `AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`;
    } else if (days && days !== "all") {
      const daysNum = parseInt(days);
      if (!isNaN(daysNum)) {
        timeFilter = `AND created_at >= NOW() - INTERVAL '${daysNum} days'`;
      }
    }

    // 從最近的訊息中提取關鍵字（簡化版本）
    const result = await pool.query(
      `SELECT 
        username as text,
        COUNT(*) as value
      FROM messages
      WHERE guild_id = $1
        ${timeFilter}
        AND username IS NOT NULL
      GROUP BY username
      ORDER BY value DESC
      LIMIT 30`,
      [guildId]
    );

    const keywords = result.rows.map((row) => ({
      text: row.text,
      value: parseInt(row.value),
    }));

    res.json(keywords);
  } catch (error) {
    console.error("❌ getKeywordCloud 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取今日前三統計
exports.getTodayStats = async (req, res) => {
  try {
    const { guildId } = req.params;

    // 今日最活躍頻道（使用 channel_stats 表獲取頻道名稱）
    const topChannelResult = await pool.query(
      `SELECT 
        COALESCE(cs.channel_name, m.channel_id) as name,
        COUNT(m.id) as count
      FROM messages m
      LEFT JOIN channel_stats cs ON m.channel_id = cs.channel_id AND m.guild_id = cs.guild_id
      WHERE m.guild_id = $1
        AND m.created_at >= CURRENT_DATE
      GROUP BY m.channel_id, cs.channel_name
      ORDER BY count DESC
      LIMIT 1`,
      [guildId]
    );

    // 今日最活躍用戶
    const topUserResult = await pool.query(
      `SELECT 
        username,
        COUNT(*) as count
      FROM messages
      WHERE guild_id = $1
        AND created_at >= CURRENT_DATE
        AND username IS NOT NULL
      GROUP BY username
      ORDER BY count DESC
      LIMIT 1`,
      [guildId]
    );

    // 今日最常用表情
    const topEmojiResult = await pool.query(
      `SELECT 
        emoji_identifier as emoji,
        emoji_name as name,
        COUNT(*) as count,
        is_custom,
        emoji_url as url
      FROM emoji_usage
      WHERE guild_id = $1
        AND used_at >= CURRENT_DATE
      GROUP BY emoji_identifier, emoji_name, is_custom, emoji_url
      ORDER BY count DESC
      LIMIT 1`,
      [guildId]
    );

    const stats = {
      topChannel:
        topChannelResult.rows.length > 0
          ? {
              name: topChannelResult.rows[0].name,
              count: parseInt(topChannelResult.rows[0].count),
            }
          : null,
      topUser:
        topUserResult.rows.length > 0
          ? {
              username: topUserResult.rows[0].username,
              count: parseInt(topUserResult.rows[0].count),
            }
          : null,
      topEmoji:
        topEmojiResult.rows.length > 0
          ? {
              emoji: topEmojiResult.rows[0].emoji,
              name: topEmojiResult.rows[0].name,
              count: parseInt(topEmojiResult.rows[0].count),
              isCustom: topEmojiResult.rows[0].is_custom,
              url: topEmojiResult.rows[0].url,
            }
          : null,
    };

    res.json(stats);
  } catch (error) {
    console.error("❌ getTodayStats 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};
