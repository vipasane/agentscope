/**
 * Performance optimization type definitions
 */

export interface PerformanceConfig {
  enableHNSW?: boolean;
  enableWASM?: boolean;
  enableNeural?: boolean;
  enableCache?: boolean;
  enableBatch?: boolean;
  enableQuantization?: boolean;
}

export interface SearchResult<T> {
  key: string;
  value: T;
  score: number;
  latency: number;
  method: 'hnsw' | 'linear' | 'cache';
}

export interface QuantizationMetadata {
  precision: 4 | 8 | 16 | 32;
  min: number;
  max: number;
  scale: number;
  originalSize: number;
  quantizedSize: number;
  compressionRatio: number;
}

export interface OptimizationStrategy {
  strategy: 'cache' | 'batch' | 'parallel' | 'quantize' | 'index';
  parameters: Record<string, any>;
  expectedImprovement: number;
  confidence: number;
}

export interface RoutingDecision {
  tier: 1 | 2 | 3;
  model: 'agent-booster' | 'haiku' | 'sonnet' | 'opus';
  expectedLatency: number;
  expectedCost: number;
  reasoning: string;
}

export interface AttentionResult {
  output: Float32Array;
  attentionWeights: number[];
  latency: number;
  speedup: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  predictiveHits?: number;
  hotKeys?: Array<{ key: any; count: number }>;
}

export interface PerformanceMetrics {
  timestamp: number;
  layer: string;
  operation: string;
  latency: number;
  throughput?: number;
  memory?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface BenchmarkMetrics {
  hnsw_search_p95: number;
  hnsw_speedup: number;
  wasm_speedup: number;
  sona_adaptation_ms: number;
  flash_attention_speedup: number;
  cache_hit_rate: number;
  predictive_hits: number;
  io_reduction: number;
  memory_reduction: number;
  scan_large_ms: number;
  cli_startup_ms: number;
  memory_mb: number;
}
