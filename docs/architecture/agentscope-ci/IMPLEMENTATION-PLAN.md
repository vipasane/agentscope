# AgentScope-CI Implementation Plan

**Version**: 1.0
**Date**: 2026-01-26
**Target Release**: v1.3 (After AgentScope Core v1.2)

---

## Executive Summary

AgentScope-CI is a CI/CD integration layer that wraps AgentScope Core to provide policy-based enforcement, pre-commit hooks, and multi-format reporting. This plan outlines the implementation roadmap from v1.0 (MVP) to v2.0 (Advanced Features).

### Timeline Overview

| Phase | Duration | Target | Key Deliverables |
|-------|----------|--------|-----------------|
| **v1.0** | 3-4 weeks | v1.3 | Policy engine, pre-commit hooks, basic reporters |
| **v1.1** | 2-3 weeks | v1.4 | Enhanced reporters (JUnit, SARIF, Markdown) |
| **v2.0** | TBD | v2.x | Custom rules, encrypted policies, dashboard UI |

---

## v1.0 - MVP Release (3-4 weeks)

### Goals

1. ✅ Policy-based enforcement (YAML schema)
2. ✅ Pre-commit hook integration (Husky, lint-staged)
3. ✅ Exit code handling (0, 1, 2, 3, 4)
4. ✅ Console and JSON reporters
5. ✅ Basic caching for performance
6. ✅ Configuration validation

### Week 1: Foundation

#### Days 1-2: Project Setup

**Tasks**:
- Create npm package `agentscope-ci`
- Set up TypeScript project structure
- Configure build tooling (tsup, Vitest)
- Install dependencies (commander, zod, js-yaml, chalk)

**Deliverables**:
```
agentscope-ci/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts
│   └── types.ts
├── tests/
│   └── setup.ts
└── README.md
```

**Acceptance Criteria**:
- `npm run build` produces dist/ directory
- `npm test` runs Vitest successfully
- TypeScript strict mode enabled

#### Days 3-5: Policy Engine (ADR-302)

**Tasks**:
- Implement PolicySchema (Zod validation)
- Create PolicyLoader (YAML parsing with inheritance)
- Build PolicyEnforcer (rule application)
- Write unit tests (>85% coverage)

**Files**:
```
src/policy/
├── schema.ts           # Zod schema
├── loader.ts           # Load and merge policies
├── enforcer.ts         # Apply policy rules
└── types.ts            # TypeScript interfaces
```

**Acceptance Criteria**:
- Load policy from `.agentscope-ci.yml`
- Support policy inheritance (org → team → repo)
- Validate policy with Zod (fail on invalid schema)
- Apply severity thresholds correctly
- Handle path-based overrides

**Tests**:
```typescript
describe('PolicyEngine', () => {
  it('should load valid policy', async () => { ... });
  it('should merge org/team/repo policies', async () => { ... });
  it('should block critical violations', async () => { ... });
  it('should respect audit mode', async () => { ... });
});
```

### Week 2: Core Enforcement

#### Days 6-8: Enforcement Engine (DDD-301)

**Tasks**:
- Implement ScanSession aggregate
- Create PolicyEnforcer domain service
- Integrate with AgentScope Core scanner
- Build anti-corruption layer for AgentScope

**Files**:
```
src/domain/
├── enforcement/
│   ├── scan-session.ts      # Aggregate root
│   ├── violation.ts         # Value object
│   └── policy-enforcer.ts   # Domain service
└── infrastructure/
    └── agentscope-adapter.ts # Anti-corruption layer
```

**Acceptance Criteria**:
- ScanSession tracks violations and scanned files
- Violations converted from AgentScope issues
- Exit code determined by policy and violations
- Domain logic isolated from AgentScope types

**Tests**:
```typescript
describe('ScanSession', () => {
  it('should determine exit code correctly', () => { ... });
  it('should filter violations by mode', () => { ... });
  it('should track cache stats', () => { ... });
});
```

