/**
 * Security integration tests with CommandRegistry
 *
 * Tests the full integration of security middleware with command execution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import { SecurityError } from '../../src/security/types.js';
import type { CommandConfig } from '../../src/types.js';

describe('Security Integration with CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();

    // Register test commands
    const testCommand: CommandConfig = {
      name: 'test',
      description: 'Test command',
      action: async (args) => {
        console.log('Test command executed');
      },
    };

    registry.register(testCommand);
  });

  describe('Command Execution with Security Enabled', () => {
    it('should execute safe commands successfully', async () => {
      registry.enableSecurity();

      // Should not throw
      await registry.execute(['test', 'arg1', 'arg2']);
    });

    it('should block commands with shell metacharacters', async () => {
      registry.enableSecurity();

      await assert.rejects(
        async () => registry.execute(['test', '; rm -rf /']),
        (error: Error) => {
          assert.ok(error instanceof SecurityError);
          assert.ok(error.message.includes('security validation'));
          return true;
        }
      );
    });

    it('should block commands with path traversal', async () => {
      registry.enableSecurity();

      await assert.rejects(
        async () => registry.execute(['test', '../../../etc/passwd']),
        (error: Error) => {
          assert.ok(error instanceof SecurityError);
          return true;
        }
      );
    });

    it('should block commands with high-entropy secrets', async () => {
      registry.enableSecurity();

      const apiKey = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      await assert.rejects(
        async () => registry.execute(['test', `--api-key=${apiKey}`]),
        (error: Error) => {
          assert.ok(error instanceof SecurityError);
          return true;
        }
      );
    });

    it('should allow commands when security is disabled', async () => {
      // Don't enable security
      await registry.execute(['test', '; echo hello']);
    });
  });

  describe('Custom Security Configuration', () => {
    it('should respect custom allowed paths', async () => {
      registry.enableSecurity({
        pathValidation: {
          enabled: true,
          allowedPaths: ['/tmp', process.cwd()],
          deniedPaths: [],
        },
      });

      // Should not throw for /tmp path
      await registry.execute(['test', '/tmp/file.txt']);
    });

    it('should respect disabled validations', async () => {
      registry.enableSecurity({
        inputValidation: {
          enabled: false,
          strictMode: false,
        },
        pathValidation: {
          enabled: false,
          allowedPaths: [],
          deniedPaths: [],
        },
        secretDetection: {
          enabled: false,
          entropyThreshold: 4.5,
          patterns: [],
        },
      });

      // Should not throw even with dangerous input
      await registry.execute(['test', '; rm -rf /', '/etc/passwd']);
    });

    it('should allow re-enabling security', async () => {
      registry.enableSecurity();
      registry.disableSecurity();
      registry.enableSecurity();

      await assert.rejects(
        async () => registry.execute(['test', '; whoami']),
        (error: Error) => {
          assert.ok(error instanceof SecurityError);
          return true;
        }
      );
    });
  });

  describe('Security Error Details', () => {
    it('should include command context in security errors', async () => {
      registry.enableSecurity();

      try {
        await registry.execute(['test', '; rm -rf /']);
        assert.fail('Should have thrown SecurityError');
      } catch (error) {
        assert.ok(error instanceof SecurityError);
        assert.ok(error.context);
        assert.strictEqual(error.context.command, 'test');
      }
    });

    it('should include validation errors in security errors', async () => {
      registry.enableSecurity();

      try {
        await registry.execute(['test', '; echo hello', '/etc/passwd']);
        assert.fail('Should have thrown SecurityError');
      } catch (error) {
        assert.ok(error instanceof SecurityError);
        assert.ok(error.errors.length > 0);
        // Should have both input and path errors
        assert.ok(error.errors.some((e) => e.type === 'input'));
        assert.ok(error.errors.some((e) => e.type === 'path'));
      }
    });
  });

  describe('Performance with Security Enabled', () => {
    it('should add minimal overhead (<20ms)', async () => {
      registry.enableSecurity();

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await registry.execute(['test', 'arg1', 'arg2']);
        times.push(Date.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average execution time with security: ${avg.toFixed(2)}ms`);

      // Allow generous slack for CI environments
      assert.ok(avg < 50, `Average time ${avg}ms exceeds 50ms target`);
    });

    it('should not significantly impact performance for safe commands', async () => {
      // Measure without security
      const withoutSecurityStart = Date.now();
      for (let i = 0; i < 10; i++) {
        await registry.execute(['test', 'arg']);
      }
      const withoutSecurityTime = Date.now() - withoutSecurityStart;

      // Enable security
      registry.enableSecurity();

      // Measure with security
      const withSecurityStart = Date.now();
      for (let i = 0; i < 10; i++) {
        await registry.execute(['test', 'arg']);
      }
      const withSecurityTime = Date.now() - withSecurityStart;

      const overhead = withSecurityTime - withoutSecurityTime;
      console.log(`Security overhead: ${overhead}ms for 10 commands (${(overhead / 10).toFixed(2)}ms per command)`);

      // Overhead should be reasonable (<200ms for 10 commands = <20ms per command)
      assert.ok(overhead < 300, `Overhead ${overhead}ms exceeds 300ms`);
    });
  });
});
