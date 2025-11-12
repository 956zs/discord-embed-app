const { REST, Routes } = require("discord.js");
require("dotenv").config();

async function listCommands() {
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN
  );

  try {
    console.log("📋 獲取已註冊的 Application Commands...\n");

    const commands = await rest.get(
      Routes.applicationCommands(
        process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID
      )
    );

    if (commands.length === 0) {
      console.log("⚠️  沒有已註冊的命令");
      return;
    }

    console.log(`✅ 找到 ${commands.length} 個已註冊的命令:\n`);

    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. /${cmd.name}`);
      console.log(`   ID: ${cmd.id}`);
      console.log(`   描述: ${cmd.description}`);
      if (cmd.name_localizations) {
        console.log(`   本地化名稱:`, cmd.name_localizations);
      }
      console.log("");
    });
  } catch (error) {
    console.error("❌ 獲取命令列表失敗:", error);
    throw error;
  }
}

if (require.main === module) {
  listCommands()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { listCommands };
