/**
 * Theme Loader
 * Resolves and loads theme configuration from various sources
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import type { ThemePalette, ThemeResolveOptions, DeepPartial } from './types.js';
import { getThemeRegistry, isBuiltinTheme } from './registry.js';

/**
 * Environment variable for theme
 */
const THEME_ENV_VAR = 'AGENTSCOPE_THEME';

/**
 * Config file name
 */
const CONFIG_FILE_NAME = 'agentscope.config.json';

/**
 * Maximum custom theme file size (100KB)
 */
const MAX_THEME_FILE_SIZE = 100 * 1024;

/**
 * Theme configuration from config file
 */
interface ConfigFileTheme {
  theme?: string;
  themePath?: string;
  themeOverrides?: DeepPartial<ThemePalette>;
}

/**
 * Theme resolution result
 */
export interface ThemeResolutionResult {
  theme: ThemePalette;
  source: 'cli' | 'config' | 'env' | 'default';
  warnings: string[];
}

/**
 * Theme Loader - resolves themes from multiple sources
 *
 * Resolution priority (highest to lowest):
 * 1. CLI --theme option
 * 2. CLI --theme-path custom file
 * 3. Config file theme property
 * 4. Environment variable AGENTSCOPE_THEME
 * 5. Default theme (light)
 */
export class ThemeLoader {
  private configDir: string;

  constructor(configDir: string = process.cwd()) {
    this.configDir = configDir;
  }

  /**
   * Resolve theme based on options and configuration
   */
  resolve(options: ThemeResolveOptions = {}): ThemeResolutionResult {
    const warnings: string[] = [];
    const registry = getThemeRegistry();

    // 1. CLI --theme option (highest priority)
    if (options.cliTheme) {
      const sanitizedName = this.sanitizeThemeName(options.cliTheme);

      if (!isBuiltinTheme(sanitizedName) && !registry.has(sanitizedName)) {
        warnings.push(`Unknown theme "${options.cliTheme}", falling back to default`);
      } else {
        const theme = registry.getOrDefault(sanitizedName);
        return this.applyOverrides(theme, options.overrides, 'cli', warnings);
      }
    }

    // 2. CLI --theme-path custom file
    if (options.themePath) {
      try {
        const customTheme = this.loadCustomTheme(options.themePath);
        return this.applyOverrides(customTheme, options.overrides, 'cli', warnings);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Failed to load custom theme: ${message}`);
      }
    }

    // 3. Config file
    const configTheme = this.loadFromConfig();
    if (configTheme) {
      if (configTheme.themePath) {
        try {
          const customTheme = this.loadCustomTheme(configTheme.themePath);
          const mergedOverrides = this.mergeOverrides(configTheme.themeOverrides, options.overrides);
          return this.applyOverrides(customTheme, mergedOverrides, 'config', warnings);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          warnings.push(`Failed to load custom theme from config: ${message}`);
        }
      }

      if (configTheme.theme) {
        const theme = registry.getOrDefault(configTheme.theme);
        const mergedOverrides = this.mergeOverrides(configTheme.themeOverrides, options.overrides);
        return this.applyOverrides(theme, mergedOverrides, 'config', warnings);
      }
    }

    // 4. Environment variable
    const envTheme = process.env[THEME_ENV_VAR];
    if (envTheme) {
      const sanitizedName = this.sanitizeThemeName(envTheme);
      if (registry.has(sanitizedName)) {
        const theme = registry.get(sanitizedName)!;
        return this.applyOverrides(theme, options.overrides, 'env', warnings);
      }
      warnings.push(`Unknown theme in ${THEME_ENV_VAR}: "${envTheme}"`);
    }

    // 5. Default
    const theme = registry.getDefault();
    return this.applyOverrides(theme, options.overrides, 'default', warnings);
  }

  /**
   * Load theme configuration from config file
   */
  private loadFromConfig(): ConfigFileTheme | null {
    const configPath = resolve(this.configDir, CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
      return null;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content) as Record<string, unknown>;

      return {
        theme: typeof config.theme === 'string' ? config.theme : undefined,
        themePath: typeof config.themePath === 'string' ? config.themePath : undefined,
        themeOverrides: config.themeOverrides as DeepPartial<ThemePalette> | undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Load a custom theme from file
   */
  loadCustomTheme(themePath: string): ThemePalette {
    // Security: validate path
    const absolutePath = isAbsolute(themePath)
      ? themePath
      : resolve(this.configDir, themePath);

    // Security: prevent path traversal
    if (!absolutePath.startsWith(this.configDir) && !isAbsolute(themePath)) {
      throw new Error('Theme path must be within the project directory');
    }

    // Security: check file exists
    if (!existsSync(absolutePath)) {
      throw new Error(`Theme file not found: ${themePath}`);
    }

    // Security: check file size
    const stats = require('fs').statSync(absolutePath);
    if (stats.size > MAX_THEME_FILE_SIZE) {
      throw new Error(`Theme file too large (max ${MAX_THEME_FILE_SIZE / 1024}KB)`);
    }

    // Security: only allow .json extension
    if (!absolutePath.endsWith('.json')) {
      throw new Error('Theme file must be a .json file');
    }

    const content = readFileSync(absolutePath, 'utf-8');
    const theme = JSON.parse(content) as unknown as ThemePalette;

    // Validate the loaded theme
    const registry = getThemeRegistry();
    const validation = registry.validate(theme);

    if (!validation.valid) {
      throw new Error(`Invalid theme file: ${validation.errors.join(', ')}`);
    }

    return theme;
  }

  /**
   * Apply overrides to a theme
   */
  private applyOverrides(
    theme: ThemePalette,
    overrides: DeepPartial<ThemePalette> | undefined,
    source: ThemeResolutionResult['source'],
    warnings: string[]
  ): ThemeResolutionResult {
    if (!overrides) {
      return { theme, source, warnings };
    }

    const merged = this.deepMerge(
      theme as unknown as Record<string, unknown>,
      overrides as unknown as Record<string, unknown>
    ) as unknown as ThemePalette;
    return { theme: merged, source, warnings };
  }

  /**
   * Merge two sets of overrides
   */
  private mergeOverrides(
    base: DeepPartial<ThemePalette> | undefined,
    override: DeepPartial<ThemePalette> | undefined
  ): DeepPartial<ThemePalette> | undefined {
    if (!base && !override) return undefined;
    if (!base) return override;
    if (!override) return base;
    return this.deepMerge(
      base as unknown as Record<string, unknown>,
      override as unknown as Record<string, unknown>
    ) as unknown as DeepPartial<ThemePalette>;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }

    return result;
  }

  /**
   * Sanitize theme name
   */
  private sanitizeThemeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
}

/**
 * Convenience function to resolve a theme
 */
export function resolveTheme(options: ThemeResolveOptions = {}): ThemeResolutionResult {
  const loader = new ThemeLoader();
  return loader.resolve(options);
}
