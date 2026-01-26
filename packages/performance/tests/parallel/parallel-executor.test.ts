import { describe, it, expect, beforeEach } from 'vitest';
import { ParallelExecutor } from '../../src/parallel/parallel-executor';

describe('ParallelExecutor', () => {
  let executor: ParallelExecutor;

  beforeEach(() => {
    executor = new ParallelExecutor({ maxWorkers: 4 });
  });

  describe('Single Task Execution', () => {
    it('should execute a single task', async () => {
      const result = await executor.execute(5, async (n) => n * 2);
      expect(result).toBe(10);
    });

    it('should handle async tasks', async () => {
      const result = await executor.execute(10, async (n) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return n * 2;
      });
      expect(result).toBe(20);
    });

    it('should handle task errors', async () => {
      await expect(
        executor.execute(1, async () => {
          throw new Error('Task failed');
        })
      ).rejects.toThrow('Task failed');
    });

    it('should timeout slow tasks', async () => {
      const slowExecutor = new ParallelExecutor({
        maxWorkers: 2,
        timeout: 100
      });

      await expect(
        slowExecutor.execute(1, async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return 1;
        })
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Batch Execution', () => {
    it('should execute batch of tasks', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await executor.executeBatch(items, async (n) => n * 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should handle empty batch', async () => {
      const results = await executor.executeBatch([], async (n) => n);
      expect(results).toEqual([]);
    });

    it('should handle batch with errors', async () => {
      const items = [1, 2, 3];

      await expect(
        executor.executeBatch(items, async (n) => {
          if (n === 2) throw new Error('Failed at 2');
          return n;
        })
      ).rejects.toThrow('Failed at 2');
    });
  });

  describe('Map Function', () => {
    it('should map over items', async () => {
      const items = [1, 2, 3, 4];
      const results = await executor.map(items, async (n) => n * 2);

      expect(results).toEqual([2, 4, 6, 8]);
    });

    it('should map with index', async () => {
      const items = ['a', 'b', 'c'];
      const results = await executor.map(items, async (item, index) => `${item}-${index}`);

      expect(results).toEqual(['a-0', 'b-1', 'c-2']);
    });

    it('should respect concurrency limit', async () => {
      const concurrent = [] as number[];
      let maxConcurrent = 0;

      const items = Array(10).fill(0);
      await executor.map(
        items,
        async () => {
          concurrent.push(1);
          maxConcurrent = Math.max(maxConcurrent, concurrent.length);
          await new Promise(resolve => setTimeout(resolve, 10));
          concurrent.pop();
        },
        { concurrency: 2 }
      );

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should handle large arrays', async () => {
      const items = Array(100)
        .fill(0)
        .map((_, i) => i);
      const results = await executor.map(items, async (n) => n * 2);

      expect(results).toHaveLength(100);
      expect(results[99]).toBe(198);
    });
  });

  describe('Reduce Function', () => {
    it('should reduce items', async () => {
      const items = [1, 2, 3, 4];
      const sum = await executor.reduce(items, async (acc, n) => acc + n, 0);

      expect(sum).toBe(10);
    });

    it('should reduce with initial value', async () => {
      const items = [1, 2, 3];
      const result = await executor.reduce(
        items,
        async (acc, n) => acc * n,
        2
      );

      expect(result).toBe(12); // 2 * 1 * 2 * 3
    });

    it('should handle empty array', async () => {
      const result = await executor.reduce([], async (acc, n) => acc + n, 10);
      expect(result).toBe(10);
    });
  });

  describe('Filter Function', () => {
    it('should filter items', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const results = await executor.filter(items, async (n) => n % 2 === 0);

      expect(results).toEqual([2, 4, 6]);
    });

    it('should handle async predicates', async () => {
      const items = [1, 2, 3, 4];
      const results = await executor.filter(items, async (n) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return n > 2;
      });

      expect(results).toEqual([3, 4]);
    });

    it('should handle empty results', async () => {
      const items = [1, 2, 3];
      const results = await executor.filter(items, async () => false);

      expect(results).toEqual([]);
    });
  });

  describe('Priority Handling', () => {
    it('should process high priority tasks first', async () => {
      const results = [] as number[];

      // Fill queue
      const promises = [
        executor.execute(1, async (n) => {
          results.push(n);
          return n;
        }, 0),
        executor.execute(2, async (n) => {
          results.push(n);
          return n;
        }, 0),
        executor.execute(3, async (n) => {
          results.push(n);
          return n;
        }, 10), // High priority
        executor.execute(4, async (n) => {
          results.push(n);
          return n;
        }, 5)
      ];

      await Promise.all(promises);

      // High priority task should execute before low priority
      const highPriorityIndex = results.indexOf(3);
      const lowPriorityIndex = results.indexOf(1);

      expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
    });
  });

  describe('Queue Management', () => {
    it('should track queue size', async () => {
      const limitedExecutor = new ParallelExecutor({
        maxWorkers: 1,
        queueSize: 100
      });

      // Start slow task to fill queue
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          limitedExecutor.execute(i, async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return i;
          })
        );
      }

      // Check queue size
      expect(limitedExecutor.getQueueSize()).toBeGreaterThan(0);

      await Promise.all(promises);

      expect(limitedExecutor.getQueueSize()).toBe(0);
    });

    it('should reject when queue is full', async () => {
      const tinyExecutor = new ParallelExecutor({
        maxWorkers: 1,
        queueSize: 2
      });

      // Fill workers
      const promise1 = tinyExecutor.execute(1, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 1;
      });

      // Fill queue
      const promise2 = tinyExecutor.execute(2, async () => 2);
      const promise3 = tinyExecutor.execute(3, async () => 3);

      // This should fail
      await expect(tinyExecutor.execute(4, async () => 4)).rejects.toThrow(
        'Queue is full'
      );

      await Promise.all([promise1, promise2, promise3]);
    });

    it('should clear queue', async () => {
      const limitedExecutor = new ParallelExecutor({
        maxWorkers: 1,
        queueSize: 100
      });

      // Add to queue
      for (let i = 0; i < 5; i++) {
        limitedExecutor.execute(i, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return i;
        });
      }

      limitedExecutor.clearQueue();

      expect(limitedExecutor.getQueueSize()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should report executor stats', async () => {
      const stats = executor.getStats();

      expect(stats.maxWorkers).toBe(4);
      expect(stats.activeWorkers).toBe(0);
      expect(stats.queueSize).toBe(0);
      expect(stats.utilization).toBe(0);
    });

    it('should track active workers', async () => {
      const promises = [];
      for (let i = 0; i < 4; i++) {
        promises.push(
          executor.execute(i, async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return i;
          })
        );
      }

      // Check during execution
      await new Promise(resolve => setTimeout(resolve, 10));
      const stats = executor.getStats();

      expect(stats.activeWorkers).toBeGreaterThan(0);

      await Promise.all(promises);
    });

    it('should calculate utilization', async () => {
      const promises = [];
      for (let i = 0; i < 2; i++) {
        promises.push(
          executor.execute(i, async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return i;
          })
        );
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const stats = executor.getStats();

      expect(stats.utilization).toBeGreaterThan(0);
      expect(stats.utilization).toBeLessThanOrEqual(1);

      await Promise.all(promises);
    });
  });
});
