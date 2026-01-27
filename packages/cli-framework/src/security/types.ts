/**
 * Security middleware type definitions
 *
 * @module security/types
 */

import type { CommandContext } from '../types.js';

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error type */
  type: 'input' | 'path' | 'secret' | 'threat';
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Invalid value (sanitized) */
  value?: string;
}

/**
 * Security warning (non-blocking)
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'entropy' | 'pattern' | 'suspicious';
  /** Warning message */
  message: string;
  /** Context */
  context?: string;
}

/**
 * Threat detection result from AIDefence
 */
export interface ThreatDetection {
  /** Threat severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Threat type */
  type: string;
  /** Threat description */
  description: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (blocking) */
  errors: ValidationError[];
  /** Validation warnings (non-blocking) */
  warnings: ValidationWarning[];
  /** Threat detections (optional) */
  threats?: ThreatDetection[];
}

/**
 * Security middleware interface
 */
export interface SecurityMiddleware {
  /**
   * Validate command context
   * @param context - Command execution context
   * @returns Validation result
   */
  validate(context: CommandContext): Promise<ValidationResult>;

  /**
   * Sanitize input by removing detected secrets
   * @param input - Input string to sanitize
   * @returns Sanitized string
   */
  sanitize(input: string): string;
}

/**
 * Security error thrown when validation fails
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
    public readonly context?: CommandContext
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}
