/**
 * Configuration Importer
 *
 * Imports and restores AgentScope configurations from exported bundles.
 * Handles path restoration, platform adaptation, and validation.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import type { AgentScopeConfig } from '../model/types.js';
import {
  fromPortablePath,
  restoreObjectPaths,
  isValidPortablePath,
  getPlatform,
  type PathTransformOptions,
} from '../export/path-transformer.js';
import type {
  ExportManifest,
  ExportedFile,
  McpBundle,
  McpServerBundle,
} from '../export/exporter.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for importing a configuration
 */
export interface ImportOptions {
  /** Target root directory for the import */
  targetRoot: string;
  /** Whether to overwrite existing files */
  overwrite: boolean;
  /** Validate only - don't write any files */
  validateOnly: boolean;
  /** Map of secret placeholders to actual values */
  secrets?: Record<string, string>;
  /** Install MCP dependencies automatically */
  installMcpDeps?: boolean;
  /** Custom path transform options */
  pathTransformOptions?: PathTransformOptions;
  /** Callback for progress updates */
  onProgress?: (step: string, progress: number) => void;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** Whether import was successful */
  success: boolean;
  /** Files that were created */
  filesCreated: string[];
  /** Files that were skipped (already exist, overwrite=false) */
  filesSkipped: string[];
  /** Errors encountered */
  errors: string[];
  /** Warnings generated */
  warnings: string[];
  /** Secrets that need to be configured */
  secretsNeeded: string[];
  /** The imported configuration (with restored paths) */
  config?: AgentScopeConfig;
  /** MCP installation commands to run */
  mcpInstallCommands?: string[];
}

/**
 * Validation result for a manifest
 */
export interface ManifestValidation {
  /** Whether the manifest is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Compatibility information */
  compatibility: {
    /** Whether the export version is compatible */
    versionCompatible: boolean;
    /** Whether the source OS differs from current */
    osDiffers: boolean;
    /** Missing files in the export */
    missingFiles: string[];
  };
}

/**
 * Import preview information
 */
export interface ImportPreview {
  /** Files that would be created */
  filesToCreate: string[];
  /** Files that would be overwritten */
  filesToOverwrite: string[];
  /** Files that would be skipped */
  filesToSkip: string[];
  /** Secrets that need values */
  secretsNeeded: string[];
  /** MCP commands to run */
  mcpCommands: string[];
  /** Warnings about the import */
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Current AgentScope version for compatibility */
const AGENTSCOPE_VERSION = '0.1.0';

/** Supported export versions */
const SUPPORTED_VERSIONS = ['0.1.0'];

/** Expected files in an export */
const EXPECTED_FILES = {
  MANIFEST: 'agentscope-export.json',
  CONFIG: 'config.json',
  SECRETS: 'SECRETS.md',
} as const;

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Imports an AgentScope configuration from an exported bundle
 *
 * @param exportPath - Path to the export directory or manifest file
 * @param options - Import options
 * @returns Import result
 *
 * @example
 * ```typescript
 * const result = await importConfig('./exports/my-config', {
 *   targetRoot: '/projects/new-project',
 *   overwrite: false,
 *   validateOnly: false,
 *   secrets: {
 *     ANTHROPIC_API_KEY: 'sk-ant-...',
 *     DATABASE_URL: 'postgres://...'
 *   }
 * });
 *
 * if (result.success) {
 *   console.log('Import successful!');
 *   console.log(`Created ${result.filesCreated.length} files`);
 * }
 * ```
 */
export async function importConfig(
  exportPath: string,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    filesCreated: [],
    filesSkipped: [],
    errors: [],
    warnings: [],
    secretsNeeded: [],
    mcpInstallCommands: [],
  };

