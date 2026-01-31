/**
 * Tests for ErrorHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler, setupGlobalErrorHandlers } from '../../src/command/ErrorHandler.js';
import { ValidationError } from '../../src/utils/validators.js';

describe('ErrorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('handle', () => {
    it('should handle generic errors', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');

      try {
        handler.handle(error);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle validation errors', () => {
      const handler = new ErrorHandler();
      const error = new ValidationError('Invalid input', 'email', 'not-an-email');

      try {
        handler.handle(error);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Validation Error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('email'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('not-an-email'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should show stack trace in verbose mode', () => {
      const handler = new ErrorHandler({ verbose: true });
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      try {
        handler.handle(error);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Stack trace'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test.js:1:1'));
    });

    it('should hide stack trace in non-verbose mode', () => {
      const handler = new ErrorHandler({ verbose: false });
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      try {
        handler.handle(error);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('--verbose'));
    });

    it('should show command context', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');

      try {
        handler.handle(error, { command: 'test-command' });
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test-command'));
    });

    it('should use custom exit code', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');

      try {
        handler.handle(error, { exitCode: 42 });
      } catch (e: any) {
        expect(e.message).toContain('Process exited with code 42');
      }

      expect(processExitSpy).toHaveBeenCalledWith(42);
    });

    it('should use error-specific exit codes', () => {
      const handler = new ErrorHandler();

      // ENOENT
      const enoentError = new Error('File not found');
      enoentError.name = 'ENOENT';
      try {
        handler.handle(enoentError);
      } catch (e: any) {
        expect(e.message).toContain('Process exited with code 2');
      }

      // EACCES
      const eaccesError = new Error('Permission denied');
      eaccesError.name = 'EACCES';
      try {
        handler.handle(eaccesError);
      } catch (e: any) {
        expect(e.message).toContain('Process exited with code 3');
      }

      // ECONNREFUSED
      const econnError = new Error('Connection refused');
      econnError.name = 'ECONNREFUSED';
      try {
        handler.handle(econnError);
      } catch (e: any) {
        expect(e.message).toContain('Process exited with code 4');
      }
    });

    it('should show help hint for commands', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test error');

      try {
        handler.handle(error, { command: 'mycmd' });
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('mycmd --help'));
    });
  });

  describe('createError', () => {
    it('should create error with message', () => {
      const error = ErrorHandler.createError('Test message');
      expect(error.message).toBe('Test message');
    });

    it('should create error with suggestions', () => {
      const error = ErrorHandler.createError('Unknown command', ['command1', 'command2']);
      expect(error.message).toContain('Unknown command');
      expect(error.message).toContain('Did you mean');
      expect(error.message).toContain('command1');
      expect(error.message).toContain('command2');
    });

    it('should handle empty suggestions', () => {
      const error = ErrorHandler.createError('Test message', []);
      expect(error.message).toBe('Test message');
      expect(error.message).not.toContain('Did you mean');
    });
  });

  describe('wrap', () => {
    it('should wrap async function and handle errors', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Wrapped error');
      });

      const wrapped = ErrorHandler.wrap(fn);

      try {
        await wrapped();
      } catch (e: any) {
        // ErrorHandler.wrap calls handler.handle which calls process.exit
        // So we expect "Process exited" error
        expect(e.message).toContain('Process exited');
      }

      expect(fn).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Wrapped error'));
    });

    it('should pass through successful results', async () => {
      const fn = vi.fn(async () => 'success');
      const wrapped = ErrorHandler.wrap(fn);

      const result = await wrapped();
      expect(result).toBe('success');
    });

    it('should pass arguments to wrapped function', async () => {
      const fn = vi.fn(async (a: number, b: string) => `${a}-${b}`);
      const wrapped = ErrorHandler.wrap(fn);

      const result = await wrapped(42, 'test');
      expect(result).toBe('42-test');
      expect(fn).toHaveBeenCalledWith(42, 'test');
    });

    it('should use provided error context', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Wrapped error');
      });

      const wrapped = ErrorHandler.wrap(fn, { command: 'test' });

      try {
        await wrapped();
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Wrapped error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test'));
    });
  });

  describe('format', () => {
    it('should format generic error', () => {
      const error = new Error('Test error');
      error.name = 'CustomError';

      const formatted = ErrorHandler.format(error);
      expect(formatted).toContain('Error: Test error');
      expect(formatted).toContain('Name: CustomError');
    });

    it('should format validation error', () => {
      const error = new ValidationError('Invalid input', 'email', 'bad-email');
      const formatted = ErrorHandler.format(error);

      expect(formatted).toContain('Invalid input');
      expect(formatted).toContain('Field: email');
      expect(formatted).toContain('bad-email');
    });

    it('should include stack trace when requested', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const formatted = ErrorHandler.format(error, true);
      expect(formatted).toContain('Stack:');
      expect(formatted).toContain('test.js:1:1');
    });

    it('should exclude stack trace by default', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const formatted = ErrorHandler.format(error, false);
      expect(formatted).not.toContain('Stack:');
      expect(formatted).not.toContain('test.js:1:1');
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    let processOnSpy: ReturnType<typeof vi.spyOn>;
    let handlers: Record<string, Function>;

    beforeEach(() => {
      handlers = {};
      processOnSpy = vi.spyOn(process, 'on').mockImplementation((event: string, handler: any) => {
        handlers[event] = handler;
        return process;
      });
    });

    afterEach(() => {
      processOnSpy.mockRestore();
    });

    it('should setup uncaught exception handler', () => {
      setupGlobalErrorHandlers();
      expect(handlers['uncaughtException']).toBeDefined();

      const error = new Error('Uncaught');
      try {
        handlers['uncaughtException'](error);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Uncaught Exception'));
    });

    it('should setup unhandled rejection handler', () => {
      setupGlobalErrorHandlers();
      expect(handlers['unhandledRejection']).toBeDefined();

      try {
        handlers['unhandledRejection'](new Error('Rejected'));
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled Promise Rejection'));
    });

    it('should handle non-Error rejections', () => {
      setupGlobalErrorHandlers();

      try {
        handlers['unhandledRejection']('String rejection');
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should setup SIGINT handler', () => {
      setupGlobalErrorHandlers();
      expect(handlers['SIGINT']).toBeDefined();

      try {
        handlers['SIGINT']();
      } catch (e: any) {
        expect(e.message).toContain('Process exited with code 130');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Interrupted'));
    });

    it('should setup SIGTERM handler', () => {
      setupGlobalErrorHandlers();
      expect(handlers['SIGTERM']).toBeDefined();

      try {
        handlers['SIGTERM']();
      } catch (e: any) {
        expect(e.message).toContain('Process exited with code 143');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Terminated'));
    });

    it('should respect verbose flag', () => {
      setupGlobalErrorHandlers(true);

      const error = new Error('Test');
      error.stack = 'Stack trace';

      try {
        handlers['uncaughtException'](error);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Stack trace'));
    });
  });
});
