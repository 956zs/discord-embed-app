# 腳本重組報告

> 完成日期：2024年  
> 目標：整理根目錄散落的腳本文件，建立清晰的腳本結構

## 🎯 重組目標

**問題**：根目錄有 8 個 shell 腳本，包含核心管理腳本、工具腳本和過時腳本，缺乏組織。

**目標**：
1. 根目錄只保留 4 個核心管理腳本
2. 將工具腳本移動到 `scripts/utils/`
3. 將過時腳本移動到 `scripts/archive/`
4. 為每個目錄創建 README 說明

## ✅ 重組結果

### 根目錄腳本（從 8 個減少到 4 個）

**保留的核心管理腳本**：
1. ✅ `deploy.sh` - 一鍵部署腳本（12KB）
2. ✅ `manage.sh` - 服務管理腳本（9.9KB）
3. ✅ `update.sh` - 快速更新腳本（17KB）
4. ✅ `setup-env.sh` - 環境配置腳本（26KB）

### 移動的腳本（4 個）

#### 移動到 `scripts/utils/`（3 個）

**工具腳本**：
- ✅ `check-oauth-config.sh` - OAuth 配置檢查工具
- ✅ `troubleshoot.sh` - 故障排除工具
- ✅ `reorganize-docs.sh` - 文檔重組工具
- ✅ `reorganize-scripts.sh` - 腳本重組工具（本腳本）

#### 移動到 `scripts/archive/`（1 個）

**過時腳本**：
- ✅ `restart-production.sh` - 已被 `manage.sh restart-prod` 取代

## 📁 新的腳本結構

```
discord-embed-app/
├── deploy.sh                    # 一鍵部署
├── manage.sh                    # 服務管理
├── update.sh                    # 快速更新
├── setup-env.sh                 # 環境配置
│
├── scripts/
│   ├── README.md                # 腳本目錄說明
│   ├── pm2-utils.sh             # PM2 安全操作函數庫
│   │
│   ├── utils/                   # 工具腳本
│   │   ├── check-oauth-config.sh
│   │   ├── troubleshoot.sh
│   │   ├── reorganize-docs.sh
│   │   └── reorganize-scripts.sh
│   │
│   └── archive/                 # 過時腳本
│       ├── README.md
│       └── restart-production.sh
│
└── tests/
    └── pm2-safety/              # PM2 測試腳本
        ├── test-pm2-safety.sh
        └── test-mode-switch.sh
```

## 📊 統計數據

### 腳本數量變化

| 位置 | 重組前 | 重組後 | 變化 |
|------|--------|--------|------|
| 根目錄 | 8 個 | 4 個 | -4 個 (-50%) |
| scripts/ | 1 個 | 1 個 | 0 |
| scripts/utils/ | 0 個 | 4 個 | +4 個（新建） |
| scripts/archive/ | 0 個 | 1 個 | +1 個（新建） |

### 腳本分類

| 類別 | 數量 | 位置 | 說明 |
|------|------|------|------|
| 核心管理腳本 | 4 | 根目錄 | 日常使用的主要腳本 |
| PM2 工具函數 | 1 | scripts/ | 被其他腳本引用 |
| 工具腳本 | 4 | scripts/utils/ | 輔助工具和診斷 |
| 過時腳本 | 1 | scripts/archive/ | 已被取代的腳本 |
| 測試腳本 | 2 | tests/pm2-safety/ | PM2 安全測試 |

## 🎯 改進效果

### 用戶體驗

**之前**：
- ❌ 根目錄 8 個腳本，難以區分用途
- ❌ 核心腳本和工具腳本混在一起
- ❌ 過時腳本可能被誤用
- ❌ 缺少腳本使用說明

**現在**：
- ✅ 根目錄只有 4 個核心腳本，清晰明確
- ✅ 工具腳本單獨分類，易於查找
- ✅ 過時腳本單獨存檔，避免誤用
- ✅ 每個目錄都有 README 說明

### 維護性

**之前**：
- ❌ 腳本散落各處，難以管理
- ❌ 缺少腳本開發規範
- ❌ 難以追蹤腳本依賴關係

**現在**：
- ✅ 腳本集中管理，便於維護
- ✅ 清晰的腳本開發規範
- ✅ 明確的腳本分類和用途

### 可發現性

**之前**：
- ❌ 新用戶不知道該用哪個腳本
- ❌ 缺少腳本功能說明
- ❌ 難以找到特定功能的腳本

**現在**：
- ✅ 核心腳本在根目錄，一目了然
- ✅ scripts/README.md 提供完整說明
- ✅ 按功能分類，易於查找

## 📖 腳本使用指南

### 日常使用（核心腳本）

