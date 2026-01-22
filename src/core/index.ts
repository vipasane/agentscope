/**
 * AgentScope Core
 * Main entry point for the core library
 */

import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseClaudeCode } from './parsers/claude-code.js';
import { parseMcp } from './parsers/mcp.js';
import { scanSettings, scanUserSettings, mergeSettings } from './scanner/settings-scanner.js';
import { generateComponentMap, type ComponentMapOptions } from './generators/diagrams/component-map.js';
import { generateHierarchy, type HierarchyOptions } from './generators/diagrams/hierarchy.js';
import { generateDataflow } from './generators/diagrams/dataflow.js';
import { generateMarkdown } from './generators/docs/markdown.js';
import type {
  AgentScopeConfig,
  ScanOptions,
  GeneratorOptions,
  GeneratedOutput,
  ScanMetadata,
  ScanError,
  DiagramOptions,
} from './model/types.js';

// Re-export types
export * from './model/types.js';

// Re-export parsers
export { parseClaudeCode, ClaudeCodeParser } from './parsers/index.js';
export { parseMcp, McpParser } from './parsers/index.js';

// Re-export settings scanner
export {
  SettingsScanner,
  scanSettings,
  scanUserSettings,
  mergeSettings,
  type SettingsScanResult,
} from './scanner/settings-scanner.js';

// Re-export generators
export { generateComponentMap, type ComponentMapOptions } from './generators/diagrams/component-map.js';
export { generateHierarchy, type HierarchyOptions } from './generators/diagrams/hierarchy.js';
export { generateDataflow } from './generators/diagrams/dataflow.js';
export { generateMarkdown } from './generators/docs/markdown.js';

// Re-export category utilities
export {
  categorizeAgents,
  detectCategory,
  filterByCategory,
  filterByType,
  filterByPattern,
  getCategoryInfo,
  getAllCategories,
  type AgentCategory,
  type CategorizedAgents,
} from './generators/diagrams/categories.js';

// Re-export formatters
export {
  // Types
  type DocumentContext,
  type DocumentSection,
  type LegendEntry,
  type RelationshipSummary,
  type NavigationItem,
  type CategorizedAgents as FormatterCategorizedAgents,
  type DocumentBuilderOptions,
  type FormatterOptions,
  type HookDisplayInfo,
  type QuickStatsInput,
  // Document Builder
  DocumentBuilder,
  // Navigation
  generateNavLinks,
  generateCategoryTable,
  generateTableOfContents,
  buildNavigationFromAgents,
  generateBreadcrumbs,
  // Legend
  standardLegend,
  mermaidLegend,
  generateLegendTable,
  generateCompactLegend,
  filterLegendByCategory,
  getLegendForDiagram,
  // Relationships
  calculateRelationships,
  generateRelationshipTable,
  getDelegationChains,
  generateDelegationChainList,
  getToolUsageByType,
  generateToolUsageSummary,
  findCircularDelegations,
  // Section formatters for all 7 entity types
  formatHooksSection,
  formatCommandsSection,
  formatPluginsSection,
  formatPermissionsSection,
  formatAgentsComparisonTable,
  formatAgentsCapabilitiesMatrix,
  formatMcpServersSection,
  formatSkillsSection,
  formatQuickStats,
  // Sanitization utilities
  sanitize,
  truncate,
  escapeTableCell,
  getStatusIcon,
  formatTimeout,
  toAnchorId,
} from './formatters/index.js';

// Re-export theme system
export {
  // Types
  type ThemeColor,
  type ThemePalette,
  type ThemeResolveOptions,
  type MermaidThemeConfig,
  type MermaidBaseTheme,
  type ThemeName,
  type ThemeValidationResult,
  type ColorScheme,
  type AccessibilityLevel,
  // Registry
  ThemeRegistry,
  getThemeRegistry,
  getTheme,
  getThemeOrDefault,
  isBuiltinTheme,
  // Loader
  ThemeLoader,
  resolveTheme,
  type ThemeResolutionResult,
  // Generator
  MermaidThemeGenerator,
  createThemeGenerator,
  generateMermaidInit,
  generateClassDefs,
  // Palettes
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  colorblindLightTheme,
  colorblindDarkTheme,
  builtinPalettes,
  defaultTheme,
} from './themes/index.js';

// Re-export export/import system
export {
  // Path Transformer
  type PathType,
  type TransformResult,
  type PathTransformOptions,
  detectPathType,
  toPortablePath,
  toPortablePathWithInfo,
  fromPortablePath,
  fromPortablePathWithInfo,
  toPortablePaths,
  fromPortablePaths,
  transformObjectPaths,
  restoreObjectPaths,
  normalizeSeparators,
  isPathUnder,
  isPathKey,
  getPlatform,
  isValidPortablePath,
  // Secrets Sanitizer
  type SanitizeResult,
  type SecretReference,
  type SecretType,
  type SanitizeStats,
  type SanitizeOptions,
  sanitizeSecrets,
  generateSecretsDoc,
  detectEnvReference,
  detectSecretTypeFromKey,
  detectSecretTypeFromValue,
  isSecretKey,
  isSecretValue,
  validateNoSecrets,
  getSecretPatterns,
  // Exporter
  type ExportOptions,
  type ExportManifest,
  type EntityCounts,
  type ExportedFile,
  type McpBundle,
  type McpServerBundle,
  type ExportResult,
  exportConfig,
  validateForExport,
  previewExport,
} from './export/index.js';

