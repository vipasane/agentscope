/**
 * Entity Validators - Validate parsed entities for security and correctness
 *
 * Security layer for validating hooks, plugins, permissions, and commands.
 * Based on DREAD threat modeling analysis:
 * - Hooks: 7.8/10 risk (command injection, path traversal, timeout DoS)
 * - Plugins: 6.8/10 risk (source URL validation, marketplace verification)
 * - Permissions: 6.2/10 risk (pattern injection, overly permissive rules)
 * - Commands: 4.8/10 risk (tool allowlist validation)
 *
 * Part of DESIGN-001 security implementation.
 */

import type { Hook, Plugin, PermissionRule, Command, HookEvent } from '../model/types.js';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  /** Whether the entity passed all validation checks */
  valid: boolean;
  /** Validation errors (blocking issues) */
  errors: ValidationError[];
  /** Validation warnings (non-blocking issues) */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** Entity type being validated */
  entity: string;
  /** Field that failed validation */
  field: string;
  /** Error message describing the issue */
  message: string;
  /** Severity level */
  severity: 'error';
  /** Error code for programmatic handling */
  code: string;
}

export interface ValidationWarning {
  /** Entity type being validated */
  entity: string;
  /** Field that triggered the warning */
  field: string;
  /** Warning message describing the issue */
  message: string;
  /** Severity level */
  severity: 'warning';
  /** Warning code for programmatic handling */
  code: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Valid hook event types */
export const VALID_HOOK_EVENTS: readonly HookEvent[] = [
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'Stop',
  'SubagentStop',
  'UserPromptSubmit'
] as const;

/** Patterns indicating potential command injection */
export const COMMAND_INJECTION_PATTERNS = [
  /;(?![^"']*["'][^"']*$)/,           // Unquoted semicolon (command chaining)
  /&&(?![^"']*["'][^"']*$)/,          // Unquoted && (command chaining)
  /\|\|(?![^"']*["'][^"']*$)/,        // Unquoted || (command chaining)
  /\$\(/,                              // Command substitution $(...)
  /`[^`]*`/,                           // Backtick command substitution
  /\$\{[^}]*\}/,                       // Variable expansion ${...}
  />\s*\/dev\/tcp/,                    // TCP redirect (reverse shell)
  />\s*\/dev\/udp/,                    // UDP redirect
  /\|\s*(?:bash|sh|zsh|csh|ksh)/i,    // Pipe to shell
  /\beval\s+/,                         // eval command
  /\bexec\s+/,                         // exec command
  /\bsource\s+/,                       // source command
  /\.\s+\//,                           // dot sourcing
] as const;

/** Patterns for path traversal detection */
export const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,                            // Relative parent directory
  /\.\.\\/,                            // Windows path traversal
  /\x00/,                              // Null byte injection
  /[\x01-\x1f\x7f]/,                   // Control characters
  /%2e%2e/i,                           // URL-encoded ..
  /%252e%252e/i,                       // Double URL-encoded ..
  /\.\.%2f/i,                          // Mixed encoding
  /\.\.%5c/i,                          // Mixed encoding (Windows)
] as const;

/** Minimum and maximum hook timeout values (in seconds) */
export const HOOK_TIMEOUT_MIN = 1;
export const HOOK_TIMEOUT_MAX = 300;

/** Valid plugin ID pattern: plugin-id@marketplace-id */
export const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*@[a-z0-9][a-z0-9-]*$/;

/** Valid permission pattern format: Tool(argument) or Tool(*) */
export const PERMISSION_PATTERN_FORMAT = /^[A-Z][a-zA-Z0-9]*\([^()]*\)$/;

/** Allowed tool names for commands (allowlist) */
export const ALLOWED_TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'Task',
  'TodoWrite',
  'NotebookEdit',
  'Skill'
] as const;

/** Dangerous tools that require explicit permission */
export const DANGEROUS_TOOLS = [
  'Bash',
  'Write',
  'Edit',
  'MultiEdit'
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a validation error object
 */
function createError(
  entity: string,
  field: string,
  message: string,
  code: string
): ValidationError {
  return { entity, field, message, severity: 'error', code };
}

/**
 * Creates a validation warning object
 */
function createWarning(
  entity: string,
  field: string,
  message: string,
  code: string
): ValidationWarning {
  return { entity, field, message, severity: 'warning', code };
}

/**
 * Checks if a command string contains potential injection patterns
 */
function containsInjectionPattern(command: string): string | null {
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(command)) {
      return pattern.toString();
    }
  }
  return null;
}

/**
 * Checks if a path contains traversal patterns
 */
function containsPathTraversal(path: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(path));
}

/**
 * Validates a URL is from a trusted source
 */
function isValidSourceUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Must be HTTPS (except for file:// and localhost)
    if (parsed.protocol !== 'https:' &&
        parsed.protocol !== 'file:' &&
        parsed.hostname !== 'localhost' &&
        parsed.hostname !== '127.0.0.1') {
      return { valid: false, reason: 'URL must use HTTPS protocol' };
    }

    // Block dangerous schemes
    if (['javascript:', 'data:', 'vbscript:'].includes(parsed.protocol)) {
      return { valid: false, reason: `Dangerous protocol: ${parsed.protocol}` };
    }

    // Check for IP addresses (potential bypass attempts)
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipPattern.test(parsed.hostname) &&
        parsed.hostname !== '127.0.0.1') {
      return { valid: false, reason: 'Direct IP addresses not allowed (except localhost)' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

// ============================================================================
// Hook Validation
// ============================================================================

/**
 * Validates a hook configuration for security and correctness.
 *
 * DREAD Risk: 7.8/10
 * - Damage: High (arbitrary command execution)
 * - Reproducibility: High (hooks execute on defined events)
 * - Exploitability: Medium (requires config access)
 * - Affected Users: High (all users of the config)
 * - Discoverability: Medium (config files may be exposed)
 *
 * @param hook - Hook configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateHook({
 *   event: 'PreToolUse',
 *   path: './hooks/pre-tool.sh',
 *   command: 'node validate.js',
 *   timeout: 30000
 * });
 *
 * if (!result.valid) {
 *   console.error('Hook validation failed:', result.errors);
 * }
 * ```
 */
export function validateHook(hook: Hook): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required field: event
  if (!hook.event) {
    errors.push(createError('hook', 'event', 'Hook event is required', 'HOOK_EVENT_REQUIRED'));
  } else if (!VALID_HOOK_EVENTS.includes(hook.event)) {
    errors.push(createError(
      'hook',
      'event',
      `Invalid hook event: ${hook.event}. Valid events: ${VALID_HOOK_EVENTS.join(', ')}`,
      'HOOK_EVENT_INVALID'
    ));
  }

  // Required field: path
  if (!hook.path) {
    errors.push(createError('hook', 'path', 'Hook path is required', 'HOOK_PATH_REQUIRED'));
  } else {
    // Check for path traversal
    if (containsPathTraversal(hook.path)) {
      errors.push(createError(
        'hook',
        'path',
        'Hook path contains path traversal patterns',
        'HOOK_PATH_TRAVERSAL'
      ));
    }

    // Check for null bytes
    if (hook.path.includes('\x00')) {
      errors.push(createError(
        'hook',
        'path',
        'Hook path contains null bytes',
        'HOOK_PATH_NULL_BYTE'
      ));
    }

    // Warn about absolute paths
    if (hook.path.startsWith('/') || /^[A-Za-z]:/.test(hook.path)) {
      warnings.push(createWarning(
        'hook',
        'path',
        'Hook uses absolute path - consider using relative paths for portability',
        'HOOK_PATH_ABSOLUTE'
      ));
    }
  }

  // Optional field: command
  if (hook.command) {
    // Check for command injection patterns
    const injectionPattern = containsInjectionPattern(hook.command);
    if (injectionPattern) {
      errors.push(createError(
        'hook',
        'command',
        `Hook command contains potential injection pattern: ${injectionPattern}`,
        'HOOK_COMMAND_INJECTION'
      ));
    }

    // Check for dangerous commands
    const dangerousCommands = ['rm -rf', 'sudo', 'chmod 777', 'curl | bash', 'wget | sh'];
    for (const dangerous of dangerousCommands) {
      if (hook.command.toLowerCase().includes(dangerous.toLowerCase())) {
        warnings.push(createWarning(
          'hook',
          'command',
          `Hook command contains potentially dangerous operation: ${dangerous}`,
          'HOOK_COMMAND_DANGEROUS'
        ));
      }
    }

    // Warn about long commands (may indicate complexity/risk)
    if (hook.command.length > 500) {
      warnings.push(createWarning(
        'hook',
        'command',
        'Hook command is unusually long - consider using a script file instead',
        'HOOK_COMMAND_LONG'
      ));
    }
  }

  // Optional field: workingDirectory
  if (hook.workingDirectory) {
    if (containsPathTraversal(hook.workingDirectory)) {
      errors.push(createError(
        'hook',
        'workingDirectory',
        'Working directory contains path traversal patterns',
        'HOOK_WORKDIR_TRAVERSAL'
      ));
    }
  }

  // Optional field: timeout
  if (hook.timeout !== undefined) {
    const timeoutSeconds = hook.timeout / 1000; // Convert ms to seconds

    if (typeof hook.timeout !== 'number' || !Number.isFinite(hook.timeout)) {
      errors.push(createError(
        'hook',
        'timeout',
        'Hook timeout must be a finite number',
        'HOOK_TIMEOUT_INVALID'
      ));
    } else if (timeoutSeconds < HOOK_TIMEOUT_MIN) {
      errors.push(createError(
        'hook',
        'timeout',
        `Hook timeout must be at least ${HOOK_TIMEOUT_MIN} second(s)`,
        'HOOK_TIMEOUT_TOO_SHORT'
      ));
    } else if (timeoutSeconds > HOOK_TIMEOUT_MAX) {
      errors.push(createError(
        'hook',
        'timeout',
        `Hook timeout must not exceed ${HOOK_TIMEOUT_MAX} seconds`,
        'HOOK_TIMEOUT_TOO_LONG'
      ));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Plugin Validation
// ============================================================================

/**
 * Validates a plugin configuration for security and correctness.
 *
 * DREAD Risk: 6.8/10
 * - Damage: High (plugins can execute arbitrary code)
 * - Reproducibility: Medium (requires plugin installation)
 * - Exploitability: Medium (requires marketplace or source access)
 * - Affected Users: High (all users installing the plugin)
 * - Discoverability: Medium (plugin sources may not be verified)
 *
 * @param plugin - Plugin configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validatePlugin({
 *   id: 'my-plugin@official',
 *   name: 'My Plugin',
 *   enabled: true,
 *   source: { type: 'github', location: 'https://github.com/org/repo' }
 * });
 *
 * if (!result.valid) {
 *   console.error('Plugin validation failed:', result.errors);
 * }
 * ```
 */
export function validatePlugin(plugin: Plugin): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required field: id
  if (!plugin.id) {
    errors.push(createError('plugin', 'id', 'Plugin ID is required', 'PLUGIN_ID_REQUIRED'));
  } else if (!PLUGIN_ID_PATTERN.test(plugin.id)) {
    errors.push(createError(
      'plugin',
      'id',
      `Plugin ID must match pattern: plugin-id@marketplace-id (got: ${plugin.id})`,
      'PLUGIN_ID_INVALID'
    ));
  }

  // Required field: name
  if (!plugin.name) {
    errors.push(createError('plugin', 'name', 'Plugin name is required', 'PLUGIN_NAME_REQUIRED'));
  } else if (plugin.name.length > 100) {
    errors.push(createError(
      'plugin',
      'name',
      'Plugin name must not exceed 100 characters',
      'PLUGIN_NAME_TOO_LONG'
    ));
  }

  // Required field: enabled (must be boolean)
  if (typeof plugin.enabled !== 'boolean') {
    errors.push(createError(
      'plugin',
      'enabled',
      'Plugin enabled must be a boolean',
      'PLUGIN_ENABLED_INVALID'
    ));
  }

  // Optional field: marketplace
  if (plugin.marketplace) {
    // Check for known/trusted marketplaces
    const trustedMarketplaces = ['official', 'verified', 'community'];
    if (!trustedMarketplaces.includes(plugin.marketplace.toLowerCase())) {
      warnings.push(createWarning(
        'plugin',
        'marketplace',
        `Plugin is from untrusted marketplace: ${plugin.marketplace}`,
        'PLUGIN_MARKETPLACE_UNTRUSTED'
      ));
    }
  } else if (plugin.enabled) {
    warnings.push(createWarning(
      'plugin',
      'marketplace',
      'Enabled plugin has no marketplace specified - source cannot be verified',
      'PLUGIN_NO_MARKETPLACE'
    ));
  }

  // Optional field: version
  if (plugin.version) {
    // Validate semantic version format
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    if (!semverPattern.test(plugin.version)) {
      warnings.push(createWarning(
        'plugin',
        'version',
        `Plugin version does not follow semantic versioning: ${plugin.version}`,
        'PLUGIN_VERSION_FORMAT'
      ));
    }
  }

  // Optional field: source
  if (plugin.source) {
    const validSourceTypes = ['github', 'git', 'url', 'npm', 'file', 'directory'];

    if (!validSourceTypes.includes(plugin.source.type)) {
      errors.push(createError(
        'plugin',
        'source.type',
        `Invalid plugin source type: ${plugin.source.type}`,
        'PLUGIN_SOURCE_TYPE_INVALID'
      ));
    }

    if (!plugin.source.location) {
      errors.push(createError(
        'plugin',
        'source.location',
        'Plugin source location is required when source is specified',
        'PLUGIN_SOURCE_LOCATION_REQUIRED'
      ));
    } else {
      // Validate URL sources
      if (['github', 'git', 'url'].includes(plugin.source.type)) {
        const urlValidation = isValidSourceUrl(plugin.source.location);
        if (!urlValidation.valid) {
          errors.push(createError(
            'plugin',
            'source.location',
            `Invalid plugin source URL: ${urlValidation.reason}`,
            'PLUGIN_SOURCE_URL_INVALID'
          ));
        }
      }

      // Validate file/directory sources
      if (['file', 'directory'].includes(plugin.source.type)) {
        if (containsPathTraversal(plugin.source.location)) {
          errors.push(createError(
            'plugin',
            'source.location',
            'Plugin source path contains path traversal patterns',
            'PLUGIN_SOURCE_PATH_TRAVERSAL'
          ));
        }
      }

      // Warn about non-GitHub sources
      if (plugin.source.type !== 'github' && plugin.enabled) {
        warnings.push(createWarning(
          'plugin',
          'source.type',
          `Plugin uses non-GitHub source (${plugin.source.type}) - verify trust before enabling`,
          'PLUGIN_SOURCE_NOT_GITHUB'
        ));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Permission Rule Validation
// ============================================================================

/**
 * Validates a permission rule for security and correctness.
 *
 * DREAD Risk: 6.2/10
 * - Damage: Medium-High (overly permissive rules bypass security)
 * - Reproducibility: High (rules apply consistently)
 * - Exploitability: Low (requires config access)
 * - Affected Users: High (all users of the config)
 * - Discoverability: Low (permission configs may be reviewed)
 *
 * @param rule - Permission rule to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validatePermissionRule({
 *   pattern: 'Bash(npm run:*)',
 *   type: 'allow',
 *   tool: 'Bash'
 * });
 *
 * if (!result.valid) {
 *   console.error('Permission rule validation failed:', result.errors);
 * }
 * ```
 */
export function validatePermissionRule(rule: PermissionRule): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required field: pattern
  if (!rule.pattern) {
    errors.push(createError(
      'permissionRule',
      'pattern',
      'Permission pattern is required',
      'PERMISSION_PATTERN_REQUIRED'
    ));
  } else {
    // Validate pattern format: Tool(argument) or Tool(*)
    if (!PERMISSION_PATTERN_FORMAT.test(rule.pattern)) {
      errors.push(createError(
        'permissionRule',
        'pattern',
        `Permission pattern must match format Tool(argument): ${rule.pattern}`,
        'PERMISSION_PATTERN_FORMAT'
      ));
    }

    // Extract tool name from pattern
    const toolMatch = rule.pattern.match(/^([A-Z][a-zA-Z0-9]*)\(/);
    const toolName = toolMatch ? toolMatch[1] : null;

    // Validate tool is in allowlist
    if (toolName && !ALLOWED_TOOLS.includes(toolName as typeof ALLOWED_TOOLS[number])) {
      errors.push(createError(
        'permissionRule',
        'pattern',
        `Unknown tool in permission pattern: ${toolName}`,
        'PERMISSION_TOOL_UNKNOWN'
      ));
    }

    // Check for overly permissive patterns
    if (rule.pattern.includes('(*)') && rule.type === 'allow') {
      if (toolName && DANGEROUS_TOOLS.includes(toolName as typeof DANGEROUS_TOOLS[number])) {
        warnings.push(createWarning(
          'permissionRule',
          'pattern',
          `Wildcard allow on dangerous tool: ${toolName}(*) - consider more specific patterns`,
          'PERMISSION_WILDCARD_DANGEROUS'
        ));
      }
    }

    // Check for regex injection attempts
    const regexSpecialChars = /[\\^$.|?*+()[{]/;
    const argumentMatch = rule.pattern.match(/\(([^)]*)\)/);
    const argument = argumentMatch ? argumentMatch[1] : '';

    // Allow * and : for glob patterns, but warn about other special chars
    const cleanArgument = argument.replace(/[*:]/g, '');
    if (regexSpecialChars.test(cleanArgument)) {
      warnings.push(createWarning(
        'permissionRule',
        'pattern',
        'Permission pattern contains regex special characters - ensure this is intentional',
        'PERMISSION_PATTERN_REGEX_CHARS'
      ));
    }

    // Check for path traversal in pattern argument
    if (containsPathTraversal(argument)) {
      errors.push(createError(
        'permissionRule',
        'pattern',
        'Permission pattern contains path traversal',
        'PERMISSION_PATTERN_TRAVERSAL'
      ));
    }
  }

  // Required field: type
  if (!rule.type) {
    errors.push(createError(
      'permissionRule',
      'type',
      'Permission type is required',
      'PERMISSION_TYPE_REQUIRED'
    ));
  } else if (!['allow', 'deny', 'ask'].includes(rule.type)) {
    errors.push(createError(
      'permissionRule',
      'type',
      `Invalid permission type: ${rule.type}. Must be: allow, deny, or ask`,
      'PERMISSION_TYPE_INVALID'
    ));
  }

  // Optional field: tool (should match pattern)
  if (rule.tool) {
    const patternToolMatch = rule.pattern?.match(/^([A-Z][a-zA-Z0-9]*)\(/);
    const patternTool = patternToolMatch ? patternToolMatch[1] : null;

    if (patternTool && rule.tool !== patternTool) {
      warnings.push(createWarning(
        'permissionRule',
        'tool',
        `Tool field (${rule.tool}) does not match tool in pattern (${patternTool})`,
        'PERMISSION_TOOL_MISMATCH'
      ));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Command Validation
// ============================================================================

/**
 * Validates a command configuration for security and correctness.
 *
 * DREAD Risk: 4.8/10
 * - Damage: Medium (commands restrict tool usage)
 * - Reproducibility: High (commands apply consistently)
 * - Exploitability: Low (requires config modification)
 * - Affected Users: Medium (users of specific commands)
 * - Discoverability: Low (command configs are explicit)
 *
 * @param command - Command configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateCommand({
 *   name: '/deploy',
 *   description: 'Deploy the application',
 *   allowedTools: ['Bash', 'Read'],
 *   prompt: 'Deploy to production environment'
 * });
 *
 * if (!result.valid) {
 *   console.error('Command validation failed:', result.errors);
 * }
 * ```
 */
export function validateCommand(command: Command): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required field: name
  if (!command.name) {
    errors.push(createError(
      'command',
      'name',
      'Command name is required',
      'COMMAND_NAME_REQUIRED'
    ));
  } else {
    // Command names must start with /
    if (!command.name.startsWith('/')) {
      errors.push(createError(
        'command',
        'name',
        `Command name must start with /: ${command.name}`,
        'COMMAND_NAME_FORMAT'
      ));
    }

    // Check for valid command name characters
    if (!/^\/[a-zA-Z][a-zA-Z0-9-]*$/.test(command.name)) {
      errors.push(createError(
        'command',
        'name',
        `Command name contains invalid characters: ${command.name}`,
        'COMMAND_NAME_CHARS'
      ));
    }

    // Warn about reserved command names
    const reservedCommands = ['/help', '/clear', '/quit', '/exit', '/config', '/settings'];
    if (reservedCommands.includes(command.name.toLowerCase())) {
      warnings.push(createWarning(
        'command',
        'name',
        `Command name may conflict with reserved command: ${command.name}`,
        'COMMAND_NAME_RESERVED'
      ));
    }
  }

  // Optional field: allowedTools
  if (command.allowedTools) {
    if (!Array.isArray(command.allowedTools)) {
      errors.push(createError(
        'command',
        'allowedTools',
        'allowedTools must be an array',
        'COMMAND_ALLOWED_TOOLS_TYPE'
      ));
    } else {
      for (const tool of command.allowedTools) {
        if (!ALLOWED_TOOLS.includes(tool as typeof ALLOWED_TOOLS[number])) {
          errors.push(createError(
            'command',
            'allowedTools',
            `Unknown tool in allowedTools: ${tool}`,
            'COMMAND_TOOL_UNKNOWN'
          ));
        }
      }
    }
  }

  // Optional field: disallowedTools
  if (command.disallowedTools) {
    if (!Array.isArray(command.disallowedTools)) {
      errors.push(createError(
        'command',
        'disallowedTools',
        'disallowedTools must be an array',
        'COMMAND_DISALLOWED_TOOLS_TYPE'
      ));
    } else {
      for (const tool of command.disallowedTools) {
        if (!ALLOWED_TOOLS.includes(tool as typeof ALLOWED_TOOLS[number])) {
          warnings.push(createWarning(
            'command',
            'disallowedTools',
            `Unknown tool in disallowedTools (may be intentional): ${tool}`,
            'COMMAND_DISALLOWED_TOOL_UNKNOWN'
          ));
        }
      }
    }
  }

  // Check for conflicting tool lists
  if (command.allowedTools && command.disallowedTools) {
    const overlap = command.allowedTools.filter(t => command.disallowedTools?.includes(t));
    if (overlap.length > 0) {
      errors.push(createError(
        'command',
        'allowedTools',
        `Tools cannot be both allowed and disallowed: ${overlap.join(', ')}`,
        'COMMAND_TOOL_CONFLICT'
      ));
    }
  }

  // Optional field: prompt
  if (command.prompt) {
    // Check for injection patterns in prompt
    const injectionPattern = containsInjectionPattern(command.prompt);
    if (injectionPattern) {
      warnings.push(createWarning(
        'command',
        'prompt',
        `Command prompt contains potential injection pattern: ${injectionPattern}`,
        'COMMAND_PROMPT_INJECTION'
      ));
    }

    // Warn about very long prompts
    if (command.prompt.length > 5000) {
      warnings.push(createWarning(
        'command',
        'prompt',
        'Command prompt is very long - consider simplifying',
        'COMMAND_PROMPT_LONG'
      ));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validates multiple hooks at once
 */
export function validateHooks(hooks: Hook[]): {
  results: Map<Hook, ValidationResult>;
  allValid: boolean;
  totalErrors: number;
  totalWarnings: number;
} {
  const results = new Map<Hook, ValidationResult>();
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const hook of hooks) {
    const result = validateHook(hook);
    results.set(hook, result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  return {
    results,
    allValid: totalErrors === 0,
    totalErrors,
    totalWarnings
  };
}

/**
 * Validates multiple plugins at once
 */
export function validatePlugins(plugins: Plugin[]): {
  results: Map<Plugin, ValidationResult>;
  allValid: boolean;
  totalErrors: number;
  totalWarnings: number;
} {
  const results = new Map<Plugin, ValidationResult>();
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const plugin of plugins) {
    const result = validatePlugin(plugin);
    results.set(plugin, result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  return {
    results,
    allValid: totalErrors === 0,
    totalErrors,
    totalWarnings
  };
}

/**
 * Validates multiple permission rules at once
 */
export function validatePermissionRules(rules: PermissionRule[]): {
  results: Map<PermissionRule, ValidationResult>;
  allValid: boolean;
  totalErrors: number;
  totalWarnings: number;
} {
  const results = new Map<PermissionRule, ValidationResult>();
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const rule of rules) {
    const result = validatePermissionRule(rule);
    results.set(rule, result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  return {
    results,
    allValid: totalErrors === 0,
    totalErrors,
    totalWarnings
  };
}

/**
 * Validates multiple commands at once
 */
export function validateCommands(commands: Command[]): {
  results: Map<Command, ValidationResult>;
  allValid: boolean;
  totalErrors: number;
  totalWarnings: number;
} {
  const results = new Map<Command, ValidationResult>();
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const command of commands) {
    const result = validateCommand(command);
    results.set(command, result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  return {
    results,
    allValid: totalErrors === 0,
    totalErrors,
    totalWarnings
  };
}
