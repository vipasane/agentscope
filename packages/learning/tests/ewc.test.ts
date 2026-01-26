import { EWCConsolidator } from '../src/consolidate/ewc';
import { DistilledPattern, Pattern } from '../src/types';

describe('EWCConsolidator', () => {
  let consolidator: EWCConsolidator;

  beforeEach(() => {
    consolidator = new EWCConsolidator();
  });

  const createMockDistilledPattern = (
    reward: number,
    count: number = 5
  ): DistilledPattern => {
    const embedding = new Float32Array(384);
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.random();
    }

    const pattern: Pattern = {
      id: `pattern-${Math.random()}`,
      task: 'test task',
      input: {},
      output: {},
      success: true,
      reward,
      critique: 'test critique',
      timestamp: Date.now(),
      tokensUsed: 100,
      latencyMs: 500,
      embedding,
    };

    return {
      originalPattern: pattern,
      keyLearnings: ['learning 1', 'learning 2'],
      applicability: ['condition 1'],
      antiPatterns: ['anti-pattern 1'],
      consolidatedReward: reward,
      consolidationCount: count,
    };
  };

  describe('consolidate', () => {
    it('should consolidate high-importance patterns', () => {
      const pattern = createMockDistilledPattern(0.95, 10);

      const result = consolidator.consolidate(pattern, {
        lambda: 0.5,
        minImportance: 0.7,
      });

      expect(result.pattern).toBe(pattern);
      expect(result.mergedCount).toBe(10);
      expect(result.storageReduction).toBeGreaterThan(0);
      expect(consolidator.isProtected(pattern.originalPattern.id)).toBe(true);
    });

    it('should not protect low-importance patterns', () => {
      const pattern = createMockDistilledPattern(0.3, 2);

      consolidator.consolidate(pattern, {
        lambda: 0.5,
        minImportance: 0.7,
      });

      expect(consolidator.isProtected(pattern.originalPattern.id)).toBe(false);
    });

    it('should prune when capacity exceeded', () => {
      const config = {
        lambda: 0.5,
        minImportance: 0.7,
        maxProtectedPatterns: 2,
      };

      // Add 3 patterns (exceeds capacity of 2)
      const pattern1 = createMockDistilledPattern(0.95, 10);
      const pattern2 = createMockDistilledPattern(0.9, 8);
      const pattern3 = createMockDistilledPattern(0.85, 6);

      consolidator.consolidate(pattern1, config);
      consolidator.consolidate(pattern2, config);
      consolidator.consolidate(pattern3, config);

      const stats = consolidator.getStats();
      expect(stats.totalProtected).toBeLessThanOrEqual(2);
    });
  });

  describe('computeEWCLoss', () => {
    it('should compute zero loss for unprotected patterns', () => {
      const oldEmbedding = new Float32Array([1, 2, 3]);
      const newEmbedding = new Float32Array([2, 3, 4]);

      const loss = consolidator.computeEWCLoss(
        'non-existent',
        oldEmbedding,
        newEmbedding
      );

      expect(loss).toBe(0);
    });

    it('should compute positive loss for protected patterns', () => {
      const pattern = createMockDistilledPattern(0.95, 10);
      consolidator.consolidate(pattern, { minImportance: 0.7 });

      const oldEmbedding = pattern.originalPattern.embedding!;
      const newEmbedding = new Float32Array(oldEmbedding.length);

      // Modify embedding significantly
      for (let i = 0; i < newEmbedding.length; i++) {
        newEmbedding[i] = oldEmbedding[i] + 0.5;
      }

      const loss = consolidator.computeEWCLoss(
        pattern.originalPattern.id,
        oldEmbedding,
        newEmbedding
      );

      expect(loss).toBeGreaterThan(0);
    });
  });

  describe('getWeights', () => {
    it('should return weights for protected patterns', () => {
      const pattern = createMockDistilledPattern(0.95, 10);
      consolidator.consolidate(pattern, { minImportance: 0.7 });

      const weights = consolidator.getWeights(pattern.originalPattern.id);

      expect(weights).toBeDefined();
      expect(weights?.patternId).toBe(pattern.originalPattern.id);
      expect(weights?.weights).toBeDefined();
      expect(weights?.lambda).toBeGreaterThan(0);
    });

    it('should return undefined for unprotected patterns', () => {
      const weights = consolidator.getWeights('non-existent');
      expect(weights).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const pattern1 = createMockDistilledPattern(0.95, 10);
      const pattern2 = createMockDistilledPattern(0.9, 8);

      consolidator.consolidate(pattern1, { minImportance: 0.7 });
      consolidator.consolidate(pattern2, { minImportance: 0.7 });

      const stats = consolidator.getStats();

      expect(stats.totalProtected).toBe(2);
      expect(stats.avgImportance).toBeGreaterThan(0);
      expect(stats.oldestTimestamp).toBeLessThanOrEqual(stats.newestTimestamp);
    });

    it('should handle empty state', () => {
      const stats = consolidator.getStats();

      expect(stats.totalProtected).toBe(0);
      expect(stats.avgImportance).toBe(0);
      expect(stats.oldestTimestamp).toBe(0);
      expect(stats.newestTimestamp).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all protected patterns', () => {
      const pattern = createMockDistilledPattern(0.95, 10);
      consolidator.consolidate(pattern, { minImportance: 0.7 });

      expect(consolidator.isProtected(pattern.originalPattern.id)).toBe(true);

      consolidator.clear();

      expect(consolidator.isProtected(pattern.originalPattern.id)).toBe(false);
      expect(consolidator.getStats().totalProtected).toBe(0);
    });
  });
});
