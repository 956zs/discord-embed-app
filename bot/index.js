require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const pool = require("./database/db");
const { saveMessage, saveEmojiUsage } = require("./handlers/messageHandler");
const { startDailyStatsJob } = require("./jobs/statsAggregator");
const { setupCommandHandlers } = require("./commands/handleCommands");

// 創建 Discord 客戶端
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
  ? process.env.ALLOWED_GUILD_IDS.split(",").map((id) => id.trim())
  : [];

function isGuildAllowed(guildId) {
  if (allowedGuilds.length === 0) {
    console.warn("⚠️  警告: 未設定白名單，將收集所有伺服器的數據");
    return true;
  }
  return allowedGuilds.includes(guildId);
}

// Bot 就緒事件
client.on("ready", () => {
  console.log("\n" + "=".repeat(50));
  console.log(`🤖 Bot 已登入: ${client.user.tag}`);
  console.log(`📊 監控 ${client.guilds.cache.size} 個伺服器`);

  // 顯示白名單狀態
  if (allowedGuilds.length > 0) {
    console.log(`🔒 白名單已啟用，收集以下伺服器的數據:`);
    allowedGuilds.forEach((guildId) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        console.log(`   ✅ ${guild.name} (${guildId})`);
      } else {
        console.log(`   ⚠️  伺服器 ${guildId} (Bot 未加入)`);
      }
    });
  } else {
    console.log(`⚠️  白名單未設定，將收集所有伺服器的數據`);
  }

  console.log("=".repeat(50) + "\n");

  // 設置命令處理器
  setupCommandHandlers(client);

  // 啟動每日統計任務
  startDailyStatsJob(pool, client);

  console.log("✅ Bot 已準備就緒，開始收集數據...\n");
});

// 訊息事件監聽
client.on("messageCreate", async (message) => {
  // 忽略 Bot 訊息
  if (message.author.bot) return;

  // 忽略私訊
  if (!message.guild) return;

  // 白名單檢查
  if (!isGuildAllowed(message.guild.id)) {
    return;
  }

  try {
    // 儲存訊息記錄
    await saveMessage(pool, message);

    // 儲存表情使用
    if (message.content) {
      await saveEmojiUsage(pool, message);
    }

    // 每 100 則訊息顯示一次進度
    if (Math.random() < 0.01) {
      console.log(
        `📝 已收集訊息: ${message.guild.name} > #${message.channel.name} > ${message.author.username}`
      );
    }
  } catch (error) {
    console.error("❌ 處理訊息失敗:", error.message);
  }
});

// 伺服器加入事件
client.on("guildCreate", (guild) => {
  console.log(`\n🎉 Bot 加入新伺服器: ${guild.name} (${guild.id})`);

  if (allowedGuilds.length > 0 && !isGuildAllowed(guild.id)) {
    console.log(`⚠️  此伺服器不在白名單中，不會收集數據`);
    console.log(`   如需收集，請將 ${guild.id} 添加到 ALLOWED_GUILD_IDS\n`);
  } else {
    console.log(`✅ 開始收集此伺服器的數據\n`);
  }
});

// 伺服器離開事件
client.on("guildDelete", (guild) => {
  console.log(`\n👋 Bot 離開伺服器: ${guild.name} (${guild.id})\n`);
});

// 錯誤處理
client.on("error", (error) => {
  console.error("❌ Discord 客戶端錯誤:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ 未處理的 Promise 拒絕:", error);
});

// 優雅關閉
process.on("SIGINT", async () => {
  console.log("\n🛑 正在關閉 Bot...");

  try {
    await pool.end();
    console.log("✅ 數據庫連接已關閉");
  } catch (error) {
    console.error("❌ 關閉數據庫連接失敗:", error);
  }

  client.destroy();
  console.log("✅ Bot 已關閉\n");
  process.exit(0);
});

// 登入 Bot
console.log("🚀 正在啟動 Discord Bot...\n");
client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error("❌ Bot 登入失敗:", error.message);
  console.error("請檢查 DISCORD_BOT_TOKEN 是否正確");
  process.exit(1);
});
