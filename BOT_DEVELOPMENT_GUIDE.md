# Discord 數據收集機器人開發指南（PostgreSQL）

本指南將幫助你建立一個 Discord 機器人，使用 PostgreSQL 收集和統計用戶發言數據。

## 目標功能

- ✅ 收集用戶發言次數
- ✅ 統計頻道使用情況
- ✅ 記錄訊息趨勢
- ✅ 表情使用統計
- ❌ 文字雲（已移除，避免大量數據）

## 技術棧

- **Discord.js** v14 - Discord Bot 框架
- **PostgreSQL** - 關聯式數據庫
- **node-postgres (pg)** - PostgreSQL 客戶端
- **node-cron** - 定時任務

## 步驟 1: 安裝依賴

```bash
npm install discord.js pg dotenv node-cron
```

## 步驟 2: 數據庫結構設計

### 創建數據表

```sql
-- 用戶發言記錄表（簡化版，不儲存完整內容）
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    message_length INTEGER,
    has_emoji BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_guild_created (guild_id, created_at),
    INDEX idx_user_guild (user_id, guild_id),
    INDEX idx_channel (channel_id)
);

-- 表情使用記錄表
CREATE TABLE emoji_usage (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    emoji_identifier VARCHAR(100) NOT NULL,
    emoji_name VARCHAR(100),
    is_custom BOOLEAN DEFAULT FALSE,
    emoji_url TEXT,
    user_id VARCHAR(20),
    used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_guild_emoji (guild_id, emoji_identifier),
    INDEX idx_guild_used (guild_id, used_at)
);

-- 每日統計匯總表（提升查詢性能）
CREATE TABLE daily_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    stat_date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    channel_stats JSONB,
    top_users JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, stat_date),
    INDEX idx_guild_date (guild_id, stat_date)
);

-- 頻道統計表
CREATE TABLE channel_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    channel_name VARCHAR(100),
    message_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, channel_id)
);
```

## 步驟 3: 數據庫連接配置

### 創建 `bot/database/db.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 最大連接數
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 測試連接
pool.on('connect', () => {
  console.log('✅ PostgreSQL 連接成功');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 連接錯誤:', err);
});

module.exports = pool;
```

### 更新 `.env` 文件

```env
# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your_username
DB_PASSWORD=your_password

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=your_guild_id
```

## 步驟 4: 數據收集機器人

### 創建 `bot/index.js`

```javascript
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const pool = require('./database/db');
const { saveMessage, saveEmojiUsage } = require('./handlers/messageHandler');
const { startDailyStatsJob } = require('./jobs/statsAggregator');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 白名單檢查
const allowedGuilds = process.env.ALLOWED_GUILD_IDS
  ? process.env.ALLOWED_GUILD_IDS.split(',').map(id => id.trim())
  : [];

function isGuildAllowed(guildId) {
  if (allowedGuilds.length === 0) return true;
  return allowedGuilds.includes(guildId);
}

// Bot 就緒事件
client.on('ready', () => {
  console.log(`🤖 Bot 已登入: ${client.user.tag}`);
  console.log(`📊 監控 ${client.guilds.cache.size} 個伺服器`);
  
  // 啟動每日統計任務
  startDailyStatsJob(pool, client);
});

// 訊息事件監聽
client.on('messageCreate', async (message) => {
  // 忽略 Bot 訊息
  if (message.author.bot) return;
  
  // 忽略私訊
  if (!message.guild) return;
  
  // 白名單檢查
  if (!isGuildAllowed(message.guild.id)) return;
  
  try {
    // 儲存訊息記錄
    await saveMessage(pool, message);
    
    // 儲存表情使用
    await saveEmojiUsage(pool, message);
    
  } catch (error) {
    console.error('❌ 儲存訊息失敗:', error);
  }
});

// 錯誤處理
client.on('error', (error) => {
  console.error('❌ Discord 客戶端錯誤:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ 未處理的 Promise 拒絕:', error);
});

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('\n🛑 正在關閉 Bot...');
  await pool.end();
  client.destroy();
  process.exit(0);
});

