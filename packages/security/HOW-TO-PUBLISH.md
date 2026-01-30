# How to Publish @vipasane/agentscope-security v0.1.0-alpha.1

## Quick Start - Use GitHub Actions (Easiest)

1. **Navigate to GitHub Actions**
   ```
   https://github.com/vipasane/agentscope/actions
   ```

2. **Select "Publish Security Package" workflow**

3. **Click "Run workflow" button**

4. **Configure**:
   - Branch: `main` (or current branch)
   - Tag: `alpha`
   - Dry run: Uncheck (unless testing)

5. **Click "Run workflow"**

6. **Wait** (~2-3 minutes for build + tests + publish)

7. **Verify** at https://www.npmjs.com/package/@vipasane/agentscope-security

Done! ✅

---

## Alternative: Manual Publishing

### Prerequisites

1. **npm account with permissions**
   ```bash
   npm whoami  # Should show your username
   npm access ls-packages @vipasane  # Check access
   ```

2. **Set npm token** (if not logged in):
   ```bash
   npm login
   # Or set token:
   export NPM_TOKEN=your_npm_token
   ```

### Method 1: Workaround Script (For WSL)

```bash
cd /workspaces/agentscope/packages/security

# Run build workaround
./scripts/publish-workaround.sh

# After successful build:
npm publish --access public --tag alpha

# Verify
npm view @vipasane/agentscope-security
```

### Method 2: Native Environment

**On Linux/macOS** (no WSL):

```bash
# Clone repository
git clone https://github.com/vipasane/agentscope.git
cd agentscope/packages/security

# Install dependencies
npm install

# Run tests
npm test
# Should show: 310 tests passing

# Check coverage
npm run test:coverage
# Should show: >90% coverage

# Build
npm run build
# Should create dist/index.js, dist/index.mjs, dist/index.d.ts

# Verify build
ls -lh dist/
# Should show 3-4 files

# Dry run (optional)
npm pack --dry-run

# Publish
npm publish --access public --tag alpha

# Verify
npm view @vipasane/agentscope-security
```

### Method 3: Docker (Clean Environment)

```bash
# Create Dockerfile
cat > Dockerfile.publish << 'EOF'
FROM node:20-slim
WORKDIR /app
COPY packages/security ./
RUN npm install
RUN npm test
RUN npm run build
CMD ["npm", "publish", "--access", "public", "--tag", "alpha"]
EOF

# Build and run
docker build -f Dockerfile.publish -t security-publisher .
docker run -e NPM_TOKEN=$NPM_TOKEN security-publisher
```

---

## Verification After Publishing

### 1. Check npm Registry

```bash
# View package info
npm view @vipasane/agentscope-security

# Check all versions
npm view @vipasane/agentscope-security versions

# Check dist-tags
npm view @vipasane/agentscope-security dist-tags
# Should show: alpha: '0.1.0-alpha.1'
```

### 2. Test Installation

```bash
# Create test directory
mkdir ~/test-security-install && cd ~/test-security-install

# Initialize npm
npm init -y

# Install alpha version
npm install @vipasane/agentscope-security@alpha

# Test CJS import
node -e "const { InputValidator } = require('@vipasane/agentscope-security'); console.log('✅ CJS works:', typeof InputValidator)"

# Test ESM import
node --input-type=module -e "import { InputValidator } from '@vipasane/agentscope-security'; console.log('✅ ESM works:', typeof InputValidator)"
```

### 3. Test TypeScript

```bash
# In test directory
npm install -D typescript @types/node

# Create test file
cat > test.ts << 'EOF'
import { InputValidator } from '@vipasane/agentscope-security';

const validator = InputValidator.object({
  name: InputValidator.string(),
  age: InputValidator.number()
});

const result = validator.parse({ name: 'Test', age: 25 });
console.log('✅ TypeScript works:', result);
EOF

# Compile and run
npx tsc test.ts && node test.js
```

---

## Post-Publish Tasks

### 1. Create Git Tag