  try {
    // Resolve paths
    const resolvedExportPath = path.resolve(exportPath);
    const resolvedTargetRoot = path.resolve(options.targetRoot);

    options.onProgress?.('Validating export', 0);

    // Step 1: Load and validate manifest
    const { manifest, exportDir } = await loadManifest(resolvedExportPath);
    const validation = validateManifest(manifest, exportDir);

    if (!validation.valid) {
      result.errors = validation.errors;
      result.warnings = validation.warnings;
      return result;
    }

    result.warnings.push(...validation.warnings);

    options.onProgress?.('Loading configuration', 20);

    // Step 2: Load the configuration file
    const configPath = path.join(exportDir, EXPECTED_FILES.CONFIG);
    const configContent = await fs.readFile(configPath, 'utf-8');
    let config: AgentScopeConfig;

    try {
      config = JSON.parse(configContent);
    } catch {
      result.errors.push('Failed to parse configuration file: invalid JSON');
      return result;
    }

    options.onProgress?.('Restoring paths', 40);

    // Step 3: Restore paths to target platform
    const restoredConfig = restoreConfigPaths(
      config,
      resolvedTargetRoot,
      options.pathTransformOptions
    );

    options.onProgress?.('Processing secrets', 60);

    // Step 4: Handle secrets
    const secretsResult = processSecrets(restoredConfig, manifest, options.secrets);
    result.secretsNeeded = secretsResult.missing;
    result.warnings.push(...secretsResult.warnings);

    if (secretsResult.missing.length > 0 && !options.validateOnly) {
      result.warnings.push(
        `${secretsResult.missing.length} secret(s) need to be configured. ` +
        `See SECRETS.md for details.`
      );
    }

    // Step 5: Process MCP bundle
    if (manifest.mcpBundle && manifest.mcpBundle.servers.length > 0) {
      result.mcpInstallCommands = manifest.mcpBundle.servers.map(s => s.installCommand);
      if (!options.installMcpDeps) {
        result.warnings.push(
          `${manifest.mcpBundle.servers.length} MCP server(s) need to be installed. ` +
          `Run the following commands:\n${result.mcpInstallCommands.join('\n')}`
        );
      }
    }

    // If validate only, return preview
    if (options.validateOnly) {
      result.success = true;
      result.config = secretsResult.config;
      return result;
    }

    options.onProgress?.('Writing files', 80);

    // Step 6: Create target directory
    await fs.mkdir(resolvedTargetRoot, { recursive: true });

    // Step 7: Write configuration files
    for (const file of manifest.files) {
      const sourcePath = path.join(exportDir, file.path);
      const targetPath = path.join(resolvedTargetRoot, file.path);

      // Check if file exists
      const exists = await fileExists(targetPath);

      if (exists && !options.overwrite) {
        result.filesSkipped.push(targetPath);
        continue;
      }

      try {
        // Create parent directory if needed
        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        // Read and process content
        let content = await fs.readFile(sourcePath, 'utf-8');

        // Apply secrets if this is the config file
        if (file.type === 'config' && options.secrets) {
          content = applySecrets(content, options.secrets);
        }

        // Write file
        await fs.writeFile(targetPath, content, 'utf-8');
        result.filesCreated.push(targetPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to write ${file.path}: ${message}`);
      }
    }

    // Step 8: Install MCP dependencies if requested
    if (options.installMcpDeps && result.mcpInstallCommands && result.mcpInstallCommands.length > 0) {
      result.warnings.push(
        'MCP dependency installation requested but not implemented. ' +
        'Please run the commands manually.'
      );
    }

    options.onProgress?.('Complete', 100);

    result.success = result.errors.length === 0;
    result.config = secretsResult.config;

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Import failed: ${message}`);
    return result;
  }
}

// ============================================================================
// Manifest Loading and Validation
// ============================================================================

/**
 * Loads a manifest from an export path
 */
async function loadManifest(
  exportPath: string
): Promise<{ manifest: ExportManifest; exportDir: string }> {
  const stats = await fs.stat(exportPath);

  let manifestPath: string;
  let exportDir: string;

  if (stats.isDirectory()) {
    exportDir = exportPath;
    manifestPath = path.join(exportPath, EXPECTED_FILES.MANIFEST);
  } else if (stats.isFile()) {
    exportDir = path.dirname(exportPath);
    manifestPath = exportPath;
  } else {
    throw new Error(`Invalid export path: ${exportPath}`);
  }

  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent) as ExportManifest;

  return { manifest, exportDir };
}

/**
 * Validates an export manifest
 */
export function validateManifest(
  manifest: ExportManifest,
  exportDir: string
): ManifestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFiles: string[] = [];

  // Check required fields
  if (!manifest.version) {
    errors.push('Manifest missing version field');
  }

  if (!manifest.exportedAt) {
    errors.push('Manifest missing exportedAt field');
  }

  if (!manifest.files || !Array.isArray(manifest.files)) {
    errors.push('Manifest missing or invalid files array');
  }

