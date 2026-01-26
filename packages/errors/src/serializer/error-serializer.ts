import type { BaseError } from '../base/base-error.js';
import type { PiiPatterns } from '../types/error-context.js';

/**
 * Serialized error representation
 */
export interface SerializedError {
  name: string;
  message: string;
  code: string;
  category: string;
  severity: string;
  timestamp: number;
  stack?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  cause?: SerializedError;
  chain?: SerializedError[];
}

/**
 * PII Redaction patterns
 */
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  apiKey: /(?:api[_-]?key|token|secret)[\s:=]+([a-zA-Z0-9._\-]+)/gi,
  password: /(?:password|passwd|pwd)[\s:=]+([^\s,}]+)/gi,
  ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  username: /(?:user|username)[\s:=]+([a-zA-Z0-9._-]+)/gi,
};

/**
 * Error serializer for JSON serialization, logging, and PII redaction
 */
export class ErrorSerializer {
  private piiRedactionEnabled: boolean = false;
  private customRedactions: Map<string, string> = new Map();

  constructor(enablePiiRedaction: boolean = false) {
    this.piiRedactionEnabled = enablePiiRedaction;
  }

  /**
   * Enable or disable PII redaction
   */
  setPiiRedaction(enabled: boolean): this {
    this.piiRedactionEnabled = enabled;
    return this;
  }

  /**
   * Add custom redaction pattern
   */
  addRedaction(pattern: RegExp | string, replacement: string = '[REDACTED]'): this {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.customRedactions.set(key, replacement);
    return this;
  }

  /**
   * Serialize an error to JSON
   */
  serialize(error: BaseError | Error, includeStack: boolean = true): SerializedError {
    if (error instanceof Error && !(error as any).code) {
      // Regular error not BaseError
      return {
        name: error.name || 'Error',
        message: this.redactPii(error.message),
        code: 'UNKNOWN',
        category: 'internal',
        severity: 'medium',
        timestamp: Date.now(),
        stack: includeStack ? error.stack : undefined,
      };
    }

    const baseError = error as any as BaseError;
    const serialized: SerializedError = {
      name: baseError.name,
      message: this.redactPii(baseError.message),
      code: baseError.code,
      category: baseError.category,
      severity: baseError.severity,
      timestamp: baseError.context?.timestamp || Date.now(),
      stack: includeStack ? baseError.stack : undefined,
    };

    // Add context
    if (baseError.context) {
      serialized.context = this.serializeContext(baseError.context as any as Record<string, unknown>);
    }

    // Add metadata
    if (baseError.metadata) {
      serialized.metadata = this.serializeMetadata(baseError.metadata as any as Record<string, unknown>);
    }

    // Add cause if present
    if (baseError.cause) {
      serialized.cause = this.serialize(baseError.cause, includeStack);
    }

    // Add chain
    if ((baseError as any).getChain) {
      const chain = (baseError as any).getChain();
      if (chain.length > 0) {
        serialized.chain = chain.map((e: BaseError) => this.serialize(e, includeStack));
      }
    }

    return serialized;
  }

  /**
   * Serialize context with PII redaction
   */
  private serializeContext(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const serialized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (value === undefined || value === null) continue;

      if (typeof value === 'string') {
        serialized[key] = this.redactPii(value);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        serialized[key] = this.serializeContext(value as Record<string, unknown>);
      } else {
        serialized[key] = value;
      }
    }

    return Object.keys(serialized).length > 0 ? serialized : undefined;
  }

  /**
   * Serialize metadata
   */
  private serializeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const serialized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue;

      if (key === 'context') {
        serialized[key] = this.serializeContext(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        serialized[key] = this.redactPii(value);
      } else if (key === 'originalError' && value instanceof Error) {
        serialized[key] = {
          name: value.name,
          message: this.redactPii(value.message),
        };
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        serialized[key] = this.serializeMetadata(value as Record<string, unknown>);
      } else {
        serialized[key] = value;
      }
    }

    return Object.keys(serialized).length > 0 ? serialized : undefined;
  }

  /**
   * Redact PII from string
   */
  private redactPii(value: string): string {
    if (!value) return value;

    let result = value;

    // Apply standard PII patterns
    if (this.piiRedactionEnabled) {
      for (const [name, pattern] of Object.entries(PII_PATTERNS)) {
        result = result.replace(pattern, '[REDACTED_' + name.toUpperCase() + ']');
      }
    }

    // Apply custom redactions (always applied regardless of piiRedactionEnabled)
    for (const [pattern, replacement] of this.customRedactions.entries()) {
      try {
        const regex = new RegExp(pattern, 'gi');
        result = result.replace(regex, replacement);
      } catch {
        // Skip invalid patterns
      }
    }

    return result;
  }

  /**
   * Serialize to JSON string
   */
  toJSON(error: BaseError | Error, includeStack: boolean = true, pretty: boolean = false): string {
    const serialized = this.serialize(error, includeStack);
    return pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
  }

  /**
   * Format error for logging
   */
  format(error: BaseError | Error, detailed: boolean = false): string {
    const serialized = this.serialize(error, false);

    if (detailed) {
      const parts: string[] = [];
      parts.push(`[${serialized.code}] ${serialized.message}`);

      if (serialized.context) {
        parts.push(`Context: ${JSON.stringify(serialized.context)}`);
      }

      if (serialized.cause) {
        parts.push(`Caused by: ${this.format(serialized.cause as any, false)}`);
      }

      return parts.join('\n');
    }

    return `[${serialized.code}] ${serialized.message}`;
  }

  /**
   * Deserialize error from serialized form
   */
  static deserialize(serialized: SerializedError): Error {
    const error = new Error(serialized.message);
    error.name = serialized.name;
    (error as any).code = serialized.code;
    (error as any).category = serialized.category;
    (error as any).severity = serialized.severity;
    (error as any).timestamp = serialized.timestamp;
    (error as any).context = serialized.context;
    (error as any).metadata = serialized.metadata;

    if (serialized.cause) {
      (error as any).cause = this.deserialize(serialized.cause);
    }

    if (serialized.stack) {
      error.stack = serialized.stack;
    }

    return error;
  }
}
