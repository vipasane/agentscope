#!/bin/bash
# Workaround script for WSL filesystem I/O issues
# This script builds the package in /tmp to avoid WSL filesystem problems

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="/tmp/agentscope-security-build-$$"

echo "🔧 Security Package Build Workaround"
echo "======================================"
echo ""
echo "Source: $PACKAGE_DIR"
echo "Build location: $TMP_DIR"
echo ""

# Create temporary build directory
echo "📁 Creating temporary build directory..."
mkdir -p "$TMP_DIR"

# Copy source files (excluding node_modules and dist)
echo "📋 Copying source files..."
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' \
  "$PACKAGE_DIR/" "$TMP_DIR/"

# Change to temporary directory
cd "$TMP_DIR"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo ""
echo "🧪 Running tests..."
npm test

# Build
echo ""
echo "🏗️  Building package..."
npm run build

# Verify build
echo ""
echo "✅ Verifying build artifacts..."
if [ -f "dist/index.js" ] && [ -f "dist/index.mjs" ] && [ -f "dist/index.d.ts" ]; then
  echo "  ✓ CJS build: dist/index.js ($(wc -c < dist/index.js) bytes)"
  echo "  ✓ ESM build: dist/index.mjs ($(wc -c < dist/index.mjs) bytes)"
  echo "  ✓ TypeScript types: dist/index.d.ts ($(wc -c < dist/index.d.ts) bytes)"
else
  echo "  ✗ Build failed - missing artifacts"
  exit 1
fi

# Copy built files back
echo ""
echo "📤 Copying build artifacts back..."
mkdir -p "$PACKAGE_DIR/dist"
cp -r dist/* "$PACKAGE_DIR/dist/"

echo ""
echo "✅ Build complete!"
echo ""
echo "Build artifacts are now in: $PACKAGE_DIR/dist/"
echo ""
echo "Next steps:"
echo "  1. Review the build: ls -lh $PACKAGE_DIR/dist/"
echo "  2. Test the package: cd $PACKAGE_DIR && npm pack --dry-run"
echo "  3. Publish: cd $PACKAGE_DIR && npm publish --access public --tag alpha"
echo ""

# Optional: Clean up temporary directory
read -p "Delete temporary build directory? [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
  rm -rf "$TMP_DIR"
  echo "🧹 Cleaned up temporary directory"
fi

echo ""
echo "Done! 🎉"
