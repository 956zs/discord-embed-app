#!/bin/bash

# 腳本重組工具
# 將根目錄的腳本整理到 scripts/ 目錄

echo "📁 開始整理腳本文件..."

# 創建目錄
mkdir -p scripts/utils
mkdir -p scripts/archive

echo ""
echo "📋 腳本分類："
echo ""

# 核心管理腳本（保留在根目錄）
echo "✅ 核心管理腳本（保留在根目錄）："
echo "  - deploy.sh          (部署腳本)"
echo "  - manage.sh          (管理腳本)"
echo "  - update.sh          (更新腳本)"
echo "  - setup-env.sh       (環境配置腳本)"
echo ""

# 工具腳本（移動到 scripts/utils/）
echo "📦 移動工具腳本到 scripts/utils/..."
mv check-oauth-config.sh scripts/utils/ 2>/dev/null && echo "  ✅ check-oauth-config.sh"
mv troubleshoot.sh scripts/utils/ 2>/dev/null && echo "  ✅ troubleshoot.sh"
mv reorganize-docs.sh scripts/utils/ 2>/dev/null && echo "  ✅ reorganize-docs.sh"

# 過時腳本（移動到 scripts/archive/）
echo "📦 移動過時腳本到 scripts/archive/..."
mv restart-production.sh scripts/archive/ 2>/dev/null && echo "  ✅ restart-production.sh (已被 manage.sh restart-prod 取代)"

echo ""
echo "✅ 腳本整理完成！"
echo ""
echo "📁 腳本結構："
echo "  根目錄（核心腳本）："
echo "    ├── deploy.sh              # 一鍵部署"
echo "    ├── manage.sh              # 服務管理"
echo "    ├── update.sh              # 快速更新"
echo "    └── setup-env.sh           # 環境配置"
echo ""
echo "  scripts/"
echo "    ├── pm2-utils.sh           # PM2 安全操作函數"
echo "    ├── utils/                 # 工具腳本"
echo "    │   ├── check-oauth-config.sh"
echo "    │   ├── troubleshoot.sh"
echo "    │   └── reorganize-docs.sh"
echo "    └── archive/               # 過時腳本"
echo "        └── restart-production.sh"
echo ""
echo "💡 使用說明："
echo "  核心腳本：直接在根目錄執行"
echo "    ./deploy.sh"
echo "    ./manage.sh start"
echo "    ./update.sh"
echo ""
echo "  工具腳本：使用完整路徑執行"
echo "    ./scripts/utils/check-oauth-config.sh"
echo "    ./scripts/utils/troubleshoot.sh"
