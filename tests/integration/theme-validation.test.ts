/**
 * Theme Validation Integration Tests
 * Generates actual Mermaid diagrams with each theme to validate rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MermaidThemeGenerator,
  createThemeGenerator,
} from '../../src/core/themes/generator.js';
import {
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  colorblindLightTheme,
  colorblindDarkTheme,
  builtinPalettes,
} from '../../src/core/themes/palettes/index.js';
import { ThemeRegistry } from '../../src/core/themes/registry.js';
import { generateHierarchy } from '../../src/core/generators/diagrams/hierarchy.js';
import { generateComponentMap } from '../../src/core/generators/diagrams/component-map.js';
import type { AgentScopeConfig, Agent, McpServer, Skill } from '../../src/core/model/types.js';

// Sample config for testing
function createTestConfig(): AgentScopeConfig {
  const agents: Agent[] = [
    { name: 'coordinator', path: '.claude/agents/coordinator.md', type: 'coordinator', delegatesTo: ['worker', 'specialist'] },
    { name: 'worker', path: '.claude/agents/worker.md', type: 'worker', tools: ['github'] },
    { name: 'specialist', path: '.claude/agents/specialist.md', type: 'specialist' },
    { name: 'reviewer', path: '.claude/agents/reviewer.md', type: 'reviewer' },
  ];

  const skills: Skill[] = [
    { name: 'code-review', path: '.claude/skills/code-review/SKILL.md' },
    { name: 'testing', path: '.claude/skills/testing/SKILL.md' },
  ];

  const mcpServers: McpServer[] = [
    { name: 'github', command: 'npx', args: ['@github/mcp-server'] },
    { name: 'filesystem', command: 'npx', args: ['@fs/mcp-server'] },
  ];

  return {
    agents,
    skills,
    hooks: [],
    commands: [],
    mcpServers,
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.0.0',
      duration: 100,
      filesScanned: 10,
      errors: [],
    },
  };
}

describe('Theme Validation - All 6 Themes', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  describe('Theme Init Directives', () => {
    it.each(builtinPalettes.map(t => [t.id, t]))(
      '%s theme should generate valid init directive',
      (_, theme) => {
        const generator = new MermaidThemeGenerator(theme);
        const init = generator.getInit();

        // Must be valid Mermaid init format
        expect(init).toMatch(/^%%\{init:/);
        expect(init).toMatch(/\}%%$/);

        // Must contain theme setting
        expect(init).toContain('"theme"');

        // Must be valid JSON inside
        const jsonMatch = init.match(/%%\{init:\s*({.*})\s*\}%%/);
        expect(jsonMatch).toBeTruthy();
        expect(() => JSON.parse(jsonMatch![1])).not.toThrow();
      }
    );

    it('light theme should use default base theme', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const init = generator.getInit();
      expect(init).toContain('"theme":"default"');
    });

    it('dark theme should use dark base theme', () => {
      const generator = new MermaidThemeGenerator(darkTheme);
      const init = generator.getInit();
      expect(init).toContain('"theme":"dark"');
    });

    it('high-contrast-light should use base theme for full customization', () => {
      const generator = new MermaidThemeGenerator(highContrastLightTheme);
      const init = generator.getInit();
      // High contrast uses "base" theme to allow complete color customization
      expect(init).toContain('"theme":"base"');
    });

    it('high-contrast-dark should use base theme for full customization', () => {
      const generator = new MermaidThemeGenerator(highContrastDarkTheme);
      const init = generator.getInit();
      // High contrast uses "base" theme to allow complete color customization
      expect(init).toContain('"theme":"base"');
    });
  });

  describe('Theme Class Definitions', () => {
    it.each(builtinPalettes.map(t => [t.id, t]))(
      '%s theme should generate all required class definitions',
      (_, theme) => {
        const generator = new MermaidThemeGenerator(theme);
        const classDefs = generator.getClassDefs();

        // Must have all agent classes
        const requiredAgentClasses = ['coordinator', 'worker', 'specialist', 'reviewer', 'custom'];
        for (const cls of requiredAgentClasses) {
          expect(classDefs.some(d => d.startsWith(`classDef ${cls}`))).toBe(true);
        }

        // Must have element classes
        const requiredElementClasses = ['input', 'output', 'hook', 'mcp', 'skill'];
        for (const cls of requiredElementClasses) {
          expect(classDefs.some(d => d.startsWith(`classDef ${cls}`))).toBe(true);
        }
      }
    );

    it.each(builtinPalettes.map(t => [t.id, t]))(
      '%s theme class definitions should have valid hex colors',
      (_, theme) => {
        const generator = new MermaidThemeGenerator(theme);
        const classDefs = generator.getClassDefs();

        const hexColorRegex = /#[0-9A-Fa-f]{6}/g;
        for (const def of classDefs) {
          const colors = def.match(hexColorRegex);
          if (colors) {
            for (const color of colors) {
              expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
            }
          }
        }
      }
    );
  });

  describe('Full Diagram Generation', () => {
    const config = createTestConfig();

    it.each(builtinPalettes.map(t => [t.id, t]))(
      '%s theme should generate complete hierarchy diagram',
      (themeId, _) => {
        const result = generateHierarchy(config, { theme: themeId });

        // Must have mermaid code block
        expect(result).toContain('```mermaid');
        expect(result).toContain('```');

        // Must have init directive
        expect(result).toContain('%%{init:');

        // Must have graph direction
        expect(result).toContain('graph');

        // Must have class definitions
        expect(result).toContain('classDef');

        // Must have all agents
        expect(result).toContain('coordinator');
        expect(result).toContain('worker');
        expect(result).toContain('specialist');
        expect(result).toContain('reviewer');
      }
    );

    it.each(builtinPalettes.map(t => [t.id, t]))(
      '%s theme should generate complete component map',
      (themeId, _) => {
        const result = generateComponentMap(config, { theme: themeId });

        // Must have mermaid code block
        expect(result).toContain('```mermaid');
        expect(result).toContain('```');

        // Must have init directive
        expect(result).toContain('%%{init:');

        // Must have class definitions
        expect(result).toContain('classDef coordinator');
        expect(result).toContain('classDef worker');
        expect(result).toContain('classDef mcp');
        expect(result).toContain('classDef skill');
      }
    );
  });

  describe('Dark Theme Contrast Validation', () => {
    it('dark theme should have darker fill colors than light theme', () => {
      // Compare coordinator fill colors
      const lightFill = parseInt(lightTheme.agents.coordinator.fill.slice(1), 16);
      const darkFill = parseInt(darkTheme.agents.coordinator.fill.slice(1), 16);

      // Dark fill should have lower RGB values overall (darker)
      expect(darkFill).toBeLessThan(lightFill);
    });

    it('dark theme chrome should have dark background', () => {
      const bgColor = parseInt(darkTheme.chrome.background.slice(1), 16);
      // Dark background should have low RGB values (close to black)
      expect(bgColor).toBeLessThan(0x404040); // Darker than gray
    });

    it('dark theme text should be light for contrast', () => {
      const textColor = parseInt(darkTheme.chrome.text.slice(1), 16);
      // Text should be light (high RGB values)
      expect(textColor).toBeGreaterThan(0xA0A0A0);
    });
  });

  describe('High Contrast Theme Validation', () => {
    it('high-contrast-light should use pure black strokes', () => {
      expect(highContrastLightTheme.agents.coordinator.stroke).toBe('#000000');
      expect(highContrastLightTheme.agents.worker.stroke).toBe('#000000');
    });

    it('high-contrast-dark should use pure white strokes', () => {
      expect(highContrastDarkTheme.agents.coordinator.stroke).toBe('#ffffff');
      expect(highContrastDarkTheme.agents.worker.stroke).toBe('#ffffff');
    });

    it('high-contrast themes should have AAA accessibility', () => {
      expect(highContrastLightTheme.accessibility).toBe('AAA');
      expect(highContrastDarkTheme.accessibility).toBe('AAA');
    });
  });

  describe('Colorblind Theme Validation', () => {
    // Okabe-Ito palette colors
    const okabeItoColors = [
      '#E69F00', // Orange
      '#56B4E9', // Sky Blue
      '#009E73', // Bluish Green
      '#F0E442', // Yellow
      '#0072B2', // Blue
      '#D55E00', // Vermillion
      '#CC79A7', // Reddish Purple
    ];

    it('colorblind-light should use Okabe-Ito colors', () => {
      const fillColors = Object.values(colorblindLightTheme.agents).map(a => a.fill);
      const usesOkabeIto = fillColors.some(color => okabeItoColors.includes(color));
      expect(usesOkabeIto).toBe(true);
    });

    it('colorblind-dark should use Okabe-Ito colors', () => {
      const fillColors = Object.values(colorblindDarkTheme.agents).map(a => a.fill);
      const usesOkabeIto = fillColors.some(color => okabeItoColors.includes(color));
      expect(usesOkabeIto).toBe(true);
    });

    it('colorblind themes should have colorblind-safe accessibility', () => {
      expect(colorblindLightTheme.accessibility).toBe('colorblind-safe');
      expect(colorblindDarkTheme.accessibility).toBe('colorblind-safe');
    });
  });

  describe('Theme Registry Integration', () => {
    it('all built-in themes should be accessible by name', () => {
      const registry = ThemeRegistry.getInstance();

      expect(registry.get('light')).toBeDefined();
      expect(registry.get('dark')).toBeDefined();
      expect(registry.get('high-contrast-light')).toBeDefined();
      expect(registry.get('high-contrast-dark')).toBeDefined();
      expect(registry.get('colorblind-light')).toBeDefined();
      expect(registry.get('colorblind-dark')).toBeDefined();
    });

    it('createThemeGenerator should work with all theme names', () => {
      const themeNames = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark', 'colorblind-light', 'colorblind-dark'];

      for (const name of themeNames) {
        const generator = createThemeGenerator(name);
        expect(generator.getPalette().id).toBe(name);
      }
    });
  });
});

describe('Theme Output Samples', () => {
  const config = createTestConfig();

  // Generate sample outputs for manual inspection if needed
  it('should generate sample output for light theme', () => {
    const result = generateHierarchy(config, { theme: 'light' });
    expect(result).toContain('theme":"default"');
    expect(result.length).toBeGreaterThan(500);
  });

  it('should generate sample output for dark theme', () => {
    const result = generateHierarchy(config, { theme: 'dark' });
    expect(result).toContain('theme":"dark"');
    expect(result.length).toBeGreaterThan(500);
  });

  it('should generate sample output for colorblind-light theme', () => {
    const result = generateHierarchy(config, { theme: 'colorblind-light' });
    expect(result).toContain('#56B4E9'); // Sky Blue from Okabe-Ito
  });
});
