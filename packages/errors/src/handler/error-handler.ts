import type { BaseError } from '../base/base-error.js';
import { ErrorSerializer } from '../serializer/error-serializer.js';
import type { ErrorContext } from '../types/error-context.js';

/**
 * Error handler configuration
 *
 * Configuration options for the global error handler singleton.
 *
 * @see {@link ErrorHandler} for usage
 *
 * @public
 */
export interface ErrorHandlerConfig {
  /** Enable PII redaction in logs */
  enablePiiRedaction?: boolean;

  /** Error listeners */
  listeners?: ErrorListener[];

  /** Log function */
  logFn?: (message: string, level: LogLevel, error?: Error) => void;

  /** Environment */
  environment?: 'development' | 'staging' | 'production';
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error listener interface
 *
 * Callback function for error events.
 *
 * @public
 */
export interface ErrorListener {
  /**
   * Called when an error is handled
   *
   * @param error - Error that occurred
   * @param context - Application context
   * @returns Void or promise (async listeners are awaited)
   */
  onError: (error: Error, context?: ErrorContext) => void | Promise<void>;
}

/**
 * Global error handler
 *
 * Singleton error handler for application-wide error processing.
 * Manages error serialization, logging, and listener notifications.
 *
 * ## Features
 *
 * - **Singleton Pattern**: Single instance across application
 * - **Environment-Aware**: Different behavior for dev/staging/production
 * - **PII Redaction**: Optional automatic sensitive data redaction
 * - **Listeners**: Register callbacks for error events
 * - **Custom Logging**: Override default logging behavior
 * - **Error Serialization**: Built-in JSON serialization
 * - **Stack Trace Control**: Show/hide based on environment
 *
 * ## Usage Pattern
 *
 * 1. Initialize globally at application startup
 * 2. Add error listeners for monitoring/alerting
 * 3. Call handle() when errors occur
 * 4. Listeners process errors (logging, metrics, alerts)
 *
 * @example Application Setup
 * ```typescript
 * import { getErrorHandler } from '@claude-flow/errors';
 *
 * // Initialize in application startup
 * const handler = getErrorHandler({
 *   enablePiiRedaction: true,
 *   environment: 'production'
 * });
 *
 * // Add custom listener
 * handler.addListener({
 *   onError: async (error, context) => {
 *     // Send to Sentry
 *     await Sentry.captureException(error, { extra: context });
 *   }
 * });
 *
 * // Use throughout application
 * try {
 *   await operation();
 * } catch (error) {
 *   await handler.handle(error, { userId: 123, operation: 'name' });
 * }
 * ```
 *
 * @example Environment-Specific Behavior
 * ```typescript
 * // Development: Full stack traces
 * const devHandler = getErrorHandler({
 *   environment: 'development',
 *   enablePiiRedaction: false // Keep data for debugging
 * });
 *
 * // Production: Sanitized errors
 * const prodHandler = getErrorHandler({
 *   environment: 'production',
 *   enablePiiRedaction: true // Redact PII
 * });
 * ```
 *
 * @example Error Listener for Monitoring
 * ```typescript
 * handler.addListener({
 *   onError: async (error, context) => {
 *     const serialized = handler.getSerializer().serialize(error, false);
 *
 *     // Send to monitoring service
 *     await fetch('/api/monitoring/errors', {
 *       method: 'POST',
 *       body: JSON.stringify({
 *         error: serialized,
 *         timestamp: new Date().toISOString(),
 *         context
 *       })
 *     });
 *   }
 * });
 * ```
 *
 * @security Environment-aware error handling prevents information disclosure.
 * Always use production configuration in non-development environments.
 *
 * @see {@link ErrorSerializer} for serialization options
 * @see {@link BaseError} for error properties
 * @see {@link getErrorHandler} for singleton access
 *
 * @public
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private serializer: ErrorSerializer;
  private listeners: Set<ErrorListener> = new Set();
  private logFn: (message: string, level: LogLevel, error?: Error) => void;
  private environment: 'development' | 'staging' | 'production';

  private constructor(config: ErrorHandlerConfig = {}) {
    this.serializer = new ErrorSerializer(config.enablePiiRedaction ?? false);
    this.environment = config.environment ?? 'development';
    this.logFn = config.logFn ?? this.defaultLogFn.bind(this);

    if (config.listeners) {
      config.listeners.forEach((listener) => this.listeners.add(listener));
    }
  }

  /**
   * Get singleton instance
   *
   * Returns the global error handler singleton. Creates instance on first call.
   * Subsequent calls ignore config (use reset() to reinitialize).
   *
   * @param config - Configuration (only used on first call)
   * @returns Global error handler instance
   *
   * @example
   * ```typescript
   * // First call creates instance
   * const handler = ErrorHandler.getInstance({
   *   enablePiiRedaction: true,
   *   environment: 'production'
   * });
   *
   * // Subsequent calls return same instance
   * const same = ErrorHandler.getInstance();
   * ```
   *
   * @public
   */
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Reset singleton (mainly for testing)
   *
   * Clears the singleton instance. Next call to getInstance() will create new instance.
   * Useful for testing to isolate error handler configuration.
   *
   * @example
   * ```typescript
   * // Test setup
   * ErrorHandler.reset();
   * const handler = ErrorHandler.getInstance({ environment: 'test' });
   *
   * // Test cleanup
   * ErrorHandler.reset();
   * ```
   *
   * @public
   */
  static reset(): void {
    ErrorHandler.instance = null as any;
  }

