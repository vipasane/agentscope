import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchProcessor } from '../../src/cache/batch-processor';

describe('BatchProcessor', () => {
  describe('Basic Operations', () => {
    it('should process single item', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 100 },
        async (items) => items.map(n => n * 2)
      );

      const result = await processor.add(5);
      expect(result).toBe(10);
    });

    it('should batch multiple items', async () => {
      let batchSize = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 3, maxDelay: 100 },
        async (items) => {
          batchSize = items.length;
          return items.map(n => n * 2);
        }
      );

      const promises = [
        processor.add(1),
        processor.add(2),
        processor.add(3)
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([2, 4, 6]);
      expect(batchSize).toBe(3);
    });

    it('should handle async batch function', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 5, maxDelay: 50 },
        async (items) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return items.map(n => n * 2);
        }
      );

      const result = await processor.add(5);
      expect(result).toBe(10);
    });
  });

  describe('Auto-Flush', () => {
    it('should flush when batch is full', async () => {
      let flushCount = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 2, maxDelay: 1000 },
        async (items) => {
          flushCount++;
          return items.map(n => n * 2);
        }
      );

      await Promise.all([
        processor.add(1),
        processor.add(2)
      ]);

      expect(flushCount).toBe(1);
    });

    it('should flush after delay', async () => {
      let flushCount = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 50 },
        async (items) => {
          flushCount++;
          return items.map(n => n * 2);
        }
      );

      const promise = processor.add(1);

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 100));
      await promise;

      expect(flushCount).toBe(1);
    });

    it('should handle multiple flushes', async () => {
      let flushCount = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 2, maxDelay: 100 },
        async (items) => {
          flushCount++;
          return items.map(n => n * 2);
        }
      );

      // First batch
      await Promise.all([
        processor.add(1),
        processor.add(2)
      ]);

      // Second batch
      await Promise.all([
        processor.add(3),
        processor.add(4)
      ]);

      expect(flushCount).toBe(2);
    });
  });

  describe('Manual Flush', () => {
    it('should flush on demand', async () => {
      let flushedItems: number[] = [];

      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 1000 },
        async (items) => {
          flushedItems = items;
          return items.map(n => n * 2);
        }
      );

      processor.add(1);
      processor.add(2);
      processor.add(3);

      await processor.flush();

      expect(flushedItems).toEqual([1, 2, 3]);
    });

    it('should not flush if already processing', async () => {
      let flushCount = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 100 },
        async (items) => {
          flushCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return items.map(n => n * 2);
        }
      );

      processor.add(1);

      // Start flush
      const flushPromise = processor.flush();

      // Try to flush again (should be ignored)
      await processor.flush();

      await flushPromise;

      expect(flushCount).toBe(1);
    });

    it('should not flush if queue is empty', async () => {
      let flushCount = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 100 },
        async (items) => {
          flushCount++;
          return items.map(n => n * 2);
        }
      );

      await processor.flush();

      expect(flushCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should reject all items on batch error', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 3, maxDelay: 100 },
        async () => {
          throw new Error('Batch failed');
        }
      );

      const promises = [
        processor.add(1),
        processor.add(2),
        processor.add(3)
      ];

      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Batch failed');
      }
    });

    it('should continue processing after error', async () => {
      let callCount = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 2, maxDelay: 100 },
        async (items) => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First batch failed');
          }
          return items.map(n => n * 2);
        }
      );

      // First batch fails
      const firstPromises = [
        processor.add(1),
        processor.add(2)
      ];

      for (const promise of firstPromises) {
        await expect(promise).rejects.toThrow('First batch failed');
      }

      // Second batch succeeds
      const secondPromises = [
        processor.add(3),
        processor.add(4)
      ];

      const results = await Promise.all(secondPromises);
      expect(results).toEqual([6, 8]);
    });
  });

  describe('Batch Operations', () => {
    it('should add multiple items at once', async () => {
      let batchSize = 0;

      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 100 },
        async (items) => {
          batchSize = items.length;
          return items.map(n => n * 2);
        }
      );

      const results = await processor.addBatch([1, 2, 3, 4, 5]);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(batchSize).toBe(5);
    });

    it('should handle empty batch', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 100 },
        async (items) => items.map(n => n * 2)
      );

      const results = await processor.addBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('Queue Management', () => {
    it('should track queue size', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 1000 },
        async (items) => items.map(n => n * 2)
      );

      processor.add(1);
      processor.add(2);
      processor.add(3);

      expect(processor.getQueueSize()).toBe(3);

      await processor.flush();

      expect(processor.getQueueSize()).toBe(0);
    });

    it('should report processing state', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 100 },
        async (items) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return items.map(n => n * 2);
        }
      );

      expect(processor.isProcessing()).toBe(false);

      processor.add(1);
      const promise = processor.flush();

      expect(processor.isProcessing()).toBe(true);

      await promise;

      expect(processor.isProcessing()).toBe(false);
    });

    it('should clear queue', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 1000 },
        async (items) => items.map(n => n * 2)
      );

      const promises = [
        processor.add(1),
        processor.add(2),
        processor.add(3)
      ];

      processor.clear();

      expect(processor.getQueueSize()).toBe(0);

      // Promises should be rejected
      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Batch processor cleared');
      }
    });
  });

  describe('Statistics', () => {
    it('should track batch statistics', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 2, maxDelay: 100 },
        async (items) => items.map(n => n * 2)
      );

      await Promise.all([processor.add(1), processor.add(2)]);
      await Promise.all([processor.add(3), processor.add(4)]);
      await Promise.all([processor.add(5), processor.add(6)]);

      const stats = processor.getStats();

      expect(stats.totalBatches).toBe(3);
      expect(stats.totalItems).toBe(6);
      expect(stats.avgBatchSize).toBe(2);
      expect(stats.avgLatency).toBeGreaterThan(0);
    });

    it('should calculate running average', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 50 },
        async (items) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return items.map(n => n * 2);
        }
      );

      await processor.add(1);
      await processor.flush();

      const stats1 = processor.getStats();

      await processor.add(2);
      await processor.flush();

      const stats2 = processor.getStats();

      expect(stats2.totalBatches).toBe(2);
      expect(stats2.avgLatency).toBeGreaterThan(0);
    });
  });

  describe('Lifecycle', () => {
    it('should destroy and reject pending items', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 10, maxDelay: 1000 },
        async (items) => items.map(n => n * 2)
      );

      const promises = [
        processor.add(1),
        processor.add(2)
      ];

      processor.destroy();

      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Batch processor cleared');
      }
    });
  });

  describe('Performance', () => {
    it('should handle high throughput', async () => {
      const processor = new BatchProcessor<number, number>(
        { maxSize: 100, maxDelay: 50 },
        async (items) => items.map(n => n * 2)
      );

      const items = Array(1000).fill(0).map((_, i) => i);
      const results = await Promise.all(
        items.map(item => processor.add(item))
      );

      expect(results).toHaveLength(1000);

      const stats = processor.getStats();
      expect(stats.totalItems).toBe(1000);
    });
  });
});
