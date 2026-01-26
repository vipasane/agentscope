/**
 * Security Sanitizers
 *
 * Output sanitization functions for AgentScope security, providing the final layer
 * of defense-in-depth protection by ensuring all output is safe for rendering.
 *
 * ## Security Model
 *
 * This module implements the output sanitization layer of DESIGN-001:
 * 1. **Escape special characters** - Prevent Mermaid syntax injection
 * 2. **Remove dangerous patterns** - Strip HTML, JavaScript, directives
 * 3. **Length limiting** - Prevent diagram rendering issues
 * 4. **Allowlist enforcement** - Only permit safe characters/patterns
 *
 * ## Sanitization Guarantees
 *
 * Each sanitizer provides specific safety guarantees:
 * - `sanitizeId`: Safe Mermaid node IDs (alphanumeric + underscore only)
 * - `sanitizeNodeLabel`: Safe node labels (escaped special chars, no HTML/JS)
 * - `sanitizePath`: Safe file paths (no traversal, within allowed dirs)
 * - `sanitizeMarkdown`: Safe markdown (no XSS via links/HTML)
 * - `sanitizeConfig`: Safe configuration objects (no functions, sanitized strings)
 *
 * ## Usage Pattern - Defense in Depth
 *
 * Always use with validation for complete protection:
 * ```typescript
 * // 1. Validate input
 * const patterns = detectInjectionPatterns(input);
 * if (patterns.length > 0) {
 *   logger.warn('Injection attempt detected', { patterns });
 * }
 *
 * // 2. Sanitize output
 * const safeId = sanitizeId(input);
 * const safeLabel = sanitizeNodeLabel(input);
 *
 * // 3. Use in diagram (now safe)
 * return `${safeId}["${safeLabel}"]`;
 * ```
 *
 * ## Performance Considerations
 *
 * - Sanitizers use non-backtracking regex to prevent ReDoS
 * - Length limits prevent excessive processing time
 * - Simple string operations (no complex parsing) for speed
 *
 * @module security/sanitizers
 * @see {@link module:security/validators} for input validation
 * @see DESIGN-001 security architecture document
 *
 * @example
 * ```typescript
 * import {
 *   sanitizeId,
 *   sanitizeNodeLabel,
 *   sanitizePath,
 *   sanitizeMarkdown,
 *   sanitizeConfig
 * } from './security/sanitizers.js';
 *
 * // Safe Mermaid node IDs
 * const id = sanitizeId('my-agent-123'); // 'my_agent_123'
 *
 * // Safe node labels with escaped special chars
 * const label = sanitizeNodeLabel('Agent [1]'); // 'Agent \\[1\\]'
 *
 * // Safe file paths (prevent traversal)
 * const path = sanitizePath('../../../etc/passwd', ['/workspace']);
 * // Returns: null (blocked traversal attempt)
 *
 * // Safe markdown content
 * const md = sanitizeMarkdown('[link](javascript:alert(1))');
 * // Returns: '[link](#)' (JavaScript removed)
 *
 * // Safe configuration objects
 * const config = sanitizeConfig({
 *   theme: 'dark',
 *   exec: () => {},  // Removed (functions blocked)
 *   nested: { value: '<script>alert(1)</script>' }  // Sanitized
 * }, ['theme', 'nested']);
 * ```
 */

import { MERMAID_RESERVED, DIRECTIVE_PATTERNS, validateThemeName, detectInjectionPatterns as detectInjectionPatternsArray } from './validators.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Re-export validateThemeName for convenience
export { validateThemeName };

/**
 * Detects potential injection patterns in input string.
 * Returns true if any injection pattern is found.
 *
 * @param input - Input string to check
 * @returns True if injection patterns detected, false otherwise
 */
