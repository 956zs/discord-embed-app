#!/usr/bin/env node

/**
 * Discord Stats App - Environment Setup Tool (Node.js version)
 * Usage: node setup-env.js
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt, defaultValue = "") {
  return new Promise((resolve) => {
    const displayPrompt = defaultValue
      ? `${colors.blue}${prompt}${colors.reset} ${colors.yellow}[default: ${defaultValue}]${colors.reset}: `
      : `${colors.blue}${prompt}${colors.reset}: `;

    rl.question(displayPrompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function questionSecret(prompt) {
  return new Promise((resolve) => {
    const displayPrompt = `${colors.blue}${prompt}${colors.reset}: `;

    // Hide input for secrets
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";
    process.stdout.write(displayPrompt);

    stdin.on("data", function (char) {
      char = char.toString("utf8");

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(password);
          break;
        case "\u0003":
          process.exit();
          break;
        case "\u007f": // Backspace
          password = password.slice(0, -1);
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(displayPrompt + "*".repeat(password.length));
          break;
        default:
          password += char;
          process.stdout.write("*");
          break;
      }
    });
  });
}

async function main() {
  console.clear();
  log(
    "╔═══════════════════════════════════════════════════════════════╗",
    "cyan"
  );
  log(
    "║                                                               ║",
    "cyan"
  );
  log(
    "║   Discord Server Stats & Visualization Embedded App          ║",
    "cyan"
  );
  log(
    "║   Environment Configuration Tool (Node.js)                   ║",
    "cyan"
  );
  log(
    "║                                                               ║",
    "cyan"
  );
  log(
    "╚═══════════════════════════════════════════════════════════════╝",
    "cyan"
  );
  console.log();

  log(
    "This tool will guide you through configuring environment variables",
    "blue"
  );
  console.log();

  // Select environment
  log("Select Environment Type:", "cyan");
  console.log("  1) Development - For local testing");
  console.log("  2) Production  - For server deployment");
  console.log();

  const envType = await question("Select environment type (1 or 2)", "2");
  const isProduction = envType === "2";
  const envMode = isProduction ? "production" : "development";

  log(`✓ Selected: ${envMode}`, "green");
  console.log();

  // Discord Configuration
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  log("Step 1/4: Discord Configuration", "cyan");
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  console.log();

  const discordClientId = await question("Discord Client ID");
  const discordClientSecret = await questionSecret("Discord Client Secret");
  const discordBotToken = await questionSecret("Discord Bot Token");

  log("✓ Discord configuration complete", "green");
  console.log();

  // Database Configuration
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  log("Step 2/4: Database Configuration", "cyan");
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  console.log();

  const dbHost = await question("Database Host", "localhost");
  const dbPort = await question("Database Port", "5432");
  const dbName = await question("Database Name", "discord_stats");
  const dbUser = await question("Database User", "postgres");
  const dbPassword = await questionSecret("Database Password");

  log("✓ Database configuration complete", "green");
  console.log();

  // Server Configuration
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  log("Step 3/4: Server Configuration", "cyan");
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  console.log();

  const port = await question("API Server Port", "3008");
  const clientPort = await question("Client Port", "3000");
  const allowedGuildIds = await question(
    "Allowed Guild IDs (comma-separated, optional)",
    ""
  );

  log("✓ Server configuration complete", "green");
  console.log();

  // Monitoring Configuration
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  log("Step 4/4: Monitoring Configuration (Optional)", "cyan");
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  console.log();

  const enableMonitoring = await question("Enable monitoring? (y/n)", "n");
  const monitoringEnabled = enableMonitoring.toLowerCase() === "y";

  let adminToken = "";
  let webhookEnabled = "false";
  let webhookUrls = "";

  if (monitoringEnabled) {
    const generateToken = await question(
      "Generate random admin token? (y/n)",
      "y"
    );
    if (generateToken.toLowerCase() === "y") {
      adminToken = require("crypto").randomBytes(32).toString("hex");
      log(`✓ Generated admin token: ${adminToken}`, "green");
    } else {
      adminToken = await questionSecret("Enter admin token");
    }

    const enableWebhook = await question(
      "Enable webhook notifications? (y/n)",
      "n"
    );
    if (enableWebhook.toLowerCase() === "y") {
      webhookEnabled = "true";
      webhookUrls = await question("Webhook URLs (comma-separated)", "");
    }
  }

  log("✓ Monitoring configuration complete", "green");
  console.log();

  // Generate .env files
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  log("Generating configuration files...", "cyan");
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  console.log();

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
  const backendUrl = isProduction
    ? `http://localhost:${port}`
    : `http://localhost:${port}`;
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
  log("✓ Generated .env", "green");

  fs.writeFileSync("bot/.env", botEnv);
  log("✓ Generated bot/.env", "green");

  fs.writeFileSync("client/.env.local", clientEnv);
  log("✓ Generated client/.env.local", "green");

  console.log();
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  log("🎉 Configuration complete!", "green");
  log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "cyan"
  );
  console.log();
  log("Next steps:", "blue");
  console.log("  1. Verify configuration: cat .env");
  console.log("  2. Initialize database: createdb discord_stats");
  console.log("  3. Deploy: ./deploy.sh");
  console.log();

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
