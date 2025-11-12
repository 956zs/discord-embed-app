#!/bin/bash

echo "🚀 啟動所有服務"
echo "================"
echo ""

# 檢查是否已安裝 PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 未安裝"
    echo "   安裝: npm install -g pm2"
    echo ""
    echo "或者手動啟動服務:"
    echo "   終端 1: cd bot && node index.js"
    echo "   終端 2: cd server && node index.js"
    echo "   終端 3: cd client && npm run dev"
    exit 1
fi

echo "1️⃣ 停止現有服務..."
pm2 delete all 2>/dev/null || true

echo ""
echo "2️⃣ 啟動 Bot..."
cd bot
pm2 start index.js --name discord-bot
cd ..

echo ""
echo "3️⃣ 等待 Bot 初始化..."
sleep 3

echo ""
echo "4️⃣ 啟動 API Server..."
cd server
pm2 start index.js --name discord-api
cd ..

echo ""
echo "5️⃣ 等待 Server 連接到 Bot..."
sleep 2

echo ""
echo "6️⃣ 啟動 Client (開發模式)..."
cd client
pm2 start npm --name discord-client -- run dev
cd ..

echo ""
echo "✅ 所有服務已啟動"
echo ""
echo "📊 查看狀態:"
echo "   pm2 status"
echo ""
echo "📝 查看日誌:"
echo "   pm2 logs"
echo "   pm2 logs discord-bot"
echo "   pm2 logs discord-api"
echo "   pm2 logs discord-client"
echo ""
echo "🛑 停止服務:"
echo "   pm2 stop all"
echo "   pm2 delete all"
echo ""
echo "🌐 訪問應用:"
echo "   http://localhost:3000"
echo ""

pm2 status
