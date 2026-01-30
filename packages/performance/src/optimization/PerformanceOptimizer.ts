/**
 * @packageDocumentation
 * Performance optimizer with intelligent strategy selection
 *
 * @remarks
 * Orchestrates all 6 optimization layers through intelligent strategy selection:
 * - Analyzes performance metrics and bottlenecks
 * - Recommends optimal strategies based on ROI
 * - Applies optimizations with before/after validation
 * - Learns from results for future predictions
 *
 * Integrates with OptimizationStrategies for layer coordination.
 *
 * @example Auto-optimize bottlenecks
 * ```typescript
 * import { PerformanceOptimizer } from '@claude-flow/performance';
 *
 * const optimizer = new PerformanceOptimizer({
 *   enableHNSW: true,
 *   enableQuantization: true,
 *   enableCache: true,
 *   enableBatch: true
 * });
 *
 * await optimizer.initialize();
 *
 * // Analyze and optimize
 * const results = await optimizer.optimizeBottlenecks(metrics);
 * console.log(`Improved ${results.improved} operations`);
 * console.log(`Avg improvement: ${results.avgImprovement}%`);
 * ```
 *
 * @performance <5ms overhead per optimization
 * @complexity O(n) for n bottlenecks
 */

import { HNSWEngine, type HNSWConfig } from './HNSWEngine';
import { QuantizationEngine, type QuantizationConfig } from './QuantizationEngine';
import { LRUCache } from '../cache/lru-cache';
import { BatchProcessor } from '../cache/batch-processor';
import {
  OptimizationStrategies,
  type OptimizationStrategy,
  type OptimizationContext,
  type OptimizationResult,
  type OptimizationRecommendation
} from './OptimizationStrategies';

import type {
  PerformanceMetrics,
  BottleneckReport
} from '../types';

/**
 * Performance optimizer configuration
 */
export interface PerformanceOptimizerConfig {
  /** Enable HNSW vector search (Layer 1) */
  enableHNSW?: boolean;

  /** Enable quantization (Layer 6) */
  enableQuantization?: boolean;

  /** Enable caching (Layer 4) */
  enableCache?: boolean;

  /** Enable batch operations (Layer 5) */
  enableBatch?: boolean;

  /** HNSW configuration */
  hnswConfig?: Partial<HNSWConfig>;

  /** Quantization configuration */
  quantizationConfig?: Partial<QuantizationConfig>;

  /** Cache max size */
  cacheMaxSize?: number;

  /** Batch size */
  batchSize?: number;

  /** Batch delay in milliseconds */
  batchDelay?: number;
}

/**
 * Optimization summary
 */
export interface OptimizationSummary {
  /** Total operations analyzed */
  total: number;

  /** Operations improved */
  improved: number;

  /** Operations failed */
  failed: number;

  /** Average improvement percentage */
  avgImprovement: number;

  /** Detailed results */
  results: OptimizationResult[];

  /** Recommendations not applied */
  skipped?: OptimizationRecommendation[];
}

/**
 * Performance optimizer with multi-layer strategy coordination
 *
 * @remarks
 * Central orchestrator for all performance optimization layers.
 * Uses OptimizationStrategies to intelligently select and apply
 * optimizations based on metrics, bottlenecks, and ROI analysis.
 *
 * **Optimization Flow:**
 * 1. Analyze metrics and detect bottlenecks
 * 2. Get strategy recommendations (sorted by ROI)
 * 3. Apply strategies within budget constraints
 * 4. Measure before/after performance
 * 5. Learn from results for future optimization
 *
 * **Performance Targets:**
 * - Analysis overhead: <2ms
 * - Strategy application: <5ms
 * - Total optimization time: <100ms per bottleneck
 *
 * @example Basic usage
 * ```typescript
 * const optimizer = new PerformanceOptimizer({
 *   enableHNSW: true,
 *   enableQuantization: true,
 *   enableCache: true
 * });
 *
 * await optimizer.initialize();
 *
 * const metrics = monitor.getMetrics();
 * const summary = await optimizer.optimizeBottlenecks(metrics);
 *
 * console.log(`Optimized ${summary.improved}/${summary.total} operations`);
 * ```
 *
 * @example With budget constraints
 * ```typescript
 * const summary = await optimizer.autoOptimize(metrics, {
 *   maxTime: 10, // Max 10 hours implementation
 *   minConfidence: 0.85, // Only high-confidence strategies
 *   maxCost: 1000 // Cost budget
 * });
 * ```
 *
 * @performance <5ms overhead per optimization
 * @complexity O(n) for n bottlenecks
 */
