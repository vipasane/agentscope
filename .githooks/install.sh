#!/bin/bash
#
# Install git hooks for AgentScope
# Run this once after cloning the repository
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "🔧 Installing AgentScope git hooks..."
echo ""

# Configure git to use .githooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks installed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 HOOKS ENABLED:"
echo ""
echo "  pre-commit        Enforces small commits"
echo "                    • Warns at 5 files / 200 lines"
echo "                    • Blocks at 10 files / 500 lines"
echo "                    • Checks for secrets (with .secretsignore)"
echo ""
echo "  prepare-commit-msg  Proactive branching guidance"
echo "                    • Shows branch size progress bar"
echo "                    • Suggests new branch when getting large"
echo ""
echo "  commit-msg        Validates commit messages"
echo "                    • Enforces conventional commits"
echo "                    • Suggests body for large changes"
echo "                    • Checks imperative mood"
echo ""
echo "  pre-push          Enforces small PRs"
echo "                    • Warns at 10 files / 400 lines"
echo "                    • Blocks at 25 files / 1000 lines"
echo "                    • Shows PR summary before push"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔄 STACKED PR WORKFLOW:"
echo ""
echo "  When working on a large feature, use stacked PRs:"
echo ""
echo "  1. Work on your feature branch"
echo "  2. When hooks suggest a new branch, run:"
echo ""
echo "     ./scripts/next-branch.sh"
echo ""
echo "  3. This pushes your current work as a PR and starts a new branch"
echo "  4. Continue coding on the new branch"
echo "  5. Repeat when needed"
echo ""
echo "  Result: Multiple small, reviewable PRs instead of one massive PR!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 FALSE POSITIVE HANDLING:"
echo ""
echo "  Add exclusions to .secretsignore:"
echo "  • File paths:    docs/security/*.md"
echo "  • Line patterns: PATTERN:/sk-ant-"
echo "  • Context:       CONTEXT:EXAMPLE_"
echo ""
