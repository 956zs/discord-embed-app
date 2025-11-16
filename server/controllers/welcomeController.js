const pool = require("../database/db");

// 獲取歡迎訊息配置
exports.getWelcomeConfig = async (req, res) => {
  try {
    const { guildId } = req.params;

    const result = await pool.query(
      "SELECT * FROM welcome_config WHERE guild_id = $1",
      [guildId]
    );

    if (result.rows.length === 0) {
      // 返回預設配置
      return res.json({
        guild_id: guildId,
        enabled: false,
        channel_id: null,
        message_template: "歡迎 {user} 加入 {server}！",
        embed_enabled: false,
        embed_color: "#5865F2",
        embed_title: "歡迎加入！",
        embed_description:
          "歡迎 {user} 加入 {server}！\n你是第 {memberCount} 位成員！",
        embed_footer: null,
        embed_thumbnail: true,
        embed_image_url: null,
        embed_thumbnail_url: null,
        message_content: null,
        dm_enabled: false,
        dm_message: null,
        autorole_enabled: false,
        autorole_ids: [],
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ getWelcomeConfig 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 更新歡迎訊息配置
exports.updateWelcomeConfig = async (req, res) => {
  try {
    const { guildId } = req.params;
    const {
      enabled,
      channel_id,
      message_template,
      embed_enabled,
      embed_color,
      embed_title,
      embed_description,
      embed_footer,
      embed_thumbnail,
      embed_image_url,
      embed_thumbnail_url,
      message_content,
      dm_enabled,
      dm_message,
      autorole_enabled,
      autorole_ids,
    } = req.body;

    const query = `
      INSERT INTO welcome_config (
        guild_id, enabled, channel_id, message_template,
        embed_enabled, embed_color, embed_title, embed_description,
        embed_footer, embed_thumbnail, embed_image_url, embed_thumbnail_url,
        message_content, dm_enabled, dm_message,
        autorole_enabled, autorole_ids, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET
        enabled = $2,
        channel_id = $3,
        message_template = $4,
        embed_enabled = $5,
        embed_color = $6,
        embed_title = $7,
        embed_description = $8,
        embed_footer = $9,
        embed_thumbnail = $10,
        embed_image_url = $11,
        embed_thumbnail_url = $12,
        message_content = $13,
        dm_enabled = $14,
        dm_message = $15,
        autorole_enabled = $16,
        autorole_ids = $17,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      guildId,
      enabled ?? true,
      channel_id,
      message_template,
      embed_enabled ?? false,
      embed_color ?? "#5865F2",
      embed_title,
      embed_description,
      embed_footer,
      embed_thumbnail ?? true,
      embed_image_url,
      embed_thumbnail_url,
      message_content,
      dm_enabled ?? false,
      dm_message,
      autorole_enabled ?? false,
      autorole_ids ?? [],
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ updateWelcomeConfig 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 測試歡迎訊息
exports.testWelcomeMessage = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId } = req.body;

    // 這裡需要通過 Discord client 來測試
    // 實際實作時需要從 bot 獲取 client 實例
    res.json({
      success: true,
      message: "測試訊息功能需要在機器人端實作",
    });
  } catch (error) {
    console.error("❌ testWelcomeMessage 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取成員統計數據
exports.getMemberStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days, startDate, endDate } = req.query;

    let timeFilter = "";
    let queryParams = [guildId];

    // 優先使用自訂日期範圍
    if (startDate) {
      timeFilter = `AND DATE(created_at) >= $2`;
      queryParams.push(startDate);

      if (endDate) {
        timeFilter += ` AND DATE(created_at) <= $3`;
        queryParams.push(endDate);
      }
    } else if (days && days !== "all") {
      const daysNum = parseInt(days);
      if (!isNaN(daysNum)) {
        timeFilter = `AND created_at >= NOW() - INTERVAL '${daysNum} days'`;
      }
    }

    const result = await pool.query(
      `SELECT
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
        COUNT(CASE WHEN event_type = 'join' THEN 1 END)::integer as joins,
        COUNT(CASE WHEN event_type = 'leave' THEN 1 END)::integer as leaves,
        MAX(member_count)::integer as member_count
      FROM member_events
      WHERE guild_id = $1
        ${timeFilter}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC`,
      queryParams
    );

    const stats = result.rows.map((row) => ({
      date: row.date,
      joins: row.joins,
      leaves: row.leaves,
      memberCount: row.member_count,
      netChange: row.joins - row.leaves,
    }));

    res.json(stats);
  } catch (error) {
    console.error("❌ getMemberStats 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取成員事件列表
exports.getMemberEvents = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, limit = 50 } = req.query;

    let typeFilter = "";
    if (type && (type === "join" || type === "leave")) {
      typeFilter = `AND event_type = '${type}'`;
    }

    const result = await pool.query(
      `SELECT 
        user_id,
        username,
        discriminator,
        event_type,
        member_count,
        account_created_at,
        join_position,
        created_at
      FROM member_events
      WHERE guild_id = $1
        ${typeFilter}
      ORDER BY created_at DESC
      LIMIT $2`,
      [guildId, parseInt(limit)]
    );

    const events = result.rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      discriminator: row.discriminator,
      eventType: row.event_type,
      memberCount: row.member_count,
      accountCreatedAt: row.account_created_at,
      joinPosition: row.join_position,
      createdAt: row.created_at,
    }));

    res.json(events);
  } catch (error) {
    console.error("❌ getMemberEvents 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取成員統計摘要
exports.getMemberSummary = async (req, res) => {
  try {
    const { guildId } = req.params;

    // 今日統計
    const todayResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN event_type = 'join' THEN 1 END)::integer as joins,
        COUNT(CASE WHEN event_type = 'leave' THEN 1 END)::integer as leaves
      FROM member_events
      WHERE guild_id = $1
        AND created_at >= CURRENT_DATE`,
      [guildId]
    );

    // 本月統計
    const monthResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN event_type = 'join' THEN 1 END)::integer as joins,
        COUNT(CASE WHEN event_type = 'leave' THEN 1 END)::integer as leaves
      FROM member_events
      WHERE guild_id = $1
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [guildId]
    );

    // 當前成員數（最新記錄）
    const currentResult = await pool.query(
      `SELECT member_count
      FROM member_events
      WHERE guild_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [guildId]
    );

    const today = todayResult.rows[0];
    const month = monthResult.rows[0];
    const current = currentResult.rows[0];

    res.json({
      current: {
        memberCount: current?.member_count || 0,
      },
      today: {
        joins: today.joins,
        leaves: today.leaves,
        netChange: today.joins - today.leaves,
      },
      month: {
        joins: month.joins,
        leaves: month.leaves,
        netChange: month.joins - month.leaves,
      },
    });
  } catch (error) {
    console.error("❌ getMemberSummary 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};
