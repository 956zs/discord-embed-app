// 訊息處理器

/**
 * 儲存訊息記錄
 */
async function saveMessage(pool, message) {
  // 檢查是否為討論串訊息
  const isThread = message.channel.isThread();
  const threadId = isThread ? message.channel.id : null;
  const parentChannelId = isThread ? message.channel.parentId : null;
  const channelId = isThread ? message.channel.parentId : message.channel.id;

  // 提取附件 URL
  const attachmentUrls = message.attachments.map((att) => att.url);
  const hasAttachments = attachmentUrls.length > 0;
  const attachmentCount = attachmentUrls.length;

  const query = `
    INSERT INTO messages (
      message_id, guild_id, channel_id, user_id, username, 
      message_length, has_emoji, has_attachments, attachment_count, 
      attachment_urls, is_thread, thread_id, parent_channel_id, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (message_id) 
    WHERE message_id IS NOT NULL 
    DO NOTHING
  `;

  const hasEmoji = hasEmojiInMessage(message.content);

  const values = [
    message.id || null, // Discord 訊息 ID（可能為 null）
    message.guild.id,
    channelId, // 使用父頻道 ID（如果是討論串）
    message.author.id,
    message.author.username,
    message.content.length,
    hasEmoji,
    hasAttachments,
    attachmentCount,
    attachmentUrls.length > 0 ? attachmentUrls : null,
    isThread,
    threadId,
    parentChannelId,
    message.createdAt,
  ];

  try {
    const result = await pool.query(query, values);

    // 只有在實際插入時才更新頻道統計（避免重複計數）
    if (result.rowCount > 0) {
      await updateChannelStats(
        pool,
        message.guild.id,
        message.channel.id,
        message.channel.name
      );
    }

    return result.rowCount > 0; // 返回是否成功插入
  } catch (error) {
    console.error(`❌ 儲存訊息失敗 ${message.id}:`, error.message);
    throw error;
  }
}

/**
 * 更新頻道統計
 */
async function updateChannelStats(pool, guildId, channelId, channelName) {
  const query = `
    INSERT INTO channel_stats (guild_id, channel_id, channel_name, message_count, last_updated)
    VALUES ($1, $2, $3, 1, NOW())
    ON CONFLICT (guild_id, channel_id)
    DO UPDATE SET 
      message_count = channel_stats.message_count + 1,
      channel_name = $3,
      last_updated = NOW()
  `;

  try {
    await pool.query(query, [guildId, channelId, channelName]);
  } catch (error) {
    console.error("❌ 更新頻道統計失敗:", error.message);
  }
}

/**
 * 儲存表情使用
 */
async function saveEmojiUsage(pool, message) {
  try {
    // 提取 Unicode 表情
    const unicodeEmojis = extractUnicodeEmojis(message.content);

    // 提取自訂表情
    const customEmojis = extractCustomEmojis(message);

    // 儲存所有表情
    for (const emoji of [...unicodeEmojis, ...customEmojis]) {
      const query = `
        INSERT INTO emoji_usage (
          guild_id, emoji_identifier, emoji_name, 
          is_custom, emoji_url, user_id, used_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const values = [
        message.guild.id,
        emoji.identifier,
        emoji.name,
        emoji.isCustom,
        emoji.url || null,
        message.author.id,
        message.createdAt,
      ];

      await pool.query(query, values);
    }
  } catch (error) {
    console.error("❌ 儲存表情使用失敗:", error.message);
  }
}

/**
 * 檢查訊息是否包含表情
 */
function hasEmojiInMessage(text) {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|<a?:\w+:\d+>/gu;
  return emojiRegex.test(text);
}

/**
 * 提取 Unicode 表情
 */
function extractUnicodeEmojis(text) {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex) || [];

  return matches.map((emoji) => ({
    identifier: emoji,
    name: emoji,
    isCustom: false,
    url: null,
  }));
}

/**
 * 提取自訂表情
 */
function extractCustomEmojis(message) {
  const customEmojiRegex = /<(a)?:(\w+):(\d+)>/g;
  const emojis = [];
  let match;

  while ((match = customEmojiRegex.exec(message.content)) !== null) {
    const isAnimated = match[1] === "a"; // 檢查第一個捕獲組是否為 'a'
    const emojiName = match[2];
    const emojiId = match[3];

    // Discord 新的 CDN URL 格式：使用 webp 格式
    // 動畫 emoji 需要 animated=true 參數
    const url = isAnimated
      ? `https://cdn.discordapp.com/emojis/${emojiId}.webp?size=96&animated=true`
      : `https://cdn.discordapp.com/emojis/${emojiId}.webp?size=96`;

    emojis.push({
      identifier: `${emojiName}:${emojiId}`,
      name: emojiName,
      isCustom: true,
      url: url,
    });
  }

  return emojis;
}

module.exports = {
  saveMessage,
  saveEmojiUsage,
};
