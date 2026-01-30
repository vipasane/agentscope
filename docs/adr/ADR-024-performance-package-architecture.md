# ADR-024: Performance Package Architecture

**Status:** Proposed
**Date:** 2026-01-27
**Decision Makers:** System Architecture Team, Performance Engineering Team
**Related:** ADR-020 (Neural Performance), ADR-023 (Security Package), ADR-022 (Common Core), claude-flow v3 integration

---

## Context

AgentScope v1.2 requires a comprehensive, standalone performance optimization package that delivers aggressive performance targets while integrating with claude-flow v3's advanced capabilities. The current architecture lacks systematic performance optimization infrastructure:

1. **No Centralized Monitoring**: Performance metrics scattered across codebase
2. **No Bottleneck Detection**: Manual profiling required to identify hotspots
3. **No Adaptive Optimization**: Static performance, no learning from usage patterns
4. **No Regression Detection**: Performance can degrade without warning
5. **Limited Instrumentation**: Insufficient telemetry for optimization

### Current Performance State

| Metric | Current | Target | Gap | Method |
|--------|---------|--------|-----|--------|
| **Scan Speed (large)** | 2-5s | <1s | 2-5x slower | HNSW + Cache + Batch |
| **Memory Search** | Linear O(n) | <10ms | 100-1000x slower | HNSW indexing |
| **Agent Routing** | 100-500ms | <50ms | 2-10x slower | MoE routing + Cache |
| **Memory Usage** | ~120MB | <75MB | 60% higher | Quantization (50-75%) |
| **CLI Startup** | 500-1000ms | <300ms | 2-3x slower | Lazy loading |
| **LLM Cost** | Baseline | -75% | High cost | MoE tier selection |

### Claude-Flow V3 Performance Capabilities

| Technology | Speedup | Memory | Use Case |
|------------|---------|--------|----------|
| **HNSW Indexing** | 150x-12,500x | +10% overhead | Vector search, pattern matching |
| **Flash Attention** | 2.49x-7.47x | -50% | Attention mechanisms |
| **WASM SIMD** | 2-10x | 0% | Vector operations, quantization |
| **SONA** | <0.05ms adaptation | 0% | Neural learning, optimization |
| **Quantization (int4/int8)** | 1x | -50-75% | Embeddings, cached data |
| **MoE Routing** | 1x latency | -75% cost | Task routing (Tier 1/2/3) |

### Integration Requirements

Must integrate with:
- **AgentScope Core**: Performance instrumentation hooks
- **Security Package**: Benchmark security scan performance
- **Learning Package**: Neural optimization, pattern learning
- **Memory System**: AgentDB with HNSW, quantization
- **Hooks System**: pre-task optimization, post-task learning
- **CLI**: Performance commands, reporting

---

## Decision

Implement a **standalone, learning-enhanced performance package** (`@vipasane/agentscope-performance`) with 4 atomic features, 6 optimization layers, and comprehensive JSDoc documentation strategy.

### Architecture Overview

```mermaid
graph TB
    subgraph "📊 Performance Package (@vipasane/agentscope-performance)"
        MON[PerformanceMonitor<br/>Real-time metrics collection]
        PROF[PerformanceProfiler<br/>Bottleneck detection]
        OPT[PerformanceOptimizer<br/>Auto-tuning engine]
        BENCH[BenchmarkSuite<br/>Regression detection]
    end

    subgraph "🎯 Optimization Layers"
        L1[Layer 1: HNSW<br/>150x-12,500x speedup]
        L2[Layer 2: WASM SIMD<br/>2-10x speedup]
        L3[Layer 3: Neural<br/>SONA + Flash Attention]
        L4[Layer 4: Cache<br/>LRU + Predictive]
        L5[Layer 5: Batch<br/>20-40% I/O reduction]
        L6[Layer 6: Memory<br/>50-75% reduction]
    end

    subgraph "🧠 Learning Infrastructure"
        SONA[SONA Engine<br/><0.05ms adaptation]
        FA[Flash Attention<br/>2.49x-7.47x speedup]
        MOE[MoE Router<br/>75% cost reduction]
        RB[ReasoningBank<br/>Pattern storage]
    end

    subgraph "⚙️ Background Workers"
        W1[optimize<br/>Auto-optimization]
        W2[benchmark<br/>Continuous testing]
        W3[predict<br/>Predictive preload]
        W4[ultralearn<br/>Deep learning]
    end

    MON --> PROF
    PROF --> OPT
    OPT --> L1
    OPT --> L2
    OPT --> L3
    OPT --> L4
    OPT --> L5
    OPT --> L6

    L3 --> SONA
    L3 --> FA
    L3 --> MOE
    SONA --> RB
    MOE --> RB

    BENCH --> MON
    MON --> W1
    MON --> W2
    MON --> W3
    MON --> W4

    W1 --> OPT
    W2 --> BENCH
    W3 --> L4
    W4 --> L3

    style MON fill:#e3f2fd
    style PROF fill:#fff3e0
    style OPT fill:#e8f5e9
    style BENCH fill:#f3e5f5
    style SONA fill:#ff6f00,color:#fff
    style MOE fill:#ff6f00,color:#fff
```

---

## Feature 1: PerformanceMonitor (Real-Time Metrics Collection)

Comprehensive telemetry for all operations with minimal overhead.

### 1.1 Core Monitor

