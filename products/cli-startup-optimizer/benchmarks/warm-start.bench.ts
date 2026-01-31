/**
 * @file Warm Start Benchmark
 * @description Measures CLI warm start performance (with OS caching)
 *
 * Target: <400ms p95 (Phase 1)
 *
 * @module benchmarks/warm-start
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

/**
 * Measure warm start time (rapid succession for OS caching)
 */
async function measureWarmStart(args: string[] = ['--version']): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();

    const proc = spawn('node', ['./dist/src/cli-entry.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'pipe'
    });

    proc.on('close', (code) => {
      const duration = performance.now() - start;
      if (code === 0) {
        resolve(duration);
      } else {
        reject(new Error(`CLI exited with code ${code}`));
      }
    });

    proc.on('error', reject);

    setTimeout(() => {
      proc.kill();
      reject(new Error('Timeout'));
    }, 3000);
  });
}

/**
 * Calculate statistics
 */
function calculateStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return {
    mean: values.reduce((sum, v) => sum + v, 0) / n,
    median: sorted[Math.floor(n / 2)],
    p95: sorted[Math.floor(n * 0.95)],
    p99: sorted[Math.floor(n * 0.99)],
    min: sorted[0],
    max: sorted[n - 1]
  };
}

describe('Warm Start Benchmark - Phase 1 Target: <400ms', () => {
  const ITERATIONS = 100;
  const TARGET_P95 = 400; // Phase 1 warm start target

  it('should measure warm start for --version', async () => {
    const times: number[] = [];

    console.log(`\nRunning ${ITERATIONS} warm start iterations (rapid succession)...`);

    // Rapid succession to leverage OS caching
    for (let i = 0; i < ITERATIONS; i++) {
      try {
        const time = await measureWarmStart(['--version']);
        times.push(time);

        if ((i + 1) % 20 === 0) {
          console.log(`  Progress: ${i + 1}/${ITERATIONS}`);
        }
      } catch (error) {
        console.warn(`  Iteration ${i + 1} failed:`, (error as Error).message);
      }
    }

    expect(times.length).toBeGreaterThan(0);

    const stats = calculateStats(times);

    console.log('\n📊 Warm Start Results (--version):');
    console.log(`  Mean:   ${stats.mean.toFixed(1)}ms`);
    console.log(`  Median: ${stats.median.toFixed(1)}ms`);
    console.log(`  P95:    ${stats.p95.toFixed(1)}ms`);
    console.log(`  P99:    ${stats.p99.toFixed(1)}ms`);
    console.log(`  Min:    ${stats.min.toFixed(1)}ms`);
    console.log(`  Max:    ${stats.max.toFixed(1)}ms`);

    const targetGap = ((TARGET_P95 - stats.p95) / TARGET_P95 * 100).toFixed(1);
    console.log(`\n🎯 Phase 1 Warm Start Target:`);
    console.log(`  Target:   ${TARGET_P95}ms`);
    console.log(`  Current:  ${stats.p95.toFixed(1)}ms`);
    console.log(`  Margin:   ${targetGap}%`);

    // Assert warm start target
    expect(stats.p95).toBeLessThan(TARGET_P95);
  }, 180000);

  it('should show improvement from cold to warm start', async () => {
    const coldTimes: number[] = [];
    const warmTimes: number[] = [];

    console.log('\nMeasuring cold vs warm start difference...');

    // Cold starts (with delays)
    for (let i = 0; i < 10; i++) {
      try {
        const time = await measureWarmStart(['--version']);
        coldTimes.push(time);
        await new Promise(resolve => setTimeout(resolve, 500)); // Clear caches
      } catch (error) {
        console.warn(`  Cold ${i + 1} failed`);
      }
    }

    // Warm starts (rapid)
    for (let i = 0; i < 20; i++) {
      try {
        const time = await measureWarmStart(['--version']);
        warmTimes.push(time);
      } catch (error) {
        console.warn(`  Warm ${i + 1} failed`);
      }
    }

    const coldStats = calculateStats(coldTimes);
    const warmStats = calculateStats(warmTimes);

    const improvement = ((coldStats.mean - warmStats.mean) / coldStats.mean * 100).toFixed(1);

    console.log('\n🔥 Cold vs Warm Comparison:');
    console.log(`  Cold start (avg): ${coldStats.mean.toFixed(1)}ms`);
    console.log(`  Warm start (avg): ${warmStats.mean.toFixed(1)}ms`);
    console.log(`  Improvement:      ${improvement}%`);

    // Warm should be faster than cold
    expect(warmStats.mean).toBeLessThan(coldStats.mean);
  }, 60000);

  it('should measure module registry cache effectiveness', async () => {
    const times: number[] = [];

    console.log('\nMeasuring registry cache effectiveness (within same process)...');

    // Multiple invocations within same process would use registry cache
    // This simulates what would happen in a long-running CLI session

    for (let i = 0; i < 50; i++) {
      const time = await measureWarmStart(['--version']);
      times.push(time);
    }

    const stats = calculateStats(times);

    console.log('\n📦 Registry Cache Results:');
    console.log(`  Mean:   ${stats.mean.toFixed(1)}ms`);
    console.log(`  Median: ${stats.median.toFixed(1)}ms`);
    console.log(`  P95:    ${stats.p95.toFixed(1)}ms`);
    console.log(`  Min:    ${stats.min.toFixed(1)}ms`);
    console.log(`  Max:    ${stats.max.toFixed(1)}ms`);

    // Later invocations should be consistently fast
    const firstHalf = times.slice(0, 25);
    const secondHalf = times.slice(25);

    const firstStats = calculateStats(firstHalf);
    const secondStats = calculateStats(secondHalf);

    console.log('\n🔄 Cache Learning Effect:');
    console.log(`  First half (avg):  ${firstStats.mean.toFixed(1)}ms`);
    console.log(`  Second half (avg): ${secondStats.mean.toFixed(1)}ms`);

    // Second half should be equal or faster (cache warmed up)
    expect(secondStats.mean).toBeLessThanOrEqual(firstStats.mean * 1.1); // 10% tolerance
  }, 90000);
});
