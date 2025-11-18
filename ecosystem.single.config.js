require("dotenv").config();

module.exports = {
  apps: [
    // Single Process: Server + Bot + Client
    {
      name: "discord-app",
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
        PORT: process.env.SINGLE_PROCESS_PORT || 3000,
        START_BOT_IN_SERVER: "true",
        ENABLE_MONITORING: process.env.ENABLE_MONITORING || "true",
        SINGLE_PROCESS_MODE: "true",
        CLIENT_DIR: "../client",
      },

      // Log configuration with rotation
      error_file: "./logs/app-error.log",
      out_file: "./logs/app-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      log_type: "json",
      time: true,
    },
  ],
};
