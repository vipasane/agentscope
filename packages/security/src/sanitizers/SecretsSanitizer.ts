/**
 * Secrets Sanitizer - Detects and redacts sensitive information
 *
 * Layer 3A: Secret Detection with regex + entropy analysis
 * Performance: <100ms for typical content
 */

import { SecretFinding } from '../utils/types.js';

interface SecretPattern {
  pattern: RegExp;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export class SecretsSanitizer {
  private static readonly SECRET_PATTERNS: SecretPattern[] = [
    {
      pattern: /sk-ant-[a-zA-Z0-9\-_]{95}/g,
      type: 'ANTHROPIC_API_KEY',
      severity: 'critical',
      description: 'Anthropic API Key'
    },
    {
      pattern: /sk-proj-[a-zA-Z0-9]{48}/g,
      type: 'OPENAI_API_KEY',
      severity: 'critical',
      description: 'OpenAI Project API Key'
    },
    {
      pattern: /sk-[a-zA-Z0-9]{32,}/g,
      type: 'OPENAI_API_KEY',
      severity: 'critical',
      description: 'OpenAI API Key'
    },
    {
      pattern: /ghp_[a-zA-Z0-9]{36}/g,
      type: 'GITHUB_TOKEN',
      severity: 'critical',
      description: 'GitHub Personal Access Token'
    },
    {
      pattern: /gho_[a-zA-Z0-9]{36}/g,
      type: 'GITHUB_OAUTH_TOKEN',
      severity: 'critical',
      description: 'GitHub OAuth Token'
    },
    {
      pattern: /ghs_[a-zA-Z0-9]{36}/g,
      type: 'GITHUB_APP_TOKEN',
      severity: 'critical',
      description: 'GitHub App Token'
    },
    {
      pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
      type: 'GITHUB_FINE_GRAINED_TOKEN',
      severity: 'critical',
      description: 'GitHub Fine-grained Token'
    },
    {
      pattern: /AIza[a-zA-Z0-9\-_]{35}/g,
      type: 'GOOGLE_API_KEY',
      severity: 'critical',
      description: 'Google API Key'
    },
    {
      pattern: /AKIA[A-Z0-9]{16}/g,
      type: 'AWS_ACCESS_KEY',
      severity: 'critical',
      description: 'AWS Access Key ID'
    },
    {
      pattern: /xox[baprs]-[a-zA-Z0-9\-]{50,}/g,
      type: 'SLACK_TOKEN',
      severity: 'high',
      description: 'Slack Token'
    },
    {
      pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
      type: 'PRIVATE_KEY',
      severity: 'critical',
      description: 'Private Key'
    },
    {
      pattern: /Bearer [a-zA-Z0-9\-._~+/]+=*/g,
      type: 'BEARER_TOKEN',
      severity: 'high',
      description: 'Bearer Token'
    },
    {
      pattern: /Basic [a-zA-Z0-9+/]+=*/g,
      type: 'BASIC_AUTH',
      severity: 'high',
      description: 'Basic Authentication'
    },
    {
      pattern: /(?:password|passwd|pwd)["']?\s*[:=]\s*["']?([^"'\s]+)/gi,
      type: 'PASSWORD',
      severity: 'high',
      description: 'Password in Configuration'
    }
  ];

  private static readonly ENTROPY_THRESHOLD = 4.5;

