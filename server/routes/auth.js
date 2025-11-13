const express = require("express");
const router = express.Router();
const axios = require("axios");

// Discord OAuth2 token exchange
router.post("/token", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      console.error("❌ Token exchange: Missing code");
      return res.status(400).json({ error: "Missing code" });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("❌ Token exchange: Missing client credentials");
      return res.status(500).json({ error: "Server configuration error" });
    }

    console.log("🔄 開始 token exchange...");
    console.log("  Client ID:", clientId);
    console.log("  Code:", code.substring(0, 10) + "...");

    // Exchange code for access token
    // Discord Embedded Apps 不需要 redirect_uri
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenResponse.data;
    console.log("✅ Access token 獲取成功");

    // Get user info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = {
      userId: userResponse.data.id,
      username: userResponse.data.username,
      discriminator: userResponse.data.discriminator,
      avatar: userResponse.data.avatar,
    };

    console.log("✅ 用戶信息獲取成功:", {
      userId: userData.userId,
      username: userData.username,
    });

    res.json(userData);
  } catch (error) {
    console.error("❌ Token exchange 失敗:");
    console.error("  錯誤類型:", error.constructor.name);
    console.error("  錯誤訊息:", error.message);
    if (error.response) {
      console.error("  HTTP 狀態:", error.response.status);
      console.error("  響應數據:", error.response.data);
    }
    res.status(500).json({
      error: "Failed to exchange token",
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;
