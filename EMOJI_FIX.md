# Emoji 圖片顯示問題修復

## 問題描述

自定義 emoji 圖片有時會顯示不完整，出現圖片載入失敗的小圖標（broken image icon）。

## 根本原因

1. **動畫 Emoji 檢測錯誤**
   - Bot 在提取自定義 emoji 時，錯誤地檢測動畫 emoji
   - 使用 `message.content.includes("<a:")` 檢查整個訊息，而不是檢查當前 emoji
   - 導致同一訊息中的所有 emoji 都被標記為動畫或非動畫

2. **圖片載入失敗無處理**
   - 前端沒有錯誤處理機制
   - 當 CDN URL 失效或載入失敗時，直接顯示 broken image icon
   - 沒有後備方案

3. **圖片質量參數缺失**
   - CDN URL 沒有指定 size 和 quality 參數
   - 可能導致圖片質量不佳或載入問題

## 解決方案

### 1. 修復 Bot 的 Emoji 提取邏輯

**修改前**：
```javascript
function extractCustomEmojis(message) {
  const customEmojiRegex = /<a?:(\w+):(\d+)>/g;
  const emojis = [];
  let match;

  while ((match = customEmojiRegex.exec(message.content)) !== null) {
    const emojiId = match[2];
    const emojiName = match[1];
    const isAnimated = message.content.includes("<a:"); // ❌ 錯誤：檢查整個訊息
    const extension = isAnimated ? "gif" : "png";

    emojis.push({
      identifier: `${emojiName}:${emojiId}`,
      name: emojiName,
      isCustom: true,
      url: `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`,
    });
  }

  return emojis;
}
```

**修改後**：
```javascript
function extractCustomEmojis(message) {
  const customEmojiRegex = /<(a)?:(\w+):(\d+)>/g; // ✅ 捕獲 'a' 標記
  const emojis = [];
  let match;

  while ((match = customEmojiRegex.exec(message.content)) !== null) {
    const isAnimated = match[1] === "a"; // ✅ 正確：檢查當前 emoji
    const emojiName = match[2];
    const emojiId = match[3];
    const extension = isAnimated ? "gif" : "png";

    // ✅ 添加質量參數
    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=64&quality=lossless`;

    emojis.push({
      identifier: `${emojiName}:${emojiId}`,
      name: emojiName,
      isCustom: true,
      url: url,
    });
  }

  return emojis;
}
```

**改進點**：
- 正確捕獲動畫標記 `<a>` 或 `<:>`
- 為每個 emoji 單獨判斷是否為動畫
- 添加 `size=64` 和 `quality=lossless` 參數提升圖片質量
- 更清晰的變量命名

### 2. 創建 EmojiImage 組件

創建了一個專門處理 emoji 圖片的組件 `client/components/emoji-image.tsx`：

**功能特點**：
- ✅ 載入狀態顯示（骨架屏）
- ✅ 錯誤處理和後備方案
- ✅ 懶加載（lazy loading）
- ✅ 跨域支援（crossOrigin）
- ✅ 友好的錯誤提示

**使用方式**：
```tsx
<EmojiImage
  url={emoji.url}
  name={emoji.name}
  fallback={emoji.emoji || "❓"}
  className="h-6 w-6"
/>
```

**錯誤處理**：
當圖片載入失敗時，顯示：
- 後備 emoji 或文字（如果有提供）
- 灰色背景的佔位符
- 工具提示顯示「圖片載入失敗」

### 3. 更新主頁面使用新組件

**修改前**：
```tsx
{emoji.isCustom && emoji.url ? (
  <img
    src={emoji.url}
    alt={emoji.name}
    className="h-6 w-6"
  />
) : (
  <span className="text-2xl">{emoji.emoji}</span>
)}
```

**修改後**：
```tsx
{emoji.isCustom && emoji.url ? (
  <EmojiImage
    url={emoji.url}
    name={emoji.name}
    fallback={emoji.emoji || "❓"}
    className="h-6 w-6"
  />
) : (
  <span className="text-2xl">{emoji.emoji}</span>
)}
```

## Discord CDN URL 格式

Discord 自定義 emoji 的 CDN URL 格式：

```
https://cdn.discordapp.com/emojis/{emoji_id}.{extension}?size={size}&quality={quality}
```

**參數說明**：
- `emoji_id`: Emoji 的唯一 ID
- `extension`: `png` 或 `gif`（動畫 emoji）
- `size`: 圖片大小（16, 32, 64, 128, 256, 512, 1024, 2048, 4096）
- `quality`: `lossless` 或省略（預設有損壓縮）

**範例**：
- 靜態 emoji: `https://cdn.discordapp.com/emojis/123456789.png?size=64&quality=lossless`
- 動畫 emoji: `https://cdn.discordapp.com/emojis/987654321.gif?size=64&quality=lossless`

## 測試步驟

### 1. 測試新訊息的 Emoji

1. 在 Discord 伺服器中發送包含多個自定義 emoji 的訊息
2. 混合使用靜態和動畫 emoji
3. 檢查資料庫中的 `emoji_usage` 表
4. 驗證 `emoji_url` 欄位是否正確

**測試 SQL**：
```sql
SELECT 
  emoji_name,
  emoji_url,
  is_custom,
  COUNT(*) as usage_count
FROM emoji_usage
WHERE guild_id = 'YOUR_GUILD_ID'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY emoji_name, emoji_url, is_custom
ORDER BY usage_count DESC;
```

### 2. 測試前端顯示

1. 打開應用的表情符號統計頁面
2. 檢查自定義 emoji 是否正確顯示
3. 使用瀏覽器開發者工具檢查：
   - 圖片 URL 是否正確
   - 是否有載入錯誤
   - 錯誤處理是否生效

### 3. 測試錯誤處理

1. 手動修改資料庫中的 emoji URL 為無效 URL
2. 刷新頁面
3. 驗證是否顯示後備 emoji 而不是 broken image icon

## 已知限制

1. **已存在的錯誤數據**
   - 修復只影響新收集的 emoji
   - 歷史數據中的錯誤 URL 需要手動修復或重新提取

2. **CDN 可用性**
   - 如果 Discord CDN 暫時不可用，圖片仍會載入失敗
   - 但會顯示友好的後備方案而不是 broken image

3. **刪除的 Emoji**
   - 如果伺服器刪除了某個自定義 emoji，其 CDN URL 會失效
   - 應用會顯示後備方案

## 數據庫清理（可選）

如果想清理歷史錯誤數據，可以執行：

```sql
-- 查看可能有問題的 emoji URL
SELECT 
  emoji_name,
  emoji_url,
  COUNT(*) as count
FROM emoji_usage
WHERE is_custom = true
  AND emoji_url NOT LIKE '%?size=%'
GROUP BY emoji_name, emoji_url
ORDER BY count DESC;

-- 如果需要，可以刪除舊數據並重新提取
-- DELETE FROM emoji_usage WHERE guild_id = 'YOUR_GUILD_ID';
```

## 相關文件

- `bot/handlers/messageHandler.js` - Emoji 提取邏輯
- `client/components/emoji-image.tsx` - Emoji 圖片組件
- `client/app/page.tsx` - 使用 EmojiImage 組件
- `server/controllers/statsController.js` - Emoji 統計 API

## 未來改進

1. **圖片預載入**：預先載入 emoji 圖片以提升性能
2. **本地緩存**：使用 Service Worker 緩存 emoji 圖片
3. **批量更新**：提供工具批量修復歷史數據中的 emoji URL
4. **CDN 代理**：通過自己的服務器代理 Discord CDN，提升可靠性
