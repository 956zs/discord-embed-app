const { EmbedBuilder } = require("discord.js");

/**
 * 處理 /伺服器統計 命令
 */
async function handleStatsCommand(interaction) {
  try {
    // 檢查是否在伺服器中
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ 此命令只能在伺服器中使用",
        ephemeral: true,
      });
      return;
    }

    // 檢查白名單
    const allowedGuilds = process.env.ALLOWED_GUILD_IDS
      ? process.env.ALLOWED_GUILD_IDS.split(",").map((id) => id.trim())
      : [];

    if (
      allowedGuilds.length > 0 &&
      !allowedGuilds.includes(interaction.guild.id)
    ) {
      await interaction.reply({
        content: "❌ 此伺服器未啟用統計功能",
        ephemeral: true,
      });
      return;
    }

    // 創建 Embedded App 連結
    const appUrl = process.env.EMBEDDED_APP_URL || "http://localhost:5173";

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📊 伺服器統計儀表板")
      .setDescription("點擊下方按鈕查看詳細的伺服器統計數據")
      .addFields(
        { name: "📈 訊息趨勢", value: "查看 7 天內的訊息量變化", inline: true },
        { name: "👥 成員活躍度", value: "最活躍成員排行榜", inline: true },
        { name: "💬 頻道統計", value: "各頻道使用情況", inline: true },
        { name: "😀 表情統計", value: "最常用的表情排行", inline: true },
        { name: "☁️ 關鍵詞雲", value: "熱門關鍵詞視覺化", inline: true },
        { name: "🏠 伺服器概覽", value: "成員數、頻道數等資訊", inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} 統計` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      components: [
        {
          type: 1, // Action Row
          components: [
            {
              type: 2, // Button
              style: 5, // Link
              label: "📊 開啟統計儀表板",
              url: appUrl,
            },
          ],
        },
      ],
    });

    console.log(
      `📊 ${interaction.user.username} 在 ${interaction.guild.name} 使用了統計命令`
    );
  } catch (error) {
    console.error("❌ 處理統計命令失敗:", error);

    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ 處理命令時發生錯誤，請稍後再試",
        ephemeral: true,
      });
    }
  }
}

/**
 * 設置命令處理器
 */
function setupCommandHandlers(client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case "stats":
      case "統計":
        await handleStatsCommand(interaction);
        break;

      default:
        console.log(`⚠️  未知命令: ${interaction.commandName}`);
    }
  });

  console.log("✅ 命令處理器已設置");
}

module.exports = {
  handleStatsCommand,
  setupCommandHandlers,
};
