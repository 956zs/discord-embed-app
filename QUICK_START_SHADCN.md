# shadcn/ui 快速開始

## 🎉 恭喜！你的項目已經配置好 shadcn/ui

## 立即開始

### 1. 啟動開發服務器

```bash
cd client
npm run dev
```

訪問 http://localhost:5173

### 2. 安裝你的第一個組件

```bash
cd client
npx shadcn@latest add button
```

### 3. 使用組件

```tsx
import { Button } from "@/components/ui/button";

function MyComponent() {
  return (
    <div className="p-4">
      <Button>點擊我</Button>
      <Button variant="outline">輪廓按鈕</Button>
      <Button variant="ghost">幽靈按鈕</Button>
    </div>
  );
}
```

## 常用命令

```bash
# 安裝單個組件
npx shadcn@latest add button

# 安裝多個組件
npx shadcn@latest add button input label

# 查看可用組件
npx shadcn@latest add
```

## 推薦安裝的組件

```bash
# 基礎組件
npx shadcn@latest add button input label select textarea

# 反饋組件
npx shadcn@latest add toast alert skeleton

# 佈局組件
npx shadcn@latest add dialog dropdown-menu sheet

# 數據展示
npx shadcn@latest add badge avatar progress table
```

## 組件位置

所有 shadcn/ui 組件都在：
```
client/src/components/ui/
```

你可以直接編輯這些文件來自定義樣式！

## 導入組件

使用 `@/` 別名：

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

## 自定義主題

編輯 `client/src/index.css`：

```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* 修改主色調 */
  --radius: 0.5rem;              /* 修改圓角 */
}
```

## 啟用暗色模式

在 `client/index.html` 添加 `dark` 類：

```html
<html lang="zh-TW" class="dark">
```

## 更多資源

- 📖 [完整使用指南](./client/SHADCN_USAGE.md)
- 📖 [設置完成說明](./SHADCN_SETUP_COMPLETE.md)
- 📖 [遷移總結](./UI_MIGRATION_SUMMARY.md)
- 🌐 [shadcn/ui 官方文檔](https://ui.shadcn.com)

## 需要幫助？

查看 [SHADCN_USAGE.md](./client/SHADCN_USAGE.md) 獲取詳細說明。

開始構建你的 UI 吧！🚀
