/**
 * Tests for similarity utilities
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  findTopKSimilar,
  pairwiseDistances,
  areSimilar,
} from '../../src/utils/similarity.js';

describe('Similarity Utilities', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([1, 0, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([0, 1, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([-1, 0, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
    });

    it('should throw on dimension mismatch', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([1, 0, 0]);
      expect(() => cosineSimilarity(a, b)).toThrow();
    });

    it('should handle normalized vectors correctly', () => {
      // For normalized vectors, cosine similarity = dot product
      const a = new Float32Array([0.6, 0.8, 0]);
      const b = new Float32Array([0.8, 0.6, 0]);

      const similarity = cosineSimilarity(a, b);
      const expected = 0.6 * 0.8 + 0.8 * 0.6; // 0.96

      expect(similarity).toBeCloseTo(expected, 5);
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([1, 2, 3]);
      expect(euclideanDistance(a, b)).toBeCloseTo(0, 5);
    });

    it('should compute correct distance', () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([3, 4, 0]);
      // Distance = sqrt(3^2 + 4^2) = 5
      expect(euclideanDistance(a, b)).toBeCloseTo(5, 5);
    });

    it('should be symmetric', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      expect(euclideanDistance(a, b)).toBeCloseTo(euclideanDistance(b, a), 5);
    });

    it('should throw on dimension mismatch', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([1, 0, 0]);
      expect(() => euclideanDistance(a, b)).toThrow();
    });
  });

  describe('manhattanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([1, 2, 3]);
      expect(manhattanDistance(a, b)).toBe(0);
    });

    it('should compute correct distance', () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([3, 4, 5]);
      // Distance = |3| + |4| + |5| = 12
      expect(manhattanDistance(a, b)).toBe(12);
    });

    it('should be symmetric', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      expect(manhattanDistance(a, b)).toBe(manhattanDistance(b, a));
    });

    it('should throw on dimension mismatch', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([1, 0, 0]);
      expect(() => manhattanDistance(a, b)).toThrow();
    });
  });

  describe('dotProduct', () => {
    it('should compute correct dot product', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(dotProduct(a, b)).toBe(32);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([0, 1, 0]);
      expect(dotProduct(a, b)).toBe(0);
    });

    it('should throw on dimension mismatch', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([1, 0, 0]);
      expect(() => dotProduct(a, b)).toThrow();
    });
  });

  describe('findTopKSimilar', () => {
    it('should find top-k most similar', () => {
      const query = new Float32Array([1, 0, 0]);
      const candidates = [
        new Float32Array([0.9, 0.1, 0]), // Most similar
        new Float32Array([0, 1, 0]),      // Orthogonal
        new Float32Array([0.8, 0.2, 0]),  // Second most similar
        new Float32Array([-1, 0, 0]),     // Opposite
      ];

      const topK = findTopKSimilar(query, candidates, 2);
      expect(topK).toEqual([0, 2]); // Indices 0 and 2
    });

    it('should handle k larger than candidates', () => {
      const query = new Float32Array([1, 0]);
      const candidates = [
        new Float32Array([1, 0]),
        new Float32Array([0, 1]),
      ];

      const topK = findTopKSimilar(query, candidates, 10);
      expect(topK.length).toBe(2);
    });

    it('should return empty for no candidates', () => {
      const query = new Float32Array([1, 0]);
      const topK = findTopKSimilar(query, [], 5);
      expect(topK).toEqual([]);
    });
  });

  describe('pairwiseDistances', () => {
    it('should compute distance matrix', () => {
      const embeddings = [
        new Float32Array([0, 0, 0]),
        new Float32Array([1, 0, 0]),
        new Float32Array([0, 1, 0]),
      ];

      const distances = pairwiseDistances(embeddings, 'euclidean');

      expect(distances.length).toBe(3);
      expect(distances[0].length).toBe(3);

      // Diagonal should be 0
      expect(distances[0][0]).toBe(0);
      expect(distances[1][1]).toBe(0);
      expect(distances[2][2]).toBe(0);

      // Should be symmetric
      expect(distances[0][1]).toBeCloseTo(distances[1][0], 5);
      expect(distances[0][2]).toBeCloseTo(distances[2][0], 5);
      expect(distances[1][2]).toBeCloseTo(distances[2][1], 5);

      // Check specific distances
      expect(distances[0][1]).toBeCloseTo(1, 5); // Distance from [0,0,0] to [1,0,0]
      expect(distances[0][2]).toBeCloseTo(1, 5); // Distance from [0,0,0] to [0,1,0]
    });

    it('should support different metrics', () => {
      const embeddings = [
        new Float32Array([0, 0]),
        new Float32Array([1, 1]),
      ];

      const euclidean = pairwiseDistances(embeddings, 'euclidean');
      const manhattan = pairwiseDistances(embeddings, 'manhattan');
      const cosine = pairwiseDistances(embeddings, 'cosine');

      expect(euclidean[0][1]).toBeCloseTo(Math.sqrt(2), 5);
      expect(manhattan[0][1]).toBe(2);
      expect(cosine[0][1]).toBeGreaterThan(0); // 1 - similarity
    });
  });

  describe('areSimilar', () => {
    it('should return true for similar vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([0.9, 0.1, 0]);

      expect(areSimilar(a, b, 0.8)).toBe(true);
    });

    it('should return false for dissimilar vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([0, 1, 0]);

      expect(areSimilar(a, b, 0.5)).toBe(false);
    });

    it('should respect threshold', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([0.8, 0.2, 0]);

      const similarity = cosineSimilarity(a, b);

      expect(areSimilar(a, b, similarity - 0.01)).toBe(true);
      expect(areSimilar(a, b, similarity + 0.01)).toBe(false);
    });
  });
});
