/**
 * VectorDatabase - Main interface for @claude-flow/memory
 * Combines MemoryStore, VectorSearch, and MemoryCache
 */

import type {
  VectorDatabaseConfig,
  SearchResult,
  SearchOptions,
  StoreOptions,
  MemoryNamespace,
  DatabaseStats,
  GraphContext,
  FlashAttentionConfig,
  FlashAttentionResult
} from './types.js';
import { MemoryStore } from './store/MemoryStore.js';
import { VectorSearch } from './vector/VectorSearch.js';
import { FlashAttention } from './vector/FlashAttention.js';
import { MemoryCache } from './cache/MemoryCache.js';

export class VectorDatabase {
  private store: MemoryStore;
  private vectorSearch: VectorSearch;
  private cache: MemoryCache<SearchResult[]> | null = null;
  private attentionEngine: FlashAttention | null = null;
  private config: VectorDatabaseConfig;

  constructor(config: VectorDatabaseConfig) {
    this.config = config;
    this.store = new MemoryStore();
    this.vectorSearch = new VectorSearch(config);

    // Initialize cache if caching is needed
    if (config.backend === 'hybrid') {
      this.cache = new MemoryCache({
        type: 'memory',
        maxSize: 1000,
        defaultTTL: 300000, // 5 minutes
        enableLRU: true
      });
    }

    // Initialize Flash Attention for large context operations
    this.attentionEngine = new FlashAttention();
  }

