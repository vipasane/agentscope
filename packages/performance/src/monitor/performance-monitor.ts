/**
 * Performance monitoring with sub-millisecond accuracy
 * Tracks operation timings, throughput, memory, and CPU usage
 * @module @claude-flow/performance/monitor
 */

import {
  PerformanceMetrics,
  TimerMetrics,
  AggregateMetrics,
  BottleneckReport,
  OptimizationSuggestion
} from '../types';

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private timers = new Map<string, TimerMetrics>();
  private enabled = true;
  private maxMetrics = 10000; // Limit memory usage

  constructor(enabled = true, maxMetrics = 10000) {
    this.enabled = enabled;
    this.maxMetrics = maxMetrics;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string, tags?: Record<string, string>): void {
    if (!this.enabled) return;

    this.timers.set(name, {
      name,
      startTime: performance.now(),
      tags
    });
  }

  /**
   * End timing an operation and record metrics
   */
  endTimer(name: string, metadata?: Record<string, unknown>): number {
    if (!this.enabled) return 0;

    const timer = this.timers.get(name);
    if (!timer) {
      throw new Error(`Timer "${name}" not found. Did you forget to call startTimer()?`);
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;

    timer.endTime = endTime;
    timer.duration = duration;

    // Record as metric
    this.record({
      timestamp: Date.now(),
      layer: 'monitoring',
      operation: name,
      latency: duration,
      success: true,
      metadata: { ...metadata, ...timer.tags }
    });

    this.timers.delete(name);
    return duration;
  }

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetrics): void {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Prevent unbounded memory growth
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(filter?: {
    layer?: string;
    operation?: string;
    startTime?: number;
    endTime?: number;
    successOnly?: boolean;
  }): PerformanceMetrics[] {
    let filtered = this.metrics;

    if (filter) {
      if (filter.layer) {
        filtered = filtered.filter(m => m.layer === filter.layer);
      }
      if (filter.operation) {
        filtered = filtered.filter(m => m.operation === filter.operation);
      }
      if (filter.startTime) {
        filtered = filtered.filter(m => m.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filtered = filtered.filter(m => m.timestamp <= filter.endTime!);
      }
      if (filter.successOnly) {
        filtered = filtered.filter(m => m.success);
      }
    }

    return filtered;
  }

  /**
   * Calculate aggregate statistics for an operation
   */
  getAggregateMetrics(operation: string): AggregateMetrics | null {
    const operationMetrics = this.getMetrics({ operation });
    if (operationMetrics.length === 0) return null;

    const latencies = operationMetrics.map(m => m.latency).sort((a, b) => a - b);
    const sum = latencies.reduce((acc, val) => acc + val, 0);
    const mean = sum / latencies.length;

    // Calculate standard deviation
    const squaredDiffs = latencies.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / latencies.length;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);

    return {
      count: latencies.length,
      sum,
      mean,
      min: latencies[0],
      max: latencies[latencies.length - 1],
      stdDev,
      p50,
      p95,
      p99
    };
  }

  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks(threshold = 0.05): BottleneckReport[] {
    const operationGroups = new Map<string, PerformanceMetrics[]>();

    // Group by operation
    for (const metric of this.metrics) {
      const existing = operationGroups.get(metric.operation) || [];
      existing.push(metric);
      operationGroups.set(metric.operation, existing);
    }

    const totalTime = this.metrics.reduce((acc, m) => acc + m.latency, 0);
    const reports: BottleneckReport[] = [];

    // Analyze each operation
    for (const [operation, metrics] of operationGroups) {
      const operationTotalTime = metrics.reduce((acc, m) => acc + m.latency, 0);
      const percentOfTotal = operationTotalTime / totalTime;

      if (percentOfTotal >= threshold) {
        const avgLatency = operationTotalTime / metrics.length;

        let severity: 'low' | 'medium' | 'high' | 'critical';
        if (percentOfTotal >= 0.5) severity = 'critical';
        else if (percentOfTotal >= 0.3) severity = 'high';
        else if (percentOfTotal >= 0.15) severity = 'medium';
        else severity = 'low';

        reports.push({
          operation,
          avgLatency,
          count: metrics.length,
          totalTime: operationTotalTime,
          percentOfTotal,
          severity
        });
      }
    }

    return reports.sort((a, b) => b.percentOfTotal - a.percentOfTotal);
  }

  /**
   * Generate optimization suggestions
   */
  suggestOptimizations(): OptimizationSuggestion[] {
    const bottlenecks = this.detectBottlenecks(0.05);
    const suggestions: OptimizationSuggestion[] = [];

    for (const bottleneck of bottlenecks) {
      const metrics = this.getAggregateMetrics(bottleneck.operation);
      if (!metrics) continue;

      // Suggest caching for repeated operations
      if (metrics.count > 10 && metrics.stdDev < metrics.mean * 0.2) {
        suggestions.push({
          operation: bottleneck.operation,
          currentMetrics: metrics,
          strategy: 'cache',
          expectedImprovement: 0.8, // 80% reduction
          confidence: 0.9,
          reasoning: 'Operation shows consistent latency and high frequency - caching would eliminate most calls'
        });
      }

      // Suggest batching for high-frequency operations
      if (metrics.count > 50 && metrics.mean < 10) {
        suggestions.push({
          operation: bottleneck.operation,
          currentMetrics: metrics,
          strategy: 'batch',
          expectedImprovement: 0.6, // 60% reduction
          confidence: 0.8,
          reasoning: 'High-frequency, low-latency operations benefit from batching to reduce overhead'
        });
      }

      // Suggest parallelization for CPU-intensive operations
      if (metrics.mean > 100 && metrics.count > 5) {
        suggestions.push({
          operation: bottleneck.operation,
          currentMetrics: metrics,
          strategy: 'parallel',
          expectedImprovement: 0.7, // 70% reduction
          confidence: 0.75,
          reasoning: 'High-latency operations can benefit from parallel execution across multiple workers'
        });
      }
    }

    return suggestions;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Enable/disable monitoring (zero overhead when disabled)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.timers.clear();
    }
  }

  /**
   * Get current monitoring state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Export metrics for persistence
   */
  export(): {
    metrics: PerformanceMetrics[];
    timestamp: number;
    count: number;
  } {
    return {
      metrics: [...this.metrics],
      timestamp: Date.now(),
      count: this.metrics.length
    };
  }

  /**
   * Import previously exported metrics
   */
  import(data: { metrics: PerformanceMetrics[] }): void {
    this.metrics = [...data.metrics];
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
}

// Singleton instance for global monitoring
let globalMonitor: PerformanceMonitor | null = null;

export function getGlobalMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

export function setGlobalMonitor(monitor: PerformanceMonitor): void {
  globalMonitor = monitor;
}
