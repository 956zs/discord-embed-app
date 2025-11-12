#!/bin/bash

# 測試歷史訊息提取功能

GUILD_ID="1320005222688624713"
USER_ID="586502118530351114"
CHANNEL_ID="1320005222688624716"  # 替換為你的頻道 ID
CHANNEL_NAME="general"
API_URL="http://localhost:3008"

echo "🧪 測試歷史訊息提取功能"
echo "========================="
echo ""

echo "1️⃣ 檢查管理員權限"
echo "----------------------------"
curl -s "${API_URL}/api/history/${GUILD_ID}/admins/${USER_ID}/check" | jq .
echo ""

echo "2️⃣ 檢查提取服務狀態"
echo "----------------------------"
curl -s "${API_URL}/api/fetch/active" | jq .
echo ""

echo "3️⃣ 開始提取任務"
echo "----------------------------"
echo "POST ${API_URL}/api/fetch/${GUILD_ID}/start"
curl -s -X POST "${API_URL}/api/fetch/${GUILD_ID}/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"channelId\": \"${CHANNEL_ID}\",
    \"channelName\": \"${CHANNEL_NAME}\",
    \"anchorMessageId\": \"latest\",
    \"userId\": \"${USER_ID}\"
  }" | jq .
echo ""

echo "4️⃣ 查看任務列表"
echo "----------------------------"
sleep 2
curl -s "${API_URL}/api/history/${GUILD_ID}/tasks" | jq .
echo ""

echo "5️⃣ 查看提取摘要"
echo "----------------------------"
curl -s "${API_URL}/api/history/${GUILD_ID}/summary" | jq .
echo ""

echo "✅ 測試完成"
echo ""
echo "💡 提示:"
echo "   - 如果看到 \"提取服務未就緒\"，請確保 bot 正在運行"
echo "   - 檢查 server 日誌是否顯示 \"✅ 已連接到歷史訊息提取器\""
echo "   - 任務狀態: pending -> running -> completed"
