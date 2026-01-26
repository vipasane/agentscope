/**
 * Memory distillation for pattern extraction
 *
 * Consolidates multiple similar patterns into distilled high-level learnings.
 * Reduces storage requirements while preserving key knowledge.
 */

import { Pattern, DistilledPattern, Trajectory } from '../types';

export interface DistillationConfig {
  /** Minimum similarity threshold for pattern grouping (0-1) */
  similarityThreshold: number;
  /** Minimum number of patterns to form a distilled pattern */
  minPatternsForDistillation: number;
  /** Maximum number of key learnings to extract */
  maxKeyLearnings: number;
  /** Whether to preserve individual patterns after distillation */
  preserveOriginals: boolean;
}

export class MemoryDistiller {
  private defaultConfig: DistillationConfig = {
    similarityThreshold: 0.85,
    minPatternsForDistillation: 3,
    maxKeyLearnings: 5,
    preserveOriginals: false,
  };

  /**
   * Distill a single trajectory into a pattern
   *
   * @param trajectory - Completed trajectory to distill
   * @param verdict - Judgment verdict for the trajectory
   * @returns Distilled pattern
   */
  distillTrajectory(
    trajectory: Trajectory,
    verdict: { success: boolean; reward: number; critique: string }
  ): Pattern {
    // Extract pattern from trajectory
    const pattern: Pattern = {
      id: `pattern-${trajectory.id}`,
      task: trajectory.task,
      input: trajectory.input,
      output: trajectory.output,
      reward: verdict.reward,
      success: verdict.success,
      critique: verdict.critique,
      timestamp: trajectory.endTime || Date.now(),
      tokensUsed: trajectory.totalTokens || 0,
      latencyMs: trajectory.totalLatencyMs || 0,
      metadata: {
        trajectoryId: trajectory.id,
        sessionId: trajectory.sessionId,
        stepCount: trajectory.steps.length,
      },
    };

    return pattern;
  }

  /**
   * Distill multiple similar patterns into a consolidated pattern
   *
   * @param patterns - Array of similar patterns
   * @param config - Optional distillation configuration
   * @returns Distilled pattern with consolidated learnings
   */
  distillPatterns(
    patterns: Pattern[],
    config?: Partial<DistillationConfig>
  ): DistilledPattern {
    const cfg = { ...this.defaultConfig, ...config };

    if (patterns.length < cfg.minPatternsForDistillation) {
      throw new Error(
        `Need at least ${cfg.minPatternsForDistillation} patterns, got ${patterns.length}`
      );
    }

    // Sort by reward (best first)
    const sorted = patterns.sort((a, b) => b.reward - a.reward);
    const bestPattern = sorted[0];

    // Extract key learnings
    const keyLearnings = this.extractKeyLearnings(patterns, cfg);

    // Determine applicability conditions
    const applicability = this.determineApplicability(patterns);

    // Identify anti-patterns from failed attempts
    const antiPatterns = this.identifyAntiPatterns(patterns);

    // Compute consolidated reward
    const consolidatedReward = this.computeConsolidatedReward(patterns);

    return {
      originalPattern: bestPattern,
      keyLearnings,
      applicability,
      antiPatterns,
      consolidatedReward,
      consolidationCount: patterns.length,
    };
  }

  /**
   * Extract key learnings from multiple patterns
   */
  private extractKeyLearnings(
    patterns: Pattern[],
    config: DistillationConfig
  ): string[] {
    const learnings: Map<string, number> = new Map();

    // Extract common themes from successful patterns
    const successful = patterns.filter(p => p.success && p.reward > 0.7);

    for (const pattern of successful) {
      // Extract learnings from critique
      const insights = this.extractInsights(pattern.critique);

      for (const insight of insights) {
        learnings.set(insight, (learnings.get(insight) || 0) + 1);
      }
    }

    // Sort by frequency and take top N
    const sorted = Array.from(learnings.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, config.maxKeyLearnings)
      .map(([learning]) => learning);

    return sorted;
  }

  /**
   * Extract insights from critique text
   */
  private extractInsights(critique: string): string[] {
    const insights: string[] = [];

    // Simple heuristic: look for key phrases
    const patterns = [
      /optimize[d]?\s+(.+?)(?:\.|$)/gi,
      /improv[ed]\s+(.+?)(?:\.|$)/gi,
      /use[d]?\s+(.+?)(?:\.|$)/gi,
      /implement[ed]\s+(.+?)(?:\.|$)/gi,
      /avoid[ed]?\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of patterns) {
      const matches = critique.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          insights.push(match[1].trim());
        }
      }
    }

    return insights;
  }

  /**
   * Determine when the pattern is applicable
   */
  private determineApplicability(patterns: Pattern[]): string[] {
    const conditions: Set<string> = new Set();

    // Analyze task descriptions
    const tasks = patterns.map(p => p.task.toLowerCase());

    // Find common words in tasks
    const wordFreq = this.computeWordFrequency(tasks);

    // Extract top common themes
    const themes = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    if (themes.length > 0) {
      conditions.add(`When working on ${themes.join(' or ')} tasks`);
    }

    // Check metadata for common conditions
    const hasTestPatterns = patterns.some(p =>
      p.metadata?.testCoverage !== undefined
    );
    if (hasTestPatterns) {
      conditions.add('When test coverage is important');
    }

    const avgLatency = patterns.reduce((s, p) => s + p.latencyMs, 0) /
      patterns.length;
    if (avgLatency < 1000) {
      conditions.add('For time-sensitive operations');
    }

    return Array.from(conditions);
  }

  /**
   * Identify anti-patterns from failures
   */
  private identifyAntiPatterns(patterns: Pattern[]): string[] {
    const antiPatterns: Set<string> = new Set();

    // Analyze failed patterns
    const failed = patterns.filter(p => !p.success || p.reward < 0.5);

    for (const pattern of failed) {
      // Extract what went wrong
      const issues = this.extractIssues(pattern.critique);
      issues.forEach(issue => antiPatterns.add(issue));
    }

    return Array.from(antiPatterns);
  }

  /**
   * Extract issues from critique text
   */
  private extractIssues(critique: string): string[] {
    const issues: string[] = [];

    const negativePatterns = [
      /fail[ed]\s+(.+?)(?:\.|$)/gi,
      /error[s]?\s+(.+?)(?:\.|$)/gi,
      /timeout[s]?\s+(.+?)(?:\.|$)/gi,
      /could not\s+(.+?)(?:\.|$)/gi,
      /avoid\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of negativePatterns) {
      const matches = critique.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          issues.push(`Avoid: ${match[1].trim()}`);
        }
      }
    }

    return issues;
  }

  /**
   * Compute consolidated reward from multiple patterns
   */
  private computeConsolidatedReward(patterns: Pattern[]): number {
    // Weighted average: recent patterns have higher weight
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;

    for (const pattern of patterns) {
      // Weight decreases with age (exponential decay)
      const ageMs = now - pattern.timestamp;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-ageDays / 30); // 30-day half-life

      weightedSum += pattern.reward * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Compute word frequency for text analysis
   */
  private computeWordFrequency(texts: string[]): Map<string, number> {
    const freq = new Map<string, number>();

    // Common stop words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
    ]);

    for (const text of texts) {
      const words = text.toLowerCase().split(/\s+/);

      for (const word of words) {
        const cleaned = word.replace(/[^a-z]/g, '');

        if (cleaned.length > 3 && !stopWords.has(cleaned)) {
          freq.set(cleaned, (freq.get(cleaned) || 0) + 1);
        }
      }
    }

    return freq;
  }
}
