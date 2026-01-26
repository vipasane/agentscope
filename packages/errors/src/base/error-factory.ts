import { BaseError } from './base-error.js';
import type { ErrorCode, ErrorCategory, ErrorSeverity } from '../types/error-codes.js';
import { ERROR_CODES, ErrorSeverity as Severity, ErrorCategory as Category } from '../types/error-codes.js';
import type { ErrorContext } from '../types/error-context.js';

/**
 * Factory for creating typed, consistent errors
 *
 * Provides static methods for creating BaseError instances with proper codes,
 * categories, and severity levels. Ensures consistency across the codebase.
 *
 * **Usage Pattern**: Use specific factory methods based on error type:
 * - {@link ErrorFactory.validation} - User input validation failures
 * - {@link ErrorFactory.security} - Security violations
 * - {@link ErrorFactory.memory} - Storage/memory failures
 * - {@link ErrorFactory.agent} - Agent execution failures
 * - {@link ErrorFactory.config} - Configuration errors
 * - {@link ErrorFactory.network} - Network failures
 * - {@link ErrorFactory.fileSystem} - File system failures
 * - {@link ErrorFactory.database} - Database failures
 * - {@link ErrorFactory.internal} - Internal/unrecoverable errors
 *
 * @example Type-Safe Error Creation
 * ```typescript
 * import { ErrorFactory, ErrorCode, ErrorCategory, ErrorSeverity } from '@claude-flow/errors';
 *
 * // Create with factory method (recommended)
 * const validationError = ErrorFactory.validation(
 *   'Email format invalid',
 *   { field: 'email', value: userInput }
 * );
 *
 * // Create with custom code
 * const customError = ErrorFactory.create(
 *   'Custom error message',
 *   'SECURITY_001',
 *   ErrorCategory.SECURITY,
 *   ErrorSeverity.CRITICAL,
 *   { details: 'additional context' }
 * );
 *
 * // Wrap existing error
 * try {
 *   await operation();
 * } catch (err) {
 *   throw ErrorFactory.wrap(err, 'Operation failed', { operation: 'name' });
 * }
 * ```
 *
 * @example Error from Code
 * ```typescript
 * // Create error from code (auto-detects category and severity)
 * const error = ErrorFactory.fromCode(
 *   'NETWORK_001',
 *   'Connection timeout',
 *   { host: 'api.example.com', port: 443 }
 * );
 * ```
 *
 * @see {@link BaseError} for error properties and methods
 * @see {@link ErrorHandler} for global error handling
 *
 * @public
 */
