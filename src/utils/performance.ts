/**
 * Performance measurement utilities for AgentScope
 *
 * Performance Targets (from PRD):
 * - Scan completion: <5 seconds for configs with <50 components
 * - Memory usage: <100MB for typical projects
 * - Diagram generation: <1 second per diagram
 */

import type { PerformanceMetrics, BenchmarkResult, CacheStats } from '../model/types.js';

/**
 * Performance targets from PRD
 */
export const PERFORMANCE_TARGETS = {
  // Scan should complete in <5s for <50 components
  SCAN_MAX_MS: 5000,
  SCAN_MAX_COMPONENTS: 50,

  // Scan should complete in <3s for v1.1 (post-MVP optimization)
  SCAN_OPTIMIZED_MAX_MS: 3000,

  // Memory usage should be <100MB for typical projects
  MEMORY_MAX_BYTES: 100 * 1024 * 1024, // 100MB

  // Diagram generation should be <1s per diagram
  DIAGRAM_MAX_MS: 1000,

  // Component thresholds
  LARGE_PROJECT_COMPONENTS: 100,
  TYPICAL_PROJECT_COMPONENTS: 50,
  SMALL_PROJECT_COMPONENTS: 10,
} as const;

/**
 * Measures execution time and memory usage of an async function
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = await fn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  const metrics: PerformanceMetrics = {
    operation,
    startTime,
    endTime,
    durationMs: endTime - startTime,
    memoryUsedBytes: endMemory,
    memoryDeltaBytes: endMemory - startMemory,
  };

  return { result, metrics };
}

/**
 * Measures execution time and memory usage of a sync function
 */
export function measurePerformanceSync<T>(
  operation: string,
  fn: () => T
): { result: T; metrics: PerformanceMetrics } {
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = fn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  const metrics: PerformanceMetrics = {
    operation,
    startTime,
    endTime,
    durationMs: endTime - startTime,
    memoryUsedBytes: endMemory,
    memoryDeltaBytes: endMemory - startMemory,
  };

  return { result, metrics };
}

/**
 * Runs a function multiple times and collects performance metrics
 */
export async function benchmark<T>(
  name: string,
  fn: () => Promise<T>,
  options: {
    iterations?: number;
    warmupIterations?: number;
    targetMaxMs?: number;
  } = {}
): Promise<BenchmarkResult> {
  const {
    iterations = 100,
    warmupIterations = 10,
    targetMaxMs = PERFORMANCE_TARGETS.SCAN_MAX_MS,
  } = options;

  // Warmup runs (not counted in metrics)
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Actual benchmark runs
  const metrics: PerformanceMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    const { metrics: runMetrics } = await measurePerformance(`${name}-run-${i}`, fn);
    metrics.push(runMetrics);
  }

  const durations = metrics.map(m => m.durationMs).sort((a, b) => a - b);

  const summary = {
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
    medianMs: durations[Math.floor(durations.length / 2)],
    p95Ms: durations[Math.floor(durations.length * 0.95)],
    p99Ms: durations[Math.floor(durations.length * 0.99)],
    stdDevMs: calculateStdDev(durations),
    iterations,
  };

  return {
    name,
    metrics,
    summary,
    target: {
      maxMs: targetMaxMs,
      passed: summary.p95Ms <= targetMaxMs,
    },
  };
}

/**
 * Runs a sync function multiple times and collects performance metrics
 */
export function benchmarkSync<T>(
  name: string,
  fn: () => T,
  options: {
    iterations?: number;
    warmupIterations?: number;
    targetMaxMs?: number;
  } = {}
): BenchmarkResult {
  const {
    iterations = 100,
    warmupIterations = 10,
    targetMaxMs = PERFORMANCE_TARGETS.SCAN_MAX_MS,
  } = options;

  // Warmup runs
  for (let i = 0; i < warmupIterations; i++) {
    fn();
  }

  // Actual benchmark runs
  const metrics: PerformanceMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    const { metrics: runMetrics } = measurePerformanceSync(`${name}-run-${i}`, fn);
    metrics.push(runMetrics);
  }

  const durations = metrics.map(m => m.durationMs).sort((a, b) => a - b);

  const summary = {
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
    medianMs: durations[Math.floor(durations.length / 2)],
    p95Ms: durations[Math.floor(durations.length * 0.95)],
    p99Ms: durations[Math.floor(durations.length * 0.99)],
    stdDevMs: calculateStdDev(durations),
    iterations,
  };

  return {
    name,
    metrics,
    summary,
    target: {
      maxMs: targetMaxMs,
      passed: summary.p95Ms <= targetMaxMs,
    },
  };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Get current memory usage in a human-readable format
 */
