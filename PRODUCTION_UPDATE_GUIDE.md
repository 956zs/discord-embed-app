# 生產環境更新指南

## 更新策略

### 🎯 推薦方式：使用更新腳本

最簡單且安全的方式是使用提供的更新腳本：

```bash
./update.sh
```

這個腳本會自動處理所有更新步驟。

---

## 📋 完整更新流程

### 方法一：自動更新（推薦）

```bash
# 1. 進入專案目錄
cd ~/discord-embed-app

# 2. 執行更新腳本
./update.sh

# 腳本會自動：
# - 拉取最新代碼
# - 更新依賴（可選）
# - 執行資料庫升級（可選）
# - 重新構建前端
# - 重啟所有服務
```

### 方法二：手動更新（完全控制）

#### 步驟 1：備份

```bash
# 備份資料庫
./manage.sh backup

# 備份配置文件
cp .env .env.backup.$(date +%Y%m%d)
cp bot/.env bot/.env.backup.$(date +%Y%m%d)
cp client/.env.local client/.env.local.backup.$(date +%Y%m%d)

# 記錄當前版本
git log -1 --oneline > version.backup.$(date +%Y%m%d).txt
```

#### 步驟 2：拉取最新代碼

```bash
# 查看當前狀態
git status

# 暫存本地修改（如果有）
git stash

# 拉取最新代碼
git pull origin main

# 恢復本地修改（如果需要）
git stash pop
```

#### 步驟 3：檢查變更

```bash
# 查看變更內容
git log --oneline -10

# 查看文件變更
git diff HEAD~5 HEAD

# 檢查是否有資料庫變更
ls -la bot/database/*.sql
```

#### 步驟 4：更新依賴

```bash
# 根目錄依賴
npm install

# Bot 依賴
cd bot && npm install && cd ..

# Client 依賴
cd client && npm install && cd ..
```

#### 步驟 5：資料庫升級（如果需要）

```bash
# 檢查是否有新的資料庫遷移文件
ls -la bot/database/

# 執行升級腳本（如果有）
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/upgrade.sql

# 或執行特定的升級文件
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_new_feature.sql
```

#### 步驟 6：重新構建前端

```bash
# 構建 Next.js
cd client
npm run build
cd ..
```

#### 步驟 7：重啟服務

```bash
# 使用 PM2 重啟
pm2 restart all

# 或使用管理腳本
./manage.sh restart-prod

# 查看狀態
pm2 status
```

#### 步驟 8：驗證

```bash
# 健康檢查
./manage.sh health

# 查看日誌
pm2 logs --lines 50

# 測試 API
curl http://localhost:3008/health

# 測試前端
curl http://localhost:3000
```

---

## 🔄 零停機更新

`update.sh` 腳本已經使用 `pm2 reload` 實現零停機更新：

```bash
# 自動零停機更新
./update.sh

# 腳本會自動：
# 1. 備份資料庫
# 2. 拉取最新代碼
# 3. 更新依賴
# 4. 重新構建前端
# 5. 使用 pm2 reload（零停機）
```

### 手動零停機更新

```bash
# 1. 拉取代碼和更新依賴
git pull
npm install
cd client && npm install && cd ..
cd bot && npm install && cd ..

# 2. 構建前端
cd client && npm run build && cd ..

# 3. 使用 reload 而不是 restart（零停機）
pm2 reload ecosystem.config.js

# 4. 驗證
pm2 status
pm2 logs --lines 20
```

### 藍綠部署（最安全）

```bash
# 1. 在新目錄部署新版本
cd ~
git clone <repo-url> discord-embed-app-new
cd discord-embed-app-new

# 2. 複製配置
cp ~/discord-embed-app/.env .
cp ~/discord-embed-app/bot/.env bot/
cp ~/discord-embed-app/client/.env.local client/

# 3. 安裝和構建
npm install
cd client && npm install && npm run build && cd ..
cd bot && npm install && cd ..

# 4. 使用不同的端口啟動（測試）
# 修改 .env 中的 PORT 和 CLIENT_PORT
PORT=3009 CLIENT_PORT=3001 pm2 start ecosystem.config.js --name discord-new

# 5. 測試新版本
curl http://localhost:3009/health
curl http://localhost:3001

# 6. 如果測試通過，切換
pm2 stop discord-server discord-client
pm2 delete discord-server discord-client
cd ~/discord-embed-app-new
pm2 start ecosystem.config.js
pm2 save

# 7. 更新符號連結（可選）
cd ~
mv discord-embed-app discord-embed-app-old
mv discord-embed-app-new discord-embed-app
```

---

## 🚨 常見更新場景

### 場景 1：只更新代碼（無依賴變更）

```bash
git pull
cd client && npm run build && cd ..
pm2 reload ecosystem.config.js  # 零停機
```

### 場景 2：更新代碼 + 依賴

```bash
git pull
npm install
cd client && npm install && npm run build && cd ..
cd bot && npm install && cd ..
pm2 reload ecosystem.config.js  # 零停機
```

### 場景 3：更新代碼 + 資料庫

