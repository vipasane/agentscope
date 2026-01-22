/**
 * Security Module
 *
 * Provides input validation and output sanitization for AgentScope.
 * Part of DESIGN-001 security implementation.
 *
 * @module security
 */

// Validators
export {
  validateThemeName,
  validateColor,
  validateAgentCount,
  detectInjectionPatterns,
  isValidTheme,
  THEME_ALLOWLIST,
  MERMAID_RESERVED,
  DIRECTIVE_PATTERNS,
  type ValidTheme
} from './validators.js';

// Sanitizers
export {
  sanitizeId,
  sanitizeNodeLabel,
  sanitizePath,
  sanitizeConfig,
  sanitizeMarkdown
} from './sanitizers.js';

// Entity Validators
export {
  validateHook,
  validatePlugin,
  validatePermissionRule,
  validateCommand,
  validateHooks,
  validatePlugins,
  validatePermissionRules,
  validateCommands,
  VALID_HOOK_EVENTS,
  ALLOWED_TOOLS,
  DANGEROUS_TOOLS,
  COMMAND_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  HOOK_TIMEOUT_MIN,
  HOOK_TIMEOUT_MAX,
  PLUGIN_ID_PATTERN,
  PERMISSION_PATTERN_FORMAT,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning
} from './entity-validators.js';

// Entity Sanitizers
export {
  sanitizeHook,
  sanitizePlugin,
  sanitizePermissionRule,
  sanitizeCommand,
  sanitizeShellCommand,
  sanitizeFilePath,
  sanitizeHooks,
  sanitizePlugins,
  sanitizePermissionRules,
  sanitizeCommands,
  MAX_LENGTHS,
  truncate,
  removeControlChars,
  containsSensitiveKeyword,
  redactSensitiveValue,
  neutralizePathTraversal
} from './entity-sanitizers.js';
