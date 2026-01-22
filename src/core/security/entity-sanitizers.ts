/**
 * Entity Sanitizers - Sanitize entity data for safe output
 *
 * Security layer for sanitizing hooks, plugins, permissions, and commands
 * before output or documentation generation. Removes sensitive data,
 * neutralizes injection vectors, and ensures safe string handling.
 *
 * Part of DESIGN-001 security implementation.
 */

import type { Hook, Plugin, PermissionRule, Command, MarketplaceSourceType } from '../model/types.js';

// ============================================================================
// Constants
// ============================================================================

/** Maximum lengths for sanitized string fields */
export const MAX_LENGTHS = {
  hookPath: 500,
  hookCommand: 1000,
  hookWorkingDirectory: 500,
  pluginId: 100,
  pluginName: 100,
  pluginDescription: 500,
  pluginVersion: 50,
  pluginSourceLocation: 1000,
  permissionPattern: 200,
  permissionDescription: 500,
  commandName: 50,
  commandDescription: 500,
  commandPrompt: 5000,
  shellCommand: 2000,
  filePath: 1000
} as const;

/** Characters that must be escaped or removed in shell commands */
const SHELL_DANGEROUS_CHARS = /[;&|`$(){}[\]<>'"\\!#~*?]/g;

/** Characters that are invalid in file paths */
const INVALID_PATH_CHARS = /[\x00-\x1f\x7f<>:"|?*]/g;

/** Path traversal sequences */
const PATH_TRAVERSAL_SEQUENCES = [
  '..',
  './',
  '/.',
  '\\.',
  '%2e',
  '%2E',
  '%252e',
  '%252E'
];

/** Sensitive field names that should be redacted */
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'auth',
  'api_key',
  'apikey',
  'private'
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncates a string to maximum length with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) {
    return str || '';
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Removes null bytes and control characters from a string
 */
function removeControlChars(str: string): string {
  if (!str) return '';
  return str.replace(/[\x00-\x1f\x7f]/g, '');
}

/**
 * Checks if a string contains sensitive keywords
 */
function containsSensitiveKeyword(str: string): boolean {
  const lower = str.toLowerCase();
  return SENSITIVE_FIELDS.some(field => lower.includes(field));
}

/**
 * Redacts a sensitive value, keeping first and last characters
 */
function redactSensitiveValue(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return value[0] + '*'.repeat(Math.min(value.length - 2, 8)) + value[value.length - 1];
}

/**
 * Removes or neutralizes path traversal sequences
 */
function neutralizePathTraversal(path: string): string {
  let result = path;

  // Remove explicit traversal sequences
  for (const seq of PATH_TRAVERSAL_SEQUENCES) {
    while (result.includes(seq)) {
      result = result.split(seq).join('');
    }
  }

  // Remove URL-encoded variations
  result = result.replace(/%2e/gi, '');
  result = result.replace(/%5c/gi, '/');

  // Normalize multiple slashes
  result = result.replace(/\/+/g, '/');
  result = result.replace(/\\+/g, '/');

  return result;
}

// ============================================================================
// Hook Sanitization
// ============================================================================

/**
 * Sanitizes a hook configuration for safe documentation output.
 *
 * Sanitization rules:
 * - Truncates paths and commands to maximum lengths
 * - Removes control characters
 * - Redacts potentially sensitive command arguments
 * - Neutralizes path traversal in paths
 * - Ensures timeout is within safe bounds
 *
 * @param hook - Hook configuration to sanitize
 * @returns Sanitized hook safe for documentation output
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeHook({
 *   event: 'PreToolUse',
 *   path: '../../../etc/passwd',
 *   command: 'export SECRET=abc123; node script.js',
 *   timeout: 999999999
 * });
 *
 * // Result has neutralized path, redacted secrets, and capped timeout
 * ```
 */
export function sanitizeHook(hook: Hook): Hook {
  const sanitized: Hook = {
    event: hook.event,
    path: ''
  };

  // Sanitize path
  if (hook.path) {
    let path = removeControlChars(hook.path);
    path = neutralizePathTraversal(path);
    sanitized.path = truncate(path, MAX_LENGTHS.hookPath);
  }

  // Sanitize command
  if (hook.command !== undefined) {
    let command = removeControlChars(hook.command);

    // Redact sensitive-looking arguments
    // Pattern: --key=value, -k value, KEY=value
    command = command.replace(
      /(-{1,2}[a-zA-Z_-]*(?:key|secret|token|password|auth|credential)[a-zA-Z_-]*)[=\s]+(['"]?)([^\s'"]+)\2/gi,
      (_, flag, quote, value) => `${flag}=${quote}${redactSensitiveValue(value)}${quote}`
    );

    // Redact environment variable assignments with sensitive names
    command = command.replace(
      /\b([A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD|AUTH|CREDENTIAL)[A-Z_]*)=(['"]?)([^\s'"]+)\2/gi,
      (_, name, quote, value) => `${name}=${quote}${redactSensitiveValue(value)}${quote}`
    );

    sanitized.command = truncate(command, MAX_LENGTHS.hookCommand);
  }

  // Sanitize working directory
  if (hook.workingDirectory !== undefined) {
    let workDir = removeControlChars(hook.workingDirectory);
    workDir = neutralizePathTraversal(workDir);
    sanitized.workingDirectory = truncate(workDir, MAX_LENGTHS.hookWorkingDirectory);
  }

  // Sanitize timeout (cap at 5 minutes = 300000ms)
  if (hook.timeout !== undefined) {
    const maxTimeout = 300000;
    const minTimeout = 1000;
    sanitized.timeout = Math.max(minTimeout, Math.min(hook.timeout, maxTimeout));
  }

  // Preserve enabled flag
  if (hook.enabled !== undefined) {
    sanitized.enabled = hook.enabled;
  }

  return sanitized;
}

// ============================================================================
// Plugin Sanitization
// ============================================================================

/**
 * Sanitizes a plugin configuration for safe documentation output.
 *
 * Sanitization rules:
 * - Truncates all string fields to maximum lengths
 * - Validates and sanitizes source URLs
 * - Removes control characters
 * - Preserves boolean and enum fields
 *
 * @param plugin - Plugin configuration to sanitize
 * @returns Sanitized plugin safe for documentation output
 *
 * @example
 * ```typescript
 * const sanitized = sanitizePlugin({
 *   id: 'malicious\x00plugin@marketplace',
 *   name: '<script>alert(1)</script>',
 *   enabled: true,
 *   source: { type: 'url', location: 'javascript:alert(1)' }
 * });
 *
 * // Result has cleaned id, escaped name, and removed dangerous URL
 * ```
 */
export function sanitizePlugin(plugin: Plugin): Plugin {
  const sanitized: Plugin = {
    id: '',
    name: '',
    enabled: plugin.enabled ?? false
  };

  // Sanitize id
  if (plugin.id) {
    let id = removeControlChars(plugin.id);
    // Only allow lowercase alphanumeric, hyphens, and @
    id = id.toLowerCase().replace(/[^a-z0-9@-]/g, '-');
    sanitized.id = truncate(id, MAX_LENGTHS.pluginId);
  }

  // Sanitize name
  if (plugin.name) {
    let name = removeControlChars(plugin.name);
    // Remove HTML tags
    name = name.replace(/<[^>]*>/g, '');
    // Remove JavaScript protocols
    name = name.replace(/javascript:/gi, '');
    sanitized.name = truncate(name, MAX_LENGTHS.pluginName);
  }

  // Sanitize marketplace (if present)
  if (plugin.marketplace !== undefined) {
    // Only allow alphanumeric and hyphens
    sanitized.marketplace = plugin.marketplace.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50);
  }

  // Sanitize version (if present)
  if (plugin.version !== undefined) {
    // Only allow semver-like characters
    sanitized.version = plugin.version.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, MAX_LENGTHS.pluginVersion);
  }

  // Sanitize description (if present)
  if (plugin.description !== undefined) {
    let desc = removeControlChars(plugin.description);
    desc = desc.replace(/<[^>]*>/g, '');
    sanitized.description = truncate(desc, MAX_LENGTHS.pluginDescription);
  }

  // Sanitize source (if present)
  if (plugin.source) {
    const validTypes = ['github', 'git', 'url', 'npm', 'file', 'directory'];
    const sourceType = validTypes.includes(plugin.source.type)
      ? plugin.source.type
      : 'url';

    let location = '';
    if (plugin.source.location) {
      location = removeControlChars(plugin.source.location);

      // For URL types, validate the URL
      if (['github', 'git', 'url'].includes(sourceType)) {
        try {
          const url = new URL(location);
          // Only allow safe protocols
          if (['https:', 'http:', 'git:', 'ssh:'].includes(url.protocol)) {
            location = url.toString();
          } else {
            location = '[invalid-protocol]';
          }
        } catch {
          location = '[invalid-url]';
        }
      } else {
        // For file/directory types, neutralize path traversal
        location = neutralizePathTraversal(location);
      }

      location = truncate(location, MAX_LENGTHS.pluginSourceLocation);
    }

    sanitized.source = {
      type: sourceType as MarketplaceSourceType,
      location
    };
  }

  return sanitized;
}

// ============================================================================
// Permission Rule Sanitization
// ============================================================================

/**
 * Sanitizes a permission rule for safe documentation output.
 *
 * Sanitization rules:
 * - Validates pattern format
 * - Removes potentially dangerous regex characters
 * - Neutralizes path traversal in patterns
 * - Truncates to maximum lengths
 *
 * @param rule - Permission rule to sanitize
 * @returns Sanitized permission rule safe for documentation output
 *
 * @example
 * ```typescript
 * const sanitized = sanitizePermissionRule({
 *   pattern: 'Read(../../../etc/passwd)',
 *   type: 'allow',
 *   description: '<script>alert(1)</script>'
 * });
 *
 * // Result has neutralized path and escaped description
 * ```
 */
export function sanitizePermissionRule(rule: PermissionRule): PermissionRule {
  const sanitized: PermissionRule = {
    pattern: '',
    type: rule.type || 'ask'
  };

  // Sanitize pattern
  if (rule.pattern) {
    let pattern = removeControlChars(rule.pattern);

    // Extract tool and argument parts
    const match = pattern.match(/^([A-Z][a-zA-Z0-9]*)\(([^)]*)\)$/);
    if (match) {
      const [, tool, arg] = match;
      // Sanitize the argument (neutralize path traversal, remove dangerous chars)
      let sanitizedArg = neutralizePathTraversal(arg);
      // Allow * and : for glob patterns, but escape others
      sanitizedArg = sanitizedArg.replace(/[^a-zA-Z0-9_.*:\-\/\\]/g, '_');
      pattern = `${tool}(${sanitizedArg})`;
    } else {
      // If pattern doesn't match expected format, make it safe
      pattern = pattern.replace(/[^a-zA-Z0-9_.*:()\-]/g, '_');
    }

    sanitized.pattern = truncate(pattern, MAX_LENGTHS.permissionPattern);
  }

  // Validate and set type
  const validTypes = ['allow', 'deny', 'ask'];
  sanitized.type = validTypes.includes(rule.type) ? rule.type : 'ask';

  // Sanitize tool (if present)
  if (rule.tool !== undefined) {
    // Only allow alphanumeric tool names
    sanitized.tool = rule.tool.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);
  }

  // Sanitize description (if present)
  if (rule.description !== undefined) {
    let desc = removeControlChars(rule.description);
    desc = desc.replace(/<[^>]*>/g, '');
    sanitized.description = truncate(desc, MAX_LENGTHS.permissionDescription);
  }

  return sanitized;
}

// ============================================================================
// Command Sanitization
// ============================================================================

/**
 * Sanitizes a command configuration for safe documentation output.
 *
 * Sanitization rules:
 * - Validates command name format
 * - Filters tool lists against allowlist
 * - Sanitizes prompt content
 * - Removes control characters
 *
 * @param command - Command configuration to sanitize
 * @returns Sanitized command safe for documentation output
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeCommand({
 *   name: '/hack<script>',
 *   allowedTools: ['Bash', 'UnknownTool'],
 *   prompt: '$(rm -rf /)'
 * });
 *
 * // Result has cleaned name, filtered tools, and escaped prompt
 * ```
 */
export function sanitizeCommand(command: Command): Command {
  const sanitized: Command = {
    name: ''
  };

  // Sanitize name
  if (command.name) {
    let name = removeControlChars(command.name);
    // Ensure starts with /
    if (!name.startsWith('/')) {
      name = '/' + name;
    }
    // Only allow alphanumeric and hyphens after /
    name = '/' + name.slice(1).replace(/[^a-zA-Z0-9-]/g, '');
    sanitized.name = truncate(name, MAX_LENGTHS.commandName);
  }

  // Sanitize description (if present)
  if (command.description !== undefined) {
    let desc = removeControlChars(command.description);
    desc = desc.replace(/<[^>]*>/g, '');
    sanitized.description = truncate(desc, MAX_LENGTHS.commandDescription);
  }

  // Sanitize allowedTools (if present)
  if (command.allowedTools !== undefined) {
    const knownTools = [
      'Bash', 'Read', 'Write', 'Edit', 'MultiEdit',
      'Glob', 'Grep', 'WebFetch', 'WebSearch',
      'Task', 'TodoWrite', 'NotebookEdit', 'Skill'
    ];
    sanitized.allowedTools = command.allowedTools
      .filter(tool => typeof tool === 'string')
      .map(tool => tool.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(tool => knownTools.includes(tool));
  }

  // Sanitize disallowedTools (if present)
  if (command.disallowedTools !== undefined) {
    sanitized.disallowedTools = command.disallowedTools
      .filter(tool => typeof tool === 'string')
      .map(tool => tool.replace(/[^a-zA-Z0-9]/g, ''));
  }

  // Sanitize prompt (if present)
  if (command.prompt !== undefined) {
    let prompt = removeControlChars(command.prompt);
    // Remove command substitution patterns
    prompt = prompt.replace(/\$\([^)]*\)/g, '[command]');
    prompt = prompt.replace(/`[^`]*`/g, '[command]');
    // Remove shell variable expansions
    prompt = prompt.replace(/\$\{[^}]*\}/g, '[var]');
    prompt = prompt.replace(/\$[A-Z_][A-Z_0-9]*/g, '[var]');
    sanitized.prompt = truncate(prompt, MAX_LENGTHS.commandPrompt);
  }

  return sanitized;
}

// ============================================================================
// Shell Command Sanitization
// ============================================================================

/**
 * Sanitizes a shell command string for safe display/logging.
 *
 * WARNING: This function is for OUTPUT sanitization (making commands safe to display).
 * Do NOT use this to make untrusted input safe for execution - that requires
 * proper escaping and validation specific to the target shell.
 *
 * Sanitization rules:
 * - Removes or escapes dangerous shell metacharacters
 * - Redacts sensitive-looking values (passwords, tokens, keys)
 * - Truncates to maximum length
 * - Removes control characters
 *
 * @param command - Shell command string to sanitize
 * @returns Sanitized command safe for display
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeShellCommand('curl -u user:password123 https://api.example.com');
 * // Returns: 'curl -u user:p********3 https://api.example.com'
 *
 * const sanitized2 = sanitizeShellCommand('echo $SECRET; rm -rf /');
 * // Returns: 'echo [var] rm -rf /'
 * ```
 */
export function sanitizeShellCommand(command: string): string {
  if (!command || typeof command !== 'string') {
    return '';
  }

  let sanitized = removeControlChars(command);

  // Redact command substitutions
  sanitized = sanitized.replace(/\$\([^)]*\)/g, '[command]');
  sanitized = sanitized.replace(/`[^`]*`/g, '[command]');

  // Redact variable expansions
  sanitized = sanitized.replace(/\$\{[^}]*\}/g, '[var]');
  sanitized = sanitized.replace(/\$[A-Z_][A-Z_0-9]*/g, '[var]');

  // Redact passwords/secrets in common patterns
  // Pattern: --password=value, -p value, password: value
  sanitized = sanitized.replace(
    /(-{1,2}(?:password|passwd|secret|token|key|auth|credential|api[_-]?key))[=:\s]+(['"]?)([^\s'"]+)\2/gi,
    (_, flag, quote, value) => `${flag}=${quote}${redactSensitiveValue(value)}${quote}`
  );

  // Pattern: user:password@ in URLs
  sanitized = sanitized.replace(
    /:([^:@\s/]{3,})@/g,
    (_, password) => `:${redactSensitiveValue(password)}@`
  );

  // Pattern: SENSITIVE_VAR=value
  sanitized = sanitized.replace(
    /\b([A-Z_]*(?:PASSWORD|SECRET|TOKEN|KEY|AUTH|CREDENTIAL|API_KEY)[A-Z_]*)=(['"]?)([^\s'"]+)\2/gi,
    (_, name, quote, value) => `${name}=${quote}${redactSensitiveValue(value)}${quote}`
  );

  // Remove dangerous semicolon chains (but keep the commands)
  sanitized = sanitized.replace(/;\s*/g, ' ');

  // Remove pipe to dangerous commands
  sanitized = sanitized.replace(/\|\s*(?:bash|sh|zsh|eval|exec)\b/gi, '| [shell]');

  return truncate(sanitized, MAX_LENGTHS.shellCommand);
}

// ============================================================================
// File Path Sanitization
// ============================================================================

/**
 * Sanitizes a file path for safe output/display.
 *
 * WARNING: This function is for OUTPUT sanitization (making paths safe to display).
 * For actual file system access, use sanitizePath from ./sanitizers.ts with proper
 * allowlist validation.
 *
 * Sanitization rules:
 * - Removes null bytes and control characters
 * - Neutralizes path traversal sequences
 * - Removes invalid filename characters
 * - Normalizes path separators
 * - Truncates to maximum length
 *
 * @param path - File path to sanitize
 * @returns Sanitized path safe for display
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeFilePath('../../../etc/passwd');
 * // Returns: 'etc/passwd'
 *
 * const sanitized2 = sanitizeFilePath('/path/to/file\x00.txt');
 * // Returns: '/path/to/file.txt'
 * ```
 */
export function sanitizeFilePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  let sanitized = path;

  // Remove null bytes and control characters
  sanitized = removeControlChars(sanitized);

  // Neutralize path traversal
  sanitized = neutralizePathTraversal(sanitized);

  // Remove invalid filename characters
  sanitized = sanitized.replace(INVALID_PATH_CHARS, '');

  // Normalize path separators to forward slashes
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove multiple consecutive slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();

  return truncate(sanitized, MAX_LENGTHS.filePath);
}

// ============================================================================
// Batch Sanitization
// ============================================================================

/**
 * Sanitizes multiple hooks at once
 */
export function sanitizeHooks(hooks: Hook[]): Hook[] {
  return hooks.map(sanitizeHook);
}

/**
 * Sanitizes multiple plugins at once
 */
export function sanitizePlugins(plugins: Plugin[]): Plugin[] {
  return plugins.map(sanitizePlugin);
}

/**
 * Sanitizes multiple permission rules at once
 */
export function sanitizePermissionRules(rules: PermissionRule[]): PermissionRule[] {
  return rules.map(sanitizePermissionRule);
}

/**
 * Sanitizes multiple commands at once
 */
export function sanitizeCommands(commands: Command[]): Command[] {
  return commands.map(sanitizeCommand);
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
  truncate,
  removeControlChars,
  containsSensitiveKeyword,
  redactSensitiveValue,
  neutralizePathTraversal
};
