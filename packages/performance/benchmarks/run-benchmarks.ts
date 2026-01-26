/**
 * Performance benchmarks for @claude-flow/performance
 * Self-benchmarking: Profile the profiler!
 */

import {
  PerformanceMonitor,
  LRUCache,
  BatchProcessor,
  ParallelExecutor,
  MemoryProfiler,
  BenchmarkRunner
} from '../src';

async function main() {
  const runner = new BenchmarkRunner();

  console.log('\n='.repeat(60));
  console.log('🚀 @claude-flow/performance Benchmarks');
  console.log('='.repeat(60));

  // Benchmark 1: Performance Monitor Overhead
  await runner.suite('PerformanceMonitor Overhead', [
    {
      name: 'startTimer + endTimer (enabled)',
      fn: () => {
        const monitor = new PerformanceMonitor(true);
        monitor.startTimer('test');
        monitor.endTimer('test');
      },
      options: { iterations: 10000 }
    },
    {
      name: 'startTimer + endTimer (disabled)',
      fn: () => {
        const monitor = new PerformanceMonitor(false);
        monitor.startTimer('test');
        monitor.endTimer('test');
      },
      options: { iterations: 10000 }
    },
    {
      name: 'record metric',
      fn: () => {
        const monitor = new PerformanceMonitor();
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'bench',
          latency: 1.5,
          success: true
        });
      },
      options: { iterations: 10000 }
    }
  ]);

  // Benchmark 2: LRU Cache Performance
  await runner.suite('LRUCache Operations', [
    {
      name: 'cache.get() (hit)',
      fn: () => {
        const cache = new LRUCache<number>({ maxSize: 1000 });
        cache.set('key', 42);
        cache.get('key');
      },
      options: { iterations: 100000 }
    },
    {
      name: 'cache.get() (miss)',
      fn: () => {
        const cache = new LRUCache<number>({ maxSize: 1000 });
        cache.get('missing');
      },
      options: { iterations: 100000 }
    },
    {
      name: 'cache.set()',
      fn: () => {
        const cache = new LRUCache<number>({ maxSize: 1000 });
        cache.set('key', 42);
      },
      options: { iterations: 100000 }
    },
    {
      name: 'cache.set() with eviction',
      fn: () => {
        const cache = new LRUCache<number>({ maxSize: 10 });
        for (let i = 0; i < 20; i++) {
          cache.set(`key-${i}`, i);
        }
      },
      options: { iterations: 1000 }
    }
  ]);

  // Benchmark 3: Cache vs No Cache
  const { speedup: cacheSpeedup } = await runner.compare(
    'No Cache',
    () => {
      const data = expensiveComputation(42);
      return data;
    },
    'With LRU Cache',
    () => {
      const cache = new LRUCache<number>({ maxSize: 100 });
      const key = '42';

      let result = cache.get(key);
      if (!result) {
        result = expensiveComputation(42);
        cache.set(key, result);
      }

      return result;
    },
    { iterations: 10000 }
  );

  console.log(`\n✨ Cache provides ${cacheSpeedup.toFixed(2)}x speedup for cached operations`);

  // Benchmark 4: Batch Processing
  await runner.suite('Batch Processing', [
    {
      name: 'Individual operations',
      fn: async () => {
        const items = Array(100).fill(0).map((_, i) => i);
        for (const item of items) {
          await processItem(item);
        }
      },
      options: { iterations: 10 }
    },
    {
      name: 'Batched operations',
      fn: async () => {
        const processor = new BatchProcessor(
          { maxSize: 100, maxDelay: 1 },
          async (items) => {
            return items.map(processItemSync);
          }
        );

        const items = Array(100).fill(0).map((_, i) => i);
        await Promise.all(items.map(item => processor.add(item)));
      },
      options: { iterations: 10 }
    }
  ]);

  // Benchmark 5: Parallel Execution
  await runner.suite('Parallel Execution', [
    {
      name: 'Sequential processing',
      fn: async () => {
        const items = Array(20).fill(0).map((_, i) => i);
        const results = [];
        for (const item of items) {
          results.push(await asyncOperation(item));
        }
      },
      options: { iterations: 10 }
    },
    {
      name: 'Parallel processing (4 workers)',
      fn: async () => {
        const executor = new ParallelExecutor({ maxWorkers: 4 });
        const items = Array(20).fill(0).map((_, i) => i);
        await executor.map(items, async (item) => await asyncOperation(item));
      },
      options: { iterations: 10 }
    }
  ]);

  // Benchmark 6: Memory Profiler Overhead
  await runner.suite('Memory Profiler', [
    {
      name: 'takeSnapshot()',
      fn: () => {
        const profiler = new MemoryProfiler();
        profiler.takeSnapshot();
      },
      options: { iterations: 1000 }
    },
    {
      name: 'detectLeaks() with 100 snapshots',
      fn: () => {
        const profiler = new MemoryProfiler();
        for (let i = 0; i < 100; i++) {
          profiler.takeSnapshot();
        }
        profiler.detectLeaks();
      },
      options: { iterations: 100 }
    },
    {
      name: 'generateReport()',
      fn: () => {
        const profiler = new MemoryProfiler();
        for (let i = 0; i < 10; i++) {
          profiler.takeSnapshot();
        }
        profiler.generateReport();
      },
      options: { iterations: 100 }
    }
  ]);

  // Benchmark 7: Bottleneck Detection
  await runner.bench(
    'Bottleneck Detection (1000 metrics)',
    () => {
      const monitor = new PerformanceMonitor();

      // Generate test data
      for (let i = 0; i < 1000; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: `op-${i % 10}`,
          latency: Math.random() * 100,
          success: true
        });
      }

      monitor.detectBottlenecks(0.05);
    },
    { iterations: 100 }
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Benchmark Summary');
  console.log('='.repeat(60));

  const allResults = runner.getResults();
  const avgLatency = allResults.reduce((sum, r) => sum + r.avgLatency, 0) / allResults.length;

  console.log(`Total benchmarks: ${allResults.length}`);
  console.log(`Average latency: ${avgLatency.toFixed(3)}ms`);
  console.log(`\nFastest: ${allResults.sort((a, b) => a.avgLatency - b.avgLatency)[0].name}`);
  console.log(`Slowest: ${allResults.sort((a, b) => b.avgLatency - a.avgLatency)[0].name}`);

  // Export results
  const json = runner.exportJSON();
  const csv = runner.exportCSV();

  console.log('\n✓ Results exported to JSON and CSV');
  console.log('='.repeat(60));
}

// Helper functions
function expensiveComputation(n: number): number {
  let result = n;
  for (let i = 0; i < 1000; i++) {
    result = Math.sqrt(result + i);
  }
  return result;
}

function processItemSync(item: number): number {
  return item * 2;
}

async function processItem(item: number): Promise<number> {
  return new Promise(resolve => {
    setImmediate(() => resolve(item * 2));
  });
}

async function asyncOperation(n: number): Promise<number> {
  return new Promise(resolve => {
    setTimeout(() => resolve(n * 2), 1);
  });
}

// Run benchmarks
if (require.main === module) {
  main().catch(console.error);
}

export { main as runBenchmarks };
