#!/usr/bin/env node

/**
 * Advanced CLI example
 * Demonstrates all features of the framework
 */

import {
  CommandRegistry,
  OutputFormatter,
  InteractivePrompt,
  Spinner,
  ProgressBar,
  c,
  setupGlobalErrorHandlers,
  validateEmail,
  validateRange,
} from '../dist/index.js';

// Setup error handlers with verbose mode
setupGlobalErrorHandlers(process.env.VERBOSE === 'true');

const cli = new CommandRegistry();
const prompt = new InteractivePrompt();

// Agent management commands
cli.register({
  name: 'agent',
  description: 'Agent management',
  subcommands: [
    {
      name: 'spawn',
      description: 'Spawn a new agent',
      aliases: ['create', 'new'],
      options: [
        {
          name: 'type',
          short: 't',
          long: 'type',
          type: 'string',
          description: 'Agent type',
          required: true,
          choices: ['coder', 'tester', 'reviewer', 'researcher'],
        },
        {
          name: 'name',
          short: 'n',
          long: 'name',
          type: 'string',
          description: 'Agent name',
        },
        {
          name: 'count',
          short: 'c',
          long: 'count',
          type: 'number',
          description: 'Number of agents to spawn',
          default: 1,
          validate: (value) => validateRange(value as number, 1, 10, 'count'),
        },
      ],
      examples: [
        'agent spawn --type coder',
        'agent spawn -t coder -n my-coder',
        'agent spawn -t tester --count 3',
      ],
      action: async (args) => {
        const type = args.type as string;
        const name = args.name as string || `${type}-${Date.now()}`;
        const count = args.count as number;

        const spinner = new Spinner({ text: `Spawning ${count} ${type} agent(s)...` });
        spinner.start();

        // Simulate spawning
        await new Promise((resolve) => setTimeout(resolve, 1500));

        spinner.success(`✓ Spawned ${count} ${type} agent(s): ${name}`);

        console.log(c.dim('\nAgent details:'));
        console.log(`  Type: ${c.cyan(type)}`);
        console.log(`  Name: ${c.cyan(name)}`);
        console.log(`  Count: ${c.cyan(count.toString())}`);
      },
    },
    {
      name: 'list',
      description: 'List all agents',
      aliases: ['ls'],
      options: [
        {
          name: 'format',
          short: 'f',
          long: 'format',
          type: 'string',
          description: 'Output format',
          choices: ['table', 'json', 'yaml'],
          default: 'table',
        },
        {
          name: 'status',
          short: 's',
          long: 'status',
          type: 'string',
          description: 'Filter by status',
          choices: ['active', 'idle', 'stopped'],
        },
      ],
      action: async (args) => {
        const agents = [
          { id: 1, name: 'coder-1', type: 'coder', status: 'active', tasks: 3 },
          { id: 2, name: 'tester-1', type: 'tester', status: 'idle', tasks: 0 },
          { id: 3, name: 'reviewer-1', type: 'reviewer', status: 'active', tasks: 1 },
        ];

        // Filter by status
        const filtered = args.status
          ? agents.filter((a) => a.status === args.status)
          : agents;

        const formatter = new OutputFormatter({
          format: args.format as 'table' | 'json' | 'yaml',
        });

        const output = formatter.format(filtered, [
          { header: 'ID', field: 'id', width: 5, align: 'right' },
          { header: 'Name', field: 'name', width: 15 },
          { header: 'Type', field: 'type', width: 10 },
          {
            header: 'Status',
            field: 'status',
            width: 10,
            format: (value) => {
              const status = value as string;
              return status === 'active' ? c.green(status) : c.dim(status);
            },
          },
          { header: 'Tasks', field: 'tasks', width: 5, align: 'right' },
        ]);

        console.log(output);
      },
    },
    {
      name: 'stop',
      description: 'Stop an agent',
      arguments: [
        {
          name: 'id',
          description: 'Agent ID or name',
          required: true,
        },
      ],
      options: [
        {
          name: 'force',
          short: 'f',
          long: 'force',
          type: 'boolean',
          description: 'Force stop without confirmation',
        },
      ],
      action: async (args) => {
        const id = args.id as string;
        const force = args.force as boolean;

        if (!force) {
          const confirmed = await prompt.confirm({
            message: `Stop agent ${id}?`,
            default: false,
          });

          if (!confirmed) {
            console.log(c.yellow('Cancelled'));
            return;
          }
        }

        const spinner = new Spinner({ text: `Stopping agent ${id}...` });
        spinner.start();

        await new Promise((resolve) => setTimeout(resolve, 1000));

        spinner.success(`✓ Stopped agent: ${id}`);
      },
    },
  ],
});

