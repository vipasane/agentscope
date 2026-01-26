/**
 * Error handler for CLI applications
 */

import type { ErrorContext } from '../types.js';
import { c } from '../utils/colors.js';
import { ValidationError } from '../utils/validators.js';

export class ErrorHandler {
  private verbose: boolean;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose || false;
  }

  /**
   * Handle an error and exit
   */
  handle(error: Error, context?: ErrorContext): never {
    // Special handling for validation errors
    if (error instanceof ValidationError) {
      this.handleValidationError(error, context);
    }

    // Display error message
    console.error(c.errorBold('\nError: ') + error.message);

    // Show command context if available
    if (context?.command) {
      console.error(c.dim(`Command: ${context.command}`));
    }

    // Show stack trace in verbose mode
    if (this.verbose && error.stack) {
      console.error(c.dim('\nStack trace:'));
      console.error(c.dim(error.stack));
    } else if (error.stack) {
      console.error(c.dim('\nRun with --verbose for stack trace'));
    }

    // Show help hint
    if (context?.command) {
      console.error(c.dim(`\nRun '${context.command} --help' for usage information`));
    }

    // Exit with appropriate code
    const exitCode = context?.exitCode || this.getExitCode(error);
    process.exit(exitCode);
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(error: ValidationError, context?: ErrorContext): void {
    console.error(c.errorBold('\nValidation Error: ') + error.message);

    if (error.field) {
      console.error(c.dim(`Field: ${error.field}`));
    }

    if (error.value !== undefined) {
      console.error(c.dim(`Value: ${JSON.stringify(error.value)}`));
    }

    if (context?.args) {
      console.error(c.dim('\nProvided arguments:'));
      console.error(c.dim(JSON.stringify(context.args, null, 2)));
    }
  }

  /**
   * Get appropriate exit code for error type
   */
  private getExitCode(error: Error): number {
    if (error instanceof ValidationError) {
      return 1;
    }

    if (error.name === 'ENOENT') {
      return 2; // File not found
    }

    if (error.name === 'EACCES') {
      return 3; // Permission denied
    }

    if (error.name === 'ECONNREFUSED') {
      return 4; // Connection refused
    }

    return 1; // Generic error
  }

  /**
   * Create a user-friendly error message
   */
  static createError(message: string, suggestions?: string[]): Error {
    let fullMessage = message;

    if (suggestions && suggestions.length > 0) {
      fullMessage += '\n\nDid you mean:\n';
      fullMessage += suggestions.map((s) => `  • ${s}`).join('\n');
    }

    return new Error(fullMessage);
  }

  /**
   * Wrap async function with error handling
   */
  static wrap<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    context?: ErrorContext
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const handler = new ErrorHandler({ verbose: process.env.VERBOSE === 'true' });
        handler.handle(error as Error, context);
        // TypeScript doesn't know handle() calls process.exit()
        throw error;
      }
    };
  }

  /**
   * Format error for logging
   */
  static format(error: Error, includeStack = false): string {
    const parts: string[] = [
      `Error: ${error.message}`,
      `Name: ${error.name}`,
    ];

    if (error instanceof ValidationError) {
      parts.push(`Field: ${error.field}`);
      if (error.value !== undefined) {
        parts.push(`Value: ${JSON.stringify(error.value)}`);
      }
    }

    if (includeStack && error.stack) {
      parts.push('Stack:');
      parts.push(error.stack);
    }

    return parts.join('\n');
  }
}

/**
 * Global error handlers
 */
export function setupGlobalErrorHandlers(verbose = false): void {
  const handler = new ErrorHandler({ verbose });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error(c.errorBold('\nUncaught Exception:'));
    handler.handle(error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error(c.errorBold('\nUnhandled Promise Rejection:'));
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handler.handle(error);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.error(c.dim('\n\nInterrupted by user'));
    process.exit(130);
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.error(c.dim('\n\nTerminated'));
    process.exit(143);
  });
}
