/**
 * Edge cases and error handling tests
 * Comprehensive testing of boundary conditions and exceptional scenarios
 */

import { ReasoningBank } from '../../src/reasoning-bank';
import { TrajectoryTracker } from '../../src/trajectory/tracker';
import { VerdictJudge } from '../../src/verdict/judge';
import { MemoryDistiller } from '../../src/distill/distiller';
import { EWCConsolidator } from '../../src/consolidate/ewc';
import { PatternMatcher } from '../../src/matching/matcher';
import { Pattern, Trajectory } from '../../src/types';

// Mock VectorDatabase
class MockVectorDatabase {
  private data = new Map<string, { vector: Float32Array; metadata: any }>();

  async insert(id: string, vector: Float32Array, metadata?: any): Promise<void> {
    this.data.set(id, { vector: new Float32Array(vector), metadata });
  }

  async search(query: Float32Array, k: number): Promise<any[]> {
    return Array.from(this.data.entries())
      .map(([id, { metadata }]) => ({ id, distance: Math.random(), metadata }))
      .slice(0, k);
  }
}

describe('Edge Cases and Error Handling', () => {
  describe('Null and undefined handling', () => {
    let tracker: TrajectoryTracker;

    beforeEach(() => {
      tracker = new TrajectoryTracker();
    });

    it('should handle empty string inputs', () => {
      const id = tracker.startTrajectory('', '', '');
      expect(id).toBeDefined();
      expect(tracker.getTrajectory(id)).toBeDefined();
    });

    it('should handle null-like object inputs', () => {
      const id = tracker.startTrajectory('session', 'task', null);
      const trajectory = tracker.getTrajectory(id);
      expect(trajectory!.input).toBeNull();
    });

    it('should handle undefined in step metadata', () => {
      const id = tracker.startTrajectory('session', 'task', {});

      tracker.addStep(id, {
        action: 'test',
        observation: 'test',
        thought: 'test',
        timestamp: Date.now(),
        metadata: { key: undefined },
      });

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory!.steps[0].metadata).toEqual({ key: undefined });
    });
  });

  describe('Boundary values', () => {
    let judge: VerdictJudge;

    beforeEach(() => {
      judge = new VerdictJudge();
    });

    const createTrajectory = (stepCount: number, latency: number): Trajectory => ({
      id: 'traj-1',
      sessionId: 'session',
      task: 'test',
      input: {},
      steps: Array.from({ length: stepCount }, (_, i) => ({
        action: `Action ${i}`,
        observation: `Observation ${i}`,
        thought: `Thought ${i}`,
        timestamp: Date.now(),
      })),
      output: {},
      success: true,
      startTime: Date.now() - latency,
      endTime: Date.now(),
      totalLatencyMs: latency,
    });

    it('should handle zero steps', () => {
      const trajectory = createTrajectory(0, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.reward).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero latency', () => {
      const trajectory = createTrajectory(5, 0);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.reward).toBeGreaterThan(0);
    });

    it('should handle extreme latency', () => {
      const trajectory = createTrajectory(5, 999999999);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.reward).toBeLessThan(0.5);
    });

    it('should handle single step', () => {
      const trajectory = createTrajectory(1, 100);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.reward).toBeGreaterThan(0.5);
    });

    it('should handle maximum steps', () => {
      const trajectory = createTrajectory(10000, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.critique).toContain('Too many steps');
    });
  });

  describe('Empty collections', () => {
    let matcher: PatternMatcher;

    beforeEach(() => {
      matcher = new PatternMatcher();
    });

    it('should handle empty pattern array', () => {
      const query = new Float32Array(384);
      const results = matcher.findSimilar(query, [], { k: 5 });

      expect(results).toEqual([]);
    });

    it('should handle clustering with no patterns', () => {
      const clusters = matcher.clusterPatterns([], 0.85);
      expect(clusters).toEqual([]);
    });

    it('should handle diversity computation with empty array', () => {
      const diversity = matcher.computeDiversity([]);
      expect(diversity).toBe(0);
    });

    it('should handle diversity with single pattern', () => {
      const pattern: Pattern = {
        id: 'p1',
        task: 'test',
        input: {},
        output: {},
        reward: 0.9,
        success: true,
        critique: 'test',
        timestamp: Date.now(),
        tokensUsed: 100,
        latencyMs: 100,
        embedding: new Float32Array(384),
      };

      const diversity = matcher.computeDiversity([pattern]);
      expect(diversity).toBe(0);
    });

    it('should handle selectDiverse with k > pattern count', () => {
      const query = new Float32Array(384);
      const patterns: Pattern[] = Array.from({ length: 3 }, (_, i) => ({
        id: `p${i}`,
        task: `task ${i}`,
        input: {},
        output: {},
        reward: 0.9,
        success: true,
        critique: 'test',
        timestamp: Date.now(),
        tokensUsed: 100,
        latencyMs: 100,
        embedding: new Float32Array(384).map(() => Math.random()),
      }));

      const selected = matcher.selectDiverse(query, patterns, 10, 0.5);
      expect(selected.length).toBe(3); // Returns all available
    });
  });

  describe('Invalid embeddings', () => {
    let matcher: PatternMatcher;

    beforeEach(() => {
      matcher = new PatternMatcher();
    });

    it('should handle patterns without embeddings', () => {
      const query = new Float32Array(384);
      const patterns: Pattern[] = [
        {
          id: 'p1',
          task: 'test',
          input: {},
          output: {},
          reward: 0.9,
          success: true,
          critique: 'test',
          timestamp: Date.now(),
          tokensUsed: 100,
          latencyMs: 100,
          // No embedding
        },
      ];

      const results = matcher.findSimilar(query, patterns, { k: 5 });
      expect(results).toEqual([]); // Filtered out
    });

    it('should throw on dimension mismatch', () => {
      const a = new Float32Array(384);
      const b = new Float32Array(512); // Different dimension

      const pattern: Pattern = {
        id: 'p1',
        task: 'test',
        input: {},
        output: {},
        reward: 0.9,
        success: true,
        critique: 'test',
        timestamp: Date.now(),
        tokensUsed: 100,
        latencyMs: 100,
        embedding: b,
      };

      expect(() => {
        matcher.findSimilar(a, [pattern], { k: 5 });
      }).toThrow(/dimensions must match/);
    });

    it('should handle zero-magnitude embeddings', () => {
      const a = new Float32Array(384); // All zeros
      const b = new Float32Array(384); // All zeros

      const pattern: Pattern = {
        id: 'p1',
        task: 'test',
        input: {},
        output: {},
        reward: 0.9,
        success: true,
        critique: 'test',
        timestamp: Date.now(),
        tokensUsed: 100,
        latencyMs: 100,
        embedding: b,
      };

      const results = matcher.findSimilar(a, [pattern], { k: 5 });
      expect(results[0].similarity).toBe(0); // Similarity is 0 for zero vectors
    });
  });

  describe('Consolidation edge cases', () => {
    let consolidator: EWCConsolidator;

    beforeEach(() => {
      consolidator = new EWCConsolidator();
    });

    it('should handle pattern without embedding', () => {
      const distilledPattern = {
        originalPattern: {
          id: 'p1',
          task: 'test',
          input: {},
          output: {},
          reward: 0.9,
          success: true,
          critique: 'test',
          timestamp: Date.now(),
          tokensUsed: 100,
          latencyMs: 100,
          // No embedding
        },
        keyLearnings: ['learning 1'],
        applicability: ['condition 1'],
        antiPatterns: [],
        consolidatedReward: 0.9,
        consolidationCount: 1,
      };

      const result = consolidator.consolidate(distilledPattern);
      expect(result).toBeDefined();
      expect(result.consolidationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle consolidation at maximum capacity', () => {
      // Fill to capacity
      for (let i = 0; i < 100; i++) {
        const pattern = {
          originalPattern: {
            id: `p${i}`,
            task: `task ${i}`,
            input: {},
            output: {},
            reward: 0.8,
            success: true,
            critique: 'test',
            timestamp: Date.now(),
            tokensUsed: 100,
            latencyMs: 100,
            embedding: new Float32Array(384).map(() => Math.random()),
          },
          keyLearnings: ['test'],
          applicability: ['test'],
          antiPatterns: [],
          consolidatedReward: 0.8,
          consolidationCount: 1,
        };

        consolidator.consolidate(pattern, {
          lambda: 0.5,
          minImportance: 0.7,
          maxProtectedPatterns: 100,
        });
      }

      const stats = consolidator.getStats();
      expect(stats.totalProtected).toBe(100);

      // Try to add one more - should prune least important
      const newPattern = {
        originalPattern: {
          id: 'p-new',
          task: 'new task',
          input: {},
          output: {},
          reward: 0.95, // High reward
          success: true,
          critique: 'excellent',
          timestamp: Date.now(),
          tokensUsed: 100,
          latencyMs: 100,
          embedding: new Float32Array(384).map(() => Math.random()),
        },
        keyLearnings: ['test'],
        applicability: ['test'],
        antiPatterns: [],
        consolidatedReward: 0.95,
        consolidationCount: 5,
      };

      consolidator.consolidate(newPattern, {
        lambda: 0.5,
        minImportance: 0.7,
        maxProtectedPatterns: 100,
      });

      // Should still be at capacity
      const newStats = consolidator.getStats();
      expect(newStats.totalProtected).toBe(100);
      expect(consolidator.isProtected('p-new')).toBe(true);
    });

    it('should handle very old patterns', () => {
      const oldPattern = {
        originalPattern: {
          id: 'p-old',
          task: 'old task',
          input: {},
          output: {},
          reward: 0.9,
          success: true,
          critique: 'test',
          timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
          tokensUsed: 100,
          latencyMs: 100,
          embedding: new Float32Array(384),
        },
        keyLearnings: ['test'],
        applicability: ['test'],
        antiPatterns: [],
        consolidatedReward: 0.9,
        consolidationCount: 1,
      };

      const result = consolidator.consolidate(oldPattern);

      // Very old patterns should have low importance
      expect(result).toBeDefined();
    });
  });

  describe('Distillation edge cases', () => {
    let distiller: MemoryDistiller;

    beforeEach(() => {
      distiller = new MemoryDistiller();
    });

    it('should handle trajectory with no steps', () => {
      const trajectory: Trajectory = {
        id: 'traj-1',
        sessionId: 'session',
        task: 'test',
        input: {},
        steps: [],
        output: {},
        success: true,
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        totalLatencyMs: 1000,
      };

      const pattern = distiller.distillTrajectory(trajectory, {
        success: true,
        reward: 0.9,
        critique: 'test',
      });

      expect(pattern).toBeDefined();
      expect(pattern.metadata?.stepCount).toBe(0);
    });

    it('should throw when consolidating too few patterns', () => {
      const patterns: Pattern[] = [
        {
          id: 'p1',
          task: 'test',
          input: {},
          output: {},
          reward: 0.9,
          success: true,
          critique: 'test',
          timestamp: Date.now(),
          tokensUsed: 100,
          latencyMs: 100,
        },
      ];

      expect(() => {
        distiller.distillPatterns(patterns);
      }).toThrow(/Need at least 3 patterns/);
    });

    it('should handle patterns with empty critiques', () => {
      const patterns: Pattern[] = Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        task: `task ${i}`,
        input: {},
        output: {},
        reward: 0.9,
        success: true,
        critique: '', // Empty critique
        timestamp: Date.now(),
        tokensUsed: 100,
        latencyMs: 100,
        embedding: new Float32Array(384),
      }));

      const distilled = distiller.distillPatterns(patterns);

      expect(distilled).toBeDefined();
      expect(distilled.keyLearnings).toBeDefined();
      // May have empty learnings, but shouldn't crash
    });

    it('should handle patterns with identical tasks', () => {
      const patterns: Pattern[] = Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        task: 'identical task', // Same task
        input: {},
        output: {},
        reward: 0.8 + i * 0.02,
        success: true,
        critique: `Critique ${i}`,
        timestamp: Date.now(),
        tokensUsed: 100,
        latencyMs: 100,
        embedding: new Float32Array(384),
      }));

      const distilled = distiller.distillPatterns(patterns);

      expect(distilled).toBeDefined();
      expect(distilled.consolidationCount).toBe(5);
    });
  });

  describe('ReasoningBank edge cases', () => {
    let reasoningBank: ReasoningBank;

    beforeEach(() => {
      const vectorDB = new MockVectorDatabase();
      reasoningBank = new ReasoningBank(vectorDB as any, {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
        enableHNSW: true,
      });
    });

    it('should handle retrieve with no stored patterns', async () => {
      const patterns = await reasoningBank.retrieve('anything', 5);
      expect(patterns).toEqual([]);
    });

    it('should handle searchPatterns with no matches', async () => {
      const id = await reasoningBank.startTrajectory('session', 'Task A', {});
      await reasoningBank.endTrajectory(id, {}, true);
      await reasoningBank.judge(id, true, 0.9, 'Excellent');
      await reasoningBank.distill(id);

      const results = await reasoningBank.searchPatterns('completely different task', {
        onlySuccesses: true,
        minReward: 0.99, // Very high threshold
      });

      // May return empty or low-similarity results
      expect(results).toBeDefined();
    });

    it('should handle trajectory with missing steps', async () => {
      const id = await reasoningBank.startTrajectory('session', 'Task', {});

      // End without adding steps
      await reasoningBank.endTrajectory(id, {}, true);

      const verdict = await reasoningBank.judge(id, true, 0.8, 'Completed');
      expect(verdict).toBeDefined();

      const distilled = await reasoningBank.distill(id);
      expect(distilled).toBeDefined();
    });

    it('should handle rapid trajectory creation and deletion', async () => {
      const ids = [];

      for (let i = 0; i < 100; i++) {
        const id = await reasoningBank.startTrajectory(`session-${i}`, `Task ${i}`, {});
        ids.push(id);
        await reasoningBank.endTrajectory(id, {}, true);
        await reasoningBank.judge(id, true, 0.8, 'Test');
        await reasoningBank.distill(id);
      }

      const stats = await reasoningBank.getStats();
      expect(stats.totalPatterns).toBe(100);
    });

    it('should handle patterns with extreme reward values', async () => {
      const id = await reasoningBank.startTrajectory('session', 'Task', {});
      await reasoningBank.endTrajectory(id, {}, true);

      // Try to set reward outside 0-1 range
      const verdict = await reasoningBank.judge(id, true, 999.9, 'Test');

      // Should clamp to 0-1
      expect(verdict.reward).toBeGreaterThanOrEqual(0);
      expect(verdict.reward).toBeLessThanOrEqual(1);
    });

    it('should handle concurrent judgments', async () => {
      const ids = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const id = await reasoningBank.startTrajectory('session', `Task ${i}`, {});
          await reasoningBank.endTrajectory(id, {}, true);
          return id;
        })
      );

      // Judge all concurrently
      const verdicts = await Promise.all(
        ids.map(id => reasoningBank.judge(id, true, 0.9, 'Test'))
      );

      expect(verdicts).toHaveLength(10);
      expect(verdicts.every(v => v.success)).toBe(true);
    });
  });

  describe('Memory and resource limits', () => {
    it('should handle very long strings in critiques', async () => {
      const vectorDB = new MockVectorDatabase();
      const reasoningBank = new ReasoningBank(vectorDB as any, {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
      });

      const id = await reasoningBank.startTrajectory('session', 'Task', {});
      await reasoningBank.endTrajectory(id, {}, true);

      // Very long critique (10KB)
      const longCritique = 'x'.repeat(10000);
      const verdict = await reasoningBank.judge(id, true, 0.9, longCritique);

      expect(verdict).toBeDefined();
      expect(verdict.critique.length).toBe(10000);
    });

    it('should handle deeply nested input objects', async () => {
      const vectorDB = new MockVectorDatabase();
      const reasoningBank = new ReasoningBank(vectorDB as any, {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
      });

      // Create deeply nested object
      let nested: any = { value: 'leaf' };
      for (let i = 0; i < 100; i++) {
        nested = { child: nested };
      }

      const id = await reasoningBank.startTrajectory('session', 'Task', nested);
      await reasoningBank.endTrajectory(id, nested, true);

      expect(id).toBeDefined();
    });

    it('should handle large arrays in input/output', async () => {
      const vectorDB = new MockVectorDatabase();
      const reasoningBank = new ReasoningBank(vectorDB as any, {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
      });

      const largeArray = Array.from({ length: 10000 }, (_, i) => i);

      const id = await reasoningBank.startTrajectory('session', 'Task', { data: largeArray });
      await reasoningBank.endTrajectory(id, { result: largeArray }, true);

      const verdict = await reasoningBank.judge(id, true, 0.9, 'Test');
      expect(verdict).toBeDefined();
    });
  });
});
