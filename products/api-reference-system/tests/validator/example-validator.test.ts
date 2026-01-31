/**
 * Tests for example validator
 */

import { describe, it, expect } from 'vitest';
import { ExampleValidator } from '../../src/validator/example-validator.js';
import { CodeExample } from '../../src/domain/source-analysis/entities.js';

describe('ExampleValidator', () => {
  const validator = new ExampleValidator();

  it('should validate correct TypeScript code', async () => {
    const example = new CodeExample(
      `const x: number = 42;\nconsole.log(x);`,
      'typescript'
    );

    const result = await validator.validate(example);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect TypeScript compilation errors', async () => {
    const example = new CodeExample(
      `const x: number = "not a number"; // Type error`,
      'typescript'
    );

    const result = await validator.validate(example);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect API keys', async () => {
    const example = new CodeExample(
      `const apiKey = "sk-ant-1234567890abcdef1234567890";`,
      'typescript'
    );

    const result = await validator.validate(example, { checkSecrets: true });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].type).toBe('secret');
  });

  it('should detect GitHub tokens', async () => {
    const example = new CodeExample(
      `const token = "ghp_abcdefghijklmnopqrstuvwxyz123456";`,
      'typescript'
    );

    const result = await validator.validate(example, { checkSecrets: true });

    expect(result.warnings.some((w) => w.type === 'secret')).toBe(true);
  });

  it('should detect email addresses', async () => {
    const example = new CodeExample(
      `const email = "user@example.com";`,
      'typescript'
    );

    const result = await validator.validate(example, { checkPII: true });

    expect(result.warnings.some((w) => w.type === 'pii')).toBe(true);
  });

  it('should skip validation for non-TypeScript examples', async () => {
    const example = new CodeExample(
      `SELECT * FROM users;`,
      'sql'
    );

    const result = await validator.validate(example);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate multiple examples', async () => {
    const examples = [
      new CodeExample(`const x = 1;`, 'typescript'),
      new CodeExample(`const y = 2;`, 'typescript'),
      new CodeExample(`const z: number = "wrong";`, 'typescript'),
    ];

    const results = await validator.validateAll(examples);

    expect(results.size).toBe(3);
    expect(Array.from(results.values()).filter((r) => r.isValid)).toHaveLength(2);
    expect(Array.from(results.values()).filter((r) => !r.isValid)).toHaveLength(1);
  });
});
