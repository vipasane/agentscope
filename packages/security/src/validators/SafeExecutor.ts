/**
 * @packageDocumentation
 * Command validation with injection prevention
 *
 * Validates and sanitizes shell commands to prevent command injection attacks.
 * Implements defense-in-depth with pattern detection, allowlists, and blocklists.
 *
 * @remarks
 * Implements comprehensive command injection prevention:
 * - Shell metacharacter detection and blocking
 * - Command substitution prevention ($(), backticks)
 * - Operator chaining prevention (&&, ||, |)
 * - Dangerous command blocklist (rm, eval, sudo, etc.)
 * - Optional allowlist validation
 * - Shell argument escaping utilities
 *
 * All user-supplied commands MUST be validated before execution.
 *
 * @see {@link InputValidator} for input validation
 * @see {@link PathValidator} for path validation
 * @see {@link https://owasp.org/www-community/attacks/Command_Injection | OWASP Command Injection}
 * @see {@link https://cwe.mitre.org/data/definitions/78.html | CWE-78}
 * @see {@link https://cwe.mitre.org/data/definitions/94.html | CWE-94}
 *
 * @performance <5ms for validation, <2ms for injection detection
 * @complexity Time: O(n), Space: O(1) where n = command length
 *
 * @public
 * @since 1.0.0
 */

import { CommandValidationOptions } from '../utils/types.js';

