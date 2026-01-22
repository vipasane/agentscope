/**
 * Hook Parser Module for AgentScope
 *
 * Parses hook configurations from Claude Code settings.json (schema 2026.01).
 * Provides comprehensive validation, security checks, and error handling.
 *
 * @module scanner/hook-parser
 */

import type { Hook, HookEvent, ScanError } from '../model/types.js';

// ============================================================================
// Types - Claude Code Schema 2026.01
// ============================================================================

/**
 * Hook event types supported by Claude Code (schema 2026.01)
 */
export const VALID_HOOK_EVENTS = [
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

export type ValidHookEvent = typeof VALID_HOOK_EVENTS[number];

/**
 * Hook definition type (command or prompt)
 */
export type HookType = 'command' | 'prompt';

/**
 * Raw hook definition from settings.json
 */
export interface RawHookDefinition {
  type: string;
  command?: string;
  prompt?: string;
  timeout?: number;
  matcher?: string;
  continueOnError?: boolean;
  workingDirectory?: string;
}

/**
 * Raw hook configuration with optional matcher
 */
export interface RawHookConfig {
  matcher?: string;
  hooks: RawHookDefinition[];
}

/**
 * Raw hooks object from settings.json (keyed by event name)
 */
export type RawHooksObject = Record<string, RawHookConfig[]>;

/**
 * Parsed hook with full metadata
 */
export interface ParsedHook extends Hook {
  /** Hook type: command or prompt */
  hookType: HookType;
  /** LLM prompt (if type is 'prompt') */
  prompt?: string;
  /** Tool name matcher pattern */
  matcher?: string;
  /** Continue on error */
  continueOnError: boolean;
}

/**
 * Result of parsing hooks from settings.json
 */
export interface HookParseResult {
  /** Successfully parsed hooks */
  hooks: ParsedHook[];
  /** Validation errors encountered */
  errors: ScanError[];
  /** Security warnings */
  warnings: ScanError[];
}

// ============================================================================
// Security Configuration
// ============================================================================

/**
 * Timeout limits in seconds
 */
export const TIMEOUT_LIMITS = {
  MIN: 1,
  MAX: 300,
  DEFAULT: 30,
} as const;

/**
 * Patterns indicating potential command injection
 */
const COMMAND_INJECTION_PATTERNS = [
  /;\s*rm\s+-rf/i,           // rm -rf after semicolon
  /;\s*dd\s+if=/i,           // dd command
  /`[^`]*`/,                 // Backtick command substitution
  /\$\([^)]+\)/,             // $() command substitution
  />\s*\/dev\//,             // Redirect to /dev/
  /\|\s*sh\b/,               // Pipe to shell
  /\|\s*bash\b/,             // Pipe to bash
  /\|\s*zsh\b/,              // Pipe to zsh
  /&&\s*curl.*\|/i,          // curl piped to something
  /&&\s*wget.*\|/i,          // wget piped to something
  /base64\s+-d.*\|/i,        // Base64 decode piped
  /eval\s+/i,                // eval command
  /exec\s+\d+/,              // exec with fd redirection
  /\/etc\/passwd/,           // Accessing passwd file
  /\/etc\/shadow/,           // Accessing shadow file
  /~\/\.ssh\//,              // Accessing SSH keys
  /\.env\b/,                 // Accessing .env files
  /\bsudo\s+/,               // sudo usage
  /\bchmod\s+777\b/,         // chmod 777
  /\bchown\s+-R\s+/,         // recursive chown
  />\s*~\//,                 // Redirect to home directory
  /;\s*shutdown\b/i,         // shutdown command
  /;\s*reboot\b/i,           // reboot command
  /;\s*halt\b/i,             // halt command
  /mkfs\./i,                 // Format filesystem
  /:(){ :|:& };:/,           // Fork bomb
] as const;

/**
 * Patterns indicating path traversal attempts
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,                  // Parent directory traversal
  /\.\.\\/, // Windows-style traversal
  /\/\.\.\//,                // Embedded traversal
  /%2e%2e%2f/i,              // URL-encoded traversal
  /%252e%252e%252f/i,        // Double URL-encoded
  /\.\.%2f/i,                // Mixed encoding
  /\.\.\%5c/i,               // URL-encoded backslash
] as const;

/**
 * Safe command prefixes (allowlist)
 */
const SAFE_COMMAND_PREFIXES = [
  'echo ',
  'printf ',
  'cat ',
  'ls ',
  'pwd',
  'date',
  'node ',
  'npm ',
  'npx ',
  'pnpm ',
  'yarn ',
  'git ',
  'python ',
  'python3 ',
  'pip ',
  'pip3 ',
  'cargo ',
  'rustc ',
  'go ',
  'deno ',
  'bun ',
  'test ',
  '[[ ',
  '[ ',
] as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a hook event name against the allowed list.
 *
 * @param event - Event name to validate
 * @returns True if event is valid, false otherwise
 */
export function isValidHookEvent(event: string): event is ValidHookEvent {
  return (VALID_HOOK_EVENTS as readonly string[]).includes(event);
}

/**
 * Normalizes a hook event name to its canonical form.
 *
 * @param event - Event name to normalize
 * @returns Normalized event name or null if invalid
 */
export function normalizeHookEvent(event: string): ValidHookEvent | null {
  if (!event || typeof event !== 'string') {
    return null;
  }

  // Direct match (case-sensitive)
  if (isValidHookEvent(event)) {
    return event;
  }

  // Case-insensitive match
  const lowerEvent = event.toLowerCase();
  const found = VALID_HOOK_EVENTS.find(e => e.toLowerCase() === lowerEvent);

  return found ?? null;
}

/**
 * Validates a hook type (command or prompt).
 *
 * @param type - Type string to validate
 * @returns True if type is valid, false otherwise
 */
export function isValidHookType(type: string): type is HookType {
  return type === 'command' || type === 'prompt';
}

/**
 * Validates a timeout value is within acceptable limits.
 *
 * @param timeout - Timeout value in seconds
 * @returns Validated timeout value, or default if invalid
 */
export function validateTimeout(timeout: unknown): number {
  if (typeof timeout !== 'number' || !Number.isFinite(timeout)) {
    return TIMEOUT_LIMITS.DEFAULT;
  }

  if (timeout < TIMEOUT_LIMITS.MIN) {
    return TIMEOUT_LIMITS.MIN;
  }

  if (timeout > TIMEOUT_LIMITS.MAX) {
    return TIMEOUT_LIMITS.MAX;
  }

  return Math.floor(timeout);
}

/**
 * Detects potential command injection patterns in a command string.
 *
 * @param command - Command string to analyze
 * @returns Array of detected pattern descriptions
 */
export function detectCommandInjection(command: string): string[] {
  if (!command || typeof command !== 'string') {
    return [];
  }

  const detected: string[] = [];

  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(command)) {
      detected.push(describePattern(pattern));
    }
  }

  return detected;
}

/**
 * Detects path traversal patterns in a string.
 *
 * @param input - Input string to analyze
 * @returns Array of detected pattern descriptions
 */
export function detectPathTraversal(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const detected: string[] = [];

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      detected.push('Path traversal detected');
      break; // One detection is enough
    }
  }

  return detected;
}

/**
 * Checks if a command uses a known-safe prefix.
 *
 * @param command - Command string to check
 * @returns True if command starts with a safe prefix
 */
export function hasSafeCommandPrefix(command: string): boolean {
  if (!command || typeof command !== 'string') {
    return false;
  }

  const trimmed = command.trim();
  return SAFE_COMMAND_PREFIXES.some(prefix =>
    trimmed.startsWith(prefix) || trimmed === prefix.trim()
  );
}

/**
 * Provides a human-readable description for a regex pattern.
 */
function describePattern(pattern: RegExp): string {
  const patternStr = pattern.toString();

  const descriptions: Record<string, string> = {
    'rm\\s+-rf': 'Destructive rm command',
    'dd\\s+if=': 'dd disk command',
    '`[^`]*`': 'Backtick command substitution',
    '\\$\\([^)]+\\)': 'Command substitution',
    '>\\s*\\/dev\\/': 'Device file redirection',
    '\\|\\s*sh\\b': 'Pipe to shell',
    '\\|\\s*bash\\b': 'Pipe to bash',
    '\\|\\s*zsh\\b': 'Pipe to zsh',
    'curl.*\\|': 'Curl with pipe',
    'wget.*\\|': 'Wget with pipe',
    'base64\\s+-d.*\\|': 'Base64 decode with pipe',
    'eval\\s+': 'Eval command',
    'exec\\s+\\d+': 'Exec with fd redirection',
    '\\/etc\\/passwd': 'Passwd file access',
    '\\/etc\\/shadow': 'Shadow file access',
    '\\.ssh\\/': 'SSH key access',
    '\\.env\\b': 'Environment file access',
    'sudo\\s+': 'Sudo usage',
    'chmod\\s+777': 'Chmod 777',
    'chown\\s+-R': 'Recursive chown',
    '>\\s*~\\/': 'Home directory write',
    'shutdown\\b': 'Shutdown command',
    'reboot\\b': 'Reboot command',
    'halt\\b': 'Halt command',
    'mkfs\\.': 'Filesystem format',
    ':\\(\\)\\{': 'Fork bomb pattern',
  };

  for (const [key, desc] of Object.entries(descriptions)) {
    if (patternStr.includes(key)) {
      return desc;
    }
  }

  return 'Suspicious command pattern';
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitizes a command string for security.
 * Does NOT modify the command - just validates and reports issues.
 *
 * @param command - Command string to sanitize
 * @returns Object with the command and any security issues found
 */
export function sanitizeCommand(command: string): {
  command: string;
  issues: string[];
  safe: boolean;
} {
  const issues: string[] = [];

  if (!command || typeof command !== 'string') {
    return { command: '', issues: ['Empty or invalid command'], safe: false };
  }

  const trimmed = command.trim();

  // Check for injection patterns
  const injectionIssues = detectCommandInjection(trimmed);
  issues.push(...injectionIssues);

  // Check for path traversal
  const traversalIssues = detectPathTraversal(trimmed);
  issues.push(...traversalIssues);

  // Check if command has safe prefix
  const isSafe = hasSafeCommandPrefix(trimmed) && issues.length === 0;

  return {
    command: trimmed,
    issues,
    safe: isSafe,
  };
}

/**
 * Sanitizes a matcher pattern for security.
 *
 * @param matcher - Matcher pattern to sanitize
 * @returns Sanitized matcher or null if invalid
 */
export function sanitizeMatcher(matcher: string | undefined): string | undefined {
  if (!matcher || typeof matcher !== 'string') {
    return undefined;
  }

  const trimmed = matcher.trim();

  // Check for regex injection attempts
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return undefined; // Control characters
  }

  // Check for extremely complex regex (ReDoS)
  if (/(\+\+|\*\*|\{\d+,\d*\}\{)/.test(trimmed)) {
    return undefined; // Nested quantifiers
  }

  // Limit length
  if (trimmed.length > 200) {
    return trimmed.slice(0, 200);
  }

  return trimmed;
}

/**
 * Sanitizes a working directory path.
 *
 * @param workingDir - Working directory to sanitize
 * @returns Sanitized path or undefined if invalid
 */
export function sanitizeWorkingDirectory(workingDir: string | undefined): string | undefined {
  if (!workingDir || typeof workingDir !== 'string') {
    return undefined;
  }

  const trimmed = workingDir.trim();

  // Check for path traversal
  if (detectPathTraversal(trimmed).length > 0) {
    return undefined;
  }

  // Check for dangerous paths
  const dangerousPaths = ['/etc', '/var', '/usr', '/bin', '/sbin', '/root', '/home'];
  if (dangerousPaths.some(p => trimmed === p || trimmed.startsWith(p + '/'))) {
    return undefined;
  }

  return trimmed;
}

// ============================================================================
// Main Parser Class
// ============================================================================

/**
 * Hook Parser for Claude Code settings.json
 *
 * Parses and validates hook configurations from the Claude Code schema 2026.01 format.
 *
 * @example
 * ```typescript
 * const parser = new HookParser(hooksObject, 'settings.json');
 * const result = parser.parse();
 *
 * if (result.errors.length > 0) {
 *   console.log('Errors:', result.errors);
 * }
 *
 * for (const hook of result.hooks) {
 *   console.log(`${hook.event}: ${hook.command || hook.prompt}`);
 * }
 * ```
 */
export class HookParser {
  private hooks: ParsedHook[] = [];
  private errors: ScanError[] = [];
  private warnings: ScanError[] = [];

  /**
   * Creates a new HookParser instance.
   *
   * @param rawHooks - Raw hooks object from settings.json
   * @param sourcePath - Path to the source file (for error reporting)
   */
  constructor(
    private readonly rawHooks: RawHooksObject | RawHookConfig[] | unknown,
    private readonly sourcePath: string
  ) {}

  /**
   * Parses the hooks configuration.
   *
   * @returns Parse result with hooks, errors, and warnings
   */
  parse(): HookParseResult {
    this.hooks = [];
    this.errors = [];
    this.warnings = [];

    if (!this.rawHooks) {
      return this.getResult();
    }

    // Handle different formats
    if (Array.isArray(this.rawHooks)) {
      // Legacy format: array of hook configs
      this.parseLegacyFormat(this.rawHooks);
    } else if (typeof this.rawHooks === 'object') {
      // Schema 2026.01 format: object keyed by event name
      this.parseEventKeyedFormat(this.rawHooks as RawHooksObject);
    } else {
      this.addError('fatal', 'INVALID_HOOKS_FORMAT', 'Hooks must be an object or array');
    }

    return this.getResult();
  }

  /**
   * Parses legacy array format.
   */
  private parseLegacyFormat(configs: unknown[]): void {
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];

      if (!this.isValidHookConfig(config)) {
        this.addError('warning', 'INVALID_HOOK_CONFIG', `Invalid hook config at index ${i}`);
        continue;
      }

      this.parseHookConfig(config, `[${i}]`);
    }
  }

  /**
   * Parses schema 2026.01 event-keyed format.
   */
  private parseEventKeyedFormat(hooksObj: RawHooksObject): void {
    for (const [eventKey, configs] of Object.entries(hooksObj)) {
      // Validate event name
      const normalizedEvent = normalizeHookEvent(eventKey);
      if (!normalizedEvent) {
        this.addError(
          'warning',
          'INVALID_HOOK_EVENT',
          `Invalid hook event: "${eventKey}". Valid events: ${VALID_HOOK_EVENTS.join(', ')}`
        );
        continue;
      }

      if (!Array.isArray(configs)) {
        this.addError(
          'warning',
          'INVALID_EVENT_CONFIG',
          `Hook configs for "${eventKey}" must be an array`
        );
        continue;
      }

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];

        if (!this.isValidHookConfig(config)) {
          this.addError(
            'warning',
            'INVALID_HOOK_CONFIG',
            `Invalid hook config at ${eventKey}[${i}]`
          );
          continue;
        }

        this.parseHookConfig(config, `${eventKey}[${i}]`, normalizedEvent);
      }
    }
  }

  /**
   * Parses a single hook configuration.
   */
  private parseHookConfig(
    config: RawHookConfig,
    location: string,
    eventOverride?: ValidHookEvent
  ): void {
    const globalMatcher = sanitizeMatcher(config.matcher);

    if (!config.hooks || !Array.isArray(config.hooks)) {
      this.addError('warning', 'NO_HOOKS_ARRAY', `No hooks array at ${location}`);
      return;
    }

    for (let i = 0; i < config.hooks.length; i++) {
      const hookDef = config.hooks[i];
      const hookLocation = `${location}.hooks[${i}]`;

      const parsedHook = this.parseHookDefinition(
        hookDef,
        hookLocation,
        globalMatcher,
        eventOverride
      );

      if (parsedHook) {
        this.hooks.push(parsedHook);
      }
    }
  }

  /**
   * Parses a single hook definition.
   */
  private parseHookDefinition(
    hookDef: RawHookDefinition,
    location: string,
    globalMatcher?: string,
    eventOverride?: ValidHookEvent
  ): ParsedHook | null {
    // Validate type
    if (!hookDef.type || !isValidHookType(hookDef.type)) {
      this.addError(
        'warning',
        'INVALID_HOOK_TYPE',
        `Invalid hook type at ${location}: "${hookDef.type}". Must be "command" or "prompt"`
      );
      return null;
    }

    const hookType = hookDef.type as HookType;

    // Validate command/prompt presence based on type
    if (hookType === 'command') {
      if (!hookDef.command || typeof hookDef.command !== 'string') {
        this.addError(
          'warning',
          'MISSING_COMMAND',
          `Command hook at ${location} must have a "command" string`
        );
        return null;
      }

      // Security check for command
      const commandCheck = sanitizeCommand(hookDef.command);
      if (commandCheck.issues.length > 0) {
        for (const issue of commandCheck.issues) {
          this.addWarning(
            'COMMAND_SECURITY',
            `Security warning at ${location}: ${issue}`
          );
        }
      }
    } else if (hookType === 'prompt') {
      if (!hookDef.prompt || typeof hookDef.prompt !== 'string') {
        this.addError(
          'warning',
          'MISSING_PROMPT',
          `Prompt hook at ${location} must have a "prompt" string`
        );
        return null;
      }
    }

    // Validate timeout
    const timeout = validateTimeout(hookDef.timeout);
    if (hookDef.timeout !== undefined && timeout !== hookDef.timeout) {
      this.addWarning(
        'TIMEOUT_ADJUSTED',
        `Timeout at ${location} adjusted from ${hookDef.timeout}s to ${timeout}s (limits: ${TIMEOUT_LIMITS.MIN}-${TIMEOUT_LIMITS.MAX}s)`
      );
    }

    // Sanitize matcher
    const matcher = sanitizeMatcher(hookDef.matcher) ?? globalMatcher;

    // Sanitize working directory
    const workingDirectory = sanitizeWorkingDirectory(hookDef.workingDirectory);
    if (hookDef.workingDirectory && !workingDirectory) {
      this.addWarning(
        'WORKING_DIR_REJECTED',
        `Working directory at ${location} rejected for security reasons`
      );
    }

    // For legacy format, we need to determine the event from the hook type
    // In schema 2026.01 format, eventOverride is provided
    let event: HookEvent;
    if (eventOverride) {
      event = eventOverride as HookEvent;
    } else {
      // Legacy: infer from context (default to PreToolUse for command, PostToolUse for prompt)
      event = hookType === 'command' ? 'PreToolUse' : 'PostToolUse';
      this.addWarning(
        'EVENT_INFERRED',
        `Hook event at ${location} inferred as "${event}" from legacy format`
      );
    }

    return {
      event,
      path: this.sourcePath,
      hookType,
      command: hookType === 'command' ? hookDef.command : undefined,
      prompt: hookType === 'prompt' ? hookDef.prompt : undefined,
      matcher,
      workingDirectory,
      timeout: timeout * 1000, // Convert to milliseconds
      enabled: true,
      continueOnError: hookDef.continueOnError ?? false,
    };
  }

  /**
   * Type guard for RawHookConfig.
   */
  private isValidHookConfig(obj: unknown): obj is RawHookConfig {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const config = obj as Record<string, unknown>;

    // Must have hooks array
    if (!config.hooks || !Array.isArray(config.hooks)) {
      return false;
    }

    // Matcher must be string if present
    if (config.matcher !== undefined && typeof config.matcher !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Adds an error to the collection.
   */
  private addError(
    severity: ScanError['severity'],
    code: string,
    message: string
  ): void {
    this.errors.push({
      severity,
      code,
      message,
      file: this.sourcePath,
    });
  }

  /**
   * Adds a warning to the collection.
   */
  private addWarning(code: string, message: string): void {
    this.warnings.push({
      severity: 'warning',
      code,
      message,
      file: this.sourcePath,
    });
  }

  /**
   * Gets the parse result.
   */
  private getResult(): HookParseResult {
    return {
      hooks: this.hooks,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Parses hooks from a settings.json hooks object.
 *
 * @param hooks - Raw hooks object from settings.json
 * @param sourcePath - Path to the source file
 * @returns Parse result with hooks, errors, and warnings
 *
 * @example
 * ```typescript
 * import { readFile } from 'node:fs/promises';
 *
 * const settings = JSON.parse(await readFile('.claude/settings.json', 'utf-8'));
 * const result = parseHooks(settings.hooks, '.claude/settings.json');
 *
 * console.log(`Parsed ${result.hooks.length} hooks`);
 * console.log(`Errors: ${result.errors.length}`);
 * console.log(`Warnings: ${result.warnings.length}`);
 * ```
 */
export function parseHooks(
  hooks: unknown,
  sourcePath: string
): HookParseResult {
  const parser = new HookParser(hooks, sourcePath);
  return parser.parse();
}

/**
 * Validates a single hook definition without full parsing.
 *
 * @param hookDef - Hook definition to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateHookDefinition(hookDef: RawHookDefinition): string[] {
  const errors: string[] = [];

  if (!hookDef.type) {
    errors.push('Missing required "type" field');
  } else if (!isValidHookType(hookDef.type)) {
    errors.push(`Invalid type "${hookDef.type}". Must be "command" or "prompt"`);
  }

  if (hookDef.type === 'command' && !hookDef.command) {
    errors.push('Command hook must have "command" field');
  }

  if (hookDef.type === 'prompt' && !hookDef.prompt) {
    errors.push('Prompt hook must have "prompt" field');
  }

  if (hookDef.timeout !== undefined) {
    if (typeof hookDef.timeout !== 'number') {
      errors.push('Timeout must be a number');
    } else if (hookDef.timeout < TIMEOUT_LIMITS.MIN || hookDef.timeout > TIMEOUT_LIMITS.MAX) {
      errors.push(`Timeout must be between ${TIMEOUT_LIMITS.MIN} and ${TIMEOUT_LIMITS.MAX} seconds`);
    }
  }

  if (hookDef.command) {
    const issues = detectCommandInjection(hookDef.command);
    if (issues.length > 0) {
      errors.push(`Security: ${issues.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Converts parsed hooks back to the internal Hook model format.
 *
 * @param parsedHooks - Array of parsed hooks
 * @returns Array of Hook objects (internal model)
 */
export function toInternalHooks(parsedHooks: ParsedHook[]): Hook[] {
  return parsedHooks.map(parsed => ({
    event: parsed.event,
    path: parsed.path,
    command: parsed.command,
    workingDirectory: parsed.workingDirectory,
    timeout: parsed.timeout,
    enabled: parsed.enabled,
  }));
}

/**
 * Gets a summary of hook events and their counts.
 *
 * @param hooks - Array of parsed hooks
 * @returns Object mapping event names to counts
 */
export function getHookEventSummary(hooks: ParsedHook[]): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const hook of hooks) {
    summary[hook.event] = (summary[hook.event] || 0) + 1;
  }

  return summary;
}
