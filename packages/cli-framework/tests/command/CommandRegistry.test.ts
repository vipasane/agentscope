/**
 * Tests for CommandRegistry
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import type { CommandConfig } from '../../src/types.js';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command', () => {
      const command: CommandConfig = {
        name: 'test',
        description: 'Test command',
      };

      registry.register(command);
      const retrieved = registry.get('test');

      assert.equal(retrieved?.name, 'test');
      assert.equal(retrieved?.description, 'Test command');
    });

    it('should register command aliases', () => {
      const command: CommandConfig = {
        name: 'list',
        description: 'List items',
        aliases: ['ls', 'l'],
      };

      registry.register(command);

      assert.equal(registry.get('list')?.name, 'list');
      assert.equal(registry.get('ls')?.name, 'list');
      assert.equal(registry.get('l')?.name, 'list');
    });

    it('should return registry for chaining', () => {
      const result = registry.register({
        name: 'test',
        description: 'Test',
      });

      assert.equal(result, registry);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent command', () => {
      const result = registry.get('nonexistent');
      assert.equal(result, undefined);
    });

    it('should get command by name', () => {
      const command: CommandConfig = {
        name: 'deploy',
        description: 'Deploy app',
      };

      registry.register(command);
      const retrieved = registry.get('deploy');

      assert.equal(retrieved?.name, 'deploy');
    });

    it('should get command by alias', () => {
      const command: CommandConfig = {
        name: 'status',
        description: 'Show status',
        aliases: ['st'],
      };

      registry.register(command);
      const retrieved = registry.get('st');

      assert.equal(retrieved?.name, 'status');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no commands', () => {
      const commands = registry.getAll();
      assert.equal(commands.length, 0);
    });

    it('should return all registered commands', () => {
      registry.register({ name: 'cmd1', description: 'Command 1' });
      registry.register({ name: 'cmd2', description: 'Command 2' });
      registry.register({ name: 'cmd3', description: 'Command 3' });

      const commands = registry.getAll();
      assert.equal(commands.length, 3);
    });

    it('should not include duplicates for aliases', () => {
      registry.register({
        name: 'list',
        description: 'List',
        aliases: ['ls', 'l'],
      });

      const commands = registry.getAll();
      assert.equal(commands.length, 1);
    });
  });

  describe('execute', () => {
    it('should execute command action', async () => {
      let executed = false;

      registry.register({
        name: 'test',
        description: 'Test',
        action: async () => {
          executed = true;
        },
      });

      await registry.execute(['test']);
      assert.equal(executed, true);
    });

    it('should execute command with arguments', async () => {
      let receivedArgs: any = null;

      registry.register({
        name: 'greet',
        description: 'Greet user',
        arguments: [
          { name: 'name', description: 'User name', required: true },
        ],
        action: async (args) => {
          receivedArgs = args;
        },
      });

      await registry.execute(['greet', 'Alice']);
      assert.equal(receivedArgs.name, 'Alice');
    });

    it('should execute command with options', async () => {
      let receivedArgs: any = null;

      registry.register({
        name: 'deploy',
        description: 'Deploy app',
        options: [
          {
            name: 'env',
            long: 'env',
            type: 'string',
            description: 'Environment',
          },
        ],
        action: async (args) => {
          receivedArgs = args;
        },
      });

      await registry.execute(['deploy', '--env', 'production']);
      assert.equal(receivedArgs.env, 'production');
    });

    it('should execute subcommand', async () => {
      let executed = false;

      registry.register({
        name: 'db',
        description: 'Database commands',
        subcommands: [
          {
            name: 'migrate',
            description: 'Run migrations',
            action: async () => {
              executed = true;
            },
          },
        ],
      });

      await registry.execute(['db', 'migrate']);
      assert.equal(executed, true);
    });

    it('should execute subcommand with arguments', async () => {
      let receivedArgs: any = null;

      registry.register({
        name: 'user',
        description: 'User commands',
        subcommands: [
          {
            name: 'create',
            description: 'Create user',
            arguments: [
              { name: 'email', description: 'Email', required: true },
            ],
            action: async (args) => {
              receivedArgs = args;
            },
          },
        ],
      });

      await registry.execute(['user', 'create', 'test@example.com']);
      assert.equal(receivedArgs.email, 'test@example.com');
    });

    it('should pass command context to action', async () => {
      let context: any = null;

      registry.register({
        name: 'test',
        description: 'Test',
        action: async (_, ctx) => {
          context = ctx;
        },
      });

      await registry.execute(['test']);
      assert.equal(context.command, 'test');
      assert.ok(Array.isArray(context.rawArgs));
      assert.ok(typeof context.env === 'object');
    });

    it('should pass subcommand context to action', async () => {
      let context: any = null;

      registry.register({
        name: 'db',
        description: 'Database',
        subcommands: [
          {
            name: 'migrate',
            description: 'Migrate',
            action: async (_, ctx) => {
              context = ctx;
            },
          },
        ],
      });

      await registry.execute(['db', 'migrate']);
      assert.equal(context.command, 'db');
      assert.equal(context.subcommand, 'migrate');
    });
  });

  describe('error handling', () => {
    it('should exit on unknown command', async () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      try {
        await registry.execute(['unknown']);
        assert.fail('Should have exited');
      } catch (error) {
        assert.equal((error as Error).message, 'MOCK_EXIT');
      }

      assert.equal(exitMock.mock.calls.length, 1);
      assert.equal(exitMock.mock.calls[0].arguments[0], 1);

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });

    it('should exit on validation error', async () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      registry.register({
        name: 'test',
        description: 'Test',
        options: [
          {
            name: 'required',
            long: 'required',
            type: 'string',
            description: 'Required option',
            required: true,
          },
        ],
        action: async () => {},
      });

      try {
        await registry.execute(['test']);
        assert.fail('Should have exited');
      } catch (error) {
        assert.equal((error as Error).message, 'MOCK_EXIT');
      }

      assert.equal(exitMock.mock.calls.length, 1);
      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });

  describe('help', () => {
    it('should show help when no args', async () => {
      const logMock = mock.method(console, 'log', () => {});

      registry.register({
        name: 'test',
        description: 'Test command',
      });

      await registry.execute([]);

      assert.ok(logMock.mock.calls.length > 0);
      logMock.mock.restore();
    });

    it('should show help on --help flag', async () => {
      const logMock = mock.method(console, 'log', () => {});

      registry.register({
        name: 'test',
        description: 'Test command',
      });

      await registry.execute(['--help']);

      assert.ok(logMock.mock.calls.length > 0);
      logMock.mock.restore();
    });

    it('should show command help on command --help', async () => {
      const logMock = mock.method(console, 'log', () => {});

      registry.register({
        name: 'deploy',
        description: 'Deploy application',
        options: [
          {
            name: 'env',
            long: 'env',
            short: 'e',
            type: 'string',
            description: 'Environment',
          },
        ],
      });

      await registry.execute(['deploy', '--help']);

      assert.ok(logMock.mock.calls.length > 0);
      const output = logMock.mock.calls.map((call) => call.arguments[0]).join('\n');
      assert.ok(output.includes('deploy'));
      assert.ok(output.includes('Environment'));

      logMock.mock.restore();
    });

    it('should not show hidden commands in help', async () => {
      const logMock = mock.method(console, 'log', () => {});

      registry.register({
        name: 'visible',
        description: 'Visible command',
      });

      registry.register({
        name: 'hidden',
        description: 'Hidden command',
        hidden: true,
      });

      await registry.execute(['--help']);

      const output = logMock.mock.calls.map((call) => call.arguments[0]).join('\n');
      assert.ok(output.includes('visible'));
      assert.ok(!output.includes('hidden'));

      logMock.mock.restore();
    });
  });

  describe('generateBashCompletion', () => {
    it('should generate bash completion script', () => {
      registry.register({ name: 'deploy', description: 'Deploy' });
      registry.register({ name: 'test', description: 'Test' });
      registry.register({ name: 'build', description: 'Build' });

      const script = registry.generateBashCompletion('mycli');

      assert.ok(script.includes('_mycli_completions'));
      assert.ok(script.includes('deploy'));
      assert.ok(script.includes('test'));
      assert.ok(script.includes('build'));
      assert.ok(script.includes('complete -F'));
    });

    it('should handle empty registry', () => {
      const script = registry.generateBashCompletion('mycli');

      assert.ok(script.includes('_mycli_completions'));
      assert.ok(script.includes('complete -F'));
    });
  });
});
