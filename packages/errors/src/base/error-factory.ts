import { BaseError } from './base-error.js';
import type { ErrorCode, ErrorCategory, ErrorSeverity } from '../types/error-codes.js';
import { ERROR_CODES, ErrorSeverity as Severity, ErrorCategory as Category } from '../types/error-codes.js';
import type { ErrorContext } from '../types/error-context.js';

/**
 * Factory for creating typed, consistent errors
 * Ensures all errors have proper codes, categories, and severity levels
 */
export class ErrorFactory {
  /**
   * Create a validation error
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
