/**
 * Theme Registry
 * Stores and manages available theme palettes
 */

import type { ThemePalette, ThemeName, ThemeValidationResult } from './types.js';
import { builtinPalettes, defaultTheme } from './palettes/index.js';

/**
 * Hex color validation regex
 */
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Allowed theme names (for security validation)
 */
const ALLOWED_THEME_NAMES: ReadonlySet<string> = new Set([
  'light',
  'dark',
  'high-contrast-light',
  'high-contrast-dark',
  'colorblind-light',
  'colorblind-dark',
]);

/**
 * Theme Registry - manages theme palette storage and retrieval
 */
export class ThemeRegistry {
  private static instance: ThemeRegistry;
  private themes: Map<string, ThemePalette> = new Map();
  private defaultThemeId: string = 'light';

  private constructor() {
    // Register built-in themes
    for (const palette of builtinPalettes) {
      this.themes.set(palette.id, palette);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ThemeRegistry {
    if (!ThemeRegistry.instance) {
      ThemeRegistry.instance = new ThemeRegistry();
    }
    return ThemeRegistry.instance;
  }

  /**
   * Reset registry to defaults (for testing)
   */
  static reset(): void {
    ThemeRegistry.instance = new ThemeRegistry();
  }

  /**
   * Register a new theme palette
   */
  register(theme: ThemePalette): ThemeValidationResult {
    const validation = this.validate(theme);
    if (!validation.valid) {
      return validation;
    }

    this.themes.set(theme.id, theme);
    return validation;
  }

  /**
   * Get a theme by name
   */
  get(name: string): ThemePalette | undefined {
    // Security: sanitize input
    const sanitizedName = this.sanitizeThemeName(name);
    return this.themes.get(sanitizedName);
  }

  /**
   * Get theme by name, falling back to default
   */
  getOrDefault(name: string | undefined): ThemePalette {
    if (!name) {
      return this.getDefault();
    }

    const theme = this.get(name);
    return theme ?? this.getDefault();
  }

  /**
   * Get the default theme
   */
  getDefault(): ThemePalette {
    return this.themes.get(this.defaultThemeId) ?? defaultTheme;
  }

  /**
   * Set the default theme
   */
  setDefault(name: string): boolean {
    const sanitizedName = this.sanitizeThemeName(name);
    if (this.themes.has(sanitizedName)) {
      this.defaultThemeId = sanitizedName;
      return true;
    }
    return false;
  }

  /**
   * Check if a theme exists
   */
  has(name: string): boolean {
    const sanitizedName = this.sanitizeThemeName(name);
    return this.themes.has(sanitizedName);
  }

  /**
   * List all available theme names
   */
  list(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Get all themes
   */
  getAll(): ThemePalette[] {
    return Array.from(this.themes.values());
  }

  /**
   * Unregister a theme (cannot unregister built-in themes)
   */
  unregister(name: string): boolean {
    const sanitizedName = this.sanitizeThemeName(name);

    // Prevent unregistering built-in themes
    if (ALLOWED_THEME_NAMES.has(sanitizedName)) {
      return false;
    }

    return this.themes.delete(sanitizedName);
  }

  /**
   * Validate a theme palette
   */
  validate(theme: ThemePalette): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate ID
    if (!theme.id || typeof theme.id !== 'string') {
      errors.push('Theme ID is required and must be a string');
    } else if (!/^[a-z][a-z0-9-]*$/.test(theme.id)) {
      errors.push('Theme ID must start with a letter and contain only lowercase letters, numbers, and hyphens');
    }

    // Validate name
    if (!theme.name || typeof theme.name !== 'string') {
      errors.push('Theme name is required and must be a string');
    }

    // Validate scheme
    if (!['light', 'dark', 'high-contrast'].includes(theme.scheme)) {
      errors.push('Theme scheme must be "light", "dark", or "high-contrast"');
    }

    // Validate agent colors
    if (!theme.agents) {
      errors.push('Theme must define agent colors');
    } else {
      const agentTypes = ['coordinator', 'worker', 'specialist', 'reviewer', 'custom'];
      for (const type of agentTypes) {
        const color = theme.agents[type as keyof typeof theme.agents];
        if (!color) {
          errors.push(`Theme must define color for agent type: ${type}`);
        } else {
          this.validateColor(color, `agents.${type}`, errors, warnings);
        }
      }
    }

    // Validate element colors
    if (!theme.elements) {
      errors.push('Theme must define element colors');
    } else {
      const elementTypes = ['input', 'output', 'hook', 'mcp', 'skill', 'subgraph'];
      for (const type of elementTypes) {
        const color = theme.elements[type as keyof typeof theme.elements];
        if (!color) {
          errors.push(`Theme must define color for element type: ${type}`);
        } else {
          this.validateColor(color, `elements.${type}`, errors, warnings);
        }
      }
    }

    // Validate link colors
    if (!theme.links) {
      errors.push('Theme must define link colors');
    } else {
      const linkTypes = ['delegation', 'tool', 'data'];
      for (const type of linkTypes) {
        const color = theme.links[type as keyof typeof theme.links];
        if (!color) {
          errors.push(`Theme must define color for link type: ${type}`);
        } else {
          this.validateColor(color, `links.${type}`, errors, warnings);
        }
      }
    }

    // Validate chrome colors
    if (!theme.chrome) {
      errors.push('Theme must define chrome colors');
    } else {
      const chromeProps = ['background', 'border', 'text', 'muted'];
      for (const prop of chromeProps) {
        const value = theme.chrome[prop as keyof typeof theme.chrome];
        if (!value || !HEX_COLOR_REGEX.test(value)) {
          errors.push(`Theme chrome.${prop} must be a valid hex color`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single color definition
   */
  private validateColor(
    color: { fill: string; stroke: string; text?: string; strokeWidth?: number },
    path: string,
    errors: string[],
    warnings: string[]
  ): void {
    // fill can be 'none' or a hex color
    if (!color.fill || (color.fill !== 'none' && !HEX_COLOR_REGEX.test(color.fill))) {
      errors.push(`${path}.fill must be a valid hex color or 'none'`);
    }

    if (!color.stroke || !HEX_COLOR_REGEX.test(color.stroke)) {
      errors.push(`${path}.stroke must be a valid hex color`);
    }

    if (color.text && !HEX_COLOR_REGEX.test(color.text)) {
      errors.push(`${path}.text must be a valid hex color if provided`);
    }

    if (color.strokeWidth !== undefined) {
      if (typeof color.strokeWidth !== 'number' || color.strokeWidth < 0 || color.strokeWidth > 10) {
        warnings.push(`${path}.strokeWidth should be between 0 and 10`);
      }
    }
  }

  /**
   * Sanitize theme name to prevent injection attacks
   */
  private sanitizeThemeName(name: string): string {
    // Only allow alphanumeric characters and hyphens
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
}

/**
 * Get the global theme registry instance
 */
export function getThemeRegistry(): ThemeRegistry {
  return ThemeRegistry.getInstance();
}

/**
 * Convenience function to get a theme by name
 */
export function getTheme(name: string): ThemePalette | undefined {
  return ThemeRegistry.getInstance().get(name);
}

/**
 * Convenience function to get theme or default
 */
export function getThemeOrDefault(name: string | undefined): ThemePalette {
  return ThemeRegistry.getInstance().getOrDefault(name);
}

/**
 * Check if a theme name is a built-in theme
 */
export function isBuiltinTheme(name: string): boolean {
  return ALLOWED_THEME_NAMES.has(name.toLowerCase());
}
