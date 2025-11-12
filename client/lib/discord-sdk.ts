import { DiscordSDK } from "@discord/embedded-app-sdk";

let discordSdk: DiscordSDK | null = null;
let authInfo: { userId: string; username: string } | null = null;

// 從 URL fragment 解析用戶信息（Discord 有時會這樣傳遞）
function parseUserFromUrl(): { userId: string; username: string } | null {
  try {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const userId = params.get("user_id");
    const username = params.get("username");

    if (userId) {
      console.log("📍 從 URL fragment 獲取用戶信息:", { userId, username });
      return { userId, username: username || "User" };
    }
  } catch (error) {
    console.error("解析 URL fragment 失敗:", error);
  }
  return null;
}

export async function initDiscordSdk() {
  if (discordSdk) {
    console.log("♻️ Discord SDK 已經初始化，重用現有實例");
    return discordSdk;
  }

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_DISCORD_CLIENT_ID is not set");
  }

  console.log("🚀 初始化 Discord SDK...");
  discordSdk = new DiscordSDK(clientId);

  try {
    // 等待 SDK 就緒
    await discordSdk.ready();
    console.log("✅ Discord SDK 已就緒", {
      guildId: discordSdk.guildId,
      channelId: discordSdk.channelId,
      instanceId: discordSdk.instanceId,
    });

    // 進行 OAuth2 認證以獲取用戶信息
    try {
      console.log("🔐 開始 OAuth2 認證...");
      const { code } = await discordSdk.commands.authorize({
        client_id: clientId,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds"],
      });

      console.log("✅ OAuth2 授權成功，獲取 access token...");

      // 使用後端 API 交換 token 並獲取用戶信息
      try {
        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (response.ok) {
          const data = await response.json();
          authInfo = {
            userId: data.userId,
            username: data.username,
          };
          console.log("✅ 從後端 API 獲取用戶信息成功:", authInfo);
        } else {
          console.error("❌ 後端 API 返回錯誤:", await response.text());
        }
      } catch (apiError) {
        console.error("❌ 調用後端 API 失敗:", apiError);
      }
    } catch (authError: any) {
      console.error("❌ OAuth2 認證失敗:", authError);
      console.log("嘗試其他方法獲取用戶信息...");

      // 嘗試從 instanceId 獲取
      if (discordSdk.instanceId) {
        try {
          const participants =
            await discordSdk.commands.getInstanceConnectedParticipants();
          console.log("👥 獲取參與者信息:", participants);

          // 嘗試獲取當前用戶
          if (participants && participants.participants) {
            const currentUser = participants.participants[0]; // 假設第一個是當前用戶
            if (currentUser) {
              authInfo = {
                userId: currentUser.id,
                username: currentUser.username,
              };
              console.log("✅ 從參與者獲取用戶信息:", authInfo);
            }
          }
        } catch (participantsError) {
          console.error("❌ 獲取參與者失敗:", participantsError);
        }
      }
    }
  } catch (error) {
    console.error("❌ Discord SDK 初始化失敗:", error);
    throw error;
  }

  return discordSdk;
}

export function getDiscordSdk() {
  return discordSdk;
}

export async function getDiscordContext() {
  if (!discordSdk) {
    console.log("🔄 Discord SDK 未初始化，開始初始化...");
    await initDiscordSdk();
  } else {
    console.log("✅ 使用已初始化的 Discord SDK");
  }

  if (!discordSdk) {
    throw new Error("Discord SDK not initialized");
  }

  // 如果還沒有用戶信息，嘗試從 URL 獲取
  if (!authInfo) {
    console.log("🔍 嘗試從 URL 獲取用戶信息...");
    const urlUser = parseUserFromUrl();
    if (urlUser) {
      authInfo = urlUser;
      console.log("✅ 從 URL 獲取用戶信息成功:", authInfo);
    }
  } else {
    console.log("✅ 使用已緩存的用戶信息:", authInfo);
  }

  const context = {
    guildId: discordSdk.guildId || null,
    channelId: discordSdk.channelId || null,
    userId: authInfo?.userId || null,
    username: authInfo?.username || null,
  };

  console.log("📋 Discord 上下文:", context);

  // 如果還是沒有用戶信息，記錄詳細的 SDK 狀態
  if (!context.userId) {
    console.warn("⚠️ 無法獲取用戶 ID，SDK 狀態:", {
      guildId: discordSdk.guildId,
      channelId: discordSdk.channelId,
      instanceId: discordSdk.instanceId,
      platform: discordSdk.platform,
      authInfo: authInfo,
    });
  }

  return context;
}