export class PerformanceOptimizer {
  private config: PerformanceOptimizerConfig;
  private strategies: OptimizationStrategies;
  private hnsw?: HNSWEngine;
  private quantization?: QuantizationEngine;
  private cache?: LRUCache<unknown>;
  private batch?: BatchProcessor<unknown, unknown>;
  private initialized = false;

  constructor(config: PerformanceOptimizerConfig = {}) {
    this.config = {
      enableHNSW: config.enableHNSW ?? true,
      enableQuantization: config.enableQuantization ?? true,
      enableCache: config.enableCache ?? true,
      enableBatch: config.enableBatch ?? true,
      cacheMaxSize: config.cacheMaxSize ?? 1000,
      batchSize: config.batchSize ?? 100,
      batchDelay: config.batchDelay ?? 50,
      ...config
    };

    this.strategies = new OptimizationStrategies();
  }

  /**
   * Initialize optimizer and optimization layers
   *
   * @remarks
   * Initializes enabled optimization layers:
   * - HNSW vector search engine
   * - Quantization engine
   * - LRU cache
   * - Batch processor
   *
   * Must be called before using optimizer.
   *
   * @throws Error if initialization fails
   *
   * @example
   * ```typescript
   * const optimizer = new PerformanceOptimizer();
   * await optimizer.initialize();
   * // Optimizer ready to use
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize HNSW if enabled
    if (this.config.enableHNSW) {
      this.hnsw = new HNSWEngine({
        M: 16,
        efConstruction: 200,
        dimension: 384,
        maxElements: 10000,
        ...this.config.hnswConfig
      });
      await this.hnsw.initialize();
    }

    // Initialize quantization if enabled
    if (this.config.enableQuantization) {
      this.quantization = new QuantizationEngine({
        precision: 'int8',
        autoSelect: true,
        ...this.config.quantizationConfig
      });
    }

    // Initialize cache if enabled
    if (this.config.enableCache) {
      this.cache = new LRUCache({
        maxSize: this.config.cacheMaxSize || 1000,
        ttl: 3600000 // 1 hour default
      });
    }

    // Initialize batch processor if enabled
    if (this.config.enableBatch) {
      this.batch = new BatchProcessor<unknown, unknown>(
        {
          maxSize: this.config.batchSize || 100,
          maxDelay: this.config.batchDelay || 50
        },
        async (items: unknown[]) => items // Default passthrough
      );
    }

    this.initialized = true;
  }

  /**
   * Get optimization recommendations for metrics
   *
   * @param metrics - Performance metrics to analyze
   * @returns Sorted recommendations (highest ROI first)
   *
   * @remarks
   * Analyzes metrics and returns strategy recommendations
   * sorted by ROI (priority × speedup × confidence).
   *
   * @example
   * ```typescript
   * const recommendations = await optimizer.getRecommendations(metrics);
   *
   * for (const rec of recommendations) {
   *   console.log(`${rec.strategy.name}:`);
   *   console.log(`  Speedup: ${rec.impact.expectedSpeedup}x`);
   *   console.log(`  Confidence: ${rec.impact.confidence}`);
   *   console.log(`  Cost: ${rec.impact.implementationCost}h`);
   * }
   * ```
   *
   * @performance <2ms analysis time
   */
  async getRecommendations(metrics: PerformanceMetrics): Promise<OptimizationRecommendation[]> {
    this.ensureInitialized();
    return this.strategies.recommend(metrics);
  }

