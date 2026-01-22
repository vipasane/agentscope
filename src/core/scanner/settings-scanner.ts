/**
 * Settings Scanner - Parses Claude Code settings.json
 *
 * Scans project-level (.claude/settings.json) and user-level (~/.claude/settings.json)
 * configurations to extract hooks, permissions, plugins, and MCP servers.
 *
 * Schema Reference: 2026.01
 * @see https://json.schemastore.org/claude-code-settings.json
 * @see https://code.claude.com/docs/en/settings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type {
  Hook,
  Plugin,
  PermissionSummary,
  PermissionRule,
  McpServer,
  Command,
  HookEvent,
  ScanError,
  McpServerType,
  MarketplaceSourceType,
} from '../model/types.js';
import type {
  HookEvent as SchemaHookEvent,
  HookConfig as SchemaHookConfig,
  HookDefinition as SchemaHookDefinition,
  PermissionConfig,
  MarketplaceSource,
} from '../model/schema-reference.js';
import { parsePermissions, type RawPermissionsConfig } from './permission-parser.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of scanning settings.json files
 */
export interface SettingsScanResult {
  /** Parsed hook configurations */
  hooks: Hook[];
  /** Parsed plugin configurations */
  plugins: Plugin[];
  /** Permission summary with all rules */
  permissions: PermissionSummary;
  /** MCP server configurations */
  mcpServers: McpServer[];
  /** Custom slash commands (from commands directory) */
  commands: Command[];
  /** Parsing errors encountered */
  errors: ScanError[];
}

/**
 * Raw settings.json structure (2026.01 schema)
 */
interface SettingsJson {
  $schema?: string;
  hooks?: Record<string, HookEventConfig[]>;
  disableAllHooks?: boolean;
  allowManagedHooksOnly?: boolean;
  permissions?: PermissionConfig;
  enabledPlugins?: Record<string, boolean | unknown>;
  extraKnownMarketplaces?: Record<string, { source: MarketplaceSource }>;
  pluginConfigs?: Record<string, unknown>;
  mcpServers?: Record<string, McpServerConfigRaw>;
  enableAllProjectMcpServers?: boolean;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  statusLine?: StatusLineConfig;
  claudeFlow?: ClaudeFlowConfig;
}

/**
 * Hook event configuration (array item under each event key)
 */
interface HookEventConfig {
  matcher?: string;
  hooks: HookDefinitionRaw[];
}

/**
 * Individual hook definition
 */
interface HookDefinitionRaw {
  type: 'command' | 'prompt';
  command?: string;
  prompt?: string;
  timeout?: number;
  continueOnError?: boolean;
  workingDirectory?: string;
}

/**
 * MCP server configuration from settings
 */
interface McpServerConfigRaw {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
  type?: string;
}

/**
 * Status line configuration
 */
interface StatusLineConfig {
  type: 'command';
  command: string;
  refreshMs?: number;
  enabled?: boolean;
}

/**
 * Claude Flow specific configuration
 */
interface ClaudeFlowConfig {
  version?: string;
  enabled?: boolean;
  swarm?: {
    topology?: string;
    maxAgents?: number;
  };
  memory?: {
    backend?: string;
    enableHNSW?: boolean;
  };
  neural?: {
    enabled?: boolean;
  };
  daemon?: {
    autoStart?: boolean;
    workers?: string[];
  };
}

/**
 * MCP configuration from .mcp.json
 */
interface McpJsonConfig {
  mcpServers?: Record<string, McpServerConfigRaw>;
}

// ============================================================================
// Valid Hook Events (2026.01 Schema)
// ============================================================================

const VALID_HOOK_EVENTS: readonly SchemaHookEvent[] = [
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'PreCompact',
  'UserPromptSubmit',
] as const;

// ============================================================================
// Settings Scanner Class
// ============================================================================

/**
 * Scanner for Claude Code settings.json files
 *
 * Parses both project-level and user-level settings to extract:
 * - Hook configurations (PreToolUse, PostToolUse, etc.)
 * - Permission rules (allow, deny, ask)
 * - Plugin configurations
 * - MCP server definitions
 * - Custom commands
 */
export class SettingsScanner {
  private errors: ScanError[] = [];

  constructor(private rootPath: string) {}

