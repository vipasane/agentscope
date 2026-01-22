/**
 * Mermaid Theme Generator
 * Transforms theme palettes into Mermaid-compatible styling
 */

import type { ThemePalette, MermaidThemeConfig, ThemeColor, MermaidBaseTheme } from './types.js';
import { getThemeOrDefault } from './registry.js';

/**
 * Mermaid Theme Generator
 * Converts ThemePalette to Mermaid init directives and classDef statements
 */
export class MermaidThemeGenerator {
  private palette: ThemePalette;
  private mermaidConfig: MermaidThemeConfig;

  constructor(palette?: ThemePalette | string) {
    if (typeof palette === 'string') {
      this.palette = getThemeOrDefault(palette);
    } else {
      this.palette = palette ?? getThemeOrDefault(undefined);
    }

    this.mermaidConfig = this.generateMermaidConfig();
  }

  /**
   * Get the Mermaid init directive
   */
  getInit(): string {
    const config = {
      theme: this.mermaidConfig.theme,
      themeVariables: this.mermaidConfig.themeVariables,
    };

    return `%%{init: ${JSON.stringify(config)}}%%`;
  }

  /**
   * Get class definitions for styling
   */
  getClassDefs(): string[] {
    return this.mermaidConfig.classDefs;
  }

  /**
   * Get link style definitions
   */
  getLinkStyles(): string[] {
    return this.mermaidConfig.linkStyles;
  }

  /**
   * Get all styling lines (init + classDefs + linkStyles)
   */
  getAllStyles(): string[] {
    return [
      this.getInit(),
      '',
      ...this.mermaidConfig.classDefs,
      '',
      ...this.mermaidConfig.linkStyles,
    ].filter(line => line !== '' || this.mermaidConfig.linkStyles.length > 0);
  }

  /**
   * Apply class to a node
   */
  applyClass(nodeId: string, className: string): string {
    return `class ${nodeId} ${className}`;
  }

  /**
   * Get the appropriate class name for an agent type
   */
  getAgentClass(agentType: string): string {
    const typeMap: Record<string, string> = {
      coordinator: 'coordinator',
      worker: 'worker',
      specialist: 'specialist',
      reviewer: 'reviewer',
    };

    return typeMap[agentType.toLowerCase()] ?? 'custom';
  }

  /**
   * Get the current palette
   */
  getPalette(): ThemePalette {
    return this.palette;
  }

  /**
   * Get the Mermaid config
   */
  getMermaidConfig(): MermaidThemeConfig {
    return this.mermaidConfig;
  }

  /**
   * Generate Mermaid configuration from palette
   */
  private generateMermaidConfig(): MermaidThemeConfig {
    return {
      theme: this.getMermaidBaseTheme(),
      themeVariables: this.generateThemeVariables(),
      classDefs: this.generateClassDefs(),
      linkStyles: this.generateLinkStyles(),
    };
  }

  /**
   * Determine the appropriate Mermaid base theme
   */
  private getMermaidBaseTheme(): MermaidBaseTheme {
    switch (this.palette.scheme) {
      case 'dark':
        return 'dark';
      case 'high-contrast':
        // Use 'base' for high contrast to have full control
        return 'base';
      case 'light':
      default:
        return 'default';
    }
  }

  /**
   * Generate Mermaid theme variables
   */
  private generateThemeVariables(): Record<string, string> {
    const { chrome, elements } = this.palette;

    return {
      // Background colors
      background: chrome.background,
      primaryBorderColor: chrome.border,
      primaryTextColor: chrome.text,
      secondaryTextColor: chrome.muted,

      // Node colors (defaults, can be overridden by classDef)
      primaryColor: elements.subgraph.fill,
      secondaryColor: elements.skill.fill,
      tertiaryColor: elements.hook.fill,

      // Line colors
      lineColor: chrome.border,

      // Font
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    };
  }