```bash
# 1. 備份資料庫
./manage.sh backup

# 2. 更新代碼
git pull

# 3. 執行資料庫遷移
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/upgrade.sql

# 4. 更新依賴和構建
npm install
cd client && npm install && npm run build && cd ..
cd bot && npm install && cd ..

# 5. 重啟（資料庫變更建議用 restart 確保完全重啟）
pm2 restart ecosystem.config.js
```

### 場景 4：緊急回滾

```bash
# 1. 停止服務
pm2 stop all

# 2. 回滾代碼
git log --oneline -10  # 找到要回滾的版本
git reset --hard <commit-hash>

# 3. 還原資料庫（如果需要）
./manage.sh restore backups/discord_stats_YYYYMMDD_HHMMSS.sql.gz

# 4. 重新構建
cd client && npm run build && cd ..

# 5. 重啟
pm2 restart all
```

---

## ✅ 更新檢查清單

### 更新前

- [ ] 備份資料庫
- [ ] 備份配置文件
- [ ] 記錄當前版本
- [ ] 檢查磁碟空間
- [ ] 通知用戶（如果需要）

### 更新中

- [ ] 拉取最新代碼
- [ ] 檢查變更日誌
- [ ] 更新依賴
- [ ] 執行資料庫遷移
- [ ] 重新構建前端
- [ ] 重啟服務

### 更新後

- [ ] 驗證服務狀態
- [ ] 檢查日誌
- [ ] 測試主要功能
- [ ] 監控錯誤
- [ ] 清理舊備份

---

## 📊 監控和驗證

### 檢查服務狀態

```bash
# PM2 狀態
pm2 status

# 詳細信息
pm2 show discord-server
pm2 show discord-client

# 資源使用
pm2 monit
```

### 檢查日誌

```bash
# 所有日誌
pm2 logs

# 最近 100 行
pm2 logs --lines 100

# 只看錯誤
pm2 logs --err

# 特定服務
pm2 logs discord-server
```

### 健康檢查

```bash
# 使用管理腳本
./manage.sh health

# 手動檢查
curl http://localhost:3008/health
curl http://localhost:3000

# 檢查資料庫
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM messages;"
```

---

## 🔧 故障排除

### 問題：更新後服務無法啟動

```bash
# 1. 查看日誌
pm2 logs --err --lines 50

# 2. 檢查配置
cat .env
cat bot/.env
cat client/.env.local

# 3. 檢查依賴
npm list --depth=0
cd client && npm list --depth=0 && cd ..
cd bot && npm list --depth=0 && cd ..

# 4. 重新安裝依賴
rm -rf node_modules client/node_modules bot/node_modules
npm install
cd client && npm install && cd ..
cd bot && npm install && cd ..

# 5. 重新構建
cd client && npm run build && cd ..

# 6. 重啟
pm2 restart all
```

### 問題：前端構建失敗

```bash
# 1. 清除緩存
cd client
rm -rf .next
rm -rf node_modules

# 2. 重新安裝
npm install

# 3. 檢查環境變數
cat .env.local

# 4. 重新構建
npm run build
```

### 問題：資料庫遷移失敗

```bash
# 1. 檢查資料庫連接
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# 2. 查看錯誤
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/upgrade.sql

# 3. 如果需要，回滾資料庫
./manage.sh restore backups/discord_stats_YYYYMMDD_HHMMSS.sql.gz

# 4. 手動執行遷移
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
# 然後逐行執行 SQL
```

---

## 📅 定期維護

### 每週

```bash
# 檢查日誌大小
du -sh logs/

# 清理舊日誌
./manage.sh clean

# 檢查磁碟空間
df -h

# 檢查服務狀態
pm2 status
```

### 每月

```bash
# 備份資料庫
./manage.sh backup

# 更新依賴（謹慎）
npm outdated
npm update

# 檢查安全更新
npm audit
npm audit fix
```

### 每季

```bash
# 清理舊備份（保留最近 10 個）
ls -t backups/*.sql.gz | tail -n +11 | xargs rm -f

# 優化資料庫
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"

# 檢查資料庫大小
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT pg_size_pretty(pg_database_size('discord_stats'));"
```

---

## 🎯 最佳實踐

1. **總是備份**：更新前務必備份資料庫和配置
2. **測試環境**：在測試環境先測試更新
3. **分步執行**：不要一次更新太多東西
4. **監控日誌**：更新後密切監控日誌
5. **準備回滾**：知道如何快速回滾
6. **文檔記錄**：記錄每次更新的內容和問題
7. **低峰時段**：選擇用戶較少的時段更新
8. **通知用戶**：如果有停機時間，提前通知

---

## 📝 更新日誌模板

建議在每次更新後記錄：

```markdown
## 更新記錄 - YYYY-MM-DD

### 版本
- 從：<commit-hash>
- 到：<commit-hash>

### 變更內容
- [ ] 代碼更新
- [ ] 依賴更新
- [ ] 資料庫遷移
- [ ] 配置變更

### 執行步驟
1. 備份資料庫
2. 拉取代碼
3. ...

### 遇到的問題
- 問題描述
- 解決方案

### 驗證結果
- [ ] 服務正常運行
- [ ] 功能測試通過
- [ ] 無錯誤日誌

### 回滾計劃
- 備份位置：backups/discord_stats_YYYYMMDD.sql.gz
- 代碼版本：<commit-hash>
```

---

**記住：安全第一，備份第一！** 🛡️