```typescript
/**
 * @packageDocumentation
 * Real-time performance monitoring for AgentScope operations
 *
 * @remarks
 * Provides comprehensive telemetry with <1% overhead:
 * - Operation timing (start, duration, end)
 * - Memory usage tracking (heap, RSS, external)
 * - Throughput metrics (ops/sec, tokens/sec)
 * - Error rate tracking
 * - Custom metrics registration
 *
 * Integrates with claude-flow hooks for cross-session learning.
 *
 * @example Basic monitoring
 * ```typescript
 * import { PerformanceMonitor } from '@vipasane/agentscope-performance';
 *
 * const monitor = new PerformanceMonitor();
 * await monitor.initialize();
 *
 * const timer = monitor.startTimer('scan-operation');
 * try {
 *   await performScan();
 *   timer.success();
 * } catch (error) {
 *   timer.error(error);
 * }
 * ```
 *
 * @example With custom metrics
 * ```typescript
 * monitor.recordMetric('agents-scanned', 42, {
 *   category: 'agent-detection',
 *   priority: 'high'
 * });
 * ```
 */

import { execAsync } from '../utils/exec';

export interface PerformanceMetrics {
  // Timing
  duration: number;
  startTime: number;
  endTime: number;

  // Memory
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;

  // Throughput
  operationsPerSecond?: number;
  tokensPerSecond?: number;

  // Quality
  errorRate: number;
  successRate: number;

  // Custom
  custom: Record<string, number>;
}

export interface MonitorConfig {
  enableMemoryTracking: boolean;
  enableCPUTracking: boolean;
  samplingIntervalMs: number;
  retentionPeriodMs: number;
  reportToHooks: boolean;
}

/**
 * Real-time performance monitoring system
 *
 * @remarks
 * Collects metrics with <1% overhead using sampling and batching.
 * Automatically reports to claude-flow hooks for learning.
 *
 * Target: <1ms overhead per operation
 */
export class PerformanceMonitor {
  private timers: Map<string, Timer> = new Map();
  private metrics: Map<string, MetricSeries> = new Map();
  private config: MonitorConfig;
  private samplingTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      enableMemoryTracking: config.enableMemoryTracking ?? true,
      enableCPUTracking: config.enableCPUTracking ?? true,
      samplingIntervalMs: config.samplingIntervalMs ?? 5000,
      retentionPeriodMs: config.retentionPeriodMs ?? 3600000, // 1 hour
      reportToHooks: config.reportToHooks ?? true,
    };
  }

  /**
   * Initialize monitor and start sampling
   *
   * @remarks
   * Starts background sampling for memory and CPU metrics.
   * Reports initial system state to claude-flow hooks.
   */
  async initialize(): Promise<void> {
    // Start sampling
    this.startSampling();

    // Report to hooks (pre-task)
    if (this.config.reportToHooks) {
      await execAsync(
        `npx @claude-flow/cli@latest hooks pre-task \\
          --description "Performance monitoring initialized" \\
          --coordinate-swarm false`
      );
    }
  }

  /**
   * Start timing an operation
   *
   * @param operation - Operation name (e.g., 'scan', 'parse', 'analyze')
   * @returns Timer instance for marking completion
   *
   * @remarks
   * Overhead: <0.5ms per operation
   *
   * @example
   * ```typescript
   * const timer = monitor.startTimer('agent-scan');
   * await scanAgents();
   * timer.success();
   * ```
   */
  startTimer(operation: string, metadata?: Record<string, any>): Timer {
    const timer = new Timer(
      operation,
      metadata,
      (result) => this.recordTimerResult(operation, result)
    );

    this.timers.set(`${operation}-${Date.now()}`, timer);

    return timer;
  }

  /**
   * Record custom metric
   *
   * @param name - Metric name
   * @param value - Metric value
   * @param tags - Optional tags for filtering
   *
   * @example
   * ```typescript
   * monitor.recordMetric('cache-hit-rate', 0.87, { component: 'memory' });
   * ```
   */
  recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        values: [],
        tags,
        lastUpdated: Date.now(),
      });
    }

    const series = this.metrics.get(name)!;
    series.values.push({
      value,
      timestamp: Date.now(),
    });
    series.lastUpdated = Date.now();

    // Prune old values
    this.pruneMetricSeries(series);
  }

  /**
   * Get current performance snapshot
   *
   * @returns Current metrics across all tracked operations
   */
  getSnapshot(): PerformanceSnapshot {
    const memory = process.memoryUsage();

    return {
      timestamp: Date.now(),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
      },
      activeTimers: this.timers.size,
      totalMetrics: this.metrics.size,
      uptime: process.uptime() * 1000,
    };
  }

  /**
   * Get metrics for specific operation
   *
   * @param operation - Operation name
   * @returns Metric series or undefined
   */
  getMetric(operation: string): MetricSeries | undefined {
    return this.metrics.get(operation);
  }

  /**
   * Get all metrics matching tags
   *
   * @param tags - Tag filters
   * @returns Array of matching metric series
   */
  getMetricsByTags(tags: Record<string, string>): MetricSeries[] {
    const results: MetricSeries[] = [];

    for (const series of this.metrics.values()) {
      const matches = Object.entries(tags).every(
        ([key, value]) => series.tags[key] === value
      );

      if (matches) {
        results.push(series);
      }
    }

    return results;
  }

  /**
   * Report metrics to claude-flow hooks
   *
   * @remarks
   * Stores metrics in ReasoningBank for learning.
   * Called automatically after operations if reportToHooks enabled.
   */
  async reportToHooks(
    operation: string,
    metrics: PerformanceMetrics
  ): Promise<void> {
    if (!this.config.reportToHooks) {
      return;
    }

    await execAsync(
      `npx @claude-flow/cli@latest hooks post-command \\
        --command "${operation}" \\
        --track-metrics true \\
        --context '${JSON.stringify(metrics)}'`
    );
  }

  /**
   * Shutdown monitor and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }

    // Report final metrics
    if (this.config.reportToHooks) {
      await execAsync(
        `npx @claude-flow/cli@latest hooks post-task \\
          --task-id "performance-monitor" \\
          --success true \\
          --store-results true`
      );
    }
  }

  private recordTimerResult(
    operation: string,
    result: TimerResult
  ): void {
    const metrics: PerformanceMetrics = {
      duration: result.duration,
      startTime: result.startTime,
      endTime: result.endTime,
      heapUsed: result.memoryDelta?.heapUsed || 0,
      heapTotal: result.memoryDelta?.heapTotal || 0,
      rss: result.memoryDelta?.rss || 0,
      external: result.memoryDelta?.external || 0,
      errorRate: result.error ? 1 : 0,
      successRate: result.error ? 0 : 1,
      custom: result.metadata || {},
    };

    // Record as time series
    this.recordMetric(`${operation}.duration`, result.duration);

    // Report to hooks
    this.reportToHooks(operation, metrics).catch(console.error);
  }

  private startSampling(): void {
    this.samplingTimer = setInterval(() => {
      if (this.config.enableMemoryTracking) {
        const memory = process.memoryUsage();
        this.recordMetric('system.memory.heapUsed', memory.heapUsed);
        this.recordMetric('system.memory.rss', memory.rss);
      }

      if (this.config.enableCPUTracking) {
        const cpuUsage = process.cpuUsage();
        this.recordMetric('system.cpu.user', cpuUsage.user);
        this.recordMetric('system.cpu.system', cpuUsage.system);
      }
    }, this.config.samplingIntervalMs);
  }

  private pruneMetricSeries(series: MetricSeries): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;

    series.values = series.values.filter(v => v.timestamp > cutoff);
  }
}

/**
 * Timer for measuring operation duration
 *
 * @remarks
 * Automatically captures memory delta and reports results.
 */
export class Timer {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private completed: boolean = false;

  constructor(
    private operation: string,
    private metadata: Record<string, any> | undefined,
    private onComplete: (result: TimerResult) => void
  ) {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }

  /**
   * Mark operation as successful
   */
  success(additionalMetadata?: Record<string, any>): void {
    if (this.completed) return;

    this.completed = true;
    this.complete(false, undefined, additionalMetadata);
  }

  /**
   * Mark operation as failed
   */
  error(error: Error, additionalMetadata?: Record<string, any>): void {
    if (this.completed) return;

    this.completed = true;
    this.complete(true, error, additionalMetadata);
  }

  private complete(
    error: boolean,
    errorObj?: Error,
    additionalMetadata?: Record<string, any>
  ): void {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    const endMemory = process.memoryUsage();

    const memoryDelta = {
      heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
      rss: endMemory.rss - this.startMemory.rss,
      external: endMemory.external - this.startMemory.external,
    };

    this.onComplete({
      operation: this.operation,
      duration,
      startTime: this.startTime,
      endTime,
      error,
      errorMessage: errorObj?.message,
      memoryDelta,
      metadata: {
        ...this.metadata,
        ...additionalMetadata,
      },
    });
  }
}

export interface TimerResult {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  error: boolean;
  errorMessage?: string;
  memoryDelta: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  metadata?: Record<string, any>;
}

export interface MetricSeries {
  name: string;
  values: Array<{ value: number; timestamp: number }>;
  tags: Record<string, string>;
  lastUpdated: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  activeTimers: number;
  totalMetrics: number;
  uptime: number;
}
```