  /**
   * Generate classDef statements for all node types
   */
  private generateClassDefs(): string[] {
    const defs: string[] = [];

    // Agent classes
    defs.push(this.generateClassDef('coordinator', this.palette.agents.coordinator));
    defs.push(this.generateClassDef('worker', this.palette.agents.worker));
    defs.push(this.generateClassDef('specialist', this.palette.agents.specialist));
    defs.push(this.generateClassDef('reviewer', this.palette.agents.reviewer));
    defs.push(this.generateClassDef('custom', this.palette.agents.custom));

    // Element classes
    defs.push(this.generateClassDef('input', this.palette.elements.input));
    defs.push(this.generateClassDef('output', this.palette.elements.output));
    defs.push(this.generateClassDef('hook', this.palette.elements.hook));
    defs.push(this.generateClassDef('mcp', this.palette.elements.mcp));
    defs.push(this.generateClassDef('skill', this.palette.elements.skill));
    defs.push(this.generateClassDef('subgraph_style', this.palette.elements.subgraph));

    // Utility classes
    defs.push(this.generateMoreClass());
    defs.push(this.generateCategoryClass());

    return defs;
  }

  /**
   * Generate a single classDef statement
   */
  private generateClassDef(name: string, color: ThemeColor): string {
    const parts: string[] = [
      `fill:${color.fill}`,
      `stroke:${color.stroke}`,
    ];

    if (color.text) {
      parts.push(`color:${color.text}`);
    }

    if (color.strokeWidth !== undefined) {
      parts.push(`stroke-width:${color.strokeWidth}px`);
    }

    if (color.strokeDasharray) {
      parts.push(`stroke-dasharray:${color.strokeDasharray}`);
    }

    return `classDef ${name} ${parts.join(',')}`;
  }

  /**
   * Generate class for "more" nodes (collapsed items)
   */
  private generateMoreClass(): string {
    const { chrome } = this.palette;
    const isLight = this.palette.scheme === 'light';

    return `classDef more fill:${isLight ? '#f5f5f5' : '#2a2a2a'},stroke:${chrome.muted},stroke-dasharray:3 3,color:${chrome.muted}`;
  }

  /**
   * Generate class for category nodes
   */
  private generateCategoryClass(): string {
    const { elements, chrome } = this.palette;

    return `classDef category fill:${elements.subgraph.fill},stroke:${elements.subgraph.stroke},stroke-width:2px,color:${chrome.text}`;
  }

  /**
   * Generate link style definitions
   */
  private generateLinkStyles(): string[] {
    // Mermaid doesn't support named link styles in the same way as node classes
    // Instead, we use linkStyle with index numbers
    // For now, we'll return comments documenting the intended styles
    const { links } = this.palette;

    return [
      `%% Link styles (apply with linkStyle N ...)`,
      `%% Delegation: stroke:${links.delegation.stroke},stroke-width:${links.delegation.strokeWidth ?? 2}px`,
      `%% Tool: stroke:${links.tool.stroke},stroke-width:${links.tool.strokeWidth ?? 1}px${links.tool.strokeDasharray ? `,stroke-dasharray:${links.tool.strokeDasharray}` : ''}`,
      `%% Data: stroke:${links.data.stroke},stroke-width:${links.data.strokeWidth ?? 1}px`,
    ];
  }
}

/**
 * Convenience function to create a theme generator
 */
export function createThemeGenerator(theme?: ThemePalette | string): MermaidThemeGenerator {
  return new MermaidThemeGenerator(theme);
}

/**
 * Generate Mermaid init directive for a theme
 */
export function generateMermaidInit(theme?: ThemePalette | string): string {
  return new MermaidThemeGenerator(theme).getInit();
}

/**
 * Generate class definitions for a theme
 */
export function generateClassDefs(theme?: ThemePalette | string): string[] {
  return new MermaidThemeGenerator(theme).getClassDefs();
}
