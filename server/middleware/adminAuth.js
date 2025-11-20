/**
 * 管理員權限驗證中介軟體
 *
 * 用於保護監控端點，確保只有管理員可以訪問詳細的監控數據
 */

/**
 * 檢查管理員權限
 * 簡單版本：檢查環境變數中的管理員 Token
 */
const checkAdminAuth = (req, res, next) => {
  // 在單進程模式下，如果請求來自本地（Next.js API route），跳過檢查
  const singleProcessMode = process.env.SINGLE_PROCESS_MODE === "true";
  const isLocalRequest =
    req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";

  if (singleProcessMode && isLocalRequest) {
    console.log("✅ 單進程模式：跳過本地請求的 token 檢查");
    return next();
  }

  // 從請求頭獲取 Authorization token
  const authHeader = req.headers.authorization;

  // 如果沒有設定管理員 Token，允許所有訪問（開發模式）
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    console.warn("⚠️  警告: 未設定 ADMIN_TOKEN，允許所有訪問監控端點");
    return next();
  }

  // 檢查是否提供了 Authorization header
  if (!authHeader) {
    console.log("🚫 拒絕訪問: 缺少 Authorization header");
    return res.status(401).json({
      error: "未授權",
      message: "需要管理員權限才能訪問此端點",
    });
  }

  // 解析 Bearer token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  // 驗證 token
  if (token !== adminToken) {
    console.log("🚫 拒絕訪問: 無效的管理員 token");
    return res.status(403).json({
      error: "禁止訪問",
      message: "無效的管理員憑證",
    });
  }

  console.log("✅ 管理員權限驗證通過");
  next();
};

/**
 * 可選的管理員權限檢查
 * 如果提供了有效的 token，則允許訪問詳細數據
 * 如果沒有提供或 token 無效，則只允許訪問基本數據
 */
const optionalAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const adminToken = process.env.ADMIN_TOKEN;

  // 如果沒有設定管理員 Token，標記為管理員（開發模式）
  if (!adminToken) {
    req.isAdmin = true;
    return next();
  }

  // 檢查是否提供了有效的 token
  if (authHeader) {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (token === adminToken) {
      req.isAdmin = true;
      console.log("✅ 管理員權限驗證通過（可選模式）");
    } else {
      req.isAdmin = false;
      console.log("⚠️  無效的管理員 token（可選模式）");
    }
  } else {
    req.isAdmin = false;
  }

  next();
};

module.exports = {
  checkAdminAuth,
  optionalAdminAuth,
};
