/**
 * Elastic Weight Consolidation (EWC++) for preventing catastrophic forgetting
 *
 * Protects important learned patterns from being overwritten when learning new ones.
 * Uses importance weights to preserve critical knowledge.
 */

import { EWCWeights, ConsolidationResult, DistilledPattern } from '../types';

export interface EWCConfig {
  /** Lambda parameter for EWC loss (0-1, higher = stronger protection) */
  lambda: number;
  /** Minimum importance threshold for pattern protection */
  minImportance: number;
  /** Maximum number of protected patterns */
  maxProtectedPatterns: number;
  /** Fisher information approximation method */
  fisherMethod: 'empirical' | 'diagonal';
}

export class EWCConsolidator {
  private protectedPatterns: Map<string, EWCWeights> = new Map();
  private defaultConfig: EWCConfig = {
    lambda: 0.5,
    minImportance: 0.7,
    maxProtectedPatterns: 100,
    fisherMethod: 'diagonal',
  };

  /**
   * Consolidate a pattern with EWC protection
   *
   * @param pattern - Pattern to consolidate
   * @param config - Optional EWC configuration
   * @returns Consolidation result with protection status
   */
  consolidate(
    pattern: DistilledPattern,
    config?: Partial<EWCConfig>
  ): ConsolidationResult {
    const cfg = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    // Compute importance weights
    const importance = this.computeImportance(pattern);

    // Only protect if importance exceeds threshold
    if (importance >= cfg.minImportance) {
      const weights = this.computeFisherWeights(pattern, cfg);

      // Check if we're at capacity
      if (this.protectedPatterns.size >= cfg.maxProtectedPatterns) {
        this.pruneProtectedPatterns(cfg);
      }

      this.protectedPatterns.set(pattern.originalPattern.id, weights);
    }

    const consolidationTimeMs = Date.now() - startTime;

    return {
      pattern,
      mergedCount: pattern.consolidationCount,
      mergedPatternIds: [pattern.originalPattern.id],
      storageReduction: this.estimateStorageReduction(pattern),
      consolidationTimeMs,
    };
  }

  /**
   * Check if a pattern is protected by EWC
   *
   * @param patternId - ID of the pattern to check
   * @returns true if protected, false otherwise
   */
  isProtected(patternId: string): boolean {
    return this.protectedPatterns.has(patternId);
  }

  /**
   * Get EWC weights for a pattern
   *
   * @param patternId - ID of the pattern
   * @returns EWC weights if protected, undefined otherwise
   */
  getWeights(patternId: string): EWCWeights | undefined {
    return this.protectedPatterns.get(patternId);
  }

  /**
   * Compute EWC loss for updating a protected pattern
   *
   * @param patternId - ID of the pattern being updated
   * @param oldEmbedding - Original embedding
   * @param newEmbedding - New embedding
   * @returns EWC regularization loss
   */
  computeEWCLoss(
    patternId: string,
    oldEmbedding: Float32Array,
    newEmbedding: Float32Array
  ): number {
    const weights = this.protectedPatterns.get(patternId);

    if (!weights) {
      return 0; // No protection, no loss
    }

    // EWC loss = (lambda / 2) * sum(F_i * (theta_i - theta_i*)^2)
    // where F_i is Fisher information (importance weight)
    let loss = 0;

    for (let i = 0; i < oldEmbedding.length && i < weights.weights.length; i++) {
      const diff = newEmbedding[i] - oldEmbedding[i];
      loss += weights.weights[i] * diff * diff;
    }

    return (weights.lambda / 2) * loss;
  }

  /**
   * Prune least important protected patterns
   */
  private pruneProtectedPatterns(config: EWCConfig): void {
    // Sort by importance (sum of weights)
    const sorted = Array.from(this.protectedPatterns.entries())
      .map(([id, weights]) => ({
        id,
        importance: this.sumWeights(weights.weights),
        age: Date.now() - weights.timestamp,
      }))
      .sort((a, b) => {
        // Sort by importance, with recency as tiebreaker
        const importanceDiff = b.importance - a.importance;
        if (Math.abs(importanceDiff) > 0.1) {
          return importanceDiff;
        }
        return a.age - b.age; // Prefer newer if importance similar
      });

    // Remove least important
    const toRemove = sorted.slice(config.maxProtectedPatterns);
    toRemove.forEach(({ id }) => this.protectedPatterns.delete(id));
  }