export function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedMB: string;
  heapTotalMB: string;
  rssMB: string;
} {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
    heapUsedMB: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotalMB: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    rssMB: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
  };
}

/**
 * Check if memory usage is within targets
 */
export function checkMemoryUsage(): {
  withinTarget: boolean;
  currentBytes: number;
  targetBytes: number;
  usagePercent: number;
} {
  const currentBytes = process.memoryUsage().heapUsed;
  const targetBytes = PERFORMANCE_TARGETS.MEMORY_MAX_BYTES;

  return {
    withinTarget: currentBytes <= targetBytes,
    currentBytes,
    targetBytes,
    usagePercent: (currentBytes / targetBytes) * 100,
  };
}

/**
 * Format benchmark results as a markdown table
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const lines: string[] = [
    '| Benchmark | Min (ms) | Max (ms) | Avg (ms) | P95 (ms) | P99 (ms) | Target (ms) | Status |',
    '|-----------|----------|----------|----------|----------|----------|-------------|--------|',
  ];

  for (const result of results) {
    const status = result.target.passed ? 'PASS' : 'FAIL';
    lines.push(
      `| ${result.name} | ${result.summary.minMs.toFixed(2)} | ${result.summary.maxMs.toFixed(2)} | ${result.summary.avgMs.toFixed(2)} | ${result.summary.p95Ms.toFixed(2)} | ${result.summary.p99Ms.toFixed(2)} | ${result.target.maxMs} | ${status} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format memory usage as a markdown table
 */
export function formatMemoryReport(snapshots: Array<{ label: string; bytes: number }>): string {
  const lines: string[] = [
    '| Checkpoint | Memory (MB) | Delta (MB) | Status |',
    '|------------|-------------|------------|--------|',
  ];

  let previousBytes = 0;

  for (const snapshot of snapshots) {
    const mb = (snapshot.bytes / 1024 / 1024).toFixed(2);
    const deltaMb = ((snapshot.bytes - previousBytes) / 1024 / 1024).toFixed(2);
    const status = snapshot.bytes <= PERFORMANCE_TARGETS.MEMORY_MAX_BYTES ? 'OK' : 'WARN';

    lines.push(`| ${snapshot.label} | ${mb} | ${previousBytes === 0 ? '-' : deltaMb} | ${status} |`);
    previousBytes = snapshot.bytes;
  }

  return lines.join('\n');
}

/**
 * Simple LRU cache with performance tracking
 */
export class PerformanceCache<K, V> {
  private cache = new Map<K, V>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    evictions: 0,
  };

  constructor(private maxSize: number = 1000) {
    this.stats.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      this.stats.misses++;
    }
    this.updateHitRate();
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }
    this.cache.set(key, value);
    this.stats.size = this.cache.size;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Timer utility for tracking operation durations
 */
export class Timer {
  private startTime: number = 0;
  private endTime: number = 0;
  private laps: Array<{ label: string; time: number }> = [];

  start(): void {
    this.startTime = performance.now();
    this.laps = [];
  }

  lap(label: string): number {
    const time = performance.now();
    this.laps.push({ label, time });
    return time - this.startTime;
  }

  stop(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  getDuration(): number {
    return (this.endTime || performance.now()) - this.startTime;
  }

  getLaps(): Array<{ label: string; elapsed: number; delta: number }> {
    let previousTime = this.startTime;
    return this.laps.map(lap => {
      const result = {
        label: lap.label,
        elapsed: lap.time - this.startTime,
        delta: lap.time - previousTime,
      };
      previousTime = lap.time;
      return result;
    });
  }

  format(): string {
    const laps = this.getLaps();
    return laps
      .map(l => `${l.label}: ${l.elapsed.toFixed(2)}ms (+${l.delta.toFixed(2)}ms)`)
      .join('\n');
  }
}
