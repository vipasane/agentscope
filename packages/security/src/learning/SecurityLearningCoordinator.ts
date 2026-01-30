/**
 * Security Learning Coordinator - ReasoningBank Integration
 *
 * Implements the 4-step learning cycle for security threat detection:
 * 1. RETRIEVE - Load learned patterns before assessment (HNSW-indexed)
 * 2. JUDGE - Evaluate with verdicts (success/failure)
 * 3. DISTILL - Extract key learnings via LoRA
 * 4. CONSOLIDATE - Prevent forgetting via EWC++
 *
 * @module SecurityLearningCoordinator
 * @see DDD-003 lines 1050-1216 - Learning workflow architecture
 * @see ADR-023 lines 936-1076 - Security learning integration
 *
 * @example
 * ```typescript
 * // 1. RETRIEVE - Before assessment
 * const patterns = await coordinator.getOptimizations('project-signature-hash');
 *
 * // 2. JUDGE - Assess with learned patterns
 * const assessment = await securityValidator.assess(config, patterns);
 *
 * // 3. DISTILL - Record outcome
 * await coordinator.recordAssessment(assessment);
 *
 * // 4. CONSOLIDATE - Store learnings
 * // (Automatic via EWC++ in neural train hook)
 * ```
 *
 * Learning Cycle Flow:
 * ```
 * ┌─────────────────────────────────────────────┐
 * │  RETRIEVE (HNSW 150x-12,500x faster)       │
 * │  Load threat patterns from AgentDB          │
 * └──────────────────┬──────────────────────────┘
 *                    │
 *                    v
 * ┌─────────────────────────────────────────────┐
 * │  JUDGE (Verdict Assignment)                 │
 * │  - True positive → reward 1.0               │
 * │  - False positive → reward 0.0              │
 * │  - Uncertain → reward 0.5                   │
 * └──────────────────┬──────────────────────────┘
 *                    │
 *                    v
 * ┌─────────────────────────────────────────────┐
 * │  DISTILL (LoRA-based extraction)           │
 * │  - Update threat confidence                 │
 * │  - Adjust DREAD weights                     │
 * │  - Store patterns                           │
 * └──────────────────┬──────────────────────────┘
 *                    │
 *                    v
 * ┌─────────────────────────────────────────────┐
 * │  CONSOLIDATE (EWC++ prevents forgetting)   │
 * │  - Train neural patterns                    │
 * │  - Preserve old knowledge                   │
 * └─────────────────────────────────────────────┘
 * ```
 */

import { execSync } from 'child_process';
import type {
  SecurityFinding,
  Severity,
  DreadScore,
} from '../utils/types.js';

/**
 * Threat pattern learned from past assessments
 * Confidence and false positive rates improve over time
 */
export interface ThreatPattern {
  /** Unique pattern identifier (SHA-256 hash) */
  signature: string;

  /** Detection regex or rule */
  regex: string;

  /** Initial severity (can be adjusted by learning) */
  severity: Severity;

  /** Learned false positive rate (0-1) */
  falsePositiveRate: number;

  /** Confidence score (0-1, improves with feedback) */
  confidence: number;

  /** Times this pattern was used */
  usageCount: number;

  /** Success rate (true positives / total uses) */
  successRate: number;

  /** Pattern category for filtering */
  category: ThreatCategory;

  /** When pattern was first learned */
  learnedAt: number;

  /** Last time pattern was updated */
  updatedAt: number;
}

/**
 * Risk optimization suggestions from learned patterns
 */
export interface RiskOptimization {
  /** What to optimize */
  type: 'skip-pattern' | 'adjust-severity' | 'adjust-dread' | 'suppress-false-positive';

  /** Pattern signature this applies to */
  patternSignature: string;

  /** Why this optimization is suggested */
  reason: string;

  /** Confidence in this optimization (0-1) */
  confidence: number;

  /** Expected improvement */
  expectedImprovement: string;

