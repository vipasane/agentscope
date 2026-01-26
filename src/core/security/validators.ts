/**
 * Security Validators
 *
 * Input validation functions for AgentScope security, implementing defense-in-depth
 * protection against injection attacks, XSS, and malicious input.
 *
 * ## Security Model
 *
 * This module implements the input validation layer of the DESIGN-001 security architecture:
 * 1. **Allowlist-based validation** - Only permit known-safe values
 * 2. **Pattern detection** - Identify injection attempts before sanitization
 * 3. **Bounds checking** - Prevent resource exhaustion via input limits
 * 4. **Type safety** - Validate data types and structure
 *
 * ## Threat Vectors Protected
 *
 * - **Mermaid Directive Injection**: Malicious `%%{init:...}%%` directives
 * - **XSS via Diagram Labels**: HTML/JavaScript in node labels
 * - **Path Traversal**: `../` sequences in file paths
 * - **ReDoS**: Regular expression denial of service via complex patterns
 * - **Resource Exhaustion**: Excessive agent counts or diagram complexity
 *
 * ## Usage Pattern
 *
 * Always validate input BEFORE sanitization for defense-in-depth:
 * ```typescript
 * // 1. Validate (detect attacks)
 * const patterns = detectInjectionPatterns(userInput);
 * if (patterns.length > 0) {
 *   console.warn('Detected injection attempts:', patterns);
 * }
 *
 * // 2. Sanitize (clean remaining input)
 * const safe = sanitizeNodeLabel(userInput);
 *
 * // 3. Use in diagram
 * diagram += `node["${safe}"]`;
 * ```
 *
 * @module security/validators
 * @see {@link module:security/sanitizers} for output sanitization
 * @see DESIGN-001 security architecture document
 *
 * @example
 * ```typescript
 * import {
 *   validateThemeName,
 *   validateColor,
 *   validateAgentCount,
 *   detectInjectionPatterns
 * } from './security/validators.js';
 *
 * // Theme validation
 * if (!validateThemeName(userTheme)) {
 *   throw new Error('Invalid theme');
 * }
 *
 * // Color validation
 * if (!validateColor(userColor)) {
 *   throw new Error('Invalid color');
 * }
 *
 * // Agent count bounds checking
 * if (!validateAgentCount(agents.length, 500)) {
 *   throw new Error('Too many agents');
 * }
 *
 * // Injection detection
 * const attacks = detectInjectionPatterns(userInput);
 * if (attacks.length > 0) {
 *   console.warn('Security alert:', attacks);
 * }
 * ```
 */

/**
 * Allowed theme names for Mermaid diagrams
 */
export const THEME_ALLOWLIST = [
  'light',
  'dark',
  'high-contrast-light',
  'high-contrast-dark',
  'colorblind-light',
  'colorblind-dark'
] as const;

/**
 * Mermaid reserved keywords that cannot be used as IDs
 */
export const MERMAID_RESERVED = [
  'end',
  'graph',
  'subgraph',
  'direction',
  'class',
  'style',
  'classDef',
  'click',
  'callback',
  'link',
  'linkStyle',
  'interpolate',
  'default'
] as const;

/**
 * Patterns that indicate potential Mermaid directive injection
 */
