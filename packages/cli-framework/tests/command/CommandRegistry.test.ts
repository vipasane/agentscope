/**
 * Tests for CommandRegistry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import type { CommandConfig } from '../../src/types.js';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    registry = new CommandRegistry();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('register', () => {
    it('should register a command', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
      };

      registry.register(config);
      expect(registry.get('test')).toBe(config);
    });

    it('should register command aliases', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        aliases: ['t', 'tst'],
      };

      registry.register(config);
      expect(registry.get('t')).toBe(config);
      expect(registry.get('tst')).toBe(config);
      expect(registry.get('test')).toBe(config);
    });

    it('should return registry for chaining', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
      };

      const result = registry.register(config);
      expect(result).toBe(registry);
    });
  });

  describe('get', () => {
    it('should get command by name', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
      };

      registry.register(config);
      expect(registry.get('test')).toBe(config);
    });

    it('should get command by alias', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        aliases: ['t'],
      };

      registry.register(config);
      expect(registry.get('t')).toBe(config);
    });

    it('should return undefined for unknown command', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered commands', () => {
      const config1: CommandConfig = {
        name: 'test1',
        description: 'Test command 1',
      };
      const config2: CommandConfig = {
        name: 'test2',
        description: 'Test command 2',
      };

      registry.register(config1);
      registry.register(config2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(config1);
      expect(all).toContain(config2);
    });

    it('should return empty array when no commands', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('execute', () => {
    it('should show help when no args', async () => {
      await registry.execute([]);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should show help for help command', async () => {
      await registry.execute(['help']);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should show help for --help flag', async () => {
      await registry.execute(['--help']);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should execute command action', async () => {
      const action = vi.fn();
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        action,
      };

      registry.register(config);
      await registry.execute(['test']);

      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ _: [] }),
        expect.objectContaining({ command: 'test' })
      );
    });

    it('should execute command by alias', async () => {
      const action = vi.fn();
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        aliases: ['t'],
        action,
      };

      registry.register(config);
      await registry.execute(['t']);

      expect(action).toHaveBeenCalled();
    });

    it('should error on unknown command', async () => {
      try {
        await registry.execute(['unknown']);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    });

    it('should execute subcommand', async () => {
      const action = vi.fn();
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        subcommands: [
          {
            name: 'sub',
            description: 'Subcommand',
            action,
          },
        ],
      };

      registry.register(config);
      await registry.execute(['test', 'sub']);

      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ _: [] }),
        expect.objectContaining({ command: 'test', subcommand: 'sub' })
      );
    });

    it('should execute subcommand by alias', async () => {
      const action = vi.fn();
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        subcommands: [
          {
            name: 'sub',
            description: 'Subcommand',
            aliases: ['s'],
            action,
          },
        ],
      };

      registry.register(config);
      await registry.execute(['test', 's']);

      expect(action).toHaveBeenCalled();
    });

    it('should show command help on --help flag', async () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
      };

      registry.register(config);
      await registry.execute(['test', '--help']);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should parse command options', async () => {
      const action = vi.fn();
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        options: [
          {
            name: 'verbose',
            short: 'v',
            long: 'verbose',
            type: 'boolean',
            description: 'Verbose output',
          },
        ],
        action,
      };

      registry.register(config);
      await registry.execute(['test', '--verbose']);

      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true }),
        expect.any(Object)
      );
    });

    it('should parse command arguments', async () => {
      const action = vi.fn();
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        arguments: [
          {
            name: 'file',
            description: 'File path',
            required: true,
          },
        ],
        action,
      };

      registry.register(config);
      await registry.execute(['test', 'myfile.txt']);

      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ file: 'myfile.txt' }),
        expect.any(Object)
      );
    });

    it('should error on validation failure', async () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test command',
        options: [
          {
            name: 'port',
            long: 'port',
            type: 'number',
            description: 'Port',
          },
        ],
      };

      registry.register(config);

      try {
        await registry.execute(['test', '--port', 'invalid']);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('generateBashCompletion', () => {
    it('should generate bash completion script', () => {
      registry.register({
        name: 'test1',
        description: 'Test 1',
      });
      registry.register({
        name: 'test2',
        description: 'Test 2',
      });

      const completion = registry.generateBashCompletion('mycli');

      expect(completion).toContain('_mycli_completions');
      expect(completion).toContain('test1');
      expect(completion).toContain('test2');
      expect(completion).toContain('complete -F');
    });
  });

  describe('help display', () => {
    it('should display available commands in help', async () => {
      registry.register({
        name: 'cmd1',
        description: 'Command 1',
      });
      registry.register({
        name: 'cmd2',
        description: 'Command 2',
        aliases: ['c2'],
      });

      await registry.execute([]);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available Commands'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('cmd1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('cmd2'));
    });

    it('should hide hidden commands from help', async () => {
      registry.register({
        name: 'visible',
        description: 'Visible command',
      });
      registry.register({
        name: 'hidden',
        description: 'Hidden command',
        hidden: true,
      });

      await registry.execute([]);

      const logs = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const allLogs = logs.join('\n');

      expect(allLogs).toContain('visible');
      expect(allLogs).not.toContain('hidden');
    });

    it('should display subcommands in help', async () => {
      registry.register({
        name: 'main',
        description: 'Main command',
        subcommands: [
          {
            name: 'sub1',
            description: 'Subcommand 1',
          },
          {
            name: 'sub2',
            description: 'Subcommand 2',
            hidden: true,
          },
        ],
      });

      await registry.execute([]);

      const logs = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const allLogs = logs.join('\n');

      expect(allLogs).toContain('sub1');
      expect(allLogs).not.toContain('sub2');
    });

    it('should display command-specific help', async () => {
      registry.register({
        name: 'test',
        description: 'Test command',
        options: [
          {
            name: 'verbose',
            short: 'v',
            long: 'verbose',
            type: 'boolean',
            description: 'Verbose output',
          },
        ],
        arguments: [
          {
            name: 'file',
            description: 'File path',
            required: true,
          },
        ],
        examples: ['test --verbose file.txt', 'test file.txt'],
      });

      await registry.execute(['test', '--help']);

      const logs = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const allLogs = logs.join('\n');

      expect(allLogs).toContain('Usage');
      expect(allLogs).toContain('Options');
      expect(allLogs).toContain('Arguments');
      expect(allLogs).toContain('Examples');
      expect(allLogs).toContain('verbose');
      expect(allLogs).toContain('file');
    });
  });
});
