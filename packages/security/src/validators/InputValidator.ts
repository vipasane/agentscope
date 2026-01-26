/**
 * Layer 1: Input Protection & Validation
 *
 * Zero-dependency input validation using a lightweight Zod-style API.
 * Provides schema validation, type checking, and sanitization.
 */

import { ValidationResult } from '../utils/types.js';

export type ZodType<T> = {
  parse(input: unknown): T;
  safeParse(input: unknown): ValidationResult<T>;
  optional(): ZodType<T | undefined>;
  nullable(): ZodType<T | null>;
};

/**
 * Input validator with Zod-style API
 * Performance: <50ms for typical validation operations
 */
export class InputValidator {
  private static readonly MAX_STRING_LENGTH = 100000;
  private static readonly MAX_ARRAY_LENGTH = 10000;

  /**
   * String validator
   */
  static string(options?: {
    min?: number;
    max?: number;
    regex?: RegExp;
    email?: boolean;
    url?: boolean;
  }): ZodType<string> {
    return {
      parse: (input: unknown): string => {
        const result = this.validateString(input, options);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      safeParse: (input: unknown): ValidationResult<string> => {
        return this.validateString(input, options);
      },
      optional: () => this.optional(this.string(options)),
      nullable: () => this.nullable(this.string(options))
    };
  }

  /**
   * Number validator
   */
  static number(options?: {
    min?: number;
    max?: number;
    int?: boolean;
  }): ZodType<number> {
    return {
      parse: (input: unknown): number => {
        const result = this.validateNumber(input, options);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      safeParse: (input: unknown): ValidationResult<number> => {
        return this.validateNumber(input, options);
      },
      optional: () => this.optional(this.number(options)),
      nullable: () => this.nullable(this.number(options))
    };
  }

  /**
   * Boolean validator
   */
  static boolean(): ZodType<boolean> {
    return {
      parse: (input: unknown): boolean => {
        if (typeof input !== 'boolean') {
          throw new Error('Expected boolean');
        }
        return input;
      },
      safeParse: (input: unknown): ValidationResult<boolean> => {
        if (typeof input !== 'boolean') {
          return { success: false, error: 'Expected boolean' };
        }
        return { success: true, data: input };
      },
      optional: () => this.optional(this.boolean()),
      nullable: () => this.nullable(this.boolean())
    };
  }

  /**
   * Array validator
   */
  static array<T>(itemValidator: ZodType<T>): ZodType<T[]> {
    return {
      parse: (input: unknown): T[] => {
        const result = this.validateArray(input, itemValidator);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      safeParse: (input: unknown): ValidationResult<T[]> => {
        return this.validateArray(input, itemValidator);
      },
      optional: () => this.optional(this.array(itemValidator)),
      nullable: () => this.nullable(this.array(itemValidator))
    };
  }

  /**
   * Object validator
   */
  static object<T extends Record<string, any>>(
    shape: { [K in keyof T]: ZodType<T[K]> }
  ): ZodType<T> {
    return {
      parse: (input: unknown): T => {
        const result = this.validateObject(input, shape);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      safeParse: (input: unknown): ValidationResult<T> => {
        return this.validateObject(input, shape);
      },
      optional: () => this.optional(this.object(shape)),
      nullable: () => this.nullable(this.object(shape))
    };
  }

  /**
   * Enum validator
   */
  static enum<T extends string>(values: readonly T[]): ZodType<T> {
    return {
      parse: (input: unknown): T => {
        if (typeof input !== 'string' || !values.includes(input as T)) {
          throw new Error(`Expected one of: ${values.join(', ')}`);
        }
        return input as T;
      },
      safeParse: (input: unknown): ValidationResult<T> => {
        if (typeof input !== 'string' || !values.includes(input as T)) {
          return { success: false, error: `Expected one of: ${values.join(', ')}` };
        }
        return { success: true, data: input as T };
      },
      optional: () => this.optional(this.enum(values)),
      nullable: () => this.nullable(this.enum(values))
    };
  }

  /**
   * Literal validator
   */
  static literal<T extends string | number | boolean>(value: T): ZodType<T> {
    return {
      parse: (input: unknown): T => {
        if (input !== value) {
          throw new Error(`Expected literal value: ${value}`);
        }
        return value;
      },
      safeParse: (input: unknown): ValidationResult<T> => {
        if (input !== value) {
          return { success: false, error: `Expected literal value: ${value}` };
        }
        return { success: true, data: value };
      },
      optional: () => this.optional(this.literal(value)),
      nullable: () => this.nullable(this.literal(value))
    };
  }

  /**
   * Optional wrapper
   */
  static optional<T>(validator: ZodType<T>): ZodType<T | undefined> {
    return {
      parse: (input: unknown): T | undefined => {
        if (input === undefined) return undefined;
        return validator.parse(input);
      },
      safeParse: (input: unknown): ValidationResult<T | undefined> => {
        if (input === undefined) return { success: true, data: undefined };
        return validator.safeParse(input);
      },
      optional: () => this.optional(validator),
      nullable: () => this.nullable(this.optional(validator))
    };
  }

  /**
   * Nullable wrapper
   */
  static nullable<T>(validator: ZodType<T>): ZodType<T | null> {
    return {
      parse: (input: unknown): T | null => {
        if (input === null) return null;
        return validator.parse(input);
      },
      safeParse: (input: unknown): ValidationResult<T | null> => {
        if (input === null) return { success: true, data: null };
        return validator.safeParse(input);
      },
      optional: () => this.optional(this.nullable(validator)),
      nullable: () => this.nullable(validator)
    };
  }

  /**
   * Sanitize input string (remove control characters, null bytes)
   */
  static sanitizeInput(input: string): string {
    // Remove null bytes, control characters (except newline, tab, carriage return)
    return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Private validation helpers

  private static validateString(
    input: unknown,
    options?: {
      min?: number;
      max?: number;
      regex?: RegExp;
      email?: boolean;
      url?: boolean;
    }
  ): ValidationResult<string> {
    if (typeof input !== 'string') {
      return { success: false, error: 'Expected string' };
    }

    const sanitized = this.sanitizeInput(input);

    if (options?.min !== undefined && sanitized.length < options.min) {
      return { success: false, error: `String too short (min: ${options.min})` };
    }

    if (options?.max !== undefined && sanitized.length > options.max) {
      return { success: false, error: `String too long (max: ${options.max})` };
    }

    if (sanitized.length > this.MAX_STRING_LENGTH) {
      return { success: false, error: `String exceeds maximum length (${this.MAX_STRING_LENGTH})` };
    }

    if (options?.regex && !options.regex.test(sanitized)) {
      return { success: false, error: 'String does not match pattern' };
    }

    if (options?.email && !this.isValidEmail(sanitized)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (options?.url && !this.isValidUrl(sanitized)) {
      return { success: false, error: 'Invalid URL format' };
    }

    return { success: true, data: sanitized };
  }

  private static validateNumber(
    input: unknown,
    options?: {
      min?: number;
      max?: number;
      int?: boolean;
    }
  ): ValidationResult<number> {
    if (typeof input !== 'number' || isNaN(input)) {
      return { success: false, error: 'Expected number' };
    }

    if (options?.int && !Number.isInteger(input)) {
      return { success: false, error: 'Expected integer' };
    }

    if (options?.min !== undefined && input < options.min) {
      return { success: false, error: `Number too small (min: ${options.min})` };
    }

    if (options?.max !== undefined && input > options.max) {
      return { success: false, error: `Number too large (max: ${options.max})` };
    }

    return { success: true, data: input };
  }

  private static validateArray<T>(
    input: unknown,
    itemValidator: ZodType<T>
  ): ValidationResult<T[]> {
    if (!Array.isArray(input)) {
      return { success: false, error: 'Expected array' };
    }

    if (input.length > this.MAX_ARRAY_LENGTH) {
      return { success: false, error: `Array too large (max: ${this.MAX_ARRAY_LENGTH})` };
    }

    const result: T[] = [];
    for (let i = 0; i < input.length; i++) {
      const itemResult = itemValidator.safeParse(input[i]);
      if (!itemResult.success) {
        return { success: false, error: `Invalid item at index ${i}: ${itemResult.error}` };
      }
      result.push(itemResult.data!);
    }

    return { success: true, data: result };
  }

  private static validateObject<T extends Record<string, any>>(
    input: unknown,
    shape: { [K in keyof T]: ZodType<T[K]> }
  ): ValidationResult<T> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return { success: false, error: 'Expected object' };
    }

    const result: any = {};
    for (const [key, validator] of Object.entries(shape)) {
      const value = (input as any)[key];
      const validationResult = validator.safeParse(value);
      if (!validationResult.success) {
        return { success: false, error: `Invalid field '${key}': ${validationResult.error}` };
      }
      result[key] = validationResult.data;
    }

    return { success: true, data: result as T };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
