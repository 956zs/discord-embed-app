#!/bin/bash

# ============================================================================
# Discord Stats App - Project Cleanup Script
# ============================================================================
# This script helps organize and clean up the project structure
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}======================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================================================${NC}"
}

# ============================================================================
# 1. Check for old/duplicate documentation
# ============================================================================
log_section "Step 1: Checking Documentation"

OLD_DOCS=(
    "BOT_CONNECTION_FIX.md"
    "CHANNEL_FETCH_FIX.md"
    "DATABASE_UPDATE_COMPLETE.md"
    "DEBUG_ADMIN_ISSUE.md"
    "EMOJI_FIX.md"
    "FINAL_SETUP_SUMMARY.md"
    "FIXES_SUMMARY.md"
    "NAVIGATION_FIX.md"
    "SHADCN_FIX.md"
    "SHADCN_SETUP_COMPLETE.md"
    "UI_MIGRATION_SUMMARY.md"
)

log_info "Found old documentation files that can be archived:"
FOUND_OLD_DOCS=0
for doc in "${OLD_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  - $doc"
        FOUND_OLD_DOCS=1
    fi
done

if [ $FOUND_OLD_DOCS -eq 1 ]; then
    echo ""
    read -p "Move these files to docs/archive/? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p docs/archive
        for doc in "${OLD_DOCS[@]}"; do
            if [ -f "$doc" ]; then
                mv "$doc" "docs/archive/"
                log_success "Moved $doc to docs/archive/"
            fi
        done
    else
        log_info "Skipped archiving old docs"
    fi
else
    log_success "No old documentation files found"
fi

# ============================================================================
# 2. Organize documentation
# ============================================================================
log_section "Step 2: Organizing Documentation"

MAIN_DOCS=(
    "README.md"
    "SETUP.md"
    "CONFIGURATION.md"
    "DEVELOPMENT.md"
    "TROUBLESHOOTING.md"
)

DEPLOYMENT_DOCS=(
    "DEPLOYMENT_GUIDE.md"
    "PRODUCTION_ARCHITECTURE.md"
    "PRODUCTION_DEPLOYMENT.md"
)

FEATURE_DOCS=(
    "HISTORY_FETCH_GUIDE.md"
    "HISTORY_FETCH_USAGE.md"
    "THEME_CUSTOMIZATION.md"
    "THEME_EXAMPLES.md"
    "UI_UPGRADE.md"
    "QUICK_START_SHADCN.md"
    "OAUTH2_TROUBLESHOOTING.md"
)

log_info "Suggested documentation structure:"
echo ""
echo "Root (keep main docs):"
for doc in "${MAIN_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✓ $doc"
    else
        echo "  ✗ $doc (missing)"
    fi
done

echo ""
echo "docs/deployment/ (deployment guides):"
for doc in "${DEPLOYMENT_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  → $doc"
    fi
done

echo ""
echo "docs/features/ (feature-specific docs):"
for doc in "${FEATURE_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  → $doc"
    fi
done

echo ""
read -p "Organize documentation into subdirectories? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mkdir -p docs/deployment
    mkdir -p docs/features
    
    for doc in "${DEPLOYMENT_DOCS[@]}"; do
        if [ -f "$doc" ]; then
            mv "$doc" "docs/deployment/"
            log_success "Moved $doc to docs/deployment/"
        fi
    done
    
    for doc in "${FEATURE_DOCS[@]}"; do
        if [ -f "$doc" ]; then
            mv "$doc" "docs/features/"
            log_success "Moved $doc to docs/features/"
        fi
    done
else
    log_info "Skipped documentation organization"
fi

# ============================================================================
# 3. Check environment files
# ============================================================================
log_section "Step 3: Checking Environment Files"

log_info "Checking for proper .env configuration..."

# Check if .env files exist
if [ -f ".env" ]; then
    log_success ".env exists"
else
    log_warning ".env missing - run ./setup-env.sh to create"
fi

if [ -f "bot/.env" ]; then
    log_success "bot/.env exists"
else
    log_warning "bot/.env missing - run ./setup-env.sh to create"
fi

if [ -f "client/.env.local" ]; then
    log_success "client/.env.local exists"
else
    log_warning "client/.env.local missing - run ./setup-env.sh to create"
fi

# Check for old client/.env.production with empty values
if [ -f "client/.env.production" ]; then
    if grep -q "NEXT_PUBLIC_API_URL=$" "client/.env.production"; then
        log_warning "client/.env.production has empty values"
        read -p "Remove client/.env.production? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm "client/.env.production"
            log_success "Removed client/.env.production"
        fi
    fi
