/**
 * Performance Optimization Type Definitions
 *
 * Comprehensive type system for neural-enhanced performance monitoring, caching,
 * and optimization in AgentScope v1.2. Supports Flash Attention (2.49x-7.47x speedup),
 * HNSW indexing (150x-12,500x faster), and intelligent caching strategies.
 *
 * **Key Performance Layers:**
 * - Monitoring: Sub-millisecond timing with <0.1ms overhead
 * - Caching: LRU cache with >80% hit rate target
 * - Batching: 20-40% I/O reduction through intelligent batching
 * - Parallelization: Worker pool for CPU-intensive operations
 * - Profiling: Memory leak detection with <1% overhead
 *
 * @example Complete configuration
 * ```typescript
 * import type { PerformanceConfig } from '@claude-flow/performance';
 *
 * const config: PerformanceConfig = {
 *   enableMonitoring: true,
 *   enableCache: true,
 *   enableBatch: true,
 *   enableParallel: true,
 *   enableProfiling: true,
 *   monitoringInterval: 1000,
 *   cacheMaxSize: 1000,
 *   cacheTTL: 3600000,
 *   batchSize: 100,
 *   batchDelay: 50,
 *   maxWorkers: 4,
 *   memoryThreshold: 0.9
 * };
 * ```
 *
 * @see {@link PerformanceMonitor} for monitoring implementation
 * @see {@link LRUCache} for caching implementation
 * @see docs/performance/BENCHMARK-SPECIFICATION.md for performance targets
 *
 * @module @claude-flow/performance/types
 */

/**
 * Global performance configuration for AgentScope optimizations
 *
 * Controls all performance enhancement layers including monitoring, caching,
 * batching, parallelization, and profiling. Each layer can be toggled
 * independently for testing, profiling, and production deployment.
 *
 * **Performance Targets:**
 * - Monitoring overhead: <1% (target: <0.1ms per operation)
 * - Cache hit rate: >80% for production workloads
 * - Batch I/O reduction: 20-40% improvement
 * - Parallel speedup: 2-4x on multi-core systems
 * - Memory profiling overhead: <1%
 *
 * @example Enable all optimizations (recommended for production)
 * ```typescript
 * const config: PerformanceConfig = {
 *   enableMonitoring: true,
 *   enableCache: true,
 *   enableBatch: true,
 *   enableParallel: true,
 *   enableProfiling: false // Disable in production unless debugging
 * };
 * ```
 *
 * @example Selective optimization for benchmarking
 * ```typescript
 * // Test cache impact in isolation
 * const config: PerformanceConfig = {
 *   enableMonitoring: true, // Keep monitoring for metrics
 *   enableCache: true,      // Test this layer
 *   enableBatch: false,
 *   enableParallel: false,
 *   enableProfiling: false
 * };
 * ```
 *
 * @performance Each flag adds <0.1ms overhead when enabled, <0.001ms when disabled
 *
 * @public
 */
export interface PerformanceConfig {
  /** Enable performance monitoring with sub-millisecond timing (default: true) */
  enableMonitoring?: boolean;

  /** Enable LRU cache with TTL support (default: true) */
  enableCache?: boolean;

  /** Enable batch operations for I/O reduction (default: true) */
  enableBatch?: boolean;

  /** Enable parallel execution with worker pool (default: true) */
  enableParallel?: boolean;

  /** Enable memory profiling and leak detection (default: false, use for debugging only) */
  enableProfiling?: boolean;

  /** Monitoring interval in milliseconds (default: 1000ms) */
  monitoringInterval?: number;

  /** Maximum cache entries before LRU eviction (default: 1000) */
  cacheMaxSize?: number;

  /** Cache TTL in milliseconds, 0 for no expiration (default: 3600000, 1 hour) */
  cacheTTL?: number;

  /** Batch size before flush (default: 100) */
  batchSize?: number;

  /** Batch delay in milliseconds before auto-flush (default: 50ms) */
  batchDelay?: number;

