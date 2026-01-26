# @claude-flow/errors

Comprehensive error handling utilities for Claude Flow V3 - Type-safe error management with recovery strategies, monitoring, and PII redaction.

## Features

- **Type-Safe Errors**: Structured error codes and categories with TypeScript support
- **Error Context**: Rich context preservation (operation, user, session, metadata)
- **Error Chaining**: Support for error cause chains and error sequences
- **PII Redaction**: Automatic detection and redaction of sensitive data
- **Recovery Strategies**: Retry logic with exponential backoff and fallback handling
- **Centralized Handling**: Global error handler with listeners and logging
- **Error Reporting**: Monitor and report errors to external systems
- **Zero Dependencies**: No external dependencies for core functionality

## Installation

```bash
npm install @claude-flow/errors
```

## Quick Start

### Creating Errors

```typescript
import { ErrorFactory } from '@claude-flow/errors';

// Create typed errors with consistency
const validationError = ErrorFactory.validation('Email must be valid', {
  field: 'email',
  value: 'invalid-email',
});

const securityError = ErrorFactory.security('Unauthorized access');
const networkError = ErrorFactory.network('Connection timeout');
const agentError = ErrorFactory.agent('Agent execution failed');
```

### Handling Errors

```typescript
import { ErrorHandler } from '@claude-flow/errors';

const handler = ErrorHandler.getInstance({
  environment: 'production',
  enablePiiRedaction: true,
});

// Handle an error
const error = ErrorFactory.memory('Out of memory');
await handler.handle(error, { userId: 'user123' });

// Format for display
const formatted = handler.formatError(error, true);
console.log(formatted);
```

### Retry Logic

```typescript
import { RetryStrategy } from '@claude-flow/errors';

const retry = new RetryStrategy({
  maxRetries: 3,
  initialDelayMs: 100,
  backoffMultiplier: 2,
});

const result = await retry.execute(async () => {
  // Your operation here
  return await fetchData();
});

if (result.success) {
  console.log('Success:', result.result);
} else {
  console.log('Failed:', result.lastError);
}
```

### Fallback Handling

```typescript
import { FallbackStrategy } from '@claude-flow/errors';

const fallback = new FallbackStrategy();

// Add fallback for network errors
fallback.addFallbackForCode('NETWORK_001', () => ({
  cached: true,
  data: getCachedData(),
}));

const result = await fallback.execute(async () => {
  return await fetchData();
});
```

## Error Types

All error types follow the pattern `[DOMAIN]_[SEQUENCE]`:

### Validation Errors (VALIDATION_XXX)
```typescript
ErrorFactory.validation('Invalid input')
// Error codes: VALIDATION_001, VALIDATION_002, VALIDATION_003
```

### Security Errors (SECURITY_XXX)
```typescript
ErrorFactory.security('Unauthorized access')
// Error codes: SECURITY_001, SECURITY_002, SECURITY_003, SECURITY_004
// Severity: CRITICAL
```

### Memory Errors (MEMORY_XXX)
```typescript
ErrorFactory.memory('Out of memory')
// Error codes: MEMORY_001, MEMORY_002, MEMORY_003, MEMORY_004
```

### Agent Errors (AGENT_XXX)
```typescript
ErrorFactory.agent('Agent timeout')
// Error codes: AGENT_001, AGENT_002, AGENT_003, AGENT_004
```

### Network Errors (NETWORK_XXX)
```typescript
ErrorFactory.network('Connection timeout')
// Error codes: NETWORK_001, NETWORK_002, NETWORK_003, NETWORK_004
```

### Configuration Errors (CONFIG_XXX)
```typescript
ErrorFactory.config('Missing configuration')
// Error codes: CONFIG_001, CONFIG_002, CONFIG_003
```

### Database Errors (DB_XXX)
```typescript
ErrorFactory.database('Query failed')
// Error codes: DB_001, DB_002, DB_003
```

### File System Errors (FS_XXX)
```typescript
ErrorFactory.fileSystem('File not found')
// Error codes: FS_001, FS_002, FS_003
```

### Internal Errors (INTERNAL_XXX)
```typescript
ErrorFactory.internal('Unexpected error')
// Error codes: INTERNAL_001, INTERNAL_002
```

## Error Context

Add rich context to errors:

