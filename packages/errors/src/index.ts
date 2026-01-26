/**
 * @claude-flow/errors - Structured Error Handling and Recovery
 *
 * Zero-dependency error handling system providing consistent error structure,
 * context preservation, error recovery strategies, and safe serialization for
 * Claude Flow agents and applications.
 *
 * ## Features
 *
 * - **Base Error Class**: Structured errors with codes, categories, and context preservation
 * - **Error Factory**: Type-safe error creation with automatic categorization
 * - **Error Codes**: Comprehensive error code taxonomy (VALIDATION, SECURITY, MEMORY, etc.)
 * - **Error Serialization**: Safe JSON serialization with PII redaction and information disclosure prevention
 * - **Error Handler**: Global error handling with listeners and configurable logging
 * - **Retry Strategy**: Exponential backoff retry with transient failure detection
 * - **Fallback Strategy**: Fallback values and alternative execution paths
 * - **Error Reporter**: Batch error reporting for monitoring and analytics
 *
 * ## Error Hierarchy
 *
 * All errors extend {@link BaseError}:
 * - Validation errors (user input, format validation)
 * - Security errors (injection attempts, unauthorized access)
 * - Memory errors (storage failures, data corruption)
 * - Agent errors (execution failures, timeouts)
 * - Configuration errors (missing/invalid config)
 * - Network errors (connection failures, timeouts)
 * - File system errors (access denied, not found)
 * - Database errors (connection/query failures)
 * - Internal errors (logic bugs, unrecoverable states)
 *
 * ## Quick Start
 *
 * @example Basic Error Creation
 * ```typescript
 * import { ErrorFactory, BaseError } from '@claude-flow/errors';
 *
 * // Create validation error
 * const error = ErrorFactory.validation('Invalid email format', {
 *   field: 'email',
 *   received: userInput
 * });
 *
 * // Access error properties
 * console.log(error.code);        // 'VALIDATION_001'
 * console.log(error.category);    // 'validation'
 * console.log(error.severity);    // 'medium'
 * console.log(error.context);     // { field: 'email', received: ... }
 * ```
 *
 * @example Error Handling with Context
 * ```typescript
 * try {
 *   validateUserInput(input);
 * } catch (error) {
 *   if (error instanceof BaseError) {
 *     console.log(`Error [${error.code}]: ${error.message}`);
 *     console.log(`Severity: ${error.severity}`);
 *     console.log(`Context: ${JSON.stringify(error.context)}`);
 *   }
 * }
 * ```
 *
 * @example Error Recovery with Retry
 * ```typescript
 * import { RetryStrategy } from '@claude-flow/errors';
 *
 * const retry = new RetryStrategy({
 *   maxRetries: 3,
 *   initialDelayMs: 100,
 *   backoffMultiplier: 2
 * });
 *
 * const result = await retry.execute(async () => {
 *   return await fetchDataWithNetworkError();
 * });
 *
 * if (result.success) {
 *   console.log('Success after', result.attempts, 'attempts');
 *   console.log('Data:', result.result);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts');
 *   console.error('Last error:', result.lastError?.message);
 * }
 * ```
 *
 * @example Safe Error Serialization
 * ```typescript
 * import { ErrorSerializer } from '@claude-flow/errors';
 *
 * const serializer = new ErrorSerializer();
 * serializer.setPiiRedaction(true); // Enable PII redaction
 * serializer.addRedaction(/password=\w+/, 'password=[REDACTED]');
 *
 * try {
 *   dangerousOperation();
 * } catch (error) {
 *   // Safe to log/transmit without leaking sensitive data
 *   const serialized = serializer.serialize(error);
 *   console.log(JSON.stringify(serialized));
 * }
 * ```
 *
 * @example Global Error Handler
 * ```typescript
 * import { getErrorHandler, ErrorListener } from '@claude-flow/errors';
 *
 * const handler = getErrorHandler({
 *   enablePiiRedaction: true,
 *   environment: 'production'
 * });
 *
 * // Add custom error listener
 * handler.addListener({
 *   onError: async (error, context) => {
 *     // Send to monitoring service
 *     await sendToSentry(error, context);
 *   }
 * });
 *
 * // Use throughout application
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   await handler.handle(error, { userId: 123 });
 * }
 * ```
 *
 * ## Security Considerations
 *
 * This package implements critical information disclosure prevention:
 *
 * - **Stack traces sanitized** before serialization
 * - **PII detection** for emails, phones, API keys, passwords
 * - **Context redaction** removes sensitive data from error context
 * - **Safe error messages** for client-facing responses
 * - **Environment-aware logging** different detail levels for dev/prod
 *
 * @security INFORMATION_DISCLOSURE - Medium Risk (DREAD: 6.2/10)
 * Error messages may leak sensitive information. Always use
 * {@link ErrorSerializer} with PII redaction enabled before sending
 * errors to clients or untrusted systems.
 *
 * @see {@link BaseError} for error class documentation
 * @see {@link ErrorFactory} for error creation patterns
 * @see {@link ErrorSerializer} for serialization and PII redaction
 * @see {@link ErrorHandler} for global error handling
 * @see {@link RetryStrategy} for automatic retry logic
 * @see {@link FallbackStrategy} for fallback patterns
 * @see {@link ADR-010} Agent Security Architecture - Information Disclosure
 *
 * @packageDocumentation
 */

// Base errors
export { BaseError } from './base/base-error.js';
export { ErrorFactory } from './base/error-factory.js';

// Types
export * from './types/error-codes.js';
export * from './types/error-context.js';

// Serializer
export { ErrorSerializer } from './serializer/error-serializer.js';
export type { SerializedError } from './serializer/error-serializer.js';

// Handler
export { ErrorHandler, getErrorHandler, LogLevel } from './handler/error-handler.js';
export type { ErrorHandlerConfig, ErrorListener } from './handler/error-handler.js';

// Recovery
export { RetryStrategy } from './recovery/retry-strategy.js';
export { FallbackStrategy } from './recovery/fallback-strategy.js';
export type { RetryConfig, RetryResult } from './recovery/retry-strategy.js';
export type { FallbackResult } from './recovery/fallback-strategy.js';

// Reporter
export { ErrorReporter, ConsoleReporterBackend, BatchReporterBackend } from './reporter/error-reporter.js';
export type { ErrorReport, ReporterBackend } from './reporter/error-reporter.js';
