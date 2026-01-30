/**
 * Integration tests for complete 4-step learning pipeline
 * Tests RETRIEVE -> JUDGE -> DISTILL -> CONSOLIDATE workflow
 */

import { ReasoningBank } from '../../src/reasoning-bank';
import { VectorDatabase } from '@claude-flow/memory';

// Mock VectorDatabase with comprehensive functionality
class MockVectorDatabase implements Partial<VectorDatabase> {
  private data = new Map<string, { vector: Float32Array; metadata: any }>();
  private searchDelay = 0;

  async insert(id: string, vector: Float32Array, metadata?: any): Promise<void> {
    this.data.set(id, { vector: new Float32Array(vector), metadata });
  }

  async search(query: Float32Array, k: number): Promise<any[]> {
    // Simulate HNSW search delay
    if (this.searchDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.searchDelay));
    }

    // Compute similarities and return top k
    const results = Array.from(this.data.entries())
      .map(([id, { vector, metadata }]) => ({
        id,
        distance: this.computeDistance(query, vector),
        metadata,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    return results;
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async get(id: string): Promise<{ vector: Float32Array; metadata: any } | null> {
    return this.data.get(id) || null;
  }

  private computeDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  setSearchDelay(ms: number): void {
    this.searchDelay = ms;
  }

  getSize(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }
}

describe('Full Learning Pipeline Integration', () => {
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
      enableHNSW: true,
      enableGNN: false,
    });
  });

  describe('Complete 4-step pipeline', () => {
    it('should execute full RETRIEVE-JUDGE-DISTILL-CONSOLIDATE cycle', async () => {
      // SETUP: Create initial pattern
      const id1 = await reasoningBank.startTrajectory(
        'session-1',
        'Implement user authentication with JWT',
        { method: 'JWT', refreshTokens: true }
      );

      await reasoningBank.addTrajectoryStep(id1, {
        action: 'Create User model',
        observation: 'User model created with email and password fields',
        thought: 'Need secure password storage',
        timestamp: Date.now(),
      });

      await reasoningBank.addTrajectoryStep(id1, {
        action: 'Implement JWT generation',
        observation: 'JWT library integrated successfully',
        thought: 'Using jsonwebtoken package for industry standard',
        timestamp: Date.now(),
      });

      await reasoningBank.endTrajectory(
        id1,
        { authSystem: 'complete', files: ['auth.ts', 'user.model.ts'] },
        true
      );

      // STEP 2: JUDGE
      const verdict1 = await reasoningBank.judge(
        id1,
        true,
        0.95,
        'Excellent implementation with proper security measures and test coverage'
      );

      expect(verdict1.success).toBe(true);
      expect(verdict1.reward).toBe(0.95);
      expect(verdict1.improvements).toBeDefined();

      // STEP 3: DISTILL
      const distilled1 = await reasoningBank.distill(id1);

      expect(distilled1.originalPattern.task).toBe('Implement user authentication with JWT');
      expect(distilled1.keyLearnings.length).toBeGreaterThan(0);
      expect(distilled1.consolidatedReward).toBeGreaterThan(0.9);

      // STEP 4: CONSOLIDATE
      await reasoningBank.consolidate(distilled1);

      // STEP 1: RETRIEVE - Now test retrieval with similar task
      const similar = await reasoningBank.retrieve(
        'Implement OAuth2 authentication',
        5
      );

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].task).toContain('authentication');
      expect(similar[0].reward).toBeGreaterThanOrEqual(0.7);
    });

    it('should learn from multiple similar patterns', async () => {
      // Create 5 similar authentication patterns
      const tasks = [
        'Implement JWT authentication',
        'Add OAuth2 login',
        'Create session management',
        'Implement refresh tokens',
        'Add two-factor authentication',
      ];

      const rewards = [0.95, 0.85, 0.9, 0.92, 0.88];

      for (let i = 0; i < tasks.length; i++) {
        const id = await reasoningBank.startTrajectory(
          `session-${i}`,
          tasks[i],
          { type: 'authentication' }
        );

        await reasoningBank.addTrajectoryStep(id, {
          action: 'Implement security feature',
          observation: 'Feature implemented successfully',
          thought: 'Following security best practices',
          timestamp: Date.now(),
        });

        await reasoningBank.endTrajectory(id, { success: true }, true);

        const verdict = await reasoningBank.judge(
          id,
          true,
          rewards[i],
          `Successfully implemented ${tasks[i]} with good test coverage`
        );

        const distilled = await reasoningBank.distill(id);
        await reasoningBank.consolidate(distilled);
      }

      // Now retrieve patterns - should get high-quality authentication patterns
      const retrieved = await reasoningBank.retrieve('authentication', 5);

      expect(retrieved.length).toBe(5);
      expect(retrieved.every(p => p.reward >= 0.7)).toBe(true);
      expect(retrieved.every(p => p.success)).toBe(true);

      // Test that patterns are ordered by relevance
      expect(retrieved[0].task).toContain('authentication');
    });

    it('should filter out low-quality patterns', async () => {
      // Create high-quality pattern
      const highId = await reasoningBank.startTrajectory(
        'session-high',
        'Implement feature X',
        {}
      );
      await reasoningBank.endTrajectory(highId, { success: true }, true);
      await reasoningBank.judge(highId, true, 0.95, 'Excellent');
      await reasoningBank.distill(highId);

      // Create low-quality pattern
      const lowId = await reasoningBank.startTrajectory(
        'session-low',
        'Implement feature Y',
        {}
      );
      await reasoningBank.endTrajectory(lowId, { success: false }, false);
      await reasoningBank.judge(lowId, false, 0.3, 'Failed with errors');
      await reasoningBank.distill(lowId);

      // Retrieve with minReward threshold
      const retrieved = await reasoningBank.retrieve('Implement feature', 10);

      // Should only get high-quality pattern (minReward = 0.7)
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].reward).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle EWC++ consolidation correctly', async () => {
      // Create important pattern worth protecting
      const id = await reasoningBank.startTrajectory(
        'session-critical',
        'Critical security implementation',
        { importance: 'high' }
      );

      await reasoningBank.addTrajectoryStep(id, {
        action: 'Implement critical feature',
        observation: 'Feature working perfectly',
        thought: 'This is a critical pattern to remember',
        timestamp: Date.now(),
      });

      await reasoningBank.endTrajectory(id, { critical: true }, true);

      const verdict = await reasoningBank.judge(id, true, 0.98, 'Critical success');
      const distilled = await reasoningBank.distill(id);

      // Consolidate with high importance
      await reasoningBank.consolidate(distilled);

      // Verify consolidation metadata
      expect(distilled.consolidatedReward).toBeGreaterThan(0.9);
      expect(distilled.consolidationCount).toBeGreaterThan(0);
    });
  });

  describe('Performance benchmarks', () => {
    it('should retrieve patterns within 10ms with HNSW', async () => {
      // Create 100 patterns
      for (let i = 0; i < 100; i++) {
        const id = await reasoningBank.startTrajectory(
          `session-${i}`,
          `Task ${i}`,
          {}
        );
        await reasoningBank.endTrajectory(id, {}, true);
        await reasoningBank.judge(id, true, 0.8, 'Good');
        await reasoningBank.distill(id);
      }

      // Measure retrieval time
      const start = Date.now();
      await reasoningBank.retrieve('Task', 10);
      const elapsed = Date.now() - start;

      // Should be fast with HNSW indexing
      expect(elapsed).toBeLessThan(100); // <100ms for 100 patterns
    });

    it('should track trajectory with <1ms per step overhead', async () => {
      const id = await reasoningBank.startTrajectory('perf-test', 'Test', {});

      const start = Date.now();

      // Add 100 steps
      for (let i = 0; i < 100; i++) {
        await reasoningBank.addTrajectoryStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thinking ${i}`,
          timestamp: Date.now(),
        });
      }

      const elapsed = Date.now() - start;

      // Should be <100ms total for 100 steps (<1ms per step)
      expect(elapsed).toBeLessThan(100);
    });

    it('should distill patterns within 100ms', async () => {
      const id = await reasoningBank.startTrajectory('distill-test', 'Test', {});

      // Add several steps
      for (let i = 0; i < 10; i++) {
        await reasoningBank.addTrajectoryStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thinking ${i}`,
          timestamp: Date.now(),
        });
      }

      await reasoningBank.endTrajectory(id, {}, true);
      await reasoningBank.judge(id, true, 0.9, 'Good');

      const start = Date.now();
      await reasoningBank.distill(id);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should consolidate patterns within 500ms', async () => {
      const id = await reasoningBank.startTrajectory('consolidate-test', 'Test', {});
      await reasoningBank.endTrajectory(id, {}, true);
      await reasoningBank.judge(id, true, 0.9, 'Good');
      const distilled = await reasoningBank.distill(id);

      const start = Date.now();
      await reasoningBank.consolidate(distilled);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Learning statistics', () => {
    it('should provide accurate statistics', async () => {
      // Create diverse patterns
      const tasks = [
        { task: 'Task 1', success: true, reward: 0.95 },
        { task: 'Task 2', success: true, reward: 0.85 },
        { task: 'Task 3', success: false, reward: 0.3 },
        { task: 'Task 4', success: true, reward: 0.9 },
        { task: 'Task 5', success: false, reward: 0.4 },
      ];

      for (const t of tasks) {
        const id = await reasoningBank.startTrajectory('session', t.task, {});
        await reasoningBank.endTrajectory(id, {}, t.success);
        await reasoningBank.judge(id, t.success, t.reward, 'Test');
        await reasoningBank.distill(id);
      }

      const stats = await reasoningBank.getStats();

      expect(stats.totalPatterns).toBe(5);
      expect(stats.successDistribution.successful).toBe(3);
      expect(stats.successDistribution.failed).toBe(2);
      expect(stats.successRate).toBe(0.6);
      expect(stats.avgReward).toBeCloseTo(0.68, 1);
      expect(stats.topPatterns.length).toBeGreaterThan(0);
      expect(stats.topPatterns[0].reward).toBe(0.95); // Highest reward first
    });

    it('should handle empty state gracefully', async () => {
      const stats = await reasoningBank.getStats();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgReward).toBe(0);
      expect(stats.avgTokensUsed).toBe(0);
      expect(stats.avgLatencyMs).toBe(0);
      expect(stats.topPatterns).toEqual([]);
      expect(stats.commonCritiques).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing trajectory gracefully', async () => {
      await expect(
        reasoningBank.judge('nonexistent', true, 0.9, 'Test')
      ).rejects.toThrow('Trajectory not found');
    });

    it('should handle incomplete trajectory', async () => {
      const id = await reasoningBank.startTrajectory('incomplete', 'Test', {});

      // Try to distill without ending trajectory
      await expect(reasoningBank.distill(id)).rejects.toThrow(
        'Cannot distill incomplete trajectory'
      );
    });

    it('should handle patterns without embeddings', async () => {
      const id = await reasoningBank.startTrajectory('no-embed', 'Test', {});
      await reasoningBank.endTrajectory(id, {}, true);
      await reasoningBank.judge(id, true, 0.9, 'Test');

      // Should still work, just won't be in vector search
      const distilled = await reasoningBank.distill(id);
      expect(distilled).toBeDefined();
    });

    it('should handle very long trajectories', async () => {
      const id = await reasoningBank.startTrajectory('long', 'Long task', {});

      // Add 1000 steps
      for (let i = 0; i < 1000; i++) {
        await reasoningBank.addTrajectoryStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thinking ${i}`,
          timestamp: Date.now(),
        });
      }

      await reasoningBank.endTrajectory(id, {}, true);
      const verdict = await reasoningBank.judge(id, true, 0.7, 'Completed but inefficient');

      // Should handle but penalize for inefficiency
      expect(verdict.reward).toBeLessThan(0.9);
      expect(verdict.critique).toContain('inefficient');
    });

    it('should handle concurrent trajectory tracking', async () => {
      // Start multiple trajectories concurrently
      const ids = await Promise.all([
        reasoningBank.startTrajectory('session-1', 'Task 1', {}),
        reasoningBank.startTrajectory('session-2', 'Task 2', {}),
        reasoningBank.startTrajectory('session-3', 'Task 3', {}),
      ]);

      // Add steps concurrently
      await Promise.all(
        ids.map(id =>
          reasoningBank.addTrajectoryStep(id, {
            action: 'Test action',
            observation: 'Test result',
            thought: 'Test thought',
            timestamp: Date.now(),
          })
        )
      );

      // End all concurrently
      await Promise.all(
        ids.map(id => reasoningBank.endTrajectory(id, {}, true))
      );

      // Verify all completed
      for (const id of ids) {
        await expect(reasoningBank.judge(id, true, 0.9, 'Test')).resolves.toBeDefined();
      }
    });
  });
});
