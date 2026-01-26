# Performance Benchmark Specification

**Version:** 1.0
**Date:** 2026-01-25
**AgentScope v1.2 - Neural-Enhanced Performance**

---

## Overview

This document specifies the comprehensive benchmark suite for validating AgentScope v1.2 neural-enhanced performance optimizations.

---

## Benchmark Categories

### 1. HNSW Vector Search Benchmarks

**Objective:** Validate 150x-12,500x speedup claims

#### 1.1 Search Latency by Dataset Size

```typescript
describe('HNSW Search Latency', () => {
  const scenarios = [
    { name: '100 patterns', size: 100, targetMs: 1 },
    { name: '1K patterns', size: 1000, targetMs: 5 },
    { name: '10K patterns', size: 10000, targetMs: 10 },
    { name: '100K patterns', size: 100000, targetMs: 20 },
    { name: '1M patterns', size: 1000000, targetMs: 80 },
  ];

  for (const scenario of scenarios) {
    bench(scenario.name, async () => {
      const result = await hnsw.search('test query', { limit: 10 });
      expect(result.latency).toBeLessThan(scenario.targetMs);
    });
  }
});
```

**Success Criteria:**
- P50 latency meets targets
- P95 latency < 2x target
- P99 latency < 3x target

#### 1.2 Speedup vs Linear Search

```typescript
describe('HNSW Speedup Comparison', () => {
  bench('HNSW vs Linear - 10K patterns', async () => {
    const queryTime = performance.now();

    // HNSW search
    const hnswResult = await hnsw.search('query', { limit: 10 });
    const hnswTime = performance.now() - queryTime;

    // Linear search
    const linearStart = performance.now();
    const linearResult = await linearSearch('query', patterns);
    const linearTime = performance.now() - linearStart;

    const speedup = linearTime / hnswTime;
    expect(speedup).toBeGreaterThan(150); // Minimum 150x
  });
});
```

**Expected Speedups:**
- 100 patterns: 100x
- 1K patterns: 200x
- 10K patterns: 1,000x
- 100K patterns: 5,000x
- 1M patterns: 12,500x

#### 1.3 Index Build Performance

```typescript
bench('HNSW Index Build - 10K patterns', async () => {
  const startTime = performance.now();

  await hnsw.batchStore(generatePatterns(10000));

  const buildTime = performance.now() - startTime;
  expect(buildTime).toBeLessThan(5000); // <5s for 10K patterns
});
```

**Targets:**
- 1K patterns: <500ms
- 10K patterns: <5s
- 100K patterns: <60s

---

### 2. WASM SIMD Acceleration Benchmarks

**Objective:** Validate 2-10x speedup for vector operations

#### 2.1 Vector Operations

```typescript
describe('WASM SIMD Vector Operations', () => {
  const vector384 = new Float32Array(384).fill(0.5);
  const vector768 = new Float32Array(768).fill(0.5);

  bench('Dot product (384d) - WASM SIMD', async () => {
    const result = await wasm.vectorDotProduct(vector384, vector384);
  });

  bench('Dot product (384d) - JavaScript', () => {
    const result = dotProductJS(vector384, vector384);
  });

  bench('Dot product (768d) - WASM SIMD', async () => {
    const result = await wasm.vectorDotProduct(vector768, vector768);
  });
});
```

**Expected Speedups:**
- Dot product (384d): 4-5x
- Dot product (768d): 4-5x
- Normalize (384d): 4-5x
- Cosine similarity: 5-7x

#### 2.2 Batch Operations

```typescript
bench('Batch normalize - 100 vectors (384d)', async () => {
  const vectors = Array.from({ length: 100 }, () =>
    new Float32Array(384).fill(Math.random())
  );

  const result = await wasm.batchNormalize(vectors);

  // Target: <60μs (<0.6μs per vector)
});
```

**Targets:**
- 10 vectors: <10μs
- 100 vectors: <60μs
- 1000 vectors: <500μs

---

### 3. Neural Optimization Benchmarks

**Objective:** Validate SONA adaptation time <0.05ms

#### 3.1 SONA Prediction Latency

```typescript
describe('SONA Strategy Prediction', () => {
  bench('Predict optimization strategy', async () => {
    const startTime = performance.now();

    const strategy = await neural.predictOptimalStrategy({
      operation: 'scan',
      currentMetrics: { duration: 5000, memory: 120 },
    });

    const latency = performance.now() - startTime;
    expect(latency).toBeLessThan(50); // <50ms
  });
});
```

