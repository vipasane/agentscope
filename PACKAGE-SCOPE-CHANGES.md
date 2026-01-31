# Package Scope Changes

**All packages updated to publish under `@vipasane` scope**

## Summary

Changed all npm package scopes from `@claude-flow` and `@agentscope` to `@vipasane` for publishing rights.

## Package Name Changes

### Core Packages (packages/)

| Old Name | New Name |
|----------|----------|
| `@claude-flow/cli-framework` | `@vipasane/agentscope-cli-framework` |
| `@claude-flow/errors` | `@vipasane/agentscope-errors` |
| `@claude-flow/memory` | `@vipasane/agentscope-memory` |
| `@claude-flow/performance` | `@vipasane/agentscope-performance` |
| `@claude-flow/testing` | `@vipasane/agentscope-testing` |
| `@claude-flow/types` | `@vipasane/agentscope-types` |
| `@vipasane/agentscope-learning` | ✅ Already correct |
| `@vipasane/agentscope-security` | ✅ Already correct |

### Product Packages (products/)

| Old Name | New Name |
|----------|----------|
| `@claude-flow/api-reference-system` | `@vipasane/agentscope-api-reference-system` |
| `@agentscope/cli-startup-optimizer` | `@vipasane/cli-startup-optimizer` |
| `@agentscope/integration-test-suite` | `@vipasane/integration-test-suite` |

## All 11 Packages Ready for npm

### Installation Commands

```bash
# Core packages
npm install @vipasane/agentscope-cli-framework@alpha
npm install @vipasane/agentscope-errors@alpha
npm install @vipasane/agentscope-learning@alpha
npm install @vipasane/agentscope-memory@alpha
npm install @vipasane/agentscope-performance@alpha
npm install @vipasane/agentscope-security@alpha
npm install @vipasane/agentscope-testing@alpha
npm install @vipasane/agentscope-types@alpha

# Product packages
npm install @vipasane/agentscope-api-reference-system@alpha
npm install @vipasane/cli-startup-optimizer@alpha
npm install @vipasane/integration-test-suite@alpha
```

## Changes Made

1. ✅ Updated all `package.json` files with new scope
2. ✅ Updated internal dependencies between packages
3. ✅ Verified no `@claude-flow` or `@agentscope` references remain
4. ✅ All packages ready for automated publishing to npm

## Automated Publishing

When PR #14 is merged to `main`:
- GitHub Actions workflow will detect changes
- Build and test each package
- Publish to npm under `@vipasane` scope with `alpha` tag
- Create GitHub releases automatically

## Python Package

The Alpha Feedback System remains unchanged:
- **PyPI name**: `alpha-feedback-system` (no scope needed)
- **Installation**: `pip install alpha-feedback-system`

## Verification

```bash
# All packages now use @vipasane scope
grep -h "\"name\":" packages/*/package.json products/*/package.json

# Output shows all 11 packages with @vipasane scope
```

---

**Status**: ✅ All package scopes updated and pushed to PR #14
**Commit**: 2ae0651
