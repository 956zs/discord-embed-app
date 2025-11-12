#!/bin/bash

echo "🚀 測試生產模式"
echo "================"
echo ""

# 檢查是否已關閉開發模式
if grep -q "NEXT_PUBLIC_ENABLE_DEV_MODE=true" client/.env.local; then
    echo "⚠️  警告: 開發模式仍然啟用"
    echo "   請將 client/.env.local 中的 NEXT_PUBLIC_ENABLE_DEV_MODE 設為 false"
    echo ""
    read -p "是否自動修改? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sed -i 's/NEXT_PUBLIC_ENABLE_DEV_MODE=true/NEXT_PUBLIC_ENABLE_DEV_MODE=false/' client/.env.local
        echo "✅ 已關閉開發模式"
    else
        exit 1
    fi
fi

echo "1️⃣ 構建 Next.js 應用..."
cd client
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 構建失敗"
    exit 1
fi

echo ""
echo "✅ 構建成功"
echo ""
echo "2️⃣ 啟動生產模式..."
echo ""
echo "📝 注意事項:"
echo "   - Client 將運行在 http://localhost:3000"
echo "   - 需要在 Discord Embedded App 中測試（不能直接訪問 localhost）"
echo "   - 確保 Bot 和 Server 已經在運行"
echo ""
echo "按 Ctrl+C 停止服務"
echo ""

npm start
