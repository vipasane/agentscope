import type { ErrorCode, ErrorCategory, ErrorSeverity } from '../types/error-codes.js';
import type { ErrorContext, ErrorMetadata } from '../types/error-context.js';

/**
 * Base error class for all Claude Flow errors
 *
 * Provides consistent error structure with:
 * - Error codes (VALIDATION_001, SECURITY_002, etc.) for programmatic handling
 * - Categories (validation, security, memory, agent, config, network, filesystem, database, internal)
 * - Severity levels (low, medium, high, critical) for prioritization
 * - Context preservation for debugging and recovery
 * - Error chaining to track error origins
 * - Structured serialization for logging and transmission
 *
 * ## Error Hierarchy
 *
 * All error types in Claude Flow extend BaseError:
 * - Validation errors: User input validation failures
 * - Security errors: Injection attempts, unauthorized access
 * - Memory errors: Storage failures, data corruption
 * - Agent errors: Execution failures, timeouts
 * - Configuration errors: Missing/invalid configuration
 * - Network errors: Connection failures, timeouts, DNS errors
 * - File system errors: Permission denied, file not found
 * - Database errors: Connection failures, query failures
 * - Internal errors: Logic bugs, unrecoverable states
 *
 * ## Properties
 *
 * - `code`: Unique error code for programmatic matching (e.g., 'VALIDATION_001')
 * - `category`: Error category for classification
 * - `severity`: Importance level (low, medium, high, critical)
 * - `message`: Human-readable error description
 * - `context`: Application-specific context data
 * - `metadata`: Parsed stack location and original error
 * - `cause`: Original error that triggered this error (error chaining)
 *
 * @example Basic Usage
 * ```typescript
 * const error = new BaseError(
 *   'Invalid user input',
 *   'VALIDATION_001',
 *   ErrorCategory.VALIDATION,
 *   ErrorSeverity.MEDIUM,
 *   { field: 'email', value: userInput },
 *   originalError
 * );
 *
 * console.log(error.code);      // 'VALIDATION_001'
 * console.log(error.format());  // '[VALIDATION_001] Invalid user input at file.ts:123:45'
 * ```
 *
 * @example With Context
 * ```typescript
 * const error = new BaseError(
 *   'Database connection failed',
 *   'DB_001',
 *   ErrorCategory.DATABASE,
 *   ErrorSeverity.HIGH,
 *   {
 *     host: 'db.example.com',
 *     port: 5432,
 *     retries: 3
 *   },
 *   originalNetworkError
 * );
 *
 * // Add more context later
 * error.withContext({ userId: 'user-123', timestamp: Date.now() });
 * ```
 *
 * @example Error Chain
 * ```typescript
 * try {
 *   await operation();
 * } catch (cause) {
 *   // Create new error with original as cause
 *   const wrapped = new BaseError(
 *     'Operation failed',
 *     'AGENT_002',
 *     ErrorCategory.AGENT,
 *     ErrorSeverity.HIGH,
 *     {},
 *     cause
 *   );
 *
 *   // Get full message chain
 *   console.log(wrapped.getFullMessage());
 *   // Output: "Operation failed -> Connection timeout -> ECONNREFUSED"
 * }
 * ```
 *
 * @example Error Recovery
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   if (error instanceof BaseError) {
 *     if (error.isRecoverable()) {
 *       // Try recovery strategy
 *       await retryOperation();
 *     } else {
 *       // Log and escalate
 *       await escalateToOncall(error);
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link ErrorFactory} for creating typed errors
 * @see {@link ErrorSerializer} for safe serialization
 * @see {@link ErrorHandler} for global handling
 *
 * @public
 */
export class BaseError extends Error {
  // Error properties
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;

  // Context and metadata
  public readonly context: ErrorContext;
  public readonly metadata: ErrorMetadata;

