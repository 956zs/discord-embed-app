# 歷史訊息提取功能使用指南

## 功能已完成 ✅

現在你可以在 Discord Embedded App 中使用完整的歷史訊息提取功能了！

## 使用步驟

### 1. 確保所有服務運行

你需要同時運行三個服務：

**方式 A: 使用 PM2（推薦）**
```bash
chmod +x start-all-services.sh
./start-all-services.sh
```

**方式 B: 手動啟動**
```bash
# 終端 1 - Bot
cd bot
node index.js

# 終端 2 - Server  
cd server
node index.js

# 終端 3 - Client
cd client
npm run dev
```

### 2. 確認服務連接

查看 Server 日誌，應該看到：
```
✅ 已連接到歷史訊息提取器
```

如果沒有看到，請：
1. 確保 Bot 先啟動
2. 等待 3-5 秒後再啟動 Server
3. 檢查 Bot 日誌是否有錯誤

### 3. 在 Discord 中打開應用

1. 在你的 Discord 伺服器中打開 Embedded App
2. 你應該會看到：
   - 左上角顯示 "Hi, {你的用戶名}"
   - 導航欄有「管理員」按鈕（如果你是管理員）

### 4. 進入管理員控制台

1. 點擊「管理員」按鈕
2. 你會看到：
   - **提取摘要**：顯示總任務數、已提取訊息等統計
   - **頻道樹狀圖**：顯示所有頻道和提取狀態
   - **提取歷史**：顯示所有提取任務記錄

### 5. 開始提取歷史訊息

1. 在「頻道樹狀圖」標籤中
2. 選擇要提取的頻道
3. 點擊「開始提取」按鈕
4. 系統會：
   - 獲取該頻道的最新訊息作為錨點
   - 創建提取任務
   - 開始異步提取歷史訊息

### 6. 查看提取進度

**實時進度**：
- 頁面頂部的「活躍任務」卡片會顯示正在運行的任務
- 每 2 秒自動更新
- 顯示已提取、已儲存、重複的訊息數量

**歷史記錄**：
- 切換到「提取歷史」標籤
- 查看所有任務的詳細信息
- 可以按狀態篩選（全部、運行中、完成、失敗、警告）

## 提取過程說明

### 階段 1: 初始化
- 獲取頻道最新訊息作為錨點
- 創建任務記錄
- 狀態：`pending`

### 階段 2: 向後提取
- 從錨點開始向歷史方向提取
- 每次提取 100 則訊息
- 自動跳過重複訊息
- 狀態：`running`

### 階段 3: 向前檢查
- 從錨點向前檢查
- 確保沒有遺漏提取期間的新訊息

### 階段 4: 完成
- 記錄提取範圍
- 檢查是否與之前的範圍重疊
- 狀態：`completed` 或 `warning`（如果有重疊）

## 任務狀態說明

- **pending**: 待處理，任務已創建但尚未開始
- **running**: 運行中，正在提取訊息
- **completed**: 完成，成功提取所有訊息
- **failed**: 失敗，提取過程中出現錯誤
- **warning**: 警告，提取完成但發現範圍重疊

## 重複檢測

系統會自動：
1. 檢查每則訊息是否已存在於資料庫
2. 跳過已存在的訊息
3. 記錄重複訊息數量
4. 檢測提取範圍是否與之前重疊

如果發現範圍重疊，任務狀態會標記為 `warning`，但不會影響數據完整性。

## 查看統計

### 提取摘要
- 總任務數
- 已提取訊息總數
- 完成率
- 已處理頻道數

### 頻道統計
每個頻道顯示：
- 總任務數
- 已提取訊息數
- 最後提取時間
- 成功/失敗任務數

### 任務詳情
每個任務顯示：
- 頻道名稱
- 狀態
- 已提取/已儲存/重複訊息數
- 開始和完成時間
- 耗時
- 訊息 ID 範圍

## 注意事項

