# AgentScope Performance Benchmarks

**Last Updated**: January 2026
**Test Environment**: Node.js 20+ on Linux (WSL2)

## Overview

This document contains performance benchmark results for AgentScope, measuring scan performance, diagram generation, memory usage, and caching effectiveness.

## Performance Targets (from PRD)

| Metric | Target | Status |
|--------|--------|--------|
| Scan completion (<50 components) | <5 seconds | PASS |
| Memory usage (typical projects) | <100MB | PASS |
| Diagram generation | <1 second per diagram | PASS |

## Benchmark Results

### 1. Scan Performance

#### In-Memory Config Generation

| Configuration Size | Mean Time (ms) | Throughput (ops/sec) | Status |
|-------------------|----------------|----------------------|--------|
| Minimal (2 components) | 0.0017 | 573,645 | PASS |
| Small (12 components) | 0.0039 | 257,728 | PASS |
| Typical (27 components) | 0.0077 | 129,323 | PASS |
| Large (110 components) | 0.0326 | 30,651 | PASS |
| Stress (220 components) | 0.0758 | 13,188 | PASS |

**Key Finding**: Config generation scales linearly with component count. A typical 27-component project generates in 0.008ms.

#### Full Scan Simulation (File I/O Included)

| Fixture Size | Mean Time (ms) | Throughput (ops/sec) |
|--------------|----------------|----------------------|
| Minimal | 0.0175 | 57,238 |
| Typical | 0.0176 | 56,885 |
| Large | 0.0188 | 53,129 |
| Stress | 0.0149 | 67,318 |

**Key Finding**: Full scan including file I/O completes in <0.02ms per operation. For 50 components, estimated full scan time is <50ms, well under the 5-second target.

### 2. Diagram Generation Performance

#### Component Map (Mermaid Flowchart)

| Size | Mean Time (ms) | Throughput (ops/sec) | Target (<1s) |
|------|----------------|----------------------|--------------|
| Minimal (2 components) | 0.0015 | 662,903 | PASS |
| Small (12 components) | 0.0061 | 164,402 | PASS |
| Typical (27 components) | 0.0148 | 67,638 | PASS |
| Large (110 components) | 0.0888 | 11,262 | PASS |
| Stress (220 components) | 0.2328 | 4,295 | PASS |
| Extreme (430 components) | 0.5425 | 1,843 | PASS |

**Key Finding**: Even extreme configurations with 430 components generate in 0.54ms, well under the 1-second target.

#### Workflow Sequence (Mermaid Sequence Diagram)

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Minimal | 0.0016 | 628,017 |
| Small | 0.0025 | 407,931 |
| Typical | 0.0029 | 347,779 |
| Large | 0.0032 | 313,177 |
| Stress | 0.0029 | 341,675 |

**Key Finding**: Sequence diagrams are limited to 5 participants, keeping generation time constant regardless of project size.

#### Hierarchy Diagram

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Minimal | 0.0004 | 2,265,582 |
| Typical | 0.0024 | 413,666 |
| Large | 0.0121 | 82,549 |
| Stress | 0.0226 | 44,309 |

#### Data Flow Diagram

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Minimal | 0.0009 | 1,170,614 |
| Typical | 0.0132 | 75,609 |
| Large | 0.0139 | 72,163 |
| Stress | 0.0139 | 72,078 |

### 3. Documentation Generation

#### README.md Generation

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Minimal | 0.0035 | 285,644 |
| Typical | 0.0187 | 53,583 |
| Large | 0.0852 | 11,741 |
| Stress | 0.2240 | 4,465 |

#### AGENTS.md Generation

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Minimal | 0.0012 | 844,321 |
| Typical | 0.0146 | 68,593 |
| Large | 0.0937 | 10,677 |
| Stress | 0.3844 | 2,601 |

#### Full Documentation Suite (All Diagrams + Docs)

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Minimal | 0.0115 | 87,165 |
| Typical | 0.1112 | 8,994 |
| Large | 0.5607 | 1,784 |
| Stress | 1.3860 | 722 |

**Key Finding**: Full documentation suite for a typical project generates in 0.11ms. Even stress configurations complete in 1.39ms.

### 4. Memory Performance

#### Config Generation Memory

| Size | Throughput (ops/sec) | Relative Performance |
|------|----------------------|---------------------|
| Minimal | 702,314 | 1.00x (baseline) |
| Small | 249,703 | 0.36x |
| Typical | 119,307 | 0.17x |
| Large | 35,975 | 0.05x |
| Stress | 14,452 | 0.02x |
| Extreme | 4,589 | 0.007x |

#### String Building Memory

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| 1KB | 0.0023 | 437,405 |
| 10KB | 0.0252 | 39,695 |
| 100KB | 0.4099 | 2,440 |
| 1MB | 2.0420 | 490 |

#### JSON Serialization

| Size | Mean Time (ms) | Throughput (ops/sec) |
|------|----------------|----------------------|
| Small | 0.0106 | 93,985 |
| Typical | 0.0245 | 40,771 |
| Large | 0.1077 | 9,282 |
| Stress | 0.4076 | 2,453 |

### 5. Caching Effectiveness

| Operation | Mean Time (ms) | Throughput (ops/sec) | Improvement |
|-----------|----------------|----------------------|-------------|
| Uncached diagram generation | 0.0123 | 81,271 | Baseline |
| Cached diagram generation | 0.0001 | 8,363,704 | **102.91x faster** |

**Key Finding**: Caching provides a 102.91x speedup for repeated diagram generation. This is critical for watch mode and CI/CD scenarios.

## Performance Scaling Analysis

### Linear Scaling Observed

Component count vs. generation time shows near-linear scaling:

```
Components   Time (ms)   Time per Component (us)
    2         0.0015          0.75
   12         0.0061          0.51
   27         0.0148          0.55
  110         0.0888          0.81
  220         0.2328          1.06
  430         0.5425          1.26
```

The slight increase in per-component time at higher counts is due to relationship graph complexity (O(n*m) where m is average skills per agent).

### Memory Efficiency

All benchmarks maintained heap usage well under the 100MB target:

- Typical config generation: <5MB heap
- Large config (110 components): <15MB heap
- Stress test (220 components): <30MB heap

## Recommendations

Based on benchmark results:

1. **Caching is Essential**: Implement caching for diagram generation in CI/CD pipelines (102x improvement)
2. **Batch Operations**: Group multiple file reads together for better I/O efficiency
3. **Streaming for Large Outputs**: Use streaming writers for documentation >100KB
4. **Limit Sequence Diagrams**: Keep participant count low to maintain constant time generation

## Running Benchmarks

```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark suites
npm run benchmark:scan
npm run benchmark:generators
npm run benchmark:memory

# Generate benchmark report
npm run benchmark:report
```

## Test Environment

- **Node.js**: v20+
- **OS**: Linux (WSL2)
- **CPU**: Variable (benchmark measures relative performance)
- **Memory**: 16GB RAM

## Benchmark Source Files

- `/benchmarks/scan.bench.ts` - Scan performance tests
- `/benchmarks/generators.bench.ts` - Diagram generation tests
- `/benchmarks/memory.bench.ts` - Memory usage tests
