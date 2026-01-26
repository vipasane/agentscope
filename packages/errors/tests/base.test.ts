import { describe, it, expect, beforeEach } from 'vitest';
import { BaseError, ErrorFactory } from '../src/base/index.js';
import { ERROR_CODES, ErrorCategory, ErrorSeverity } from '../src/types/error-codes.js';

describe('BaseError', () => {
  let error: BaseError;

  beforeEach(() => {
    error = new BaseError(
      'Test error message',
      ERROR_CODES.INTERNAL_001 as any,
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      { operation: 'test_operation', component: 'test_component' }
    );
  });

  it('should create error with correct properties', () => {
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(ERROR_CODES.INTERNAL_001);
    expect(error.category).toBe(ErrorCategory.INTERNAL);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should preserve context', () => {
    expect(error.context.operation).toBe('test_operation');
    expect(error.context.component).toBe('test_component');
    expect(error.context.timestamp).toBeDefined();
  });

  it('should be instanceof Error', () => {
    expect(error instanceof Error).toBe(true);
  });

  it('should support error chaining', () => {
    const cause = new Error('Original error');
    const chained = new BaseError(
      'Chained error',
      ERROR_CODES.INTERNAL_001 as any,
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      {},
      cause
    );

    expect(chained.cause).toBe(cause);
    expect(chained.getFullMessage()).toContain('Original error');
  });

  it('should support error chain', () => {
    const error1 = new BaseError(
      'Error 1',
      ERROR_CODES.INTERNAL_001 as any,
      ErrorCategory.INTERNAL,
      ErrorSeverity.LOW
    );
    const error2 = new BaseError(
      'Error 2',
      ERROR_CODES.INTERNAL_001 as any,
      ErrorCategory.INTERNAL,
      ErrorSeverity.LOW
    );

    error.addToChain(error1).addToChain(error2);
    const chain = error.getChain();

    expect(chain).toHaveLength(2);
    expect(chain[0].message).toBe('Error 1');
    expect(chain[1].message).toBe('Error 2');
  });

  it('should serialize to JSON', () => {
    const json = error.toJSON();

    expect(json.name).toBe('BaseError');
    expect(json.message).toBe('Test error message');
    expect(json.code).toBe(ERROR_CODES.INTERNAL_001);
    expect(json.context).toBeDefined();
  });

  it('should format error message', () => {
    const formatted = error.format();

    expect(formatted).toContain(error.code);
    expect(formatted).toContain(error.message);
  });

  it('should add context', () => {
    const newError = error.withContext({ userId: 'user123' });

    expect(newError.context.userId).toBe('user123');
    expect(newError.context.operation).toBe('test_operation');
  });

  it('should preserve stack trace', () => {
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('BaseError');
  });
});

describe('ErrorFactory', () => {
  it('should create validation error', () => {
    const error = ErrorFactory.validation('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should create security error', () => {
    const error = ErrorFactory.security('Unauthorized access');

    expect(error.category).toBe(ErrorCategory.SECURITY);
    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
  });

  it('should create memory error', () => {
    const error = ErrorFactory.memory('Out of memory');

    expect(error.category).toBe(ErrorCategory.MEMORY);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should create agent error', () => {
    const error = ErrorFactory.agent('Agent failed');

    expect(error.category).toBe(ErrorCategory.AGENT);
  });

  it('should create config error', () => {
    const error = ErrorFactory.config('Missing config');

    expect(error.category).toBe(ErrorCategory.CONFIG);
  });

  it('should create network error', () => {
    const error = ErrorFactory.network('Connection timeout');

    expect(error.category).toBe(ErrorCategory.NETWORK);
  });

  it('should create file system error', () => {
    const error = ErrorFactory.fileSystem('File not found');

    expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
  });

  it('should create database error', () => {
    const error = ErrorFactory.database('Query failed');

    expect(error.category).toBe(ErrorCategory.DATABASE);
  });

  it('should create custom error', () => {
    const error = ErrorFactory.create(
      'Custom error',
      ERROR_CODES.VALIDATION_001 as any,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { custom: 'context' }
    );

    expect(error.message).toBe('Custom error');
    expect(error.context.custom).toBe('context');
  });

  it('should wrap regular errors', () => {
    const regularError = new Error('Regular error');
    const wrapped = ErrorFactory.wrap(regularError, 'Wrapped error');

    expect(wrapped.message).toBe('Wrapped error');
    expect(wrapped.cause).toBe(regularError);
  });

  it('should wrap BaseError without message', () => {
    const baseError = ErrorFactory.validation('Original');
    const wrapped = ErrorFactory.wrap(baseError);

    expect(wrapped).toBe(baseError);
  });

  it('should create from code', () => {
    const error = ErrorFactory.fromCode(
      ERROR_CODES.NETWORK_001 as any,
      'Network error occurred'
    );

    expect(error.code).toBe(ERROR_CODES.NETWORK_001);
    expect(error.category).toBe(ErrorCategory.NETWORK);
  });

  it('should support error context', () => {
    const error = ErrorFactory.security('Security issue', {
      userId: 'user123',
      operation: 'login',
    });

    expect(error.context.userId).toBe('user123');
    expect(error.context.operation).toBe('login');
  });

  it('should support error cause', () => {
    const cause = new Error('Root cause');
    const error = ErrorFactory.validation('Validation failed', {}, cause);

    expect(error.cause).toBe(cause);
  });
});
