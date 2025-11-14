# 手機界面優化更新

## 更新內容

### 1. 訊息趨勢圖表優化（手機版）
- 調整圖表邊距，手機上左右邊距更小（left: -20, right: 5）
- 縮小字體大小（10px on mobile, 12px on desktop）
- X 軸標籤旋轉 -45 度，避免重疊
- 簡化日期顯示格式（手機上只顯示 月/日）
- 移除手機版的圖例，節省空間
- 調整線條粗細（手機 1.5px，桌面 2px）
- 移除手機版的 Y 軸標籤文字

### 2. 新增時間範圍選項
- **今日** (today) - 顯示今天的數據
- **昨日** (yesterday) - 顯示昨天的數據
- **最近 3 天** (3) - 顯示最近 3 天的數據
- 保留原有的 7/30/90/180/365 天和所有時間選項

### 3. 今日前三統計卡片
新增三個漸變色卡片，顯示今日最活躍的：
- **最活躍頻道** - 藍色漸變，顯示訊息數最多的頻道
- **最活躍用戶** - 紫色漸變，顯示發言最多的用戶
- **最常用表情** - 琥珀色漸變，顯示使用次數最多的表情符號

### 4. 後端 API 更新
- 新增 `/api/stats/today/:guildId` 端點
- 更新 `getMessageTrends` 支援 `today` 和 `yesterday` 參數
- 新增 `getTodayStats` 控制器函數

### 5. 國際化更新
新增翻譯文本：
- `home.today` - 今日
- `home.yesterday` - 昨日
- `home.days3` - 最近 3 天
- `home.todayTop3` - 今日前三
- `home.todayTop3Desc` - 今日最活躍的頻道、用戶和表情
- `home.topChannel` - 最活躍頻道
- `home.topUser` - 最活躍用戶
- `home.topEmoji` - 最常用表情

## 技術細節

### 響應式設計
使用 `useIsMobile` hook 檢測設備類型，根據屏幕寬度（< 768px）自動調整：
- 圖表邊距和字體大小
- 日期格式顯示
- 圖例顯示/隱藏
- Y 軸標籤顯示/隱藏

### 性能優化
- 今日統計使用 `CURRENT_DATE` 進行高效查詢
- 所有查詢都使用索引優化
- 前端並行請求所有數據

## 使用方式

1. 在時間範圍選擇器中選擇「今日」或其他短期選項
2. 查看頁面頂部的「今日前三」統計卡片
3. 在手機上查看優化後的訊息趨勢圖表

## 文件更新
- `client/app/page.tsx` - 主頁面組件
- `client/components/charts/message-trends-chart.tsx` - 圖表組件
- `client/lib/i18n.ts` - 國際化文本
- `server/controllers/statsController.js` - 統計控制器
- `server/routes/stats.js` - API 路由

## 資料庫修正
由於 `messages` 表中沒有 `channel_name` 欄位，今日統計查詢使用 LEFT JOIN 從 `channel_stats` 表獲取頻道名稱：
```sql
SELECT 
  COALESCE(cs.channel_name, m.channel_id) as name,
  COUNT(m.id) as count
FROM messages m
LEFT JOIN channel_stats cs ON m.channel_id = cs.channel_id AND m.guild_id = cs.guild_id
WHERE m.guild_id = $1 AND m.created_at >= CURRENT_DATE
GROUP BY m.channel_id, cs.channel_name
ORDER BY count DESC
LIMIT 1
```

## 部署步驟
1. 重啟服務器以應用更改：
   ```bash
   ./manage.sh restart
   ```
2. 清除瀏覽器緩存或強制刷新（Ctrl+Shift+R / Cmd+Shift+R）
3. 測試新功能：
   - 選擇「今日」時間範圍
   - 查看今日前三統計卡片
   - 在手機上測試圖表顯示