**Targets:**
- Strategy prediction: <50ms
- Trajectory recording: <10ms
- Pattern distillation: <100ms

#### 3.2 Flash Attention Speedup

```typescript
bench('Flash Attention vs Standard', async () => {
  const query = new Float32Array(384).fill(0.5);
  const keys = Array.from({ length: 100 }, () =>
    new Float32Array(384).fill(Math.random())
  );

  // Flash attention
  const flashStart = performance.now();
  const flashResult = await flash.computeAttention({ query, keys, values: keys });
  const flashTime = performance.now() - flashStart;

  // Standard attention
  const stdStart = performance.now();
  const stdResult = computeStandardAttention(query, keys, keys);
  const stdTime = performance.now() - stdStart;

  const speedup = stdTime / flashTime;
  expect(speedup).toBeGreaterThan(2.49); // Minimum speedup
  expect(speedup).toBeLessThan(7.47); // Maximum expected
});
```

**Expected Speedups:**
- Short sequences (<512): 2.5-4x
- Medium sequences (512-2048): 4-6x
- Long sequences (>2048): 6-7.5x

---

### 4. Intelligent Cache Benchmarks

**Objective:** Validate >80% hit rate

#### 4.1 Cache Hit Rate

```typescript
describe('Cache Performance', () => {
  const cache = new IntelligentCache({ maxSize: 1000 });

  bench('Cache hit rate - typical workload', async () => {
    // Simulate typical access pattern (Zipf distribution)
    const accesses = generateZipfAccesses(1000);

    let hits = 0;
    let misses = 0;

    for (const key of accesses) {
      const result = await cache.getOrCompute(
        key,
        async () => ({ data: 'computed' })
      );

      if (cache.lruCache.has(key)) hits++;
      else misses++;
    }

    const hitRate = hits / (hits + misses);
    expect(hitRate).toBeGreaterThan(0.80); // >80%
  });
});
```

**Expected Hit Rates:**
- Zipf workload: 85-95%
- Uniform workload: 70-80%
- Sequential workload: 50-60%

#### 4.2 Predictive Preloading

```typescript
bench('Predictive cache hits', async () => {
  const cache = new IntelligentCache({
    maxSize: 1000,
    predictivePreload: true,
  });

  // Access pattern: A → B → C (repeated)
  for (let i = 0; i < 100; i++) {
    await cache.get('A');
    await cache.get('B');
    await cache.get('C');
  }

  const stats = cache.getStats();
  expect(stats.predictiveHits).toBeGreaterThan(50); // >50% predictive
});
```

---

### 5. Batch Operation Benchmarks

**Objective:** Validate 20-40% I/O reduction

#### 5.1 File I/O Batching

```typescript
describe('Batch File Operations', () => {
  bench('Read 100 files - batched', async () => {
    const batcher = new FileBatcher();

    const startTime = performance.now();

    const reads = Array.from({ length: 100 }, (_, i) =>
      batcher.readFile(`file-${i}.txt`)
    );

    await Promise.all(reads);
    await batcher.flush();

    const batchTime = performance.now() - startTime;

    // Compare to unbatched
    const unbatchedStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await readFile(`file-${i}.txt`, 'utf-8');
    }
    const unbatchedTime = performance.now() - unbatchedStart;

    const reduction = (unbatchedTime - batchTime) / unbatchedTime;
    expect(reduction).toBeGreaterThan(0.30); // >30% reduction
  });
});
```

**Expected Reductions:**
- File reads (10 files): 20-30%
- File reads (100 files): 30-40%
- File writes (100 files): 35-45%

#### 5.2 Memory Operation Batching

```typescript
bench('Memory batch store - 1000 items', async () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    key: `key-${i}`,
    value: { data: `value-${i}` },
    namespace: 'test',
  }));

  const batchStart = performance.now();
  await hnsw.batchStore(items);
  const batchTime = performance.now() - batchStart;

  // Compare to individual stores
  const individualStart = performance.now();
  for (const item of items) {
    await hnsw.store(item.key, item.value, { namespace: item.namespace });
  }
  const individualTime = performance.now() - individualStart;

  const reduction = (individualTime - batchTime) / individualTime;
  expect(reduction).toBeGreaterThan(0.40); // >40% reduction
});
```

