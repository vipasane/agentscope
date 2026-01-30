# NPM Release Checklist - v0.1.0-alpha.1

## Pre-Release Verification

### Security Package (@claude-flow/security)
- [x] Version bumped to 0.1.0-alpha.1
- [x] Build successful (dist/ generated)
- [x] All tests passing (300+ tests, 90%+ coverage)
- [x] Type checking passed
- [x] Dry run successful
- [x] Release notes created
- [x] package.json verified:
  - [x] Correct name (@claude-flow/security)
  - [x] Correct version (0.1.0-alpha.1)
  - [x] publishConfig: { access: "public" }
  - [x] main, types, files array correct

### Performance Package (@claude-flow/performance)
- [x] Version bumped to 0.1.0-alpha.1
- [x] Build successful (dist/ generated)
- [ ] All tests passing (running in background)
- [x] Type checking has warnings (OptimizationStrategies - non-critical)
- [x] Dry run successful
- [x] Release notes created
- [x] package.json verified:
  - [x] Correct name (@claude-flow/performance)
  - [x] Correct version (0.1.0-alpha.1)
  - [x] publishConfig: { access: "public" }
  - [x] main, types, files array correct

### Scripts and Documentation
- [x] publish-alpha.sh created and tested
- [x] create-release-tags.sh created
- [x] RELEASE-CHECKLIST.md created
- [x] Both packages have RELEASE-NOTES-0.1.0-alpha.1.md

## Known Issues (Alpha Quality)
- Performance package OptimizationStrategies has type errors (unused code)
- Both packages are alpha quality - not production ready
- Documentation is minimal (READMEs only)
- Some integration tests pending

## Release Process

### 1. Final Pre-Flight Check
```bash
# Run publish script in dry-run mode
./scripts/publish-alpha.sh

# Verify output shows both packages ready
```

### 2. Publish to NPM (When Ready)
```bash
# Option A: Run script with --execute flag
./scripts/publish-alpha.sh --execute

# Option B: Publish manually
cd packages/security
npm publish --access public --tag alpha

cd ../performance
npm publish --access public --tag alpha
```

### 3. Verify Publication
```bash
# Check packages are live
npm view @claude-flow/security@alpha
npm view @claude-flow/performance@alpha

# Test installation
npm install @claude-flow/security@alpha
npm install @claude-flow/performance@alpha
```

### 4. Create Git Tags
```bash
# Create release tags
./scripts/create-release-tags.sh

# Push tags to GitHub
git push origin --tags
```

### 5. GitHub Releases
- [ ] Create GitHub release for @claude-flow/security@0.1.0-alpha.1
- [ ] Create GitHub release for @claude-flow/performance@0.1.0-alpha.1
- [ ] Attach release notes to each release
- [ ] Mark as pre-release (alpha)

### 6. Post-Release
- [ ] Update main README.md with installation instructions
- [ ] Announce in project channels
- [ ] Update documentation site (if applicable)
- [ ] Create issues for known limitations
- [ ] Plan beta release timeline

## Installation Commands (Post-Release)

### Security Package
```bash
# Install alpha version
npm install @claude-flow/security@alpha

# Or specific version
npm install @claude-flow/security@0.1.0-alpha.1
```

### Performance Package
```bash
# Install alpha version
npm install @claude-flow/performance@alpha

# Or specific version
npm install @claude-flow/performance@0.1.0-alpha.1
```

### Both Packages
```bash
npm install @claude-flow/security@alpha @claude-flow/performance@alpha
```

## Verification Steps (Post-Release)

1. **Package Availability**
   - Visit https://www.npmjs.com/package/@claude-flow/security
   - Visit https://www.npmjs.com/package/@claude-flow/performance
   - Verify alpha tag shows 0.1.0-alpha.1

2. **Installation Test**
   ```bash
   mkdir test-install && cd test-install
   npm init -y
   npm install @claude-flow/security@alpha @claude-flow/performance@alpha
   node -e "require('@claude-flow/security')"
   node -e "require('@claude-flow/performance')"
   ```

3. **Import Test**
   ```typescript
   // test.ts
   import { InputValidator } from '@claude-flow/security';
   import { HNSWEngine } from '@claude-flow/performance';

   console.log('Imports successful!');
   ```

## Rollback Plan (If Needed)

```bash
# Unpublish within 72 hours if critical issues found
npm unpublish @claude-flow/security@0.1.0-alpha.1
npm unpublish @claude-flow/performance@0.1.0-alpha.1

# Note: npm unpublish is only allowed within 72 hours of publish
# After that, must publish a new version to fix issues
```

## Next Steps After Alpha

1. **Gather Feedback**
   - Monitor GitHub issues
   - Track npm download stats
   - Collect user feedback

2. **Beta Release Planning**
   - Fix known issues
   - Complete documentation
   - Add missing features
   - Comprehensive integration tests

3. **Production Release**
   - Full documentation
   - 95%+ test coverage
   - All critical issues resolved
   - Performance validation in real-world scenarios
   - Security audit complete

## Notes

- **Alpha Tag**: Packages published with `--tag alpha` won't be installed by default with `npm install`
- **Semantic Versioning**: Following semver for pre-releases (0.1.0-alpha.1)
- **Public Access**: Both packages require `--access public` for scoped packages
- **Registry**: Publishing to official npm registry (registry.npmjs.org)

## Support

- **Issues**: https://github.com/ruvnet/agentscope/issues
- **Discussions**: https://github.com/ruvnet/agentscope/discussions
- **Security**: Report security issues privately via GitHub Security tab
