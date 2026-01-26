/**
 * Error context and metadata definitions
 */

/**
 * PII pattern types that should be redacted
 */
export interface PiiPatterns {
  email?: boolean;
  phone?: boolean;
  ssn?: boolean;
  creditCard?: boolean;
  apiKey?: boolean;
  password?: boolean;
  ipAddress?: boolean;
  username?: boolean;
}

/**
 * Error context - Additional information about error occurrence
 */
export interface ErrorContext {
  /** Operation that was being performed */
  operation?: string;

  /** Timestamp of error occurrence */
  timestamp?: number;

  /** User identifier (will be redacted if PII redaction enabled) */
  userId?: string;

  /** Session identifier */
  sessionId?: string;

  /** Request identifier for tracing */
  requestId?: string;

  /** Component or module where error occurred */
  component?: string;

  /** Environment (development, staging, production) */
  environment?: 'development' | 'staging' | 'production';

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Related errors or chain */
  relatedErrors?: Array<{
    code: string;
    message: string;
    timestamp?: number;
  }>;
}

/**
 * Error recovery metadata
 */
export interface RecoveryContext {
  /** Number of retry attempts */
  retryCount?: number;

  /** Maximum allowed retries */
  maxRetries?: number;

  /** Next retry timestamp */
  nextRetryAt?: number;

  /** Was error recovered? */
  recovered?: boolean;

  /** Recovery strategy used */
  strategy?: string;

  /** Fallback value if recovered */
  fallbackValue?: unknown;
}

/**
 * Error location information
 */
export interface ErrorLocation {
  /** File name */
  file?: string;

  /** Line number */
  line?: number;

  /** Column number */
  column?: number;

  /** Function name */
  function?: string;
}

/**
 * Complete error metadata
 */
export interface ErrorMetadata {
  context: ErrorContext;
  recovery?: RecoveryContext;
  location?: ErrorLocation;
  originalError?: Error;
  piiRedacted?: boolean;
}
