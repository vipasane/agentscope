import { describe, it, expect, beforeEach } from 'vitest';
import { LearningCoordinator } from '../src/core/LearningCoordinator.js';

describe('LearningCoordinator', () => {
  let coordinator: LearningCoordinator;

  beforeEach(() => {
    coordinator = new LearningCoordinator({
      learning: {
        retrievalK: 5,
        minReward: 0.7,
        ewcLambda: 0.5,
        distillationEpochs: 10,
        learningRate: 0.001,
      },
    });
  });

  describe('complete learning cycle', () => {
    it('should complete full 4-step pipeline', () => {
      // Start execution
      const trajectoryId = coordinator.startExecution(
        'session-1',
        'Test task',
        { input: 'data' }
      );

      expect(trajectoryId).toBeTruthy();

      // Record steps
      coordinator.recordStep(trajectoryId, {
        action: 'step1',
        observation: 'obs1',
        thought: 'thinking1',
      });

      coordinator.recordStep(trajectoryId, {
        action: 'step2',
        observation: 'obs2',
        thought: 'thinking2',
      });

      // End execution and learn
      const result = coordinator.endExecution(
        trajectoryId,
        { result: 'success' },
        true
      );

      expect(result.trajectory).toBeTruthy();
      expect(result.verdict).toBeTruthy();
      expect(result.pattern).toBeTruthy();
      expect(result.distilledPattern).toBeTruthy();
      expect(result.verdict.reward).toBeGreaterThanOrEqual(0);
      expect(result.verdict.reward).toBeLessThanOrEqual(1);
    });

    it('should store and retrieve patterns', () => {
      const id = coordinator.startExecution('session-1', 'Auth task', {});
      coordinator.recordStep(id, { action: 'auth', observation: 'ok', thought: 'good' });
      const result = coordinator.endExecution(id, {}, true);

      // Retrieve pattern
      const retrieved = coordinator.getPattern(result.pattern.id);
      expect(retrieved).toEqual(result.pattern);

      // Search patterns
      const patterns = coordinator.retrievePatterns('Auth', { k: 5 });
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should provide learning statistics', () => {
      // Create some patterns
      for (let i = 0; i < 5; i++) {
        const id = coordinator.startExecution('session-1', `Task ${i}`, {});
        coordinator.recordStep(id, { action: 'a', observation: 'o', thought: 't' });
        coordinator.endExecution(id, {}, i % 2 === 0);
      }

      const stats = coordinator.getStats();
      expect(stats.totalPatterns).toBe(5);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.avgReward).toBeGreaterThanOrEqual(0);
    });
  });
});
