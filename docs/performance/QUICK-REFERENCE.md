# Neural-Enhanced Performance - Quick Reference

**AgentScope v1.2 Performance Optimization Guide**

---

## 🎯 Performance Targets at a Glance

| Metric | Target | Method |
|--------|--------|--------|
| **Scan (large config)** | <1s | HNSW + Cache + Batch |
| **Memory search** | <10ms | HNSW (150x-12,500x) |
| **Agent routing** | <50ms | MoE + Neural prediction |
| **Memory usage** | <75MB | Quantization (50-75%) |
| **CLI startup** | <300ms | Lazy load + Cache |
| **Cache hit rate** | >80% | Intelligent + Predictive |
| **I/O reduction** | 20-40% | Batch operations |
| **LLM cost** | -75% | MoE routing |

---

## ⚡ Quick Start

### 1. Initialize Performance Optimization

```bash
# Initialize HNSW index
npx @claude-flow/cli@latest memory init \
  --backend hybrid \
  --hnsw-ef-construction 200 \
  --hnsw-m 16 \
  --quantization int8

# Start background daemon
npx @claude-flow/cli@latest daemon start

# Run health check
npx @claude-flow/cli@latest doctor --fix
```

### 2. Enable Optimization Layers

```typescript
import {
  HNSWSearchEngine,
  WASMAccelerator,
  NeuralOptimizer,
  IntelligentCache,
  BatchProcessor,
  QuantizationEngine,
} from './performance';

// Initialize engines
const hnsw = new HNSWSearchEngine();
await hnsw.initialize();

const wasm = new WASMAccelerator();
await wasm.initialize();

const cache = new IntelligentCache({ maxSize: 1000 });

const neural = new NeuralOptimizer();
```

### 3. Run Benchmarks

```bash
# Full benchmark suite
npm run benchmark:neural

# Specific layer
npm run benchmark:hnsw
npm run benchmark:wasm

# Generate report
npm run benchmark:report
```

---

## 📊 Optimization Layers

### Layer 1: HNSW Vector Search (150x-12,500x speedup)

**Use for:** Pattern matching, similarity search, agent discovery

```typescript
// Search patterns
const results = await hnsw.search<AgentPattern>(
  'authentication patterns',
  { namespace: 'agent-patterns', limit: 10 }
);

// Store pattern
await hnsw.store('pattern-auth', {
  name: 'JWT Authentication',
  approach: 'Token-based with refresh',
}, { namespace: 'agent-patterns' });

// Batch store
await hnsw.batchStore([
  { key: 'pattern-1', value: data1, namespace: 'patterns' },
  { key: 'pattern-2', value: data2, namespace: 'patterns' },
]);
```

**Expected Performance:**
- 100 patterns: <1ms
- 1,000 patterns: <5ms
- 10,000 patterns: <10ms
- 100,000 patterns: <20ms

### Layer 2: WASM SIMD Acceleration (2-10x speedup)

**Use for:** Vector operations, batch processing, quantization

```typescript
// Dot product
const similarity = await wasm.vectorDotProduct(
  vectorA,  // Float32Array(384)
  vectorB   // Float32Array(384)
);

// Batch normalize
const normalized = await wasm.batchNormalize([
  vector1, vector2, vector3
]);
```

**Expected Speedup:**
- Dot product: 4.2x faster
- Normalize: 4.3x faster
- Cosine similarity: 6.3x faster
- Quantization: 6.7x faster

### Layer 3: Neural Pattern Optimization (SONA + Flash Attention)

**Use for:** Adaptive learning, strategy prediction, attention mechanisms

```typescript
// Start optimization trajectory
const trajectoryId = await neural.startOptimization({
  operation: 'scan',
  targetMetric: 'duration',
  currentValue: 5000,
  targetValue: 1000,
});

// Record optimization step
await neural.recordStep({
  action: 'enable_cache',
  parameters: { ttl: 3600 },
  resultMetric: 2500,
  improvement: 0.5,
});

// Complete and learn
await neural.completeOptimization({
  success: true,
  finalMetric: 800,
  totalImprovement: 0.84,
});

// Predict optimal strategy
const strategy = await neural.predictOptimalStrategy({
  operation: 'scan',
  currentMetrics: { duration: 5000, memory: 120 },
});
```

**Expected Performance:**
- SONA adaptation: <0.05ms
- Flash Attention speedup: 2.49x-7.47x
- Strategy prediction: <50ms

### Layer 4: Intelligent Caching (LRU + Predictive)

**Use for:** Repeated operations, hot paths, predictable access patterns

