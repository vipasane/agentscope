/**
 * @claude-flow/types - Result Pattern Types Module
 *
 * Provides discriminated union types for ergonomic and type-safe Result handling.
 * The Result pattern replaces thrown exceptions with discriminated union types,
 * making error handling explicit and composable.
 *
 * ## Why the Result Pattern?
 *
 * **Traditional Error Handling (throws):**
 * ```typescript
 * function divideNumbers(a: number, b: number): number {
 *   if (b === 0) throw new Error('Division by zero');
 *   return a / b;
 * }
 *
 * // Caller must remember to handle errors
 * try {
 *   const result = divideNumbers(10, 0);
 *   console.log(result);
 * } catch (error) {
 *   console.error('Operation failed:', error);
 * }
 * ```
 *
 * **Result Pattern (discriminated union):**
 * ```typescript
 * function divideNumbers(a: number, b: number): Result<number> {
 *   if (b === 0) {
 *     return createError('DIVISION_BY_ZERO', 'Cannot divide by zero');
 *   }
 *   return createSuccess(a / b);
 * }
 *
 * // TypeScript forces error handling
 * const result = divideNumbers(10, 0);
 * if (isSuccess(result)) {
 *   console.log('Result:', result.data);
 * } else if (isError(result)) {
 *   console.error('Error:', result.code, result.message);
 * }
 * ```
 *
 * **Benefits of Result Pattern:**
 * - ✅ Errors are explicit in the type signature
 * - ✅ Caller can't forget to handle errors (TypeScript enforces it)
 * - ✅ Composable with `mapResult()` and `chainResult()`
 * - ✅ No exception overhead (results are just objects)
 * - ✅ Works perfectly with async/await via `AsyncResult<T>`
 *
 * ## Result States
 *
 * Every Result<T> is in exactly one of three states:
 * 1. **Success**: Operation succeeded, contains data of type T
 * 2. **Error**: Operation failed, contains error code, message, and details
 * 3. **Pending**: Operation is in progress (for async operations)
 *
 * @module types/common/result
 * @see {@link Success} for successful operation outcomes
 * @see {@link ErrorVariant} for error outcomes
 * @see {@link Pending} for in-progress operations
 * @see {@link Result} for the complete discriminated union
 */

/**
 * Success result variant representing a successful operation
 *
 * Indicates that an operation completed successfully and produced a value of type T.
 * The timestamp records when the success occurred for tracking and ordering.
 *
 * **Type Safety:** TypeScript's discriminated union feature ensures that accessing
 * `result.data` is only possible after checking that `result.type === 'success'`.
 *
 * @template T The type of the successful data
 *
 * @example
 * ```typescript
 * // Creating a success result
 * const success: Success<User> = {
 *   type: 'success',
 *   data: { id: '1', name: 'Alice' },
 *   timestamp: new Date()
 * };
 *
 * // Using createSuccess() helper
 * const result = createSuccess({ id: '1', name: 'Alice' });
 * // result.type === 'success'
 * // result.data === { id: '1', name: 'Alice' }
 * // result.timestamp === new Date()
 *
 * // Pattern matching with type guard
 * if (isSuccess(result)) {
 *   console.log('Success:', result.data); // TypeScript knows result.data exists
 * }
 * ```
 *
 * @see {@link createSuccess} to create Success results
 * @see {@link isSuccess} to check if result is Success
 * @see {@link Success.type} - Always the literal 'success'
 * @public
 */
export interface Success<T> {
  /** Literal type tag for discrimination in union type */
  readonly type: 'success';

  /** The successful result data of type T */
  readonly data: T;

  /** When this success occurred (ISO 8601 timestamp) */
  readonly timestamp: Date;
}

