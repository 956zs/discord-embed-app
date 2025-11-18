# Webhook 通知使用指南

## 概述

Webhook 通知功能允許系統在發生 ERROR 級別告警時，自動發送通知到 Discord 頻道。

## 配置步驟

### 1. 獲取 Discord Webhook URL

1. 在 Discord 伺服器中，進入頻道設定
2. 選擇「整合」→「Webhook」
3. 點擊「新增 Webhook」
4. 自訂 Webhook 名稱和頭像（可選）
5. 複製 Webhook URL

### 2. 配置環境變數

在 `.env` 文件中添加：

```bash
# 啟用 Webhook 通知
WEBHOOK_ENABLED=true

# 單一 Webhook URL
WEBHOOK_URLS=https://discord.com/api/webhooks/123456789/abcdefghijklmnop

# 多個 Webhook URL（用逗號分隔）
WEBHOOK_URLS=https://discord.com/api/webhooks/xxx/yyy,https://discord.com/api/webhooks/zzz/www
```

### 3. 重啟服務

```bash
./manage.sh restart
```

## 測試 Webhook

### 方法 1: 使用測試腳本

```bash
cd server/monitoring
node test-webhook.js
```

### 方法 2: 使用 API 端點

```bash
curl -X POST "http://localhost:3008/api/metrics/webhook/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "level": "WARN",
    "message": "測試告警",
    "details": {"test": true}
  }'
```


## Webhook 通知格式

當系統發生 ERROR 級別告警時，Discord 頻道會收到以下格式的訊息：

```
🚨 系統告警 - ERROR

CPU 使用率超過 90%

時間: 2024-01-15 18:30:00
級別: ERROR
詳細資訊:
{
  "cpu": 92.5,
  "threshold": 90,
  "metric": "cpu"
}
```

## 告警級別

- **ERROR** (紅色): 嚴重問題，會觸發 Webhook 通知
- **WARN** (橘色): 警告，僅記錄到日誌
- **INFO** (藍色): 資訊性告警，僅記錄到日誌

## 速率限制

- 相同告警訊息在 5 分鐘內只會發送一次
- 避免告警風暴，保護 Discord Webhook 配額

## 重試機制

- 發送失敗時會自動重試最多 3 次
- 使用指數退避延遲（1s, 2s, 4s）

## 故障排除

### Webhook 未發送

1. 檢查 `WEBHOOK_ENABLED=true`
2. 檢查 `WEBHOOK_URLS` 是否正確配置
3. 檢查 Discord Webhook URL 是否有效
4. 查看伺服器日誌中的錯誤訊息

### Webhook 發送失敗

1. 驗證 Webhook URL 是否正確
2. 檢查 Discord 伺服器是否可訪問
3. 確認 Webhook 未被刪除或停用
4. 檢查網路連接

## API 端點

### POST /api/metrics/webhook/test

測試 Webhook 通知（需要管理員權限）

**Request:**
```json
{
  "level": "WARN",
  "message": "測試訊息",
  "details": {"test": true}
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "sent": 2,
    "failed": 0,
    "skipped": 0
  },
  "webhookCount": 2,
  "message": "成功發送 2 個 Webhook 通知",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
