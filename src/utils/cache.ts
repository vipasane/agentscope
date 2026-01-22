/**
 * Caching Utilities for Performance Optimization
 *
 * These caching mechanisms help reduce repeated computations
 * and file system access during scanning and generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { CacheStats } from '../model/types.js';

/**
 * LRU (Least Recently Used) Cache implementation
 * Automatically evicts oldest entries when max size is reached
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    evictions: 0,
  };

  constructor(private maxSize: number = 1000) {
    this.stats.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found (cache miss)
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);

    if (value !== undefined) {
      this.stats.hits++;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      this.stats.misses++;
    }

    this.updateHitRate();
    return value;
  }

  /**
   * Set a value in the cache
   * Evicts oldest entry if cache is full
   */
  set(key: K, value: V): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, value);
    this.stats.size = this.cache.size;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: K): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.hitRate = 0;
    // Keep size, maxSize, evictions for historical tracking
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Time-based cache with TTL (Time To Live)
 * Entries automatically expire after the specified duration
 */
export class TTLCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 60000) {
    this.defaultTTL = defaultTTLMs;
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value with optional custom TTL
   */
  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get the number of entries (including potentially expired)
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * File content cache with modification time tracking
 * Only re-reads files that have been modified
 */
export class FileCache {
  private cache = new Map<string, { content: string; mtime: number }>();
  private stats = {
    hits: 0,
    misses: 0,
    reads: 0,
    errors: 0,
  };

  /**
   * Get file content from cache or read from disk
   * Returns cached content if file hasn't been modified
   */
  async get(filePath: string): Promise<string | null> {
    try {
      const stat = await fs.promises.stat(filePath);
      const mtime = stat.mtime.getTime();

      const cached = this.cache.get(filePath);

      if (cached && cached.mtime === mtime) {
        this.stats.hits++;
        return cached.content;
      }

      this.stats.misses++;
      this.stats.reads++;

      const content = await fs.promises.readFile(filePath, 'utf-8');
      this.cache.set(filePath, { content, mtime });

      return content;
    } catch (error) {
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Synchronous version of get
   */
  getSync(filePath: string): string | null {
    try {
      const stat = fs.statSync(filePath);
      const mtime = stat.mtime.getTime();

      const cached = this.cache.get(filePath);

      if (cached && cached.mtime === mtime) {
        this.stats.hits++;
        return cached.content;
      }

      this.stats.misses++;
      this.stats.reads++;

      const content = fs.readFileSync(filePath, 'utf-8');
      this.cache.set(filePath, { content, mtime });

      return content;
    } catch (error) {
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Invalidate a specific file from cache
   */
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Invalidate all files in a directory
   */
  invalidateDirectory(dirPath: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(dirPath)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached files
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): typeof this.stats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }
}

/**
 * Computation result cache with hash-based keys
 * Useful for caching results of expensive transformations
 */
export class ComputationCache<V> {
  private cache: LRUCache<string, V>;

  constructor(maxSize: number = 100) {
    this.cache = new LRUCache<string, V>(maxSize);
  }

  /**
   * Get or compute a value
   * Uses the inputs to generate a hash key
   */
  getOrCompute(
    inputs: unknown[],
    compute: () => V
  ): V {
    const key = this.hashInputs(inputs);

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = compute();
    this.cache.set(key, result);
    return result;
  }

  /**
   * Async version of getOrCompute
   */
  async getOrComputeAsync(
    inputs: unknown[],
    compute: () => Promise<V>
  ): Promise<V> {
    const key = this.hashInputs(inputs);

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await compute();
    this.cache.set(key, result);
    return result;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  private hashInputs(inputs: unknown[]): string {
    const serialized = JSON.stringify(inputs);
    return crypto.createHash('md5').update(serialized).digest('hex');
  }
}

/**
 * Memoization decorator/wrapper
 * Caches function results based on arguments
 */
export function memoize<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  maxSize: number = 100
): T & { cache: LRUCache<string, ReturnType<T>>; clearCache: () => void } {
  const cache = new LRUCache<string, ReturnType<T>>(maxSize);

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T & { cache: LRUCache<string, ReturnType<T>>; clearCache: () => void };

  memoized.cache = cache;
  memoized.clearCache = () => cache.clear();

  return memoized;
}

/**
 * Async memoization wrapper
 */
export function memoizeAsync<T extends (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>>(
  fn: T,
  maxSize: number = 100
): T & { cache: LRUCache<string, Awaited<ReturnType<T>>>; clearCache: () => void } {
  const cache = new LRUCache<string, Awaited<ReturnType<T>>>(maxSize);
  const pending = new Map<string, Promise<Awaited<ReturnType<T>>>>();

  const memoized = (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = JSON.stringify(args);

    // Check cache first
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if there's already a pending request for this key
    const pendingPromise = pending.get(key);
    if (pendingPromise) {
      return pendingPromise;
    }

    // Create new promise and store it
    const promise = fn(...args).then(result => {
      cache.set(key, result);
      pending.delete(key);
      return result;
    }).catch(error => {
      pending.delete(key);
      throw error;
    });

    pending.set(key, promise);
    return promise;
  }) as T & { cache: LRUCache<string, Awaited<ReturnType<T>>>; clearCache: () => void };

  memoized.cache = cache;
  memoized.clearCache = () => {
    cache.clear();
    pending.clear();
  };

  return memoized;
}

/**
 * Create a global cache instance for the application
 */
export function createGlobalCache(): {
  files: FileCache;
  configs: LRUCache<string, unknown>;
  computations: ComputationCache<unknown>;
} {
  return {
    files: new FileCache(),
    configs: new LRUCache<string, unknown>(50),
    computations: new ComputationCache<unknown>(100),
  };
}

// Export singleton instance for convenience
export const globalCache = createGlobalCache();
