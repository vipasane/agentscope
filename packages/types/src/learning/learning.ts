/**
 * @claude-flow/types - Learning System Types
 *
 * Defines the self-learning architecture including:
 * - Trajectories: Recorded execution paths with outcomes
 * - Patterns: Extracted learnings stored in ReasoningBank
 * - Verdicts: Judgments about quality and success
 * - Consolidation: Memory and knowledge integration via EWC++
 *
 * @module types/learning/learning
 */

import type { TrajectoryId, PatternId, Confidence } from '../common/branded.js';

/**
 * Learning trajectory status
 *
 * Tracks the state of a learning trajectory through its lifecycle.
 */
export type TrajectoryStatus = 'active' | 'completed' | 'failed' | 'abandoned';

/**
 * Execution step within a trajectory
 *
 * Represents a single action taken during a task execution.
 *
 * @example
 * ```typescript
 * {
 *   id: 'step-1',
 *   action: 'read-file',
 *   input: { path: 'src/index.ts' },
 *   output: { content: '...' },
 *   quality: 0.95,
 *   latencyMs: 45
 * }
 * ```
 */
export interface TrajectoryStep {
  /** Step identifier */
  readonly id: string;

  /** Action performed */
  readonly action: string;

  /** Input to the action */
  readonly input: Record<string, unknown>;

  /** Output from the action */
  readonly output: Record<string, unknown>;

  /** Quality assessment (0-1) */
  readonly quality: Confidence;

  /** Execution time in milliseconds */
  readonly latencyMs: number;

  /** Optional error if action failed */
  readonly error?: {
    code: string;
    message: string;
  };
}

/**
 * Learning trajectory
 *
 * Records a complete execution path for learning purposes.
 * Used by ReasoningBank to extract patterns and improve future decisions.
 *
 * @example
 * ```typescript
 * {
 *   id: 'traj-123',
 *   task: 'implement-auth-feature',
 *   steps: [...],
 *   outcome: 'success',
 *   reward: 0.85,
 *   duration: 5000
 * }
 * ```
 */
export interface Trajectory {
  /** Unique trajectory identifier */
  readonly id: TrajectoryId;

  /** Task being executed */
  readonly task: string;

  /** Execution steps */
  readonly steps: TrajectoryStep[];

  /** Overall outcome */
  readonly outcome: 'success' | 'partial' | 'failure';

  /** Reward signal (0-1) */
  readonly reward: Confidence;

  /** Total execution time in ms */
  readonly durationMs: number;

  /** Agent that executed trajectory */
  readonly agentId?: string;

  /** When trajectory started */
  readonly startedAt: Date;

  /** When trajectory completed */
  readonly completedAt: Date;

  /** Context about the execution */
  readonly context?: Record<string, unknown>;

  /** Human or system feedback */
  readonly feedback?: string;
}

/**
 * Verdict on quality/correctness of an action or result
 *
 * Used to judge whether a solution is correct.
 *
 * @example
 * ```typescript
 * {
 *   type: 'correct',
 *   confidence: 0.95,
 *   reasoning: 'All tests pass'
 * }
 * ```
 */
export interface Verdict {
  /** Verdict type */
  readonly type: 'correct' | 'incorrect' | 'partial' | 'uncertain';

  /** Confidence in verdict (0-1) */
  readonly confidence: Confidence;

  /** Reasoning for verdict */
  readonly reasoning: string;

  /** Evidence supporting verdict */
  readonly evidence?: string[];
}

/**
 * Pattern representing a learned capability
 *
 * Extracted from trajectories and stored in ReasoningBank for reuse.
 *
 * @example
 * ```typescript
 * {
 *   id: 'pat-auth',
 *   type: 'solution',
 *   task: 'implement-jwt-authentication',
 *   input: { requirements: '...', codebase: '...' },
 *   output: { implementation: '...', testCoverage: 0.95 },
 *   reward: 0.92,
 *   verdict: { type: 'correct', confidence: 0.95 }
 * }
 * ```
 */
export interface Pattern {
  /** Unique pattern identifier */
  readonly id: PatternId;

  /** Pattern type */
  readonly type: 'solution' | 'approach' | 'technique' | 'failure' | 'optimization';

  /** Task this pattern solves */
  readonly task: string;

  /** Input characteristics */
  readonly input: Record<string, unknown>;

  /** Output/result characteristics */
  readonly output: Record<string, unknown>;

  /** Quality reward */
  readonly reward: Confidence;

  /** Expert verdict on correctness */
  readonly verdict: Verdict;

  /** Criticality of this pattern */
  readonly criticality: 'low' | 'medium' | 'high';

  /** When pattern was learned */
  readonly learnedAt: Date;

  /** Number of successful applications */
  readonly successCount: number;

  /** Related patterns */
  readonly relatedPatterns?: PatternId[];
}

/**
 * ReasoningBank consolidation result
 *
 * Result of consolidating learned patterns using EWC++ to prevent
 * catastrophic forgetting while integrating new learnings.
 *
 * @example
 * ```typescript
 * {
 *   consolidated: 150,
 *   retained: 145,
 *   forgotten: 5,
 *   ewcLoss: 0.02,
 *   durationMs: 2500
 * }
 * ```
 */
export interface ConsolidationResult {
  /** Patterns processed */
  readonly consolidated: number;

