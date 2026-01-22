/**
 * Scan Command
 * Scans the project and generates documentation
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import { scanAndGenerate, validate, VERSION, type ScanError } from '../../core/index.js';
import type { AgentCategory } from '../../core/generators/diagrams/categories.js';
import type { ZoomLevel } from '../../core/generators/diagrams/component-map.js';

export interface ScanCommandOptions {
  format?: 'json' | 'markdown';
  output?: string;
  verbose?: boolean;
  validateOnly?: boolean;
  level?: ZoomLevel;
  compact?: boolean;
  category?: string[];
  type?: string[];
  pattern?: string;
  maxPerCategory?: string;
  theme?: string;
  themePath?: string;
}

/**
 * Register the scan command
 */
export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Scan project and generate agent architecture documentation')
    .argument('[path]', 'Project path to scan', '.')
    .option('-f, --format <format>', 'Output format (json, markdown)', 'markdown')
    .option('-o, --output <dir>', 'Output directory')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--validate-only', 'Validate configuration without generating output', false)
    .option('-l, --level <level>', 'Zoom level: summary, category, detail (default: category)', 'category')
    .option('-c, --compact', 'Compact mode - names only, no descriptions', false)
    .option('--category <categories...>', 'Filter by categories (github, security, sparc, etc.)')
    .option('--type <types...>', 'Filter by agent types (coordinator, worker, etc.)')
    .option('--pattern <pattern>', 'Filter by name pattern (glob-like, e.g., "github-*")')
    .option('--max-per-category <n>', 'Maximum agents per category before collapsing', '20')
    .option('--theme <name>', 'Color theme (light, dark, high-contrast-light, high-contrast-dark, colorblind-light, colorblind-dark)')
    .option('--theme-path <path>', 'Path to custom theme JSON file')
    .action(async (path: string, options: ScanCommandOptions) => {
      await executeScan(path, options);
    });
}

/**
 * Execute the scan command
 */
