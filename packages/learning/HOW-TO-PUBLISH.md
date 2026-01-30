# How to Publish @vipasane/agentscope-learning

## Prerequisites

1. **npm Account**: You need an npm account with publish access
2. **Authentication**: Run `npm login` to authenticate
3. **Repository Access**: Write access to vipasane/agentscope repository
4. **Memory Package**: @claude-flow/memory must be available (currently must build from source)

## Important Note

**This package depends on @claude-flow/memory** which is not yet published to npm. For alpha release:
- Users must install @claude-flow/memory from source
- Document this clearly in README and release notes
- Consider this a **known limitation** of alpha release

## Pre-Publish Checklist

- [ ] All features implemented and documented
- [ ] Tests passing
- [ ] Version bumped in package.json (0.1.0-alpha.1)
- [ ] CHANGELOG.md updated
- [ ] README.md reviewed and accurate
- [ ] LICENSE file present
- [ ] .npmignore configured correctly
- [ ] TypeScript builds without errors
- [ ] No sensitive information in code
- [ ] Peer dependency warning added for memory package

## Publishing Steps

### Option 1: Manual Publishing (Recommended for Alpha)

```bash
# 1. Navigate to package directory
cd /workspaces/agentscope/packages/learning

# 2. Clean previous builds
npm run clean

# 3. Install dependencies (NOTE: memory must be available)
npm install

# 4. Run linting
npm run lint

# 5. Run tests
npm run test

# 6. Build the package
npm run build

# 7. Test the package (dry run)
npm pack --dry-run

# 8. Review the files that will be published
# Should include: dist/, README.md, CHANGELOG.md, LICENSE, package.json

# 9. Publish with alpha tag
npm publish --access public --tag alpha

# 10. Verify publication
npm view @vipasane/agentscope-learning@alpha
```

### Option 2: GitHub Actions (Automated)

Create a workflow file at `.github/workflows/publish-learning-package.yml` (see template below).

Then trigger manually:
```bash
# Go to GitHub Actions > Publish Learning Package > Run workflow
# Select 'alpha' tag
```

## Post-Publish Verification

### 1. Verify Package on npm

```bash
# Check package info
npm view @vipasane/agentscope-learning@alpha

# Check published files
npm view @vipasane/agentscope-learning@alpha dist.tarball
```

### 2. Test Installation (with memory from source)

```bash
# Create a test directory
mkdir /tmp/test-learning
cd /tmp/test-learning

# Install memory from source first
git clone https://github.com/ruvnet/claude-flow.git /tmp/claude-flow
cd /tmp/claude-flow/packages/memory
npm install && npm run build
npm link

# Return to test dir and link memory
cd /tmp/test-learning
npm link @claude-flow/memory

# Install the published package
npm install @vipasane/agentscope-learning@alpha

# Test import
node -e "import('@vipasane/agentscope-learning').then(m => console.log('Package loaded:', Object.keys(m)))"
```

### 3. Create Git Tag

```bash
# Tag the release
git tag @vipasane/agentscope-learning@0.1.0-alpha.1

# Push tag to repository
git push origin @vipasane/agentscope-learning@0.1.0-alpha.1
```

### 4. Update Documentation

- [ ] Add package to main repository README
- [ ] Document memory dependency installation
- [ ] Update package discovery platforms
- [ ] Announce in GitHub Discussions

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Memory Package Not Found

```bash
# Install memory from source
git clone https://github.com/ruvnet/claude-flow.git
cd claude-flow/packages/memory
npm install && npm run build
npm link

# Link in learning package
cd /workspaces/agentscope/packages/learning
npm link @claude-flow/memory
```

### Tests Fail

```bash
# Ensure memory package is linked
npm link @claude-flow/memory

# Run tests with verbose output
npm run test -- --reporter=verbose
```

### Permission Denied

```bash
# Re-authenticate with npm
npm logout
npm login

# Verify authentication
npm whoami
```

### Published but Not Visible

```bash
# npm registry can take a few minutes to update
# Wait 2-5 minutes and retry:
npm view @vipasane/agentscope-learning@alpha
```

### Wrong Files Published

```bash
# Check .npmignore and package.json "files" array
# Unpublish if necessary (within 72 hours):
npm unpublish @vipasane/agentscope-learning@0.1.0-alpha.1

# Fix configuration and republish
```

## Version Management

### Alpha Releases (0.1.0-alpha.X)
- For initial testing and feedback
- May have breaking changes
- Known limitations (memory dependency)
- Use `--tag alpha` when publishing

### Beta Releases (0.1.0-beta.X)
- More stable than alpha
- Memory package published to npm
- API mostly finalized
- Use `--tag beta` when publishing

### Stable Releases (0.1.0)
- Production-ready
- All dependencies available on npm
- Semantic versioning
- Use `--tag latest` when publishing

## Dependency Roadmap

### Alpha Phase (Current)
- **Learning**: Published to npm with alpha tag
- **Memory**: Must install from source
- **User Action**: Clone and build memory package locally

### Beta Phase (Next)
- **Learning**: Published to npm with beta tag
- **Memory**: Published to npm
- **User Action**: `npm install @vipasane/agentscope-learning@beta`

### Stable Phase (Future)
- **Learning**: Published to npm (latest tag)
- **Memory**: Published to npm (latest tag)
- **User Action**: `npm install @vipasane/agentscope-learning`

## Security Considerations

1. **Never commit secrets** - Use npm tokens in environment variables
2. **Review package contents** - Always use `npm pack --dry-run` first
3. **Two-factor authentication** - Enable 2FA on npm account
4. **Audit dependencies** - Check for vulnerabilities
5. **Source dependencies** - Document memory installation from source

## Communication

### Alpha Release Announcement Template

```markdown
## 🚀 Alpha Release: @vipasane/agentscope-learning v0.1.0-alpha.1

We're excited to announce the first alpha release of the AgentScope Learning package!

### What's New
- 4-step learning pipeline (RETRIEVE-JUDGE-DISTILL-CONSOLIDATE)
- Trajectory tracking for agent execution paths
- Verdict judgment with reward scores
- Memory distillation for pattern extraction
- EWC++ consolidation to prevent forgetting

### ⚠️ Important: Memory Dependency
This alpha release requires `@claude-flow/memory` which is not yet on npm.
You'll need to install it from source:

```bash
git clone https://github.com/ruvnet/claude-flow.git
cd claude-flow/packages/memory
npm install && npm run build && npm link
npm link @claude-flow/memory
npm install @vipasane/agentscope-learning@alpha
```

### Try It Out
```bash
npm install @vipasane/agentscope-learning@alpha
```

See examples: https://github.com/vipasane/agentscope/tree/main/packages/learning/examples

### Feedback Welcome
Please report issues or suggestions: https://github.com/vipasane/agentscope/issues

---

**Note**: This is an alpha release for early feedback. API may change.
```

## Support

For publishing issues:
- npm Support: https://www.npmjs.com/support
- GitHub Issues: https://github.com/vipasane/agentscope/issues
- Repository Maintainers: @vipasane

## License

Published under MIT License - see LICENSE file