#### Days 9-10: Exit Code Logic (ADR-303)

**Tasks**:
- Implement exit code determination logic
- Create exit code handler with clear messages
- Handle error cases (config error, scan error)
- Write comprehensive tests

**Files**:
```
src/exit-codes/
├── exit-code.ts         # Exit code enum and logic
├── messages.ts          # User-facing messages
└── handler.ts           # Exit with appropriate code
```

**Acceptance Criteria**:
- Exit 0 on success
- Exit 1 on warnings (blocking mode only)
- Exit 2 on critical violations
- Exit 3 on config errors
- Exit 4 on scan errors
- Clear error messages for each code

**Tests**:
```typescript
describe('ExitCodeLogic', () => {
  it('should exit 0 when no violations', () => { ... });
  it('should exit 2 on critical violations', () => { ... });
  it('should exit 1 on warnings in blocking mode', () => { ... });
  it('should exit 0 on warnings in audit mode', () => { ... });
});
```

### Week 3: Reporting & Caching

#### Days 11-13: Reporters (ADR-306)

**Tasks**:
- Implement ConsoleReporter (colored output)
- Implement JSONReporter (structured data)
- Create ReporterFactory
- Write tests for each format

**Files**:
```
src/reporters/
├── base-reporter.ts      # Common interface
├── console-reporter.ts   # Human-readable
├── json-reporter.ts      # Machine-parseable
├── reporter-factory.ts   # Factory pattern
└── types.ts              # Shared types
```

**Acceptance Criteria**:
- Console output uses chalk for colors
- JSON output includes all violation details
- Reports include summary, violations, metadata
- Factory creates correct reporter by format

**Tests**:
```typescript
describe('Reporters', () => {
  it('should generate colored console output', () => { ... });
  it('should generate valid JSON', () => { ... });
  it('should include violation summary', () => { ... });
});
```

#### Days 14-15: Caching (ADR-305)

**Tasks**:
- Implement CacheManager with AgentDB
- Create cache key generation (file + policy hash)
- Build cache invalidation logic
- Write performance tests

**Files**:
```
src/cache/
├── cache-manager.ts      # Main cache logic
├── cache-key.ts          # Key generation
├── agentdb-config.ts     # AgentDB setup
└── types.ts              # Cache types
```

**Acceptance Criteria**:
- Cache hit rate >80% on unchanged files
- Cache lookup <10ms
- Invalidate on policy or file changes
- Use AgentDB with HNSW indexing

**Tests**:
```typescript
describe('CacheManager', () => {
  it('should hit cache for unchanged files', async () => { ... });
  it('should miss cache for changed files', async () => { ... });
  it('should achieve <10ms lookup time', async () => { ... });
  it('should achieve >80% hit rate', async () => { ... });
});
```

### Week 4: CLI & Hooks

#### Days 16-18: CLI Commands

**Tasks**:
- Implement `check` command (main command)
- Implement `init` command (setup wizard)
- Implement `validate-policy` command
- Create help documentation

**Files**:
```
src/cli/
├── index.ts              # CLI entry point
├── commands/
│   ├── check.ts          # Main scan command
│   ├── init.ts           # Setup wizard
│   └── validate-policy.ts
└── types.ts
```

**Acceptance Criteria**:
- `agentscope-ci check` runs scan and enforces policy
- `agentscope-ci init` sets up hooks and config
- `agentscope-ci validate-policy` checks YAML syntax
- `--help` shows clear usage instructions

**Tests**:
```typescript
describe('CLI', () => {
  it('should run check command', async () => { ... });
  it('should initialize project', async () => { ... });
  it('should validate policy file', async () => { ... });
});
```

#### Days 19-21: Pre-commit Integration (ADR-304)

**Tasks**:
- Create Husky hook template
- Create lint-staged config template
- Create manual Git hook template
- Implement hook installation logic

