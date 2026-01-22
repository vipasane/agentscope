/**
 * Plugin Parser for Claude Code settings.json (schema 2026.01)
 * Parses enabledPlugins, extraKnownMarketplaces, and skippedPlugins
 */

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin, MarketplaceSourceType, ScanError } from '../model/types.js';

// ============================================================================
// Types
// ============================================================================

export interface PluginParseResult {
  plugins: Plugin[];
  errors: ScanError[];
}

/**
 * Raw settings.json structure for plugin-related fields
 */
interface SettingsJson {
  enabledPlugins?: Record<string, boolean | PluginConfig>;
  extraKnownMarketplaces?: Record<string, MarketplaceConfig>;
  skippedPlugins?: string[];
}

/**
 * Plugin configuration when enabledPlugins value is an object
 */
interface PluginConfig {
  enabled?: boolean;
  version?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

/**
 * Marketplace configuration in extraKnownMarketplaces
 */
interface MarketplaceConfig {
  source?: MarketplaceSource;
  name?: string;
  description?: string;
}

/**
 * Source definition for a marketplace
 */
interface MarketplaceSource {
  source: string;
  repo?: string;
  url?: string;
  path?: string;
  package?: string;
}

/**
 * Built-in known marketplaces with their metadata
 */
interface KnownMarketplace {
  name: string;
  description: string;
  sourceType: MarketplaceSourceType;
  location: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Built-in marketplaces recognized by Claude Code
 */
const BUILTIN_MARKETPLACES: Record<string, KnownMarketplace> = {
  anthropic: {
    name: 'Anthropic',
    description: 'Official Anthropic plugins',
    sourceType: 'github',
    location: 'anthropics/claude-plugins',
  },
  community: {
    name: 'Community',
    description: 'Community marketplace',
    sourceType: 'github',
    location: 'claude-community/plugins',
  },
};

/**
 * Valid marketplace source types
 */
const VALID_SOURCE_TYPES: readonly MarketplaceSourceType[] = [
  'github',
  'git',
  'url',
  'npm',
  'file',
  'directory',
] as const;

/**
 * Regex pattern for validating plugin ID format: plugin-id@marketplace-id
 */
const PLUGIN_ID_PATTERN = /^([a-z][a-z0-9-]*)@([a-z][a-z0-9-]*)$/i;

// ============================================================================
// Main Parser Class
// ============================================================================

export class PluginParser {
  private errors: ScanError[] = [];
  private customMarketplaces: Map<string, MarketplaceConfig> = new Map();

  constructor(private rootPath: string) {}

  /**
   * Parse plugin configurations from settings files
   */
  async parse(): Promise<PluginParseResult> {
    this.errors = [];
    this.customMarketplaces.clear();

    const plugins: Plugin[] = [];

    // Parse project-level settings
    const projectSettings = join(this.rootPath, '.claude', 'settings.json');
    if (await this.fileExists(projectSettings)) {
      const projectPlugins = await this.parseSettingsFile(projectSettings);
      plugins.push(...projectPlugins);
    }

    // Parse local settings (higher priority, may override)
    const localSettings = join(this.rootPath, '.claude', 'settings.local.json');
    if (await this.fileExists(localSettings)) {
      const localPlugins = await this.parseSettingsFile(localSettings);
      // Merge with project plugins, local takes precedence
      this.mergePlugins(plugins, localPlugins);
    }

    return {
      plugins,
      errors: this.errors,
    };
  }

  /**
   * Parse a single settings file for plugin configurations
   */
  private async parseSettingsFile(filePath: string): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');
      const settings: SettingsJson = JSON.parse(content);

      // First, parse extra marketplaces so we have them available
      if (settings.extraKnownMarketplaces) {
        this.parseExtraMarketplaces(settings.extraKnownMarketplaces, filePath);
      }

      // Parse enabled plugins
      if (settings.enabledPlugins) {
        const enabledPlugins = this.parseEnabledPlugins(
          settings.enabledPlugins,
          settings.skippedPlugins ?? [],
          filePath
        );
        plugins.push(...enabledPlugins);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.addError(
          'fatal',
          'PLUGIN_JSON_SYNTAX_ERROR',
          `Invalid JSON in settings file: ${filePath}`,
          filePath
        );
      } else {
        this.addError(
          'warning',
          'PLUGIN_READ_ERROR',
          `Failed to read settings file: ${filePath}`,
          filePath
        );
      }
    }

