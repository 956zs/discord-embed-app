require("dotenv").config();

/**
 * PM2 Ecosystem Configuration - Dual Process Mode (Default)
 *
 * Process Names:
 * - discord-server: API server + Discord bot (port 3008)
 * - discord-client: Next.js frontend (port 3000)
 *
 * Safety Note:
 * All management scripts (deploy.sh, manage.sh, update.sh) use these specific
 * process names and will NEVER use global commands like "pm2 delete all".
 * This ensures other PM2 processes on the system are not affected.
 *
 * Usage:
 * - pm2 start ecosystem.dual.config.js
 * - pm2 restart discord-server discord-client
 * - pm2 logs discord-server
 *
 * Mode Switching:
 * Use ./manage.sh switch-mode to switch between dual and single process modes.
 * The script will safely clean up processes from the old mode before starting the new mode.
 */

module.exports = {
  apps: [
    // Server + Bot
    {
      name: "discord-server",
      cwd: "./server",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // Enhanced monitoring configuration
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      // PM2 Plus integration (optional)
      pmx: true,

      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3008,
        START_BOT_IN_SERVER: "true",
        ENABLE_MONITORING: process.env.ENABLE_MONITORING || "true",
      },

      // Log configuration with rotation
      error_file: "./logs/server-error.log",
      out_file: "./logs/server-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      log_type: "json",
      time: true,
    },
    // Client (Next.js)
    {
      name: "discord-client",
      cwd: "./client",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${process.env.CLIENT_PORT || 3000}`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // Enhanced monitoring configuration
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      env: {
        NODE_ENV: "production",
      },

      // Log configuration with rotation
      error_file: "./logs/client-error.log",
      out_file: "./logs/client-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      log_type: "json",
      time: true,
    },
  ],
};
