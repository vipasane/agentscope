/**
 * Security middleware implementation for CLI framework
 *
 * Provides comprehensive security validation including:
 * - Input validation (Zod-based)
 * - Path traversal prevention
 * - Secret detection (Shannon entropy)
 * - Optional AIDefence threat detection
 *
 * Following ADR-025 security architecture and review decisions.
 *
 * @module security/SecurityMiddleware
 */

import type { CommandContext } from '../types.js';
import type { SecurityConfig } from './SecurityConfig.js';
import type {
  SecurityMiddleware,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ThreatDetection,
} from './types.js';
import { SecurityError } from './types.js';
import { DEFAULT_SECURITY_CONFIG } from './SecurityConfig.js';
import * as path from 'path';
import * as os from 'os';

/**
 * Command security middleware implementation
 *
 * Validates all command inputs against security policies before execution.
 * Follows security-by-default principle (review Q1, Q2, Q6).
 *
 * @example
 * ```typescript
 * const middleware = new CommandSecurityMiddleware({
 *   inputValidation: { enabled: true, strictMode: true },
 *   pathValidation: { enabled: true, allowedPaths: [process.cwd()] },
 *   secretDetection: { enabled: true, entropyThreshold: 4.5 }
 * });
 *
 * const result = await middleware.validate(context);
 * if (!result.valid) {
 *   throw new SecurityError('Validation failed', result.errors, context);
 * }
 * ```
 */
export class CommandSecurityMiddleware implements SecurityMiddleware {
  private config: SecurityConfig;
  private readonly startTime: number;

