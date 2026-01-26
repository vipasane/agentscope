/**
 * @claude-flow/types - Memory System Types
 *
 * Defines memory architecture including:
 * - Vector embeddings for semantic search
 * - Memory entries with metadata
 * - HNSW indexing for fast retrieval
 * - Hybrid memory backend strategies
 *
 * @module types/memory/memory
 */

import type { MemoryId, Confidence, Timestamp } from '../common/branded.js';

/**
 * Vector embedding representation
 *
 * Typically a normalized float array used for semantic similarity.
 *
 * @example
 * ```typescript
 * const embedding: VectorEmbedding = {
 *   values: [0.23, -0.15, 0.89, ...], // 384 or 768 dimensions
 *   dimension: 384,
 *   model: 'all-MiniLM-L6-v2',
 *   normalized: true
 * };
 * ```
 */
export interface VectorEmbedding {
  /** Raw embedding values */
  readonly values: ReadonlyArray<number>;

  /** Embedding dimensionality */
  readonly dimension: number;

  /** Model used to generate embedding */
  readonly model: string;

  /** Whether vector is L2 normalized */
  readonly normalized: boolean;
}

/**
 * Memory namespace for organizing entries
 *
 * Namespaces group related memory entries and can have different
 * retention and indexing strategies.
 *
 * @example
 * - `patterns`: Learned code patterns
 * - `tasks`: Task history and outcomes
 * - `solutions`: Problem solutions
 * - `threats`: Security threat patterns
 */
export type MemoryNamespace =
  | 'default'
  | 'patterns'
  | 'tasks'
  | 'solutions'
  | 'threats'
  | 'trajectories'
  | 'feedback'
  | string;

/**
 * Memory entry metadata
 *
 * Provides context about when and how memory was created.
 */
export interface MemoryMetadata {
  /** When entry was created */
  readonly createdAt: Date;

  /** When entry was last accessed */
  readonly lastAccessedAt?: Date;

  /** Number of times accessed */
  readonly accessCount: number;

  /** Classification tags */
  readonly tags?: ReadonlyArray<string>;

  /** Entry importance (0-1) */
  readonly importance?: Confidence;

  /** Retention hint */
  readonly ttl?: number; // milliseconds
}

/**
 * Memory entry representing stored information
 *
 * @template T The type of data stored
 *
 * @example
 * ```typescript
 * const entry: MemoryEntry<CodePattern> = {
 *   id: 'mem-123',
 *   namespace: 'patterns',
 *   key: 'auth-pattern',
 *   data: { ... },
 *   embedding: { values: [...], dimension: 384, model: 'all-MiniLM-L6-v2' },
 *   metadata: { createdAt: new Date(), accessCount: 5 }
 * };
 * ```
 */
export interface MemoryEntry<T = unknown> {
  /** Unique entry identifier */
  readonly id: MemoryId;

  /** Namespace for organizing entries */
  readonly namespace: MemoryNamespace;

  /** Search key */
  readonly key: string;

  /** Stored data */
  readonly data: T;

  /** Vector embedding for semantic search */
  readonly embedding?: VectorEmbedding;

  /** Entry metadata */
  readonly metadata: MemoryMetadata;
}

/**
 * HNSW index configuration for fast approximate nearest neighbor search
 *
 * HNSW (Hierarchical Navigable Small World) provides 150x-12,500x faster
 * search compared to brute force, with configurable accuracy-speed tradeoff.
 */
export interface HNSWIndexConfig {
  /** Maximum number of connections per node (default: 16) */
  readonly maxConnections?: number;

  /** Layer multiplier for hierarchy levels (default: 1/ln(2)) */
  readonly efConstruction?: number;

  /** Search parameter for query time (default: maxConnections) */
  readonly efSearch?: number;

  /** Seed for reproducible initialization */
  readonly seed?: number;
}

/**
 * Memory backend type
 *
 * @example
 * - `memory`: In-memory storage (fast, non-persistent)
 * - `sqlite`: SQLite database (balanced)
 * - `postgres`: PostgreSQL with pgvector (enterprise)
 * - `hybrid`: Combination of in-memory cache + persistent store
 */
export type MemoryBackend = 'memory' | 'sqlite' | 'postgres' | 'hybrid';

/**
 * Memory store configuration
 *
 * Defines storage backend, indexing strategy, and performance tuning.
 */
export interface MemoryStoreConfig {
  /** Storage backend type */
  readonly backend: MemoryBackend;

