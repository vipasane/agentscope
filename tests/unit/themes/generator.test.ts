/**
 * Mermaid Theme Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MermaidThemeGenerator,
  createThemeGenerator,
  generateMermaidInit,
  generateClassDefs,
} from '../../../src/core/themes/generator.js';
import {
  lightTheme,
  darkTheme,
  colorblindLightTheme,
} from '../../../src/core/themes/palettes/index.js';
import { ThemeRegistry } from '../../../src/core/themes/registry.js';

describe('MermaidThemeGenerator', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  describe('constructor', () => {
    it('should accept a theme palette', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      expect(generator.getPalette().id).toBe('light');
    });

    it('should accept a theme name', () => {
      const generator = new MermaidThemeGenerator('dark');
      expect(generator.getPalette().id).toBe('dark');
    });

    it('should use default theme if no argument', () => {
      const generator = new MermaidThemeGenerator();
      expect(generator.getPalette().id).toBe('light');
    });
  });

  describe('getInit', () => {
    it('should generate valid Mermaid init directive', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const init = generator.getInit();

      expect(init).toMatch(/^%%\{init:/);
      expect(init).toMatch(/\}%%$/);
      expect(init).toContain('"theme"');
    });

    it('should use "dark" base theme for dark palette', () => {
      const generator = new MermaidThemeGenerator(darkTheme);
      const init = generator.getInit();
      expect(init).toContain('"theme":"dark"');
    });

    it('should use "default" base theme for light palette', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const init = generator.getInit();
      expect(init).toContain('"theme":"default"');
    });
  });

  describe('getClassDefs', () => {
    it('should generate class definitions for all agent types', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const classDefs = generator.getClassDefs();

      expect(classDefs.some(d => d.startsWith('classDef coordinator'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef worker'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef specialist'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef reviewer'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef custom'))).toBe(true);
    });

    it('should generate class definitions for element types', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const classDefs = generator.getClassDefs();

      expect(classDefs.some(d => d.startsWith('classDef input'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef output'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef hook'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef mcp'))).toBe(true);
      expect(classDefs.some(d => d.startsWith('classDef skill'))).toBe(true);
    });

    it('should include fill and stroke colors', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const classDefs = generator.getClassDefs();

      const coordinatorDef = classDefs.find(d => d.startsWith('classDef coordinator'));
      expect(coordinatorDef).toContain('fill:#e1f5fe');
      expect(coordinatorDef).toContain('stroke:#01579b');
    });

    it('should include stroke-dasharray for dashed elements', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const classDefs = generator.getClassDefs();

      const hookDef = classDefs.find(d => d.startsWith('classDef hook'));
      expect(hookDef).toContain('stroke-dasharray');
    });
  });

  describe('getLinkStyles', () => {
    it('should return link style comments', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const linkStyles = generator.getLinkStyles();

      expect(linkStyles.length).toBeGreaterThan(0);
      expect(linkStyles.some(s => s.includes('Delegation'))).toBe(true);
      expect(linkStyles.some(s => s.includes('Tool'))).toBe(true);
      expect(linkStyles.some(s => s.includes('Data'))).toBe(true);
    });
  });

  describe('getAllStyles', () => {
    it('should combine init, classDefs, and linkStyles', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const allStyles = generator.getAllStyles();

      expect(allStyles[0]).toMatch(/^%%\{init:/);
      expect(allStyles.some(s => s.startsWith('classDef'))).toBe(true);
    });
  });

  describe('applyClass', () => {
    it('should generate class application statement', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const result = generator.applyClass('myNode', 'coordinator');
      expect(result).toBe('class myNode coordinator');
    });
  });

  describe('getAgentClass', () => {
    it('should map agent types to class names', () => {
      const generator = new MermaidThemeGenerator(lightTheme);

      expect(generator.getAgentClass('coordinator')).toBe('coordinator');
      expect(generator.getAgentClass('worker')).toBe('worker');
      expect(generator.getAgentClass('specialist')).toBe('specialist');
      expect(generator.getAgentClass('reviewer')).toBe('reviewer');
    });

    it('should return custom for unknown types', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      expect(generator.getAgentClass('unknown')).toBe('custom');
    });
  });

  describe('getMermaidConfig', () => {
    it('should return complete Mermaid configuration', () => {
      const generator = new MermaidThemeGenerator(lightTheme);
      const config = generator.getMermaidConfig();

      expect(config.theme).toBeDefined();
      expect(config.themeVariables).toBeDefined();
      expect(config.classDefs).toBeDefined();
      expect(config.linkStyles).toBeDefined();
    });
  });

  describe('colorblind themes', () => {
    it('should use Okabe-Ito palette colors', () => {
      const generator = new MermaidThemeGenerator(colorblindLightTheme);
      const classDefs = generator.getClassDefs();

      // Check for Okabe-Ito palette colors
      const coordinatorDef = classDefs.find(d => d.startsWith('classDef coordinator'));
      expect(coordinatorDef).toContain('#56B4E9'); // Sky Blue
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  describe('createThemeGenerator', () => {
    it('should create generator with theme name', () => {
      const generator = createThemeGenerator('dark');
      expect(generator.getPalette().id).toBe('dark');
    });

    it('should create generator with palette', () => {
      const generator = createThemeGenerator(lightTheme);
      expect(generator.getPalette().id).toBe('light');
    });
  });

  describe('generateMermaidInit', () => {
    it('should generate init directive', () => {
      const init = generateMermaidInit('light');
      expect(init).toMatch(/^%%\{init:/);
    });
  });

  describe('generateClassDefs', () => {
    it('should generate class definitions', () => {
      const defs = generateClassDefs('dark');
      expect(defs.length).toBeGreaterThan(0);
      expect(defs.every(d => d.startsWith('classDef'))).toBe(true);
    });
  });
});
