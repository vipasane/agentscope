import { describe, it, expect } from 'vitest';
import { InputValidator } from '../../src/validators/InputValidator';

describe('InputValidator', () => {
  describe('string validation', () => {
    it('should validate valid strings', () => {
      const validator = InputValidator.string();
      const result = validator.safeParse('hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should reject non-strings', () => {
      const validator = InputValidator.string();
      const result = validator.safeParse(123);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected string');
    });

    it('should enforce min length', () => {
      const validator = InputValidator.string({ min: 5 });
      expect(validator.safeParse('hi').success).toBe(false);
      expect(validator.safeParse('hello').success).toBe(true);
    });

    it('should enforce max length', () => {
      const validator = InputValidator.string({ max: 5 });
      expect(validator.safeParse('hello').success).toBe(true);
      expect(validator.safeParse('hello world').success).toBe(false);
    });

    it('should validate regex patterns', () => {
      const validator = InputValidator.string({ regex: /^[a-z]+$/ });
      expect(validator.safeParse('hello').success).toBe(true);
      expect(validator.safeParse('Hello123').success).toBe(false);
    });

    it('should validate email format', () => {
      const validator = InputValidator.string({ email: true });
      expect(validator.safeParse('test@example.com').success).toBe(true);
      expect(validator.safeParse('invalid-email').success).toBe(false);
    });

    it('should validate URL format', () => {
      const validator = InputValidator.string({ url: true });
      expect(validator.safeParse('https://example.com').success).toBe(true);
      expect(validator.safeParse('not-a-url').success).toBe(false);
    });

    it('should sanitize control characters', () => {
      const validator = InputValidator.string();
      const result = validator.parse('hello\x00world\x1F');
      expect(result).toBe('helloworld');
    });
  });

  describe('number validation', () => {
    it('should validate valid numbers', () => {
      const validator = InputValidator.number();
      const result = validator.safeParse(42);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should reject non-numbers', () => {
      const validator = InputValidator.number();
      expect(validator.safeParse('42').success).toBe(false);
      expect(validator.safeParse(NaN).success).toBe(false);
    });

    it('should enforce min value', () => {
      const validator = InputValidator.number({ min: 10 });
      expect(validator.safeParse(5).success).toBe(false);
      expect(validator.safeParse(15).success).toBe(true);
    });

    it('should enforce max value', () => {
      const validator = InputValidator.number({ max: 100 });
      expect(validator.safeParse(150).success).toBe(false);
      expect(validator.safeParse(50).success).toBe(true);
    });

    it('should validate integers only', () => {
      const validator = InputValidator.number({ int: true });
      expect(validator.safeParse(42).success).toBe(true);
      expect(validator.safeParse(42.5).success).toBe(false);
    });
  });

  describe('boolean validation', () => {
    it('should validate booleans', () => {
      const validator = InputValidator.boolean();
      expect(validator.safeParse(true).success).toBe(true);
      expect(validator.safeParse(false).success).toBe(true);
      expect(validator.safeParse('true').success).toBe(false);
    });
  });

  describe('array validation', () => {
    it('should validate arrays', () => {
      const validator = InputValidator.array(InputValidator.string());
      const result = validator.safeParse(['a', 'b', 'c']);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['a', 'b', 'c']);
    });

    it('should reject non-arrays', () => {
      const validator = InputValidator.array(InputValidator.string());
      expect(validator.safeParse('not an array').success).toBe(false);
    });

    it('should validate array items', () => {
      const validator = InputValidator.array(InputValidator.number());
      expect(validator.safeParse([1, 2, 3]).success).toBe(true);
      expect(validator.safeParse([1, 'two', 3]).success).toBe(false);
    });
  });

  describe('object validation', () => {
    it('should validate objects', () => {
      const validator = InputValidator.object({
        name: InputValidator.string(),
        age: InputValidator.number()
      });

      const result = validator.safeParse({ name: 'John', age: 30 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid objects', () => {
      const validator = InputValidator.object({
        name: InputValidator.string(),
        age: InputValidator.number()
      });

      expect(validator.safeParse({ name: 'John', age: 'thirty' }).success).toBe(false);
      expect(validator.safeParse('not an object').success).toBe(false);
      expect(validator.safeParse(null).success).toBe(false);
    });
  });

  describe('enum validation', () => {
    it('should validate enum values', () => {
      const validator = InputValidator.enum(['red', 'green', 'blue'] as const);
      expect(validator.safeParse('red').success).toBe(true);
      expect(validator.safeParse('yellow').success).toBe(false);
    });
  });

  describe('literal validation', () => {
    it('should validate literal values', () => {
      const validator = InputValidator.literal('exact');
      expect(validator.safeParse('exact').success).toBe(true);
      expect(validator.safeParse('different').success).toBe(false);
    });
  });

  describe('optional and nullable', () => {
    it('should handle optional values', () => {
      const validator = InputValidator.string().optional();
      expect(validator.safeParse('hello').success).toBe(true);
      expect(validator.safeParse(undefined).success).toBe(true);
      expect(validator.safeParse(null).success).toBe(false);
    });

    it('should handle nullable values', () => {
      const validator = InputValidator.string().nullable();
      expect(validator.safeParse('hello').success).toBe(true);
      expect(validator.safeParse(null).success).toBe(true);
      expect(validator.safeParse(undefined).success).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove control characters', () => {
      const input = 'hello\x00world\x01test\x1F';
      const sanitized = InputValidator.sanitizeInput(input);
      expect(sanitized).toBe('helloworldtest');
    });

    it('should preserve valid characters', () => {
      const input = 'Hello World\n\tTest';
      const sanitized = InputValidator.sanitizeInput(input);
      expect(sanitized).toBe('Hello World\n\tTest');
    });
  });

  describe('parse vs safeParse', () => {
    it('should throw on parse failure', () => {
      const validator = InputValidator.string();
      expect(() => validator.parse(123)).toThrow();
    });

    it('should return result on safeParse', () => {
      const validator = InputValidator.string();
      const result = validator.safeParse(123);
      expect(result.success).toBe(false);
    });
  });

  describe('performance', () => {
    it('should validate quickly', () => {
      const validator = InputValidator.object({
        name: InputValidator.string({ min: 1, max: 100 }),
        email: InputValidator.string({ email: true }),
        age: InputValidator.number({ min: 0, max: 150 }),
        tags: InputValidator.array(InputValidator.string())
      });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        validator.safeParse({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          tags: ['developer', 'typescript']
        });
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // <100ms for 1000 validations
    });
  });
});
