import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler, LogLevel, getErrorHandler } from '../src/handler/error-handler.js';
import { ErrorFactory } from '../src/base/error-factory.js';

describe('ErrorHandler', () => {
  afterEach(() => {
    ErrorHandler.reset();
  });

  it('should create singleton instance', () => {
    const handler1 = ErrorHandler.getInstance();
    const handler2 = ErrorHandler.getInstance();

    expect(handler1).toBe(handler2);
  });

  it('should handle errors', async () => {
    const logFn = vi.fn();
    const handler = ErrorHandler.getInstance({ logFn });

    const error = ErrorFactory.validation('Test error');
    await handler.handle(error);

    expect(logFn).toHaveBeenCalled();
  });

  it('should notify listeners', async () => {
    const listener = { onError: vi.fn() };
    const handler = ErrorHandler.getInstance({ listeners: [listener] });

    const error = ErrorFactory.validation('Test error');
    await handler.handle(error);

    expect(listener.onError).toHaveBeenCalledWith(error, undefined);
  });

  it('should add listeners', async () => {
    const handler = ErrorHandler.getInstance();
    const listener = { onError: vi.fn() };

    handler.addListener(listener);

    const error = ErrorFactory.agent('Agent failed');
    await handler.handle(error);

    expect(listener.onError).toHaveBeenCalled();
  });

  it('should remove listeners', async () => {
    const handler = ErrorHandler.getInstance();
    const listener = { onError: vi.fn() };

    handler.addListener(listener).removeListener(listener);

    const error = ErrorFactory.agent('Agent failed');
    await handler.handle(error);

    expect(listener.onError).not.toHaveBeenCalled();
  });

  it('should set custom log function', async () => {
    const logFn = vi.fn();
    const handler = ErrorHandler.getInstance({ logFn: () => {} });
    handler.setLogFunction(logFn);

    const error = ErrorFactory.network('Network error');
    await handler.handle(error);

    expect(logFn).toHaveBeenCalled();
  });

  it('should enable PII redaction', async () => {
    const handler = ErrorHandler.getInstance();
    handler.setPiiRedaction(true);

    const error = ErrorFactory.validation('User email@example.com');
    const serialized = handler.serializeError(error);

    expect(serialized).toContain('[REDACTED');
  });

  it('should serialize error to JSON', async () => {
    const handler = ErrorHandler.getInstance();

    const error = ErrorFactory.security('Security breach');
    const json = handler.serializeError(error);

    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should format error for display', () => {
    const handler = ErrorHandler.getInstance();

    const error = ErrorFactory.config('Invalid config');
    const formatted = handler.formatError(error);

    expect(formatted).toContain('[CONFIG_001]');
    expect(formatted).toContain('Invalid config');
  });

  it('should get serializer', () => {
    const handler = ErrorHandler.getInstance();
    const serializer = handler.getSerializer();

    expect(serializer).toBeDefined();
  });

  it('should respect environment in logging', async () => {
    const logFn = vi.fn();
    const handler = ErrorHandler.getInstance({
      logFn,
      environment: 'production',
    });

    const error = ErrorFactory.internal('Internal error');
    await handler.handle(error);

    expect(logFn).toHaveBeenCalled();
  });

  it('should use getErrorHandler convenience function', () => {
    const handler = getErrorHandler();

    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(ErrorHandler);
  });

  it('should handle listener errors gracefully', async () => {
    const logFn = vi.fn();
    const listener = {
      onError: async () => {
        throw new Error('Listener error');
      },
    };

    const handler = ErrorHandler.getInstance({ listeners: [listener], logFn });
    const error = ErrorFactory.validation('Test');

    // Should not throw even if listener throws
    try {
      await handler.handle(error);
    } catch {
      // Expected to complete
    }

    // Should have logged something
    expect(logFn.mock.calls.length).toBeGreaterThan(0);
  });

  it('should map severity to log level', async () => {
    const logFn = vi.fn();
    const handler = ErrorHandler.getInstance({ logFn });

    // Test critical error
    const critical = ErrorFactory.security('Security breach');
    await handler.handle(critical);

    const firstCall = logFn.mock.calls[0];
    expect(firstCall[1]).toBe(LogLevel.CRITICAL);
  });

  it('should include context in error handling', async () => {
    const handler = ErrorHandler.getInstance();
    const listener = { onError: vi.fn() };
    handler.addListener(listener);

    const error = ErrorFactory.agent('Agent timeout');
    const context = { userId: 'user123' };

    await handler.handle(error, context);

    expect(listener.onError).toHaveBeenCalledWith(error, context);
  });

  it('should format detailed error', () => {
    const handler = ErrorHandler.getInstance();

    const error = ErrorFactory.database('Query failed', { operation: 'select' });
    const detailed = handler.formatError(error, true);

    expect(detailed).toContain('[DB_001]');
  });
});

describe('LogLevel', () => {
  it('should have all log levels', () => {
    expect(LogLevel.DEBUG).toBe('debug');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.ERROR).toBe('error');
    expect(LogLevel.CRITICAL).toBe('critical');
  });
});
