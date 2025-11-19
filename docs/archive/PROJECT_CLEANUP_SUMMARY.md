# 專案整理摘要

## 修復內容

### 1. 環境變數

**問題：** 
- `client/next.config.ts` 中有硬編碼值（Discord URL、API URL）
- `ecosystem.config.js` 中有硬編碼值（端口）
- `setup-env.sh` 中的中文字符導致 `.env` 文件編碼問題
- 各文件間環境變數命名不一致

**解決方案：**
- ✅ 更新 `client/next.config.ts` 使用環境變數
- ✅ 更新 `ecosystem.config.js` 從 `.env` 載入並使用 `process.env`
- ✅ 重寫 `setup-env.sh` 使用英文和正確編碼（placeholder + sed）
- ✅ 統一所有 `.env.example` 文件格式
- ✅ 創建完整的 `docs/ENVIRONMENT_VARIABLES.md` 指南

### 2. 配置文件

**修改前：**
```typescript
// client/next.config.ts - 硬編碼
allowedDevOrigins: [
  "https://1401130025411018772.discordsays.com",
],
async rewrites() {
  return [{
    destination: 'http://localhost:3008/api/:path*',
  }];
}
```

**修改後：**
```typescript
// client/next.config.ts - 動態配置
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';
const DISCORD_ORIGIN = `https://${DISCORD_CLIENT_ID}.discordsays.com`;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';

allowedDevOrigins: DISCORD_CLIENT_ID ? [DISCORD_ORIGIN] : [],
async rewrites() {
  return [{
    destination: `${API_URL}/api/:path*`,
  }];
}
```

**修改前：**
```javascript
// ecosystem.config.js - 硬編碼
env: {
  NODE_ENV: "production",
  PORT: 3008,
}
args: "start -p 3000",
```

**修改後：**
```javascript
// ecosystem.config.js - 動態配置
require('dotenv').config();

env: {
  NODE_ENV: "production",
  PORT: process.env.PORT || 3008,
}
args: `start -p ${process.env.CLIENT_PORT || 3000}`,
```

### 3. 設置腳本

**問題：**
- 中文字符直接寫入 `.env` 文件
- 在某些系統上造成編碼問題
- 文件難以閱讀和編輯

**解決方案：**
- 使用 heredoc 配合 placeholder
- 用 `sed` 命令替換 placeholder
- 所有註釋和結構使用英文
- 正確的編碼處理

### 4. 文檔結構

**新增：**
- `docs/ENVIRONMENT_VARIABLES.md` - 完整的環境變數指南
- `cleanup-project.sh` - 互動式整理腳本
- `PROJECT_CLEANUP_SUMMARY.md` - 本文件

**改進：**
- `.env.example` - 更清晰的結構和英文註釋
- `bot/.env.example` - 統一格式
- `client/.env.example` - 更好的文檔說明

## 文件變更

### 修改的文件

1. **client/next.config.ts**
   - 現在使用 `NEXT_PUBLIC_DISCORD_CLIENT_ID` 生成 Discord origin
   - 現在使用 `NEXT_PUBLIC_API_URL` 進行 API rewrites
   - 基於環境變數的動態 CORS 標頭

2. **ecosystem.config.js**
   - 使用 `dotenv` 載入 `.env` 文件
   - 使用 `process.env.PORT` 和 `process.env.CLIENT_PORT`
   - 不再有硬編碼值

3. **setup-env.sh**
   - 完全用英文重寫
   - 使用 placeholder + sed 方式
   - 無中文字符編碼問題
   - 更好的錯誤處理和驗證

4. **.env.example**
   - 更清晰的結構
   - 英文註釋
   - 更好的組織

5. **bot/.env.example**
   - 與根目錄 `.env.example` 一致
   - 清晰的文檔說明

6. **client/.env.example**
   - 擴展了所有變數
   - 更好的描述
   - 開發和生產環境示例

### 新增的文件

1. **docs/ENVIRONMENT_VARIABLES.md**
   - 所有環境變數的完整指南
   - 開發和生產環境配置示例
   - 故障排除章節
   - 安全最佳實踐

2. **cleanup-project.sh**
   - 互動式專案整理腳本
   - 歸檔舊文檔
   - 清理日誌和測試文件
   - 驗證配置

3. **PROJECT_CLEANUP_SUMMARY.md**
   - 本文件
   - 記錄所有變更
   - 遷移指南

## 環境變數參考

### 根目錄 `.env`

```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
PORT=3008
CLIENT_PORT=3000
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=development
```

### Bot `bot/.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=postgres
DB_PASSWORD=your_password
DISCORD_BOT_TOKEN=your_bot_token
ALLOWED_GUILD_IDS=server_id_1,server_id_2
NODE_ENV=development
```

### Client `client/.env.local`

```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_API_URL=http://localhost:3008
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_GUILD_ID=your_test_server_id
NEXT_PUBLIC_DEV_USER_ID=your_user_id
NODE_ENV=development
```

## 遷移指南

### 現有安裝

如果你已經在運行專案：

1. **備份當前配置：**
   ```bash
   cp .env .env.backup
   cp bot/.env bot/.env.backup
   cp client/.env.local client/.env.local.backup
   ```

2. **更新配置文件：**
   ```bash
   # 拉取最新變更
   git pull
   
   # 或手動更新：
   # - client/next.config.ts
   # - ecosystem.config.js
   # - setup-env.sh
   ```

3. **驗證環境變數：**
   ```bash
   # 檢查所有必需變數是否已設置
   cat .env
   cat bot/.env
   cat client/.env.local
   ```

4. **重新構建並重啟：**
   ```bash
   # 重新構建前端
   cd client && npm run build && cd ..
   
   # 重啟服務
   pm2 restart all
   # 或
   ./manage.sh restart-prod
   ```

### 新安裝

1. **克隆倉庫：**
   ```bash
   git clone <repository-url>
   cd discord-embed-app
   ```

2. **執行設置腳本：**
   ```bash
   ./setup-env.sh
   ```

3. **按照引導設置** - 它會創建所有必要的 `.env` 文件

4. **部署：**
   ```bash
   ./deploy.sh
   ```

## 測試

### 驗證配置

1. **檢查環境文件是否存在：**
   ```bash
   ls -la .env bot/.env client/.env.local
   ```

2. **驗證沒有硬編碼值：**
   ```bash
   # 不應該找到硬編碼的 Discord URL
   grep -n "1401130025411018772" client/next.config.ts
   
   # 不應該找到硬編碼的端口
   grep -n "PORT: 3008" ecosystem.config.js
   ```

3. **測試環境變數載入：**
   ```bash
   # 啟動服務
   npm run dev
   
   # 檢查是否使用正確的值
   curl http://localhost:${PORT}/health
   curl http://localhost:${CLIENT_PORT}
   ```

### 驗證 Next.js 配置

```bash
# 構建應該成功且無錯誤
cd client
npm run build

