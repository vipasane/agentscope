/**
 * Core types for security validation and scanning
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityFinding {
  type: string;
  severity: Severity;
  location: LocationInfo;
  message: string;
  remediation: string;
  cve?: string;
}

export interface LocationInfo {
  file: string;
  line?: number;
  column?: number;
  index?: number;
}

export interface SecretFinding extends SecurityFinding {
  value: string; // Redacted value
  secretType: string;
}

export interface InjectionFinding extends SecurityFinding {
  tier: 1 | 2 | 3; // Detection tier
  context: string;
  pattern: string;
}

export interface ConfigFinding extends SecurityFinding {
  configKey: string;
  actualValue: unknown;
  recommendedValue?: unknown;
}

export interface EndpointFinding extends SecurityFinding {
  url: string;
  protocol: string;
}

export interface DreadScore {
  damage: number;
  reproducibility: number;
  exploitability: number;
  affectedUsers: number;
  discoverability: number;
  total: number;
  riskLevel: Severity;
}

export interface SecurityReport {
  summary: ReportSummary;
  findings: FindingDetail[];
  remediation: RemediationStep[];
  timestamp: number;
}

export interface ReportSummary {
  totalIssues: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  avgDreadScore: number;
  passStatus: 'PASS' | 'FAIL';
}

export interface FindingDetail {
  id: string;
  type: string;
  severity: Severity;
  cve?: string;
  dread: DreadScore;
  location: LocationInfo;
  message: string;
  remediation: string;
  references: string[];
}

export interface RemediationStep {
  priority: number;
  severity: Severity;
  action: string;
  finding: string;
  effort: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PathValidationOptions {
  allowAbsolute?: boolean;
  allowTraversal?: boolean;
  allowedDirectories?: string[];
  maxDepth?: number;
}

export interface CommandValidationOptions {
  allowedCommands?: string[];
  blockedCommands?: string[];
  requireShellEscape?: boolean;
}
