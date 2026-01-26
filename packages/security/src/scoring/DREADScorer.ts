/**
 * @packageDocumentation
 * DREAD risk assessment for agent configurations
 *
 * @remarks
 * Implements Microsoft's DREAD methodology adapted for agent security:
 * - **D**amage: Impact if exploited (0-10)
 * - **R**eproducibility: Ease of reproduction (0-10, always 10 for configs)
 * - **E**xploitability: Skill required to exploit (0-10)
 * - **A**ffected Users: Number of users impacted (0-10)
 * - **D**iscoverability: Ease of finding vulnerability (0-10)
 *
 * Total Risk = (D + R + E + A + D) / 5
 *
 * Severity mapping:
 * - Critical: ≥8.0
 * - High: ≥6.0
 * - Medium: ≥4.0
 * - Low: <4.0
 *
 * @example Basic DREAD calculation
 * ```typescript
 * import { DREADScorer, DREADScoreFactory } from '@claude-flow/security';
 *
 * const scorer = new DREADScorer();
 * const score = scorer.scoreAgentConfig({
 *   hooks: parsedHooks,
 *   permissions: permissionSummary,
 *   mcpServers: mcpServerList,
 *   claudeMd: claudeMdContent
 * });
 *
 * console.log('Risk Level:', score.severity);
 * console.log('Total Risk:', score.total);
 * console.log('Confidence:', score.confidence);
 * ```
 *
 * @example With learning-enhanced optimization
 * ```typescript
 * const scorer = new DREADScorer();
 * const baseScore = scorer.scoreAgentConfig(config);
 *
 * // Apply learned risk adjustments from ReasoningBank
 * const optimizations = await loadRiskOptimizations();
 * const optimizedScore = scorer.applyOptimizations(baseScore, optimizations);
 * ```
 *
 * @see {@link https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/security-policy-settings | Microsoft DREAD Methodology}
 */

import type { Severity, SecurityFinding } from '../utils/types.js';

/**
 * DREAD score value object (immutable)
 *
 * @remarks
 * All dimensions are scored 0-10:
 * - **Damage**: How bad would an attack be?
 * - **Reproducibility**: How easy to reproduce? (always 10 for static configs)
 * - **Exploitability**: How much work/skill required to exploit?
 * - **Affected Users**: How many users would be impacted?
 * - **Discoverability**: How easy to discover the vulnerability?
 *
 * Total is the sum of all dimensions (0-50)
 * Severity is auto-derived from total score
 * Confidence (0-1) indicates scoring certainty from learning system
 */
export interface DREADScore {
  /** Damage potential: 0-10 (0=negligible, 10=catastrophic) */
  readonly damage: number;

  /** Reproducibility: 0-10 (0=impossible, 10=always, configs=10) */
  readonly reproducibility: number;

  /** Exploitability: 0-10 (0=extremely difficult, 10=trivial) */
  readonly exploitability: number;

  /** Affected users: 0-10 (0=none, 10=all users) */
  readonly affectedUsers: number;

  /** Discoverability: 0-10 (0=impossible to find, 10=obvious) */
  readonly discoverability: number;

  /** Total risk score: sum of all dimensions (0-50) */
  readonly total: number;

  /** Severity derived from total score */
  readonly severity: Severity;

  /** Confidence in score accuracy: 0-1 (from learning system) */
  readonly confidence: number;
}

/**
 * Detailed breakdown of DREAD calculation factors
 */
export interface DREADBreakdown {
  /** Factors contributing to damage score */
  readonly damageFactors: string[];

  /** Factors contributing to exploitability score */
  readonly exploitabilityFactors: string[];

  /** Factors contributing to discoverability score */
  readonly discoverabilityFactors: string[];
}

/**
 * Agent configuration components for DREAD scoring
 */
export interface AgentConfig {
  /** Hook configurations with commands */
  readonly hooks: Hook[];

  /** Permission rules summary */
  readonly permissions: PermissionSummary;

  /** MCP server configurations */
  readonly mcpServers: McpServer[];

  /** CLAUDE.md instruction content */
  readonly claudeMd: string;
}

/**
 * Hook configuration
 */
export interface Hook {
  /** Hook event type */
  readonly event: 'PreToolUse' | 'PostToolUse' | 'PreEdit' | 'PostEdit' | 'UserPromptSubmit';

