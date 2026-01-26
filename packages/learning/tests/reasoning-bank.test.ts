import { ReasoningBank } from '../src/reasoning-bank';
import { VectorDatabase } from '@claude-flow/memory';

// Mock VectorDatabase
class MockVectorDatabase implements Partial<VectorDatabase> {
  private data = new Map<string, { vector: Float32Array; metadata: any }>();

  async insert(id: string, vector: Float32Array, metadata?: any): Promise<void> {
    this.data.set(id, { vector, metadata });
  }

  async search(query: Float32Array, k: number): Promise<any[]> {
    return Array.from(this.data.entries())
      .map(([id, { metadata }]) => ({ id, distance: 0.1, metadata }))
      .slice(0, k);
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }
}

describe('ReasoningBank', () => {
  let vectorDB: MockVectorDatabase;
  let reasoningBank: ReasoningBank;

  beforeEach(() => {
    vectorDB = new MockVectorDatabase();
    reasoningBank = new ReasoningBank(vectorDB as any, {
      retrievalK: 5,
      minReward: 0.7,
      ewcLambda: 0.5,
      distillationEpochs: 10,
      learningRate: 0.001,
    });
  });

  describe('4-step learning pipeline', () => {
    it('should complete full learning cycle', async () => {
      // 1. Start trajectory
      const trajectoryId = await reasoningBank.startTrajectory(
        'session-1',
        'implement authentication',
        { requirement: 'JWT tokens' }
      );

      expect(trajectoryId).toMatch(/^traj-/);

      // Add steps
      await reasoningBank.addTrajectoryStep(trajectoryId, {
        action: 'create User model',
        observation: 'model created',
        thought: 'need user data structure',
        timestamp: Date.now(),
      });

      await reasoningBank.addTrajectoryStep(trajectoryId, {
        action: 'implement JWT generation',
        observation: 'JWT library integrated',
        thought: 'use jsonwebtoken package',
        timestamp: Date.now(),
      });

      // End trajectory
      await reasoningBank.endTrajectory(
        trajectoryId,
        { authSystem: 'complete' },
        true
      );

      // 2. JUDGE
      const verdict = await reasoningBank.judge(
        trajectoryId,
        true,
        0.95,
        'Excellent implementation with proper security'
      );

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBe(0.95);
      expect(verdict.critique).toContain('security');

      // 3. DISTILL
      const distilled = await reasoningBank.distill(trajectoryId);

      expect(distilled).toBeDefined();
      expect(distilled.originalPattern.task).toBe('implement authentication');
      expect(distilled.consolidatedReward).toBeGreaterThan(0);

      // 4. CONSOLIDATE
      await reasoningBank.consolidate(distilled);

      // Verify consolidation
      expect(distilled.consolidationCount).toBeGreaterThan(0);
    });
  });

  describe('retrieve', () => {
    it('should retrieve similar patterns', async () => {
      // Create and store some patterns first
      const id1 = await reasoningBank.startTrajectory(
        'session-1',
        'test task 1',
        {}
      );
      await reasoningBank.endTrajectory(id1, {}, true);
      await reasoningBank.judge(id1, true, 0.9, 'Good');
      await reasoningBank.distill(id1);

      const id2 = await reasoningBank.startTrajectory(
        'session-1',
        'test task 2',
        {}
      );
      await reasoningBank.endTrajectory(id2, {}, true);
      await reasoningBank.judge(id2, true, 0.85, 'Good');
      await reasoningBank.distill(id2);

      // Retrieve similar
      const similar = await reasoningBank.retrieve('test task', 5);

      expect(similar.length).toBeGreaterThan(0);
    });

    it('should respect minReward threshold', async () => {
      const id = await reasoningBank.startTrajectory(
        'session-1',
        'low quality task',
        {}
      );
      await reasoningBank.endTrajectory(id, {}, false);
      await reasoningBank.judge(id, false, 0.3, 'Poor quality');
      await reasoningBank.distill(id);

      const similar = await reasoningBank.retrieve('low quality', 5);

      // Should not return low-reward patterns (minReward = 0.7)
      expect(similar.every(p => p.reward >= 0.7)).toBe(true);
    });
  });

  describe('searchPatterns', () => {
    it('should search with options', async () => {
      const id = await reasoningBank.startTrajectory(
        'session-1',
        'searchable task',
        {}
      );
      await reasoningBank.endTrajectory(id, {}, true);
      await reasoningBank.judge(id, true, 0.9, 'Excellent');
      await reasoningBank.distill(id);

      const results = await reasoningBank.searchPatterns('searchable', {
        k: 3,
        onlySuccesses: true,
      });

      expect(results.every(p => p.success)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      // Create successful trajectory
      const id1 = await reasoningBank.startTrajectory('session-1', 'task1', {});
      await reasoningBank.endTrajectory(id1, {}, true);
      await reasoningBank.judge(id1, true, 0.9, 'Good');
      await reasoningBank.distill(id1);

      // Create failed trajectory
      const id2 = await reasoningBank.startTrajectory('session-1', 'task2', {});
      await reasoningBank.endTrajectory(id2, {}, false);
      await reasoningBank.judge(id2, false, 0.3, 'Failed');
      await reasoningBank.distill(id2);

      const stats = await reasoningBank.getStats();

      expect(stats.totalPatterns).toBe(2);
      expect(stats.successDistribution.successful).toBe(1);
      expect(stats.successDistribution.failed).toBe(1);
      expect(stats.successRate).toBe(0.5);
      expect(stats.topPatterns.length).toBeGreaterThan(0);
    });

    it('should handle empty state', async () => {
      const stats = await reasoningBank.getStats();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgReward).toBe(0);
    });
  });

  describe('performance metrics', () => {
    it('should track retrieval performance', async () => {
      const before = Date.now();
      await reasoningBank.retrieve('test query', 5);
      const after = Date.now();

      expect(after - before).toBeLessThan(100); // Should be fast
    });
  });
});
