/**
 * Memory Usage Benchmark Suite
 *
 * Performance Targets (from PRD):
 * - Memory usage: <100MB for typical projects
 *
 * This benchmark measures:
 * - Heap usage during various operations
 * - Memory growth patterns
 * - Garbage collection impact
 * - Memory leaks detection
 */

import { describe, bench, beforeAll, afterEach, expect, it } from 'vitest';
import {
  PERFORMANCE_TARGETS,
  getMemoryUsage,
  checkMemoryUsage,
  formatMemoryReport,
  measurePerformance,
  PerformanceCache,
} from '../src/utils/performance.js';
import {
  generateConfig,
  FIXTURE_PRESETS,
  getComponentCount,
} from '../tests/fixtures/fixture-generator.js';
import type { AgentScopeConfig } from '../src/model/types.js';

// Memory snapshot collector
interface MemorySnapshot {
  label: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

class MemoryTracker {
  private snapshots: MemorySnapshot[] = [];
  private baselineHeap: number = 0;

  reset(): void {
    this.snapshots = [];
    this.forceGC();
    this.baselineHeap = process.memoryUsage().heapUsed;
  }

  snapshot(label: string): MemorySnapshot {
    const mem = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      label,
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getDelta(from: string, to: string): number {
    const fromSnapshot = this.snapshots.find(s => s.label === from);
    const toSnapshot = this.snapshots.find(s => s.label === to);
    if (!fromSnapshot || !toSnapshot) return 0;
    return toSnapshot.heapUsed - fromSnapshot.heapUsed;
  }

  getHeapGrowth(): number {
    if (this.snapshots.length < 2) return 0;
    return (
      this.snapshots[this.snapshots.length - 1].heapUsed -
      this.snapshots[0].heapUsed
    );
  }

  isWithinTarget(): boolean {
    const current = process.memoryUsage().heapUsed;
    return current <= PERFORMANCE_TARGETS.MEMORY_MAX_BYTES;
  }

  forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }

  formatReport(): string {
    const lines: string[] = [
      '# Memory Usage Report',
      '',
      `Target: <${(PERFORMANCE_TARGETS.MEMORY_MAX_BYTES / 1024 / 1024).toFixed(0)}MB`,
      '',
      '| Checkpoint | Heap Used (MB) | Delta (MB) | % of Target |',
      '|------------|----------------|------------|-------------|',
    ];

    let previousHeap = this.baselineHeap;
    for (const snapshot of this.snapshots) {
      const heapMB = (snapshot.heapUsed / 1024 / 1024).toFixed(2);
      const deltaMB = ((snapshot.heapUsed - previousHeap) / 1024 / 1024).toFixed(2);
      const percent = (
        (snapshot.heapUsed / PERFORMANCE_TARGETS.MEMORY_MAX_BYTES) *
        100
      ).toFixed(1);
      lines.push(
        `| ${snapshot.label} | ${heapMB} | ${previousHeap === this.baselineHeap ? '-' : deltaMB} | ${percent}% |`
      );
      previousHeap = snapshot.heapUsed;
    }

    return lines.join('\n');
  }
}

const tracker = new MemoryTracker();

describe('Memory Usage Benchmarks', () => {
  afterEach(() => {
    // Clean up after each test
    tracker.forceGC();
  });

  describe('Baseline Memory Usage', () => {
    it('should report current memory usage', () => {
      const usage = getMemoryUsage();
      console.log(`Current heap: ${usage.heapUsedMB}`);
      console.log(`Total heap: ${usage.heapTotalMB}`);
      console.log(`RSS: ${usage.rssMB}`);
    });

    it('should be within target initially', () => {
      const check = checkMemoryUsage();
      console.log(`Memory usage: ${check.usagePercent.toFixed(1)}% of target`);
      expect(check.withinTarget).toBe(true);
    });
  });

  describe('Config Generation Memory', () => {
    bench('memory - generate minimal config', () => {
      const config = generateConfig(FIXTURE_PRESETS.minimal);
      // Keep reference to prevent GC
      return config.meta.name;
    });

    bench('memory - generate small config', () => {
      const config = generateConfig(FIXTURE_PRESETS.small);
      return config.meta.name;
    });

    bench('memory - generate typical config', () => {
      const config = generateConfig(FIXTURE_PRESETS.typical);
      return config.meta.name;
    });

    bench('memory - generate large config', () => {
      const config = generateConfig(FIXTURE_PRESETS.large);
      return config.meta.name;
    });

    bench('memory - generate stress config', () => {
      const config = generateConfig(FIXTURE_PRESETS.stress);
      return config.meta.name;
    });

    bench('memory - generate extreme config', () => {
      const config = generateConfig(FIXTURE_PRESETS.extreme);
      return config.meta.name;
    });
  });

  describe('Memory Growth Analysis', () => {
    it('should track memory growth through config generation', () => {
      tracker.reset();
      tracker.snapshot('baseline');

      // Generate progressively larger configs
      const minimal = generateConfig(FIXTURE_PRESETS.minimal);
      tracker.snapshot('after-minimal');

      const small = generateConfig(FIXTURE_PRESETS.small);
      tracker.snapshot('after-small');

      const typical = generateConfig(FIXTURE_PRESETS.typical);
      tracker.snapshot('after-typical');

      const large = generateConfig(FIXTURE_PRESETS.large);
      tracker.snapshot('after-large');

      const stress = generateConfig(FIXTURE_PRESETS.stress);
      tracker.snapshot('after-stress');

      console.log('\n' + tracker.formatReport());
      console.log(`\nTotal heap growth: ${(tracker.getHeapGrowth() / 1024 / 1024).toFixed(2)}MB`);

      expect(tracker.isWithinTarget()).toBe(true);
    });

    it('should not leak memory on repeated generation', () => {
      tracker.reset();
      tracker.snapshot('start');

      // Generate many configs
      for (let i = 0; i < 100; i++) {
        generateConfig(FIXTURE_PRESETS.typical);
      }

      tracker.forceGC();
      tracker.snapshot('after-100-generations');

      // Generate more
      for (let i = 0; i < 100; i++) {
        generateConfig(FIXTURE_PRESETS.typical);
      }

      tracker.forceGC();
      tracker.snapshot('after-200-generations');

      console.log('\n' + tracker.formatReport());

      // Memory should not grow linearly with iterations
      const growth = tracker.getDelta('start', 'after-200-generations');
      const growthMB = growth / 1024 / 1024;
      console.log(`Memory growth after 200 generations: ${growthMB.toFixed(2)}MB`);

      // Should stay well under target
      expect(tracker.isWithinTarget()).toBe(true);
    });
  });

  describe('Cache Memory Impact', () => {
    bench('cache - store 100 entries', () => {
      const cache = new PerformanceCache<string, AgentScopeConfig>(100);
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, generateConfig(FIXTURE_PRESETS.minimal));
      }
      return cache.getStats().size;
    });

    bench('cache - store 1000 entries with eviction', () => {
      const cache = new PerformanceCache<string, AgentScopeConfig>(100);
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, generateConfig(FIXTURE_PRESETS.minimal));
      }
      return cache.getStats().evictions;
    });

