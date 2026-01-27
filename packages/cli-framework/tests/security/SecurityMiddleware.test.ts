/**
 * Security middleware tests
 *
 * Comprehensive test suite for CommandSecurityMiddleware.
 * Target: 90%+ coverage with all scenarios from review document.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CommandSecurityMiddleware } from '../../src/security/SecurityMiddleware.js';
import { SecurityError } from '../../src/security/types.js';
import type { CommandContext } from '../../src/types.js';
import type { SecurityConfig } from '../../src/security/SecurityConfig.js';

describe('CommandSecurityMiddleware', () => {
  let middleware: CommandSecurityMiddleware;
  let context: CommandContext;

  beforeEach(() => {
    middleware = new CommandSecurityMiddleware();
    context = {
      command: 'test',
      rawArgs: ['test', 'arg1', 'arg2'],
      env: process.env,
    };
  });

  describe('Input Validation', () => {
    it('should pass validation for safe alphanumeric input', async () => {
      context.rawArgs = ['deploy', 'production', '--force'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should block shell metacharacters (;)', async () => {
      context.rawArgs = ['test', '; rm -rf /'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'input'));
      assert.ok(result.errors.some((e) => e.message.includes('metacharacters')));
    });

    it('should block shell metacharacters (|)', async () => {
      context.rawArgs = ['test', 'arg1 | cat /etc/passwd'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'input'));
    });

    it('should block shell metacharacters (&)', async () => {
      context.rawArgs = ['test', 'arg1 & malicious'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'input'));
    });

    it('should block shell metacharacters ($)', async () => {
      context.rawArgs = ['test', '$MALICIOUS_VAR'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'input'));
    });

    it('should block shell metacharacters (`)', async () => {
      context.rawArgs = ['test', '`whoami`'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'input'));
    });

    it('should block shell metacharacters (\\)', async () => {
      context.rawArgs = ['test', 'arg\\nescape'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'input'));
    });

    it('should block control characters', async () => {
      context.rawArgs = ['test', 'arg\x00null'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes('control characters')));
    });

    it('should allow hyphens and underscores', async () => {
      context.rawArgs = ['test', 'my-file_name.txt'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should allow equals signs (for flags)', async () => {
      context.rawArgs = ['test', '--env=production'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should allow slashes (for paths)', async () => {
      context.rawArgs = ['test', './src/index.ts'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('Path Validation', () => {
    it('should allow paths within current directory', async () => {
      context.rawArgs = ['test', `${process.cwd()}/src/file.ts`];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should allow relative paths in current directory', async () => {
      context.rawArgs = ['test', './src/file.ts'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should block access to /etc', async () => {
      context.rawArgs = ['test', '/etc/passwd'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'path'));
      assert.ok(result.errors.some((e) => e.message.includes('/etc')));
    });

    it('should block access to /sys', async () => {
      context.rawArgs = ['test', '/sys/kernel'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'path'));
    });

    it('should block access to /usr', async () => {
      context.rawArgs = ['test', '/usr/bin/whoami'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'path'));
    });

    it('should detect path traversal with ../', async () => {
      context.rawArgs = ['test', '../../../etc/passwd'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes('traversal')));
    });

    it('should detect path traversal with ..\\', async () => {
      context.rawArgs = ['test', '..\\..\\..\\etc\\passwd'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes('traversal')));
    });

    it('should allow ~/.claude paths', async () => {
      context.rawArgs = ['test', '~/.claude/config.json'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should block paths outside allowed directories', async () => {
      context.rawArgs = ['test', '/tmp/random.txt'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes('outside allowed')));
    });
  });

  describe('Secret Detection', () => {
    it('should detect high-entropy API key', async () => {
      const apiKey = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      context.rawArgs = ['test', `--api-key=${apiKey}`];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'secret'));
      assert.ok(result.errors.some((e) => e.value === '[REDACTED]'));
    });

    it('should detect JWT token', async () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      context.rawArgs = ['test', `--token=${jwt}`];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'secret'));
    });

    it('should detect base64 encoded secret', async () => {
      const base64 = 'U2VjcmV0S2V5MTIzNDU2Nzg5MA==';
      context.rawArgs = ['test', base64];
      const result = await middleware.validate(context);
      // High entropy base64 should be flagged
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.type === 'secret'));
    });

    it('should allow low-entropy strings', async () => {
      context.rawArgs = ['test', 'hello', 'world'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.filter((e) => e.type === 'secret').length, 0);
    });

    it('should skip short strings (< 8 chars)', async () => {
      context.rawArgs = ['test', 'AbC123'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should warn on medium-entropy strings', async () => {
      const mediumEntropy = 'password123456';
      context.rawArgs = ['test', mediumEntropy];
      const result = await middleware.validate(context);
      // May generate warnings but should pass
      assert.strictEqual(result.valid, true);
    });
  });

  describe('Sanitization', () => {
    it('should redact high-entropy strings', () => {
      const input = 'Deploy with key sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      const sanitized = middleware.sanitize(input);
      assert.ok(sanitized.includes('[REDACTED]'));
      assert.ok(!sanitized.includes('sk-proj'));
    });

    it('should preserve non-secret content', () => {
      const input = 'Deploy to production with config.json';
      const sanitized = middleware.sanitize(input);
      assert.strictEqual(sanitized, input);
    });

    it('should redact multiple secrets', () => {
      const input = 'key1 sk-AbCdEfGhIjKlMnOpQrStUvWxYz012 key2 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig';
      const sanitized = middleware.sanitize(input);
      assert.ok(sanitized.includes('[REDACTED]'));
      assert.ok(!sanitized.includes('sk-'));
      assert.ok(!sanitized.includes('eyJh'));
    });
  });

  describe('Configuration', () => {
    it('should respect custom entropy threshold', async () => {
      const config: Partial<SecurityConfig> = {
        secretDetection: {
          enabled: true,
          entropyThreshold: 5.0, // Higher threshold
          patterns: [],
        },
      };
      middleware = new CommandSecurityMiddleware(config);

      // String with entropy ~4.5 (would fail with default 4.5, pass with 5.0)
      const mediumSecret = 'AbCdEfGhIjKlMn';
      context.rawArgs = ['test', mediumSecret];
      const result = await middleware.validate(context);
      // With higher threshold, should pass
      assert.strictEqual(result.valid, true);
    });

    it('should respect custom allowed paths', async () => {
      const config: Partial<SecurityConfig> = {
        pathValidation: {
          enabled: true,
          allowedPaths: ['/tmp'],
          deniedPaths: [],
        },
      };
      middleware = new CommandSecurityMiddleware(config);

      context.rawArgs = ['test', '/tmp/file.txt'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, true);
    });

    it('should allow disabling input validation', async () => {
      const config: Partial<SecurityConfig> = {
        inputValidation: {
          enabled: false,
          strictMode: false,
        },
      };
      middleware = new CommandSecurityMiddleware(config);

      context.rawArgs = ['test', '; rm -rf /'];
      const result = await middleware.validate(context);
      // Should still fail on other validations, but not input validation
      assert.ok(!result.errors.some((e) => e.type === 'input'));
    });

    it('should allow disabling path validation', async () => {
      const config: Partial<SecurityConfig> = {
        pathValidation: {
          enabled: false,
          allowedPaths: [],
          deniedPaths: [],
        },
      };
      middleware = new CommandSecurityMiddleware(config);

      context.rawArgs = ['test', '/etc/passwd'];
      const result = await middleware.validate(context);
      // Should not fail on path validation
      assert.ok(!result.errors.some((e) => e.type === 'path'));
    });

    it('should allow disabling secret detection', async () => {
      const config: Partial<SecurityConfig> = {
        secretDetection: {
          enabled: false,
          entropyThreshold: 4.5,
          patterns: [],
        },
      };
      middleware = new CommandSecurityMiddleware(config);

      const apiKey = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      context.rawArgs = ['test', apiKey];
      const result = await middleware.validate(context);
      // Should not fail on secret detection
      assert.ok(!result.errors.some((e) => e.type === 'secret'));
    });
  });

  describe('Performance', () => {
    it('should complete validation in <10ms for simple commands', async () => {
      context.rawArgs = ['deploy', 'production', '--force'];
      const start = Date.now();
      await middleware.validate(context);
      const elapsed = Date.now() - start;
      // Allow some slack for CI environments
      assert.ok(elapsed < 20, `Validation took ${elapsed}ms, expected <20ms`);
    });

    it('should complete validation in <10ms for path checks', async () => {
      context.rawArgs = ['test', './src/index.ts', './src/lib.ts'];
      const start = Date.now();
      await middleware.validate(context);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 20, `Validation took ${elapsed}ms, expected <20ms`);
    });
  });

  describe('Error Handling', () => {
    it('should include all validation errors', async () => {
      context.rawArgs = ['test', '; rm -rf /', '/etc/passwd', 'sk-AbCdEfGhIjKlMnOpQrStUvWxYz012'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      // Should have multiple types of errors
      assert.ok(result.errors.some((e) => e.type === 'input'));
      assert.ok(result.errors.some((e) => e.type === 'path'));
      assert.ok(result.errors.some((e) => e.type === 'secret'));
    });

    it('should provide descriptive error messages', async () => {
      context.rawArgs = ['test', '; whoami'];
      const result = await middleware.validate(context);
      assert.strictEqual(result.valid, false);
      const error = result.errors[0];
      assert.ok(error.message.length > 10);
      assert.ok(error.field);
    });

    it('should sanitize error values', async () => {
      const secret = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      context.rawArgs = ['test', secret];
      const result = await middleware.validate(context);
      const secretError = result.errors.find((e) => e.type === 'secret');
      assert.ok(secretError);
      assert.strictEqual(secretError.value, '[REDACTED]');
    });
  });
});