  /** Maximum worker threads for parallel execution (default: 4) */
  maxWorkers?: number;

  /** Memory usage threshold (0-1) before warning (default: 0.9, 90%) */
  memoryThreshold?: number;
}

/**
 * Performance metrics recorded by monitoring layer
 *
 * Tracks comprehensive performance data for each operation including
 * timing, throughput, resource usage, and success status. Used for
 * bottleneck detection, optimization suggestions, and performance regression analysis.
 *
 * **Timing Precision:** Uses `performance.now()` for sub-millisecond accuracy
 * **Overhead:** <0.1ms per metric recording (target: <0.05ms)
 * **Storage:** ~200 bytes per metric entry
 *
 * @example Recording metrics manually
 * ```typescript
 * import { PerformanceMetrics } from '@claude-flow/performance';
 *
 * const metric: PerformanceMetrics = {
 *   timestamp: Date.now(),
 *   layer: 'memory',
 *   operation: 'vector-search',
 *   latency: 8.234,
 *   throughput: 121.5,
 *   memory: 45678,
 *   success: true,
 *   metadata: { indexType: 'hnsw', vectorCount: 1000 }
 * };
 * ```
 *
 * @example Automated recording via PerformanceMonitor
 * ```typescript
 * import { getGlobalMonitor } from '@claude-flow/performance';
 *
 * const monitor = getGlobalMonitor();
 * monitor.startTimer('database-query');
 * // ... perform operation
 * const latency = monitor.endTimer('database-query', { queryType: 'select' });
 * // Metrics recorded automatically
 * ```
 *
 * @see {@link PerformanceMonitor.record} for recording metrics
 * @see {@link AggregateMetrics} for aggregated statistics
 *
 * @performance Recording overhead: <0.1ms per metric (99th percentile: <0.2ms)
 *
 * @public
 */
export interface PerformanceMetrics {
  /** Unix timestamp in milliseconds when metric was recorded */
  timestamp: number;

  /** Performance layer that generated this metric (e.g., 'memory', 'security', 'agent') */
  layer: string;

  /** Specific operation being measured (e.g., 'vector-search', 'cache-lookup') */
  operation: string;

  /** Operation latency in milliseconds (sub-millisecond precision) */
  latency: number;

  /** Operations per second throughput (optional, calculated for repeated operations) */
  throughput?: number;

  /** Memory usage in bytes at time of measurement (optional) */
  memory?: number;

  /** CPU usage percentage 0-100 (optional, requires process monitoring) */
  cpu?: number;

  /** Whether operation completed successfully */
  success: boolean;

  /** Additional context-specific metadata (tags, parameters, results) */
  metadata?: Record<string, unknown>;
}

/**
 * Cache performance statistics for monitoring hit rates and memory usage
 *
 * Tracks comprehensive cache metrics including hit/miss rates, evictions,
 * latency, and memory consumption. Target hit rate: >80% for production workloads.
 *
 * **Performance Characteristics:**
 * - Hit latency: <0.1ms (O(1) lookup)
 * - Miss latency: ~1-10ms (depends on data source)
 * - Memory overhead: ~48 bytes per entry + value size
 *
 * @example Monitor cache effectiveness
 * ```typescript
 * import { LRUCache } from '@claude-flow/performance';
 *
 * const cache = new LRUCache<string>({ maxSize: 1000 });
 * // ... use cache ...
 *
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
 * console.log(`Memory: ${(stats.memory / 1024 / 1024).toFixed(2)}MB`);
 *
 * if (stats.hitRate < 0.7) {
 *   console.warn('Cache hit rate below target, consider increasing maxSize');
 * }
 * ```
 *
 * @see {@link LRUCache.getStats} for retrieving statistics
 * @see {@link CacheEntry} for individual cache entries
 *
 * @performance Stat calculation overhead: <0.01ms (negligible)
 *
 * @public
 */
export interface CacheStats {
  /** Total cache hits since creation or last reset */
  hits: number;

  /** Total cache misses since creation or last reset */
  misses: number;