  /**
   * Default log function
   */
  private defaultLogFn(message: string, level: LogLevel, error?: Error): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (level === LogLevel.CRITICAL) {
      console.error(formatted);
      if (error?.stack) {
        console.error(error.stack);
      }
    } else if (level === LogLevel.ERROR) {
      console.error(formatted);
      if (this.environment === 'development' && error?.stack) {
        console.error(error.stack);
      }
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else if (level === LogLevel.INFO) {
      console.log(formatted);
    } else if (this.environment === 'development') {
      console.log(formatted);
    }
  }

  /**
   * Handle error
   *
   * Main error handling entry point. Logs error, notifies listeners, and manages
   * serialization based on environment settings.
   *
   * **Process**:
   * 1. Serialize error with environment-appropriate detail level
   * 2. Determine log level from severity
   * 3. Log via configured log function
   * 4. Notify all listeners (errors in listeners are caught and logged)
   *
   * @param error - Error to handle
   * @param context - Application context (userId, operation, etc.)
   * @returns Promise that resolves when all listeners processed
   *
   * @example
   * ```typescript
   * const handler = getErrorHandler({
   *   environment: 'production',
   *   enablePiiRedaction: true
   * });
   *
   * try {
   *   await riskyOperation();
   * } catch (error) {
   *   // Automatically logs and notifies listeners
   *   await handler.handle(error, {
   *     userId: 'user-123',
   *     operation: 'riskyOperation',
   *     timestamp: Date.now()
   *   });
   * }
   * ```
   *
   * @public
   */
  async handle(error: Error, context?: ErrorContext): Promise<void> {
    const serialized = this.serializer.serialize(error as any, this.environment === 'development');
    const logLevel = this.getLogLevel(serialized.severity);

    // Log error
    this.logFn(this.serializer.format(error, this.environment === 'development'), logLevel, error);

    // Notify listeners (catch errors from each listener individually)
    const listenerPromises = Array.from(this.listeners).map((listener) =>
      Promise.resolve(listener.onError(error, context)).catch((err) => {
        this.logFn(`Listener error: ${err instanceof Error ? err.message : String(err)}`, LogLevel.WARN);
        // Don't re-throw, just log
        return undefined;
      })
    );

    await Promise.all(listenerPromises);
  }

  /**
   * Get log level from severity
   */
  private getLogLevel(severity: string): LogLevel {
    switch (severity.toLowerCase()) {
      case 'critical':
        return LogLevel.CRITICAL;
      case 'high':
        return LogLevel.ERROR;
      case 'medium':
        return LogLevel.WARN;
      case 'low':
        return LogLevel.INFO;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Add error listener
   */
  addListener(listener: ErrorListener): this {
    this.listeners.add(listener);
    return this;
  }

  /**
   * Remove error listener
   */
  removeListener(listener: ErrorListener): this {
    this.listeners.delete(listener);
    return this;
  }

  /**
   * Set custom log function
   */
  setLogFunction(logFn: (message: string, level: LogLevel, error?: Error) => void): this {
    this.logFn = logFn;
    return this;
  }

  /**
   * Enable/disable PII redaction
   */
  setPiiRedaction(enabled: boolean): this {
    this.serializer.setPiiRedaction(enabled);
    return this;
  }

  /**
   * Get serializer
   */
  getSerializer(): ErrorSerializer {
    return this.serializer;
  }

  /**
   * Serialize error to JSON
   */
  serializeError(error: Error): string {
    return this.serializer.toJSON(error, this.environment === 'development', true);
  }

  /**
   * Format error for display
   */
  formatError(error: Error, detailed: boolean = false): string {
    return this.serializer.format(error, detailed);
  }
}

/**
 * Convenience function to get global error handler
 *
 * Shorthand for ErrorHandler.getInstance(). Use at application startup
 * to initialize the global error handler with configuration.
 *
 * @param config - Error handler configuration
 * @returns Global error handler instance
 *
 * @example
 * ```typescript
 * import { getErrorHandler } from '@claude-flow/errors';
 *
 * // Application startup
 * const errorHandler = getErrorHandler({
 *   enablePiiRedaction: true,
 *   environment: 'production'
 * });
 *
 * // Use throughout app
 * try {
 *   await operation();
 * } catch (error) {
 *   await errorHandler.handle(error);
 * }
 * ```
 *
 * @public
 */
export function getErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  return ErrorHandler.getInstance(config);
}
