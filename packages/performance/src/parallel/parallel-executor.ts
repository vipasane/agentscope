/**
 * Parallel task execution with worker pool
 * Efficiently distributes work across multiple workers
 * @module @claude-flow/performance/parallel
 */

import { ParallelConfig, WorkerTask, WorkerResult } from '../types';

export class ParallelExecutor {
  private maxWorkers: number;
  private queueSize: number;
  private timeout: number;
  private activeWorkers = 0;
  private queue: Array<WorkerTask<unknown, unknown>> = [];
  private results = new Map<string, WorkerResult<unknown>>();

  constructor(config: ParallelConfig) {
    this.maxWorkers = config.maxWorkers;
    this.queueSize = config.queueSize || 1000;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Execute a single task
   */
  async execute<T, R>(
    data: T,
    fn: (data: T) => Promise<R>,
    priority = 0
  ): Promise<R> {
    const id = this.generateId();
    const task: WorkerTask<T, R> = { id, data, fn, priority };

    return new Promise<R>((resolve, reject) => {
      // If we have available workers, execute immediately
      if (this.activeWorkers < this.maxWorkers) {
        this.executeTask(task as WorkerTask<unknown, unknown>)
          .then(result => {
            if (result.error) {
              reject(result.error);
            } else {
              resolve(result.result as R);
            }
          })
          .catch(reject);
      } else {
        // Add to queue
        if (this.queue.length >= this.queueSize) {
          reject(new Error('Queue is full'));
          return;
        }

        // Insert by priority
        const insertIndex = this.queue.findIndex(t => (t.priority || 0) < priority);
        if (insertIndex === -1) {
          this.queue.push(task as WorkerTask<unknown, unknown>);
        } else {
          this.queue.splice(insertIndex, 0, task as WorkerTask<unknown, unknown>);
        }

        // Wait for result
        const checkResult = setInterval(() => {
          const result = this.results.get(id);
          if (result) {
            clearInterval(checkResult);
            this.results.delete(id);
            if (result.error) {
              reject(result.error);
            } else {
              resolve(result.result as R);
            }
          }
        }, 10);

        // Timeout
        setTimeout(() => {
          clearInterval(checkResult);
          if (this.results.has(id)) {
            this.results.delete(id);
          }
          reject(new Error(`Task timeout after ${this.timeout}ms`));
        }, this.timeout);
      }
    });
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeBatch<T, R>(
    items: T[],
    fn: (data: T) => Promise<R>,
    priority = 0
  ): Promise<R[]> {
    const promises = items.map(item => this.execute(item, fn, priority));
    return Promise.all(promises);
  }

  /**
   * Execute tasks with map function
   */
  async map<T, R>(
    items: T[],
    fn: (data: T, index: number) => Promise<R>,
    options?: { concurrency?: number; priority?: number }
  ): Promise<R[]> {
    const concurrency = options?.concurrency || this.maxWorkers;
    const priority = options?.priority || 0;
    const results: R[] = new Array(items.length);
    let index = 0;

    const executeNext = async (): Promise<void> => {
      while (index < items.length) {
        const currentIndex = index++;
        const item = items[currentIndex];
        results[currentIndex] = await this.execute(
          { item, index: currentIndex },
          async ({ item, index }) => fn(item as T, index),
          priority
        );
      }
    };

    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(() => executeNext());

    await Promise.all(workers);
    return results;
  }

  /**
   * Execute tasks with reduce function
   */
  async reduce<T, R>(
    items: T[],
    fn: (acc: R, item: T, index: number) => Promise<R>,
    initialValue: R
  ): Promise<R> {
    let accumulator = initialValue;
    for (let i = 0; i < items.length; i++) {
      accumulator = await fn(accumulator, items[i], i);
    }
    return accumulator;
  }

  /**
   * Execute tasks with filter function
   */
  async filter<T>(
    items: T[],
    predicate: (data: T, index: number) => Promise<boolean>,
    options?: { concurrency?: number }
  ): Promise<T[]> {
    const results = await this.map(items, predicate, options);
    return items.filter((_, index) => results[index]);
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get active worker count
   */
  getActiveWorkers(): number {
    return this.activeWorkers;
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    activeWorkers: number;
    queueSize: number;
    maxWorkers: number;
    utilization: number;
  } {
    return {
      activeWorkers: this.activeWorkers,
      queueSize: this.queue.length,
      maxWorkers: this.maxWorkers,
      utilization: this.activeWorkers / this.maxWorkers
    };
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  // Private methods

  private async executeTask<T, R>(
    task: WorkerTask<T, R>
  ): Promise<WorkerResult<R>> {
    this.activeWorkers++;
    const startTime = performance.now();

    try {
      const result = await Promise.race([
        task.fn(task.data),
        this.createTimeout(this.timeout)
      ]);

      const latency = performance.now() - startTime;
      const workerResult: WorkerResult<R> = {
        id: task.id,
        result: result as R,
        latency
      };

      this.results.set(task.id, workerResult as WorkerResult<unknown>);
      return workerResult;
    } catch (error) {
      const latency = performance.now() - startTime;
      const workerResult: WorkerResult<R> = {
        id: task.id,
        error: error as Error,
        latency
      };

      this.results.set(task.id, workerResult as WorkerResult<unknown>);
      return workerResult;
    } finally {
      this.activeWorkers--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.activeWorkers >= this.maxWorkers) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      this.executeTask(task).catch(error => {
        console.error('Task execution failed:', error);
      });
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
