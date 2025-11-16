const { EmbedBuilder } = require("discord.js");

/**
 * 處理成員加入事件
 */
async function handleMemberAdd(pool, member) {
  try {
    const guildId = member.guild.id;
    const userId = member.user.id;

    // 記錄成員加入事件
    await recordMemberEvent(pool, member, "join");

    // 獲取歡迎訊息配置
    const config = await getWelcomeConfig(pool, guildId);

    if (!config || !config.enabled) {
      console.log(`⚠️  伺服器 ${guildId} 未啟用歡迎訊息`);
      return;
    }

    // 發送歡迎訊息到頻道
    if (config.channel_id) {
      await sendWelcomeMessage(member, config);
    }

    // 發送私訊
    if (config.dm_enabled && config.dm_message) {
      await sendWelcomeDM(member, config);
    }

    // 自動給予身分組
    if (
      config.autorole_enabled &&
      config.autorole_ids &&
      config.autorole_ids.length > 0
    ) {
      await assignAutoRoles(member, config.autorole_ids);
    }

    console.log(`✅ 成員加入處理完成: ${member.user.tag} (${userId})`);
  } catch (error) {
    console.error("❌ 處理成員加入失敗:", error);
  }
}

/**
 * 處理成員離開事件
 */
async function handleMemberRemove(pool, member) {
  try {
    const guildId = member.guild.id;
    const userId = member.user.id;

    // 記錄成員離開事件
    await recordMemberEvent(pool, member, "leave");

    console.log(`👋 成員離開: ${member.user.tag} (${userId})`);
  } catch (error) {
    console.error("❌ 處理成員離開失敗:", error);
  }
}

/**
 * 記錄成員事件到資料庫
 */
async function recordMemberEvent(pool, member, eventType) {
  const query = `
    INSERT INTO member_events (
      guild_id, user_id, username, discriminator,
      event_type, member_count, account_created_at, join_position
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  const memberCount = member.guild.memberCount;
  const joinPosition = eventType === "join" ? memberCount : null;

  const values = [
    member.guild.id,
    member.user.id,
    member.user.username,
    member.user.discriminator || "0",
    eventType,
    memberCount,
    member.user.createdAt,
    joinPosition,
  ];

  await pool.query(query, values);

  // 更新每日統計
  const today = new Date().toISOString().split("T")[0];
  await pool.query("SELECT update_daily_member_stats($1, $2)", [
    member.guild.id,
    today,
  ]);
}

/**
 * 獲取歡迎訊息配置
 */
async function getWelcomeConfig(pool, guildId) {
  const result = await pool.query(
    "SELECT * FROM welcome_config WHERE guild_id = $1",
    [guildId]
  );

  return result.rows[0] || null;
}

/**
 * 發送歡迎訊息到頻道
 */
async function sendWelcomeMessage(member, config) {
  try {
    const channel = member.guild.channels.cache.get(config.channel_id);
    if (!channel) {
      console.error(`❌ 找不到歡迎訊息頻道: ${config.channel_id}`);
      return;
    }

    if (config.embed_enabled) {
      // 使用 Embed 格式
      const embed = createWelcomeEmbed(member, config);
      await channel.send({ embeds: [embed] });
    } else {
      // 使用純文字格式
      const message = replaceVariables(
        config.message_template || "歡迎 {user} 加入 {server}！",
        member
      );
      await channel.send(message);
    }

    console.log(`✅ 歡迎訊息已發送到頻道 ${channel.name}`);
  } catch (error) {
    console.error("❌ 發送歡迎訊息失敗:", error);
  }
}

/**
 * 創建歡迎訊息 Embed
 */
function createWelcomeEmbed(member, config) {
  const embed = new EmbedBuilder()
    .setColor(config.embed_color || "#5865F2")
    .setTitle(replaceVariables(config.embed_title || "歡迎加入！", member))
    .setDescription(
      replaceVariables(
        config.embed_description ||
          "歡迎 {user} 加入 {server}！\n你是第 {memberCount} 位成員！",
        member
      )
    )
    .setTimestamp();

  if (config.embed_thumbnail) {
    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
  }

  if (config.embed_footer) {
    embed.setFooter({ text: replaceVariables(config.embed_footer, member) });
  }

  return embed;
}

/**
 * 發送歡迎私訊
 */
async function sendWelcomeDM(member, config) {
  try {
    const message = replaceVariables(config.dm_message, member);
    await member.send(message);
    console.log(`✅ 歡迎私訊已發送給 ${member.user.tag}`);
  } catch (error) {
    console.error("❌ 發送歡迎私訊失敗:", error);
    // 用戶可能關閉了私訊，這是正常的
  }
}

/**
 * 自動給予身分組
 */
async function assignAutoRoles(member, roleIds) {
  try {
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role);
        console.log(`✅ 已給予身分組 ${role.name} 給 ${member.user.tag}`);
      } else {
        console.error(`❌ 找不到身分組: ${roleId}`);
      }
    }
  } catch (error) {
    console.error("❌ 給予身分組失敗:", error);
  }
}

/**
 * 替換訊息模板中的變數
 */
function replaceVariables(template, member) {
  if (!template) return "";

  return template
    .replace(/{user}/g, `<@${member.user.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(/{userId}/g, member.user.id)
    .replace(/{guildId}/g, member.guild.id);
}

/**
 * 獲取成員統計數據
 */
async function getMemberStats(pool, guildId, days = 30) {
  const query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(CASE WHEN event_type = 'join' THEN 1 END) as joins,
      COUNT(CASE WHEN event_type = 'leave' THEN 1 END) as leaves,
      MAX(member_count) as member_count
    FROM member_events
    WHERE guild_id = $1
      AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  const result = await pool.query(query, [guildId]);
  return result.rows;
}

module.exports = {
  handleMemberAdd,
  handleMemberRemove,
  getMemberStats,
  getWelcomeConfig,
};
