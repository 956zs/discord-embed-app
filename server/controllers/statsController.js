const { Client, GatewayIntentBits } = require("discord.js");

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

// 模擬數據生成器（實際應用中應從數據庫讀取）
const generateMockData = () => {
  const days = 7;
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split("T")[0],
      messages: Math.floor(Math.random() * 500) + 100,
      activeUsers: Math.floor(Math.random() * 50) + 10,
    });
  }
  return data;
};

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
    res.status(500).json({ error: error.message });
  }
};

// 獲取成員活躍度
exports.getMemberActivity = async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    // 模擬數據
    const members = await guild.members.fetch();
    const activity = Array.from(members.values())
      .slice(0, 10)
      .map((member) => ({
        id: member.user.id,
        username: member.user.username,
        messageCount: Math.floor(Math.random() * 1000),
        lastActive: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
      }));

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取頻道使用情況
exports.getChannelUsage = async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    const channels = guild.channels.cache
      .filter((channel) => channel.isTextBased())
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        messageCount: Math.floor(Math.random() * 5000),
        type: channel.type,
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取訊息量趨勢
exports.getMessageTrends = async (req, res) => {
  try {
    const trends = generateMockData();
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取表情使用統計
exports.getEmojiStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    // 模擬數據 - 實際應用中需要從訊息歷史中統計
    const customEmojis = guild.emojis.cache
      .map((emoji) => ({
        emoji: `<:${emoji.name}:${emoji.id}>`,
        name: emoji.name,
        count: Math.floor(Math.random() * 500),
        isCustom: true,
        url: emoji.url,
      }))
      .slice(0, 10);

    // Unicode 表情模擬數據
    const unicodeEmojis = [
      { emoji: "😂", name: "笑哭", count: Math.floor(Math.random() * 1000) },
      { emoji: "❤️", name: "愛心", count: Math.floor(Math.random() * 800) },
      { emoji: "👍", name: "讚", count: Math.floor(Math.random() * 700) },
      { emoji: "😊", name: "微笑", count: Math.floor(Math.random() * 600) },
      { emoji: "🔥", name: "火", count: Math.floor(Math.random() * 500) },
      { emoji: "💯", name: "一百分", count: Math.floor(Math.random() * 400) },
      { emoji: "🎉", name: "慶祝", count: Math.floor(Math.random() * 350) },
      { emoji: "😭", name: "大哭", count: Math.floor(Math.random() * 300) },
      { emoji: "🤔", name: "思考", count: Math.floor(Math.random() * 250) },
      { emoji: "👀", name: "眼睛", count: Math.floor(Math.random() * 200) },
    ].map((e) => ({ ...e, isCustom: false }));

    const allEmojis = [...customEmojis, ...unicodeEmojis]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json(allEmojis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取關鍵詞雲數據
exports.getKeywordCloud = async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: "找不到伺服器" });
    }

    // 模擬數據 - 實際應用中需要從訊息內容中提取和統計
    const keywords = [
      { text: "Discord", value: 150 },
      { text: "遊戲", value: 120 },
      { text: "聊天", value: 100 },
      { text: "活動", value: 90 },
      { text: "音樂", value: 85 },
      { text: "直播", value: 80 },
      { text: "好玩", value: 75 },
      { text: "朋友", value: 70 },
      { text: "有趣", value: 65 },
      { text: "分享", value: 60 },
      { text: "討論", value: 55 },
      { text: "問題", value: 50 },
      { text: "幫助", value: 48 },
      { text: "謝謝", value: 45 },
      { text: "歡迎", value: 42 },
      { text: "新手", value: 40 },
      { text: "教學", value: 38 },
      { text: "推薦", value: 35 },
      { text: "更新", value: 32 },
      { text: "活躍", value: 30 },
    ];

    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
