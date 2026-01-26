import type { BaseError } from '../base/base-error.js';

/**
 * Fallback handler result
 */
export interface FallbackResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  usedFallback: boolean;
}

/**
 * Fallback strategy for graceful degradation
 */
export class FallbackStrategy {
  private fallbacks: Array<{
    condition: (error: Error) => boolean;
    handler: () => unknown;
    description: string;
  }> = [];

  /**
   * Add a fallback handler
   */
  addFallback(
    condition: (error: Error) => boolean,
    handler: () => unknown,
    description: string = 'Fallback'
  ): this {
    this.fallbacks.push({ condition, handler, description });
    return this;
  }

  /**
   * Add fallback for specific error code
   */
  addFallbackForCode(code: string, handler: () => unknown, description?: string): this {
    return this.addFallback(
      (error) => {
        const baseError = error as any as BaseError;
        return baseError.code === code;
      },
      handler,
      description || `Fallback for ${code}`
    );
  }

  /**
   * Add default fallback (always matches)
   */
  addDefaultFallback(handler: () => unknown): this {
    return this.addFallback(() => true, handler, 'Default fallback');
  }

  /**
   * Execute async function with fallback handling
   */
  async execute<T>(fn: () => Promise<T>): Promise<FallbackResult<T>> {
    try {
      const value = await fn();
      return {
        success: true,
        value,
        usedFallback: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      for (const fallback of this.fallbacks) {
        if (fallback.condition(err)) {
          try {
            const value = fallback.handler();
            return {
              success: true,
              value: value as T,
              usedFallback: true,
              error: err,
            };
          } catch (fallbackError) {
            return {
              success: false,
              error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
              usedFallback: true,
            };
          }
        }
      }

      return {
        success: false,
        error: err,
        usedFallback: false,
      };
    }
  }

  /**
   * Execute sync function with fallback handling
   */
  executeSync<T>(fn: () => T): FallbackResult<T> {
    try {
      const value = fn();
      return {
        success: true,
        value,
        usedFallback: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      for (const fallback of this.fallbacks) {
        if (fallback.condition(err)) {
          try {
            const value = fallback.handler();
            return {
              success: true,
              value: value as T,
              usedFallback: true,
              error: err,
            };
          } catch (fallbackError) {
            return {
              success: false,
              error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
              usedFallback: true,
            };
          }
        }
      }

      return {
        success: false,
        error: err,
        usedFallback: false,
      };
    }
  }

  /**
   * Get number of registered fallbacks
   */
  getFallbackCount(): number {
    return this.fallbacks.length;
  }

  /**
   * Clear all fallbacks
   */
  clear(): this {
    this.fallbacks = [];
    return this;
  }
}
