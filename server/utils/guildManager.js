// 伺服器管理工具

/**
 * 獲取允許的伺服器 ID 列表
 */
function getAllowedGuilds() {
  const allowedGuilds = process.env.ALLOWED_GUILD_IDS
    ? process.env.ALLOWED_GUILD_IDS.split(",")
        .map((id) => id.trim())
        .filter((id) => id)
    : [];

  return allowedGuilds;
}

/**
 * 檢查伺服器是否在白名單中
 */
function isGuildAllowed(guildId) {
  const allowedGuilds = getAllowedGuilds();

  // 如果沒有設定白名單，允許所有伺服器
  if (allowedGuilds.length === 0) {
    return true;
  }

  return allowedGuilds.includes(guildId);
}

/**
 * 添加伺服器到白名單（需要手動更新 .env 文件）
 */
function addGuildToWhitelist(guildId) {
  const allowedGuilds = getAllowedGuilds();

  if (allowedGuilds.includes(guildId)) {
    return { success: false, message: "伺服器已在白名單中" };
  }

  allowedGuilds.push(guildId);
  const newValue = allowedGuilds.join(",");

  return {
    success: true,
    message: `請將以下內容添加到 .env 文件:\nALLOWED_GUILD_IDS=${newValue}`,
    newValue,
  };
}

/**
 * 列出所有白名單伺服器
 */
function listWhitelistedGuilds(client) {
  const allowedGuilds = getAllowedGuilds();

  if (allowedGuilds.length === 0) {
    return {
      count: 0,
      message: "未設定白名單，允許所有伺服器",
      guilds: [],
    };
  }

  const guilds = allowedGuilds.map((guildId) => {
    const guild = client.guilds.cache.get(guildId);
    return {
      id: guildId,
      name: guild ? guild.name : "未知伺服器",
      memberCount: guild ? guild.memberCount : 0,
      found: !!guild,
    };
  });

  return {
    count: allowedGuilds.length,
    guilds,
  };
}

module.exports = {
  getAllowedGuilds,
  isGuildAllowed,
  addGuildToWhitelist,
  listWhitelistedGuilds,
};
