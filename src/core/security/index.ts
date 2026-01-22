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
