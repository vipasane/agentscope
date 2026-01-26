/**
 * @claude-flow/types - Security Types
 *
 * Defines security architecture including:
 * - Validation results and security findings
 * - Threat levels and risk assessment
 * - Security scanning and remediation
 * - Agent security context
 *
 * @module types/security/security
 */

import type { FindingId, Confidence } from '../common/branded.js';

/**
 * Threat severity levels
 *
 * @example
 * - `info`: Informational finding, no action required
 * - `warning`: Should be addressed in future
 * - `error`: Should be fixed soon
 * - `critical`: Fix immediately
 */
export type ThreatLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * Threat or vulnerability category
 *
 * @example
 * - `injection`: SQL, command, prompt injection attacks
 * - `secrets`: Exposed API keys or credentials
 * - `traversal`: Path traversal vulnerabilities
 * - `dos`: Denial of service issues
 * - `auth`: Authentication/authorization problems
 */
export type ThreatCategory =
  | 'injection'
  | 'secrets'
  | 'traversal'
  | 'dos'
  | 'auth'
  | 'unsafe-deserialization'
  | 'information-disclosure'
  | 'malware'
  | 'supply-chain'
  | 'other';

/**
 * Validation result for configuration or input
 *
 * @example
 * ```typescript
 * {
 *   valid: false,
 *   errors: [
 *     { field: 'email', message: 'Invalid email format' }
 *   ]
 * }
 * ```
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;

  /** Validation errors if any */
  readonly errors?: ValidationError[];

  /** Warnings that don't prevent validity */
  readonly warnings?: ValidationWarning[];

  /** Validation metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Single validation error
 */
export interface ValidationError {
  /** Field or context of error */
  readonly field: string;

  /** Error message */
  readonly message: string;

  /** Error code for programmatic handling */
  readonly code?: string;

  /** Suggested remediation */
  readonly suggestion?: string;
}

/**
 * Single validation warning
 */
export interface ValidationWarning {
  /** Field or context of warning */
  readonly field: string;

  /** Warning message */
  readonly message: string;

  /** Severity of warning */
  readonly severity: 'minor' | 'major';
}

/**
 * Security finding from scanning or analysis
 *
 * Represents a detected vulnerability, misconfiguration, or threat.
 *
 * @example
 * ```typescript
 * {
 *   id: 'finding-1',
 *   type: 'exposed_api_key',
 *   level: 'critical',
 *   category: 'secrets',
 *   location: { file: 'src/config.ts', line: 42 },
 *   message: 'API key exposed in source code',
 *   evidence: 'ANTHROPIC_API_KEY=sk-ant-...',
 *   remediation: 'Move API key to environment variable'
 * }
 * ```
 */
export interface SecurityFinding {
  /** Unique finding identifier */
  readonly id: FindingId;

  /** Finding type */
  readonly type: string;

  /** Threat level */
  readonly level: ThreatLevel;

  /** Threat category */
  readonly category: ThreatCategory;

  /** Location of finding */
  readonly location: {
    file: string;
    line?: number;
    column?: number;
  };

  /** Detailed message */
  readonly message: string;

  /** Evidence or description */
  readonly evidence?: string;

  /** How to fix this issue */
  readonly remediation?: string;

  /** References to documentation */
  readonly references?: string[];

  /** Confidence that this is a real issue (0-1) */
  readonly confidence?: Confidence;

  /** When finding was discovered */
  readonly discoveredAt: Date;

  /** Whether finding has been remediated */
  readonly remediated?: boolean;
}

/**
 * Security scan configuration
 *
 * Defines what to scan and how deeply to scan it.
 */
export interface SecurityScanConfig {
  /** Depth of scan: shallow (fast), medium (balanced), deep (thorough) */
  readonly depth?: 'shallow' | 'medium' | 'deep';

  /** Categories to scan for */
  readonly categories?: ThreatCategory[];

  /** Patterns to check against */
  readonly patterns?: string[];

  /** Files or directories to include */
  readonly include?: string[];

  /** Files or directories to exclude */
  readonly exclude?: string[];

  /** Maximum file size to scan */
  readonly maxFileSizeBytes?: number;

  /** Enable caching of scan results */
  readonly enableCache?: boolean;
}

/**
 * Security scan result
 *
 * Result of scanning for vulnerabilities and misconfigurations.
 */
export interface SecurityScanResult {
  /** Scan timestamp */
  readonly startedAt: Date;

  /** When scan completed */
  readonly completedAt: Date;

  /** Findings discovered */
  readonly findings: SecurityFinding[];

