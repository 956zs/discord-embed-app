# Discord 數據收集指南

本指南說明如何收集和儲存 Discord 伺服器的統計數據。

## 數據收集架構

### 1. 訊息監聽與儲存

使用 Discord.js 的事件監聽器來收集訊息數據：

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 監聽訊息事件
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // 儲存訊息數據到數據庫
  await saveMessageData({
    guildId: message.guild.id,
    channelId: message.channel.id,
    userId: message.author.id,
    content: message.content,
    timestamp: message.createdAt,
    emojis: extractEmojis(message.content),
  });
});
```

### 2. 表情統計

#### Unicode 表情提取
```javascript
function extractUnicodeEmojis(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  return text.match(emojiRegex) || [];
}
```

#### 自訂表情提取
```javascript
function extractCustomEmojis(message) {
  // Discord 自訂表情格式: <:name:id> 或 <a:name:id>
  const customEmojiRegex = /<a?:(\w+):(\d+)>/g;
  const emojis = [];
  let match;
  
  while ((match = customEmojiRegex.exec(message.content)) !== null) {
    emojis.push({
      name: match[1],
      id: match[2],
      animated: message.content.includes('<a:'),
    });
  }
  
  return emojis;
}
```

### 3. 關鍵詞提取

使用自然語言處理來提取關鍵詞：

```javascript
// 安裝: npm install natural stopword
const natural = require('natural');
const sw = require('stopword');

function extractKeywords(text) {
  // 分詞
  const tokenizer = new natural.WordTokenizer();
  let words = tokenizer.tokenize(text.toLowerCase());
  
  // 移除停用詞（中文需要使用中文停用詞表）
  words = sw.removeStopwords(words, sw.zh);
  
  // 過濾短詞和特殊字符
  words = words.filter(word => word.length > 1 && /^[\u4e00-\u9fa5a-zA-Z]+$/.test(word));
  
  return words;
}

// 統計詞頻
function calculateWordFrequency(messages) {
  const wordCount = {};
  
  messages.forEach(msg => {
    const keywords = extractKeywords(msg.content);
    keywords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
  });
  
  return Object.entries(wordCount)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
}
```

### 4. 數據庫結構建議

#### MongoDB Schema 範例

```javascript
// messages.js
const messageSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  userId: String,
  username: String,
  content: String,
  timestamp: Date,
  emojis: [{
    type: { type: String, enum: ['unicode', 'custom'] },
    value: String,
    name: String,
    id: String,
  }],
  keywords: [String],
});

// dailyStats.js
const dailyStatsSchema = new mongoose.Schema({
  guildId: String,
  date: Date,
  messageCount: Number,
  activeUsers: Number,
  channelStats: [{
    channelId: String,
    channelName: String,
    messageCount: Number,
  }],
  topEmojis: [{
    emoji: String,
    name: String,
    count: Number,
    isCustom: Boolean,
  }],
  topKeywords: [{
    text: String,
    value: Number,
  }],
});
```

### 5. 定期統計任務

使用 node-cron 定期彙總數據：

```javascript
const cron = require('node-cron');

// 每天凌晨 1 點統計前一天的數據
cron.schedule('0 1 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const guilds = client.guilds.cache;
  
  for (const [guildId, guild] of guilds) {
    await generateDailyStats(guildId, yesterday);
  }
});

async function generateDailyStats(guildId, date) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  // 查詢當天的所有訊息
  const messages = await Message.find({
    guildId,
    timestamp: { $gte: startOfDay, $lte: endOfDay },
  });
  
  // 統計各項數據
  const stats = {
    guildId,
    date: startOfDay,
    messageCount: messages.length,
    activeUsers: new Set(messages.map(m => m.userId)).size,
    channelStats: calculateChannelStats(messages),
    topEmojis: calculateEmojiStats(messages),
    topKeywords: calculateWordFrequency(messages),
  };
  
  await DailyStats.create(stats);
}
```

### 6. API 實現範例

```javascript
// 獲取真實的表情統計
exports.getEmojiStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 從數據庫聚合表情數據
    const emojiStats = await Message.aggregate([
      {
        $match: {
          guildId,
          timestamp: { $gte: startDate },
        },
      },
      { $unwind: '$emojis' },
      {
        $group: {
          _id: {
            emoji: '$emojis.value',
            name: '$emojis.name',
            isCustom: { $eq: ['$emojis.type', 'custom'] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    
    res.json(emojiStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取關鍵詞雲
exports.getKeywordCloud = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await DailyStats.find({
      guildId,
      date: { $gte: startDate },
    });
    
    // 合併所有關鍵詞
    const allKeywords = {};
    stats.forEach(stat => {
      stat.topKeywords.forEach(kw => {
        allKeywords[kw.text] = (allKeywords[kw.text] || 0) + kw.value;
      });
    });
    
    const keywords = Object.entries(allKeywords)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);
    
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## 重要注意事項

### 1. Discord Bot 權限
確保 Bot 有以下權限：
- Read Messages/View Channels
- Read Message History
- Use External Emojis

### 2. Intents 設定
在 Discord Developer Portal 啟用：
- Server Members Intent
- Message Content Intent

### 3. 隱私考量
- 不要儲存敏感的訊息內容
- 遵守 GDPR 和其他隱私法規
- 提供數據刪除功能
- 告知用戶數據收集政策

### 4. 性能優化
- 使用批量插入減少數據庫操作
- 建立適當的索引
- 定期清理舊數據
- 使用 Redis 快取熱門查詢

### 5. 數據保留策略
```javascript
// 每週清理 90 天前的原始訊息數據
cron.schedule('0 2 * * 0', async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  
  await Message.deleteMany({
    timestamp: { $lt: cutoffDate },
  });
});
```

## 推薦的技術棧

- **數據庫**: MongoDB（靈活的文檔結構）或 PostgreSQL（關聯數據）
- **快取**: Redis（提升查詢性能）
- **任務調度**: node-cron 或 Bull（任務隊列）
- **NLP**: natural（英文）、nodejieba（中文分詞）
- **監控**: PM2（進程管理）、Prometheus（指標收集）

## 開始實施

1. 安裝必要的依賴：
```bash
npm install mongoose redis node-cron natural stopword nodejieba
```

2. 設定數據庫連接
3. 實現訊息監聽器
4. 建立定期統計任務
5. 更新 API 端點使用真實數據
6. 測試和優化性能

## 快速測試（使用模擬數據）

當前實現已包含模擬數據，可以直接測試：

```bash
# 安裝依賴
npm install
cd client && npm install && cd ..

# 啟動應用
npm run dev
```

訪問 `http://localhost:5173` 即可看到統計儀表板。

這樣你就能收集和展示真實的 Discord 伺服器統計數據了！
