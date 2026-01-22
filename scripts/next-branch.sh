#!/bin/bash
#
# next-branch.sh - Push current branch to PR and start fresh
# Usage: ./scripts/next-branch.sh [base-branch]
#
# This script:
# 1. Pushes current branch and creates a PR
# 2. Creates a new branch for the next chunk of work
#
# Perfect for long coding sessions where you want multiple small PRs.
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================
# CONFIGURATION
# ============================================

BASE_BRANCH="${1:-main}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check we're not on main
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo -e "${RED}❌ Cannot run from main/master branch${NC}"
    echo "Create a feature branch first: git checkout -b feat/your-feature"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes. Commit them first:${NC}"
    echo "  git add . && git commit -m 'your message'"
    exit 1
fi

# ============================================
# CALCULATE STATS
# ============================================

MERGE_BASE=$(git merge-base "$BASE_BRANCH" HEAD 2>/dev/null || echo "")
if [ -n "$MERGE_BASE" ]; then
    FILES_CHANGED=$(git diff --name-only "$MERGE_BASE"..HEAD | grep -c . || echo 0)
    LINES_CHANGED=$(git diff --numstat "$MERGE_BASE"..HEAD | awk '{sum+=$1+$2} END {print sum+0}')
    COMMIT_COUNT=$(git rev-list --count "$MERGE_BASE"..HEAD 2>/dev/null || echo 0)
else
    FILES_CHANGED=0
    LINES_CHANGED=0
    COMMIT_COUNT=0
fi

echo ""
echo -e "${BOLD}🚀 Next Branch Workflow${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo -e "${BOLD}Current branch:${NC} ${CYAN}$CURRENT_BRANCH${NC}"
echo -e "  • $COMMIT_COUNT commits"
echo -e "  • $FILES_CHANGED files changed"
echo -e "  • $LINES_CHANGED lines changed"
echo ""

# ============================================
# DETERMINE NEXT BRANCH NAME
# ============================================

# Extract base name and part number
if [[ "$CURRENT_BRANCH" =~ ^(.+)-part-([0-9]+)$ ]]; then
    BRANCH_BASE="${BASH_REMATCH[1]}"
    CURRENT_PART="${BASH_REMATCH[2]}"
    NEXT_PART=$((CURRENT_PART + 1))
    NEXT_BRANCH="${BRANCH_BASE}-part-${NEXT_PART}"
else
    # First split - current becomes part-1, new is part-2
    BRANCH_BASE="$CURRENT_BRANCH"
    NEXT_BRANCH="${CURRENT_BRANCH}-part-2"
fi

echo -e "${BOLD}Plan:${NC}"
echo -e "  1. Push ${CYAN}$CURRENT_BRANCH${NC} to origin"
echo -e "  2. Create PR targeting ${CYAN}$BASE_BRANCH${NC}"
echo -e "  3. Create new branch ${CYAN}$NEXT_BRANCH${NC}"
echo ""

# Confirm
read -p "Proceed? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# ============================================
# STEP 1: PUSH CURRENT BRANCH
# ============================================

echo -e "${BOLD}Step 1: Pushing $CURRENT_BRANCH...${NC}"
git push -u origin "$CURRENT_BRANCH"
echo -e "${GREEN}✓ Pushed${NC}"
echo ""

# ============================================
# STEP 2: CREATE PR
# ============================================

echo -e "${BOLD}Step 2: Creating PR...${NC}"

# Check if PR already exists
EXISTING_PR=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")

if [ -n "$EXISTING_PR" ]; then
    echo -e "${YELLOW}PR #$EXISTING_PR already exists for this branch${NC}"
    PR_URL=$(gh pr view "$EXISTING_PR" --json url --jq '.url')
else
    # Create PR with auto-filled title and body
    PR_URL=$(gh pr create --base "$BASE_BRANCH" --fill --json url --jq '.url' 2>/dev/null || echo "")

    if [ -z "$PR_URL" ]; then
        # Try with interactive mode
        echo -e "${YELLOW}Creating PR interactively...${NC}"
        gh pr create --base "$BASE_BRANCH" --fill
        PR_URL=$(gh pr view --json url --jq '.url' 2>/dev/null || echo "PR created")
    fi
fi

echo -e "${GREEN}✓ PR: $PR_URL${NC}"
echo ""

# ============================================
# STEP 3: CREATE NEXT BRANCH
# ============================================

echo -e "${BOLD}Step 3: Creating $NEXT_BRANCH...${NC}"

# Create new branch from current HEAD
git checkout -b "$NEXT_BRANCH"

echo -e "${GREEN}✓ Now on branch $NEXT_BRANCH${NC}"
echo ""

# ============================================
# SUMMARY
# ============================================

echo "═══════════════════════════════════════════"
echo -e "${GREEN}${BOLD}✅ Done!${NC}"
echo ""
echo -e "${BOLD}PR created:${NC} $PR_URL"
echo -e "${BOLD}Now working on:${NC} ${CYAN}$NEXT_BRANCH${NC}"
echo ""
echo -e "${CYAN}Continue coding! This branch will become your next PR.${NC}"
echo -e "${CYAN}Run this script again when ready for another PR.${NC}"
echo ""
