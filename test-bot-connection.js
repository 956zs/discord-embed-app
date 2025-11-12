// 測試 bot 連接的獨立腳本
console.log("🔍 測試 bot 連接...\n");

try {
  console.log("1️⃣ 嘗試 require bot 模組...");
  const botModule = require("./bot/index.js");
  console.log("✅ bot 模組載入成功");
  console.log("   導出的內容:", Object.keys(botModule));

  console.log("\n2️⃣ 檢查 historyFetcher 函數...");
  const getHistoryFetcher = botModule.historyFetcher;
  console.log("   historyFetcher 類型:", typeof getHistoryFetcher);

  if (typeof getHistoryFetcher === "function") {
    console.log("✅ historyFetcher 是一個函數");

    console.log("\n3️⃣ 嘗試調用 historyFetcher()...");
    const fetcher = getHistoryFetcher();

    if (fetcher) {
      console.log("✅ historyFetcher 實例存在");
      console.log("   實例類型:", fetcher.constructor.name);
      console.log(
        "   可用方法:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(fetcher))
      );
    } else {
      console.log("❌ historyFetcher 實例為 null");
      console.log("   這表示 bot 可能尚未就緒（ready 事件未觸發）");
      console.log("   請等待幾秒後重試");
    }
  } else {
    console.log("❌ historyFetcher 不是函數");
  }

  console.log("\n4️⃣ 檢查 Discord client...");
  const client = botModule.client;
  if (client) {
    console.log("✅ Discord client 存在");
    console.log("   就緒狀態:", client.isReady());
    console.log("   用戶:", client.user ? client.user.tag : "未登入");
  } else {
    console.log("❌ Discord client 不存在");
  }
} catch (error) {
  console.error("❌ 錯誤:", error.message);
  console.error("   堆疊:", error.stack);
}

console.log("\n✅ 測試完成");
