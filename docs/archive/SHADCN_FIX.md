# shadcn/ui 依賴衝突修復

## 問題

安裝 shadcn/ui 組件時遇到依賴衝突：

```
npm error Could not resolve dependency:
npm error peer react@"^16.13.0" from react-wordcloud@1.2.7
npm error Conflicting peer dependency: react@16.14.0
```

## 原因

`react-wordcloud` 包只支援 React 16，與項目使用的 React 18 不兼容。

## 解決方案

### 1. 移除不兼容的包

```bash
cd client
npm uninstall react-wordcloud d3-cloud @types/d3-cloud --legacy-peer-deps
```

### 2. 配置 npm 使用 legacy-peer-deps

創建 `client/.npmrc` 文件：

```
legacy-peer-deps=true
```

這樣 npm 會自動使用 `--legacy-peer-deps` 標誌。

### 3. 重寫 KeywordCloud 組件

使用純 CSS 和 Tailwind 實現詞雲效果，不依賴外部庫：

```tsx
// 使用字體大小和顏色來表示詞頻
<span
  style={{ fontSize: `${getFontSize(word.value)}px` }}
  className="text-blue-500 hover:scale-110"
>
  {word.text}
</span>
```

## 現在可以正常使用 shadcn/ui

```bash
# 安裝組件
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add skeleton

# 已成功安裝
✅ button
✅ badge
✅ skeleton
```

## 已安裝的組件

- `card` - 卡片組件
- `tabs` - 標籤頁組件
- `separator` - 分隔線組件
- `button` - 按鈕組件
- `badge` - 徽章組件
- `skeleton` - 骨架屏組件

## 使用示例

### Button

```tsx
import { Button } from "@/components/ui/button";

<Button>點擊我</Button>
<Button variant="outline">輪廓按鈕</Button>
<Button variant="ghost">幽靈按鈕</Button>
<Button size="sm">小按鈕</Button>
<Button size="lg">大按鈕</Button>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>默認</Badge>
<Badge variant="secondary">次要</Badge>
<Badge variant="destructive">危險</Badge>
<Badge variant="outline">輪廓</Badge>
```

### Skeleton

```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-[200px] w-full" />
```

## 推薦安裝的組件

```bash
# 基礎組件
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add textarea

# 反饋組件
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add progress

# 佈局組件
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet

# 數據展示
npx shadcn@latest add avatar
npx shadcn@latest add table
```

## 注意事項

1. **始終使用 `@/` 別名導入組件**
   ```tsx
   import { Button } from "@/components/ui/button";
   ```

2. **`.npmrc` 文件已配置**
   - 不需要手動添加 `--legacy-peer-deps`
   - npm 會自動使用這個標誌

3. **KeywordCloud 組件已重寫**
   - 不再依賴 `react-wordcloud`
   - 使用純 CSS 實現
   - 性能更好，體積更小

## 測試

```bash
# 構建測試
cd client
npm run build

# 開發服務器
npm run dev
```

## 總結

✅ 移除了不兼容的 `react-wordcloud` 包
✅ 配置了 `.npmrc` 使用 legacy-peer-deps
✅ 重寫了 KeywordCloud 組件
✅ 成功安裝了 shadcn/ui 組件
✅ 所有組件都可以正常使用

現在你可以自由安裝任何 shadcn/ui 組件了！🎉