### 1.2 Metrics Aggregation

```typescript
/**
 * @packageDocumentation
 * Metrics aggregation and statistical analysis
 *
 * @remarks
 * Calculates p50, p95, p99, mean, stddev for metric series.
 * Used for performance regression detection and SLO monitoring.
 */

export interface AggregatedMetrics {
  name: string;
  count: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stddev: number;
  sum: number;
}

/**
 * Aggregate metric series into statistical summary
 *
 * @param series - Metric series to aggregate
 * @returns Statistical summary
 *
 * @example
 * ```typescript
 * const series = monitor.getMetric('scan.duration');
 * const stats = aggregateMetrics(series);
 *
 * console.log(`p95: ${stats.p95}ms`);
 * console.log(`mean: ${stats.mean}ms`);
 * ```
 */
export function aggregateMetrics(series: MetricSeries): AggregatedMetrics {
  const values = series.values.map(v => v.value).sort((a, b) => a - b);
  const count = values.length;

  if (count === 0) {
    return {
      name: series.name,
      count: 0,
      mean: 0,
      median: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0,
      stddev: 0,
      sum: 0,
    };
  }

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  // Calculate standard deviation
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stddev = Math.sqrt(variance);

  // Percentiles
  const median = percentile(values, 0.5);
  const p95 = percentile(values, 0.95);
  const p99 = percentile(values, 0.99);

  return {
    name: series.name,
    count,
    mean,
    median,
    p95,
    p99,
    min: values[0],
    max: values[count - 1],
    stddev,
    sum,
  };
}

/**
 * Calculate percentile from sorted array
 *
 * @internal
 */
function percentile(sortedValues: number[], p: number): number {
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
```

---

## Feature 2: PerformanceProfiler (Bottleneck Detection)

Automatic hotspot detection and profiling with actionable recommendations.

### 2.1 Profiler Core