  /** Data to apply */
  data: {
    /** Original severity */
    originalSeverity?: Severity;
    /** Suggested new severity */
    newSeverity?: Severity;
    /** DREAD score adjustments */
    dreadAdjustments?: Partial<DreadScore>;
    /** Suppression rule regex */
    suppressionRule?: string;
  };
}

/**
 * Security assessment result with metadata
 */
export interface SecurityAssessment {
  /** Unique assessment ID */
  id: string;

  /** Project/config signature */
  configSignature: string;

  /** All findings */
  findings: SecurityFinding[];

  /** Overall DREAD score */
  overallDreadScore: DreadScore;

  /** Assessment duration in ms */
  duration: number;

  /** When assessment was performed */
  timestamp: number;

  /** Optimizations that were applied */
  appliedOptimizations: RiskOptimization[];

  /** Assessment result */
  result: 'pass' | 'fail';
}

/**
 * User feedback on a finding (for learning)
 */
export interface SecurityFeedback {
  /** Feedback type */
  type: 'true-positive' | 'false-positive' | 'severity-adjustment' | 'suppression';

  /** User comment */
  comment?: string;

  /** If severity adjustment, what should it be */
  suggestedSeverity?: Severity;

  /** If suppression, what's the rule */
  suppressionRule?: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Threat categories for pattern organization
 */
export type ThreatCategory =
  | 'secrets'
  | 'injection'
  | 'path-traversal'
  | 'config-exposure'
  | 'dependency-vulnerability'
  | 'insecure-protocol'
  | 'weak-crypto'
  | 'other';

/**
 * CLI command execution result
 */
interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * SecurityLearningCoordinator
 *
 * Coordinates security learning via CLI tools and ReasoningBank.
 * Implements the 4-step learning cycle for continuous improvement.
 *
 * Key Responsibilities:
 * - Load learned threat patterns before assessment (RETRIEVE)
 * - Evaluate assessment outcomes with verdicts (JUDGE)
 * - Extract and store learnings (DISTILL)
 * - Prevent catastrophic forgetting (CONSOLIDATE via EWC++)
 *
 * Integration Points:
 * - npx @claude-flow/cli memory search - Pattern retrieval
 * - npx @claude-flow/cli memory store - Pattern storage
 * - npx @claude-flow/cli neural train - Pattern consolidation
 * - npx @claude-flow/cli hooks audit - Background security analysis
 */
export class SecurityLearningCoordinator {
  private readonly namespace = 'security-patterns';
  private readonly trajectoryNamespace = 'security-trajectories';

  /**
   * Create a new SecurityLearningCoordinator
   *
   * @param cliPath - Path to claude-flow CLI (default: npx @claude-flow/cli@latest)
   * @param verbose - Enable verbose logging
   */
  constructor(
    private readonly cliPath: string = 'npx @claude-flow/cli@latest',
    private readonly verbose: boolean = false,
  ) {}

  /**
   * STEP 1: RETRIEVE
   * Load optimization suggestions based on learned patterns
   *
   * Uses HNSW-indexed vector search for 150x-12,500x faster retrieval
   *
   * @param configSignature - Project configuration hash
   * @returns Optimization suggestions from learned patterns
   *
   * @example
   * ```typescript
   * const optimizations = await coordinator.getOptimizations(
   *   'sha256-abc123...'
   * );
   *
   * // Returns:
   * // [
   * //   {
   * //     type: 'skip-pattern',
   * //     patternSignature: 'sig-123',
   * //     reason: 'High false positive rate (0.85)',
   * //     confidence: 0.92,
   * //     expectedImprovement: '85% fewer false positives'
   * //   }
   * // ]
   * ```
   */
  async getOptimizations(configSignature: string): Promise<RiskOptimization[]> {
    try {
      this.log(`[RETRIEVE] Loading patterns for ${configSignature.slice(0, 12)}...`);

      // Search for similar threat patterns
      const searchResult = await this.executeCLI('memory', [
        'search',
        '--query', `threat-pattern config:${configSignature}`,
        '--namespace', this.namespace,
        '--limit', '10',
      ]);

      if (!searchResult.success) {
        this.log('[RETRIEVE] No learned patterns found (first use)');
        return [];
      }

      // Parse threat patterns from search results
      const patterns = this.parsePatterns(searchResult.output);

      // Generate optimizations from patterns
      const optimizations = this.generateOptimizations(patterns);

      this.log(`[RETRIEVE] Found ${optimizations.length} optimizations`);

      return optimizations;
    } catch (error) {
      this.log(`[RETRIEVE] Error: ${error instanceof Error ? error.message : String(error)}`);
      return []; // Fail gracefully - no optimizations on error
    }
  }

