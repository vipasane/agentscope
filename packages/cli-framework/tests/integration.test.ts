/**
 * Integration tests for CLI Framework
 * Tests the complete workflow: parse args -> validate -> execute command -> format output
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandRegistry } from '../src/command/CommandRegistry.js';
import { ArgumentParser } from '../src/parser/ArgumentParser.js';
import { OutputFormatter } from '../src/output/OutputFormatter.js';
import { ErrorHandler } from '../src/command/ErrorHandler.js';
import { ValidationError } from '../src/utils/validators.js';
import type { CommandConfig } from '../src/types.js';

describe('CLI Framework Integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Complete CLI Workflow', () => {
    it('should execute full command workflow', async () => {
      const registry = new CommandRegistry();
      const formatter = new OutputFormatter({ color: false });

      const action = vi.fn((args) => {
        const output = formatter.json({ success: true, name: args.name });
        console.log(output);
      });

      registry.register({
        name: 'greet',
        description: 'Greet a user',
        options: [
          {
            name: 'name',
            long: 'name',
            short: 'n',
            type: 'string',
            description: 'User name',
            required: true,
          },
        ],
        action,
      });

      await registry.execute(['greet', '--name', 'Alice']);

      expect(action).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"success": true')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name": "Alice"')
      );
    });

    it('should handle validation errors gracefully', async () => {
      const registry = new CommandRegistry();

      registry.register({
        name: 'test',
        description: 'Test command',
        options: [
          {
            name: 'email',
            long: 'email',
            type: 'string',
            description: 'Email address',
            validate: (value) => {
              const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return regex.test(value as string) || 'Invalid email';
            },
          },
        ],
        action: vi.fn(),
      });

      try {
        await registry.execute(['test', '--email', 'invalid-email']);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should format different output types', async () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { id: 1, name: 'Alice', status: 'active' },
        { id: 2, name: 'Bob', status: 'inactive' },
      ];

      // Test JSON output
      const jsonOutput = formatter.json(data);
      expect(jsonOutput).toContain('"id": 1');
      expect(jsonOutput).toContain('"name": "Alice"');

      // Test YAML output
      const yamlOutput = formatter.yaml(data);
      expect(yamlOutput).toContain('- id: 1');
      expect(yamlOutput).toContain('name: Alice');

      // Test table output
      const tableOutput = formatter.table(data, [
        { header: 'ID', field: 'id' },
        { header: 'Name', field: 'name' },
        { header: 'Status', field: 'status' },
      ]);
      expect(tableOutput).toContain('Alice');
      expect(tableOutput).toContain('Bob');
    });
  });

  describe('Command with Subcommands', () => {
    it('should execute subcommands correctly', async () => {
      const registry = new CommandRegistry();
      const mainAction = vi.fn();
      const subAction = vi.fn();

      registry.register({
        name: 'db',
        description: 'Database commands',
        action: mainAction,
        subcommands: [
          {
            name: 'migrate',
            description: 'Run migrations',
            options: [
              {
                name: 'direction',
                long: 'direction',
                type: 'string',
                description: 'Migration direction',
                choices: ['up', 'down'],
                default: 'up',
              },
            ],
            action: subAction,
          },
        ],
      });

      await registry.execute(['db', 'migrate', '--direction', 'up']);

      expect(subAction).toHaveBeenCalled();
      expect(mainAction).not.toHaveBeenCalled();

      const callArgs = subAction.mock.calls[0][0];
      expect(callArgs.direction).toBe('up');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle and format errors end-to-end', async () => {
      const handler = new ErrorHandler({ verbose: false });
      const error = new ValidationError('Invalid input', 'email', 'bad@');

      try {
        handler.handle(error, { command: 'test' });
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation Error')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('email')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('test --help')
      );
    });

    it('should wrap async functions with error handling', async () => {
      const riskyFunction = async (value: number) => {
        if (value < 0) {
          throw new Error('Value must be positive');
        }
        return value * 2;
      };

      const wrapped = ErrorHandler.wrap(riskyFunction, { command: 'calc' });

      const result = await wrapped(5);
      expect(result).toBe(10);

      try {
        await wrapped(-1);
      } catch (e: any) {
        expect(e.message).toContain('Process exited');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Value must be positive')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('calc --help')
      );
    });
  });

  describe('Argument Parser Integration', () => {
    it('should parse complex argument combinations', () => {
      const parser = new ArgumentParser();

      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });

      parser.addOption({
        name: 'config',
        short: 'c',
        long: 'config',
        type: 'string',
        description: 'Config file',
        default: 'config.json',
      });

      parser.addOption({
        name: 'port',
        short: 'p',
        long: 'port',
        type: 'number',
        description: 'Port',
        default: 3000,
      });

      parser.addArgument({
        name: 'files',
        description: 'Input files',
        multiple: true,
      });

      const args = parser.parse([
        '-v',
        '--config=custom.json',
        '--port',
        '8080',
        'file1.txt',
        'file2.txt',
      ]);

      expect(args.verbose).toBe(true);
      expect(args.config).toBe('custom.json');
      expect(args.port).toBe(8080);
      expect(args.files).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should validate all argument constraints', () => {
      const parser = new ArgumentParser();

      parser.addOption({
        name: 'level',
        long: 'level',
        type: 'string',
        description: 'Log level',
        choices: ['error', 'warn', 'info', 'debug'],
        required: true,
      });

      parser.addOption({
        name: 'threads',
        long: 'threads',
        type: 'number',
        description: 'Number of threads',
        validate: (value) => {
          const num = Number(value);
          return (num >= 1 && num <= 16) || 'Threads must be between 1 and 16';
        },
      });

      // Valid args
      const args = parser.parse(['--level', 'info', '--threads', '4']);
      expect(args.level).toBe('info');
      expect(args.threads).toBe(4);

      // Invalid choice
      expect(() => {
        parser.parse(['--level', 'trace']);
      }).toThrow(ValidationError);

      // Invalid validation
      expect(() => {
        parser.parse(['--level', 'info', '--threads', '20']);
      }).toThrow(ValidationError);

      // Missing required
      expect(() => {
        parser.parse(['--threads', '4']);
      }).toThrow(ValidationError);
    });
  });

  describe('Output Formatting Integration', () => {
    it('should format complex nested data structures', () => {
      const formatter = new OutputFormatter({ color: false });

      const complexData = {
        user: {
          id: 1,
          name: 'Alice',
          email: 'alice@example.com',
          roles: ['admin', 'user'],
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        timestamp: '2024-01-01T00:00:00Z',
      };

      // JSON formatting
      const json = formatter.json(complexData);
      expect(json).toContain('"id": 1');
      expect(json).toContain('"roles"');
      expect(json).toContain('"settings"');

      // YAML formatting
      const yaml = formatter.yaml(complexData);
      expect(yaml).toContain('user:');
      expect(yaml).toContain('name: Alice');
      expect(yaml).toContain('theme: dark');
    });

    it('should create formatted boxes and lists', () => {
      const formatter = new OutputFormatter({ color: false });

      // Box
      const box = formatter.box('Important message', 'Warning');
      expect(box).toContain('Warning');
      expect(box).toContain('Important message');
      expect(box).toContain('┌');
      expect(box).toContain('└');

      // List
      const list = formatter.list([
        'First item',
        'Second item',
        'Third item',
      ]);
      expect(list).toContain('First item');
      expect(list).toContain('Second item');
      expect(list).toContain('Third item');
    });
  });

  describe('Real-world CLI Scenarios', () => {
    it('should implement a file processing CLI', async () => {
      const registry = new CommandRegistry();
      const formatter = new OutputFormatter({ color: false });
      const processedFiles: string[] = [];

      registry.register({
        name: 'process',
        description: 'Process files',
        options: [
          {
            name: 'format',
            long: 'format',
            short: 'f',
            type: 'string',
            description: 'Output format',
            choices: ['json', 'yaml', 'table'],
            default: 'json',
          },
          {
            name: 'verbose',
            long: 'verbose',
            short: 'v',
            type: 'boolean',
            description: 'Verbose output',
          },
        ],
        arguments: [
          {
            name: 'files',
            description: 'Files to process',
            multiple: true,
            required: true,
          },
        ],
        action: (args) => {
          processedFiles.push(...(args.files as string[]));

          const results = (args.files as string[]).map((file) => ({
            file,
            status: 'processed',
            size: 1024,
          }));

          if (args.format === 'json') {
            console.log(formatter.json(results));
          } else if (args.format === 'table') {
            console.log(
              formatter.table(results, [
                { header: 'File', field: 'file' },
                { header: 'Status', field: 'status' },
                { header: 'Size', field: 'size' },
              ])
            );
          }
        },
      });

      await registry.execute([
        'process',
        '--format',
        'json',
        'file1.txt',
        'file2.txt',
      ]);

      expect(processedFiles).toEqual(['file1.txt', 'file2.txt']);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should implement a config management CLI', async () => {
      const registry = new CommandRegistry();
      const config: Record<string, any> = {};

      registry.register({
        name: 'config',
        description: 'Manage configuration',
        subcommands: [
          {
            name: 'get',
            description: 'Get config value',
            arguments: [
              {
                name: 'key',
                description: 'Config key',
                required: true,
              },
            ],
            action: (args) => {
              console.log(config[args.key as string] || 'undefined');
            },
          },
          {
            name: 'set',
            description: 'Set config value',
            arguments: [
              {
                name: 'key',
                description: 'Config key',
                required: true,
              },
              {
                name: 'value',
                description: 'Config value',
                required: true,
              },
            ],
            action: (args) => {
              config[args.key as string] = args.value;
              console.log('Config updated');
            },
          },
          {
            name: 'list',
            description: 'List all config',
            action: () => {
              const formatter = new OutputFormatter({ color: false });
              console.log(formatter.json(config));
            },
          },
        ],
      });

      // Set values
      await registry.execute(['config', 'set', 'theme', 'dark']);
      await registry.execute(['config', 'set', 'lang', 'en']);

      expect(config.theme).toBe('dark');
      expect(config.lang).toBe('en');

      // Get value
      consoleLogSpy.mockClear();
      await registry.execute(['config', 'get', 'theme']);
      expect(consoleLogSpy).toHaveBeenCalledWith('dark');

      // List all
      consoleLogSpy.mockClear();
      await registry.execute(['config', 'list']);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"theme"')
      );
    });
  });

  describe('Help Generation Integration', () => {
    it('should generate comprehensive help output', async () => {
      const registry = new CommandRegistry();

      registry.register({
        name: 'deploy',
        description: 'Deploy application',
        aliases: ['d'],
        options: [
          {
            name: 'env',
            long: 'env',
            short: 'e',
            type: 'string',
            description: 'Environment',
            choices: ['dev', 'staging', 'prod'],
            required: true,
          },
          {
            name: 'verbose',
            long: 'verbose',
            short: 'v',
            type: 'boolean',
            description: 'Verbose output',
          },
        ],
        arguments: [
          {
            name: 'version',
            description: 'Version to deploy',
            required: true,
          },
        ],
        examples: [
          'deploy --env prod v1.2.3',
          'deploy -e staging v1.2.4-beta',
        ],
      });

      await registry.execute(['deploy', '--help']);

      const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');

      expect(output).toContain('Usage');
      expect(output).toContain('Options');
      expect(output).toContain('Arguments');
      expect(output).toContain('Examples');
      expect(output).toContain('--env');
      expect(output).toContain('version');
      expect(output).toContain('deploy --env prod v1.2.3');
    });
  });
});