    it('should track cache memory usage', () => {
      tracker.reset();
      tracker.snapshot('before-cache');

      const cache = new PerformanceCache<string, AgentScopeConfig>(100);

      for (let i = 0; i < 50; i++) {
        cache.set(`key-${i}`, generateConfig(FIXTURE_PRESETS.typical));
      }
      tracker.snapshot('50-entries');

      for (let i = 50; i < 100; i++) {
        cache.set(`key-${i}`, generateConfig(FIXTURE_PRESETS.typical));
      }
      tracker.snapshot('100-entries-full');

      // Trigger eviction
      for (let i = 100; i < 200; i++) {
        cache.set(`key-${i}`, generateConfig(FIXTURE_PRESETS.typical));
      }
      tracker.snapshot('after-eviction');

      console.log('\n' + tracker.formatReport());
      console.log(`Cache stats: ${JSON.stringify(cache.getStats())}`);

      expect(cache.getStats().evictions).toBeGreaterThan(0);
    });
  });

  describe('String Building Memory', () => {
    bench('memory - build small string (1KB)', () => {
      const lines: string[] = [];
      for (let i = 0; i < 50; i++) {
        lines.push(`Line ${i}: Content`);
      }
      return lines.join('\n');
    });

    bench('memory - build medium string (10KB)', () => {
      const lines: string[] = [];
      for (let i = 0; i < 500; i++) {
        lines.push(`Line ${i}: Content with more data here`);
      }
      return lines.join('\n');
    });

    bench('memory - build large string (100KB)', () => {
      const lines: string[] = [];
      for (let i = 0; i < 5000; i++) {
        lines.push(`Line ${i}: Content with even more data here for testing`);
      }
      return lines.join('\n');
    });

    bench('memory - build very large string (1MB)', () => {
      const lines: string[] = [];
      for (let i = 0; i < 20000; i++) {
        lines.push(`Line ${i}: This is a longer line with more content to simulate realistic documentation output`);
      }
      return lines.join('\n');
    });
  });

  describe('JSON Serialization Memory', () => {
    const configs = {
      small: generateConfig(FIXTURE_PRESETS.small),
      typical: generateConfig(FIXTURE_PRESETS.typical),
      large: generateConfig(FIXTURE_PRESETS.large),
      stress: generateConfig(FIXTURE_PRESETS.stress),
    };

    bench('JSON stringify - small', () => {
      return JSON.stringify(configs.small);
    });

    bench('JSON stringify - typical', () => {
      return JSON.stringify(configs.typical);
    });

    bench('JSON stringify - large', () => {
      return JSON.stringify(configs.large);
    });

    bench('JSON stringify - stress', () => {
      return JSON.stringify(configs.stress);
    });

    it('should measure JSON memory impact', () => {
      tracker.reset();
      tracker.snapshot('before-json');

      const smallJson = JSON.stringify(configs.small);
      tracker.snapshot('after-small-json');

      const typicalJson = JSON.stringify(configs.typical);
      tracker.snapshot('after-typical-json');

      const largeJson = JSON.stringify(configs.large);
      tracker.snapshot('after-large-json');

      const stressJson = JSON.stringify(configs.stress);
      tracker.snapshot('after-stress-json');

      console.log('\n' + tracker.formatReport());
      console.log(`\nJSON sizes:`);
      console.log(`  Small: ${(smallJson.length / 1024).toFixed(1)}KB`);
      console.log(`  Typical: ${(typicalJson.length / 1024).toFixed(1)}KB`);
      console.log(`  Large: ${(largeJson.length / 1024).toFixed(1)}KB`);
      console.log(`  Stress: ${(stressJson.length / 1024).toFixed(1)}KB`);
    });
  });

  describe('Map Operations Memory', () => {
    bench('Map - create with 100 entries', () => {
      const map = new Map<string, number>();
      for (let i = 0; i < 100; i++) {
        map.set(`key-${i}`, i);
      }
      return map.size;
    });

    bench('Map - create with 1000 entries', () => {
      const map = new Map<string, number>();
      for (let i = 0; i < 1000; i++) {
        map.set(`key-${i}`, i);
      }
      return map.size;
    });

    bench('Map - create with 10000 entries', () => {
      const map = new Map<string, number>();
      for (let i = 0; i < 10000; i++) {
        map.set(`key-${i}`, i);
      }
      return map.size;
    });

    it('should track Map memory usage', () => {
      tracker.reset();
      tracker.snapshot('before-maps');

      const map1 = new Map<string, string>();
      for (let i = 0; i < 1000; i++) {
        map1.set(`key-${i}`, `value-${i}`);
      }
      tracker.snapshot('after-1k-map');

      const map2 = new Map<string, string>();
      for (let i = 0; i < 10000; i++) {
        map2.set(`key-${i}`, `value-${i}`);
      }
      tracker.snapshot('after-10k-map');

      const map3 = new Map<string, string>();
      for (let i = 0; i < 100000; i++) {
        map3.set(`key-${i}`, `value-${i}`);
      }
      tracker.snapshot('after-100k-map');

      console.log('\n' + tracker.formatReport());
    });
  });

  describe('Array Operations Memory', () => {
    bench('Array - create with 1000 objects', () => {
      const arr = [];
      for (let i = 0; i < 1000; i++) {
        arr.push({ id: i, name: `Item ${i}`, value: Math.random() });
      }
      return arr.length;
    });

    bench('Array - create with 10000 objects', () => {
      const arr = [];
      for (let i = 0; i < 10000; i++) {
        arr.push({ id: i, name: `Item ${i}`, value: Math.random() });
      }
      return arr.length;
    });

    bench('Array - filter 10000 to 5000', () => {
      const arr = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        keep: i % 2 === 0,
      }));
      return arr.filter(item => item.keep).length;
    });

    bench('Array - map 10000 objects', () => {
      const arr = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      return arr.map(item => ({ ...item, processed: true })).length;
    });
  });

  describe('Memory Pressure Test', () => {
    it('should handle sustained load without exceeding target', async () => {
      tracker.reset();
      tracker.snapshot('start');

      // Simulate sustained operation
      const iterations = 50;
      const configs: AgentScopeConfig[] = [];

      for (let i = 0; i < iterations; i++) {
        // Generate config
        const config = generateConfig(FIXTURE_PRESETS.typical);

        // Simulate processing
        const json = JSON.stringify(config);
        const parsed = JSON.parse(json);

        // Keep some in memory (simulating cache)
        if (i < 20) {
          configs.push(parsed);
        }

        if (i % 10 === 0) {
          tracker.snapshot(`iteration-${i}`);
        }
      }

      tracker.forceGC();
      tracker.snapshot('after-gc');

      console.log('\n' + tracker.formatReport());

      const finalCheck = checkMemoryUsage();
      console.log(`\nFinal memory: ${(finalCheck.currentBytes / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Target: ${(finalCheck.targetBytes / 1024 / 1024).toFixed(0)}MB`);
      console.log(`Usage: ${finalCheck.usagePercent.toFixed(1)}%`);

      expect(finalCheck.withinTarget).toBe(true);
    });
  });
});

// Export for use in reporting
export { MemoryTracker };
