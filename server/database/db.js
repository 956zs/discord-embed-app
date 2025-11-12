const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 最大連接數
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 測試連接
pool.on("connect", () => {
  console.log("✅ PostgreSQL 連接成功");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL 連接錯誤:", err);
  process.exit(-1);
});

// 測試查詢
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ 數據庫查詢測試失敗:", err);
  } else {
    console.log("✅ 數據庫查詢測試成功:", res.rows[0].now);
  }
});

module.exports = pool;
