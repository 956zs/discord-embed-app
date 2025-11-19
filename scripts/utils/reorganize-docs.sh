#!/bin/bash

# 文檔重組腳本
# 將散落的文檔整理到 docs/ 目錄

echo "📁 開始整理文檔..."

# 創建目錄
mkdir -p docs/archive
mkdir -p docs/guides

# 移動舊的部署相關文檔到 archive
echo "📦 移動舊部署文檔到 docs/archive/..."
mv PRODUCTION_UPDATE_GUIDE.md docs/archive/ 2>/dev/null && echo "  ✅ PRODUCTION_UPDATE_GUIDE.md"
mv SETUP.md docs/archive/ 2>/dev/null && echo "  ✅ SETUP.md"
mv DEPLOYMENT_GUIDE.md docs/archive/ 2>/dev/null && echo "  ✅ DEPLOYMENT_GUIDE.md"

# 移動功能實現文檔到 archive
echo "📦 移動功能實現文檔到 docs/archive/..."
mv DATE_RANGE_PICKER_IMPLEMENTATION.md docs/archive/ 2>/dev/null && echo "  ✅ DATE_RANGE_PICKER_IMPLEMENTATION.md"
mv THREAD_NAME_FIX.md docs/archive/ 2>/dev/null && echo "  ✅ THREAD_NAME_FIX.md"
mv MOBILE_OPTIMIZATION.md docs/archive/ 2>/dev/null && echo "  ✅ MOBILE_OPTIMIZATION.md"
mv WELCOME_SYSTEM_GUIDE.md docs/archive/ 2>/dev/null && echo "  ✅ WELCOME_SYSTEM_GUIDE.md"
mv SETUP_ENV_UPDATE.md docs/archive/ 2>/dev/null && echo "  ✅ SETUP_ENV_UPDATE.md"

# 移動專案清理相關文檔到 archive
echo "📦 移動專案清理文檔到 docs/archive/..."
mv PROJECT_CLEANUP_SUMMARY.md docs/archive/ 2>/dev/null && echo "  ✅ PROJECT_CLEANUP_SUMMARY.md"
mv CLEANUP_COMPLETE.md docs/archive/ 2>/dev/null && echo "  ✅ CLEANUP_COMPLETE.md"
mv VERIFICATION_CHECKLIST.md docs/archive/ 2>/dev/null && echo "  ✅ VERIFICATION_CHECKLIST.md"

# 移動配置和開發文檔到 docs/guides
echo "📦 移動指南文檔到 docs/guides/..."
mv CONFIGURATION.md docs/guides/ 2>/dev/null && echo "  ✅ CONFIGURATION.md"
mv DEVELOPMENT.md docs/guides/ 2>/dev/null && echo "  ✅ DEVELOPMENT.md"
mv TROUBLESHOOTING.md docs/guides/ 2>/dev/null && echo "  ✅ TROUBLESHOOTING.md"

# 移動整合報告到 docs/
echo "📦 移動整合報告到 docs/..."
mv DOCUMENTATION_CONSOLIDATION.md docs/ 2>/dev/null && echo "  ✅ DOCUMENTATION_CONSOLIDATION.md"

echo ""
echo "✅ 文檔整理完成！"
echo ""
echo "📋 根目錄保留的核心文檔："
echo "  - README.md                      (專案主頁)"
echo "  - COMPLETE_DEPLOYMENT_GUIDE.md   (完整部署指南)"
echo "  - DEPLOYMENT_SUMMARY.md          (快速部署摘要)"
echo "  - QUICK_REFERENCE.md             (快速參考)"
echo ""
echo "📁 文檔結構："
echo "  docs/"
echo "  ├── guides/                      (使用指南)"
echo "  │   ├── CONFIGURATION.md"
echo "  │   ├── DEVELOPMENT.md"
echo "  │   └── TROUBLESHOOTING.md"
echo "  ├── archive/                     (歷史文檔)"
echo "  │   ├── 舊部署文檔"
echo "  │   ├── 功能實現記錄"
echo "  │   └── 專案清理記錄"
echo "  ├── PM2_SAFETY.md"
echo "  ├── MONITORING.md"
echo "  ├── ENVIRONMENT_VARIABLES.md"
echo "  ├── THREAD_SUPPORT.md"
echo "  └── DOCUMENTATION_CONSOLIDATION.md"
