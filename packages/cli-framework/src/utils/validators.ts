/**
 * Validation utilities for command arguments and options
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a value is a non-empty string
 */
export function validateRequired(value: unknown, field: string): string {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${field} is required`, field, value);
  }
  return String(value);
}

/**
 * Validate that a value is a number
 */
export function validateNumber(value: unknown, field: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${field} must be a number`, field, value);
  }
  return num;
}

/**
 * Validate that a value is a boolean
 */
export function validateBoolean(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const str = String(value).toLowerCase();
  if (str === 'true' || str === '1' || str === 'yes') {
    return true;
  }
  if (str === 'false' || str === '0' || str === 'no') {
    return false;
  }
  throw new ValidationError(`${field} must be a boolean`, field, value);
}

/**
 * Validate that a value is one of the allowed choices
 */
export function validateChoice<T>(
  value: unknown,
  choices: T[],
  field: string
): T {
  if (!choices.includes(value as T)) {
    throw new ValidationError(
      `${field} must be one of: ${choices.join(', ')}`,
      field,
      value
    );
  }
  return value as T;
}

/**
 * Validate that a value is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  field: string
): number {
  if (value < min || value > max) {
    throw new ValidationError(
      `${field} must be between ${min} and ${max}`,
      field,
      value
    );
  }
  return value;
}

/**
 * Validate that a value matches a pattern
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  field: string,
  message?: string
): string {
  if (!pattern.test(value)) {
    throw new ValidationError(
      message || `${field} does not match required pattern`,
      field,
      value
    );
  }
  return value;
}

/**
 * Validate an email address
 */
export function validateEmail(value: string, field: string): string {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validatePattern(value, emailPattern, field, `${field} must be a valid email`);
}

/**
 * Validate a URL
 */
export function validateUrl(value: string, field: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    throw new ValidationError(`${field} must be a valid URL`, field, value);
  }
}

/**
 * Validate a file path exists
 */
export async function validateFileExists(value: string, field: string): Promise<string> {
  const { access } = await import('fs/promises');
  try {
    await access(value);
    return value;
  } catch {
    throw new ValidationError(`${field}: file not found: ${value}`, field, value);
  }
}

/**
 * Custom validator builder
 */
export function createValidator<T>(
  validate: (value: unknown) => boolean,
  message: string
): (value: unknown, field: string) => T {
  return (value: unknown, field: string): T => {
    if (!validate(value)) {
      throw new ValidationError(message, field, value);
    }
    return value as T;
  };
}