  /** Command to execute (if type=command) */
  readonly command?: string;

  /** Prompt to inject (if type=prompt) */
  readonly prompt?: string;
}

/**
 * Permission rules summary
 */
export interface PermissionSummary {
  /** Default permission mode */
  readonly defaultMode: 'ask' | 'allow' | 'deny';

  /** Permission rules */
  readonly rules: Array<{
    readonly type: 'allow' | 'deny' | 'ask';
    readonly pattern: string;
  }>;
}

/**
 * MCP server configuration
 */
export interface McpServer {
  /** Server name/identifier */
  readonly name: string;

  /** Command to launch server */
  readonly command: string;

  /** Transport URL (if external) */
  readonly transport?: string;
}

/**
 * Risk optimization learned from historical data
 */
export interface RiskOptimization {
  /** Threat category this applies to */
  readonly threatType: string;

  /** Weight adjustment multiplier (0.5 = reduce by 50%, 1.5 = increase by 50%) */
  readonly weightAdjustment: number;

  /** Confidence in this optimization (0-1) */
  readonly confidence: number;

  /** Number of samples used to learn this */
  readonly sampleSize: number;

  /** Specific factors to adjust */
  readonly adjustments?: {
    readonly damage?: number;
    readonly exploitability?: number;
    readonly affectedUsers?: number;
    readonly discoverability?: number;
  };
}

/**
 * Factory for creating validated DREAD scores
 *
 * @remarks
 * Ensures all DREAD scores are properly validated:
 * - All dimensions are 0-10
 * - Confidence is 0-1
 * - Total is correctly calculated
 * - Severity is correctly derived
 *
 * @example
 * ```typescript
 * const score = DREADScoreFactory.create(
 *   8,  // damage
 *   10, // reproducibility
 *   6,  // exploitability
 *   7,  // affectedUsers
 *   5,  // discoverability
 *   0.9 // confidence
 * );
 * console.log(score.severity); // "high"
 * console.log(score.total);    // 36
 * ```
 */