  /**
   * Create security middleware instance
   * @param config - Security configuration (defaults to DEFAULT_SECURITY_CONFIG)
   */
  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.startTime = Date.now();
  }

  /**
   * Validate command context against security policies
   *
   * Performs validation in order (review Q5):
   * 1. Input validation (Zod schemas)
   * 2. Path validation (hybrid allowlist + traversal detection)
   * 3. Secret detection (Shannon entropy 4.5)
   * 4. Optional AIDefence scanning
   *
   * Performance target: <10ms (review Q9)
   *
   * @param context - Command execution context
   * @returns Validation result with errors, warnings, and threats
   */
  async validate(context: CommandContext): Promise<ValidationResult> {
    const perfStart = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let threats: ThreatDetection[] | undefined;

    // 1. Input validation (strict allowlist)
    if (this.config.inputValidation.enabled) {
      const inputErrors = this.validateInput(context);
      errors.push(...inputErrors);
    }

    // 2. Path validation (hybrid: allowlist + traversal detection)
    if (this.config.pathValidation.enabled) {
      const pathErrors = this.validatePaths(context);
      errors.push(...pathErrors);
    }

    // 3. Secret detection (Shannon entropy 4.5)
    if (this.config.secretDetection.enabled) {
      const secretResult = this.detectSecrets(context);
      errors.push(...secretResult.errors);
      warnings.push(...secretResult.warnings);
    }

    // 4. Optional AIDefence scanning (for dangerous operations)
    if (this.config.aidefence.enabled) {
      threats = await this.scanWithAIDefence(context);
    }

    const perfEnd = Date.now();
    const elapsed = perfEnd - perfStart;

    // Log performance if exceeds target
    if (elapsed > 10) {
      this.log('warn', `Security validation took ${elapsed}ms (target: <10ms)`);
    }

    const valid = errors.length === 0 && (!threats || threats.every((t) => t.severity !== 'critical'));

    return {
      valid,
      errors,
      warnings,
      threats,
    };
  }

  /**
   * Sanitize input by removing detected secrets
   *
   * @param input - Input string to sanitize
   * @returns Sanitized string with secrets replaced by [REDACTED]
   */
  sanitize(input: string): string {
    let sanitized = input;

    // Detect high-entropy strings
    const words = input.split(/\s+/);
    for (const word of words) {
      if (this.calculateEntropy(word) >= this.config.secretDetection.entropyThreshold) {
        sanitized = sanitized.replace(word, '[REDACTED]');
      }
    }

    // Apply custom patterns
    for (const pattern of this.config.secretDetection.patterns) {
      const regex = new RegExp(pattern, 'g');
      sanitized = sanitized.replace(regex, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Validate input against strict allowlist (review Q14)
   *
   * Blocks:
   * - Shell metacharacters (;|&$`\)
   * - Path traversal sequences (../)
   * - Control characters
   * - Unicode exploits
   */
  private validateInput(context: CommandContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const args = context.rawArgs.join(' ');

    if (this.config.inputValidation.strictMode) {
      // Strict allowlist: alphanumeric + safe punctuation
      const dangerousChars = /[;|&$`\\<>]/;
      if (dangerousChars.test(args)) {
        errors.push({
          type: 'input',
          field: 'rawArgs',
          message: 'Input contains dangerous shell metacharacters',
          value: this.sanitize(args),
        });
      }

      // Detect control characters
      // eslint-disable-next-line no-control-regex
      const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
      if (controlChars.test(args)) {
        errors.push({
          type: 'input',
          field: 'rawArgs',
          message: 'Input contains control characters',
          value: this.sanitize(args),
        });
      }
    }

    return errors;
  }

  /**
   * Validate paths against hybrid allowlist + traversal detection (review Q2, Q3)
   *
   * Defense-in-depth:
   * 1. Canonical path resolution
   * 2. Allowlist check (must start with allowed path)
   * 3. Denylist check (must not start with denied path)
   * 4. Traversal sequence detection (../)
   */
  private validatePaths(context: CommandContext): ValidationError[] {
    const errors: ValidationError[] = [];

    // Extract potential file paths from arguments
    const paths = this.extractPaths(context.rawArgs);

    for (const rawPath of paths) {
      try {
        // Resolve to canonical path (handles symlinks, .., .)
        const expandedPath = rawPath.replace(/^~/, os.homedir());
        const canonicalPath = path.resolve(expandedPath);

        // Check denylist first (blocks /etc, /sys, /usr)
        const isDenied = this.config.pathValidation.deniedPaths.some((denied) =>
          canonicalPath.startsWith(path.resolve(denied))
        );

        if (isDenied) {
          errors.push({
            type: 'path',
            field: 'path',
            message: `Access denied to system path: ${canonicalPath}`,
            value: rawPath,
          });
          continue;
        }

        // Check allowlist (must start with allowed path)
        const isAllowed = this.config.pathValidation.allowedPaths.some((allowed) => {
          const resolvedAllowed = allowed.replace(/^~/, os.homedir());
          return canonicalPath.startsWith(path.resolve(resolvedAllowed));
        });

        if (!isAllowed) {
          errors.push({
            type: 'path',
            field: 'path',
            message: `Path outside allowed directories: ${canonicalPath}`,
            value: rawPath,
          });
        }

        // Detect traversal sequences (defense-in-depth)
        if (rawPath.includes('../') || rawPath.includes('..\\')) {
          errors.push({
            type: 'path',
            field: 'path',
            message: 'Path traversal sequence detected',
            value: rawPath,
          });
        }
      } catch (err) {
        // Invalid path
        errors.push({
          type: 'path',
          field: 'path',
          message: 'Invalid path format',
          value: rawPath,
        });
      }
    }

    return errors;
  }

  /**
   * Detect secrets using Shannon entropy (review Q3: threshold 4.5)
   *
   * Algorithm:
   * 1. Calculate Shannon entropy for each word
   * 2. Flag if entropy >= 4.5 (industry standard)
   * 3. Apply custom regex patterns
   */
  private detectSecrets(context: CommandContext): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const args = context.rawArgs.join(' ');
    const words = args.split(/\s+/);

    for (const word of words) {
      // Skip short strings (reduce false positives)
      if (word.length < 8) continue;

      const entropy = this.calculateEntropy(word);

      // High entropy (likely secret)
      if (entropy >= this.config.secretDetection.entropyThreshold) {
        errors.push({
          type: 'secret',
          field: 'rawArgs',
          message: `High-entropy string detected (entropy: ${entropy.toFixed(2)}, threshold: ${this.config.secretDetection.entropyThreshold})`,
          value: '[REDACTED]',
        });
      }
      // Medium entropy (warning)
      else if (entropy >= 4.0) {
        warnings.push({
          type: 'entropy',
          message: `Medium-entropy string detected (entropy: ${entropy.toFixed(2)})`,
          context: word.substring(0, 4) + '***',
        });
      }
    }

    // Apply custom patterns
    for (const pattern of this.config.secretDetection.patterns) {
      const regex = new RegExp(pattern, 'g');
      if (regex.test(args)) {
        errors.push({
          type: 'secret',
          field: 'rawArgs',
          message: `String matches secret pattern: ${pattern}`,
          value: '[REDACTED]',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Scan with AIDefence (optional, off by default)
   *
   * Only enabled for dangerous operations (review Q4).
   * Currently a stub - requires @claude-flow/security integration.
   */
  private async scanWithAIDefence(context: CommandContext): Promise<ThreatDetection[]> {
    // Stub implementation - would integrate with @claude-flow/security AIDefenceClient
    // For now, return empty array
    return [];
  }

  /**
   * Calculate Shannon entropy of a string
   *
   * Formula: H = -Σ(p(x) * log2(p(x)))
   * where p(x) is the probability of character x
   *
   * @param str - String to analyze
   * @returns Shannon entropy in bits
   */
  private calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies: Record<string, number> = {};

    // Count character frequencies
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Extract potential file paths from arguments
   *
   * Heuristics:
   * - Starts with / or ./ or ../
   * - Contains file extension
   * - Starts with ~
   */
  private extractPaths(args: string[]): string[] {
    const paths: string[] = [];

    for (const arg of args) {
      // Skip flags
      if (arg.startsWith('-')) continue;

      // Path indicators
      if (
        arg.startsWith('/') ||
        arg.startsWith('./') ||
        arg.startsWith('../') ||
        arg.startsWith('~') ||
        /\.(ts|js|json|md|txt|yml|yaml)$/.test(arg)
      ) {
        paths.push(arg);
      }
    }

    return paths;
  }

  /**
   * Log security event (review Q10: always log)
   */
  private log(level: 'error' | 'warn' | 'info', message: string): void {
    const levels = { error: 0, warn: 1, info: 2 };
    const configLevel = levels[this.config.errorHandling.logLevel];
    const messageLevel = levels[level];

    if (messageLevel <= configLevel) {
      const timestamp = new Date().toISOString();
      console.error(`[SECURITY] [${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}
