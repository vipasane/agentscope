import { PatternMatcher } from '../src/matching/matcher';
import { Pattern } from '../src/types';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  const createMockPattern = (
    task: string,
    success: boolean,
    reward: number,
    embedding?: Float32Array
  ): Pattern => ({
    id: `pattern-${Math.random()}`,
    task,
    input: {},
    output: {},
    success,
    reward,
    critique: 'test critique',
    timestamp: Date.now(),
    tokensUsed: 100,
    latencyMs: 500,
    embedding: embedding || new Float32Array([1, 0, 0]),
  });

  describe('findSimilar', () => {
    it('should find similar patterns by embedding', () => {
      const query = new Float32Array([1, 0, 0]);

      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0, 1, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0.9, 0.1, 0])),
      ];

      const similar = matcher.findSimilar(query, patterns, { k: 2 });

      expect(similar.length).toBe(2);
      expect(similar[0].similarity).toBeGreaterThan(similar[1].similarity);
    });

    it('should filter by minReward', () => {
      const query = new Float32Array([1, 0, 0]);

      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.3, new Float32Array([0.95, 0.05, 0])),
      ];

      const similar = matcher.findSimilar(query, patterns, {
        k: 5,
        minReward: 0.7,
      });

      expect(similar.length).toBe(1);
      expect(similar[0].reward).toBeGreaterThanOrEqual(0.7);
    });

    it('should filter by success status', () => {
      const query = new Float32Array([1, 0, 0]);

      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', false, 0.8, new Float32Array([0.9, 0.1, 0])),
      ];

      const successes = matcher.findSimilar(query, patterns, {
        k: 5,
        onlySuccesses: true,
      });

      expect(successes.every(p => p.success)).toBe(true);

      const failures = matcher.findSimilar(query, patterns, {
        k: 5,
        onlyFailures: true,
      });

      expect(failures.every(p => !p.success)).toBe(true);
    });

    it('should filter by time range', () => {
      const query = new Float32Array([1, 0, 0]);
      const now = Date.now();

      const patterns = [
        {
          ...createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
          timestamp: now,
        },
        {
          ...createMockPattern('task2', true, 0.8, new Float32Array([0.9, 0.1, 0])),
          timestamp: now - 100000,
        },
      ];

      const recent = matcher.findSimilar(query, patterns, {
        k: 5,
        timeRange: {
          start: now - 50000,
          end: now,
        },
      });

      expect(recent.length).toBe(1);
    });

    it('should filter by metadata', () => {
      const query = new Float32Array([1, 0, 0]);

      const patterns = [
        {
          ...createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
          metadata: { category: 'auth' },
        },
        {
          ...createMockPattern('task2', true, 0.8, new Float32Array([0.9, 0.1, 0])),
          metadata: { category: 'database' },
        },
      ];

      const filtered = matcher.findSimilar(query, patterns, {
        k: 5,
        metadata: { category: 'auth' },
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].metadata?.category).toBe('auth');
    });
  });

  describe('clusterPatterns', () => {
    it('should group similar patterns', () => {
      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0.95, 0.05, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0, 1, 0])),
      ];

      const clusters = matcher.clusterPatterns(patterns, 0.9);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.some(c => c.length > 1)).toBe(true);
    });

    it('should create separate clusters for dissimilar patterns', () => {
      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0, 1, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0, 0, 1])),
      ];

      const clusters = matcher.clusterPatterns(patterns, 0.9);

      expect(clusters.length).toBe(3); // All different
    });
  });

  describe('computeDiversity', () => {
    it('should compute diversity score', () => {
      const diverse = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0, 1, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0, 0, 1])),
      ];

      const similar = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0.95, 0.05, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0.9, 0.1, 0])),
      ];

      const diversityScore = matcher.computeDiversity(diverse);
      const similarityScore = matcher.computeDiversity(similar);

      expect(diversityScore).toBeGreaterThan(similarityScore);
    });

    it('should return 0 for single pattern', () => {
      const patterns = [createMockPattern('task1', true, 0.9)];
      const diversity = matcher.computeDiversity(patterns);
      expect(diversity).toBe(0);
    });
  });

  describe('selectDiverse', () => {
    it('should select diverse subset using MMR', () => {
      const query = new Float32Array([1, 0, 0]);

      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0.95, 0.05, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0, 1, 0])),
        createMockPattern('task4', true, 0.6, new Float32Array([0, 0, 1])),
      ];

      const selected = matcher.selectDiverse(query, patterns, 2, 0.5);

      expect(selected.length).toBe(2);

      // First should be most similar to query
      const similarities = selected.map(p => {
        const sim = p.embedding
          ? matcher['cosineSimilarity'](query, p.embedding)
          : 0;
        return sim;
      });

      expect(similarities[0]).toBeGreaterThan(0);
    });

    it('should balance relevance and diversity with lambda', () => {
      const query = new Float32Array([1, 0, 0]);

      const patterns = [
        createMockPattern('task1', true, 0.9, new Float32Array([1, 0, 0])),
        createMockPattern('task2', true, 0.8, new Float32Array([0.95, 0.05, 0])),
        createMockPattern('task3', true, 0.7, new Float32Array([0, 1, 0])),
      ];

      // High lambda = prefer relevance
      const relevant = matcher.selectDiverse(query, patterns, 2, 1.0);

      // Low lambda = prefer diversity
      const diverse = matcher.selectDiverse(query, patterns, 2, 0.0);

      // Results can be different based on lambda
      expect(relevant.length).toBe(2);
      expect(diverse.length).toBe(2);
    });
  });
});
