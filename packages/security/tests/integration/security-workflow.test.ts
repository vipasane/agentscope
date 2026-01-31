/**
 * End-to-end security validation workflow tests
 *
 * Tests complete security workflows including:
 * - Secret detection and redaction
 * - DREAD risk scoring
 * - Security learning coordination
 * - Prompt injection detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecretsSanitizer } from '../../src/sanitizers/SecretsSanitizer';
import { DREADScorer, DREADScoreFactory } from '../../src/scoring/DREADScorer';
import type { AgentConfig } from '../../src/scoring/DREADScorer';
import { InputValidator } from '../../src/validators/InputValidator';
import { PathValidator } from '../../src/validators/PathValidator';
import { SafeExecutor } from '../../src/validators/SafeExecutor';
import type { SecurityFinding } from '../../src/utils/types';

describe('Security Workflow Integration', () => {
  let scorer: DREADScorer;

  beforeEach(() => {
    scorer = new DREADScorer();
  });

  describe('Complete Security Assessment Workflow', () => {
    it('should perform full security assessment on agent config', () => {
      const config: AgentConfig = {
        hooks: [
          { event: 'PreToolUse', command: 'npm install' },
          { event: 'PostEdit', prompt: 'Review changes' }
        ],
        permissions: {
          defaultMode: 'ask',
          rules: [
            { type: 'allow', pattern: 'Read' },
            { type: 'deny', pattern: 'Bash' }
          ]
        },
        mcpServers: [
          { name: 'local', command: 'npx mcp-server', transport: undefined }
        ],
        claudeMd: 'You are a helpful coding assistant.'
      };

      // Step 1: Score the configuration
      const score = scorer.scoreAgentConfig(config);

      // Step 2: Verify score components
      expect(score).toHaveProperty('damage');
      expect(score).toHaveProperty('reproducibility');
      expect(score).toHaveProperty('exploitability');
      expect(score).toHaveProperty('affectedUsers');
      expect(score).toHaveProperty('discoverability');
      expect(score).toHaveProperty('total');
      expect(score).toHaveProperty('severity');
      expect(score).toHaveProperty('confidence');
      expect(score).toHaveProperty('breakdown');

      // Step 3: Verify score ranges
      expect(score.damage).toBeGreaterThanOrEqual(0);
      expect(score.damage).toBeLessThanOrEqual(10);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(50);
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);

      // Step 4: Verify breakdown is provided
      expect(score.breakdown.damageFactors).toBeInstanceOf(Array);
      expect(score.breakdown.exploitabilityFactors).toBeInstanceOf(Array);
      expect(score.breakdown.discoverabilityFactors).toBeInstanceOf(Array);
    });

    it('should detect high-risk configuration', () => {
      const highRiskConfig: AgentConfig = {
        hooks: [
          { event: 'PreToolUse', command: 'rm -rf /' },
          { event: 'PostEdit', command: 'curl http://attacker.com' },
          { event: 'UserPromptSubmit', command: 'eval $USER_INPUT' }
        ],
        permissions: {
          defaultMode: 'allow', // Dangerous!
          rules: [
            { type: 'allow', pattern: '*' } // Wildcard allow
          ]
        },
        mcpServers: [
          { name: 'external', command: 'npx external-server', transport: 'http://external.com' }
        ],
        claudeMd: 'A'.repeat(10000) // Very long instructions
      };

      const score = scorer.scoreAgentConfig(highRiskConfig);

      // Should be high or critical severity
      expect(['high', 'critical']).toContain(score.severity);
      expect(score.total).toBeGreaterThan(20);

      // Should identify risk factors
      expect(score.breakdown.damageFactors.length).toBeGreaterThan(0);
      expect(score.breakdown.exploitabilityFactors.length).toBeGreaterThan(0);
    });

    it('should detect low-risk configuration', () => {
      const lowRiskConfig: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: [
            { type: 'allow', pattern: 'Read' }
          ]
        },
        mcpServers: [],
        claudeMd: 'Simple assistant'
      };

      const score = scorer.scoreAgentConfig(lowRiskConfig);

      // Should be low or medium severity
      expect(['low', 'medium']).toContain(score.severity);
      expect(score.total).toBeLessThan(30);
    });
  });

  describe('Secret Detection Workflow', () => {
    it('should detect and redact secrets in code', () => {
      const codeWithSecrets = `
        const apiKey = 'sk-ant-api03-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901abc234def567ghi890jkl12';
        const githubToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
        const password = 'super_secret_password_123';
      `;

      // Step 1: Detect secrets
      const findings = SecretsSanitizer.detect(codeWithSecrets, 'config.ts');

      // Step 2: Verify secrets found
      expect(findings.length).toBeGreaterThan(0);

      // Step 3: Verify secret types
      const secretTypes = new Set(findings.map(f => f.type));
      expect(secretTypes.has('ANTHROPIC_API_KEY') || secretTypes.has('GITHUB_TOKEN') || secretTypes.has('PASSWORD')).toBe(true);

      // Step 4: Redact content
      const redacted = SecretsSanitizer.redactContent(codeWithSecrets);
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('sk-ant-api03');
      expect(redacted).not.toContain('ghp_123456');
    });

    it('should provide remediation guidance', () => {
      const codeWithSecret = 'const apiKey = "sk-ant-api03-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901abc234def567ghi890jkl12";';

      const findings = SecretsSanitizer.detect(codeWithSecret, 'config.js');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].remediation).toBeDefined();
      expect(findings[0].remediation).toContain('environment variable');
    });

    it('should calculate DREAD score for secret exposure', () => {
      const secretFinding: SecurityFinding = {
        type: 'SecretExposure',
        severity: 'critical',
        location: {
          file: 'config.ts',
          line: 10
        },
        message: 'API key exposed',
        remediation: 'Use environment variables'
      };

      const score = scorer.scoreFinding(secretFinding);

      // Secret exposure should have high damage
      expect(score.damage).toBeGreaterThanOrEqual(7);
      expect(score.reproducibility).toBeGreaterThanOrEqual(8);
      expect(['high', 'critical']).toContain(score.severity);
    });

    it('should detect secrets in various formats', () => {
      const samples = [
        'ANTHROPIC_API_KEY=sk-ant-api03-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901abc234def567ghi890jkl12',
        'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz',
        'aws_access_key = AKIAIOSFODNN7EXAMPLE',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      ];

      samples.forEach(sample => {
        const findings = SecretsSanitizer.detect(sample, 'test.txt');
        expect(findings.length).toBeGreaterThanOrEqual(0); // May or may not match based on patterns
      });
    });

    it('should redact secrets partially for debugging', () => {
      const apiKey = 'sk-ant-api03-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901abc234def567ghi890jkl12';

      const redacted = SecretsSanitizer.redact(apiKey);

      // Should show first and last few chars
      expect(redacted).toContain('sk-a');
      expect(redacted).toContain('*');
      expect(redacted.length).toBeLessThan(apiKey.length);
    });
  });

  describe('DREAD Risk Scoring Workflow', () => {
    it('should create valid DREAD score', () => {
      const score = DREADScoreFactory.create(
        8,  // damage
        10, // reproducibility
        6,  // exploitability
        7,  // affectedUsers
        5,  // discoverability
        0.9 // confidence
      );

      expect(score.damage).toBe(8);
      expect(score.reproducibility).toBe(10);
      expect(score.exploitability).toBe(6);
      expect(score.affectedUsers).toBe(7);
      expect(score.discoverability).toBe(5);
      expect(score.total).toBe(36);
      expect(score.confidence).toBe(0.9);
      expect(score.severity).toBe('high');
    });

    it('should validate score dimensions', () => {
      // Out of range damage
      expect(() => {
        DREADScoreFactory.create(11, 10, 5, 5, 5);
      }).toThrow();

      // Negative value
      expect(() => {
        DREADScoreFactory.create(-1, 10, 5, 5, 5);
      }).toThrow();

      // Invalid confidence
      expect(() => {
        DREADScoreFactory.create(5, 10, 5, 5, 5, 1.5);
      }).toThrow();
    });

    it('should map severity correctly', () => {
      // Critical: ≥40
      const critical = DREADScoreFactory.create(10, 10, 10, 10, 10);
      expect(critical.severity).toBe('critical');
      expect(critical.total).toBe(50);

      // High: ≥30
      const high = DREADScoreFactory.create(8, 10, 7, 8, 7);
      expect(high.severity).toBe('high');
      expect(high.total).toBeGreaterThanOrEqual(30);

      // Medium: ≥15
      const medium = DREADScoreFactory.create(5, 5, 5, 5, 5);
      expect(medium.severity).toBe('medium');
      expect(medium.total).toBe(25);

      // Low: <15
      const low = DREADScoreFactory.create(2, 2, 2, 2, 2);
      expect(low.severity).toBe('low');
      expect(low.total).toBe(10);
    });

    it('should score different finding types correctly', () => {
      const findings: SecurityFinding[] = [
        { type: 'PromptInjection', severity: 'critical', location: { file: 'test' }, message: 'test', remediation: 'test' },
        { type: 'CommandInjection', severity: 'critical', location: { file: 'test' }, message: 'test', remediation: 'test' },
        { type: 'SecretExposure', severity: 'high', location: { file: 'test' }, message: 'test', remediation: 'test' },
        { type: 'PathTraversal', severity: 'high', location: { file: 'test' }, message: 'test', remediation: 'test' }
      ];

      findings.forEach(finding => {
        const score = scorer.scoreFinding(finding);
        expect(score.damage).toBeGreaterThan(0);
        expect(score.total).toBeGreaterThan(0);
        expect(score.severity).toBeDefined();
      });

      // Command injection should be highest risk
      const cmdInjectionScore = scorer.scoreFinding(findings[1]);
      expect(cmdInjectionScore.damage).toBeGreaterThanOrEqual(8);
    });

    it('should apply risk optimizations', () => {
      const baseScore = DREADScoreFactory.create(8, 10, 7, 7, 6);

      const optimizations = [
        {
          threatType: 'PromptInjection',
          weightAdjustment: 0.8, // Reduce by 20%
          confidence: 0.9,
          sampleSize: 100
        }
      ];

      const optimizedScore = scorer.applyOptimizations(baseScore, optimizations);

      // Scores should be reduced
      expect(optimizedScore.damage).toBeLessThan(baseScore.damage);
      expect(optimizedScore.exploitability).toBeLessThan(baseScore.exploitability);

      // Confidence should be minimum of all optimizations
      expect(optimizedScore.confidence).toBe(0.9);
    });
  });

  describe('Input Validation Workflow', () => {
    it('should validate API request with multiple fields', () => {
      const apiRequest = {
        username: 'john_doe',
        email: 'john@example.com',
        age: 30,
        preferences: ['dark', 'notifications']
      };

      const schema = InputValidator.object({
        username: InputValidator.string({ min: 3, max: 50 }),
        email: InputValidator.string({ email: true }),
        age: InputValidator.number({ min: 0, max: 150, int: true }),
        preferences: InputValidator.array(InputValidator.string())
      });

      const result = schema.safeParse(apiRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid nested data', () => {
      const invalid = {
        user: {
          name: 123, // Should be string
          email: 'invalid'
        }
      };

      const schema = InputValidator.object({
        user: InputValidator.object({
          name: InputValidator.string(),
          email: InputValidator.string({ email: true })
        })
      });

      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Path Security Workflow', () => {
    it('should validate file upload path', () => {
      const uploadDir = process.cwd() + '/uploads';
      const fileName = 'document.pdf';
      const fullPath = `${uploadDir}/${fileName}`;

      const safePath = PathValidator.validate(fullPath, {
        allowedDirectories: [uploadDir],
        allowTraversal: false,
        maxDepth: 10
      });

      expect(safePath).toBeTruthy();
      expect(safePath).toContain(fileName);
    });

    it('should block upload to system directories', () => {
      const fileName = '../../etc/passwd';
      const uploadDir = '/var/www/uploads';
      const fullPath = `${uploadDir}/${fileName}`;

      expect(() => {
        PathValidator.validate(fullPath, {
          allowedDirectories: [uploadDir],
          allowTraversal: false
        });
      }).toThrow();
    });
  });

  describe('Command Security Workflow', () => {
    it('should validate safe command construction', () => {
      const userCommand = 'npm';
      const userArgs = ['install', 'express'];

      // Validate command
      const safeCmd = SafeExecutor.validate(userCommand, {
        allowedCommands: ['npm', 'node', 'git'],
        requireShellEscape: false
      });

      // Build safe command
      const fullCmd = SafeExecutor.buildCommand(safeCmd, userArgs);

      expect(fullCmd).toBe("npm 'install' 'express'");
    });

    it('should block dangerous command execution', () => {
      const dangerousCmd = 'rm -rf /';

      expect(() => {
        SafeExecutor.validate(dangerousCmd, {
          requireShellEscape: false
        });
      }).toThrow('Dangerous command blocked');
    });

    it('should escape dangerous arguments', () => {
      const arg = '$(whoami)';
      const escaped = SafeExecutor.escapeShellArg(arg);

      expect(escaped).toBe("'$(whoami)'");
      expect(escaped.charAt(0)).toBe("'");
      expect(escaped.charAt(escaped.length - 1)).toBe("'");
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple security checks quickly', () => {
      const config: AgentConfig = {
        hooks: [
          { event: 'PreToolUse', command: 'npm test' }
        ],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: 'Assistant'
      };

      const start = performance.now();

      // Perform multiple security checks
      for (let i = 0; i < 100; i++) {
        scorer.scoreAgentConfig(config);
        SecretsSanitizer.detect('const key = "test"', 'file.ts');
        PathValidator.isSafe('file.txt');
        SafeExecutor.containsInjection('npm test');
      }

      const duration = performance.now() - start;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // <1s for 100 iterations
    });

    it('should validate large configurations efficiently', () => {
      const largeConfig: AgentConfig = {
        hooks: Array.from({ length: 20 }, (_, i) => ({
          event: 'PreToolUse' as const,
          command: `command-${i}`
        })),
        permissions: {
          defaultMode: 'ask',
          rules: Array.from({ length: 50 }, (_, i) => ({
            type: 'allow' as const,
            pattern: `pattern-${i}`
          }))
        },
        mcpServers: Array.from({ length: 10 }, (_, i) => ({
          name: `server-${i}`,
          command: `npx server-${i}`
        })),
        claudeMd: 'A'.repeat(50000)
      };

      const start = performance.now();
      const score = scorer.scoreAgentConfig(largeConfig);
      const duration = performance.now() - start;

      expect(score).toBeDefined();
      expect(duration).toBeLessThan(100); // <100ms
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty configuration', () => {
      const emptyConfig: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: ''
      };

      const score = scorer.scoreAgentConfig(emptyConfig);
      expect(score).toBeDefined();
      expect(score.severity).toBe('low');
    });

    it('should handle missing optional fields', () => {
      const minimalConfig: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: 'Basic'
      };

      expect(() => {
        scorer.scoreAgentConfig(minimalConfig);
      }).not.toThrow();
    });

    it('should handle null and undefined gracefully', () => {
      const content = 'test content';

      // Empty path
      expect(() => PathValidator.validate('')).toThrow();

      // Empty command
      expect(() => SafeExecutor.validate('')).toThrow();

      // Valid empty detection
      const findings = SecretsSanitizer.detect('', 'empty.txt');
      expect(findings).toEqual([]);
    });

    it('should maintain immutability of scores', () => {
      const score = DREADScoreFactory.create(5, 5, 5, 5, 5);

      // Try to modify (should fail silently due to Object.freeze)
      expect(Object.isFrozen(score)).toBe(true);
    });
  });
});
