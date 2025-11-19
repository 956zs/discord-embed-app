# 監控系統文檔

## 目錄

- [概述](#概述)
- [功能特性](#功能特性)
- [進程模式](#進程模式)
- [快速開始](#快速開始)
- [監控指標](#監控指標)
- [告警系統](#告警系統)
- [Webhook 通知](#webhook-通知)
- [API 端點](#api-端點)
- [前端監控頁面](#前端監控頁面)
- [配置說明](#配置說明)
- [故障排除](#故障排除)

## 概述

Discord 統計系統的效能監控模組提供全面的系統可觀測性，包括：

- **即時效能指標收集**：CPU、記憶體、事件循環延遲
- **應用程式指標追蹤**：API 請求、Discord 事件、資料庫查詢
- **健康檢查服務**：資料庫、Discord Bot、系統資源狀態
- **告警系統**：自動檢測異常並記錄告警
- **Webhook 通知**：透過 Discord Webhook 發送錯誤通知
- **視覺化儀表板**：管理員監控頁面，即時圖表和告警列表
- **進程模式切換**：支援雙進程和單進程部署模式

## 功能特性

### 1. 效能指標收集

系統每 30 秒自動收集以下指標：

**系統指標**：
- CPU 使用率 (%)
- 記憶體使用量 (MB) 和使用率 (%)
- 事件循環延遲 (ms)
- 進程運行時間

**應用程式指標**：
- API 請求總數和每分鐘請求數
- 平均響應時間
- API 錯誤總數
- Discord 事件總數和處理的訊息數

**資料庫指標**：
- 查詢總數和平均查詢時間
- 活躍和閒置連接數
- 資料庫錯誤總數

### 2. 健康檢查

提供詳細的健康檢查端點，驗證：

- 資料庫連接狀態和連接池資訊
- Discord Bot WebSocket 連接狀態和延遲
- 系統資源使用情況

### 3. 告警系統

自動監控指標閾值並觸發告警：
- CPU 使用率超過 80% (警告) 或 90% (錯誤)
- 記憶體使用率超過 80% (警告) 或 90% (錯誤)
- 事件循環延遲超過 100ms (警告) 或 500ms (錯誤)
- API 響應時間超過 1 秒 (警告) 或 3 秒 (錯誤)
- 資料庫查詢時間超過 500ms (警告) 或 2 秒 (錯誤)

告警具有以下特性：
- **去重機制**：相同告警 5 分鐘內只觸發一次
- **級別分類**：ERROR、WARN、INFO
- **歷史記錄**：所有告警都會記錄到資料庫

### 4. Webhook 通知

當發生 ERROR 級別告警時，自動發送 Discord Webhook 通知：
- 支援多個 Webhook URL
- 速率限制（相同錯誤 5 分鐘內只發送一次）
- 重試機制（最多 3 次）
- 格式化的 Discord Embed 訊息，包含顏色編碼

### 5. 視覺化儀表板

管理員監控頁面提供：
- 健康狀態卡片（整體狀態和各服務狀態）
- 即時效能圖表（CPU、記憶體、API 請求、事件循環延遲）
- 告警列表（支援級別過濾）
- 進程資訊（模式、運行時間、重啟次數）
- 自動更新（30 秒間隔）

## 進程模式

系統支援兩種部署模式，可根據需求選擇：

### 雙進程模式（預設，推薦）

**架構**：
```
PM2 Process 1: discord-server (Express API + Discord Bot)
PM2 Process 2: discord-client (Next.js)
```

**優點**：
- ✅ 故障隔離：Client 或 Server 崩潰不會影響對方
- ✅ 獨立擴展：可以根據負載獨立調整實例數
- ✅ 清晰的責任分離
- ✅ 更容易除錯和監控
- ✅ 可以獨立重啟 Client 或 Server

**資源使用**：~350-550MB

**適用場景**：
- 生產環境（推薦）
- 需要高可用性
- 資源充足的伺服器

### 單進程模式

**架構**：
```
PM2 Process: discord-app (Express API + Discord Bot + Next.js)
```

**優點**：
- ✅ 單一進程管理
- ✅ 減少資源開銷（節省約 50-100MB）
- ✅ 簡化部署
- ✅ 適合資源受限環境

**缺點**：
- ❌ 單點故障：任何崩潰都會影響整個應用
- ❌ 無法獨立重啟 Client 或 Server
- ❌ 更難除錯

**資源使用**：~300-450MB

**適用場景**：
- 資源受限的伺服器（< 1GB RAM）
- 開發/測試環境
- 低流量應用

### 模式切換

使用管理腳本切換進程模式：

```bash
# 切換到單進程模式
./manage.sh switch-mode single

# 切換到雙進程模式
./manage.sh switch-mode dual

# 查看當前模式
pm2 status
```

## 快速開始

### 1. 啟用監控

在 `.env` 中設定：

```bash
# 啟用監控系統
ENABLE_MONITORING=true

# 設定管理員 Token（用於訪問監控端點）
ADMIN_TOKEN=your_secure_token_here
```

### 2. 配置告警閾值（可選）

```bash
# CPU 告警閾值
ALERT_CPU_WARN=80
ALERT_CPU_ERROR=90

# 記憶體告警閾值
ALERT_MEMORY_WARN=80
ALERT_MEMORY_ERROR=90
```

### 3. 配置 Webhook 通知（可選）

```bash
# 啟用 Webhook 通知
WEBHOOK_ENABLED=true

# Discord Webhook URLs（多個用逗號分隔）
WEBHOOK_URLS=https://discord.com/api/webhooks/xxx/yyy,https://discord.com/api/webhooks/zzz/www
```

### 4. 啟動服務

```bash
# 使用管理腳本啟動
./manage.sh start

# 或使用 PM2 直接啟動
pm2 start ecosystem.config.js
pm2 save
```

### 5. 訪問監控頁面

在 Discord Embedded App 中，以管理員身份訪問：
```
/admin/monitoring
```

## 監控指標

### 系統指標

| 指標名稱 | 說明 | 單位 | 告警閾值 |
|---------|------|------|---------|
| `cpu_usage` | CPU 使用率 | % | 警告: 80%, 錯誤: 90% |
| `memory_usage` | 記憶體使用量 | MB | - |
| `memory_percentage` | 記憶體使用率 | % | 警告: 80%, 錯誤: 90% |
| `event_loop_delay` | 事件循環延遲 | ms | 警告: 100ms, 錯誤: 500ms |
| `uptime` | 運行時間 | 秒 | - |

### 應用程式指標

| 指標名稱 | 說明 | 單位 | 告警閾值 |
|---------|------|------|---------|
| `api_requests_total` | API 請求總數 | 次 | - |
| `api_requests_per_minute` | 每分鐘 API 請求數 | 次/分 | - |
| `api_response_time_avg` | 平均響應時間 | ms | 警告: 1000ms, 錯誤: 3000ms |
| `api_errors_total` | API 錯誤總數 | 次 | - |
| `discord_events_total` | Discord 事件總數 | 次 | - |
| `discord_messages_processed` | 處理的訊息數 | 次 | - |

### 資料庫指標

| 指標名稱 | 說明 | 單位 | 告警閾值 |
|---------|------|------|---------|
| `db_queries_total` | 資料庫查詢總數 | 次 | - |
| `db_query_time_avg` | 平均查詢時間 | ms | 警告: 500ms, 錯誤: 2000ms |
| `db_connections_active` | 活躍連接數 | 個 | - |
| `db_connections_idle` | 閒置連接數 | 個 | - |
| `db_errors_total` | 資料庫錯誤總數 | 次 | - |

## 告警系統

### 告警級別

- **ERROR**：嚴重問題，需要立即處理（會觸發 Webhook 通知）
- **WARN**：警告，需要關注
- **INFO**：資訊性告警

### 告警觸發條件

系統會在以下情況觸發告警：

1. **CPU 使用率過高**
   - WARN: CPU > 80%
   - ERROR: CPU > 90%

2. **記憶體使用率過高**
   - WARN: 記憶體 > 80%
   - ERROR: 記憶體 > 90%

3. **事件循環延遲過高**
   - WARN: 延遲 > 100ms
   - ERROR: 延遲 > 500ms

4. **慢速 API 請求**
   - WARN: 響應時間 > 1 秒
   - ERROR: 響應時間 > 3 秒

5. **慢速資料庫查詢**
   - WARN: 查詢時間 > 500ms
   - ERROR: 查詢時間 > 2 秒

6. **服務不可用**
   - ERROR: 資料庫連接失敗
   - ERROR: Discord Bot 斷線

### 告警去重

相同告警在 5 分鐘內只會觸發一次，避免告警風暴。

## Webhook 通知

### 設定 Discord Webhook

1. 在 Discord 伺服器中，進入頻道設定
2. 選擇「整合」→「Webhook」
3. 點擊「新增 Webhook」
4. 自訂 Webhook 名稱和頭像（可選）
5. 複製 Webhook URL
6. 將 URL 添加到 `.env` 的 `WEBHOOK_URLS`

### Webhook 訊息格式

當觸發 ERROR 級別告警時，會發送以下格式的訊息：

```
🚨 系統告警 - ERROR

CPU 使用率超過 90%

時間: 2024-01-15 18:30:00
詳細資訊:
{
  "cpu": 92.5,
  "threshold": 90,
  "duration": "5 minutes"
}
```

訊息使用顏色編碼：
- ERROR: 紅色 (0xFF0000)
- WARN: 橘色 (0xFFA500)
- INFO: 藍色 (0x0099FF)

### 測試 Webhook

使用 API 端點測試 Webhook 配置：

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

## API 端點

所有監控 API 端點都需要管理員權限驗證。

### 1. GET /health

健康檢查端點（公開，無需驗證）

**回應範例**：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 5,
      "connections": {
        "total": 10,
        "active": 2,
        "idle": 8
      }
    },
    "discordBot": {
      "status": "healthy",
      "websocket": "connected",
      "guilds": 5,
      "latency": 45
    },
    "system": {
      "cpu": 25.5,
      "memory": {
        "used": 512,
        "total": 2048,
        "percentage": 25
      },
      "eventLoopDelay": 2.5
    }
  }
}
```

### 2. GET /api/metrics

獲取效能指標（需要管理員權限）

**請求標頭**：
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**查詢參數**：
- `period`: 時間範圍 (1h, 6h, 24h) - 預設 1h
- `category`: 指標類別 (system, application, database, all) - 預設 all

**範例**：
```bash
curl "http://localhost:3008/api/metrics?period=6h&category=system" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**回應範例**：
```json
{
  "current": {
    "system": {
      "cpu": 25.5,
      "memory": {
        "used": 512,
        "percentage": 25
      }
    }
  },
  "historical": [
    {
      "timestamp": 1705315800000,
      "cpu": 25.5,
      "memory": 512
    }
  ],
  "summary": {
    "avgCpu": 25.5,
    "avgMemory": 512,
    "totalApiRequests": 1500
  }
}
```

### 3. GET /api/metrics/alerts

獲取告警歷史（需要管理員權限）

**請求標頭**：
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**查詢參數**：
- `limit`: 返回數量 - 預設 100
- `level`: 告警級別過濾 (ERROR, WARN, INFO)
- `status`: 狀態過濾 (active, resolved)

**範例**：
```bash
curl "http://localhost:3008/api/metrics/alerts?limit=50&level=ERROR" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**回應範例**：
```json
{
  "alerts": [
    {
      "id": 1,
      "level": "ERROR",
      "message": "CPU 使用率超過 90%",
      "details": {
        "cpu": 92.5,
        "threshold": 90
      },
      "triggeredAt": "2024-01-15T10:30:00.000Z",
      "status": "active"
    }
  ],
  "total": 1
}
```

### 4. POST /api/metrics/webhook/test

測試 Webhook 通知（需要管理員權限）

**請求標頭**：
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**請求體**：
```json
{
  "level": "WARN",
  "message": "測試告警",
  "details": {
    "test": true
  }
}
```

**範例**：
```bash
curl -X POST "http://localhost:3008/api/metrics/webhook/test" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"WARN","message":"測試告警","details":{"test":true}}'
```

**回應範例**：
```json
{
  "success": true,
  "sent": 2,
  "failed": 0
}
```

## 前端監控頁面

### 訪問方式

在 Discord Embedded App 中，以管理員身份訪問：
```
/admin/monitoring
```

### 頁面功能

1. **健康狀態卡片**
   - 顯示整體健康狀態（healthy/degraded/unhealthy）
   - 顯示各服務狀態（資料庫、Bot、系統）
   - 使用顏色編碼（綠色/黃色/紅色）

2. **效能圖表**
   - CPU 使用率折線圖
   - 記憶體使用量折線圖
   - API 請求數折線圖
   - 事件循環延遲折線圖
   - 支援時間範圍切換（1h/6h/24h）

3. **告警列表**
   - 顯示最近的告警
   - 支援級別過濾（ERROR/WARN/INFO）
   - 顯示告警時間和詳細資訊

4. **進程資訊**
   - 顯示進程模式（雙進程/單進程）
   - 顯示運行時間和重啟次數
   - 顯示 PID 和記憶體使用

5. **自動更新**
   - 每 30 秒自動更新數據
   - 提供手動重新整理按鈕

## 配置說明

### 環境變數

在 `.env` 中配置監控系統：

```bash
# ============================================================================
# 監控配置
# ============================================================================

# 啟用監控系統
ENABLE_MONITORING=true

# 指標收集間隔（毫秒）
METRICS_INTERVAL=30000

# 指標保留時間（小時）
METRICS_RETENTION_HOURS=24

# 告警閾值
ALERT_CPU_WARN=80
ALERT_CPU_ERROR=90
ALERT_MEMORY_WARN=80
ALERT_MEMORY_ERROR=90

# 管理員 Token（用於訪問監控端點）
ADMIN_TOKEN=your_secure_token_here

# ============================================================================
# Webhook 通知配置
# ============================================================================

# 啟用 Webhook 通知
WEBHOOK_ENABLED=true

# Discord Webhook URLs（多個用逗號分隔）
WEBHOOK_URLS=https://discord.com/api/webhooks/xxx/yyy
```

### 進程模式配置

```bash
# 進程模式：dual（雙進程）或 single（單進程）
PROCESS_MODE=dual

# 單進程模式配置（僅在 PROCESS_MODE=single 時使用）
SINGLE_PROCESS_MODE=false
SINGLE_PROCESS_PORT=3000
```

### PM2 配置

系統提供兩個 PM2 配置文件：

- `ecosystem.dual.config.js`：雙進程模式配置
- `ecosystem.single.config.js`：單進程模式配置

使用 `./manage.sh switch-mode` 命令可以自動切換配置。

## 故障排除

### 監控系統未啟動

**問題**：訪問 `/api/metrics` 返回 404

**解決方案**：
1. 檢查 `.env` 中 `ENABLE_MONITORING=true`
2. 重啟服務：`./manage.sh restart`
3. 檢查日誌：`pm2 logs discord-server`

### Webhook 通知未發送

**問題**：ERROR 級別告警未收到 Webhook 通知

**解決方案**：
1. 檢查 `.env` 中 `WEBHOOK_ENABLED=true`
2. 驗證 `WEBHOOK_URLS` 格式正確
3. 測試 Webhook：`curl -X POST http://localhost:3008/api/metrics/webhook/test`
4. 檢查 Discord 頻道權限
5. 查看日誌中的 Webhook 發送狀態

### 監控頁面無法訪問

**問題**：訪問 `/admin/monitoring` 顯示空白或錯誤

**解決方案**：
1. 確認已以管理員身份登入
2. 檢查 `ADMIN_TOKEN` 是否正確設定
3. 清除瀏覽器快取
4. 檢查瀏覽器控制台錯誤訊息

### 指標數據不更新

**問題**：監控頁面顯示舊數據

**解決方案**：
1. 檢查 `METRICS_INTERVAL` 設定
2. 確認監控系統正在運行：`pm2 logs discord-server | grep "Metrics"`
3. 手動重新整理頁面
4. 重啟服務：`./manage.sh restart`

### 記憶體使用過高

**問題**：監控系統本身佔用過多記憶體

**解決方案**：
1. 減少 `METRICS_RETENTION_HOURS`（預設 24 小時）
2. 增加 `METRICS_INTERVAL`（預設 30 秒）
3. 考慮切換到單進程模式節省記憶體
4. 檢查是否有記憶體洩漏：`pm2 monit`

### 告警風暴

**問題**：短時間內收到大量相同告警

**解決方案**：
1. 系統已內建 5 分鐘冷卻期，相同告警不會重複發送
2. 如果仍然過多，調整告警閾值
3. 檢查系統是否真的有效能問題
4. 考慮暫時停用 Webhook：`WEBHOOK_ENABLED=false`

## 效能影響

監控系統設計為輕量級，對應用程式效能影響極小：

- **CPU 開銷**：< 1%
- **記憶體開銷**：~10-20MB（用於指標儲存）
- **網路開銷**：可忽略（僅本地收集）

所有監控操作都是非阻塞的，不會影響主應用程式的響應時間。

## 最佳實踐

1. **生產環境**：
   - 使用雙進程模式
   - 啟用監控系統
   - 配置 Webhook 通知
   - 定期檢查監控頁面

2. **告警閾值**：
   - 根據實際負載調整閾值
   - 避免設定過低導致誤報
   - 監控一段時間後再調整

3. **Webhook 配置**：
   - 使用專用的告警頻道
   - 配置多個 Webhook 作為備份
   - 定期測試 Webhook 是否正常

4. **資料保留**：
   - 預設保留 24 小時的指標數據
   - 如需更長時間，考慮使用資料庫持久化
   - 定期清理舊告警記錄

5. **安全性**：
   - 使用強隨機 Token 作為 `ADMIN_TOKEN`
   - 不要在公開場合分享 Token
   - 定期更換 Token

## 相關文檔

- [環境變數配置](ENVIRONMENT_VARIABLES.md)
- [開發指南](DEVELOPMENT.md)
- [部署指南](deployment/DEPLOYMENT_GUIDE.md)
- [監控 API 使用說明](../server/monitoring/API_USAGE.md)
- [Webhook 實作指南](../server/monitoring/WEBHOOK_IMPLEMENTATION.md)
- [告警系統摘要](../server/monitoring/ALERT_SYSTEM_SUMMARY.md)

## 支援

如有問題或建議，請：
1. 查看故障排除章節
2. 檢查相關文檔
3. 查看 GitHub Issues
4. 聯繫開發團隊
