# Release Checklist - @vipasane/agentscope-security v0.1.0-alpha.1

## Pre-Release Verification

### Code Quality
- [x] All tests passing (310 tests)
- [x] Test coverage >90% (90.19% achieved)
- [x] Build successful (ESM + CJS + DTS)
- [x] No TypeScript errors
- [x] Zero external dependencies maintained

### Documentation
- [x] README.md complete with examples
- [x] CHANGELOG.md created with v0.1.0-alpha.1 entry
- [x] LICENSE file added (MIT)
- [x] API reference documentation complete
- [x] Example code provided
- [x] DREAD scoring documentation

### Package Configuration
- [x] package.json configured for npm
  - [x] Name: @vipasane/agentscope-security
  - [x] Version: 0.1.0-alpha.1
  - [x] Files array specified
  - [x] Repository information
  - [x] Keywords optimized
  - [x] publishConfig set to public
  - [x] prepublishOnly script added
- [x] .npmignore configured
- [x] TypeScript types generated

### Build Verification
- [x] Clean build directory
- [x] Build produces all formats:
  - [x] dist/index.js (CJS)
  - [x] dist/index.mjs (ESM)
  - [x] dist/index.d.ts (TypeScript types)
  - [x] dist/index.d.mts (ESM types)

### Performance
- [x] InputValidator: <50ms (10ms typical)
- [x] PathValidator: <50ms (5ms typical)
- [x] SafeExecutor: <50ms (5ms typical)
- [x] SecretsSanitizer: <100ms (20ms typical)

## Release Process

### 1. Verify Package Contents
```bash
cd packages/security
npm pack --dry-run
```

### 2. Final Tests
```bash
npm test
npm run test:coverage
npm run type-check
```

### 3. Build for Production
```bash
npm run build
```

### 4. Publish to npm
```bash
# Alpha release
npm publish --access public --tag alpha

# Or use the scoped tag
npm publish --access public --tag alpha@0.1.0-alpha.1
```

## Post-Release

### Verification
- [ ] Package visible on npm: https://www.npmjs.com/package/@vipasane/agentscope-security
- [ ] Installation works: `npm install @vipasane/agentscope-security@alpha`
- [ ] Types work in TypeScript projects
- [ ] Both CJS and ESM imports work
- [ ] Documentation renders correctly on npm

### Announcement
- [ ] Update main agentscope README to reference the package
- [ ] Create GitHub release with changelog
- [ ] Tag the release: `git tag @vipasane/agentscope-security@0.1.0-alpha.1`
- [ ] Push tags: `git push --tags`

## Known Limitations (Alpha)

1. **Prompt Injection Detection**: Pattern-based, may have false positives/negatives
2. **Secret Detection**: High entropy threshold may miss some low-entropy secrets
3. **Learning Coordinator**: Requires external storage integration (not included)
4. **DREAD Scorer**: Manual configuration required for scoring weights

## Breaking Changes

None (initial release)

## Migration Guide

Not applicable (initial release)

## Support

- Issues: https://github.com/vipasane/agentscope/issues
- Documentation: https://github.com/vipasane/agentscope/tree/main/packages/security

---

**Ready for alpha release!** All critical items completed.
