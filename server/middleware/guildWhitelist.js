// 伺服器白名單中間件
const checkGuildWhitelist = (req, res, next) => {
  const { guildId } = req.params;

  // 從環境變數讀取允許的伺服器 ID 列表
  const allowedGuilds = process.env.ALLOWED_GUILD_IDS
    ? process.env.ALLOWED_GUILD_IDS.split(",")
        .map((id) => id.trim())
        .filter((id) => id)
    : [];

  // 如果沒有設定白名單，允許所有伺服器（開發模式）
  if (allowedGuilds.length === 0) {
    console.warn("⚠️  警告: 未設定伺服器白名單，允許所有伺服器訪問");
    return next();
  }

  // 檢查伺服器是否在白名單中
  if (!allowedGuilds.includes(guildId)) {
    console.log(`🚫 拒絕訪問: 伺服器 ${guildId} 不在白名單中`);
    return res.status(403).json({
      error: "此伺服器未被授權使用統計功能",
      message: "請聯繫管理員將您的伺服器加入白名單",
    });
  }

  console.log(`✅ 允許訪問: 伺服器 ${guildId}`);
  next();
};

module.exports = { checkGuildWhitelist };
