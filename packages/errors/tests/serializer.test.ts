import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorSerializer } from '../src/serializer/error-serializer.js';
import { ErrorFactory } from '../src/base/error-factory.js';

describe('ErrorSerializer', () => {
  let serializer: ErrorSerializer;

  beforeEach(() => {
    serializer = new ErrorSerializer(false);
  });

  it('should serialize BaseError', () => {
    const error = ErrorFactory.validation('Invalid input', { userId: 'user123' });
    const serialized = serializer.serialize(error);

    expect(serialized.message).toBe('Invalid input');
    expect(serialized.code).toBe('VALIDATION_001');
    expect(serialized.category).toBe('validation');
    expect(serialized.context?.userId).toBe('user123');
  });

  it('should serialize regular Error', () => {
    const error = new Error('Regular error');
    const serialized = serializer.serialize(error);

    expect(serialized.message).toBe('Regular error');
    expect(serialized.name).toBe('Error');
  });

  it('should include stack trace when requested', () => {
    const error = ErrorFactory.memory('Memory error');
    const serialized = serializer.serialize(error, true);

    expect(serialized.stack).toBeDefined();
    expect(serialized.stack).toContain('ErrorFactory');
  });

  it('should exclude stack trace when not requested', () => {
    const error = ErrorFactory.memory('Memory error');
    const serialized = serializer.serialize(error, false);

    expect(serialized.stack).toBeUndefined();
  });

  it('should serialize error chain', () => {
    const cause = new Error('Root cause');
    const error = ErrorFactory.security('Security error', {}, cause);
    const serialized = serializer.serialize(error);

    expect(serialized.cause).toBeDefined();
    expect(serialized.cause?.message).toBe('Root cause');
  });

  it('should redact PII when enabled', () => {
    const serializer = new ErrorSerializer(true);
    const error = ErrorFactory.validation('User email@example.com failed validation');
    const serialized = serializer.serialize(error);

    expect(serialized.message).toContain('[REDACTED_EMAIL]');
    expect(serialized.message).not.toContain('email@example.com');
  });

  it('should not redact PII when disabled', () => {
    const serializer = new ErrorSerializer(false);
    const error = ErrorFactory.validation('User email@example.com failed validation');
    const serialized = serializer.serialize(error);

    expect(serialized.message).toContain('email@example.com');
  });

  it('should support custom redaction patterns', () => {
    const serializer = new ErrorSerializer(false);
    // Add pattern with global flag
    serializer.addRedaction(/user_token_[a-zA-Z0-9]+/, '[REDACTED_TOKEN]');

    const error = ErrorFactory.validation('user_token_abc123 is invalid');
    const serialized = serializer.serialize(error);

    expect(serialized.message).toContain('[REDACTED_TOKEN]');
  });

  it('should serialize to JSON string', () => {
    const error = ErrorFactory.network('Connection failed');
    const json = serializer.toJSON(error, false);

    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should serialize to pretty JSON', () => {
    const error = ErrorFactory.network('Connection failed');
    const json = serializer.toJSON(error, false, true);

    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  it('should format error for logging', () => {
    const error = ErrorFactory.agent('Agent timeout');
    const formatted = serializer.format(error, false);

    expect(formatted).toContain('[AGENT_001]');
    expect(formatted).toContain('Agent timeout');
  });

  it('should format error in detail', () => {
    const error = ErrorFactory.security('Unauthorized', { userId: 'user123' });
    const formatted = serializer.format(error, true);

    expect(formatted).toContain('[SECURITY_001]');
    expect(formatted).toContain('Unauthorized');
    expect(formatted).toContain('Context');
  });

  it('should deserialize error', () => {
    const original = ErrorFactory.validation('Test error', { operation: 'test' });
    const serialized = serializer.serialize(original);
    const deserialized = ErrorSerializer.deserialize(serialized);

    expect(deserialized.message).toBe('Test error');
    expect((deserialized as any).code).toBe('VALIDATION_001');
  });

  it('should handle nested context', () => {
    const error = ErrorFactory.validation('Error', {
      metadata: { nested: { value: 'test' } } as any,
    });
    const serialized = serializer.serialize(error);

    expect(serialized.context?.metadata).toBeDefined();
  });

  it('should round-trip serialization', () => {
    const original = ErrorFactory.memory('Memory error', { component: 'cache' });
    const json = serializer.toJSON(original, false);
    const parsed = JSON.parse(json);
    const deserialized = ErrorSerializer.deserialize(parsed);

    expect(deserialized.message).toBe(original.message);
  });

  it('should redact multiple PII types', () => {
    const serializer = new ErrorSerializer(true);
    const error = ErrorFactory.validation(
      'User john@example.com with phone 555-123-4567 failed'
    );
    const serialized = serializer.serialize(error);

    expect(serialized.message).toContain('[REDACTED_EMAIL]');
    expect(serialized.message).toContain('[REDACTED_PHONE]');
  });
});
