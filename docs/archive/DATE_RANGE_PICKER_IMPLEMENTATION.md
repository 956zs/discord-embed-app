# 日期範圍選擇器實作說明

## 概述

為所有統計數據視圖添加了日期範圍選擇器功能，允許所有用戶（不僅限於管理員）選擇自訂日期範圍來查看統計數據。

## 已完成的工作

### 1. 前端組件

#### 新增的組件
- **`client/components/ui/date-range-picker.tsx`** - 日期範圍選擇器組件
  - 支援快速選擇預設範圍（今天、昨天、最近 7/30/90/365 天）
  - 支援自訂日期範圍選擇（使用日曆）
  - 可選擇單一日期或日期範圍
  - 使用 shadcn/ui 的 Calendar 和 Popover 組件
  - 繁體中文界面（使用 date-fns 的 zhTW locale）

#### 更新的組件
- **`client/app/page.tsx`** - 主頁統計頁面
  - 替換原有的 HTML select 為 shadcn Select 組件
  - 整合日期範圍選擇器
  - 新增 `useCustomRange` 和 `dateRange` 狀態
  - 支援預設範圍和自訂範圍切換
  - 所有用戶都可使用（不限管理員）
  - 響應式佈局支援手機和桌面

- **`client/components/admin/member-stats.tsx`** - 管理員成員統計
  - 整合了日期範圍選擇器
  - 新增 `useCustomRange` 狀態管理自訂範圍模式
  - 支援快速選擇（7/30/90/365 天）和自訂範圍切換
  - 根據選擇的日期範圍動態調用 API

### 2. 後端 API 更新

#### 更新的控制器
- **`server/controllers/statsController.js`** - 所有統計 API
  - `getMemberActivity()` - 成員活躍度統計
  - `getChannelUsage()` - 頻道使用統計
  - `getMessageTrends()` - 訊息趨勢統計
  - `getEmojiStats()` - 表情符號統計
  - 所有 API 都新增 `startDate` 和 `endDate` 查詢參數支援
  - 優先使用自訂日期範圍，其次才使用預設天數
  - 使用參數化查詢防止 SQL 注入
  - 支援單一日期或日期範圍查詢

- **`server/controllers/welcomeController.js`** - `getMemberStats()`
  - 新增 `startDate` 和 `endDate` 查詢參數支援
  - 優先使用自訂日期範圍，其次才使用預設天數
  - 使用參數化查詢防止 SQL 注入
  - 支援單一日期或日期範圍查詢

### 3. 安裝的依賴

```bash
# shadcn/ui 組件
- calendar
- popover

# npm 套件
- date-fns（日期格式化和本地化）
- lucide-react（圖標）
```

## 使用方式

### 在主頁統計頁面（所有用戶）

1. 訪問主頁統計頁面
2. 在頁面標題右側，你會看到時間範圍選擇器：
   - **時間範圍下拉選單**: 選擇預設範圍或"自訂範圍"
   - **日期範圍選擇器**: 當選擇"自訂範圍"時出現

3. 點擊日期範圍選擇器會彈出日曆界面：
   - 左側顯示快速選擇選項（今天、昨天、最近 7/30/90/365 天）
   - 右側顯示雙月日曆
   - 可以點擊兩個日期選擇範圍
   - 或點擊單一日期查看該天的數據

4. 選擇日期後，以下統計數據會自動更新：
   - 訊息趨勢圖表
   - 頻道使用統計
   - 成員活躍度排行
   - 表情符號使用統計

### 在管理員成員統計頁面

1. 訪問管理員面板的成員統計頁面
2. 使用方式與主頁相同
3. 可查看成員加入/離開趨勢

### API 調用示例

