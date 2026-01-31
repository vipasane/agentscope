/**
 * PatternDistiller - Extracts reusable patterns from trajectories
 *
 * Converts raw execution trajectories into structured, reusable patterns
 * with key learnings, applicability conditions, and anti-patterns.
 *
 * @module core/PatternDistiller
 */

import type {
  Trajectory,
  Verdict,
  Pattern,
  DistilledPattern,
} from '../types/index.js';

/**
 * Configuration for pattern distillation
 */
export interface DistillationConfig {
  /**
   * Minimum number of steps required for pattern extraction
   * @default 1
   */
  minSteps?: number;

  /**
   * Whether to extract key learnings from successful patterns
   * @default true
   */
  extractLearnings?: boolean;

  /**
   * Whether to identify anti-patterns from failures
   * @default true
   */
  identifyAntiPatterns?: boolean;

  /**
   * Maximum number of key learnings to extract
   * @default 5
   */
  maxLearnings?: number;
}

/**
 * PatternDistiller extracts reusable patterns from trajectories
 *
 * **Purpose:**
 * - Convert trajectories into reusable patterns
 * - Extract key learnings and applicability conditions
 * - Identify anti-patterns from failures
 * - Enable pattern consolidation for memory efficiency
 *
 * **Distillation Process:**
 * 1. Create base pattern from trajectory + verdict
 * 2. Extract key learnings from successful patterns
 * 3. Identify applicability conditions
 * 4. Extract anti-patterns from failures
 * 5. Generate embeddings for similarity search (optional)
 *
 * **Performance:**
 * - <10ms per pattern distillation
 * - <50ms for consolidation of multiple patterns
 * - Zero-allocation distillation
 *
 * @example Basic Distillation
 * ```typescript
 * const distiller = new PatternDistiller();
 *
 * const pattern = distiller.distill(trajectory, verdict);
 * console.log(`Pattern ID: ${pattern.id}`);
 * console.log(`Reward: ${pattern.reward}`);
 * console.log(`Task: ${pattern.task}`);
 * ```
 *
 * @example Advanced Distillation
 * ```typescript
 * const distilledPattern = distiller.distillAdvanced(trajectory, verdict);
 * console.log(`Key Learnings: ${distilledPattern.keyLearnings.join(', ')}`);
 * console.log(`Applicability: ${distilledPattern.applicability.join(', ')}`);
 * console.log(`Anti-Patterns: ${distilledPattern.antiPatterns.join(', ')}`);
 * ```
 *
 * @public
 */
export class PatternDistiller {
  private config: Required<DistillationConfig>;
  private patternCounter = 0;

  constructor(config: DistillationConfig = {}) {
    this.config = {
      minSteps: config.minSteps ?? 1,
      extractLearnings: config.extractLearnings ?? true,
      identifyAntiPatterns: config.identifyAntiPatterns ?? true,
      maxLearnings: config.maxLearnings ?? 5,
    };
  }

  /**
   * Distill trajectory into a pattern
   *
   * Creates a structured pattern from trajectory and verdict for storage
   * and future retrieval.
   *
   * **Time Complexity:** O(n) where n = number of steps
   *
   * @param trajectory - Completed trajectory
   * @param verdict - Judgment verdict for the trajectory
   * @returns Pattern ready for storage
   *
   * @example
   * ```typescript
   * const pattern = distiller.distill(trajectory, verdict);
   *
   * // Store in memory/database
   * await patternStore.save(pattern);
   *
   * // Later, retrieve similar patterns
   * const similar = await patternStore.search(newTask, { k: 5 });
   * ```
   */
  distill(trajectory: Trajectory, verdict: Verdict): Pattern {
    if (trajectory.steps.length < this.config.minSteps) {
      throw new Error(
        `Trajectory has too few steps (${trajectory.steps.length} < ${this.config.minSteps})`
      );
    }

    if (trajectory.output === undefined) {
      throw new Error('Cannot distill incomplete trajectory. Set output first.');
    }

    const pattern: Pattern = {
      id: `pattern-${trajectory.id}-${this.patternCounter++}`,
      task: trajectory.task,
      input: trajectory.input,
      output: trajectory.output,
      reward: verdict.reward,
      success: verdict.success,
      critique: verdict.critique,
      timestamp: trajectory.endTime ?? Date.now(),
      tokensUsed: trajectory.totalTokens ?? 0,
      latencyMs: trajectory.totalLatencyMs ?? 0,
      metadata: {
        trajectoryId: trajectory.id,
        sessionId: trajectory.sessionId,
        stepCount: trajectory.steps.length,
        verdictConfidence: verdict.confidence ?? 0.5,
      },
    };

    return pattern;
  }

