# 管理員分頁不顯示 - 調試指南

## 問題描述
在 Discord 伺服器中打開應用時，管理員分頁沒有顯示。

## 調試步驟

### 步驟 1: 檢查開發模式設置

確認 `client/.env.local` 中的設置：
```bash
NEXT_PUBLIC_ENABLE_DEV_MODE=false  # 生產模式
# 或
NEXT_PUBLIC_ENABLE_DEV_MODE=true   # 開發模式
```

### 步驟 2: 訪問調試頁面

打開瀏覽器訪問：
```
http://localhost:3000/debug
```

這個頁面會顯示：
- 環境變數
- Guild ID 和 User ID
- 管理員狀態
- API 響應

### 步驟 3: 檢查主頁面的調試信息

1. 打開主頁 `http://localhost:3000/`
2. 在頁面頂部會看到一個調試面板（開發模式下）
3. 檢查顯示的信息：
   - Guild ID: 應該顯示你的伺服器 ID
   - User ID: 應該顯示你的用戶 ID
   - Username: 應該顯示你的用戶名
   - Is Admin: 應該顯示 ✅ 是

### 步驟 4: 檢查瀏覽器控制台

1. 按 F12 打開開發者工具
2. 切換到 Console 標籤
3. 查找以下日誌：

**開發模式應該看到：**
```
🔧 開發模式: { gid: "1320005222688624713", uid: "586502118530351114", username: "Dev User" }
🔍 開始檢查管理員權限: { gid: "...", uid: "..." }
📡 發送管理員檢查請求: { gid: "...", uid: "..." }
✅ 管理員檢查響應: { isAdmin: true }
🎉 用戶是管理員！
```

**生產模式應該看到：**
```
📱 Discord SDK: { gid: "...", uid: "...", username: "..." }
🔍 開始檢查管理員權限: { gid: "...", uid: "..." }
📡 發送管理員檢查請求: { gid: "...", uid: "..." }
✅ 管理員檢查響應: { isAdmin: true }
🎉 用戶是管理員！
```

### 步驟 5: 檢查 API 端點

在終端運行：
```bash
curl "http://localhost:3008/api/history/1320005222688624713/admins/586502118530351114/check"
```

應該返回：
```json
{"isAdmin":true}
```

### 步驟 6: 檢查資料庫

在 PostgreSQL 中執行：
```sql
SELECT * FROM admin_users 
WHERE guild_id = '1320005222688624713' 
  AND user_id = '586502118530351114';
```

應該返回一條記錄。

## 常見問題

### 問題 1: User ID 顯示為 ❌

**原因：** Discord SDK 沒有正確獲取用戶 ID

**解決方案：**
1. 確認應用在 Discord 中運行（不是直接訪問 localhost）
2. 檢查 Discord Developer Portal 的 OAuth2 設置
3. 確認應用有正確的權限範圍（scopes）

**臨時解決方案（開發模式）：**
```bash
# 在 client/.env.local 中設置
NEXT_PUBLIC_ENABLE_DEV_MODE=true
NEXT_PUBLIC_DEV_USER_ID=你的用戶ID
```

### 問題 2: API 返回 isAdmin: false

**原因：** 資料庫中沒有管理員記錄

**解決方案：**
```sql
INSERT INTO admin_users (guild_id, user_id, username, granted_by)
VALUES ('你的GUILD_ID', '你的USER_ID', '你的用戶名', 'system')
ON CONFLICT (guild_id, user_id) DO NOTHING;
```

### 問題 3: 控制台顯示 CORS 錯誤

**原因：** API 服務器的 CORS 配置問題

**解決方案：**
檢查 `server/index.js` 中的 CORS 配置是否包含你的域名。

### 問題 4: 管理員按鈕不顯示但 isAdmin 為 true

**原因：** React 狀態更新問題或 CSS 問題

**解決方案：**
1. 檢查瀏覽器控制台是否有錯誤
2. 檢查 Network 標籤確認 API 請求成功
3. 嘗試刷新頁面
4. 清除瀏覽器緩存

## 測試用 URL

### 開發模式（直接訪問）
```
http://localhost:3000/
```

### 模擬生產模式（帶參數）
```
http://localhost:3000/?guild_id=1320005222688624713&user_id=586502118530351114
```

### 調試頁面
```
http://localhost:3000/debug
```

## 檢查清單

- [ ] 資料庫中有管理員記錄
- [ ] API 端點返回 `{"isAdmin":true}`
- [ ] 瀏覽器控制台顯示 "🎉 用戶是管理員！"
- [ ] 頁面左上角顯示 "Hi, {username}" 和管理員徽章
- [ ] 導航欄顯示「管理員」按鈕
- [ ] 點擊「管理員」按鈕可以進入 `/admin` 頁面

## 獲取幫助

如果以上步驟都無法解決問題，請提供：

1. 瀏覽器控制台的完整日誌（Console 標籤）
2. Network 標籤中 API 請求的詳細信息
3. 調試頁面的截圖
4. 資料庫查詢結果

這些信息將幫助快速定位問題。
