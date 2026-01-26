import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorReporter, ConsoleReporterBackend, BatchReporterBackend } from '../src/reporter/error-reporter.js';
import { ErrorFactory } from '../src/base/error-factory.js';

describe('ErrorReporter', () => {
  let reporter: ErrorReporter;

  beforeEach(() => {
    reporter = new ErrorReporter(undefined, 'development', '1.0.0');
  });

  it('should report error', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    const error = ErrorFactory.validation('Test error');

    const id = await reporter.report(error);

    expect(typeof id).toBe('string');
    expect(backend.report).toHaveBeenCalled();
  });

  it('should include environment in report', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend, 'production');
    const error = ErrorFactory.network('Network error');

    await reporter.report(error);

    const call = backend.report.mock.calls[0][0];
    expect(call.environment).toBe('production');
  });

  it('should include version in report', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend, 'production', '2.0.0');
    const error = ErrorFactory.memory('Memory error');

    await reporter.report(error);

    const call = backend.report.mock.calls[0][0];
    expect(call.version).toBe('2.0.0');
  });

  it('should include tags in report', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    const error = ErrorFactory.agent('Agent failed');

    await reporter.report(error, { service: 'api', region: 'us-east-1' });

    const call = backend.report.mock.calls[0][0];
    expect(call.tags?.service).toBe('api');
    expect(call.tags?.region).toBe('us-east-1');
  });

  it('should include metadata in report', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    const error = ErrorFactory.config('Config error');

    await reporter.report(error, {}, { retryCount: 3, latency: 150 });

    const call = backend.report.mock.calls[0][0];
    expect(call.metadata?.retryCount).toBe(3);
  });

  it('should add global tags', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    reporter.addTag('app', 'claude-flow').addTag('env', 'prod');

    const error = ErrorFactory.validation('Error');
    await reporter.report(error);

    const call = backend.report.mock.calls[0][0];
    expect(call.tags?.app).toBe('claude-flow');
    expect(call.tags?.env).toBe('prod');
  });

  it('should merge global and report-specific tags', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    reporter.addTag('global', 'tag');

    const error = ErrorFactory.validation('Error');
    await reporter.report(error, { specific: 'tag' });

    const call = backend.report.mock.calls[0][0];
    expect(call.tags?.global).toBe('tag');
    expect(call.tags?.specific).toBe('tag');
  });

  it('should remove global tags', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    reporter.addTag('tag1', 'value1').addTag('tag2', 'value2');
    reporter.removeTag('tag1');

    const error = ErrorFactory.validation('Error');
    await reporter.report(error);

    const call = backend.report.mock.calls[0][0];
    expect(call.tags?.tag1).toBeUndefined();
    expect(call.tags?.tag2).toBe('value2');
  });

  it('should clear global tags', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    reporter.addTag('tag1', 'value1').addTag('tag2', 'value2');
    reporter.clearTags();

    const error = ErrorFactory.validation('Error');
    await reporter.report(error);

    const call = backend.report.mock.calls[0][0];
    expect(call.tags).toBeUndefined();
  });

  it('should check backend health', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    const health = await reporter.health();

    expect(health).toBe(true);
  });

  it('should handle health check failure', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockRejectedValue(new Error('Health check failed')),
    };

    const reporter = new ErrorReporter(backend);
    const health = await reporter.health();

    expect(health).toBe(false);
  });

  it('should set backend', async () => {
    const backend1 = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };
    const backend2 = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend1);
    reporter.setBackend(backend2);

    const error = ErrorFactory.validation('Error');
    await reporter.report(error);

    expect(backend2.report).toHaveBeenCalled();
    expect(backend1.report).not.toHaveBeenCalled();
  });

  it('should enable PII redaction', async () => {
    const backend = {
      report: vi.fn().mockResolvedValue(undefined),
      health: vi.fn().mockResolvedValue(true),
    };

    const reporter = new ErrorReporter(backend);
    reporter.setPiiRedaction(true);

    const error = ErrorFactory.validation('Email: user@example.com');
    await reporter.report(error);

    const call = backend.report.mock.calls[0][0];
    expect(call.error.message).toContain('[REDACTED');
  });
});

describe('ConsoleReporterBackend', () => {
  it('should log error report', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const backend = new ConsoleReporterBackend();
    const report = {
      id: 'test-id',
      timestamp: Date.now(),
      error: {
        name: 'Error',
        message: 'Test error',
        code: 'INTERNAL_001',
        category: 'internal',
        severity: 'high',
      } as any,
      environment: 'development',
    };

    await backend.report(report);

    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should report health', async () => {
    const backend = new ConsoleReporterBackend();
    const health = await backend.health();

    expect(health).toBe(true);
  });
});

describe('BatchReporterBackend', () => {
  it('should batch reports', async () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const backend = new BatchReporterBackend(flushFn, 100, 10);

    const report = {
      id: 'test-id',
      timestamp: Date.now(),
      error: { name: 'Error', message: 'Test', code: 'TEST', category: 'internal', severity: 'high' } as any,
      environment: 'development',
    };

    await backend.report(report);
    await backend.report(report);

    expect(flushFn).not.toHaveBeenCalled();

    await backend.flush();

    expect(flushFn).toHaveBeenCalled();
    expect(flushFn.mock.calls[0][0]).toHaveLength(2);

    backend.destroy();
  });

  it('should flush on max batch size', async () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const backend = new BatchReporterBackend(flushFn, 5000, 2);

    const report = {
      id: 'test-id',
      timestamp: Date.now(),
      error: { name: 'Error', message: 'Test', code: 'TEST', category: 'internal', severity: 'high' } as any,
      environment: 'development',
    };

    await backend.report(report);
    expect(flushFn).not.toHaveBeenCalled();

    await backend.report(report);
    expect(flushFn).toHaveBeenCalled();

    backend.destroy();
  });

  it('should report health', async () => {
    const backend = new BatchReporterBackend(
      async () => {},
      5000,
      10
    );

    const health = await backend.health();
    expect(health).toBe(true);

    backend.destroy();
  });

  it('should clean up on destroy', () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const backend = new BatchReporterBackend(flushFn, 100, 10);

    backend.destroy();

    // Verify interval is cleared
    expect(() => backend.destroy()).not.toThrow();
  });
});
