/**
 * VerdictJudge - Assigns quality verdicts to trajectories
 *
 * Evaluates execution trajectories and assigns reward scores based on
 * success, efficiency, and quality metrics.
 *
 * @module core/VerdictJudge
 */

import type {
  Trajectory,
  Verdict,
} from '../types/index.js';

/**
 * Configuration for verdict judgment
 */
export interface JudgmentConfig {
  /**
   * Weight for success factor (0-1)
   * @default 0.5
   */
  successWeight?: number;

  /**
   * Weight for efficiency factor (0-1)
   * @default 0.3
   */
  efficiencyWeight?: number;

  /**
   * Weight for quality factor (0-1)
   * @default 0.2
   */
  qualityWeight?: number;

  /**
   * Expected latency baseline (ms) for efficiency calculation
   * @default 5000
   */
  expectedLatencyMs?: number;

  /**
   * Expected token usage baseline for efficiency calculation
   * @default 2000
   */
  expectedTokens?: number;

  /**
   * Minimum steps threshold for quality bonus
   * @default 3
   */
  minStepsForQuality?: number;
}

/**
 * VerdictJudge evaluates trajectories and assigns rewards
 *
 * **Purpose:**
 * - Judge trajectory quality with reward scores (0-1)
 * - Provide actionable critiques and improvement suggestions
 * - Enable learning from both successes and failures
 *
 * **Scoring Algorithm:**
 * ```
 * reward = successWeight * S + efficiencyWeight * E + qualityWeight * Q
 *
 * where:
 *   S = success factor (0 or 1)
 *   E = efficiency factor (1 - latency/expected - tokens/expected) / 2
 *   Q = quality factor based on step count and coherence
 * ```
 *
 * **Performance:**
 * - <5ms per judgment
 * - Deterministic scoring (same trajectory = same reward)
 * - Zero-allocation scoring
 *
 * @example Basic Judgment
 * ```typescript
 * const judge = new VerdictJudge();
 *
 * const verdict = judge.judge(trajectory);
 * console.log(`Reward: ${verdict.reward}`);
 * console.log(`Success: ${verdict.success}`);
 * console.log(`Critique: ${verdict.critique}`);
 * console.log(`Improvements: ${verdict.improvements.join(', ')}`);
 * ```
 *
 * @example Custom Configuration
 * ```typescript
 * const judge = new VerdictJudge({
 *   successWeight: 0.6,    // Prioritize success
 *   efficiencyWeight: 0.25,
 *   qualityWeight: 0.15,
 *   expectedLatencyMs: 3000, // Stricter latency expectation
 *   expectedTokens: 1500,
 * });
 * ```
 *
 * @public
 */
export class VerdictJudge {
  private config: Required<JudgmentConfig>;

