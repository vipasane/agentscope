/**
 * Tests for ErrorHandler
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorHandler, setupGlobalErrorHandlers } from '../../src/command/ErrorHandler.js';
import { ValidationError } from '../../src/utils/validators.js';
import type { ErrorContext } from '../../src/types.js';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  describe('handle', () => {
    it('should display error message and exit', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new Error('Test error');

      try {
        handler.handle(error);
        assert.fail('Should have exited');
      } catch (e) {
        assert.equal((e as Error).message, 'MOCK_EXIT');
      }

      assert.ok(consoleErrorMock.mock.calls.length > 0);
      const errorOutput = consoleErrorMock.mock.calls
        .map((call) => call.arguments.join(' '))
        .join('\n');
      assert.ok(errorOutput.includes('Test error'));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should display command context', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new Error('Test error');
      const context: ErrorContext = {
        command: 'deploy',
        args: { _: [], env: 'production' },
      };

      try {
        handler.handle(error, context);
      } catch (e) {
        // Expected
      }

      const errorOutput = consoleErrorMock.mock.calls
        .map((call) => call.arguments.join(' '))
        .join('\n');
      assert.ok(errorOutput.includes('deploy'));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should use custom exit code', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new Error('Test error');
      const context: ErrorContext = {
        exitCode: 42,
      };

      try {
        handler.handle(error, context);
      } catch (e) {
        // Expected
      }

      assert.equal(exitMock.mock.calls[0].arguments[0], 42);

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should handle ValidationError specially', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new ValidationError('Invalid email', 'email', 'invalid');

      try {
        handler.handle(error);
      } catch (e) {
        // Expected
      }

      const errorOutput = consoleErrorMock.mock.calls
        .map((call) => call.arguments.join(' '))
        .join('\n');
      assert.ok(errorOutput.includes('Validation Error'));
      assert.ok(errorOutput.includes('email'));
      assert.ok(errorOutput.includes('invalid'));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should show stack trace in verbose mode', () => {
      const verboseHandler = new ErrorHandler({ verbose: true });
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new Error('Test error');

      try {
        verboseHandler.handle(error);
      } catch (e) {
        // Expected
      }

      const errorOutput = consoleErrorMock.mock.calls
        .map((call) => call.arguments.join(' '))
        .join('\n');
      assert.ok(errorOutput.includes('Stack trace'));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should suggest verbose flag when not in verbose mode', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new Error('Test error');

      try {
        handler.handle(error);
      } catch (e) {
        // Expected
      }

      const errorOutput = consoleErrorMock.mock.calls
        .map((call) => call.arguments.join(' '))
        .join('\n');
      assert.ok(errorOutput.includes('--verbose'));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });

  describe('getExitCode', () => {
    it('should return 1 for ValidationError', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new ValidationError('Invalid', 'field');

      try {
        handler.handle(error);
      } catch (e) {
        // Expected
      }

      assert.equal(exitMock.mock.calls[0].arguments[0], 1);

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should return 1 for generic errors', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const error = new Error('Generic error');

      try {
        handler.handle(error);
      } catch (e) {
        // Expected
      }

      assert.equal(exitMock.mock.calls[0].arguments[0], 1);

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });

  describe('createError', () => {
    it('should create error with message', () => {
      const error = ErrorHandler.createError('Something went wrong');
      assert.equal(error.message, 'Something went wrong');
    });

    it('should include suggestions', () => {
      const error = ErrorHandler.createError('Unknown command', [
        'deploy',
        'test',
        'build',
      ]);

      assert.ok(error.message.includes('Unknown command'));
      assert.ok(error.message.includes('Did you mean'));
      assert.ok(error.message.includes('deploy'));
      assert.ok(error.message.includes('test'));
      assert.ok(error.message.includes('build'));
    });

    it('should handle empty suggestions', () => {
      const error = ErrorHandler.createError('Error', []);
      assert.equal(error.message, 'Error');
    });
  });

  describe('wrap', () => {
    it('should wrap async function with error handling', async () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const fn = async () => {
        throw new Error('Wrapped error');
      };

      const wrapped = ErrorHandler.wrap(fn);

      try {
        await wrapped();
        assert.fail('Should have thrown');
      } catch (error) {
        assert.equal((error as Error).message, 'MOCK_EXIT');
      }

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should pass through return value on success', async () => {
      const fn = async (x: number, y: number) => x + y;
      const wrapped = ErrorHandler.wrap(fn);

      const result = await wrapped(2, 3);
      assert.equal(result, 5);
    });

    it('should pass context to error handler', async () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const context: ErrorContext = {
        command: 'test',
      };

      const fn = async () => {
        throw new Error('Error');
      };

      const wrapped = ErrorHandler.wrap(fn, context);

      try {
        await wrapped();
      } catch (e) {
        // Expected
      }

      const errorOutput = consoleErrorMock.mock.calls
        .map((call) => call.arguments.join(' '))
        .join('\n');
      assert.ok(errorOutput.includes('test'));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });

  describe('format', () => {
    it('should format basic error', () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      const formatted = ErrorHandler.format(error);

      assert.ok(formatted.includes('Test error'));
      assert.ok(formatted.includes('TestError'));
    });

    it('should format ValidationError with field and value', () => {
      const error = new ValidationError('Invalid email', 'email', 'invalid');

      const formatted = ErrorHandler.format(error);

      assert.ok(formatted.includes('Invalid email'));
      assert.ok(formatted.includes('email'));
      assert.ok(formatted.includes('invalid'));
    });

    it('should include stack trace when requested', () => {
      const error = new Error('Test error');

      const formatted = ErrorHandler.format(error, true);

      assert.ok(formatted.includes('Stack:'));
    });

    it('should exclude stack trace by default', () => {
      const error = new Error('Test error');

      const formatted = ErrorHandler.format(error);

      assert.ok(!formatted.includes('Stack:'));
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('should setup uncaught exception handler', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      setupGlobalErrorHandlers();

      // Trigger uncaught exception
      try {
        process.emit('uncaughtException', new Error('Uncaught'));
      } catch (e) {
        assert.equal((e as Error).message, 'MOCK_EXIT');
      }

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should setup unhandled rejection handler', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      setupGlobalErrorHandlers();

      // Trigger unhandled rejection
      try {
        process.emit('unhandledRejection' as any, new Error('Unhandled'));
      } catch (e) {
        assert.equal((e as Error).message, 'MOCK_EXIT');
      }

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should handle SIGINT', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      setupGlobalErrorHandlers();

      try {
        process.emit('SIGINT');
      } catch (e) {
        assert.equal((e as Error).message, 'MOCK_EXIT');
      }

      assert.equal(exitMock.mock.calls[0].arguments[0], 130);

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should handle SIGTERM', () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      setupGlobalErrorHandlers();

      try {
        process.emit('SIGTERM');
      } catch (e) {
        assert.equal((e as Error).message, 'MOCK_EXIT');
      }

      assert.equal(exitMock.mock.calls[0].arguments[0], 143);

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });
});
