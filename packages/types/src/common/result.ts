/**
 * @claude-flow/types - Common Result Types
 *
 * Provides discriminated union types for Result handling with strict type safety.
 * Uses discriminated unions to ensure exhaustive pattern matching in TypeScript.
 *
 * @module types/common/result
 */

/**
 * Success result variant with data of generic type T
 *
 * @template T The type of successful data
 *
 * @example
 * ```typescript
 * const success: Success<User> = {
 *   type: 'success',
 *   data: { id: '1', name: 'Alice' }
 * };
 * ```
 */
export interface Success<T> {
  readonly type: 'success';
  readonly data: T;
  readonly timestamp: Date;
}

/**
 * Error result variant with error information
 *
 * @example
 * ```typescript
 * const error: Error = {
 *   type: 'error',
 *   code: 'VALIDATION_ERROR',
 *   message: 'Invalid input',
 *   details: { field: 'email' }
 * };
 * ```
 */
export interface ErrorVariant {
  readonly type: 'error';
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
  readonly timestamp: Date;
}

/**
 * Pending result variant indicating async operation in progress
 *
 * @template T The expected type when resolved
 */
export interface Pending<T> {
  readonly type: 'pending';
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Discriminated union type combining all result variants
 *
 * @template T The success data type
 *
 * Use pattern matching to handle results:
 * ```typescript
 * function handleResult<T>(result: Result<T>): void {
 *   switch (result.type) {
 *     case 'success':
 *       console.log(result.data); // Type: T
 *       break;
 *     case 'error':
 *       console.error(result.message); // Type: string
 *       break;
 *     case 'pending':
 *       console.log('Loading...');
 *       break;
 *   }
 * }
 * ```
 */
export type Result<T> = Success<T> | ErrorVariant | Pending<T>;

/**
 * Async result type for Promise-based operations
 *
 * @template T The success data type
 */
export type AsyncResult<T> = Promise<Result<T>>;

/**
 * Helper to create a success result
 *
 * @template T The data type
 * @param data The successful result data
 * @returns Success result
 */
export function createSuccess<T>(data: T): Success<T> {
  return {
    type: 'success',
    data,
    timestamp: new Date(),
  };
}

/**
 * Helper to create an error result
 *
 * @param code Error code
 * @param message Error message
 * @param details Optional error details
 * @param cause Optional underlying error
 * @returns Error result
 */
export function createError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  cause?: Error
): ErrorVariant {
  return {
    type: 'error',
    code,
    message,
    details,
    cause,
    timestamp: new Date(),
  };
}

/**
 * Helper to create a pending result
 *
 * @template T The expected type
 * @param reason Optional reason for pending state
 * @param metadata Optional metadata
 * @returns Pending result
 */
export function createPending<T>(
  reason?: string,
  metadata?: Record<string, unknown>
): Pending<T> {
  return {
    type: 'pending',
    reason,
    metadata,
  };
}

/**
 * Type guard to check if result is success
 *
 * @template T The data type
 * @param result The result to check
 * @returns True if result is success
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.type === 'success';
}

/**
 * Type guard to check if result is error
 *
 * @template T The data type
 * @param result The result to check
 * @returns True if result is error
 */
export function isError<T>(result: Result<T>): result is ErrorVariant {
  return result.type === 'error';
}

/**
 * Type guard to check if result is pending
 *
 * @template T The data type
 * @param result The result to check
 * @returns True if result is pending
 */
export function isPending<T>(result: Result<T>): result is Pending<T> {
  return result.type === 'pending';
}

/**
 * Extract success data or throw error
 *
 * @template T The data type
 * @param result The result to extract from
 * @returns The success data or throws
 * @throws ErrorVariant if result is not success
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.type === 'success') {
    return result.data;
  }
  const errorMsg = result.type === 'error' ? result.message : 'Unknown error';
  throw new Error(`Cannot unwrap ${result.type} result: ${errorMsg}`);
}

/**
 * Extract success data with default fallback
 *
 * @template T The data type
 * @param result The result to extract from
 * @param defaultValue The default value if not success
 * @returns Success data or default value
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.type === 'success') {
    return result.data;
  }
  return defaultValue;
}

/**
 * Map success result to another value
 *
 * @template T Input data type
 * @template U Output data type
 * @param result The result to map
 * @param fn Mapping function
 * @returns Mapped result
 */
export function mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (result.type === 'success') {
    return createSuccess(fn(result.data));
  }
  return result as unknown as Result<U>;
}

/**
 * Chain results together (flatMap)
 *
 * @template T Input data type
 * @template U Output data type
 * @param result The result to chain
 * @param fn Function returning new result
 * @returns Chained result
 */
export function chainResult<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>
): Result<U> {
  if (result.type === 'success') {
    return fn(result.data);
  }
  return result as unknown as Result<U>;
}
