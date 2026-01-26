# @claude-flow/performance Quick Start

Get started with performance optimization in 5 minutes.

## Installation

```bash
npm install @claude-flow/performance
```

## 1. Performance Monitoring (30 seconds)

```typescript
import { PerformanceMonitor } from '@claude-flow/performance';

const monitor = new PerformanceMonitor();

// Time any operation
monitor.startTimer('api-call');
await fetch('https://api.example.com/data');
const duration = monitor.endTimer('api-call');

console.log(`API call took ${duration.toFixed(2)}ms`);

// Detect bottlenecks
const bottlenecks = monitor.detectBottlenecks();
console.log('Slowest operations:', bottlenecks);

// Get optimization suggestions
const suggestions = monitor.suggestOptimizations();
console.log('Recommendations:', suggestions);
```

## 2. LRU Caching (30 seconds)

```typescript
import { LRUCache } from '@claude-flow/performance';

const cache = new LRUCache<any>({
  maxSize: 1000,      // Max 1000 items
  ttl: 60000          // 1 minute expiration
});

async function getCachedData(key: string) {
  // Check cache first
  let data = cache.get(key);

  if (!data) {
    // Cache miss - fetch and store
    data = await expensiveOperation(key);
    cache.set(key, data);
  }

  return data;
}

// Monitor cache performance
const stats = cache.getStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

## 3. Batch Processing (30 seconds)

```typescript
import { BatchProcessor } from '@claude-flow/performance';

// Create batch processor for database insertions
const inserter = new BatchProcessor(
  {
    maxSize: 100,     // Flush after 100 items
    maxDelay: 50      // Or after 50ms
  },
  async (items) => {
    // Bulk insert to database
    return await db.insertMany(items);
  }
);

// Add items individually - automatically batched
async function saveUser(user: User) {
  await inserter.add(user);
  // Batched automatically!
}

// Use throughout your application
await saveUser({ id: 1, name: 'Alice' });
await saveUser({ id: 2, name: 'Bob' });
// These will be batched together
```

## 4. Parallel Execution (30 seconds)

```typescript
import { ParallelExecutor } from '@claude-flow/performance';

const executor = new ParallelExecutor({
  maxWorkers: 4     // Use 4 workers
});

// Process array in parallel
const results = await executor.map(
  [1, 2, 3, 4, 5, 6, 7, 8],
  async (item) => {
    // Process each item
    return await processItem(item);
  },
  { concurrency: 2 }  // Max 2 at a time
);

// Filter in parallel
const evens = await executor.filter(
  [1, 2, 3, 4, 5, 6],
  async (n) => n % 2 === 0
);

// Reduce in parallel
const sum = await executor.reduce(
  [1, 2, 3, 4],
  async (acc, n) => acc + n,
  0
);
```

## 5. Memory Profiling (30 seconds)

```typescript
import { MemoryProfiler } from '@claude-flow/performance';

const profiler = new MemoryProfiler();

// Start monitoring (every 5 seconds)
profiler.startMonitoring(5000);

// Check for memory leaks
setInterval(() => {
  const leaks = profiler.detectLeaks();

  if (leaks.length > 0) {
    console.warn('⚠️  Memory leaks detected!');
    console.log(profiler.generateReport());
  }
}, 60000); // Check every minute

// Stop monitoring when done
process.on('SIGTERM', () => {
  profiler.stopMonitoring();
});
```

## 6. Benchmarking (30 seconds)

```typescript
import { BenchmarkRunner } from '@claude-flow/performance';

const runner = new BenchmarkRunner();

// Compare two implementations
const { speedup } = await runner.compare(
  'Array.map',
  () => {
    const arr = [1, 2, 3, 4, 5];
    arr.map(x => x * 2);
  },
  'for loop',
  () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i] * 2;
    }
  }
);

console.log(`Speedup: ${speedup.toFixed(2)}x`);

// Run benchmark suite
await runner.suite('Array Operations', [
  { name: 'map', fn: () => [1,2,3].map(x => x * 2) },
  { name: 'filter', fn: () => [1,2,3].filter(x => x > 1) },
  { name: 'reduce', fn: () => [1,2,3].reduce((a, b) => a + b, 0) }
]);
```

## Common Patterns

### Pattern 1: Cache + Monitor

```typescript
const monitor = new PerformanceMonitor();
const cache = new LRUCache({ maxSize: 1000 });

async function getData(key: string) {
  monitor.startTimer('getData');

  let result = cache.get(key);
  if (!result) {
    result = await expensiveOperation(key);
    cache.set(key, result);
  }

  monitor.endTimer('getData');
  return result;
}
```

### Pattern 2: Batch + Parallel

```typescript
const executor = new ParallelExecutor({ maxWorkers: 4 });
const batcher = new BatchProcessor(
  { maxSize: 100, maxDelay: 50 },
  async (items) => await db.insertMany(items)
);

async function processAndSave(items: any[]) {
  // Process in parallel
  const processed = await executor.map(
    items,
    async (item) => await process(item)
  );

  // Batch save
  await Promise.all(
    processed.map(item => batcher.add(item))
  );
}
```

### Pattern 3: Monitor Everything

```typescript
const monitor = new PerformanceMonitor();

// Wrap all async functions
function monitored<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  monitor.startTimer(name);
  return fn().finally(() => monitor.endTimer(name));
}

// Use it
await monitored('database-query', () => db.query('SELECT * FROM users'));
await monitored('api-call', () => fetch('/api/data'));

// Get insights
const bottlenecks = monitor.detectBottlenecks();
const suggestions = monitor.suggestOptimizations();
```

### Pattern 4: Production Monitoring

```typescript
const monitor = new PerformanceMonitor();
const profiler = new MemoryProfiler();

// Start continuous monitoring
profiler.startMonitoring(60000); // Every minute

// Periodic health check
setInterval(() => {
  // Check performance bottlenecks
  const bottlenecks = monitor.detectBottlenecks(0.1);
  if (bottlenecks.length > 0) {
    logger.warn('Performance bottlenecks detected', bottlenecks);
  }

  // Check memory leaks
  const leaks = profiler.detectLeaks();
  if (leaks.length > 0) {
    logger.error('Memory leaks detected', leaks);
  }

  // Get cache stats
  const cacheStats = cache.getStats();
  if (cacheStats.hitRate < 0.7) {
    logger.warn('Low cache hit rate', cacheStats);
  }
}, 300000); // Every 5 minutes
```

## Best Practices

### ✅ DO

- Enable monitoring in development and staging
- Use caching for expensive operations
- Batch database operations
- Parallelize independent work
- Monitor memory in long-running processes
- Profile before optimizing

### ❌ DON'T

- Enable monitoring everywhere in production (only critical paths)
- Cache everything (be selective)
- Batch operations with different failure modes
- Parallelize dependent operations
- Ignore memory leak warnings
- Optimize prematurely

## Performance Tips

1. **Cache wisely**: Cache expensive computations, not cheap lookups
2. **Batch smartly**: Balance batch size vs latency
3. **Parallelize carefully**: Don't exceed CPU core count
4. **Monitor selectively**: Only monitor critical paths in production
5. **Profile regularly**: Use benchmarks to verify improvements

## Next Steps

- Read the [Full Documentation](./README.md)
- Check out [Benchmark Examples](./benchmarks/run-benchmarks.ts)
- Explore [Test Cases](./tests/) for more examples
- Review [Performance Package Guide](../../docs/packages/PERFORMANCE-PACKAGE.md)

## Need Help?

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

---

**Total setup time: ~5 minutes** ⏱️

**Performance gains: 3-10x** 🚀

**Overhead: <1ms** ⚡
