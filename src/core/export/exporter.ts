/**
 * Configuration Exporter
 *
 * Exports AgentScope configurations for team sharing, environment migration,
 * and template creation. Ensures portability across platforms while
 * maintaining security by excluding secrets.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import type { AgentScopeConfig, Agent, Skill, Hook, Command, McpServer, Plugin } from '../model/types.js';
import { toPortablePath, transformObjectPaths, getPlatform, type PathTransformOptions } from './path-transformer.js';
import { sanitizeSecrets, generateSecretsDoc, type SanitizeResult, type SecretReference } from './secrets-sanitizer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for exporting a configuration
 */
export interface ExportOptions {
  /** Always false - secrets are never exported */
  includeSecrets: false;
  /** Bundle MCP server package.json references */
  bundleMcp: boolean;
  /** Output format */
  format: 'json' | 'yaml';
  /** Output directory for the export */
  outputDir: string;
  /** Optional name for the export */
  name?: string;
  /** Optional description */
  description?: string;
  /** Include additional files in the export */
  additionalFiles?: string[];
  /** Custom transform options */
  pathTransformOptions?: PathTransformOptions;
}

/**
 * Export manifest describing the exported configuration
 */
export interface ExportManifest {
  /** AgentScope version used for export */
  version: string;
  /** ISO timestamp of export */
  exportedAt: string;
  /** Source operating system */
  sourceOS: NodeJS.Platform;
  /** Export name (optional) */
  name?: string;
  /** Export description (optional) */
  description?: string;
  /** Entity counts */
  entities: EntityCounts;
  /** Files included in the export */
  files: ExportedFile[];
  /** MCP bundle information (if bundleMcp was true) */
  mcpBundle?: McpBundle;
  /** Secrets that need to be configured */
  secretsRequired: string[];
  /** Checksum for integrity verification */
  checksum: string;
}

/**
 * Count of entities in the export
 */
export interface EntityCounts {
  agents: number;
  skills: number;
  hooks: number;
  commands: number;
  mcpServers: number;
  plugins: number;
}

/**
 * Metadata for an exported file
 */
export interface ExportedFile {
  /** Relative path within the export */
  path: string;
  /** File type */
  type: 'config' | 'manifest' | 'secrets-doc' | 'mcp-package' | 'additional';
  /** File size in bytes */
  size: number;
  /** File checksum */
  checksum: string;
}

/**
 * MCP server bundle information
 */
export interface McpBundle {
  /** Bundled server packages */
  servers: McpServerBundle[];
  /** Total size of MCP bundles */
  totalSize: number;
}

/**
 * Individual MCP server bundle
 */
export interface McpServerBundle {
  /** Server name */
  name: string;
  /** Package name if npm package */
  packageName?: string;
  /** Version if known */
  version?: string;
  /** Installation command */
  installCommand: string;
}

/**
 * Result of the export operation
 */
export interface ExportResult {
  /** Whether export was successful */
  success: boolean;
  /** The generated manifest */
  manifest: ExportManifest;
  /** Path to the exported files */
  outputPath: string;
  /** Warnings generated during export */
  warnings: string[];
  /** Errors encountered (empty if success) */
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Current AgentScope version */
const AGENTSCOPE_VERSION = '0.1.0';

/** Export file names */
const FILES = {
  MANIFEST: 'agentscope-export.json',
  CONFIG: 'config.json',
  SECRETS: 'SECRETS.md',
} as const;

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Exports an AgentScope configuration for portability
 *
 * @param config - The AgentScope configuration to export
 * @param options - Export options
 * @returns Export result with manifest and file information
 *
 * @example
 * ```typescript
 * const result = await exportConfig(config, {
 *   includeSecrets: false,
 *   bundleMcp: true,
 *   format: 'json',
 *   outputDir: './exports',
 *   name: 'my-project-config'
 * });
 *
 * if (result.success) {
 *   console.log(`Export saved to: ${result.outputPath}`);
 *   console.log(`Secrets to configure: ${result.manifest.secretsRequired}`);
 * }
 * ```
 */
export async function exportConfig(
  config: AgentScopeConfig,
  options: ExportOptions
): Promise<ExportResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const files: ExportedFile[] = [];

