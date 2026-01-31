# ADR-004: Coverage Targets and Metrics

## Status
Proposed

## Context

Measuring test coverage across multiple packages requires clear targets and comprehensive metrics. Coverage must track both individual packages and cross-package interactions.

## Decision

### Coverage Targets

| Test Level | Lines | Functions | Branches | Statements |
|------------|-------|-----------|----------|------------|
| Unit Tests | 90% | 90% | 85% | 90% |
| Integration | 80% | 80% | 75% | 80% |
| E2E | 60% | 60% | 55% | 60% |
| **Combined** | **85%** | **85%** | **80%** | **85%** |

### Package-Specific Targets

**Performance Package:**
- Flash Attention: 95% (critical path)
- HNSW Search: 95% (critical path)
- Caching: 90%
- Profiling: 85%

**Learning Package:**
- ReasoningBank Pipeline: 95%
- EWC++ Consolidation: 90%
- Trajectory Tracking: 90%
- Pattern Storage: 85%

**Security Package:**
- Input Validation: 100% (security-critical)
- Path Validation: 100% (security-critical)
- Secret Detection: 95%
- Sanitizers: 90%

**CLI Framework:**
- Command Parsing: 90%
- Argument Validation: 90%
- Interactive Prompts: 80%
- Error Handling: 95%

### Cross-Package Integration Coverage

Track coverage of integration points:

```typescript
{
  "integrationCoverage": {
    "performance-learning": 85,
    "security-learning": 80,
    "cli-performance": 75,
    "cli-security": 80,
    "all-packages": 70
  }
}
```

### Metrics Collection

Use Vitest coverage + custom metrics:

```typescript
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.bench.ts'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        perFile: true
      },
      watermarks: {
        lines: [80, 95],
        functions: [80, 95],
        branches: [75, 90],
        statements: [80, 95]
      }
    }
  }
}
```

### Quality Gates

Tests must pass ALL gates:
1. ✅ Coverage thresholds met
2. ✅ No regressions detected
3. ✅ Performance benchmarks within limits
4. ✅ Security validation passes
5. ✅ Breaking change detection clean

## Consequences

### Positive
✅ Clear quality standards
✅ Automated enforcement
✅ Visible progress tracking

### Negative
⚠️ May slow down development initially
⚠️ Requires discipline to maintain

## References
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

## Metadata
- **Author**: AgentScope Team
- **Date**: 2026-01-30
