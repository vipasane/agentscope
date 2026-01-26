/**
 * Comprehensive error code definitions for Claude Flow
 *
 * Error codes follow pattern: `DOMAIN_SEQUENCE` (e.g., VALIDATION_001, SECURITY_002)
 *
 * **Domain Categories**:
 * - **VALIDATION_XXX**: User input validation failures
 * - **SECURITY_XXX**: Security violations and injection attempts
 * - **MEMORY_XXX**: Storage and memory failures
 * - **AGENT_XXX**: Agent execution and state failures
 * - **CONFIG_XXX**: Configuration errors
 * - **NETWORK_XXX**: Network connection and communication failures
 * - **FS_XXX**: File system access errors
 * - **DB_XXX**: Database connection and query failures
 * - **INTERNAL_XXX**: Internal logic errors
 *
 * Each domain uses zero-padded sequence numbers (001, 002, etc.) for easy reference
 * and logging.
 *
 * @see {@link ErrorSeverity} for severity levels
 * @see {@link ErrorCategory} for category classification
 * @see {@link ErrorFactory} for error creation
 *
 * @public
 */
export const ERROR_CODES = {
  // Validation Errors (VAL_XXX)
  VALIDATION_001: 'VALIDATION_001',
  VALIDATION_002: 'VALIDATION_002',
  VALIDATION_003: 'VALIDATION_003',
  VALIDATION_MISSING_REQUIRED: 'VALIDATION_001',
  VALIDATION_INVALID_TYPE: 'VALIDATION_002',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_003',

  // Security Errors (SEC_XXX)
  SECURITY_001: 'SECURITY_001',
  SECURITY_002: 'SECURITY_002',
  SECURITY_003: 'SECURITY_003',
  SECURITY_004: 'SECURITY_004',
  SECURITY_INJECTION_DETECTED: 'SECURITY_001',
  SECURITY_UNAUTHORIZED: 'SECURITY_002',
  SECURITY_FORBIDDEN: 'SECURITY_003',
  SECURITY_INVALID_TOKEN: 'SECURITY_004',

  // Memory Errors (MEM_XXX)
  MEMORY_001: 'MEMORY_001',
  MEMORY_002: 'MEMORY_002',
  MEMORY_003: 'MEMORY_003',
  MEMORY_004: 'MEMORY_004',
  MEMORY_OUT_OF_SPACE: 'MEMORY_001',
  MEMORY_NOT_FOUND: 'MEMORY_002',
  MEMORY_OPERATION_FAILED: 'MEMORY_003',
  MEMORY_CORRUPTED: 'MEMORY_004',

  // Agent Errors (AGT_XXX)
  AGENT_001: 'AGENT_001',
  AGENT_002: 'AGENT_002',
  AGENT_003: 'AGENT_003',
  AGENT_004: 'AGENT_004',
  AGENT_NOT_FOUND: 'AGENT_001',
  AGENT_EXECUTION_FAILED: 'AGENT_002',
  AGENT_TIMEOUT: 'AGENT_003',
  AGENT_INVALID_STATE: 'AGENT_004',

  // Configuration Errors (CFG_XXX)
  CONFIG_001: 'CONFIG_001',
  CONFIG_002: 'CONFIG_002',
  CONFIG_003: 'CONFIG_003',
  CONFIG_MISSING: 'CONFIG_001',
  CONFIG_INVALID: 'CONFIG_002',
  CONFIG_MERGE_FAILED: 'CONFIG_003',

  // Network Errors (NET_XXX)
  NETWORK_001: 'NETWORK_001',
  NETWORK_002: 'NETWORK_002',
  NETWORK_003: 'NETWORK_003',
  NETWORK_004: 'NETWORK_004',
  NETWORK_TIMEOUT: 'NETWORK_001',
  NETWORK_CONNECTION_REFUSED: 'NETWORK_002',
  NETWORK_INVALID_RESPONSE: 'NETWORK_003',
  NETWORK_DNS_FAILED: 'NETWORK_004',

  // File System Errors (FS_XXX)
  FS_001: 'FS_001',
  FS_002: 'FS_002',
  FS_003: 'FS_003',
  FS_FILE_NOT_FOUND: 'FS_001',
  FS_PERMISSION_DENIED: 'FS_002',
  FS_WRITE_FAILED: 'FS_003',

  // Database Errors (DB_XXX)
  DB_001: 'DB_001',
  DB_002: 'DB_002',
  DB_003: 'DB_003',
  DB_CONNECTION_FAILED: 'DB_001',
  DB_QUERY_FAILED: 'DB_002',
  DB_TRANSACTION_FAILED: 'DB_003',

  // Internal Errors (INT_XXX)
  INTERNAL_001: 'INTERNAL_001',
  INTERNAL_002: 'INTERNAL_002',
  INTERNAL_UNKNOWN: 'INTERNAL_001',
  INTERNAL_NOT_IMPLEMENTED: 'INTERNAL_002',
} as const;

