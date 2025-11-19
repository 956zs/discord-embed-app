# 過時腳本存檔

本目錄包含已被新腳本或功能取代的過時腳本，保留作為參考。

## 📦 存檔腳本

### restart-production.sh
舊的生產環境重啟腳本。

**原功能**：
- 重啟生產環境服務
- 重新載入配置

**已被取代**：
現在使用 `manage.sh restart-prod` 命令，提供更完整的功能和更好的錯誤處理。

**替代命令**：
```bash
# 舊方式（已廢棄）
./restart-production.sh

# 新方式（推薦）
./manage.sh restart-prod
```

**新方式的優勢**：
- ✅ 使用 PM2 安全操作函數
- ✅ 只操作 Discord 應用進程
- ✅ 更好的錯誤處理和日誌
- ✅ 支援進程模式切換
- ✅ 統一的管理接口

## 🔄 遷移指南

如果你的腳本或文檔中引用了這些過時腳本，請更新為新的命令：

### restart-production.sh → manage.sh restart-prod

**舊方式**：
```bash
./restart-production.sh
```

**新方式**：
```bash
./manage.sh restart-prod
```

**功能對比**：

| 功能 | 舊腳本 | 新命令 |
|------|--------|--------|
| 重啟服務 | ✅ | ✅ |
| 重新載入配置 | ✅ | ✅ |
| PM2 安全操作 | ❌ | ✅ |
| 進程模式支援 | ❌ | ✅ |
| 錯誤處理 | 基本 | 完整 |
| 日誌記錄 | 基本 | 詳細 |

## 📚 當前腳本

請使用以下最新腳本：

### 核心管理腳本（根目錄）
- [deploy.sh](../../deploy.sh) - 一鍵部署
- [manage.sh](../../manage.sh) - 服務管理
- [update.sh](../../update.sh) - 快速更新
- [setup-env.sh](../../setup-env.sh) - 環境配置

### 工具腳本（scripts/utils/）
- [check-oauth-config.sh](../utils/check-oauth-config.sh) - OAuth 配置檢查
- [troubleshoot.sh](../utils/troubleshoot.sh) - 故障排除工具

### PM2 工具函數
- [pm2-utils.sh](../pm2-utils.sh) - PM2 安全操作函數庫

## 📖 相關文檔

- [腳本目錄說明](../README.md)
- [完整部署指南](../../COMPLETE_DEPLOYMENT_GUIDE.md)
- [快速參考](../../QUICK_REFERENCE.md)
- [PM2 安全操作](../../docs/PM2_SAFETY.md)

---

**注意**：本目錄的腳本僅供參考，可能包含過時代碼。請優先使用上述最新腳本。