export {
  // Importer
  type ImportOptions,
  type ImportResult,
  type ManifestValidation,
  type ImportPreview,
  importConfig,
  previewImport,
  validateImport,
  validateConfigFile,
  validateManifest,
  listExports,
  getExportInfo,
} from './import/index.js';

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
  const [claudeResult, mcpResult, settingsResult] = await Promise.all([
    parseClaudeCode(rootPath),
    parseMcp(rootPath),
    scanSettings(rootPath),
  ]);

  // Optionally merge with user settings
  let finalSettingsResult = settingsResult;
  if (options.includeUserConfig) {
    const userSettingsResult = await scanUserSettings();
    finalSettingsResult = mergeSettings(settingsResult, userSettingsResult);
  }

  // Collect errors
  errors.push(...claudeResult.errors);
  errors.push(...mcpResult.errors);
  errors.push(...finalSettingsResult.errors);

  // Estimate files scanned (can be made more accurate)
  filesScanned =
    claudeResult.agents.length +
    claudeResult.skills.length +
    claudeResult.commands.length +
    mcpResult.servers.length +
    finalSettingsResult.plugins.length +
    3; // For CLAUDE.md, .mcp.json, and settings.json

  // Build metadata
  const metadata: ScanMetadata = {
    scannedAt: new Date(),
    rootPath,
    version: VERSION,
    duration: Date.now() - startTime,
    filesScanned,
    errors,
  };

  // Merge hooks from claude parser and settings scanner (settings takes precedence)
  const hookMap = new Map<string, typeof claudeResult.hooks[0]>();
  for (const hook of claudeResult.hooks) {
    hookMap.set(`${hook.event}:${hook.command ?? hook.path}`, hook);
  }
  for (const hook of finalSettingsResult.hooks) {
    hookMap.set(`${hook.event}:${hook.command ?? hook.path}`, hook);
  }

  // Merge MCP servers (settings scanner has more detailed info)
  const serverMap = new Map<string, typeof mcpResult.servers[0]>();
  for (const server of mcpResult.servers) {
    serverMap.set(server.name, server);
  }
  for (const server of finalSettingsResult.mcpServers) {
    serverMap.set(server.name, server);
  }

  // Merge commands (settings scanner may have additional commands)
  const commandMap = new Map<string, typeof claudeResult.commands[0]>();
  for (const cmd of claudeResult.commands) {
    commandMap.set(cmd.name, cmd);
  }
  for (const cmd of finalSettingsResult.commands) {
    commandMap.set(cmd.name, cmd);
  }

  return {
    agents: claudeResult.agents,
    skills: claudeResult.skills,
    hooks: Array.from(hookMap.values()),
    commands: Array.from(commandMap.values()),
    mcpServers: Array.from(serverMap.values()),
    plugins: finalSettingsResult.plugins,
    permissions: finalSettingsResult.permissions,
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
  const {
    outputDir,
    diagrams = ['component-map', 'hierarchy', 'dataflow'],
    title,
    diagramOptions = {},
  } = options;

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Build component map options
  const componentMapOpts: ComponentMapOptions = {
    title: title ? `${title} - Components` : undefined,
    level: diagramOptions.level ?? 'category',
    compact: diagramOptions.compact ?? false,
    categories: diagramOptions.categories as ComponentMapOptions['categories'],
    types: diagramOptions.types,
    pattern: diagramOptions.pattern,
    maxPerCategory: diagramOptions.maxPerCategory ?? 20,
    theme: diagramOptions.theme,
    themePath: diagramOptions.themePath,
  };

  // Build hierarchy options
  const hierarchyOpts: HierarchyOptions = {
    title: title ? `${title} - Hierarchy` : undefined,
    level: diagramOptions.level ?? 'category',
    compact: diagramOptions.compact ?? false,
    categories: diagramOptions.categories as HierarchyOptions['categories'],
    types: diagramOptions.types,
    pattern: diagramOptions.pattern,
    maxPerCategory: diagramOptions.maxPerCategory ?? 15,
    theme: diagramOptions.theme,
    themePath: diagramOptions.themePath,
  };

  // Generate diagrams
  if (diagrams.includes('component-map')) {
    const content = await generateComponentMap(config, componentMapOpts);
    const path = resolve(outputDir, 'component-map.md');
    outputs.push({ path, type: 'diagram', content });
  }

  if (diagrams.includes('hierarchy')) {
    const content = generateHierarchy(config, hierarchyOpts);
    const path = resolve(outputDir, 'hierarchy.md');
    outputs.push({ path, type: 'diagram', content });
  }

  if (diagrams.includes('dataflow')) {
    const content = generateDataflow(config, {
      title: title ? `${title} - Dataflow` : undefined,
      theme: diagramOptions.theme,
      themePath: diagramOptions.themePath,
    });
    const path = resolve(outputDir, 'dataflow.md');
    outputs.push({ path, type: 'diagram', content });
  }

  // Generate main documentation
  const docContent = await generateMarkdown(config, {
    title: title ?? 'Agent Architecture Documentation',
    includeDiagrams: true,
    includeMetadata: options.includeMetadata ?? true,
    diagramOptions,
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
    diagramOptions: options.diagramOptions,
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
