#!/usr/bin/env node

/**
 * AgentScope CLI
 * Command-line interface for agent architecture documentation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { VERSION } from '../core/index.js';
import { registerScanCommand } from './commands/scan.js';
import { registerValidateCommand } from './commands/validate.js';

// Create the main program
const program = new Command();

// Configure program
program
  .name('agentscope')
  .description('Agent Architecture Documentation & Visualization Tool')
  .version(VERSION, '-V, --version', 'Output the version number')
  .option('--no-color', 'Disable colored output');

// Register commands
registerScanCommand(program);
registerValidateCommand(program);

// Add help text
program.addHelpText(
  'after',
  `
${chalk.cyan('Examples:')}
  ${chalk.gray('# Scan current directory and generate documentation')}
  $ agentscope scan

  ${chalk.gray('# Scan specific project')}
  $ agentscope scan /path/to/project

  ${chalk.gray('# Output raw JSON configuration')}
  $ agentscope scan --format json

  ${chalk.gray('# Validate configuration only')}
  $ agentscope validate

  ${chalk.gray('# Validate with strict mode (warnings are errors)')}
  $ agentscope validate --strict

${chalk.cyan('Documentation:')}
  https://github.com/vipasane/agentscope
`
);

// Parse arguments
program.parse();
