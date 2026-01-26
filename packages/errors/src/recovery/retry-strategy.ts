import type { BaseError } from '../base/base-error.js';

/**
 * Retry strategy configuration
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
 */
export interface RetryResult {
  success: boolean;
  attempts: number;
  lastError?: Error;
  result?: unknown;
}

/**
 * Retry strategy for handling transient failures
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