// 登入 Bot
client.login(process.env.DISCORD_BOT_TOKEN);
```

## 步驟 5: 訊息處理器

### 創建 `bot/handlers/messageHandler.js`

```javascript
// 儲存訊息記錄
async function saveMessage(pool, message) {
  const query = `
    INSERT INTO messages (
      guild_id, channel_id, user_id, username, 
      message_length, has_emoji, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  
  const hasEmoji = hasEmojiInMessage(message.content);
  
  const values = [
    message.guild.id,
    message.channel.id,
    message.author.id,
    message.author.username,
    message.content.length,
    hasEmoji,
    message.createdAt,
  ];
  
  await pool.query(query, values);
  
  // 更新頻道統計
  await updateChannelStats(pool, message.guild.id, message.channel.id, message.channel.name);
}

// 更新頻道統計
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
  
  await pool.query(query, [guildId, channelId, channelName]);
}

// 儲存表情使用
async function saveEmojiUsage(pool, message) {
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
}

// 檢查訊息是否包含表情
function hasEmojiInMessage(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|<a?:\w+:\d+>/gu;
  return emojiRegex.test(text);
}

// 提取 Unicode 表情
function extractUnicodeEmojis(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex) || [];
  
  return matches.map(emoji => ({
    identifier: emoji,
    name: emoji,
    isCustom: false,
    url: null,
  }));
}

// 提取自訂表情
function extractCustomEmojis(message) {
  const customEmojiRegex = /<a?:(\w+):(\d+)>/g;
  const emojis = [];
  let match;
  
  while ((match = customEmojiRegex.exec(message.content)) !== null) {
    const emojiId = match[2];
    const emojiName = match[1];
    const isAnimated = message.content.includes('<a:');
    const extension = isAnimated ? 'gif' : 'png';
    
    emojis.push({
      identifier: `${emojiName}:${emojiId}`,
      name: emojiName,
      isCustom: true,
      url: `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`,
    });
  }
  
  return emojis;
}

module.exports = {
  saveMessage,
  saveEmojiUsage,
};
```

## 步驟 6: 每日統計任務

### 創建 `bot/jobs/statsAggregator.js`

```javascript
const cron = require('node-cron');

function startDailyStatsJob(pool, client) {
  // 每天凌晨 2 點執行統計
  cron.schedule('0 2 * * *', async () => {
    console.log('📊 開始執行每日統計...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    try {
      // 獲取所有白名單伺服器
      const allowedGuilds = process.env.ALLOWED_GUILD_IDS
        ? process.env.ALLOWED_GUILD_IDS.split(',').map(id => id.trim())
        : [];
      
      for (const guildId of allowedGuilds) {
        await generateDailyStats(pool, guildId, dateStr);
      }
      
      console.log('✅ 每日統計完成');
    } catch (error) {
      console.error('❌ 每日統計失敗:', error);
    }
  });
  
  console.log('⏰ 每日統計任務已啟動（每天凌晨 2:00）');
}

async function generateDailyStats(pool, guildId, date) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
      [guildId, date, totalMessages, activeUsers, 
       JSON.stringify(channelStats), JSON.stringify(topUsers)]
    );
    
    await client.query('COMMIT');
    console.log(`✅ 伺服器 ${guildId} 的 ${date} 統計已生成`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  startDailyStatsJob,
  generateDailyStats,
};
```

## 步驟 7: 更新 API 控制器

### 修改 `server/controllers/statsController.js`

在文件開頭添加：

```javascript
const pool = require('../../bot/database/db');

// 從數據庫獲取成員活躍度
exports.getMemberActivity = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    
    const query = `
      SELECT 
        user_id as id,
        username,
        COUNT(*) as "messageCount",
        MAX(created_at) as "lastActive"
      FROM messages
      WHERE guild_id = $1
      AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY user_id, username
      ORDER BY "messageCount" DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, [guildId]);
    res.json(result.rows);
  } catch (error) {
    console.error('獲取成員活躍度失敗:', error);
    res.status(500).json({ error: error.message });
  }
};

// 從數據庫獲取訊息趨勢
exports.getMessageTrends = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as messages,
        COUNT(DISTINCT user_id) as "activeUsers"
      FROM messages
      WHERE guild_id = $1
      AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const result = await pool.query(query, [guildId]);
    res.json(result.rows);
  } catch (error) {
    console.error('獲取訊息趨勢失敗:', error);
    res.status(500).json({ error: error.message });
  }
};