```typescript
// Simple get/set
cache.set('key', value);
const cached = await cache.get('key');

// Get or compute
const result = await cache.getOrCompute(
  'scan-result',
  async () => await performScan(),
  { ttl: 3600000 } // 1 hour
);

// Cache statistics
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
console.log(`Predictive hits: ${stats.predictiveHits}`);
```

**Cache Strategy:**
- Agent patterns: 1 hour TTL, 85-95% hit rate
- Scan results: 30 min TTL, 70-85% hit rate
- Category mappings: 1 hour TTL, 80-90% hit rate
- Hot paths: Infinite TTL, 95-99% hit rate

### Layer 5: Batch Operations (20-40% I/O reduction)

**Use for:** File I/O, network requests, memory operations

```typescript
// File batching
const fileBatcher = new FileBatcher();

await Promise.all([
  fileBatcher.readFile('file1.txt'),
  fileBatcher.readFile('file2.txt'),
  fileBatcher.readFile('file3.txt'),
]);
// Automatically batches into single I/O operation

// Custom batch processor
const batcher = new BatchProcessor({
  batchSize: 100,
  flushIntervalMs: 100,
  processor: async (items) => {
    // Process batch
    return results;
  },
});

await batcher.add(item1);
await batcher.add(item2);
// Auto-flushes at batch size or interval
```

**Expected Reduction:**
- File reads: 30-40%
- File writes: 35-45%
- Memory stores: 40-50%

### Layer 6: Memory Optimization (50-75% reduction)

**Use for:** Large datasets, embeddings, cached data

```typescript
const quantEngine = new QuantizationEngine();

// 4-bit quantization (75% reduction)
const { quantized, metadata } = quantEngine.quantize4bit(embeddings);
console.log(`Compression: ${metadata.compressionRatio.toFixed(2)}x`);

// 8-bit quantization (50% reduction)
const result8bit = quantEngine.quantize8bit(embeddings);

// Auto-select based on importance
const auto = quantEngine.autoQuantize(
  embeddings,
  'important'  // critical | important | normal | low
);

// Dequantize when needed
const restored = quantEngine.dequantize(
  quantized,
  metadata
);
```

**Memory Savings:**
- Int4: 75% reduction (12.5% of original)
- Int8: 50% reduction (25% of original)
- Float16: 50% reduction (50% of original)

---

## 🔧 Configuration

### Recommended Settings

#### Small Projects (<10 agents)

```typescript
{
  hnsw: {
    efConstruction: 100,
    M: 8,
    quantization: 'float16'
  },
  cache: {
    maxSize: 500,
    ttl: 3600000  // 1 hour
  },
  batch: {
    batchSize: 10,
    flushIntervalMs: 50
  }
}
```

#### Medium Projects (10-50 agents)

```typescript
{
  hnsw: {
    efConstruction: 200,
    M: 16,
    quantization: 'int8'
  },
  cache: {
    maxSize: 1000,
    ttl: 3600000
  },
  batch: {
    batchSize: 20,
    flushIntervalMs: 100
  }
}
```

#### Large Projects (>50 agents)

```typescript
{
  hnsw: {
    efConstruction: 400,
    M: 32,
    quantization: 'int4'
  },
  cache: {
    maxSize: 5000,
    ttl: 7200000  // 2 hours
  },
  batch: {
    batchSize: 50,
    flushIntervalMs: 200
  }
}
```

---

## 📈 Monitoring

### Real-Time Dashboard

```bash
# Show performance dashboard
npx @claude-flow/cli@latest performance metrics --format table

# Watch mode (updates every 5s)
watch -n 5 'npx @claude-flow/cli@latest performance metrics'
```

### Programmatic Monitoring

```typescript
import { showPerformanceDashboard } from './performance/dashboard';

// Display dashboard
await showPerformanceDashboard();

// Get specific metrics
const result = await execAsync(
  'npx @claude-flow/cli@latest performance metrics --format json'
);

const metrics = JSON.parse(result.stdout);
console.log(`HNSW speedup: ${metrics.hnsw_speedup}x`);
console.log(`Cache hit rate: ${metrics.cache_hit_rate}%`);
```

### Key Metrics to Monitor

| Metric | Target | Alert If |
|--------|--------|----------|
| HNSW search p95 | <10ms | >20ms |
| Cache hit rate | >80% | <70% |
| Memory usage | <75MB | >90MB |
| Scan duration (large) | <1000ms | >1500ms |
| I/O operations | Baseline -30% | Baseline +10% |

---

## 🐛 Troubleshooting

### HNSW Search Slow