  try {
    // Validate options
    if (options.includeSecrets !== false) {
      throw new Error('includeSecrets must be false - secrets cannot be exported');
    }

    // Create output directory
    const outputDir = path.resolve(options.outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    // Get root path from config metadata
    const rootPath = config.metadata?.rootPath || process.cwd();

    // Step 1: Transform paths to portable format
    const portableConfig = transformConfigPaths(config, rootPath, options.pathTransformOptions);

    // Step 2: Sanitize secrets
    const sanitizeResult = sanitizeSecrets(portableConfig);
    const sanitizedConfig = sanitizeResult.sanitized as AgentScopeConfig;

    // Collect secrets that need to be configured
    const secretsRequired = collectUniqueSecrets(sanitizeResult.secretsFound);

    if (sanitizeResult.stats.secretsFound > 0) {
      warnings.push(
        `${sanitizeResult.stats.secretsFound} secret(s) were found and replaced with placeholders. ` +
        `See ${FILES.SECRETS} for required secrets.`
      );
    }

    // Step 3: Process MCP servers if bundling
    let mcpBundle: McpBundle | undefined;
    if (options.bundleMcp && sanitizedConfig.mcpServers?.length > 0) {
      mcpBundle = await bundleMcpServers(sanitizedConfig.mcpServers);
      if (mcpBundle.servers.length > 0) {
        warnings.push(
          `${mcpBundle.servers.length} MCP server(s) bundled. ` +
          `Run installation commands after import.`
        );
      }
    }

    // Step 4: Write config file
    const configContent = options.format === 'json'
      ? JSON.stringify(sanitizedConfig, null, 2)
      : toYaml(sanitizedConfig);

    const configPath = path.join(outputDir, FILES.CONFIG);
    await fs.writeFile(configPath, configContent, 'utf-8');
    const configStats = await fs.stat(configPath);

    files.push({
      path: FILES.CONFIG,
      type: 'config',
      size: configStats.size,
      checksum: simpleChecksum(configContent),
    });

    // Step 5: Generate secrets documentation
    if (secretsRequired.length > 0) {
      const secretsDoc = generateSecretsDoc(
        sanitizeResult.secretsFound,
        options.name || 'AgentScope Configuration'
      );
      const secretsPath = path.join(outputDir, FILES.SECRETS);
      await fs.writeFile(secretsPath, secretsDoc, 'utf-8');
      const secretsStats = await fs.stat(secretsPath);

      files.push({
        path: FILES.SECRETS,
        type: 'secrets-doc',
        size: secretsStats.size,
        checksum: simpleChecksum(secretsDoc),
      });
    }

    // Step 6: Copy additional files
    if (options.additionalFiles && options.additionalFiles.length > 0) {
      for (const filePath of options.additionalFiles) {
        try {
          const absolutePath = path.resolve(rootPath, filePath);
          const content = await fs.readFile(absolutePath, 'utf-8');
          const destPath = path.join(outputDir, path.basename(filePath));
          await fs.writeFile(destPath, content, 'utf-8');
          const stats = await fs.stat(destPath);

          files.push({
            path: path.basename(filePath),
            type: 'additional',
            size: stats.size,
            checksum: simpleChecksum(content),
          });
        } catch (error) {
          warnings.push(`Could not include additional file: ${filePath}`);
        }
      }
    }

    // Step 7: Build and write manifest
    const manifest: ExportManifest = {
      version: AGENTSCOPE_VERSION,
      exportedAt: new Date().toISOString(),
      sourceOS: getPlatform(),
      name: options.name,
      description: options.description,
      entities: countEntities(sanitizedConfig),
      files,
      mcpBundle,
      secretsRequired,
      checksum: '', // Will be computed
    };

    // Compute manifest checksum
    manifest.checksum = simpleChecksum(JSON.stringify(manifest));

    const manifestPath = path.join(outputDir, FILES.MANIFEST);
    const manifestContent = JSON.stringify(manifest, null, 2);
    await fs.writeFile(manifestPath, manifestContent, 'utf-8');

    return {
      success: true,
      manifest,
      outputPath: outputDir,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);

    return {
      success: false,
      manifest: createEmptyManifest(),
      outputPath: options.outputDir,
      warnings,
      errors,
    };
  }
}

// ============================================================================
// Path Transformation
// ============================================================================

/**
 * Transforms all paths in the configuration to portable format
 */
function transformConfigPaths(
  config: AgentScopeConfig,
  rootPath: string,
  options?: PathTransformOptions
): AgentScopeConfig {
  // Deep clone to avoid mutating original
  const cloned = JSON.parse(JSON.stringify(config)) as AgentScopeConfig;

  // Transform agents
  if (cloned.agents) {
    cloned.agents = cloned.agents.map(agent => ({
      ...agent,
      path: toPortablePath(agent.path, rootPath, options),
    }));
  }

  // Transform skills
  if (cloned.skills) {
    cloned.skills = cloned.skills.map(skill => ({
      ...skill,
      path: toPortablePath(skill.path, rootPath, options),
    }));
  }

  // Transform hooks
  if (cloned.hooks) {
    cloned.hooks = cloned.hooks.map(hook => ({
      ...hook,
      path: toPortablePath(hook.path, rootPath, options),
      workingDirectory: hook.workingDirectory
        ? toPortablePath(hook.workingDirectory, rootPath, options)
        : undefined,
    }));
  }

  // Transform metadata
  if (cloned.metadata) {
    cloned.metadata = {
      ...cloned.metadata,
      rootPath: './', // Always use relative for portability
    };
  }

  return cloned;
}

// ============================================================================
// MCP Server Bundling
// ============================================================================

/**
 * Bundles MCP server information for export
 */
async function bundleMcpServers(servers: McpServer[]): Promise<McpBundle> {
  const bundledServers: McpServerBundle[] = [];

  for (const server of servers) {
    const bundle = await processMcpServer(server);
    if (bundle) {
      bundledServers.push(bundle);
    }
  }

  return {
    servers: bundledServers,
    totalSize: 0, // Not actually bundling files, just metadata
  };
}

/**
 * Processes a single MCP server for bundling
 */
async function processMcpServer(server: McpServer): Promise<McpServerBundle | null> {
  const { name, command, args } = server;

  // Detect npm/npx commands
  if (command === 'npx' || command === 'npm') {
    const packageArg = args?.find(arg =>
      !arg.startsWith('-') && !arg.startsWith('@') && arg !== 'run'
    );
    const packageName = packageArg || (args?.[0]?.startsWith('@') ? args[0] : name);

    return {
      name,
      packageName,
      installCommand: `npm install ${packageName}`,
    };
  }

  // Detect uvx/uv commands (Python)
  if (command === 'uvx' || command === 'uv') {
    const packageArg = args?.find(arg => !arg.startsWith('-'));
    return {
      name,
      packageName: packageArg || name,
      installCommand: `uv pip install ${packageArg || name}`,
    };
  }

  // Generic command - provide basic info
  return {
    name,
    installCommand: `# Manual setup required for: ${command} ${args?.join(' ') || ''}`,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Counts entities in a configuration
 */
function countEntities(config: AgentScopeConfig): EntityCounts {
  return {
    agents: config.agents?.length || 0,
    skills: config.skills?.length || 0,
    hooks: config.hooks?.length || 0,
    commands: config.commands?.length || 0,
    mcpServers: config.mcpServers?.length || 0,
    plugins: config.plugins?.length || 0,
  };
}

/**
 * Collects unique secret placeholders
 */
function collectUniqueSecrets(secrets: SecretReference[]): string[] {
  const unique = new Set<string>();
  for (const secret of secrets) {
    // Extract placeholder name without {{ }}
    const name = secret.placeholder.replace(/^\{\{|\}\}$/g, '');
    unique.add(name);
  }
  return Array.from(unique).sort();
}

/**
 * Creates an empty manifest for error cases
 */
function createEmptyManifest(): ExportManifest {
  return {
    version: AGENTSCOPE_VERSION,
    exportedAt: new Date().toISOString(),
    sourceOS: getPlatform(),
    entities: {
      agents: 0,
      skills: 0,
      hooks: 0,
      commands: 0,
      mcpServers: 0,
      plugins: 0,
    },
    files: [],
    secretsRequired: [],
    checksum: '',
  };
}

/**
 * Simple checksum for integrity verification
 * Uses a basic hash - not cryptographically secure, just for integrity
 */
function simpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Basic YAML serialization (minimal implementation)
 * For full YAML support, consider using the 'yaml' package
 */
function toYaml(obj: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    // Quote strings that contain special characters
    if (/[\n\r:{}[\],&*#?|<>=!%@`]/.test(obj) || obj === '') {
      return JSON.stringify(obj);
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    return obj
      .map(item => `${spaces}- ${toYaml(item, indent + 1).trimStart()}`)
      .join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return '{}';
    }
    return entries
      .map(([key, value]) => {
        const yamlValue = toYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${yamlValue}`;
        }
        if (Array.isArray(value) && value.length > 0) {
          return `${spaces}${key}:\n${yamlValue}`;
        }
        return `${spaces}${key}: ${yamlValue}`;
      })
      .join('\n');
  }

  return String(obj);
}

// ============================================================================
// Export Validation
// ============================================================================

/**
 * Validates that a configuration can be exported
 *
 * @param config - The configuration to validate
 * @returns Validation result with any issues found
 */
export function validateForExport(config: AgentScopeConfig): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for required fields
  if (!config) {
    issues.push('Configuration is null or undefined');
    return { valid: false, issues };
  }

  // Check for metadata
  if (!config.metadata) {
    issues.push('Configuration missing metadata');
  }

  // Check for empty configuration
  const entityCount =
    (config.agents?.length || 0) +
    (config.skills?.length || 0) +
    (config.hooks?.length || 0) +
    (config.commands?.length || 0) +
    (config.mcpServers?.length || 0);

  if (entityCount === 0) {
    issues.push('Configuration has no entities to export');
  }

  // Check for potential issues in agents
  for (const agent of config.agents || []) {
    if (!agent.name) {
      issues.push(`Agent missing name at path: ${agent.path}`);
    }
    if (!agent.path) {
      issues.push(`Agent "${agent.name}" missing path`);
    }
  }

  // Check for potential issues in skills
  for (const skill of config.skills || []) {
    if (!skill.name) {
      issues.push(`Skill missing name at path: ${skill.path}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Creates a preview of what would be exported without writing files
 *
 * @param config - The configuration to preview
 * @param options - Export options
 * @returns Preview information
 */
export function previewExport(
  config: AgentScopeConfig,
  options: Omit<ExportOptions, 'outputDir'>
): {
  entities: EntityCounts;
  secretsToRemove: number;
  mcpServersToBundle: number;
  estimatedSize: number;
} {
  const rootPath = config.metadata?.rootPath || process.cwd();

  // Transform and sanitize (in memory only)
  const portableConfig = transformConfigPaths(config, rootPath);
  const sanitizeResult = sanitizeSecrets(portableConfig);

  // Estimate size (rough approximation)
  const configJson = JSON.stringify(sanitizeResult.sanitized, null, 2);
  const estimatedSize = configJson.length + 1000; // Add overhead for manifest

  return {
    entities: countEntities(config),
    secretsToRemove: sanitizeResult.stats.secretsFound,
    mcpServersToBundle: options.bundleMcp ? (config.mcpServers?.length || 0) : 0,
    estimatedSize,
  };
}