export class DREADScoreFactory {
  /**
   * Create a validated DREAD score
   *
   * @param damage - Damage potential (0-10)
   * @param reproducibility - Reproducibility ease (0-10)
   * @param exploitability - Exploitation difficulty (0-10)
   * @param affectedUsers - User impact (0-10)
   * @param discoverability - Discovery ease (0-10)
   * @param confidence - Score confidence (0-1, default 1.0)
   * @returns Immutable DREAD score
   * @throws {Error} If any dimension is out of range
   */
  static create(
    damage: number,
    reproducibility: number,
    exploitability: number,
    affectedUsers: number,
    discoverability: number,
    confidence: number = 1.0
  ): DREADScore {
    // Validate all dimensions
    this.validateDimension(damage, 'damage', 0, 10);
    this.validateDimension(reproducibility, 'reproducibility', 0, 10);
    this.validateDimension(exploitability, 'exploitability', 0, 10);
    this.validateDimension(affectedUsers, 'affectedUsers', 0, 10);
    this.validateDimension(discoverability, 'discoverability', 0, 10);
    this.validateDimension(confidence, 'confidence', 0, 1);

    // Calculate total (sum of all dimensions)
    const total = damage + reproducibility + exploitability +
                  affectedUsers + discoverability;

    // Derive severity from total
    const severity = this.determineSeverity(total);

    return Object.freeze({
      damage: parseFloat(damage.toFixed(2)),
      reproducibility: parseFloat(reproducibility.toFixed(2)),
      exploitability: parseFloat(exploitability.toFixed(2)),
      affectedUsers: parseFloat(affectedUsers.toFixed(2)),
      discoverability: parseFloat(discoverability.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      severity,
      confidence: parseFloat(confidence.toFixed(2))
    });
  }

  /**
   * Validate a dimension is within range
   *
   * @internal
   */
  private static validateDimension(
    value: number,
    name: string,
    min: number,
    max: number
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${name} must be a number, got ${value}`);
    }
    if (value < min || value > max) {
      throw new Error(`${name} must be ${min}-${max}, got ${value}`);
    }
  }

  /**
   * Determine severity from total DREAD score
   *
   * @remarks
   * Severity mapping:
   * - Critical: ≥40 (very high risk)
   * - High: ≥30 (high risk)
   * - Medium: ≥15 (moderate risk)
   * - Low: <15 (low risk)
   *
   * @internal
   */
  private static determineSeverity(total: number): Severity {
    if (total >= 40) return 'critical';
    if (total >= 30) return 'high';
    if (total >= 15) return 'medium';
    return 'low';
  }
}

/**
 * DREAD risk scorer for agent configurations
 *
 * @remarks
 * Calculates DREAD scores following Microsoft's methodology adapted for
 * agent security. Supports learning-enhanced scoring with optimizations
 * from historical data.
 *
 * The scorer analyzes:
 * - Hook configurations (command execution risk)
 * - Permission settings (privilege escalation)
 * - MCP server endpoints (external attack surface)
 * - CLAUDE.md instructions (prompt injection surface)
 *
 * @example Basic usage
 * ```typescript
 * const scorer = new DREADScorer();
 * const score = scorer.scoreAgentConfig({
 *   hooks: [{ event: 'PreToolUse', command: 'npm install' }],
 *   permissions: { defaultMode: 'ask', rules: [] },
 *   mcpServers: [],
 *   claudeMd: 'You are a helpful assistant.'
 * });
 *
 * if (score.severity === 'critical') {
 *   console.error('Critical security risk detected!');
 * }
 * ```
 */
export class DREADScorer {
  /**
   * Score an agent configuration using DREAD methodology
   *
   * @param config - Agent configuration to assess
   * @returns DREAD score with breakdown
   *
   * @remarks
   * Calculates all 5 DREAD dimensions:
   * - Damage: Based on hooks, MCP servers, permissions
   * - Reproducibility: Always 10 for static configurations
   * - Exploitability: Based on wildcards, dangerous tools, instruction complexity
   * - Affected Users: Based on permission mode and sharing
   * - Discoverability: Based on hook visibility and external exposure
   *
   * @example
   * ```typescript
   * const scorer = new DREADScorer();
   * const score = scorer.scoreAgentConfig(config);
   * console.log(`Risk: ${score.severity} (${score.total}/50)`);
   * ```
   */
  scoreAgentConfig(config: AgentConfig): DREADScore & { breakdown: DREADBreakdown } {
    const breakdown: DREADBreakdown = {
      damageFactors: [],
      exploitabilityFactors: [],
      discoverabilityFactors: []
    };

    // DAMAGE: Impact if exploited (0-10)
    const damage = this.calculateDamage(config, breakdown);

    // REPRODUCIBILITY: Always 10 for static configurations
    const reproducibility = 10;

    // EXPLOITABILITY: Skill required to exploit (0-10)
    const exploitability = this.calculateExploitability(config, breakdown);

    // AFFECTED USERS: Number of users impacted (0-10)
    const affectedUsers = this.calculateAffectedUsers(config);

    // DISCOVERABILITY: Ease of finding vulnerability (0-10)
    const discoverability = this.calculateDiscoverability(config, breakdown);

    const score = DREADScoreFactory.create(
      damage,
      reproducibility,
      exploitability,
      affectedUsers,
      discoverability,
      1.0 // Base confidence (can be adjusted by optimizations)
    );

    return {
      ...score,
      breakdown
    };
  }

  /**
   * Score a security finding using DREAD methodology
   *
   * @param finding - Security finding to score
   * @returns DREAD score for the finding
   *
   * @remarks
   * Baseline scores by threat type:
   * - PromptInjection: D=9, R=8, E=7, A=8, D=6 (Critical)
   * - CommandInjection: D=10, R=9, E=8, A=9, D=7 (Critical)
   * - SecretExposure: D=8, R=10, E=5, A=7, D=8 (High)
   * - PathTraversal: D=7, R=7, E=6, A=6, D=5 (High)
   */
  scoreFinding(finding: SecurityFinding): DREADScore {
    // Get baseline score by finding type
    const baseline = this.getBaselineScore(finding.type);

    // Adjust for severity
    const severityMultiplier = this.getSeverityMultiplier(finding.severity);

    return DREADScoreFactory.create(
      baseline.damage * severityMultiplier,
      baseline.reproducibility,
      baseline.exploitability * severityMultiplier,
      baseline.affectedUsers,
      baseline.discoverability,
      0.85 // Baseline confidence
    );
  }

  /**
   * Apply learned optimizations to a DREAD score
   *
   * @param score - Base DREAD score
   * @param optimizations - Risk optimizations from learning system
   * @returns Adjusted DREAD score
   *
   * @remarks
   * Applies learned adjustments from ReasoningBank:
   * - Weight adjustments to individual dimensions
   * - Confidence calibration based on historical accuracy
   * - Suppression of false positive patterns
   *
   * @example
   * ```typescript
   * const optimizations = await reasoningBank.getRiskOptimizations('PromptInjection');
   * const adjustedScore = scorer.applyOptimizations(baseScore, optimizations);
   * ```
   */
  applyOptimizations(
    score: DREADScore,
    optimizations: RiskOptimization[]
  ): DREADScore {
    if (optimizations.length === 0) {
      return score;
    }

    let damage = score.damage;
    let exploitability = score.exploitability;
    let affectedUsers = score.affectedUsers;
    let discoverability = score.discoverability;
    let confidence = score.confidence;

    // Apply each optimization
    for (const opt of optimizations) {
      // Apply weight adjustment
      damage *= opt.weightAdjustment;
      exploitability *= opt.weightAdjustment;

      // Apply specific adjustments if provided
      if (opt.adjustments) {
        if (opt.adjustments.damage !== undefined) {
          damage = opt.adjustments.damage;
        }
        if (opt.adjustments.exploitability !== undefined) {
          exploitability = opt.adjustments.exploitability;
        }
        if (opt.adjustments.affectedUsers !== undefined) {
          affectedUsers = opt.adjustments.affectedUsers;
        }
        if (opt.adjustments.discoverability !== undefined) {
          discoverability = opt.adjustments.discoverability;
        }
      }

      // Adjust confidence (use minimum of all optimizations)
      confidence = Math.min(confidence, opt.confidence);
    }

    // Clamp values to 0-10 range
    damage = Math.max(0, Math.min(10, damage));
    exploitability = Math.max(0, Math.min(10, exploitability));
    affectedUsers = Math.max(0, Math.min(10, affectedUsers));
    discoverability = Math.max(0, Math.min(10, discoverability));

    return DREADScoreFactory.create(
      damage,
      score.reproducibility,
      exploitability,
      affectedUsers,
      discoverability,
      confidence
    );
  }

  /**
   * Calculate damage score from configuration
   *
   * @internal
   */
  private calculateDamage(config: AgentConfig, breakdown: DREADBreakdown): number {
    let damage = 0;

    // Hooks with commands can execute arbitrary code (high damage)
    if (config.hooks.length > 0) {
      damage += Math.min(config.hooks.length / 5, 3);
      breakdown.damageFactors.push(`${config.hooks.length} hooks configured`);

      const commandHooks = config.hooks.filter(h => h.command);
      if (commandHooks.length > 0) {
        damage += Math.min(commandHooks.length / 2, 2);
        breakdown.damageFactors.push(`${commandHooks.length} command hooks`);
      }
    }

    // MCP servers expose sensitive operations
    if (config.mcpServers.length > 0) {
      damage += Math.min(config.mcpServers.length / 3, 2);
      breakdown.damageFactors.push(`${config.mcpServers.length} MCP servers`);

      const externalServers = config.mcpServers.filter(s =>
        s.command && !s.command.includes('localhost') && !s.command.includes('127.0.0.1')
      );
      if (externalServers.length > 0) {
        damage += 2;
        breakdown.damageFactors.push(`${externalServers.length} external servers`);
      }
    }

    // Permissions affect potential damage
    if (config.permissions.defaultMode === 'allow') {
      damage += 1;
      breakdown.damageFactors.push('Allow-by-default permissions');
    }

    return Math.min(damage, 10);
  }

  /**
   * Calculate exploitability score
   *
   * @internal
   */
  private calculateExploitability(config: AgentConfig, breakdown: DREADBreakdown): number {
    let exploitability = 0;

    // Wildcard permissions make exploitation easier
    const wildcardRules = config.permissions.rules.filter(r =>
      r.pattern.includes('*') && r.type === 'allow'
    );
    if (wildcardRules.length > 0) {
      exploitability += Math.min(wildcardRules.length, 3);
      breakdown.exploitabilityFactors.push(`${wildcardRules.length} wildcard rules`);
    }

    // Dangerous tools with allow mode
    const dangerousTools = ['Bash', 'Write', 'Edit', 'NotebookEdit'];
    const dangerousAllowed = config.permissions.rules.filter(r =>
      r.type === 'allow' && dangerousTools.some(t => r.pattern.includes(t))
    );
    if (dangerousAllowed.length > 0) {
      exploitability += Math.min(dangerousAllowed.length, 2);
      breakdown.exploitabilityFactors.push(`${dangerousAllowed.length} dangerous tools allowed`);
    }

    // Complex CLAUDE.md increases attack surface
    const instructionLines = config.claudeMd.split('\n').length;
    if (instructionLines > 100) {
      exploitability += Math.min(instructionLines / 100, 2);
      breakdown.exploitabilityFactors.push(`${instructionLines} instruction lines`);
    }

    return Math.min(exploitability, 10);
  }

  /**
   * Calculate affected users score
   *
   * @internal
   */
  private calculateAffectedUsers(config: AgentConfig): number {
    let affectedUsers = 5; // Baseline: affects developer

    // Shared configuration increases impact
    if (config.permissions.defaultMode === 'allow') {
      affectedUsers += 2;
    }

    // External MCP servers increase user impact
    const externalServers = config.mcpServers.filter(s =>
      s.transport && !s.transport.includes('localhost')
    );
    if (externalServers.length > 0) {
      affectedUsers += 2;
    }

    return Math.min(affectedUsers, 10);
  }

  /**
   * Calculate discoverability score
   *
   * @internal
   */
  private calculateDiscoverability(config: AgentConfig, breakdown: DREADBreakdown): number {
    let discoverability = 0;

    // UserPromptSubmit hooks are highly discoverable
    const userPromptHooks = config.hooks.filter(h =>
      h.event === 'UserPromptSubmit'
    );
    if (userPromptHooks.length > 0) {
      discoverability += 3;
      breakdown.discoverabilityFactors.push('UserPromptSubmit hooks present');
    }

    // Allow-by-default makes vulnerabilities easier to discover
    if (config.permissions.defaultMode === 'allow') {
      discoverability += 2;
      breakdown.discoverabilityFactors.push('Allow-by-default permissions');
    }

    // External MCP servers are discoverable via network
    const externalServers = config.mcpServers.filter(s =>
      s.command && !s.command.includes('localhost')
    );
    if (externalServers.length > 0) {
      discoverability += 2;
      breakdown.discoverabilityFactors.push('External MCP servers');
    }

    // Long CLAUDE.md increases discoverability
    if (config.claudeMd.length > 5000) {
      discoverability += 1;
      breakdown.discoverabilityFactors.push('Large instruction set');
    }

    return Math.min(discoverability, 10);
  }

  /**
   * Get baseline DREAD score by finding type
   *
   * @internal
   */
  private getBaselineScore(type: string): DREADScore {
    const baselines: Record<string, DREADScore> = {
      PromptInjection: DREADScoreFactory.create(9, 8, 7, 8, 6, 0.9),
      CommandInjection: DREADScoreFactory.create(10, 9, 8, 9, 7, 0.95),
      SecretExposure: DREADScoreFactory.create(8, 10, 5, 7, 8, 0.85),
      PathTraversal: DREADScoreFactory.create(7, 7, 6, 6, 5, 0.8),
      InsecureSettings: DREADScoreFactory.create(5, 8, 4, 5, 6, 0.75),
      InsecureEndpoint: DREADScoreFactory.create(6, 9, 5, 6, 7, 0.8),
      ExcessivePermissions: DREADScoreFactory.create(5, 10, 6, 5, 6, 0.75)
    };

    return baselines[type] || DREADScoreFactory.create(5, 5, 5, 5, 5, 0.7);
  }

  /**
   * Get severity multiplier
   *
   * @internal
   */
  private getSeverityMultiplier(severity: Severity): number {
    const multipliers: Record<Severity, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
    return multipliers[severity] || 0.5;
  }
}
