/**
 * @claude-flow/security
 *
 * Zero-dependency security validation and sanitization for AI agents
 *
 * Features:
 * - Input validation with Zod-style API
 * - Path traversal prevention
 * - Command injection protection
 * - Secret detection and redaction
 * - Performance: <50ms for validation operations
 *
 * @packageDocumentation
 */

// Validators
export { InputValidator } from './validators/InputValidator.js';
export type { ZodType } from './validators/InputValidator.js';
export { PathValidator } from './validators/PathValidator.js';
export { SafeExecutor } from './validators/SafeExecutor.js';

// Sanitizers
export { SecretsSanitizer } from './sanitizers/SecretsSanitizer.js';

// Types
export type {
  Severity,
  SecurityFinding,
  SecretFinding,
  InjectionFinding,
  ConfigFinding,
  EndpointFinding,
  DreadScore,
  SecurityReport,
  ReportSummary,
  FindingDetail,
  RemediationStep,
  ValidationResult,
  PathValidationOptions,
  CommandValidationOptions,
  LocationInfo
} from './utils/types.js';

// Version
export const VERSION = '1.0.0';