    return plugins;
  }

  /**
   * Parse extraKnownMarketplaces configuration
   */
  private parseExtraMarketplaces(
    marketplaces: Record<string, MarketplaceConfig>,
    sourcePath: string
  ): void {
    for (const [marketplaceId, config] of Object.entries(marketplaces)) {
      // Validate marketplace ID format
      if (!this.isValidIdentifier(marketplaceId)) {
        this.addError(
          'warning',
          'INVALID_MARKETPLACE_ID',
          `Invalid marketplace ID format: "${marketplaceId}". Must be lowercase alphanumeric with dashes.`,
          sourcePath
        );
        continue;
      }

      // Validate source if provided
      if (config.source) {
        const sourceType = this.normalizeSourceType(config.source.source);
        if (!sourceType) {
          this.addError(
            'warning',
            'INVALID_MARKETPLACE_SOURCE',
            `Invalid source type "${config.source.source}" for marketplace "${marketplaceId}". ` +
            `Valid types: ${VALID_SOURCE_TYPES.join(', ')}`,
            sourcePath
          );
          continue;
        }
      }

      this.customMarketplaces.set(marketplaceId, config);
    }
  }

  /**
   * Parse enabledPlugins configuration
   */
  private parseEnabledPlugins(
    enabledPlugins: Record<string, boolean | PluginConfig>,
    skippedPlugins: string[],
    sourcePath: string
  ): Plugin[] {
    const plugins: Plugin[] = [];
    const skippedSet = new Set(skippedPlugins);

    for (const [pluginKey, configValue] of Object.entries(enabledPlugins)) {
      // Validate plugin ID format
      const parsed = this.parsePluginId(pluginKey);
      if (!parsed) {
        this.addError(
          'warning',
          'INVALID_PLUGIN_ID',
          `Invalid plugin ID format: "${pluginKey}". Expected format: plugin-id@marketplace-id`,
          sourcePath
        );
        continue;
      }

      const { pluginId, marketplaceId } = parsed;

      // Check if plugin is in skipped list
      if (skippedSet.has(pluginKey)) {
        continue;
      }

      // Determine enabled state and config
      let enabled: boolean;
      let config: PluginConfig = {};

      if (typeof configValue === 'boolean') {
        enabled = configValue;
      } else if (typeof configValue === 'object' && configValue !== null) {
        enabled = configValue.enabled !== false; // Default to true if not specified
        config = configValue;
      } else {
        this.addError(
          'warning',
          'INVALID_PLUGIN_CONFIG',
          `Invalid configuration for plugin "${pluginKey}". Expected boolean or object.`,
          sourcePath
        );
        continue;
      }

      // Look up marketplace information
      const marketplaceInfo = this.getMarketplaceInfo(marketplaceId);
      const source = this.resolvePluginSource(pluginId, marketplaceId, marketplaceInfo);

      plugins.push({
        id: pluginKey,
        name: this.formatPluginName(pluginId),
        marketplace: marketplaceId,
        enabled,
        version: config.version,
        description: config.description,
        source,
      });
    }

    return plugins;
  }

  /**
   * Parse plugin ID in format plugin-id@marketplace-id
   */
  private parsePluginId(key: string): { pluginId: string; marketplaceId: string } | null {
    const match = key.match(PLUGIN_ID_PATTERN);
    if (!match) {
      return null;
    }
    return {
      pluginId: match[1],
      marketplaceId: match[2],
    };
  }

  /**
   * Validate identifier format (lowercase alphanumeric with dashes)
   */
  private isValidIdentifier(id: string): boolean {
    return /^[a-z][a-z0-9-]*$/i.test(id);
  }

  /**
   * Get marketplace information from built-in or custom marketplaces
   */
  private getMarketplaceInfo(marketplaceId: string): KnownMarketplace | MarketplaceConfig | null {
    // Check built-in first
    const builtin = BUILTIN_MARKETPLACES[marketplaceId.toLowerCase()];
    if (builtin) {
      return builtin;
    }

    // Check custom marketplaces
    const custom = this.customMarketplaces.get(marketplaceId);
    if (custom) {
      return custom;
    }

    return null;
  }