  /**
   * Scan project-level settings from .claude/settings.json
   *
   * @returns Parsed settings result with hooks, plugins, permissions, etc.
   */
  async scan(): Promise<SettingsScanResult> {
    this.errors = [];

    const settingsPath = path.join(this.rootPath, '.claude', 'settings.json');
    const localSettingsPath = path.join(this.rootPath, '.claude', 'settings.local.json');
    const mcpPath = path.join(this.rootPath, '.mcp.json');

    // Parse all configuration sources in parallel
    const [mainSettings, localSettings, mcpConfig, commands] = await Promise.all([
      this.parseSettingsFile(settingsPath),
      this.parseSettingsFile(localSettingsPath),
      this.parseMcpJson(mcpPath),
      this.parseCommands(),
    ]);

    // Merge main and local settings (local takes precedence for overlapping keys)
    const settings = this.mergeSettingsObjects(mainSettings, localSettings);

    // Extract all entities
    const hooks = this.extractHooks(settings, settingsPath);
    const plugins = this.extractPlugins(settings);
    const permissions = this.extractPermissions(settings, settingsPath);
    const mcpServers = this.extractMcpServers(settings, mcpConfig);

    return {
      hooks,
      plugins,
      permissions,
      mcpServers,
      commands,
      errors: this.errors,
    };
  }

  // ============================================================================
  // Settings File Parsing
  // ============================================================================