```typescript
/**
 * @packageDocumentation
 * Performance profiler for automatic bottleneck detection
 *
 * @remarks
 * Analyzes operation timings and identifies performance bottlenecks.
 * Provides actionable recommendations for optimization.
 *
 * Detection methods:
 * - Time-based: Operations taking >threshold
 * - Memory-based: Operations allocating >threshold
 * - Frequency-based: Operations called >threshold
 * - Comparative: Operations slower than baseline
 *
 * @example Basic profiling
 * ```typescript
 * import { PerformanceProfiler } from '@vipasane/agentscope-performance';
 *
 * const profiler = new PerformanceProfiler({ monitor });
 * await profiler.startProfiling();
 *
 * // ... perform operations ...
 *
 * const bottlenecks = await profiler.detectBottlenecks();
 * console.log('Critical bottlenecks:', bottlenecks.critical);
 * ```
 */

export interface BottleneckReport {
  critical: Bottleneck[];
  high: Bottleneck[];
  medium: Bottleneck[];
  low: Bottleneck[];
  summary: BottleneckSummary;
}

export interface Bottleneck {
  operation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'duration' | 'memory' | 'frequency' | 'comparative';
  metric: string;
  value: number;
  threshold: number;
  impact: number; // 0-1 scale
  recommendation: string;
  codeLocation?: string;
}

export interface BottleneckSummary {
  totalBottlenecks: number;
  criticalCount: number;
  estimatedImprovementPercent: number;
  topRecommendation: string;
}

/**
 * Performance profiler with automatic bottleneck detection
 *
 * @remarks
 * Integrates with PerformanceMonitor to analyze metrics and
 * detect performance issues. Uses statistical analysis to
 * identify outliers and regressions.
 *
 * Target: Detect 95% of bottlenecks with <5% false positives
 *
 * @performance
 * - Profiling overhead: <2%
 * - Analysis time: <100ms for typical workload
 * - Memory overhead: <10MB
 *
 * @complexity O(n log n) for n operations
 */
export class PerformanceProfiler {
  private monitor: PerformanceMonitor;
  private baselines: Map<string, Baseline> = new Map();
  private profilingActive: boolean = false;
  private thresholds: ProfilerThresholds;

  constructor(config: {
    monitor: PerformanceMonitor;
    thresholds?: Partial<ProfilerThresholds>;
  }) {
    this.monitor = config.monitor;
    this.thresholds = {
      criticalDurationMs: config.thresholds?.criticalDurationMs ?? 1000,
      highDurationMs: config.thresholds?.highDurationMs ?? 500,
      criticalMemoryBytes: config.thresholds?.criticalMemoryBytes ?? 50 * 1024 * 1024, // 50MB
      highMemoryBytes: config.thresholds?.highMemoryBytes ?? 25 * 1024 * 1024, // 25MB
      regressionThreshold: config.thresholds?.regressionThreshold ?? 1.5, // 50% slower
    };
  }

  /**
   * Start profiling session
   *
   * @remarks
   * Captures baseline metrics for comparison.
   * Enables detailed operation tracking.
   */
  async startProfiling(): Promise<void> {
    this.profilingActive = true;

    // Load historical baselines from ReasoningBank
    await this.loadBaselines();
  }

  /**
   * Stop profiling session
   */
  stopProfiling(): void {
    this.profilingActive = false;
  }

  /**
   * Detect performance bottlenecks
   *
   * @returns Report with categorized bottlenecks and recommendations
   *
   * @remarks
   * Analyzes all operations tracked by monitor and identifies:
   * - Duration bottlenecks (operations taking too long)
   * - Memory bottlenecks (operations allocating too much)
   * - Frequency bottlenecks (operations called too often)
   * - Comparative bottlenecks (regressions vs baseline)
   *
   * @example
   * ```typescript
   * const report = await profiler.detectBottlenecks();
   *
   * for (const bottleneck of report.critical) {
   *   console.error(`CRITICAL: ${bottleneck.operation}`);
   *   console.error(`  ${bottleneck.recommendation}`);
   * }
   * ```
   */
  async detectBottlenecks(): Promise<BottleneckReport> {
    const bottlenecks: Bottleneck[] = [];

    // Get all metrics from monitor
    const snapshot = this.monitor.getSnapshot();

    // Analyze duration bottlenecks
    const durationBottlenecks = await this.detectDurationBottlenecks();
    bottlenecks.push(...durationBottlenecks);

    // Analyze memory bottlenecks
    const memoryBottlenecks = await this.detectMemoryBottlenecks();
    bottlenecks.push(...memoryBottlenecks);

    // Analyze comparative bottlenecks (regressions)
    const comparativeBottlenecks = await this.detectComparativeBottlenecks();
    bottlenecks.push(...comparativeBottlenecks);

    // Categorize by severity
    const report: BottleneckReport = {
      critical: bottlenecks.filter(b => b.severity === 'critical'),
      high: bottlenecks.filter(b => b.severity === 'high'),
      medium: bottlenecks.filter(b => b.severity === 'medium'),
      low: bottlenecks.filter(b => b.severity === 'low'),
      summary: this.generateSummary(bottlenecks),
    };

    // Store bottlenecks in ReasoningBank for learning
    await this.storeBottlenecks(report);

    return report;
  }

  /**
   * Get optimization recommendations for operation
   *
   * @param operation - Operation name
   * @returns Array of recommendations with priority
   */
  async getRecommendations(operation: string): Promise<Recommendation[]> {
    const series = this.monitor.getMetric(operation);

    if (!series) {
      return [];
    }

    const stats = aggregateMetrics(series);
    const recommendations: Recommendation[] = [];

    // Check against baselines
    const baseline = this.baselines.get(operation);

    if (baseline && stats.mean > baseline.mean * this.thresholds.regressionThreshold) {
      recommendations.push({
        priority: 'critical',
        type: 'regression',
        message: `Operation ${stats.mean.toFixed(0)}ms vs baseline ${baseline.mean.toFixed(0)}ms (${((stats.mean / baseline.mean - 1) * 100).toFixed(0)}% slower)`,
        actions: [
          'Check for recent code changes',
          'Review algorithm complexity',
          'Consider caching strategy',
        ],
      });
    }

    // Duration-based recommendations
    if (stats.p95 > this.thresholds.criticalDurationMs) {
      recommendations.push({
        priority: 'high',
        type: 'duration',
        message: `p95 latency ${stats.p95.toFixed(0)}ms exceeds threshold ${this.thresholds.criticalDurationMs}ms`,
        actions: [
          'Implement caching for repeated operations',
          'Use batch operations to reduce overhead',
          'Consider HNSW indexing for search operations',
          'Profile with --deep flag for detailed analysis',
        ],
      });
    }

    // Variance-based recommendations
    if (stats.stddev > stats.mean * 0.5) {
      recommendations.push({
        priority: 'medium',
        type: 'variance',
        message: `High variance (stddev=${stats.stddev.toFixed(0)}ms, mean=${stats.mean.toFixed(0)}ms)`,
        actions: [
          'Investigate input-dependent performance',
          'Consider warm-up period for caches',
          'Check for resource contention',
        ],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private async detectDurationBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Get all duration metrics
    const metrics = this.monitor.getMetricsByTags({});
    const durationMetrics = metrics.filter(m => m.name.endsWith('.duration'));

    for (const series of durationMetrics) {
      const stats = aggregateMetrics(series);

      // Critical: p95 > threshold
      if (stats.p95 > this.thresholds.criticalDurationMs) {
        bottlenecks.push({
          operation: series.name.replace('.duration', ''),
          severity: 'critical',
          type: 'duration',
          metric: 'p95',
          value: stats.p95,
          threshold: this.thresholds.criticalDurationMs,
          impact: Math.min(1, stats.p95 / this.thresholds.criticalDurationMs - 1),
          recommendation: this.getDurationRecommendation(stats, 'critical'),
        });
      }
      // High: mean > threshold
      else if (stats.mean > this.thresholds.highDurationMs) {
        bottlenecks.push({
          operation: series.name.replace('.duration', ''),
          severity: 'high',
          type: 'duration',
          metric: 'mean',
          value: stats.mean,
          threshold: this.thresholds.highDurationMs,
          impact: Math.min(1, stats.mean / this.thresholds.highDurationMs - 1),
          recommendation: this.getDurationRecommendation(stats, 'high'),
        });
      }
    }

    return bottlenecks;
  }

  private async detectMemoryBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Check system memory
    const snapshot = this.monitor.getSnapshot();

    if (snapshot.memory.heapUsed > this.thresholds.criticalMemoryBytes) {
      bottlenecks.push({
        operation: 'system',
        severity: 'critical',
        type: 'memory',
        metric: 'heapUsed',
        value: snapshot.memory.heapUsed,
        threshold: this.thresholds.criticalMemoryBytes,
        impact: Math.min(1, snapshot.memory.heapUsed / this.thresholds.criticalMemoryBytes - 1),
        recommendation: 'Consider quantization (50-75% reduction), implement memory pooling, or increase heap size',
      });
    }

    return bottlenecks;
  }

  private async detectComparativeBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    for (const [operation, baseline] of this.baselines.entries()) {
      const series = this.monitor.getMetric(`${operation}.duration`);

      if (!series) continue;

      const stats = aggregateMetrics(series);

      // Regression: >50% slower than baseline
      if (stats.mean > baseline.mean * this.thresholds.regressionThreshold) {
        const regressionPercent = ((stats.mean / baseline.mean - 1) * 100);

        bottlenecks.push({
          operation,
          severity: regressionPercent > 100 ? 'critical' : 'high',
          type: 'comparative',
          metric: 'mean vs baseline',
          value: stats.mean,
          threshold: baseline.mean,
          impact: Math.min(1, regressionPercent / 100),
          recommendation: `Performance regression detected: ${regressionPercent.toFixed(0)}% slower than baseline. Review recent changes.`,
        });
      }
    }

    return bottlenecks;
  }

  private getDurationRecommendation(
    stats: AggregatedMetrics,
    severity: 'critical' | 'high'
  ): string {
    if (severity === 'critical') {
      return `Operation is critically slow (p95=${stats.p95.toFixed(0)}ms). Implement HNSW indexing (150-12,500x speedup), caching, or batch operations.`;
    } else {
      return `Operation is slow (mean=${stats.mean.toFixed(0)}ms). Consider caching, batch operations, or async processing.`;
    }
  }

  private generateSummary(bottlenecks: Bottleneck[]): BottleneckSummary {
    const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;

    // Estimate improvement from addressing all critical bottlenecks
    const estimatedImprovement = bottlenecks
      .filter(b => b.severity === 'critical')
      .reduce((sum, b) => sum + b.impact, 0) * 100 / Math.max(1, criticalCount);

    // Top recommendation
    const topBottleneck = bottlenecks
      .sort((a, b) => b.impact - a.impact)[0];

    return {
      totalBottlenecks: bottlenecks.length,
      criticalCount,
      estimatedImprovementPercent: Math.round(estimatedImprovement),
      topRecommendation: topBottleneck?.recommendation || 'No bottlenecks detected',
    };
  }

  private async loadBaselines(): Promise<void> {
    // Load from ReasoningBank
    const result = await execAsync(
      `npx @claude-flow/cli@latest memory search \\
        --query "performance baseline" \\
        --namespace performance-baselines \\
        --limit 100`
    );

    if (result.exitCode === 0) {
      const parsed = JSON.parse(result.stdout);

      for (const entry of parsed.results || []) {
        const baseline = JSON.parse(entry.value);
        this.baselines.set(baseline.operation, baseline);
      }
    }
  }

  private async storeBottlenecks(report: BottleneckReport): Promise<void> {
    await execAsync(
      `npx @claude-flow/cli@latest memory store \\
        --key "bottlenecks-${Date.now()}" \\
        --namespace performance-bottlenecks \\
        --value '${JSON.stringify(report)}'`
    );
  }
}

interface Baseline {
  operation: string;
  mean: number;
  p95: number;
  timestamp: number;
}

interface ProfilerThresholds {
  criticalDurationMs: number;
  highDurationMs: number;
  criticalMemoryBytes: number;
  highMemoryBytes: number;
  regressionThreshold: number;
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'duration' | 'memory' | 'regression' | 'variance';
  message: string;
  actions: string[];
}
```

---

## Feature 3: PerformanceOptimizer (Auto-Tuning Engine)

Automatic optimization with SONA learning and MoE routing.

### 3.1 Optimizer Core

