# AgentScope-CI Architecture Documentation

**Version**: 1.0
**Date**: 2026-01-26
**Status**: Proposed
**Target Release**: v1.3 (After AgentScope Core v1.2)

---

## Overview

This directory contains the comprehensive architecture documentation for **AgentScope-CI**, a CI/CD integration layer for AgentScope that enables policy-based security enforcement, pre-commit hooks, and multi-format reporting.

### What is AgentScope-CI?

AgentScope-CI wraps AgentScope Core to provide:

- ✅ **Policy-based enforcement** (YAML schema with inheritance)
- ✅ **Pre-commit hook integration** (Husky, lint-staged)
- ✅ **Exit code handling** (0=success, 1=warnings, 2=critical, 3=config error, 4=scan error)
- ✅ **Multi-format reporting** (Console, JSON, JUnit, SARIF, Markdown)
- ✅ **Performance caching** (<10s pre-commit, <30s CI/CD)
- ✅ **Platform-agnostic** (GitHub Actions, GitLab CI, Jenkins, CircleCI, etc.)

---

## Document Index

### Architecture Decision Records (ADRs)

| ADR | Title | Description |
|-----|-------|-------------|
| [ADR-301](./ADR-301-ci-architecture.md) | **CI/CD Integration Architecture** | Overall system architecture, integration layers, exit codes |
| [ADR-302](./ADR-302-policy-engine.md) | **Policy Engine Design** | YAML schema, Zod validation, policy inheritance, enforcement logic |
| [ADR-303](./ADR-303-exit-code-specification.md) | **Exit Code Specification** | 5 exit codes (0-4), mode behavior, CI/CD integration examples |
| [ADR-304](./ADR-304-pre-commit-integration.md) | **Pre-Commit Integration** | Husky/lint-staged setup, performance targets, caching |
| [ADR-305](./ADR-305-caching-strategy.md) | **Caching Strategy** | AgentDB HNSW indexing, cache invalidation, <10ms lookups |
| [ADR-306](./ADR-306-reporting-formats.md) | **Reporting Formats** | Console, JSON, JUnit, SARIF, Markdown reporters |

### Domain-Driven Design (DDD)

| Document | Title | Description |
|----------|-------|-------------|
| [DDD-301](./DDD-301-ci-domain-model.md) | **CI Domain Model** | 3 bounded contexts (Policy, Enforcement, Reporting), aggregates, value objects |

### Implementation

| Document | Title | Description |
|----------|-------|-------------|
| [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) | **Implementation Plan** | v1.0 → v2.0 roadmap, 4-week timeline, success metrics |

---

## Quick Navigation

### By Use Case

**I want to understand the overall architecture**
→ Start with [ADR-301: CI/CD Integration Architecture](./ADR-301-ci-architecture.md)

**I want to define security policies**
→ Read [ADR-302: Policy Engine Design](./ADR-302-policy-engine.md)

**I need to integrate with CI/CD pipelines**
→ Read [ADR-303: Exit Code Specification](./ADR-303-exit-code-specification.md)

**I want to add pre-commit hooks**
→ Read [ADR-304: Pre-Commit Integration](./ADR-304-pre-commit-integration.md)

**I need better performance**
→ Read [ADR-305: Caching Strategy](./ADR-305-caching-strategy.md)

**I want to generate reports**
→ Read [ADR-306: Reporting Formats](./ADR-306-reporting-formats.md)

**I'm implementing the system**
→ Read [DDD-301: CI Domain Model](./DDD-301-ci-domain-model.md) + [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md)

---

## Key Concepts

### Policy-as-Code

Define security policies in `.agentscope-ci.yml`:

```yaml
version: "1.0"
mode: "blocking"  # audit | warning | blocking

policies:
  security:
    maxDreadScore: 7.0
    blockCritical: true
    blockHigh: true

  secrets:
    allowHardcodedSecrets: false

  mcpServers:
    mode: "allowlist"
    allowed:
      - "claude-flow"
      - "ruv-swarm"
```

### Exit Codes

| Code | Meaning | CI/CD Action |
|------|---------|--------------|
| 0 | Success | ✅ Continue |
| 1 | Warnings | ⚠️ Optional warning |
| 2 | Critical | ❌ Block merge |
| 3 | Config Error | ❌ Fix config |
| 4 | Scan Error | ❌ Fix scanner |

### Performance Targets

| Scenario | Target | Technology |
|----------|--------|------------|
| Pre-commit hook | <10s | Cache with AgentDB HNSW (150x faster) |
| CI/CD scan | <30s | Incremental scanning + caching |
| Cache lookup | <10ms | HNSW indexing (sub-millisecond) |
| Cache hit rate | >80% | SHA-256 file + policy hashing |

