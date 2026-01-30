/**
 * Integration tests for complete CLI workflows
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CommandRegistry } from '../../src/command/CommandRegistry.js';
import { ArgumentParser } from '../../src/parser/ArgumentParser.js';
import { OutputFormatter } from '../../src/output/OutputFormatter.js';
import type { CommandConfig } from '../../src/types.js';

describe('CLI Workflow Integration', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('Basic Command Workflow', () => {
    it('should execute a complete command workflow', async () => {
      let executed = false;
      let receivedArgs: any;

      const command: CommandConfig = {
        name: 'deploy',
        description: 'Deploy application',
        arguments: [
          { name: 'environment', description: 'Target environment', required: true },
        ],
        options: [
          {
            name: 'force',
            long: 'force',
            short: 'f',
            type: 'boolean',
            description: 'Force deployment',
          },
          {
            name: 'replicas',
            long: 'replicas',
            short: 'r',
            type: 'number',
            description: 'Number of replicas',
            default: 1,
          },
        ],
        action: async (args) => {
          executed = true;
          receivedArgs = args;
        },
      };

      registry.register(command);
      await registry.execute(['deploy', 'production', '--force', '--replicas', '3']);

      assert.equal(executed, true);
      assert.equal(receivedArgs.environment, 'production');
      assert.equal(receivedArgs.force, true);
      assert.equal(receivedArgs.replicas, 3);
    });

    it('should handle command with validation', async () => {
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', () => {});

      const command: CommandConfig = {
        name: 'config',
        description: 'Configure app',
        options: [
          {
            name: 'env',
            long: 'env',
            type: 'string',
            description: 'Environment',
            required: true,
            choices: ['dev', 'staging', 'prod'],
          },
        ],
        action: async () => {},
      };

      registry.register(command);

      try {
        await registry.execute(['config', '--env', 'invalid']);
        assert.fail('Should have exited');
      } catch (e) {
        assert.equal((e as Error).message, 'MOCK_EXIT');
      }

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });

  describe('Subcommand Workflow', () => {
    it('should execute nested subcommands', async () => {
      let executedCommands: string[] = [];

      const command: CommandConfig = {
        name: 'db',
        description: 'Database operations',
        subcommands: [
          {
            name: 'migrate',
            description: 'Run migrations',
            subcommands: [
              {
                name: 'up',
                description: 'Migrate up',
                action: async () => {
                  executedCommands.push('db:migrate:up');
                },
              },
              {
                name: 'down',
                description: 'Migrate down',
                action: async () => {
                  executedCommands.push('db:migrate:down');
                },
              },
            ],
          },
          {
            name: 'seed',
            description: 'Seed database',
            action: async () => {
              executedCommands.push('db:seed');
            },
          },
        ],
      };

      registry.register(command);

      await registry.execute(['db', 'seed']);
      assert.deepEqual(executedCommands, ['db:seed']);
    });

    it('should pass arguments through subcommand chain', async () => {
      let receivedArgs: any;

      const command: CommandConfig = {
        name: 'user',
        description: 'User management',
        subcommands: [
          {
            name: 'create',
            description: 'Create user',
            arguments: [
              { name: 'email', description: 'Email', required: true },
              { name: 'name', description: 'Name', required: false },
            ],
            options: [
              {
                name: 'admin',
                long: 'admin',
                type: 'boolean',
                description: 'Admin user',
              },
            ],
            action: async (args) => {
              receivedArgs = args;
            },
          },
        ],
      };

      registry.register(command);
      await registry.execute(['user', 'create', 'test@example.com', 'John', '--admin']);

      assert.equal(receivedArgs.email, 'test@example.com');
      assert.equal(receivedArgs.name, 'John');
      assert.equal(receivedArgs.admin, true);
    });
  });

  describe('Parser Integration', () => {
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
        name: 'output',
        short: 'o',
        long: 'output',
        type: 'string',
        description: 'Output file',
      });

      parser.addOption({
        name: 'count',
        short: 'c',
        long: 'count',
        type: 'number',
        description: 'Count',
        default: 1,
      });

      parser.addArgument({
        name: 'files',
        description: 'Input files',
        multiple: true,
      });

      const args = parser.parse([
        '-v',
        '--output=result.txt',
        '--count',
        '5',
        'file1.txt',
        'file2.txt',
        'file3.txt',
      ]);

      assert.equal(args.verbose, true);
      assert.equal(args.output, 'result.txt');
      assert.equal(args.count, 5);
      assert.deepEqual(args.files, ['file1.txt', 'file2.txt', 'file3.txt']);
    });

    it('should handle mixed short flags', () => {
      const parser = new ArgumentParser();

      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });

      parser.addOption({
        name: 'force',
        short: 'f',
        long: 'force',
        type: 'boolean',
        description: 'Force',
      });

      parser.addOption({
        name: 'quiet',
        short: 'q',
        long: 'quiet',
        type: 'boolean',
        description: 'Quiet',
      });

      const args = parser.parse(['-vfq']);

      assert.equal(args.verbose, true);
      assert.equal(args.force, true);
      assert.equal(args.quiet, true);
    });
  });

  describe('Formatter Integration', () => {
    it('should format command output as table', () => {
      const formatter = new OutputFormatter({ format: 'table', color: false });
      const data = [
        { name: 'Alice', role: 'Admin', active: true },
        { name: 'Bob', role: 'User', active: false },
        { name: 'Charlie', role: 'User', active: true },
      ];

      const result = formatter.format(data, [
        { header: 'Name', field: 'name' },
        { header: 'Role', field: 'role' },
        { header: 'Active', field: 'active' },
      ]);

      assert.ok(result.includes('Name'));
      assert.ok(result.includes('Alice'));
      assert.ok(result.includes('Bob'));
      assert.ok(result.includes('Charlie'));
      assert.ok(result.includes('Admin'));
      assert.ok(result.includes('User'));
    });

    it('should format command output as JSON', () => {
      const formatter = new OutputFormatter({ format: 'json' });
      const data = {
        status: 'success',
        deployments: [
          { env: 'staging', version: '1.2.0' },
          { env: 'production', version: '1.1.0' },
        ],
      };

      const result = formatter.format(data);
      const parsed = JSON.parse(result);

      assert.equal(parsed.status, 'success');
      assert.equal(parsed.deployments.length, 2);
      assert.equal(parsed.deployments[0].env, 'staging');
    });

    it('should format command output as YAML', () => {
      const formatter = new OutputFormatter({ format: 'yaml' });
      const data = {
        name: 'myapp',
        version: '1.0.0',
        dependencies: ['express', 'react'],
      };

      const result = formatter.format(data);

      assert.ok(result.includes('name: myapp'));
      assert.ok(result.includes('version: 1.0.0'));
      assert.ok(result.includes('- express'));
      assert.ok(result.includes('- react'));
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle database migration workflow', async () => {
      const steps: string[] = [];

      const command: CommandConfig = {
        name: 'db',
        description: 'Database operations',
        subcommands: [
          {
            name: 'migrate',
            description: 'Run migrations',
            options: [
              {
                name: 'to',
                long: 'to',
                type: 'string',
                description: 'Target version',
              },
              {
                name: 'dry-run',
                long: 'dry-run',
                type: 'boolean',
                description: 'Dry run',
              },
            ],
            action: async (args) => {
              steps.push('migrate');
              if (args['dry-run']) {
                steps.push('dry-run');
              }
              if (args.to) {
                steps.push(`to:${args.to}`);
              }
            },
          },
          {
            name: 'rollback',
            description: 'Rollback migrations',
            options: [
              {
                name: 'steps',
                long: 'steps',
                short: 's',
                type: 'number',
                description: 'Steps to rollback',
                default: 1,
              },
            ],
            action: async (args) => {
              steps.push('rollback');
              steps.push(`steps:${args.steps}`);
            },
          },
        ],
      };

      registry.register(command);

      // Test migrate with dry-run
      await registry.execute(['db', 'migrate', '--dry-run', '--to', 'v2.0']);
      assert.deepEqual(steps, ['migrate', 'dry-run', 'to:v2.0']);

      // Reset and test rollback
      steps.length = 0;
      await registry.execute(['db', 'rollback', '--steps', '3']);
      assert.deepEqual(steps, ['rollback', 'steps:3']);
    });

    it('should handle deployment workflow with validation', async () => {
      const deployments: Array<{ env: string; version: string; rollback: boolean }> = [];

      const command: CommandConfig = {
        name: 'deploy',
        description: 'Deploy application',
        arguments: [
          { name: 'environment', description: 'Environment', required: true },
        ],
        options: [
          {
            name: 'version',
            long: 'version',
            short: 'v',
            type: 'string',
            description: 'Version',
            required: true,
            validate: (value) => {
              const version = value as string;
              return /^\d+\.\d+\.\d+$/.test(version) || 'Invalid version format';
            },
          },
          {
            name: 'rollback-on-failure',
            long: 'rollback-on-failure',
            type: 'boolean',
            description: 'Rollback on failure',
            default: true,
          },
        ],
        action: async (args) => {
          deployments.push({
            env: args.environment as string,
            version: args.version as string,
            rollback: args['rollback-on-failure'] as boolean,
          });
        },
      };

      registry.register(command);

      await registry.execute(['deploy', 'production', '--version', '1.2.3']);

      assert.equal(deployments.length, 1);
      assert.equal(deployments[0].env, 'production');
      assert.equal(deployments[0].version, '1.2.3');
      assert.equal(deployments[0].rollback, true);
    });

    it('should handle multi-step workflow with state', async () => {
      const state = {
        initialized: false,
        configured: false,
        deployed: false,
      };

      const command: CommandConfig = {
        name: 'app',
        description: 'Application management',
        subcommands: [
          {
            name: 'init',
            description: 'Initialize',
            action: async () => {
              state.initialized = true;
            },
          },
          {
            name: 'config',
            description: 'Configure',
            action: async () => {
              if (!state.initialized) {
                throw new Error('Must initialize first');
              }
              state.configured = true;
            },
          },
          {
            name: 'deploy',
            description: 'Deploy',
            action: async () => {
              if (!state.initialized || !state.configured) {
                throw new Error('Must initialize and configure first');
              }
              state.deployed = true;
            },
          },
        ],
      };

      registry.register(command);

      // Execute workflow in correct order
      await registry.execute(['app', 'init']);
      assert.equal(state.initialized, true);

      await registry.execute(['app', 'config']);
      assert.equal(state.configured, true);

      await registry.execute(['app', 'deploy']);
      assert.equal(state.deployed, true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle and recover from command errors', async () => {
      const errors: string[] = [];
      const exitMock = mock.method(process, 'exit', () => {
        throw new Error('MOCK_EXIT');
      });
      const consoleErrorMock = mock.method(console, 'error', (msg: string) => {
        errors.push(msg);
      });

      const command: CommandConfig = {
        name: 'risky',
        description: 'Risky operation',
        action: async () => {
          throw new Error('Operation failed');
        },
      };

      registry.register(command);

      try {
        await registry.execute(['risky']);
      } catch (e) {
        // Expected
      }

      assert.ok(errors.some((e) => e.includes('Operation failed')));

      exitMock.mock.restore();
      consoleErrorMock.mock.restore();
    });
  });
});
