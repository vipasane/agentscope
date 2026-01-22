/**
 * Scanner module exports
 * Configuration scanning and parsing utilities
 */

export {
  PluginParser,
  parsePlugins,
  validatePluginId,
  isValidSourceType,
  getBuiltinMarketplaces,
} from './plugin-parser.js';

export type { PluginParseResult } from './plugin-parser.js';

export {
  PermissionParser,
  parsePermissions,
  validatePermissionPattern,
  extractToolFromPattern,
  matchesPattern,
  parsePattern,
  validatePattern,
  isKnownTool,
  isValidDefaultMode,
  KNOWN_TOOLS,
  VALID_DEFAULT_MODES,
} from './permission-parser.js';

export type {
  RawPermissionsConfig,
  ParsedPattern,
  PatternValidation,
  PermissionParseResult,
  KnownTool,
  DefaultMode,
} from './permission-parser.js';

// Hook Parser
export {
  // Class
  HookParser,
  // Constants
  VALID_HOOK_EVENTS,
  TIMEOUT_LIMITS,
  // Validation Functions
  isValidHookEvent,
  normalizeHookEvent,
  isValidHookType,
  validateTimeout,
  detectCommandInjection,
  detectPathTraversal,
  hasSafeCommandPrefix,
  // Sanitization Functions
  sanitizeCommand,
  sanitizeMatcher,
  sanitizeWorkingDirectory,
  // Convenience Functions
  parseHooks,
  validateHookDefinition,
  toInternalHooks,
  getHookEventSummary,
} from './hook-parser.js';

export type {
  ValidHookEvent,
  HookType,
  RawHookDefinition,
  RawHookConfig,
  RawHooksObject,
  ParsedHook,
  HookParseResult,
} from './hook-parser.js';

// Settings Scanner (unified scanner for all settings.json entities)
export {
  SettingsScanner,
  scanSettings,
  scanUserSettings,
  mergeSettings,
} from './settings-scanner.js';

export type { SettingsScanResult } from './settings-scanner.js';
