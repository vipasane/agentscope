#!/bin/bash
#
# Setup Git Hooks for AgentScope
#
# This script installs the pre-commit review hook
# Run: chmod +x .claude/hooks/setup-hooks.sh && .claude/hooks/setup-hooks.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "🔧 Setting up Git hooks for AgentScope..."
echo ""

# Check if we're in a git repository
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Create pre-commit hook (lightweight - just secrets check)
cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
#
# Pre-commit hook - quick secrets check only
# Full AI review happens on PR via GitHub Actions
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Quick check for obvious secrets in staged files
STAGED=$(git diff --cached --name-only)

if [ -z "$STAGED" ]; then
    exit 0
fi

# Check for hardcoded secrets (fast grep)
SECRET_PATTERNS="(sk-ant-|ghp_|AKIA[0-9A-Z]{16}|password\s*=\s*['\"][^'\"]+['\"]|api[_-]?key\s*=\s*['\"][^'\"]+['\"])"

FOUND_SECRETS=$(git diff --cached | grep -iE "$SECRET_PATTERNS" || true)

if [ -n "$FOUND_SECRETS" ]; then
    echo -e "${RED}❌ Potential secrets detected in staged changes!${NC}"
    echo ""
    echo "$FOUND_SECRETS" | head -5
    echo ""
    echo -e "${YELLOW}Review carefully before committing.${NC}"
    echo -e "${YELLOW}Use --no-verify to bypass if this is a false positive.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Quick secrets check passed${NC}"
exit 0
EOF

chmod +x "$GIT_HOOKS_DIR/pre-commit"
echo "✅ Installed pre-commit hook (lightweight secrets check)"

# Create commit-msg hook for conventional commits
cat > "$GIT_HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash
#
# Commit message validation
# Enforces conventional commit format
#

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Conventional commit pattern
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,72}"

if ! [[ "$COMMIT_MSG" =~ $PATTERN ]]; then
    echo ""
    echo "❌ Invalid commit message format!"
    echo ""
    echo "Expected format: <type>(<scope>): <subject>"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    echo ""
    echo "Examples:"
    echo "  feat(scanner): add TypeScript parser support"
    echo "  fix(cli): handle missing config file gracefully"
    echo "  docs: update README with installation instructions"
    echo ""
    echo "Your message: $COMMIT_MSG"
    echo ""
    exit 1
fi

exit 0
EOF

chmod +x "$GIT_HOOKS_DIR/commit-msg"
echo "✅ Installed commit-msg hook"

# Create pre-push hook
cat > "$GIT_HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
#
# Pre-push hook - runs tests before push
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Running pre-push checks...${NC}"

# Check if pushing to main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE=$1

while read local_ref local_sha remote_ref remote_sha; do
    if [[ "$remote_ref" == *"refs/heads/main"* ]]; then
        echo -e "${RED}⚠️  Direct push to main is not allowed!${NC}"
        echo "Please create a pull request instead."
        exit 1
    fi
done

# Run tests if available
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "Running tests..."
    npm test
    if [ $? -ne 0 ]; then
        echo -e "${RED}Tests failed. Push aborted.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pre-push checks passed${NC}"
exit 0
EOF

chmod +x "$GIT_HOOKS_DIR/pre-push"
echo "✅ Installed pre-push hook"

echo ""
echo "─────────────────────────────────────"
echo "✅ Git hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  • pre-commit  - Runs AI review checks"
echo "  • commit-msg  - Validates conventional commit format"
echo "  • pre-push    - Runs tests, blocks direct push to main"
echo ""
echo "To bypass hooks (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