  /**
   * Detect secrets in content
   * @param content - Content to scan
   * @param filePath - File path for reporting
   * @returns Array of secret findings
   */
  static detect(content: string, filePath: string = 'unknown'): SecretFinding[] {
    const findings: SecretFinding[] = [];

    // Regex-based detection
    for (const { pattern, type, severity, description } of this.SECRET_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));
      for (const match of matches) {
        findings.push({
          type,
          severity,
          location: {
            file: filePath,
            index: match.index,
            line: this.getLineNumber(content, match.index!)
          },
          message: `${description} detected`,
          remediation: 'Use environment variables: process.env.API_KEY',
          value: this.redact(match[0]),
          secretType: type
        });
      }
    }

    // Entropy-based detection for unknown secrets
    const highEntropyStrings = this.findHighEntropyStrings(content);
    for (const str of highEntropyStrings) {
      if (!this.isFalsePositive(str.value) && !this.isAlreadyDetected(str.value, findings)) {
        findings.push({
          type: 'UNKNOWN_SECRET',
          severity: 'high',
          location: {
            file: filePath,
            index: str.index,
            line: this.getLineNumber(content, str.index)
          },
          message: 'High-entropy string detected (possible secret)',
          remediation: 'Review this high-entropy string for potential secrets',
          value: this.redact(str.value),
          secretType: 'UNKNOWN_SECRET'
        });
      }
    }

    return findings;
  }

  /**
   * Redact secrets in content
   * @param content - Content containing secrets
   * @returns Redacted content
   */
  static redactContent(content: string): string {
    let redacted = content;

    for (const { pattern } of this.SECRET_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;
      redacted = redacted.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
    }

    return redacted;
  }

  /**
   * Redact a single secret value
   * @param secret - Secret to redact
   * @returns Redacted value
   */
  static redact(secret: string): string {
    if (secret.length < 8) {
      return '[REDACTED]';
    }
    const start = secret.slice(0, 4);
    const end = secret.slice(-4);
    const stars = '*'.repeat(Math.min(secret.length - 8, 8));
    return `${start}${stars}${end}`;
  }

  /**
   * Find high-entropy strings that might be secrets
   * @param content - Content to analyze
   * @returns Array of potential secrets
   */
  private static findHighEntropyStrings(content: string): Array<{ value: string; index: number }> {
    const results: Array<{ value: string; index: number }> = [];

    // Match strings with sufficient length and complexity
    const regex = /\b[a-zA-Z0-9\-_]{16,}\b/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const word = match[0];
      if (this.calculateEntropy(word) > this.ENTROPY_THRESHOLD) {
        results.push({
          value: word,
          index: match.index
        });
      }
    }

    return results;
  }

  /**
   * Calculate Shannon entropy of a string
   * @param str - String to analyze
   * @returns Entropy value
   */
  private static calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};

    // Count character frequencies
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Check if string is a false positive
   * @param str - String to check
   * @returns true if likely a false positive
   */
  private static isFalsePositive(str: string): boolean {
    // Common false positives
    const falsePositives = [
      /^[a-f0-9]{32,}$/i,                    // Hex hashes (MD5, SHA)
      /^[0-9]+$/,                             // Pure numbers
      /example|placeholder|dummy|test|sample|xxx|yyy|zzz/i, // Example strings
      /^[A-Z0-9_]+$/,                         // Constant names
      /localhost|127\.0\.0\.1/i,              // Local URLs
      /^v?\d+\.\d+\.\d+/,                     // Version numbers
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i // UUIDs
    ];

    return falsePositives.some(pattern => pattern.test(str));
  }

  /**
   * Check if secret was already detected by regex patterns
   * @param value - Value to check
   * @param findings - Existing findings
   * @returns true if already detected
   */
  private static isAlreadyDetected(value: string, findings: SecretFinding[]): boolean {
    return findings.some(f => f.value.includes(value.slice(0, 4)));
  }

  /**
   * Get line number from index
   * @param content - Full content
   * @param index - Character index
   * @returns Line number (1-indexed)
   */
  private static getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Check if content contains secrets
   * @param content - Content to check
   * @returns true if secrets detected
   */
  static hasSecrets(content: string): boolean {
    return this.detect(content).length > 0;
  }

  /**
   * Get secret types found in content
   * @param content - Content to analyze
   * @returns Array of secret types found
   */
  static getSecretTypes(content: string): string[] {
    const findings = this.detect(content);
    return [...new Set(findings.map(f => f.secretType))];
  }
}
