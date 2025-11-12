const cron = require("node-cron");

/**
 * 啟動每日統計任務
 */
function startDailyStatsJob(pool, client) {
  // 每天凌晨 2 點執行統計
  cron.schedule("0 2 * * *", async () => {
    console.log("📊 開始執行每日統計...");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    try {
      // 獲取所有白名單伺服器
      const allowedGuilds = process.env.ALLOWED_GUILD_IDS
        ? process.env.ALLOWED_GUILD_IDS.split(",").map((id) => id.trim())
        : [];

      if (allowedGuilds.length === 0) {
        console.log("⚠️  未設定白名單，跳過統計");
        return;
      }

      for (const guildId of allowedGuilds) {
        await generateDailyStats(pool, guildId, dateStr);
      }

      console.log("✅ 每日統計完成");
    } catch (error) {
      console.error("❌ 每日統計失敗:", error);
    }
  });

  console.log("⏰ 每日統計任務已啟動（每天凌晨 2:00）");
}

/**
 * 生成每日統計
 */
async function generateDailyStats(pool, guildId, date) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log(`📊 正在生成伺服器 ${guildId} 的 ${date} 統計...`);

    // 統計當天訊息總數
    const messageCountResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE guild_id = $1 
       AND DATE(created_at) = $2`,
      [guildId, date]
    );
    const totalMessages = parseInt(messageCountResult.rows[0].count);

    // 統計活躍用戶數
    const activeUsersResult = await client.query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM messages 
       WHERE guild_id = $1 
       AND DATE(created_at) = $2`,
      [guildId, date]
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // 統計各頻道訊息數
    const channelStatsResult = await client.query(
      `SELECT channel_id, COUNT(*) as message_count
       FROM messages 
       WHERE guild_id = $1 
       AND DATE(created_at) = $2
       GROUP BY channel_id
       ORDER BY message_count DESC
       LIMIT 10`,
      [guildId, date]
    );
    const channelStats = channelStatsResult.rows;

    // 統計最活躍用戶
    const topUsersResult = await client.query(
      `SELECT user_id, username, COUNT(*) as message_count
       FROM messages 
       WHERE guild_id = $1 
       AND DATE(created_at) = $2
       GROUP BY user_id, username
       ORDER BY message_count DESC
       LIMIT 10`,
      [guildId, date]
    );
    const topUsers = topUsersResult.rows;

    // 插入每日統計
    await client.query(
      `INSERT INTO daily_stats (
        guild_id, stat_date, total_messages, active_users, 
        channel_stats, top_users
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (guild_id, stat_date)
      DO UPDATE SET
        total_messages = $3,
        active_users = $4,
        channel_stats = $5,
        top_users = $6`,
      [
        guildId,
        date,
        totalMessages,
        activeUsers,
        JSON.stringify(channelStats),
        JSON.stringify(topUsers),
      ]
    );

    await client.query("COMMIT");
    console.log(
      `✅ 伺服器 ${guildId} 的 ${date} 統計已生成 (${totalMessages} 則訊息, ${activeUsers} 位活躍用戶)`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ 生成統計失敗 (${guildId}, ${date}):`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 手動觸發統計（用於測試）
 */
async function manualGenerateStats(pool, guildId, daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dateStr = date.toISOString().split("T")[0];

  console.log(`🔧 手動生成統計: ${guildId} - ${dateStr}`);
  await generateDailyStats(pool, guildId, dateStr);
}

module.exports = {
  startDailyStatsJob,
  generateDailyStats,
  manualGenerateStats,
};