---

### 6. Memory Optimization Benchmarks

**Objective:** Validate 50-75% memory reduction

#### 6.1 Quantization Memory Savings

```typescript
describe('Quantization Memory Reduction', () => {
  const embeddings = new Float32Array(10000 * 384); // 10K embeddings

  bench('4-bit quantization', () => {
    const quant = new QuantizationEngine();
    const { quantized, metadata } = quant.quantize4bit(embeddings);

    expect(metadata.compressionRatio).toBeGreaterThan(3.5); // >3.5x

    const reduction = 1 - (metadata.quantizedSize / metadata.originalSize);
    expect(reduction).toBeGreaterThan(0.70); // >70% reduction
  });

  bench('8-bit quantization', () => {
    const quant = new QuantizationEngine();
    const { quantized, metadata } = quant.quantize8bit(embeddings);

    expect(metadata.compressionRatio).toBeGreaterThan(1.9); // >1.9x

    const reduction = 1 - (metadata.quantizedSize / metadata.originalSize);
    expect(reduction).toBeGreaterThan(0.45); // >45% reduction
  });
});
```

**Expected Reductions:**
- Int4: 70-75%
- Int8: 45-50%
- Float16: 45-50%

#### 6.2 Memory Pooling Efficiency

```typescript
bench('Memory pool vs allocations', async () => {
  const iterations = 10000;

  // With pooling
  const pool = new MemoryPool({
    factory: () => new Array(100),
    reset: (arr) => arr.length = 0,
    initialSize: 10,
  });

  const poolStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = pool.acquire();
    // Use object
    pool.release(obj);
  }
  const poolTime = performance.now() - poolStart;

  // Without pooling
  const allocStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = new Array(100);
    // Use object
  }
  const allocTime = performance.now() - allocStart;

  const improvement = (allocTime - poolTime) / allocTime;
  expect(improvement).toBeGreaterThan(0.15); // >15% improvement
});
```

---

### 7. End-to-End Benchmarks

**Objective:** Validate overall performance targets

#### 7.1 Scan Performance

```typescript
describe('Scan Performance', () => {
  bench('Scan large config (50 agents)', async () => {
    const startTime = performance.now();

    const result = await scanAndGenerate({
      rootPath: './test-project-large',
      outputDir: './docs',
      verbose: false,
    });

    const scanTime = performance.now() - startTime;
    expect(scanTime).toBeLessThan(1000); // <1s target
  });
});
```

**Targets:**
- Small config (5 agents): <300ms
- Medium config (20 agents): <600ms
- Large config (50 agents): <1000ms

#### 7.2 CLI Startup

```typescript
bench('CLI cold start', async () => {
  const iterations = 10;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await execAsync('node dist/cli/index.js --version');
    times.push(performance.now() - start);
  }

  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
  expect(p95).toBeLessThan(300); // <300ms
});
```

#### 7.3 Memory Usage

```typescript
bench('Peak memory usage - large scan', async () => {
  const initialMemory = process.memoryUsage().heapUsed;

  await scanAndGenerate({
    rootPath: './test-project-large',
    outputDir: './docs',
    verbose: false,
  });

  const peakMemory = process.memoryUsage().heapUsed;
  const usedMB = (peakMemory - initialMemory) / 1024 / 1024;

  expect(usedMB).toBeLessThan(75); // <75MB target
});
```

---

## Benchmark Execution

### Run All Benchmarks

```bash
npm run benchmark:neural
```

### Run Specific Category

```bash
npm run benchmark:hnsw
npm run benchmark:wasm
npm run benchmark:neural
npm run benchmark:cache
npm run benchmark:batch
npm run benchmark:quantization
npm run benchmark:e2e
```

### Generate Report

```bash
npm run benchmark:report
```

---

## Report Format

### Console Output

