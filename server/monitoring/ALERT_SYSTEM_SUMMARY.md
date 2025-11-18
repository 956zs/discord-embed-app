# 告警系統實作總結

## 已完成的功能

### 1. AlertManager 類別 (alertManager.js)

核心告警管理系統，提供以下功能：

- ✅ **閾值配置和檢查**：支援 CPU、記憶體、事件循環延遲、API 響應時間、資料庫查詢時間的閾值監控
- ✅ **告警觸發和記錄**：自動觸發告警並記錄到歷史
- ✅ **告警去重機制**：防止相同告警在短時間內重複觸發
- ✅ **冷卻期機制**：5 分鐘冷卻期，避免告警風暴
- ✅ **告警歷史查詢**：支援按級別、狀態、數量過濾
- ✅ **Webhook 整合介面**：預留 Webhook 通知器介面（待後續實作）

**預設閾值：**
```javascript
{
  cpu: { warn: 80, error: 90 },
  memory: { warn: 80, error: 90 },
  eventLoopDelay: { warn: 100, error: 500 },
  apiResponseTime: { warn: 1000, error: 3000 },
  dbQueryTime: { warn: 500, error: 2000 }
}
```

### 2. MetricsCollector 整合

- ✅ **告警管理器連接**：新增 `setAlertManager()` 方法
- ✅ **自動告警檢查**：每次收集指標時自動檢查閾值
- ✅ **慢速查詢告警**：資料庫查詢超過 500ms 觸發 WARN，超過 2000ms 觸發 ERROR
- ✅ **資料庫錯誤告警**：查詢失敗時自動觸發 ERROR 告警

### 3. 監控中介軟體 (monitoring.js)

- ✅ **請求追蹤**：自動記錄所有 API 請求
- ✅ **響應時間測量**：測量每個請求的響應時間
- ✅ **慢速請求告警**：請求超過 1 秒觸發 WARN，超過 3 秒觸發 ERROR
- ✅ **錯誤追蹤**：自動記錄 4xx 和 5xx 錯誤

### 4. 單元測試 (test-alert-manager.js)

完整的測試套件，涵蓋：

- ✅ 閾值檢查邏輯（CPU、記憶體）
- ✅ 告警去重機制
- ✅ 冷卻期功能
- ✅ 告警歷史查詢（按級別、狀態、數量過濾）
- ✅ 告警解決功能

**測試結果：所有測試通過 ✅**

## 使用方式

### 初始化告警系統

```javascript
const MetricsCollector = require('./monitoring/metricsCollector');
const AlertManager = require('./monitoring/alertManager');
const createMonitoringMiddleware = require('./middleware/monitoring');

// 創建實例
const metricsCollector = new MetricsCollector();
const alertManager = new AlertManager({
  thresholds: {
    cpu: { warn: 80, error: 90 },
    memory: { warn: 80, error: 90 }
  },
  cooldownPeriod: 300000 // 5 分鐘
});

// 連接告警管理器到指標收集器
metricsCollector.setAlertManager(alertManager);

// 設定資料庫連接池（自動包裝查詢以追蹤慢速查詢）
metricsCollector.setDatabasePool(pool);

// 啟動指標收集（自動檢查告警）
metricsCollector.start();

// 添加監控中介軟體到 Express
app.use(createMonitoringMiddleware(metricsCollector, alertManager));
```

### 查詢告警歷史

```javascript
// 獲取所有告警
const allAlerts = alertManager.getAlertHistory();

// 獲取 ERROR 級別告警
const errorAlerts = alertManager.getAlertHistory({ level: 'ERROR' });

// 獲取最近 50 條告警
const recentAlerts = alertManager.getAlertHistory({ limit: 50 });

// 獲取活躍告警
const activeAlerts = alertManager.getAlertHistory({ status: 'active' });
```

### 手動觸發告警

```javascript
alertManager.triggerAlert(
  'WARN',
  '自定義告警訊息',
  { customData: 'value' },
  'unique_alert_key'
);
```

## 告警級別

- **ERROR** 🚨：嚴重問題，需要立即處理（紅色）
- **WARN** ⚠️：警告，需要關注（橘色）
- **INFO** ℹ️：資訊性告警（藍色）

## 日誌格式

告警會自動記錄到控制台，格式如下：

```
🚨 [ERROR] CPU 使用率超過 90% { metric: 'cpu', value: 95, threshold: 90 }
⚠️ [WARN] 慢速請求: GET /api/stats { method: 'GET', path: '/api/stats', duration: 1500 }
```

## 下一步

待實作的功能（階段 2）：

- [ ] Webhook 通知器實作
- [ ] Discord Webhook 整合
- [ ] 告警 API 端點
- [ ] 前端告警列表組件

## 測試

執行單元測試：

```bash
node server/monitoring/test-alert-manager.js
```

## 相關文件

- `server/monitoring/alertManager.js` - 告警管理器核心類別
- `server/monitoring/metricsCollector.js` - 指標收集器（含告警整合）
- `server/middleware/monitoring.js` - Express 監控中介軟體
- `server/monitoring/test-alert-manager.js` - 單元測試
