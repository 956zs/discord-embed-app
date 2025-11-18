# setup-env.sh 更新說明

## 更新內容

已更新 `setup-env.sh` 腳本，新增監控系統和 Webhook 通知配置。

## 新增功能

### 步驟 5/6: 監控配置（可選）

新增互動式監控系統配置，包含：

1. **啟用/停用監控**
   - 詢問是否啟用效能監控系統
   - 預設為停用

2. **管理員令牌**
   - 用於訪問監控端點的安全令牌
   - 可選擇自動生成（使用 openssl 或 urandom）
   - 或手動輸入自訂令牌

3. **Webhook 通知（可選）**
   - 配置 Discord Webhook URL
   - 支援多個 URL（逗號分隔）
   - 用於發送 ERROR 級別告警

4. **告警閾值**
   - CPU 警告閾值（預設 80%）
   - CPU 錯誤閾值（預設 90%）
   - 記憶體警告閾值（預設 80%）
   - 記憶體錯誤閾值（預設 90%）

## 生成的環境變數

在 `.env` 文件中新增：

```bash
# 監控配置
ENABLE_MONITORING=true/false
METRICS_INTERVAL=30000
METRICS_RETENTION_HOURS=24
ALERT_CPU_WARN=80
ALERT_CPU_ERROR=90
ALERT_MEMORY_WARN=80
ALERT_MEMORY_ERROR=90
ADMIN_TOKEN=your_admin_token

# Webhook 通知
WEBHOOK_ENABLED=true/false
WEBHOOK_URLS=https://discord.com/api/webhooks/xxx/yyy
```

## 使用方式

```bash
./setup-env.sh
```

腳本會引導您完成所有配置步驟，包括新增的監控配置。

## 配置摘要

完成配置後，腳本會顯示完整的配置摘要，包括：
- 監控系統狀態
- 管理員令牌（僅顯示前 8 個字元）
- Webhook 通知狀態

## 向後兼容

- 監控配置為可選步驟
- 如果選擇不啟用，會使用預設值（停用）
- 不影響現有的配置流程
