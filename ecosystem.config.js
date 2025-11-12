module.exports = {
  apps: [
    // Server + Bot (合併在一起，更簡單可靠)
    {
      name: "discord-server",
      cwd: "./server",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3008,
        START_BOT_IN_SERVER: "true", // 讓 server 啟動 bot
      },
      error_file: "./logs/server-error.log",
      out_file: "./logs/server-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    // Client (Next.js)
    {
      name: "discord-client",
      cwd: "./client",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/client-error.log",
      out_file: "./logs/client-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
