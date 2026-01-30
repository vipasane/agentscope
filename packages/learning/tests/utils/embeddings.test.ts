/**
 * Tests for embedding utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createEmbedding,
  normalizeEmbedding,
  validateEmbedding,
  createPatternEmbedding,
  batchCreateEmbeddings,
  EMBEDDING_DIMENSION,
} from '../../src/utils/embeddings.js';
import { EmbeddingError } from '../../src/errors/learning-errors.js';

describe('Embedding Utilities', () => {
  describe('createEmbedding', () => {
    it('should create 384-dimensional embedding', () => {
      const embedding = createEmbedding('test input');
      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
      expect(embedding).toBeInstanceOf(Float32Array);
    });

    it('should create normalized embedding', () => {
      const embedding = createEmbedding('test input');
      const norm = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it('should throw on empty input', () => {
      expect(() => createEmbedding('')).toThrow(EmbeddingError);
      expect(() => createEmbedding('  ')).toThrow(EmbeddingError);
    });

    it('should create different embeddings for different inputs', () => {
      const emb1 = createEmbedding('authentication');
      const emb2 = createEmbedding('database');

      // Should not be identical
      expect(emb1).not.toEqual(emb2);

      // Should have some difference
      let differences = 0;
      for (let i = 0; i < emb1.length; i++) {
        if (Math.abs(emb1[i] - emb2[i]) > 0.01) {
          differences++;
        }
      }
      expect(differences).toBeGreaterThan(10);
    });

    it('should create similar embeddings for similar inputs', () => {
      const emb1 = createEmbedding('authentication system');
      const emb2 = createEmbedding('authentication system');

      // Should be identical for same input
      expect(emb1).toEqual(emb2);
    });
  });

  describe('normalizeEmbedding', () => {
    it('should normalize to unit length', () => {
      const raw = new Float32Array([3, 4, 0, 0]);
      const normalized = normalizeEmbedding(raw);

      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);
      expect(normalized[2]).toBe(0);
      expect(normalized[3]).toBe(0);

      const norm = Math.sqrt(
        normalized.reduce((sum, val) => sum + val * val, 0)
      );
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it('should throw on zero vector', () => {
      const zero = new Float32Array(384);
      expect(() => normalizeEmbedding(zero)).toThrow(EmbeddingError);
    });

    it('should preserve direction', () => {
      const raw = new Float32Array([1, 2, 3, 4]);
      const normalized = normalizeEmbedding(raw);

      // Ratios should be preserved
      expect(normalized[1] / normalized[0]).toBeCloseTo(2, 5);
      expect(normalized[2] / normalized[0]).toBeCloseTo(3, 5);
      expect(normalized[3] / normalized[0]).toBeCloseTo(4, 5);
    });
  });

  describe('validateEmbedding', () => {
    it('should validate correct dimension', () => {
      const valid = new Float32Array(EMBEDDING_DIMENSION);
      expect(validateEmbedding(valid)).toBe(true);

      const invalid = new Float32Array(100);
      expect(validateEmbedding(invalid)).toBe(false);
    });

    it('should detect NaN and Infinity', () => {
      const withNaN = new Float32Array(EMBEDDING_DIMENSION);
      withNaN[0] = NaN;
      expect(validateEmbedding(withNaN)).toBe(false);

      const withInf = new Float32Array(EMBEDDING_DIMENSION);
      withInf[0] = Infinity;
      expect(validateEmbedding(withInf)).toBe(false);
    });

    it('should validate normalization when required', () => {
      const normalized = createEmbedding('test');
      expect(validateEmbedding(normalized, true)).toBe(true);

      const unnormalized = new Float32Array(EMBEDDING_DIMENSION);
      unnormalized[0] = 10;
      expect(validateEmbedding(unnormalized, false)).toBe(true);
      expect(validateEmbedding(unnormalized, true)).toBe(false);
    });
  });

  describe('createPatternEmbedding', () => {
    it('should combine task and critique', () => {
      const embedding = createPatternEmbedding(
        'Implement authentication',
        'Successfully used JWT'
      );

      expect(embedding.length).toBe(EMBEDDING_DIMENSION);
      expect(validateEmbedding(embedding, true)).toBe(true);
    });

    it('should weight task more than critique', () => {
      // Embeddings should be different when task changes
      const emb1 = createPatternEmbedding('auth', 'good');
      const emb2 = createPatternEmbedding('database', 'good');

      let taskDiff = 0;
      for (let i = 0; i < emb1.length; i++) {
        taskDiff += Math.abs(emb1[i] - emb2[i]);
      }

      // Embeddings should be different when critique changes
      const emb3 = createPatternEmbedding('auth', 'bad');

      let critiqueDiff = 0;
      for (let i = 0; i < emb1.length; i++) {
        critiqueDiff += Math.abs(emb1[i] - emb3[i]);
      }

      // Task changes should have more impact
      expect(taskDiff).toBeGreaterThan(critiqueDiff);
    });
  });

  describe('batchCreateEmbeddings', () => {
    it('should create embeddings for all texts', () => {
      const texts = ['auth', 'database', 'api'];
      const embeddings = batchCreateEmbeddings(texts);

      expect(embeddings.length).toBe(3);
      embeddings.forEach(emb => {
        expect(emb.length).toBe(EMBEDDING_DIMENSION);
        expect(validateEmbedding(emb, true)).toBe(true);
      });
    });

    it('should handle empty array', () => {
      const embeddings = batchCreateEmbeddings([]);
      expect(embeddings.length).toBe(0);
    });
  });
});
