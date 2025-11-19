#!/usr/bin/env node

/**
 * Discord Stats App - Simple Environment Setup Tool
 * Usage: node setup-env-simple.js
 *
 * This version uses simple readline without raw mode
 */

const readline = require("readline");
const fs = require("fs");
const crypto = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Simple question function
function ask(question, defaultValue = "") {
  return new Promise((resolve) => {
    const prompt = defaultValue
      ? `${question} [${defaultValue}]: `
      : `${question}: `;

    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log(
    "\n╔═══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   Discord Stats App - Environment Setup (Simple)             ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝\n"
  );

  console.log(
    "⚠️  Note: Passwords will be visible. Use in trusted environment only.\n"
  );

  // Environment type
  const envType = await ask("Environment (1=dev, 2=prod)", "2");
  const isProduction = envType === "2";
  const envMode = isProduction ? "production" : "development";
  console.log(`✓ Environment: ${envMode}\n`);

  // Discord Configuration
  console.log("━━━ Discord Configuration ━━━");
  const discordClientId = await ask("Discord Client ID");
  const discordClientSecret = await ask("Discord Client Secret");
  const discordBotToken = await ask("Discord Bot Token");
  console.log("✓ Discord config done\n");

  // Database Configuration
  console.log("━━━ Database Configuration ━━━");
  const dbHost = await ask("Database Host", "localhost");
  const dbPort = await ask("Database Port", "5432");
  const dbName = await ask("Database Name", "discord_stats");
  const dbUser = await ask("Database User", "postgres");
  const dbPassword = await ask("Database Password");
  console.log("✓ Database config done\n");

  // Server Configuration
  console.log("━━━ Server Configuration ━━━");
  const port = await ask("API Server Port", "3008");
  const clientPort = await ask("Client Port", "3000");
  const allowedGuildIds = await ask("Allowed Guild IDs (optional)", "");
  console.log("✓ Server config done\n");

  // Monitoring Configuration
  console.log("━━━ Monitoring Configuration ━━━");
  const enableMonitoring = await ask("Enable monitoring? (y/n)", "n");
  const monitoringEnabled = enableMonitoring.toLowerCase() === "y";

  let adminToken = "";
  let webhookEnabled = "false";
  let webhookUrls = "";

  if (monitoringEnabled) {
    const genToken = await ask("Generate random admin token? (y/n)", "y");
    if (genToken.toLowerCase() === "y") {
      adminToken = crypto.randomBytes(32).toString("hex");
      console.log(`Generated token: ${adminToken}`);
    } else {
      adminToken = await ask("Admin Token");
    }

    const enableWebhook = await ask("Enable webhooks? (y/n)", "n");
    if (enableWebhook.toLowerCase() === "y") {
      webhookEnabled = "true";
      webhookUrls = await ask("Webhook URLs");
    }
  }
  console.log("✓ Monitoring config done\n");

  // Generate files
  console.log("━━━ Generating files ━━━");

  // Root .env
  const rootEnv = `# Discord Stats App - Environment Configuration
# Environment: ${envMode}
# Generated: ${new Date().toISOString()}

# Discord Configuration
DISCORD_CLIENT_ID=${discordClientId}
DISCORD_CLIENT_SECRET=${discordClientSecret}
DISCORD_BOT_TOKEN=${discordBotToken}

# Server Configuration
PORT=${port}
CLIENT_PORT=${clientPort}
ALLOWED_GUILD_IDS=${allowedGuildIds}
NODE_ENV=${envMode}

# Monitoring Configuration
ENABLE_MONITORING=${monitoringEnabled}
METRICS_INTERVAL=30000
METRICS_RETENTION_HOURS=24
ALERT_CPU_WARN=80
ALERT_CPU_ERROR=90
ALERT_MEMORY_WARN=80
ALERT_MEMORY_ERROR=90
ADMIN_TOKEN=${adminToken}
WEBHOOK_ENABLED=${webhookEnabled}
WEBHOOK_URLS=${webhookUrls}
`;

  // Bot .env
  const botEnv = `# Discord Bot Configuration
# Environment: ${envMode}
# Generated: ${new Date().toISOString()}

# Discord Configuration
DISCORD_BOT_TOKEN=${discordBotToken}
DISCORD_CLIENT_ID=${discordClientId}
DISCORD_APPLICATION_ID=${discordClientId}
ALLOWED_GUILD_IDS=${allowedGuildIds}
EMBEDDED_APP_URL=http://localhost:${clientPort}

# Database Configuration
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}

NODE_ENV=${envMode}
`;

  // Client .env.local
  const backendUrl = `http://localhost:${port}`;
  const clientEnv = `# Next.js Frontend Configuration
# Environment: ${envMode}
# Generated: ${new Date().toISOString()}

# Discord Configuration
NEXT_PUBLIC_DISCORD_CLIENT_ID=${discordClientId}

# Backend URL
BACKEND_URL=${backendUrl}

# Development Mode
NEXT_PUBLIC_ENABLE_DEV_MODE=${!isProduction}
NEXT_PUBLIC_DEV_GUILD_ID=
NEXT_PUBLIC_DEV_USER_ID=

NODE_ENV=${envMode}
`;

  // Write files
  fs.writeFileSync(".env", rootEnv);
  console.log("✓ Created .env");

  fs.writeFileSync("bot/.env", botEnv);
  console.log("✓ Created bot/.env");

  fs.writeFileSync("client/.env.local", clientEnv);
  console.log("✓ Created client/.env.local");

  console.log("\n🎉 Configuration complete!\n");
  console.log("Next steps:");
  console.log("  1. Verify: cat .env");
  console.log("  2. Deploy: ./deploy.sh\n");

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