### Rate Limiting
- 系統會在每批次之間延遲 1 秒
- 避免觸發 Discord API 限制
- 大量訊息的頻道可能需要較長時間

### 並發限制
- 可以同時運行多個提取任務
- 建議不要超過 3-5 個並發任務
- 避免資源耗盡

### 錯誤處理
- 所有錯誤都會記錄到任務記錄
- 可以在「提取歷史」中查看錯誤訊息
- 失敗的任務可以重新提取

### 數據完整性
- 系統會記錄每次提取的時間範圍
- 自動檢測重複提取
- 不會重複儲存相同的訊息

## 故障排除

### 問題 1: 提取服務未就緒

**症狀**: 點擊「開始提取」後顯示 "提取服務未就緒"

**解決方案**:
1. 確認 Bot 正在運行：`pm2 logs discord-bot`
2. 確認 Server 日誌顯示 "✅ 已連接到歷史訊息提取器"
3. 重啟服務：先啟動 Bot，等待 3 秒，再啟動 Server

### 問題 2: 無法獲取頻道列表

**症狀**: 頻道列表顯示模擬數據（一般、閒聊、公告）

**解決方案**:
1. 檢查 Discord SDK 是否正確初始化
2. 查看瀏覽器控制台的錯誤訊息
3. 確認應用在 Discord 中運行（不是直接訪問 localhost）

### 問題 3: 提取任務一直處於 pending 狀態

**症狀**: 任務創建後狀態不變

**解決方案**:
1. 檢查 Bot 日誌是否有錯誤
2. 確認 Bot 有訪問該頻道的權限
3. 檢查資料庫連接是否正常

### 問題 4: 提取速度很慢

**原因**: 這是正常的，為了避免 Rate Limiting

**說明**:
- 每批次 100 則訊息
- 每批次之間延遲 1 秒
- 10,000 則訊息大約需要 100 秒（約 1.5 分鐘）

## 測試命令

### 測試管理員權限
```bash
curl "http://localhost:3008/api/history/YOUR_GUILD_ID/admins/YOUR_USER_ID/check"
```

### 測試開始提取
```bash
curl -X POST "http://localhost:3008/api/fetch/YOUR_GUILD_ID/start" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "CHANNEL_ID",
    "channelName": "channel-name",
    "anchorMessageId": "latest",
    "userId": "YOUR_USER_ID"
  }'
```

### 查看活躍任務
```bash
curl "http://localhost:3008/api/fetch/active"
```

### 查看任務列表
```bash
curl "http://localhost:3008/api/history/YOUR_GUILD_ID/tasks"
```

## 性能建議

### 小型頻道（< 1,000 則訊息）
- 提取時間：< 10 秒
- 可以並發多個任務

### 中型頻道（1,000 - 10,000 則訊息）
- 提取時間：10 秒 - 2 分鐘
- 建議 2-3 個並發任務

### 大型頻道（> 10,000 則訊息）
- 提取時間：> 2 分鐘
- 建議一次只提取 1-2 個頻道
- 可以分批提取

## 數據查詢

提取完成後，你可以在資料庫中查詢：

```sql
-- 查看某個頻道的訊息數量
SELECT COUNT(*) FROM messages WHERE channel_id = 'CHANNEL_ID';

-- 查看某個用戶的訊息數量
SELECT COUNT(*) FROM messages WHERE user_id = 'USER_ID';

-- 查看某個時間範圍的訊息
SELECT * FROM messages 
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY created_at DESC;

-- 查看提取統計
SELECT 
  channel_name,
  SUM(messages_saved) as total_messages,
  COUNT(*) as total_tasks
FROM history_fetch_tasks
WHERE status = 'completed'
GROUP BY channel_name;
```

## 下一步

提取完成後，你可以：
1. 在主儀表板查看統計數據
2. 分析成員活躍度
3. 查看訊息趨勢
4. 分析表情符號使用
5. 生成自定義報告

享受你的 Discord 統計分析！🎉
