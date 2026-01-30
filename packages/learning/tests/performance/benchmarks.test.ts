/**
 * Performance benchmarks for Learning package
 * Validates that all components meet performance targets
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
    const results = Array.from(this.data.entries())
      .map(([id, { metadata }]) => ({ id, distance: Math.random(), metadata }))
      .slice(0, k);
    return results;
  }

  getSize(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }
}

describe('Performance Benchmarks', () => {
  const PERFORMANCE_TARGETS = {
    trajectoryRecording: 10, // <10ms overhead per step
    patternRetrieval: 10, // <10ms for 1M patterns (HNSW)
    patternDistillation: 100, // <100ms per pattern
    ewcConsolidation: 500, // <500ms per batch
    judgmentLatency: 50, // <50ms per trajectory
  };

  describe('TrajectoryTracker Performance', () => {
    let tracker: TrajectoryTracker;

    beforeEach(() => {
      tracker = new TrajectoryTracker();
    });

    it('should track 1000 steps in <10ms', () => {
      const id = tracker.startTrajectory('session', 'Benchmark', {});

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        tracker.addStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thought ${i}`,
          timestamp: Date.now(),
        });
      }

      const elapsed = performance.now() - start;

      console.log(`TrajectoryTracker: 1000 steps in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.trajectoryRecording);
    });

    it('should handle 10,000 concurrent trajectories efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        const id = tracker.startTrajectory(`session-${i}`, `Task ${i}`, {});
        tracker.addStep(id, {
          action: 'Action',
          observation: 'Observation',
          thought: 'Thought',
          timestamp: Date.now(),
        });
      }

      const elapsed = performance.now() - start;

      console.log(`TrajectoryTracker: 10k trajectories in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(1000); // <1s for 10k trajectories
    });

    it('should query trajectories in <1ms', () => {
      // Create test data
      for (let i = 0; i < 1000; i++) {
        tracker.startTrajectory(`session-${i % 10}`, `Task ${i}`, {});
      }

      const start = performance.now();
      tracker.getSessionTrajectories('session-5');
      tracker.getActiveTrajectories();
      tracker.getCompletedTrajectories();
      tracker.getStats();
      const elapsed = performance.now() - start;

      console.log(`TrajectoryTracker: Query operations in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(1);
    });
  });

  describe('VerdictJudge Performance', () => {
    let judge: VerdictJudge;

    beforeEach(() => {
      judge = new VerdictJudge();
    });

    const createTrajectory = (): Trajectory => ({
      id: `traj-${Date.now()}-${Math.random()}`,
      sessionId: 'session',
      task: 'Test task',
      input: {},
      steps: Array.from({ length: 10 }, (_, i) => ({
        action: `Action ${i}`,
        observation: `Observation ${i}`,
        thought: `Thought ${i}`,
        timestamp: Date.now(),
      })),
      output: { result: 'success' },
      success: true,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      totalLatencyMs: 1000,
    });

    it('should judge trajectory in <50ms', () => {
      const trajectory = createTrajectory();

      const start = performance.now();
      judge.judge(trajectory);
      const elapsed = performance.now() - start;

      console.log(`VerdictJudge: Single judgment in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.judgmentLatency);
    });

    it('should handle 1000 judgments in <500ms', () => {
      const trajectories = Array.from({ length: 1000 }, () => createTrajectory());

      const start = performance.now();
      trajectories.forEach(t => judge.judge(t));
      const elapsed = performance.now() - start;

      console.log(`VerdictJudge: 1000 judgments in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(500);
      expect(elapsed / 1000).toBeLessThan(PERFORMANCE_TARGETS.judgmentLatency);
    });

    it('should judge with patterns in <100ms', () => {
      const trajectory = createTrajectory();

      const patterns: Pattern[] = Array.from({ length: 10 }, (_, i) => ({
        id: `pattern-${i}`,
        task: `Task ${i}`,
        input: {},
        output: {},
        reward: 0.8 + Math.random() * 0.2,
        success: true,
        critique: `Pattern ${i} critique with optimization tips`,
        timestamp: Date.now(),
        tokensUsed: 1000,
        latencyMs: 1000,
        embedding: new Float32Array(384),
      }));

      const start = performance.now();
      judge.judgeWithPatterns(trajectory, patterns);
      const elapsed = performance.now() - start;

      console.log(`VerdictJudge: Pattern-based judgment in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('MemoryDistiller Performance', () => {
    let distiller: MemoryDistiller;

    beforeEach(() => {
      distiller = new MemoryDistiller();
    });

    const createPattern = (id: string): Pattern => ({
      id,
      task: `Task ${id}`,
      input: {},
      output: {},
      reward: 0.8 + Math.random() * 0.2,
      success: true,
      critique: 'Successfully implemented feature with good optimization and test coverage',
      timestamp: Date.now(),
      tokensUsed: 1000,
      latencyMs: 1000,
      embedding: new Float32Array(384).map(() => Math.random()),
    });

    it('should distill pattern in <100ms', () => {
      const trajectory: Trajectory = {
        id: 'traj-1',
        sessionId: 'session',
        task: 'Test task',
        input: {},
        steps: Array.from({ length: 10 }, (_, i) => ({
          action: `Action ${i}`,
          observation: `Observation ${i}`,
          thought: `Thought ${i}`,
          timestamp: Date.now(),
        })),
        output: {},
        success: true,
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        totalLatencyMs: 1000,
      };

      const start = performance.now();
      distiller.distillTrajectory(trajectory, {
        success: true,
        reward: 0.9,
        critique: 'Excellent implementation',
      });
      const elapsed = performance.now() - start;

      console.log(`MemoryDistiller: Single distillation in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.patternDistillation);
    });

    it('should consolidate multiple patterns in <200ms', () => {
      const patterns = Array.from({ length: 10 }, (_, i) => createPattern(`pattern-${i}`));

      const start = performance.now();
      distiller.distillPatterns(patterns);
      const elapsed = performance.now() - start;

      console.log(`MemoryDistiller: Consolidate 10 patterns in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(200);
    });

    it('should handle 100 pattern distillations in <1s', () => {
      const trajectory: Trajectory = {
        id: 'traj',
        sessionId: 'session',
        task: 'Test',
        input: {},
        steps: [],
        output: {},
        success: true,
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        totalLatencyMs: 1000,
      };

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        distiller.distillTrajectory(trajectory, {
          success: true,
          reward: 0.9,
          critique: 'Test',
        });
      }

      const elapsed = performance.now() - start;

      console.log(`MemoryDistiller: 100 distillations in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('EWCConsolidator Performance', () => {
    let consolidator: EWCConsolidator;

    beforeEach(() => {
      consolidator = new EWCConsolidator();
    });

    const createDistilledPattern = () => {
      const pattern: Pattern = {
        id: `pattern-${Date.now()}-${Math.random()}`,
        task: 'Test task',
        input: {},
        output: {},
        reward: 0.9,
        success: true,
        critique: 'Excellent',
        timestamp: Date.now(),
        tokensUsed: 1000,
        latencyMs: 1000,
        embedding: new Float32Array(384).map(() => Math.random()),
      };

      return {
        originalPattern: pattern,
        keyLearnings: ['Learning 1', 'Learning 2'],
        applicability: ['Condition 1'],
        antiPatterns: [],
        consolidatedReward: 0.9,
        consolidationCount: 5,
      };
    };

    it('should consolidate pattern in <500ms', () => {
      const pattern = createDistilledPattern();

      const start = performance.now();
      consolidator.consolidate(pattern);
      const elapsed = performance.now() - start;

      console.log(`EWCConsolidator: Single consolidation in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.ewcConsolidation);
    });

    it('should handle 100 consolidations in <5s', () => {
      const patterns = Array.from({ length: 100 }, () => createDistilledPattern());

      const start = performance.now();
      patterns.forEach(p => consolidator.consolidate(p));
      const elapsed = performance.now() - start;

      console.log(`EWCConsolidator: 100 consolidations in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    it('should check protection status in <1ms', () => {
      const pattern = createDistilledPattern();
      consolidator.consolidate(pattern);

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        consolidator.isProtected(pattern.originalPattern.id);
      }

      const elapsed = performance.now() - start;

      console.log(`EWCConsolidator: 1000 protection checks in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(10);
    });

    it('should compute EWC loss in <10ms', () => {
      const pattern = createDistilledPattern();
      consolidator.consolidate(pattern, { lambda: 0.5 });

      const oldEmbedding = pattern.originalPattern.embedding!;
      const newEmbedding = new Float32Array(384).map(() => Math.random());

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        consolidator.computeEWCLoss(
          pattern.originalPattern.id,
          oldEmbedding,
          newEmbedding
        );
      }

      const elapsed = performance.now() - start;

      console.log(`EWCConsolidator: 100 loss computations in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('PatternMatcher Performance', () => {
    let matcher: PatternMatcher;

    beforeEach(() => {
      matcher = new PatternMatcher();
    });

    const createPattern = (id: string): Pattern => ({
      id,
      task: `Task ${id}`,
      input: {},
      output: {},
      reward: 0.8 + Math.random() * 0.2,
      success: true,
      critique: 'Good',
      timestamp: Date.now(),
      tokensUsed: 1000,
      latencyMs: 1000,
      embedding: new Float32Array(384).map(() => Math.random()),
    });

    it('should find similar patterns in <50ms for 1000 patterns', () => {
      const patterns = Array.from({ length: 1000 }, (_, i) => createPattern(`pattern-${i}`));
      const query = new Float32Array(384).map(() => Math.random());

      const start = performance.now();
      matcher.findSimilar(query, patterns, { k: 10 });
      const elapsed = performance.now() - start;

      console.log(`PatternMatcher: Search 1000 patterns in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(50);
    });

    it('should cluster 500 patterns in <1s', () => {
      const patterns = Array.from({ length: 500 }, (_, i) => createPattern(`pattern-${i}`));

      const start = performance.now();
      matcher.clusterPatterns(patterns, 0.85);
      const elapsed = performance.now() - start;

      console.log(`PatternMatcher: Cluster 500 patterns in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should compute diversity in <100ms for 100 patterns', () => {
      const patterns = Array.from({ length: 100 }, (_, i) => createPattern(`pattern-${i}`));

      const start = performance.now();
      matcher.computeDiversity(patterns);
      const elapsed = performance.now() - start;

      console.log(`PatternMatcher: Compute diversity in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });

    it('should select diverse subset in <200ms', () => {
      const patterns = Array.from({ length: 200 }, (_, i) => createPattern(`pattern-${i}`));
      const query = new Float32Array(384).map(() => Math.random());

      const start = performance.now();
      matcher.selectDiverse(query, patterns, 10, 0.5);
      const elapsed = performance.now() - start;

      console.log(`PatternMatcher: Select diverse subset in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('ReasoningBank End-to-End Performance', () => {
    let reasoningBank: ReasoningBank;
    let vectorDB: MockVectorDatabase;

    beforeEach(() => {
      vectorDB = new MockVectorDatabase();
      reasoningBank = new ReasoningBank(vectorDB as any, {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
        enableHNSW: true,
      });
    });

    it('should complete full pipeline in <500ms', async () => {
      const start = performance.now();

      // Start trajectory
      const id = await reasoningBank.startTrajectory('session', 'Task', { input: 'data' });

      // Add steps
      for (let i = 0; i < 5; i++) {
        await reasoningBank.addTrajectoryStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thought ${i}`,
          timestamp: Date.now(),
        });
      }

      // End trajectory
      await reasoningBank.endTrajectory(id, { success: true }, true);

      // Judge
      await reasoningBank.judge(id, true, 0.9, 'Excellent');

      // Distill
      const distilled = await reasoningBank.distill(id);

      // Consolidate
      await reasoningBank.consolidate(distilled);

      const elapsed = performance.now() - start;

      console.log(`ReasoningBank: Full pipeline in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(500);
    });

    it('should handle 100 patterns with <10ms retrieval', async () => {
      // Create 100 patterns
      for (let i = 0; i < 100; i++) {
        const id = await reasoningBank.startTrajectory('session', `Task ${i}`, {});
        await reasoningBank.endTrajectory(id, {}, true);
        await reasoningBank.judge(id, true, 0.8 + Math.random() * 0.2, 'Good');
        await reasoningBank.distill(id);
      }

      // Test retrieval performance
      const start = performance.now();
      await reasoningBank.retrieve('Task', 10);
      const elapsed = performance.now() - start;

      console.log(`ReasoningBank: Retrieve from 100 patterns in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.patternRetrieval);
    });

    it('should get statistics in <10ms', async () => {
      // Create test data
      for (let i = 0; i < 50; i++) {
        const id = await reasoningBank.startTrajectory('session', `Task ${i}`, {});
        await reasoningBank.endTrajectory(id, {}, i % 2 === 0);
        await reasoningBank.judge(id, i % 2 === 0, 0.5 + Math.random() * 0.5, 'Test');
        await reasoningBank.distill(id);
      }

      const start = performance.now();
      await reasoningBank.getStats();
      const elapsed = performance.now() - start;

      console.log(`ReasoningBank: Get statistics in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('Memory efficiency', () => {
    it('should handle 10,000 patterns without memory issues', async () => {
      const vectorDB = new MockVectorDatabase();
      const reasoningBank = new ReasoningBank(vectorDB as any, {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
        enableHNSW: true,
      });

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        const id = await reasoningBank.startTrajectory(`session-${i % 100}`, `Task ${i}`, {});
        await reasoningBank.endTrajectory(id, {}, true);
        await reasoningBank.judge(id, true, 0.8, 'Good');
        await reasoningBank.distill(id);
      }

      const elapsed = performance.now() - start;

      console.log(`Memory test: 10k patterns in ${(elapsed / 1000).toFixed(2)}s`);
      expect(vectorDB.getSize()).toBe(10000);
    });
  });
});
