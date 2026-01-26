/**
 * Core type definitions for @claude-flow/memory
 */

export type Backend = 'memory' | 'disk' | 'hybrid';
export type QuantizationBits = 4 | 8 | 16;
export type Runtime = 'napi' | 'wasm' | 'js';

/**
 * Vector database configuration
 */
export interface VectorDatabaseConfig {
  /** Storage backend type */
  backend: Backend;
  /** Base path for persistent storage (disk/hybrid only) */
  basePath?: string;
  /** HNSW index configuration */
  hnsw: HNSWConfig;
  /** Quantization configuration */
  quantization: QuantizationConfig;
  /** GNN enhancement configuration */
  gnn?: GNNConfig;
  /** Maximum vectors to store (for memory backend) */
  maxVectors?: number;
  /** Vector dimension */
  dimension: number;
}

/**
 * HNSW (Hierarchical Navigable Small World) index configuration
 */
export interface HNSWConfig {
  /** Enable HNSW indexing */
  enabled: boolean;
  /** Number of bi-directional links per node (default: 16) */
  m: number;
  /** Size of dynamic candidate list during construction (default: 200) */
  efConstruction: number;
  /** Size of dynamic candidate list during search (default: 100) */
  efSearch: number;
  /** Maximum level in the hierarchy (auto-computed if not set) */
  maxLevel?: number;
}

/**
 * Quantization configuration for memory reduction
 */
export interface QuantizationConfig {
  /** Enable quantization */
  enabled: boolean;
  /** Quantization precision (4, 8, or 16 bits) */
  bits: QuantizationBits;
  /** Calibration samples for quantization (default: 1000) */
  calibrationSamples?: number;
}

/**
 * GNN (Graph Neural Network) enhancement configuration
 */
export interface GNNConfig {
  /** Enable GNN-enhanced search */
  enabled: boolean;
  /** Number of GNN layers (default: 3) */
  layers: number;
  /** Hidden dimension size (default: 128) */
  hiddenDim?: number;
  /** Aggregation method */
  aggregation?: 'mean' | 'max' | 'sum';
}

/**
 * Search result with distance and metadata
 */
export interface SearchResult {
  /** Vector ID */
  id: string;
  /** Distance from query (lower is more similar) */
  distance: number;
  /** Associated metadata */
  metadata: Record<string, unknown>;
  /** Vector data (optional) */
  vector?: Float32Array;
}

/**
 * HNSW index statistics
 */
export interface HNSWStats {
  /** Total index size in bytes */
  indexSize: number;
  /** Average node degree (connections) */
  avgDegree: number;
  /** Maximum level in hierarchy */
  maxLevel: number;
  /** Time to build index (ms) */
  buildTime: number;
  /** P50 search latency (ms) */
  searchTimeP50: number;
  /** P95 search latency (ms) */
  searchTimeP95: number;
  /** P99 search latency (ms) */
  searchTimeP99: number;
  /** Total vectors indexed */
  vectorCount: number;
}

/**
 * Quantization statistics
 */
export interface QuantizationStats {
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Accuracy after quantization (0-1) */
  accuracy: number;
  /** Quantization bits used */
  bits: QuantizationBits;
}

/**
 * Graph context for GNN-enhanced search
 */
export interface GraphContext {
  /** Graph nodes (can be any data) */
  nodes: unknown[];
  /** Graph edges as [source, target] pairs */
  edges: [number, number][];
  /** Optional edge weights */
  edgeWeights?: number[];
  /** Optional node labels */
  nodeLabels?: string[];
}

/**
 * Memory namespace for data isolation
 */
export interface MemoryNamespace {
  /** Namespace name */
  name: string;
  /** TTL for entries in this namespace (ms) */
  ttl?: number;
  /** Maximum entries in this namespace */
  maxEntries?: number;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Memory entry with metadata
 */
export interface MemoryEntry {
  /** Unique entry ID */
  id: string;
  /** Namespace this entry belongs to */
  namespace: string;
  /** Vector embedding */
  vector: Float32Array;
  /** Associated metadata */
  metadata: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** TTL in milliseconds (optional) */
  ttl?: number;
  /** Entry tags */
  tags?: string[];
}

/**
 * Store options for insert/update operations
 */
export interface StoreOptions {
  /** Namespace to store in */
  namespace?: string;
  /** TTL in milliseconds */
  ttl?: number;
  /** Tags for categorization */
  tags?: string[];
  /** Skip HNSW indexing (for bulk operations) */
  skipIndex?: boolean;
}

/**
 * Search options for query operations
 */
export interface SearchOptions {
  /** Namespace to search in (undefined = all) */
  namespace?: string;
  /** Number of results to return */
  k?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Metadata filter function */
  filter?: (metadata: Record<string, unknown>) => boolean;
  /** Include vector in results */
  includeVector?: boolean;
  /** Search only specific tags */
  tags?: string[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Cache backend type */
  type: 'memory' | 'redis';
  /** Maximum cache size (entries) */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Redis connection URL (for redis backend) */
  redisUrl?: string;
  /** Enable LRU eviction */
  enableLRU?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total entries in cache */
  entries: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit ratio (0-1) */
  hitRatio: number;
  /** Total memory used (bytes) */
  memoryUsed: number;
  /** Evictions count */
  evictions: number;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  /** Total vectors stored */
  totalVectors: number;
  /** Total namespaces */
  totalNamespaces: number;
  /** Total memory used (bytes) */
  memoryUsed: number;
  /** HNSW stats (if enabled) */
  hnsw?: HNSWStats;
  /** Quantization stats (if enabled) */
  quantization?: QuantizationStats;
  /** Cache stats (if enabled) */
  cache?: CacheStats;
  /** Backend type */
  backend: Backend;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  /** Number of successful operations */
  success: number;
  /** Number of failed operations */
  failed: number;
  /** Error details (if any) */
  errors?: Array<{ id: string; error: string }>;
  /** Time taken (ms) */
  timeMs: number;
}

/**
 * Flash attention configuration
 */
export interface FlashAttentionConfig {
  /** Runtime to use */
  runtime?: Runtime;
  /** Block size for tiling */
  blockSize?: number;
  /** Enable causal masking */
  causal?: boolean;
}

/**
 * Flash attention result
 */
export interface FlashAttentionResult {
  /** Attention output */
  output: Float32Array;
  /** Execution time (ms) */
  executionTimeMs: number;
  /** Runtime used */
  runtime: Runtime;
  /** Memory saved (bytes) */
  memorySaved: number;
}

/**
 * Error types
 */
export class MemoryError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class ValidationError extends MemoryError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class IndexError extends MemoryError {
  constructor(message: string) {
    super(message, 'INDEX_ERROR');
    this.name = 'IndexError';
  }
}

export class StorageError extends MemoryError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}
