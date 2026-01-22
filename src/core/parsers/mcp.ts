/**
 * Parser for .mcp.json MCP server configurations
 * Extracts server definitions and tool information
 */

import { readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { McpServer, ScanError, McpServerType } from '../model/types.js';

// ============================================================================
// Types
// ============================================================================

export interface McpParseResult {
  servers: McpServer[];
  errors: ScanError[];
}

interface McpConfigJson {
  mcpServers?: Record<string, McpServerConfig>;
}

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
  type?: string;
}

// ============================================================================
// Main Parser Class
// ============================================================================

export class McpParser {
  private errors: ScanError[] = [];

  constructor(private rootPath: string) {}

  /**
   * Parse MCP configurations from .mcp.json files
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
   * Parse a single server configuration
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
   * Infer the server type from configuration
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
   * Extract tools from alwaysAllow or infer from server name
   */
  private extractToolsFromConfig(config: McpServerConfig): string[] {
    if (config.alwaysAllow && Array.isArray(config.alwaysAllow)) {
      return config.alwaysAllow;
    }

    return [];
  }

  /**
   * Deduplicate servers by name, preferring non-disabled entries
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

/**
 * Convenience function for parsing MCP configuration
 */
export async function parseMcp(rootPath: string): Promise<McpParseResult> {
  const parser = new McpParser(rootPath);
  return parser.parse();
}