  /** Hit rate as decimal (0-1), calculated as hits/(hits+misses) */
  hitRate: number;

  /** Current number of entries in cache */
  size: number;

  /** Maximum capacity before LRU eviction */
  maxSize: number;

  /** Total evictions due to capacity constraints */
  evictions: number;

  /** Average cache lookup latency in milliseconds */
  avgLatency: number;

  /** Estimated memory usage in bytes (entry overhead + values) */
  memory: number;
}

/**
 * Individual cache entry with metadata for LRU tracking
 *
 * Stores cached value along with timing information, TTL, and access patterns.
 * Used internally by LRUCache but exposed for inspection and debugging.
 *
 * **Memory Overhead:** ~48 bytes per entry + value size
 *
 * @example Inspect hot cache entries
 * ```typescript
 * const entries = cache.entries();
 * entries.forEach(entry => {
 *   console.log(`${entry.key}: ${entry.hits} hits, age: ${Date.now() - entry.timestamp}ms`);
 * });
 * ```
 *
 * @see {@link LRUCache.entries} for retrieving all entries
 * @see {@link LRUCache.getHotKeys} for most frequently accessed keys
 *
 * @public
 */
export interface CacheEntry<T> {
  /** Unique cache key */
  key: string;

  /** Cached value */
  value: T;

  /** Unix timestamp in milliseconds when entry was created */
  timestamp: number;

  /** Time-to-live in milliseconds (0 for no expiration) */
  ttl: number;

  /** Number of cache hits for this entry */
  hits: number;

  /** Unix timestamp in milliseconds of last access */
  lastAccessed: number;
}

/**
 * Batch processor configuration for bulk operations
 *
 * Controls batching behavior including batch size, flush delays, and
 * custom flush handlers. Batching can reduce I/O overhead by 20-40%.
 *
 * **Performance Benefits:**
 * - Reduces network round-trips (1 request vs N requests)
 * - Amortizes connection overhead
 * - Enables database query optimization
 * - Lowers CPU usage through reduced context switching
 *
 * @example Database batch inserts
 * ```typescript
 * import { BatchProcessor } from '@claude-flow/performance';
 *
 * const batchConfig: BatchConfig = {
 *   maxSize: 100,
 *   maxDelay: 50,
 *   onFlush: async (items) => {
 *     await database.bulkInsert(items);
 *   }
 * };
 * ```
 *
 * @see {@link BatchProcessor} for implementation
 * @see {@link BatchItem} for individual batch items
 *
 * @performance Batching overhead: <1ms per batch (amortized: <0.01ms per item)
 *
 * @public
 */
export interface BatchConfig {
  /** Maximum batch size before automatic flush */
  maxSize: number;

  /** Maximum delay in milliseconds before automatic flush */
  maxDelay: number;

  /** Custom flush handler for processing batched items */
  onFlush?: (items: unknown[]) => Promise<void>;
}

/**
 * Individual item in a batch with promise resolution
 *
 * Wraps data with unique ID and promise handlers for async batch processing.
 * Each item can be resolved or rejected independently after batch flush.
 *
 * @example Batch processing with error handling
 * ```typescript
 * const item: BatchItem<UserData> = {
 *   id: 'user-123',
 *   data: { name: 'Alice', email: 'alice@example.com' },
 *   timestamp: Date.now(),
 *   resolve: (result) => console.log('Success:', result),
 *   reject: (error) => console.error('Failed:', error)
 * };
 * ```
 *
 * @see {@link BatchProcessor} for batch processing implementation
 *
 * @public
 */
export interface BatchItem<T> {
  /** Unique identifier for this batch item */
  id: string;

  /** Payload data to be processed */
  data: T;

  /** Unix timestamp in milliseconds when item was added to batch */
  timestamp: number;

  /** Promise resolve callback for successful processing */
  resolve: (result: unknown) => void;

  /** Promise reject callback for processing errors */
  reject: (error: Error) => void;
}