export class ErrorFactory {
  /**
   * Create a validation error
   *
   * Validation errors (VALIDATION_001) indicate failures in input validation
   * or format checking. Severity: MEDIUM (user can provide valid input).
   *
   * @param message - Human-readable error description
   * @param context - Application context (field, value, rules, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with VALIDATION_001 code
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.validation(
   *   'Email format invalid',
   *   { field: 'email', value: 'invalid-email' }
   * );
   * // error.code = 'VALIDATION_001', error.severity = 'medium'
   * ```
   *
   * @public
   */
  static validation(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.VALIDATION_001 as ErrorCode,
      Category.VALIDATION,
      Severity.MEDIUM,
      context,
      cause
    );
  }

  /**
   * Create a security error
   *
   * Security errors (SECURITY_001) indicate unauthorized access, injection attempts,
   * or security policy violations. Severity: CRITICAL (requires immediate attention).
   *
   * @param message - Human-readable security error description
   * @param context - Security context (attack type, source, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with SECURITY_001 code and CRITICAL severity
   *
   * @security These errors must be logged and monitored for security incidents.
   *
   * @see {@link ErrorFactory.validation} for input validation failures
   *
   * @public
   */
  static security(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.SECURITY_001 as ErrorCode,
      Category.SECURITY,
      Severity.CRITICAL,
      context,
      cause
    );
  }

  /**
   * Create a memory error
   *
   * Memory errors (MEMORY_001) indicate storage failures, data corruption,
   * or out-of-space conditions. Severity: HIGH (may be recoverable).
   *
   * @param message - Human-readable memory error description
   * @param context - Memory context (storage, size, quota, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with MEMORY_001 code
   *
   * @public
   */
  static memory(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.MEMORY_001 as ErrorCode,
      Category.MEMORY,
      Severity.HIGH,
      context,
      cause
    );
  }

  /**
   * Create an agent error
   *
   * Agent errors (AGENT_001) indicate execution failures, timeouts, or
   * invalid agent states. Severity: HIGH (may be recoverable).
   *
   * @param message - Human-readable agent error description
   * @param context - Agent context (agentId, attempt, timeout, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with AGENT_001 code
   *
   * @public
   */
  static agent(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.AGENT_001 as ErrorCode,
      Category.AGENT,
      Severity.HIGH,
      context,
      cause
    );
  }

  /**
   * Create a configuration error
   *
   * Configuration errors (CONFIG_001) indicate missing or invalid configuration.
   * Severity: MEDIUM (usually fixed by operator action).
   *
   * @param message - Human-readable configuration error description
   * @param context - Config context (key, required values, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with CONFIG_001 code
   *
   * @public
   */
  static config(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.CONFIG_001 as ErrorCode,
      Category.CONFIG,
      Severity.MEDIUM,
      context,
      cause
    );
  }

  /**
   * Create a network error
   *
   * Network errors (NETWORK_001) indicate connection failures, timeouts, or DNS errors.
   * Severity: HIGH (may be recoverable with retry).
   *
   * @param message - Human-readable network error description
   * @param context - Network context (host, port, timeout, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with NETWORK_001 code
   *
   * @see {@link RetryStrategy} for automatic retry
   *
   * @public
   */
  static network(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.NETWORK_001 as ErrorCode,
      Category.NETWORK,
      Severity.HIGH,
      context,
      cause
    );
  }

  /**
   * Create a file system error
   *
   * File system errors (FS_001) indicate access denied, file not found, or write failures.
   * Severity: MEDIUM (usually fixed by operator or permissions).
   *
   * @param message - Human-readable file system error description
   * @param context - File system context (path, operation, permissions, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with FS_001 code
   *
   * @public
   */
  static fileSystem(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.FS_001 as ErrorCode,
      Category.FILE_SYSTEM,
      Severity.MEDIUM,
      context,
      cause
    );
  }

  /**
   * Create a database error
   *
   * Database errors (DB_001) indicate connection failures, query failures,
   * or transaction failures. Severity: HIGH (may be recoverable).
   *
   * @param message - Human-readable database error description
   * @param context - Database context (connection, query, transaction, etc.)
   * @param cause - Original error that triggered this error
   * @returns BaseError with DB_001 code
   *
   * @see {@link RetryStrategy} for automatic retry
   *
   * @public
   */
  static database(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.DB_001 as ErrorCode,
      Category.DATABASE,
      Severity.HIGH,
      context,
      cause
    );
  }

  /**
   * Create an internal error
   *
   * Internal errors (INTERNAL_001) indicate logic bugs or unrecoverable states.
   * Severity: CRITICAL (requires investigation).
   *
   * @param message - Human-readable internal error description
   * @param context - Debug context
   * @param cause - Original error that triggered this error
   * @returns BaseError with INTERNAL_001 code
   *
   * @public
   */
  static internal(message: string, context?: ErrorContext, cause?: Error): BaseError {
    return new BaseError(
      message,
      ERROR_CODES.INTERNAL_001 as ErrorCode,
      Category.INTERNAL,
      Severity.CRITICAL,
      context,
      cause
    );
  }

  /**
   * Create a custom error with all parameters
   *
   * Allows creating errors with custom codes, categories, and severity.
   * Prefer specific factory methods for standard error types.
   *
   * @param message - Human-readable error description
   * @param code - Custom error code (e.g., 'CUSTOM_001')
   * @param category - Error category classification
   * @param severity - Severity level (low, medium, high, critical)
   * @param context - Application context
   * @param cause - Original error that triggered this error
   * @returns BaseError with specified properties
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.create(
   *   'Custom error',
   *   'CUSTOM_001',
   *   ErrorCategory.INTERNAL,
   *   ErrorSeverity.MEDIUM,
   *   { details: 'context' }
   * );
   * ```
   *
   * @public
   */
  static create(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: ErrorContext,
    cause?: Error
  ): BaseError {
    return new BaseError(message, code, category, severity, context, cause);
  }

  /**
   * Wrap an existing error
   *
   * Converts native Error into BaseError while preserving the original error as cause.
   * If error is already BaseError, returns it (or with updated context if message provided).
   *
   * @param error - Error to wrap
   * @param message - Optional message to use instead of original error message
   * @param context - Optional context to add
   * @returns BaseError with original error as cause
   *
   * @example
   * ```typescript
   * try {
   *   await nativeLibraryCall();
   * } catch (err) {
   *   // Wrap native error
   *   throw ErrorFactory.wrap(err, 'Library call failed', { library: 'name' });
   * }
   * ```
   *
   * @public
   */
  static wrap(error: Error, message?: string, context?: ErrorContext): BaseError {
    if (error instanceof BaseError) {
      return message ? error.withContext(context || {}) : error;
    }

    return new BaseError(
      message || error.message,
      ERROR_CODES.INTERNAL_001 as ErrorCode,
      Category.INTERNAL,
      Severity.MEDIUM,
      context,
      error
    );
  }

  /**
   * Create error from code
   *
   * Creates error with automatic category and severity detection based on code.
   * Codes like 'VALIDATION_001', 'SECURITY_002' are automatically classified.
   *
   * @param code - Error code (e.g., 'NETWORK_001')
   * @param message - Human-readable error description
   * @param context - Application context
   * @param cause - Original error that triggered this error
   * @returns BaseError with auto-detected category and severity
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.fromCode(
   *   'NETWORK_001',
   *   'Connection timeout',
   *   { host: 'api.example.com' }
   * );
   * // Auto-detects: category = NETWORK, severity = HIGH
   * ```
   *
   * @public
   */
  static fromCode(code: ErrorCode, message: string, context?: ErrorContext, cause?: Error): BaseError {
    const category = this.getCategoryForCode(code);
    const severity = this.getSeverityForCode(code);

    return new BaseError(message, code, category, severity, context, cause);
  }

  /**
   * Get category from error code
   */
  private static getCategoryForCode(code: ErrorCode): ErrorCategory {
    if (code.startsWith('VALIDATION')) return Category.VALIDATION;
    if (code.startsWith('SECURITY')) return Category.SECURITY;
    if (code.startsWith('MEMORY')) return Category.MEMORY;
    if (code.startsWith('AGENT')) return Category.AGENT;
    if (code.startsWith('CONFIG')) return Category.CONFIG;
    if (code.startsWith('NETWORK')) return Category.NETWORK;
    if (code.startsWith('FS')) return Category.FILE_SYSTEM;
    if (code.startsWith('DB')) return Category.DATABASE;
    return Category.INTERNAL;
  }

  /**
   * Get severity from error code
   */
  private static getSeverityForCode(code: ErrorCode): ErrorSeverity {
    if (code.startsWith('SECURITY') || code.startsWith('INTERNAL')) return Severity.CRITICAL;
    if (code.startsWith('AGENT') || code.startsWith('NETWORK') || code.startsWith('DB')) return Severity.HIGH;
    if (code.startsWith('MEMORY')) return Severity.HIGH;
    return Severity.MEDIUM;
  }
}
