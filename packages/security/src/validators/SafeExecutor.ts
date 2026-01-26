/**
 * Safe Command Executor - Prevents command injection attacks
 *
 * Validates and sanitizes shell commands to prevent injection attacks.
 * Provides safe command execution with allowlists and blocklists.
 *
 * Performance: <50ms for command validation
 */

import { CommandValidationOptions } from '../utils/types.js';

export class SafeExecutor {
  private static readonly DANGEROUS_PATTERNS = [
    /[;&`$(){}[\]]/g,         // Shell metacharacters (without | < >)
    /\$\(/g,                  // Command substitution
    /`/g,                     // Backtick command substitution
    /\|\|/g,                  // OR operator
    /&&/g,                    // AND operator
    /\|/g,                    // Pipe
    />/g,                     // Redirect
    /</g,                     // Redirect
    /\n/g,                    // Newlines
    /\r/g                     // Carriage returns
  ];

  private static readonly DANGEROUS_COMMANDS = [
    'rm',
    'rmdir',
    'del',
    'format',
    'mkfs',
    'dd',
    'eval',
    'exec',
    'chmod',
    'chown',
    'sudo',
    'su',
    'curl',
    'wget',
    'nc',
    'netcat',
    'telnet'
  ];

  /**
   * Validate a command before execution
   * @param command - Command to validate
   * @param options - Validation options
   * @returns Validated command
   * @throws Error if command is unsafe
   */
  static validate(command: string, options: CommandValidationOptions = {}): string {
    const {
      allowedCommands = [],
      blockedCommands = this.DANGEROUS_COMMANDS,
      requireShellEscape = true
    } = options;

    // Check for empty command
    if (!command || command.trim().length === 0) {
      throw new Error('Command cannot be empty');
    }

    // Extract base command (first word)
    const baseCommand = command.trim().split(/\s+/)[0];

    // Check allowlist
    if (allowedCommands.length > 0 && !allowedCommands.includes(baseCommand)) {
      throw new Error(`Command not in allowlist: ${baseCommand}`);
    }

    // Check blocklist
    if (blockedCommands.includes(baseCommand)) {
      throw new Error(`Dangerous command blocked: ${baseCommand}`);
    }

    // Check for injection patterns
    if (requireShellEscape && this.containsInjection(command)) {
      throw new Error('Command contains potential injection patterns');
    }

    return command;
  }

  /**
   * Check if command contains injection patterns
   * @param command - Command to check
   * @returns true if injection detected
   */
  static containsInjection(command: string): boolean {
    return this.DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
  }

  /**
   * Escape shell arguments safely
   * @param arg - Argument to escape
   * @returns Escaped argument
   */
  static escapeShellArg(arg: string): string {
    // Wrap in single quotes and escape any single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Build safe command from base command and arguments
   * @param baseCommand - Base command
   * @param args - Command arguments
   * @returns Safe command string
   */
  static buildCommand(baseCommand: string, args: string[]): string {
    const escapedArgs = args.map(arg => this.escapeShellArg(arg));
    return `${baseCommand} ${escapedArgs.join(' ')}`;
  }

  /**
   * Validate array of commands (batch)
   * @param commands - Commands to validate
   * @param options - Validation options
   * @returns Array of validated commands
   */
  static validateBatch(
    commands: string[],
    options: CommandValidationOptions = {}
  ): string[] {
    return commands.map(cmd => this.validate(cmd, options));
  }

  /**
   * Sanitize command by removing dangerous patterns
   * WARNING: This is a last resort. Use validate() instead.
   * @param command - Command to sanitize
   * @returns Sanitized command
   */
  static sanitize(command: string): string {
    let sanitized = command;

    // Remove shell metacharacters
    this.DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }
}
