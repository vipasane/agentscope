#!/bin/bash
set -e

echo "Publishing @claude-flow packages to npm (alpha tag)"
echo "=================================================="
echo ""

# Security package
echo "📦 Publishing security package..."
cd "$(dirname "$0")/../packages/security"
echo "   Location: $(pwd)"
echo "   Package: @claude-flow/security@0.1.0-alpha.1"
npm publish --access public --tag alpha --dry-run
echo "   ✅ Security: Ready to publish"
echo ""

# Performance package
echo "📦 Publishing performance package..."
cd "$(dirname "$0")/../packages/performance"
echo "   Location: $(pwd)"
echo "   Package: @claude-flow/performance@0.1.0-alpha.1"
npm publish --access public --tag alpha --dry-run
echo "   ✅ Performance: Ready to publish"
echo ""

echo "=================================================="
echo "✅ Dry run successful!"
echo ""
echo "To publish for REAL, run:"
echo ""
echo "  cd packages/security && npm publish --access public --tag alpha"
echo "  cd packages/performance && npm publish --access public --tag alpha"
echo ""
echo "Or run this script with --execute flag:"
echo "  ./scripts/publish-alpha.sh --execute"
echo ""

# Check if --execute flag is present
if [ "$1" = "--execute" ]; then
  echo "⚠️  EXECUTING REAL PUBLISH IN 5 SECONDS..."
  echo "⚠️  Press Ctrl+C to cancel"
  sleep 5

  echo ""
  echo "Publishing security package..."
  cd "$(dirname "$0")/../packages/security"
  npm publish --access public --tag alpha
  echo "✅ Security package published!"

  echo ""
  echo "Publishing performance package..."
  cd "$(dirname "$0")/../packages/performance"
  npm publish --access public --tag alpha
  echo "✅ Performance package published!"

  echo ""
  echo "🎉 All packages published successfully!"
  echo ""
  echo "Verify at:"
  echo "  - https://www.npmjs.com/package/@claude-flow/security"
  echo "  - https://www.npmjs.com/package/@claude-flow/performance"
fi
