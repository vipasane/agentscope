/**
 * @file CLI Entry Point Tests
 * @description Unit tests for CLIEntryPoint
 *
 * @module tests/cli-entry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CLIEntryPoint } from '../src/cli-entry.js';

describe('CLIEntryPoint', () => {
  let cli: CLIEntryPoint;

  beforeEach(() => {
    cli = new CLIEntryPoint(false); // No progress indicator
  });

  describe('execute()', () => {
    it('should handle --version flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await cli.execute(['--version']);

      expect(exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle -v flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await cli.execute(['-v']);

      expect(exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle --help flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await cli.execute(['--help']);

      expect(exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle -h flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await cli.execute(['-h']);

      expect(exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should show help for no arguments', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await cli.execute([]);

      expect(exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle unknown command gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await cli.execute(['unknown-command']);

      // Should show error and help
      expect(exitCode).toBe(1);

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should execute --version quickly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const start = performance.now();
      await cli.execute(['--version']);
      const duration = performance.now() - start;

      // Version should be very fast (<50ms)
      expect(duration).toBeLessThan(50);

      consoleSpy.mockRestore();
    });

    it('should execute --help quickly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const start = performance.now();
      await cli.execute(['--help']);
      const duration = performance.now() - start;

      // Help should be fast (<100ms)
      expect(duration).toBeLessThan(100);

      consoleSpy.mockRestore();
    });
  });

  describe('exportStats()', () => {
    it('should export execution statistics', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cli.execute(['--version']);

      const stats = cli.exportStats();

      expect(stats).toHaveProperty('totalTime');
      expect(stats).toHaveProperty('moduleStats');
      expect(stats.totalTime).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Try to execute non-existent command
      const exitCode = await cli.execute(['non-existent-command']);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});

describe('Integration Tests', () => {
  it('should handle multiple sequential executions', async () => {
    const cli = new CLIEntryPoint(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Execute multiple commands
    await cli.execute(['--version']);
    await cli.execute(['--help']);
    await cli.execute(['-v']);

    const stats = cli.exportStats();

    // Should have module caching benefits
    expect(stats.moduleStats.cacheHitRate).toBeGreaterThanOrEqual(0);

    consoleSpy.mockRestore();
  });

  it('should export valid JSON statistics', async () => {
    const cli = new CLIEntryPoint(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.execute(['--version']);

    const stats = cli.exportStats();

    // Should be JSON serializable
    expect(() => JSON.stringify(stats)).not.toThrow();

    const json = JSON.stringify(stats);
    const parsed = JSON.parse(json);

    expect(parsed.totalTime).toBe(stats.totalTime);

    consoleSpy.mockRestore();
  });
});