/**
 * Parallel execution configuration for worker pool
 *
 * Controls worker thread management including pool size, queue size,
 * and timeouts. Enables 2-4x speedup for CPU-intensive operations.
 *
 * **Performance Characteristics:**
 * - Worker startup overhead: ~50-100ms per worker
 * - Task dispatch overhead: <1ms per task
 * - Ideal for operations >100ms (amortizes overhead)
 * - Linear speedup up to CPU core count
 *
 * @example CPU-intensive parallel processing
 * ```typescript
 * import { ParallelExecutor } from '@claude-flow/performance';
 *
 * const config: ParallelConfig = {
 *   maxWorkers: 4,
 *   queueSize: 100,
 *   timeout: 30000
 * };
 *
 * const executor = new ParallelExecutor(config);
 * ```
 *
 * @see {@link ParallelExecutor} for implementation
 * @see {@link WorkerTask} for task definition
 *
 * @performance Best for operations >100ms; overhead dominates for <10ms operations
 *
 * @public
 */
export interface ParallelConfig {
  /** Maximum number of concurrent worker threads */
  maxWorkers: number;

  /** Maximum queued tasks before backpressure (optional, default: unlimited) */
  queueSize?: number;

  /** Task timeout in milliseconds (optional, default: 60000ms) */
  timeout?: number;
}

/**
 * Worker task definition for parallel execution
 *
 * Wraps a function and its input data for execution in a worker thread.
 * Tasks can be prioritized for critical operations.
 *
 * @example Parallel data processing
 * ```typescript
 * const task: WorkerTask<string[], number> = {
 *   id: 'process-batch-1',
 *   data: ['item1', 'item2', 'item3'],
 *   fn: async (items) => {
 *     return items.reduce((sum, item) => sum + item.length, 0);
 *   },
 *   priority: 1 // Higher priority tasks execute first
 * };
 * ```
 *
 * @see {@link ParallelExecutor.execute} for task execution
 * @see {@link WorkerResult} for task results
 *
 * @public
 */
export interface WorkerTask<T, R> {
  /** Unique task identifier for tracking */
  id: string;

  /** Input data for the task function */
  data: T;

  /** Async function to execute in worker thread */
  fn: (data: T) => Promise<R>;

  /** Optional priority for task scheduling (higher = more urgent, default: 0) */
  priority?: number;
}

/**
 * Result from a completed worker task
 *
 * Contains either successful result or error, plus execution latency for performance tracking.
 *
 * @example Handle worker results
 * ```typescript
 * const result: WorkerResult<number> = await executor.execute(task);
 *
 * if (result.error) {
 *   console.error(`Task ${result.id} failed:`, result.error);
 * } else {
 *   console.log(`Task ${result.id} completed in ${result.latency}ms:`, result.result);
 * }
 * ```
 *
 * @see {@link ParallelExecutor.execute} for execution
 *
 * @public
 */
export interface WorkerResult<R> {
  /** Task identifier matching the original WorkerTask */
  id: string;

  /** Result value if successful (undefined if error occurred) */
  result?: R;

  /** Error if task failed (undefined if successful) */
  error?: Error;

  /** Task execution latency in milliseconds */
  latency: number;
}

/**
 * Memory snapshot at a specific point in time
 *
 * Captures Node.js process memory usage across different memory types.
 * Used for memory profiling, leak detection, and capacity planning.
 *
 * **Memory Types:**
 * - heapUsed: V8 heap memory actively used by objects
 * - heapTotal: V8 heap memory allocated (includes free space)
 * - external: C++ objects bound to JavaScript objects
 * - rss: Resident Set Size (total memory in RAM)
 * - arrayBuffers: Memory allocated for ArrayBuffer and SharedArrayBuffer
 *
 * @example Track memory growth
 * ```typescript
 * import { MemoryProfiler } from '@claude-flow/performance';
 *
 * const profiler = new MemoryProfiler();
 * profiler.startProfiling();
 *
 * // ... run application ...
 *
 * const snapshot = profiler.getSnapshot();
 * console.log(`Heap used: ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`);
 * console.log(`RSS: ${(snapshot.rss / 1024 / 1024).toFixed(2)}MB`);
 * ```
 *
 * @see {@link MemoryProfiler.getSnapshot} for capturing snapshots
 * @see {@link MemoryLeak} for leak detection
 *
 * @performance Snapshot overhead: <1ms (calls process.memoryUsage())
 *
 * @public
 */
