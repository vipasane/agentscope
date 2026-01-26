/**
 * Pattern matching for finding similar experiences
 *
 * Matches current situations to learned patterns using vector similarity.
 * Enables learning from past experiences.
 */

import { Pattern, SearchOptions } from '../types';

export class PatternMatcher {
  /**
   * Find similar patterns using embeddings
   *
   * @param queryEmbedding - Embedding vector for the query
   * @param patterns - Available patterns to search
   * @param options - Search options
   * @returns Ranked list of similar patterns
   */
  findSimilar(
    queryEmbedding: Float32Array,
    patterns: Pattern[],
    options?: SearchOptions
  ): Array<Pattern & { similarity: number }> {
    const k = options?.k || 5;
    const minReward = options?.minReward || 0;
    const onlySuccesses = options?.onlySuccesses || false;
    const onlyFailures = options?.onlyFailures || false;

    // Filter patterns
    let filtered = patterns.filter(p => {
      if (p.reward < minReward) return false;
      if (onlySuccesses && !p.success) return false;
      if (onlyFailures && p.success) return false;

      // Time range filter
      if (options?.timeRange) {
        if (p.timestamp < options.timeRange.start ||
            p.timestamp > options.timeRange.end) {
          return false;
        }
      }

      // Metadata filter
      if (options?.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          if (p.metadata?.[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });

    // Compute similarities
    const scored = filtered
      .filter(p => p.embedding !== undefined)
      .map(p => ({
        ...p,
        similarity: this.cosineSimilarity(queryEmbedding, p.embedding!),
      }));

    // Sort by similarity (descending)
    scored.sort((a, b) => b.similarity - a.similarity);

    // Return top k
    return scored.slice(0, k);
  }

  /**
   * Compute cosine similarity between two vectors
   *
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity (0-1, higher = more similar)
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimensions must match: ${a.length} !== ${b.length}`
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Group patterns by similarity using clustering
   *
   * @param patterns - Patterns to group
   * @param similarityThreshold - Minimum similarity for same cluster (0-1)
   * @returns Array of pattern clusters
   */
  clusterPatterns(
    patterns: Pattern[],
    similarityThreshold: number = 0.85
  ): Pattern[][] {
    const clusters: Pattern[][] = [];
    const assigned = new Set<string>();

    for (const pattern of patterns) {
      if (assigned.has(pattern.id) || !pattern.embedding) {
        continue;
      }

      // Start new cluster
      const cluster: Pattern[] = [pattern];
      assigned.add(pattern.id);

      // Find similar patterns
      for (const other of patterns) {
        if (assigned.has(other.id) || !other.embedding) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          pattern.embedding,
          other.embedding
        );

        if (similarity >= similarityThreshold) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    // Sort clusters by size (largest first)
    clusters.sort((a, b) => b.length - a.length);

    return clusters;
  }

  /**
   * Compute diversity score for a set of patterns
   * Measures how different the patterns are from each other
   *
   * @param patterns - Patterns to analyze
   * @returns Diversity score (0-1, higher = more diverse)
   */
  computeDiversity(patterns: Pattern[]): number {
    if (patterns.length < 2) {
      return 0;
    }

    const withEmbeddings = patterns.filter(p => p.embedding !== undefined);

    if (withEmbeddings.length < 2) {
      return 0;
    }

    // Compute average pairwise distance
    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < withEmbeddings.length; i++) {
      for (let j = i + 1; j < withEmbeddings.length; j++) {
        const similarity = this.cosineSimilarity(
          withEmbeddings[i].embedding!,
          withEmbeddings[j].embedding!
        );

        // Distance = 1 - similarity
        totalDistance += 1 - similarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  /**
   * Select diverse subset of patterns using Maximal Marginal Relevance (MMR)
   * Balances relevance and diversity
   *
   * @param queryEmbedding - Query vector
   * @param patterns - Candidate patterns
   * @param k - Number of patterns to select
   * @param lambda - Diversity weight (0 = pure diversity, 1 = pure relevance)
   * @returns Selected diverse patterns
   */
  selectDiverse(
    queryEmbedding: Float32Array,
    patterns: Pattern[],
    k: number,
    lambda: number = 0.5
  ): Pattern[] {
    const withEmbeddings = patterns.filter(p => p.embedding !== undefined);

    if (withEmbeddings.length <= k) {
      return withEmbeddings;
    }

    const selected: Pattern[] = [];
    const remaining = [...withEmbeddings];

    // Compute query similarities
    const querySims = remaining.map(p =>
      this.cosineSimilarity(queryEmbedding, p.embedding!)
    );

    // Select first pattern (most similar to query)
    let bestIdx = 0;
    let bestScore = querySims[0];

    for (let i = 1; i < querySims.length; i++) {
      if (querySims[i] > bestScore) {
        bestScore = querySims[i];
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
    querySims.splice(bestIdx, 1);

    // Select remaining patterns using MMR
    while (selected.length < k && remaining.length > 0) {
      let bestIdx = 0;
      let bestMMR = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        // Relevance to query
        const relevance = querySims[i];

        // Max similarity to already selected
        let maxSim = 0;
        for (const sel of selected) {
          const sim = this.cosineSimilarity(
            remaining[i].embedding!,
            sel.embedding!
          );
          maxSim = Math.max(maxSim, sim);
        }

        // MMR = lambda * relevance - (1 - lambda) * max_similarity
        const mmr = lambda * relevance - (1 - lambda) * maxSim;

        if (mmr > bestMMR) {
          bestMMR = mmr;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
      querySims.splice(bestIdx, 1);
    }

    return selected;
  }
}
