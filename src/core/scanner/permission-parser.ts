/**
 * Permission Parser Module
 *
 * Parses permission rules from Claude Code settings.json (schema 2026.01).
 * Handles the permission DSL patterns for allow, deny, and ask rules.
 *
 * Permission Pattern DSL:
 * - Bash(npm run lint)     - Exact match
 * - Bash(npm run:*)        - Prefix matching
 * - Bash(git * main)       - Glob matching
 * - Read(./.env)           - File path
 * - Read(./secrets/**)     - Glob file path
 * - WebFetch(domain:X)     - Domain restriction
 * - mcp__server__tool      - MCP tool reference
 */

import type { PermissionRule, PermissionSummary, ScanError } from '../model/types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Known Claude Code tools that can appear in permission patterns
 */
export const KNOWN_TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'TodoRead',
  'TodoWrite',
  'Task',
  'Skill',
  'NotebookRead',
  'NotebookEdit',
] as const;

export type KnownTool = (typeof KNOWN_TOOLS)[number];

/**
 * Valid default permission modes
 */
export const VALID_DEFAULT_MODES = [
  'acceptEdits',
  'bypassPermissions',
  'default',
  'plan',
] as const;

export type DefaultMode = (typeof VALID_DEFAULT_MODES)[number];

/**
 * Patterns that indicate overly permissive and potentially dangerous rules
 */
const OVERLY_PERMISSIVE_PATTERNS = [
  /^Bash\(\*\)$/,               // Bash(*) - allows any bash command
  /^Bash\(\.\*\)$/,             // Bash(.*) - allows any bash command
  /^Read\(\*\*\)$/,             // Read(**) - allows reading any file
  /^Write\(\*\*\)$/,            // Write(**) - allows writing any file
  /^Edit\(\*\*\)$/,             // Edit(**) - allows editing any file
  /^Bash\(rm\s+-rf\s+\/\*?\)$/, // Bash(rm -rf /) - dangerous
];

/**
 * Patterns that indicate potential injection attempts
 */