```typescript
// 主頁統計 API
// 使用預設天數
fetch(`/api/stats/messages/${guildId}?days=30`)
fetch(`/api/stats/channels/${guildId}?days=30`)
fetch(`/api/stats/members/${guildId}?days=30`)
fetch(`/api/stats/emojis/${guildId}?days=30`)

// 使用自訂日期範圍
fetch(`/api/stats/messages/${guildId}?startDate=2024-01-01&endDate=2024-01-31`)
fetch(`/api/stats/channels/${guildId}?startDate=2024-01-01&endDate=2024-01-31`)

// 使用單一日期
fetch(`/api/stats/messages/${guildId}?startDate=2024-01-15`)

// 成員統計 API（管理員）
fetch(`/api/welcome/${guildId}/stats?startDate=2024-01-01&endDate=2024-01-31`)
```

## 組件架構

### DateRangePicker 組件

```typescript
interface DateRangePickerProps {
  className?: string;
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}
```

**功能特性**:
- 快速選擇預設範圍
- 自訂日期範圍選擇
- 繁體中文日期格式
- 響應式設計
- 雙月日曆視圖

### 預設範圍選項

- 今天
- 昨天
- 最近 7 天
- 最近 30 天
- 最近 90 天
- 最近一年
- 自訂範圍

## 後端 API 邏輯

```javascript
// 優先級處理
if (startDate) {
  // 使用自訂日期範圍
  timeFilter = `AND DATE(created_at) >= $2`;
  if (endDate) {
    timeFilter += ` AND DATE(created_at) <= $3`;
  }
} else if (days && days !== "all") {
  // 使用預設天數
  timeFilter = `AND created_at >= NOW() - INTERVAL '${daysNum} days'`;
}
```

## 擴展性

### 添加到其他統計頁面

要在其他統計頁面添加日期範圍選擇器：

1. 導入組件：
```typescript
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
```

2. 添加狀態：
```typescript
const [dateRange, setDateRange] = useState<DateRange | undefined>();
const [useCustomRange, setUseCustomRange] = useState(false);
```

3. 更新 API 調用：
```typescript
if (useCustomRange && dateRange?.from) {
  const params = new URLSearchParams();
  params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
  if (dateRange.to) {
    params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
  }
  url += `?${params.toString()}`;
}
```

4. 添加 UI：
```tsx
<DateRangePicker
  date={dateRange}
  onDateChange={(range) => setDateRange(range)}
/>
```

### 更新其他 API 端點

要為其他統計 API 添加日期範圍支援，參考 `welcomeController.js` 的實作：

1. 添加 `startDate` 和 `endDate` 查詢參數
2. 使用參數化查詢
3. 優先處理自訂日期範圍
4. 保持向後兼容（支援 `days` 參數）

## 注意事項

1. **日期格式**: 統一使用 `YYYY-MM-DD` 格式
2. **時區處理**: 所有日期都使用用戶的本地時區
3. **SQL 安全性**: 使用參數化查詢防止 SQL 注入
4. **向後兼容**: 保留原有的 `days` 參數支援
5. **響應式設計**: 組件在手機和桌面上都能正常工作

## 已知限制

1. 今日前三統計卡片（topChannel、topUser、topEmoji）不受日期範圍影響，固定顯示今日數據
2. 伺服器概覽（成員數、頻道數、身分組數）為即時數據，不受日期範圍影響

## 未來改進建議

1. ✅ ~~在主頁統計中整合日期範圍選擇器~~ （已完成）
2. ✅ ~~為所有統計 API 添加日期範圍支援~~ （已完成）
3. 添加更多預設範圍（如"本週"、"上週"、"本月"、"上月"）
4. 實作日期範圍驗證（防止選擇超出數據範圍的日期）
5. 添加"與上一期間比較"功能
6. 實作日期範圍的持久化（保存到 localStorage）
7. 為今日前三統計卡片添加日期範圍支援
8. 添加數據下載功能（CSV/Excel）

## 測試建議

1. 測試各種預設範圍選擇
2. 測試自訂日期範圍選擇
3. 測試單一日期選擇
4. 測試邊界情況（未來日期、過去日期）
5. 測試響應式佈局
6. 測試 API 參數傳遞
7. 測試資料庫查詢效能

## 相關文件

- [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/calendar)
- [date-fns 文檔](https://date-fns.org/)
- [react-day-picker 文檔](https://react-day-picker.js.org/)