export interface MemorySnapshot {
  /** Unix timestamp in milliseconds when snapshot was taken */
  timestamp: number;

  /** V8 heap memory used in bytes */
  heapUsed: number;

  /** V8 heap memory total in bytes */
  heapTotal: number;

  /** External C++ object memory in bytes */
  external: number;

  /** Resident Set Size (total process memory) in bytes */
  rss: number;

  /** ArrayBuffer and SharedArrayBuffer memory in bytes */
  arrayBuffers: number;
}

/**
 * Detected memory leak with growth analysis
 *
 * Indicates suspicious memory growth patterns that may represent a memory leak.
 * Triggered when memory growth rate exceeds thresholds over time.
 *
 * **Leak Detection Heuristics:**
 * - Heap growth >10MB over 5 minutes
 * - Growth rate >2MB/minute sustained
 * - RSS growth with no corresponding heap growth (native leak)
 *
 * @example Monitor for leaks
 * ```typescript
 * const profiler = new MemoryProfiler();
 * profiler.startProfiling();
 *
 * setInterval(() => {
 *   const leaks = profiler.detectLeaks();
 *   if (leaks.length > 0) {
 *     console.warn('Memory leak detected:', leaks);
 *     // Trigger heap dump or alert
 *   }
 * }, 60000);
 * ```
 *
 * @see {@link MemoryProfiler.detectLeaks} for leak detection
 * @see {@link MemorySnapshot} for memory snapshots
 *
 * @public
 */
export interface MemoryLeak {
  /** Unix timestamp in milliseconds when leak was detected */
  timestamp: number;

  /** Memory growth rate in bytes per second */
  growthRate: number;

  /** Suspected object type or location (e.g., 'heap', 'external', 'arrayBuffers') */
  suspectedObject: string;

  /** Total memory increase in bytes since profiling started */
  heapDiff: number;
}

/**
 * Benchmark result for a single benchmark run
 *
 * Contains comprehensive timing statistics including percentiles, operations per second,
 * and raw latency data. Used for performance regression testing and optimization validation.
 *
 * **Statistical Metrics:**
 * - avgLatency: Mean latency across all iterations
 * - p50/p95/p99: Latency percentiles for tail latency analysis
 * - minLatency/maxLatency: Best and worst case performance
 * - opsPerSecond: Throughput metric (1000 / avgLatency)
 *
 * @example Run benchmark and validate targets
 * ```typescript
 * import { BenchmarkRunner } from '@claude-flow/performance';
 *
 * const runner = new BenchmarkRunner();
 * const result = await runner.bench('cache-lookup', () => {
 *   cache.get('test-key');
 * }, { iterations: 10000 });
 *
 * console.log(`Avg: ${result.avgLatency.toFixed(3)}ms`);
 * console.log(`P95: ${result.p95.toFixed(3)}ms`);
 * console.log(`Throughput: ${result.opsPerSecond.toFixed(0)} ops/sec`);
 *
 * // Validate performance target
 * if (result.p95 > 1.0) {
 *   throw new Error('Cache lookup P95 exceeds 1ms target');
 * }
 * ```
 *
 * @see {@link BenchmarkRunner.bench} for running benchmarks
 * @see {@link BenchmarkSuite} for suite results
 *
 * @performance Benchmark overhead: ~0.01-0.05ms per iteration
 *
 * @public
 */
export interface BenchmarkResult {
  /** Benchmark name */
  name: string;

  /** Number of iterations executed */
  iterations: number;

  /** Average latency in milliseconds */
  avgLatency: number;

  /** 50th percentile (median) latency in milliseconds */
  p50: number;

  /** 95th percentile latency in milliseconds */
  p95: number;

