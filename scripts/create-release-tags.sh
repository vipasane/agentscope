#!/bin/bash
set -e

echo "Creating git tags for v0.1.0-alpha.1 releases"
echo "=============================================="
echo ""

# Create tags
echo "Creating tags..."
git tag -a @claude-flow/security@0.1.0-alpha.1 -m "Security package alpha release v0.1.0-alpha.1"
git tag -a @claude-flow/performance@0.1.0-alpha.1 -m "Performance package alpha release v0.1.0-alpha.1"

echo "✅ Tags created successfully"
echo ""
echo "Tags created:"
git tag -l "@claude-flow/*@0.1.0-alpha.1"
echo ""

echo "To push tags to remote, run:"
echo "  git push origin --tags"
echo ""

echo "Or push specific tags:"
echo "  git push origin @claude-flow/security@0.1.0-alpha.1"
echo "  git push origin @claude-flow/performance@0.1.0-alpha.1"
