import type { BaseError } from '../base/base-error.js';

/**
 * Retry strategy configuration
 *
 * Controls automatic retry behavior for transient failures.
 *
 * @see {@link RetryStrategy} for usage examples
 *
 * @public
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries?: number;

  /** Initial delay in milliseconds */
  initialDelayMs?: number;

  /** Maximum delay in milliseconds */
  maxDelayMs?: number;

  /** Backoff multiplier */
  backoffMultiplier?: number;

  /** Jitter factor (0-1) */
  jitterFactor?: number;

  /** Error codes to retry on */
  retryableErrorCodes?: string[];

  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;

  /** Callback on retry */
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

/**
 * Retry attempt result
 *
 * Indicates the outcome of a retry operation.
 *
 * @see {@link RetryStrategy} for usage
 *
 * @public
 */
export interface RetryResult {
  /** Whether the operation ultimately succeeded */
  success: boolean;

  /** Total number of attempts made */
  attempts: number;

  /** Last error encountered (if failed) */
  lastError?: Error;

  /** Result of successful operation */
  result?: unknown;
}

/**
 * Retry strategy for handling transient failures
 *
 * Automatically retries operations with exponential backoff and jitter.
 * Essential for handling network timeouts, rate limiting, and other
 * transient failures.
 *
 * ## Features
 *
 * - **Exponential Backoff**: Delay increases exponentially (1s, 2s, 4s, etc.)
 * - **Jitter**: Random variance prevents thundering herd problem
 * - **Configurable Retries**: Set max attempts, delays, and backoff multiplier
 * - **Smart Detection**: Recognizes transient errors by default (network, timeout, database)
 * - **Custom Rules**: Override isRetryable() for custom logic
 * - **Callbacks**: Hook into retry events for monitoring
 * - **Sync/Async**: Supports both sync and async operations
 *
 * ## Configuration
 *
 * - `maxRetries` (default: 3) - Maximum retry attempts
 * - `initialDelayMs` (default: 100) - First retry delay
 * - `maxDelayMs` (default: 10000) - Cap on retry delay
 * - `backoffMultiplier` (default: 2) - Exponential growth rate
 * - `jitterFactor` (default: 0.1) - ±10% random variance
 * - `retryableErrorCodes` - Error codes to retry (network, timeout, database)
 * - `isRetryable` - Custom function to determine if error is transient
 * - `onRetry` - Callback for monitoring retry attempts
 *
 * ## Retryable Errors by Default
 *
 * These error codes trigger automatic retry:
 * - `NETWORK_001`: Connection failures
 * - `NETWORK_002`: Connection refused
 * - `NETWORK_003`: Invalid response
 * - `AGENT_003`: Agent timeout
 * - `DB_001`: Database connection failures
 *
 * Also recognizes error messages containing:
 * - "timeout", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "unreachable"
 *
 * ## Security Note
 *
 * @security DOS_PREVENTION - Prevents retry amplification
 * Retry limits (maxRetries, maxDelayMs) prevent DoS attacks.
 * Always configure reasonable limits for production.
 *
 * @example Basic Retry
 * ```typescript
 * const retry = new RetryStrategy();
 *
 * const result = await retry.execute(async () => {
 *   return await fetchFromUnstableAPI();
 * });
 *
 * if (result.success) {
 *   console.log('Success:', result.result);
 * } else {
 *   console.error('Failed:', result.lastError);
 * }
 * ```
 *
 * @example Custom Configuration
 * ```typescript
 * const retry = new RetryStrategy({
 *   maxRetries: 5,
 *   initialDelayMs: 500,
 *   maxDelayMs: 30000,
 *   backoffMultiplier: 2,
 *   jitterFactor: 0.15,
 *   shouldRetry: (error) => {
 *     // Retry on timeout and rate limits
 *     return error.message.includes('timeout') ||
 *            error.status === 429;
 *   },
 *   onRetry: (attempt, delay, error) => {
 *     console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *   }
 * });
 *
 * const result = await retry.execute(() => riskyOperation());
 * ```
 *
 * @example Sync Retry
 * ```typescript
 * const result = retry.executeSync(() => {
 *   return synchronousOperation();
 * });
 * ```
 *
 * @example Anti-Pattern: Retrying Non-Transient Errors
 * ```typescript
 * // DO NOT DO THIS
 * const retry = new RetryStrategy({ maxRetries: 10 });
 *
 * // Retrying validation errors is pointless
 * await retry.execute(() => {
 *   validateUserEmail(input); // Always fails
 * });
 *
 * // Use shouldRetry to prevent this
 * const better = new RetryStrategy({
 *   maxRetries: 3,
 *   shouldRetry: (error) => !error.message.includes('validation')
 * });
 * ```
 *
 * @see {@link FallbackStrategy} for fallback values
 * @see {@link ErrorFactory} for error creation
 * @see {@link ErrorHandler} for error handling
 *
 * @performance <100ms total for failed operation with 3 retries
 *
 * @public
 */
