# Quick Publish Commands Reference

## Pre-Publish Verification

```bash
# Verify builds are current
ls -la packages/security/dist/
ls -la packages/performance/dist/

# Verify versions
grep version packages/security/package.json
grep version packages/performance/package.json

# Run tests
cd packages/security && npm test
cd packages/performance && npm test

# Dry run
cd packages/security && npm pack --dry-run
cd packages/performance && npm pack --dry-run
```

## Option 1: Use Script (Recommended)

```bash
# Dry run (safe - no actual publish)
./scripts/publish-alpha.sh

# Real publish with 5-second countdown
./scripts/publish-alpha.sh --execute
```

## Option 2: Manual Publish

```bash
# Security package
cd packages/security
npm publish --access public --tag alpha

# Performance package
cd packages/performance
npm publish --access public --tag alpha
```

## Post-Publish Verification

```bash
# Check packages are live
npm view @claude-flow/security@alpha
npm view @claude-flow/performance@alpha

# Test installation in temp directory
mkdir /tmp/test-install && cd /tmp/test-install
npm init -y
npm install @claude-flow/security@alpha
npm install @claude-flow/performance@alpha

# Verify imports work
node -e "const {InputValidator} = require('@claude-flow/security'); console.log('✅ Security OK')"
node -e "const {HNSWEngine} = require('@claude-flow/performance'); console.log('✅ Performance OK')"
```

## Git Tags

```bash
# Create release tags
./scripts/create-release-tags.sh

# Verify tags
git tag -l "@claude-flow/*@0.1.0-alpha.1"

# Push to remote
git push origin --tags
```

## GitHub Releases

```bash
# Use GitHub CLI (if available)
gh release create @claude-flow/security@0.1.0-alpha.1 \
  --title "Security Package v0.1.0-alpha.1" \
  --notes-file packages/security/RELEASE-NOTES-0.1.0-alpha.1.md \
  --prerelease

gh release create @claude-flow/performance@0.1.0-alpha.1 \
  --title "Performance Package v0.1.0-alpha.1" \
  --notes-file packages/performance/RELEASE-NOTES-0.1.0-alpha.1.md \
  --prerelease
```

## Troubleshooting

### If dist/ is missing
```bash
# Rebuild
cd packages/security && npm run build
cd packages/performance && npm run build
```

### If prepublishOnly fails
```bash
# Publish with --ignore-scripts (if necessary)
npm publish --access public --tag alpha --ignore-scripts
```

### If publish fails
```bash
# Check npm login
npm whoami

# Login if needed
npm login

# Verify registry
npm config get registry
```

## Rollback (Within 72 hours)

```bash
# Unpublish if critical issues found
npm unpublish @claude-flow/security@0.1.0-alpha.1
npm unpublish @claude-flow/performance@0.1.0-alpha.1

# Note: Only works within 72 hours of publish
```

## Installation Commands (For Users)

```bash
# Install latest alpha
npm install @claude-flow/security@alpha
npm install @claude-flow/performance@alpha

# Install specific version
npm install @claude-flow/security@0.1.0-alpha.1
npm install @claude-flow/performance@0.1.0-alpha.1

# Install both
npm install @claude-flow/security@alpha @claude-flow/performance@alpha
```

## Important Notes

- **Alpha Tag**: Won't be installed by default with `npm install @claude-flow/security`
- **Public Access**: Required `--access public` for scoped packages
- **Scope Change**: Publishing as @claude-flow/* (already configured in package.json)
- **Registry**: Official npm registry (registry.npmjs.org)

## Quick Status Check

```bash
# Are packages ready?
./scripts/publish-alpha.sh

# Check package.json files
cat packages/security/package.json | grep -E "(name|version|publishConfig)"
cat packages/performance/package.json | grep -E "(name|version|publishConfig)"
```

---

**Ready to publish?** Run: `./scripts/publish-alpha.sh --execute`