```typescript
const error = ErrorFactory.agent('Processing failed', {
  operation: 'batch_process',
  component: 'data_processor',
  environment: 'production',
  sessionId: 'sess-123',
  userId: 'user456',
  metadata: {
    itemCount: 100,
    failedAt: 45,
    duration: 5000,
  },
});
```

## Error Chaining

Support for error cause chains:

```typescript
const cause = new Error('Database connection lost');
const chainedError = ErrorFactory.database(
  'Query failed',
  { operation: 'select' },
  cause
);

// Get full chain as string
console.log(chainedError.getFullMessage());
// Output: Query failed -> Database connection lost
```

## Error Serialization

Serialize errors for logging and transmission:

```typescript
import { ErrorSerializer } from '@claude-flow/errors';

const serializer = new ErrorSerializer(true); // Enable PII redaction

const error = ErrorFactory.validation('Invalid email: user@example.com');

// Serialize with redaction
const serialized = serializer.serialize(error);
// Message becomes: "Invalid email: [REDACTED_EMAIL]"

// Convert to JSON
const json = serializer.toJSON(error, true, true);

// Format for logging
const formatted = serializer.format(error, true);
```

### PII Redaction Patterns

Automatically redacts:
- Email addresses
- Phone numbers
- SSNs (123-45-6789)
- Credit card numbers
- API keys
- Passwords
- IP addresses
- Usernames

Add custom patterns:

```typescript
serializer.addRedaction(/api_key_\w+/, '[REDACTED_KEY]');
serializer.addRedaction(/custom_pattern/, '[REDACTED]');
```

## Error Handler

Global error handling with listeners:

```typescript
import { ErrorHandler, LogLevel } from '@claude-flow/errors';

const handler = ErrorHandler.getInstance({
  environment: 'production',
  enablePiiRedaction: true,
});

// Add error listeners
handler.addListener({
  onError: async (error, context) => {
    // Send to monitoring system
    await reportToMonitoring(error);
  },
});

// Handle errors
await handler.handle(error, { userId: 'user123' });
```

## Error Reporter

Report errors to monitoring systems:

```typescript
import { ErrorReporter, ConsoleReporterBackend } from '@claude-flow/errors';

const backend = new ConsoleReporterBackend();
const reporter = new ErrorReporter(backend, 'production', '1.0.0');

// Add global tags
reporter.addTag('service', 'api').addTag('region', 'us-east-1');

// Report error
const reportId = await reporter.report(
  error,
  { endpoint: '/users' },
  { latency: 150 }
);
```

### Batch Reporting

Accumulate and batch error reports:

```typescript
const batchBackend = new BatchReporterBackend(
  async (reports) => {
    // Send batch to monitoring service
    await sendToMonitoring(reports);
  },
  5000, // Flush interval
  100   // Max batch size
);

const reporter = new ErrorReporter(batchBackend);
```

## Retry Strategy

Configurable retry with exponential backoff:

```typescript
const retry = new RetryStrategy({
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableErrorCodes: ['NETWORK_001', 'AGENT_003'],
  onRetry: (attempt, delay, error) => {
    console.log(`Retry ${attempt} in ${delay}ms: ${error.message}`);
  },
});

// Async execution
const result = await retry.execute(async () => {
  return await unreliableOperation();
});

// Sync execution
const syncResult = retry.executeSync(() => {
  return synchronousOperation();
});
```

## Fallback Strategy

Graceful degradation with fallbacks:

```typescript
const fallback = new FallbackStrategy();

// Add specific fallback
fallback.addFallback(
  (error) => error.message.includes('database'),
  () => getFromCache(),
  'Use cache on database error'
);

// Add code-based fallback
fallback.addFallbackForCode('NETWORK_001', () => getDefaultData());

// Add default fallback (always matches)
fallback.addDefaultFallback(() => null);

const result = await fallback.execute(async () => {
  return await fetchData();
});
```

## Combined Recovery

Retry then fallback:

```typescript
const retry = new RetryStrategy({ maxRetries: 2 });
const fallback = new FallbackStrategy();

fallback.addDefaultFallback(() => getCachedData());

const retryResult = await retry.execute(async () => {
  return await fetchData();
});

if (!retryResult.success) {
  const fallbackResult = await fallback.execute(async () => {
    throw retryResult.lastError;
  });
  // Use fallbackResult
}
```

## Error Severity Levels

```typescript
import { ErrorSeverity } from '@claude-flow/errors';

enum ErrorSeverity {
  LOW = 'low',           // Non-critical information
  MEDIUM = 'medium',     // Should be addressed
  HIGH = 'high',         // Significant problem
  CRITICAL = 'critical', // System-threatening
}
```