**Files**:
```
templates/
├── husky/
│   └── pre-commit        # Husky hook
├── lint-staged/
│   └── .lintstagedrc.js
├── git-hooks/
│   └── pre-commit        # Manual hook
└── agentscope-ci.yml     # Default policy
```

**Acceptance Criteria**:
- `agentscope-ci init --hook husky` installs Husky hook
- Hook runs on `git commit` automatically
- Hook completes in <10s for typical commits
- Clear error messages on violations

**Tests**:
```typescript
describe('PreCommitHooks', () => {
  it('should install Husky hook', async () => { ... });
  it('should run on git commit', async () => { ... });
  it('should complete in <10s', async () => { ... });
});
```

---

## v1.1 - Enhanced Reporting (2-3 weeks)

### Goals

1. ✅ JUnit XML reporter (CI/CD test integration)
2. ✅ SARIF reporter (security tools integration)
3. ✅ Markdown reporter (PR comments)
4. ✅ Policy inheritance improvements
5. ✅ Audit logging

### Week 5: Advanced Reporters

#### Days 22-25: JUnit & SARIF Reporters

**Tasks**:
- Implement JUnitReporter (XML format)
- Implement SARIFReporter (security tools)
- Test integration with GitHub/GitLab CI

**Files**:
```
src/reporters/
├── junit-reporter.ts     # JUnit XML
├── sarif-reporter.ts     # SARIF format
└── markdown-reporter.ts  # PR comments
```

**Acceptance Criteria**:
- JUnit XML passes validation
- SARIF format matches v2.1.0 spec
- GitHub Actions can upload SARIF
- GitLab CI can parse JUnit XML

#### Days 26-28: Metrics & Audit Logging

**Tasks**:
- Implement metrics collection
- Create audit log for violations
- Build metrics API (data only, no UI)

**Files**:
```
src/metrics/
├── collector.ts          # Collect metrics
├── aggregator.ts         # Aggregate data
└── api.ts                # Expose metrics
```

**Acceptance Criteria**:
- Track violation trends over time
- Export metrics as JSON/CSV
- Audit log records all violations

---

## v2.0 - Advanced Features (Future)

### Goals

1. ⏳ Custom policy rules (plugin system)
2. ⏳ Interactive policy builder
3. ⏳ Encrypted policy files
4. ⏳ Role-based overrides
5. ⏳ Dashboard UI (separate package)
6. ⏳ SIEM/security tool integrations

### Features (TBD)

#### Custom Rules Plugin System

```typescript
// Allow custom policy rules
export interface CustomRule {
  name: string;
  description: string;
  validate(config: AgentConfig): Violation[];
}

// Example custom rule
class NoExperimentalMCPRule implements CustomRule {
  name = 'no-experimental-mcp';
  description = 'Block experimental MCP servers';

  validate(config: AgentConfig): Violation[] {
    const violations: Violation[] = [];
    for (const server of config.mcpServers) {
      if (server.name.includes('experimental')) {
        violations.push(new Violation(
          'high',
          'EXPERIMENTAL_MCP',
          'custom.no-experimental-mcp',
          config.path,
          undefined,
          `Experimental MCP server: ${server.name}`,
          'Use stable MCP servers only'
        ));
      }
    }
    return violations;
  }
}
```

#### Interactive Policy Builder

```bash
$ agentscope-ci init --interactive

AgentScope-CI Setup Wizard
===========================

1. Enforcement mode:
   [ ] Audit (report only)
   [ ] Warning (report but don't fail)
   [x] Blocking (fail on violations)

2. Security policies:
   Maximum DREAD score: [7.0]
   Block critical: [yes]
   Block high: [yes]
   Block medium: [no]

3. MCP servers:
   [ ] Allow all
   [x] Allowlist
   [ ] Denylist

   Allowed servers:
   - claude-flow
   - ruv-swarm
   [Add more...]

4. Secrets detection:
   Scan for hardcoded secrets: [yes]
   Files to scan:
   - .claude/**
   - CLAUDE.md
   [Add more...]

✅ Configuration saved to .agentscope-ci.yml
```

