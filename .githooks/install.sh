#!/bin/bash
#
# Install git hooks for AgentScope
# Run this once after cloning the repository
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Installing AgentScope git hooks..."

# Configure git to use .githooks directory
git config core.hooksPath .githooks

echo ""
echo "✅ Git hooks installed successfully!"
echo ""
echo "Hooks enabled:"
echo "  • pre-commit  - Secrets check with .secretsignore support"
echo "  • commit-msg  - Validates conventional commit format"
echo "  • pre-push    - Blocks direct push to main"
echo ""
echo "False positive handling:"
echo "  Add exclusions to .secretsignore:"
echo "  • File paths:    docs/security/*.md"
echo "  • Line patterns: PATTERN:/sk-ant-"
echo "  • Context:       CONTEXT:EXAMPLE_"
echo ""
