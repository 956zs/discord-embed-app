import { useState, useEffect } from "react";
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Dashboard from "./components/Dashboard";
import "./App.css";

// 檢查是否在 Discord 環境中
const isInDiscord = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has("frame_id") || window.location.hostname.includes("discord");
};

// 開發模式：使用測試伺服器 ID
const DEV_GUILD_ID = import.meta.env.VITE_DEV_GUILD_ID || "1320005222688624713";

function App() {
  const [guildId, setGuildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    const setupApp = async () => {
      // 檢查是否在 Discord 環境中
      if (!isInDiscord()) {
        console.log("🔧 開發模式：不在 Discord 環境中，使用測試數據");
        setIsDevMode(true);
        setGuildId(DEV_GUILD_ID);
        setLoading(false);
        return;
      }

      // Discord 環境：初始化 SDK
      try {
        const discordSdk = new DiscordSDK(
          import.meta.env.VITE_DISCORD_CLIENT_ID
        );

        await discordSdk.ready();

        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds"],
        });

        console.log("✅ Discord SDK 初始化成功");
        setGuildId(discordSdk.guildId || null);
      } catch (error) {
        console.error("❌ Discord SDK 初始化失敗:", error);
        // 即使在 Discord 中失敗，也使用測試數據
        setIsDevMode(true);
        setGuildId(DEV_GUILD_ID);
      } finally {
        setLoading(false);
      }
    };

    setupApp();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {isDevMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#ff9800",
            color: "#fff",
            padding: "8px",
            textAlign: "center",
            fontSize: "14px",
            zIndex: 9999,
          }}
        >
          🔧 開發模式 - 使用測試伺服器數據 (ID: {DEV_GUILD_ID})
        </div>
      )}
      <Dashboard guildId={guildId} />
    </div>
  );
}

export default App;