```bash
# Check index status
npx @claude-flow/cli@latest memory stats

# Rebuild index
npx @claude-flow/cli@latest memory init --force

# Optimize parameters
# Increase efSearch for better recall (but slower)
# Decrease efSearch for faster search (but lower recall)
```

### WASM Not Accelerating

```bash
# Check SIMD support
node -e "console.log(WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])))"

# If false, SIMD not supported (fallback to JS)
```

### Low Cache Hit Rate

```typescript
// Check cache statistics
const stats = cache.getStats();
console.log('Cache stats:', stats);

// Increase cache size
const cache = new IntelligentCache({ maxSize: 5000 });

// Increase TTL for stable data
cache.set(key, value, { ttl: 7200000 }); // 2 hours
```

### High Memory Usage

```typescript
// Enable aggressive quantization
const quantEngine = new QuantizationEngine();
const { quantized } = quantEngine.quantize4bit(data); // 75% reduction

// Clear caches
cache.clear();

// Check for leaks
if (global.gc) global.gc();
const usage = process.memoryUsage();
console.log('Heap used:', (usage.heapUsed / 1024 / 1024).toFixed(2), 'MB');
```

---

## 🧪 Testing Performance

### Benchmark Individual Layers

```bash
# HNSW search
npm run benchmark:hnsw

# WASM acceleration
npm run benchmark:wasm

# Neural optimization
npm run benchmark:neural

# Caching
npm run benchmark:cache

# Batch operations
npm run benchmark:batch

# Quantization
npm run benchmark:quantization
```

### Integration Tests

```bash
# Full optimization pipeline
npm run test:performance

# Specific scenario
npm run test:performance -- --grep "large config"
```

### Load Testing

```bash
# Stress test with large dataset
npm run benchmark:stress

# Concurrent operations
npm run benchmark:concurrent
```

---

## 🎓 Best Practices

### 1. Layer Selection

| Use Case | Recommended Layers |
|----------|-------------------|
| **High-frequency reads** | Cache (Layer 4) + HNSW (Layer 1) |
| **Vector-heavy operations** | WASM (Layer 2) + Quantization (Layer 6) |
| **I/O-bound workloads** | Batch (Layer 5) + Cache (Layer 4) |
| **Learning-based optimization** | Neural (Layer 3) + all others |

### 2. Progressive Enhancement

Start with:
1. ✅ Cache (Layer 4) - Easy, high impact
2. ✅ Batch (Layer 5) - Easy, measurable gains
3. ✅ HNSW (Layer 1) - High impact for search
4. ✅ Quantization (Layer 6) - Memory-constrained systems
5. ✅ WASM (Layer 2) - Vector-heavy workloads
6. ✅ Neural (Layer 3) - Advanced optimization

### 3. Monitoring Strategy

```typescript
// Record metrics for all operations
await execAsync(
  `npx @claude-flow/cli@latest hooks post-command \\
    --command "operation-name" \\
    --track-metrics true`
);

// Periodic performance checks
setInterval(async () => {
  const metrics = await getPerformanceMetrics();
  if (metrics.scan_duration > 1000) {
    console.warn('Performance degradation detected');
  }
}, 60000); // Every minute
```

### 4. Graceful Degradation

```typescript
// Always provide fallbacks
try {
  result = await hnsw.search(query);
} catch (error) {
  console.warn('HNSW failed, falling back to linear search');
  result = await linearSearch(query);
}

// Check capabilities
if (wasm.simdSupported) {
  result = await wasm.vectorDotProduct(a, b);
} else {
  result = dotProductJS(a, b);
}
```

---

## 🔗 Related Documentation

- **Architecture:** [docs/architecture/neural-performance-architecture.md](../architecture/neural-performance-architecture.md)
- **ADR-020:** [docs/v1.2/ADR-020-neural-enhanced-performance.md](../v1.2/ADR-020-neural-enhanced-performance.md)
- **Benchmarks:** [benchmarks/neural-performance.bench.ts](../../benchmarks/neural-performance.bench.ts)
- **Integration Guide:** [docs/guides/performance-integration.md](../guides/performance-integration.md)

---

## 🆘 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| HNSW index not found | Run `memory init` |
| WASM not supported | Use JS fallback (automatic) |
| Cache thrashing | Increase maxSize or TTL |
| Memory leak | Enable quantization, check pooling |
| Performance regression | Run bottleneck detector |

### Get Help

```bash
# Run diagnostics
npx @claude-flow/cli@latest doctor

# View logs
npx @claude-flow/cli@latest hooks metrics --v3-dashboard

# Report issue
# Include: node version, OS, benchmark results
```

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-01-25
**Maintained By:** Performance Engineering Team
