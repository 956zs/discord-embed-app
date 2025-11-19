# 手機界面優化更新

## 更新內容

### 1. 手機版側邊欄導航
- 使用 shadcn Sheet 組件創建側邊欄菜單
- 手機上顯示漢堡菜單按鈕，點擊從左側滑出
- 桌面版保留原有的 Navigation Menu，並居中對齊
- 優化頂部欄間距和按鈕大小
- UserInfo 和 LanguageSwitcher 在手機上更緊湊
- 所有頁面（包括管理員頁面）在手機上都有 48px 頂部間距，避免被 Discord UI 遮擋

### 2. 訊息趨勢圖表優化（手機版）
**智能數據處理：**
- 數據點超過 15 個時自動採樣到約 12 個點，避免過度擁擠
- 確保包含首尾數據點，保持趨勢完整性

**視覺優化：**
- 調整圖表邊距（left: -15, right: 10, top: 10）給數字更多空間
- Y 軸寬度增加到 35px，數字不會被截斷
- 減少 Y 軸刻度數（手機 5 個，桌面 7 個）
- 字體大小優化（9px on mobile, 12px on desktop）
- X 軸標籤旋轉 -35 度（原 -45 度），更易讀
- 簡化日期顯示格式（手機上只顯示 月/日）
- 網格透明度降低到 30%，不搶眼
- 線條加粗（手機 2px，桌面 2.5px）
- 7 個點以內顯示圓點標記，更清晰
- 移除手機版的圖例和 Y 軸標籤文字，節省空間

**單日數據特殊處理：**
- 今日/昨日數據改用統計卡片顯示，不使用折線圖
- 兩個大卡片分別顯示「總訊息數」和「活躍用戶」
- 藍色和紫色漸變背景，視覺效果更好

### 2. 新增時間範圍選項
- **今日** (today) - 顯示今天的數據
- **昨日** (yesterday) - 顯示昨天的數據
- **最近 3 天** (3) - 顯示最近 3 天的數據
- 保留原有的 7/30/90/180/365 天和所有時間選項

### 3. 今日前三統計卡片
新增三個漸變色卡片，顯示今日最活躍的：
- **最活躍頻道** - 藍色漸變，顯示訊息數最多的頻道
- **最活躍用戶** - 紫色漸變，顯示發言最多的用戶
- **最常用表情** - 琥珀色漸變，顯示使用次數最多的表情符號（支援自訂表情圖片）

卡片特點：
- 響應式網格佈局（手機 1 列，平板 2 列，桌面 3 列）
- 大字體顯示數據，一目了然
- 文字截斷避免溢出
- 只在有數據時顯示

### 4. 後端 API 更新
- 新增 `/api/stats/today/:guildId` 端點
- 更新 `getMessageTrends` 支援 `today` 和 `yesterday` 參數
- 新增 `getTodayStats` 控制器函數

### 5. 組件優化
新增和優化的組件：
- `client/components/mobile-nav.tsx` - 手機版側邊欄導航
- `client/components/ui/sheet.tsx` - shadcn Sheet 組件
- `client/components/ui/separator.tsx` - shadcn Separator 組件
- `client/components/user-info.tsx` - 優化手機顯示
- `client/components/language-switcher.tsx` - 優化手機顯示

### 6. 國際化更新
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

## 用戶認證修正
修正了 Discord SDK OAuth2 認證後無法獲取用戶 ID 的問題：
- 更新 `client/app/api/auth/token/route.ts`，添加後備 URL 和詳細日誌
- 確保 `BACKEND_URL` 和 `NEXT_PUBLIC_API_URL` 環境變數都已設置
- 添加錯誤日誌以便調試

## 部署步驟
1. 更新環境變數（如果需要）：
   ```bash
   # 在 client/.env.local 中確保有：
   NEXT_PUBLIC_API_URL=http://localhost:3008
   BACKEND_URL=http://localhost:3008
   ```

2. 重啟服務器以應用更改：
   ```bash
   ./manage.sh restart
   ```

3. 清除瀏覽器緩存或強制刷新（Ctrl+Shift+R / Cmd+Shift+R）

4. 測試新功能：
   - 選擇「今日」時間範圍
   - 查看今日前三統計卡片
   - 在手機上測試圖表顯示
   - 確認管理員權限正確識別
