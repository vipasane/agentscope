/**
 * Performance Optimizer for V1.2
 *
 * Analyzes profiling data and applies optimizations:
 * - Caching hot paths
 * - Memoization of expensive operations
 * - Parallel processing
 * - Batch I/O operations
 * - Memory pooling
 */

import { writeFile, readFile } from 'node:fs/promises';
import type { ProfileEntry } from './profiler.js';

interface OptimizationStrategy {
  name: string;
  description: string;
  expectedImprovement: string;
  apply: () => Promise<void>;
  risk: 'low' | 'medium' | 'high';
}

interface OptimizationResult {
  strategy: string;
  beforeMs: number;
  afterMs: number;
  improvement: number;
  improvementPercent: number;
  memoryBefore: number;
  memoryAfter: number;
}

/**
 * Cache for memoized operations
 */
class MemoizationCache<K, V> {
  private cache = new Map<string, V>();
  private hits = 0;
  private misses = 0;

  get(key: K): V | undefined {
    const keyStr = JSON.stringify(key);
    const value = this.cache.get(keyStr);

    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }

    return value;
  }

  set(key: K, value: V): void {
    const keyStr = JSON.stringify(key);
    this.cache.set(keyStr, value);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }
}

/**
 * Memoize expensive function calls
 */
export function memoize<Args extends any[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const cache = new Map<string, Result>();

  return (...args: Args): Result => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Memoize async function calls
 */
export function memoizeAsync<Args extends any[], Result>(
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  const cache = new Map<string, Promise<Result>>();

  return async (...args: Args): Promise<Result> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const resultPromise = fn(...args);
    cache.set(key, resultPromise);

    try {
      return await resultPromise;
    } catch (error) {
      // Remove failed promises from cache
      cache.delete(key);
      throw error;
    }
  };
}

/**
 * Batch multiple async operations
 */
export async function batchAsync<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Parallel processing with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const index = i;
    const promise = fn(items[i]).then(result => {
      results[index] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Memory pool for object reuse
 */
export class MemoryPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (item: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(item);
      this.pool.push(item);
    }
  }

  clear(): void {
    this.pool = [];
  }

  getSize(): number {
    return this.pool.length;
  }
}

/**
 * Optimization strategies based on profiling data
 */
export class PerformanceOptimizer {
  private strategies: OptimizationStrategy[] = [];
  private results: OptimizationResult[] = [];

  /**
   * Add caching optimization
   */
  addCachingStrategy(operation: string, cacheImplementation: () => Promise<void>): void {
    this.strategies.push({
      name: `Cache ${operation}`,
      description: `Add LRU cache to ${operation} to avoid redundant computations`,
      expectedImprovement: '30-50% reduction in repeated calls',
      apply: cacheImplementation,
      risk: 'low',
    });
  }

  /**
   * Add parallel processing optimization
   */
  addParallelStrategy(operation: string, parallelImplementation: () => Promise<void>): void {
    this.strategies.push({
      name: `Parallelize ${operation}`,
      description: `Process ${operation} items in parallel to reduce total time`,
      expectedImprovement: '40-60% reduction with 4+ CPU cores',
      apply: parallelImplementation,
      risk: 'medium',
    });
  }

  /**
   * Add batching optimization
   */
  addBatchingStrategy(operation: string, batchImplementation: () => Promise<void>): void {
    this.strategies.push({
      name: `Batch ${operation}`,
      description: `Group ${operation} operations to reduce overhead`,
      expectedImprovement: '20-40% reduction in I/O operations',
      apply: batchImplementation,
      risk: 'low',
    });
  }

  /**
   * Add memory pooling optimization
   */
  addMemoryPoolStrategy(operation: string, poolImplementation: () => Promise<void>): void {
    this.strategies.push({
      name: `Memory pool for ${operation}`,
      description: `Reuse objects in ${operation} to reduce GC pressure`,
      expectedImprovement: '15-25% memory reduction, fewer GC pauses',
      apply: poolImplementation,
      risk: 'medium',
    });
  }

  /**
   * Get all strategies
   */
  getStrategies(): OptimizationStrategy[] {
    return [...this.strategies];
  }

