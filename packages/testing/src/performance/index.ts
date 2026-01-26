/**
 * Performance testing and benchmarking utilities
 */

import { BenchmarkResult } from '../types';

/**
 * Benchmark runner
 */
export class Benchmarker {
  async run<T>(
    name: string,
    fn: () => T | Promise<T>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const samples: number[] = [];
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const duration = performance.now() - start;
      samples.push(duration);
      totalTime += duration;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const mean = totalTime / iterations;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / iterations;

    return {
      name,
      iterations,
      meanDuration: mean,
      minDuration: sorted[0],
      maxDuration: sorted[samples.length - 1],
      stdDeviation: Math.sqrt(variance),
      throughput: 1000 / mean,
      samples
    };
  }

  async compare<T>(
    label: string,
    fns: Array<{ name: string; fn: () => T | Promise<T> }>,
    iterations: number = 100
  ): Promise<BenchmarkResult[]> {
    const results = await Promise.all(
      fns.map(({ name, fn }) => this.run(name, fn, iterations))
    );

    const fastest = results.reduce((prev, current) =>
      current.meanDuration < prev.meanDuration ? current : prev
    );

    console.log(`\n=== Benchmark: ${label} ===`);
    results.forEach(result => {
      const ratio = result.meanDuration / fastest.meanDuration;
      console.log(
        `${result.name}: ${result.meanDuration.toFixed(2)}ms (${ratio.toFixed(2)}x)`
      );
    });

    return results;
  }
}

/**
 * Memory profiler
 */
export class MemoryProfiler {
  private snapshots: Array<{ timestamp: number; memory: NodeJS.MemoryUsage }> = [];

  snapshot(label?: string): NodeJS.MemoryUsage {
    if (global.gc) global.gc();

    const memory = process.memoryUsage();
    this.snapshots.push({ timestamp: Date.now(), memory });

    console.log(`Memory snapshot${label ? ` (${label})` : ''}: ${this.formatMemory(memory.heapUsed)}`);
    return memory;
  }

  compare(before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): void {
    const delta = {
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external,
      rss: after.rss - before.rss
    };

    console.log('\nMemory Delta:');
    Object.entries(delta).forEach(([key, value]) => {
      const sign = value >= 0 ? '+' : '';
      console.log(`  ${key}: ${sign}${this.formatMemory(value)}`);
    });
  }

  private formatMemory(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}

/**
 * CPU profiler (basic)
 */
export class CPUProfiler {
  async profile<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number; opsPerSec: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    return {
      result,
      duration,
      opsPerSec: 1000 / duration
    };
  }
}

/**
 * Load tester
 */
export class LoadTester {
  async test(
    fn: () => Promise<void>,
    options: { concurrency: number; duration: number; name?: string }
  ): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgDuration: number;
    throughput: number;
  }> {
    const { concurrency, duration, name } = options;
    let totalRequests = 0;
    let successCount = 0;
    let errorCount = 0;
    const durations: number[] = [];

    const startTime = Date.now();
    const endTime = startTime + duration;

    const runRequest = async (): Promise<void> => {
      if (Date.now() >= endTime) return;

      const start = performance.now();
      try {
        await fn();
        successCount++;
        durations.push(performance.now() - start);
      } catch {
        errorCount++;
      }
      totalRequests++;
    };

    const workers = Array(concurrency).fill(null).map(async () => {
      while (Date.now() < endTime) {
        await runRequest();
      }
    });

    await Promise.all(workers);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    console.log(`\n=== Load Test${name ? `: ${name}` : ''} ===`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);
    console.log(`Avg Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Throughput: ${(successCount / (duration / 1000)).toFixed(2)} req/s`);

    return {
      totalRequests,
      successCount,
      errorCount,
      avgDuration,
      throughput: successCount / (duration / 1000)
    };
  }
}

export const benchmarker = new Benchmarker();
export const memoryProfiler = new MemoryProfiler();
export const cpuProfiler = new CPUProfiler();
export const loadTester = new LoadTester();
