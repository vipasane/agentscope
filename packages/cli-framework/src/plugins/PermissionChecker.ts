/**
 * Permission Checker Module
 *
 * Validates plugin permissions before granting access to restricted resources.
 * Implements the 4-level permission model: filesystem, network, process, CLI.
 *
 * Based on ADR-025-UPDATE sections on Plugin Sandbox.
 */

import * as path from 'path';
import { URL } from 'url';
import {
  PluginPermissions,
  PluginPermissionError,
} from './types';

/**
 * Permission checker for plugin sandbox
 * Validates access requests against declared permissions
 */
export class PermissionChecker {
  /**
   * Check if file path access is allowed
   *
   * @param filePath - Absolute path to check
   * @param permissions - Plugin filesystem permissions
   * @param operation - Operation type ('read' | 'write' | 'execute')
   * @returns true if allowed
   * @throws PluginPermissionError if denied
   */
  static checkFileAccess(
    filePath: string,
    permissions: PluginPermissions,
    operation: 'read' | 'write' | 'execute'
  ): boolean {
    const fsPerms = permissions.filesystem;

    // No filesystem permission declared
    if (!fsPerms) {
      throw new PluginPermissionError(
        `Filesystem access denied: No filesystem permission declared`,
        'filesystem',
        { filePath, operation }
      );
    }

    // Get allowed paths for this operation
    const allowedPaths = fsPerms[operation] || [];

    if (allowedPaths.length === 0) {
      throw new PluginPermissionError(
        `Filesystem ${operation} denied: No paths allowed for ${operation}`,
        'filesystem',
        { filePath, operation }
      );
    }

    // Normalize path for comparison
    const normalizedPath = path.resolve(filePath);

    // Check if path is in allowed list (or matches glob pattern)
    const isAllowed = allowedPaths.some((allowedPath) => {
      const normalizedAllowed = path.resolve(allowedPath);

      // Exact match
      if (normalizedPath === normalizedAllowed) {
        return true;
      }

      // Check if file is within allowed directory
      if (normalizedPath.startsWith(normalizedAllowed + path.sep)) {
        return true;
      }

      return false;
    });

    if (!isAllowed) {
      throw new PluginPermissionError(
        `Filesystem ${operation} denied: Path not in allowed list`,
        'filesystem',
        { filePath, operation, allowedPaths }
      );
    }

    // Check for path traversal attempts
    if (this.isPathTraversal(normalizedPath, allowedPaths.map(p => path.resolve(p)))) {
      throw new PluginPermissionError(
        `Filesystem ${operation} denied: Path traversal detected`,
        'filesystem',
        { filePath, operation }
      );
    }

    return true;
  }

