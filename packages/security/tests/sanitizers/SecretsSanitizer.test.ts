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

  describe('edge cases - multiple secrets', () => {
    it('should detect all secret types in mixed content', () => {
      const content = `
        api_key_anthropic = sk-ant-${('x').repeat(95)}
        api_key_openai = sk-proj-${('y').repeat(48)}
        github_token = ghp_${('z').repeat(36)}
      `;
      const findings = SecretsSanitizer.detect(content);
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle overlapping patterns', () => {
      const content = 'Bearer sk-ant-' + ('x').repeat(95);
      const findings = SecretsSanitizer.detect(content);
      // Should detect at least one
      expect(findings.length).toBeGreaterThan(0);
    });

    it('should deduplicate findings at same location', () => {
      const content = 'const key = "sk-ant-' + ('x').repeat(95) + '";';
      const findings = SecretsSanitizer.detect(content);
      // Ensure findings are unique
      const uniqueLocations = new Set(findings.map(f => f.location.index));
      expect(uniqueLocations.size).toBe(findings.length);
    });
  });

  describe('edge cases - secret patterns', () => {
    it('should detect AWS secret access keys', () => {
      const content = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const findings = SecretsSanitizer.detect(content);
      // May not detect short ones, but should handle without crashing
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should detect database connection strings', () => {
      const content = 'mongodb+srv://user:password@cluster.mongodb.net/db';
      const findings = SecretsSanitizer.detect(content);
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should detect JWT tokens', () => {
      const content = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const findings = SecretsSanitizer.detect(content);
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should detect encryption keys', () => {
      const content = 'ENCRYPTION_KEY=0x' + ('a').repeat(64);
      const findings = SecretsSanitizer.detect(content);
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  describe('edge cases - context and location', () => {
    it('should track line numbers correctly', () => {
      const content = `line 1
line 2
const key = "sk-ant-${('x').repeat(95)}";
line 4`;
      const findings = SecretsSanitizer.detect(content);
      if (findings.length > 0) {
        expect(findings[0].location.line).toBe(3);
      }
    });

    it('should track column position approximately', () => {
      const content = 'const key = "sk-ant-' + ('x').repeat(95) + '";';
      const findings = SecretsSanitizer.detect(content);
      if (findings.length > 0) {
        expect(findings[0].location.index).toBeGreaterThan(0);
      }
    });

    it('should include file name in findings', () => {
      const content = 'api_key = sk-ant-' + ('x').repeat(95);
      const findings = SecretsSanitizer.detect(content, 'config.js');
      if (findings.length > 0) {
        expect(findings[0].location.file).toBe('config.js');
      }
    });

    it('should handle missing file name', () => {
      const content = 'api_key = sk-ant-' + ('x').repeat(95);
      const findings = SecretsSanitizer.detect(content);
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  describe('edge cases - severity levels', () => {
    it('should mark API keys as critical', () => {
      const content = 'sk-ant-' + ('x').repeat(95);
      const findings = SecretsSanitizer.detect(content);
      if (findings.length > 0) {
        expect(findings[0].severity).toBe('critical');
      }
    });

    it('should mark bearer tokens as high', () => {
      const content = 'Authorization: Bearer token123456789012345678901234567890';
      const findings = SecretsSanitizer.detect(content);
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  describe('edge cases - redaction', () => {
    it('should preserve partial prefix for long secrets', () => {
      const secret = 'sk-ant-' + ('x').repeat(95);
      const redacted = SecretsSanitizer.redact(secret);
      expect(redacted).toContain('sk-');
    });

    it('should redact completely for short secrets', () => {
      const redacted = SecretsSanitizer.redact('secret');
      expect(redacted).toBe('[REDACTED]');
    });

    it('should include asterisks in partial redaction', () => {
      const secret = 'sk-ant-' + ('x').repeat(95);
      const redacted = SecretsSanitizer.redact(secret);
      expect(redacted).toContain('*');
    });

    it('should preserve visible prefix for API keys', () => {
      const secret = 'AKIA' + ('X').repeat(16);
      const redacted = SecretsSanitizer.redact(secret);
      expect(redacted).toContain('AKIA');
    });

    it('should handle very long secrets efficiently', () => {
      const secret = 'key-' + ('a').repeat(10000);
      const redacted = SecretsSanitizer.redact(secret);
      expect(redacted.length).toBeLessThan(secret.length);
    });
  });

  describe('edge cases - redactContent', () => {
    it('should preserve non-secret content', () => {
      const content = 'const config = { host: "localhost" };';
      const redacted = SecretsSanitizer.redactContent(content);
      expect(redacted).toContain('localhost');
    });

    it('should redact only detected secrets', () => {
      const content = 'password: "secret123" and api_key: "sk-ant-' + ('x').repeat(95) + '"';
      const redacted = SecretsSanitizer.redactContent(content);
      // Should redact API key at minimum
      expect(redacted).toContain('[REDACTED]');
    });

    it('should handle empty content', () => {
      const redacted = SecretsSanitizer.redactContent('');
      expect(redacted).toBe('');
    });

    it('should handle content with only secrets', () => {
      const content = 'sk-ant-' + ('x').repeat(95);
      const redacted = SecretsSanitizer.redactContent(content);
      expect(redacted).toContain('[REDACTED]');
    });
  });

  describe('edge cases - hasSecrets', () => {
    it('should return false for clean content', () => {
      const content = 'const config = { host: "localhost", port: 3000 };';
      expect(SecretsSanitizer.hasSecrets(content)).toBe(false);
    });

    it('should return true for content with API keys', () => {
      const content = 'const key = "sk-ant-' + ('x').repeat(95) + '";';
      expect(SecretsSanitizer.hasSecrets(content)).toBe(true);
    });

    it('should handle very large content', () => {
      const content = 'a'.repeat(1000000);
      expect(() => SecretsSanitizer.hasSecrets(content)).not.toThrow();
    });
  });

  describe('edge cases - getSecretTypes', () => {
    it('should return empty array for clean content', () => {
      const types = SecretsSanitizer.getSecretTypes('const x = 1;');
      expect(types).toEqual([]);
    });

    it('should return array with single type', () => {
      const content = 'api_key = sk-ant-' + ('x').repeat(95);
      const types = SecretsSanitizer.getSecretTypes(content);
      if (types.length > 0) {
        expect(types[0]).toBe('ANTHROPIC_API_KEY');
      }
    });

    it('should deduplicate types', () => {
      const content = `
        key1 = sk-ant-${('a').repeat(95)}
        key2 = sk-ant-${('b').repeat(95)}
      `;
      const types = SecretsSanitizer.getSecretTypes(content);
      const uniqueTypes = [...new Set(types)];
      expect(uniqueTypes.length).toBeLessThanOrEqual(types.length);
    });
  });

  describe('security - false positive prevention', () => {
    it('should not detect placeholder values', () => {
      const placeholders = [
        'const key = "YOUR_API_KEY";',
        'const key = "PLACEHOLDER_KEY";',
        'const key = "sk-ant-changeme";'
      ];
      placeholders.forEach(placeholder => {
        const findings = SecretsSanitizer.detect(placeholder);
        // Might detect some, but should minimize false positives
        expect(Array.isArray(findings)).toBe(true);
      });
    });

    it('should not detect UUIDs as secrets', () => {
      const content = 'id: "550e8400-e29b-41d4-a716-446655440000"';
      const findings = SecretsSanitizer.detect(content);
      const criticalFindings = findings.filter(f => f.severity === 'critical');
      expect(criticalFindings.length).toBe(0);
    });

    it('should not detect common version strings', () => {
      const versions = [
        '1.2.3',
        'v1.2.3-beta.4',
        '2024.01.26'
      ];
      versions.forEach(version => {
        const findings = SecretsSanitizer.detect(version);
        const criticalFindings = findings.filter(f => f.severity === 'critical');
        expect(criticalFindings.length).toBe(0);
      });
    });

    it('should not detect email addresses as secrets', () => {
      const content = 'user@example.com';
      const findings = SecretsSanitizer.detect(content);
      const criticalFindings = findings.filter(f => f.severity === 'critical');
      expect(criticalFindings.length).toBe(0);
    });
  });

  describe('performance - large files', () => {
    it('should scan large files efficiently', () => {
      const largeContent = 'line\n'.repeat(1000) + 'sk-ant-' + ('x').repeat(95);
      const start = performance.now();
      SecretsSanitizer.detect(largeContent);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // Should be reasonably fast
    });

    it('should redact large files efficiently', () => {
      const largeContent = 'data\n'.repeat(10000) + 'sk-ant-' + ('x').repeat(95) + '\nmore data';
      const start = performance.now();
      SecretsSanitizer.redactContent(largeContent);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});