export class RetryStrategy {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelayMs: config.initialDelayMs ?? 100,
      maxDelayMs: config.maxDelayMs ?? 10000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      jitterFactor: config.jitterFactor ?? 0.1,
      retryableErrorCodes: config.retryableErrorCodes ?? [
        'NETWORK_001',
        'NETWORK_002',
        'NETWORK_003',
        'AGENT_003', // AGENT_TIMEOUT
        'DB_001', // DB_CONNECTION_FAILED
      ],
      isRetryable: config.isRetryable ?? this.defaultIsRetryable.bind(this),
      onRetry: config.onRetry ?? (() => {}),
    };
  }

  /**
   * Check if error is retryable by default
   */
  private defaultIsRetryable(error: Error): boolean {
    const baseError = error as any as BaseError;
    if (baseError.code && this.config.retryableErrorCodes.includes(baseError.code)) {
      return true;
    }

    // Check for network-related native errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('unreachable')
      );
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelayMs
    );

    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    return Math.ceil(exponentialDelay + jitter);
  }

  /**
   * Execute async function with retry logic
   *
   * Retries operation on transient errors using exponential backoff.
   * Returns immediately on non-retryable errors.
   *
   * @param fn - Async function to execute
   * @returns Retry result with success status and data
   *
   * @example
   * ```typescript
   * const result = await retry.execute(async () => {
   *   return await fetchAPI();
   * });
   *
   * if (result.success) {
   *   processData(result.result);
   * }
   * ```
   *
   * @public
   */
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const result = await fn();
        return {
          success: true,
          attempts: attempt + 1,
          result,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.config.isRetryable(lastError)) {
          return {
            success: false,
            attempts: attempt + 1,
            lastError,
          };
        }

        attempt++;

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt - 1);
          this.config.onRetry(attempt, delay, lastError);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      attempts: this.config.maxRetries,
      lastError,
    };
  }

  /**
   * Execute sync function with retry logic
   *
   * Retries synchronous operation using busy-wait delay (spin loop).
   * Use async execute() when possible for better performance.
   *
   * @param fn - Synchronous function to execute
   * @returns Retry result with success status and data
   *
   * @warning Uses busy-wait delay instead of proper sleep. Avoid for production.
   *
   * @example
   * ```typescript
   * const result = retry.executeSync(() => {
   *   return synchronousOperation();
   * });
   * ```
   *
   * @public
   */
  executeSync<T>(fn: () => T): RetryResult {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const result = fn();
        return {
          success: true,
          attempts: attempt + 1,
          result,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.config.isRetryable(lastError)) {
          return {
            success: false,
            attempts: attempt + 1,
            lastError,
          };
        }

        attempt++;

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt - 1);
          this.config.onRetry(attempt, delay, lastError);
          this.sleepSync(delay);
        }
      }
    }

    return {
      success: false,
      attempts: this.config.maxRetries,
      lastError,
    };
  }

  /**
   * Sleep helper for async delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Synchronous sleep (spin loop)
   */
  private sleepSync(ms: number): void {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // Spin
    }
  }

  /**
   * Get retry configuration
   */
  getConfig(): Readonly<Required<RetryConfig>> {
    return Object.freeze({ ...this.config });
  }
}
