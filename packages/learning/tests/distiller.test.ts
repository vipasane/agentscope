import { MemoryDistiller } from '../src/distill/distiller';
import { Pattern, Trajectory } from '../src/types';

describe('MemoryDistiller', () => {
  let distiller: MemoryDistiller;

  beforeEach(() => {
    distiller = new MemoryDistiller();
  });

  const createMockTrajectory = (): Trajectory => ({
    id: 'traj-1',
    sessionId: 'session-1',
    task: 'optimize database queries',
    input: { query: 'SELECT * FROM users' },
    output: { latency: '50ms' },
    success: true,
    steps: [
      {
        action: 'analyze query',
        observation: 'N+1 detected',
        thought: 'need optimization',
        timestamp: Date.now(),
      },
    ],
    startTime: Date.now() - 1000,
    endTime: Date.now(),
    totalLatencyMs: 1000,
  });

  const createMockPattern = (
    task: string,
    success: boolean,
    reward: number
  ): Pattern => ({
    id: `pattern-${Math.random()}`,
    task,
    input: {},
    output: {},
    success,
    reward,
    critique: success
      ? 'Good implementation with optimization'
      : 'Failed due to timeout',
    timestamp: Date.now(),
    tokensUsed: 100,
    latencyMs: 500,
  });

  describe('distillTrajectory', () => {
    it('should distill trajectory into pattern', () => {
      const trajectory = createMockTrajectory();
      const verdict = {
        success: true,
        reward: 0.9,
        critique: 'Excellent optimization',
      };

      const pattern = distiller.distillTrajectory(trajectory, verdict);

      expect(pattern.task).toBe(trajectory.task);
      expect(pattern.success).toBe(true);
      expect(pattern.reward).toBe(0.9);
      expect(pattern.critique).toBe('Excellent optimization');
      expect(pattern.metadata?.trajectoryId).toBe('traj-1');
    });
  });

  describe('distillPatterns', () => {
    it('should consolidate multiple patterns', () => {
      const patterns = [
        createMockPattern('optimize queries', true, 0.9),
        createMockPattern('optimize queries', true, 0.85),
        createMockPattern('optimize queries', true, 0.8),
      ];

      const distilled = distiller.distillPatterns(patterns);

      expect(distilled.consolidationCount).toBe(3);
      expect(distilled.consolidatedReward).toBeGreaterThan(0);
      expect(distilled.originalPattern).toBe(patterns[0]); // Highest reward
    });

    it('should throw if too few patterns', () => {
      const patterns = [createMockPattern('test', true, 0.9)];

      expect(() => distiller.distillPatterns(patterns)).toThrow(
        'Need at least 3 patterns'
      );
    });

    it('should extract key learnings from successful patterns', () => {
      const patterns = [
        {
          ...createMockPattern('optimize', true, 0.9),
          critique: 'Optimized query with indexing',
        },
        {
          ...createMockPattern('optimize', true, 0.85),
          critique: 'Improved performance using caching',
        },
        {
          ...createMockPattern('optimize', true, 0.8),
          critique: 'Used query optimization techniques',
        },
      ];

      const distilled = distiller.distillPatterns(patterns);

      expect(distilled.keyLearnings.length).toBeGreaterThan(0);
    });

    it('should identify anti-patterns from failures', () => {
      const patterns = [
        createMockPattern('test', true, 0.9),
        createMockPattern('test', true, 0.85),
        {
          ...createMockPattern('test', false, 0.2),
          critique: 'Failed due to timeout',
        },
      ];

      const distilled = distiller.distillPatterns(patterns);

      expect(distilled.antiPatterns.some(ap => ap.includes('timeout'))).toBe(
        true
      );
    });

    it('should determine applicability conditions', () => {
      const patterns = [
        createMockPattern('optimize database queries', true, 0.9),
        createMockPattern('optimize database performance', true, 0.85),
        createMockPattern('optimize database indexing', true, 0.8),
      ];

      const distilled = distiller.distillPatterns(patterns);

      expect(distilled.applicability.length).toBeGreaterThan(0);
      expect(
        distilled.applicability.some(a => a.toLowerCase().includes('optimize'))
      ).toBe(true);
    });

    it('should compute weighted consolidated reward', () => {
      const now = Date.now();
      const patterns = [
        {
          ...createMockPattern('test', true, 0.9),
          timestamp: now,
        },
        {
          ...createMockPattern('test', true, 0.5),
          timestamp: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        },
      ];

      const distilled = distiller.distillPatterns(patterns);

      // Recent pattern should have more weight
      expect(distilled.consolidatedReward).toBeGreaterThan(0.5);
      expect(distilled.consolidatedReward).toBeLessThanOrEqual(0.9);
    });
  });
});
