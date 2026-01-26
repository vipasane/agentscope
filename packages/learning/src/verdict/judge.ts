/**
 * Verdict judgment for trajectory evaluation
 *
 * Judges whether a trajectory was successful and provides detailed feedback.
 * Uses pattern matching and heuristics to evaluate execution quality.
 */

import { Trajectory, Verdict, Pattern } from '../types';

export interface JudgmentCriteria {
  /** Minimum success criteria */
  minSuccessRate?: number;
  /** Weight for execution efficiency (0-1) */
  efficiencyWeight?: number;
  /** Weight for result quality (0-1) */
  qualityWeight?: number;
  /** Maximum acceptable latency (ms) */
  maxLatencyMs?: number;
  /** Custom evaluation function */
  customEvaluator?: (trajectory: Trajectory) => number;
}

export class VerdictJudge {
  private defaultCriteria: Required<JudgmentCriteria> = {
    minSuccessRate: 0.7,
    efficiencyWeight: 0.3,
    qualityWeight: 0.7,
    maxLatencyMs: 30000, // 30 seconds
    customEvaluator: () => 0.5,
  };

  /**
   * Judge a trajectory based on criteria
   *
   * @param trajectory - The trajectory to evaluate
   * @param criteria - Optional custom judgment criteria
   * @returns Verdict with success status and feedback
   */
  judge(
    trajectory: Trajectory,
    criteria?: JudgmentCriteria
  ): Verdict {
    const config = { ...this.defaultCriteria, ...criteria };

    // Basic success check
    if (trajectory.success === undefined) {
      throw new Error('Trajectory must be completed before judgment');
    }

    const baseSuccess = trajectory.success;

    // Compute efficiency score
    const efficiencyScore = this.computeEfficiencyScore(trajectory, config);

    // Compute quality score
    const qualityScore = this.computeQualityScore(trajectory, config);

    // Combined reward
    const reward =
      config.efficiencyWeight * efficiencyScore +
      config.qualityWeight * qualityScore;

    // Determine final success based on reward threshold
    const success = baseSuccess && reward >= config.minSuccessRate;

    // Generate critique
    const critique = this.generateCritique(
      trajectory,
      success,
      efficiencyScore,
      qualityScore
    );

    // Generate improvements
    const improvements = this.generateImprovements(
      trajectory,
      efficiencyScore,
      qualityScore,
      config
    );

    return {
      success,
      reward: Math.max(0, Math.min(1, reward)),
      critique,
      improvements,
      confidence: this.computeConfidence(trajectory),
    };
  }

  /**
   * Judge based on similar patterns
   *
   * @param trajectory - The trajectory to evaluate
   * @param similarPatterns - Similar patterns from history
   * @returns Verdict based on pattern matching
   */
  judgeWithPatterns(
    trajectory: Trajectory,
    similarPatterns: Pattern[]
  ): Verdict {
    if (similarPatterns.length === 0) {
      // No patterns, use basic judgment
      return this.judge(trajectory);
    }

    // Compute success rate from similar patterns
    const successRate = similarPatterns.filter(p => p.success).length /
      similarPatterns.length;

    // Average reward from similar patterns
    const avgReward = similarPatterns.reduce((sum, p) => sum + p.reward, 0) /
      similarPatterns.length;

    // Determine if current trajectory matches successful pattern
    const success = trajectory.success === true && successRate >= 0.6;

    // Generate critique based on patterns
    const critique = this.generatePatternBasedCritique(
      trajectory,
      similarPatterns,
      successRate
    );

    // Extract improvements from successful patterns
    const improvements = this.extractImprovementsFromPatterns(similarPatterns);

    return {
      success,
      reward: Math.max(0, Math.min(1, avgReward * (success ? 1.0 : 0.5))),
      critique,
      improvements,
      confidence: Math.min(similarPatterns.length / 10, 1.0),
    };
  }

  private computeEfficiencyScore(
    trajectory: Trajectory,
    config: Required<JudgmentCriteria>
  ): number {
    const latency = trajectory.totalLatencyMs || 0;

    // Penalty for exceeding max latency
    if (latency > config.maxLatencyMs) {
      return 0.3; // Low score for timeout
    }

    // Score based on latency (faster = better)
    const latencyScore = 1 - Math.min(latency / config.maxLatencyMs, 1);

    // Score based on number of steps (fewer = more efficient)
    const stepsScore = Math.max(0, 1 - trajectory.steps.length / 20);

    return (latencyScore + stepsScore) / 2;
  }