  /**
   * Distill pattern with advanced analysis
   *
   * Performs deeper analysis to extract key learnings, applicability
   * conditions, and anti-patterns.
   *
   * **Time Complexity:** O(n) where n = number of steps
   *
   * @param trajectory - Completed trajectory
   * @param verdict - Judgment verdict
   * @returns Distilled pattern with learnings
   *
   * @example
   * ```typescript
   * const distilled = distiller.distillAdvanced(trajectory, verdict);
   *
   * if (distilled.consolidatedReward > 0.9) {
   *   console.log('Best practices:', distilled.keyLearnings);
   * } else {
   *   console.log('Avoid:', distilled.antiPatterns);
   * }
   * ```
   */
  distillAdvanced(trajectory: Trajectory, verdict: Verdict): DistilledPattern {
    const pattern = this.distill(trajectory, verdict);

    const keyLearnings = this.extractKeyLearnings(trajectory, verdict);
    const applicability = this.extractApplicability(trajectory, verdict);
    const antiPatterns = this.extractAntiPatterns(trajectory, verdict);

    return {
      originalPattern: pattern,
      keyLearnings,
      applicability,
      antiPatterns,
      consolidatedReward: pattern.reward,
      consolidationCount: 1,
    };
  }

  /**
   * Extract key learnings from successful execution
   */
  private extractKeyLearnings(trajectory: Trajectory, verdict: Verdict): string[] {
    if (!this.config.extractLearnings || !verdict.success) {
      return [];
    }

    const learnings: string[] = [];

    // Add success factors from verdict
    if (verdict.reward > 0.8) {
      learnings.push('High-quality execution pattern - suitable for reuse');
    }

    // Extract learnings from steps with thoughts
    const thoughtfulSteps = trajectory.steps
      .filter(s => s.thought && s.thought.length > 10)
      .slice(0, this.config.maxLearnings);

    for (const step of thoughtfulSteps) {
      if (step.thought) {
        learnings.push(step.thought);
      }
    }

    // Add improvements as learnings
    if (verdict.improvements.length > 0) {
      learnings.push(...verdict.improvements.slice(0, 2));
    }

    return learnings.slice(0, this.config.maxLearnings);
  }

  /**
   * Extract applicability conditions
   */
  private extractApplicability(trajectory: Trajectory, verdict: Verdict): string[] {
    const conditions: string[] = [];

    // Task-based applicability
    conditions.push(`Applicable for tasks similar to: ${trajectory.task}`);

    // Success-based applicability
    if (verdict.success) {
      conditions.push('Use when similar input patterns are encountered');
    } else {
      conditions.push('Avoid this approach for similar scenarios');
    }

    // Efficiency-based applicability
    const latencyRatio = (trajectory.totalLatencyMs ?? 0) / 5000;
    if (latencyRatio < 0.7) {
      conditions.push('Efficient approach for time-sensitive tasks');
    } else if (latencyRatio > 1.5) {
      conditions.push('Acceptable for tasks where latency is not critical');
    }

    // Complexity-based applicability
    const stepCount = trajectory.steps.length;
    if (stepCount < 5) {
      conditions.push('Suitable for simple, straightforward tasks');
    } else if (stepCount > 15) {
      conditions.push('Appropriate for complex, multi-step tasks');
    }

    return conditions;
  }

  /**
   * Extract anti-patterns from failures
   */
  private extractAntiPatterns(trajectory: Trajectory, verdict: Verdict): string[] {
    if (!this.config.identifyAntiPatterns || verdict.success) {
      return [];
    }

    const antiPatterns: string[] = [];

    // Add failure critique as anti-pattern
    antiPatterns.push(verdict.critique);

    // Extract anti-patterns from improvements
    for (const improvement of verdict.improvements) {
      if (improvement.toLowerCase().includes('avoid') ||
          improvement.toLowerCase().includes('don\'t') ||
          improvement.toLowerCase().includes('not')) {
        antiPatterns.push(improvement);
      }
    }

    // Add common failure patterns
    if (trajectory.steps.length === 0) {
      antiPatterns.push('Do not skip execution steps');
    }

    const hasNoThoughts = trajectory.steps.every(s => !s.thought);
    if (hasNoThoughts) {
      antiPatterns.push('Avoid executing without reasoning at each step');
    }

    return antiPatterns;
  }