/**
 * Error result variant representing an operation failure
 *
 * Indicates that an operation failed and contains structured error information
 * for debugging and recovery. The error is represented as data, not an exception,
 * making it composable and type-safe.
 *
 * **Error Information:**
 * - `code`: Machine-readable error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
 * - `message`: Human-readable error description
 * - `details`: Optional error-specific data (field that failed, etc.)
 * - `cause`: Optional underlying error for error chaining
 * - `timestamp`: When the error occurred
 *
 * **Type Safety:** TypeScript's discriminated union ensures that accessing error
 * fields is only possible after checking that `result.type === 'error'`.
 *
 * @example
 * ```typescript
 * // Creating an error result
 * const error: ErrorVariant = {
 *   type: 'error',
 *   code: 'VALIDATION_ERROR',
 *   message: 'Invalid email format',
 *   details: { field: 'email', value: 'invalid@' },
 *   timestamp: new Date()
 * };
 *
 * // Using createError() helper (recommended)
 * const result = createError(
 *   'VALIDATION_ERROR',
 *   'Invalid email format',
 *   { field: 'email', value: 'invalid@' }
 * );
 *
 * // Pattern matching with type guard
 * if (isError(result)) {
 *   console.error(`Error: ${result.code} - ${result.message}`);
 *   console.error('Details:', result.details);
 * }
 * ```
 *
 * @see {@link createError} to create Error results
 * @see {@link isError} to check if result is Error
 * @see {@link unwrap} to extract data or throw
 * @public
 */
export interface ErrorVariant {
  /** Literal type tag for discrimination in union type */
  readonly type: 'error';

  /** Machine-readable error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  readonly code: string;

  /** Human-readable error message for end users and logging */
  readonly message: string;

  /** Optional error-specific details (failed field, constraints, etc.) */
  readonly details?: Record<string, unknown>;

  /** Optional underlying Error for error chaining and debugging */
  readonly cause?: Error;

  /** When this error occurred (ISO 8601 timestamp) */
  readonly timestamp: Date;
}

/**
 * Pending result variant representing an in-progress async operation
 *
 * Indicates that an operation is still in progress and hasn't completed yet.
 * Used primarily with async/await patterns to represent loading states.
 *
 * **Use Cases:**
 * - Representing async operations that haven't resolved yet
 * - Progress tracking (reason = "processing item 5 of 10")
 * - Metadata about what's currently happening
 *
 * **Type Safety:** Cannot access success data until operation completes and
 * result transitions to Success or Error.
 *
 * @template T The expected type when the operation successfully completes
 *
 * @example
 * ```typescript
 * // Creating a pending result
 * const pending: Pending<User> = {
 *   type: 'pending',
 *   reason: 'Loading user data from database',
 *   metadata: { elapsed: 150, total: 500 }
 * };
 *
 * // Using createPending() helper
 * const result = createPending<User>(
 *   'Fetching user details',
 *   { userId: '123' }
 * );
 *
 * // Pattern matching - cannot access data yet
 * if (isPending(result)) {
 *   console.log(`Loading: ${result.reason}`);
 * } else if (isSuccess(result)) {
 *   // Now result.data is accessible
 *   console.log('User:', result.data);
 * }
 * ```
 *
 * @see {@link createPending} to create Pending results
 * @see {@link isPending} to check if result is Pending
 * @see {@link AsyncResult} for Promise-based results
 * @public
 */
export interface Pending<T> {
  /** Literal type tag for discrimination in union type */
  readonly type: 'pending';

  /** Description of what's pending (e.g., "Loading user data") */
  readonly reason?: string;

