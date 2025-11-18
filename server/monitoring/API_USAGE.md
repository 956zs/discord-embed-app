# 監控 API 使用指南

## 啟用監控系統

在 `.env` 文件中設定：

```bash
ENABLE_MONITORING=true
ADMIN_TOKEN=your-secure-token-here
```

## API 端點

### 1. GET /api/metrics

獲取效能指標數據

**權限**: 需要管理員 Token

**查詢參數**:
- `period`: 時間範圍 (1h, 6h, 24h) - 預設 1h
- `category`: 指標類別 (system, application, database, all) - 預設 all

**範例**:
```bash
# 獲取所有類別的指標（最近 1 小時）
curl -H "Authorization: Bearer your-token" http://localhost:3008/api/metrics

# 獲取系統指標（最近 6 小時）
curl -H "Authorization: Bearer your-token" http://localhost:3008/api/metrics?period=6h&category=system
```

**回應格式**:
```json
{
  "period": "1h",
  "timeRange": {
    "start": "2024-01-15T09:00:00.000Z",
    "end": "2024-01-15T10:00:00.000Z"
  },
  "current": {
    "system": { "cpu": 25.5, "memory": { "used": 512 } },
    "application": { "apiRequests": { "total": 1500 } },
    "database": { "queries": { "total": 2100 } }
  },
  "historical": { ... },
  "summary": { ... }
}
```

### 2. GET /api/metrics/alerts

獲取告警歷史

**權限**: 需要管理員 Token

**查詢參數**:
- `limit`: 返回數量 - 預設 100
- `level`: 告警級別過濾 (ERROR, WARN, INFO)
- `status`: 狀態過濾 (active, resolved)

**範例**:
```bash
# 獲取所有告警
curl -H "Authorization: Bearer your-token" http://localhost:3008/api/metrics/alerts

# 獲取最近 10 個 ERROR 級別的告警
curl -H "Authorization: Bearer your-token" http://localhost:3008/api/metrics/alerts?level=ERROR&limit=10
```

**回應格式**:
```json
{
  "alerts": [
    {
      "id": 1,
      "level": "ERROR",
      "message": "CPU 使用率超過 90%",
      "details": { "cpu": 92.5 },
      "triggeredAt": "2024-01-15T10:30:00.000Z",
      "status": "active"
    }
  ],
  "total": 1,
  "stats": { ... }
}
```

### 3. GET /api/metrics/summary

獲取監控系統摘要資訊

**權限**: 需要管理員 Token

**範例**:
```bash
curl -H "Authorization: Bearer your-token" http://localhost:3008/api/metrics/summary
```

## 測試

執行整合測試：

```bash
node server/monitoring/test-metrics-api.js
```
