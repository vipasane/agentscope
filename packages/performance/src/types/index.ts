/**
 * Performance optimization type definitions
 * @module @claude-flow/performance/types
 */

export interface PerformanceConfig {
  enableMonitoring?: boolean;
  enableCache?: boolean;
  enableBatch?: boolean;
  enableParallel?: boolean;
  enableProfiling?: boolean;
  monitoringInterval?: number;
  cacheMaxSize?: number;
  cacheTTL?: number;
  batchSize?: number;
  batchDelay?: number;
  maxWorkers?: number;
  memoryThreshold?: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  layer: string;
  operation: string;
  latency: number;
  throughput?: number;
  memory?: number;
  cpu?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  avgLatency: number;
  memory: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

export interface BatchConfig {
  maxSize: number;
  maxDelay: number;
  onFlush?: (items: unknown[]) => Promise<void>;
}

export interface BatchItem<T> {
  id: string;
  data: T;
  timestamp: number;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export interface ParallelConfig {
  maxWorkers: number;
  queueSize?: number;
  timeout?: number;
}

export interface WorkerTask<T, R> {
  id: string;
  data: T;
  fn: (data: T) => Promise<R>;
  priority?: number;
}

export interface WorkerResult<R> {
  id: string;
  result?: R;
  error?: Error;
  latency: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryLeak {
  timestamp: number;
  growthRate: number;
  suspectedObject: string;
  heapDiff: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  minLatency: number;
  maxLatency: number;
  opsPerSecond: number;
  timestamp: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    totalTime: number;
    avgLatency: number;
  };
}

export interface TimerMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, string>;
}

export interface AggregateMetrics {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface BottleneckReport {
  operation: string;
  avgLatency: number;
  count: number;
  totalTime: number;
  percentOfTotal: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OptimizationSuggestion {
  operation: string;
  currentMetrics: AggregateMetrics;
  strategy: 'cache' | 'batch' | 'parallel' | 'index' | 'quantize';
  expectedImprovement: number;
  confidence: number;
  reasoning: string;
}