  /**
   * Compute importance of a pattern
   */
  private computeImportance(pattern: DistilledPattern): number {
    // Importance based on:
    // 1. Reward score
    // 2. Number of patterns consolidated
    // 3. Recency

    const rewardScore = pattern.consolidatedReward;
    const consolidationScore = Math.min(pattern.consolidationCount / 10, 1);
    const recencyScore = this.computeRecencyScore(
      pattern.originalPattern.timestamp
    );

    return (
      0.5 * rewardScore +
      0.3 * consolidationScore +
      0.2 * recencyScore
    );
  }

  /**
   * Compute Fisher information weights
   */
  private computeFisherWeights(
    pattern: DistilledPattern,
    config: EWCConfig
  ): EWCWeights {
    const embedding = pattern.originalPattern.embedding;

    if (!embedding) {
      // No embedding, create uniform weights
      const weights = new Float32Array(0);
      return {
        patternId: pattern.originalPattern.id,
        weights,
        lambda: config.lambda,
        timestamp: Date.now(),
      };
    }

    // Compute Fisher information (diagonal approximation)
    const weights = new Float32Array(embedding.length);

    if (config.fisherMethod === 'diagonal') {
      // Diagonal Fisher: F_i = E[(∂log p / ∂θ_i)^2]
      // Approximate using gradient magnitude
      for (let i = 0; i < embedding.length; i++) {
        // Higher magnitude = more important
        weights[i] = Math.abs(embedding[i]);
      }
    } else {
      // Empirical Fisher: use variance of embeddings
      for (let i = 0; i < embedding.length; i++) {
        weights[i] = embedding[i] * embedding[i];
      }
    }

    // Normalize weights
    const sum = this.sumWeights(weights);
    if (sum > 0) {
      for (let i = 0; i < weights.length; i++) {
        weights[i] /= sum;
      }
    }

    return {
      patternId: pattern.originalPattern.id,
      weights,
      lambda: config.lambda,
      timestamp: Date.now(),
    };
  }

  /**
   * Compute recency score (exponential decay)
   */
  private computeRecencyScore(timestamp: number): number {
    const ageMs = Date.now() - timestamp;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Exponential decay with 30-day half-life
    return Math.exp(-ageDays / 30);
  }

  /**
   * Sum of weights
   */
  private sumWeights(weights: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
    }
    return sum;
  }

  /**
   * Estimate storage reduction from consolidation
   */
  private estimateStorageReduction(pattern: DistilledPattern): number {
    // Estimate: each pattern takes ~1KB
    const originalSize = pattern.consolidationCount * 1024; // bytes

    // Distilled pattern is slightly larger but replaces many
    const distilledSize = 1536; // bytes

    const reduction = (originalSize - distilledSize) / originalSize;
    return Math.max(0, Math.min(1, reduction));
  }

  /**
   * Get statistics about protected patterns
   */
  getStats(): {
    totalProtected: number;
    avgImportance: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    if (this.protectedPatterns.size === 0) {
      return {
        totalProtected: 0,
        avgImportance: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0,
      };
    }

    const weights = Array.from(this.protectedPatterns.values());

    const importances = weights.map(w => this.sumWeights(w.weights));
    const avgImportance = importances.reduce((s, i) => s + i, 0) /
      importances.length;

    const timestamps = weights.map(w => w.timestamp);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);

    return {
      totalProtected: this.protectedPatterns.size,
      avgImportance,
      oldestTimestamp,
      newestTimestamp,
    };
  }

  /**
   * Clear all protected patterns
   */
  clear(): void {
    this.protectedPatterns.clear();
  }
}
