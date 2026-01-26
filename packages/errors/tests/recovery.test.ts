import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryStrategy } from '../src/recovery/retry-strategy.js';
import { FallbackStrategy } from '../src/recovery/fallback-strategy.js';
import { ErrorFactory } from '../src/base/error-factory.js';

describe('RetryStrategy', () => {
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryStrategy({
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 2,
      jitterFactor: 0,
    });
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn(async () => 'success');
    const result = await retryStrategy.execute(fn);

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw ErrorFactory.network('Connection timeout');
      }
      return 'success';
    });

    const result = await retryStrategy.execute(fn);

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const fn = vi.fn(async () => {
      throw ErrorFactory.network('Connection timeout');
    });

    const result = await retryStrategy.execute(fn);

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.lastError).toBeDefined();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn(async () => {
      throw ErrorFactory.validation('Invalid input');
    });

    const result = await retryStrategy.execute(fn);

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    const strategy = new RetryStrategy({
      maxRetries: 3,
      initialDelayMs: 10,
      onRetry,
    });

    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw ErrorFactory.network('Timeout');
      }
      return 'success';
    });

    await strategy.execute(fn);

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.any(Error));
  });

  it('should support sync execution', () => {
    let attempts = 0;
    const fn = vi.fn(() => {
      attempts++;
      if (attempts < 2) {
        throw ErrorFactory.network('Timeout');
      }
      return 'success';
    });

    const result = retryStrategy.executeSync(fn);

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should calculate exponential backoff', async () => {
    const strategy = new RetryStrategy({
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 2,
      jitterFactor: 0,
    });

    const delays: number[] = [];
    const original = setTimeout;
    global.setTimeout = vi.fn((cb, delay) => {
      delays.push(delay);
      return original(cb, 0);
    });

    let attempts = 0;
    await strategy.execute(async () => {
      attempts++;
      if (attempts < 3) {
        throw ErrorFactory.network('Timeout');
      }
    });

    expect(delays).toEqual([10, 20]);

    global.setTimeout = original;
  });

  it('should support custom retryable condition', async () => {
    const strategy = new RetryStrategy({
      maxRetries: 3,
      initialDelayMs: 1,
      isRetryable: (error) => error.message.includes('custom'),
    });

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('custom error');
      }
      return 'success';
    };

    const result = await strategy.execute(fn);

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should get config', () => {
    const config = retryStrategy.getConfig();

    expect(config.maxRetries).toBe(3);
    expect(config.initialDelayMs).toBe(10);
    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe('FallbackStrategy', () => {
  let fallbackStrategy: FallbackStrategy;

  beforeEach(() => {
    fallbackStrategy = new FallbackStrategy();
  });

  it('should return original value on success', async () => {
    const fn = async () => 'success';
    const result = await fallbackStrategy.execute(fn);

    expect(result.success).toBe(true);
    expect(result.value).toBe('success');
    expect(result.usedFallback).toBe(false);
  });

  it('should use fallback on error', async () => {
    fallbackStrategy.addDefaultFallback(() => 'fallback_value');

    const fn = async () => {
      throw new Error('Original error');
    };

    const result = await fallbackStrategy.execute(fn);

    expect(result.success).toBe(true);
    expect(result.value).toBe('fallback_value');
    expect(result.usedFallback).toBe(true);
  });

  it('should match fallback by condition', async () => {
    fallbackStrategy.addFallback(
      (error) => error.message.includes('network'),
      () => 'network_fallback'
    );
    fallbackStrategy.addDefaultFallback(() => 'default_fallback');

    const fn = async () => {
      throw new Error('network error');
    };

    const result = await fallbackStrategy.execute(fn);

    expect(result.value).toBe('network_fallback');
  });

  it('should match fallback by error code', async () => {
    fallbackStrategy.addFallbackForCode('NETWORK_001', () => 'network_fallback');

    const fn = async () => {
      throw ErrorFactory.network('Connection failed');
    };

    const result = await fallbackStrategy.execute(fn);

    expect(result.value).toBe('network_fallback');
  });

  it('should support sync execution', () => {
    fallbackStrategy.addDefaultFallback(() => 'fallback');

    const result = fallbackStrategy.executeSync(() => {
      throw new Error('Error');
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe('fallback');
  });

  it('should return error if fallback fails', async () => {
    fallbackStrategy.addDefaultFallback(() => {
      throw new Error('Fallback error');
    });

    const result = await fallbackStrategy.execute(async () => {
      throw new Error('Original error');
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Fallback error');
  });

  it('should preserve original error', async () => {
    fallbackStrategy.addDefaultFallback(() => 'fallback');

    const originalError = new Error('Original');
    const result = await fallbackStrategy.execute(async () => {
      throw originalError;
    });

    expect(result.error).toBe(originalError);
  });

  it('should count fallbacks', () => {
    fallbackStrategy.addFallback(() => false, () => {});
    fallbackStrategy.addFallback(() => false, () => {});

    expect(fallbackStrategy.getFallbackCount()).toBe(2);
  });

  it('should clear fallbacks', () => {
    fallbackStrategy.addFallback(() => false, () => {});
    fallbackStrategy.clear();

    expect(fallbackStrategy.getFallbackCount()).toBe(0);
  });

  it('should try fallbacks in order', async () => {
    const calls: string[] = [];

    fallbackStrategy.addFallback(
      (error) => error.message.includes('error1'),
      () => {
        calls.push('fallback1');
        return 'fallback1_value';
      }
    );

    fallbackStrategy.addFallback(
      (error) => error.message.includes('error1'),
      () => {
        calls.push('fallback2');
        return 'fallback2_value';
      }
    );

    const result = await fallbackStrategy.execute(async () => {
      throw new Error('error1');
    });

    // Only first matching fallback is tried
    expect(calls).toEqual(['fallback1']);
    expect(result.value).toBe('fallback1_value');
  });
});
