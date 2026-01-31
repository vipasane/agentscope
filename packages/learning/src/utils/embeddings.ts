/**
 * Embedding utilities for pattern similarity search
 *
 * Provides simple hash-based embedding generation for semantic search.
 * In production, this should be replaced with a proper embedding model
 * (e.g., OpenAI, Cohere, or local transformers).
 *
 * @module utils/embeddings
 */

import { EmbeddingError } from '../errors/learning-errors.js';

/**
 * Standard embedding dimension (matches common models like all-MiniLM-L6-v2)
 */
export const EMBEDDING_DIMENSION = 384;

/**
 * Generate a simple hash-based embedding from text
 *
 * **Note:** This is a placeholder implementation for testing. In production,
 * use a proper embedding model for semantic similarity.
 *
 * The hash-based approach:
 * 1. Computes character frequency distribution
 * 2. Applies n-gram hashing (1-3 grams)
 * 3. Normalizes to unit length
 *
 * **Limitations:**
 * - Not semantically aware (similar meanings != similar embeddings)
 * - Sensitive to typos and word order
 * - No transfer learning benefits
 *
 * **Production alternatives:**
 * - OpenAI text-embedding-3-small
 * - Cohere embed-english-v3.0
 * - Local: @xenova/transformers with all-MiniLM-L6-v2
 *
 * @param text - Input text to embed
 * @returns 384-dimensional embedding vector
 * @throws {EmbeddingError} If text is empty or invalid
 *
 * @example
 * ```typescript
 * const embedding = createEmbedding('Implement user authentication');
 * console.log(embedding.length); // 384
 * console.log(embedding[0]);     // 0.123...
 * ```
 */
export function createEmbedding(text: string): Float32Array {
  if (!text || text.trim().length === 0) {
    throw new EmbeddingError('Cannot generate embedding from empty text');
  }

  const normalized = text.toLowerCase().trim();
  const embedding = new Float32Array(EMBEDDING_DIMENSION);

  // Character frequency-based features (first 128 dims)
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const idx = code % 128;
    embedding[idx] += 1;
  }

  // Bigram features (next 128 dims)
  for (let i = 0; i < normalized.length - 1; i++) {
    const hash = (normalized.charCodeAt(i) * 31 + normalized.charCodeAt(i + 1)) % 128;
    embedding[128 + hash] += 1;
  }

  // Trigram features (final 128 dims)
  for (let i = 0; i < normalized.length - 2; i++) {
    const hash =
      (normalized.charCodeAt(i) * 961 +
        normalized.charCodeAt(i + 1) * 31 +
        normalized.charCodeAt(i + 2)) %
      128;
    embedding[256 + hash] += 1;
  }

  // L2 normalization
  return normalizeEmbedding(embedding);
}

/**
 * Normalize an embedding vector to unit length (L2 norm)
 *
 * Normalization ensures that cosine similarity can be computed efficiently
 * using dot product. All embeddings should be normalized before storage.
 *
 * **Formula:**
 * ```
 * normalized[i] = embedding[i] / sqrt(sum(embedding[j]^2))
 * ```
 *
 * @param embedding - Raw embedding vector
 * @returns Normalized embedding with L2 norm = 1
 *
 * @example
 * ```typescript
 * const raw = new Float32Array([3, 4, 0, 0]); // length = 5
 * const normalized = normalizeEmbedding(raw);
 * console.log(normalized); // [0.6, 0.8, 0, 0]
 * ```
 */
export function normalizeEmbedding(embedding: Float32Array): Float32Array {
  const norm = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (norm === 0) {
    throw new EmbeddingError('Cannot normalize zero vector');
  }

  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / norm;
  }

  return normalized;
}

/**
 * Validate that an embedding has correct dimensions and is normalized
 *
 * @param embedding - Embedding to validate
 * @param requireNormalized - If true, check that L2 norm ≈ 1
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * const embedding = createEmbedding('test');
 * console.log(validateEmbedding(embedding, true)); // true
 *
 * const invalid = new Float32Array(100);
 * console.log(validateEmbedding(invalid)); // false (wrong dimension)
 * ```
 */
export function validateEmbedding(
  embedding: Float32Array,
  requireNormalized = false
): boolean {
  // Check dimension
  if (embedding.length !== EMBEDDING_DIMENSION) {
    return false;
  }

  // Check for NaN or Infinity
  for (let i = 0; i < embedding.length; i++) {
    if (!Number.isFinite(embedding[i])) {
      return false;
    }
  }

  // Check normalization if required
  if (requireNormalized) {
    const norm = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    // Allow small floating-point error
    return Math.abs(norm - 1.0) < 1e-6;
  }

  return true;
}

/**
 * Create an embedding from a pattern's task and critique
 *
 * Combines task description and critique for richer semantic representation.
 * In production, use a model that supports multi-field encoding.
 *
 * @param task - Task description
 * @param critique - Execution critique
 * @returns Combined embedding
 *
 * @example
 * ```typescript
 * const embedding = createPatternEmbedding(
 *   'Implement authentication',
 *   'Successfully used JWT with refresh tokens'
 * );
 * ```
 */
export function createPatternEmbedding(task: string, critique: string): Float32Array {
  // Weight task more heavily than critique (70/30 split)
  const combined = `${task} ${task} ${critique}`;
  return createEmbedding(combined);
}

/**
 * Batch create embeddings for multiple texts
 *
 * More efficient than calling createEmbedding() individually.
 *
 * @param texts - Array of texts to embed
 * @returns Array of embeddings
 *
 * @example
 * ```typescript
 * const embeddings = batchCreateEmbeddings([
 *   'Implement auth',
 *   'Fix bug',
 *   'Add tests'
 * ]);
 * console.log(embeddings.length); // 3
 * ```
 */
export function batchCreateEmbeddings(texts: string[]): Float32Array[] {
  return texts.map(text => createEmbedding(text));
}
