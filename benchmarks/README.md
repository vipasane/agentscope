# V1.2 Performance Benchmark Suite

Comprehensive benchmark and optimization suite for AgentScope v1.2, measuring performance across multiple scenarios and identifying optimization opportunities.

## Overview

This benchmark suite measures:
- **Scan performance** across different config sizes (small, medium, large)
- **Memory usage** throughout the scan lifecycle
- **CLI cold start time**
- **File I/O operations**
- **Hot paths** (operations consuming most time)
- **Memory-intensive operations**

## Performance Targets

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Small config (5 agents) | <1000ms | <500ms |
| Medium config (20 agents) | <2000ms | <1000ms |
| Large config (50 agents) | <5000ms | <3000ms |
| Peak memory usage | <100MB | <75MB |
| CLI cold start | <500ms | <300ms |

## Project Structure

```
benchmarks/
├── README.md                 # This file
├── v1.2-benchmark.ts         # Main benchmark suite
├── profiler.ts              # Profiling utilities
├── optimizer.ts             # Optimization strategies
├── run-benchmarks.ts        # CLI runner
└── reports/                 # Generated reports
    ├── profiling-*.md       # Hot path analysis
    ├── optimization-*.md    # Applied optimizations
    ├── summary-*.md         # Executive summary
    └── combined-*.json      # Full results (JSON)
```

## Quick Start

```bash
# Run all benchmarks (recommended)
npm run benchmark

# Run with CPU profiling
npm run benchmark:profile

# Run with Node.js inspector (for debugging)
npm run benchmark:inspect
```

## Benchmark Scenarios

### 1. Small Config (Baseline)
- **Size**: 5 agents, 2 skills
- **Target**: <1000ms
- **Purpose**: Baseline performance, minimal overhead

### 2. Medium Config
- **Size**: 20 agents, 10 skills, 5 hooks
- **Target**: <2000ms
- **Purpose**: Typical project size

### 3. Large Config
- **Size**: 50 agents, 20 skills, 10 hooks, 15 commands, 8 MCP servers
- **Target**: <5000ms
- **Purpose**: Stress test, scalability validation

## Understanding the Output

### Phase 1: Baseline Benchmarks
```
Configuration Scan Benchmarks:
======================================

  small-config:
    Description: Small config (5 agents, 2 skills) - baseline
    Agents: 5 (expected: 5)
    Skills: 2 (expected: 2)
    Scan duration: 542.31ms
    Target: 1000ms
    Status: ✓ PASS

  Memory snapshots:
    Startup: 45.23 MB
    Config written: 46.12 MB
    After scan: 52.67 MB
```

**What to look for:**
- ✓ PASS = Meets target
- ✗ FAIL = Exceeds target (optimization needed)
- Memory delta = Memory increase from startup
- Duration vs Target = How close to target

### Phase 2: Profiling Reports

**Hot Paths** (operations taking most time):
```
1. generateCategoryDiagram: 2400ms (34.3%)
2. scanAgentConfig: 1800ms (25.7%)
3. writeOutputFiles: 1200ms (17.1%)
```

**Priority levels:**
- 🔴 HIGH (>20% of total time) - Immediate action required
- 🟡 MEDIUM (10-20%) - Important to optimize
- 🟢 LOW (<10%) - Nice to have

**Memory Hogs** (operations using most memory):
```
1. generateCategoryDiagram: 25.6MB avg
2. buildComponentMap: 18.3MB avg
3. renderMarkdown: 12.1MB avg
```

### Phase 3: Optimization Recommendations

Example output:
```
Top 5 hot paths:
  - generateCategoryDiagram: 2400.00ms (34.3%)
    → HIGH PRIORITY: Consider caching or parallel processing
  - scanAgentConfig: 1800.00ms (25.7%)
    → HIGH PRIORITY: Consider caching or parallel processing
  - writeOutputFiles: 1200.00ms (17.1%)
    → Consider batching (4 calls)

Top 3 memory-intensive operations:
  - generateCategoryDiagram: 25.60MB avg
    → Consider memory pooling or object reuse
```

## Generated Reports

All reports are saved to `benchmarks/reports/` with timestamps:

### 1. Profiling Report (`profiling-*.md`)
- Hot paths ranked by % of total time
- Memory-intensive operations
- Detailed recommendations

### 2. Optimization Report (`optimization-*.md`)
- Available optimization strategies
- Expected improvements
- Risk assessment (low/medium/high)
- Implementation guidance

### 3. Summary Report (`summary-*.md`)
- Executive summary
- Performance targets status
- Priority matrix
- Immediate/medium/long-term actions

### 4. JSON Report (`combined-*.json`)
- All metrics in machine-readable format
- For trend analysis and CI/CD integration

## Optimization Strategies

