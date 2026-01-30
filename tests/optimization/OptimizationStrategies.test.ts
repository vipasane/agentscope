/**
 * Tests for Optimization Strategies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CachingStrategy,
  BatchingStrategy,
  LazyLoadingStrategy,
  AsyncOptimizationStrategy,
} from '../../src/optimization/OptimizationStrategies';

describe('CachingStrategy', () => {
  let cache: CachingStrategy;

  beforeEach(() => {
    cache = new CachingStrategy({ maxSize: 10, ttlMs: 1000 });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const fn = (n: number) => {
        callCount++;
        return n * 2;
      };

      const memoized = cache.memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(callCount).toBe(1);

      // Second call: cached
      expect(memoized(5)).toBe(10);
      expect(callCount).toBe(1); // Not called again
    });

    it('should cache different inputs separately', () => {
      const fn = (n: number) => n * 2;
      const memoized = cache.memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(memoized(5)).toBe(10); // Cached
    });

    it('should handle complex arguments', () => {
      let callCount = 0;
      const fn = (obj: { x: number; y: number }) => {
        callCount++;
        return obj.x + obj.y;
      };

      const memoized = cache.memoize(fn);

      expect(memoized({ x: 1, y: 2 })).toBe(3);
      expect(callCount).toBe(1);

      expect(memoized({ x: 1, y: 2 })).toBe(3);
      expect(callCount).toBe(1); // Cached
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when full', () => {
      const fn = (n: number) => n;
      const memoized = cache.memoize(fn);

      // Fill cache (maxSize = 10)
      for (let i = 0; i < 10; i++) {
        memoized(i);
      }

      const stats = cache.getStats();
      expect(stats.size).toBe(10);

      // Add 11th entry
      memoized(10);

      // Should evict first entry
      expect(stats.size).toBe(10);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new CachingStrategy({ ttlMs: 50 });
      const fn = (n: number) => n;
      const memoized = shortCache.memoize(fn);

      memoized(5);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = shortCache.getStats();
      expect(stats.size).toBe(1); // Still in Map

      // But get should return undefined (expired)
      expect(shortCache.get(JSON.stringify([5]))).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should track hit rate correctly', () => {
      const fn = (n: number) => n;
      const memoized = cache.memoize(fn);

      memoized(1); // Miss
      memoized(1); // Hit
      memoized(1); // Hit
      memoized(2); // Miss

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should reset stats on clear', () => {
      const fn = (n: number) => n;
      const memoized = cache.memoize(fn);

      memoized(1);
      memoized(1);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
    });
  });
});

describe('BatchingStrategy', () => {
  let batch: BatchingStrategy;

  beforeEach(() => {
    batch = new BatchingStrategy({ batchSize: 3, delayMs: 10 });
  });

  describe('queue and flush', () => {
    it('should batch operations', async () => {
      let executionCount = 0;
      const operation = async () => {
        executionCount++;
        return executionCount;
      };

      const promise1 = batch.queue(operation);
      const promise2 = batch.queue(operation);
      const promise3 = batch.queue(operation);

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toEqual([1, 2, 3]);
    });

    it('should auto-flush when batch full', async () => {
      let flushCount = 0;
      const operation = async () => {
        flushCount++;
        return flushCount;
      };

      // Queue exactly batchSize (3) operations
      const promises = [
        batch.queue(operation),
        batch.queue(operation),
        batch.queue(operation),
      ];

      // Should auto-flush immediately
      await Promise.all(promises);
      expect(flushCount).toBe(3);
    });

    it('should flush on timer if not full', async () => {
      let executionCount = 0;
      const operation = async () => {
        executionCount++;
        return executionCount;
      };

      // Queue only 2 operations (< batchSize)
      const promise1 = batch.queue(operation);
      const promise2 = batch.queue(operation);

      // Wait for timer
      await new Promise(resolve => setTimeout(resolve, 50));

      const results = await Promise.all([promise1, promise2]);
      expect(results).toEqual([1, 2]);
    });

    it('should handle manual flush', async () => {
      let executionCount = 0;
      const operation = async () => {
        executionCount++;
        return executionCount;
      };

      batch.queue(operation);
      batch.queue(operation);

      // Manual flush before timer
      const results = await batch.flush();
      expect(results.length).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from operations', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };

      await expect(batch.queue(operation)).rejects.toThrow('Operation failed');
    });

    it('should not affect other operations on error', async () => {
      const successOp = async () => 'success';
      const failOp = async () => {
        throw new Error('fail');
      };

      const promise1 = batch.queue(successOp);
      const promise2 = batch.queue(failOp);
      const promise3 = batch.queue(successOp);

      await expect(promise1).resolves.toBe('success');
      await expect(promise2).rejects.toThrow('fail');
      await expect(promise3).resolves.toBe('success');
    });
  });
});

describe('LazyLoadingStrategy', () => {
  let lazy: LazyLoadingStrategy;

  beforeEach(() => {
    lazy = new LazyLoadingStrategy();
  });

  describe('define', () => {
    it('should lazy load modules', async () => {
      let loadCount = 0;
      const loader = async () => {
        loadCount++;
        return { value: 42 };
      };

      const getModule = lazy.define(loader);

      expect(loadCount).toBe(0); // Not loaded yet

      const module1 = await getModule();
      expect(loadCount).toBe(1);
      expect(module1.value).toBe(42);

      // Second call: uses cached
      const module2 = await getModule();
      expect(loadCount).toBe(1); // Not loaded again
      expect(module2).toBe(module1); // Same instance
    });

    it('should handle different modules independently', async () => {
      const loader1 = async () => ({ name: 'module1' });
      const loader2 = async () => ({ name: 'module2' });

      const getModule1 = lazy.define(loader1);
      const getModule2 = lazy.define(loader2);

      const m1 = await getModule1();
      const m2 = await getModule2();

      expect(m1.name).toBe('module1');
      expect(m2.name).toBe('module2');
    });
  });

  describe('preload', () => {
    it('should preload multiple modules', async () => {
      let load1 = false;
      let load2 = false;

      const loaders = [
        async () => {
          load1 = true;
          return { id: 1 };
        },
        async () => {
          load2 = true;
          return { id: 2 };
        },
      ];

      await lazy.preload(loaders);

      expect(load1).toBe(true);
      expect(load2).toBe(true);
    });

    it('should preload in parallel', async () => {
      const startTimes: number[] = [];

      const loaders = [
        async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id: 1 };
        },
        async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id: 2 };
        },
      ];

      await lazy.preload(loaders);

      // Start times should be very close (parallel execution)
      const timeDiff = Math.abs(startTimes[1] - startTimes[0]);
      expect(timeDiff).toBeLessThan(5); // <5ms difference
    });
  });
});

describe('AsyncOptimizationStrategy', () => {
  let async: AsyncOptimizationStrategy;

  beforeEach(() => {
    async = new AsyncOptimizationStrategy();
  });

  describe('parallel', () => {
    it('should execute operations in parallel', async () => {
      const startTime = Date.now();

      const operations = [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 1;
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 2;
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 3;
        },
      ];

      const results = await async.parallel(operations);

      const duration = Date.now() - startTime;

      expect(results).toEqual([1, 2, 3]);
      expect(duration).toBeLessThan(100); // Parallel: ~50ms, Sequential would be ~150ms
    });

    it('should handle empty array', async () => {
      const results = await async.parallel([]);
      expect(results).toEqual([]);
    });

    it('should propagate errors', async () => {
      const operations = [
        async () => 1,
        async () => {
          throw new Error('Failed');
        },
        async () => 3,
      ];

      await expect(async.parallel(operations)).rejects.toThrow('Failed');
    });
  });

  describe('parallelLimit', () => {
    it('should limit concurrency', async () => {
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      const operation = async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        await new Promise(resolve => setTimeout(resolve, 10));

        currentConcurrent--;
        return currentConcurrent;
      };

      const operations = Array(10).fill(null).map(() => operation);

      await async.parallelLimit(operations, 3);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should process all operations', async () => {
      const operations = Array(20)
        .fill(null)
        .map((_, i) => async () => i);

      const results = await async.parallelLimit(operations, 5);

      expect(results.length).toBe(20);
      expect(results.sort((a, b) => a - b)).toEqual(
        Array(20).fill(null).map((_, i) => i)
      );
    });

    it('should handle concurrency = 1 (sequential)', async () => {
      let concurrent = 0;

      const operation = async (n: number) => {
        expect(concurrent).toBe(0); // Should never overlap
        concurrent++;
        await new Promise(resolve => setTimeout(resolve, 5));
        concurrent--;
        return n;
      };

      const operations = [1, 2, 3].map(n => () => operation(n));

      const results = await async.parallelLimit(operations, 1);
      expect(results).toEqual([1, 2, 3]);
    });

    it('should handle errors in parallel limit', async () => {
      const operations = [
        async () => 1,
        async () => {
          throw new Error('Failed');
        },
        async () => 3,
      ];

      await expect(async.parallelLimit(operations, 2)).rejects.toThrow('Failed');
    });
  });
});
