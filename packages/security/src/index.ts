/**
 * @claude-flow/security
 *
 * Zero-dependency security validation and sanitization for AI agents
 *
 * ## Features
 *
 * - **Input Validation** - Zod-style API with runtime type safety (CVE-1, CVE-2 mitigation)
 * - **Path Traversal Prevention** - Validates file paths against directory traversal attacks (CVE-1 mitigation)
 * - **Command Injection Protection** - Prevents shell command injection via allowlists and escaping (CVE-2 mitigation)
 * - **Secret Detection** - Regex + entropy-based secret scanning and redaction (CVE-3 mitigation)
 * - **Performance** - <50ms for validation, <100ms for secret detection
 *
 * ## Security Model
 *
 * This package implements defense-in-depth security for AI agent operations:
 *
 * 1. **Input Validation Layer** - Reject malicious input before processing
 * 2. **Sanitization Layer** - Remove dangerous patterns from accepted input
 * 3. **Execution Layer** - Control and isolate dangerous operations
 * 4. **Secret Detection** - Prevent credential exposure in logs and outputs
 *
 * ## Threat Mitigation
 *
 * | CVE | Threat | Mitigation | DREAD Score |
 * |-----|--------|------------|-------------|
 * | CVE-1 | Path Traversal | PathValidator prevents `../` sequences | 8.6/10 |
 * | CVE-2 | Command Injection | SafeExecutor blocks shell metacharacters | 9.2/10 |
 * | CVE-3 | Secret Exposure | SecretsSanitizer detects API keys, tokens | 7.4/10 |
 *
 * ## Installation
 *
 * ```bash
 * npm install @claude-flow/security
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { InputValidator, PathValidator, SafeExecutor, SecretsSanitizer } from '@claude-flow/security';
 *
 * // 1. Validate user input
 * const emailSchema = InputValidator.string({ email: true, max: 254 });
 * const result = emailSchema.safeParse(userInput);
 * if (!result.success) {
 *   console.error('Validation failed:', result.error);
 * }
 *
 * // 2. Prevent path traversal
 * const safePath = PathValidator.validate(userPath, {
 *   allowTraversal: false,
 *   allowedDirectories: ['/var/uploads']
 * });
 *
 * // 3. Protect command execution
 * const safeCommand = SafeExecutor.validate('npm install', {
 *   allowedCommands: ['npm', 'node', 'git'],
 *   blockedCommands: SafeExecutor.DANGEROUS_COMMANDS
 * });
 *
 * // 4. Detect and redact secrets
 * const findings = SecretsSanitizer.detect(logMessage);
 * const redacted = SecretsSanitizer.redactContent(logMessage);
 * ```
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────┐
 * │          Layer 1: Input Validation              │
 * │  InputValidator (Zod-style API)                 │
 * │  - String, number, boolean, array, object       │
 * │  - Email, URL, regex pattern matching           │
 * │  - Min/max length and bounds checking           │
 * └─────────────────────────────────────────────────┘
 *                      ▼
 * ┌─────────────────────────────────────────────────┐
 * │       Layer 2: Path & Command Validation        │
 * │  PathValidator, SafeExecutor                    │
 * │  - Path traversal detection                     │
 * │  - Command injection prevention                 │
 * │  - Allowlist/blocklist enforcement              │
 * └─────────────────────────────────────────────────┘
 *                      ▼
 * ┌─────────────────────────────────────────────────┐
 * │         Layer 3: Secret Detection               │
 * │  SecretsSanitizer                               │
 * │  - Regex-based pattern matching                 │
 * │  - Entropy analysis for unknown secrets         │
 * │  - Redaction with partial masking               │
 * └─────────────────────────────────────────────────┘
 * ```
 *
 * ## Usage Patterns
 *
 * ### Secure API Endpoint
 *
 * ```typescript
 * import { InputValidator } from '@claude-flow/security';
 *
 * const UserSchema = InputValidator.object({
 *   email: InputValidator.string({ email: true, max: 254 }),
 *   name: InputValidator.string({ min: 1, max: 100 }),
 *   age: InputValidator.number({ min: 0, max: 120, int: true })
 * });
 *
 * async function createUser(req: Request, res: Response) {
 *   const result = UserSchema.safeParse(req.body);
 *   if (!result.success) {
 *     return res.status(400).json({ error: result.error });
 *   }
 *   const user = await db.users.create(result.data);
 *   return res.json({ user });
 * }
 * ```
 *
 * ### Secure File Operations
 *
 * ```typescript
 * import { PathValidator } from '@claude-flow/security';
 *
 * const UPLOADS_DIR = '/var/app/uploads';
 *
 * async function readUserFile(filename: string) {
 *   try {
 *     const safePath = PathValidator.validate(filename, {
 *       allowTraversal: false,
 *       allowedDirectories: [UPLOADS_DIR]
 *     });
 *     return await fs.readFile(safePath, 'utf8');
 *   } catch (error) {
 *     throw new Error('Invalid file path');
 *   }
 * }
 * ```
 *
 * ### Secure Command Execution
 *
 * ```typescript
 * import { SafeExecutor } from '@claude-flow/security';
 *
 * async function installPackage(packageName: string) {
 *   const command = SafeExecutor.buildCommand('npm', ['install', packageName]);
 *   const validated = SafeExecutor.validate(command, {
 *     allowedCommands: ['npm'],
 *     requireShellEscape: true
 *   });
 *   return exec(validated);
 * }
 * ```
 *
 * ### Secret Detection in Logs
 *
 * ```typescript
 * import { SecretsSanitizer } from '@claude-flow/security';
 *
 * function log(message: string) {
 *   const findings = SecretsSanitizer.detect(message);
 *   if (findings.length > 0) {
 *     console.warn(`[SECURITY] ${findings.length} secrets detected in log`);
 *   }
 *   const safe = SecretsSanitizer.redactContent(message);
 *   console.log(safe);
 * }
 * ```
 *
 * ## Performance Characteristics
 *
 * | Operation | Time Complexity | Target Performance |
 * |-----------|----------------|-------------------|
 * | InputValidator.string() | O(n) | <10ms for <100KB |
 * | PathValidator.validate() | O(n) | <50ms for typical paths |
 * | SafeExecutor.validate() | O(n) | <50ms for commands |
 * | SecretsSanitizer.detect() | O(n×m) | <100ms for <1MB |
 *
 * Where:
 * - n = input length
 * - m = number of secret patterns
 *
 * ## Security Guarantees
 *
 * ✅ **No bypass via encoding** - All validators normalize input
 * ✅ **No regex DoS** - All patterns are non-backtracking
 * ✅ **No false negatives** - Defense-in-depth with multiple layers
 * ✅ **No information leakage** - Secrets redacted with partial masking
 * ✅ **No runtime dependencies** - Zero-dependency for maximum security audit
 *
 * ## Links
 *
 * - [Security Architecture (ADR-012)](../../docs/adr/ADR-012-agent-security-architecture.md)
 * - [CVE Mitigations](../../docs/security/)
 * - [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
 * - [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
 * - [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
 *
 * @packageDocumentation
 * @module @claude-flow/security
 * @version 1.0.0
 * @since 1.0.0
 */

// Validators
export { InputValidator } from './validators/InputValidator.js';
export type { ZodType } from './validators/InputValidator.js';
export { PathValidator } from './validators/PathValidator.js';
export { SafeExecutor } from './validators/SafeExecutor.js';

// Sanitizers
export { SecretsSanitizer } from './sanitizers/SecretsSanitizer.js';

// Scoring
export {
  DREADScorer,
  DREADScoreFactory,
  type DREADScore,
  type DREADBreakdown,
  type AgentConfig,
  type Hook,
  type PermissionSummary,
  type McpServer,
  type RiskOptimization as DREADRiskOptimization
} from './scoring/DREADScorer.js';

// Detectors
export { detectPromptInjection } from './detectors/PromptInjectionDetector.js';
export type {
  PromptInjectionResult,
  DetectionOptions
} from './detectors/PromptInjectionDetector.js';

// Learning
export {
  SecurityLearningCoordinator,
  createSecurityLearningCoordinator
} from './learning/SecurityLearningCoordinator.js';
export type {
  ThreatPattern,
  RiskOptimization,
  SecurityAssessment,
  SecurityFeedback,
  ThreatCategory
} from './learning/SecurityLearningCoordinator.js';

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
