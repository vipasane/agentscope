import type { BaseError } from '../base/base-error.js';
import { ErrorSerializer } from '../serializer/error-serializer.js';
import type { ErrorContext } from '../types/error-context.js';

/**
 * Error handler configuration
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
 */
export interface ErrorListener {
  onError: (error: Error, context?: ErrorContext) => void | Promise<void>;
}

/**
 * Global error handler
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
   */
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Reset singleton (mainly for testing)
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
 */
export function getErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  return ErrorHandler.getInstance(config);
}
