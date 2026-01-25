/**
 * Performance Profiler for V1.2
 *
 * Identifies bottlenecks through:
 * - CPU profiling
 * - Memory profiling
 * - Hot path detection
 * - Call stack analysis
 * - I/O operation tracking
 */

import { performance, PerformanceObserver } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface ProfileEntry {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryDelta: number;
  count: number;
}

interface HotPath {
  operation: string;
  totalTime: number;
  count: number;
  avgTime: number;
  percentOfTotal: number;
}

/**
 * Profiler class for tracking performance metrics
 */
export class Profiler {
  private entries = new Map<string, ProfileEntry[]>();
  private observer: PerformanceObserver | null = null;
  private startMemory = 0;
  private totalDuration = 0;

  /**
   * Start profiling session
   */
  start(): void {
    this.entries.clear();
    this.startMemory = process.memoryUsage().heapUsed;

    // Set up performance observer
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordEntry(entry.name, entry.duration, entry.startTime);
      }
    });

    this.observer.observe({ entryTypes: ['measure'] });
  }

  /**
   * Stop profiling session
   */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Mark the start of an operation
   */
  markStart(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * Mark the end of an operation and measure duration
   */
  markEnd(name: string): void {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }

  /**
   * Record a profile entry manually
   */
  recordEntry(name: string, duration: number, startTime: number): void {
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryDelta = currentMemory - this.startMemory;

    const entry: ProfileEntry = {
      name,
      duration,
      startTime,
      endTime: startTime + duration,
      memoryDelta,
      count: 1,
    };

    const existing = this.entries.get(name) || [];
    existing.push(entry);
    this.entries.set(name, existing);
  }

  /**
   * Identify hot paths (operations taking the most time)
   */
  getHotPaths(limit = 10): HotPath[] {
    const aggregated = new Map<string, { total: number; count: number }>();
    let totalTime = 0;

    // Aggregate by operation name
    for (const [name, entries] of Array.from(this.entries.entries())) {
      const total = entries.reduce((sum, e) => sum + e.duration, 0);
      const count = entries.length;

      aggregated.set(name, { total, count });
      totalTime += total;
    }

    // Convert to hot paths and sort by total time
    const hotPaths: HotPath[] = [];
    for (const [operation, stats] of Array.from(aggregated.entries())) {
      hotPaths.push({
        operation,
        totalTime: stats.total,
        count: stats.count,
        avgTime: stats.total / stats.count,
        percentOfTotal: (stats.total / totalTime) * 100,
      });
    }

    return hotPaths.sort((a, b) => b.totalTime - a.totalTime).slice(0, limit);
  }

  /**
   * Get memory-intensive operations
   */
  getMemoryHogs(limit = 10): Array<{
    operation: string;
    avgMemoryDelta: number;
    maxMemoryDelta: number;
    count: number;
  }> {
    const memoryStats: Array<{
      operation: string;
      avgMemoryDelta: number;
      maxMemoryDelta: number;
      count: number;
    }> = [];

    for (const [name, entries] of Array.from(this.entries.entries())) {
      const deltas = entries.map(e => e.memoryDelta);
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const maxDelta = Math.max(...deltas);

      memoryStats.push({
        operation: name,
        avgMemoryDelta: avgDelta,
        maxMemoryDelta: maxDelta,
        count: entries.length,
      });
    }

    return memoryStats.sort((a, b) => b.avgMemoryDelta - a.avgMemoryDelta).slice(0, limit);
  }

  /**
   * Generate detailed profiling report
   */
  generateReport(): string {
    const lines: string[] = [
      '# Performance Profiling Report',
      '',
      '## Hot Paths (by total time)',
      '',
      '| Operation | Total (ms) | Count | Avg (ms) | % of Total |',
      '|-----------|------------|-------|----------|------------|',
    ];

    const hotPaths = this.getHotPaths(15);
    for (const path of hotPaths) {
      lines.push(
        `| ${path.operation} | ${path.totalTime.toFixed(2)} | ${path.count} | ${path.avgTime.toFixed(2)} | ${path.percentOfTotal.toFixed(1)}% |`
      );
    }

    lines.push('');
    lines.push('## Memory-Intensive Operations');
    lines.push('');
    lines.push('| Operation | Avg Delta (MB) | Max Delta (MB) | Count |');
    lines.push('|-----------|----------------|----------------|-------|');

    const memoryHogs = this.getMemoryHogs(10);
    for (const op of memoryHogs) {
      const avgMB = (op.avgMemoryDelta / 1024 / 1024).toFixed(2);
      const maxMB = (op.maxMemoryDelta / 1024 / 1024).toFixed(2);
      lines.push(`| ${op.operation} | ${avgMB} | ${maxMB} | ${op.count} |`);
    }

    lines.push('');
    lines.push('## Recommendations');
    lines.push('');

    // Generate recommendations based on hot paths
    const top3 = hotPaths.slice(0, 3);
    for (let i = 0; i < top3.length; i++) {
      const path = top3[i];
      lines.push(`${i + 1}. **${path.operation}** (${path.percentOfTotal.toFixed(1)}% of total time)`);

      // Suggest optimizations based on operation characteristics
      if (path.avgTime > 100) {
        lines.push(`   - Consider caching results (avg ${path.avgTime.toFixed(2)}ms per call)`);
      }
      if (path.count > 100) {
        lines.push(`   - High call count (${path.count}) - consider batching operations`);
      }
      if (path.operation.includes('file') || path.operation.includes('io')) {
        lines.push(`   - I/O operation detected - consider parallel processing or streaming`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Save profiling report to file
   */
  async saveReport(outputPath: string): Promise<void> {
    const report = this.generateReport();
    await writeFile(outputPath, report, 'utf-8');
  }

  /**
   * Get all entries for detailed analysis
   */
  getEntries(): Map<string, ProfileEntry[]> {
    return new Map(this.entries);
  }

  /**
   * Clear all profiling data
   */
  clear(): void {
    this.entries.clear();
    this.startMemory = process.memoryUsage().heapUsed;
  }
}

/**
 * Profile a function and return results
 */
export async function profile<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number; memoryDelta: number }> {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = await fn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  return {
    result,
    duration: endTime - startTime,
    memoryDelta: endMemory - startMemory,
  };
}

/**
 * Profile multiple iterations and get statistics
 */
export async function profileIterations<T>(
  name: string,
  fn: () => Promise<T>,
  iterations: number
): Promise<{
  results: T[];
  stats: {
    minMs: number;
    maxMs: number;
    avgMs: number;
    medianMs: number;
    totalMemoryDelta: number;
  };
}> {
  const results: T[] = [];
  const durations: number[] = [];
  let totalMemoryDelta = 0;

  for (let i = 0; i < iterations; i++) {
    const { result, duration, memoryDelta } = await profile(`${name}-${i}`, fn);
    results.push(result);
    durations.push(duration);
    totalMemoryDelta += memoryDelta;
  }

  const sorted = durations.sort((a, b) => a - b);

  return {
    results,
    stats: {
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations),
      avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      totalMemoryDelta,
    },
  };
}

/**
 * Create a simple call stack profiler
 */
export class CallStackProfiler {
  private stack: Array<{ name: string; startTime: number; startMemory: number }> = [];
  private results: Array<{
    name: string;
    duration: number;
    memoryDelta: number;
    depth: number;
  }> = [];

  /**
   * Enter a function call
   */
  enter(name: string): void {
    this.stack.push({
      name,
      startTime: performance.now(),
      startMemory: process.memoryUsage().heapUsed,
    });
  }

  /**
   * Exit a function call
   */
  exit(): void {
    const frame = this.stack.pop();
    if (!frame) return;

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    this.results.push({
      name: frame.name,
      duration: endTime - frame.startTime,
      memoryDelta: endMemory - frame.startMemory,
      depth: this.stack.length,
    });
  }

  /**
   * Get call tree visualization
   */
  getCallTree(): string {
    const lines: string[] = ['Call Tree:', ''];

    let currentDepth = -1;
    for (const result of this.results) {
      if (result.depth < currentDepth) {
        lines.push(''); // Add blank line when exiting deeper calls
      }

      const indent = '  '.repeat(result.depth);
      const memMB = (result.memoryDelta / 1024 / 1024).toFixed(2);
      lines.push(`${indent}${result.name}: ${result.duration.toFixed(2)}ms (${memMB}MB)`);

      currentDepth = result.depth;
    }

    return lines.join('\n');
  }

  /**
   * Clear profiling data
   */
  clear(): void {
    this.stack = [];
    this.results = [];
  }
}

/**
 * Decorator to automatically profile async functions
 */
export function profileAsync(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      return await originalMethod.apply(this, args);
    } finally {
      const duration = performance.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      console.log(
        `[PROFILE] ${propertyKey}: ${duration.toFixed(2)}ms, ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      );
    }
  };
}
