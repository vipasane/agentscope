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