  /** Optional metadata about progress (elapsed time, current item, etc.) */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Discriminated union type combining all result variants
 *
 * Result<T> is a discriminated union representing the outcome of an operation.
 * It can be in exactly one of three states: Success<T>, ErrorVariant, or Pending<T>.
 *
 * **Exhaustive Pattern Matching:**
 * TypeScript enforces that all three variants are handled when using switch/if statements.
 * This makes bugs like "forgot to handle error case" compile-time errors instead of
 * silent failures.
 *
 * @template T The type of successful data
 *
 * @example
 * ```typescript
 * // Function returning Result
 * function validateEmail(email: string): Result<string> {
 *   if (!email.includes('@')) {
 *     return createError('INVALID_EMAIL', 'Email must contain @');
 *   }
 *   return createSuccess(email);
 * }
 *
 * // Exhaustive pattern matching - TypeScript ensures all cases handled
 * function handleValidation(result: Result<string>): void {
 *   switch (result.type) {
 *     case 'success':
 *       console.log('Valid email:', result.data); // result.data: string
 *       break;
 *     case 'error':
 *       console.error(`Error: ${result.code}`); // result.code: string
 *       break;
 *     case 'pending':
 *       console.log('Validating...');
 *       break;
 *     // ✅ TypeScript error if any case is missing
 *   }
 * }
 *
 * // Type guard pattern matching
 * const result = validateEmail('alice@example.com');
 *
 * if (isSuccess(result)) {
 *   console.log('Success:', result.data);
 * } else if (isError(result)) {
 *   console.error('Error:', result.message);
 * } else if (isPending(result)) {
 *   console.log('Loading...');
 * }
 *
 * // Monadic composition
 * const nextResult = mapResult(result, email => email.toLowerCase());
 * const chained = chainResult(result, email => validateLength(email));
 * ```
 *
 * @see {@link Success} for successful operation outcome
 * @see {@link ErrorVariant} for operation failure
 * @see {@link Pending} for in-progress operation
 * @see {@link isSuccess}, {@link isError}, {@link isPending} for type guards
 * @see {@link mapResult}, {@link chainResult} for monadic composition
 * @public
 */
export type Result<T> = Success<T> | ErrorVariant | Pending<T>;

/**
 * Async result type for Promise-based operations
 *
 * Represents an asynchronous operation that will eventually resolve to a Result<T>.
 * This is useful for operations that may take time (network requests, database queries, etc.).
 *
 * **Difference from Result:**
 * - `Result<T>`: Synchronous result already available
 * - `AsyncResult<T>`: Promise that resolves to a Result<T>
 *
 * @template T The type of successful data when the Promise resolves
 *
 * @example
 * ```typescript
 * // Function returning AsyncResult
 * async function fetchUser(id: string): AsyncResult<User> {
 *   try {
 *     const response = await fetch(`/api/users/${id}`);
 *     if (!response.ok) {
 *       return createError('NOT_FOUND', `User ${id} not found`);
 *     }
 *     const user = await response.json();
 *     return createSuccess(user);
 *   } catch (error) {
 *     return createError('NETWORK_ERROR', 'Failed to fetch user', { error });
 *   }
 * }
 *
 * // Using with async/await
 * async function getUserInfo(id: string): Promise<void> {
 *   const result = await fetchUser(id);
 *   if (isSuccess(result)) {
 *     console.log('User:', result.data);
 *   } else if (isError(result)) {
 *     console.error('Error:', result.message);
 *   }
 * }
 * ```
 *
 * @see {@link Result} for synchronous results
 * @public
 */
export type AsyncResult<T> = Promise<Result<T>>;

/**
 * Create a successful Result containing the given data
 *
 * Factory function for creating Success results. Sets the timestamp to the current time.
 * This is the primary way to indicate that an operation succeeded.
 *
 * **When to use:**
 * - Operation completed successfully and produced a value
 * - Returning from functions that return Result<T>
 * - Wrapping successful async operation outcomes
 *
 * @template T The type of the successful data
 * @param data The successful operation result data (can be any type)
 * @returns Success<T> result with current timestamp
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = createSuccess(42);
 * // result.type === 'success'
 * // result.data === 42
 * // result.timestamp === new Date() (approximately)
 *
 * // With complex data
 * const user: Result<User> = createSuccess({
 *   id: '123',
 *   name: 'Alice',
 *   email: 'alice@example.com'
 * });
 *
 * // In a function
 * function parseJSON(text: string): Result<unknown> {
 *   try {
 *     return createSuccess(JSON.parse(text));
 *   } catch (error) {
 *     return createError('PARSE_ERROR', 'Invalid JSON');
 *   }
 * }
 * ```
 *
 * @see {@link Success} for the returned type
 * @see {@link isSuccess} to check if a result is success
 * @see {@link unwrap} to extract data
 * @public
 */
export function createSuccess<T>(data: T): Success<T> {
  return {
    type: 'success',
    data,
    timestamp: new Date(),
  };
}

/**
 * Create an error Result with structured error information
 *
 * Factory function for creating ErrorVariant results. Provides structured error
 * information including code, message, optional details, and optional cause.
 *
 * **Error Code Convention:**
 * Use SCREAMING_SNAKE_CASE for error codes:
 * - `VALIDATION_ERROR` - Input validation failed
 * - `NOT_FOUND` - Resource doesn't exist
 * - `PERMISSION_DENIED` - Authorization failed
 * - `INTERNAL_ERROR` - Unexpected server error
 * - `TIMEOUT` - Operation took too long
 *
 * **When to use:**
 * - Operation failed and needs to report an error
 * - Returning from functions that return Result<T>
 * - Wrapping or transforming error information
 *
 * @param code Machine-readable error code (e.g., 'VALIDATION_ERROR')
 * @param message Human-readable error message for logging and users
 * @param details Optional error-specific data (field name, validation rules, etc.)
 * @param cause Optional underlying Error for error chaining and debugging
 * @returns ErrorVariant result with current timestamp
 *
 * @example
 * ```typescript
 * // Basic error
 * const result = createError('NOT_FOUND', 'User not found');
 *
 * // With details
 * const validationError = createError(
 *   'VALIDATION_ERROR',
 *   'Invalid email format',
 *   { field: 'email', value: 'invalid@' }
 * );
 *
 * // With cause (error chaining)
 * try {
 *   await database.query(sql);
 * } catch (dbError) {
 *   return createError(
 *     'DATABASE_ERROR',
 *     'Failed to fetch user',
 *     { userId: '123' },
 *     dbError
 *   );
 * }
 *
 * // In a function
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) {
 *     return createError(
 *       'DIVISION_BY_ZERO',
 *       'Cannot divide by zero',
 *       { divisor: b }
 *     );
 *   }
 *   return createSuccess(a / b);
 * }
 * ```
 *
 * @see {@link ErrorVariant} for the returned type
 * @see {@link isError} to check if a result is error
 * @see {@link unwrap} to extract data or throw
 * @public
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
 * Create a pending Result indicating an in-progress operation
 *
 * Factory function for creating Pending results. Used to represent operations
 * that are still in progress and haven't completed yet.
 *
 * **When to use:**
 * - Operation is loading/processing and hasn't completed
 * - Need to represent intermediate state in async operation
 * - Tracking progress of long-running tasks
 *
 * **Note:** In most modern async code, you typically don't need Pending results
 * because you use async/await which naturally waits for completion. Pending is
 * more useful for UI state management or special cases.
 *
 * @template T The expected type when operation completes successfully
 * @param reason Optional description of what's pending (e.g., "Loading user data")
 * @param metadata Optional metadata about progress (elapsed time, current item, etc.)
 * @returns Pending<T> result
 *
 * @example
 * ```typescript
 * // Basic pending
 * const loading = createPending<User>('Fetching user data');
 *
 * // With progress metadata
 * const processing = createPending<number[]>(
 *   'Processing items',
 *   { current: 5, total: 100 }
 * );
 *
 * // Pattern matching
 * const result = someAsyncOperation();
 * if (isPending(result)) {
 *   console.log(`Still ${result.reason}`);
 *   if (result.metadata?.current) {
 *     console.log(`Progress: ${result.metadata.current}/${result.metadata.total}`);
 *   }
 * }
 * ```
 *
 * @see {@link Pending} for the returned type
 * @see {@link isPending} to check if a result is pending
 * @public
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
 * Type guard function to narrow Result to Success variant
 *
 * Narrows the type of a Result<T> discriminated union to Success<T>,
 * making `result.data` accessible.
 *
 * **Type Narrowing:**
 * Before: `result.data` - Error: type doesn't have 'data' property
 * After: `result.data` - OK: TypeScript knows result is Success<T>
 *
 * @template T The data type
 * @param result The result to check
 * @returns True if result.type === 'success', false otherwise
 *
 * @example
 * ```typescript
 * const result: Result<number> = createSuccess(42);
 *
 * // Without type guard - ERROR
 * console.log(result.data); // ❌ Property 'data' doesn't exist on Result<number>
 *
 * // With type guard - OK
 * if (isSuccess(result)) {
 *   console.log(result.data); // ✅ result.data: number
 * }
 *
 * // Pattern matching
 * if (isSuccess(result)) {
 *   return result.data * 2;
 * } else if (isError(result)) {
 *   console.error(result.message);
 * }
 * ```
 *
 * @see {@link isError} to check for ErrorVariant
 * @see {@link isPending} to check for Pending
 * @see {@link unwrap} to extract data or throw
 * @public
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.type === 'success';
}

/**
 * Type guard function to narrow Result to ErrorVariant
 *
 * Narrows the type of a Result<T> discriminated union to ErrorVariant,
 * making `result.code` and `result.message` accessible.
 *
 * **Type Narrowing:**
 * Before: `result.code` - Error: type doesn't have 'code' property
 * After: `result.code` - OK: TypeScript knows result is ErrorVariant
 *
 * @template T The data type
 * @param result The result to check
 * @returns True if result.type === 'error', false otherwise
 *
 * @example
 * ```typescript
 * const result: Result<User> = createError('NOT_FOUND', 'User not found');
 *
 * // Without type guard - ERROR
 * console.log(result.message); // ❌ Property 'message' doesn't exist
 *
 * // With type guard - OK
 * if (isError(result)) {
 *   console.error(`${result.code}: ${result.message}`);
 *   if (result.details) {
 *     console.error('Details:', result.details);
 *   }
 * }
 *
 * // Pattern matching
 * if (isError(result)) {
 *   handleError(result.code, result.message);
 * } else if (isSuccess(result)) {
 *   processUser(result.data);
 * }
 * ```
 *
 * @see {@link isSuccess} to check for Success
 * @see {@link isPending} to check for Pending
 * @public
 */
export function isError<T>(result: Result<T>): result is ErrorVariant {
  return result.type === 'error';
}

/**
 * Type guard function to narrow Result to Pending variant
 *
 * Narrows the type of a Result<T> discriminated union to Pending<T>,
 * making `result.reason` and `result.metadata` accessible.
 *
 * **Type Narrowing:**
 * Before: `result.reason` - Error: type doesn't have 'reason' property
 * After: `result.reason` - OK: TypeScript knows result is Pending<T>
 *
 * @template T The expected data type
 * @param result The result to check
 * @returns True if result.type === 'pending', false otherwise
 *
 * @example
 * ```typescript
 * const result: Result<User> = createPending('Loading user...');
 *
 * // Without type guard - ERROR
 * console.log(result.reason); // ❌ Property 'reason' doesn't exist
 *
 * // With type guard - OK
 * if (isPending(result)) {
 *   console.log(`Still ${result.reason}`);
 *   showLoadingSpinner();
 * }
 *
 * // Pattern matching with progress tracking
 * if (isPending(result)) {
 *   const progress = result.metadata?.current / result.metadata?.total;
 *   updateProgressBar(progress);
 * } else if (isSuccess(result)) {
 *   hideLoadingSpinner();
 *   displayUser(result.data);
 * }
 * ```
 *
 * @see {@link isSuccess} to check for Success
 * @see {@link isError} to check for ErrorVariant
 * @public
 */
export function isPending<T>(result: Result<T>): result is Pending<T> {
  return result.type === 'pending';
}

/**
 * Extract success data or throw an error
 *
 * Unwraps a Result<T>, returning the data if successful or throwing an error
 * if the result is an error or pending. Use this when you're certain the
 * result should be a success and you want to fail fast on error.
 *
 * **When to use:**
 * - You're certain the result should succeed
 * - You want to fail fast if there's an error
 * - You're in a try/catch block ready to handle failures
 *
 * **When NOT to use:**
 * - You have a default value to use if result fails (use `unwrapOr` instead)
 * - You want to handle errors gracefully
 * - The result might actually be an error (dangerous!)
 *
 * @template T The success data type
 * @param result The result to unwrap
 * @returns The success data (result.data)
 *
 * @throws {Error} If result is not Success (either Error or Pending)
 *
 * @example
 * ```typescript
 * const result = createSuccess(42);
 * const value = unwrap(result); // value === 42
 *
 * const error = createError('FAIL', 'Something failed');
 * const bad = unwrap(error); // ❌ Throws: Cannot unwrap error result: Something failed
 *
 * // Safe usage with try/catch
 * try {
 *   const data = unwrap(result);
 *   console.log('Success:', data);
 * } catch (error) {
 *   console.error('Failed to unwrap:', error.message);
 * }
 * ```
 *
 * @see {@link unwrapOr} for providing a default value
 * @see {@link mapResult} for transforming success data
 * @public
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.type === 'success') {
    return result.data;
  }
  const errorMsg = result.type === 'error' ? result.message : 'Unknown error';
  throw new Error(`Cannot unwrap ${result.type} result: ${errorMsg}`);
}

/**
 * Extract success data with a fallback default value
 *
 * Unwraps a Result<T>, returning the data if successful or the default value
 * if the result is an error or pending. Use this when you have a sensible
 * default to use if the operation fails.
 *
 * **When to use:**
 * - You have a sensible default value for failures
 * - You want graceful degradation
 * - You want to avoid exceptions for expected failures
 *
 * @template T The success data type
 * @param result The result to extract from
 * @param defaultValue The value to return if result is not success
 * @returns The success data or the default value
 *
 * @example
 * ```typescript
 * const success = createSuccess(42);
 * const value = unwrapOr(success, 0); // value === 42
 *
 * const error = createError('FAIL', 'Failed');
 * const fallback = unwrapOr(error, 0); // fallback === 0
 *
 * // Practical example
 * function getCacheOrDefault(key: string): string {
 *   const result = cache.get(key);
 *   return unwrapOr(result, ''); // Default to empty string
 * }
 *
 * // With complex defaults
 * const userResult = fetchUser('123');
 * const user = unwrapOr(userResult, {
 *   id: 'unknown',
 *   name: 'Anonymous',
 *   email: 'unknown@example.com'
 * });
 * ```
 *
 * @see {@link unwrap} for failing fast on error
 * @see {@link mapResult} for transforming success data
 * @public
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.type === 'success') {
    return result.data;
  }
  return defaultValue;
}

/**
 * Transform a success Result<T> into a Result<U> by mapping the data
 *
 * Applies a mapping function to the success data, leaving errors and pending
 * results unchanged. This is useful for chaining transformations on successful results.
 *
 * **When to use:**
 * - Transform successful data to a different type
 * - Chain multiple transformations together
 * - Apply validation or processing to success data
 *
 * **When NOT to use:**
 * - You need to return a new Result from the function (use `chainResult`)
 * - You want to handle errors specially
 *
 * @template T The input success data type
 * @template U The output success data type
 * @param result The result to transform
 * @param fn Function to apply to success data, returns transformed data
 * @returns Result with transformed success data, or same error/pending
 *
 * @example
 * ```typescript
 * // Basic transformation
 * const numResult: Result<number> = createSuccess(10);
 * const doubled = mapResult(numResult, n => n * 2); // Result<number> with 20
 *
 * // Type transformation
 * const userIdResult: Result<string> = createSuccess('user-123');
 * const idObj = mapResult(userIdResult, id => ({ userId: id })); // Result<{userId: string}>
 *
 * // Chaining transformations
 * const userIdResult = createSuccess('user-123');
 * const result = mapResult(userIdResult, id => id.toUpperCase())
 *   |> (r => mapResult(r, uppercase => ({ id: uppercase })));
 *
 * // Error passes through unchanged
 * const error: Result<number> = createError('FAIL', 'Failed');
 * const mapped = mapResult(error, n => n * 2); // Still an error Result
 * ```
 *
 * @see {@link chainResult} for mapping to new Result types
 * @see {@link unwrap}, {@link unwrapOr} for extracting data
 * @public
 */
export function mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (result.type === 'success') {
    return createSuccess(fn(result.data));
  }
  return result as unknown as Result<U>;
}

