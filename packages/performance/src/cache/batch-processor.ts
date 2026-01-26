/**
 * Batch processor for efficient bulk operations
 * Automatically flushes when size or delay threshold is reached
 * @module @claude-flow/performance/cache
 */

import { BatchConfig, BatchItem } from '../types';

export class BatchProcessor<T, R> {
  private maxSize: number;
  private maxDelay: number;
  private batchFn: (items: T[]) => Promise<R[]>;
  private queue: BatchItem<T>[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private processing = false;
  private stats = {
    totalBatches: 0,
    totalItems: 0,
    avgBatchSize: 0,
    avgLatency: 0
  };

  constructor(config: BatchConfig, batchFn: (items: T[]) => Promise<R[]>) {
    this.maxSize = config.maxSize;
    this.maxDelay = config.maxDelay;
    this.batchFn = batchFn;
  }

  /**
   * Add item to batch
   */
  async add(data: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const item: BatchItem<T> = {
        id: this.generateId(),
        data,
        timestamp: Date.now(),
        resolve: resolve as (result: unknown) => void,
        reject
      };

      this.queue.push(item);

      // Flush if batch is full
      if (this.queue.length >= this.maxSize) {
        this.flush();
      } else if (!this.flushTimer) {
        // Schedule flush after delay
        this.flushTimer = setTimeout(() => this.flush(), this.maxDelay);
      }
    });
  }

  /**
   * Add multiple items
   */
  async addBatch(items: T[]): Promise<R[]> {
    return Promise.all(items.map(item => this.add(item)));
  }

  /**
   * Flush current batch
   */
  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Take current queue
    const batch = this.queue.splice(0, this.queue.length);
    const startTime = performance.now();

    try {
      // Execute batch function
      const items = batch.map(item => item.data);
      const results = await this.batchFn(items);

      // Resolve all promises
      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve(results[i]);
      }

      // Update stats
      const latency = performance.now() - startTime;
      this.updateStats(batch.length, latency);
    } catch (error) {
      // Reject all promises
      for (const item of batch) {
        item.reject(error as Error);
      }
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        if (this.queue.length >= this.maxSize) {
          setImmediate(() => this.flush());
        } else if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => this.flush(), this.maxDelay);
        }
      }
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if batch is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    totalBatches: number;
    totalItems: number;
    avgBatchSize: number;
    avgLatency: number;
    currentQueueSize: number;
  } {
    return {
      ...this.stats,
      currentQueueSize: this.queue.length
    };
  }

  /**
   * Clear queue and cancel pending operations
   */
  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    for (const item of this.queue) {
      item.reject(new Error('Batch processor cleared'));
    }

    this.queue = [];
  }

  /**
   * Destroy batch processor
   */
  destroy(): void {
    this.clear();
  }

  // Private methods

  private updateStats(batchSize: number, latency: number): void {
    this.stats.totalBatches++;
    this.stats.totalItems += batchSize;
    this.stats.avgBatchSize =
      this.stats.totalItems / this.stats.totalBatches;

    // Running average for latency
    this.stats.avgLatency =
      (this.stats.avgLatency * (this.stats.totalBatches - 1) + latency) /
      this.stats.totalBatches;
  }

  private generateId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
