/**
 * Self-Learning Pattern Storage
 * Integrates with claude-flow learning system
 */

export interface TestPattern {
  testId: string;
  category: string;
  task: string;
  input: string;
  output: string;
  reward: number;
  success: boolean;
  executionTime: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface FailurePattern {
  testId: string;
  category: string;
  error: string;
  stackTrace: string;
  context: Record<string, unknown>;
  attemptCount: number;
  resolved: boolean;
  solution?: string;
}

export class PatternStorage {
  private successPatterns: Map<string, TestPattern[]> = new Map();
  private failurePatterns: Map<string, FailurePattern> = new Map();

  /**
   * Store successful test pattern for learning
   */
  async storeSuccess(pattern: TestPattern): Promise<void> {
    const category = pattern.category;
    const existing = this.successPatterns.get(category) || [];
    existing.push(pattern);
    this.successPatterns.set(category, existing);

    // In production, would store in claude-flow memory:
    // await claudeFlowCLI.memory.store({
    //   namespace: 'integration-test-success',
    //   key: `${category}-${pattern.testId}`,
    //   value: JSON.stringify(pattern)
    // });

    console.log(`✅ Stored success pattern: ${pattern.task} (reward: ${pattern.reward.toFixed(2)})`);
  }

  /**
   * Store test failure for learning and auto-repair
   */
  async storeFailure(failure: FailurePattern): Promise<void> {
    const key = `${failure.category}-${failure.testId}`;
    this.failurePatterns.set(key, failure);

    // In production, would store in claude-flow memory:
    // await claudeFlowCLI.memory.store({
    //   namespace: 'integration-test-failures',
    //   key,
    //   value: JSON.stringify(failure),
    //   tags: ['failure', failure.category]
    // });

    console.log(`❌ Stored failure pattern: ${failure.testId} (attempts: ${failure.attemptCount})`);
  }

  /**
   * Retrieve similar successful patterns (for predictive optimization)
   */
  async findSimilarSuccess(task: string, category?: string): Promise<TestPattern[]> {
    const allPatterns = category
      ? this.successPatterns.get(category) || []
      : Array.from(this.successPatterns.values()).flat();

    // Simple similarity search - in production would use HNSW
    const similar = allPatterns.filter(p =>
      this.calculateSimilarity(task, p.task) > 0.6
    );

    // Sort by reward (highest first)
    similar.sort((a, b) => b.reward - a.reward);

    return similar.slice(0, 5);
  }

  /**
   * Retrieve similar failures (for auto-repair)
   */
  async findSimilarFailures(error: string): Promise<FailurePattern[]> {
    const allFailures = Array.from(this.failurePatterns.values());

    const similar = allFailures.filter(f =>
      this.calculateSimilarity(error, f.error) > 0.5
    );

    // Filter to resolved failures (we have solutions)
    const resolved = similar.filter(f => f.resolved && f.solution);

    return resolved;
  }

  /**
   * Mark failure as resolved with solution
   */
  async markResolved(testId: string, category: string, solution: string): Promise<void> {
    const key = `${category}-${testId}`;
    const failure = this.failurePatterns.get(key);

    if (failure) {
      failure.resolved = true;
      failure.solution = solution;
      this.failurePatterns.set(key, failure);

      console.log(`✅ Marked failure resolved: ${testId}`);
    }
  }

  /**
   * Get success rate for a category
   */
  getSuccessRate(category: string): number {
    const successes = this.successPatterns.get(category)?.length || 0;
    const failures = Array.from(this.failurePatterns.values()).filter(
      f => f.category === category
    ).length;

    const total = successes + failures;
    return total > 0 ? successes / total : 1.0;
  }

  /**
   * Get performance metrics for learning
   */
  getPerformanceMetrics(category?: string): {
    avgReward: number;
    avgExecutionTime: number;
    successRate: number;
    totalTests: number;
  } {
    const patterns = category
      ? this.successPatterns.get(category) || []
      : Array.from(this.successPatterns.values()).flat();

    if (patterns.length === 0) {
      return {
        avgReward: 0,
        avgExecutionTime: 0,
        successRate: 1.0,
        totalTests: 0
      };
    }

    const avgReward = patterns.reduce((sum, p) => sum + p.reward, 0) / patterns.length;
    const avgExecutionTime =
      patterns.reduce((sum, p) => sum + p.executionTime, 0) / patterns.length;
    const successRate = category ? this.getSuccessRate(category) : 1.0;

    return {
      avgReward,
      avgExecutionTime,
      successRate,
      totalTests: patterns.length
    };
  }

  /**
   * Export patterns for neural training
   */
  exportForTraining(): {
    successPatterns: TestPattern[];
    failurePatterns: FailurePattern[];
  } {
    return {
      successPatterns: Array.from(this.successPatterns.values()).flat(),
      failurePatterns: Array.from(this.failurePatterns.values())
    };
  }

  /**
   * Simple text similarity calculation
   */
  private calculateSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.toLowerCase().split(/\s+/));
    const tokensB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);

    return intersection.size / union.size;
  }

  /**
   * Clear all stored patterns (for testing)
   */
  clear(): void {
    this.successPatterns.clear();
    this.failurePatterns.clear();
  }
}

/**
 * Singleton instance
 */
export const patternStorage = new PatternStorage();
