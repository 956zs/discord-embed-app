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

// 獲取頻道列表（從 bot）
exports.getChannels = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { includeThreads } = req.query; // 新增：是否包含討論串

    // 從 bot 獲取 client
    const botModule = require("../../bot/index.js");
    const client = botModule.client;

    if (!client || !client.isReady()) {
      return res.status(503).json({ error: "Bot 未就緒" });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    // 獲取所有文字頻道和論壇頻道
    const channels = guild.channels.cache
      .filter((ch) => ch.type === 0 || ch.type === 15) // 文字頻道(0) 和 論壇頻道(15)
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
        parentId: ch.parentId,
        isThread: false,
        isForum: ch.type === 15,
        threads: [], // 將在下面填充
      }))
      .sort((a, b) => a.position - b.position);

    // 如果需要包含討論串
    if (includeThreads === "true") {
      console.log("📝 獲取討論串信息...");

      // 優化：先一次性從資料庫獲取所有討論串的統計
      const threadStatsResult = await pool.query(
        `SELECT 
          thread_id,
          COUNT(*) as count
        FROM messages 
        WHERE guild_id = $1 AND thread_id IS NOT NULL
        GROUP BY thread_id`,
        [guildId]
      );

      const threadStatsMap = new Map(
        threadStatsResult.rows.map((row) => [
          row.thread_id,
          parseInt(row.count),
        ])
      );

      // 並行獲取所有頻道的討論串
      await Promise.all(
        channels.map(async (channel) => {
          try {
            const discordChannel = guild.channels.cache.get(channel.id);
            if (!discordChannel) return;

            // 獲取活躍和已歸檔的討論串（限制數量避免太慢）
            const [activeThreads, archivedThreads] = await Promise.all([
              discordChannel.threads
                .fetchActive()
                .catch(() => ({ threads: new Map() })),
              discordChannel.threads
                .fetchArchived({ limit: 50 })
                .catch(() => ({ threads: new Map() })),
            ]);

            const allThreads = [
              ...activeThreads.threads.values(),
              ...archivedThreads.threads.values(),
            ];

            // 使用預先獲取的統計數據（避免逐個查詢）
            channel.threads = allThreads.map((thread) => ({
              id: thread.id,
              name: thread.name,
              type: thread.type,
              archived: thread.archived,
              locked: thread.locked,
              messageCount: threadStatsMap.get(thread.id) || 0,
              createdAt: thread.createdAt,
              parentId: channel.id,
              isThread: true,
            }));

            channel.threadCount = allThreads.length;
          } catch (threadError) {
            console.error(
              `⚠️  獲取頻道 ${channel.name} 的討論串失敗:`,
              threadError.message
            );
            channel.threads = [];
            channel.threadCount = 0;
          }
        })
      );

      console.log(
        `✅ 已獲取 ${channels.reduce(
          (sum, ch) => sum + (ch.threadCount || 0),
          0
        )} 個討論串`
      );
    }

    res.json(channels);
  } catch (error) {
    console.error("❌ getChannels 錯誤:", error);
    res.status(500).json({ error: error.message });
  }
};

// 分析頻道狀態（用於批量提取）
exports.analyzeChannels = async (req, res) => {
  try {
    const { guildId } = req.params;

    // 獲取所有頻道的最後訊息時間（從 messages 表）
    const channelMessages = await pool.query(
      `SELECT 
        channel_id,
        MAX(created_at) as last_message_time,
        COUNT(*) as message_count
      FROM messages
      WHERE guild_id = $1
      GROUP BY channel_id`,
      [guildId]
    );

    // 獲取所有頻道的提取記錄
    const fetchRecords = await pool.query(
      `SELECT 
        t.channel_id,
        MAX(t.completed_at) as last_fetch_time,
        MAX(r.end_timestamp) as last_fetch_end_time
      FROM history_fetch_tasks t
      LEFT JOIN history_fetch_ranges r ON t.id = r.task_id
      WHERE t.guild_id = $1 AND t.status = 'completed'
      GROUP BY t.channel_id`,
      [guildId]
    );

    // 建立查找表
    const fetchMap = new Map();
    fetchRecords.rows.forEach((row) => {
      fetchMap.set(row.channel_id, {
        lastFetchTime: row.last_fetch_time,
        lastFetchEndTime: row.last_fetch_end_time,
      });
    });

    // 分析每個頻道
    const analysis = channelMessages.rows.map((ch) => {
      const fetchInfo = fetchMap.get(ch.channel_id);
      let needsUpdate = false;
      let reason = "";

      if (!fetchInfo) {
        needsUpdate = true;
        reason = "尚未提取過歷史訊息";
      } else if (ch.last_message_time && fetchInfo.lastFetchEndTime) {
        const lastMsg = new Date(ch.last_message_time);
        const lastFetch = new Date(fetchInfo.lastFetchEndTime);
        const diffHours = (lastMsg - lastFetch) / (1000 * 60 * 60);

        if (diffHours > 24) {
          needsUpdate = true;
          reason = `最後訊息時間與提取時間相差 ${Math.round(diffHours)} 小時`;
        } else {
          reason = "訊息已是最新";
        }
      } else {
        reason = "無法判斷，建議重新提取";
        needsUpdate = true;
      }

      return {
        channelId: ch.channel_id,
        lastMessageTime: ch.last_message_time,
        lastFetchTime: fetchInfo?.lastFetchTime || null,
        messageCount: parseInt(ch.message_count),
        needsUpdate,
        reason,
      };
    });

    res.json(analysis);
  } catch (error) {
    console.error("❌ analyzeChannels 錯誤:", error);
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
