/**
 * AgentScope Core
 * Main entry point for the core library
 */

import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseClaudeCode } from './parsers/claude-code.js';
import { parseMcp } from './parsers/mcp.js';
import { generateComponentMap } from './generators/diagrams/component-map.js';
import { generateHierarchy } from './generators/diagrams/hierarchy.js';
import { generateDataflow } from './generators/diagrams/dataflow.js';
import { generateMarkdown } from './generators/docs/markdown.js';
import type {
  AgentScopeConfig,
  ScanOptions,
  GeneratorOptions,
  GeneratedOutput,
  ScanMetadata,
  ScanError,
} from './model/types.js';

// Re-export types
export * from './model/types.js';

// Re-export parsers
export { parseClaudeCode, ClaudeCodeParser } from './parsers/index.js';
export { parseMcp, McpParser } from './parsers/index.js';

// Re-export generators
export { generateComponentMap } from './generators/diagrams/component-map.js';
export { generateHierarchy } from './generators/diagrams/hierarchy.js';
export { generateDataflow } from './generators/diagrams/dataflow.js';
export { generateMarkdown } from './generators/docs/markdown.js';

// Version
export const VERSION = '0.1.0';

/**
 * Scan a directory and build the AgentScope configuration
 */
export async function scan(options: ScanOptions): Promise<AgentScopeConfig> {
  const startTime = Date.now();
  const rootPath = resolve(options.rootPath);
  const errors: ScanError[] = [];
  let filesScanned = 0;

  // Parse all configuration sources in parallel
  const [claudeResult, mcpResult] = await Promise.all([
    parseClaudeCode(rootPath),
    parseMcp(rootPath),
  ]);

  // Collect errors
  errors.push(...claudeResult.errors);
  errors.push(...mcpResult.errors);

  // Estimate files scanned (can be made more accurate)
  filesScanned =
    claudeResult.agents.length +
    claudeResult.skills.length +
    claudeResult.commands.length +
    mcpResult.servers.length +
    2; // For CLAUDE.md and .mcp.json

  // Build metadata
  const metadata: ScanMetadata = {
    scannedAt: new Date(),
    rootPath,
    version: VERSION,
    duration: Date.now() - startTime,
    filesScanned,
    errors,
  };

  return {
    agents: claudeResult.agents,
    skills: claudeResult.skills,
    hooks: claudeResult.hooks,
    commands: claudeResult.commands,
    mcpServers: mcpResult.servers,
    metadata,
  };
}

/**
 * Generate all outputs from a configuration
 */
export async function generate(
  config: AgentScopeConfig,
  options: GeneratorOptions
): Promise<GeneratedOutput[]> {
  const outputs: GeneratedOutput[] = [];
  const { outputDir, diagrams = ['component-map', 'hierarchy', 'dataflow'], title } = options;

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Generate diagrams
  if (diagrams.includes('component-map')) {
    const content = generateComponentMap(config, { title: title ? `${title} - Components` : undefined });
    const path = resolve(outputDir, 'component-map.md');
    outputs.push({ path, type: 'diagram', content });
  }

  if (diagrams.includes('hierarchy')) {
    const content = generateHierarchy(config, { title: title ? `${title} - Hierarchy` : undefined });
    const path = resolve(outputDir, 'hierarchy.md');
    outputs.push({ path, type: 'diagram', content });
  }

  if (diagrams.includes('dataflow')) {
    const content = generateDataflow(config, { title: title ? `${title} - Dataflow` : undefined });
    const path = resolve(outputDir, 'dataflow.md');
    outputs.push({ path, type: 'diagram', content });
  }

  // Generate main documentation
  const docContent = generateMarkdown(config, {
    title: title ?? 'Agent Architecture Documentation',
    includeDiagrams: true,
    includeMetadata: options.includeMetadata ?? true,
  });
  const docPath = resolve(outputDir, 'README.md');
  outputs.push({ path: docPath, type: 'documentation', content: docContent });

  // Generate JSON export
  const jsonContent = JSON.stringify(config, null, 2);
  const jsonPath = resolve(outputDir, 'config.json');
  outputs.push({ path: jsonPath, type: 'json', content: jsonContent });

  return outputs;
}

/**
 * Write generated outputs to disk
 */
export async function writeOutputs(outputs: GeneratedOutput[]): Promise<void> {
  await Promise.all(
    outputs.map(output => writeFile(output.path, output.content, 'utf-8'))
  );
}

/**
 * Main function: scan, generate, and write
 */
export async function scanAndGenerate(options: ScanOptions): Promise<{
  config: AgentScopeConfig;
  outputs: GeneratedOutput[];
}> {
  const config = await scan(options);

  if (options.validateOnly) {
    return { config, outputs: [] };
  }

  const outputDir = options.outputDir ?? resolve(options.rootPath, 'docs', 'agent-architecture');

  const outputs = await generate(config, {
    outputDir,
    includeMetadata: true,
  });

  await writeOutputs(outputs);

  return { config, outputs };
}

/**
 * Validate a configuration without generating output
 */
export async function validate(options: ScanOptions): Promise<{
  valid: boolean;
  config: AgentScopeConfig;
  errors: ScanError[];
  warnings: ScanError[];
}> {
  const config = await scan({ ...options, validateOnly: true });

  const errors = config.metadata.errors.filter(e => e.severity === 'fatal');
  const warnings = config.metadata.errors.filter(e => e.severity === 'warning');

  return {
    valid: errors.length === 0,
    config,
    errors,
    warnings,
  };
}