### 1. Caching (Expected: 30-50% improvement)
**When to use**: Operations called multiple times with same inputs
- Config file parsing
- Agent metadata lookups
- Category filtering

### 2. Memoization (Expected: 40-60% improvement)
**When to use**: Pure functions with expensive computation
- Category classification
- Type validation
- Metadata generation

### 3. Parallel Processing (Expected: 40-60% improvement)
**When to use**: Independent operations on multi-core systems
- Multi-file generation (4 categories in parallel)
- Diagram generation (per category)
- Template rendering

### 4. Batch I/O (Expected: 20-40% improvement)
**When to use**: Multiple file operations
- Batched file writes by directory
- Grouped config reads

### 5. Memory Pooling (Expected: 15-25% memory reduction)
**When to use**: High object allocation/deallocation
- Diagram builders
- Markdown generators
- Temporary buffers

## Interpreting Results

### Meeting Targets
```
✓ All scenarios within targets
  → Review summary for stretch goal opportunities
  → Document current performance baseline
  → Monitor for regressions in CI/CD
```

### Exceeding Targets
```
✗ One or more scenarios exceed targets
  → Review profiling report for hot paths
  → Implement high-priority optimizations
  → Re-run benchmarks to measure improvement
  → Iterate until targets met
```

### Optimization Priority

**Priority 1** (Immediate):
- Operations consuming >20% of total time
- Memory usage >20MB per operation
- Any scenario >2x over target

**Priority 2** (Important):
- Operations consuming 10-20% of time
- Memory usage 10-20MB
- Scenarios 1.5-2x over target

**Priority 3** (Nice-to-have):
- Operations <10% of time
- Memory usage <10MB
- Within targets but could improve

## Advanced Usage

### Running Specific Scenarios

Edit `benchmarks/run-benchmarks.ts` to run only specific scenarios:

```typescript
// Run only large config
const scenarios = [
  generateLargeConfig()
];
```

### Adjusting Targets

Modify targets in `benchmarks/v1.2-benchmark.ts`:

```typescript
{
  name: 'large-config',
  targetMaxMs: 3000, // More aggressive target
}
```

### Custom Profiling

Use the profiler programmatically:

```typescript
import { Profiler } from './profiler.js';

const profiler = new Profiler();
profiler.start();

profiler.markStart('my-operation');
// ... do work ...
profiler.markEnd('my-operation');

profiler.stop();
const hotPaths = profiler.getHotPaths(10);
```

### Memory Analysis

```typescript
import { profile } from './profiler.js';

const { result, duration, memoryDelta } = await profile(
  'expensive-operation',
  async () => {
    // ... expensive work ...
    return result;
  }
);

console.log(`Duration: ${duration}ms, Memory: ${memoryDelta / 1024 / 1024}MB`);
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Performance Benchmarks
  run: npm run benchmark

- name: Check Performance Targets
  run: |
    # Parse JSON report and fail if targets exceeded
    node scripts/check-performance-targets.js
```

Example check script:

```javascript
import { readFile } from 'fs/promises';

const report = JSON.parse(
  await readFile('benchmarks/reports/combined-latest.json', 'utf-8')
);

let failed = false;
for (const scenario of report.scenarios) {
  if (scenario.beforeMs > scenario.target) {
    console.error(`❌ ${scenario.name} exceeded target: ${scenario.beforeMs}ms > ${scenario.target}ms`);
    failed = true;
  }
}

if (failed) process.exit(1);
```

## Troubleshooting

### High Memory Usage
1. Check for memory leaks in generated code
2. Verify object pooling is working
3. Run with `node --inspect` and use Chrome DevTools
4. Check GC activity with `node --trace-gc`

### Slow Performance
1. Review hot paths in profiling report
2. Check for synchronous blocking operations
3. Verify caching is enabled
4. Profile with `node --prof` for V8 insights

### Inconsistent Results
1. Run multiple iterations (increase in benchmark config)
2. Check for system resource contention
3. Disable other processes during benchmarking
4. Use `node --expose-gc` for consistent GC

## Next Steps

After running benchmarks:

1. **Review reports**: Start with `summary-*.md` for high-level overview
2. **Prioritize**: Focus on operations >20% of total time
3. **Implement**: Apply recommended optimizations
4. **Measure**: Re-run benchmarks to validate improvements
5. **Document**: Update ADR-009 with results
6. **Monitor**: Add benchmarks to CI/CD for regression detection

## Reference

- [ADR-009: V1.2 Performance Optimization](../docs/adr/ADR-009-v1.2-performance-optimization.md)
- [Node.js Performance Tips](https://nodejs.org/en/docs/guides/simple-profiling/)
- [V8 Performance Guide](https://v8.dev/blog/fast-properties)

## Contributing

Improvements to the benchmark suite:
- Add new scenarios for edge cases
- Enhance profiling granularity
- Add more optimization strategies
- Improve report formatting

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