## Error Categories

```typescript
import { ErrorCategory } from '@claude-flow/errors';

enum ErrorCategory {
  VALIDATION = 'validation',
  SECURITY = 'security',
  MEMORY = 'memory',
  AGENT = 'agent',
  CONFIG = 'config',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  DATABASE = 'database',
  INTERNAL = 'internal',
}
```

## Examples

### Basic Usage
See `examples/basic-usage.ts` for comprehensive examples including:
- Creating different error types
- Error handling and logging
- Serialization and PII redaction
- Retry and fallback strategies
- Error context and chaining

### Monitoring and Reporting
See `examples/monitoring.ts` for:
- Console reporting
- Batch reporting
- Tagged error reporting
- Custom monitoring backends
- Health checks
- PII redaction in reports

## API Reference

### ErrorFactory

```typescript
// Error creation methods
ErrorFactory.validation(message, context?, cause?)
ErrorFactory.security(message, context?, cause?)
ErrorFactory.memory(message, context?, cause?)
ErrorFactory.agent(message, context?, cause?)
ErrorFactory.config(message, context?, cause?)
ErrorFactory.network(message, context?, cause?)
ErrorFactory.fileSystem(message, context?, cause?)
ErrorFactory.database(message, context?, cause?)
ErrorFactory.internal(message, context?, cause?)
ErrorFactory.create(message, code, category, severity, context?, cause?)
ErrorFactory.wrap(error, message?, context?)
ErrorFactory.fromCode(code, message, context?, cause?)
```

### BaseError

```typescript
class BaseError extends Error {
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  metadata: ErrorMetadata;
  cause?: Error;

  addToChain(error: BaseError): this;
  getChain(): BaseError[];
  isRecoverable(): boolean;
  getFullMessage(): string;
  toJSON(): Record<string, unknown>;
  withContext(context: Partial<ErrorContext>): this;
  format(): string;
}
```

### ErrorHandler

```typescript
class ErrorHandler {
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler;
  static reset(): void;

  async handle(error: Error, context?: ErrorContext): Promise<void>;
  addListener(listener: ErrorListener): this;
  removeListener(listener: ErrorListener): this;
  setLogFunction(logFn: (message: string, level: LogLevel, error?: Error) => void): this;
  setPiiRedaction(enabled: boolean): this;
  getSerializer(): ErrorSerializer;
  serializeError(error: Error): string;
  formatError(error: Error, detailed?: boolean): string;
}
```

### RetryStrategy

```typescript
class RetryStrategy {
  constructor(config?: RetryConfig);
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult>;
  executeSync<T>(fn: () => T): RetryResult;
  getConfig(): Readonly<Required<RetryConfig>>;
}
```

### FallbackStrategy

```typescript
class FallbackStrategy {
  addFallback(condition: (error: Error) => boolean, handler: () => unknown, description?: string): this;
  addFallbackForCode(code: string, handler: () => unknown, description?: string): this;
  addDefaultFallback(handler: () => unknown): this;
  async execute<T>(fn: () => Promise<T>): Promise<FallbackResult<T>>;
  executeSync<T>(fn: () => T): FallbackResult<T>;
  getFallbackCount(): number;
  clear(): this;
}
```

### ErrorReporter

```typescript
class ErrorReporter {
  constructor(backend?: ReporterBackend, environment?: string, version?: string);
  async report(error: Error | BaseError, tags?: Record<string, string>, metadata?: Record<string, unknown>): Promise<string>;
  addTag(key: string, value: string): this;
  removeTag(key: string): this;
  clearTags(): this;
  async health(): Promise<boolean>;
  setBackend(backend: ReporterBackend): this;
  setPiiRedaction(enabled: boolean): this;
}
```

## Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

Coverage targets: >90% for all metrics

## Performance

- Zero-dependency core: minimal bundle size
- Lazy loading for recovery strategies
- Efficient PII pattern matching
- Stack trace parsing on creation
- Configurable logging levels

## Security

- PII detection and redaction
- Secure error chaining
- Context isolation
- Stack trace preservation (development only)
- No eval or dynamic code execution

## Contributing

See CONTRIBUTING.md for guidelines.

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/ruvnet/claude-flow/issues
- Documentation: https://github.com/ruvnet/claude-flow