// Swarm management
cli.register({
  name: 'swarm',
  description: 'Swarm orchestration',
  subcommands: [
    {
      name: 'init',
      description: 'Initialize a swarm',
      options: [
        {
          name: 'topology',
          long: 'topology',
          type: 'string',
          description: 'Swarm topology',
          choices: ['hierarchical', 'mesh', 'star', 'ring'],
          default: 'hierarchical',
        },
        {
          name: 'max-agents',
          long: 'max-agents',
          type: 'number',
          description: 'Maximum number of agents',
          default: 10,
        },
      ],
      action: async (args) => {
        const topology = args.topology as string;
        const maxAgents = args['max-agents'] as number;

        console.log(c.bold('\n🐝 Initializing swarm...\n'));

        const progress = new ProgressBar({
          total: 100,
          label: 'Setup',
          showPercentage: true,
          showEta: true,
        });

        for (let i = 0; i <= 100; i += 10) {
          progress.update(i);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        progress.complete();

        console.log(c.success('\n✓ Swarm initialized successfully!\n'));
        console.log(c.dim('Configuration:'));
        console.log(`  Topology: ${c.cyan(topology)}`);
        console.log(`  Max Agents: ${c.cyan(maxAgents.toString())}`);
      },
    },
    {
      name: 'status',
      description: 'Show swarm status',
      action: async () => {
        const formatter = new OutputFormatter({ color: true });

        const status = {
          topology: 'hierarchical',
          agents: 5,
          maxAgents: 10,
          activeTasks: 12,
          uptime: '2h 34m',
        };

        console.log('\n' + formatter.box(
          `Topology: ${c.cyan(status.topology)}\n` +
          `Agents: ${c.cyan(`${status.agents}/${status.maxAgents}`)}\n` +
          `Active Tasks: ${c.cyan(status.activeTasks.toString())}\n` +
          `Uptime: ${c.cyan(status.uptime)}`,
          '🐝 Swarm Status'
        ));
      },
    },
  ],
});

// Configuration wizard
cli.register({
  name: 'wizard',
  description: 'Interactive configuration wizard',
  action: async () => {
    console.log(c.bold('\n✨ Configuration Wizard\n'));

    // Project name
    const projectName = await prompt.ask({
      message: 'Project name',
      validate: (value) => value.length > 0 || 'Project name is required',
    });

    // Email
    const email = await prompt.email('Your email');

    // Agent types
    const agentTypes = await prompt.multiSelect({
      message: 'Select agent types to enable',
      choices: [
        { label: 'Coder', value: 'coder' },
        { label: 'Tester', value: 'tester' },
        { label: 'Reviewer', value: 'reviewer' },
        { label: 'Researcher', value: 'researcher' },
      ],
      min: 1,
    });

    // Max agents
    const maxAgents = await prompt.number('Maximum concurrent agents', {
      min: 1,
      max: 20,
      default: 10,
    });

    // Confirmation
    console.log(c.bold('\nConfiguration Summary:'));
    console.log(`  Project: ${c.cyan(projectName)}`);
    console.log(`  Email: ${c.cyan(email)}`);
    console.log(`  Agent Types: ${c.cyan(agentTypes.join(', '))}`);
    console.log(`  Max Agents: ${c.cyan(maxAgents.toString())}`);

    const confirmed = await prompt.confirm({
      message: 'Save this configuration?',
      default: true,
    });

    if (!confirmed) {
      console.log(c.yellow('\nConfiguration cancelled'));
      return;
    }

    const spinner = new Spinner({ text: 'Saving configuration...' });
    spinner.start();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    spinner.success('Configuration saved successfully!');
  },
});

// Execute CLI
cli.execute(process.argv.slice(2)).catch((error) => {
  console.error(c.error(`\nError: ${error.message}`));
  process.exit(1);
});
