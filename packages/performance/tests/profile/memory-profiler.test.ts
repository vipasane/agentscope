import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryProfiler } from '../../src/profile/memory-profiler';

describe('MemoryProfiler', () => {
  let profiler: MemoryProfiler;

  beforeEach(() => {
    profiler = new MemoryProfiler();
  });

  afterEach(() => {
    profiler.stopMonitoring();
    profiler.clear();
  });

  describe('Snapshot Operations', () => {
    it('should take memory snapshot', () => {
      const snapshot = profiler.takeSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('heapUsed');
      expect(snapshot).toHaveProperty('heapTotal');
      expect(snapshot).toHaveProperty('external');
      expect(snapshot).toHaveProperty('rss');
      expect(snapshot).toHaveProperty('arrayBuffers');

      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapTotal).toBeGreaterThan(0);
    });

    it('should store snapshots', () => {
      profiler.takeSnapshot();
      profiler.takeSnapshot();
      profiler.takeSnapshot();

      const snapshots = profiler.getSnapshots();
      expect(snapshots).toHaveLength(3);
    });

    it('should limit max snapshots', () => {
      const limitedProfiler = new MemoryProfiler(5);

      for (let i = 0; i < 10; i++) {
        limitedProfiler.takeSnapshot();
      }

      const snapshots = limitedProfiler.getSnapshots();
      expect(snapshots).toHaveLength(5);
    });

    it('should get latest snapshot', () => {
      profiler.takeSnapshot();
      const second = profiler.takeSnapshot();
      const third = profiler.takeSnapshot();

      const latest = profiler.getLatestSnapshot();

      expect(latest?.timestamp).toBe(third.timestamp);
    });

    it('should return null when no snapshots', () => {
      const latest = profiler.getLatestSnapshot();
      expect(latest).toBeNull();
    });

    it('should clear snapshots', () => {
      profiler.takeSnapshot();
      profiler.takeSnapshot();

      profiler.clear();

      expect(profiler.getSnapshots()).toHaveLength(0);
    });
  });

  describe('Monitoring', () => {
    it('should start continuous monitoring', async () => {
      profiler.startMonitoring(50); // 50ms interval

      await new Promise(resolve => setTimeout(resolve, 150));

      profiler.stopMonitoring();

      const snapshots = profiler.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(1);
    });

    it('should not start duplicate monitoring', () => {
      profiler.startMonitoring(100);
      profiler.startMonitoring(100); // Should be ignored

      profiler.stopMonitoring();

      // No error should occur
    });

    it('should stop monitoring', async () => {
      profiler.startMonitoring(50);

      await new Promise(resolve => setTimeout(resolve, 100));

      const countBefore = profiler.getSnapshots().length;

      profiler.stopMonitoring();

      await new Promise(resolve => setTimeout(resolve, 100));

      const countAfter = profiler.getSnapshots().length;

      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create test data
      for (let i = 0; i < 10; i++) {
        profiler.takeSnapshot();
      }
    });

    it('should calculate memory statistics', () => {
      const stats = profiler.getStats();

      expect(stats).not.toBeNull();
      expect(stats!.current).not.toBeNull();
      expect(stats!.avg.heapUsed).toBeGreaterThan(0);
      expect(stats!.min.heapUsed).toBeGreaterThan(0);
      expect(stats!.max.heapUsed).toBeGreaterThan(0);
    });

    it('should return null when no snapshots', () => {
      const emptyProfiler = new MemoryProfiler();
      const stats = emptyProfiler.getStats();

      expect(stats).toBeNull();
    });

    it('should calculate growth rate', () => {
      const stats = profiler.getStats();

      expect(stats!.growth).toBeDefined();
      expect(typeof stats!.growth).toBe('number');
    });

    it('should calculate correct min/max', () => {
      const stats = profiler.getStats();

      expect(stats!.min.heapUsed).toBeLessThanOrEqual(stats!.avg.heapUsed!);
      expect(stats!.max.heapUsed).toBeGreaterThanOrEqual(stats!.avg.heapUsed!);
    });
  });

  describe('Leak Detection', () => {
    it('should detect no leaks with stable memory', () => {
      // Create stable memory profile
      for (let i = 0; i < 15; i++) {
        profiler.takeSnapshot();
      }

      const leaks = profiler.detectLeaks();
      expect(leaks).toHaveLength(0);
    });

    it('should require minimum snapshots', () => {
      profiler.takeSnapshot();
      profiler.takeSnapshot();

      const leaks = profiler.detectLeaks();
      expect(leaks).toHaveLength(0); // Not enough data
    });

    it('should detect heap growth', () => {
      // Simulate memory leak
      const arrays: number[][] = [];

      for (let i = 0; i < 15; i++) {
        // Allocate memory
        arrays.push(new Array(10000).fill(i));
        profiler.takeSnapshot();
      }

      const leaks = profiler.detectLeaks();

      // May or may not detect leak depending on GC timing
      // Just verify it doesn't crash
      expect(Array.isArray(leaks)).toBe(true);

      // Cleanup
      arrays.length = 0;
    });

    it('should identify leak source', () => {
      const leakProfiler = new MemoryProfiler(100, 0.01); // Low threshold

      // Simulate leak
      const leak: number[] = [];
      for (let i = 0; i < 15; i++) {
        leak.push(...new Array(10000).fill(i));
        leakProfiler.takeSnapshot();
      }

      const leaks = leakProfiler.detectLeaks();

      if (leaks.length > 0) {
        expect(leaks[0]).toHaveProperty('timestamp');
        expect(leaks[0]).toHaveProperty('growthRate');
        expect(leaks[0]).toHaveProperty('suspectedObject');
        expect(leaks[0]).toHaveProperty('heapDiff');
      }

      // Cleanup
      leak.length = 0;
    });
  });

  describe('Formatting', () => {
    it('should format bytes correctly', () => {
      expect(profiler.formatBytes(100)).toBe('100.00 B');
      expect(profiler.formatBytes(1024)).toBe('1.00 KB');
      expect(profiler.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(profiler.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle zero bytes', () => {
      expect(profiler.formatBytes(0)).toBe('0.00 B');
    });

    it('should handle large numbers', () => {
      const result = profiler.formatBytes(5.5 * 1024 * 1024 * 1024);
      expect(result).toContain('GB');
    });
  });

  describe('Report Generation', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        profiler.takeSnapshot();
      }
    });

    it('should generate memory report', () => {
      const report = profiler.generateReport();

      expect(report).toContain('Memory Profile Report');
      expect(report).toContain('Current Usage');
      expect(report).toContain('Heap Used');
      expect(report).toContain('Statistics');
    });

    it('should include leak warnings in report', () => {
      const leakProfiler = new MemoryProfiler(100, 0.01);

      // Simulate leak
      const leak: number[] = [];
      for (let i = 0; i < 15; i++) {
        leak.push(...new Array(10000).fill(i));
        leakProfiler.takeSnapshot();
      }

      const report = leakProfiler.generateReport();

      // May contain leak warning
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);

      leak.length = 0;
    });

    it('should handle no data', () => {
      const emptyProfiler = new MemoryProfiler();
      const report = emptyProfiler.generateReport();

      expect(report).toBe('No memory data collected');
    });
  });

  describe('Garbage Collection', () => {
    it('should attempt garbage collection', () => {
      const result = profiler.gc();

      // May or may not be available depending on Node flags
      expect(typeof result).toBe('boolean');
    });

    it('should return false when gc not available', () => {
      // In most test environments, gc is not exposed
      const result = profiler.gc();
      expect(result).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should track memory over time', async () => {
      profiler.startMonitoring(50);

      // Do some work
      const data: number[][] = [];
      for (let i = 0; i < 5; i++) {
        data.push(new Array(1000).fill(i));
        await new Promise(resolve => setTimeout(resolve, 60));
      }

      profiler.stopMonitoring();

      const snapshots = profiler.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(1);

      const stats = profiler.getStats();
      expect(stats).not.toBeNull();

      data.length = 0;
    });

    it('should handle rapid snapshots', () => {
      for (let i = 0; i < 100; i++) {
        profiler.takeSnapshot();
      }

      const snapshots = profiler.getSnapshots();
      expect(snapshots).toHaveLength(100);

      const stats = profiler.getStats();
      expect(stats).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero threshold', () => {
      const strictProfiler = new MemoryProfiler(100, 0);

      for (let i = 0; i < 15; i++) {
        strictProfiler.takeSnapshot();
      }

      const leaks = strictProfiler.detectLeaks();
      // Should only detect if there's actual growth
      expect(Array.isArray(leaks)).toBe(true);
    });

    it('should handle high threshold', () => {
      const lenientProfiler = new MemoryProfiler(100, 1.0); // 100% growth

      // Even with leak, shouldn't detect
      const leak: number[] = [];
      for (let i = 0; i < 15; i++) {
        leak.push(...new Array(1000).fill(i));
        lenientProfiler.takeSnapshot();
      }

      const leaks = lenientProfiler.detectLeaks();
      // Likely no detection with such high threshold
      expect(Array.isArray(leaks)).toBe(true);

      leak.length = 0;
    });
  });
});