  /**
   * Insert a vector with metadata
   */
  async insert(
    id: string,
    vector: Float32Array,
    metadata: Record<string, unknown> = {},
    options: StoreOptions = {}
  ): Promise<void> {
    // Store in memory store
    await this.store.store(id, vector, metadata, options);

    // Index for vector search if not skipped
    if (!options.skipIndex) {
      const entry = await this.store.retrieve(id);
      if (entry) {
        await this.vectorSearch.index(entry);
      }
    }

    // Invalidate cache
    if (this.cache) {
      await this.cache.clear();
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    query: Float32Array,
    k: number,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(query, k, options);
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get all entries from store (filtered by options)
    const entries = await this.store.search({
      namespace: options.namespace,
      tags: options.tags,
      filter: options.filter
    });

    // Perform vector search
    let results = await this.vectorSearch.search(query, entries, options);

    // Apply threshold if specified
    if (options.threshold !== undefined) {
      results = results.filter(r => r.distance <= options.threshold!);
    }

    // Limit to k results
    results = results.slice(0, k);

    // Include vectors if requested
    if (options.includeVector) {
      for (const result of results) {
        const entry = await this.store.retrieve(result.id);
        if (entry) {
          result.vector = entry.vector;
        }
      }
    }

    // Cache results
    if (this.cache) {
      await this.cache.set(cacheKey, results, 300000); // 5 minutes
    }

    return results;
  }

  /**
   * GNN-enhanced search for better context-aware results
   */
  async gnnEnhancedSearch(
    query: Float32Array,
    k: number,
    graphContext: GraphContext,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const entries = await this.store.search({
      namespace: options.namespace,
      tags: options.tags,
      filter: options.filter
    });

    return this.vectorSearch.gnnEnhancedSearch(query, entries, k, graphContext);
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.store.delete(id);
    if (deleted) {
      await this.vectorSearch.remove(id);

      // Invalidate cache
      if (this.cache) {
        await this.cache.clear();
      }
    }
    return deleted;
  }

  /**
   * Retrieve a vector by ID
   */
  async get(id: string): Promise<SearchResult | undefined> {
    const entry = await this.store.retrieve(id);
    if (!entry) {
      return undefined;
    }

    return {
      id: entry.id,
      distance: 0,
      metadata: entry.metadata,
      vector: entry.vector
    };
  }

  /**
   * Build HNSW index from all stored vectors
   */
  async buildHNSWIndex(): Promise<void> {
    const entries = await this.store.list();
    await this.vectorSearch.buildIndex(entries);
  }

  /**
   * Get HNSW statistics
   */
  async getHNSWStats(): Promise<DatabaseStats> {
    return this.vectorSearch.getStats();
  }

  /**
   * Quantize existing vectors
   */
  async quantize(bits: 4 | 8 | 16): Promise<void> {
    // Update config
    this.config.quantization.enabled = true;
    this.config.quantization.bits = bits;

    // Rebuild vector search with new quantization
    this.vectorSearch = new VectorSearch(this.config);

    // Reindex all vectors
    const entries = await this.store.list();
    await this.vectorSearch.buildIndex(entries);
  }

  /**
   * Get quantization statistics
   */
  getQuantizationStats(): DatabaseStats {
    return this.vectorSearch.getStats();
  }

  /**
   * Flash Attention for large context processing
   */
  async flashAttention(
    query: Float32Array,
    keys: Float32Array[],
    values: Float32Array[],
    config?: FlashAttentionConfig
  ): Promise<FlashAttentionResult> {
    if (!this.attentionEngine) {
      this.attentionEngine = new FlashAttention(config);
    }

    return this.attentionEngine.compute(query, keys, values);
  }

  /**
   * Create a namespace
   */
  createNamespace(namespace: MemoryNamespace): void {
    this.store.createNamespace(namespace);
  }

  /**
   * Delete a namespace
   */
  deleteNamespace(name: string): void {
    this.store.deleteNamespace(name);
  }

  /**
   * List all namespaces
   */
  listNamespaces(): MemoryNamespace[] {
    return this.store.listNamespaces();
  }

  /**
   * Clear all data in a namespace
   */
  async clear(namespace?: string): Promise<number> {
    const count = await this.store.clear(namespace);

    // Clear vector search index
    if (!namespace) {
      this.vectorSearch.clear();
    }

    // Clear cache
    if (this.cache) {
      await this.cache.clear();
    }

    return count;
  }

  /**
   * Get total vector count
   */
  size(namespace?: string): number {
    return this.store.size(namespace);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    const vectorStats = this.vectorSearch.getStats();
    const cacheStats = this.cache ? this.cache.getStats() : undefined;

    return {
      ...vectorStats,
      totalNamespaces: this.store.listNamespaces().length,
      cache: cacheStats
    };
  }

  /**
   * Export all data
   */
  async export(): Promise<unknown> {
    return {
      entries: await this.store.export(),
      namespaces: this.store.listNamespaces(),
      config: this.config,
      stats: await this.getStats()
    };
  }

  /**
   * Import data
   */
  async import(data: { entries: any[]; namespaces: any[] }): Promise<void> {
    // Import namespaces
    for (const ns of data.namespaces) {
      if (ns.name !== 'default') {
        try {
          this.store.createNamespace(ns);
        } catch (error) {
          // Namespace might already exist
        }
      }
    }

    // Import entries
    await this.store.import(data.entries);

    // Rebuild index
    await this.buildHNSWIndex();
  }

  /**
   * Cleanup expired entries and optimize
   */
  async cleanup(): Promise<{ expired: number; optimized: boolean }> {
    const expired = await this.store.cleanup();

    // Rebuild index after cleanup
    if (expired > 0) {
      await this.buildHNSWIndex();
    }

    return {
      expired,
      optimized: expired > 0
    };
  }

  /**
   * Destroy the database and free resources
   */
  destroy(): void {
    this.store.destroy();
    this.vectorSearch.clear();
    if (this.cache) {
      this.cache.clear();
    }
  }

  // Private helper methods

  private getCacheKey(
    query: Float32Array,
    k: number,
    options: SearchOptions
  ): string {
    // Create a deterministic cache key
    const queryHash = this.hashVector(query);
    const optionsHash = JSON.stringify({
      k,
      namespace: options.namespace,
      tags: options.tags,
      threshold: options.threshold
    });

    return `search:${queryHash}:${optionsHash}`;
  }

  private hashVector(vector: Float32Array): string {
    // Simple hash for caching (not cryptographic)
    let hash = 0;
    for (let i = 0; i < Math.min(vector.length, 10); i++) {
      hash = ((hash << 5) - hash) + vector[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
