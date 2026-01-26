/**
 * Basic error handling usage examples
 */

import { ErrorFactory, BaseError } from '../src/base/index.js';
import { ErrorHandler, LogLevel } from '../src/handler/error-handler.js';
import { ErrorSerializer } from '../src/serializer/error-serializer.js';
import { RetryStrategy, FallbackStrategy } from '../src/recovery/index.js';

// ===== 1. Creating Errors =====

async function creatingErrors() {
  console.log('\n=== Creating Errors ===');

  // Create validation error
  const validationError = ErrorFactory.validation('Email must be valid', {
    field: 'email',
    value: 'invalid-email',
  });

  // Create security error
  const securityError = ErrorFactory.security('Unauthorized access attempt', {
    userId: 'user123',
    operation: 'delete_account',
  });

  // Create network error
  const networkError = ErrorFactory.network('Connection timeout', {
    endpoint: 'https://api.example.com',
    timeout: 5000,
  });

  // Create custom error with chaining
  const cause = new Error('Original database error');
  const dbError = ErrorFactory.database('Query failed', {}, cause);

  console.log('Created errors:');
  console.log(`- Validation: ${validationError.message}`);
  console.log(`- Security: ${securityError.message}`);
  console.log(`- Network: ${networkError.message}`);
  console.log(`- Database with cause: ${dbError.getFullMessage()}`);
}

// ===== 2. Error Handling =====

async function errorHandling() {
  console.log('\n=== Error Handling ===');

  const handler = ErrorHandler.getInstance({
    environment: 'development',
    enablePiiRedaction: true,
  });

  // Add custom error listener
  handler.addListener({
    onError: async (error, context) => {
      console.log(`[Listener] Error occurred: ${error.message}`);
      if (context?.userId) {
        console.log(`[Listener] Affected user: ${context.userId}`);
      }
    },
  });

  // Handle an error
  const error = ErrorFactory.agent('Agent execution failed', {
    agentId: 'agent-001',
    operation: 'process_data',
  });

  await handler.handle(error, { userId: 'user123' });

  // Serialize error
  const serialized = handler.serializeError(error);
  console.log('Serialized error:', serialized);

  // Format for display
  const formatted = handler.formatError(error, true);
  console.log('Formatted error:', formatted);
}

// ===== 3. Error Serialization =====

function errorSerialization() {
  console.log('\n=== Error Serialization ===');

  const serializer = new ErrorSerializer(true); // Enable PII redaction

  const error = ErrorFactory.validation(
    'User john@example.com with phone 555-123-4567 failed login'
  );

  // Add custom redaction
  serializer.addRedaction(/api_key_\w+/, '[REDACTED_KEY]');

  // Serialize with PII redaction
  const serialized = serializer.serialize(error);
  console.log('Redacted message:', serialized.message);

  // Convert to JSON
  const json = serializer.toJSON(error, true, true);
  console.log('JSON representation:', json);

  // Format for logging
  const formatted = serializer.format(error, true);
  console.log('Log format:', formatted);
}

// ===== 4. Retry Strategy =====

async function retryStrategy() {
  console.log('\n=== Retry Strategy ===');

  const retry = new RetryStrategy({
    maxRetries: 3,
    initialDelayMs: 100,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    onRetry: (attempt, delay, error) => {
      console.log(
        `[Retry ${attempt}] Failed with: ${error.message}, retrying in ${delay}ms`
      );
    },
  });

  // Simulate operation with retries
  let attempts = 0;
  const result = await retry.execute(async () => {
    attempts++;
    console.log(`[Attempt ${attempts}] Executing operation...`);

    if (attempts < 2) {
      throw ErrorFactory.network('Connection timeout');
    }

    return { data: 'success' };
  });

  console.log('Retry result:', result);
}

// ===== 5. Fallback Strategy =====

async function fallbackStrategy() {
  console.log('\n=== Fallback Strategy ===');

  const fallback = new FallbackStrategy();

  // Add network fallback
  fallback.addFallbackForCode('NETWORK_001', () => {
    console.log('[Fallback] Using cached data due to network error');
    return { data: 'cached_data' };
  });

  // Add default fallback
  fallback.addDefaultFallback(() => {
    console.log('[Fallback] Using default value');
    return { data: 'default' };
  });

  // Execute with fallback
  const result = await fallback.execute(async () => {
    throw ErrorFactory.network('Connection failed');
  });

  console.log('Fallback result:', result);
}

// ===== 6. Combined Retry + Fallback =====

async function combinedRecovery() {
  console.log('\n=== Combined Retry + Fallback ===');

  const retry = new RetryStrategy({
    maxRetries: 2,
    initialDelayMs: 50,
  });

  const fallback = new FallbackStrategy();
  fallback.addDefaultFallback(() => ({
    cached: true,
    data: 'fallback_data',
  }));

  // Try with retry first
  const retryResult = await retry.execute(async () => {
    console.log('[Retry] Attempting operation...');
    throw ErrorFactory.network('Service unavailable');
  });

  if (!retryResult.success) {
    console.log('[Recovery] Retries exhausted, using fallback...');
    const fallbackResult = await fallback.execute(async () => {
      throw retryResult.lastError!;
    });

    console.log('Final result:', fallbackResult);
  }
}

// ===== 7. Error Context =====

function errorContext() {
  console.log('\n=== Error Context ===');

  // Create error with rich context
  const error = ErrorFactory.agent('Agent processing failed', {
    operation: 'batch_processing',
    component: 'data_processor',
    environment: 'production',
    sessionId: 'sess-123456',
    requestId: 'req-789012',
    metadata: {
      batchSize: 100,
      processedItems: 45,
      failedAt: 'item_47',
    },
  });

  // Add additional context
  const enrichedError = error.withContext({
    userId: 'user456',
  });

  console.log('Original context:', error.context);
  console.log('Enriched context:', enrichedError.context);
}

// ===== 8. Error Chaining =====

function errorChaining() {
  console.log('\n=== Error Chaining ===');

  // Create error with cause chain
  const rootCause = new Error('Database connection pool exhausted');

  const dbError = ErrorFactory.database('Query execution failed', {}, rootCause);

  const apiError = ErrorFactory.network('API request failed', {}, dbError);

  // Get full error chain
  console.log('Full chain:', apiError.getFullMessage());

  // Serialize with chain
  const serializer = new ErrorSerializer();
  const serialized = serializer.serialize(apiError);

  console.log('Serialized chain:', JSON.stringify(serialized, null, 2));
}

// ===== Main =====

async function main() {
  try {
    await creatingErrors();
    await errorHandling();
    errorSerialization();
    await retryStrategy();
    await fallbackStrategy();
    await combinedRecovery();
    errorContext();
    errorChaining();
  } catch (error) {
    console.error('Example error:', error);
  }
}

main();