  /** Summary statistics */
  readonly summary: {
    total: number;
    byCritical: number;
    byError: number;
    byWarning: number;
    byInfo: number;
  };

  /** Scan metrics */
  readonly metrics?: {
    filesScanned: number;
    linesScanned: number;
    averageLatencyMs: number;
  };

  /** Overall risk assessment (0-1) */
  readonly riskScore: Confidence;
}

/**
 * Remediation action for a security finding
 *
 * Instructions for fixing a specific finding.
 */
export interface RemediationAction {
  /** Finding this action addresses */
  readonly findingId: FindingId;

  /** Action description */
  readonly description: string;

  /** Steps to execute */
  readonly steps: RemediationStep[];

  /** Priority (1-10, higher = more urgent) */
  readonly priority: number;

  /** Estimated time to fix in minutes */
  readonly estimatedMinutes?: number;

  /** Risk of the remediation itself */
  readonly remediationRisk?: 'low' | 'medium' | 'high';
}

/**
 * Single remediation step
 */
export interface RemediationStep {
  /** Step number or name */
  readonly id: string;

  /** Step description */
  readonly description: string;

  /** Commands or code to execute */
  readonly commands?: string[];

  /** Files to modify and how */
  readonly fileChanges?: {
    file: string;
    operation: 'create' | 'modify' | 'delete';
    content?: string;
  }[];

  /** Verification commands */
  readonly verification?: string[];
}

/**
 * Agent security context
 *
 * Defines security permissions and constraints for an agent.
 */
export interface AgentSecurityContext {
  /** Agent identifier */
  readonly agentId: string;

  /** Granted capabilities */
  readonly capabilities: string[];

  /** Resource access restrictions */
  readonly resourceLimits?: {
    maxFileSize?: number;
    maxMemory?: number;
    maxExecutionTime?: number;
    allowedDomains?: string[];
  };

  /** Security sandbox level */
  readonly sandboxLevel: 'unrestricted' | 'moderate' | 'strict';

  /** Whether agent can access network */
  readonly networkAccess: boolean;

  /** Whether agent can execute shell commands */
  readonly shellAccess: boolean;

  /** Whether agent can read from filesystem */
  readonly fileReadAccess: boolean;

  /** Whether agent can write to filesystem */
  readonly fileWriteAccess: boolean;
}

/**
 * Security policy for operation authorization
 *
 * Defines what operations are allowed and under what conditions.
 */
export interface SecurityPolicy {
  /** Policy identifier */
  readonly id: string;

  /** Policy name */
  readonly name: string;

  /** Policy description */
  readonly description?: string;

  /** Principal that policy applies to */
  readonly principal: {
    type: 'agent' | 'user' | 'role';
    id: string;
  };

  /** Actions allowed */
  readonly allowedActions: string[];

  /** Resources the policy applies to */
  readonly resources: string[];

  /** Additional conditions */
  readonly conditions?: Record<string, unknown>;

  /** When policy becomes effective */
  readonly effectiveAt: Date;

  /** When policy expires */
  readonly expiresAt?: Date;
}

/**
 * Audit log entry for security tracking
 *
 * Records security-relevant events for compliance and forensics.
 */
export interface AuditLogEntry {
  /** Entry identifier */
  readonly id: string;

  /** Event type */
  readonly event: string;

  /** Principal performing action */
  readonly principal: {
    type: 'agent' | 'user' | 'system';
    id: string;
  };

  /** Action performed */
  readonly action: string;

  /** Resource affected */
  readonly resource?: string;

  /** Outcome: 'success', 'failure', 'denied' */
  readonly outcome: 'success' | 'failure' | 'denied';

  /** Details of the event */
  readonly details?: Record<string, unknown>;

  /** When event occurred */
  readonly timestamp: Date;

  /** IP address if applicable */
  readonly ipAddress?: string;
}

/**
 * Security incident report
 *
 * Comprehensive report of a security incident or violation.
 */
export interface SecurityIncident {
  /** Incident identifier */
  readonly id: string;

  /** Incident severity */
  readonly severity: ThreatLevel;

  /** Incident title */
  readonly title: string;

  /** Detailed description */
  readonly description: string;

  /** When incident occurred */
  readonly occurredAt: Date;

  /** When incident was discovered */
  readonly discoveredAt: Date;

  /** Involved findings */
  readonly findings: FindingId[];

  /** Remediation actions taken */
  readonly remediationActions?: RemediationAction[];

  /** Incident status: 'open', 'in-progress', 'resolved' */
  readonly status: 'open' | 'in-progress' | 'resolved';

  /** Lessons learned */
  readonly lessonsLearned?: string;
}
