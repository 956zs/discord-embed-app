#!/bin/bash

# 測試管理員檢查功能

GUILD_ID="1320005222688624713"
USER_ID="586502118530351114"
API_URL="http://localhost:3008"

echo "🧪 測試管理員檢查功能"
echo "======================="
echo ""
echo "Guild ID: $GUILD_ID"
echo "User ID: $USER_ID"
echo ""

echo "1️⃣ 檢查資料庫中的管理員記錄"
echo "----------------------------"
psql -U nlcat -d discord_stats -c "SELECT * FROM admin_users WHERE guild_id = '$GUILD_ID' AND user_id = '$USER_ID';"
echo ""

echo "2️⃣ 測試 API 端點"
echo "----------------------------"
echo "GET ${API_URL}/api/history/${GUILD_ID}/admins/${USER_ID}/check"
curl -s "${API_URL}/api/history/${GUILD_ID}/admins/${USER_ID}/check" | jq .
echo ""
echo ""

echo "3️⃣ 測試完整 URL（複製到瀏覽器）"
echo "----------------------------"
echo "http://localhost:3000/?guild_id=${GUILD_ID}&user_id=${USER_ID}"
echo ""

echo "4️⃣ 調試頁面 URL"
echo "----------------------------"
echo "http://localhost:3000/debug"
echo ""

echo "✅ 測試完成"
echo ""
echo "💡 提示:"
echo "   - 如果 API 返回 {\"isAdmin\":true}，說明後端正常"
echo "   - 如果前端沒有顯示管理員按鈕，檢查瀏覽器控制台"
echo "   - 打開調試頁面查看詳細信息"
