# How to Publish @vipasane/agentscope-cli-framework

## Prerequisites

1. **npm Account**: You need an npm account with publish access
2. **Authentication**: Run `npm login` to authenticate
3. **Repository Access**: Write access to vipasane/agentscope repository
4. **Clean Build**: Ensure all tests pass and build succeeds

## Pre-Publish Checklist

- [ ] All features implemented and documented
- [ ] Tests passing (when implemented)
- [ ] Version bumped in package.json (0.1.0-alpha.1)
- [ ] CHANGELOG.md updated
- [ ] README.md reviewed and accurate
- [ ] LICENSE file present
- [ ] .npmignore configured correctly
- [ ] TypeScript builds without errors
- [ ] No sensitive information in code

## Publishing Steps

### Option 1: Manual Publishing (Recommended for Alpha)

```bash
# 1. Navigate to package directory
cd /workspaces/agentscope/packages/cli-framework

# 2. Clean previous builds
npm run clean

# 3. Install dependencies
npm install

# 4. Run linting
npm run lint

# 5. Build the package
npm run build

# 6. Test the package (dry run)
npm pack --dry-run

# 7. Review the files that will be published
# Should include: dist/, README.md, LICENSE, package.json

# 8. Publish with alpha tag
npm publish --access public --tag alpha

# 9. Verify publication
npm view @vipasane/agentscope-cli-framework@alpha
```

### Option 2: GitHub Actions (Automated)

Create a workflow file at `.github/workflows/publish-cli-framework.yml`:

```yaml
name: Publish CLI Framework Package

on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'NPM tag'
        required: true
        default: 'alpha'
        type: choice
        options:
          - alpha
          - beta
          - latest

jobs:
  publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./packages/cli-framework

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm install

      - name: Run linting
        run: npm run lint

      - name: Build package
        run: npm run build

      - name: Verify package
        run: npm pack --dry-run

      - name: Publish to npm
        run: npm publish --access public --tag ${{ github.event.inputs.tag }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        if: github.event.inputs.tag == 'latest'
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: @vipasane/agentscope-cli-framework@${{ github.event.inputs.version }}
          release_name: CLI Framework v${{ github.event.inputs.version }}
          draft: false
          prerelease: false
```

Then trigger manually:
```bash
# Go to GitHub Actions > Publish CLI Framework Package > Run workflow
# Select 'alpha' tag
```

## Post-Publish Verification

### 1. Verify Package on npm

```bash
# Check package info
npm view @vipasane/agentscope-cli-framework@alpha

# Check published files
npm view @vipasane/agentscope-cli-framework@alpha dist.tarball
```

### 2. Test Installation

```bash
# Create a test directory
mkdir /tmp/test-cli-framework
cd /tmp/test-cli-framework

# Install the package
npm install @vipasane/agentscope-cli-framework@alpha

# Test import
node -e "import('@vipasane/agentscope-cli-framework').then(m => console.log('Package loaded:', Object.keys(m)))"
```

### 3. Create Git Tag

```bash
# Tag the release
git tag @vipasane/agentscope-cli-framework@0.1.0-alpha.1

# Push tag to repository
git push origin @vipasane/agentscope-cli-framework@0.1.0-alpha.1
```

### 4. Update Documentation

- [ ] Add package to main repository README
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
npm view @vipasane/agentscope-cli-framework@alpha
```

### Wrong Files Published

```bash
# Check .npmignore and package.json "files" array
# Unpublish if necessary (within 72 hours):
npm unpublish @vipasane/agentscope-cli-framework@0.1.0-alpha.1

# Fix configuration and republish
```

## Version Management

### Alpha Releases (0.1.0-alpha.X)
- For initial testing and feedback
- May have breaking changes
- Use `--tag alpha` when publishing

### Beta Releases (0.1.0-beta.X)
- More stable than alpha
- API mostly finalized
- Use `--tag beta` when publishing

### Stable Releases (0.1.0)
- Production-ready
- Semantic versioning
- Use `--tag latest` when publishing

## Security Considerations

1. **Never commit secrets** - Use npm tokens in environment variables
2. **Review package contents** - Always use `npm pack --dry-run` first
3. **Two-factor authentication** - Enable 2FA on npm account
4. **Audit dependencies** - Even with zero runtime dependencies, audit devDependencies

## Support

For publishing issues:
- npm Support: https://www.npmjs.com/support
- GitHub Issues: https://github.com/vipasane/agentscope/issues
- Repository Maintainers: @vipasane

## License

Published under MIT License - see LICENSE file