### Integration with Ecosystem

AgentScope-CI integrates with:

- **AgentScope Core** (v1.2+): Security scanning engine
- **@claude-flow/security**: Input validation, path safety, secrets sanitization
- **@claude-flow/memory**: AgentDB for caching with HNSW indexing
- **Common Core**: Shared components across claude-flow ecosystem

---

## Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Hook / CI/CD                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  AgentScope-CI CLI                           │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Hook Manager │ Policy Engine│ Report Generator     │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  AgentScope Core                             │
│              (Scanner + Security Validation)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Common Core (@claude-flow)                      │
│  Security | Memory (Caching) | Performance                  │
└─────────────────────────────────────────────────────────────┘
```

### Domain Model (DDD)

```
┌─────────────────┐
│ Policy Context  │
│ - PolicyConfig  │
│ - PolicyRule    │
└────────┬────────┘
         │ provides policy
         ▼
┌─────────────────────┐
│ Enforcement Context │
│ - ScanSession       │
│ - Violation         │
└────────┬────────────┘
         │ provides violations
         ▼
┌─────────────────┐
│ Reporting       │
│ Context         │
│ - Report        │
│ - Format        │
└─────────────────┘
```

---

## Development Workflow

### For Contributors

1. **Read Architecture**:
   - Start with ADR-301 for overall architecture
   - Read DDD-301 for domain model
   - Review IMPLEMENTATION-PLAN for roadmap

2. **Set Up Development Environment**:
   ```bash
   git clone https://github.com/agentscope/agentscope-ci
   cd agentscope-ci
   npm install
   npm run build
   npm test
   ```

3. **Follow Implementation Plan**:
   - Week 1: Policy engine
   - Week 2: Enforcement engine
   - Week 3: Reporters + caching
   - Week 4: CLI + hooks

4. **Write Tests**:
   - Target >85% coverage
   - Unit tests for domain logic
   - Integration tests for CLI
   - Performance tests for caching

### For Users

1. **Install**:
   ```bash
   npm install --save-dev agentscope-ci
   ```

2. **Initialize**:
   ```bash
   npx agentscope-ci init --hook husky
   ```

3. **Configure Policy** (`.agentscope-ci.yml`):
   ```yaml
   version: "1.0"
   mode: "blocking"
   policies:
     security:
       maxDreadScore: 7.0
   ```

4. **Run Check**:
   ```bash
   npx agentscope-ci check --mode=blocking
   ```

---

## Related Documentation

### Input Documents (PRD)

- [PRD-AgentScope-CI.md](../../../docs/PRD-AgentScope-CI.md) - Product Requirements
- [PRODUCT-ECOSYSTEM.md](../../../docs/products/PRODUCT-ECOSYSTEM.md) - Ecosystem Overview
- [COMMON-CORE.md](../../../docs/products/COMMON-CORE.md) - Shared Components

### AgentScope Core

- [ADR-INDEX.md](../../v1.2/ADR-INDEX.md) - AgentScope Core ADRs
- [DDD-003-learning-enhanced-domain-model.md](../../adr/DDD-003-learning-enhanced-domain-model.md) - Learning Domain

### Common Core

- [@claude-flow/security](../COMMON-CORE.md#component-3-security-framework) - Security primitives
- [@claude-flow/memory](../COMMON-CORE.md#component-1-vector-database-layer) - AgentDB integration
- [@claude-flow/performance](../COMMON-CORE.md#component-4-performance-optimization) - Flash Attention, SONA

---

## Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| AgentScope Core v1.2 stable | TBD | ⏳ Waiting |
| AgentScope-CI v1.0 (MVP) | v1.3 release | 📋 Planned |
| AgentScope-CI v1.1 (Enhanced Reporting) | v1.4 release | 📋 Planned |
| AgentScope-CI v2.0 (Advanced Features) | v2.x release | 💡 Future |

---

## Success Metrics

### v1.0 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Repositories using AgentScope-CI | 10+ in 1 month | Telemetry |
| Pre-commit execution time | <10s | CI benchmarks |
| CI/CD integration rate | 80% of test repos | Manual verification |
| Test coverage | >85% | Vitest |
| npm downloads | 50+ per week | npm stats |

---

## Contributing

We welcome contributions! Please:

1. Read the architecture documentation
2. Follow the DDD domain model
3. Write tests (>85% coverage)
4. Update documentation
5. Submit pull requests

---

## License

MIT License - See LICENSE file

---

## Contact

- **Issues**: https://github.com/agentscope/agentscope-ci/issues
- **Discussions**: https://github.com/agentscope/agentscope-ci/discussions
- **Documentation**: https://docs.agentscope.dev/ci

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Maintained By**: AgentScope Product Team