#### Dashboard UI (Separate Package)

```bash
# Install dashboard
npm install -g agentscope-ci-dashboard

# Start dashboard server
agentscope-ci-dashboard start --port 3000

# Dashboard shows:
# - Violation trends over time
# - Repository compliance scores
# - Top violation types
# - Policy compliance rate
```

---

## Success Metrics

### v1.0 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Repositories using AgentScope-CI** | 10+ in 1 month | Telemetry |
| **Pre-commit hook execution time** | <10s | CI benchmarks |
| **CI/CD integration rate** | 80% of test repos | Manual verification |
| **Test coverage** | >85% | Vitest coverage report |
| **npm downloads** | 50+ per week | npm stats |

### v1.1 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **SARIF integration** | GitHub/GitLab support | Manual verification |
| **JUnit integration** | CI/CD test reporters | Manual verification |
| **Policy compliance rate** | >90% | Metrics API |

---

## Dependencies

### Internal Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@vipasane/agentscope` | v1.2+ | Core scanning engine |
| `@claude-flow/security` | v3.0+ | Input validation, path safety, secrets |
| `@claude-flow/memory` | v3.0+ | AgentDB for caching |

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `commander` | ^14.x | CLI framework |
| `zod` | ^3.x | Schema validation |
| `js-yaml` | ^4.x | YAML parsing |
| `chalk` | ^5.x | Console colors |
| `ora` | ^8.x | Spinners |
| `husky` | ^9.x | Git hooks (optional) |

---

## Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **False positives break workflows** | Medium | High | Extensive testing, clear override mechanism |
| **Performance issues** | Medium | High | Caching with AgentDB, incremental scanning |
| **AgentScope breaking changes** | Low | High | Semantic versioning, anti-corruption layer |

### Adoption Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Developers bypass hooks** | High | High | CI/CD enforcement (can't bypass), audit logs |
| **Resistance to new tooling** | Medium | Medium | Clear value proposition, gradual rollout |
| **Documentation insufficient** | Medium | High | 5+ CI platform examples, video tutorials |

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)

- Deploy to 2-3 internal repositories
- Run in audit mode (don't block commits)
- Collect feedback on false positives

### Phase 2: Beta Testing (Week 2)

- Deploy to 5-10 beta tester repositories
- Enable warning mode
- Iterate based on feedback

### Phase 3: GA Release (Week 3)

- Publish to npm
- Announce on GitHub Discussions
- Blog post + social media
- Enable blocking mode for early adopters

### Phase 4: Adoption Drive (Weeks 4-8)

- Create video tutorials
- Write integration guides (5+ CI platforms)
- Community support (GitHub Discussions, Discord)
- Track metrics and iterate

---

## Maintenance Plan

### Ongoing Tasks

- **Weekly**: Review GitHub issues and pull requests
- **Monthly**: Security updates for dependencies
- **Quarterly**: Review and update policy schema
- **Yearly**: Major version update with breaking changes

### Documentation

- Getting started guide
- Policy reference (all YAML options)
- CI/CD integration examples (5+ platforms)
- Troubleshooting guide
- FAQ

---

## Conclusion

AgentScope-CI provides a critical shift-left security capability for AI agent development. By wrapping AgentScope Core with policy enforcement, pre-commit hooks, and multi-format reporting, it enables teams to catch security issues before they reach production.

**Next Steps**:

1. ✅ Wait for AgentScope Core v1.2 stable release
2. ✅ Begin Week 1 implementation (project setup + policy engine)
3. ✅ Iterate based on feedback
4. ✅ Launch v1.0 in ~4 weeks

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Next Review**: After v1.0 launch
**Owner**: AgentScope Product Team
