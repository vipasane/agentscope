/**
 * Performance testing example
 */

import {
  benchmarker,
  memoryProfiler,
  loadTester
} from '../src/index';

async function performanceTestingExample() {
  console.log('=== Performance Testing Example ===\n');

  // 1. Benchmark comparison
  console.log('1. Benchmarking operations...');
  const results = await benchmarker.compare(
    'Array Operations',
    [
      {
        name: 'Array.map()',
        fn: async () => {
          return Array.from({ length: 10000 }).map((_, i) => i * 2);
        }
      },
      {
        name: 'for loop',
        fn: async () => {
          const result = [];
          for (let i = 0; i < 10000; i++) {
            result.push(i * 2);
          }
          return result;
        }
      }
    ],
    50
  );

  // 2. Memory profiling
  console.log('\n2. Memory profiling...');
  const before = memoryProfiler.snapshot('before');

  // Simulate work
  const largeArray = Array.from({ length: 100000 }).fill(0);

  const after = process.memoryUsage();
  memoryProfiler.compare(before, after);

  // 3. Load testing
  console.log('\n3. Running load test...');
  await loadTester.test(
    async () => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
    },
    {
      concurrency: 10,
      duration: 1000,
      name: 'API Calls'
    }
  );
}

performanceTestingExample().catch(console.error);
