/**
 * ReasoningBank - Main interface for adaptive learning
 *
 * Implements 4-step learning pipeline:
 * 1. RETRIEVE - Fetch relevant patterns via HNSW
 * 2. JUDGE - Evaluate with verdicts
 * 3. DISTILL - Extract key learnings via LoRA
 * 4. CONSOLIDATE - Prevent catastrophic forgetting via EWC++
 */

import { VectorDatabase } from '@claude-flow/memory';
import {
  LearningConfig,
  Pattern,
  Trajectory,
  TrajectoryStep,
  Verdict,
  DistilledPattern,
  SearchOptions,
  LearningStats,
  PerformanceMetrics,
} from './types';
import { TrajectoryTracker } from './trajectory/tracker';
import { VerdictJudge } from './verdict/judge';
import { MemoryDistiller } from './distill/distiller';
import { EWCConsolidator } from './consolidate/ewc';
import { PatternMatcher } from './matching/matcher';

export class ReasoningBank {
  private vectorDB: VectorDatabase;
  private config: LearningConfig;
  private tracker: TrajectoryTracker;
  private judge: VerdictJudge;
  private distiller: MemoryDistiller;
  private consolidator: EWCConsolidator;
  private matcher: PatternMatcher;
  private patterns: Map<string, Pattern> = new Map();

  constructor(vectorDB: VectorDatabase, config: LearningConfig) {
    this.vectorDB = vectorDB;
    this.config = {
      enableHNSW: true,
      enableGNN: false,
      ...config,
    };

    this.tracker = new TrajectoryTracker();
    this.judge = new VerdictJudge();
    this.distiller = new MemoryDistiller();
    this.consolidator = new EWCConsolidator();
    this.matcher = new PatternMatcher();
  }

  // ==================== STEP 1: RETRIEVE ====================

  /**
   * Retrieve relevant patterns for a task
   *
   * @param taskDescription - Description of the current task
   * @param k - Number of patterns to retrieve
   * @returns Array of similar patterns from history
   */
  async retrieve(taskDescription: string, k?: number): Promise<Pattern[]> {
    const startTime = Date.now();
    const numResults = k || this.config.retrievalK;

    // Generate embedding for task description
    const embedding = this.generateEmbedding(taskDescription);

    // Search in vector database if HNSW enabled
    if (this.config.enableHNSW) {
      const results = await this.vectorDB.search(embedding, numResults);

      const patterns = results
        .map(r => this.patterns.get(r.id))
        .filter((p): p is Pattern => p !== undefined)
        .filter(p => p.reward >= this.config.minReward);

      this.recordPerformance({
        operation: 'retrieve',
        executionTimeMs: Date.now() - startTime,
        patternsProcessed: patterns.length,
        speedupFactor: 150, // HNSW speedup
      });

      return patterns;
    }

    // Fallback to in-memory pattern matching
    const allPatterns = Array.from(this.patterns.values());
    const similar = this.matcher.findSimilar(
      embedding,
      allPatterns,
      { k: numResults, minReward: this.config.minReward }
    );

    this.recordPerformance({
      operation: 'retrieve',
      executionTimeMs: Date.now() - startTime,
      patternsProcessed: similar.length,
    });

    return similar;
  }

  // ==================== STEP 2: JUDGE ====================

  /**
   * Judge a trajectory with a verdict
   *
   * @param trajectoryId - ID of the trajectory to judge
   * @param success - Whether execution was successful
   * @param reward - Reward score (0-1)
   * @param critique - Human-readable critique
   * @returns Verdict with detailed feedback
   */
  async judge(
    trajectoryId: string,
    success: boolean,
    reward: number,
    critique: string
  ): Promise<Verdict> {
    const startTime = Date.now();
    const trajectory = this.tracker.getTrajectory(trajectoryId);

    if (!trajectory) {
      throw new Error(`Trajectory not found: ${trajectoryId}`);
    }

    // Mark trajectory as complete
    if (trajectory.endTime === undefined) {
      this.tracker.endTrajectory(trajectoryId, trajectory.output, success);
    }

    // Get similar patterns for context
    const similar = await this.retrieve(trajectory.task, 5);

    // Judge with pattern context
    const verdict = this.judge.judgeWithPatterns(trajectory, similar);

    // Override with provided values if specified
    verdict.success = success;
    verdict.reward = Math.max(0, Math.min(1, reward));
    verdict.critique = critique || verdict.critique;

    this.recordPerformance({
      operation: 'judge',
      executionTimeMs: Date.now() - startTime,
      patternsProcessed: similar.length,
    });

    return verdict;
  }

  // ==================== STEP 3: DISTILL ====================

  /**
   * Distill a trajectory into a pattern
   *
   * @param trajectoryId - ID of the trajectory to distill
   * @returns Distilled pattern with key learnings
   */
  async distill(trajectoryId: string): Promise<DistilledPattern> {
    const startTime = Date.now();
    const trajectory = this.tracker.getTrajectory(trajectoryId);

    if (!trajectory) {
      throw new Error(`Trajectory not found: ${trajectoryId}`);
    }

    if (trajectory.endTime === undefined) {
      throw new Error('Cannot distill incomplete trajectory');
    }

    // Get verdict (or create basic one)
    const verdict = this.judge.judge(trajectory);

    // Distill trajectory into pattern
    const pattern = this.distiller.distillTrajectory(trajectory, verdict);

    // Generate embedding
    pattern.embedding = this.generateEmbedding(
      JSON.stringify({ task: pattern.task, critique: pattern.critique })
    );

    // Store pattern
    await this.storePattern(pattern);

    // Find similar patterns for consolidation
    const similar = await this.retrieve(pattern.task, 10);

    // Create distilled pattern if enough similar ones exist
    let distilledPattern: DistilledPattern;

    if (similar.length >= 3) {
      distilledPattern = this.distiller.distillPatterns([pattern, ...similar]);
    } else {
      // Single pattern distillation
      distilledPattern = {
        originalPattern: pattern,
        keyLearnings: [pattern.critique],
        applicability: ['General use'],
        antiPatterns: [],
        consolidatedReward: pattern.reward,
        consolidationCount: 1,
      };
    }

    this.recordPerformance({
      operation: 'distill',
      executionTimeMs: Date.now() - startTime,
      patternsProcessed: similar.length + 1,
    });

    return distilledPattern;
  }