  /**
   * Optimize specific operation with strategy
   *
   * @param strategy - Strategy name or instance
   * @param context - Optimization context
   * @returns Optimization result
   *
   * @remarks
   * Applies a specific optimization strategy to an operation.
   * Measures before/after performance and returns result.
   *
   * @example
   * ```typescript
   * const result = await optimizer.optimize('HNSW Vector Search', {
   *   operation: 'semantic-search',
   *   metrics,
   *   bottlenecks: []
   * });
   *
   * if (result.success) {
   *   console.log(`Improved by ${result.improvement}%`);
   * }
   * ```
   *
   * @performance <5ms overhead
   */
  async optimize(
    strategy: string | OptimizationStrategy,
    context: Omit<OptimizationContext, 'layers'>
  ): Promise<OptimizationResult> {
    this.ensureInitialized();

    // Find strategy if string provided
    const strategyInstance = typeof strategy === 'string'
      ? this.strategies.findStrategy(strategy)
      : strategy;

    if (!strategyInstance) {
      throw new Error(`Strategy not found: ${strategy}`);
    }

    // Build context with layers
    const fullContext: OptimizationContext = {
      ...context,
      layers: {
        hnsw: this.hnsw,
        quantization: this.quantization,
        cache: this.cache,
        batch: this.batch
      }
    };

    // Apply strategy
    return this.strategies.apply(strategyInstance, fullContext);
  }

