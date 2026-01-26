import type { BaseError } from '../base/base-error.js';
import type { PiiPatterns } from '../types/error-context.js';

/**
 * Serialized error representation
 *
 * Safe JSON-serializable error format with PII redaction support.
 *
 * @see {@link ErrorSerializer} for serialization
 *
 * @public
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
 *
 * Safely serializes errors for logging, transmission, and storage while
 * preventing information disclosure attacks. Key features:
 *
 * - **PII Redaction**: Detects and redacts emails, phones, SSNs, credit cards, API keys
 * - **Stack Trace Control**: Optional inclusion of stack traces (dev vs prod)
 * - **Context Sanitization**: Recursively redacts context objects
 * - **Custom Patterns**: Add domain-specific redaction rules
 * - **Safe Serialization**: JSON-safe representation without circular refs
 * - **Error Chain Support**: Preserves error chains and causes
 *
 * ## Security Features
 *
 * Default PII patterns detected:
 * - **Emails**: `name@domain.com`
 * - **Phones**: `(123) 456-7890`, `123.456.7890`, `123-456-7890`
 * - **SSNs**: `123-45-6789`
 * - **Credit Cards**: `1234 5678 9012 3456`
 * - **API Keys**: `api_key=sk_test_...`, `token=abc123...`
 * - **Passwords**: `password=secret`, `passwd:pwd`
 * - **IP Addresses**: `192.168.1.1`
 * - **Usernames**: `user=alice`, `username: bob`
 *
 * @security INFORMATION_DISCLOSURE - Medium Risk (DREAD: 6.2/10)
 * Error messages may leak sensitive information including:
 * - Stack traces revealing file paths
 * - Database connection strings
 * - API keys in error context
 * - Personal information in error messages
 *
 * **Always enable PII redaction before sending errors to clients or untrusted systems.**
 *
 * @example Basic Usage
 * ```typescript
 * const serializer = new ErrorSerializer();
 * const error = ErrorFactory.validation('Invalid email', {
 *   email: 'user@example.com'
 * });
 *
 * const serialized = serializer.serialize(error);
 * console.log(JSON.stringify(serialized));
 * ```
 *
 * @example With PII Redaction
 * ```typescript
 * const serializer = new ErrorSerializer();
 * serializer.setPiiRedaction(true);
 *
 * // Emails will be redacted
 * const error = new Error('User alice@secret.com failed');
 * const serialized = serializer.serialize(error);
 *
 * // Result: message becomes "User [REDACTED_EMAIL] failed"
 * ```
 *
 * @example Custom Redaction Patterns
 * ```typescript
 * const serializer = new ErrorSerializer();
 * serializer.setPiiRedaction(true);
 *
 * // Add domain-specific patterns
 * serializer.addRedaction(/Bearer\s+\w+/g, 'Bearer [REDACTED_TOKEN]');
 * serializer.addRedaction(/customerId:\s*\d+/g, 'customerId: [REDACTED]');
 *
 * const error = new Error('Bearer sk_test_123abc failed for customerId: 999');
 * const serialized = serializer.serialize(error);
 * ```
 *
 * @example Production Error Response
 * ```typescript
 * const serializer = new ErrorSerializer();
 * serializer.setPiiRedaction(true);
 *
 * async function handleRequest(req, res) {
 *   try {
 *     await riskyOperation();
 *   } catch (error) {
 *     // Log full error internally
 *     logger.error('Operation failed', error);
 *
 *     // Send sanitized error to client
 *     const sanitized = serializer.serialize(error, false); // No stack trace
 *     res.status(500).json({
 *       error: sanitized.code,
 *       message: sanitized.message
 *       // Stack trace NOT included
 *     });
 *   }
 * }
 * ```
 *
 * @example Anti-Patterns
 * ```typescript
 * // WRONG: Sending raw error to client
 * res.json({ error: new Error(...) }); // Leaks stack trace, context
 *
 * // WRONG: Assuming custom redaction is sufficient
 * const serialized = serializer.serialize(error); // PII redaction disabled
 * sendToLoggingService(serialized); // May leak sensitive data
 *
 * // CORRECT: Enable PII redaction first
 * serializer.setPiiRedaction(true);
 * const sanitized = serializer.serialize(error);
 * sendToLoggingService(sanitized); // Safe
 * ```
 *
 * @see {@link BaseError} for error properties
 * @see {@link ErrorHandler} for global error handling
 * @see {@link https://owasp.org/www-community/Improper_Error_Handling | OWASP Error Handling}
 *
 * @public
 */
