/**
 * Caching Layer for Diagram Generation
 * Based on DESIGN-001: Security and Hooks Integration
 */

import crypto from 'node:crypto';
import type { AgentScopeConfig } from '../model/types.js';
import type { ComponentMapOptions } from './types.js';

// ============================================================================
// Cache Entry Types
// ============================================================================

interface CacheEntry {
  /** Cache key */
  key: string;
  /** Cached diagram content */
  value: string;
  /** Timestamp when cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Cache hits count */
  hits: number;
}

// ============================================================================
// LRU Cache Configuration
// ============================================================================

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL = 300000; // 5 minutes in milliseconds

// ============================================================================
// Diagram Cache Class
// ============================================================================

/**
 * LRU cache for diagram generation results
 * Implements Least Recently Used eviction policy
 */
export class DiagramCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(maxSize: number = DEFAULT_MAX_SIZE, defaultTtl: number = DEFAULT_TTL) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Generate cache key from config and options
   * Uses SHA-256 hash of normalized config signature
   */
  generateKey(config: AgentScopeConfig, options: ComponentMapOptions): string {
    const hash = crypto.createHash('sha256');

    // Create normalized signature
    const signature = {
      agentCount: config.agents.length,
      agentNames: config.agents.map(a => a.name).sort(),
      agentTypes: config.agents.map(a => a.type ?? 'worker').sort(),
      mcpServerCount: config.mcpServers.length,
      mcpServerNames: config.mcpServers.map(s => s.name).sort(),
      skillCount: config.skills.length,
      skillNames: config.skills.map(s => s.name).sort(),
      level: options.level ?? 'category',
      theme: options.theme ?? 'light',
      compact: options.compact ?? false,
      categories: options.categories?.sort() ?? [],
      types: options.types?.sort() ?? [],
      pattern: options.pattern ?? '',
      maxPerCategory: options.maxPerCategory ?? 20,
    };

    hash.update(JSON.stringify(signature));
    return `diagram-${hash.digest('hex').slice(0, 16)}`;
  }

  /**
   * Get cached diagram if exists and not expired
   * @param key Cache key
   * @returns Cached diagram or null if not found/expired
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update LRU - move to end (most recent)
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Store diagram in cache
   * @param key Cache key
   * @param value Diagram content
   * @param ttl Optional TTL override in milliseconds
   */
  set(key: string, value: string, ttl?: number): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Store new entry
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      hits: 0,
    };

    // Delete and re-add to update LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  /**
   * Invalidate specific cache entry
   * @param key Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    keys: string[];
  } {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits: entries.reduce((sum, e) => sum + e.hits, 0),
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries
   * Call periodically to clean up stale cache
   */
  pruneExpired(): number {
    const now = Date.now();
    let prunedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  /**
   * Get cache entry details (for debugging)
   */
  getEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  /**
   * Check if key exists in cache (without accessing)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return 0;

    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const totalAccesses = entries.reduce((sum, e) => sum + e.hits + 1, 0); // +1 for initial store

    return totalHits / totalAccesses;
  }

  /**
   * Get most frequently accessed keys
   */
  getHotKeys(limit: number = 10): Array<{ key: string; hits: number }> {
    const entries = Array.from(this.cache.entries());
    return entries
      .map(([key, entry]) => ({ key, hits: entry.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }
}