const INJECTION_PATTERNS = [
  /\$[\(\{]/,                   // Command/variable substitution $( or ${
  /`[^`]*`/,                    // Backtick command substitution `...`
  /[;&|]/,                      // Command chaining
  /\n/,                         // Newlines
  /\\x[0-9a-f]{2}/i,            // Hex escape sequences
  /\\u[0-9a-f]{4}/i,            // Unicode escape sequences
  /<script/i,                   // Script tags
  /javascript:/i,               // JavaScript protocol
];

// ============================================================================
// Types
// ============================================================================

/**
 * Raw permissions configuration from settings.json
 */
export interface RawPermissionsConfig {
  allow?: string[];
  deny?: string[];
  ask?: string[];
  defaultMode?: string;
  additionalDirectories?: string[];
}

/**
 * Parsed permission pattern components
 */
export interface ParsedPattern {
  /** Original pattern string */
  raw: string;
  /** Tool name extracted from pattern */
  tool: string | null;
  /** Argument/path extracted from pattern */
  argument: string | null;
  /** Pattern type classification */
  patternType: 'tool-call' | 'mcp-tool' | 'invalid';
  /** Whether pattern contains glob wildcards */
  hasGlob: boolean;
  /** Whether pattern is a prefix match (ends with :*) */
  isPrefix: boolean;
  /** For MCP tools: server name */
  mcpServer?: string;
  /** For MCP tools: tool name */
  mcpTool?: string;
}

/**
 * Validation result for a permission pattern
 */
export interface PatternValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of parsing permissions
 */
export interface PermissionParseResult {
  summary: PermissionSummary;
  errors: ScanError[];
}

// ============================================================================
// Pattern Parsing
// ============================================================================

/**
 * Parse a permission pattern string into its components.
 *
 * Supported formats:
 * - Tool(argument)      e.g., Bash(npm run lint), Read(./.env)
 * - mcp__server__tool   e.g., mcp__github__list_repos
 *
 * @param pattern - Raw pattern string
 * @returns Parsed pattern components
 *
 * @example
 * ```typescript
 * parsePattern('Bash(npm run:*)');
 * // { raw: 'Bash(npm run:*)', tool: 'Bash', argument: 'npm run:*', patternType: 'tool-call', hasGlob: false, isPrefix: true }
 *
 * parsePattern('Read(./secrets/**)');
 * // { raw: 'Read(./secrets/**)', tool: 'Read', argument: './secrets/**', patternType: 'tool-call', hasGlob: true, isPrefix: false }
 *
 * parsePattern('mcp__github__list_repos');
 * // { raw: 'mcp__github__list_repos', tool: null, argument: null, patternType: 'mcp-tool', mcpServer: 'github', mcpTool: 'list_repos' }
 * ```
 */
export function parsePattern(pattern: string): ParsedPattern {
  const trimmed = pattern.trim();

  // Check for MCP tool pattern: mcp__server__tool
  const mcpMatch = trimmed.match(/^mcp__([a-zA-Z0-9_-]+)__([a-zA-Z0-9_-]+)$/);
  if (mcpMatch) {
    return {
      raw: trimmed,
      tool: null,
      argument: null,
      patternType: 'mcp-tool',
      hasGlob: false,
      isPrefix: false,
      mcpServer: mcpMatch[1],
      mcpTool: mcpMatch[2],
    };
  }

  // Check for tool call pattern: Tool(argument)
  const toolCallMatch = trimmed.match(/^([A-Za-z]+)\((.+)\)$/);
  if (toolCallMatch) {
    const tool = toolCallMatch[1];
    const argument = toolCallMatch[2];

    return {
      raw: trimmed,
      tool,
      argument,
      patternType: 'tool-call',
      hasGlob: containsGlob(argument),
      isPrefix: argument.endsWith(':*'),
    };
  }

  // Invalid pattern
  return {
    raw: trimmed,
    tool: null,
    argument: null,
    patternType: 'invalid',
    hasGlob: false,
    isPrefix: false,
  };
}

/**
 * Check if a string contains glob patterns
 */
function containsGlob(str: string): boolean {
  // Common glob patterns: *, **, ?, [...]
  return /[*?]|\[.+\]/.test(str);
}

// ============================================================================
// Pattern Validation
// ============================================================================

/**
 * Validate a permission pattern for correctness and security.
 *
 * @param pattern - Pattern string to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * validatePattern('Bash(npm run lint)');
 * // { isValid: true, errors: [], warnings: [] }
 *
 * validatePattern('Bash(*)');
 * // { isValid: true, errors: [], warnings: ['Overly permissive pattern: allows all Bash commands'] }
 *
 * validatePattern('Invalid(');
 * // { isValid: false, errors: ['Malformed pattern: missing closing parenthesis'], warnings: [] }
 * ```
 */
export function validatePattern(pattern: string): PatternValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmed = pattern.trim();

  // Check for empty pattern
  if (!trimmed) {
    errors.push('Empty pattern');
    return { isValid: false, errors, warnings };
  }

  // Check for injection attempts
  for (const injectionPattern of INJECTION_PATTERNS) {
    if (injectionPattern.test(trimmed)) {
      errors.push(`Potential injection attempt detected: ${injectionPattern.source}`);
    }
  }

  // If injection detected, fail immediately
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Parse the pattern
  const parsed = parsePattern(trimmed);

  // Validate based on pattern type
  if (parsed.patternType === 'invalid') {
    errors.push('Malformed pattern: expected Tool(argument) or mcp__server__tool format');
    return { isValid: false, errors, warnings };
  }

  // Validate tool-call patterns
  if (parsed.patternType === 'tool-call') {
    // Check for known tool
    if (parsed.tool && !isKnownTool(parsed.tool)) {
      warnings.push(`Unknown tool: ${parsed.tool}. Valid tools are: ${KNOWN_TOOLS.join(', ')}`);
    }

    // Check for unbalanced parentheses
    const openCount = (trimmed.match(/\(/g) || []).length;
    const closeCount = (trimmed.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
      errors.push('Unbalanced parentheses in pattern');
    }

    // Check for empty argument
    if (!parsed.argument || parsed.argument.trim() === '') {
      errors.push('Empty argument in pattern');
    }

    // Check for overly permissive patterns
    for (const permissivePattern of OVERLY_PERMISSIVE_PATTERNS) {
      if (permissivePattern.test(trimmed)) {
        warnings.push(`Overly permissive pattern: ${getPermissiveWarning(trimmed)}`);
        break;
      }
    }

    // Validate path patterns for file-related tools
    if (parsed.tool && ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep'].includes(parsed.tool)) {
      if (parsed.argument && !isValidPathPattern(parsed.argument)) {
        warnings.push(`Path pattern may be invalid: ${parsed.argument}`);
      }
    }

    // Validate domain restriction for WebFetch
    if (parsed.tool === 'WebFetch' && parsed.argument) {
      if (parsed.argument.startsWith('domain:')) {
        const domain = parsed.argument.slice(7);
        if (!isValidDomain(domain)) {
          warnings.push(`Invalid domain in WebFetch pattern: ${domain}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a tool name is a known Claude Code tool
 */
export function isKnownTool(tool: string): tool is KnownTool {
  return (KNOWN_TOOLS as readonly string[]).includes(tool);
}

/**
 * Check if a string is a valid path pattern
 */
function isValidPathPattern(path: string): boolean {
  // Basic validation: should start with ./, ../, /, or be a relative path
  // Allow glob patterns
  if (/^(\.\/|\.\.\/|\/|[a-zA-Z0-9_-])/.test(path)) {
    return true;
  }
  return false;
}

/**
 * Check if a string is a valid domain
 */
function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*$/;
  return domainPattern.test(domain);
}

/**
 * Get a human-readable warning for overly permissive patterns
 */
function getPermissiveWarning(pattern: string): string {
  if (pattern.startsWith('Bash')) {
    return 'allows execution of any Bash command - consider restricting to specific commands';
  }
  if (pattern.startsWith('Read')) {
    return 'allows reading any file - consider restricting to specific paths';
  }
  if (pattern.startsWith('Write')) {
    return 'allows writing to any file - consider restricting to specific paths';
  }
  if (pattern.startsWith('Edit')) {
    return 'allows editing any file - consider restricting to specific paths';
  }
  return 'this pattern is overly permissive';
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Permission Parser class for parsing Claude Code settings permissions.
 *
 * @example
 * ```typescript
 * const parser = new PermissionParser();
 *
 * const config = {
 *   allow: ['Bash(npm run:*)', 'Read(./src/**)'],
 *   deny: ['Read(./.env)', 'Read(./secrets/**)'],
 *   ask: ['Bash(rm *)', 'Write(./.claude/*)'],
 *   defaultMode: 'default',
 *   additionalDirectories: ['./scripts']
 * };
 *
 * const result = parser.parse(config);
 * console.log(result.summary.allowCount); // 2
 * console.log(result.summary.denyCount);  // 2
 * console.log(result.summary.askCount);   // 2
 * ```
 */
export class PermissionParser {
  private errors: ScanError[] = [];

  /**
   * Parse raw permissions configuration into a structured summary.
   *
   * @param config - Raw permissions configuration from settings.json
   * @param sourcePath - Optional source file path for error reporting
   * @returns Parsed permission summary and any errors
   */
  parse(config: RawPermissionsConfig | undefined, sourcePath?: string): PermissionParseResult {
    this.errors = [];

    // Handle undefined or null config
    if (!config) {
      return {
        summary: this.createEmptySummary(),
        errors: [],
      };
    }

    const rules: PermissionRule[] = [];

    // Parse allow rules
    if (Array.isArray(config.allow)) {
      for (const pattern of config.allow) {
        const rule = this.parseRule(pattern, 'allow', sourcePath);
        if (rule) {
          rules.push(rule);
        }
      }
    }

    // Parse deny rules
    if (Array.isArray(config.deny)) {
      for (const pattern of config.deny) {
        const rule = this.parseRule(pattern, 'deny', sourcePath);
        if (rule) {
          rules.push(rule);
        }
      }
    }

    // Parse ask rules
    if (Array.isArray(config.ask)) {
      for (const pattern of config.ask) {
        const rule = this.parseRule(pattern, 'ask', sourcePath);
        if (rule) {
          rules.push(rule);
        }
      }
    }

    // Validate and parse defaultMode
    let defaultMode: DefaultMode | undefined;
    if (config.defaultMode !== undefined) {
      if (isValidDefaultMode(config.defaultMode)) {
        defaultMode = config.defaultMode;
      } else {
        this.addError(
          'warning',
          'INVALID_DEFAULT_MODE',
          `Invalid defaultMode: "${config.defaultMode}". Valid values are: ${VALID_DEFAULT_MODES.join(', ')}`,
          sourcePath
        );
      }
    }

    // Validate additionalDirectories
    let additionalDirectories: string[] | undefined;
    if (Array.isArray(config.additionalDirectories)) {
      additionalDirectories = [];
      for (const dir of config.additionalDirectories) {
        if (typeof dir === 'string' && dir.trim()) {
          // Basic validation - should look like a path
          if (isValidPathPattern(dir.trim())) {
            additionalDirectories.push(dir.trim());
          } else {
            this.addError(
              'warning',
              'INVALID_DIRECTORY',
              `Invalid additional directory path: "${dir}"`,
              sourcePath
            );
          }
        }
      }
      if (additionalDirectories.length === 0) {
        additionalDirectories = undefined;
      }
    }

    // Count rules by type
    const allowCount = rules.filter((r) => r.type === 'allow').length;
    const denyCount = rules.filter((r) => r.type === 'deny').length;
    const askCount = rules.filter((r) => r.type === 'ask').length;

    return {
      summary: {
        allowCount,
        denyCount,
        askCount,
        rules,
        defaultMode,
        additionalDirectories,
      },
      errors: this.errors,
    };
  }

  /**
   * Parse a single permission rule.
   *
   * @param pattern - Raw pattern string
   * @param type - Rule type (allow, deny, ask)
   * @param sourcePath - Optional source file path for error reporting
   * @returns Parsed rule or null if invalid
   */
  private parseRule(
    pattern: unknown,
    type: 'allow' | 'deny' | 'ask',
    sourcePath?: string
  ): PermissionRule | null {
    // Validate input is a string
    if (typeof pattern !== 'string') {
      this.addError(
        'warning',
        'INVALID_PATTERN_TYPE',
        `Permission pattern must be a string, got: ${typeof pattern}`,
        sourcePath
      );
      return null;
    }

    const trimmed = pattern.trim();
    if (!trimmed) {
      this.addError('warning', 'EMPTY_PATTERN', 'Empty permission pattern', sourcePath);
      return null;
    }

    // Validate the pattern
    const validation = validatePattern(trimmed);

    // Add any validation errors
    for (const error of validation.errors) {
      this.addError('warning', 'INVALID_PATTERN', `Pattern "${trimmed}": ${error}`, sourcePath);
    }

    // Add any validation warnings
    for (const warning of validation.warnings) {
      this.addError('info', 'PATTERN_WARNING', `Pattern "${trimmed}": ${warning}`, sourcePath);
    }

    // If pattern is invalid, don't include it
    if (!validation.isValid) {
      return null;
    }

    // Parse the pattern to extract tool
    const parsed = parsePattern(trimmed);

    // Build description
    let description: string | undefined;
    if (parsed.patternType === 'tool-call' && parsed.tool && parsed.argument) {
      description = buildDescription(parsed.tool, parsed.argument, type);
    } else if (parsed.patternType === 'mcp-tool' && parsed.mcpServer && parsed.mcpTool) {
      description = `${type === 'allow' ? 'Allows' : type === 'deny' ? 'Denies' : 'Asks before'} calling ${parsed.mcpTool} on MCP server ${parsed.mcpServer}`;
    }

    return {
      pattern: trimmed,
      type,
      tool: parsed.tool || (parsed.mcpServer ? `mcp__${parsed.mcpServer}` : undefined),
      description,
    };
  }

  /**
   * Create an empty permission summary.
   */
  private createEmptySummary(): PermissionSummary {
    return {
      allowCount: 0,
      denyCount: 0,
      askCount: 0,
      rules: [],
    };
  }

  /**
   * Add an error to the collection.
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
// Helper Functions
// ============================================================================

/**
 * Check if a value is a valid default mode
 */
export function isValidDefaultMode(value: unknown): value is DefaultMode {
  return typeof value === 'string' && (VALID_DEFAULT_MODES as readonly string[]).includes(value);
}

/**
 * Build a human-readable description for a permission rule
 */
function buildDescription(tool: string, argument: string, type: 'allow' | 'deny' | 'ask'): string {
  const action = type === 'allow' ? 'Allows' : type === 'deny' ? 'Denies' : 'Asks before';

  switch (tool) {
    case 'Bash':
      if (argument.endsWith(':*')) {
        const prefix = argument.slice(0, -2);
        return `${action} Bash commands starting with "${prefix}"`;
      }
      if (argument.includes('*')) {
        return `${action} Bash commands matching "${argument}"`;
      }
      return `${action} Bash command: ${argument}`;

    case 'Read':
      if (argument.includes('**')) {
        return `${action} reading files matching "${argument}" recursively`;
      }
      if (argument.includes('*')) {
        return `${action} reading files matching "${argument}"`;
      }
      return `${action} reading file: ${argument}`;

    case 'Write':
      if (argument.includes('**')) {
        return `${action} writing files matching "${argument}" recursively`;
      }
      if (argument.includes('*')) {
        return `${action} writing files matching "${argument}"`;
      }
      return `${action} writing to file: ${argument}`;

    case 'Edit':
    case 'MultiEdit':
      if (argument.includes('**')) {
        return `${action} editing files matching "${argument}" recursively`;
      }
      if (argument.includes('*')) {
        return `${action} editing files matching "${argument}"`;
      }
      return `${action} editing file: ${argument}`;

    case 'WebFetch':
      if (argument.startsWith('domain:')) {
        const domain = argument.slice(7);
        return `${action} fetching from domain: ${domain}`;
      }
      return `${action} WebFetch: ${argument}`;

    default:
      return `${action} ${tool}: ${argument}`;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Parse permissions from a raw configuration object.
 *
 * @param config - Raw permissions configuration
 * @param sourcePath - Optional source file path for error reporting
 * @returns Parsed permission summary and any errors
 *
 * @example
 * ```typescript
 * const config = {
 *   allow: ['Bash(npm run:*)'],
 *   deny: ['Read(./.env)']
 * };
 *
 * const result = parsePermissions(config);
 * console.log(result.summary.rules.length); // 2
 * ```
 */
export function parsePermissions(
  config: RawPermissionsConfig | undefined,
  sourcePath?: string
): PermissionParseResult {
  const parser = new PermissionParser();
  return parser.parse(config, sourcePath);
}

/**
 * Validate a single permission pattern.
 *
 * @param pattern - Permission pattern string
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validatePermissionPattern('Bash(npm run lint)');
 * console.log(result.isValid); // true
 * ```
 */
export function validatePermissionPattern(pattern: string): PatternValidation {
  return validatePattern(pattern);
}

/**
 * Extract tool name from a permission pattern.
 *
 * @param pattern - Permission pattern string
 * @returns Tool name or null if not found
 *
 * @example
 * ```typescript
 * extractToolFromPattern('Bash(npm run lint)'); // 'Bash'
 * extractToolFromPattern('mcp__github__list');   // null (MCP patterns don't have standard tool)
 * ```
 */
export function extractToolFromPattern(pattern: string): string | null {
  const parsed = parsePattern(pattern);
  return parsed.tool;
}

/**
 * Check if a pattern matches a given tool call.
 *
 * @param pattern - Permission pattern
 * @param tool - Tool name
 * @param argument - Tool argument/command
 * @returns True if pattern matches the tool call
 *
 * @example
 * ```typescript
 * matchesPattern('Bash(npm run:*)', 'Bash', 'npm run test');     // true
 * matchesPattern('Bash(npm run:*)', 'Bash', 'npm install');       // false
 * matchesPattern('Read(./src/**)', 'Read', './src/index.ts');     // true
 * ```
 */
export function matchesPattern(pattern: string, tool: string, argument: string): boolean {
  const parsed = parsePattern(pattern);

  // MCP tools don't match standard tool calls
  if (parsed.patternType === 'mcp-tool') {
    return false;
  }

  // Invalid patterns don't match
  if (parsed.patternType === 'invalid') {
    return false;
  }

  // Tool must match (case-sensitive)
  if (parsed.tool !== tool) {
    return false;
  }

  // No argument in pattern means no match
  if (!parsed.argument) {
    return false;
  }

  // Prefix match (ends with :*)
  if (parsed.isPrefix) {
    const prefix = parsed.argument.slice(0, -2);
    return argument.startsWith(prefix);
  }

  // Glob match
  if (parsed.hasGlob) {
    return matchGlob(parsed.argument, argument);
  }

  // Exact match
  return parsed.argument === argument;
}

/**
 * Simple glob matching for permission patterns.
 * Supports single asterisk (any characters), double-asterisk (recursive), and ? (single character).
 */
function matchGlob(pattern: string, str: string): boolean {
  // First, mark the glob patterns with placeholders to preserve them
  // Replace **/ first (directory separator after **) - matches zero or more dirs
  let regexPattern = pattern.replace(/\*\*\//g, '\x00DOUBLE_STAR_SLASH\x00');
  // Replace remaining ** (at end of pattern or standalone)
  regexPattern = regexPattern.replace(/\*\*/g, '\x00DOUBLE_STAR\x00');
  // Replace single *
  regexPattern = regexPattern.replace(/\*/g, '\x00SINGLE_STAR\x00');
  // Replace ?
  regexPattern = regexPattern.replace(/\?/g, '\x00QUESTION\x00');

  // Now escape special regex characters
  regexPattern = regexPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Convert placeholders to regex patterns
  // **/ matches zero or more directory levels (including empty)
  // This handles cases like ./src/**/*.ts matching ./src/index.ts
  regexPattern = regexPattern.replace(/\x00DOUBLE_STAR_SLASH\x00/g, '(?:.*/)?');
  // ** matches any characters including path separators (zero or more)
  regexPattern = regexPattern.replace(/\x00DOUBLE_STAR\x00/g, '.*');
  // * matches any characters except path separator for file patterns,
  // but for general command matching, we need more flexibility.
  // Use .* for broad matching in permission context
  regexPattern = regexPattern.replace(/\x00SINGLE_STAR\x00/g, '[^/]*');
  // ? matches single character
  regexPattern = regexPattern.replace(/\x00QUESTION\x00/g, '.');

  // Anchor the pattern
  regexPattern = `^${regexPattern}$`;

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(str);
  } catch {
    // Invalid regex, no match
    return false;
  }
}
