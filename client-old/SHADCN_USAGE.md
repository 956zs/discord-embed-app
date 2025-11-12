# shadcn/ui 使用指南

本項目已配置好 shadcn/ui，可以直接使用 CLI 安裝組件。

## 配置完成

✅ 已安裝 Tailwind CSS v3.4
✅ 已配置路徑別名 `@/`
✅ 已創建 `components.json` 配置文件
✅ 已創建基礎 UI 組件（Card, Tabs, Separator）
✅ 已創建 `cn()` 工具函數

## 使用 shadcn/ui CLI 安裝組件

### 安裝單個組件

```bash
cd client
npx shadcn@latest add button
```

這會自動：
1. 下載組件代碼到 `src/components/ui/button.tsx`
2. 安裝必要的依賴
3. 配置好所有導入路徑

### 安裝多個組件

```bash
npx shadcn@latest add button input label
```

### 查看可用組件

訪問 [shadcn/ui 組件列表](https://ui.shadcn.com/docs/components)

常用組件：
- `button` - 按鈕
- `input` - 輸入框
- `label` - 標籤
- `select` - 下拉選擇
- `dialog` - 對話框
- `dropdown-menu` - 下拉菜單
- `toast` - 提示訊息
- `badge` - 徽章
- `avatar` - 頭像
- `skeleton` - 骨架屏
- `alert` - 警告框
- `progress` - 進度條
- `switch` - 開關
- `checkbox` - 複選框
- `radio-group` - 單選按鈕組

## 使用已安裝的組件

### 導入組件

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

### 使用組件

```tsx
function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>標題</CardTitle>
      </CardHeader>
      <CardContent>
        內容
      </CardContent>
    </Card>
  );
}
```

## 路徑別名

項目已配置 `@/` 別名，指向 `src/` 目錄：

```tsx
// ✅ 推薦使用
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ServerStats } from "@/types";

// ❌ 避免使用相對路徑
import { Button } from "../../components/ui/button";
import { cn } from "../../../lib/utils";
```

## 自定義組件

### 方式 1：使用 CLI 安裝後修改

```bash
npx shadcn@latest add button
```

然後編輯 `src/components/ui/button.tsx` 自定義樣式。

### 方式 2：手動創建組件

在 `src/components/ui/` 目錄創建新文件：

```tsx
// src/components/ui/my-component.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export function MyComponent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border p-4", className)} {...props} />
  )
}
```

## 主題自定義

### 修改顏色

編輯 `src/index.css` 中的 CSS 變量：

```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* 修改主色調 */
  --secondary: 210 40% 96.1%;
  /* ... */
}
```

### 修改圓角

編輯 `src/index.css`：

```css
:root {
  --radius: 0.5rem;  /* 修改為 0.75rem 或其他值 */
}
```

### 添加自定義顏色

編輯 `tailwind.config.js`：

```js
theme: {
  extend: {
    colors: {
      brand: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        // ...
      }
    }
  }
}
```

## 暗色模式

### 啟用暗色模式

在 `index.html` 的 `<html>` 標籤添加 `dark` 類：

```html
<html lang="zh-TW" class="dark">
```

### 動態切換暗色模式

```tsx
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <button onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}
```

## 常見問題

### Q: 如何更新已安裝的組件？
A: 重新運行安裝命令會覆蓋現有組件：
```bash
npx shadcn@latest add button
```

### Q: 組件樣式不生效？
A: 確保：
1. Tailwind CSS 已正確配置
2. `src/index.css` 包含 `@tailwind` 指令
3. 開發服務器已重啟

### Q: 如何查看組件源碼？
A: 所有組件都在 `src/components/ui/` 目錄，可以直接查看和修改。

### Q: 可以混用其他 UI 庫嗎？
A: 可以，但建議優先使用 shadcn/ui 保持風格統一。

## 推薦的組件安裝

根據當前項目需求，建議安裝：

```bash
# 基礎組件
npx shadcn@latest add button input label select

# 反饋組件
npx shadcn@latest add toast alert skeleton

# 佈局組件
npx shadcn@latest add dialog dropdown-menu

# 數據展示
npx shadcn@latest add badge avatar progress
```

## 示例：添加按鈕組件

1. 安裝按鈕組件：
```bash
cd client
npx shadcn@latest add button
```

2. 使用按鈕：
```tsx
import { Button } from "@/components/ui/button";

function MyComponent() {
  return (
    <div>
      <Button>點擊我</Button>
      <Button variant="outline">輪廓按鈕</Button>
      <Button variant="ghost">幽靈按鈕</Button>
      <Button size="sm">小按鈕</Button>
      <Button size="lg">大按鈕</Button>
    </div>
  );
}
```

## 資源連結

- [shadcn/ui 官方文檔](https://ui.shadcn.com)
- [shadcn/ui 組件列表](https://ui.shadcn.com/docs/components)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Radix UI 文檔](https://www.radix-ui.com)

## 下一步

1. 瀏覽 [shadcn/ui 組件庫](https://ui.shadcn.com/docs/components)
2. 使用 CLI 安裝需要的組件
3. 在項目中使用這些組件
4. 根據需求自定義樣式

享受使用 shadcn/ui 帶來的開發體驗！🎉