  /** 99th percentile latency in milliseconds */
  p99: number;

  /** Minimum observed latency in milliseconds */
  minLatency: number;

  /** Maximum observed latency in milliseconds */
  maxLatency: number;

  /** Throughput in operations per second */
  opsPerSecond: number;

  /** Unix timestamp in milliseconds when benchmark completed */
  timestamp: number;
}

/**
 * Benchmark suite results for multiple related benchmarks
 *
 * Aggregates results from multiple benchmarks for comparison and regression analysis.
 * Provides summary statistics across the entire suite.
 *
 * @example Run benchmark suite
 * ```typescript
 * const suite = await runner.suite('Cache Performance', [
 *   { name: 'cache-hit', fn: () => cache.get('existing-key') },
 *   { name: 'cache-miss', fn: () => cache.get('nonexistent-key') },
 *   { name: 'cache-set', fn: () => cache.set('key', 'value') }
 * ]);
 *
 * console.log(`Suite: ${suite.name}`);
 * console.log(`Total tests: ${suite.summary.totalTests}`);
 * console.log(`Avg latency: ${suite.summary.avgLatency.toFixed(3)}ms`);
 * ```
 *
 * @see {@link BenchmarkRunner.suite} for running suites
 * @see {@link BenchmarkResult} for individual results
 *
 * @public
 */
export interface BenchmarkSuite {
  /** Suite name */
  name: string;

  /** Individual benchmark results */
  results: BenchmarkResult[];

  /** Aggregate statistics across all benchmarks */
  summary: {
    /** Total number of benchmarks in suite */
    totalTests: number;

    /** Total execution time for entire suite in milliseconds */
    totalTime: number;

    /** Average latency across all benchmarks */
    avgLatency: number;
  };
}

/**
 * Timer metrics for tracking ongoing operations
 *
 * Internal type used by PerformanceMonitor to track started but not yet completed operations.
 * Exposed for inspection and debugging.
 *
 * @see {@link PerformanceMonitor.startTimer} for starting timers
 * @see {@link PerformanceMonitor.endTimer} for completing timers
 *
 * @internal
 */
export interface TimerMetrics {
  /** Timer name matching the operation */
  name: string;

  /** Start time from performance.now() in milliseconds */
  startTime: number;

  /** End time from performance.now() in milliseconds (undefined until completed) */
  endTime?: number;

  /** Calculated duration in milliseconds (undefined until completed) */
  duration?: number;

  /** Optional tags for filtering and grouping */
  tags?: Record<string, string>;
}

/**
 * Aggregate statistics for an operation across multiple executions
 *
 * Provides comprehensive statistical analysis including mean, standard deviation,
 * and percentiles. Used for identifying performance patterns and outliers.
 *
 * **Statistical Analysis:**
 * - mean: Average latency (sum / count)
 * - stdDev: Standard deviation (measure of variance)
 * - p50/p95/p99: Percentile analysis for tail latency
 * - min/max: Performance bounds
 *
 * @example Analyze operation performance
 * ```typescript
 * const monitor = getGlobalMonitor();
 * const stats = monitor.getAggregateMetrics('database-query');
 *
 * if (stats) {
 *   console.log(`Mean: ${stats.mean.toFixed(2)}ms ± ${stats.stdDev.toFixed(2)}ms`);
 *   console.log(`P95: ${stats.p95.toFixed(2)}ms`);
 *
 *   if (stats.p95 > 100) {
 *     console.warn('Database query P95 exceeds 100ms threshold');
 *   }
 * }
 * ```
 *
 * @see {@link PerformanceMonitor.getAggregateMetrics} for calculation
 * @see {@link BottleneckReport} for bottleneck analysis
 *
 * @performance Calculation overhead: O(N log N) for sorting, ~1-5ms for 1000 samples
 *
 * @public
 */
export interface AggregateMetrics {
  /** Total number of samples */
  count: number;

  /** Sum of all latencies in milliseconds */
  sum: number;

