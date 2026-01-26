import { VerdictJudge } from '../src/verdict/judge';
import { Trajectory, Pattern } from '../src/types';

describe('VerdictJudge', () => {
  let judge: VerdictJudge;

  beforeEach(() => {
    judge = new VerdictJudge();
  });

  const createMockTrajectory = (success: boolean): Trajectory => ({
    id: 'traj-1',
    sessionId: 'session-1',
    task: 'test task',
    input: {},
    output: { result: 'done' },
    success,
    steps: [
      {
        action: 'step1',
        observation: 'obs1',
        thought: 'thought1',
        timestamp: Date.now(),
      },
    ],
    startTime: Date.now() - 1000,
    endTime: Date.now(),
    totalLatencyMs: 1000,
  });

  describe('judge', () => {
    it('should judge successful trajectory positively', () => {
      const trajectory = createMockTrajectory(true);
      const verdict = judge.judge(trajectory);

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBeGreaterThan(0.5);
      expect(verdict.critique).toContain('successfully');
      expect(verdict.confidence).toBeGreaterThan(0);
    });

    it('should judge failed trajectory negatively', () => {
      const trajectory = createMockTrajectory(false);
      const verdict = judge.judge(trajectory);

      expect(verdict.success).toBe(false);
      expect(verdict.reward).toBeLessThan(0.5);
      expect(verdict.critique).toContain('not meet');
    });

    it('should throw on incomplete trajectory', () => {
      const trajectory = createMockTrajectory(true);
      trajectory.success = undefined;

      expect(() => judge.judge(trajectory)).toThrow(
        'Trajectory must be completed'
      );
    });

    it('should apply custom criteria', () => {
      const trajectory = createMockTrajectory(true);
      const verdict = judge.judge(trajectory, {
        minSuccessRate: 0.9,
        customEvaluator: () => 0.95,
      });

      expect(verdict.reward).toBeGreaterThan(0.8);
    });

    it('should generate improvements for inefficient execution', () => {
      const trajectory = createMockTrajectory(true);
      trajectory.totalLatencyMs = 35000; // Exceeds default max

      const verdict = judge.judge(trajectory);

      expect(verdict.improvements.length).toBeGreaterThan(0);
      expect(verdict.improvements.some(i => i.includes('Performance'))).toBe(true);
    });
  });

  describe('judgeWithPatterns', () => {
    const createMockPattern = (success: boolean, reward: number): Pattern => ({
      id: `pattern-${Math.random()}`,
      task: 'test task',
      input: {},
      output: {},
      success,
      reward,
      critique: success ? 'Good implementation' : 'Failed due to timeout',
      timestamp: Date.now(),
      tokensUsed: 100,
      latencyMs: 500,
    });

    it('should judge based on similar patterns', () => {
      const trajectory = createMockTrajectory(true);
      const patterns = [
        createMockPattern(true, 0.9),
        createMockPattern(true, 0.85),
        createMockPattern(false, 0.3),
      ];

      const verdict = judge.judgeWithPatterns(trajectory, patterns);

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBeGreaterThan(0.5);
      expect(verdict.confidence).toBeGreaterThan(0);
    });

    it('should use basic judgment when no patterns available', () => {
      const trajectory = createMockTrajectory(true);
      const verdict = judge.judgeWithPatterns(trajectory, []);

      expect(verdict).toBeDefined();
      expect(verdict.success).toBe(true);
    });

    it('should extract improvements from successful patterns', () => {
      const trajectory = createMockTrajectory(true);
      const patterns = [
        {
          ...createMockPattern(true, 0.9),
          critique: 'Good optimization and error handling',
        },
      ];

      const verdict = judge.judgeWithPatterns(trajectory, patterns);

      expect(verdict.improvements.length).toBeGreaterThan(0);
    });

    it('should consider success rate in verdict', () => {
      const trajectory = createMockTrajectory(true);

      // High success rate
      const successfulPatterns = Array(8)
        .fill(null)
        .map(() => createMockPattern(true, 0.9));
      const failedPatterns = Array(2)
        .fill(null)
        .map(() => createMockPattern(false, 0.2));

      const verdict = judge.judgeWithPatterns(trajectory, [
        ...successfulPatterns,
        ...failedPatterns,
      ]);

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBeGreaterThan(0.7);
    });
  });
});
