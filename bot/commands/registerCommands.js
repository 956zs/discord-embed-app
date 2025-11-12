const { REST, Routes, ApplicationCommandType } = require("discord.js");
require("dotenv").config();

const commands = [
  {
    name: "stats",
    name_localizations: {
      "zh-TW": "統計",
    },
    description: "View detailed server statistics",
    description_localizations: {
      "zh-TW": "查看伺服器的詳細統計數據",
    },
    type: ApplicationCommandType.ChatInput,
  },
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN
  );

  try {
    console.log("🔄 開始註冊 Application Commands...");

    // 獲取現有命令
    const existingCommands = await rest.get(
      Routes.applicationCommands(
        process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID
      )
    );

    console.log(`📋 現有命令數量: ${existingCommands.length}`);

    // 合併現有命令和新命令（避免重複）
    const existingCommandNames = existingCommands.map((cmd) => cmd.name);
    const newCommands = commands.filter(
      (cmd) => !existingCommandNames.includes(cmd.name)
    );
    const allCommands = [...existingCommands, ...newCommands];

    if (newCommands.length === 0) {
      console.log("✅ 所有命令已存在，無需註冊新命令");
      console.log("\n📝 現有命令列表:");
      existingCommands.forEach((cmd) => {
        console.log(`   /${cmd.name} - ${cmd.description}`);
      });
      return;
    }

    // 註冊全域命令（使用 POST 添加，而不是 PUT 覆蓋）
    for (const cmd of newCommands) {
      await rest.post(
        Routes.applicationCommands(
          process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID
        ),
        { body: cmd }
      );
      console.log(`✅ 已添加命令: /${cmd.name}`);
    }

    console.log("\n✅ Application Commands 註冊成功！");
    console.log(`   新增 ${newCommands.length} 個命令`);
    console.log(`   總共 ${allCommands.length} 個命令`);
  } catch (error) {
    console.error("❌ 註冊 Application Commands 失敗:", error);
    throw error;
  }
}

// 如果直接執行此文件
if (require.main === module) {
  registerCommands()
    .then(() => {
      console.log("\n✅ 完成！");
      console.log(
        "\n💡 提示: Discord Embedded App 主要通過 Activities 按鈕啟動"
      );
      console.log("   1. 點擊訊息輸入框旁的「+」按鈕");
      console.log("   2. 選擇「Activities」");
      console.log("   3. 點擊「伺服器統計」");
      console.log("\n   斜線命令 /stats 是可選的快捷方式");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 註冊失敗:", error);
      process.exit(1);
    });
}

module.exports = { registerCommands, commands };