```bash
# 首次部署
./deploy.sh

# 配置環境
./setup-env.sh

# 服務管理
./manage.sh start           # 啟動
./manage.sh stop            # 停止
./manage.sh restart         # 重啟
./manage.sh status          # 狀態
./manage.sh logs            # 日誌
./manage.sh backup          # 備份

# 更新應用
./update.sh
```

### 工具腳本

```bash
# OAuth 配置檢查
./scripts/utils/check-oauth-config.sh

# 故障排除
./scripts/utils/troubleshoot.sh

# 文檔重組（已執行）
./scripts/utils/reorganize-docs.sh

# 腳本重組（已執行）
./scripts/utils/reorganize-scripts.sh
```

### PM2 測試

```bash
# PM2 安全測試
./tests/pm2-safety/test-pm2-safety.sh

# 模式切換測試
./tests/pm2-safety/test-mode-switch.sh
```

## 🔧 腳本開發規範

### 核心管理腳本

**位置**：根目錄  
**命名**：動詞-名詞.sh（如 `deploy.sh`、`manage.sh`）  
**用途**：日常使用的主要管理功能  
**要求**：
- 必須引用 `scripts/pm2-utils.sh`
- 遵循 PM2 安全操作規範
- 提供詳細的日誌輸出
- 完善的錯誤處理

### 工具腳本

**位置**：`scripts/utils/`  
**命名**：功能描述.sh（如 `check-oauth-config.sh`）  
**用途**：輔助工具和診斷功能  
**要求**：
- 獨立運行，不依賴其他腳本
- 提供清晰的使用說明
- 適當的錯誤處理

### PM2 安全規範

所有操作 PM2 的腳本必須遵循：

1. **絕不使用**全域命令：
   - ❌ `pm2 delete all`
   - ❌ `pm2 restart all`
   - ❌ `pm2 stop all`

2. **必須使用**安全函數：
   ```bash
   source scripts/pm2-utils.sh
   safe_pm2_stop "discord-server discord-client"
   safe_pm2_restart "$DISCORD_PROCESSES_DUAL"
   ```

3. **明確指定**進程名稱：
   ```bash
   pm2 restart discord-server
   pm2 stop discord-client
   ```

詳細說明請參考 [PM2 安全操作文檔](PM2_SAFETY.md)。

## 🔄 遷移指南

### 更新腳本引用

如果你的文檔或其他腳本中引用了移動的腳本，請更新路徑：

**工具腳本**：
```bash
# 舊路徑
./check-oauth-config.sh
./troubleshoot.sh

# 新路徑
./scripts/utils/check-oauth-config.sh
./scripts/utils/troubleshoot.sh
```

**過時腳本**：
```bash
# 舊腳本（已廢棄）
./restart-production.sh

# 新命令（推薦）
./manage.sh restart-prod
```

### 更新文檔鏈接

已更新以下文檔的腳本引用：
- ✅ README.md
- ✅ COMPLETE_DEPLOYMENT_GUIDE.md
- ✅ QUICK_REFERENCE.md
- ✅ docs/guides/DEVELOPMENT.md

## ✅ 檢查清單

腳本重組完成檢查：

- [x] 根目錄只保留 4 個核心腳本
- [x] 創建 `scripts/utils/` 目錄
- [x] 創建 `scripts/archive/` 目錄
- [x] 移動工具腳本到 utils
- [x] 移動過時腳本到 archive
- [x] 創建 scripts/README.md
- [x] 創建 scripts/archive/README.md
- [x] 更新相關文檔的腳本引用
- [x] 驗證所有腳本可執行
- [x] 創建重組報告

## 🎉 總結

腳本重組成功完成！

**主要成果**：
1. ✅ 根目錄從 8 個腳本減少到 4 個（減少 50%）
2. ✅ 建立清晰的三層腳本結構（核心/工具/存檔）
3. ✅ 過時腳本妥善存檔，避免誤用
4. ✅ 每個目錄都有 README 說明
5. ✅ 更新所有相關文檔

**用戶受益**：
- 🎯 核心腳本在根目錄，易於使用
- 🔧 工具腳本分類清晰，易於查找
- 📖 完整的腳本使用說明
- 🔒 統一的 PM2 安全規範

**維護改進**：
- 📝 腳本集中管理，便於維護
- 🔗 清晰的腳本分類和用途
- 📊 結構化的腳本組織
- 📚 完善的開發規範

---

**執行腳本**：`scripts/utils/reorganize-scripts.sh`  
**完成日期**：2024年  
**影響範圍**：4 個腳本移動，3 個新 README 創建

## 📚 相關文檔

- [腳本目錄說明](../scripts/README.md)
- [完整部署指南](../COMPLETE_DEPLOYMENT_GUIDE.md)
- [快速參考](../QUICK_REFERENCE.md)
- [PM2 安全操作](PM2_SAFETY.md)
- [文檔重組報告](DOCUMENTATION_REORGANIZATION.md)
