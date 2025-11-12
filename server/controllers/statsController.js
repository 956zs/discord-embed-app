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

    // 如果指定天數，則限制時間範圍；否則顯示所有歷史數據
    const timeFilter = days
      ? `AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`
      : "";

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

    const result = await pool.query(
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

    if (days && days !== "all") {
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

    // 如果指定天數，則限制時間範圍；否則顯示所有歷史數據
    const timeFilter = days
      ? `AND used_at >= NOW() - INTERVAL '${parseInt(days)} days'`
      : "";

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

    // 如果指定天數，則限制時間範圍；否則顯示所有歷史數據
    const timeFilter = days
      ? `AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`
      : "";

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