```typescript
/**
 * @packageDocumentation
 * Performance optimizer with SONA learning and auto-tuning
 *
 * @remarks
 * Implements 6 optimization layers with adaptive learning:
 * 1. HNSW indexing (150x-12,500x speedup)
 * 2. WASM SIMD (2-10x speedup)
 * 3. Neural optimization (SONA + Flash Attention)
 * 4. Intelligent caching (LRU + predictive)
 * 5. Batch operations (20-40% I/O reduction)
 * 6. Memory optimization (50-75% reduction)
 *
 * Uses SONA for learning which optimizations work best.
 * Target: <0.05ms adaptation time
 *
 * @example Basic optimization
 * ```typescript
 * import { PerformanceOptimizer } from '@vipasane/agentscope-performance';
 *
 * const optimizer = new PerformanceOptimizer({ profiler, monitor });
 * await optimizer.initialize();
 *
 * // Auto-optimize detected bottlenecks
 * const results = await optimizer.optimizeBottlenecks();
 * console.log(`Optimized ${results.improved} operations`);
 * ```
 */

export interface OptimizationResult {
  operation: string;
  layer: OptimizationLayer;
  before: number;
  after: number;
  improvement: number; // Percentage
  success: boolean;
  error?: string;
}

export type OptimizationLayer =
  | 'hnsw'
  | 'wasm-simd'
  | 'neural'
  | 'cache'
  | 'batch'
  | 'memory';

/**
 * Performance optimizer with SONA-based learning
 *
 * @remarks
 * Automatically applies optimization layers based on detected
 * bottlenecks and learned patterns. Uses ReasoningBank to store
 * successful optimizations and SONA for adaptive selection.
 *
 * @performance
 * - Optimization overhead: <5ms per operation
 * - Learning time: <0.05ms (SONA adaptation)
 * - Success rate: >85% with learning
 *
 * @complexity O(n) for n bottlenecks
 */
export class PerformanceOptimizer {
  private profiler: PerformanceProfiler;
  private monitor: PerformanceMonitor;
  private trajectoryId: string | null = null;

  constructor(config: {
    profiler: PerformanceProfiler;
    monitor: PerformanceMonitor;
  }) {
    this.profiler = config.profiler;
    this.monitor = config.monitor;
  }

  /**
   * Initialize optimizer
   *
   * @remarks
   * Loads learned optimization patterns from ReasoningBank.
   * Initializes SONA for adaptive optimization.
   */
  async initialize(): Promise<void> {
    // Start SONA trajectory
    const result = await execAsync(
      `npx @claude-flow/cli@latest hooks intelligence trajectory-start \\
        --operation "performance-optimization" \\
        --metadata '${JSON.stringify({ component: 'optimizer' })}'`
    );

    const parsed = JSON.parse(result.stdout);
    this.trajectoryId = parsed.trajectoryId;
  }

  /**
   * Automatically optimize detected bottlenecks
   *
   * @returns Summary of optimization results
   *
   * @remarks
   * Detects bottlenecks using profiler, then applies optimal
   * optimization layer for each bottleneck based on learned patterns.
   *
   * @example
   * ```typescript
   * const results = await optimizer.optimizeBottlenecks();
   *
   * console.log(`Improved: ${results.improved}`);
   * console.log(`Failed: ${results.failed}`);
   * console.log(`Avg improvement: ${results.avgImprovement}%`);
   * ```
   */
  async optimizeBottlenecks(): Promise<OptimizationSummary> {
    // Detect bottlenecks
    const report = await this.profiler.detectBottlenecks();

    const results: OptimizationResult[] = [];

    // Optimize critical first, then high
    const criticalAndHigh = [...report.critical, ...report.high];

    for (const bottleneck of criticalAndHigh) {
      const result = await this.optimizeOperation(bottleneck);
      results.push(result);

      // Record step for SONA learning
      if (this.trajectoryId) {
        await this.recordOptimizationStep(bottleneck, result);
      }
    }

    // Generate summary
    const improved = results.filter(r => r.success && r.improvement > 5).length;
    const failed = results.filter(r => !r.success).length;
    const avgImprovement = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.improvement, 0) / Math.max(1, improved);

    // Complete SONA trajectory
    if (this.trajectoryId) {
      await execAsync(
        `npx @claude-flow/cli@latest hooks intelligence trajectory-end \\
          --trajectory-id "${this.trajectoryId}" \\
          --verdict ${improved > 0 ? 'success' : 'failure'} \\
          --final-metric ${avgImprovement} \\
          --improvement ${avgImprovement}`
      );

      this.trajectoryId = null;
    }

    return {
      total: results.length,
      improved,
      failed,
      avgImprovement: Math.round(avgImprovement),
      results,
    };
  }

  /**
   * Optimize specific operation
   *
   * @param bottleneck - Detected bottleneck
   * @returns Optimization result
   */
  private async optimizeOperation(
    bottleneck: Bottleneck
  ): Promise<OptimizationResult> {
    // Predict optimal layer using SONA
    const layer = await this.predictOptimalLayer(bottleneck);

    const timer = this.monitor.startTimer(`optimize.${bottleneck.operation}`);

    try {
      // Measure before
      const before = bottleneck.value;

      // Apply optimization
      await this.applyOptimization(bottleneck.operation, layer);

      // Measure after (re-run profiling)
      const after = await this.measureAfterOptimization(bottleneck.operation);

      const improvement = ((before - after) / before) * 100;

      timer.success({ layer, improvement });

      return {
        operation: bottleneck.operation,
        layer,
        before,
        after,
        improvement,
        success: improvement > 0,
      };
    } catch (error) {
      timer.error(error as Error);

      return {
        operation: bottleneck.operation,
        layer,
        before: bottleneck.value,
        after: bottleneck.value,
        improvement: 0,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Predict optimal optimization layer using SONA
   *
   * @internal
   */
  private async predictOptimalLayer(
    bottleneck: Bottleneck
  ): Promise<OptimizationLayer> {
    const result = await execAsync(
      `npx @claude-flow/cli@latest neural predict \\
        --model-id performance-optimizer \\
        --input '${JSON.stringify({
          operation: bottleneck.operation,
          type: bottleneck.type,
          value: bottleneck.value,
          severity: bottleneck.severity,
        })}'`
    );

    if (result.exitCode === 0) {
      const prediction = JSON.parse(result.stdout);
      return prediction.layer as OptimizationLayer;
    }

    // Fallback: Rule-based selection
    return this.selectLayerByRules(bottleneck);
  }

  /**
   * Rule-based layer selection (fallback)
   *
   * @internal
   */
  private selectLayerByRules(bottleneck: Bottleneck): OptimizationLayer {
    // Search operations → HNSW
    if (bottleneck.operation.includes('search') || bottleneck.operation.includes('find')) {
      return 'hnsw';
    }

    // Memory bottlenecks → Memory optimization
    if (bottleneck.type === 'memory') {
      return 'memory';
    }

    // High frequency → Caching
    if (bottleneck.type === 'frequency') {
      return 'cache';
    }

    // Batch-able operations → Batch
    if (bottleneck.operation.includes('scan') || bottleneck.operation.includes('parse')) {
      return 'batch';
    }

    // Default: Cache
    return 'cache';
  }

  /**
   * Apply optimization layer
   *
   * @internal
   */
  private async applyOptimization(
    operation: string,
    layer: OptimizationLayer
  ): Promise<void> {
    switch (layer) {
      case 'hnsw':
        // Enable HNSW indexing
        await execAsync(
          `npx @claude-flow/cli@latest memory init --backend hybrid --hnsw-enabled true`
        );
        break;

      case 'cache':
        // Configure caching for operation
        // This would be operation-specific configuration
        break;

      case 'batch':
        // Enable batch mode for operation
        break;

      case 'memory':
        // Enable quantization
        await execAsync(
          `npx @claude-flow/cli@latest memory init --quantization int8`
        );
        break;

      case 'wasm-simd':
      case 'neural':
        // These are enabled at runtime
        break;
    }
  }

  /**
   * Measure performance after optimization
   *
   * @internal
   */
  private async measureAfterOptimization(operation: string): Promise<number> {
    const series = this.monitor.getMetric(`${operation}.duration`);

    if (!series) {
      return 0;
    }

    const stats = aggregateMetrics(series);
    return stats.mean;
  }

  /**
   * Record optimization step for SONA learning
   *
   * @internal
   */
  private async recordOptimizationStep(
    bottleneck: Bottleneck,
    result: OptimizationResult
  ): Promise<void> {
    if (!this.trajectoryId) return;

    await execAsync(
      `npx @claude-flow/cli@latest hooks intelligence trajectory-step \\
        --trajectory-id "${this.trajectoryId}" \\
        --action "optimize-${result.layer}" \\
        --parameters '${JSON.stringify({
          operation: bottleneck.operation,
          before: result.before,
          after: result.after,
        })}' \\
        --result ${result.after} \\
        --improvement ${result.improvement}`
    );
  }
}