// 從數據庫獲取頻道使用情況
exports.getChannelUsage = async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const query = `
      SELECT 
        channel_id as id,
        channel_name as name,
        message_count as "messageCount"
      FROM channel_stats
      WHERE guild_id = $1
      ORDER BY message_count DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, [guildId]);
    res.json(result.rows);
  } catch (error) {
    console.error('獲取頻道使用情況失敗:', error);
    res.status(500).json({ error: error.message });
  }
};

// 從數據庫獲取表情統計
exports.getEmojiStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    
    const query = `
      SELECT 
        emoji_identifier as emoji,
        emoji_name as name,
        COUNT(*) as count,
        is_custom as "isCustom",
        emoji_url as url
      FROM emoji_usage
      WHERE guild_id = $1
      AND used_at >= NOW() - INTERVAL '${days} days'
      GROUP BY emoji_identifier, emoji_name, is_custom, emoji_url
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [guildId]);
    res.json(result.rows);
  } catch (error) {
    console.error('獲取表情統計失敗:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## 步驟 8: 啟動機器人

### 創建啟動腳本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\" \"npm run bot\"",
    "server": "nodemon server/index.js",
    "client": "cd client && npm run dev",
    "bot": "nodemon bot/index.js",
    "start": "node server/index.js",
    "start:bot": "node bot/index.js"
  }
}
```

### 啟動所有服務

```bash
# 開發模式（同時啟動 API、前端、Bot）
npm run dev

# 或分別啟動
npm run bot      # 數據收集機器人
npm run server   # API 伺服器
npm run client   # 前端界面
```

## 步驟 9: 數據庫初始化腳本

### 創建 `bot/database/init.sql`

```sql
-- 執行此腳本初始化數據庫
-- psql -U your_username -d discord_stats -f bot/database/init.sql

-- 創建所有表
\i create_tables.sql

-- 創建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_messages_guild_date ON messages(guild_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_emoji_guild_date ON emoji_usage(guild_id, DATE(used_at));

-- 創建視圖方便查詢
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
  guild_id,
  DATE(created_at) as activity_date,
  COUNT(*) as message_count,
  COUNT(DISTINCT user_id) as active_users
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY guild_id, DATE(created_at)
ORDER BY activity_date DESC;

GRANT SELECT ON v_recent_activity TO your_username;
```

## 測試與驗證

### 1. 測試數據庫連接

```bash
psql -U your_username -d discord_stats -c "SELECT COUNT(*) FROM messages;"
```

### 2. 查看收集的數據

```sql
-- 查看最近的訊息
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- 查看每日統計
SELECT * FROM daily_stats ORDER BY stat_date DESC;

-- 查看頻道統計
SELECT * FROM channel_stats ORDER BY message_count DESC;
```

### 3. 監控 Bot 日誌

```bash
# Bot 應該顯示
🤖 Bot 已登入: YourBot#1234
📊 監控 1 個伺服器
✅ PostgreSQL 連接成功
⏰ 每日統計任務已啟動（每天凌晨 2:00）
```

## 性能優化建議

1. **批量插入** - 累積多條記錄後一次性插入
2. **分區表** - 按月份分區 messages 表
3. **定期清理** - 刪除 90 天前的原始訊息
4. **使用連接池** - 已配置，最大 20 個連接
5. **添加快取** - 使用 Redis 快取熱門查詢

## 故障排除

### Bot 無法連接數據庫
- 檢查 `.env` 中的數據庫配置
- 確認 PostgreSQL 服務正在運行
- 檢查防火牆設置

### 數據未被收集
- 確認 Bot 有 Message Content Intent 權限
- 檢查伺服器是否在白名單中
- 查看 Bot 日誌是否有錯誤

### API 返回空數據
- 確認數據庫中有數據
- 檢查 guildId 是否正確
- 查看 API 日誌

## 下一步

1. ✅ 完成數據庫設置
2. ✅ 啟動數據收集 Bot
3. ✅ 等待數據累積（建議至少 24 小時）
4. ✅ 測試 API 端點
5. ✅ 查看前端統計儀表板

現在你可以開始收集真實的 Discord 數據了！🎉