# 檢查構建輸出中的正確 API URL
# 應該顯示你的 NEXT_PUBLIC_API_URL 值
```

### 驗證 PM2 配置

```bash
# 使用 PM2 啟動
pm2 start ecosystem.config.js

# 檢查環境變數
pm2 env 0  # 檢查第一個進程

# 應該顯示正確的 PORT 和 CLIENT_PORT
```

## 故障排除

### 問題："找不到環境變數"

**解決方案：**
1. 檢查 `.env` 文件是否存在
2. 驗證變數名稱完全匹配
3. 修改 `.env` 後重啟服務

### 問題："仍然看到硬編碼值"

**解決方案：**
1. 清除 Next.js 緩存：`rm -rf client/.next`
2. 重新構建：`cd client && npm run build`
3. 重啟 PM2：`pm2 restart all`

### 問題：".env 文件中有中文字符"

**解決方案：**
1. 刪除當前的 `.env` 文件
2. 重新執行 `./setup-env.sh`
3. 或手動從 `.env.example` 複製並編輯

### 問題："PM2 未載入環境變數"

**解決方案：**
1. 確保已安裝 `dotenv`：`npm install dotenv`
2. 檢查 `ecosystem.config.js` 有 `require('dotenv').config()`
3. 重新啟動：`pm2 delete all && pm2 start ecosystem.config.js`

## 優勢

### 1. 靈活性
- 無需修改代碼即可更改 Discord 應用
- 簡單的端口配置
- 環境特定的設置

### 2. 安全性
- 代碼中沒有機密信息
- 開發和生產環境可使用不同的 token
- `.env` 文件在 `.gitignore` 中

### 3. 可維護性
- 清晰的配置結構
- 有文檔記錄的環境變數
- 所有組件保持一致

### 4. 部署
- 所有環境使用相同代碼
- 僅通過 `.env` 文件配置
- 不同部署無需修改代碼

## 腳本參考

### 設置和配置

```bash
# 互動式環境設置
./setup-env.sh

# 專案清理和整理
./cleanup-project.sh
```

### 部署

```bash
# 一鍵部署
./deploy.sh

# 快速更新（拉取 + 重新構建 + 重啟）
./update.sh
```

### 管理

```bash
# 啟動服務
./manage.sh start

# 停止服務
./manage.sh stop

# 重啟服務
./manage.sh restart

# 重啟並重新載入配置
./manage.sh restart-prod

# 查看狀態
./manage.sh status

# 查看日誌
./manage.sh logs

# 健康檢查
./manage.sh health

# 備份資料庫
./manage.sh backup

# 還原資料庫
./manage.sh restore <backup_file>

# 清理日誌
./manage.sh clean
```

## 下一步

1. **查看變更：**
   ```bash
   git status
   git diff
   ```

2. **測試配置：**
   ```bash
   ./setup-env.sh  # 如果還沒執行
   npm run dev     # 在開發環境測試
   ```

3. **更新生產環境：**
   ```bash
   ./deploy.sh     # 部署到生產環境
   ```

4. **閱讀文檔：**
   - `docs/ENVIRONMENT_VARIABLES.md` - 環境變數指南
   - `README.md` - 專案概覽
   - `SETUP.md` - 設置說明

## 其他資源

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Next.js 環境變數](https://nextjs.org/docs/basic-features/environment-variables)
- [PM2 文檔](https://pm2.keymetrics.io/docs/usage/environment/)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)

## 支援

如果遇到問題：

1. 查看 `docs/ENVIRONMENT_VARIABLES.md` 獲取詳細配置指南
2. 執行 `./cleanup-project.sh` 驗證並修復常見問題
3. 查看日誌：`pm2 logs` 或 `./manage.sh logs`
4. 查看本文檔的遷移步驟

---

**最後更新：** $(date)
**版本：** 2.0（環境變數重構）
