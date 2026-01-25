# Known Issues & Limitations - AgentScope

**Last Updated**: 2026-01-25
**Current Version**: 0.1.0 (deployed)
**Target Version**: v1.2 (planned, not implemented)

---

## Critical Issues (BLOCKING DEPLOYMENT)

### 1. Build Failures

**Status**: 🔴 CRITICAL
**Affects**: v1.2 development branch
**Impact**: Cannot compile, cannot publish

**Issue**: 27 TypeScript compilation errors

**Errors**:
```
src/core/generators/docs/adr-generator.ts(9,20):
  error TS2307: Cannot find module 'gray-matter'

src/core/security/devcontainer-validators.ts(20,19):
  error TS2307: Cannot find module 'zod'

src/core/security/devcontainer-sanitizers.ts(46,11):
  error TS18046: 'value' is of type 'unknown'

+ 24 more type safety violations
```

**Root Cause**:
1. Missing dependencies in package.json (`gray-matter`, `zod`)
2. Unsafe type casts in devcontainer code
3. Missing type guards

**Workaround**: Use v0.1.0 (production version)

**Fix Timeline**:
- Quick fix (remove devcontainer code): 1 hour
- Complete fix (add dependencies + fix types): 2-3 days

**Assigned To**: Development Team
**Priority**: P0 (blocks all releases)

---

### 2. Missing v1.2 Features

