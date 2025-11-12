# UI 升級說明

已將前端 UI 升級為 shadcn/ui 現代化設計風格。

## 主要變更

### 1. 技術棧升級

#### 新增依賴
- **Tailwind CSS** - 實用優先的 CSS 框架
- **shadcn/ui** - 基於 Radix UI 的高質量組件庫
- **Lucide React** - 現代化圖標庫
- **class-variance-authority** - 類型安全的樣式變體
- **clsx** + **tailwind-merge** - 智能類名合併

#### 安裝的包
```bash
# Tailwind CSS
tailwindcss postcss autoprefixer

# Radix UI 組件
@radix-ui/react-slot
@radix-ui/react-tabs
@radix-ui/react-separator

# 工具庫
class-variance-authority
clsx
tailwind-merge
lucide-react
```

### 2. 設計系統

#### 顏色主題
- 支持亮色/暗色模式
- 使用 HSL 顏色系統
- 語義化顏色變量（primary, secondary, muted, accent 等）

#### 組件風格
- 圓角卡片設計
- 柔和陰影效果
- 流暢的過渡動畫
- 響應式佈局

### 3. 組件重構

#### Card 組件
使用 shadcn/ui 的 Card 組件替代自定義卡片：
```tsx
<Card>
  <CardHeader>
    <CardTitle>標題</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    內容
  </CardContent>
</Card>
```

#### Tabs 組件
使用 Radix UI 的 Tabs 組件：
```tsx
<Tabs defaultValue="trends">
  <TabsList>
    <TabsTrigger value="trends">趨勢</TabsTrigger>
    <TabsTrigger value="channels">頻道</TabsTrigger>
  </TabsList>
  <TabsContent value="trends">
    內容
  </TabsContent>
</Tabs>
```

#### 圖標系統
使用 Lucide React 替代 emoji：
```tsx
import { TrendingUp, Users, MessageSquare } from "lucide-react";

<TrendingUp className="h-5 w-5 text-primary" />
```

### 4. 重構的組件

#### Dashboard.tsx
- 使用 Tabs 組件組織內容
- 添加圖標導航
- 響應式網格佈局
- 現代化載入狀態

#### ServerOverview.tsx
- 4 個統計卡片網格佈局
- 每個卡片帶有彩色圖標
- 數字格式化顯示

#### MessageTrends.tsx
- 使用 Card 組件包裝圖表
- 添加標題和描述
- 固定圖表高度

#### ChannelUsage.tsx
- 圓角柱狀圖
- 紫色主題配色
- 卡片式佈局

#### MemberActivity.tsx
- 排名圖標（獎杯、獎牌）
- 懸停效果
- 數字格式化

#### EmojiStats.tsx
- 使用 Tabs 切換過濾器
- 卡片式列表項
- 自訂表情圖片支持

### 5. 樣式系統

#### 移除的 CSS 文件
- `Dashboard.css`
- `Card.css`
- `App.css`
- 大部分 `index.css`

#### 新增的配置
- `tailwind.config.js` - Tailwind 配置
- `postcss.config.js` - PostCSS 配置
- `src/lib/utils.ts` - 工具函數

#### Tailwind 類名示例
```tsx
// 佈局
className="container mx-auto p-4 space-y-6"

// 網格
className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"

// 卡片
className="rounded-lg border bg-card shadow-sm"

// 文字
className="text-2xl font-bold text-foreground"

// 顏色
className="text-primary bg-muted hover:bg-accent"
```

### 6. 響應式設計

#### 斷點
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

#### 響應式示例
```tsx
// 移動端 1 列，平板 2 列，桌面 4 列
className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"

// 移動端隱藏文字
<span className="hidden sm:inline">趨勢</span>
```

### 7. 暗色模式支持

#### 啟用暗色模式
在 `<html>` 標籤添加 `dark` 類：
```html
<html class="dark">
```

#### 暗色模式變量
所有顏色變量都有暗色模式版本，自動切換。

### 8. 性能優化

- 使用 Tailwind 的 JIT 模式
- 按需生成 CSS
- 生產環境自動清除未使用的樣式
- 組件懶加載支持

## 使用指南

### 啟動開發服務器
```bash
cd client
npm run dev
```

### 構建生產版本
```bash
cd client
npm run build
```

### 添加新組件

1. 創建組件文件：
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>我的組件</CardTitle>
      </CardHeader>
      <CardContent>
        內容
      </CardContent>
    </Card>
  );
}
```

2. 使用 Tailwind 類名：
```tsx
<div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
  內容
</div>
```

### 自定義主題

編輯 `tailwind.config.js`：
```js
theme: {
  extend: {
    colors: {
      // 添加自定義顏色
      brand: {
        50: '#f0f9ff',
        // ...
      }
    }
  }
}
```

編輯 `src/index.css` 中的 CSS 變量：
```css
:root {
  --primary: 221.2 83.2% 53.3%;
  /* 修改主色調 */
}
```

## 遷移指南

### 從舊 CSS 遷移

#### 舊代碼
```css
.card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
}
```

#### 新代碼
```tsx
<Card className="bg-card/10 rounded-xl p-5">
  內容
</Card>
```

### 從 emoji 遷移到圖標

#### 舊代碼
```tsx
<h2>📊 統計</h2>
```

#### 新代碼
```tsx
import { BarChart3 } from "lucide-react";

<h2 className="flex items-center gap-2">
  <BarChart3 className="h-5 w-5" />
  統計
</h2>
```

## 常見問題

### Q: 如何添加新的 shadcn/ui 組件？
A: 從 [shadcn/ui 文檔](https://ui.shadcn.com) 複製組件代碼到 `src/components/ui/` 目錄。

### Q: 如何自定義顏色？
A: 修改 `src/index.css` 中的 CSS 變量。

### Q: 如何啟用暗色模式？
A: 在 `<html>` 標籤添加 `dark` 類，或使用 JavaScript 動態切換。

### Q: Tailwind 類名太長怎麼辦？
A: 使用 `cn()` 工具函數合併類名，或提取為組件。

## 資源連結

- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [shadcn/ui 文檔](https://ui.shadcn.com)
- [Radix UI 文檔](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)

## 下一步

- [ ] 添加暗色模式切換按鈕
- [ ] 添加更多動畫效果
- [ ] 優化移動端體驗
- [ ] 添加骨架屏載入狀態
- [ ] 實現主題自定義面板