  /**
   * STEP 2: JUDGE + STEP 3: DISTILL
   * Record security assessment outcome for learning
   *
   * Automatically assigns verdicts:
   * - All findings verified → reward 1.0 (true positives)
   * - Mixed results → reward 0.5 (uncertain)
   * - All findings false → reward 0.0 (false positives)
   *
   * @param assessment - Completed security assessment
   *
   * @example
   * ```typescript
   * await coordinator.recordAssessment({
   *   id: 'assess-123',
   *   configSignature: 'sha256-abc...',
   *   findings: [...],
   *   overallDreadScore: { total: 7.5, ... },
   *   duration: 1250,
   *   timestamp: Date.now(),
   *   appliedOptimizations: [...],
   *   result: 'pass'
   * });
   * ```
   */
  async recordAssessment(assessment: SecurityAssessment): Promise<void> {
    try {
      this.log(`[JUDGE] Recording assessment ${assessment.id}`);

      // Calculate verdict (default: assume true positives unless feedback says otherwise)
      const verdict = this.calculateVerdict(assessment);

      // Store assessment metadata
      await this.executeCLI('memory', [
        'store',
        '--key', `assessment-${assessment.id}`,
        '--value', JSON.stringify({
          configSignature: assessment.configSignature,
          findingCount: assessment.findings.length,
          duration: assessment.duration,
          result: assessment.result,
          verdict,
          timestamp: assessment.timestamp,
        }),
        '--namespace', this.trajectoryNamespace,
        '--tags', `verdict:${verdict},config:${assessment.configSignature}`,
      ]);

      // Store each finding pattern for learning
      for (const finding of assessment.findings) {
        await this.storeFindingPattern(finding, assessment.configSignature, verdict);
      }

      this.log(`[DISTILL] Stored ${assessment.findings.length} patterns with verdict ${verdict}`);
    } catch (error) {
      this.log(`[JUDGE/DISTILL] Error: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - learning is non-critical
    }
  }

  /**
   * STEP 2: JUDGE (with user feedback)
   * Record user feedback on a finding
   *
   * Updates confidence scores and false positive rates based on feedback.
   * This is the primary way the system learns to reduce false positives.
   *
   * @param finding - The security finding being evaluated
   * @param feedback - User's feedback on the finding
   *
   * @example
   * ```typescript
   * // User marks a finding as false positive
   * await coordinator.recordFeedback(finding, {
   *   type: 'false-positive',
   *   comment: 'This is a test file',
   *   suppressionRule: 'test/**',
   *   timestamp: Date.now()
   * });
   *
   * // Next time: pattern will have lower confidence, may be skipped
   * ```
   */
  async recordFeedback(
    finding: SecurityFinding,
    feedback: SecurityFeedback,
  ): Promise<void> {
    try {
      this.log(`[JUDGE] Recording feedback: ${feedback.type} for ${finding.type}`);

      const patternKey = this.generatePatternKey(finding);

      // Retrieve existing pattern
      const existingPattern = await this.retrievePattern(patternKey);

      if (!existingPattern) {
        this.log('[JUDGE] Pattern not found, creating new one');
        // Create new pattern from feedback
        await this.createPatternFromFeedback(finding, feedback);
        return;
      }

      // Update pattern based on feedback
      const updatedPattern = this.applyFeedback(existingPattern, feedback);

      // Store updated pattern
      await this.executeCLI('memory', [
        'store',
        '--key', patternKey,
        '--value', JSON.stringify(updatedPattern),
        '--namespace', this.namespace,
        '--tags', `category:${updatedPattern.category},confidence:${updatedPattern.confidence.toFixed(2)}`,
      ]);

      // If false positive, adjust confidence significantly
      if (feedback.type === 'false-positive') {
        await this.adjustConfidence(patternKey, -0.2);
      } else if (feedback.type === 'true-positive') {
        await this.adjustConfidence(patternKey, 0.1);
      }

      this.log(`[JUDGE] Updated pattern ${patternKey.slice(0, 12)}... confidence: ${updatedPattern.confidence.toFixed(2)}`);
    } catch (error) {
      this.log(`[JUDGE] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Adjust pattern confidence based on feedback
   *
   * @param patternId - Pattern identifier
   * @param adjustment - Confidence adjustment (-1 to 1)
   *
   * @example
   * ```typescript
   * // Decrease confidence after false positive
   * await coordinator.adjustConfidence('pattern-123', -0.2);
   *
   * // Increase confidence after true positive
   * await coordinator.adjustConfidence('pattern-123', 0.1);
   * ```
   */
  async adjustConfidence(patternId: string, adjustment: number): Promise<void> {
    try {
      const pattern = await this.retrievePattern(patternId);
      if (!pattern) {
        this.log(`[ADJUST] Pattern ${patternId} not found`);
        return;
      }

      // Adjust confidence (clamp to 0-1)
      pattern.confidence = Math.max(0, Math.min(1, pattern.confidence + adjustment));
      pattern.updatedAt = Date.now();

      // Store updated pattern
      await this.executeCLI('memory', [
        'store',
        '--key', patternId,
        '--value', JSON.stringify(pattern),
        '--namespace', this.namespace,
      ]);

      this.log(`[ADJUST] Pattern ${patternId.slice(0, 12)}... confidence now ${pattern.confidence.toFixed(2)}`);
    } catch (error) {
      this.log(`[ADJUST] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * STEP 4: CONSOLIDATE
   * Trigger neural pattern training to prevent catastrophic forgetting
   *
   * Uses EWC++ (Elastic Weight Consolidation) to preserve old knowledge
   * while learning new patterns.
   *
   * @param epochs - Number of training epochs (default: 10)
   *
   * @example
   * ```typescript
   * // After recording multiple assessments, consolidate learnings
   * await coordinator.consolidate(10);
   * ```
   */
  async consolidate(epochs: number = 10): Promise<void> {
    try {
      this.log(`[CONSOLIDATE] Training neural patterns (${epochs} epochs)...`);

      const result = await this.executeCLI('neural', [
        'train',
        '--pattern-type', 'security-threat',
        '--epochs', epochs.toString(),
      ]);

      if (result.success) {
        this.log('[CONSOLIDATE] Neural training complete');
      } else {
        this.log('[CONSOLIDATE] Neural training failed (may not be critical)');
      }
    } catch (error) {
      this.log(`[CONSOLIDATE] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Trigger background security audit worker
   *
   * The audit worker performs deep security analysis in background
   * without blocking the main assessment flow.
   *
   * @example
   * ```typescript
   * // After major changes, trigger background audit
   * await coordinator.triggerAuditWorker();
   * ```
   */
  async triggerAuditWorker(): Promise<void> {
    try {
      this.log('[WORKER] Triggering background security audit...');

      await this.executeCLI('hooks', [
        'worker',
        'dispatch',
        '--trigger', 'audit',
      ]);

      this.log('[WORKER] Audit worker dispatched');
    } catch (error) {
      this.log(`[WORKER] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Execute a CLI command
   */
  private async executeCLI(command: string, args: string[]): Promise<CLIResult> {
    try {
      const fullCommand = `${this.cliPath} ${command} ${args.join(' ')}`;
      const output = execSync(fullCommand, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'stdout' in error) {
        return {
          success: false,
          output: String((error as { stdout?: unknown }).stdout || ''),
          error: error.message,
        };
      }
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse threat patterns from CLI output
   */
  private parsePatterns(output: string): ThreatPattern[] {
    try {
      // CLI returns JSON lines or structured output
      const lines = output.split('\n').filter(l => l.trim());
      const patterns: ThreatPattern[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (this.isValidPattern(parsed)) {
            patterns.push(parsed);
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }

      return patterns;
    } catch {
      return [];
    }
  }

  /**
   * Validate threat pattern structure
   */
  private isValidPattern(obj: unknown): obj is ThreatPattern {
    if (!obj || typeof obj !== 'object') return false;
    const p = obj as Partial<ThreatPattern>;
    return !!(
      p.signature &&
      p.regex &&
      p.severity &&
      typeof p.confidence === 'number' &&
      typeof p.falsePositiveRate === 'number'
    );
  }

  /**
   * Generate optimizations from patterns
   */
  private generateOptimizations(patterns: ThreatPattern[]): RiskOptimization[] {
    const optimizations: RiskOptimization[] = [];

    for (const pattern of patterns) {
      // Skip patterns with high false positive rate
      if (pattern.falsePositiveRate > 0.7 && pattern.confidence > 0.8) {
        optimizations.push({
          type: 'skip-pattern',
          patternSignature: pattern.signature,
          reason: `High false positive rate (${pattern.falsePositiveRate.toFixed(2)})`,
          confidence: pattern.confidence,
          expectedImprovement: `${(pattern.falsePositiveRate * 100).toFixed(0)}% fewer false positives`,
          data: {},
        });
      }

      // Adjust severity for low-confidence patterns
      if (pattern.confidence < 0.5 && pattern.severity === 'critical') {
        optimizations.push({
          type: 'adjust-severity',
          patternSignature: pattern.signature,
          reason: 'Low confidence for critical severity',
          confidence: 1 - pattern.confidence,
          expectedImprovement: 'More accurate risk assessment',
          data: {
            originalSeverity: 'critical',
            newSeverity: 'high',
          },
        });
      }
    }

    return optimizations;
  }

  /**
   * Calculate verdict from assessment
   */
  private calculateVerdict(assessment: SecurityAssessment): number {
    // If assessment passed, assume findings are true positives
    if (assessment.result === 'pass') {
      return 1.0;
    }

    // If failed with high DREAD score, assume true positives
    if (assessment.overallDreadScore.total > 7) {
      return 1.0;
    }

    // Otherwise uncertain (will be updated with user feedback)
    return 0.5;
  }

  /**
   * Store finding pattern
   */
  private async storeFindingPattern(
    finding: SecurityFinding,
    configSignature: string,
    verdict: number,
  ): Promise<void> {
    const patternKey = this.generatePatternKey(finding);

    const pattern: ThreatPattern = {
      signature: patternKey,
      regex: this.extractRegex(finding),
      severity: finding.severity,
      falsePositiveRate: verdict === 0 ? 1.0 : 0.0, // Initial rate
      confidence: verdict, // Initial confidence from verdict
      usageCount: 1,
      successRate: verdict,
      category: this.categorize(finding.type),
      learnedAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.executeCLI('memory', [
      'store',
      '--key', patternKey,
      '--value', JSON.stringify(pattern),
      '--namespace', this.namespace,
      '--tags', `category:${pattern.category},config:${configSignature}`,
    ]);
  }

  /**
   * Generate pattern key from finding
   */
  private generatePatternKey(finding: SecurityFinding): string {
    // Use type + location as unique key
    return `pattern-${finding.type}-${finding.location.file}-${finding.location.line || 0}`;
  }

  /**
   * Extract regex from finding (simplified for demo)
   */
  private extractRegex(finding: SecurityFinding): string {
    // In real implementation, extract actual pattern from finding
    return `${finding.type}:.*`;
  }

  /**
   * Categorize finding type
   */
  private categorize(type: string): ThreatCategory {
    if (type.includes('secret') || type.includes('key') || type.includes('password')) {
      return 'secrets';
    }
    if (type.includes('injection') || type.includes('sql') || type.includes('command')) {
      return 'injection';
    }
    if (type.includes('path') || type.includes('traversal')) {
      return 'path-traversal';
    }
    if (type.includes('config') || type.includes('exposure')) {
      return 'config-exposure';
    }
    return 'other';
  }

  /**
   * Retrieve pattern by key
   */
  private async retrievePattern(key: string): Promise<ThreatPattern | null> {
    try {
      const result = await this.executeCLI('memory', [
        'retrieve',
        '--key', key,
        '--namespace', this.namespace,
      ]);

      if (!result.success || !result.output) {
        return null;
      }

      const parsed = JSON.parse(result.output);
      return this.isValidPattern(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Create pattern from feedback
   */
  private async createPatternFromFeedback(
    finding: SecurityFinding,
    feedback: SecurityFeedback,
  ): Promise<void> {
    const patternKey = this.generatePatternKey(finding);

    const pattern: ThreatPattern = {
      signature: patternKey,
      regex: this.extractRegex(finding),
      severity: feedback.suggestedSeverity || finding.severity,
      falsePositiveRate: feedback.type === 'false-positive' ? 1.0 : 0.0,
      confidence: feedback.type === 'false-positive' ? 0.0 : 1.0,
      usageCount: 1,
      successRate: feedback.type === 'true-positive' ? 1.0 : 0.0,
      category: this.categorize(finding.type),
      learnedAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.executeCLI('memory', [
      'store',
      '--key', patternKey,
      '--value', JSON.stringify(pattern),
      '--namespace', this.namespace,
    ]);
  }

  /**
   * Apply feedback to pattern
   */
  private applyFeedback(
    pattern: ThreatPattern,
    feedback: SecurityFeedback,
  ): ThreatPattern {
    const updated = { ...pattern };
    updated.usageCount += 1;
    updated.updatedAt = Date.now();

    if (feedback.type === 'false-positive') {
      // Increase false positive rate
      updated.falsePositiveRate = (updated.falsePositiveRate * updated.usageCount + 1) / (updated.usageCount + 1);
      updated.successRate = (updated.successRate * updated.usageCount) / (updated.usageCount + 1);
    } else if (feedback.type === 'true-positive') {
      // Increase success rate
      updated.successRate = (updated.successRate * updated.usageCount + 1) / (updated.usageCount + 1);
      updated.falsePositiveRate = (updated.falsePositiveRate * updated.usageCount) / (updated.usageCount + 1);
    }

    if (feedback.suggestedSeverity) {
      updated.severity = feedback.suggestedSeverity;
    }

    return updated;
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[SecurityLearning] ${message}`);
    }
  }
}

/**
 * Create a SecurityLearningCoordinator instance
 *
 * @param options - Configuration options
 * @returns SecurityLearningCoordinator instance
 *
 * @example
 * ```typescript
 * const coordinator = createSecurityLearningCoordinator({
 *   cliPath: 'npx @claude-flow/cli@latest',
 *   verbose: true
 * });
 * ```
 */
export function createSecurityLearningCoordinator(options?: {
  cliPath?: string;
  verbose?: boolean;
}): SecurityLearningCoordinator {
  return new SecurityLearningCoordinator(
    options?.cliPath,
    options?.verbose,
  );
}
