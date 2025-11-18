require("dotenv").config();

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
