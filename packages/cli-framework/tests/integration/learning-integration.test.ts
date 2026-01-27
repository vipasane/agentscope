/**
 * @packageDocumentation
 * Integration tests for learning integration with CommandRegistry
 *
 * @remarks
 * Tests full integration of learning system with command execution
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommandPatternService } from '../../src/learning/CommandPatternService';
import { DEFAULT_LEARNING_CONFIG, CommandContext } from '../../src/learning/types';

describe('Learning Integration', () => {
  let patternService: CommandPatternService;

  beforeEach(async () => {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    patternService = new CommandPatternService(config);
    await patternService.initialize();
  });

  describe('Command Execution Tracking', () => {
    it('should track command execution pattern', async () => {
      const context: CommandContext = {
        command: 'scan',
        args: ['--output', './docs'],
        options: { theme: 'dark' },
        executionTime: 1500,
      };

      await patternService.trackExecution('scan', context, 'success');

      const stats = await patternService.getStatistics();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.successRate).toBe(1.0);
    });

    it('should provide suggestions after tracking patterns', async () => {
      const commands = [
        { cmd: 'scan --output ./docs', success: true },
        { cmd: 'scan --output ./reports', success: true },
        { cmd: 'scan --format json', success: true },
      ];

      for (const { cmd, success } of commands) {
        const parts = cmd.split(' ');
        const context: CommandContext = {
          command: parts[0],
          args: parts.slice(1),
          options: {},
          executionTime: 1000,
        };

        await patternService.trackExecution(
          parts[0],
          context,
          success ? 'success' : 'failure'
        );
      }

      const suggestions = await patternService.suggestCommands('scan output', 5);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.command.includes('scan'))).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should track and suggest fixes for errors', async () => {
      const context: CommandContext = {
        command: 'deploy',
        args: ['production'],
        options: {},
        executionTime: 100,
      };

      const error = new Error('Permission denied: cannot deploy to production');
      await patternService.trackExecution('deploy', context, 'failure', error);

      // Track same error again
      await patternService.trackExecution('deploy', context, 'failure', error);

      const patterns = await patternService.findSimilarErrors(
        new Error('Permission error: deployment failed')
      );

      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Cold Start Handling', () => {
    it('should handle empty database gracefully', async () => {
      const suggestions = await patternService.suggestCommands('any command', 5);

      expect(suggestions).toEqual([]);
    });

    it('should handle first-time command tracking', async () => {
      const context: CommandContext = {
        command: 'new-command',
        args: [],
        options: {},
        executionTime: 10,
      };

      await expect(
        patternService.trackExecution('new-command', context, 'success')
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent pattern tracking', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const context: CommandContext = {
          command: `cmd-${i}`,
          args: [`arg-${i}`],
          options: {},
          executionTime: Math.random() * 1000,
        };

        promises.push(patternService.trackExecution(`cmd-${i}`, context, 'success'));
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();

      const stats = await patternService.getStatistics();
      expect(stats.totalPatterns).toBe(100);
    });

    it('should maintain performance with 1000+ patterns', async () => {
      // Track 1000 patterns
      for (let i = 0; i < 1000; i++) {
        const context: CommandContext = {
          command: `cmd-${i % 10}`,
          args: [`arg-${i}`],
          options: {},
          executionTime: 10,
        };

        await patternService.trackExecution(`cmd-${i % 10}`, context, 'success');
      }

      // Test suggestion performance
      const start = Date.now();
      const suggestions = await patternService.suggestCommands('cmd-5', 5);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should be <10ms with HNSW
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy and Data Management', () => {
    it('should respect enabled flag', async () => {
      const disabledConfig = { ...DEFAULT_LEARNING_CONFIG, enabled: false };
      const disabledService = new CommandPatternService(disabledConfig);
      await disabledService.initialize();

      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 10,
      };

      await disabledService.trackExecution('test', context, 'success');

      const stats = await disabledService.getStatistics();
      expect(stats.totalPatterns).toBe(0); // Should not track when disabled
    });

    it('should clear patterns on request (GDPR)', async () => {
      // Track some patterns
      for (let i = 0; i < 10; i++) {
        const context: CommandContext = {
          command: 'test',
          args: [],
          options: {},
          executionTime: 10,
        };

        await patternService.trackExecution('test', context, 'success');
      }

      let stats = await patternService.getStatistics();
      expect(stats.totalPatterns).toBe(10);

      // Clear patterns
      await patternService.clearPatterns();

      stats = await patternService.getStatistics();
      expect(stats.totalPatterns).toBe(0);
    });
  });
});
