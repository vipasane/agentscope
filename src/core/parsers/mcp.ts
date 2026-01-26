/**
 * MCP (Model Context Protocol) Configuration Parser
 *
 * Parses MCP server configurations from .mcp.json and .claude/settings.json files.
 * Extracts server definitions, transport types, environment variables, and tool permissions.
 *
 * @module parsers/mcp
 * @see {@link https://modelcontextprotocol.io | MCP Specification}
 *
 * @example
 * ```typescript
 * import { parseMcp } from './parsers/mcp.js';
 *
 * const result = await parseMcp('/path/to/project');
 * console.log(`Found ${result.servers.length} MCP servers`);
 *
 * for (const server of result.servers) {
 *   console.log(`- ${server.name} (${server.type})`);
 * }
 * ```
 */

import { readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { McpServer, ScanError, McpServerType } from '../model/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of MCP configuration parsing
 *
 * @interface McpParseResult
 * @property {McpServer[]} servers - Successfully parsed MCP servers (duplicates removed)
 * @property {ScanError[]} errors - Any warnings or errors encountered during parsing
 */
export interface McpParseResult {
  servers: McpServer[];
  errors: ScanError[];
}

/**
 * .mcp.json file structure
 *
 * @internal
 */
interface McpConfigJson {
  mcpServers?: Record<string, McpServerConfig>;
}

/**
 * Individual MCP server configuration
 *
 * @internal
 */
interface McpServerConfig {
  /** Command to execute (npx, node, python, etc.) */
  command: string;
  /** Command-line arguments */
  args?: string[];
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Whether server is disabled */
  disabled?: boolean;
  /** Tools that are always allowed without prompting */
  alwaysAllow?: string[];
  /** Server transport type (stdio, sse, websocket) */
  type?: string;
}

// ============================================================================
// Main Parser Class
// ============================================================================

/**
 * MCP Configuration Parser
 *
 * Parses MCP server configurations from multiple sources:
 * - Project root: .mcp.json
 * - Claude settings: .claude/settings.json
 *
 * Features:
 * - Automatic server type inference (stdio, sse, websocket)
 * - Deduplication of servers by name
 * - Error collection without throwing
 * - Tool permission extraction
 *
 * @class McpParser
 *
 * @example
 * ```typescript
 * const parser = new McpParser('/path/to/project');
 * const result = await parser.parse();
 *
 * // Check for errors
 * if (result.errors.length > 0) {
 *   console.warn('Parsing warnings:', result.errors);
 * }
 *
 * // Use parsed servers
 * for (const server of result.servers) {
 *   console.log(`${server.name}: ${server.command} (${server.type})`);
 * }
 * ```
 */
export class McpParser {
  private errors: ScanError[] = [];

  /**
   * Create a new MCP parser
   *
   * @param {string} rootPath - Absolute path to project root directory
   */
  constructor(private rootPath: string) {}

  /**
   * Parse MCP server configurations from all available sources
   *
   * Searches for:
   * 1. `.mcp.json` in project root
   * 2. `.claude/settings.json` with mcpServers key
   *
   * Servers are deduplicated by name, preferring enabled over disabled entries.
   *
   * @returns {Promise<McpParseResult>} Parsed servers and any errors encountered
   * @throws Never throws - all errors are captured in result.errors
   *
   * @example
   * ```typescript
   * const parser = new McpParser('/workspace');
   * const result = await parser.parse();
   *
   * console.log(`Found ${result.servers.length} servers`);
   * console.log(`Encountered ${result.errors.length} errors`);
   * ```
   */
  async parse(): Promise<McpParseResult> {
    this.errors = [];

    const servers: McpServer[] = [];

    // Check for project-level .mcp.json
    const projectConfig = join(this.rootPath, '.mcp.json');
    if (await this.fileExists(projectConfig)) {
      const projectServers = await this.parseConfigFile(projectConfig);
      servers.push(...projectServers);
    }

    // Check for .claude/settings.json which may also contain MCP configs
    const settingsConfig = join(this.rootPath, '.claude', 'settings.json');
    if (await this.fileExists(settingsConfig)) {
      const settingsServers = await this.parseSettingsFile(settingsConfig);
      servers.push(...settingsServers);
    }

    // Deduplicate servers by name
    const uniqueServers = this.deduplicateServers(servers);

    return {
      servers: uniqueServers,
      errors: this.errors,
    };
  }

  /**
   * Parse a .mcp.json configuration file
   *
   * @param {string} filePath - Absolute path to .mcp.json file
   * @returns {Promise<McpServer[]>} Parsed servers from this file
   * @private
   */
  private async parseConfigFile(filePath: string): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');
      const config: McpConfigJson = JSON.parse(content);

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          const server = this.parseServerConfig(name, serverConfig, filePath);
          if (server) {
            servers.push(server);
          }
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.addError('fatal', 'MCP_JSON_SYNTAX_ERROR', `Invalid JSON in MCP config: ${filePath}`, filePath);
      } else {
        this.addError('warning', 'MCP_READ_ERROR', `Failed to read MCP config: ${filePath}`, filePath);
      }
    }

    return servers;
  }

  /**
   * Parse MCP servers from .claude/settings.json
   *
   * Settings files may contain MCP servers alongside other configuration.
   * Missing or malformed MCP config is not an error.
   *
   * @param {string} filePath - Absolute path to settings.json file
   * @returns {Promise<McpServer[]>} Parsed servers from settings
   * @private
   */
  private async parseSettingsFile(filePath: string): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');
      const settings = JSON.parse(content);

      if (settings.mcpServers && typeof settings.mcpServers === 'object') {
        for (const [name, serverConfig] of Object.entries(settings.mcpServers)) {
          if (typeof serverConfig === 'object' && serverConfig !== null) {
            const server = this.parseServerConfig(name, serverConfig as McpServerConfig, filePath);
            if (server) {
              servers.push(server);
            }
          }
        }
      }
    } catch (error) {
      // Settings file may not contain MCP config, that's okay
      if (error instanceof SyntaxError) {
        this.addError('warning', 'SETTINGS_JSON_SYNTAX_ERROR', `Invalid JSON in settings: ${filePath}`, filePath);
      }
    }

    return servers;
  }

  /**
   * Parse a single MCP server configuration
   *
   * Validates required fields and infers server type from command/args.
   *
   * @param {string} name - Server name from config key
   * @param {McpServerConfig} config - Server configuration object
   * @param {string} sourcePath - Source file path (for error reporting)
   * @returns {McpServer | null} Parsed server or null if invalid
   * @private
   */
  private parseServerConfig(
    name: string,
    config: McpServerConfig,
    sourcePath: string
  ): McpServer | null {
    if (!config.command) {
      this.addError(
        'warning',
        'MCP_MISSING_COMMAND',
        `MCP server "${name}" is missing required "command" field`,
        sourcePath
      );
      return null;
    }

    return {
      name,
      command: config.command,
      args: config.args ?? [],
      env: config.env ?? {},
      disabled: config.disabled ?? false,
      type: this.inferServerType(config),
      tools: this.extractToolsFromConfig(config),
    };
  }

  /**
   * Infer MCP server transport type from command and arguments
   *
   * Detection rules:
   * - SSE: args contain "sse" or "--transport=sse"
   * - WebSocket: args contain "websocket", "--transport=websocket", or "ws://"
   * - Default: stdio (most common for MCP servers)
   *
   * @param {McpServerConfig} config - Server configuration
   * @returns {McpServerType} Inferred transport type
   * @private
   */
  private inferServerType(config: McpServerConfig): McpServerType {
    const command = config.command.toLowerCase();
    const args = config.args?.join(' ').toLowerCase() ?? '';

    // Check for SSE indicators
    if (args.includes('sse') || args.includes('--transport=sse')) {
      return 'sse';
    }

    // Check for WebSocket indicators
    if (args.includes('websocket') || args.includes('--transport=websocket') || args.includes('ws://')) {
      return 'websocket';
    }

    // Default to stdio for most MCP servers
    return 'stdio';
  }

  /**
   * Extract tool names from alwaysAllow permission list
   *
   * @param {McpServerConfig} config - Server configuration
   * @returns {string[]} List of tool names, empty if none specified
   * @private
   */
  private extractToolsFromConfig(config: McpServerConfig): string[] {
    if (config.alwaysAllow && Array.isArray(config.alwaysAllow)) {
      return config.alwaysAllow;
    }

    return [];
  }

  /**
   * Deduplicate servers by name, preferring enabled servers
   *
   * When multiple configs define the same server name:
   * - Enabled servers take precedence over disabled ones
   * - First occurrence wins if both have same disabled state
   *
   * @param {McpServer[]} servers - All parsed servers (may contain duplicates)
   * @returns {McpServer[]} Deduplicated server list
   * @private
   */
  private deduplicateServers(servers: McpServer[]): McpServer[] {
    const serverMap = new Map<string, McpServer>();

    for (const server of servers) {
      const existing = serverMap.get(server.name);

      // Prefer enabled servers over disabled ones
      if (!existing || (existing.disabled && !server.disabled)) {
        serverMap.set(server.name, server);
      }
    }

    return Array.from(serverMap.values());
  }

  /**
   * Check if a file exists and is a regular file
   *
   * @param {string} path - Absolute path to check
   * @returns {Promise<boolean>} True if file exists
   * @private
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
   * Add an error to the error collection
   *
   * Errors are collected rather than thrown to allow partial parsing.
   *
   * @param {ScanError['severity']} severity - Error severity (warning, fatal)
   * @param {string} code - Machine-readable error code
   * @param {string} message - Human-readable error message
   * @param {string} [file] - File path where error occurred
   * @private
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

/**
 * Parse MCP server configurations from a project directory
 *
 * Convenience function that creates a parser and returns results.
 * Searches for .mcp.json and .claude/settings.json files.
 *
 * @param {string} rootPath - Absolute path to project root directory
 * @returns {Promise<McpParseResult>} Parsed servers and any errors
 * @throws Never throws - all errors are captured in result.errors
 *
 * @example
 * ```typescript
 * // Parse MCP servers
 * const result = await parseMcp('/workspace');
 *
 * // Filter enabled servers
 * const enabled = result.servers.filter(s => !s.disabled);
 *
 * // Group by transport type
 * const byType = enabled.reduce((acc, s) => {
 *   (acc[s.type] = acc[s.type] || []).push(s);
 *   return acc;
 * }, {} as Record<string, McpServer[]>);
 *
 * console.log('stdio:', byType.stdio?.length ?? 0);
 * console.log('sse:', byType.sse?.length ?? 0);
 * ```
 *
 * @see {@link McpParser} for more control over parsing
 */
export async function parseMcp(rootPath: string): Promise<McpParseResult> {
  const parser = new McpParser(rootPath);
  return parser.parse();
}
