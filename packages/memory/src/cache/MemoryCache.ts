/**
 * MemoryCache - Redis-compatible caching layer
 * Provides LRU eviction and TTL support
 */

import type { CacheConfig, CacheStats } from '../types.js';
import { ValidationError } from '../types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  lastAccessed: number;
  accessCount: number;
}

export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: CacheConfig) {
    this.config = {
      type: 'memory',
      maxSize: config.maxSize || 10000,
      defaultTTL: config.defaultTTL,
      enableLRU: config.enableLRU !== false // default true
    };

    if (this.config.type === 'redis' && !this.config.redisUrl) {
      throw new ValidationError('Redis URL required for redis backend');
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access metadata
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    // Check size limit
    if (this.cache.size >= this.config.maxSize! && !this.cache.has(key)) {
      if (this.config.enableLRU) {
        this.evictLRU();
      } else {
        throw new ValidationError(`Cache full (max: ${this.config.maxSize})`);
      }
    }

    const expiresAt = ttl
      ? Date.now() + ttl
      : this.config.defaultTTL
      ? Date.now() + this.config.defaultTTL
      : null;

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 0
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? this.hits / total : 0;

    return {
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      memoryUsed: this.estimateMemoryUsage(),
      evictions: this.evictions
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get multiple values at once
   */
  async mget(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  async mset(entries: Map<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, delta = 1): Promise<number> {
    const current = await this.get(key);
    const value = (typeof current === 'number' ? current : 0) + delta;
    await this.set(key, value as T);
    return value;
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string, delta = 1): Promise<number> {
    return this.incr(key, -delta);
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + ttl;
    return true;
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number | null> {
    const entry = this.cache.get(key);
    if (!entry || !entry.expiresAt) {
      return null;
    }

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }

  // Private helper methods

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find least recently used entry
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage
    let bytes = 0;

    for (const [key, entry] of this.cache) {
      // Key size
      bytes += key.length * 2; // rough estimate for string

      // Entry metadata
      bytes += 32; // rough estimate for entry object

      // Value size (rough estimate)
      bytes += JSON.stringify(entry.value).length;
    }

    return bytes;
  }
}