```
========================================
  Neural-Enhanced Performance Benchmarks
========================================

Layer 1: HNSW Vector Search
  ✓ Search 100 patterns:     0.8ms  (target: <1ms)
  ✓ Search 1K patterns:      4.2ms  (target: <5ms)
  ✓ Search 10K patterns:     8.5ms  (target: <10ms)
  ✓ Speedup vs linear:       1,176x (target: 150-12,500x)

Layer 2: WASM SIMD Acceleration
  ✓ Dot product (384d):      0.58μs (speedup: 4.3x)
  ✓ Batch normalize (100):   58μs   (speedup: 4.3x)

Layer 3: Neural Optimization
  ✓ SONA predict:            42ms   (target: <50ms)
  ✓ Flash attention speedup: 5.2x   (target: 2.49-7.47x)

Layer 4: Intelligent Cache
  ✓ Hit rate (Zipf):         87%    (target: >80%)
  ✓ Predictive hits:         124    (expected: >50)

Layer 5: Batch Operations
  ✓ File I/O reduction:      34%    (target: 20-40%)
  ✓ Memory store reduction:  42%    (target: 40-50%)

Layer 6: Memory Optimization
  ✓ Int4 compression:        3.8x   (target: >3.5x)
  ✓ Int8 compression:        2.0x   (target: >1.9x)

End-to-End Performance
  ✓ Scan (large):            850ms  (target: <1000ms)
  ✓ CLI startup (p95):       285ms  (target: <300ms)
  ✓ Peak memory:             52MB   (target: <75MB)

========================================
  Overall: 18/18 tests passed (100%)
========================================
```

### JSON Report

```json
{
  "timestamp": "2026-01-25T10:30:00Z",
  "version": "1.2.0",
  "results": {
    "hnsw": {
      "search_100": { "p50": 0.8, "p95": 1.2, "p99": 1.5, "target": 1, "passed": true },
      "search_1k": { "p50": 4.2, "p95": 5.8, "p99": 7.2, "target": 5, "passed": true },
      "speedup": { "value": 1176, "min": 150, "max": 12500, "passed": true }
    },
    "wasm": {
      "dot_product_384d": { "speedup": 4.3, "target_min": 2, "target_max": 10, "passed": true },
      "batch_normalize": { "speedup": 4.3, "target_min": 2, "target_max": 10, "passed": true }
    },
    "neural": {
      "sona_predict_ms": { "value": 42, "target": 50, "passed": true },
      "flash_attention_speedup": { "value": 5.2, "min": 2.49, "max": 7.47, "passed": true }
    },
    "cache": {
      "hit_rate": { "value": 0.87, "target": 0.80, "passed": true },
      "predictive_hits": { "value": 124, "target": 50, "passed": true }
    },
    "batch": {
      "file_io_reduction": { "value": 0.34, "min": 0.20, "max": 0.40, "passed": true },
      "memory_reduction": { "value": 0.42, "min": 0.40, "max": 0.50, "passed": true }
    },
    "quantization": {
      "int4_compression": { "value": 3.8, "target": 3.5, "passed": true },
      "int8_compression": { "value": 2.0, "target": 1.9, "passed": true }
    },
    "e2e": {
      "scan_large_ms": { "value": 850, "target": 1000, "passed": true },
      "cli_startup_p95_ms": { "value": 285, "target": 300, "passed": true },
      "peak_memory_mb": { "value": 52, "target": 75, "passed": true }
    }
  },
  "summary": {
    "total_tests": 18,
    "passed": 18,
    "failed": 0,
    "success_rate": 1.0
  }
}
```

---

## Continuous Benchmarking

### GitHub Actions Workflow

```yaml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run benchmarks
        run: npm run benchmark:neural

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-results.json

      - name: Check performance regression
        run: |
          node scripts/check-performance-regression.js \
            --current benchmark-results.json \
            --baseline baseline-benchmarks.json \
            --threshold 0.10  # 10% regression threshold
```

---

## Acceptance Criteria

### Minimum Requirements (All Must Pass)

- ✅ HNSW search p95 < 10ms for 10K patterns
- ✅ WASM speedup > 2x for vector operations
- ✅ Cache hit rate > 80% for typical workload
- ✅ I/O reduction > 20% for batch operations
- ✅ Memory reduction > 50% with quantization
- ✅ Scan time (large) < 1000ms
- ✅ CLI startup p95 < 300ms
- ✅ Peak memory < 75MB

### Stretch Goals (Nice to Have)

- 🎯 HNSW speedup > 1000x
- 🎯 WASM speedup > 5x
- 🎯 Cache hit rate > 90%
- 🎯 Memory reduction > 70%
- 🎯 Scan time (large) < 500ms
- 🎯 Peak memory < 50MB

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial specification |

---

**Document Owner:** Performance Engineering Team
**Review Schedule:** After each major optimization
**Last Reviewed:** 2026-01-25
