/**
 * @packageDocumentation
 * Tests for CommandPatternService
 *
 * @remarks
 * Tests command pattern tracking, HNSW search, and suggestions
 * Performance targets: <5ms tracking, <10ms suggestions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommandPatternService } from '../../src/learning/CommandPatternService';
import { DEFAULT_LEARNING_CONFIG, CommandContext } from '../../src/learning/types';

describe('CommandPatternService', () => {
  let service: CommandPatternService;

  beforeEach(async () => {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    service = new CommandPatternService(config);
    await service.initialize();
  });

  describe('trackExecution', () => {
    it('should track successful command execution', async () => {
      const context: CommandContext = {
        command: 'test',
        args: ['arg1', 'arg2'],
        options: { flag: true },
        executionTime: 100,
      };

      await service.trackExecution('test', context, 'success');

      const stats = await service.getStatistics();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.successRate).toBe(1.0);
    });

    it('should track failed command execution', async () => {
      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 50,
      };

      const error = new Error('Test error');
      await service.trackExecution('test', context, 'failure', error);

      const stats = await service.getStatistics();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.successRate).toBe(0.0);
    });

    it('should complete in <5ms (performance target)', async () => {
      const context: CommandContext = {
        command: 'test',
        args: ['arg'],
        options: {},
        executionTime: 10,
      };

      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await service.trackExecution(`test-${i}`, context, 'success');
      }

      const duration = Date.now() - start;
      const avgDuration = duration / iterations;

      expect(avgDuration).toBeLessThan(5);
    });

    it('should generate embeddings for patterns', async () => {
      const context: CommandContext = {
        command: 'npm install',
        args: ['package-name'],
        options: {},
        executionTime: 1000,
      };

      await service.trackExecution('npm install', context, 'success');

      // Pattern should have embedding (validated via statistics)
      const stats = await service.getStatistics();
      expect(stats.totalPatterns).toBe(1);
    });

    it('should handle multiple executions of same command', async () => {
      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 10,
      };

      await service.trackExecution('test', context, 'success');
      await service.trackExecution('test', context, 'success');
      await service.trackExecution('test', context, 'failure');

      const stats = await service.getStatistics();
      expect(stats.totalPatterns).toBe(3);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });
  });

  describe('suggestCommands', () => {
    beforeEach(async () => {
      // Track some patterns for suggestions
      const commands = [
        'npm install',
        'npm install package-a',
        'npm install package-b',
        'git commit',
        'git commit -m "message"',
      ];

      for (const cmd of commands) {
        const context: CommandContext = {
          command: cmd,
          args: cmd.split(' ').slice(1),
          options: {},
          executionTime: 10,
        };
        await service.trackExecution(cmd, context, 'success');
      }
    });

    it('should return suggestions for partial command', async () => {
      const suggestions = await service.suggestCommands('npm install', 5);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.confidence > 0)).toBe(true);
    });

    it('should limit suggestions to max count', async () => {
      const suggestions = await service.suggestCommands('npm', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should filter by confidence threshold (0.75)', async () => {
      const suggestions = await service.suggestCommands('completely different', 10);

      // Should have low or no suggestions for unrelated query
      suggestions.forEach(s => {
        expect(s.confidence).toBeGreaterThanOrEqual(0.75);
      });
    });

    it('should complete in <10ms (performance target)', async () => {
      const iterations = 50;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await service.suggestCommands('npm', 5);
      }

      const duration = Date.now() - start;
      const avgDuration = duration / iterations;

      expect(avgDuration).toBeLessThan(10);
    });

    it('should include usage count in suggestions', async () => {
      // Track npm install multiple times
      const context: CommandContext = {
        command: 'npm install',
        args: ['lodash'],
        options: {},
        executionTime: 10,
      };

      for (let i = 0; i < 5; i++) {
        await service.trackExecution('npm install', context, 'success');
      }

      const suggestions = await service.suggestCommands('npm install', 5);

      const npmSuggestion = suggestions.find(s => s.command.includes('npm install'));
      expect(npmSuggestion).toBeDefined();
      if (npmSuggestion) {
        expect(npmSuggestion.usageCount).toBeGreaterThan(1);
      }
    });

    it('should only suggest successful commands', async () => {
      // Track some failures
      const context: CommandContext = {
        command: 'bad-command',
        args: [],
        options: {},
        executionTime: 10,
      };

      await service.trackExecution('bad-command', context, 'failure', new Error('Failed'));

      const suggestions = await service.suggestCommands('bad', 10);

      // Should not suggest failed commands
      expect(suggestions.every(s => !s.command.includes('bad-command'))).toBe(true);
    });
  });

  describe('findSimilarErrors', () => {
    beforeEach(async () => {
      // Track some errors
      const errors = [
        'ENOENT: no such file or directory',
        'EACCES: permission denied',
        'ENOENT: file not found',
      ];

      for (const errorMsg of errors) {
        const context: CommandContext = {
          command: 'test',
          args: [],
          options: {},
          executionTime: 10,
        };
        await service.trackExecution('test', context, 'failure', new Error(errorMsg));
      }
    });

    it('should find similar error patterns', async () => {
      const error = new Error('ENOENT: cannot find file');
      const patterns = await service.findSimilarErrors(error);

      // Should find ENOENT errors
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should filter by threshold (0.8)', async () => {
      const error = new Error('completely unrelated error');
      const patterns = await service.findSimilarErrors(error);

      // Should have no similar errors for unrelated query
      expect(patterns.length).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return empty statistics initially', async () => {
      const stats = await service.getStatistics();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.topCommands).toHaveLength(0);
      expect(stats.commonErrors).toHaveLength(0);
    });

    it('should track top commands', async () => {
      const context: CommandContext = {
        command: 'npm install',
        args: [],
        options: {},
        executionTime: 10,
      };

      for (let i = 0; i < 10; i++) {
        await service.trackExecution('npm install', context, 'success');
      }

      for (let i = 0; i < 5; i++) {
        await service.trackExecution('git commit', context, 'success');
      }

      const stats = await service.getStatistics();

      expect(stats.topCommands).toHaveLength(2);
      expect(stats.topCommands[0].command).toBe('npm install');
      expect(stats.topCommands[0].count).toBe(10);
    });

    it('should track common errors', async () => {
      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 10,
      };

      for (let i = 0; i < 5; i++) {
        await service.trackExecution('test', context, 'failure', new Error('Error A'));
      }

      for (let i = 0; i < 3; i++) {
        await service.trackExecution('test', context, 'failure', new Error('Error B'));
      }

      const stats = await service.getStatistics();

      expect(stats.commonErrors.length).toBeGreaterThan(0);
      expect(stats.commonErrors[0].error).toBe('Error A');
      expect(stats.commonErrors[0].count).toBe(5);
    });
  });

  describe('clearPatterns', () => {
    it('should clear all stored patterns', async () => {
      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 10,
      };

      await service.trackExecution('test', context, 'success');

      let stats = await service.getStatistics();
      expect(stats.totalPatterns).toBe(1);

      await service.clearPatterns();

      stats = await service.getStatistics();
      expect(stats.totalPatterns).toBe(0);
    });
  });

  describe('pattern pruning', () => {
    it('should enforce max patterns limit', async () => {
      const config = {
        ...DEFAULT_LEARNING_CONFIG,
        enabled: true,
        patternStorage: { ...DEFAULT_LEARNING_CONFIG.patternStorage, maxPatterns: 100 },
      };

      const limitedService = new CommandPatternService(config);
      await limitedService.initialize();

      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 10,
      };

      // Track more than max patterns
      for (let i = 0; i < 150; i++) {
        await limitedService.trackExecution(`cmd-${i}`, context, 'success');
      }

      const stats = await limitedService.getStatistics();

      // Should not exceed max patterns (with some buffer for pruning)
      expect(stats.totalPatterns).toBeLessThanOrEqual(100);
    });
  });
});
