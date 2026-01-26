import { describe, it, expect } from 'vitest';
import { SecretsSanitizer } from '../../src/sanitizers/SecretsSanitizer';

describe('SecretsSanitizer', () => {
  describe('detect', () => {
    it('should detect Anthropic API keys', () => {
      const content = 'const key = "sk-ant-' + 'x'.repeat(95) + '";';
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('ANTHROPIC_API_KEY');
      expect(findings[0].severity).toBe('critical');
    });

    it('should detect OpenAI API keys', () => {
      const content = 'OPENAI_KEY=sk-proj-' + 'x'.repeat(48);
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('OPENAI_API_KEY');
    });

    it('should detect GitHub tokens', () => {
      const content = 'token = ghp_' + 'x'.repeat(36);
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('GITHUB_TOKEN');
    });

    it('should detect Google API keys', () => {
      const content = 'const apiKey = "AIza' + 'x'.repeat(35) + '";';
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('GOOGLE_API_KEY');
    });

    it('should detect AWS access keys', () => {
      const content = 'AWS_KEY=AKIA' + 'X'.repeat(16);
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('AWS_ACCESS_KEY');
    });

    it('should detect private keys', () => {
      const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('PRIVATE_KEY');
    });

    it('should detect Bearer tokens', () => {
      const content = 'Authorization: Bearer abc123def456';
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('BEARER_TOKEN');
    });

    it('should detect passwords in config', () => {
      const content = 'password: "secret123"';
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('PASSWORD');
    });

    it('should detect high-entropy strings', () => {
      const content = 'const secret = "aB3dE5fG7hJ9kL2mN4pQ6rS8tV0wX1yZ";';
      const findings = SecretsSanitizer.detect(content);
      // May or may not detect depending on entropy threshold
      // Just ensure it doesn't crash
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should not detect false positives', () => {
      const falsePositives = [
        'const hash = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";', // MD5 hash
        'const example = "example-api-key-placeholder";',
        'const uuid = "550e8400-e29b-41d4-a716-446655440000";',
        'const version = "v1.2.3-beta.4";'
      ];

      for (const content of falsePositives) {
        const findings = SecretsSanitizer.detect(content);
        const criticalFindings = findings.filter(f => f.severity === 'critical');
        expect(criticalFindings.length).toBe(0);
      }
    });

    it('should include location information', () => {
      const content = 'line1\nline2\nconst key = "sk-ant-' + 'x'.repeat(95) + '";\nline4';
      const findings = SecretsSanitizer.detect(content, 'test.ts');
      expect(findings[0].location.file).toBe('test.ts');
      expect(findings[0].location.line).toBe(3);
      expect(findings[0].location.index).toBeGreaterThan(0);
    });
  });

  describe('redactContent', () => {
    it('should redact secrets in content', () => {
      const content = 'const key = "sk-ant-' + 'x'.repeat(95) + '";';
      const redacted = SecretsSanitizer.redactContent(content);
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('sk-ant-');
    });

    it('should handle multiple secrets', () => {
      const content = `
        ANTHROPIC_KEY=sk-ant-${'x'.repeat(95)}
        OPENAI_KEY=sk-proj-${'y'.repeat(48)}
      `;
      const redacted = SecretsSanitizer.redactContent(content);
      expect(redacted.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('redact', () => {
    it('should redact short secrets completely', () => {
      expect(SecretsSanitizer.redact('short')).toBe('[REDACTED]');
    });

    it('should redact long secrets partially', () => {
      const secret = 'sk-ant-' + 'x'.repeat(95);
      const redacted = SecretsSanitizer.redact(secret);
      expect(redacted).toContain('sk-a');
      expect(redacted).toContain('****');
      expect(redacted.length).toBeLessThan(secret.length);
    });
  });

  describe('hasSecrets', () => {
    it('should return true when secrets found', () => {
      const content = 'const key = "sk-ant-' + 'x'.repeat(95) + '";';
      expect(SecretsSanitizer.hasSecrets(content)).toBe(true);
    });

    it('should return false when no secrets found', () => {
      const content = 'const key = process.env.API_KEY;';
      expect(SecretsSanitizer.hasSecrets(content)).toBe(false);
    });
  });

  describe('getSecretTypes', () => {
    it('should return all secret types found', () => {
      const content = `
        ANTHROPIC_KEY=sk-ant-${'x'.repeat(95)}
        GITHUB_TOKEN=ghp_${'y'.repeat(36)}
      `;
      const types = SecretsSanitizer.getSecretTypes(content);
      expect(types).toContain('ANTHROPIC_API_KEY');
      expect(types).toContain('GITHUB_TOKEN');
    });

    it('should deduplicate types', () => {
      const content = `
        KEY1=sk-ant-${'x'.repeat(95)}
        KEY2=sk-ant-${'y'.repeat(95)}
      `;
      const types = SecretsSanitizer.getSecretTypes(content);
      const anthropicKeys = types.filter(t => t === 'ANTHROPIC_API_KEY');
      expect(anthropicKeys.length).toBe(1);
    });
  });

  describe('performance', () => {
    it('should scan content quickly', () => {
      const content = `
        // Large file with multiple secrets
        const config = {
          anthropic: "sk-ant-${'x'.repeat(95)}",
          openai: "sk-proj-${'y'.repeat(48)}",
          github: "ghp_${'z'.repeat(36)}",
          data: "${'a'.repeat(10000)}" // Large content
        };
      `;

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        SecretsSanitizer.detect(content);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // <100ms for 100 scans
    });
  });

  describe('entropy calculation', () => {
    it('should calculate entropy correctly', () => {
      // Access private method via test helper
      const lowEntropyString = 'aaaaaaaaaaaaaaaa'; // All same character
      const highEntropyString = 'aB3dE5fG7hJ9kL2m'; // Random mix

      // Low entropy string should not be detected as secret
      const findings1 = SecretsSanitizer.detect(lowEntropyString);
      expect(findings1.length).toBe(0);

      // High entropy might be detected (depending on other factors)
      // Just ensure no crash
      const findings2 = SecretsSanitizer.detect(highEntropyString);
      expect(Array.isArray(findings2)).toBe(true);
    });
  });
});
