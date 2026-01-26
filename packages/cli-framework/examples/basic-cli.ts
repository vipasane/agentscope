#!/usr/bin/env node

/**
 * Basic CLI example
 * Demonstrates command registration, argument parsing, and output formatting
 */

import {
  CommandRegistry,
  OutputFormatter,
  setupGlobalErrorHandlers,
  c,
} from '../dist/index.js';

// Setup global error handlers
setupGlobalErrorHandlers(process.env.VERBOSE === 'true');

// Create registry
const cli = new CommandRegistry();

// Register a simple command
cli.register({
  name: 'greet',
  description: 'Greet a user',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: true,
    },
  ],
  options: [
    {
      name: 'loud',
      short: 'l',
      long: 'loud',
      type: 'boolean',
      description: 'Greet loudly',
    },
    {
      name: 'times',
      short: 't',
      long: 'times',
      type: 'number',
      description: 'Number of times to greet',
      default: 1,
    },
  ],
  examples: [
    'greet John',
    'greet John --loud',
    'greet John --times 3',
  ],
  action: async (args) => {
    const name = args.name as string;
    const loud = args.loud as boolean;
    const times = args.times as number;

    const message = `Hello, ${name}!`;
    const output = loud ? message.toUpperCase() : message;

    for (let i = 0; i < times; i++) {
      console.log(c.green(output));
    }
  },
});

// Register a command with subcommands
cli.register({
  name: 'user',
  description: 'User management',
  subcommands: [
    {
      name: 'list',
      description: 'List users',
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
      ],
      action: async (args) => {
        const users = [
          { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
          { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
          { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true },
        ];

        const formatter = new OutputFormatter({
          format: args.format as 'table' | 'json' | 'yaml',
        });

        const output = formatter.format(users, [
          { header: 'ID', field: 'id', width: 5 },
          { header: 'Name', field: 'name', width: 15 },
          { header: 'Email', field: 'email', width: 25 },
          { header: 'Active', field: 'active', width: 8 },
        ]);

        console.log(output);
      },
    },
    {
      name: 'create',
      description: 'Create a new user',
      arguments: [
        {
          name: 'name',
          description: 'User name',
          required: true,
        },
        {
          name: 'email',
          description: 'User email',
          required: true,
          validate: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value as string) || 'Invalid email address';
          },
        },
      ],
      action: async (args) => {
        console.log(c.success(`✓ User created: ${args.name} (${args.email})`));
      },
    },
  ],
});

// Execute CLI
cli.execute(process.argv.slice(2)).catch((error) => {
  console.error(c.error(`Error: ${error.message}`));
  process.exit(1);
});
