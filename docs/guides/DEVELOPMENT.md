# 開發指南

本指南涵蓋 Discord 數據收集機器人開發、數據庫設計和 TypeScript 使用。

## 技術棧

### 前端 (client/)
- **React 18** + **TypeScript** (strict mode)
- **Vite** - 構建工具和開發伺服器
- **Chart.js** + react-chartjs-2 - 數據視覺化
- **react-wordcloud** + d3-cloud - 詞雲渲染
- **Discord Embedded App SDK** - Discord 整合
- **Axios** - HTTP 客戶端

### 後端 (server/)
- **Node.js** + **Express** (CommonJS)
- **CORS** 啟用
- **dotenv** - 環境配置

### Bot (bot/)
- **Discord.js v14** (CommonJS)
- **PostgreSQL** via node-postgres (pg)
- **node-cron** - 定時任務
- 必需 Intents: Guilds, GuildMembers, GuildMessages, MessageContent

## 數據庫設計

### 表結構

#### messages - 訊息記錄
```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100),
    message_length INTEGER,
    has_emoji BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guild_created ON messages(guild_id, created_at);
CREATE INDEX idx_user_guild ON messages(user_id, guild_id);
CREATE INDEX idx_channel ON messages(channel_id);
```

#### emoji_usage - 表情使用記錄
```sql
CREATE TABLE emoji_usage (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    emoji_identifier VARCHAR(100) NOT NULL,
    emoji_name VARCHAR(100),
    is_custom BOOLEAN DEFAULT FALSE,
    emoji_url TEXT,
    user_id VARCHAR(20),
    used_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guild_emoji ON emoji_usage(guild_id, emoji_identifier);
CREATE INDEX idx_guild_used ON emoji_usage(guild_id, used_at);
```

#### daily_stats - 每日統計匯總
```sql
CREATE TABLE daily_stats (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    stat_date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    channel_stats JSONB,
    top_users JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, stat_date)
);

CREATE INDEX idx_guild_date ON daily_stats(guild_id, stat_date);
```

#### channel_stats - 頻道統計
```sql
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

### 數據庫連接

`bot/database/db.js`:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

## Bot 開發

### 主要文件

#### bot/index.js - Bot 入口
```javascript
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

client.on('ready', () => {
  console.log(`🤖 Bot 已登入: ${client.user.tag}`);
  startDailyStatsJob(pool, client);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!isGuildAllowed(message.guild.id)) return;
  
  try {
    await saveMessage(pool, message);
    await saveEmojiUsage(pool, message);
  } catch (error) {
    console.error('❌ 儲存訊息失敗:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

#### bot/handlers/messageHandler.js - 訊息處理
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
  const unicodeEmojis = extractUnicodeEmojis(message.content);
  const customEmojis = extractCustomEmojis(message);
  
  for (const emoji of [...unicodeEmojis, ...customEmojis]) {
    const query = `
      INSERT INTO emoji_usage (
        guild_id, emoji_identifier, emoji_name, 
        is_custom, emoji_url, user_id, used_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await pool.query(query, [
      message.guild.id,
      emoji.identifier,
      emoji.name,
      emoji.isCustom,
      emoji.url || null,
      message.author.id,
      message.createdAt,
    ]);
  }
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

module.exports = { saveMessage, saveEmojiUsage };
```

#### bot/jobs/statsAggregator.js - 每日統計任務
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
       WHERE guild_id = $1 AND DATE(created_at) = $2`,
      [guildId, date]
    );
    const totalMessages = parseInt(messageCountResult.rows[0].count);
    
    // 統計活躍用戶數
    const activeUsersResult = await client.query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM messages 
       WHERE guild_id = $1 AND DATE(created_at) = $2`,
      [guildId, date]
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);
    
    // 統計各頻道訊息數
    const channelStatsResult = await client.query(
      `SELECT channel_id, COUNT(*) as message_count
       FROM messages 
       WHERE guild_id = $1 AND DATE(created_at) = $2
       GROUP BY channel_id
       ORDER BY message_count DESC
       LIMIT 10`,
      [guildId, date]
    );
    
    // 統計最活躍用戶
    const topUsersResult = await client.query(
      `SELECT user_id, username, COUNT(*) as message_count
       FROM messages 
       WHERE guild_id = $1 AND DATE(created_at) = $2
       GROUP BY user_id, username
       ORDER BY message_count DESC
       LIMIT 10`,
      [guildId, date]
    );
    
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
       JSON.stringify(channelStatsResult.rows), 
       JSON.stringify(topUsersResult.rows)]
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

module.exports = { startDailyStatsJob, generateDailyStats };
```

## TypeScript 前端

### 類型定義

`client/src/types/index.ts`:
```typescript
export interface ServerStats {
  name: string;
  memberCount: number;
  channelCount: number;
  roleCount: number;
  createdAt: string;
}

export interface MemberActivity {
  id: string;
  username: string;
  messageCount: number;
  lastActive: string;
}

export interface ChannelUsage {
  id: string;
  name: string;
  messageCount: number;
}

export interface MessageTrend {
  date: string;
  messages: number;
  activeUsers: number;
}

export interface EmojiUsage {
  emoji: string;
  name: string;
  count: number;
  isCustom: boolean;
  url?: string;
}

export interface KeywordData {
  text: string;
  value: number;
}
```

### TypeScript 配置

`client/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 為什麼使用 TypeScript？

- ✅ **類型安全** - 編譯時發現錯誤
- ✅ **自動補全** - 更好的開發體驗
- ✅ **重構安全** - 自動更新所有引用
- ✅ **自文檔化** - 類型定義即文檔
- ✅ **Discord SDK 原生支援**

## API 開發

### 控制器範例

`server/controllers/statsController.js`:
```javascript
const pool = require('../../bot/database/db');

// 獲取成員活躍度
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
```

## 性能優化

### 數據庫優化
1. **索引** - 在常查詢的欄位上建立索引
2. **分區表** - 按月份分區 messages 表
3. **定期清理** - 刪除 90 天前的原始訊息
4. **連接池** - 使用連接池管理數據庫連接

### 應用優化
1. **批量插入** - 累積多條記錄後一次性插入
2. **快取** - 使用 Redis 快取熱門查詢
3. **CDN** - 使用 CDN 加速靜態資源
4. **壓縮** - 啟用 gzip 壓縮

## 測試

### 數據庫測試
```bash
# 查看最近的訊息
psql -U postgres -d discord_stats -c "SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;"

# 查看每日統計
psql -U postgres -d discord_stats -c "SELECT * FROM daily_stats ORDER BY stat_date DESC;"

# 查看頻道統計
psql -U postgres -d discord_stats -c "SELECT * FROM channel_stats ORDER BY message_count DESC;"
```

### API 測試
```bash
# 測試健康檢查
curl http://localhost:3001/health

# 測試伺服器統計
curl http://localhost:3001/api/stats/server/YOUR_GUILD_ID

# 測試成員活躍度
curl http://localhost:3001/api/stats/members/YOUR_GUILD_ID
```

## 開發工作流

```bash
# 開發模式（所有服務）
npm run dev

# 單獨啟動服務
npm run bot      # Bot
npm run server   # API
npm run client   # 前端

# 生產構建
cd client && npm run build

# 生產啟動
npm start        # API
npm run start:bot # Bot
```

## 下一步

- 閱讀 `CONFIGURATION.md` 了解進階配置
- 閱讀 `TROUBLESHOOTING.md` 了解故障排除
- 查看 API 文檔了解所有端點
