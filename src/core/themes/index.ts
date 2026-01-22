/**
 * Theme System Public API
 * Provides theming support for Mermaid diagrams
 */

// Types
export type {
  ThemeColor,
  ThemePalette,
  ThemeResolveOptions,
  MermaidThemeConfig,
  MermaidBaseTheme,
  ThemeName,
  ThemeValidationResult,
  ThemePlugin,
  ColorScheme,
  AccessibilityLevel,
  HexColor,
  DeepPartial,
} from './types.js';

// Registry
export {
  ThemeRegistry,
  getThemeRegistry,
  getTheme,
  getThemeOrDefault,
  isBuiltinTheme,
} from './registry.js';

// Loader
export {
  ThemeLoader,
  resolveTheme,
  type ThemeResolutionResult,
} from './loader.js';

// Generator
export {
  MermaidThemeGenerator,
  createThemeGenerator,
  generateMermaidInit,
  generateClassDefs,
} from './generator.js';

// Palettes
export {
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  colorblindLightTheme,
  colorblindDarkTheme,
  builtinPalettes,
  defaultTheme,
} from './palettes/index.js';
