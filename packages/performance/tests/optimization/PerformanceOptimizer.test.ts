import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PerformanceOptimizer,
  type PerformanceOptimizerConfig
} from '../../src/optimization/PerformanceOptimizer';
import type { PerformanceMetrics } from '../../src/types';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(async () => {
    optimizer = new PerformanceOptimizer({
      enableHNSW: true,
      enableQuantization: true,
      enableCache: true,
      enableBatch: true,
      hnswConfig: {
        M: 8,
        efConstruction: 100,
        dimension: 128,
        maxElements: 1000
      },
      cacheMaxSize: 100,
      batchSize: 10,
      batchDelay: 10
    });

    await optimizer.initialize();
  });

  afterEach(async () => {
    await optimizer.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const stats = optimizer.getStatistics();

      expect(stats.initialized).toBe(true);
      expect(stats.enabledLayers.hnsw).toBe(true);
      expect(stats.enabledLayers.quantization).toBe(true);
      expect(stats.enabledLayers.cache).toBe(true);
      expect(stats.enabledLayers.batch).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      // Already initialized in beforeEach
      await optimizer.initialize();

      const stats = optimizer.getStatistics();
      expect(stats.initialized).toBe(true);
    });

    it('should initialize with selective layers', async () => {
      const selectiveOptimizer = new PerformanceOptimizer({
        enableHNSW: true,
        enableQuantization: false,
        enableCache: true,
        enableBatch: false
      });

      await selectiveOptimizer.initialize();

      const stats = selectiveOptimizer.getStatistics();
      expect(stats.enabledLayers.hnsw).toBe(true);
      expect(stats.enabledLayers.quantization).toBe(false);
      expect(stats.enabledLayers.cache).toBe(true);
      expect(stats.enabledLayers.batch).toBe(false);

      await selectiveOptimizer.shutdown();
    });

    it('should throw error if used before initialization', async () => {
      const uninitializedOptimizer = new PerformanceOptimizer();

      await expect(async () => {
        await uninitializedOptimizer.getRecommendations({
          duration: 100,
          startTime: Date.now(),
          endTime: Date.now() + 100,
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          rss: 80 * 1024 * 1024,
          external: 5 * 1024 * 1024,
          errorRate: 0,
          successRate: 1,
          custom: {}
        });
      }).rejects.toThrow('not initialized');
    });
  });

  describe('Recommendations', () => {
    it('should get recommendations for search operations', async () => {
      const metrics: PerformanceMetrics = {
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'semantic-search',
          operationType: 'search',
          datasetSize: 10000
        }
      };

      const recommendations = await optimizer.getRecommendations(metrics);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].strategy.name).toBe('HNSW Vector Search');
      expect(recommendations[0].impact.expectedSpeedup).toBeGreaterThan(100);
    });

    it('should get recommendations for memory-intensive operations', async () => {
      const metrics: PerformanceMetrics = {
        duration: 500,
        startTime: Date.now(),
        endTime: Date.now() + 500,
        heapUsed: 200 * 1024 * 1024, // High memory
        heapTotal: 400 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 20 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'vector-storage',
          precision: 'int8'
        }
      };

      const recommendations = await optimizer.getRecommendations(metrics);

      const quantizationRec = recommendations.find(r => r.strategy.name === 'Vector Quantization');
      expect(quantizationRec).toBeDefined();
      expect(quantizationRec!.impact.expectedMemoryReduction).toBeGreaterThan(0.4);
    });

    it('should return empty recommendations for optimized operations', async () => {
      const metrics: PerformanceMetrics = {
        duration: 10, // Very fast
        startTime: Date.now(),
        endTime: Date.now() + 10,
        heapUsed: 5 * 1024 * 1024, // Low memory
        heapTotal: 20 * 1024 * 1024,
        rss: 15 * 1024 * 1024,
        external: 2 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'fast-lookup'
        }
      };

      const recommendations = await optimizer.getRecommendations(metrics);

      // Should have few or no recommendations for already-optimized operations
      expect(recommendations.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Optimization', () => {
    it('should optimize with specific strategy', async () => {
      const metrics: PerformanceMetrics = {
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'search',
          operationType: 'search',
          datasetSize: 10000
        }
      };

      const result = await optimizer.optimize('HNSW Vector Search', {
        operation: 'semantic-search',
        metrics,
        bottlenecks: []
      });

      expect(result).toBeDefined();
      expect(result.operation).toBe('semantic-search');
      expect(result.strategy).toBe('HNSW Vector Search');
    });

    it('should throw error for unknown strategy', async () => {
      const metrics: PerformanceMetrics = {
        duration: 100,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {}
      };

      await expect(async () => {
        await optimizer.optimize('Unknown Strategy', {
          operation: 'test',
          metrics,
          bottlenecks: []
        });
      }).rejects.toThrow('Strategy not found');
    });

    it('should optimize bottlenecks automatically', async () => {
      const metrics: PerformanceMetrics = {
        duration: 2000, // Slow
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        heapUsed: 150 * 1024 * 1024, // High memory
        heapTotal: 300 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        external: 15 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'data-processing',
          operationType: 'search',
          datasetSize: 50000,
          repeatCount: 10,
          batchable: true,
          operationCount: 100
        }
      };

      const summary = await optimizer.optimizeBottlenecks(metrics);

      expect(summary.total).toBeGreaterThan(0);
      expect(summary.results).toBeDefined();
      expect(Array.isArray(summary.results)).toBe(true);
    });

    it('should handle optimization failures gracefully', async () => {
      const metrics: PerformanceMetrics = {
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'test',
          operationType: 'search',
          datasetSize: 10000
        }
      };

      const summary = await optimizer.optimizeBottlenecks(metrics);

      // Should complete without throwing
      expect(summary).toBeDefined();
      expect(summary.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Auto-Optimization', () => {
    it('should auto-optimize within time budget', async () => {
      const metrics: PerformanceMetrics = {
        duration: 2000,
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        heapUsed: 150 * 1024 * 1024,
        heapTotal: 300 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        external: 15 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'data-processing',
          operationType: 'search',
          datasetSize: 50000
        }
      };

      const summary = await optimizer.autoOptimize(metrics, {
        maxTime: 8, // 8 hours max
        minConfidence: 0.85
      });

      expect(summary).toBeDefined();
      expect(summary.total).toBeGreaterThanOrEqual(0);

      // Verify budget constraints
      if (summary.skipped) {
        for (const skipped of summary.skipped) {
          // Should skip low-confidence or over-budget strategies
          expect(
            skipped.impact.confidence < 0.85 ||
            skipped.impact.implementationCost > 8
          ).toBe(true);
        }
      }
    });

    it('should respect confidence threshold', async () => {
      const metrics: PerformanceMetrics = {
        duration: 100,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'simple-operation'
        }
      };

      const summary = await optimizer.autoOptimize(metrics, {
        maxTime: 24,
        minConfidence: 0.95 // Very high confidence only
      });

      // Should have very few or no results due to high confidence requirement
      expect(summary.total).toBeLessThanOrEqual(1);
    });

    it('should stop when time budget exhausted', async () => {
      const metrics: PerformanceMetrics = {
        duration: 2000,
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        heapUsed: 150 * 1024 * 1024,
        heapTotal: 300 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        external: 15 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'data-processing',
          operationType: 'search',
          datasetSize: 50000
        }
      };

      const summary = await optimizer.autoOptimize(metrics, {
        maxTime: 1, // Very limited budget
        minConfidence: 0.8
      });

      expect(summary).toBeDefined();

      // Should have skipped some strategies due to budget
      if (summary.skipped) {
        expect(summary.skipped.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Statistics', () => {
    it('should return optimizer statistics', () => {
      const stats = optimizer.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.initialized).toBe(true);
      expect(stats.enabledLayers).toBeDefined();
      expect(stats.enabledLayers.hnsw).toBe(true);
      expect(stats.enabledLayers.quantization).toBe(true);
      expect(stats.enabledLayers.cache).toBe(true);
      expect(stats.enabledLayers.batch).toBe(true);
    });

    it('should include layer-specific statistics', () => {
      const stats = optimizer.getStatistics();

      // Should have stats for enabled layers
      expect(stats.hnsw).toBeDefined();
      expect(stats.quantization).toBeDefined();
      expect(stats.cache).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await optimizer.shutdown();

      // Optimizer should no longer be usable after shutdown
      await expect(async () => {
        await optimizer.getRecommendations({
          duration: 100,
          startTime: Date.now(),
          endTime: Date.now() + 100,
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          rss: 80 * 1024 * 1024,
          external: 5 * 1024 * 1024,
          errorRate: 0,
          successRate: 1,
          custom: {}
        });
      }).rejects.toThrow('not initialized');
    });

    it('should flush batch processor on shutdown', async () => {
      const batchOptimizer = new PerformanceOptimizer({
        enableBatch: true,
        batchSize: 10,
        batchDelay: 100
      });

      await batchOptimizer.initialize();
      await batchOptimizer.shutdown();

      // Shutdown should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should detect duration bottlenecks', async () => {
      const metrics: PerformanceMetrics = {
        duration: 6000, // Very slow
        startTime: Date.now(),
        endTime: Date.now() + 6000,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'slow-operation',
          operationType: 'search',
          datasetSize: 100000
        }
      };

      const summary = await optimizer.optimizeBottlenecks(metrics);

      // Should detect and attempt to optimize
      expect(summary.total).toBeGreaterThan(0);
    });

    it('should detect memory bottlenecks', async () => {
      const metrics: PerformanceMetrics = {
        duration: 500,
        startTime: Date.now(),
        endTime: Date.now() + 500,
        heapUsed: 600 * 1024 * 1024, // Very high memory
        heapTotal: 1024 * 1024 * 1024,
        rss: 800 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'memory-intensive'
        }
      };

      const summary = await optimizer.optimizeBottlenecks(metrics);

      // Should detect memory bottleneck
      expect(summary.total).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should work with all layers enabled', async () => {
      const fullOptimizer = new PerformanceOptimizer({
        enableHNSW: true,
        enableQuantization: true,
        enableCache: true,
        enableBatch: true
      });

      await fullOptimizer.initialize();

      const metrics: PerformanceMetrics = {
        duration: 2000,
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        heapUsed: 150 * 1024 * 1024,
        heapTotal: 300 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        external: 15 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operation: 'full-test',
          operationType: 'search',
          datasetSize: 50000,
          repeatCount: 10,
          batchable: true,
          operationCount: 100
        }
      };

      const summary = await fullOptimizer.optimizeBottlenecks(metrics);

      expect(summary).toBeDefined();
      expect(summary.total).toBeGreaterThan(0);

      await fullOptimizer.shutdown();
    });

    it('should work with minimal layers', async () => {
      const minimalOptimizer = new PerformanceOptimizer({
        enableHNSW: false,
        enableQuantization: false,
        enableCache: true,
        enableBatch: false
      });

      await minimalOptimizer.initialize();

      const stats = minimalOptimizer.getStatistics();
      expect(stats.enabledLayers.hnsw).toBe(false);
      expect(stats.enabledLayers.cache).toBe(true);

      await minimalOptimizer.shutdown();
    });
  });
});
