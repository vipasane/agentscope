/**
 * Mock VectorDatabase for testing
 *
 * Provides an in-memory implementation of VectorDatabase interface for
 * testing without external dependencies. Simulates similarity search
 * using simple cosine similarity.
 *
 * @module tests/mocks/vector-database.mock
 */

import { cosineSimilarity } from '../../src/utils/similarity.js';
import type { Pattern } from '../../src/types/index.js';

/**
 * In-memory mock implementation of VectorDatabase
 *
 * **Features:**
 * - In-memory Map storage
 * - Cosine similarity search
 * - Namespace support
 * - Metadata filtering
 * - No external dependencies
 *
 * **Limitations:**
 * - No persistence (data lost on restart)
 * - No HNSW indexing (slower for large datasets)
 * - No quantization
 * - No GNN support
 *
 * @example
 * ```typescript
 * const db = new MockVectorDatabase();
 *
 * // Store pattern
 * await db.upsert('patterns', 'pattern-1', embedding, {
 *   task: 'Implement auth',
 *   reward: 0.95,
 * });
 *
 * // Search
 * const results = await db.search('patterns', queryEmbedding, {
 *   k: 5,
 *   minReward: 0.7,
 * });
 * ```
 */
export class MockVectorDatabase {
  private storage: Map<string, Map<string, VectorEntry>>;

  constructor() {
    this.storage = new Map();
  }

  /**
   * Store or update a vector with metadata
   *
   * @param namespace - Namespace for organization
   * @param id - Unique identifier
   * @param embedding - Vector embedding
   * @param metadata - Optional metadata
   */
  async upsert(
    namespace: string,
    id: string,
    embedding: Float32Array,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.storage.has(namespace)) {
      this.storage.set(namespace, new Map());
    }

    const ns = this.storage.get(namespace)!;
    ns.set(id, {
      id,
      embedding,
      metadata: metadata || {},
    });
  }

  /**
   * Search for similar vectors
   *
   * @param namespace - Namespace to search
   * @param query - Query embedding
   * @param options - Search options
   * @returns Array of similar entries with scores
   */
  async search(
    namespace: string,
    query: Float32Array,
    options: {
      k?: number;
      minReward?: number;
      metadata?: Record<string, unknown>;
      onlySuccesses?: boolean;
    } = {}
  ): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>> {
    const ns = this.storage.get(namespace);
    if (!ns) {
      return [];
    }

    const k = options.k || 10;
    const minReward = options.minReward || 0;

    // Compute similarities
    const results: Array<{
      id: string;
      score: number;
      metadata: Record<string, unknown>;
    }> = [];

    for (const [id, entry] of ns.entries()) {
      // Apply filters
      if (options.metadata) {
        let matches = true;
        for (const [key, value] of Object.entries(options.metadata)) {
          if (entry.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Filter by reward
      const reward = entry.metadata.reward as number;
      if (reward !== undefined && reward < minReward) {
        continue;
      }

      // Filter by success
      if (options.onlySuccesses && !entry.metadata.success) {
        continue;
      }

      // Compute similarity
      const score = cosineSimilarity(query, entry.embedding);

      results.push({
        id,
        score,
        metadata: entry.metadata,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Return top-k
    return results.slice(0, k);
  }

  /**
   * Retrieve a vector by ID
   *
   * @param namespace - Namespace
   * @param id - Vector ID
   * @returns Vector entry or undefined
   */
  async get(
    namespace: string,
    id: string
  ): Promise<
    | {
        id: string;
        embedding: Float32Array;
        metadata: Record<string, unknown>;
      }
    | undefined
  > {
    const ns = this.storage.get(namespace);
    return ns?.get(id);
  }

  /**
   * Delete a vector
   *
   * @param namespace - Namespace
   * @param id - Vector ID
   */
  async delete(namespace: string, id: string): Promise<void> {
    const ns = this.storage.get(namespace);
    ns?.delete(id);
  }

  /**
   * Clear all vectors in a namespace
   *
   * @param namespace - Namespace to clear
   */
  async clear(namespace: string): Promise<void> {
    this.storage.delete(namespace);
  }

  /**
   * Get statistics for a namespace
   *
   * @param namespace - Namespace
   * @returns Statistics
   */
  async stats(namespace: string): Promise<{
    count: number;
    avgReward?: number;
    successRate?: number;
  }> {
    const ns = this.storage.get(namespace);
    if (!ns) {
      return { count: 0 };
    }

    const count = ns.size;
    let totalReward = 0;
    let successCount = 0;
    let rewardCount = 0;

    for (const entry of ns.values()) {
      if (typeof entry.metadata.reward === 'number') {
        totalReward += entry.metadata.reward;
        rewardCount++;
      }
      if (entry.metadata.success === true) {
        successCount++;
      }
    }

    return {
      count,
      avgReward: rewardCount > 0 ? totalReward / rewardCount : undefined,
      successRate: count > 0 ? successCount / count : undefined,
    };
  }

  /**
   * List all IDs in a namespace
   *
   * @param namespace - Namespace
   * @returns Array of IDs
   */
  async list(namespace: string): Promise<string[]> {
    const ns = this.storage.get(namespace);
    if (!ns) {
      return [];
    }
    return Array.from(ns.keys());
  }

  /**
   * Batch upsert multiple vectors
   *
   * @param namespace - Namespace
   * @param entries - Array of entries to upsert
   */
  async batchUpsert(
    namespace: string,
    entries: Array<{
      id: string;
      embedding: Float32Array;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.upsert(namespace, entry.id, entry.embedding, entry.metadata);
    }
  }

  /**
   * Store a pattern (convenience method)
   *
   * @param pattern - Pattern to store
   */
  async storePattern(pattern: Pattern): Promise<void> {
    if (!pattern.embedding) {
      throw new Error('Pattern must have embedding for storage');
    }

    await this.upsert('patterns', pattern.id, pattern.embedding, {
      task: pattern.task,
      reward: pattern.reward,
      success: pattern.success,
      critique: pattern.critique,
      timestamp: pattern.timestamp,
      tokensUsed: pattern.tokensUsed,
      latencyMs: pattern.latencyMs,
      ...pattern.metadata,
    });
  }

  /**
   * Retrieve a pattern by ID
   *
   * @param id - Pattern ID
   * @returns Pattern or undefined
   */
  async getPattern(id: string): Promise<Pattern | undefined> {
    const entry = await this.get('patterns', id);
    if (!entry) {
      return undefined;
    }

    return {
      id: entry.id,
      task: entry.metadata.task as string,
      input: entry.metadata.input,
      output: entry.metadata.output,
      reward: entry.metadata.reward as number,
      success: entry.metadata.success as boolean,
      critique: entry.metadata.critique as string,
      timestamp: entry.metadata.timestamp as number,
      tokensUsed: entry.metadata.tokensUsed as number,
      latencyMs: entry.metadata.latencyMs as number,
      embedding: entry.embedding,
      metadata: entry.metadata,
    };
  }

  /**
   * Search for similar patterns
   *
   * @param query - Query embedding
   * @param options - Search options
   * @returns Array of similar patterns
   */
  async searchPatterns(
    query: Float32Array,
    options: {
      k?: number;
      minReward?: number;
      onlySuccesses?: boolean;
    } = {}
  ): Promise<Pattern[]> {
    const results = await this.search('patterns', query, options);

    const patterns: Pattern[] = [];
    for (const result of results) {
      const pattern = await this.getPattern(result.id);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }
}

/**
 * Internal storage entry
 */
interface VectorEntry {
  id: string;
  embedding: Float32Array;
  metadata: Record<string, unknown>;
}
