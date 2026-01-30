/**
 * Advanced unit tests for VerdictJudge
 * Tests all judgment methods, criteria, and pattern-based evaluation
 */

import { VerdictJudge, JudgmentCriteria } from '../../src/verdict/judge';
import { Trajectory, Pattern } from '../../src/types';

describe('VerdictJudge - Advanced Tests', () => {
  let judge: VerdictJudge;

  beforeEach(() => {
    judge = new VerdictJudge();
  });

  const createTrajectory = (
    success: boolean,
    stepCount: number,
    latencyMs: number
  ): Trajectory => ({
    id: `traj-${Date.now()}`,
    sessionId: 'session-1',
    task: 'Test task',
    input: {},
    steps: Array.from({ length: stepCount }, (_, i) => ({
      action: `Action ${i}`,
      observation: `Observation ${i}`,
      thought: `Thought ${i}`,
      timestamp: Date.now(),
    })),
    output: { result: 'test' },
    success,
    startTime: Date.now() - latencyMs,
    endTime: Date.now(),
    totalLatencyMs: latencyMs,
  });

  describe('Basic judgment', () => {
    it('should judge successful trajectory', () => {
      const trajectory = createTrajectory(true, 5, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBeGreaterThan(0.7);
      expect(verdict.critique).toContain('successfully');
      expect(verdict.improvements).toBeDefined();
      expect(verdict.confidence).toBeGreaterThan(0.5);
    });

    it('should judge failed trajectory', () => {
      const trajectory = createTrajectory(false, 5, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict.success).toBe(false);
      expect(verdict.reward).toBeLessThan(0.5);
      expect(verdict.critique).toContain('did not meet');
      expect(verdict.improvements.length).toBeGreaterThan(0);
    });

    it('should throw error for incomplete trajectory', () => {
      const trajectory: Trajectory = {
        id: 'traj-1',
        sessionId: 'session-1',
        task: 'Test',
        input: {},
        steps: [],
        startTime: Date.now(),
        // success is undefined - not complete
      };

      expect(() => judge.judge(trajectory)).toThrow(
        'Trajectory must be completed before judgment'
      );
    });
  });

  describe('Efficiency scoring', () => {
    it('should reward fast execution', () => {
      const fast = createTrajectory(true, 3, 500);
      const slow = createTrajectory(true, 3, 25000);

      const fastVerdict = judge.judge(fast);
      const slowVerdict = judge.judge(slow);

      expect(fastVerdict.reward).toBeGreaterThan(slowVerdict.reward);
      expect(fastVerdict.critique).toContain('efficient');
    });

    it('should reward fewer steps', () => {
      const efficient = createTrajectory(true, 3, 1000);
      const verbose = createTrajectory(true, 20, 1000);

      const efficientVerdict = judge.judge(efficient);
      const verboseVerdict = judge.judge(verbose);

      expect(efficientVerdict.reward).toBeGreaterThan(verboseVerdict.reward);
      expect(verboseVerdict.critique).toContain('Too many steps');
    });

    it('should penalize timeout', () => {
      const criteria: JudgmentCriteria = {
        maxLatencyMs: 5000,
      };

      const timeout = createTrajectory(true, 5, 35000);
      const verdict = judge.judge(timeout, criteria);

      expect(verdict.reward).toBeLessThan(0.5);
    });
  });

  describe('Custom criteria', () => {
    it('should apply custom efficiency weight', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const highEfficiency = judge.judge(trajectory, {
        efficiencyWeight: 0.9,
        qualityWeight: 0.1,
      });

      const highQuality = judge.judge(trajectory, {
        efficiencyWeight: 0.1,
        qualityWeight: 0.9,
      });

      // Both should succeed but with different scores
      expect(highEfficiency.reward).not.toBe(highQuality.reward);
    });

    it('should use custom evaluator', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const verdict = judge.judge(trajectory, {
        customEvaluator: (traj) => {
          // Custom logic: reward based on output
          return traj.output ? 0.95 : 0.3;
        },
      });

      expect(verdict.reward).toBeGreaterThan(0.7);
    });

    it('should respect minSuccessRate threshold', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const strict = judge.judge(trajectory, {
        minSuccessRate: 0.95, // Very high threshold
      });

      const lenient = judge.judge(trajectory, {
        minSuccessRate: 0.5, // Low threshold
      });

      // Strict criteria harder to pass
      expect(strict.success).toBe(false); // Might fail
      expect(lenient.success).toBe(true); // Should pass
    });
  });

  describe('Pattern-based judgment', () => {
    const createPattern = (
      task: string,
      success: boolean,
      reward: number,
      critique: string
    ): Pattern => ({
      id: `pattern-${Date.now()}-${Math.random()}`,
      task,
      input: {},
      output: {},
      reward,
      success,
      critique,
      timestamp: Date.now(),
      tokensUsed: 1000,
      latencyMs: 1000,
      embedding: new Float32Array(384),
    });

    it('should use pattern history for judgment', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const patterns: Pattern[] = [
        createPattern('Similar task 1', true, 0.9, 'Excellent optimization'),
        createPattern('Similar task 2', true, 0.85, 'Good error handling'),
        createPattern('Similar task 3', true, 0.92, 'Comprehensive tests'),
      ];

      const verdict = judge.judgeWithPatterns(trajectory, patterns);

      expect(verdict.success).toBe(true);
      expect(verdict.reward).toBeGreaterThan(0.8);
      expect(verdict.critique).toContain('similar past trajectories');
      expect(verdict.critique).toContain('success rate');
      expect(verdict.confidence).toBeGreaterThan(0);
    });

    it('should warn about historically unsuccessful approaches', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const patterns: Pattern[] = [
        createPattern('Similar task 1', false, 0.3, 'Failed with timeout'),
        createPattern('Similar task 2', false, 0.2, 'Memory issues'),
        createPattern('Similar task 3', false, 0.4, 'Logic errors'),
      ];

      const verdict = judge.judgeWithPatterns(trajectory, patterns);

      expect(verdict.critique).toContain('frequently failed');
    });

    it('should extract improvements from successful patterns', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const patterns: Pattern[] = [
        createPattern('Task 1', true, 0.9, 'Need to optimize performance'),
        createPattern('Task 2', true, 0.85, 'Add error handling for edge cases'),
        createPattern('Task 3', true, 0.92, 'Implement comprehensive test coverage'),
      ];

      const verdict = judge.judgeWithPatterns(trajectory, patterns);

      expect(verdict.improvements.some(i => i.includes('optimization'))).toBe(true);
      expect(verdict.improvements.some(i => i.includes('error handling'))).toBe(true);
      expect(verdict.improvements.some(i => i.includes('test'))).toBe(true);
    });

    it('should extract anti-patterns from failures', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const patterns: Pattern[] = [
        createPattern('Task 1', false, 0.3, 'Failed due to timeout issues'),
        createPattern('Task 2', false, 0.2, 'Memory leak caused errors'),
        createPattern('Task 3', true, 0.9, 'Success'),
      ];

      const verdict = judge.judgeWithPatterns(trajectory, patterns);

      expect(verdict.improvements.some(i => i.includes('timeout'))).toBe(true);
      expect(verdict.improvements.some(i => i.includes('memory'))).toBe(true);
    });

    it('should fall back to basic judgment with no patterns', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const verdict = judge.judgeWithPatterns(trajectory, []);

      expect(verdict).toBeDefined();
      expect(verdict.success).toBe(true);
      expect(verdict.confidence).toBeLessThan(1.0);
    });

    it('should adjust confidence based on pattern count', () => {
      const trajectory = createTrajectory(true, 5, 1000);

      const few = judge.judgeWithPatterns(trajectory, [
        createPattern('Task', true, 0.9, 'Good'),
      ]);

      const many = judge.judgeWithPatterns(
        trajectory,
        Array.from({ length: 20 }, (_, i) =>
          createPattern(`Task ${i}`, true, 0.9, 'Good')
        )
      );

      expect(many.confidence).toBeGreaterThan(few.confidence);
      expect(many.confidence).toBe(1.0); // Caps at 1.0 with 10+ patterns
    });
  });

  describe('Critique generation', () => {
    it('should generate detailed critique for successful trajectory', () => {
      const trajectory = createTrajectory(true, 3, 500);
      const verdict = judge.judge(trajectory);

      expect(verdict.critique).toContain('successfully');
      expect(verdict.critique).toContain('efficient');
    });

    it('should identify inefficiency in critique', () => {
      const trajectory = createTrajectory(true, 20, 25000);
      const verdict = judge.judge(trajectory);

      expect(verdict.critique).toContain('inefficient');
      expect(verdict.critique).toContain('Too many steps');
    });

    it('should note quality issues', () => {
      const trajectory = createTrajectory(false, 5, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict.critique).toContain('quality needs improvement');
    });
  });

  describe('Improvement suggestions', () => {
    it('should suggest optimizations for slow execution', () => {
      const trajectory = createTrajectory(true, 10, 28000);

      const verdict = judge.judge(trajectory, {
        maxLatencyMs: 30000,
      });

      expect(verdict.improvements).toContain('Performance optimization needed');
    });

    it('should suggest reducing steps for verbose execution', () => {
      const trajectory = createTrajectory(true, 25, 5000);
      const verdict = judge.judge(trajectory);

      expect(verdict.improvements).toContain('Reduce number of intermediate steps');
    });

    it('should suggest quality improvements for failures', () => {
      const trajectory = createTrajectory(false, 5, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict.improvements.some(i => i.includes('quality'))).toBe(true);
      expect(verdict.improvements.some(i => i.includes('error handling'))).toBe(true);
    });

    it('should not suggest improvements for excellent execution', () => {
      const trajectory = createTrajectory(true, 2, 300);

      const verdict = judge.judge(trajectory, {
        minSuccessRate: 0.7,
        efficiencyWeight: 0.3,
        qualityWeight: 0.7,
      });

      // Should have high reward and minimal improvements
      expect(verdict.reward).toBeGreaterThan(0.85);
    });
  });

  describe('Confidence scoring', () => {
    it('should have high confidence for complete trajectory', () => {
      const trajectory = createTrajectory(true, 5, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict.confidence).toBeGreaterThan(0.8);
    });

    it('should have lower confidence for trajectory without output', () => {
      const trajectory = createTrajectory(true, 5, 1000);
      trajectory.output = undefined;

      const verdict = judge.judge(trajectory);

      expect(verdict.confidence).toBeLessThan(1.0);
    });

    it('should have lower confidence for trajectory without steps', () => {
      const trajectory = createTrajectory(true, 0, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict.confidence).toBeLessThan(0.9);
    });
  });

  describe('Edge cases', () => {
    it('should handle trajectory with zero latency', () => {
      const trajectory = createTrajectory(true, 5, 0);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.reward).toBeGreaterThan(0);
    });

    it('should handle trajectory with extreme latency', () => {
      const trajectory = createTrajectory(true, 5, 999999);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.reward).toBeLessThan(0.5);
    });

    it('should handle trajectory with no steps', () => {
      const trajectory = createTrajectory(true, 0, 1000);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.critique).toBeDefined();
    });

    it('should handle trajectory with many steps', () => {
      const trajectory = createTrajectory(true, 100, 5000);
      const verdict = judge.judge(trajectory);

      expect(verdict).toBeDefined();
      expect(verdict.critique).toContain('Too many steps');
    });

    it('should normalize reward to 0-1 range', () => {
      const trajectory = createTrajectory(true, 1, 100);

      // Try to force extreme values
      const verdict = judge.judge(trajectory, {
        customEvaluator: () => 10.0, // Extreme high
      });

      expect(verdict.reward).toBeGreaterThanOrEqual(0);
      expect(verdict.reward).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance', () => {
    it('should judge quickly (<50ms)', () => {
      const trajectory = createTrajectory(true, 10, 1000);

      const start = Date.now();
      judge.judge(trajectory);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('should handle batch judgment efficiently', () => {
      const trajectories = Array.from({ length: 100 }, () =>
        createTrajectory(true, 5, 1000)
      );

      const start = Date.now();
      trajectories.forEach(t => judge.judge(t));
      const elapsed = Date.now() - start;

      // Should process 100 trajectories in <500ms
      expect(elapsed).toBeLessThan(500);
    });
  });
});
