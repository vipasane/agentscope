import { describe, it, expect } from 'vitest';
import { VerdictJudge } from '../src/core/VerdictJudge.js';
import type { Trajectory } from '../src/types/index.js';

const createTestTrajectory = (overrides: Partial<Trajectory> = {}): Trajectory => ({
  id: 'traj-1',
  sessionId: 'session-1',
  task: 'Test task',
  input: {},
  steps: [
    { action: 'do', observation: 'done', thought: 'thinking', timestamp: Date.now() }
  ],
  output: { result: 'success' },
  success: true,
  startTime: Date.now() - 1000,
  endTime: Date.now(),
  totalTokens: 100,
  totalLatencyMs: 1000,
  ...overrides,
});

describe('VerdictJudge', () => {
  describe('judge', () => {
    it('should assign high reward for successful fast execution', () => {
      const judge = new VerdictJudge();
      const trajectory = createTestTrajectory({
        success: true,
        totalLatencyMs: 1000,
        totalTokens: 500,
      });

      const verdict = judge.judge(trajectory);

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBeGreaterThan(0.7);
      expect(verdict.critique).toBeTruthy();
      expect(verdict.improvements).toBeInstanceOf(Array);
    });

    it('should assign low reward for failed execution', () => {
      const judge = new VerdictJudge();
      const trajectory = createTestTrajectory({ success: false });

      const verdict = judge.judge(trajectory);

      expect(verdict.success).toBe(false);
      expect(verdict.reward).toBeLessThan(0.5);
    });
  });
});
