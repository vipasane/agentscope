/**
 * Theme System Types
 * Defines interfaces for the Mermaid theme system
 */

/**
 * Hex color string type
 */
export type HexColor = `#${string}`;

/**
 * Color definition with accessibility metadata
 */
export interface ThemeColor {
  /** Primary fill color (hex or 'none') */
  fill: HexColor | 'none';
  /** Border/stroke color (hex) */
  stroke: HexColor;
  /** Text color (hex, defaults to stroke if not specified) */
  text?: HexColor;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Optional stroke dash array for dashed lines */
  strokeDasharray?: string;
}

/**
 * Color scheme type
 */
export type ColorScheme = 'light' | 'dark' | 'high-contrast';

/**
 * Accessibility compliance level
 */
export type AccessibilityLevel = 'AA' | 'AAA' | 'colorblind-safe';

/**
 * Complete theme palette
 */
export interface ThemePalette {
  /** Unique theme identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Theme description */
  description?: string;
  /** Color scheme type */
  scheme: ColorScheme;
  /** Accessibility compliance level */
  accessibility?: AccessibilityLevel;

  /** Agent type colors */
  agents: {
    coordinator: ThemeColor;
    worker: ThemeColor;
    specialist: ThemeColor;
    reviewer: ThemeColor;
    custom: ThemeColor;
  };

  /** Diagram element colors */
  elements: {
    input: ThemeColor;
    output: ThemeColor;
    hook: ThemeColor;
    mcp: ThemeColor;
    skill: ThemeColor;
    subgraph: ThemeColor;
  };

  /** Connection/link styles */
  links: {
    delegation: ThemeColor;
    tool: ThemeColor;
    data: ThemeColor;
  };

  /** Background and chrome */
  chrome: {
    background: HexColor;
    border: HexColor;
    text: HexColor;
    muted: HexColor;
  };
}

/**
 * Theme resolution options
 */
export interface ThemeResolveOptions {
  /** Theme name from CLI */
  cliTheme?: string;
  /** Path to custom theme file */
  themePath?: string;
  /** Override specific colors */
  overrides?: DeepPartial<ThemePalette>;
}

/**
 * Mermaid base theme names
 */
export type MermaidBaseTheme = 'base' | 'default' | 'dark' | 'forest' | 'neutral';

/**
 * Mermaid-specific theme configuration
 */
export interface MermaidThemeConfig {
  /** Theme name for Mermaid init */
  theme: MermaidBaseTheme;
  /** Theme variables for customization */
  themeVariables: Record<string, string>;
  /** Generated class definitions */
  classDefs: string[];
  /** Link style definitions */
  linkStyles: string[];
}

/**
 * Available theme names
 */
export type ThemeName =
  | 'light'
  | 'dark'
  | 'high-contrast-light'
  | 'high-contrast-dark'
  | 'colorblind-light'
  | 'colorblind-dark';

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Deep partial type for nested overrides
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Theme plugin interface for extensibility
 */
export interface ThemePlugin {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Themes provided by this plugin */
  themes: ThemePalette[];
  /** Optional initialization */
  init?: () => Promise<void>;
}