```bash
cd /workspaces/agentscope

git tag @vipasane/agentscope-security@0.1.0-alpha.1 -m "Security package v0.1.0-alpha.1"
git push origin @vipasane/agentscope-security@0.1.0-alpha.1
```

### 2. Create GitHub Release

1. Go to: https://github.com/vipasane/agentscope/releases/new
2. Tag: `@vipasane/agentscope-security@0.1.0-alpha.1`
3. Title: `Security Package v0.1.0-alpha.1`
4. Description: Copy from `CHANGELOG.md`
5. Check "Set as a pre-release"
6. Click "Publish release"

### 3. Update Main README

Add to `/workspaces/agentscope/README.md`:

```markdown
## Packages

### @vipasane/agentscope-security

Zero-dependency security validation for AI agents.

```bash
npm install @vipasane/agentscope-security@alpha
```

Features:
- Input validation (Zod-style API)
- Path traversal prevention
- Command injection protection
- Secret detection and redaction
- >90% test coverage, zero dependencies

[Documentation](./packages/security/README.md) | [npm](https://www.npmjs.com/package/@vipasane/agentscope-security)
```

### 4. Announce

Create GitHub Discussion:

```markdown
# 🎉 Alpha Release: @vipasane/agentscope-security v0.1.0-alpha.1

We're excited to announce the alpha release of our security package!

## What's New

Zero-dependency security validation for AI agents:
- ✅ Input validation with type-safe API
- ✅ Path traversal prevention
- ✅ Command injection protection
- ✅ Secret detection and redaction
- ✅ 310 tests, 90.19% coverage

## Installation

\`\`\`bash
npm install @vipasane/agentscope-security@alpha
\`\`\`

## Quick Start

\`\`\`typescript
import { InputValidator, PathValidator, SafeExecutor } from '@vipasane/agentscope-security';

// Validate input
const user = InputValidator.object({
  name: InputValidator.string(),
  email: InputValidator.string({ email: true })
}).parse(data);

// Secure paths
const safePath = PathValidator.validate(userPath);

// Safe commands
const safeCmd = SafeExecutor.validate(command);
\`\`\`

## Documentation

- [README](./packages/security/README.md)
- [npm page](https://www.npmjs.com/package/@vipasane/agentscope-security)

## Feedback Welcome!

This is an alpha release. Please report any issues or suggestions.
```

---

## Troubleshooting

### Build Fails with I/O Error

**Problem**: WSL filesystem issues
**Solution**: Use GitHub Actions or workaround script

### "Cannot publish over existing version"

**Problem**: Version already published
**Solution**: Increment version in package.json

### "You do not have permission to publish"

**Problem**: Not logged in or no access
**Solutions**:
- Run `npm login`
- Request access to @vipasane scope
- Check with `npm access ls-packages @vipasane`

### Tests Fail

**Problem**: Tests not passing
**Solution**: Don't publish yet, fix tests first
```bash
npm test
npm run test:coverage
```

### Build Missing Files

**Problem**: dist/ directory empty or missing files
**Solution**: Run build again or use workaround
```bash
npm run build
ls -la dist/  # Should show 3-4 files
```

---

## Quick Reference

| Task | Command |
|------|---------|
| **Install dependencies** | `npm install` |
| **Run tests** | `npm test` |
| **Check coverage** | `npm run test:coverage` |
| **Build package** | `npm run build` |
| **Dry run publish** | `npm pack --dry-run` |
| **Publish alpha** | `npm publish --access public --tag alpha` |
| **View on npm** | `npm view @vipasane/agentscope-security` |
| **Test install** | `npm install @vipasane/agentscope-security@alpha` |

---

## Support

- **Issues**: https://github.com/vipasane/agentscope/issues
- **Discussions**: https://github.com/vipasane/agentscope/discussions
- **npm**: https://www.npmjs.com/package/@vipasane/agentscope-security

---

**Status**: ✅ Ready to publish
**Recommended**: Use GitHub Actions workflow
**Alternative**: Use workaround script for WSL

Good luck! 🚀
