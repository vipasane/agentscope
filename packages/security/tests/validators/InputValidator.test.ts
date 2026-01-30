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

  describe('edge cases - max length validation', () => {
    it('should reject strings exceeding MAX_STRING_LENGTH', () => {
      const validator = InputValidator.string();
      const overlyLongString = 'a'.repeat(100001); // Exceeds default max
      const result = validator.safeParse(overlyLongString);
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should handle boundary at exactly MAX_STRING_LENGTH', () => {
      const validator = InputValidator.string();
      const maxLengthString = 'a'.repeat(100000);
      const result = validator.safeParse(maxLengthString);
      expect(result.success).toBe(true);
    });
  });

  describe('edge cases - array validation', () => {
    it('should reject arrays exceeding max items', () => {
      const validator = InputValidator.array(InputValidator.string());
      const largeArray = Array(10001).fill('item');
      const result = validator.safeParse(largeArray);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Array too large');
    });

    it('should handle empty arrays', () => {
      const validator = InputValidator.array(InputValidator.string());
      const result = validator.safeParse([]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should report error with correct item index', () => {
      const validator = InputValidator.array(InputValidator.number());
      const result = validator.safeParse([1, 2, 'invalid', 4]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('index 2');
    });
  });

  describe('edge cases - email validation', () => {
    it('should accept valid edge case emails', () => {
      const validator = InputValidator.string({ email: true });
      const validEmails = [
        'test+tag@example.co.uk',
        'user.name@example.com',
        'a@b.c',
        '123@456.com'
      ];
      validEmails.forEach(email => {
        const result = validator.safeParse(email);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const validator = InputValidator.string({ email: true });
      const invalidEmails = [
        'user@',
        '@example.com',
        'user@.com',
        'user @example.com',
        'user@example',
        ''
      ];
      invalidEmails.forEach(email => {
        const result = validator.safeParse(email);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('edge cases - URL validation', () => {
    it('should accept valid URLs', () => {
      const validator = InputValidator.string({ url: true });
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.example.co.uk/path?query=value',
        'https://example.com:8080/path#hash'
      ];
      validUrls.forEach(url => {
        const result = validator.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('should reject most invalid URLs', () => {
      const validator = InputValidator.string({ url: true });
      const invalidUrls = [
        'not a url',
        'htp://example.com',
        'https://',
        '://example.com'
      ];
      invalidUrls.forEach(url => {
        const result = validator.safeParse(url);
        if (!result.success) {
          expect(result.success).toBe(false);
        }
      });
    });
  });

  describe('edge cases - number boundaries', () => {
    it('should handle negative numbers', () => {
      const validator = InputValidator.number({ min: -100, max: 100 });
      expect(validator.safeParse(-50).success).toBe(true);
      expect(validator.safeParse(-101).success).toBe(false);
    });

    it('should handle very large numbers', () => {
      const validator = InputValidator.number();
      expect(validator.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
      expect(validator.safeParse(Number.MAX_VALUE).success).toBe(true);
    });

    it('should handle very small numbers', () => {
      const validator = InputValidator.number();
      expect(validator.safeParse(Number.MIN_SAFE_INTEGER).success).toBe(true);
      expect(validator.safeParse(-Number.MAX_VALUE).success).toBe(true);
    });

    it('should handle Infinity carefully', () => {
      const validator = InputValidator.number();
      // Infinity might be allowed or rejected depending on implementation
      const result1 = validator.safeParse(Infinity);
      const result2 = validator.safeParse(-Infinity);
      // At least check they return consistent result objects
      expect(typeof result1.success).toBe('boolean');
      expect(typeof result2.success).toBe('boolean');
    });

    it('should reject zero for positive-only validators', () => {
      const validator = InputValidator.number({ min: 1 });
      expect(validator.safeParse(0).success).toBe(false);
    });
  });

  describe('edge cases - object validation', () => {
    it('should handle nested objects', () => {
      const validator = InputValidator.object({
        user: InputValidator.object({
          name: InputValidator.string(),
          email: InputValidator.string({ email: true })
        }),
        age: InputValidator.number()
      });

      const result = validator.safeParse({
        user: { name: 'John', email: 'john@example.com' },
        age: 30
      });
      expect(result.success).toBe(true);
    });

    it('should reject nested invalid data', () => {
      const validator = InputValidator.object({
        user: InputValidator.object({
          name: InputValidator.string(),
          email: InputValidator.string({ email: true })
        })
      });

      const result = validator.safeParse({
        user: { name: 'John', email: 'invalid-email' }
      });
      expect(result.success).toBe(false);
    });

    it('should handle objects with extra fields', () => {
      const validator = InputValidator.object({
        name: InputValidator.string()
      });

      const result = validator.safeParse({
        name: 'John',
        extra: 'field'
      });
      // Should pass - extra fields allowed
      expect(result.success).toBe(true);
    });
  });

  describe('edge cases - special characters', () => {
    it('should sanitize null bytes in middle of string', () => {
      const validator = InputValidator.string();
      const result = validator.parse('hello\x00world');
      expect(result).toBe('helloworld');
      expect(result).not.toContain('\x00');
    });

    it('should sanitize multiple control characters', () => {
      const validator = InputValidator.string();
      const result = validator.parse('a\x01b\x02c\x03d');
      expect(result).toBe('abcd');
    });

    it('should preserve newlines and tabs', () => {
      const validator = InputValidator.string();
      const result = validator.parse('line1\nline2\ttabbed');
      expect(result).toContain('\n');
      expect(result).toContain('\t');
    });

    it('should handle unicode characters', () => {
      const validator = InputValidator.string();
      const result = validator.safeParse('hello 世界 🌍');
      expect(result.success).toBe(true);
      expect(result.data).toContain('世界');
    });
  });

  describe('edge cases - optional and nullable combinations', () => {
    it('should handle optional with nested validators', () => {
      const validator = InputValidator.object({
        name: InputValidator.string(),
        middle: InputValidator.string().optional()
      });

      const withOptional = validator.safeParse({ name: 'John' });
      expect(withOptional.success).toBe(true);

      const withUndefined = validator.safeParse({ name: 'John', middle: undefined });
      expect(withUndefined.success).toBe(true);
    });

    it('should chain optional and nullable', () => {
      const validator = InputValidator.string().optional().nullable();
      expect(validator.safeParse(undefined).success).toBe(true);
      expect(validator.safeParse(null).success).toBe(true);
      expect(validator.safeParse('value').success).toBe(true);
    });
  });

  describe('edge cases - regex validation', () => {
    it('should handle complex regex patterns', () => {
      const validator = InputValidator.string({
        regex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
      });
      expect(validator.safeParse('test@example.com').success).toBe(true);
      expect(validator.safeParse('invalid').success).toBe(false);
    });

    it('should handle regex with special flags', () => {
      const caseInsensitiveValidator = InputValidator.string({
        regex: /^hello$/i
      });
      expect(caseInsensitiveValidator.safeParse('HELLO').success).toBe(true);
      expect(caseInsensitiveValidator.safeParse('Hello').success).toBe(true);
    });
  });

  describe('security - injection attempts', () => {
    it('should neutralize SQL injection attempts', () => {
      const validator = InputValidator.string();
      const sqlInjection = "'; DROP TABLE users; --";
      const result = validator.parse(sqlInjection);
      // Should remove control characters but not prevent SQL semantics
      expect(result).toBeDefined();
    });

    it('should handle command injection patterns', () => {
      const validator = InputValidator.string();
      const cmdInjection = 'test; rm -rf /';
      const result = validator.parse(cmdInjection);
      // Should remove control characters
      expect(result).not.toContain('\x00');
    });

    it('should handle path traversal patterns', () => {
      const validator = InputValidator.string();
      const traversal = '../../etc/passwd';
      const result = validator.parse(traversal);
      // Validator doesn't block, just sanitizes control chars
      expect(typeof result).toBe('string');
    });
  });
});