  /** Backend-specific connection parameters */
  readonly connectionParams?: Record<string, unknown>;

  /** Enable HNSW indexing */
  readonly enableHNSW?: boolean;

  /** HNSW configuration */
  readonly hnsw?: HNSWIndexConfig;

  /** Cache size for hot data */
  readonly cacheSize?: number;

  /** Whether to persist data */
  readonly persistent?: boolean;

  /** Persistence path for local storage */
  readonly persistPath?: string;
}

/**
 * Memory search query
 *
 * Supports both keyword and semantic vector search.
 *
 * @example
 * ```typescript
 * const query: MemorySearchQuery = {
 *   query: 'authentication patterns',
 *   namespace: 'patterns',
 *   limit: 10,
 *   threshold: 0.7,
 *   semantic: true
 * };
 * ```
 */
export interface MemorySearchQuery {
  /** Search query string */
  readonly query: string;

  /** Limit to specific namespace */
  readonly namespace?: MemoryNamespace;

  /** Maximum results to return */
  readonly limit?: number;

  /** Minimum similarity threshold (0-1) */
  readonly threshold?: number;

  /** Use semantic search via embeddings */
  readonly semantic?: boolean;

  /** Tag filters */
  readonly tags?: ReadonlyArray<string>;
}

/**
 * Memory search result
 *
 * @template T The type of data in the entry
 */
export interface MemorySearchResult<T = unknown> {
  /** Matched entry */
  readonly entry: MemoryEntry<T>;

  /** Relevance score (0-1) */
  readonly score: Confidence;

  /** Why this match was relevant */
  readonly explanation?: string;
}

/**
 * Memory statistics
 *
 * Provides insight into memory usage and performance.
 */
export interface MemoryStats {
  /** Total entries stored */
  readonly totalEntries: number;

  /** Breakdown by namespace */
  readonly byNamespace: Record<MemoryNamespace, number>;

  /** Total memory used in bytes */
  readonly totalMemoryBytes: number;

  /** HNSW index statistics */
  readonly indexStats?: {
    indexed: number;
    indexedMemoryBytes: number;
    avgSearchLatencyMs: number;
  };

  /** Last cleanup timestamp */
  readonly lastCleanupAt?: Date;

  /** Hit rate for cached searches */
  readonly cacheHitRate?: number;
}

/**
 * Memory consolidation result
 *
 * Result of merging or optimizing stored memories.
 */
export interface MemoryConsolidationResult {
  /** Number of entries processed */
  readonly entriesProcessed: number;

  /** Number of duplicates removed */
  readonly duplicatesRemoved: number;

  /** Number of entries archived */
  readonly archived: number;

  /** Memory freed in bytes */
  readonly memoryFreedBytes: number;

  /** Time taken in ms */
  readonly durationMs: number;
}

/**
 * Memory event for tracking changes
 *
 * Events are emitted when memory is stored, accessed, or modified.
 */
export type MemoryEvent =
  | {
      type: 'stored';
      id: MemoryId;
      namespace: MemoryNamespace;
      timestamp: Date;
    }
  | {
      type: 'accessed';
      id: MemoryId;
      namespace: MemoryNamespace;
      timestamp: Date;
    }
  | {
      type: 'deleted';
      id: MemoryId;
      namespace: MemoryNamespace;
      timestamp: Date;
    }
  | {
      type: 'consolidated';
      result: MemoryConsolidationResult;
      timestamp: Date;
    };

/**
 * Hybrid memory configuration combining cache + persistent storage
 *
 * @example
 * ```typescript
 * const config: HybridMemoryConfig = {
 *   cacheTier: {
 *     backend: 'memory',
 *     cacheSize: 10000
 *   },
 *   persistentTier: {
 *     backend: 'sqlite',
 *     persistPath: './memory.db'
 *   },
 *   promotionThreshold: 0.8,
 *   evictionPolicy: 'lru'
 * };
 * ```
 */
export interface HybridMemoryConfig {
  /** Fast cache tier configuration */
  readonly cacheTier: MemoryStoreConfig;

  /** Persistent tier configuration */
  readonly persistentTier: MemoryStoreConfig;

  /** Score threshold for promoting to cache */
  readonly promotionThreshold?: number;

  /** Eviction policy: 'lru', 'lfu', or 'fifo' */
  readonly evictionPolicy?: 'lru' | 'lfu' | 'fifo';

  /** Sync interval in ms */
  readonly syncIntervalMs?: number;
}