export const DIRECTIVE_PATTERNS = [
  /%%\{/g,              // Directive start
  /\}%%/g,              // Directive end
  /init\s*:/i,          // Init directive
  /config\s*:/i,        // Config directive
  /<[^>]*>/g,           // HTML tags
  /javascript:/i,       // JavaScript protocol
  /on\w+\s*=/i,         // Event handlers (onclick, onerror, etc.)
  /&[#\w]+;/g,          // HTML entities
  /<script/i,           // Script tags
  /<iframe/i,           // Iframe tags
  /data:text\/html/i    // Data URI HTML
] as const;

/**
 * Validates a theme name against the allowlist.
 *
 * @param theme - Theme name to validate
 * @returns True if theme is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateThemeName('light');        // true
 * validateThemeName('dark');         // true
 * validateThemeName('custom-theme'); // false
 * ```
 */
export function validateThemeName(theme: string): boolean {
  if (!theme || typeof theme !== 'string') {
    return false;
  }

  return (THEME_ALLOWLIST as readonly string[]).includes(theme.toLowerCase());
}

/**
 * Validates a color string (hex, rgb, rgba, named colors).
 *
 * @param color - Color string to validate
 * @returns True if color is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateColor('#FF0000');           // true
 * validateColor('rgb(255, 0, 0)');    // true
 * validateColor('rgba(255,0,0,0.5)'); // true
 * validateColor('red');               // true
 * validateColor('javascript:alert');  // false
 * ```
 */
export function validateColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = color.trim();

  // Prevent ReDoS by limiting input length (reasonable max for color strings)
  if (trimmed.length > 50) {
    return false;
  }

  // Check for injection patterns
  if (/[<>;"'`\\]/.test(trimmed)) {
    return false;
  }

  // Check for JavaScript protocol or event handlers
  if (/javascript:/i.test(trimmed) || /on\w+\s*=/i.test(trimmed)) {
    return false;
  }

  // Hex color (#RGB or #RRGGBB or #RRGGBBAA)
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    return true;
  }

  // RGB/RGBA
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(trimmed)) {
    return true;
  }

  // HSL/HSLA
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/i.test(trimmed)) {
    return true;
  }

  // Named colors (basic allowlist)
  const namedColors = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
    'teal', 'aqua', 'maroon', 'olive', 'silver', 'transparent'
  ];

  return namedColors.includes(trimmed.toLowerCase());
}

/**
 * Validates an agent count is within acceptable bounds.
 *
 * @param count - Number of agents
 * @param max - Maximum allowed agents (default: 1000)
 * @returns True if count is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateAgentCount(5);       // true
 * validateAgentCount(1500);    // false (exceeds default max)
 * validateAgentCount(1500, 2000); // true (within custom max)
 * validateAgentCount(-5);      // false (negative)
 * ```
 */
export function validateAgentCount(count: number, max: number = 1000): boolean {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return false;
  }

  if (!Number.isInteger(count)) {
    return false;
  }

  if (count < 0 || count > max) {
    return false;
  }

  return true;
}

/**
 * Detects potential injection patterns in input string.
 *
 * @param input - Input string to check
 * @returns Array of detected pattern descriptions (empty if clean)
 *
 * @example
 * ```typescript
 * detectInjectionPatterns('normal text');           // []
 * detectInjectionPatterns('%%{init: malicious}%%'); // ['Directive start', 'Init directive', 'Directive end']
 * detectInjectionPatterns('<script>alert(1)</script>'); // ['HTML tags', 'Script tags']
 * ```
 */
export function detectInjectionPatterns(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const detected: string[] = [];

  // Check each pattern
  if (/%%\{/.test(input)) {
    detected.push('Directive start');
  }

  if (/\}%%/.test(input)) {
    detected.push('Directive end');
  }

  if (/init\s*:/i.test(input)) {
    detected.push('Init directive');
  }

  if (/config\s*:/i.test(input)) {
    detected.push('Config directive');
  }

  if (/<[^>]*>/.test(input)) {
    detected.push('HTML tags');
  }

  if (/javascript:/i.test(input)) {
    detected.push('JavaScript protocol');
  }

  if (/on\w+\s*=/i.test(input)) {
    detected.push('Event handlers');
  }

  if (/&[#\w]+;/.test(input)) {
    detected.push('HTML entities');
  }

  if (/<script/i.test(input)) {
    detected.push('Script tags');
  }

  if (/<iframe/i.test(input)) {
    detected.push('Iframe tags');
  }

  if (/data:text\/html/i.test(input)) {
    detected.push('Data URI HTML');
  }

  return detected;
}

/**
 * Type guard for theme names
 */
export type ValidTheme = typeof THEME_ALLOWLIST[number];

/**
 * Validates and narrows theme type
 */
export function isValidTheme(theme: string): theme is ValidTheme {
  return validateThemeName(theme);
}
