import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../src/monitor/performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(true, 1000);
  });

  afterEach(() => {
    monitor.clear();
  });

  describe('Timer Operations', () => {
    it('should start and end timer', () => {
      monitor.startTimer('test-operation');
      const duration = monitor.endTimer('test-operation');

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when ending non-existent timer', () => {
      expect(() => monitor.endTimer('non-existent')).toThrow();
    });

    it('should record timer with metadata', () => {
      monitor.startTimer('test-op', { tag: 'value' });
      monitor.endTimer('test-op', { extra: 'data' });

      const metrics = monitor.getMetrics({ operation: 'test-op' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata).toMatchObject({
        tag: 'value',
        extra: 'data'
      });
    });

    it('should handle multiple concurrent timers', () => {
      monitor.startTimer('op1');
      monitor.startTimer('op2');
      monitor.startTimer('op3');

      const d1 = monitor.endTimer('op1');
      const d2 = monitor.endTimer('op2');
      const d3 = monitor.endTimer('op3');

      expect(d1).toBeGreaterThanOrEqual(0);
      expect(d2).toBeGreaterThanOrEqual(0);
      expect(d3).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metric Recording', () => {
    it('should record metrics', () => {
      monitor.record({
        timestamp: Date.now(),
        layer: 'test',
        operation: 'test-op',
        latency: 10.5,
        success: true
      });

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].latency).toBe(10.5);
    });

    it('should filter metrics by layer', () => {
      monitor.record({
        timestamp: Date.now(),
        layer: 'layer1',
        operation: 'op1',
        latency: 10,
        success: true
      });
      monitor.record({
        timestamp: Date.now(),
        layer: 'layer2',
        operation: 'op2',
        latency: 20,
        success: true
      });

      const filtered = monitor.getMetrics({ layer: 'layer1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].layer).toBe('layer1');
    });

    it('should filter metrics by time range', () => {
      const start = Date.now();
      monitor.record({
        timestamp: start - 1000,
        layer: 'test',
        operation: 'old',
        latency: 10,
        success: true
      });
      monitor.record({
        timestamp: start + 1000,
        layer: 'test',
        operation: 'new',
        latency: 20,
        success: true
      });

      const filtered = monitor.getMetrics({ startTime: start });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].operation).toBe('new');
    });

    it('should limit max metrics', () => {
      const smallMonitor = new PerformanceMonitor(true, 10);

      for (let i = 0; i < 20; i++) {
        smallMonitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: `op-${i}`,
          latency: i,
          success: true
        });
      }

      expect(smallMonitor.getMetrics()).toHaveLength(10);
    });
  });

  describe('Aggregate Metrics', () => {
    beforeEach(() => {
      // Record test data
      for (let i = 0; i < 100; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'test-op',
          latency: i,
          success: true
        });
      }
    });

    it('should calculate aggregate statistics', () => {
      const stats = monitor.getAggregateMetrics('test-op');

      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(100);
      expect(stats!.mean).toBeCloseTo(49.5, 1);
      expect(stats!.min).toBe(0);
      expect(stats!.max).toBe(99);
    });

    it('should calculate percentiles', () => {
      const stats = monitor.getAggregateMetrics('test-op');

      expect(stats!.p50).toBeCloseTo(50, 1);
      expect(stats!.p95).toBeCloseTo(95, 1);
      expect(stats!.p99).toBeCloseTo(99, 1);
    });

    it('should return null for non-existent operation', () => {
      const stats = monitor.getAggregateMetrics('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('Bottleneck Detection', () => {
    beforeEach(() => {
      // Slow operation
      for (let i = 0; i < 10; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'slow-op',
          latency: 100,
          success: true
        });
      }

      // Fast operation
      for (let i = 0; i < 100; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'fast-op',
          latency: 1,
          success: true
        });
      }
    });

    it('should detect bottlenecks', () => {
      const bottlenecks = monitor.detectBottlenecks(0.05);

      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks[0].operation).toBe('slow-op');
    });

    it('should calculate severity correctly', () => {
      const bottlenecks = monitor.detectBottlenecks(0.01);
      const slowOp = bottlenecks.find(b => b.operation === 'slow-op');

      expect(slowOp).toBeDefined();
      expect(slowOp!.severity).toBe('critical');
    });

    it('should sort bottlenecks by impact', () => {
      const bottlenecks = monitor.detectBottlenecks(0.01);

      for (let i = 1; i < bottlenecks.length; i++) {
        expect(bottlenecks[i - 1].percentOfTotal).toBeGreaterThanOrEqual(
          bottlenecks[i].percentOfTotal
        );
      }
    });
  });

  describe('Optimization Suggestions', () => {
    it('should suggest caching for consistent operations', () => {
      // High frequency, consistent latency
      for (let i = 0; i < 20; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'cacheable-op',
          latency: 50 + Math.random() * 2, // Low variance
          success: true
        });
      }

      const suggestions = monitor.suggestOptimizations();
      const cacheSuggestion = suggestions.find(s => s.strategy === 'cache');

      expect(cacheSuggestion).toBeDefined();
    });

    it('should suggest batching for high-frequency ops', () => {
      // Many fast operations
      for (let i = 0; i < 100; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'batch-op',
          latency: 5,
          success: true
        });
      }

      const suggestions = monitor.suggestOptimizations();
      const batchSuggestion = suggestions.find(s => s.strategy === 'batch');

      expect(batchSuggestion).toBeDefined();
    });

    it('should suggest parallelization for slow ops', () => {
      // Few slow operations
      for (let i = 0; i < 10; i++) {
        monitor.record({
          timestamp: Date.now(),
          layer: 'test',
          operation: 'parallel-op',
          latency: 150,
          success: true
        });
      }

      const suggestions = monitor.suggestOptimizations();
      const parallelSuggestion = suggestions.find(s => s.strategy === 'parallel');

      expect(parallelSuggestion).toBeDefined();
    });
  });

  describe('Enable/Disable', () => {
    it('should not record when disabled', () => {
      monitor.setEnabled(false);

      monitor.record({
        timestamp: Date.now(),
        layer: 'test',
        operation: 'test-op',
        latency: 10,
        success: true
      });

      expect(monitor.getMetrics()).toHaveLength(0);
    });

    it('should not time when disabled', () => {
      monitor.setEnabled(false);

      monitor.startTimer('test');
      const duration = monitor.endTimer('test');

      expect(duration).toBe(0);
      expect(monitor.getMetrics()).toHaveLength(0);
    });

    it('should clear timers when disabled', () => {
      monitor.startTimer('test');
      monitor.setEnabled(false);

      expect(() => monitor.endTimer('test')).not.toThrow();
    });
  });

  describe('Export/Import', () => {
    beforeEach(() => {
      monitor.record({
        timestamp: Date.now(),
        layer: 'test',
        operation: 'op1',
        latency: 10,
        success: true
      });
    });

    it('should export metrics', () => {
      const exported = monitor.export();

      expect(exported.metrics).toHaveLength(1);
      expect(exported.count).toBe(1);
      expect(exported.timestamp).toBeGreaterThan(0);
    });

    it('should import metrics', () => {
      const exported = monitor.export();
      const newMonitor = new PerformanceMonitor();

      newMonitor.import(exported);

      expect(newMonitor.getMetrics()).toHaveLength(1);
    });

    it('should respect max metrics on import', () => {
      const smallMonitor = new PerformanceMonitor(true, 5);

      // Create metrics to import
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          timestamp: Date.now(),
          layer: 'test',
          operation: `op-${i}`,
          latency: i,
          success: true
        });
      }

      smallMonitor.import({ metrics });

      expect(smallMonitor.getMetrics()).toHaveLength(5);
    });
  });
});