fi

# ============================================================================
# 4. Check for old client directory
# ============================================================================
log_section "Step 4: Checking for Old Files"

if [ -d "client-old" ]; then
    log_warning "Found old client-old directory"
    SIZE=$(du -sh client-old | cut -f1)
    echo "  Size: $SIZE"
    read -p "Remove client-old directory? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf client-old
        log_success "Removed client-old directory"
    fi
fi

# Check for test files in root
TEST_FILES=(
    "test-emoji.html"
    "debug-data.sql"
)

FOUND_TEST_FILES=0
for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        if [ $FOUND_TEST_FILES -eq 0 ]; then
            log_info "Found test files in root:"
            FOUND_TEST_FILES=1
        fi
        echo "  - $file"
    fi
done

if [ $FOUND_TEST_FILES -eq 1 ]; then
    read -p "Move test files to docs/archive/? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p docs/archive
        for file in "${TEST_FILES[@]}"; do
            if [ -f "$file" ]; then
                mv "$file" "docs/archive/"
                log_success "Moved $file to docs/archive/"
            fi
        done
    fi
fi

# ============================================================================
# 5. Clean up logs
# ============================================================================
log_section "Step 5: Cleaning Up Logs"

if [ -d "bot/logs" ]; then
    LOG_SIZE=$(du -sh bot/logs 2>/dev/null | cut -f1 || echo "0")
    log_info "Bot logs size: $LOG_SIZE"
    
    if [ "$LOG_SIZE" != "0" ]; then
        read -p "Clear bot logs? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf bot/logs/*
            log_success "Cleared bot logs"
        fi
    fi
fi

if [ -d "logs" ]; then
    LOG_SIZE=$(du -sh logs 2>/dev/null | cut -f1 || echo "0")
    log_info "Server logs size: $LOG_SIZE"
    
    if [ "$LOG_SIZE" != "0" ]; then
        read -p "Clear server logs? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf logs/*
            log_success "Cleared server logs"
        fi
    fi
fi

# ============================================================================
# 6. Check node_modules
# ============================================================================
log_section "Step 6: Checking Dependencies"

log_info "Checking node_modules sizes..."

if [ -d "node_modules" ]; then
    ROOT_SIZE=$(du -sh node_modules | cut -f1)
    echo "  Root: $ROOT_SIZE"
fi

if [ -d "bot/node_modules" ]; then
    BOT_SIZE=$(du -sh bot/node_modules | cut -f1)
    echo "  Bot: $BOT_SIZE"
fi

if [ -d "client/node_modules" ]; then
    CLIENT_SIZE=$(du -sh client/node_modules | cut -f1)
    echo "  Client: $CLIENT_SIZE"
fi

echo ""
read -p "Reinstall all dependencies (clean install)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Removing node_modules..."
    rm -rf node_modules bot/node_modules client/node_modules
    
    log_info "Installing dependencies..."
    npm install
    cd bot && npm install && cd ..
    cd client && npm install && cd ..
    
    log_success "Dependencies reinstalled"
fi

# ============================================================================
# 7. Validate configuration
# ============================================================================
log_section "Step 7: Validating Configuration"

log_info "Checking configuration files..."

# Check next.config.ts
if grep -q "1401130025411018772.discordsays.com" client/next.config.ts 2>/dev/null; then
    log_error "client/next.config.ts still has hardcoded values!"
    log_info "This should have been fixed. Please check the file."
else
    log_success "client/next.config.ts uses environment variables"
fi

# Check ecosystem.config.js
if grep -q "PORT: 3008" ecosystem.config.js 2>/dev/null; then
    log_error "ecosystem.config.js still has hardcoded port!"
    log_info "This should have been fixed. Please check the file."
else
    log_success "ecosystem.config.js uses environment variables"
fi

# ============================================================================
# 8. Summary
# ============================================================================
log_section "Cleanup Complete!"

echo ""
log_success "Project cleanup finished"
echo ""
log_info "Recommended next steps:"
echo "  1. Review changes: git status"
echo "  2. Test configuration: ./setup-env.sh"
echo "  3. Run development: npm run dev"
echo "  4. Check documentation: docs/ENVIRONMENT_VARIABLES.md"
echo ""
log_info "If you haven't configured environment variables yet:"
echo "  Run: ./setup-env.sh"
echo ""
