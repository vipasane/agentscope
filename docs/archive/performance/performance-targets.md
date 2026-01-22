# AgentScope Performance Targets

**Version**: 0.1.0
**Last Updated**: January 2026

## Overview

This document defines performance targets, current metrics, and tracking methodology for AgentScope.

## Target Definitions

### PRD-Defined Targets

| Target ID | Metric | Requirement | Source |
|-----------|--------|-------------|--------|
| PT-001 | Scan completion (<50 components) | <5 seconds | PRD v2.0 Section 9 |
| PT-002 | Memory usage (typical projects) | <100MB | PRD v2.0 Section 9 |
| PT-003 | Diagram generation (per diagram) | <1 second | PRD v2.0 Section 9 |

### Extended Targets (Post-MVP)

| Target ID | Metric | Requirement | Target Version |
|-----------|--------|-------------|----------------|
| PT-004 | Optimized scan (<50 components) | <3 seconds | v1.1 |
| PT-005 | CLI startup time | <500ms | v1.1 |
| PT-006 | Watch mode latency | <100ms | v1.2 |
| PT-007 | Large project scan (500+ components) | <30 seconds | v2.0 |

## Current Performance vs Targets

### PT-001: Scan Completion

**Target**: <5 seconds for projects with <50 components

| Configuration | Components | Measured Time | Status | Margin |
|---------------|------------|---------------|--------|--------|
| Minimal | 2 | 0.02ms | PASS | 250,000x |
| Small | 12 | 0.02ms | PASS | 250,000x |
| Typical | 27 | 0.02ms | PASS | 250,000x |
| Large | 50 | ~0.03ms | PASS | 166,667x |

**Current Status**: PASSING (100x better than target)

### PT-002: Memory Usage

**Target**: <100MB for typical projects

| Configuration | Components | Peak Memory | Status | Margin |
|---------------|------------|-------------|--------|--------|
| Minimal | 2 | <5MB | PASS | 20x |
| Small | 12 | <5MB | PASS | 20x |
| Typical | 27 | <10MB | PASS | 10x |
| Large | 50 | <15MB | PASS | 6.7x |
| Stress | 220 | <30MB | PASS | 3.3x |

**Current Status**: PASSING (3.3x better than target)

### PT-003: Diagram Generation

**Target**: <1 second per diagram

| Diagram Type | Components | Measured Time | Status | Margin |
|--------------|------------|---------------|--------|--------|
| Component Map | 27 | 0.015ms | PASS | 66,667x |
| Component Map | 110 | 0.089ms | PASS | 11,236x |
| Component Map | 430 | 0.543ms | PASS | 1,842x |
| Workflow Sequence | 27 | 0.003ms | PASS | 333,333x |
| Hierarchy | 110 | 0.012ms | PASS | 83,333x |
| Data Flow | 110 | 0.014ms | PASS | 71,429x |

**Current Status**: PASSING (1000x better than target)

## Performance Budget

### Per-Operation Budgets

| Operation | Budget | P95 Threshold | P99 Threshold |
|-----------|--------|---------------|---------------|
| File read (single) | 1ms | 2ms | 5ms |
| File read (all) | 10ms | 15ms | 25ms |
| Config parsing | 5ms | 7.5ms | 15ms |
| Config aggregation | 5ms | 7.5ms | 15ms |
| Diagram generation | 10ms | 15ms | 25ms |
| Documentation generation | 20ms | 30ms | 50ms |
| Full scan | 50ms | 75ms | 150ms |

### Memory Budgets

| Phase | Budget | Alert Threshold |
|-------|--------|-----------------|
| Idle | 10MB | 15MB |
| Scanning | 30MB | 45MB |
| Generating | 50MB | 75MB |
| Peak | 75MB | 90MB |

## Scaling Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| File discovery | O(n) | n = number of files |
| Config parsing | O(n) | n = total file size |
| Agent aggregation | O(a) | a = number of agents |
| Component Map | O(a + s + a*s_avg) | s = skills, s_avg = avg skills per agent |
| Sequence Diagram | O(1) | Fixed participant limit |
| Hierarchy Diagram | O(a) | Linear with agents |
| Full Documentation | O(a + s + h + m) | Sum of all components |

### Space Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Config in memory | O(n) | n = total config size |
| Diagram string | O(c) | c = component count |
| Documentation | O(c * d) | d = avg description length |
| Cache | O(k * v) | k = keys, v = avg value size |

## Benchmark Matrix

### Component Count Scaling

| Components | Config Gen | Component Map | Full Suite |
|------------|------------|---------------|------------|
| 2 | 0.002ms | 0.002ms | 0.012ms |
| 12 | 0.004ms | 0.006ms | 0.030ms |
| 27 | 0.008ms | 0.015ms | 0.111ms |
| 50 | ~0.015ms | ~0.030ms | ~0.200ms |
| 100 | ~0.030ms | ~0.080ms | ~0.500ms |
| 220 | 0.076ms | 0.233ms | 1.386ms |
| 430 | ~0.150ms | 0.543ms | ~2.500ms |
| 1000 | ~0.350ms | ~1.300ms | ~6.000ms |

*Estimated values marked with ~*

### File Size Scaling

| File Count | Total Size | Read Time | Parse Time |
|------------|------------|-----------|------------|
| 10 | 10KB | 0.05ms | 0.01ms |
| 50 | 50KB | 0.25ms | 0.05ms |
| 100 | 100KB | 0.50ms | 0.10ms |
| 500 | 500KB | 2.50ms | 0.50ms |
| 1000 | 1MB | 5.00ms | 1.00ms |

## Monitoring and Alerting

### Metrics to Track

1. **Scan Duration**
   - Percentiles: p50, p95, p99
   - Alert if p95 > 75ms for typical config

2. **Memory Usage**
   - Peak heap usage
   - Alert if peak > 75MB

3. **Cache Performance**
   - Hit rate
   - Alert if hit rate < 80%

4. **Error Rate**
   - Parse failures
   - Alert if rate > 1%

### Regression Detection

Performance regression is detected when:

1. P95 latency increases >20% from baseline
2. Memory usage increases >30% from baseline
3. Cache hit rate drops >10% from baseline

## Performance Testing Strategy

### Unit Benchmarks

Run on every commit:
- Individual function benchmarks
- Memory allocation tests
- Cache effectiveness tests

### Integration Benchmarks

Run on every PR:
- Full scan benchmarks
- Documentation generation benchmarks
- Scaling tests

### Load Testing

Run weekly:
- Stress tests with 1000+ components
- Memory pressure tests
- Concurrent operation tests

## Tools and Configuration

### Benchmark Framework

**Tool**: Vitest with tinybench

```typescript
// Example benchmark configuration
bench('operation name', () => {
  // Operation to benchmark
}, { iterations: 1000, warmup: 100 });
```

### Performance Utilities

**Location**: `/src/utils/performance.ts`

```typescript
// Measure operation performance
const { result, metrics } = await measurePerformance('operation', async () => {
  return await operation();
});

// Get memory stats
const memory = getMemoryUsage();
console.log(`Heap: ${memory.heapUsedMB}`);
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | Jan 2026 | Initial benchmarks, all targets met |

## References

- PRD v2.0: Performance requirements in Section 9
- Benchmark results: `/docs/performance/benchmarks.md`
- Optimization details: `/docs/performance/optimization-report.md`