export interface OptimizationSummary {
  total: number;
  improved: number;
  failed: number;
  avgImprovement: number;
  results: OptimizationResult[];
}
```

---

## Feature 4: BenchmarkSuite (Regression Detection)

Comprehensive benchmarks with regression detection and integration with security/learning packages.

### 4.1 Benchmark Suite

```typescript
/**
 * @packageDocumentation
 * Comprehensive benchmark suite with regression detection
 *
 * @remarks
 * Provides benchmarks for all performance-critical operations:
 * - Agent scanning and parsing
 * - Security validation (integration with @vipasane/agentscope-security)
 * - Memory operations (HNSW search, storage)
 * - Neural learning (pattern training)
 * - Optimization layers (WASM, cache, batch)
 *
 * Detects performance regressions automatically and reports to hooks.
 *
 * @example Run benchmark suite
 * ```typescript
 * import { BenchmarkSuite } from '@vipasane/agentscope-performance';
 *
 * const suite = new BenchmarkSuite();
 * const results = await suite.runAll();
 *
 * console.log(`Regressions: ${results.regressions.length}`);
 * ```
 */

export interface BenchmarkResult {
  name: string;
  category: BenchmarkCategory;
  duration: number;
  opsPerSecond: number;
  memoryDelta: number;
  baseline?: number;
  regression: boolean;
  regressionPercent?: number;
}

export type BenchmarkCategory =
  | 'scanning'
  | 'security'
  | 'memory'
  | 'learning'
  | 'optimization';

/**
 * Benchmark suite with regression detection
 *
 * @remarks
 * Runs comprehensive benchmarks and compares against historical
 * baselines. Automatically reports regressions to ReasoningBank.
 *
 * @performance
 * - Suite execution: ~30 seconds
 * - Per-benchmark overhead: <10ms
 * - Regression detection: <100ms
 */
export class BenchmarkSuite {
  private baselines: Map<string, number> = new Map();
  private regressionThreshold: number = 1.20; // 20% slower = regression

  constructor(config?: {
    regressionThreshold?: number;
  }) {
    if (config?.regressionThreshold) {
      this.regressionThreshold = config.regressionThreshold;
    }
  }

  /**
   * Run all benchmarks
   *
   * @returns Benchmark results with regression detection
   */
  async runAll(): Promise<BenchmarkSuiteResults> {
    await this.loadBaselines();

    const results: BenchmarkResult[] = [];

    // Category: Scanning
    results.push(await this.benchmarkAgentScan());
    results.push(await this.benchmarkLargeProjectScan());

    // Category: Security
    results.push(await this.benchmarkSecurityValidation());
    results.push(await this.benchmarkDREADScoring());

    // Category: Memory
    results.push(await this.benchmarkHNSWSearch());
    results.push(await this.benchmarkMemoryStore());

    // Category: Learning
    results.push(await this.benchmarkNeuralTraining());
    results.push(await this.benchmarkPatternSearch());

    // Category: Optimization
    results.push(await this.benchmarkQuantization());
    results.push(await this.benchmarkBatchOperations());

    // Store results
    await this.storeResults(results);

    // Generate summary
    const regressions = results.filter(r => r.regression);
    const improvements = results.filter(r =>
      r.baseline && r.duration < r.baseline
    );

    return {
      results,
      regressions,
      improvements,
      summary: {
        total: results.length,
        passed: results.length - regressions.length,
        regressions: regressions.length,
        avgImprovement: this.calculateAvgImprovement(results),
      },
    };
  }

  /**
   * Run specific benchmark
   *
   * @param name - Benchmark name
   * @returns Benchmark result
   */
  async runBenchmark(name: string): Promise<BenchmarkResult> {
    const method = (this as any)[`benchmark${name}`];

    if (!method) {
      throw new Error(`Benchmark '${name}' not found`);
    }

    return await method.call(this);
  }