  /**
   * Resolve plugin source from marketplace configuration
   */
  private resolvePluginSource(
    pluginId: string,
    marketplaceId: string,
    marketplaceInfo: KnownMarketplace | MarketplaceConfig | null
  ): Plugin['source'] | undefined {
    if (!marketplaceInfo) {
      return undefined;
    }

    // Handle built-in marketplace
    if (this.isKnownMarketplace(marketplaceInfo)) {
      return {
        type: marketplaceInfo.sourceType,
        location: `${marketplaceInfo.location}/${pluginId}`,
      };
    }

    // Handle custom marketplace
    if (marketplaceInfo.source) {
      const sourceType = this.normalizeSourceType(marketplaceInfo.source.source);
      if (!sourceType) {
        return undefined;
      }

      const location = this.resolveSourceLocation(marketplaceInfo.source, pluginId);
      if (location) {
        return {
          type: sourceType,
          location,
        };
      }
    }

    return undefined;
  }

  /**
   * Type guard for built-in marketplace
   */
  private isKnownMarketplace(info: KnownMarketplace | MarketplaceConfig): info is KnownMarketplace {
    return 'sourceType' in info && 'location' in info;
  }

  /**
   * Normalize source type string to MarketplaceSourceType
   */
  private normalizeSourceType(sourceType: string): MarketplaceSourceType | null {
    const normalized = sourceType.toLowerCase();
    if (VALID_SOURCE_TYPES.includes(normalized as MarketplaceSourceType)) {
      return normalized as MarketplaceSourceType;
    }
    return null;
  }

  /**
   * Resolve source location based on source type and config
   */
  private resolveSourceLocation(source: MarketplaceSource, pluginId: string): string | null {
    const sourceType = source.source.toLowerCase();

    switch (sourceType) {
      case 'github':
        return source.repo ? `${source.repo}/${pluginId}` : null;
      case 'git':
        return source.url ?? null;
      case 'url':
        return source.url ?? null;
      case 'npm':
        return source.package ?? `@${pluginId}`;
      case 'file':
      case 'directory':
        return source.path ?? null;
      default:
        return null;
    }
  }

  /**
   * Format plugin ID into human-readable name
   */
  private formatPluginName(pluginId: string): string {
    return pluginId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Merge local plugins with project plugins (local takes precedence)
   */
  private mergePlugins(projectPlugins: Plugin[], localPlugins: Plugin[]): void {
    const projectMap = new Map(projectPlugins.map(p => [p.id, p]));

    for (const localPlugin of localPlugins) {
      const existing = projectMap.get(localPlugin.id);
      if (existing) {
        // Update existing plugin with local values
        const index = projectPlugins.indexOf(existing);
        projectPlugins[index] = {
          ...existing,
          ...localPlugin,
          // Preserve source from project if local doesn't have it
          source: localPlugin.source ?? existing.source,
        };
      } else {
        // Add new plugin
        projectPlugins.push(localPlugin);
      }
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Add an error to the collection
   */
  private addError(
    severity: ScanError['severity'],
    code: string,
    message: string,
    file?: string
  ): void {
    this.errors.push({ severity, code, message, file });
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Parse plugin configurations from a project root
 */
export async function parsePlugins(rootPath: string): Promise<PluginParseResult> {
  const parser = new PluginParser(rootPath);
  return parser.parse();
}

/**
 * Validate a plugin ID format
 * @returns true if valid, error message if invalid
 */
export function validatePluginId(pluginId: string): true | string {
  if (!pluginId) {
    return 'Plugin ID cannot be empty';
  }

  const match = pluginId.match(PLUGIN_ID_PATTERN);
  if (!match) {
    if (!pluginId.includes('@')) {
      return 'Plugin ID must include marketplace (format: plugin-id@marketplace-id)';
    }
    const parts = pluginId.split('@');
    if (parts.length !== 2) {
      return 'Plugin ID must have exactly one @ separator';
    }
    if (!/^[a-z][a-z0-9-]*$/i.test(parts[0])) {
      return 'Plugin name must start with a letter and contain only letters, numbers, and dashes';
    }
    if (!/^[a-z][a-z0-9-]*$/i.test(parts[1])) {
      return 'Marketplace ID must start with a letter and contain only letters, numbers, and dashes';
    }
    return 'Invalid plugin ID format';
  }

  return true;
}

/**
 * Check if a marketplace source type is valid
 */
export function isValidSourceType(type: string): type is MarketplaceSourceType {
  return VALID_SOURCE_TYPES.includes(type as MarketplaceSourceType);
}

/**
 * Get list of built-in marketplace IDs
 */
export function getBuiltinMarketplaces(): string[] {
  return Object.keys(BUILTIN_MARKETPLACES);
}