  /**
   * Parse a settings.json file
   *
   * @param filePath - Path to the settings file
   * @returns Parsed settings object or empty object if file doesn't exist
   */
  private async parseSettingsFile(filePath: string): Promise<SettingsJson> {
    if (!(await this.fileExists(filePath))) {
      return {};
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as SettingsJson;
      return this.validateSettingsJson(parsed, filePath);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.addError('fatal', 'SETTINGS_JSON_SYNTAX', `Invalid JSON in settings file: ${error.message}`, filePath);
      } else {
        this.addError('warning', 'SETTINGS_READ_ERROR', `Failed to read settings file: ${String(error)}`, filePath);
      }
      return {};
    }
  }

  /**
   * Validate settings JSON structure
   *
   * @param settings - Parsed settings object
   * @param filePath - Source file path for error reporting
   * @returns Validated settings object
   */
  private validateSettingsJson(settings: unknown, filePath: string): SettingsJson {
    if (typeof settings !== 'object' || settings === null) {
      this.addError('fatal', 'SETTINGS_INVALID_TYPE', 'Settings file must contain a JSON object', filePath);
      return {};
    }

    const result = settings as SettingsJson;

    // Validate hooks structure if present
    if (result.hooks !== undefined && typeof result.hooks !== 'object') {
      this.addError('warning', 'SETTINGS_INVALID_HOOKS', 'hooks must be an object keyed by event type', filePath);
      result.hooks = undefined;
    }

    // Validate permissions structure if present
    if (result.permissions !== undefined && typeof result.permissions !== 'object') {
      this.addError('warning', 'SETTINGS_INVALID_PERMISSIONS', 'permissions must be an object', filePath);
      result.permissions = undefined;
    }

    return result;
  }

  /**
   * Parse .mcp.json configuration file
   *
   * @param filePath - Path to .mcp.json
   * @returns Parsed MCP configuration or empty object
   */
  private async parseMcpJson(filePath: string): Promise<McpJsonConfig> {
    if (!(await this.fileExists(filePath))) {
      return {};
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as McpJsonConfig;
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.addError('fatal', 'MCP_JSON_SYNTAX', `Invalid JSON in .mcp.json: ${error.message}`, filePath);
      } else {
        this.addError('warning', 'MCP_READ_ERROR', `Failed to read .mcp.json: ${String(error)}`, filePath);
      }
      return {};
    }
  }

  /**
   * Merge two settings objects (second takes precedence)
   *
   * @param base - Base settings object
   * @param override - Override settings object
   * @returns Merged settings object
   */
  private mergeSettingsObjects(base: SettingsJson, override: SettingsJson): SettingsJson {
    return {
      ...base,
      ...override,
      // Deep merge hooks
      hooks: override.hooks ?? base.hooks,
      // Deep merge permissions
      permissions: override.permissions ?? base.permissions,
      // Deep merge plugins
      enabledPlugins: {
        ...base.enabledPlugins,
        ...override.enabledPlugins,
      },
      // Deep merge MCP servers
      mcpServers: {
        ...base.mcpServers,
        ...override.mcpServers,
      },
    };
  }

  // ============================================================================
  // Hook Extraction
  // ============================================================================

  /**
   * Extract hooks from settings configuration
   *
   * @param settings - Parsed settings object
   * @param sourcePath - Source file path for the hook
   * @returns Array of parsed Hook objects
   */
  private extractHooks(settings: SettingsJson, sourcePath: string): Hook[] {
    const hooks: Hook[] = [];

    if (!settings.hooks || settings.disableAllHooks) {
      return hooks;
    }

    for (const [eventKey, eventConfigs] of Object.entries(settings.hooks)) {
      // Validate event type
      if (!this.isValidHookEvent(eventKey)) {
        this.addError(
          'warning',
          'INVALID_HOOK_EVENT',
          `Unknown hook event type: ${eventKey}. Valid events: ${VALID_HOOK_EVENTS.join(', ')}`,
          sourcePath
        );
        continue;
      }

      if (!Array.isArray(eventConfigs)) {
        this.addError('warning', 'INVALID_HOOK_CONFIG', `Hook configuration for ${eventKey} must be an array`, sourcePath);
        continue;
      }

      for (const eventConfig of eventConfigs) {
        const parsedHooks = this.parseHookEventConfig(eventKey as HookEvent, eventConfig, sourcePath);
        hooks.push(...parsedHooks);
      }
    }

    return hooks;
  }

  /**
   * Check if an event key is a valid hook event
   *
   * @param event - Event key to validate
   * @returns True if valid hook event
   */
  private isValidHookEvent(event: string): event is SchemaHookEvent {
    return VALID_HOOK_EVENTS.includes(event as SchemaHookEvent);
  }

  /**
   * Parse a single hook event configuration
   *
   * @param event - Hook event type
   * @param config - Hook event configuration
   * @param sourcePath - Source file path
   * @returns Array of parsed Hook objects
   */
  private parseHookEventConfig(event: HookEvent, config: HookEventConfig, sourcePath: string): Hook[] {
    const hooks: Hook[] = [];

    if (!config.hooks || !Array.isArray(config.hooks)) {
      return hooks;
    }

    for (const hookDef of config.hooks) {
      if (!hookDef.type) {
        this.addError('warning', 'HOOK_MISSING_TYPE', `Hook definition for ${event} is missing type field`, sourcePath);
        continue;
      }

      if (hookDef.type === 'command' && !hookDef.command) {
        this.addError('warning', 'HOOK_MISSING_COMMAND', `Command hook for ${event} is missing command field`, sourcePath);
        continue;
      }

      if (hookDef.type === 'prompt' && !hookDef.prompt) {
        this.addError('warning', 'HOOK_MISSING_PROMPT', `Prompt hook for ${event} is missing prompt field`, sourcePath);
        continue;
      }

      hooks.push({
        event,
        path: path.relative(this.rootPath, sourcePath),
        command: hookDef.command,
        workingDirectory: hookDef.workingDirectory,
        timeout: hookDef.timeout,
        enabled: true,
        metadata: {
          type: hookDef.type,
          matcher: config.matcher,
          continueOnError: hookDef.continueOnError,
          prompt: hookDef.prompt,
        },
      });
    }

    return hooks;
  }

  // ============================================================================
  // Plugin Extraction
  // ============================================================================

  /**
   * Extract plugins from settings configuration
   *
   * @param settings - Parsed settings object
   * @returns Array of parsed Plugin objects
   */
  private extractPlugins(settings: SettingsJson): Plugin[] {
    const plugins: Plugin[] = [];

    if (!settings.enabledPlugins) {
      return plugins;
    }

    for (const [pluginId, config] of Object.entries(settings.enabledPlugins)) {
      const plugin = this.parsePluginConfig(pluginId, config, settings);
      if (plugin) {
        plugins.push(plugin);
      }
    }

    return plugins;
  }

  /**
   * Parse a single plugin configuration
   *
   * Plugin ID format: plugin-id@marketplace-id
   *
   * @param pluginId - Plugin identifier
   * @param config - Plugin configuration (boolean or object)
   * @param settings - Full settings for marketplace lookup
   * @returns Parsed Plugin object or null
   */
  private parsePluginConfig(pluginId: string, config: boolean | unknown, settings: SettingsJson): Plugin | null {
    // Parse plugin ID (format: plugin-id@marketplace-id)
    const [name, marketplace] = pluginId.split('@');

    if (!name) {
      this.addError('warning', 'INVALID_PLUGIN_ID', `Invalid plugin ID format: ${pluginId}`);
      return null;
    }

    const enabled = typeof config === 'boolean' ? config : true;

    // Look up marketplace source if available
    let source: Plugin['source'] | undefined;
    if (marketplace && settings.extraKnownMarketplaces?.[marketplace]) {
      const marketplaceConfig = settings.extraKnownMarketplaces[marketplace].source;
      source = this.convertMarketplaceSource(marketplaceConfig);
    }

    // Get plugin-specific config if available
    const pluginConfig = settings.pluginConfigs?.[pluginId];

    return {
      id: pluginId,
      name,
      marketplace,
      enabled,
      source,
      description: typeof pluginConfig === 'object' && pluginConfig !== null && 'description' in pluginConfig
        ? String(pluginConfig.description)
        : undefined,
    };
  }

  /**
   * Convert marketplace source to Plugin source format
   *
   * @param source - Marketplace source configuration
   * @returns Converted source object
   */
  private convertMarketplaceSource(source: MarketplaceSource): Plugin['source'] | undefined {
    if ('source' in source) {
      switch (source.source) {
        case 'github':
          return { type: 'github', location: source.repo };
        case 'git':
          return { type: 'git', location: source.url };
        case 'url':
          return { type: 'url', location: source.url };
        case 'npm':
          return { type: 'npm', location: source.package };
        case 'file':
          return { type: 'file', location: source.path };
        case 'directory':
          return { type: 'directory', location: source.path };
      }
    }
    return undefined;
  }

  // ============================================================================
  // Permission Extraction
  // ============================================================================

  /**
   * Extract permissions from settings configuration
   *
   * Uses the dedicated permission-parser module for comprehensive parsing
   * with security validation and pattern matching support.
   *
   * Permission rule format: Tool(argument) or mcp__server__tool
   * Examples:
   * - Bash(npm run:*) - Prefix matching
   * - Read(./.env) - Exact file path
   * - Read(./secrets/**) - Glob matching
   * - mcp__server__tool - MCP tool permission
   *
   * @param settings - Parsed settings object
   * @param filePath - Optional file path for error reporting
   * @returns Permission summary with all rules
   */
  private extractPermissions(settings: SettingsJson, filePath?: string): PermissionSummary {
    if (!settings.permissions) {
      return {
        allowCount: 0,
        denyCount: 0,
        askCount: 0,
        rules: [],
      };
    }

    // Use the dedicated permission parser for comprehensive validation
    const rawConfig: RawPermissionsConfig = {
      allow: settings.permissions.allow,
      deny: settings.permissions.deny,
      ask: settings.permissions.ask,
      defaultMode: settings.permissions.defaultMode,
      additionalDirectories: settings.permissions.additionalDirectories,
    };

    const result = parsePermissions(rawConfig, filePath);

    // Add any parsing errors to the scanner's error collection
    for (const error of result.errors) {
      this.addError(error.severity, error.code, error.message, error.file);
    }

    return result.summary;
  }

  // ============================================================================
  // MCP Server Extraction
  // ============================================================================

  /**
   * Extract MCP servers from settings and .mcp.json
   *
   * @param settings - Parsed settings object
   * @param mcpConfig - Parsed .mcp.json configuration
   * @returns Array of parsed McpServer objects
   */
  private extractMcpServers(settings: SettingsJson, mcpConfig: McpJsonConfig): McpServer[] {
    const servers: McpServer[] = [];
    const serverMap = new Map<string, McpServer>();

    // Parse servers from .mcp.json (project-level)
    if (mcpConfig.mcpServers) {
      for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
        const server = this.parseMcpServerConfig(name, config);
        if (server) {
          serverMap.set(name, server);
        }
      }
    }

    // Parse servers from settings.json (may override .mcp.json)
    if (settings.mcpServers) {
      for (const [name, config] of Object.entries(settings.mcpServers)) {
        const server = this.parseMcpServerConfig(name, config);
        if (server) {
          serverMap.set(name, server);
        }
      }
    }

    // Apply enabled/disabled overrides from settings
    if (settings.disabledMcpjsonServers) {
      for (const name of settings.disabledMcpjsonServers) {
        const server = serverMap.get(name);
        if (server) {
          server.disabled = true;
        }
      }
    }

    return Array.from(serverMap.values());
  }

  /**
   * Parse a single MCP server configuration
   *
   * @param name - Server name/identifier
   * @param config - Server configuration object
   * @returns Parsed McpServer object or null
   */
  private parseMcpServerConfig(name: string, config: McpServerConfigRaw): McpServer | null {
    if (!config.command) {
      this.addError('warning', 'MCP_MISSING_COMMAND', `MCP server "${name}" is missing required command field`);
      return null;
    }

    return {
      name,
      command: config.command,
      args: config.args ?? [],
      env: config.env ?? {},
      disabled: config.disabled ?? false,
      type: this.inferMcpServerType(config),
      tools: config.alwaysAllow ?? [],
    };
  }

  /**
   * Infer MCP server type from configuration
   *
   * @param config - Server configuration
   * @returns Inferred server type
   */
  private inferMcpServerType(config: McpServerConfigRaw): McpServerType {
    if (config.type) {
      const normalizedType = config.type.toLowerCase();
      if (['stdio', 'sse', 'websocket'].includes(normalizedType)) {
        return normalizedType as McpServerType;
      }
      return 'custom';
    }

    const args = config.args?.join(' ').toLowerCase() ?? '';
    const command = config.command.toLowerCase();

    if (args.includes('sse') || args.includes('--transport=sse')) {
      return 'sse';
    }

    if (args.includes('websocket') || args.includes('ws://') || args.includes('--transport=websocket')) {
      return 'websocket';
    }

    // Most MCP servers use stdio by default
    return 'stdio';
  }

  // ============================================================================
  // Command Parsing
  // ============================================================================

  /**
   * Parse custom commands from .claude/commands/ directory
   *
   * @returns Array of parsed Command objects
   */
  private async parseCommands(): Promise<Command[]> {
    const commands: Command[] = [];
    const commandsDir = path.join(this.rootPath, '.claude', 'commands');

    if (!(await this.directoryExists(commandsDir))) {
      return commands;
    }

    try {
      const files = await this.findMarkdownFiles(commandsDir);

      for (const file of files) {
        const command = await this.parseCommandFile(file);
        if (command) {
          commands.push(command);
        }
      }
    } catch (error) {
      this.addError('warning', 'COMMANDS_READ_ERROR', `Failed to read commands directory: ${String(error)}`, commandsDir);
    }

    return commands;
  }

  /**
   * Find all markdown files recursively in a directory
   *
   * @param dir - Directory to search
   * @returns Array of file paths
   */
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.addError('warning', 'DIR_READ_ERROR', `Failed to read directory: ${dir}`, dir);
    }

    return files;
  }

  /**
   * Parse a single command file
   *
   * @param filePath - Path to command markdown file
   * @returns Parsed Command object or null
   */
  private async parseCommandFile(filePath: string): Promise<Command | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(path.join(this.rootPath, '.claude', 'commands'), filePath);

      // Command name from path (e.g., analysis/performance.md -> /analysis/performance)
      const commandName = '/' + relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

      // Parse YAML frontmatter
      const frontmatter = this.parseFrontmatter(content);

      return {
        name: commandName,
        description: typeof frontmatter.description === 'string'
          ? frontmatter.description
          : this.extractFirstParagraph(content),
        allowedTools: Array.isArray(frontmatter.allowed_tools) ? frontmatter.allowed_tools as string[] : undefined,
        disallowedTools: Array.isArray(frontmatter.disallowed_tools) ? frontmatter.disallowed_tools as string[] : undefined,
        prompt: this.extractPromptContent(content),
      };
    } catch (error) {
      this.addError('warning', 'COMMAND_PARSE_ERROR', `Failed to parse command file: ${String(error)}`, filePath);
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   *
   * @param content - Markdown content
   * @returns Parsed frontmatter object
   */
  private parseFrontmatter(content: string): Record<string, unknown> {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch?.[1]) {
      return {};
    }

    try {
      const yaml = frontmatterMatch[1];
      const result: Record<string, unknown> = {};

      for (const line of yaml.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          let value: unknown = line.slice(colonIndex + 1).trim();

          // Handle arrays
          if (typeof value === 'string' && value.startsWith('[')) {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep as string if not valid JSON
            }
          }

          // Handle booleans
          if (value === 'true') value = true;
          if (value === 'false') value = false;

          result[key] = value;
        }
      }

      return result;
    } catch {
      return {};
    }
  }

  /**
   * Extract first paragraph from markdown (skipping frontmatter and headers)
   *
   * @param content - Markdown content
   * @returns First paragraph text or undefined
   */
  private extractFirstParagraph(content: string): string | undefined {
    const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    const paragraphs = withoutFrontmatter.split(/\n\n+/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.slice(0, 200);
      }
    }

    return undefined;
  }

  /**
   * Extract prompt content from markdown (content after frontmatter)
   *
   * @param content - Markdown content
   * @returns Prompt content or undefined
   */
  private extractPromptContent(content: string): string | undefined {
    const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    return withoutFrontmatter.trim() || undefined;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
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
 * Scan project-level settings
 *
 * Convenience function for scanning .claude/settings.json in a project.
 *
 * @param rootPath - Root directory of the project
 * @returns Settings scan result
 *
 * @example
 * ```typescript
 * const result = await scanSettings('/path/to/project');
 * console.log(`Found ${result.hooks.length} hooks`);
 * console.log(`Found ${result.plugins.length} plugins`);
 * ```
 */
export async function scanSettings(rootPath: string): Promise<SettingsScanResult> {
  const scanner = new SettingsScanner(rootPath);
  return scanner.scan();
}

/**
 * Scan user-level settings
 *
 * Scans ~/.claude/settings.json for user-level configuration.
 *
 * @returns Settings scan result for user configuration
 *
 * @example
 * ```typescript
 * const userSettings = await scanUserSettings();
 * console.log(`User has ${userSettings.permissions.allowCount} allow rules`);
 * ```
 */
export async function scanUserSettings(): Promise<SettingsScanResult> {
  const userDir = path.join(os.homedir(), '.claude');
  const scanner = new SettingsScanner(userDir);
  return scanner.scan();
}

/**
 * Merge project and user settings
 *
 * Merges settings from project-level and user-level configurations.
 * Project settings take precedence for conflicting values.
 *
 * @param project - Project-level settings
 * @param user - User-level settings
 * @returns Merged settings result
 *
 * @example
 * ```typescript
 * const projectSettings = await scanSettings('/path/to/project');
 * const userSettings = await scanUserSettings();
 * const merged = mergeSettings(projectSettings, userSettings);
 * ```
 */
export function mergeSettings(
  project: SettingsScanResult,
  user: SettingsScanResult
): SettingsScanResult {
  // Create maps for deduplication
  const hookMap = new Map<string, Hook>();
  const pluginMap = new Map<string, Plugin>();
  const serverMap = new Map<string, McpServer>();
  const commandMap = new Map<string, Command>();

  // Add user settings first (will be overridden by project)
  for (const hook of user.hooks) {
    hookMap.set(`${hook.event}:${hook.command ?? hook.path}`, hook);
  }
  for (const plugin of user.plugins) {
    pluginMap.set(plugin.id, plugin);
  }
  for (const server of user.mcpServers) {
    serverMap.set(server.name, server);
  }
  for (const command of user.commands) {
    commandMap.set(command.name, command);
  }

  // Add project settings (takes precedence)
  for (const hook of project.hooks) {
    hookMap.set(`${hook.event}:${hook.command ?? hook.path}`, hook);
  }
  for (const plugin of project.plugins) {
    pluginMap.set(plugin.id, plugin);
  }
  for (const server of project.mcpServers) {
    serverMap.set(server.name, server);
  }
  for (const command of project.commands) {
    commandMap.set(command.name, command);
  }

  // Merge permission rules (project rules added after user rules)
  const mergedRules = [...user.permissions.rules, ...project.permissions.rules];

  return {
    hooks: Array.from(hookMap.values()),
    plugins: Array.from(pluginMap.values()),
    permissions: {
      allowCount: project.permissions.allowCount + user.permissions.allowCount,
      denyCount: project.permissions.denyCount + user.permissions.denyCount,
      askCount: project.permissions.askCount + user.permissions.askCount,
      rules: mergedRules,
      defaultMode: project.permissions.defaultMode ?? user.permissions.defaultMode,
      additionalDirectories: [
        ...(user.permissions.additionalDirectories ?? []),
        ...(project.permissions.additionalDirectories ?? []),
      ],
    },
    mcpServers: Array.from(serverMap.values()),
    commands: Array.from(commandMap.values()),
    errors: [...user.errors, ...project.errors],
  };
}