  /** Patterns successfully retained */
  readonly retained: number;

  /** Patterns that were forgotten */
  readonly forgotten: number;

  /** EWC++ loss metric */
  readonly ewcLoss: number;

  /** Consolidation time in ms */
  readonly durationMs: number;

  /** When consolidation occurred */
  readonly timestamp: Date;
}

/**
 * Learning metric from a trajectory or pattern
 *
 * Tracks learnings and improvements over time.
 */
export interface LearningMetric {
  /** Metric name */
  readonly name: string;

  /** Metric value */
  readonly value: number;

  /** Metric unit */
  readonly unit: string;

  /** When metric was measured */
  readonly measuredAt: Date;

  /** Related trajectory or pattern */
  readonly relatedId?: string;
}

/**
 * Learning session capturing continuous improvement
 *
 * Groups related learning activities and tracks overall progress.
 */
export interface LearningSession {
  /** Session identifier */
  readonly id: string;

  /** Session name */
  readonly name: string;

  /** Start time */
  readonly startedAt: Date;

  /** End time */
  readonly completedAt?: Date;

  /** Trajectories in this session */
  readonly trajectories: TrajectoryId[];

  /** Patterns learned */
  readonly patternsLearned: PatternId[];

  /** Average reward */
  readonly avgReward: Confidence;

  /** Total improvement from start to end */
  readonly improvementPercent: number;

  /** Consolidation results */
  readonly consolidationResults?: ConsolidationResult;
}

/**
 * Configuration for learning system
 *
 * Defines how learning is enabled and tuned for an agent or system.
 */
export interface LearningConfig {
  /** Enable learning */
  readonly enabled: boolean;

  /** Learning rate (0-1) */
  readonly learningRate: Confidence;

  /** Discount factor for reward (0-1) */
  readonly discountFactor: Confidence;

  /** Whether to use EWC++ consolidation */
  readonly useEWCConsolidation?: boolean;

  /** EWC lambda parameter (importance weight) */
  readonly ewcLambda?: number;

  /** Whether to apply trajectory feedback */
  readonly useTrajectoryFeedback?: boolean;

  /** Pattern storage backend */
  readonly patternStorage?: 'memory' | 'agentdb' | 'hybrid';

  /** Max patterns to store before consolidation */
  readonly maxPatterns?: number;

  /** Consolidation interval in hours */
  readonly consolidationIntervalHours?: number;
}

/**
 * Learning event for tracking learning activities
 *
 * Events are emitted for significant learning milestones.
 */
export type LearningEvent =
  | {
      type: 'trajectory-started';
      trajectoryId: TrajectoryId;
      task: string;
      timestamp: Date;
    }
  | {
      type: 'trajectory-completed';
      trajectoryId: TrajectoryId;
      reward: Confidence;
      timestamp: Date;
    }
  | {
      type: 'pattern-learned';
      patternId: PatternId;
      task: string;
      reward: Confidence;
      timestamp: Date;
    }
  | {
      type: 'consolidation-started';
      patternCount: number;
      timestamp: Date;
    }
  | {
      type: 'consolidation-completed';
      result: ConsolidationResult;
      timestamp: Date;
    }
  | {
      type: 'skill-acquired';
      skill: string;
      proficiency: Confidence;
      timestamp: Date;
    };

/**
 * Learning feedback for improving patterns
 *
 * Human or system feedback to refine learned patterns.
 */
export interface LearningFeedback {
  /** Feedback identifier */
  readonly id: string;

  /** Pattern or trajectory this feedback is for */
  readonly targetId: string;

  /** Feedback type */
  readonly type: 'positive' | 'negative' | 'correction';

  /** Feedback message */
  readonly message: string;

  /** Adjustment to reward */
  readonly rewardAdjustment: number;

  /** Who provided feedback */
  readonly provider: string;

  /** When feedback was provided */
  readonly providedAt: Date;
}

/**
 * SONA adaptation configuration
 *
 * Self-Optimizing Neural Architecture parameters for fast adaptation.
 * Enables <0.05ms adaptation in response to feedback.
 */
export interface SONAConfig {
  /** Enable SONA adaptation */
  readonly enabled: boolean;

  /** Adaptation speed (0-1, higher = faster) */
  readonly adaptationSpeed: Confidence;

  /** Maximum adaptation latency in ms */
  readonly maxLatencyMs: number;

  /** Number of attention heads for MoE */
  readonly attentionHeads?: number;

  /** Whether to use hyperbolic embeddings */
  readonly useHyperbolic?: boolean;

  /** Curvature for Poincaré ball */
  readonly curvature?: number;
}

/**
 * Learning statistics for system visibility
 *
 * Provides aggregated metrics about learning system performance.
 */
export interface LearningStats {
  /** Total trajectories recorded */
  readonly totalTrajectories: number;

  /** Total patterns learned */
  readonly totalPatterns: number;

  /** Average pattern reward */
  readonly avgPatternReward: Confidence;

  /** Number of consolidations performed */
  readonly consolidationCount: number;

  /** Total time spent learning */
  readonly totalLearningTimeMs: number;

  /** Skills acquired */
  readonly skillsAcquired: string[];

  /** Last learning activity */
  readonly lastLearningAt?: Date;
}