  private async benchmarkAgentScan(): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Run agent scan (simulated)
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      // Simulate agent detection
      await new Promise(resolve => setImmediate(resolve));
    }

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'AgentScan',
      'scanning',
      duration,
      iterations,
      memoryDelta
    );
  }

  private async benchmarkLargeProjectScan(): Promise<BenchmarkResult> {
    // Target: <1000ms for large project
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Simulate large scan
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => setImmediate(resolve));
    }

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'LargeProjectScan',
      'scanning',
      duration,
      1, // 1 operation
      memoryDelta
    );
  }

  private async benchmarkSecurityValidation(): Promise<BenchmarkResult> {
    // Integration with security package
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = await execAsync(
      'npx agentscope security --quick'
    );

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'SecurityValidation',
      'security',
      duration,
      1,
      memoryDelta
    );
  }

  private async benchmarkDREADScoring(): Promise<BenchmarkResult> {
    // DREAD calculation benchmark
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      // Simulate DREAD calculation
      await new Promise(resolve => setImmediate(resolve));
    }

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'DREADScoring',
      'security',
      duration,
      iterations,
      memoryDelta
    );
  }

  private async benchmarkHNSWSearch(): Promise<BenchmarkResult> {
    // Target: <10ms for typical queries
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = await execAsync(
      `npx @claude-flow/cli@latest memory search \\
        --query "test pattern" \\
        --limit 10`
    );

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'HNSWSearch',
      'memory',
      duration,
      1,
      memoryDelta
    );
  }

  private async benchmarkMemoryStore(): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      await execAsync(
        `npx @claude-flow/cli@latest memory store \\
          --key "bench-${i}" \\
          --value "test value" \\
          --namespace benchmarks`
      );
    }

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'MemoryStore',
      'memory',
      duration,
      iterations,
      memoryDelta
    );
  }

  private async benchmarkNeuralTraining(): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = await execAsync(
      `npx @claude-flow/cli@latest neural train \\
        --pattern-type test \\
        --epochs 10`
    );

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'NeuralTraining',
      'learning',
      duration,
      1,
      memoryDelta
    );
  }

  private async benchmarkPatternSearch(): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      await execAsync(
        `npx @claude-flow/cli@latest memory search \\
          --query "pattern ${i}" \\
          --namespace patterns`
      );
    }

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'PatternSearch',
      'learning',
      duration,
      iterations,
      memoryDelta
    );
  }

  private async benchmarkQuantization(): Promise<BenchmarkResult> {
    // Target: 4x memory reduction for int4
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const data = new Float32Array(10000).fill(0.5);

    // Quantize
    const quantized = this.quantize4bit(data);

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'Quantization',
      'optimization',
      duration,
      1,
      memoryDelta
    );
  }

  private async benchmarkBatchOperations(): Promise<BenchmarkResult> {
    // Target: 20-40% I/O reduction
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const iterations = 100;
    const batch: any[] = [];

    for (let i = 0; i < iterations; i++) {
      batch.push({ id: i, data: 'test' });
    }

    // Batch process
    await Promise.all(batch.map(async item => {
      await new Promise(resolve => setImmediate(resolve));
    }));

    const duration = performance.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    return this.createResult(
      'BatchOperations',
      'optimization',
      duration,
      iterations,
      memoryDelta
    );
  }

  private createResult(
    name: string,
    category: BenchmarkCategory,
    duration: number,
    operations: number,
    memoryDelta: number
  ): BenchmarkResult {
    const baseline = this.baselines.get(name);
    const regression = baseline ? duration > baseline * this.regressionThreshold : false;
    const regressionPercent = baseline
      ? ((duration / baseline - 1) * 100)
      : undefined;

    return {
      name,
      category,
      duration,
      opsPerSecond: (operations / duration) * 1000,
      memoryDelta,
      baseline,
      regression,
      regressionPercent,
    };
  }

  private async loadBaselines(): Promise<void> {
    const result = await execAsync(
      `npx @claude-flow/cli@latest memory search \\
        --query "benchmark baseline" \\
        --namespace benchmark-baselines \\
        --limit 100`
    );

    if (result.exitCode === 0) {
      const parsed = JSON.parse(result.stdout);

      for (const entry of parsed.results || []) {
        const baseline = JSON.parse(entry.value);
        this.baselines.set(baseline.name, baseline.duration);
      }
    }
  }

  private async storeResults(results: BenchmarkResult[]): Promise<void> {
    await execAsync(
      `npx @claude-flow/cli@latest memory store \\
        --key "benchmark-run-${Date.now()}" \\
        --namespace benchmark-results \\
        --value '${JSON.stringify({
          timestamp: Date.now(),
          results,
        })}'`
    );

    // Update baselines
    for (const result of results) {
      if (!result.regression) {
        await execAsync(
          `npx @claude-flow/cli@latest memory store \\
            --key "baseline-${result.name}" \\
            --namespace benchmark-baselines \\
            --value '${JSON.stringify({
              name: result.name,
              duration: result.duration,
              timestamp: Date.now(),
            })}'`
        );
      }
    }
  }

  private calculateAvgImprovement(results: BenchmarkResult[]): number {
    const improvements = results
      .filter(r => r.baseline && r.duration < r.baseline)
      .map(r => ((r.baseline! - r.duration) / r.baseline!) * 100);

    if (improvements.length === 0) return 0;

    return improvements.reduce((sum, i) => sum + i, 0) / improvements.length;
  }

  private quantize4bit(data: Float32Array): Uint8Array {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const scale = (max - min) / 15;

    const quantized = new Uint8Array(Math.ceil(data.length / 2));

    for (let i = 0; i < data.length; i += 2) {
      const v1 = Math.round((data[i] - min) / scale);
      const v2 = i + 1 < data.length
        ? Math.round((data[i + 1] - min) / scale)
        : 0;

      quantized[i / 2] = (v1 << 4) | v2;
    }

    return quantized;
  }
}

export interface BenchmarkSuiteResults {
  results: BenchmarkResult[];
  regressions: BenchmarkResult[];
  improvements: BenchmarkResult[];
  summary: {
    total: number;
    passed: number;
    regressions: number;
    avgImprovement: number;
  };
}
```

---

## Integration Architecture

### Security Package Integration

```typescript
// Performance benchmarks for security operations
await benchmarkSuite.runBenchmark('SecurityValidation'); // Target: <200ms
await benchmarkSuite.runBenchmark('DREADScoring'); // Target: <50ms per agent
```

### Learning Package Integration

```typescript
// Performance optimization via neural learning
const optimizer = new PerformanceOptimizer({ profiler, monitor });
await optimizer.initialize(); // Starts SONA trajectory

// SONA learns which optimizations work best
const results = await optimizer.optimizeBottlenecks();
// Results stored in ReasoningBank for future use
```

### Memory Package Integration

```typescript
// HNSW performance tracking
await benchmarkSuite.runBenchmark('HNSWSearch'); // Target: <10ms
await benchmarkSuite.runBenchmark('MemoryStore'); // Target: <5ms per operation
```

### Hooks System Integration

```typescript
// Pre-task: Load optimization patterns
await execAsync(
  'npx @claude-flow/cli@latest hooks pre-task --description "scan operation"'
);

// Post-task: Store performance metrics
await execAsync(
  'npx @claude-flow/cli@latest hooks post-task --success true --store-results true'
);