/**
 * Type for all valid error codes
 *
 * Ensures type safety when creating errors with specific codes.
 *
 * @example
 * ```typescript
 * const code: ErrorCode = 'NETWORK_001';
 * const error = ErrorFactory.fromCode(code, 'Connection failed');
 * ```
 *
 * @public
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Error severity levels
 *
 * Indicates urgency and impact of an error:
 * - **LOW**: Minor issue, informational
 * - **MEDIUM**: User action required, recoverable
 * - **HIGH**: Operation failed, may be recoverable with retry
 * - **CRITICAL**: System failure, immediate attention required
 *
 * Used for prioritization in logging and monitoring.
 *
 * @example
 * ```typescript
 * import { ErrorSeverity } from '@claude-flow/errors';
 *
 * const severity = ErrorSeverity.CRITICAL;
 * if (severity === ErrorSeverity.CRITICAL) {
 *   // Escalate immediately
 * }
 * ```
 *
 * @public
 */
export enum ErrorSeverity {
  /** Minor issue, informational */
  LOW = 'low',

  /** User action required, recoverable */
  MEDIUM = 'medium',

  /** Operation failed, may be recoverable */
  HIGH = 'high',

  /** System failure, immediate attention */
  CRITICAL = 'critical',
}

/**
 * Error categories for classification and routing
 *
 * Classifies errors by domain for:
 * - Error handling strategies (retry, fallback, etc.)
 * - Monitoring and alerting
 * - Error cause analysis
 *
 * **Category Descriptions**:
 * - **VALIDATION**: User input validation failures
 * - **SECURITY**: Security violations (injection, unauthorized)
 * - **MEMORY**: Storage and memory failures
 * - **AGENT**: Agent execution failures
 * - **CONFIG**: Configuration errors
 * - **NETWORK**: Connection and communication failures
 * - **FILE_SYSTEM**: File access errors
 * - **DATABASE**: Database operation failures
 * - **INTERNAL**: Logic errors and unrecoverable states
 *
 * @example
 * ```typescript
 * import { ErrorCategory } from '@claude-flow/errors';
 *
 * const error = ErrorFactory.create(
 *   'Invalid input',
 *   'VALIDATION_001',
 *   ErrorCategory.VALIDATION,
 *   ErrorSeverity.MEDIUM
 * );
 * ```
 *
 * @public
 */
export enum ErrorCategory {
  /** User input validation failures */
  VALIDATION = 'validation',

  /** Security violations and attacks */
  SECURITY = 'security',

  /** Storage and memory failures */
  MEMORY = 'memory',

  /** Agent execution and state failures */
  AGENT = 'agent',

  /** Configuration errors */
  CONFIG = 'config',

  /** Connection and communication failures */
  NETWORK = 'network',

  /** File system access errors */
  FILE_SYSTEM = 'file_system',

  /** Database operation failures */
  DATABASE = 'database',

  /** Logic errors and unrecoverable states */
  INTERNAL = 'internal',
}