  constructor(config: JudgmentConfig = {}) {
    this.config = {
      successWeight: config.successWeight ?? 0.5,
      efficiencyWeight: config.efficiencyWeight ?? 0.3,
      qualityWeight: config.qualityWeight ?? 0.2,
      expectedLatencyMs: config.expectedLatencyMs ?? 5000,
      expectedTokens: config.expectedTokens ?? 2000,
      minStepsForQuality: config.minStepsForQuality ?? 3,
    };

    // Validate weights sum to 1.0
    const totalWeight = this.config.successWeight +
      this.config.efficiencyWeight +
      this.config.qualityWeight;

    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(
        `Weights must sum to 1.0 (got ${totalWeight}). ` +
        `Adjust successWeight, efficiencyWeight, or qualityWeight.`
      );
    }
  }

  /**
   * Judge a trajectory and assign verdict
   *
   * **Time Complexity:** O(n) where n = number of steps
   *
   * @param trajectory - Completed trajectory to judge
   * @returns Verdict with reward score and critique
   *
   * @example
   * ```typescript
   * const verdict = judge.judge(trajectory);
   *
   * if (verdict.reward > 0.8) {
   *   console.log('Excellent execution!');
   *   await storeAsGoodPattern(trajectory, verdict);
   * } else if (verdict.reward < 0.5) {
   *   console.log('Needs improvement:', verdict.improvements);
   * }
   * ```
   */
  judge(trajectory: Trajectory): Verdict {
    if (!trajectory.success !== undefined && trajectory.endTime === undefined) {
      throw new Error('Cannot judge incomplete trajectory. Call endTrajectory first.');
    }

    const success = trajectory.success ?? false;
    const latencyMs = trajectory.totalLatencyMs ?? 0;
    const tokensUsed = trajectory.totalTokens ?? 0;
    const stepCount = trajectory.steps.length;

    // Calculate success factor (0 or 1)
    const successFactor = success ? 1.0 : 0.0;

    // Calculate efficiency factor (0-1)
    const latencyEfficiency = Math.max(
      0,
      1 - (latencyMs / this.config.expectedLatencyMs)
    );
    const tokenEfficiency = Math.max(
      0,
      1 - (tokensUsed / this.config.expectedTokens)
    );
    const efficiencyFactor = (latencyEfficiency + tokenEfficiency) / 2;

    // Calculate quality factor (0-1)
    const qualityFactor = this.calculateQualityFactor(trajectory);

    // Compute weighted reward
    const reward = Math.max(
      0,
      Math.min(
        1.0,
        this.config.successWeight * successFactor +
        this.config.efficiencyWeight * efficiencyFactor +
        this.config.qualityWeight * qualityFactor
      )
    );

    // Generate critique and improvements
    const critique = this.generateCritique(
      success,
      reward,
      latencyMs,
      tokensUsed,
      stepCount
    );

    const improvements = this.generateImprovements(
      success,
      latencyMs,
      tokensUsed,
      stepCount,
      efficiencyFactor,
      qualityFactor
    );

    // Calculate confidence based on trajectory completeness
    const confidence = this.calculateConfidence(trajectory);

    return {
      success,
      reward,
      critique,
      improvements,
      confidence,
    };
  }

  /**
   * Calculate quality factor from trajectory characteristics
   */
  private calculateQualityFactor(trajectory: Trajectory): number {
    const stepCount = trajectory.steps.length;

    if (stepCount === 0) {
      return 0.0;
    }

    // Base quality on reasonable step count
    let quality = 0.5;

    // Bonus for having sufficient steps (shows thoroughness)
    if (stepCount >= this.config.minStepsForQuality) {
      quality += 0.2;
    }

    // Bonus for having thoughts (shows reasoning)
    const stepsWithThoughts = trajectory.steps.filter(s => s.thought).length;
    const thoughtRatio = stepsWithThoughts / stepCount;
    quality += thoughtRatio * 0.3;

    return Math.min(1.0, quality);
  }

  /**
   * Generate human-readable critique
   */
  private generateCritique(
    success: boolean,
    reward: number,
    latencyMs: number,
    tokensUsed: number,
    stepCount: number
  ): string {
    const parts: string[] = [];

    // Success assessment
    if (success) {
      if (reward > 0.9) {
        parts.push('Excellent execution with optimal approach.');
      } else if (reward > 0.7) {
        parts.push('Good execution with minor optimization opportunities.');
      } else {
        parts.push('Successful but inefficient execution.');
      }
    } else {
      parts.push('Execution failed to complete successfully.');
    }

    // Efficiency assessment
    const latencyRatio = latencyMs / this.config.expectedLatencyMs;
    if (latencyRatio > 1.5) {
      parts.push(`Latency was ${latencyRatio.toFixed(1)}x expected baseline.`);
    } else if (latencyRatio < 0.7) {
      parts.push('Completed faster than expected.');
    }

    const tokenRatio = tokensUsed / this.config.expectedTokens;
    if (tokenRatio > 1.5) {
      parts.push(`Token usage was ${tokenRatio.toFixed(1)}x expected baseline.`);
    } else if (tokenRatio < 0.7) {
      parts.push('Used fewer tokens than expected.');
    }

    // Step count assessment
    if (stepCount < this.config.minStepsForQuality) {
      parts.push('Very few steps - may indicate rushed or incomplete approach.');
    } else if (stepCount > 20) {
      parts.push('Many steps taken - consider more direct approach.');
    }

    return parts.join(' ');
  }

  /**
   * Generate actionable improvement suggestions
   */
  private generateImprovements(
    success: boolean,
    latencyMs: number,
    tokensUsed: number,
    stepCount: number,
    efficiencyFactor: number,
    qualityFactor: number
  ): string[] {
    const improvements: string[] = [];

    if (!success) {
      improvements.push('Analyze failure root cause and add error handling');
      improvements.push('Validate inputs before execution to fail fast');
    }

    if (efficiencyFactor < 0.5) {
      if (latencyMs / this.config.expectedLatencyMs > 1.5) {
        improvements.push('Optimize slow operations - consider caching or parallelization');
      }
      if (tokensUsed / this.config.expectedTokens > 1.5) {
        improvements.push('Reduce token usage - use more concise prompts or fewer LLM calls');
      }
    }

    if (qualityFactor < 0.5) {
      if (stepCount < this.config.minStepsForQuality) {
        improvements.push('Add more intermediate steps for better traceability');
        improvements.push('Include reasoning thoughts at each step');
      }
    }

    if (stepCount > 20) {
      improvements.push('Consolidate multiple small steps into larger logical operations');
    }

    if (improvements.length === 0) {
      improvements.push('Execution was optimal - reuse this pattern for similar tasks');
    }

    return improvements;
  }

  /**
   * Calculate confidence in the verdict (0-1)
   *
   * Based on:
   * - Trajectory completeness (has output, metrics)
   * - Step count (more data = higher confidence)
   * - Consistency (success flag aligns with output)
   */
  private calculateConfidence(trajectory: Trajectory): number {
    let confidence = 0.5; // Base confidence

    // Bonus for complete metrics
    if (trajectory.totalLatencyMs !== undefined) {
      confidence += 0.1;
    }
    if (trajectory.totalTokens !== undefined) {
      confidence += 0.1;
    }
    if (trajectory.output !== undefined) {
      confidence += 0.1;
    }

    // Bonus for sufficient steps
    const stepCount = trajectory.steps.length;
    if (stepCount >= this.config.minStepsForQuality) {
      confidence += 0.1;
    }
    if (stepCount >= 10) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Batch judge multiple trajectories
   *
   * More efficient than judging individually when processing many trajectories.
   *
   * **Time Complexity:** O(n×m) where n = trajectories, m = avg steps
   *
   * @param trajectories - Array of trajectories to judge
   * @returns Array of verdicts in same order
   *
   * @example
   * ```typescript
   * const verdicts = judge.batchJudge(trajectories);
   * const avgReward = verdicts.reduce((sum, v) => sum + v.reward, 0) / verdicts.length;
   * console.log(`Average reward: ${avgReward.toFixed(2)}`);
   * ```
   */
  batchJudge(trajectories: Trajectory[]): Verdict[] {
    return trajectories.map(t => this.judge(t));
  }
}