  private computeQualityScore(
    trajectory: Trajectory,
    config: Required<JudgmentCriteria>
  ): number {
    // Base quality from success flag
    let qualityScore = trajectory.success ? 0.8 : 0.2;

    // Custom evaluator can override
    if (config.customEvaluator) {
      const customScore = config.customEvaluator(trajectory);
      qualityScore = (qualityScore + customScore) / 2;
    }

    return qualityScore;
  }

  private computeConfidence(trajectory: Trajectory): number {
    // Confidence based on trajectory completeness
    const hasOutput = trajectory.output !== undefined;
    const hasSteps = trajectory.steps.length > 0;
    const isComplete = trajectory.endTime !== undefined;

    let confidence = 0.5;
    if (hasOutput) confidence += 0.2;
    if (hasSteps) confidence += 0.2;
    if (isComplete) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateCritique(
    trajectory: Trajectory,
    success: boolean,
    efficiencyScore: number,
    qualityScore: number
  ): string {
    const parts: string[] = [];

    if (success) {
      parts.push('Trajectory completed successfully.');
    } else {
      parts.push('Trajectory did not meet success criteria.');
    }

    if (efficiencyScore < 0.5) {
      parts.push('Execution was inefficient.');
    } else if (efficiencyScore > 0.8) {
      parts.push('Execution was highly efficient.');
    }

    if (qualityScore < 0.5) {
      parts.push('Output quality needs improvement.');
    } else if (qualityScore > 0.8) {
      parts.push('Output quality was excellent.');
    }

    if (trajectory.steps.length > 15) {
      parts.push('Too many steps - consider simplifying approach.');
    }

    return parts.join(' ');
  }

  private generateImprovements(
    trajectory: Trajectory,
    efficiencyScore: number,
    qualityScore: number,
    config: Required<JudgmentCriteria>
  ): string[] {
    const improvements: string[] = [];

    if (efficiencyScore < 0.6) {
      improvements.push('Optimize execution path to reduce latency');
      improvements.push('Reduce number of intermediate steps');
    }

    if (qualityScore < 0.6) {
      improvements.push('Improve output quality through better validation');
      improvements.push('Add error handling for edge cases');
    }

    if (trajectory.totalLatencyMs &&
        trajectory.totalLatencyMs > config.maxLatencyMs * 0.8) {
      improvements.push('Performance optimization needed');
    }

    return improvements;
  }

  private generatePatternBasedCritique(
    trajectory: Trajectory,
    patterns: Pattern[],
    successRate: number
  ): string {
    const successful = patterns.filter(p => p.success);
    const failed = patterns.filter(p => !p.success);

    const parts: string[] = [];

    parts.push(
      `Based on ${patterns.length} similar past trajectories ` +
      `(${(successRate * 100).toFixed(0)}% success rate).`
    );

    if (successRate >= 0.8) {
      parts.push('This approach has historically been very successful.');
    } else if (successRate <= 0.3) {
      parts.push('This approach has frequently failed in the past.');
    }

    if (successful.length > 0) {
      const avgReward = successful.reduce((s, p) => s + p.reward, 0) /
        successful.length;
      parts.push(
        `Successful patterns achieved average reward of ${avgReward.toFixed(2)}.`
      );
    }

    return parts.join(' ');
  }

  private extractImprovementsFromPatterns(patterns: Pattern[]): string[] {
    const improvements = new Set<string>();

    // Extract critiques from successful patterns
    patterns
      .filter(p => p.success && p.reward > 0.8)
      .forEach(p => {
        // Parse critique for improvement suggestions
        if (p.critique.includes('optimize')) {
          improvements.add('Apply optimization techniques from successful patterns');
        }
        if (p.critique.includes('error handling')) {
          improvements.add('Implement robust error handling');
        }
        if (p.critique.includes('test')) {
          improvements.add('Add comprehensive test coverage');
        }
      });

    // Extract lessons from failed patterns
    patterns
      .filter(p => !p.success)
      .forEach(p => {
        if (p.critique.includes('timeout')) {
          improvements.add('Avoid approaches that risk timeout');
        }
        if (p.critique.includes('memory')) {
          improvements.add('Monitor memory usage carefully');
        }
      });

    return Array.from(improvements);
  }
}