  // Chaining
  public readonly cause?: Error;
  private _chain: BaseError[] = [];

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {},
    cause?: Error
  ) {
    super(message);

    // Set prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Error properties
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.cause = cause;

    // Store context
    this.context = {
      timestamp: context.timestamp ?? Date.now(),
      ...context,
    };

    // Create metadata
    this.metadata = {
      context: this.context,
      originalError: cause,
      location: this.parseStackLocation(),
    };

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Name for better logging
    this.name = this.constructor.name;
  }

  /**
   * Parse stack trace to extract file, line, column, and function information
   *
   * Extracts the first meaningful stack frame for debugging and error reporting.
   * Supports both V8 and SpiderMonkey stack trace formats.
   *
   * @returns Parsed location with file path, line number, column, and function name
   *
   * @internal
   */
  private parseStackLocation(): { file?: string; line?: number; column?: number; function?: string } {
    if (!this.stack) return {};

    const lines = this.stack.split('\n');
    if (lines.length < 2) return {};

    // Parse the first stack frame (index 1, after "Error: message")
    const match = lines[1].match(/at\s+(?:(\w+)\s+)?\(([^:]+):(\d+):(\d+)\)|at\s+([^:]+):(\d+):(\d+)/);

    if (match) {
      return {
        function: match[1] || match[5],
        file: match[2] || match[5],
        line: parseInt(match[3] || match[6], 10),
        column: parseInt(match[4] || match[7], 10),
      };
    }

    return {};
  }

  /**
   * Add error to chain
   *
   * Creates an error chain for tracking multiple related errors.
   * Useful for grouping errors that occur during multi-step operations.
   *
   * @param error - Error to add to chain
   * @returns This error instance (for chaining)
   *
   * @example
   * ```typescript
   * const error1 = ErrorFactory.memory('Cache miss');
   * const error2 = ErrorFactory.memory('Fallback failed');
   *
   * error1.addToChain(error2);
   * console.log(error1.getChain()); // [error2]
   * ```
   *
   * @public
   */
  public addToChain(error: BaseError): this {
    this._chain.push(error);
    return this;
  }

  /**
   * Get error chain
   *
   * Returns a copy of the error chain to prevent external modification.
   *
   * @returns Array of errors in the chain (empty if no chained errors)
   *
   * @example
   * ```typescript
   * const chain = error.getChain();
   * chain.forEach((e) => console.log(e.message));
   * ```
   *
   * @public
   */
  public getChain(): BaseError[] {
    return [...this._chain];
  }

  /**
   * Check if error is recoverable
   *
   * Determines if an error represents a transient failure that can be retried.
   * Base implementation returns true for all errors; subclasses should override
   * to return false for permanent failures.
   *
   * @returns True if error is transient and retryable
   *
   * @example
   * ```typescript
   * if (error.isRecoverable()) {
   *   // Use RetryStrategy for automatic retry
   *   await retry.execute(() => operation());
   * } else {
   *   // Log and escalate
   *   await handler.handle(error);
   * }
   * ```
   *
   * @public
   */
  public isRecoverable(): boolean {
    // Errors are generally considered recoverable unless marked otherwise
    return true;
  }

  /**
   * Get full error chain as string
   *
   * Concatenates error messages through the entire error chain, separated by arrows.
   * Useful for logging and debugging multi-step failures.
   *
   * @returns Chain of error messages: "Message 1 -> Message 2 -> Message 3"
   *
   * @example
   * ```typescript
   * const outer = new BaseError('Step 1 failed', ..., innerError);
   * console.log(outer.getFullMessage());
   * // Output: "Step 1 failed -> Connection timeout -> ECONNREFUSED"
   * ```
   *
   * @public
   */
  public getFullMessage(): string {
    const messages = [this.message];

    let current = this.cause;
    while (current) {
      if (current instanceof BaseError) {
        messages.push(current.message);
        current = current.cause;
      } else if (current instanceof Error) {
        messages.push(current.message);
        current = undefined;
      } else {
        current = undefined;
      }
    }

    return messages.join(' -> ');
  }

  /**
   * Serialize error for logging/transmission
   *
   * Converts error to JSON-serializable object including:
   * - Error properties (name, message, code, category, severity)
   * - Context and metadata
   * - Error chain and cause
   * - Stack trace
   *
   * @security This method preserves full error details including stack traces.
   * Use {@link ErrorSerializer} to sanitize before sending to untrusted systems.
   *
   * @returns Plain object with all error information
   *
   * @example
   * ```typescript
   * const json = error.toJSON();
   * console.log(JSON.stringify(json, null, 2));
   * ```
   *
   * @public
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      metadata: this.metadata,
      stack: this.stack,
      cause: this.cause instanceof BaseError ? this.cause.toJSON() : this.cause?.message,
      chain: this._chain.map((e) => e.toJSON()),
    };
  }

  /**
   * Create a new error from this one with additional context
   *
   * Returns a copy of this error with merged context. The original error is unchanged.
   * Useful for adding context as error propagates through layers of code.
   *
   * @param additionalContext - Context properties to add/override
   * @returns New error instance with merged context
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.validation('Invalid input');
   *
   * // Add field context
   * const withField = error.withContext({ field: 'email' });
   *
   * // Add more context
   * const withUser = withField.withContext({ userId: 'user-123' });
   *
   * console.log(withUser.context);
   * // { field: 'email', userId: 'user-123', timestamp: ... }
   * ```
   *
   * @public
   */
  public withContext(additionalContext: Partial<ErrorContext>): this {
    const newContext: ErrorContext = {
      ...this.context,
      ...additionalContext,
    };

    const newError = Object.create(Object.getPrototypeOf(this));
    Object.assign(newError, this);
    newError.context = newContext;
    newError.metadata = {
      ...this.metadata,
      context: newContext,
    };

    return newError;
  }

  /**
   * Format error for display
   *
   * Creates a concise, human-readable error message including:
   * - Error code (for reference)
   * - Message
   * - Source location (file:line:column) when available
   *
   * @returns Formatted error string for logging and display
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.validation('Invalid email', {}, cause);
   * console.log(error.format());
   * // Output: "[VALIDATION_001] Invalid email at auth.ts:42:15"
   * ```
   *
   * @public
   */
  public format(): string {
    const location = this.metadata.location;
    const locationStr = location?.file ? ` at ${location.file}:${location.line}:${location.column}` : '';

    return `[${this.code}] ${this.message}${locationStr}`;
  }
}
