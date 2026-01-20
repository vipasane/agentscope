/**
 * Validate Command
 * Validates the agent configuration without generating output
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import { validate, VERSION, type ScanError, type AgentScopeConfig } from '../../core/index.js';

export interface ValidateCommandOptions {
  verbose?: boolean;
  strict?: boolean;
}

/**
 * Register the validate command
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate agent configuration without generating output')
    .argument('[path]', 'Project path to validate', '.')
    .option('-v, --verbose', 'Verbose output', false)
    .option('-s, --strict', 'Treat warnings as errors', false)
    .action(async (path: string, options: ValidateCommandOptions) => {
      await executeValidate(path, options);
    });
}

/**
 * Execute the validate command
 */
async function executeValidate(path: string, options: ValidateCommandOptions): Promise<void> {
  const rootPath = resolve(process.cwd(), path);

  console.log(chalk.blue('\n  AgentScope v' + VERSION));
  console.log(chalk.gray('  Validating: ' + rootPath));
  console.log('');

  try {
    const result = await validate({
      rootPath,
      verbose: options.verbose,
      validateOnly: true,
    });

    // Print configuration summary
    printConfigSummary(result.config);

    // Check for issues
    const hasErrors = result.errors.length > 0;
    const hasWarnings = result.warnings.length > 0;

    // Print errors
    if (hasErrors) {
      console.log(chalk.red('\n  Errors (' + result.errors.length + '):'));
      printIssues(result.errors, 'error');
    }

    // Print warnings
    if (hasWarnings) {
      console.log(chalk.yellow('\n  Warnings (' + result.warnings.length + '):'));
      printIssues(result.warnings, 'warning');
    }

    // Detailed validation checks
    if (options.verbose) {
      console.log('');
      printDetailedValidation(result.config);
    }

    // Final status
    console.log('');
    const isValid = options.strict
      ? !hasErrors && !hasWarnings
      : !hasErrors;

    if (isValid) {
      console.log(chalk.green('  Validation passed'));
      console.log(chalk.gray(`  Completed in ${result.config.metadata.duration}ms`));
    } else {
      console.log(chalk.red('  Validation failed'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n  Error: ') + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

/**
 * Print configuration summary
 */
function printConfigSummary(config: AgentScopeConfig): void {
  const counts = [
    { label: 'Agents', count: config.agents.length, icon: '🤖' },
    { label: 'Skills', count: config.skills.length, icon: '⚡' },
    { label: 'Hooks', count: config.hooks.length, icon: '🪝' },
    { label: 'Commands', count: config.commands.length, icon: '📝' },
    { label: 'MCP Servers', count: config.mcpServers.length, icon: '🔌' },
  ];

  console.log(chalk.cyan('  Configuration found:'));
  for (const { label, count, icon } of counts) {
    const countStr = count.toString().padStart(3);
    console.log(chalk.gray(`    ${icon} ${countStr} ${label}`));
  }
}

/**
 * Print issues (errors or warnings)
 */
function printIssues(issues: ScanError[], type: 'error' | 'warning'): void {
  const color = type === 'error' ? chalk.red : chalk.yellow;
  const icon = type === 'error' ? 'x' : '!';

  for (const issue of issues) {
    console.log(`    ${color(icon)} [${chalk.bold(issue.code)}]`);
    console.log(chalk.gray(`      ${issue.message}`));

    if (issue.file) {
      console.log(chalk.gray(`      File: ${issue.file}`));
    }

    if (issue.line) {
      console.log(chalk.gray(`      Line: ${issue.line}`));
    }

    if (issue.suggestion) {
      console.log(chalk.cyan(`      Suggestion: ${issue.suggestion}`));
    }
  }
}

/**
 * Print detailed validation results
 */
function printDetailedValidation(config: AgentScopeConfig): void {
  console.log(chalk.cyan('  Detailed Validation:'));
  console.log('');

  // Check agents
  const agentChecks = validateAgents(config);
  printChecks('Agents', agentChecks);

  // Check skills
  const skillChecks = validateSkills(config);
  printChecks('Skills', skillChecks);

  // Check hooks
  const hookChecks = validateHooks(config);
  printChecks('Hooks', hookChecks);

  // Check MCP servers
  const mcpChecks = validateMcpServers(config);
  printChecks('MCP Servers', mcpChecks);

  // Check for orphaned references
  const refChecks = validateReferences(config);
  printChecks('References', refChecks);
}

interface Check {
  name: string;
  passed: boolean;
  message?: string;
}

/**
 * Print check results
 */
function printChecks(category: string, checks: Check[]): void {
  console.log(chalk.bold(`    ${category}:`));

  for (const check of checks) {
    const icon = check.passed ? chalk.green('OK') : chalk.red('XX');
    console.log(`      ${icon} ${check.name}`);
    if (check.message && !check.passed) {
      console.log(chalk.gray(`         ${check.message}`));
    }
  }

  console.log('');
}

/**
 * Validate agents
 */
function validateAgents(config: AgentScopeConfig): Check[] {
  const checks: Check[] = [];

  // Check for at least one agent
  checks.push({
    name: 'At least one agent defined',
    passed: config.agents.length > 0,
    message: 'No agents found in configuration',
  });

  // Check for coordinator
  const hasCoordinator = config.agents.some(a => a.type === 'coordinator');
  checks.push({
    name: 'Coordinator agent present',
    passed: hasCoordinator,
    message: 'Consider adding a coordinator agent for complex workflows',
  });

  // Check for unique names
  const names = config.agents.map(a => a.name);
  const uniqueNames = new Set(names);
  checks.push({
    name: 'Agent names are unique',
    passed: names.length === uniqueNames.size,
    message: 'Duplicate agent names found',
  });

  // Check delegation targets exist
  const agentNames = new Set(config.agents.map(a => a.name));
  const invalidDelegations: string[] = [];
  for (const agent of config.agents) {
    for (const target of agent.delegatesTo ?? []) {
      if (!agentNames.has(target)) {
        invalidDelegations.push(`${agent.name} -> ${target}`);
      }
    }
  }
  checks.push({
    name: 'Delegation targets exist',
    passed: invalidDelegations.length === 0,
    message: `Invalid delegations: ${invalidDelegations.join(', ')}`,
  });

  return checks;
}

/**
 * Validate skills
 */
function validateSkills(config: AgentScopeConfig): Check[] {
  const checks: Check[] = [];

  // Check for unique names
  const names = config.skills.map(s => s.name);
  const uniqueNames = new Set(names);
  checks.push({
    name: 'Skill names are unique',
    passed: names.length === uniqueNames.size,
    message: 'Duplicate skill names found',
  });

  // Check skill dependencies exist
  const skillNames = new Set(config.skills.map(s => s.name));
  const invalidDeps: string[] = [];
  for (const skill of config.skills) {
    for (const dep of skill.dependencies ?? []) {
      if (!skillNames.has(dep)) {
        invalidDeps.push(`${skill.name} -> ${dep}`);
      }
    }
  }
  checks.push({
    name: 'Skill dependencies exist',
    passed: invalidDeps.length === 0,
    message: `Invalid dependencies: ${invalidDeps.join(', ')}`,
  });

  return checks;
}

/**
 * Validate hooks
 */
function validateHooks(config: AgentScopeConfig): Check[] {
  const checks: Check[] = [];

  // Check hooks have commands
  const hooksWithoutCommands = config.hooks.filter(h => !h.command);
  checks.push({
    name: 'All hooks have commands',
    passed: hooksWithoutCommands.length === 0,
    message: `${hooksWithoutCommands.length} hooks missing commands`,
  });

  return checks;
}

/**
 * Validate MCP servers
 */
function validateMcpServers(config: AgentScopeConfig): Check[] {
  const checks: Check[] = [];

  // Check for unique names
  const names = config.mcpServers.map(s => s.name);
  const uniqueNames = new Set(names);
  checks.push({
    name: 'Server names are unique',
    passed: names.length === uniqueNames.size,
    message: 'Duplicate server names found',
  });

  // Check commands are not empty
  const emptyCommands = config.mcpServers.filter(s => !s.command.trim());
  checks.push({
    name: 'All servers have commands',
    passed: emptyCommands.length === 0,
    message: `${emptyCommands.length} servers with empty commands`,
  });

  // Check at least one server is enabled
  const enabledServers = config.mcpServers.filter(s => !s.disabled);
  checks.push({
    name: 'At least one server enabled',
    passed: enabledServers.length > 0 || config.mcpServers.length === 0,
    message: 'All MCP servers are disabled',
  });

  return checks;
}

/**
 * Validate references between components
 */
function validateReferences(config: AgentScopeConfig): Check[] {
  const checks: Check[] = [];

  // Check agent tools reference existing MCP servers
  const serverNames = new Set(config.mcpServers.map(s => s.name));
  const serverTools = new Set(config.mcpServers.flatMap(s => s.tools ?? []));

  const orphanedTools: string[] = [];
  for (const agent of config.agents) {
    for (const tool of agent.tools ?? []) {
      if (!serverNames.has(tool) && !serverTools.has(tool)) {
        orphanedTools.push(`${agent.name}.${tool}`);
      }
    }
  }

  checks.push({
    name: 'Agent tools reference known servers',
    passed: orphanedTools.length === 0,
    message: `Unknown tools: ${orphanedTools.slice(0, 5).join(', ')}${orphanedTools.length > 5 ? '...' : ''}`,
  });

  return checks;
}