**Status**: 🔴 CRITICAL
**Affects**: v1.2 release
**Impact**: Cannot release v1.2 (features don't exist)

**Issue**: All v1.2 roadmap features unimplemented

**Missing Features**:
- ❌ Recursive CLAUDE.md discovery
- ❌ AGENTS.md file support
- ❌ Referenced file parsing
- ❌ Permission Matrix Diagram
- ❌ Hook Lifecycle Diagram
- ❌ Improved documentation clarity
- ❌ Watch mode
- ❌ GitHub Action

**Implementation Status**:
- Phase 1 (Enhanced Documentation): 0/7 tasks
- Phase 2 (Multi-File Support): 0/5 tasks
- Phase 3 (Templates): 2/5 tasks (partial, broken)
- Phase 4 (Testing & Release): 0/5 tasks

**Workaround**: Use v0.1.0 or wait for v0.2.0

**Fix Timeline**: 3 weeks (full v1.2) OR 1 week (v0.2.0 subset)

**Assigned To**: Development Team
**Priority**: P0 (blocks v1.2 release)

---

### 3. Missing Release Notes

**Status**: 🔴 CRITICAL
**Affects**: All releases
**Impact**: Users don't know what changed

**Issue**: CHANGELOG.md not updated for v1.2

**Current State**:
```markdown
## [0.1.0] - 2025-01-22
(no newer versions documented)
```

**Expected**:
```markdown
## [Unreleased]
### Added
- (features being worked on)

## [0.2.0] - 2026-02-XX
### Added
- Enhanced README.md
- System Overview diagram
```

**Workaround**: Read git commits

**Fix Timeline**: 30 minutes
**Assigned To**: Documentation Team
**Priority**: P0 (blocks all releases)

---

## High Priority Issues

### 4. Test Performance Degradation

**Status**: 🟡 HIGH
**Affects**: Development workflow
**Impact**: Slow CI/CD, developer frustration

**Issue**: Tests run extremely slowly

**Metrics**:
- Current: 2-3 seconds per test
- Expected: <500ms per test
- Impact: ~29 minutes for full test suite (estimated)

**Example**:
```
[Pre-Generate] Validation completed in 2332ms
[Post-Generate] Processing completed in 1982ms
Total: 4.3s for ONE test
```

**Root Cause**: Heavy fixture loading per test (suspected)

**Workaround**: Run tests less frequently

**Fix Timeline**: 4-8 hours
**Assigned To**: Testing Team
**Priority**: P1 (impacts productivity)

---

### 5. Coverage Report Failures

**Status**: 🟡 HIGH
**Affects**: Quality assurance
**Impact**: Unknown test coverage

**Issue**: Coverage report hangs and never completes

**Command**:
```bash
npm run test:coverage
# Hangs after starting...
```

**Root Cause**: Unknown (timeout, memory, or infinite loop suspected)

**Workaround**: Estimate coverage manually from test files

**Fix Timeline**: 2-4 hours
**Assigned To**: Testing Team
**Priority**: P1 (affects release quality)

---

### 6. Out-of-Scope Implementation

**Status**: 🟡 HIGH
**Affects**: Code quality, maintainability
**Impact**: Technical debt, confusion

**Issue**: Devcontainer scanning implemented but not in v1.2 scope

**Files**:
- `src/core/security/devcontainer-validators.ts` (15KB)
- `src/core/security/devcontainer-sanitizers.ts` (11KB)
- `examples/devcontainer-scanning.ts`
- 3 ADRs for devcontainer domain

**Problems**:
1. Not in v1.2 Master Plan
2. Not in roadmap
3. Implementation incomplete
4. Breaks build (missing dependencies)
5. No tests

**Workaround**: Ignore files, don't import

**Fix Timeline**: 1 hour (remove) OR 2-3 days (complete)
**Recommendation**: Remove, move to v1.3+ scope
**Assigned To**: Technical Lead
**Priority**: P1 (decision needed)

---

## Medium Priority Issues

### 7. No CI/CD Pipeline

**Status**: 🟠 MEDIUM
**Affects**: Release process
**Impact**: Manual testing only, error-prone

**Issue**: No automated build/test/deploy pipeline

**Current Process**:
1. Developer runs tests locally
2. Developer manually builds
3. Developer manually publishes to npm
4. No automated validation

**Missing**:
- GitHub Actions workflow
- Automated testing on every commit
- Automated npm publish on tag
- Build status badges
- Coverage reporting

**Workaround**: Careful manual testing

**Fix Timeline**: 4-8 hours
**Assigned To**: DevOps
**Priority**: P2 (before next release)

---

### 8. No Performance Benchmarks

**Status**: 🟠 MEDIUM
**Affects**: Performance validation
**Impact**: Cannot verify performance targets

**Issue**: No automated performance benchmarks

**Targets (from v1.2 plan)**:
- <3s scan for 50 components
- <5s general scan time

**Current State**: No benchmarks, cannot validate

**Workaround**: Manual testing with large projects

**Fix Timeline**: 2-4 hours
**Assigned To**: Performance Team
**Priority**: P2 (before v1.2 release)

---

### 9. Documentation vs Code Mismatch

**Status**: 🟠 MEDIUM
**Affects**: Developer experience
**Impact**: Confusion about what's implemented

**Issues**:
1. README.md says v1.2 features "not implemented"
2. But some v1.2 code exists in `/src/core/generators/docs/`
3. Planning docs complete, but no implementation
4. Version numbers confusing (0.1.0, v1.1, v1.2)

**Example**:
```
README.md: "Watch mode - v1.2 -  (not implemented)"
Code: No watch mode implementation
Planning: 22 tasks planned but 0 completed
```

**Workaround**: Trust v0.1.0 as current state

**Fix Timeline**: 1 hour
**Assigned To**: Documentation Team
**Priority**: P2 (user confusion)

---

## Low Priority Issues

### 10. Version Numbering Confusion

**Status**: 🟢 LOW
**Affects**: Marketing, communication
**Impact**: Users confused about versions

**Issue**: Multiple version schemes in use

**Versions**:
- package.json: `0.1.0`
- npm: `@vipasane/agentscope@0.1.0`
- Docs: refer to "v1.1" and "v1.2"
- CHANGELOG: only shows 0.1.0

**Confusion**:
- Is v1.1 = 0.1.0?
- Is v1.2 a real version or planning artifact?
- What's the next release number?

**Recommendation**: Use semver consistently (0.x.x for pre-1.0)

**Fix Timeline**: 30 minutes (documentation update)
**Assigned To**: Product Owner
**Priority**: P3 (communication clarity)

---

### 11. No Migration Guide

**Status**: 🟢 LOW
**Affects**: Users upgrading versions
**Impact**: Difficult upgrades

**Issue**: No documented migration path between versions

**Missing**:
- v0.1.0 → v0.2.0 migration guide
- Breaking changes documentation
- Upgrade checklist

**Workaround**: v0.1.0 → v0.2.0 will be backward compatible (no migration needed)

**Fix Timeline**: 1 hour (for v0.2.0 release)
**Assigned To**: Documentation Team
**Priority**: P3 (only if breaking changes)

---

### 12. Limited Performance for Large Projects

**Status**: 🟢 LOW
**Affects**: Users with 50+ agents
**Impact**: Slow scans, large documentation files

**Issue**: Performance not optimized for large projects

**Current Behavior**:
- Scans work but may be slow for 50+ agents
- Single README.md becomes unwieldy
- Diagrams become cluttered

**Planned Fix**: Category-based documentation (v0.3.0)

**Workaround**: Use `--diagram` flag to generate specific diagrams only

**Fix Timeline**: Week 2 of v1.2 implementation (Phase 2)
**Assigned To**: Development Team
**Priority**: P3 (niche use case)

---

## Limitations by Design

### 13. No Real-Time Updates

**Status**: ✅ BY DESIGN
**Affects**: Development workflow
**Impact**: Must re-run scan after changes

**Limitation**: No watch mode (scan is one-time operation)

**Rationale**: Watch mode adds complexity, planned for v1.3

**Workaround**: Re-run `agentscope scan` after changes

**Future**: v1.3 will add watch mode

---

### 14. No Web Interface

**Status**: ✅ BY DESIGN
**Affects**: Non-technical users
**Impact**: CLI-only interface

**Limitation**: No graphical UI, terminal-based only

**Rationale**: CLI-first tool, web viewer planned for v2.0

**Workaround**: Generated markdown files viewable in GitHub

**Future**: v2.0 will add interactive web viewer

---

### 15. Limited Plugin System

**Status**: ✅ BY DESIGN
**Affects**: Extensibility
**Impact**: Cannot add custom scanners easily

**Limitation**: No plugin architecture yet

**Rationale**: Validate core first, plugins in v2.0

**Workaround**: Fork and modify source code

**Future**: v2.0 will add plugin system

---

## Platform-Specific Issues

### 16. Windows Path Handling

**Status**: ✅ RESOLVED (v1.1)
**Affects**: Windows users
**Impact**: Previously caused path errors

**Issue**: Windows backslash paths caused issues

**Fix**: Path normalization implemented in v1.1

**Status**: No known issues in v0.1.0

---

### 17. macOS Specific Issues

**Status**: ✅ NO KNOWN ISSUES
**Affects**: macOS users
**Impact**: None

**Testing**: Tested on macOS (M1, Intel)

**Status**: Working correctly

---

### 18. Linux Specific Issues

**Status**: ✅ NO KNOWN ISSUES
**Affects**: Linux users
**Impact**: None

**Testing**: Tested on Ubuntu 20.04, 22.04

**Status**: Working correctly

---

## Security Issues

### 19. No Known Security Vulnerabilities

**Status**: ✅ SECURE
**Last Audit**: 2026-01-25
**Impact**: None

**Security Measures**:
- Input validation (Zod schemas)
- DREAD risk scoring
- Sanitization layers
- Path traversal prevention
- Injection prevention

**Known Issues**: None

**Next Audit**: Before v1.0.0 release

---

## Workarounds Summary

| Issue | Recommended Workaround |
|-------|----------------------|
| Build failures | Use v0.1.0 from npm |
| Missing v1.2 features | Wait for v0.2.0 or use v0.1.0 |
| Slow tests | Run less frequently |
| No coverage report | Estimate from test files |
| No CI/CD | Manual testing |
| Large projects slow | Use `--diagram` flag |
| No watch mode | Re-run scan manually |

---

## Issue Tracking

### Report a Bug

**Where**: [GitHub Issues](https://github.com/vipasane/agentscope/issues)

**Template**:
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Run command '...'
2. See error

**Expected behavior**
What you expected to happen.

**Environment**
- OS: [e.g., macOS 13.1]
- Node.js version: [e.g., 18.0.0]
- AgentScope version: [e.g., 0.1.0]

**Additional context**
Any other context about the problem.
```

---

### Feature Requests

**Where**: [GitHub Discussions](https://github.com/vipasane/agentscope/discussions)

**Template**:
```markdown
**Feature Description**
What feature would you like to see?

**Use Case**
Why is this feature important to you?

**Proposed Solution**
How do you envision this working?

**Alternatives Considered**
What alternatives have you considered?
```

---

## Release Status

### v0.1.0 (Current - Production)

**Status**: ✅ STABLE
**Issues**: 0 critical, 0 high
**Recommendation**: Safe to use

---

### v0.2.0 (Planned - 1 week)

**Status**: 🟡 IN PLANNING
**Issues**: Build failures (must fix first)
**Recommendation**: Wait for release

---

### v1.2 (Planned - 3 weeks)

**Status**: 🔴 NOT READY
**Issues**: All features missing, build broken
**Recommendation**: Use v0.2.0 instead (incremental approach)

---

## Getting Help

### Documentation
- [README.md](../README.md) - Quick start and features
- [Architecture](architecture/ARCHITECTURE.md) - System design
- [Themes](themes.md) - Theme system
- [ADRs](adr/) - Architectural decisions

### Support Channels
- GitHub Issues - Bug reports
- GitHub Discussions - Questions and ideas
- Email - security@example.com (security issues only)

---

## Version Status Dashboard

| Version | Status | Critical Issues | Release Date | EOL Date |
|---------|--------|----------------|--------------|----------|
| 0.1.0 | ✅ Supported | 0 | 2025-01-22 | TBD |
| 0.2.0 | 🟡 Planned | 3 blockers | ~2026-02-01 | N/A |
| v1.2 | 🔴 Not Ready | All features missing | TBD | N/A |

---

**Last Updated**: 2026-01-25
**Next Review**: 2026-02-01 (after v0.2.0 release)
**Maintained By**: Production Validation Team

