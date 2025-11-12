const pool = require("../database/db");

// 獲取管理員列表
exports.getAdmins = async (req, res) => {
  try {
    const { guildId } = req.params;

    const result = await pool.query(
      `SELECT user_id, username, granted_by, granted_at
       FROM admin_users
       WHERE guild_id = $1
       ORDER BY granted_at DESC`,
      [guildId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ getAdmins 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 檢查用戶是否為管理員
exports.checkAdmin = async (req, res) => {
  try {
    const { guildId, userId } = req.params;

    const result = await pool.query(
      "SELECT 1 FROM admin_users WHERE guild_id = $1 AND user_id = $2",
      [guildId, userId]
    );

    res.json({ isAdmin: result.rows.length > 0 });
  } catch (error) {
    console.error("❌ checkAdmin 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 添加管理員
exports.addAdmin = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, username, grantedBy } = req.body;

    await pool.query(
      `INSERT INTO admin_users (guild_id, user_id, username, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id, user_id) DO NOTHING`,
      [guildId, userId, username, grantedBy]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ addAdmin 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 移除管理員
exports.removeAdmin = async (req, res) => {
  try {
    const { guildId, userId } = req.params;

    await pool.query(
      "DELETE FROM admin_users WHERE guild_id = $1 AND user_id = $2",
      [guildId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ removeAdmin 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取提取任務列表
exports.getTasks = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { status, limit = 50 } = req.query;

    let query = `
      SELECT id, guild_id, channel_id, channel_name, status,
             anchor_message_id, start_message_id, end_message_id,
             messages_fetched, messages_saved, messages_duplicate,
             error_message, started_by, started_at, completed_at, created_at
      FROM history_fetch_tasks
      WHERE guild_id = $1
    `;

    const params = [guildId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ getTasks 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取單個任務詳情
exports.getTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const result = await pool.query(
      `SELECT * FROM history_fetch_tasks WHERE id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "找不到任務" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ getTask 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取提取範圍記錄
exports.getFetchRanges = async (req, res) => {
  try {
    const { guildId, channelId } = req.params;

    const result = await pool.query(
      `SELECT * FROM history_fetch_ranges
       WHERE guild_id = $1 AND channel_id = $2
       ORDER BY start_timestamp DESC
       LIMIT 100`,
      [guildId, channelId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ getFetchRanges 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取頻道提取統計
exports.getChannelFetchStats = async (req, res) => {
  try {
    const { guildId } = req.params;

    const result = await pool.query(
      `SELECT 
        channel_id,
        channel_name,
        COUNT(*) as total_tasks,
        SUM(messages_saved) as total_messages,
        MAX(completed_at) as last_fetch_time,
        MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_success_time,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
        COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_tasks,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tasks
      FROM history_fetch_tasks
      WHERE guild_id = $1
      GROUP BY channel_id, channel_name
      ORDER BY last_fetch_time DESC NULLS LAST`,
      [guildId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ getChannelFetchStats 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取提取摘要
exports.getFetchSummary = async (req, res) => {
  try {
    const { guildId } = req.params;

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
        COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_tasks,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        SUM(messages_fetched) as total_messages_fetched,
        SUM(messages_saved) as total_messages_saved,
        SUM(messages_duplicate) as total_messages_duplicate,
        COUNT(DISTINCT channel_id) as channels_processed,
        MAX(completed_at) as last_fetch_time
      FROM history_fetch_tasks
      WHERE guild_id = $1`,
      [guildId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ getFetchSummary 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};