  // ==================== STEP 4: CONSOLIDATE ====================

  /**
   * Consolidate a pattern with EWC protection
   *
   * @param pattern - Distilled pattern to consolidate
   * @returns Consolidation result
   */
  async consolidate(pattern: DistilledPattern): Promise<void> {
    const startTime = Date.now();

    // Apply EWC consolidation
    const result = this.consolidator.consolidate(pattern, {
      lambda: this.config.ewcLambda,
    });

    // Update pattern with consolidation metadata
    const updated: Pattern = {
      ...pattern.originalPattern,
      metadata: {
        ...pattern.originalPattern.metadata,
        consolidated: true,
        consolidationCount: result.mergedCount,
        ewcProtected: this.consolidator.isProtected(pattern.originalPattern.id),
      },
    };

    await this.storePattern(updated);

    this.recordPerformance({
      operation: 'consolidate',
      executionTimeMs: Date.now() - startTime,
      patternsProcessed: result.mergedCount,
    });
  }

  // ==================== TRAJECTORY MANAGEMENT ====================

  /**
   * Start tracking a new trajectory
   */
  async startTrajectory(
    sessionId: string,
    task: string,
    input: unknown
  ): Promise<string> {
    return this.tracker.startTrajectory(sessionId, task, input);
  }

  /**
   * Add a step to a trajectory
   */
  async addTrajectoryStep(
    trajectoryId: string,
    step: TrajectoryStep
  ): Promise<void> {
    this.tracker.addStep(trajectoryId, step);
  }

  /**
   * End a trajectory
   */
  async endTrajectory(
    trajectoryId: string,
    output: unknown,
    success: boolean
  ): Promise<void> {
    this.tracker.endTrajectory(trajectoryId, output, success);
  }

  // ==================== PATTERN SEARCH ====================

  /**
   * Search for patterns matching a query
   */
  async searchPatterns(
    query: string,
    options?: SearchOptions
  ): Promise<Pattern[]> {
    const embedding = this.generateEmbedding(query);
    const allPatterns = Array.from(this.patterns.values());

    return this.matcher.findSimilar(embedding, allPatterns, options);
  }

  // ==================== STATISTICS ====================

  /**
   * Get learning statistics
   */
  async getStats(): Promise<LearningStats> {
    const patterns = Array.from(this.patterns.values());

    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        successRate: 0,
        avgReward: 0,
        avgTokensUsed: 0,
        avgLatencyMs: 0,
        topPatterns: [],
        commonCritiques: [],
        successDistribution: { successful: 0, failed: 0 },
      };
    }

    const successful = patterns.filter(p => p.success);
    const failed = patterns.filter(p => !p.success);

    const totalReward = patterns.reduce((s, p) => s + p.reward, 0);
    const totalTokens = patterns.reduce((s, p) => s + p.tokensUsed, 0);
    const totalLatency = patterns.reduce((s, p) => s + p.latencyMs, 0);

    // Top patterns by reward
    const topPatterns = [...patterns]
      .sort((a, b) => b.reward - a.reward)
      .slice(0, 10);

    // Common critiques
    const critiques = patterns.map(p => p.critique);
    const commonCritiques = this.extractCommonPhrases(critiques);

    return {
      totalPatterns: patterns.length,
      successRate: successful.length / patterns.length,
      avgReward: totalReward / patterns.length,
      avgTokensUsed: totalTokens / patterns.length,
      avgLatencyMs: totalLatency / patterns.length,
      topPatterns,
      commonCritiques,
      successDistribution: {
        successful: successful.length,
        failed: failed.length,
      },
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Store a pattern in memory and vector DB
   */
  private async storePattern(pattern: Pattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);

    if (pattern.embedding && this.config.enableHNSW) {
      await this.vectorDB.insert(pattern.id, pattern.embedding, {
        task: pattern.task,
        success: pattern.success,
        reward: pattern.reward,
        timestamp: pattern.timestamp,
      });
    }
  }

  /**
   * Generate embedding for text (simple hash-based for now)
   */
  private generateEmbedding(text: string): Float32Array {
    // Simple embedding: character frequency vector
    // In production, use a proper embedding model
    const dimension = 384; // Standard embedding size
    const embedding = new Float32Array(dimension);

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const idx = charCode % dimension;
      embedding[idx] += 1;
    }

    // Normalize
    let norm = 0;
    for (let i = 0; i < dimension; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  /**
   * Extract common phrases from text array
   */
  private extractCommonPhrases(texts: string[]): string[] {
    const phrases = new Map<string, number>();

    for (const text of texts) {
      // Extract 2-3 word phrases
      const words = text.toLowerCase().split(/\s+/);

      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }

    // Sort by frequency
    return Array.from(phrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase]) => phrase);
  }

  /**
   * Record performance metrics
   */
  private recordPerformance(metrics: PerformanceMetrics): void {
    // In production, send to monitoring system
    // For now, just log
  }
}