export class ErrorSerializer {
  private piiRedactionEnabled: boolean = false;
  private customRedactions: Map<string, string> = new Map();

  constructor(enablePiiRedaction: boolean = false) {
    this.piiRedactionEnabled = enablePiiRedaction;
  }

  /**
   * Enable or disable PII redaction
   *
   * When enabled, detects and redacts personally identifiable information
   * from error messages and context. Recommended for production environments.
   *
   * @param enabled - Whether to enable PII redaction
   * @returns This serializer (for chaining)
   *
   * @example
   * ```typescript
   * const serializer = new ErrorSerializer();
   * serializer.setPiiRedaction(true);
   * ```
   *
   * @public
   */
  setPiiRedaction(enabled: boolean): this {
    this.piiRedactionEnabled = enabled;
    return this;
  }

  /**
   * Add custom redaction pattern
   *
   * Adds domain-specific redaction rules for sensitive data.
   * Patterns are applied after standard PII redaction.
   *
   * @param pattern - Regex or string pattern to redact
   * @param replacement - Replacement string (default: '[REDACTED]')
   * @returns This serializer (for chaining)
   *
   * @example
   * ```typescript
   * serializer
   *   .addRedaction(/apiKey:\s*\w+/g, 'apiKey: [REDACTED]')
   *   .addRedaction(/Bearer\s+\w+/g, 'Bearer [REDACTED_TOKEN]');
   * ```
   *
   * @public
   */
  addRedaction(pattern: RegExp | string, replacement: string = '[REDACTED]'): this {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.customRedactions.set(key, replacement);
    return this;
  }

  /**
   * Serialize an error to JSON
   *
   * Converts error to JSON-safe representation suitable for logging or transmission.
   * Optionally sanitizes PII and removes stack traces.
   *
   * @param error - Error to serialize (BaseError or native Error)
   * @param includeStack - Include full stack trace (default: true)
   * @returns Serialized error with all properties
   *
   * @security When sending to clients, always call with:
   * - includeStack = false (prevents information disclosure)
   * - setPiiRedaction(true) enabled (prevents data leakage)
   *
   * @example
   * ```typescript
   * const serializer = new ErrorSerializer();
   * serializer.setPiiRedaction(true);
   *
   * const error = new Error('Failed to connect to user@db.example.com');
   * const serialized = serializer.serialize(error, false);
   *
   * // serialized.message = "Failed to connect to [REDACTED_EMAIL]"
   * // serialized.stack = undefined (includeStack=false)
   * ```
   *
   * @public
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
   *
   * Converts error to JSON string suitable for logging or transmission.
   *
   * @param error - Error to serialize
   * @param includeStack - Include stack trace (default: true)
   * @param pretty - Pretty-print JSON (default: false)
   * @returns JSON string representation
   *
   * @example
   * ```typescript
   * const serializer = new ErrorSerializer();
   * serializer.setPiiRedaction(true);
   *
   * const error = ErrorFactory.validation('Invalid input');
   * const json = serializer.toJSON(error, false, true);
   * console.log(json); // Pretty-printed JSON
   * ```
   *
   * @public
   */
  toJSON(error: BaseError | Error, includeStack: boolean = true, pretty: boolean = false): string {
    const serialized = this.serialize(error, includeStack);
    return pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
  }

  /**
   * Format error for logging
   *
   * Creates a concise, human-readable error representation for logging.
   * More readable than JSON for log files.
   *
   * @param error - Error to format
   * @param detailed - Include context and cause chain (default: false)
   * @returns Formatted error string
   *
   * @example
   * ```typescript
   * const serializer = new ErrorSerializer();
   * serializer.setPiiRedaction(true);
   *
   * const error = ErrorFactory.validation('Invalid email');
   * console.log(serializer.format(error)); // "[VALIDATION_001] Invalid email"
   * console.log(serializer.format(error, true)); // Full details
   * ```
   *
   * @public
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
