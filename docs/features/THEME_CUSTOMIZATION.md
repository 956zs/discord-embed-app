# shadcn/ui 主題自定義指南

## 主題配置位置

所有主題配置都在 **`client/src/index.css`** 文件中。

## 顏色系統

shadcn/ui 使用 HSL 顏色格式：`H S% L%`
- **H** (Hue): 色相 (0-360)
- **S** (Saturation): 飽和度 (0-100%)
- **L** (Lightness): 亮度 (0-100%)

## 主要顏色變量

### 1. 主色調 (Primary)
```css
--primary: 221.2 83.2% 53.3%;  /* 藍色 */
```

**常用顏色參考**：
- 藍色: `221.2 83.2% 53.3%`
- 紫色: `262.1 83.3% 57.8%`
- 綠色: `142.1 76.2% 36.3%`
- 橙色: `24.6 95% 53.1%`
- 紅色: `0 84.2% 60.2%`
- 粉色: `330 81% 60%`

### 2. 背景色 (Background)
```css
--background: 0 0% 100%;  /* 白色 */
```

### 3. 卡片背景 (Card)
```css
--card: 0 0% 100%;  /* 白色 */
```

### 4. 次要色 (Secondary)
```css
--secondary: 210 40% 96.1%;  /* 淺灰藍 */
```

### 5. 柔和色 (Muted)
```css
--muted: 210 40% 96.1%;  /* 淺灰 */
```

### 6. 強調色 (Accent)
```css
--accent: 210 40% 96.1%;  /* 淺灰藍 */
```

### 7. 邊框 (Border)
```css
--border: 214.3 31.8% 91.4%;  /* 淺灰 */
```

### 8. 圓角 (Radius)
```css
--radius: 0.5rem;  /* 8px */
```

**圓角選項**：
- 無圓角: `0rem`
- 小圓角: `0.3rem`
- 中圓角: `0.5rem` (默認)
- 大圓角: `0.75rem`
- 超大圓角: `1rem`

## 快速主題預設

### 主題 1: 紫色主題
```css
:root {
  --primary: 262.1 83.3% 57.8%;  /* 紫色 */
  --primary-foreground: 210 40% 98%;
}
```

### 主題 2: 綠色主題
```css
:root {
  --primary: 142.1 76.2% 36.3%;  /* 綠色 */
  --primary-foreground: 355.7 100% 97.3%;
}
```

### 主題 3: 橙色主題
```css
:root {
  --primary: 24.6 95% 53.1%;  /* 橙色 */
  --primary-foreground: 60 9.1% 97.8%;
}
```

### 主題 4: 粉色主題
```css
:root {
  --primary: 330 81% 60%;  /* 粉色 */
  --primary-foreground: 210 40% 98%;
}
```

### 主題 5: 深色優雅主題
```css
:root {
  --primary: 217.2 91.2% 59.8%;  /* 亮藍色 */
  --background: 222.2 84% 4.9%;  /* 深色背景 */
  --foreground: 210 40% 98%;  /* 淺色文字 */
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
}
```

## 啟用暗色模式

### 方法 1: 在 HTML 添加 dark 類
編輯 `client/index.html`：
```html
<html lang="zh-TW" class="dark">
```

### 方法 2: 動態切換
創建主題切換組件：

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
```

## 自定義範例

### 範例 1: Discord 風格
```css
:root {
  --primary: 235 85.6% 64.7%;  /* Discord 藍紫色 */
  --background: 0 0% 100%;
  --card: 0 0% 100%;
  --radius: 0.5rem;
}

.dark {
  --background: 223 6.7% 20.6%;  /* Discord 深灰 */
  --card: 220 6.5% 18%;
  --primary: 235 85.6% 64.7%;
}
```

### 範例 2: 柔和粉彩
```css
:root {
  --primary: 340 82% 52%;  /* 粉紅色 */
  --secondary: 291 47% 51%;  /* 淡紫色 */
  --accent: 199 89% 48%;  /* 天藍色 */
  --background: 0 0% 98%;  /* 淺灰白 */
  --radius: 1rem;  /* 大圓角 */
}
```

### 範例 3: 專業商務
```css
:root {
  --primary: 222.2 47.4% 11.2%;  /* 深藍灰 */
  --secondary: 210 40% 96.1%;
  --background: 0 0% 100%;
  --radius: 0.3rem;  /* 小圓角 */
}
```

## 使用 shadcn/ui 主題生成器

訪問 [shadcn/ui Themes](https://ui.shadcn.com/themes) 可以：
1. 可視化選擇顏色
2. 預覽效果
3. 複製生成的 CSS 變量
4. 直接貼到 `client/src/index.css`

## 修改步驟

1. **打開配置文件**
   ```bash
   # 編輯主題配置
   code client/src/index.css
   ```

2. **修改顏色變量**
   在 `:root` 區塊中修改你想要的顏色

3. **保存文件**
   Vite 會自動熱重載，立即看到效果

4. **如果需要暗色模式**
   同時修改 `.dark` 區塊中的變量

## 常見問題

### Q: 如何找到合適的 HSL 值？
A: 使用在線工具：
- [HSL Color Picker](https://hslpicker.com/)
- [Coolors](https://coolors.co/)
- Chrome DevTools 的顏色選擇器

### Q: 修改後沒有效果？
A: 
1. 確保保存了文件
2. 清除瀏覽器緩存 (Ctrl+Shift+R)
3. 檢查開發服務器是否運行

### Q: 如何只改變主色調？
A: 只需修改 `--primary` 變量：
```css
:root {
  --primary: 你的顏色;
}
```

### Q: 如何讓圓角更圓？
A: 修改 `--radius` 變量：
```css
:root {
  --radius: 1rem;  /* 更大的圓角 */
}
```

## 推薦配色方案

### 科技感
```css
--primary: 199 89% 48%;  /* 青色 */
--accent: 142 71% 45%;   /* 綠色 */
```

### 溫暖感
```css
--primary: 24.6 95% 53.1%;  /* 橙色 */
--accent: 45 93% 47%;       /* 黃色 */
```

### 優雅感
```css
--primary: 262.1 83.3% 57.8%;  /* 紫色 */
--accent: 280 65% 60%;         /* 淡紫色 */
```

### 專業感
```css
--primary: 222.2 47.4% 11.2%;  /* 深藍灰 */
--accent: 215 20.2% 65.1%;     /* 灰藍色 */
```

## 測試你的主題

修改後，檢查以下元素：
- ✅ 按鈕顏色
- ✅ 卡片背景
- ✅ 導航菜單
- ✅ 表單輸入框
- ✅ 懸停效果
- ✅ 文字對比度

## 資源

- [shadcn/ui Themes](https://ui.shadcn.com/themes)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [HSL Color Picker](https://hslpicker.com/)
- [Coolors Generator](https://coolors.co/)

開始自定義你的主題吧！🎨
