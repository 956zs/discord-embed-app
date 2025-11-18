# 監控系統 (Monitoring System)

## 概述

效能監控系統用於收集和追蹤應用程式的系統和應用程式指標。

## 架構

```
server/monitoring/
├── metricsCollector.js   # 指標收集器（核心模組）
├── test-metrics.js       # 測試腳本
└── README.md            # 本文件
```

## MetricsCollector

### 功能

- **系統指標收集**: CPU 使用率、記憶體使用量、事件循環延遲、運行時間
- **應用程式指標**: API 請求數、Discord 事件數、錯誤計數
- **資料庫指標**: 查詢數量、查詢時間、連接池狀態
- **時間序列儲存**: 保留最近 24 小時的歷史數據
- **自動清理**: 定期清理過期數據

### 使用方式

```javascript
const MetricsCollector = require('./monitoring/metricsCollector');

// 創建實例
const collector = new MetricsCollector({
  interval: 30000,        // 收集間隔（毫秒）
  retentionPeriod: 86400000  // 保留期限（毫秒）
});

// 啟動收集
collector.start();

// 記錄指標
collector.incrementCounter('api_requests_total');
collector.recordTiming('api_response_time', 150);

// 獲取當前指標
const current = collector.getCurrentMetrics();

// 獲取歷史指標
const historical = collector.getHistoricalMetrics(startTime, endTime);

// 獲取摘要
const summary = collector.getMetricsSummary();

// 停止收集
collector.stop();
```

### API

#### 建構函數

```javascript
new MetricsCollector(options)
```

**選項**:
- `interval`: 收集間隔（預設: 30000ms）
- `retentionPeriod`: 數據保留期限（預設: 86400000ms = 24 小時）

#### 方法

- `start()`: 啟動指標收集
- `stop()`: 停止指標收集
- `incrementCounter(name, value)`: 增加計數器
- `recordTiming(name, duration)`: 記錄計時
- `recordMetric(category, name, value, tags)`: 記錄自定義指標
- `getCurrentMetrics()`: 獲取當前指標
- `getHistoricalMetrics(startTime, endTime)`: 獲取歷史指標
- `getMetricsSummary()`: 獲取指標摘要
- `getStats()`: 獲取統計資訊

#### 計數器

- `api_requests_total`: API 請求總數
- `api_errors_total`: API 錯誤總數
- `discord_events_total`: Discord 事件總數
- `discord_messages_processed`: 處理的訊息數
- `db_queries_total`: 資料庫查詢總數
- `db_errors_total`: 資料庫錯誤總數

#### 計時器

- `api_response_time`: API 響應時間
- `db_query_time`: 資料庫查詢時間

### 收集的指標

#### 系統指標

```javascript
{
  timestamp: 1705315800000,
  cpu: 25,                    // CPU 使用率 (%)
  memory: {
    used: 512,                // 使用的記憶體 (MB)
    total: 2048,              // 總記憶體 (MB)
    percentage: 25            // 使用率 (%)
  },
  eventLoopDelay: 2.5,        // 事件循環延遲 (ms)
  uptime: 86400               // 運行時間 (秒)
}
```

#### 應用程式指標

```javascript
{
  timestamp: 1705315800000,
  apiRequests: {
    total: 1500,              // 總請求數
    perMinute: 25,            // 每分鐘請求數
    avgResponseTime: 150      // 平均響應時間 (ms)
  },
  discordEvents: {
    total: 3200,              // 總事件數
    messagesProcessed: 2800   // 處理的訊息數
  },
  errors: {
    api: 5,                   // API 錯誤數
    database: 2               // 資料庫錯誤數
  }
}
```

#### 資料庫指標

```javascript
{
  timestamp: 1705315800000,
  queries: {
    total: 2100,              // 總查詢數
    avgTime: 45               // 平均查詢時間 (ms)
  },
  connections: {
    active: 2,                // 活躍連接數
    idle: 8,                  // 閒置連接數
    total: 10                 // 總連接數
  }
}
```

## 測試

執行測試腳本：

```bash
node server/monitoring/test-metrics.js
```

## 效能影響

- **CPU 開銷**: < 1%
- **記憶體開銷**: ~10-20MB（24 小時數據）
- **收集間隔**: 30 秒（可配置）

## 下一步

1. 實作健康檢查服務 (HealthCheckService)
2. 實作告警管理器 (AlertManager)
3. 創建監控中介軟體
4. 實作 API 端點
5. 整合到 server/index.js