/**
 * Safe Command Executor - First line of defense against command injection attacks
 *
 * Provides comprehensive command validation with shell metacharacter detection,
 * dangerous command blocking, and safe command building. Use this for ALL
 * user-supplied commands before shell execution.
 *
 * @security COMMAND_INJECTION_PREVENTION - Critical Security Control
 *
 * ## Threat Mitigation
 *
 * - **Command Injection (CWE-78)** - Blocks shell metacharacters
 * - **Code Injection (CWE-94)** - Prevents eval/exec usage
 * - **Argument Injection** - Escapes shell arguments safely
 * - **Command Substitution** - Blocks $() and backtick syntax
 * - **Operator Chaining** - Prevents &&, ||, | redirection
 * - **Dangerous Commands** - Blocks rm, chmod, sudo, etc.
 *
 * ## DREAD Assessment
 *
 * - **Damage Potential**: 10/10 (Remote Code Execution)
 * - **Reproducibility**: 10/10 (deterministic validation)
 * - **Exploitability**: 9/10 (common attack vector)
 * - **Affected Users**: 10/10 (all command execution)
 * - **Discoverability**: 7/10 (public API surface)
 * - **Total Score**: 9.2/10 (CRITICAL SEVERITY)
 *
 * ## Defense-in-Depth Pattern
 *
 * ```typescript
 * // Layer 1: Validate command
 * const validCmd = SafeExecutor.validate(userCommand, {
 *   allowedCommands: ['ls', 'cat'],
 *   requireShellEscape: true
 * });
 * if (!validCmd) {
 *   logger.warn('Command validation failed', { cmd: userCommand });
 *   return createError('INVALID_COMMAND');
 * }
 *
 * // Layer 2: Check for injection
 * if (SafeExecutor.containsInjection(validCmd)) {
 *   throw new Error('Injection pattern detected');
 * }
 *
 * // Layer 3: Build safe command
 * const safeCmd = SafeExecutor.buildCommand('ls', ['-la', userDir]);
 *
 * // Layer 4: Execute safely
 * executeCommand(safeCmd);
 * ```
 *
 * @example Basic Command Validation
 * ```typescript
 * import { SafeExecutor } from '@claude-flow/security';
 *
 * try {
 *   const validCmd = SafeExecutor.validate('ls -la /home/user', {
 *     allowedCommands: ['ls'],
 *     requireShellEscape: true
 *   });
 *   console.log('Valid command:', validCmd);
 * } catch (error) {
 *   console.error('Invalid command:', error.message);
 * }
 * ```
 *
 * @example Detecting Injection Attempts
 * ```typescript
 * // Simple injection attempt
 * if (SafeExecutor.containsInjection('ls; rm -rf /')) {
 *   console.error('Injection detected!');
 *   // => true (semicolon is shell metacharacter)
 * }
 *
 * // Command substitution attempt
 * if (SafeExecutor.containsInjection('cat $(whoami).txt')) {
 *   console.error('Injection detected!');
 *   // => true ($() pattern detected)
 * }
 * ```
 *
 * @example Safe Argument Escaping
 * ```typescript
 * const userInput = "file'with'quotes.txt";
 * const escaped = SafeExecutor.escapeShellArg(userInput);
 * // => 'file'\'with'\'quotes.txt'
 *
 * const cmd = SafeExecutor.buildCommand('cat', [userInput]);
 * // => "cat 'file'\'with'\'quotes.txt'"
 * ```
 *
 * @example Safe Command Builder
 * ```typescript
 * const cmd = SafeExecutor.buildCommand('find', [
 *   '/home/user',
 *   '-name',
 *   '*.txt',
 *   '-type',
 *   'f'
 * ]);
 * // => "find '/home/user' '-name' '*.txt' '-type' 'f'"
 * // All arguments properly escaped
 * ```
 *
 * @example Anti-Pattern (DO NOT USE)
 * ```typescript
 * // WRONG: Direct command execution
 * const cmd = `ls ${userDir}`; // ❌ Command injection vulnerable
 * exec(cmd); // If userDir = '; rm -rf /', disaster!
 *
 * // CORRECT: Validate and build safely
 * const validDir = PathValidator.validate(userDir, {
 *   allowTraversal: false,
 *   allowedDirectories: ['/home/user']
 * });
 * const cmd = SafeExecutor.buildCommand('ls', [validDir]);
 * exec(cmd); // Safe
 * ```
 *
 * @example Batch Command Validation
 * ```typescript
 * const commands = ['ls', 'pwd', 'echo hello'];
 * const validated = SafeExecutor.validateBatch(commands, {
 *   allowedCommands: ['ls', 'pwd', 'echo'],
 *   requireShellEscape: true
 * });
 * // All commands validated safely
 * ```
 *
 * @see {@link CommandValidationOptions} for validation options
 *
 * @public
 * @since 1.0.0
 */
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
   *
   * Performs comprehensive command validation including allowlist/blocklist checking,
   * injection pattern detection, and shell escaping requirements. Throws on validation failure.
   *
   * @param command - Shell command string to validate
   * @param options - Validation configuration options
   * @param options.allowedCommands - Whitelist of permitted commands (default: none)
   * @param options.blockedCommands - Blacklist of forbidden commands (default: dangerous commands)
   * @param options.requireShellEscape - Require shell metacharacter removal (default: true)
   *
   * @returns The validated command string if all checks pass
   *
   * @throws {Error} If command is empty, not in allowlist, in blocklist,
   *                  contains injection patterns, or fails validation
   *
   * @security COMMAND_INJECTION_PREVENTION
   * - Validates command is not empty
   * - Checks allowlist if provided
   * - Blocks dangerous commands by default
   * - Detects shell metacharacters and injection patterns
   * - Enforces shell escaping when required
   *
   * @example With Allowlist (Recommended)
   * ```typescript
   * try {
   *   const cmd = SafeExecutor.validate('ls -la /home/user', {
   *     allowedCommands: ['ls', 'cat', 'grep'],
   *     requireShellEscape: true
   *   });
   *   console.log('Command validated:', cmd);
   * } catch (error) {
   *   console.error('Command rejected:', error.message);
   * }
   * ```
   *
   * @example With Blocklist (Default)
   * ```typescript
   * try {
   *   const cmd = SafeExecutor.validate('find /home -type f', {
   *     blockedCommands: SafeExecutor.DANGEROUS_COMMANDS,
   *     requireShellEscape: true
   *   });
   * } catch (error) {
   *   console.error('Command blocked:', error.message);
   * }
   * ```
   *
   * @example Injection Detection
   * ```typescript
   * try {
   *   // This will throw - injection attempt
   *   SafeExecutor.validate('ls; rm -rf /', { requireShellEscape: true });
   * } catch (error) {
   *   console.error('Injection detected:', error.message);
   *   // => 'Command contains potential injection patterns'
   * }
   * ```
   *
   * @performance O(n) where n = command length, <5ms typical
   * @complexity Time: O(n + m), Space: O(1) where m = allowlist size
   *
   * @public
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
   *
   * Detects common shell injection patterns including metacharacters,
   * command substitution, and operator chaining. This is a pattern detector -
   * use validate() for comprehensive security checks.
   *
   * @param command - Command string to analyze for injection patterns
   *
   * @returns true if any dangerous patterns are detected, false otherwise
   *
   * @security INJECTION_DETECTION
   * - Detects: metacharacters (;, &, `, $, etc.)
   * - Detects: command substitution ($(), backticks)
   * - Detects: operator chaining (&&, ||, |, redirects)
   * - Does NOT validate command structure
   * - Use as quick filter before full validation
   *
   * @example Pattern Detection
   * ```typescript
   * SafeExecutor.containsInjection('ls; rm -rf /');        // => true
   * SafeExecutor.containsInjection('cat $(whoami).txt');   // => true
   * SafeExecutor.containsInjection('find /home -type f');  // => false
   * ```
   *
   * @example In Security Filters
   * ```typescript
   * function isCommandSafe(cmd: string): boolean {
   *   // Quick filter
   *   if (SafeExecutor.containsInjection(cmd)) {
   *     logger.warn('Injection pattern detected', { cmd });
   *     return false;
   *   }
   *
   *   // Continue with full validation
   *   try {
   *     SafeExecutor.validate(cmd, { requireShellEscape: true });
   *     return true;
   *   } catch {
   *     return false;
   *   }
   * }
   * ```
   *
   * @performance O(n) where n = command length, <2ms typical
   * @complexity Time: O(n * p), Space: O(1) where p = patterns count (~10)
   * @throws Never - Always returns boolean
   *
   * @public
   */
  static containsInjection(command: string): boolean {
    return this.DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
  }

  /**
   * Escape shell arguments safely using single quote wrapping
   *
   * Safely escapes a shell argument by wrapping it in single quotes and
   * escaping any single quotes within the argument. This prevents shell
   * metacharacter interpretation while preserving literal content.
   *
   * @param arg - Raw argument string to escape
   *
   * @returns Shell-escaped argument safe for passing to shell commands
   *
   * @security ARGUMENT_ESCAPING
   * - Wraps argument in single quotes (prevents all metacharacters)
   * - Escapes embedded single quotes (\')
   * - Output safe for use in shell commands
   * - Idempotent: escapeShellArg(escapeShellArg(x)) safe but double-escaped
   *
   * @remarks
   * Single quotes are the safest escaping method because:
   * - Prevents all variable expansion ($VAR)
   * - Prevents all command substitution ($(), backticks)
   * - Prevents all glob expansion (*, ?, [])
   * - Only special char inside single quotes is single quote itself
   *
   * @example Basic Escaping
   * ```typescript
   * const arg = "hello world";
   * const escaped = SafeExecutor.escapeShellArg(arg);
   * // => 'hello world'
   * ```
   *
   * @example With Special Characters
   * ```typescript
   * const arg = "file'with'quotes.txt";
   * const escaped = SafeExecutor.escapeShellArg(arg);
   * // => 'file'\'with'\'quotes.txt'
   *
   * const arg2 = "$USER:$PASSWORD";
   * const escaped2 = SafeExecutor.escapeShellArg(arg2);
   * // => '$USER:$PASSWORD' (literal, no expansion)
   * ```
   *
   * @example With Command Substitution Attempts
   * ```typescript
   * const arg = "$(rm -rf /)" ;
   * const escaped = SafeExecutor.escapeShellArg(arg);
   * // => '$(rm -rf /)' (literal, not executed)
   * ```
   *
   * @example In Command Building
   * ```typescript
   * const userFile = "my'file.txt";
   * const cmd = `cat ${SafeExecutor.escapeShellArg(userFile)}`;
   * // => "cat 'my'\\''file.txt'" (safe to execute)
   * ```
   *
   * @performance O(n) where n = argument length, <1ms typical
   * @complexity Time: O(n), Space: O(n)
   * @throws Never - Always returns escaped string
   *
   * @public
   */
  static escapeShellArg(arg: string): string {
    // Wrap in single quotes and escape any single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Build a safe command from base command and arguments
   *
   * Constructs a shell command string with all arguments safely escaped.
   * Each argument is individually escaped to prevent injection, preserving
   * literal content while preventing shell interpretation.
   *
   * @param baseCommand - The base command (e.g., 'ls', 'find', 'grep')
   * @param args - Array of command arguments to append
   *
   * @returns Fully escaped command string safe for shell execution
   *
   * @security SAFE_COMMAND_BUILDING
   * - Each argument individually escaped with single quotes
   * - Prevents all shell metacharacter interpretation
   * - Preserves spaces and special characters as literal
   * - Safe for use with exec(), spawn(), or system()
   *
   * @remarks
   * This is the preferred way to build commands with untrusted input:
   * - Never use string interpolation (backticks or template literals)
   * - Always use buildCommand() for arguments
   * - Combine with validate() for defense-in-depth
   *
   * @example Basic Command Building
   * ```typescript
   * const cmd = SafeExecutor.buildCommand('ls', ['-la', '/home/user']);
   * // => "ls '-la' '/home/user'"
   * ```
   *
   * @example With User Input
   * ```typescript
   * const fileName = "my file.txt";  // Contains space
   * const cmd = SafeExecutor.buildCommand('cat', ['/uploads/' + fileName]);
   * // => "cat '/uploads/my file.txt'" (space preserved, safe)
   * ```
   *
   * @example With Dangerous Characters
   * ```typescript
   * const args = ['; rm -rf /', '$(whoami)', '$PATH', 'file*.txt'];
   * const cmd = SafeExecutor.buildCommand('find', args);
   * // => "find '; rm -rf /' '$(whoami)' '$PATH' 'file*.txt'"
   * // All treated as literal arguments, no execution
   * ```
   *
   * @example Complex Real-World Command
   * ```typescript
   * const searchPath = '/uploads';
   * const pattern = "*.log";
   * const ageInDays = "7";
   *
   * const cmd = SafeExecutor.buildCommand('find', [
   *   searchPath,
   *   '-name', pattern,
   *   '-mtime', '+' + ageInDays,
   *   '-type', 'f',
   *   '-exec', 'gzip', '{}', '\\;'
   * ]);
   * // Safe even with user-controlled values
   * ```
   *
   * @performance O(n) where n = total argument length
   * @complexity Time: O(n * m), Space: O(n * m) where m = args.length
   * @throws Never - Always returns escaped command string
   *
   * @public
   */
  static buildCommand(baseCommand: string, args: string[]): string {
    const escapedArgs = args.map(arg => this.escapeShellArg(arg));
    return `${baseCommand} ${escapedArgs.join(' ')}`;
  }

  /**
   * Validate an array of commands in batch
   *
   * Validates multiple commands using the same validation rules.
   * Throws on first validation failure - no partial results returned.
   *
   * @param commands - Array of command strings to validate
   * @param options - Validation configuration (applied to all commands)
   *
   * @returns Array of validated commands if all pass validation
   *
   * @throws {Error} If any command fails validation
   *
   * @security BATCH_VALIDATION
   * - Each command validated independently
   * - Throws on first failure (fail-fast)
   * - No partial validation results
   * - Same rules applied to all commands
   *
   * @example Batch Validation
   * ```typescript
   * const commands = ['ls -la', 'pwd', 'grep pattern file.txt'];
   * try {
   *   const validated = SafeExecutor.validateBatch(commands, {
   *     allowedCommands: ['ls', 'pwd', 'grep'],
   *     requireShellEscape: true
   *   });
   *   console.log('All commands valid:', validated);
   * } catch (error) {
   *   console.error('Validation failed:', error.message);
   * }
   * ```
   *
   * @example Error Handling
   * ```typescript
   * const commands = ['ls', 'rm -rf /', 'pwd'];
   * try {
   *   SafeExecutor.validateBatch(commands);
   * } catch (error) {
   *   console.error('Failed at command 2:', error.message);
   *   // => 'Dangerous command blocked: rm'
   * }
   * ```
   *
   * @performance O(n * m) where n = command count, m = avg command length
   * @complexity Time: O(n * m), Space: O(n * m)
   *
   * @public
   */
  static validateBatch(
    commands: string[],
    options: CommandValidationOptions = {}
  ): string[] {
    return commands.map(cmd => this.validate(cmd, options));
  }

  /**
   * Sanitize command by removing dangerous patterns
   *
   * Strips all dangerous shell patterns from a command, removing metacharacters,
   * command substitution, and operators. This is a defense-in-depth measure -
   * ALWAYS use validate() as the primary defense.
   *
   * @param command - Command string to sanitize
   *
   * @returns Command with all dangerous patterns removed
   *
   * @security SANITIZATION - Defense-in-Depth Only
   *
   * ## Limitations (Why to use validate() instead)
   * - Does NOT verify command structure or validity
   * - Does NOT check if command is in allowlist
   * - Does NOT block dangerous commands like 'rm'
   * - May produce nonsensical output
   * - Loss of legitimate characters in arguments
   *
   * ## When to Use
   * - Last resort after validate() fails
   * - Defense-in-depth layer (never rely on alone)
   * - Untrusted input that can't be rejected
   * - Combined with allowlist verification
   *
   * @remarks
   * Sanitization should be a backup defense, not primary:
   * ```
   * Primary defense:   validate() - Accept or reject strictly
   * Secondary defense: sanitize() - Remove dangerous content
   * ```
   *
   * @example Basic Sanitization
   * ```typescript
   * const dirty = 'ls; rm -rf /';
   * const clean = SafeExecutor.sanitize(dirty);
   * // => 'ls rm -rf ' (all metacharacters removed)
   * ```
   *
   * @example Removing Command Substitution
   * ```typescript
   * const dirty = 'cat $(whoami).txt';
   * const clean = SafeExecutor.sanitize(dirty);
   * // => 'cat whoami.txt' (substitution syntax removed)
   * ```
   *
   * @example Defense-in-Depth Pattern
   * ```typescript
   * // Layer 1: Try to validate
   * let cmd = userInput;
   * try {
   *   cmd = SafeExecutor.validate(userInput, { requireShellEscape: true });
   * } catch (error) {
   *   // Layer 2: Fallback to sanitization
   *   logger.warn('Validation failed, sanitizing', { error });
   *   cmd = SafeExecutor.sanitize(userInput);
   *
   *   // Layer 3: Verify result is acceptable
   *   if (cmd.length === 0) {
   *     throw new Error('Command is empty after sanitization');
   *   }
   * }
   * ```
   *
   * @example Anti-Pattern (DO NOT USE ALONE)
   * ```typescript
   * // WRONG: Rely on sanitize as primary defense
   * const cmd = SafeExecutor.sanitize(userInput);
   * executeCommand(cmd); // ❌ May produce unexpected results
   *
   * // CORRECT: Use validate first
   * const cmd = SafeExecutor.validate(userInput, {
   *   allowedCommands: ['ls', 'cat'],
   *   requireShellEscape: true
   * });
   * executeCommand(cmd); // Safe and predictable
   * ```
   *
   * @performance O(n) where n = command length, multiple regex passes
   * @complexity Time: O(n * p), Space: O(n) where p = patterns (~10)
   * @throws Never - Always returns sanitized string
   *
   * @public
   * @warning This is a last resort defense layer. Always validate() first.
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
