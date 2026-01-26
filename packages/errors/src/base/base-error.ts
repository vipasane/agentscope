import type { ErrorCode, ErrorCategory, ErrorSeverity } from '../types/error-codes.js';
import type { ErrorContext, ErrorMetadata } from '../types/error-context.js';

/**
 * Base error class for all Claude Flow errors
 * Provides consistent structure, context preservation, and stack trace handling
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
   * Parse stack trace to get file, line, column, and function info
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
   */
  public addToChain(error: BaseError): this {
    this._chain.push(error);
    return this;
  }

  /**
   * Get error chain
   */
  public getChain(): BaseError[] {
    return [...this._chain];
  }

  /**
   * Check if error is recoverable
   */
  public isRecoverable(): boolean {
    // Errors are generally considered recoverable unless marked otherwise
    return true;
  }

  /**
   * Get full error chain as string
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
   */
  public format(): string {
    const location = this.metadata.location;
    const locationStr = location?.file ? ` at ${location.file}:${location.line}:${location.column}` : '';

    return `[${this.code}] ${this.message}${locationStr}`;
  }
}
