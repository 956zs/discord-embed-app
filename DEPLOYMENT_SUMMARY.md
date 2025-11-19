# 部署摘要

> 快速部署 Discord 統計應用的精簡指南

## 🚀 三步驟快速部署

```bash
# 1. 克隆專案
git clone https://github.com/956zs/discord-embed-app.git
cd discord-embed-app

# 2. 配置環境（互動式）
./setup-env.sh

# 3. 一鍵部署
./deploy.sh
```

完成！服務將運行在：
- API: http://localhost:3008
- 前端: http://localhost:3000

## 📋 前置需求

### 必須準備
- ✅ Node.js 18+
- ✅ PostgreSQL 14+
- ✅ Discord Bot Token
- ✅ Discord Application ID
- ✅ 伺服器 ID

### 如何獲取

**Discord Bot Token**：
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 創建應用 → Bot → Reset Token

**伺服器 ID**：
1. Discord 設定 → 進階 → 開發者模式（開啟）
2. 右鍵伺服器圖標 → 複製伺服器 ID

## 🔧 常用命令

```bash
# 服務管理
./manage.sh start           # 啟動
./manage.sh stop            # 停止
./manage.sh restart         # 重啟
./manage.sh status          # 狀態
./manage.sh logs            # 日誌

# 維護
./manage.sh backup          # 備份
./manage.sh health          # 健康檢查
./update.sh                 # 更新應用

# 進程模式
./manage.sh switch-mode dual    # 雙進程（推薦）
./manage.sh switch-mode single  # 單進程（省資源）
```

## 📊 進程模式選擇

### 雙進程模式（推薦）
- 更好的故障隔離
- 獨立的日誌和監控
- 記憶體: ~350-550MB
- 適合生產環境

### 單進程模式
- 節省 50-100MB 記憶體
- 記憶體: ~300-450MB
- 適合資源受限環境

## 🔒 安全要點

```bash
# 1. 設置文件權限
chmod 600 .env bot/.env client/.env.local

# 2. 配置防火牆
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable

# 3. 使用 HTTPS（生產環境必須）
sudo certbot certonly --standalone -d your-domain.com

# 4. 定期備份
./manage.sh backup
```

## 📈 啟用監控

```bash
# 編輯 .env
nano .env
```

```env
ENABLE_MONITORING=true
ADMIN_TOKEN=your_secure_token
WEBHOOK_ENABLED=true
WEBHOOK_URLS=https://discord.com/api/webhooks/your/webhook
```

```bash
# 重啟服務
./manage.sh restart-prod
```

訪問監控：`/admin/monitoring`

## 🆘 常見問題

### Bot 無法啟動
```bash
# 檢查日誌
pm2 logs discord-server --err

# 檢查 Token
grep DISCORD_BOT_TOKEN bot/.env

# 重啟
./manage.sh restart-prod
```

### 前端無法載入
```bash
# 重新構建
cd client && npm run build && cd ..

# 重啟
./manage.sh restart-prod
```

### 資料庫連接失敗
```bash
# 檢查 PostgreSQL
sudo systemctl status postgresql

# 測試連接
psql -h localhost -U discord_user -d discord_stats
```

## 📚 完整文檔

需要更詳細的說明？查看：

- **[完整部署指南](COMPLETE_DEPLOYMENT_GUIDE.md)** - 詳細的部署流程
- **[快速參考](QUICK_REFERENCE.md)** - 命令速查表
- **[PM2 安全操作](docs/PM2_SAFETY.md)** - 進程管理規範
- **[監控系統](docs/MONITORING.md)** - 監控功能說明
- **[故障排除](TROUBLESHOOTING.md)** - 問題解決方案

## ✅ 部署檢查清單

部署前：
- [ ] 已安裝 Node.js 18+
- [ ] 已安裝 PostgreSQL 14+
- [ ] 已獲取 Discord Bot Token
- [ ] 已獲取 Discord Application ID
- [ ] 已獲取伺服器 ID
- [ ] 已創建資料庫

部署後：
- [ ] 服務正常運行（`pm2 status`）
- [ ] 健康檢查通過（`./manage.sh health`）
- [ ] 可以訪問前端（http://localhost:3000）
- [ ] API 正常響應（http://localhost:3008/health）
- [ ] Bot 已連接到 Discord
- [ ] 資料庫有數據

生產環境：
- [ ] 已配置 HTTPS
- [ ] 已配置防火牆
- [ ] 已設置自動備份
- [ ] 已啟用監控
- [ ] 已配置告警
- [ ] 已設置開機自啟（`pm2 startup`）

## 🎯 下一步

1. **測試功能**：在 Discord 中發送訊息，查看統計
2. **添加管理員**：執行 SQL 添加管理員權限
3. **配置監控**：啟用監控和告警
4. **設置備份**：配置自動備份任務
5. **閱讀文檔**：了解更多功能和配置

---

**需要幫助？** 查看 [完整部署指南](COMPLETE_DEPLOYMENT_GUIDE.md) 或提交 [Issue](https://github.com/956zs/discord-embed-app/issues)。
