/**
 * @packageDocumentation
 * Tests for EmbeddingGenerator
 *
 * @remarks
 * Tests TF-IDF embedding generation with target <10ms performance
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EmbeddingGenerator } from '../../src/learning/EmbeddingGenerator';

describe('EmbeddingGenerator', () => {
  let generator: EmbeddingGenerator;

  beforeEach(() => {
    generator = new EmbeddingGenerator();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector of correct dimension', () => {
      const text = 'test command --flag value';
      const embedding = generator.generateEmbedding(text, 384);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(v => typeof v === 'number')).toBe(true);
    });

    it('should generate normalized vectors (L2 norm ≈ 1)', () => {
      const text = 'test command';
      const embedding = generator.generateEmbedding(text);

      const magnitude = Math.sqrt(
        embedding.reduce((sum, v) => sum + v * v, 0)
      );

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should handle empty strings', () => {
      const embedding = generator.generateEmbedding('');

      expect(embedding).toHaveLength(384);
      expect(embedding.every(v => v === 0)).toBe(true);
    });

    it('should generate different embeddings for different texts', () => {
      const embed1 = generator.generateEmbedding('command one');
      const embed2 = generator.generateEmbedding('command two');

      const similarity = cosineSimilarity(embed1, embed2);
      expect(similarity).toBeLessThan(0.99);
    });

    it('should generate similar embeddings for similar texts', () => {
      generator.updateVocabulary('npm install package');
      generator.updateVocabulary('npm install other-package');

      const embed1 = generator.generateEmbedding('npm install package');
      const embed2 = generator.generateEmbedding('npm install other-package');

      const similarity = cosineSimilarity(embed1, embed2);
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should complete in <10ms (performance target)', () => {
      const text = 'git commit -m "test message" --amend';
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        generator.generateEmbedding(text);
      }

      const duration = Date.now() - start;
      const avgDuration = duration / 100;

      expect(avgDuration).toBeLessThan(10);
    });
  });

  describe('updateVocabulary', () => {
    it('should increase vocabulary size', () => {
      expect(generator.getVocabularySize()).toBe(0);

      generator.updateVocabulary('test command');
      expect(generator.getVocabularySize()).toBeGreaterThan(0);

      generator.updateVocabulary('another command');
      expect(generator.getVocabularySize()).toBeGreaterThan(1);
    });

    it('should increase document count', () => {
      expect(generator.getDocumentCount()).toBe(0);

      generator.updateVocabulary('test');
      expect(generator.getDocumentCount()).toBe(1);

      generator.updateVocabulary('test again');
      expect(generator.getDocumentCount()).toBe(2);
    });

    it('should handle duplicate words correctly', () => {
      generator.updateVocabulary('test test test');
      const vocab1 = generator.getVocabularySize();

      generator.updateVocabulary('test');
      const vocab2 = generator.getVocabularySize();

      expect(vocab1).toBe(vocab2); // Same unique words
    });
  });

  describe('tokenization', () => {
    it('should tokenize command strings correctly', () => {
      const embedding1 = generator.generateEmbedding('npm-install-package');
      const embedding2 = generator.generateEmbedding('npm install package');

      // Should treat hyphens and spaces similarly
      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should be case-insensitive', () => {
      generator.updateVocabulary('TEST Command');

      const embed1 = generator.generateEmbedding('TEST Command');
      const embed2 = generator.generateEmbedding('test command');

      const similarity = cosineSimilarity(embed1, embed2);
      expect(similarity).toBeCloseTo(1.0, 1);
    });

    it('should remove special characters', () => {
      const embed1 = generator.generateEmbedding('test!@#$%command');
      const embed2 = generator.generateEmbedding('test command');

      const similarity = cosineSimilarity(embed1, embed2);
      expect(similarity).toBeGreaterThan(0.8);
    });
  });
});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}