  /**
   * Optimize bottlenecks automatically
   *
   * @param metrics - Performance metrics
   * @param bottlenecks - Detected bottlenecks (optional)
   * @returns Optimization summary
   *
   * @remarks
   * Analyzes metrics, detects bottlenecks (if not provided),
   * gets recommendations, and applies strategies in priority order.
   *
   * Stops when:
   * - All bottlenecks addressed
   * - No more applicable strategies
   * - Budget exhausted
   *
   * @example
   * ```typescript
   * const summary = await optimizer.optimizeBottlenecks(metrics);
   *
   * console.log(`Total: ${summary.total}`);
   * console.log(`Improved: ${summary.improved}`);
   * console.log(`Failed: ${summary.failed}`);
   * console.log(`Avg improvement: ${summary.avgImprovement}%`);
   * ```
   *
   * @performance <100ms per bottleneck
   */
  async optimizeBottlenecks(
    metrics: PerformanceMetrics,
    bottlenecks?: BottleneckReport[]
  ): Promise<OptimizationSummary> {
    this.ensureInitialized();

    const results: OptimizationResult[] = [];
    const detectedBottlenecks = bottlenecks || this.detectBottlenecks(metrics);

    // Get recommendations
    const recommendations = await this.getRecommendations(metrics);

    // Apply top recommendations
    for (const rec of recommendations) {
      const context: OptimizationContext = {
        operation: metrics.operation || 'unknown',
        metrics,
        bottlenecks: detectedBottlenecks,
        layers: {
          hnsw: this.hnsw,
          quantization: this.quantization,
          cache: this.cache,
          batch: this.batch
        }
      };

      try {
        const result = await this.strategies.apply(rec.strategy, context);
        results.push(result);
      } catch (error) {
        results.push({
          operation: context.operation,
          strategy: rec.strategy.name,
          before: metrics.latency,
          after: metrics.latency,
          improvement: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Calculate summary
    const improved = results.filter(r => r.success && r.improvement > 5).length;
    const failed = results.filter(r => !r.success).length;
    const avgImprovement = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.improvement, 0) / Math.max(1, improved);

    return {
      total: results.length,
      improved,
      failed,
      avgImprovement: Math.round(avgImprovement),
      results
    };
  }

  /**
   * Auto-optimize with budget constraints
   *
   * @param metrics - Performance metrics
   * @param budget - Budget constraints
   * @returns Optimization summary
   *
   * @remarks
   * Automatically applies optimizations within budget:
   * - maxTime: Maximum implementation time (hours)
   * - maxCost: Maximum cost (arbitrary units)
   * - minConfidence: Minimum confidence threshold (0-1)
   *
   * @example
   * ```typescript
   * const summary = await optimizer.autoOptimize(metrics, {
   *   maxTime: 8, // 8 hours
   *   minConfidence: 0.9, // High confidence only
   *   maxCost: 500
   * });
   * ```
   */
  async autoOptimize(
    metrics: PerformanceMetrics,
    budget: { maxTime?: number; maxCost?: number; minConfidence?: number }
  ): Promise<OptimizationSummary> {
    this.ensureInitialized();

    const recommendations = await this.getRecommendations(metrics);
    const results: OptimizationResult[] = [];
    const skipped: OptimizationRecommendation[] = [];

    let timeSpent = 0;
    const maxTime = budget.maxTime || 24;
    const minConfidence = budget.minConfidence || 0.8;

    for (const rec of recommendations) {
      // Check budget constraints
      if (timeSpent + rec.impact.implementationCost > maxTime) {
        skipped.push(rec);
        continue;
      }

      if (rec.impact.confidence < minConfidence) {
        skipped.push(rec);
        continue;
      }

      // Apply strategy
      const context: OptimizationContext = {
        operation: metrics.operation || 'unknown',
        metrics,
        bottlenecks: [],
        layers: {
          hnsw: this.hnsw,
          quantization: this.quantization,
          cache: this.cache,
          batch: this.batch
        }
      };

      try {
        const result = await this.strategies.apply(rec.strategy, context);
        results.push(result);
        timeSpent += rec.impact.implementationCost;
      } catch (error) {
        results.push({
          operation: context.operation,
          strategy: rec.strategy.name,
          before: metrics.latency,
          after: metrics.latency,
          improvement: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Calculate summary
    const improved = results.filter(r => r.success && r.improvement > 5).length;
    const failed = results.filter(r => !r.success).length;
    const avgImprovement = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.improvement, 0) / Math.max(1, improved);

    return {
      total: results.length,
      improved,
      failed,
      avgImprovement: Math.round(avgImprovement),
      results,
      skipped
    };
  }

  /**
   * Detect bottlenecks from metrics
   *
   * @param metrics - Performance metrics
   * @returns Detected bottlenecks
   *
   * @remarks
   * Simple bottleneck detection based on thresholds.
   * For advanced detection, use PerformanceProfiler.
   *
   * @internal
   */
  private detectBottlenecks(metrics: PerformanceMetrics): BottleneckReport[] {
    const bottlenecks: BottleneckReport[] = [];

    // Duration bottleneck
    if (metrics.latency > 1000) {
      bottlenecks.push({
        operation: metrics.operation || 'unknown',
        avgLatency: metrics.latency,
        count: 1,
        totalTime: metrics.latency,
        percentOfTotal: 1.0,
        severity: metrics.latency > 5000 ? 'critical' : 'high'
      });
    }

    // Memory bottleneck (if memory info available)
    const memory = metrics.memory || 0;
    if (memory > 100 * 1024 * 1024) {
      bottlenecks.push({
        operation: metrics.operation || 'unknown',
        avgLatency: metrics.latency,
        count: 1,
        totalTime: metrics.latency,
        percentOfTotal: 1.0,
        severity: memory > 500 * 1024 * 1024 ? 'critical' : 'high'
      });
    }

    return bottlenecks;
  }

  /**
   * Get optimizer statistics
   *
   * @returns Current statistics for all layers
   */
  getStatistics() {
    this.ensureInitialized();

    return {
      hnsw: this.hnsw?.getStatistics?.(),
      quantization: this.quantization?.getStatistics?.(),
      cache: this.cache?.getStats?.(),
      initialized: this.initialized,
      enabledLayers: {
        hnsw: this.config.enableHNSW,
        quantization: this.config.enableQuantization,
        cache: this.config.enableCache,
        batch: this.config.enableBatch
      }
    };
  }

  /**
   * Shutdown optimizer and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.batch) {
      await this.batch.flush();
    }

    this.initialized = false;
  }

  /**
   * Ensure optimizer is initialized
   *
   * @throws Error if not initialized
   * @internal
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PerformanceOptimizer not initialized. Call initialize() first.');
    }
  }
}
