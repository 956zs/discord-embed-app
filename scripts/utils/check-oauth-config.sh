#!/bin/bash

# ============================================================================
# Discord OAuth2 配置檢查工具
# ============================================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Discord OAuth2 配置檢查工具                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 讀取環境變數
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}❌ 找不到 .env 文件${NC}"
    exit 1
fi

echo -e "${BLUE}📋 檢查環境配置...${NC}"
echo ""

# 檢查必要的環境變數
MISSING_VARS=0

if [ -z "$DISCORD_CLIENT_ID" ]; then
    echo -e "${RED}❌ DISCORD_CLIENT_ID 未設置${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✅ DISCORD_CLIENT_ID: ${DISCORD_CLIENT_ID}${NC}"
fi

if [ -z "$DISCORD_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ DISCORD_CLIENT_SECRET 未設置${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✅ DISCORD_CLIENT_SECRET: ${DISCORD_CLIENT_SECRET:0:10}...${NC}"
fi

if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo -e "${RED}❌ DISCORD_BOT_TOKEN 未設置${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✅ DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN:0:20}...${NC}"
fi

echo ""

if [ $MISSING_VARS -eq 1 ]; then
    echo -e "${RED}❌ 環境變數配置不完整，請先運行 ./setup-env.sh${NC}"
    exit 1
fi

# 檢查白名單
echo -e "${BLUE}📋 檢查白名單配置...${NC}"
if [ -z "$ALLOWED_GUILD_IDS" ]; then
    echo -e "${YELLOW}⚠️  白名單未設置（允許所有伺服器）${NC}"
    echo -e "${YELLOW}   生產環境建議設置白名單${NC}"
else
    echo -e "${GREEN}✅ 白名單已設置: ${ALLOWED_GUILD_IDS}${NC}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  重要：請確認 Discord Developer Portal 配置${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}1. 前往 Discord Developer Portal:${NC}"
echo -e "   ${CYAN}https://discord.com/developers/applications/${DISCORD_CLIENT_ID}${NC}"
echo ""

echo -e "${BLUE}2. 檢查 OAuth2 設置:${NC}"
echo ""
echo -e "   ${GREEN}✓${NC} 進入 ${CYAN}OAuth2${NC} 頁面"
echo ""
echo -e "   ${GREEN}✓${NC} 在 ${CYAN}Redirects${NC} 部分，確認已添加以下 URL："
echo -e "      ${CYAN}https://discord.com/oauth2/authorized${NC}"
echo ""
echo -e "   ${GREEN}✓${NC} 在 ${CYAN}OAuth2 URL Generator${NC} 部分，確認已選擇以下 Scopes："
echo -e "      ${CYAN}• identify${NC} - 獲取用戶基本信息"
echo -e "      ${CYAN}• guilds${NC} - 獲取用戶所在的伺服器"
echo -e "      ${CYAN}• guilds.members.read${NC} - 讀取伺服器成員信息"
echo ""

echo -e "${BLUE}3. 檢查 Bot 設置:${NC}"
echo ""
echo -e "   ${GREEN}✓${NC} 進入 ${CYAN}Bot${NC} 頁面"
echo ""
echo -e "   ${GREEN}✓${NC} 確認以下 ${CYAN}Privileged Gateway Intents${NC} 已啟用："
echo -e "      ${CYAN}• SERVER MEMBERS INTENT${NC}"
echo -e "      ${CYAN}• MESSAGE CONTENT INTENT${NC}"
echo ""

echo -e "${BLUE}4. 檢查 Installation 設置:${NC}"
echo ""
echo -e "   ${GREEN}✓${NC} 進入 ${CYAN}Installation${NC} 頁面"
echo ""
echo -e "   ${GREEN}✓${NC} 在 ${CYAN}Install Link${NC} 部分，選擇 ${CYAN}Discord Provided Link${NC}"
echo ""
echo -e "   ${GREEN}✓${NC} 在 ${CYAN}Default Install Settings${NC} 部分："
echo -e "      ${CYAN}Guild Install${NC} - 確認已選擇必要的 Scopes 和 Permissions"
echo ""

echo -e "${BLUE}5. 檢查 Embedded App 設置:${NC}"
echo ""
echo -e "   ${GREEN}✓${NC} 進入 ${CYAN}Embedded App SDK${NC} 頁面"
echo ""
echo -e "   ${GREEN}✓${NC} 確認 ${CYAN}Embedded App${NC} 功能已啟用"
echo ""
echo -e "   ${GREEN}✓${NC} 在 ${CYAN}Activity URL Mappings${NC} 部分，添加你的應用 URL"
echo ""

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 配置完成後的測試步驟${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}1. 重啟服務:${NC}"
echo -e "   ${CYAN}npm run dev${NC}"
echo ""

echo -e "${BLUE}2. 在 Discord 中打開 Embedded App${NC}"
echo ""

echo -e "${BLUE}3. 檢查瀏覽器控制台 (F12):${NC}"
echo -e "   應該看到："
echo -e "   ${GREEN}✅ Discord SDK 已就緒${NC}"
echo -e "   ${GREEN}✅ OAuth2 授權成功${NC}"
echo -e "   ${GREEN}✅ 從後端 API 獲取用戶信息成功${NC}"
echo ""

echo -e "${BLUE}4. 如果仍然失敗，查看詳細錯誤:${NC}"
echo -e "   ${CYAN}cat OAUTH2_TROUBLESHOOTING.md${NC}"
echo ""

echo -e "${GREEN}✅ 配置檢查完成！${NC}"
echo ""
