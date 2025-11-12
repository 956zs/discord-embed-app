# 導航問題修復

## 問題描述

從管理員頁面返回主頁時，有時會顯示「載入失敗」錯誤，提示「此應用需要在 Discord 伺服器中開啟」，即使用戶一直在 Discord 伺服器內部。

## 根本原因

1. **頁面重新加載問題**：管理員頁面使用 `window.location.href = "/"` 導致頁面完全重新加載，丟失了 Discord SDK 的上下文和已認證的用戶信息。

2. **SDK 重新初始化**：頁面重新加載後，Discord SDK 需要重新進行 OAuth2 認證，但這個過程可能失敗或超時。

## 解決方案

### 1. 使用 Next.js 客戶端路由

**修改前**：
```tsx
<Button onClick={() => (window.location.href = "/")}>
  返回主頁
</Button>
```

**修改後**：
```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

<Button onClick={() => router.push("/")}>
  返回主頁
</Button>
```

**優點**：
- 使用客戶端路由，不會重新加載頁面
- 保持 Discord SDK 實例和用戶認證狀態
- 更快的導航體驗

### 2. 改進 Discord SDK 單例模式

**改進內容**：
- 添加更詳細的日誌記錄，追蹤 SDK 重用情況
- 在 `getDiscordContext()` 中檢查並重用已初始化的 SDK
- 緩存用戶認證信息，避免重複認證

**關鍵代碼**：
```typescript
export async function initDiscordSdk() {
  if (discordSdk) {
    console.log("♻️ Discord SDK 已經初始化，重用現有實例");
    return discordSdk;
  }
  // ... 初始化邏輯
}

export async function getDiscordContext() {
  if (!discordSdk) {
    console.log("🔄 Discord SDK 未初始化，開始初始化...");
    await initDiscordSdk();
  } else {
    console.log("✅ 使用已初始化的 Discord SDK");
  }
  // ... 獲取上下文
}
```

### 3. 主頁面初始化優化

**改進內容**：
- 在初始化時檢查是否已有 SDK 實例
- 使用已緩存的用戶信息
- 添加更好的錯誤處理和降級策略

**關鍵代碼**：
```typescript
const { getDiscordContext, getDiscordSdk } = await import("@/lib/discord-sdk");

// 檢查是否已經有 SDK 實例
const existingSdk = getDiscordSdk();
if (existingSdk) {
  console.log("♻️ 使用現有的 Discord SDK 實例");
}

const context = await getDiscordContext();
```

## 測試步驟

1. 在 Discord 伺服器中打開應用
2. 導航到管理員頁面
3. 點擊「返回主頁」按鈕
4. 驗證：
   - 頁面應該立即切換，無需重新加載
   - 不應該出現「載入失敗」錯誤
   - 用戶信息和伺服器數據應該正常顯示
   - 瀏覽器控制台應該顯示「使用現有的 Discord SDK 實例」

## 額外優化

### 錯誤處理

如果 Discord SDK 初始化失敗，應用會：
1. 嘗試從 URL 參數獲取 guild_id 和 user_id
2. 在開發模式下，使用環境變數作為後備
3. 顯示友好的錯誤消息

### 日誌記錄

添加了詳細的控制台日誌，方便調試：
- 🚀 初始化開始
- ✅ 成功操作
- ♻️ 重用現有資源
- ⚠️ 警告信息
- ❌ 錯誤信息
- 🔍 調試信息

## 相關文件

- `client/app/admin/page.tsx` - 管理員頁面（使用 useRouter）
- `client/app/page.tsx` - 主頁面（優化初始化）
- `client/lib/discord-sdk.ts` - Discord SDK 封裝（單例模式）

## 注意事項

1. **開發模式**：在開發模式下，如果啟用了 `NEXT_PUBLIC_ENABLE_DEV_MODE=true`，應用會使用環境變數中的 guild_id 和 user_id，不依賴 Discord SDK。

2. **生產環境**：在生產環境中，應用完全依賴 Discord SDK 提供的上下文信息。

3. **瀏覽器兼容性**：Next.js 的 `useRouter` 需要在客戶端組件中使用（標記為 `"use client"`）。

## 未來改進

1. 考慮使用 React Context 或狀態管理庫（如 Zustand）來全局管理 Discord 上下文
2. 添加自動重試機制，當 SDK 初始化失敗時
3. 實現更優雅的加載狀態和錯誤邊界