  /**
   * Apply a specific optimization
   */
  async applyOptimization(
    strategyName: string,
    beforeFn: () => Promise<number>,
    afterFn: () => Promise<number>
  ): Promise<OptimizationResult> {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    // Measure before
    const memoryBefore = process.memoryUsage().heapUsed;
    const beforeMs = await beforeFn();

    // Apply optimization
    await strategy.apply();

    // Measure after
    const memoryAfter = process.memoryUsage().heapUsed;
    const afterMs = await afterFn();

    const result: OptimizationResult = {
      strategy: strategyName,
      beforeMs,
      afterMs,
      improvement: beforeMs - afterMs,
      improvementPercent: ((beforeMs - afterMs) / beforeMs) * 100,
      memoryBefore,
      memoryAfter,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get optimization results
   */
  getResults(): OptimizationResult[] {
    return [...this.results];
  }

  /**
   * Generate optimization report
   */
  generateReport(): string {
    const lines: string[] = [
      '# Performance Optimization Report',
      '',
      '## Applied Optimizations',
      '',
      '| Strategy | Before (ms) | After (ms) | Improvement | Memory Impact |',
      '|----------|-------------|------------|-------------|---------------|',
    ];

    for (const result of this.results) {
      const memoryDelta = result.memoryAfter - result.memoryBefore;
      const memoryImpact = memoryDelta > 0 ? `+${(memoryDelta / 1024 / 1024).toFixed(2)}MB` : `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`;

      lines.push(
        `| ${result.strategy} | ${result.beforeMs.toFixed(2)} | ${result.afterMs.toFixed(2)} | ${result.improvementPercent.toFixed(1)}% | ${memoryImpact} |`
      );
    }

    lines.push('');
    lines.push('## Available Strategies');
    lines.push('');

    for (const strategy of this.strategies) {
      const applied = this.results.some(r => r.strategy === strategy.name);
      const status = applied ? '✓ Applied' : '○ Available';

      lines.push(`### ${status}: ${strategy.name}`);
      lines.push(`- **Description**: ${strategy.description}`);
      lines.push(`- **Expected Improvement**: ${strategy.expectedImprovement}`);
      lines.push(`- **Risk**: ${strategy.risk}`);
      lines.push('');
    }

    // Overall summary
    if (this.results.length > 0) {
      const totalBefore = this.results.reduce((sum, r) => sum + r.beforeMs, 0);
      const totalAfter = this.results.reduce((sum, r) => sum + r.afterMs, 0);
      const totalImprovement = ((totalBefore - totalAfter) / totalBefore) * 100;

      lines.push('## Overall Impact');
      lines.push('');
      lines.push(`- **Total operations optimized**: ${this.results.length}`);
      lines.push(`- **Cumulative time before**: ${totalBefore.toFixed(2)}ms`);
      lines.push(`- **Cumulative time after**: ${totalAfter.toFixed(2)}ms`);
      lines.push(`- **Total improvement**: ${totalImprovement.toFixed(1)}%`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Save optimization report
   */
  async saveReport(outputPath: string): Promise<void> {
    const report = this.generateReport();
    await writeFile(outputPath, report, 'utf-8');
  }
}

/**
 * Quick optimization utilities
 */
export const OptimizationUtils = {
  /**
   * Debounce function calls
   */
  debounce<Args extends any[]>(fn: (...args: Args) => void, delayMs: number): (...args: Args) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delayMs);
    };
  },

  /**
   * Throttle function calls
   */
  throttle<Args extends any[]>(fn: (...args: Args) => void, delayMs: number): (...args: Args) => void {
    let lastCall = 0;

    return (...args: Args) => {
      const now = Date.now();

      if (now - lastCall >= delayMs) {
        lastCall = now;
        fn(...args);
      }
    };
  },

  /**
   * Lazy initialization
   */
  lazy<T>(factory: () => T): () => T {
    let value: T | undefined;
    let initialized = false;

    return () => {
      if (!initialized) {
        value = factory();
        initialized = true;
      }
      return value as T;
    };
  },

  /**
   * Async lazy initialization
   */
  lazyAsync<T>(factory: () => Promise<T>): () => Promise<T> {
    let valuePromise: Promise<T> | undefined;

    return () => {
      if (!valuePromise) {
        valuePromise = factory();
      }
      return valuePromise;
    };
  },
};

/**
 * Performance hints for common patterns
 */
export const PerformanceHints = {
  /**
   * Array operations
   */
  arrays: {
    // Use for...of instead of forEach for better performance
    fastIteration: <T>(arr: T[], fn: (item: T) => void): void => {
      for (const item of arr) {
        fn(item);
      }
    },

    // Pre-allocate array size when known
    preAllocate: <T>(size: number, fill?: T): T[] => {
      return new Array(size).fill(fill);
    },

    // Avoid array.push in loops, use index assignment
    fastPush: <T>(arr: T[], items: T[]): void => {
      const startIndex = arr.length;
      arr.length += items.length;
      for (let i = 0; i < items.length; i++) {
        arr[startIndex + i] = items[i];
      }
    },
  },

  /**
   * Object operations
   */
  objects: {
    // Use Object.create(null) for maps to avoid prototype chain
    createMap: <T>(): Record<string, T> => {
      return Object.create(null) as Record<string, T>;
    },

    // Fast property access using bracket notation
    fastGet: <T extends Record<string, any>>(obj: T, key: string): any => {
      return obj[key];
    },
  },

  /**
   * String operations
   */
  strings: {
    // Use array join instead of string concatenation in loops
    fastConcat: (parts: string[]): string => {
      return parts.join('');
    },

    // Pre-allocate string builder
    StringBuilder: class {
      private parts: string[] = [];

      append(str: string): void {
        this.parts.push(str);
      }

      toString(): string {
        return this.parts.join('');
      }

      clear(): void {
        this.parts = [];
      }
    },
  },
};