export function detectInjectionPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Check for Mermaid directives
  if (/%%\{/.test(input) || /\}%%/.test(input)) {
    return true;
  }

  // Check for script tags (including with trailing space like <script >)
  if (/<script\b/i.test(input) || /<\/script/i.test(input)) {
    return true;
  }

  // Check for JavaScript protocol
  if (/javascript:/i.test(input)) {
    return true;
  }

  // Check for event handlers (onclick, onerror, onload, etc.)
  // Allow for whitespace around = sign
  if (/on\w+\s*=\s*/i.test(input)) {
    return true;
  }

  // Check for eval
  if (/\beval\s*\(/.test(input) || /\.eval\b/.test(input)) {
    return true;
  }

  return false;
}

/**
 * Sanitizes a string to be safe for use as a Mermaid node ID.
 *
 * Rules:
 * - Only allows alphanumeric characters and underscores
 * - Ensures ID starts with a letter (prefixes with 'n_' if starts with digit)
 * - Avoids Mermaid reserved words (appends '_node' if reserved)
 * - Limits length to 50 characters
 *
 * @param str - String to sanitize
 * @returns Sanitized ID safe for Mermaid
 *
 * @example
 * ```typescript
 * sanitizeId('my-agent-123');     // 'my_agent_123'
 * sanitizeId('123-agent');        // 'n_123_agent'
 * sanitizeId('end');              // 'end_node' (reserved word)
 * sanitizeId('a'.repeat(60));     // 'aaa...' (truncated to 50)
 * ```
 */
export function sanitizeId(str: string): string {
  if (!str || typeof str !== 'string') {
    return 'unknown_node';
  }

  // Replace non-alphanumeric (except underscore) with underscore
  let sanitized = str.replace(/[^a-zA-Z0-9_]/g, '_');

  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // Handle empty result
  if (!sanitized) {
    return 'unknown_node';
  }

  // Ensure starts with letter
  if (/^[0-9]/.test(sanitized)) {
    sanitized = 'n_' + sanitized;
  }

  // Avoid reserved words (case-insensitive)
  const lowerSanitized = sanitized.toLowerCase();
  if (MERMAID_RESERVED.includes(lowerSanitized as any)) {
    sanitized = sanitized + '_node';
  }

  // Limit length (leave room for potential '_node' suffix)
  if (sanitized.length > 50) {
    sanitized = sanitized.slice(0, 50);
  }

  return sanitized;
}

/**
 * Sanitizes a string to be safe for use as a Mermaid node label.
 *
 * Rules:
 * - Limits length to 100 characters
 * - Escapes special Mermaid characters: []{}()#|;>
 * - Blocks directive patterns (%%{, }%%, etc.)
 * - Removes or escapes HTML tags
 * - Blocks JavaScript protocols and event handlers
 *
 * @param label - Label string to sanitize
 * @returns Sanitized label safe for Mermaid
 *
 * @example
 * ```typescript
 * sanitizeNodeLabel('My Agent');              // 'My Agent'
 * sanitizeNodeLabel('Agent [1]');             // 'Agent \\[1\\]'
 * sanitizeNodeLabel('%%{init: bad}%%');       // 'init: bad' (directives stripped)
 * sanitizeNodeLabel('<script>alert()</script>'); // 'alert()' (tags removed)
 * ```
 */
