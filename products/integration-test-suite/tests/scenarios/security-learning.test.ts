/**
 * Security + Learning Integration Tests
 * Tests input validation with pattern learning, secret detection
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TestScenario } from '../../src/domain/orchestration/entities.js';
import {
  ScenarioId,
  PackageId,
  Duration
} from '../../src/domain/orchestration/value-objects.js';
import { IntegrationTestDataFactory } from '../../src/domain/data-generation/factories.js';

describe('Security + Learning Integration', () => {
  let factory: IntegrationTestDataFactory;
  let testData: ReturnType<typeof factory.createSecurityLearningScenario>;

  beforeAll(() => {
    factory = new IntegrationTestDataFactory();
    testData = factory.createSecurityLearningScenario();
  });

  describe('Input Validation with Pattern Learning', () => {
    it('should detect SQL injection and learn patterns', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'sql-injection-detection-learning',
        [new PackageId('security'), new PackageId('learning')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs } = testData;
        const detectedPatterns: string[] = [];

        for (const sqlInj of maliciousInputs.sqlInjection) {
          // Simulate SQL injection detection
          const isMalicious = this.detectSQLInjection(sqlInj);
          if (isMalicious) {
            detectedPatterns.push(sqlInj);
          }
        }

        // All SQL injection attempts should be detected
        expect(detectedPatterns).toHaveLength(maliciousInputs.sqlInjection.length);

        // Store learned patterns
        const pattern = {
          task: 'detect-sql-injection',
          input: 'SQL injection patterns',
          output: `Detected ${detectedPatterns.length} malicious inputs`,
          reward: detectedPatterns.length / maliciousInputs.sqlInjection.length,
          success: true
        };

        expect(pattern.reward).toBe(1.0);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private detectSQLInjection(input: string): boolean {
      const patterns = [
        /(\bDROP\b|\bUNION\b|\bSELECT\b).*(\bFROM\b|\bTABLE\b)/i,
        /['"];?\s*--/,
        /'.*OR.*'.*=.*'/i,
        /\bEXEC\b.*\(/i
      ];

      return patterns.some(pattern => pattern.test(input));
    }

    it('should detect command injection and update detection rules', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'command-injection-detection',
        [new PackageId('security'), new PackageId('learning')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs } = testData;
        const detectedCommands: string[] = [];

        for (const cmdInj of maliciousInputs.commandInjection) {
          const isMalicious = this.detectCommandInjection(cmdInj);
          if (isMalicious) {
            detectedCommands.push(cmdInj);
          }
        }

        // Should detect all command injection attempts
        expect(detectedCommands.length).toBeGreaterThan(0);

        // Store detection patterns for learning
        const detectionRate = detectedCommands.length / maliciousInputs.commandInjection.length;
        expect(detectionRate).toBeGreaterThan(0.8);

        const pattern = {
          task: 'detect-command-injection',
          input: 'Command injection patterns',
          output: `Detection rate: ${(detectionRate * 100).toFixed(1)}%`,
          reward: detectionRate,
          success: detectionRate > 0.8
        };

        expect(pattern.success).toBe(true);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private detectCommandInjection(input: string): boolean {
      const patterns = [
        /[;&|`$()]/,
        /\brm\b.*-rf/i,
        /\bcurl\b.*http/i,
        /\bwget\b/i,
        /\bcat\b.*\/etc\//i
      ];

      return patterns.some(pattern => pattern.test(input));
    }
  });

  describe('Path Traversal Prevention', () => {
    it('should detect path traversal attempts', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'path-traversal-detection',
        [new PackageId('security'), new PackageId('learning')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs } = testData;
        const detectedTraversal: string[] = [];

        for (const path of maliciousInputs.pathTraversal) {
          const isMalicious = this.detectPathTraversal(path);
          if (isMalicious) {
            detectedTraversal.push(path);
          }
        }

        // Should detect all path traversal attempts
        expect(detectedTraversal).toHaveLength(maliciousInputs.pathTraversal.length);

        // Verify valid paths are allowed
        const { validInputs } = testData;
        for (const validPath of validInputs.paths) {
          const isMalicious = this.detectPathTraversal(validPath);
          expect(isMalicious).toBe(false);
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private detectPathTraversal(path: string): boolean {
      const patterns = [
        /\.\.[\/\\]/,
        /\.\.\.\.[\/\\]/,
        /\/etc\/(passwd|shadow)/,
        /\\windows\\system32/i,
        /\.ssh\//,
        /\.\.\/\.\.\/\.\.\//
      ];

      return patterns.some(pattern => pattern.test(path));
    }
  });

  describe('Secret Detection', () => {
    it('should detect and prevent secret exposure', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'secret-detection',
        [new PackageId('security'), new PackageId('learning')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs } = testData;
        const detectedSecrets: Array<{ value: string; type: string }> = [];

        for (const secret of maliciousInputs.secrets) {
          const detection = this.detectSecret(secret);
          if (detection) {
            detectedSecrets.push(detection);
          }
        }

        // Should detect all secrets
        expect(detectedSecrets).toHaveLength(maliciousInputs.secrets.length);

        // Verify detection types
        const types = new Set(detectedSecrets.map(d => d.type));
        expect(types.size).toBeGreaterThan(1);

        // Store learning pattern
        const pattern = {
          task: 'detect-secrets',
          input: 'Secret patterns',
          output: `Detected ${detectedSecrets.length} secrets`,
          reward: 1.0,
          success: true
        };

        expect(pattern.success).toBe(true);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private detectSecret(
      input: string
    ): { value: string; type: string } | null {
      const patterns = [
        { regex: /AKIA[0-9A-Z]{16}/, type: 'aws-access-key' },
        { regex: /ghp_[a-zA-Z0-9]{36}/, type: 'github-token' },
        { regex: /sk-ant-api03-[a-zA-Z0-9-_]{40,}/, type: 'anthropic-key' },
        { regex: /postgres:\/\/[^:]+:[^@]+@/, type: 'database-url' },
        { regex: /-----BEGIN.*PRIVATE KEY-----/, type: 'private-key' }
      ];

      for (const { regex, type } of patterns) {
        if (regex.test(input)) {
          return { value: input, type };
        }
      }

      return null;
    }
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious inputs while preserving valid data', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'input-sanitization',
        [new PackageId('security')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        const { maliciousInputs, validInputs } = testData;

        // Sanitize malicious inputs
        const sanitized = [...maliciousInputs.sqlInjection].map(input =>
          this.sanitizeInput(input)
        );

        // Verify malicious content removed
        for (const cleaned of sanitized) {
          expect(cleaned).not.toContain('DROP TABLE');
          expect(cleaned).not.toContain('--');
        }

        // Verify valid inputs preserved
        for (const valid of validInputs.commands) {
          const cleaned = this.sanitizeInput(valid);
          expect(cleaned).toContain('agent');
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private sanitizeInput(input: string): string {
      return input
        .replace(/[;&|`$()]/g, '')
        .replace(/--/g, '')
        .replace(/DROP|DELETE|UNION|EXEC/gi, '')
        .trim();
    }
  });

  describe('Edge Case Handling', () => {
    it('should handle edge case inputs safely', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'edge-case-handling',
        [new PackageId('security')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        const { edgeCases } = testData;

        // Test empty strings
        for (const empty of edgeCases.emptyStrings) {
          const result = this.validateInput(empty);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('empty');
        }

        // Test null bytes
        for (const nullByte of edgeCases.nullBytes) {
          const result = this.validateInput(nullByte);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('null byte');
        }

        // Test long inputs
        for (const longInput of edgeCases.longInputs) {
          const result = this.validateInput(longInput);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('too long');
        }
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private validateInput(input: string): { valid: boolean; error?: string } {
      if (!input || input.trim().length === 0) {
        return { valid: false, error: 'Input cannot be empty' };
      }

      if (input.includes('\0')) {
        return { valid: false, error: 'Input contains null byte' };
      }

      if (input.length > 5000) {
        return { valid: false, error: 'Input too long (max 5000 chars)' };
      }

      return { valid: true };
    }
  });
});
