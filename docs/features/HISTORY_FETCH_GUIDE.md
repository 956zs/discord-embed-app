# 歷史訊息提取功能指南

## 功能概述

這個功能允許管理員從 Discord 頻道提取歷史訊息，並將其儲存到資料庫中。提取過程使用多線程技術，並包含完整的進度追蹤和重複檢測機制。

## 主要特性

### 1. 管理員權限系統
- 只有管理員或指定用戶可以執行歷史訊息提取
- 管理員可以在資料庫中配置
- 前端會自動檢測用戶權限並顯示相應的介面

### 2. 智能提取機制
- **錨點系統**: 在開始提取前，先記錄最新訊息 ID 作為錨點
- **雙向提取**: 
  - 從錨點向後提取歷史訊息
  - 提取完成後從錨點向前檢查，確保沒有遺漏提取期間的新訊息
- **重複檢測**: 自動檢測並跳過已存在的訊息
- **範圍記錄**: 記錄每次提取的時間範圍，避免重複提取

### 3. 進度追蹤
- 實時顯示提取進度
- 顯示已提取、已儲存、重複訊息的數量
- 支持多個任務同時運行

### 4. 警示系統
- 如果提取的時間範圍與之前的記錄重疊，會標記為警告狀態
- 詳細的錯誤訊息記錄

## 資料庫結構

### 1. `history_fetch_tasks` - 提取任務記錄表
```sql
- id: 任務 ID
- guild_id: 伺服器 ID
- channel_id: 頻道 ID
- channel_name: 頻道名稱
- status: 狀態 (pending, running, completed, failed, warning)
- anchor_message_id: 錨點訊息 ID
- start_message_id: 開始訊息 ID
- end_message_id: 結束訊息 ID
- messages_fetched: 已提取訊息數
- messages_saved: 已儲存訊息數
- messages_duplicate: 重複訊息數
- error_message: 錯誤訊息
- started_by: 發起用戶 ID
- started_at: 開始時間
- completed_at: 完成時間
- created_at: 創建時間
```

### 2. `history_fetch_ranges` - 提取範圍記錄表
```sql
- id: 記錄 ID
- guild_id: 伺服器 ID
- channel_id: 頻道 ID
- start_message_id: 開始訊息 ID
- end_message_id: 結束訊息 ID
- start_timestamp: 開始時間戳
- end_timestamp: 結束時間戳
- message_count: 訊息數量
- task_id: 關聯的任務 ID
- created_at: 創建時間
```

### 3. `admin_users` - 管理員權限表
```sql
- id: 記錄 ID
- guild_id: 伺服器 ID
- user_id: 用戶 ID
- username: 用戶名稱
- granted_by: 授權者 ID
- granted_at: 授權時間
```

## 使用方式

### 1. 設置資料庫
```bash
psql -U your_username -d discord_stats -f bot/database/history_tables.sql
```

### 2. 添加管理員
在資料庫中手動添加管理員：
```sql
INSERT INTO admin_users (guild_id, user_id, username, granted_by)
VALUES ('YOUR_GUILD_ID', 'USER_ID', 'Username', 'ADMIN_ID');
```

或通過 API：
```bash
curl -X POST http://localhost:3008/api/history/YOUR_GUILD_ID/admins \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "username": "Username",
    "grantedBy": "ADMIN_ID"
  }'
```

### 3. 訪問管理員介面
1. 以管理員身份登入 Discord Embedded App
2. 導航欄會自動顯示「管理員」選項
3. 點擊進入管理員控制台

### 4. 開始提取
1. 在「頻道樹狀圖」標籤中選擇要提取的頻道
2. 點擊「開始提取」按鈕
3. 系統會自動：
   - 獲取最新訊息作為錨點
   - 創建提取任務
   - 開始異步提取
4. 在「活躍任務」區域查看實時進度
5. 在「提取歷史」標籤查看所有任務記錄

## API 端點

### 管理員相關
- `GET /api/history/:guildId/admins` - 獲取管理員列表
- `GET /api/history/:guildId/admins/:userId/check` - 檢查用戶是否為管理員
- `POST /api/history/:guildId/admins` - 添加管理員
- `DELETE /api/history/:guildId/admins/:userId` - 移除管理員

### 任務相關
- `GET /api/history/:guildId/tasks` - 獲取任務列表
- `GET /api/history/:guildId/tasks/:taskId` - 獲取任務詳情
- `POST /api/fetch/:guildId/start` - 開始提取任務
- `GET /api/fetch/progress/:taskId` - 獲取任務進度
- `GET /api/fetch/active` - 獲取所有活躍任務

### 統計相關
- `GET /api/history/:guildId/channel-stats` - 獲取頻道提取統計
- `GET /api/history/:guildId/summary` - 獲取提取摘要
- `GET /api/history/:guildId/ranges/:channelId` - 獲取頻道的提取範圍記錄

## 前端組件

### 1. `/admin` - 管理員控制台
主要管理介面，包含：
- 提取摘要卡片
- 活躍任務進度
- 頻道樹狀圖
- 提取歷史

### 2. `ChannelTree` - 頻道樹狀圖組件
- 顯示所有頻道
- 顯示每個頻道的提取統計
- 提供「開始提取」按鈕

### 3. `FetchHistory` - 提取歷史組件
- 顯示所有提取任務
- 支持按狀態篩選
- 顯示詳細的任務資訊和統計

### 4. `FetchProgress` - 進度追蹤組件
- 實時顯示活躍任務的進度
- 每 2 秒自動刷新

## 注意事項

1. **Rate Limiting**: 提取過程會自動在每批次之間延遲 1 秒，避免觸發 Discord API 限制

2. **重複提取**: 系統會檢測重複的時間範圍並發出警告，但不會阻止提取

3. **錯誤處理**: 所有錯誤都會被記錄到任務記錄中，可以在提取歷史中查看

4. **並發限制**: 雖然支持多任務並行，但建議不要同時運行太多任務以避免資源耗盡

5. **Bot 必須在線**: 提取功能需要 Discord Bot 在線運行

## 故障排除

### 提取服務未就緒
- 確保 Bot 已啟動並成功登入
- 檢查 server 和 bot 之間的連接
- 查看 server 日誌確認是否成功連接到 historyFetcher

### 權限不足
- 確認用戶已添加到 `admin_users` 表
- 檢查 guild_id 和 user_id 是否正確

### 提取失敗
- 檢查 Bot 是否有訪問該頻道的權限
- 查看任務的 error_message 欄位
- 確認 Discord API token 有效

### 進度不更新
- 檢查前端是否正確輪詢 API
- 確認任務狀態為 "running"
- 查看 browser console 和 server 日誌

## 未來改進

- [ ] 支持批量頻道提取
- [ ] 提供提取速度控制
- [ ] 添加提取暫停/恢復功能
- [ ] 更詳細的進度百分比顯示
- [ ] 提取完成通知
- [ ] 導出提取報告
