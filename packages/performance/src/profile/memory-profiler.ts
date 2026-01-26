/**
 * Memory profiler for tracking usage and detecting leaks
 * @module @claude-flow/performance/profile
 */

import { MemorySnapshot, MemoryLeak } from '../types';

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private leakThreshold = 0.1; // 10% growth per minute

  constructor(maxSnapshots = 100, leakThreshold = 0.1) {
    this.maxSnapshots = maxSnapshots;
    this.leakThreshold = leakThreshold;
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers
    };

    this.snapshots.push(snapshot);

    // Limit memory usage of profiler itself
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): MemorySnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * Calculate memory statistics
   */
  getStats(): {
    current: MemorySnapshot | null;
    avg: Partial<MemorySnapshot>;
    min: Partial<MemorySnapshot>;
    max: Partial<MemorySnapshot>;
    growth: number;
  } | null {
    if (this.snapshots.length === 0) return null;

    const current = this.getLatestSnapshot();
    const metrics = ['heapUsed', 'heapTotal', 'external', 'rss', 'arrayBuffers'] as const;

    const avg: Partial<MemorySnapshot> = {};
    const min: Partial<MemorySnapshot> = {};
    const max: Partial<MemorySnapshot> = {};

    for (const metric of metrics) {
      const values = this.snapshots.map(s => s[metric]);
      avg[metric] = values.reduce((a, b) => a + b, 0) / values.length;
      min[metric] = Math.min(...values);
      max[metric] = Math.max(...values);
    }

    // Calculate growth rate
    const growth = this.calculateGrowthRate();

    return { current, avg, min, max, growth };
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): MemoryLeak[] {
    if (this.snapshots.length < 10) {
      return []; // Need more data
    }

    const leaks: MemoryLeak[] = [];
    const recentSnapshots = this.snapshots.slice(-10);

    // Check heap growth
    const heapGrowth = this.calculateGrowthRate('heapUsed', recentSnapshots);
    if (heapGrowth > this.leakThreshold) {
      const latest = recentSnapshots[recentSnapshots.length - 1];
      const first = recentSnapshots[0];

      leaks.push({
        timestamp: Date.now(),
        growthRate: heapGrowth,
        suspectedObject: 'heap',
        heapDiff: latest.heapUsed - first.heapUsed
      });
    }

    // Check external memory growth
    const externalGrowth = this.calculateGrowthRate('external', recentSnapshots);
    if (externalGrowth > this.leakThreshold) {
      const latest = recentSnapshots[recentSnapshots.length - 1];
      const first = recentSnapshots[0];

      leaks.push({
        timestamp: Date.now(),
        growthRate: externalGrowth,
        suspectedObject: 'external',
        heapDiff: latest.external - first.external
      });
    }

    // Check array buffer growth
    const bufferGrowth = this.calculateGrowthRate('arrayBuffers', recentSnapshots);
    if (bufferGrowth > this.leakThreshold) {
      const latest = recentSnapshots[recentSnapshots.length - 1];
      const first = recentSnapshots[0];

      leaks.push({
        timestamp: Date.now(),
        growthRate: bufferGrowth,
        suspectedObject: 'arrayBuffers',
        heapDiff: latest.arrayBuffers - first.arrayBuffers
      });
    }

    return leaks;
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    const stats = this.getStats();
    if (!stats) {
      return 'No memory data collected';
    }

    const leaks = this.detectLeaks();
    const lines = [
      '=== Memory Profile Report ===',
      '',
      'Current Usage:',
      `  Heap Used: ${this.formatBytes(stats.current!.heapUsed)}`,
      `  Heap Total: ${this.formatBytes(stats.current!.heapTotal)}`,
      `  External: ${this.formatBytes(stats.current!.external)}`,
      `  RSS: ${this.formatBytes(stats.current!.rss)}`,
      `  Array Buffers: ${this.formatBytes(stats.current!.arrayBuffers)}`,
      '',
      'Statistics:',
      `  Avg Heap: ${this.formatBytes(stats.avg.heapUsed!)}`,
      `  Min Heap: ${this.formatBytes(stats.min.heapUsed!)}`,
      `  Max Heap: ${this.formatBytes(stats.max.heapUsed!)}`,
      `  Growth Rate: ${(stats.growth * 100).toFixed(2)}% per minute`,
      ''
    ];

    if (leaks.length > 0) {
      lines.push('⚠️  MEMORY LEAKS DETECTED:');
      for (const leak of leaks) {
        lines.push(
          `  - ${leak.suspectedObject}: ${(leak.growthRate * 100).toFixed(2)}% growth (${this.formatBytes(leak.heapDiff)} increase)`
        );
      }
    } else {
      lines.push('✓ No memory leaks detected');
    }

    return lines.join('\n');
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Trigger garbage collection (if exposed)
   */
  gc(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  // Private methods

  private calculateGrowthRate(
    metric: keyof MemorySnapshot = 'heapUsed',
    snapshots = this.snapshots
  ): number {
    if (snapshots.length < 2) return 0;

    const recent = snapshots[snapshots.length - 1];
    const older = snapshots[0];
    const timeSpanMinutes = (recent.timestamp - older.timestamp) / 60000;

    if (timeSpanMinutes === 0) return 0;

    const change = recent[metric] - older[metric];
    const percentChange = change / older[metric];

    // Normalize to per-minute rate
    return percentChange / timeSpanMinutes;
  }
}

// Global profiler instance
let globalProfiler: MemoryProfiler | null = null;

export function getGlobalProfiler(): MemoryProfiler {
  if (!globalProfiler) {
    globalProfiler = new MemoryProfiler();
  }
  return globalProfiler;
}

export function setGlobalProfiler(profiler: MemoryProfiler): void {
  globalProfiler = profiler;
}