/**
 * Chain or flatMap Results together for monadic composition
 *
 * Applies a function that returns a new Result to a success Result, allowing
 * composing multiple operations that each return Results. Error and pending
 * results pass through unchanged without applying the function.
 *
 * **When to use:**
 * - Chaining operations that each return Results
 * - Handling errors from intermediate operations
 * - Applying conditional logic based on success data
 *
 * **Example flow:**
 * Operation 1 (Result) -> If success, apply Operation 2 -> Result
 *
 * @template T The input success data type
 * @template U The output success data type
 * @param result The result to chain from
 * @param fn Function that takes success data and returns a new Result<U>
 * @returns The new Result<U> from the function, or same error/pending
 *
 * @example
 * ```typescript
 * // Chaining parse and validation
 * function parseAndValidate(json: string): Result<ParsedData> {
 *   const parseResult = parseJson(json); // Result<unknown>
 *   const validated = chainResult(parseResult, data => {
 *     // If parseResult was success, validate the data
 *     // If parseResult was error, this function is never called
 *     return validateSchema(data); // Result<ParsedData>
 *   });
 *   return validated; // Result<ParsedData>
 * }
 *
 * // Practical async example
 * async function getUserWithPosts(userId: string): AsyncResult<UserWithPosts> {
 *   const userResult = await fetchUser(userId);
 *   return chainResult(userResult, user => {
 *     // Only called if fetchUser succeeded
 *     return fetchUserPosts(user.id); // Result<Post[]>
 *   });
 * }
 *
 * // Multiple chains
 * const result = validateInput(input)
 *   |> (r => chainResult(r, input => authenticate(input)))
 *   |> (r => chainResult(r, user => authorize(user)))
 *   |> (r => chainResult(r, user => loadProfile(user)));
 * ```
 *
 * @see {@link mapResult} for transforming without changing Result type
 * @see {@link unwrap}, {@link unwrapOr} for extracting data
 * @public
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