async function executeScan(path: string, options: ScanCommandOptions): Promise<void> {
  const rootPath = resolve(process.cwd(), path);

  console.log(chalk.blue('\n  AgentScope v' + VERSION));
  console.log(chalk.gray('  Scanning: ' + rootPath));

  // Show active filters
  if (options.level && options.level !== 'category') {
    console.log(chalk.cyan(`  Zoom level: ${options.level}`));
  }
  if (options.compact) {
    console.log(chalk.cyan('  Mode: compact'));
  }
  if (options.category?.length) {
    console.log(chalk.cyan(`  Categories: ${options.category.join(', ')}`));
  }
  if (options.type?.length) {
    console.log(chalk.cyan(`  Types: ${options.type.join(', ')}`));
  }
  if (options.pattern) {
    console.log(chalk.cyan(`  Pattern: ${options.pattern}`));
  }
  if (options.theme) {
    console.log(chalk.cyan(`  Theme: ${options.theme}`));
  }

  console.log('');

  try {
    if (options.validateOnly) {
      await runValidation(rootPath, options);
    } else if (options.format === 'json') {
      await runJsonOutput(rootPath, options);
    } else {
      await runFullScan(rootPath, options);
    }
  } catch (error) {
    console.error(chalk.red('\n  Error: ') + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

/**
 * Run validation only
 */
async function runValidation(rootPath: string, options: ScanCommandOptions): Promise<void> {
  console.log(chalk.yellow('  Validating configuration...'));
  console.log('');

  const result = await validate({
    rootPath,
    verbose: options.verbose,
    validateOnly: true,
  });

  printSummary(result.config);

  if (result.errors.length > 0) {
    console.log(chalk.red('\n  Errors:'));
    printErrors(result.errors);
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\n  Warnings:'));
    printErrors(result.warnings);
  }

  if (result.valid) {
    console.log(chalk.green('\n  Configuration is valid.'));
  } else {
    console.log(chalk.red('\n  Configuration has errors.'));
    process.exit(1);
  }
}

/**
 * Run scan and output JSON
 */
async function runJsonOutput(rootPath: string, options: ScanCommandOptions): Promise<void> {
  const { config } = await scanAndGenerate({
    rootPath,
    verbose: options.verbose,
    validateOnly: true,
  });

  // Output JSON to stdout
  console.log(JSON.stringify(config, null, 2));
}

/**
 * Run full scan and generate documentation
 */
async function runFullScan(rootPath: string, options: ScanCommandOptions): Promise<void> {
  const outputDir = options.output
    ? resolve(process.cwd(), options.output)
    : resolve(rootPath, 'docs', 'agent-architecture');

  console.log(chalk.yellow('  Scanning configuration...'));

  // Build diagram options from CLI options
  const diagramOptions = {
    level: (options.level ?? 'category') as ZoomLevel,
    compact: options.compact ?? false,
    categories: options.category as AgentCategory[] | undefined,
    types: options.type,
    pattern: options.pattern,
    maxPerCategory: options.maxPerCategory ? parseInt(options.maxPerCategory, 10) : 20,
    theme: options.theme,
    themePath: options.themePath,
  };

  const { config, outputs } = await scanAndGenerate({
    rootPath,
    outputDir,
    verbose: options.verbose,
    diagramOptions,
  });

  printSummary(config);

  // Print generated files
  console.log(chalk.green('\n  Generated files:'));
  for (const output of outputs) {
    const icon = getFileIcon(output.type);
    console.log(chalk.gray(`    ${icon} ${output.path}`));
  }

  // Print warnings if any
  const warnings = config.metadata.errors.filter(e => e.severity === 'warning');
  if (warnings.length > 0) {
    console.log(chalk.yellow('\n  Warnings:'));
    printErrors(warnings);
  }

  console.log(chalk.green(`\n  Done in ${config.metadata.duration}ms`));

  // Print usage tips for large configs
  if (config.agents.length > 50 && options.level !== 'summary') {
    console.log('');
    console.log(chalk.cyan('  Tip: For better readability with large configs, try:'));
    console.log(chalk.gray('    agentscope scan --level summary    # High-level overview'));
    console.log(chalk.gray('    agentscope scan --compact          # Names only'));
    console.log(chalk.gray('    agentscope scan --category github  # Filter by category'));
  }
}

/**
 * Print configuration summary
 */
function printSummary(config: Awaited<ReturnType<typeof scanAndGenerate>>['config']): void {
  console.log(chalk.cyan('  Summary:'));
  console.log(chalk.gray(`    Agents:      ${config.agents.length}`));
  console.log(chalk.gray(`    Skills:      ${config.skills.length}`));
  console.log(chalk.gray(`    Hooks:       ${config.hooks.length}`));
  console.log(chalk.gray(`    Commands:    ${config.commands.length}`));
  console.log(chalk.gray(`    MCP Servers: ${config.mcpServers.length}`));

  // Show agent breakdown
  if (config.agents.length > 0) {
    const byType = config.agents.reduce(
      (acc, agent) => {
        const type = agent.type ?? 'worker';
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('');
    console.log(chalk.cyan('  Agent Types:'));
    for (const [type, count] of Object.entries(byType)) {
      console.log(chalk.gray(`    ${type}: ${count}`));
    }
  }

  // Show MCP server status
  if (config.mcpServers.length > 0) {
    const enabled = config.mcpServers.filter(s => !s.disabled).length;
    const disabled = config.mcpServers.length - enabled;

    console.log('');
    console.log(chalk.cyan('  MCP Servers:'));
    console.log(chalk.gray(`    Enabled:  ${enabled}`));
    console.log(chalk.gray(`    Disabled: ${disabled}`));
  }
}

/**
 * Print errors
 */
function printErrors(errors: ScanError[]): void {
  for (const error of errors) {
    const icon = error.severity === 'fatal' ? chalk.red('x') : chalk.yellow('!');
    console.log(`    ${icon} [${error.code}] ${error.message}`);
    if (error.file) {
      console.log(chalk.gray(`      File: ${error.file}`));
    }
    if (error.suggestion) {
      console.log(chalk.gray(`      Suggestion: ${error.suggestion}`));
    }
  }
}

/**
 * Get icon for file type
 */
function getFileIcon(type: string): string {
  switch (type) {
    case 'diagram':
      return '📊';
    case 'documentation':
      return '📄';
    case 'json':
      return '📦';
    default:
      return '📁';
  }
}