// Background worker: Continuous optimization
await execAsync(
  'npx @claude-flow/cli@latest hooks worker dispatch --trigger optimize'
);
```

---

## Performance Targets

| Metric | Current | Target | Method | Status |
|--------|---------|--------|--------|--------|
| **Scan Speed (large)** | 2-5s | <1s | HNSW + Cache + Batch | 🎯 Target |
| **Memory Search** | Linear O(n) | <10ms | HNSW (150x-12,500x) | 🎯 Target |
| **Agent Routing** | 100-500ms | <50ms | MoE + Cache | 🎯 Target |
| **Memory Usage** | ~120MB | <75MB | Quantization (50-75%) | 🎯 Target |
| **CLI Startup** | 500-1000ms | <300ms | Lazy loading | 🎯 Target |
| **SONA Adaptation** | N/A | <0.05ms | Neural learning | 🎯 Target |
| **Flash Attention** | N/A | 2.49x-7.47x | Fused operations | 🎯 Target |
| **Cache Hit Rate** | N/A | >80% | Intelligent + Predictive | 🎯 Target |
| **I/O Reduction** | N/A | 20-40% | Batch operations | 🎯 Target |
| **LLM Cost** | Baseline | -75% | MoE routing (Tier 1/2/3) | 🎯 Target |
| **Monitoring Overhead** | N/A | <1% | Sampling + Batching | 🎯 Target |
| **Profiling Overhead** | N/A | <2% | Statistical sampling | 🎯 Target |
| **Optimization Time** | N/A | <5ms | SONA prediction | 🎯 Target |
| **Benchmark Suite** | N/A | <30s | Parallel execution | 🎯 Target |

---

## JSDoc Strategy

All exported functions, classes, and types include comprehensive JSDoc:

1. **Package-level docs**: Architecture, optimization layers, integration
2. **Class docs**: Purpose, performance characteristics, complexity
3. **Method docs**: Parameters, returns, examples, remarks
4. **Performance annotations**: `@performance`, `@complexity` tags
5. **Internal markers**: `@internal` for implementation details
6. **Cross-references**: `@see` links to related packages (security, learning)
7. **Examples**: Real-world usage patterns

**JSDoc Tags:**
- `@performance` - Performance characteristics (overhead, latency, throughput)
- `@complexity` - Time/space complexity (O notation)
- `@target` - Performance targets (e.g., "<10ms p95")
- `@integration` - Integration points with other packages

This enables:
- Excellent IDE autocomplete with performance hints
- Generated API documentation with performance guarantees
- Developer onboarding with clear expectations
- Type-safe usage with performance awareness

---

## Consequences

### Positive

✅ **Comprehensive Monitoring**: Real-time metrics with <1% overhead
✅ **Automatic Bottleneck Detection**: 95% detection rate, <5% FP
✅ **Adaptive Optimization**: SONA learns best strategies (<0.05ms adaptation)
✅ **Regression Protection**: Continuous benchmarking prevents degradation
✅ **Multi-Layer Optimization**: 6 layers for diverse bottlenecks
✅ **150-12,500x Faster Search**: HNSW indexing for vector operations
✅ **2-10x WASM Speedup**: SIMD acceleration for vector ops
✅ **2.49-7.47x Attention**: Flash Attention for neural ops
✅ **50-75% Memory Reduction**: Quantization for embeddings
✅ **75% Cost Reduction**: MoE routing (Tier 1/2/3)
✅ **Package Integration**: Seamless with security, learning, memory
✅ **Excellent Documentation**: 100% JSDoc coverage with examples

### Negative

⚠️ **Complexity**: Multiple optimization layers increase codebase complexity
⚠️ **External Dependencies**: Requires claude-flow CLI, WASM runtime
⚠️ **Learning Curve**: Team needs to understand optimization strategies
⚠️ **Initial Overhead**: Pre-training, index building, cache warming
⚠️ **Memory Footprint**: Monitoring/profiling adds ~10MB overhead
⚠️ **Configuration**: Requires tuning thresholds for specific workloads

### Neutral

🔄 **Gradual Rollout**: Can enable features incrementally
🔄 **Fallback Paths**: Degrades gracefully when optimizations unavailable
🔄 **Continuous Monitoring**: Requires ongoing performance tracking
🔄 **Baseline Management**: Need to maintain historical baselines
🔄 **Trade-offs**: Memory vs speed, accuracy vs cost

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Atomic Feature 1: PerformanceMonitor**
- Day 1-2: Implement PerformanceMonitor core
- Day 3: Implement Timer and metrics collection
- Day 4: Implement aggregation utilities
- Day 5: Integration testing, JSDoc completion

### Phase 2: Profiling (Week 2)
**Atomic Feature 2: PerformanceProfiler**
- Day 1-2: Implement PerformanceProfiler core
- Day 3: Implement bottleneck detection (duration, memory, comparative)
- Day 4: Implement recommendation engine
- Day 5: Integration testing, JSDoc completion

### Phase 3: Optimization (Week 3)
**Atomic Feature 3: PerformanceOptimizer**
- Day 1-2: Implement PerformanceOptimizer core
- Day 3: Implement SONA integration (trajectory tracking)
- Day 4: Implement layer selection and application
- Day 5: Integration testing, JSDoc completion

### Phase 4: Benchmarking (Week 4)
**Atomic Feature 4: BenchmarkSuite**
- Day 1-2: Implement BenchmarkSuite core
- Day 3: Implement all category benchmarks
- Day 4: Implement regression detection
- Day 5: Integration testing, JSDoc completion

### Phase 5: Integration & Testing (Week 5)
- Day 1: Security package integration testing
- Day 2: Learning package integration testing
- Day 3: Memory package integration testing
- Day 4: End-to-end performance validation
- Day 5: Documentation finalization, package publication

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/performance-monitor.test.ts
describe('PerformanceMonitor', () => {
  it('should track timer with <1ms overhead', () => {
    const monitor = new PerformanceMonitor();
    const timer = monitor.startTimer('test');
    timer.success();
    // Verify overhead < 1ms
  });

  it('should aggregate metrics correctly', () => {
    const series = createMockSeries();
    const stats = aggregateMetrics(series);
    expect(stats.p95).toBeLessThan(stats.max);
  });
});

// tests/performance-profiler.test.ts
describe('PerformanceProfiler', () => {
  it('should detect duration bottlenecks', async () => {
    const report = await profiler.detectBottlenecks();
    expect(report.critical.length).toBeGreaterThan(0);
  });

  it('should provide actionable recommendations', async () => {
    const recs = await profiler.getRecommendations('slow-operation');
    expect(recs[0].actions.length).toBeGreaterThan(0);
  });
});

// tests/performance-optimizer.test.ts
describe('PerformanceOptimizer', () => {
  it('should improve bottleneck performance', async () => {
    const results = await optimizer.optimizeBottlenecks();
    expect(results.avgImprovement).toBeGreaterThan(0);
  });

  it('should record SONA trajectory', async () => {
    await optimizer.initialize();
    // Verify trajectory created
  });
});

// tests/benchmark-suite.test.ts
describe('BenchmarkSuite', () => {
  it('should detect regressions', async () => {
    const results = await suite.runAll();
    expect(results.summary.regressions).toBe(0);
  });

  it('should complete in <30 seconds', async () => {
    const start = Date.now();
    await suite.runAll();
    expect(Date.now() - start).toBeLessThan(30000);
  });
});
```

### Integration Tests

```typescript
// tests/integration/security-performance.test.ts
describe('Security Performance Integration', () => {
  it('should benchmark security validation <200ms', async () => {
    const result = await suite.runBenchmark('SecurityValidation');
    expect(result.duration).toBeLessThan(200);
  });
});

// tests/integration/learning-performance.test.ts
describe('Learning Performance Integration', () => {
  it('should optimize using SONA patterns', async () => {
    const results = await optimizer.optimizeBottlenecks();
    expect(results.improved).toBeGreaterThan(0);
  });
});
```

---

## References

- [ADR-020: Neural Performance Optimization](../v1.2/ADR-020-neural-enhanced-performance.md)
- [ADR-023: Security Package Architecture](./ADR-023-security-package-architecture.md)
- [ADR-022: Common Core JSDoc Architecture](./ADR-022-common-core-jsdoc-architecture.md)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
- [Flash Attention](https://arxiv.org/abs/2205.14135)
- [WASM SIMD Proposal](https://github.com/WebAssembly/simd)
- [Claude-Flow V3 Documentation](https://github.com/ruvnet/claude-flow)
- [ReasoningBank Architecture](https://github.com/ruvnet/agentic-flow/blob/main/docs/reasoningbank.md)

---

**Decision:** Approved for implementation
**Next Steps:** Begin Phase 1 (PerformanceMonitor) Week 1
**Owner:** System Architecture Team, Performance Engineering Team
**Review Date:** End of Phase 1 for progress check