  /** Average latency in milliseconds */
  mean: number;

  /** Minimum observed latency in milliseconds */
  min: number;

  /** Maximum observed latency in milliseconds */
  max: number;

  /** Standard deviation in milliseconds */
  stdDev: number;

  /** 50th percentile (median) latency in milliseconds */
  p50: number;

  /** 95th percentile latency in milliseconds */
  p95: number;

  /** 99th percentile latency in milliseconds */
  p99: number;
}

/**
 * Performance bottleneck report with severity classification
 *
 * Identifies operations consuming significant execution time relative to total workload.
 * Automatically assigned severity based on time consumption percentage.
 *
 * **Severity Thresholds:**
 * - critical: ≥50% of total time
 * - high: 30-50% of total time
 * - medium: 15-30% of total time
 * - low: 5-15% of total time
 *
 * @example Detect and fix bottlenecks
 * ```typescript
 * const monitor = getGlobalMonitor();
 * const bottlenecks = monitor.detectBottlenecks(0.05); // 5% threshold
 *
 * bottlenecks.forEach(bottleneck => {
 *   console.log(`[${bottleneck.severity.toUpperCase()}] ${bottleneck.operation}`);
 *   console.log(`  Avg latency: ${bottleneck.avgLatency.toFixed(2)}ms`);
 *   console.log(`  Count: ${bottleneck.count}`);
 *   console.log(`  % of total time: ${(bottleneck.percentOfTotal * 100).toFixed(1)}%`);
 * });
 * ```
 *
 * @see {@link PerformanceMonitor.detectBottlenecks} for detection
 * @see {@link OptimizationSuggestion} for optimization recommendations
 *
 * @public
 */
export interface BottleneckReport {
  /** Operation name that is a bottleneck */
  operation: string;

  /** Average latency for this operation in milliseconds */
  avgLatency: number;

  /** Number of times operation was executed */
  count: number;

  /** Total time spent in this operation in milliseconds */
  totalTime: number;

  /** Percentage of total execution time (0-1) */
  percentOfTotal: number;

  /** Severity classification based on time consumption */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Optimization suggestion with expected improvement metrics
 *
 * AI-generated recommendation for optimizing a detected bottleneck operation.
 * Includes strategy, expected improvement, confidence score, and reasoning.
 *
 * **Optimization Strategies:**
 * - cache: Add caching layer for repeated operations (80-95% improvement)
 * - batch: Batch multiple operations together (40-70% improvement)
 * - parallel: Execute operations in parallel (50-80% improvement)
 * - index: Add database indexes or HNSW (150x-12,500x improvement)
 * - quantize: Memory quantization (50-75% memory reduction)
 *
 * @example Apply optimization suggestions
 * ```typescript
 * const monitor = getGlobalMonitor();
 * const suggestions = monitor.suggestOptimizations();
 *
 * suggestions.forEach(suggestion => {
 *   console.log(`Optimize: ${suggestion.operation}`);
 *   console.log(`Strategy: ${suggestion.strategy}`);
 *   console.log(`Expected improvement: ${(suggestion.expectedImprovement * 100).toFixed(0)}%`);
 *   console.log(`Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
 *   console.log(`Reasoning: ${suggestion.reasoning}`);
 * });
 * ```
 *
 * @see {@link PerformanceMonitor.suggestOptimizations} for generation
 * @see {@link BottleneckReport} for bottleneck detection
 *
 * @public
 */
export interface OptimizationSuggestion {
  /** Operation to optimize */
  operation: string;

  /** Current performance metrics before optimization */
  currentMetrics: AggregateMetrics;

  /** Recommended optimization strategy */
  strategy: 'cache' | 'batch' | 'parallel' | 'index' | 'quantize';

  /** Expected performance improvement as decimal (0-1), e.g. 0.8 = 80% reduction */
  expectedImprovement: number;

  /** Confidence in suggestion (0-1), based on pattern matching and heuristics */
  confidence: number;

  /** Human-readable explanation of why this optimization applies */
  reasoning: string;
}