export function sanitizeNodeLabel(label: string): string {
  if (!label || typeof label !== 'string') {
    return '';
  }

  let sanitized = label;

  // Remove directive patterns
  for (const pattern of DIRECTIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove HTML tags but keep content
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove JavaScript protocols
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Escape special Mermaid characters
  const specialChars: { [key: string]: string } = {
    '[': '\\[',
    ']': '\\]',
    '{': '\\{',
    '}': '\\}',
    '(': '\\(',
    ')': '\\)',
    '#': '\\#',
    '|': '\\|',
    ';': '\\;',
    '>': '\\>',
    '"': '\\"'
  };

  for (const [char, escaped] of Object.entries(specialChars)) {
    sanitized = sanitized.split(char).join(escaped);
  }

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.slice(0, 97) + '...';
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitizes a file path to prevent path traversal attacks.
 *
 * Rules:
 * - Resolves to absolute path
 * - Checks for '..' sequences (path traversal)
 * - Verifies path is within allowed directories
 * - Returns null if path is invalid or outside allowed directories
 *
 * @param inputPath - Path to sanitize
 * @param allowedDirs - Array of allowed base directories (absolute paths)
 * @returns Sanitized absolute path or null if invalid
 *
 * @example
 * ```typescript
 * sanitizePath('./file.txt', ['/workspace']);     // '/workspace/file.txt'
 * sanitizePath('../../../etc/passwd', ['/workspace']); // null (traversal)
 * sanitizePath('/tmp/file', ['/workspace']);      // null (outside allowed)
 * ```
 */
export function sanitizePath(inputPath: string, allowedDirs: string[]): string | null {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }

  if (!allowedDirs || allowedDirs.length === 0) {
    return null;
  }

  try {
    // Normalize allowed directories
    const normalizedAllowed = allowedDirs.map(dir => path.resolve(dir));

    // Resolve to absolute path
    let resolvedPath = path.resolve(inputPath);

    // Check for path traversal patterns in the original input
    if (inputPath.includes('..')) {
      // Allow '..' only if resolved path is still within allowed dirs
      const isWithinAllowed = normalizedAllowed.some(allowedDir => {
        const relative = path.relative(allowedDir, resolvedPath);
        return !relative.startsWith('..') && !path.isAbsolute(relative);
      });

      if (!isWithinAllowed) {
        return null;
      }
    }

    // Check if resolved path is within any allowed directory
    const isInAllowedDir = normalizedAllowed.some(allowedDir => {
      const relative = path.relative(allowedDir, resolvedPath);
      // Path is within allowedDir if relative path doesn't start with '..' and isn't absolute
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    });

    if (!isInAllowedDir) {
      return null;
    }

    // Check for suspicious characters
    if (/[<>"|?*\0]/.test(resolvedPath)) {
      return null;
    }

    return resolvedPath;
  } catch (error) {
    // Path resolution failed
    return null;
  }
}

/**
 * Sanitizes configuration object keys and values.
 *
 * @param config - Configuration object to sanitize
 * @param allowedKeys - Optional array of allowed keys (whitelist)
 * @returns Sanitized configuration object
 *
 * @example
 * ```typescript
 * sanitizeConfig({ theme: 'light', malicious: 'bad' }, ['theme']);
 * // Returns: { theme: 'light' }
 * ```
 */
export function sanitizeConfig<T extends Record<string, any>>(
  config: T,
  allowedKeys?: string[]
): Partial<T> {
  if (!config || typeof config !== 'object') {
    return {};
  }

  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(config)) {
    // Check if key is allowed (if whitelist provided)
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    // Skip function values (security risk)
    if (typeof value === 'function') {
      continue;
    }

    // Skip symbol keys
    if (typeof key === 'symbol') {
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeConfig(value, allowedKeys) as any;
    } else if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key as keyof T] = sanitizeNodeLabel(value) as any;
    } else {
      // Keep primitive values (number, boolean, null)
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes markdown content to prevent XSS in rendered output.
 *
 * @param markdown - Markdown content to sanitize
 * @returns Sanitized markdown
 *
 * @example
 * ```typescript
 * sanitizeMarkdown('# Title\n[link](javascript:alert(1))');
 * // Returns: '# Title\n[link](#)' (JavaScript protocol removed)
 * ```
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let sanitized = markdown;

  // Remove JavaScript protocols in links
  sanitized = sanitized.replace(/\[([^\]]+)\]\(javascript:[^)]*\)/gi, '[$1](#)');

  // Remove data URIs with HTML content
  sanitized = sanitized.replace(/\[([^\]]+)\]\(data:text\/html[^)]*\)/gi, '[$1](#)');

  // Remove inline HTML script tags
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove inline event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  return sanitized;
}
