/**
 * Similarity and distance metrics for embeddings
 *
 * Provides efficient vectorized operations for pattern similarity search
 * and clustering. All metrics operate on normalized Float32Array embeddings.
 *
 * @module utils/similarity
 */

/**
 * Compute cosine similarity between two embeddings
 *
 * Cosine similarity measures the angle between two vectors, ranging from
 * -1 (opposite) to 1 (identical). For normalized vectors, this is equivalent
 * to dot product.
 *
 * **Formula:**
 * ```
 * cosine_similarity = (a · b) / (||a|| * ||b||)
 * ```
 *
 * For normalized vectors (||a|| = ||b|| = 1):
 * ```
 * cosine_similarity = a · b
 * ```
 *
 * **Performance:**
 * - O(n) where n = embedding dimension
 * - ~0.01ms for 384-dimensional vectors
 *
 * @param a - First embedding (should be normalized)
 * @param b - Second embedding (should be normalized)
 * @returns Similarity score from -1 to 1
 * @throws {Error} If embeddings have different dimensions
 *
 * @example
 * ```typescript
 * const emb1 = createEmbedding('Implement authentication');
 * const emb2 = createEmbedding('Add auth system');
 * const similarity = cosineSimilarity(emb1, emb2);
 * console.log(similarity); // ~0.85 (similar tasks)
 * ```
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  return dotProduct(a, b);
}

/**
 * Compute Euclidean distance between two embeddings
 *
 * Euclidean distance measures straight-line distance in n-dimensional space.
 * Smaller values indicate more similar vectors.
 *
 * **Formula:**
 * ```
 * euclidean = sqrt(sum((a[i] - b[i])^2))
 * ```
 *
 * **Range:**
 * - 0 = identical vectors
 * - √2 ≈ 1.414 = maximum for normalized vectors
 *
 * **Use cases:**
 * - K-means clustering
 * - Nearest neighbor search
 * - Distance-based thresholds
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Distance (0 = identical, higher = more different)
 * @throws {Error} If embeddings have different dimensions
 *
 * @example
 * ```typescript
 * const emb1 = createEmbedding('test');
 * const emb2 = createEmbedding('test');
 * console.log(euclideanDistance(emb1, emb2)); // ~0 (identical)
 *
 * const emb3 = createEmbedding('completely different');
 * console.log(euclideanDistance(emb1, emb3)); // ~1.2 (different)
 * ```
 */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sumSquares += diff * diff;
  }

  return Math.sqrt(sumSquares);
}

/**
 * Compute Manhattan (L1) distance between two embeddings
 *
 * Manhattan distance sums absolute differences. Faster to compute than
 * Euclidean but less geometrically intuitive.
 *
 * **Formula:**
 * ```
 * manhattan = sum(|a[i] - b[i]|)
 * ```
 *
 * **Performance:**
 * - ~30% faster than Euclidean (no sqrt)
 * - Good for high-dimensional spaces
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Distance (0 = identical)
 * @throws {Error} If embeddings have different dimensions
 *
 * @example
 * ```typescript
 * const emb1 = new Float32Array([1, 0, 0]);
 * const emb2 = new Float32Array([0, 1, 0]);
 * console.log(manhattanDistance(emb1, emb2)); // 2
 * ```
 */
export function manhattanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }

  return sum;
}

/**
 * Compute dot product of two vectors
 *
 * For normalized vectors, dot product equals cosine similarity.
 * This is the fastest similarity metric for normalized embeddings.
 *
 * **Formula:**
 * ```
 * dot_product = sum(a[i] * b[i])
 * ```
 *
 * **Performance:**
 * - O(n) linear time
 * - ~0.005ms for 384-dimensional vectors
 * - Highly optimized by JS engines
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Dot product
 * @throws {Error} If vectors have different dimensions
 *
 * @example
 * ```typescript
 * const a = new Float32Array([1, 0, 0]);
 * const b = new Float32Array([0, 1, 0]);
 * console.log(dotProduct(a, b)); // 0 (orthogonal)
 *
 * const c = new Float32Array([1, 0, 0]);
 * console.log(dotProduct(a, c)); // 1 (parallel)
 * ```
 */
export function dotProduct(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Find top-k most similar embeddings using cosine similarity
 *
 * Performs brute-force search over all candidates. For large datasets,
 * use HNSW indexing instead.
 *
 * **Performance:**
 * - O(n * d) where n = candidates, d = dimension
 * - ~1.5ms for 1000 candidates (384-dim)
 * - ~15ms for 10,000 candidates
 *
 * @param query - Query embedding
 * @param candidates - Array of candidate embeddings
 * @param k - Number of results to return
 * @returns Indices of top-k candidates, sorted by similarity (descending)
 *
 * @example
 * ```typescript
 * const query = createEmbedding('authentication');
 * const candidates = [
 *   createEmbedding('auth implementation'),
 *   createEmbedding('database setup'),
 *   createEmbedding('login system'),
 * ];
 *
 * const topK = findTopKSimilar(query, candidates, 2);
 * console.log(topK); // [0, 2] (auth and login are most similar)
 * ```
 */
export function findTopKSimilar(
  query: Float32Array,
  candidates: Float32Array[],
  k: number
): number[] {
  // Compute similarities
  const similarities = candidates.map((candidate, idx) => ({
    idx,
    similarity: cosineSimilarity(query, candidate),
  }));

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top-k indices
  return similarities.slice(0, k).map(item => item.idx);
}

/**
 * Compute pairwise distance matrix for clustering
 *
 * Returns a symmetric matrix where matrix[i][j] is the distance between
 * embeddings[i] and embeddings[j].
 *
 * **Performance:**
 * - O(n^2 * d) where n = embeddings, d = dimension
 * - ~10ms for 100 embeddings
 * - ~400ms for 1000 embeddings
 *
 * @param embeddings - Array of embeddings
 * @param metric - Distance metric ('euclidean' | 'manhattan' | 'cosine')
 * @returns n×n distance matrix
 *
 * @example
 * ```typescript
 * const embeddings = [
 *   createEmbedding('a'),
 *   createEmbedding('b'),
 *   createEmbedding('c'),
 * ];
 *
 * const distances = pairwiseDistances(embeddings, 'euclidean');
 * console.log(distances[0][1]); // distance between 'a' and 'b'
 * ```
 */
export function pairwiseDistances(
  embeddings: Float32Array[],
  metric: 'euclidean' | 'manhattan' | 'cosine' = 'euclidean'
): number[][] {
  const n = embeddings.length;
  const distances: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  const distFn =
    metric === 'euclidean'
      ? euclideanDistance
      : metric === 'manhattan'
        ? manhattanDistance
        : (a: Float32Array, b: Float32Array) => 1 - cosineSimilarity(a, b);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = distFn(embeddings[i], embeddings[j]);
      distances[i][j] = dist;
      distances[j][i] = dist; // Symmetric
    }
  }

  return distances;
}

/**
 * Check if two embeddings are similar within a threshold
 *
 * Useful for deduplication and approximate matching.
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @param threshold - Similarity threshold (0-1)
 * @returns True if similarity >= threshold
 *
 * @example
 * ```typescript
 * const emb1 = createEmbedding('test');
 * const emb2 = createEmbedding('test case');
 * console.log(areSimilar(emb1, emb2, 0.8)); // true if >80% similar
 * ```
 */
export function areSimilar(
  a: Float32Array,
  b: Float32Array,
  threshold: number
): boolean {
  return cosineSimilarity(a, b) >= threshold;
}