  // Check version compatibility
  const versionCompatible = SUPPORTED_VERSIONS.includes(manifest.version);
  if (!versionCompatible) {
    warnings.push(
      `Export version ${manifest.version} may not be fully compatible with ` +
      `current version ${AGENTSCOPE_VERSION}`
    );
  }

  // Check OS compatibility
  const osDiffers = manifest.sourceOS !== getPlatform();
  if (osDiffers) {
    warnings.push(
      `Export was created on ${manifest.sourceOS}, importing to ${getPlatform()}. ` +
      `Some paths may need adjustment.`
    );
  }

  // Check for required files
  const hasConfigFile = manifest.files?.some(f => f.type === 'config');
  if (!hasConfigFile) {
    errors.push('Export missing configuration file');
  }

  // Verify files exist
  if (manifest.files) {
    for (const file of manifest.files) {
      const filePath = path.join(exportDir, file.path);
      try {
        fs.access(filePath);
      } catch {
        missingFiles.push(file.path);
      }
    }
  }

  if (missingFiles.length > 0) {
    errors.push(`Missing files in export: ${missingFiles.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    compatibility: {
      versionCompatible,
      osDiffers,
      missingFiles,
    },
  };
}

// ============================================================================
// Path Restoration
// ============================================================================

/**
 * Restores all paths in a configuration to platform-specific format
 */
function restoreConfigPaths(
  config: AgentScopeConfig,
  targetRoot: string,
  options?: PathTransformOptions
): AgentScopeConfig {
  // Deep clone to avoid mutating original
  const cloned = JSON.parse(JSON.stringify(config)) as AgentScopeConfig;

  // Restore agent paths
  if (cloned.agents) {
    cloned.agents = cloned.agents.map(agent => ({
      ...agent,
      path: fromPortablePath(agent.path, targetRoot, options),
    }));
  }

  // Restore skill paths
  if (cloned.skills) {
    cloned.skills = cloned.skills.map(skill => ({
      ...skill,
      path: fromPortablePath(skill.path, targetRoot, options),
    }));
  }

  // Restore hook paths
  if (cloned.hooks) {
    cloned.hooks = cloned.hooks.map(hook => ({
      ...hook,
      path: fromPortablePath(hook.path, targetRoot, options),
      workingDirectory: hook.workingDirectory
        ? fromPortablePath(hook.workingDirectory, targetRoot, options)
        : undefined,
    }));
  }

  // Update metadata
  if (cloned.metadata) {
    cloned.metadata = {
      ...cloned.metadata,
      rootPath: targetRoot,
    };
  }

  return cloned;
}

// ============================================================================
// Secrets Processing
// ============================================================================

/**
 * Processes secrets in a configuration
 */
function processSecrets(
  config: AgentScopeConfig,
  manifest: ExportManifest,
  providedSecrets?: Record<string, string>
): {
  config: AgentScopeConfig;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Get required secrets from manifest
  const required = manifest.secretsRequired || [];

  // Check which secrets are missing
  for (const secret of required) {
    if (!providedSecrets || !providedSecrets[secret]) {
      missing.push(secret);
    }
  }

  // If all secrets provided, apply them to config
  if (providedSecrets && missing.length === 0) {
    const configJson = JSON.stringify(config);
    const applied = applySecrets(configJson, providedSecrets);
    return {
      config: JSON.parse(applied),
      missing,
      warnings,
    };
  }

  return { config, missing, warnings };
}

/**
 * Applies secret values to a config string
 */
function applySecrets(content: string, secrets: Record<string, string>): string {
  let result = content;

  for (const [key, value] of Object.entries(secrets)) {
    // Replace {{KEY}} with value
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }

  return result;
}

// ============================================================================
// Import Preview
// ============================================================================

/**
 * Creates a preview of what an import would do without making changes
 *
 * @param exportPath - Path to the export
 * @param options - Import options (validateOnly is ignored)
 * @returns Preview of the import operation
 */
export async function previewImport(
  exportPath: string,
  options: Omit<ImportOptions, 'validateOnly'>
): Promise<ImportPreview> {
  const preview: ImportPreview = {
    filesToCreate: [],
    filesToOverwrite: [],
    filesToSkip: [],
    secretsNeeded: [],
    mcpCommands: [],
    warnings: [],
  };

  try {
    const resolvedExportPath = path.resolve(exportPath);
    const resolvedTargetRoot = path.resolve(options.targetRoot);

    // Load manifest
    const { manifest, exportDir } = await loadManifest(resolvedExportPath);

    // Check validation
    const validation = validateManifest(manifest, exportDir);
    preview.warnings.push(...validation.warnings);

    if (!validation.valid) {
      preview.warnings.push(...validation.errors);
      return preview;
    }

    // Check files
    for (const file of manifest.files) {
      const targetPath = path.join(resolvedTargetRoot, file.path);
      const exists = await fileExists(targetPath);

      if (exists) {
        if (options.overwrite) {
          preview.filesToOverwrite.push(targetPath);
        } else {
          preview.filesToSkip.push(targetPath);
        }
      } else {
        preview.filesToCreate.push(targetPath);
      }
    }

    // Check secrets
    const requiredSecrets = manifest.secretsRequired || [];
    for (const secret of requiredSecrets) {
      if (!options.secrets || !options.secrets[secret]) {
        preview.secretsNeeded.push(secret);
      }
    }

    // Check MCP commands
    if (manifest.mcpBundle) {
      preview.mcpCommands = manifest.mcpBundle.servers.map(s => s.installCommand);
    }

    return preview;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    preview.warnings.push(`Preview failed: ${message}`);
    return preview;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that an import can proceed
 */
export async function validateImport(
  exportPath: string,
  options: ImportOptions
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const result = await importConfig(exportPath, {
    ...options,
    validateOnly: true,
  });

  return {
    valid: result.success,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/**
 * Validates that a configuration file is valid
 */
export function validateConfigFile(content: string): {
  valid: boolean;
  errors: string[];
  config?: AgentScopeConfig;
} {
  const errors: string[] = [];

  try {
    const config = JSON.parse(content) as AgentScopeConfig;

    // Check for required structure
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { valid: false, errors };
    }

    // Validate arrays exist (can be empty)
    const arrayFields = ['agents', 'skills', 'hooks', 'commands', 'mcpServers'];
    for (const field of arrayFields) {
      if (config[field as keyof AgentScopeConfig] !== undefined) {
        if (!Array.isArray(config[field as keyof AgentScopeConfig])) {
          errors.push(`Field "${field}" must be an array`);
        }
      }
    }

    // Validate agents have required fields
    if (config.agents) {
      for (let i = 0; i < config.agents.length; i++) {
        const agent = config.agents[i];
        if (!agent.name) {
          errors.push(`Agent at index ${i} missing required field: name`);
        }
        if (!agent.path) {
          errors.push(`Agent at index ${i} missing required field: path`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      config: errors.length === 0 ? config : undefined,
    };
  } catch (error) {
    errors.push(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists available exports in a directory
 */
export async function listExports(directory: string): Promise<{
  exports: Array<{
    path: string;
    name?: string;
    version: string;
    exportedAt: string;
    entities: number;
  }>;
  errors: string[];
}> {
  const exports: Array<{
    path: string;
    name?: string;
    version: string;
    exportedAt: string;
    entities: number;
  }> = [];
  const errors: string[] = [];

  try {
    const resolvedDir = path.resolve(directory);
    const entries = await fs.readdir(resolvedDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(resolvedDir, entry.name, EXPECTED_FILES.MANIFEST);

        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(content) as ExportManifest;

          const totalEntities =
            manifest.entities.agents +
            manifest.entities.skills +
            manifest.entities.hooks +
            manifest.entities.commands +
            manifest.entities.mcpServers;

          exports.push({
            path: path.join(resolvedDir, entry.name),
            name: manifest.name,
            version: manifest.version,
            exportedAt: manifest.exportedAt,
            entities: totalEntities,
          });
        } catch {
          // Not an export directory, skip
        }
      }
    }

    return { exports, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to list exports: ${message}`);
    return { exports, errors };
  }
}

/**
 * Gets detailed information about an export
 */
export async function getExportInfo(exportPath: string): Promise<{
  manifest: ExportManifest;
  validation: ManifestValidation;
} | null> {
  try {
    const { manifest, exportDir } = await loadManifest(exportPath);
    const validation = validateManifest(manifest, exportDir);

    return { manifest, validation };
  } catch {
    return null;
  }
}