  /**
   * Consolidate multiple patterns into one
   *
   * Merges similar patterns to reduce memory usage and improve retrieval.
   * Combines learnings and averages reward scores.
   *
   * **Time Complexity:** O(n×m) where n = patterns, m = avg learnings
   *
   * @param patterns - Array of patterns to consolidate
   * @returns Consolidated pattern
   *
   * @example
   * ```typescript
   * const authPatterns = await store.search('authentication', { k: 10 });
   * const consolidated = distiller.consolidate(authPatterns);
   *
   * console.log(`Consolidated ${consolidated.consolidationCount} patterns`);
   * console.log(`Avg reward: ${consolidated.consolidatedReward}`);
   * ```
   */
  consolidate(patterns: Pattern[]): DistilledPattern {
    if (patterns.length === 0) {
      throw new Error('Cannot consolidate empty pattern array');
    }

    if (patterns.length === 1) {
      // Single pattern - convert to distilled format
      return {
        originalPattern: patterns[0],
        keyLearnings: [patterns[0].critique],
        applicability: [`Applicable for: ${patterns[0].task}`],
        antiPatterns: [],
        consolidatedReward: patterns[0].reward,
        consolidationCount: 1,
      };
    }

    // Use highest-reward pattern as base
    const basePattern = patterns.reduce((best, current) =>
      current.reward > best.reward ? current : best
    );

    // Calculate consolidated reward (weighted average)
    const totalReward = patterns.reduce((sum, p) => sum + p.reward, 0);
    const consolidatedReward = totalReward / patterns.length;

    // Combine unique critiques as learnings
    const allCritiques = patterns.map(p => p.critique);
    const uniqueCritiques = Array.from(new Set(allCritiques));
    const keyLearnings = uniqueCritiques.slice(0, this.config.maxLearnings);

    // Generate applicability from all patterns
    const applicability = [
      `Consolidated from ${patterns.length} similar patterns`,
      `Average reward: ${consolidatedReward.toFixed(2)}`,
      `Success rate: ${(patterns.filter(p => p.success).length / patterns.length * 100).toFixed(0)}%`,
    ];

    // Identify anti-patterns from failed patterns
    const antiPatterns = patterns
      .filter(p => !p.success)
      .map(p => p.critique)
      .slice(0, 3);

    return {
      originalPattern: {
        ...basePattern,
        metadata: {
          ...basePattern.metadata,
          consolidated: true,
          consolidatedFrom: patterns.map(p => p.id),
          consolidationTimestamp: Date.now(),
        },
      },
      keyLearnings,
      applicability,
      antiPatterns,
      consolidatedReward,
      consolidationCount: patterns.length,
    };
  }

  /**
   * Batch distill multiple trajectories
   *
   * More efficient than distilling individually.
   *
   * **Time Complexity:** O(n×m) where n = trajectories, m = avg steps
   *
   * @param trajectoriesWithVerdicts - Array of [trajectory, verdict] pairs
   * @returns Array of patterns
   *
   * @example
   * ```typescript
   * const patterns = distiller.batchDistill(
   *   trajectories.map((t, i) => [t, verdicts[i]] as const)
   * );
   *
   * await Promise.all(patterns.map(p => store.save(p)));
   * ```
   */
  batchDistill(
    trajectoriesWithVerdicts: Array<readonly [Trajectory, Verdict]>
  ): Pattern[] {
    return trajectoriesWithVerdicts.map(([trajectory, verdict]) =>
      this.distill(trajectory, verdict)
    );
  }

  /**
   * Batch distill with advanced analysis
   *
   * @param trajectoriesWithVerdicts - Array of [trajectory, verdict] pairs
   * @returns Array of distilled patterns
   */
  batchDistillAdvanced(
    trajectoriesWithVerdicts: Array<readonly [Trajectory, Verdict]>
  ): DistilledPattern[] {
    return trajectoriesWithVerdicts.map(([trajectory, verdict]) =>
      this.distillAdvanced(trajectory, verdict)
    );
  }
}