  /**
   * Check if network access is allowed
   *
   * @param urlString - URL to access
   * @param permissions - Plugin network permissions
   * @returns true if allowed
   * @throws PluginPermissionError if denied
   */
  static checkNetworkAccess(
    urlString: string,
    permissions: PluginPermissions
  ): boolean {
    const netPerms = permissions.network;

    // No network permission declared
    if (!netPerms) {
      throw new PluginPermissionError(
        `Network access denied: No network permission declared`,
        'network',
        { url: urlString }
      );
    }

    try {
      const url = new URL(urlString);
      const hostname = url.hostname;
      const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);

      // Check hostname
      const allowedHosts = netPerms.hosts || [];
      if (allowedHosts.length > 0) {
        const isHostAllowed = allowedHosts.some((allowedHost) => {
          // Exact match
          if (hostname === allowedHost) {
            return true;
          }

          // Wildcard subdomain match (e.g., *.example.com)
          if (allowedHost.startsWith('*.')) {
            const baseDomain = allowedHost.slice(2);
            if (hostname.endsWith('.' + baseDomain) || hostname === baseDomain) {
              return true;
            }
          }

          return false;
        });

        if (!isHostAllowed) {
          throw new PluginPermissionError(
            `Network access denied: Host not in allowed list`,
            'network',
            { url: urlString, hostname, allowedHosts }
          );
        }
      }

      // Check port
      const allowedPorts = netPerms.ports || [];
      if (allowedPorts.length > 0 && !allowedPorts.includes(port)) {
        throw new PluginPermissionError(
          `Network access denied: Port not in allowed list`,
          'network',
          { url: urlString, port, allowedPorts }
        );
      }

      return true;
    } catch (error) {
      if (error instanceof PluginPermissionError) {
        throw error;
      }

      throw new PluginPermissionError(
        `Network access denied: Invalid URL`,
        'network',
        { url: urlString, error: (error as Error).message }
      );
    }
  }

  /**
   * Check if process operation is allowed
   *
   * @param operation - Operation type ('spawn' | 'env')
   * @param permissions - Plugin process permissions
   * @param command - Command to spawn (if operation is 'spawn')
   * @returns true if allowed
   * @throws PluginPermissionError if denied
   */
  static checkProcessAccess(
    operation: 'spawn' | 'env',
    permissions: PluginPermissions,
    command?: string
  ): boolean {
    const procPerms = permissions.process;

    // No process permission declared
    if (!procPerms) {
      throw new PluginPermissionError(
        `Process access denied: No process permission declared`,
        'process',
        { operation, command }
      );
    }

    if (operation === 'spawn') {
      if (!procPerms.spawn) {
        throw new PluginPermissionError(
          `Process spawn denied: spawn permission not granted`,
          'process',
          { operation, command }
        );
      }

      // Check if command is in allowed list
      const allowedCommands = procPerms.commands || [];
      if (allowedCommands.length > 0 && command) {
        const commandName = path.basename(command);
        const isAllowed = allowedCommands.some((allowed) => {
          return commandName === allowed || command === allowed;
        });

        if (!isAllowed) {
          throw new PluginPermissionError(
            `Process spawn denied: Command not in allowed list`,
            'process',
            { command, allowedCommands }
          );
        }
      }
    }

    return true;
  }

  /**
   * Check if CLI operation is allowed
   *
   * @param operation - Operation type ('register' | 'modify')
   * @param permissions - Plugin CLI permissions
   * @param commandName - Command name (for register operation)
   * @param coreCommands - List of core command names to prevent override
   * @returns true if allowed
   * @throws PluginPermissionError if denied
   */
  static checkCLIAccess(
    operation: 'register' | 'modify',
    permissions: PluginPermissions,
    commandName?: string,
    coreCommands: string[] = []
  ): boolean {
    const cliPerms = permissions.cli;

    // No CLI permission declared
    if (!cliPerms) {
      throw new PluginPermissionError(
        `CLI access denied: No CLI permission declared`,
        'cli',
        { operation, commandName }
      );
    }

    if (operation === 'register') {
      if (!cliPerms.registerCommands) {
        throw new PluginPermissionError(
          `CLI register denied: registerCommands permission not granted`,
          'cli',
          { operation, commandName }
        );
      }

      // Check if trying to override core command
      if (commandName && coreCommands.includes(commandName)) {
        throw new PluginPermissionError(
          `CLI register denied: Cannot override core command`,
          'cli',
          { commandName, coreCommands }
        );
      }
    } else if (operation === 'modify') {
      if (!cliPerms.modifyRegistry) {
        throw new PluginPermissionError(
          `CLI modify denied: modifyRegistry permission not granted`,
          'cli',
          { operation }
        );
      }
    }

    return true;
  }

  /**
   * Detect path traversal attempts
   *
   * @param targetPath - Normalized target path
   * @param allowedPaths - List of allowed base paths
   * @returns true if traversal detected
   */
  private static isPathTraversal(targetPath: string, allowedPaths: string[]): boolean {
    // Check for .. sequences that escape allowed paths
    const segments = targetPath.split(path.sep);

    // Count directory traversals
    let depth = 0;
    for (const segment of segments) {
      if (segment === '..') {
        depth--;
      } else if (segment && segment !== '.') {
        depth++;
      }

      // If we go negative, we're trying to escape
      if (depth < 0) {
        return true;
      }
    }

    // Additional check: ensure final path is within at least one allowed path
    const isWithinAllowed = allowedPaths.some((allowedPath) => {
      return targetPath.startsWith(allowedPath);
    });

    return !isWithinAllowed;
  }

  /**
   * Validate permission manifest structure
   *
   * @param permissions - Permissions to validate
   * @returns true if valid
   * @throws Error if invalid
   */
  static validatePermissions(permissions: PluginPermissions): boolean {
    if (!permissions || typeof permissions !== 'object') {
      throw new Error('Permissions must be an object');
    }

    // Validate filesystem permissions
    if (permissions.filesystem) {
      const fs = permissions.filesystem;
      if (fs.read && !Array.isArray(fs.read)) {
        throw new Error('filesystem.read must be an array');
      }
      if (fs.write && !Array.isArray(fs.write)) {
        throw new Error('filesystem.write must be an array');
      }
      if (fs.execute && !Array.isArray(fs.execute)) {
        throw new Error('filesystem.execute must be an array');
      }
    }

    // Validate network permissions
    if (permissions.network) {
      const net = permissions.network;
      if (net.hosts && !Array.isArray(net.hosts)) {
        throw new Error('network.hosts must be an array');
      }
      if (net.ports) {
        if (!Array.isArray(net.ports)) {
          throw new Error('network.ports must be an array');
        }
        if (!net.ports.every((p) => typeof p === 'number' && p > 0 && p <= 65535)) {
          throw new Error('network.ports must contain valid port numbers (1-65535)');
        }
      }
    }

    // Validate process permissions
    if (permissions.process) {
      const proc = permissions.process;
      if (proc.spawn !== undefined && typeof proc.spawn !== 'boolean') {
        throw new Error('process.spawn must be a boolean');
      }
      if (proc.commands && !Array.isArray(proc.commands)) {
        throw new Error('process.commands must be an array');
      }
    }

    // Validate CLI permissions
    if (permissions.cli) {
      const cli = permissions.cli;
      if (cli.registerCommands !== undefined && typeof cli.registerCommands !== 'boolean') {
        throw new Error('cli.registerCommands must be a boolean');
      }
      if (cli.modifyRegistry !== undefined && typeof cli.modifyRegistry !== 'boolean') {
        throw new Error('cli.modifyRegistry must be a boolean');
      }
    }

    return true;
  }
}
