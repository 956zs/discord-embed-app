# shadcn/ui 設置完成 ✅

你的項目現在已經完全配置好 shadcn/ui，可以直接使用 CLI 安裝組件了！

## 已完成的配置

### 1. 依賴安裝
- ✅ Tailwind CSS v3.4.18
- ✅ PostCSS + Autoprefixer
- ✅ Radix UI 組件（Tabs, Separator, Slot）
- ✅ 工具庫（clsx, tailwind-merge, class-variance-authority）
- ✅ Lucide React 圖標
- ✅ @types/node（用於路徑解析）

### 2. 配置文件
- ✅ `tailwind.config.js` - Tailwind 配置
- ✅ `postcss.config.js` - PostCSS 配置
- ✅ `components.json` - shadcn/ui 配置
- ✅ `tsconfig.json` - 添加路徑別名 `@/`
- ✅ `vite.config.ts` - 配置路徑解析

### 3. 基礎組件
- ✅ `src/components/ui/card.tsx`
- ✅ `src/components/ui/tabs.tsx`
- ✅ `src/components/ui/separator.tsx`
- ✅ `src/lib/utils.ts` - cn() 工具函數

### 4. 樣式系統
- ✅ `src/index.css` - Tailwind 指令和 CSS 變量
- ✅ 顏色主題（支持亮色/暗色模式）
- ✅ 響應式設計

### 5. 組件更新
所有組件已更新使用：
- ✅ `@/` 路徑別名
- ✅ shadcn/ui Card 組件
- ✅ shadcn/ui Tabs 組件
- ✅ Lucide React 圖標
- ✅ Tailwind CSS 類名

## 現在你可以做什麼

### 1. 使用 CLI 安裝新組件

```bash
cd client

# 安裝按鈕組件
npx shadcn@latest add button

# 安裝多個組件
npx shadcn@latest add button input label select

# 安裝對話框
npx shadcn@latest add dialog

# 安裝提示訊息
npx shadcn@latest add toast
```

### 2. 在代碼中使用

```tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function MyComponent() {
  return (
    <div>
      <Button>點擊我</Button>
      <Dialog>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>對話框標題</DialogTitle>
          </DialogHeader>
          <p>對話框內容</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 3. 啟動開發服務器

```bash
cd client
npm run dev
```

訪問 http://localhost:5173 查看效果。

## 項目結構

```
client/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 組件
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── separator.tsx
│   │   ├── Dashboard.tsx    # 主儀表板
│   │   ├── ServerOverview.tsx
│   │   ├── MessageTrends.tsx
│   │   ├── ChannelUsage.tsx
│   │   ├── MemberActivity.tsx
│   │   └── EmojiStats.tsx
│   ├── lib/
│   │   └── utils.ts         # 工具函數
│   ├── types/
│   │   └── index.ts         # TypeScript 類型
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            # Tailwind + CSS 變量
├── components.json          # shadcn/ui 配置
├── tailwind.config.js       # Tailwind 配置
├── postcss.config.js        # PostCSS 配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── package.json
└── SHADCN_USAGE.md          # 使用指南
```

## 可用的 shadcn/ui 組件

訪問 https://ui.shadcn.com/docs/components 查看所有組件。

常用組件：
- **按鈕**: `button`
- **輸入**: `input`, `textarea`, `select`
- **表單**: `form`, `label`, `checkbox`, `radio-group`, `switch`
- **對話框**: `dialog`, `alert-dialog`, `sheet`
- **菜單**: `dropdown-menu`, `context-menu`, `menubar`
- **導航**: `navigation-menu`, `breadcrumb`, `pagination`
- **反饋**: `toast`, `alert`, `progress`, `skeleton`
- **數據展示**: `table`, `badge`, `avatar`, `card`, `tabs`
- **其他**: `tooltip`, `popover`, `accordion`, `collapsible`

## 自定義主題

### 修改主色調

編輯 `src/index.css`：

```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* 藍色 */
  /* 改為紫色 */
  --primary: 262.1 83.3% 57.8%;
}
```

### 修改圓角

```css
:root {
  --radius: 0.5rem;  /* 默認 */
  /* 改為更圓 */
  --radius: 0.75rem;
}
```

### 啟用暗色模式

在 `index.html` 添加 `dark` 類：

```html
<html lang="zh-TW" class="dark">
```

## 下一步建議

1. **安裝常用組件**
   ```bash
   npx shadcn@latest add button input label select dialog toast
   ```

2. **添加暗色模式切換**
   - 安裝 `dropdown-menu` 組件
   - 創建主題切換按鈕

3. **優化載入狀態**
   - 安裝 `skeleton` 組件
   - 替換當前的載入動畫

4. **添加互動功能**
   - 安裝 `dialog` 用於詳細信息
   - 安裝 `toast` 用於通知

5. **改進表單**
   - 安裝 `form`, `input`, `select`
   - 添加設置面板

## 故障排除

### 如果遇到路徑解析錯誤

確保 `tsconfig.json` 包含：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

確保 `vite.config.ts` 包含：
```ts
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

### 如果 Tailwind 樣式不生效

1. 重啟開發服務器
2. 檢查 `tailwind.config.js` 的 `content` 配置
3. 確保 `src/index.css` 包含 `@tailwind` 指令

### 如果組件導入失敗

使用 `@/` 別名：
```tsx
// ✅ 正確
import { Button } from "@/components/ui/button";

// ❌ 錯誤
import { Button } from "./components/ui/button";
```

## 資源

- 📚 [shadcn/ui 文檔](https://ui.shadcn.com)
- 🎨 [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- 🧩 [Radix UI 文檔](https://www.radix-ui.com)
- 🎯 [Lucide Icons](https://lucide.dev)
- 📖 [使用指南](./SHADCN_USAGE.md)

## 總結

✅ 項目已完全配置好 shadcn/ui
✅ 可以使用 CLI 直接安裝組件
✅ 所有路徑別名已配置
✅ 現有組件已更新為現代化設計
✅ 支持亮色/暗色模式

現在你可以開始使用 `npx shadcn@latest add [component]` 來添加任何你需要的組件了！🎉
