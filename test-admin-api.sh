#!/bin/bash

# 測試管理員 API 端點

GUILD_ID="1320005222688624713"
USER_ID="586502118530351114"
API_URL="http://localhost:3008"

echo "🧪 測試管理員 API"
echo "=================="
echo ""

echo "1️⃣ 測試檢查管理員狀態"
echo "GET ${API_URL}/api/history/${GUILD_ID}/admins/${USER_ID}/check"
curl -s "${API_URL}/api/history/${GUILD_ID}/admins/${USER_ID}/check" | jq .
echo ""
echo ""

echo "2️⃣ 測試獲取管理員列表"
echo "GET ${API_URL}/api/history/${GUILD_ID}/admins"
curl -s "${API_URL}/api/history/${GUILD_ID}/admins" | jq .
echo ""
echo ""

echo "3️⃣ 測試獲取提取摘要"
echo "GET ${API_URL}/api/history/${GUILD_ID}/summary"
curl -s "${API_URL}/api/history/${GUILD_ID}/summary" | jq .
echo ""
echo ""

echo "✅ 測試完成"
