import { describe, it, expect, beforeEach } from 'vitest';
import {
  OptimizationStrategies,
  HNSWSearchStrategy,
  QuantizationStrategy,
  CacheStrategy,
  BatchOperationStrategy,
  type OptimizationContext,
  type PerformanceMetrics
} from '../../src/optimization/OptimizationStrategies';

describe('OptimizationStrategies', () => {
  let strategies: OptimizationStrategies;

  beforeEach(() => {
    strategies = new OptimizationStrategies();
  });

  describe('Strategy Registration', () => {
    it('should register all default strategies', () => {
      const allStrategies = strategies.getStrategies();

      expect(allStrategies).toHaveLength(4);
      expect(allStrategies.map(s => s.name)).toContain('HNSW Vector Search');
      expect(allStrategies.map(s => s.name)).toContain('Vector Quantization');
      expect(allStrategies.map(s => s.name)).toContain('Intelligent Caching');
      expect(allStrategies.map(s => s.name)).toContain('Batch Operations');
    });

    it('should find strategy by name', () => {
      const strategy = strategies.findStrategy('HNSW Vector Search');

      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe('HNSW Vector Search');
      expect(strategy?.priority).toBe(10);
    });

    it('should return undefined for unknown strategy', () => {
      const strategy = strategies.findStrategy('Unknown Strategy');

      expect(strategy).toBeUndefined();
    });
  });

  describe('Recommendation Engine', () => {
    it('should recommend strategies based on metrics', () => {
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
          operationType: 'search',
          datasetSize: 10000
        }
      };

      const recommendations = strategies.recommend(metrics);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].strategy).toBeDefined();
      expect(recommendations[0].impact).toBeDefined();
      expect(recommendations[0].score).toBeGreaterThan(0);
    });

    it('should sort recommendations by score (highest first)', () => {
      const metrics: PerformanceMetrics = {
        duration: 2000,
        startTime: Date.now(),
        endTime: Date.now() + 2000,
        heapUsed: 150 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 180 * 1024 * 1024,
        external: 20 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operationType: 'search',
          datasetSize: 50000,
          repeatCount: 10,
          batchable: true,
          operationCount: 100
        }
      };

      const recommendations = strategies.recommend(metrics);

      // Verify sorted by score
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
      }
    });

    it('should filter out low-confidence recommendations', () => {
      const metrics: PerformanceMetrics = {
        duration: 50, // Too fast for most optimizations
        startTime: Date.now(),
        endTime: Date.now() + 50,
        heapUsed: 10 * 1024 * 1024, // Too small for memory optimization
        heapTotal: 50 * 1024 * 1024,
        rss: 30 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          operationType: 'compute',
          datasetSize: 10
        }
      };

      const recommendations = strategies.recommend(metrics);

      // Should filter out strategies with confidence < 0.7
      for (const rec of recommendations) {
        expect(rec.impact.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should handle empty metrics gracefully', () => {
      const metrics: PerformanceMetrics = {
        duration: 100,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {}
      };

      const recommendations = strategies.recommend(metrics);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});

describe('HNSWSearchStrategy', () => {
  let strategy: HNSWSearchStrategy;

  beforeEach(() => {
    strategy = new HNSWSearchStrategy();
  });

  describe('Strategy Properties', () => {
    it('should have correct name and priority', () => {
      expect(strategy.name).toBe('HNSW Vector Search');
      expect(strategy.priority).toBe(10);
      expect(strategy.applicableTo).toContain('search');
      expect(strategy.applicableTo).toContain('retrieval');
    });
  });

  describe('Impact Estimation', () => {
    it('should estimate high impact for search operations', () => {
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
          operationType: 'search',
          datasetSize: 10000
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBeGreaterThan(100);
      expect(impact.confidence).toBeGreaterThan(0.8);
      expect(impact.reasoning).toContain('HNSW');
    });

    it('should estimate low impact for non-search operations', () => {
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
          operationType: 'compute'
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBe(1);
      expect(impact.confidence).toBe(0);
    });

    it('should scale speedup with dataset size', () => {
      const smallDataset: PerformanceMetrics = {
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
          operationType: 'search',
          datasetSize: 50
        }
      };

      const largeDataset: PerformanceMetrics = {
        ...smallDataset,
        custom: {
          operationType: 'search',
          datasetSize: 100000
        }
      };

      const smallImpact = strategy.estimate(smallDataset);
      const largeImpact = strategy.estimate(largeDataset);

      expect(largeImpact.expectedSpeedup).toBeGreaterThan(smallImpact.expectedSpeedup);
    });
  });

  describe('Strategy Application', () => {
    it('should fail gracefully without HNSW engine', async () => {
      const context: OptimizationContext = {
        operation: 'search',
        metrics: {
          duration: 1000,
          startTime: Date.now(),
          endTime: Date.now() + 1000,
          heapUsed: 100 * 1024 * 1024,
          heapTotal: 200 * 1024 * 1024,
          rss: 150 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          errorRate: 0,
          successRate: 1,
          custom: {}
        },
        bottlenecks: [],
        layers: {}
      };

      const result = await strategy.apply(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('QuantizationStrategy', () => {
  let strategy: QuantizationStrategy;

  beforeEach(() => {
    strategy = new QuantizationStrategy();
  });

  describe('Strategy Properties', () => {
    it('should have correct name and priority', () => {
      expect(strategy.name).toBe('Vector Quantization');
      expect(strategy.priority).toBe(9);
      expect(strategy.applicableTo).toContain('storage');
      expect(strategy.applicableTo).toContain('memory');
    });
  });

  describe('Impact Estimation', () => {
    it('should estimate high impact for memory-intensive operations', () => {
      const metrics: PerformanceMetrics = {
        duration: 500,
        startTime: Date.now(),
        endTime: Date.now() + 500,
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          precision: 'int8'
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedMemoryReduction).toBeGreaterThan(0.4);
      expect(impact.confidence).toBeGreaterThan(0.8);
    });

    it('should estimate low impact for small memory usage', () => {
      const metrics: PerformanceMetrics = {
        duration: 100,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        heapUsed: 10 * 1024 * 1024, // 10MB
        heapTotal: 50 * 1024 * 1024,
        rss: 30 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {}
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedMemoryReduction).toBe(0);
      expect(impact.confidence).toBe(0);
    });

    it('should vary reduction by precision level', () => {
      const int8Metrics: PerformanceMetrics = {
        duration: 500,
        startTime: Date.now(),
        endTime: Date.now() + 500,
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: { precision: 'int8' }
      };

      const int4Metrics: PerformanceMetrics = {
        ...int8Metrics,
        custom: { precision: 'int4' }
      };

      const int8Impact = strategy.estimate(int8Metrics);
      const int4Impact = strategy.estimate(int4Metrics);

      expect(int4Impact.expectedMemoryReduction).toBeGreaterThan(int8Impact.expectedMemoryReduction);
    });
  });
});

describe('CacheStrategy', () => {
  let strategy: CacheStrategy;

  beforeEach(() => {
    strategy = new CacheStrategy();
  });

  describe('Strategy Properties', () => {
    it('should have correct name and priority', () => {
      expect(strategy.name).toBe('Intelligent Caching');
      expect(strategy.priority).toBe(8);
      expect(strategy.applicableTo).toContain('compute');
      expect(strategy.applicableTo).toContain('io');
      expect(strategy.applicableTo).toContain('retrieval');
    });
  });

  describe('Impact Estimation', () => {
    it('should estimate high impact for repeated expensive operations', () => {
      const metrics: PerformanceMetrics = {
        duration: 500, // Expensive
        startTime: Date.now(),
        endTime: Date.now() + 500,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          repeatCount: 10 // Repeated
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBeGreaterThan(1);
      expect(impact.confidence).toBeGreaterThan(0.7);
    });

    it('should estimate low impact for non-repeated operations', () => {
      const metrics: PerformanceMetrics = {
        duration: 500,
        startTime: Date.now(),
        endTime: Date.now() + 500,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          repeatCount: 1 // Not repeated
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBe(1);
      expect(impact.confidence).toBe(0);
    });

    it('should estimate low impact for fast operations', () => {
      const metrics: PerformanceMetrics = {
        duration: 10, // Fast
        startTime: Date.now(),
        endTime: Date.now() + 10,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          repeatCount: 10
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBe(1);
      expect(impact.confidence).toBe(0);
    });
  });
});

describe('BatchOperationStrategy', () => {
  let strategy: BatchOperationStrategy;

  beforeEach(() => {
    strategy = new BatchOperationStrategy();
  });

  describe('Strategy Properties', () => {
    it('should have correct name and priority', () => {
      expect(strategy.name).toBe('Batch Operations');
      expect(strategy.priority).toBe(7);
      expect(strategy.applicableTo).toContain('io');
      expect(strategy.applicableTo).toContain('batch');
    });
  });

  describe('Impact Estimation', () => {
    it('should estimate high impact for batchable operations', () => {
      const metrics: PerformanceMetrics = {
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          batchable: true,
          operationCount: 100
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBeGreaterThan(1);
      expect(impact.confidence).toBeGreaterThan(0.7);
    });

    it('should estimate low impact for non-batchable operations', () => {
      const metrics: PerformanceMetrics = {
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          batchable: false
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBe(1);
      expect(impact.confidence).toBe(0);
    });

    it('should estimate low impact for small operation counts', () => {
      const metrics: PerformanceMetrics = {
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        errorRate: 0,
        successRate: 1,
        custom: {
          batchable: true,
          operationCount: 2 // Too few
        }
      };

      const impact = strategy.estimate(metrics);

      expect(impact.expectedSpeedup).toBe(1);
      expect(impact.confidence).toBe(0);
    });
  });
});
