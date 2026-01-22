/**
 * Theme Palettes Tests
 */

import { describe, it, expect } from 'vitest';
import {
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  colorblindLightTheme,
  colorblindDarkTheme,
  builtinPalettes,
  defaultTheme,
} from '../../../src/core/themes/palettes/index.js';
import type { ThemePalette } from '../../../src/core/themes/types.js';

describe('Theme Palettes', () => {
  describe('lightTheme', () => {
    it('should have correct id and scheme', () => {
      expect(lightTheme.id).toBe('light');
      expect(lightTheme.scheme).toBe('light');
    });

    it('should have all required agent colors', () => {
      expect(lightTheme.agents.coordinator).toBeDefined();
      expect(lightTheme.agents.worker).toBeDefined();
      expect(lightTheme.agents.specialist).toBeDefined();
      expect(lightTheme.agents.reviewer).toBeDefined();
      expect(lightTheme.agents.custom).toBeDefined();
    });

    it('should have all required element colors', () => {
      expect(lightTheme.elements.input).toBeDefined();
      expect(lightTheme.elements.output).toBeDefined();
      expect(lightTheme.elements.hook).toBeDefined();
      expect(lightTheme.elements.mcp).toBeDefined();
      expect(lightTheme.elements.skill).toBeDefined();
      expect(lightTheme.elements.subgraph).toBeDefined();
    });

    it('should have all required link colors', () => {
      expect(lightTheme.links.delegation).toBeDefined();
      expect(lightTheme.links.tool).toBeDefined();
      expect(lightTheme.links.data).toBeDefined();
    });

    it('should have chrome colors', () => {
      expect(lightTheme.chrome.background).toBeDefined();
      expect(lightTheme.chrome.border).toBeDefined();
      expect(lightTheme.chrome.text).toBeDefined();
      expect(lightTheme.chrome.muted).toBeDefined();
    });
  });

  describe('darkTheme', () => {
    it('should have correct id and scheme', () => {
      expect(darkTheme.id).toBe('dark');
      expect(darkTheme.scheme).toBe('dark');
    });

    it('should have darker fill colors than light theme', () => {
      // Dark theme coordinator should have darker fill
      const lightFill = parseInt(lightTheme.agents.coordinator.fill.slice(1), 16);
      const darkFill = parseInt(darkTheme.agents.coordinator.fill.slice(1), 16);
      expect(darkFill).toBeLessThan(lightFill);
    });
  });

  describe('highContrastLightTheme', () => {
    it('should have correct id and scheme', () => {
      expect(highContrastLightTheme.id).toBe('high-contrast-light');
      expect(highContrastLightTheme.scheme).toBe('high-contrast');
    });

    it('should have AAA accessibility level', () => {
      expect(highContrastLightTheme.accessibility).toBe('AAA');
    });

    it('should use high contrast colors', () => {
      // High contrast typically uses black and white
      expect(highContrastLightTheme.agents.coordinator.stroke).toBe('#000000');
    });
  });

  describe('highContrastDarkTheme', () => {
    it('should have correct id and scheme', () => {
      expect(highContrastDarkTheme.id).toBe('high-contrast-dark');
      expect(highContrastDarkTheme.scheme).toBe('high-contrast');
    });

    it('should have AAA accessibility level', () => {
      expect(highContrastDarkTheme.accessibility).toBe('AAA');
    });

    it('should use white strokes on dark background', () => {
      expect(highContrastDarkTheme.agents.coordinator.stroke).toBe('#ffffff');
    });
  });

  describe('colorblindLightTheme', () => {
    it('should have correct id and scheme', () => {
      expect(colorblindLightTheme.id).toBe('colorblind-light');
      expect(colorblindLightTheme.scheme).toBe('light');
    });

    it('should have colorblind-safe accessibility level', () => {
      expect(colorblindLightTheme.accessibility).toBe('colorblind-safe');
    });

    it('should use Okabe-Ito palette colors', () => {
      // Okabe-Ito colors
      const okabeItoColors = [
        '#E69F00', // Orange
        '#56B4E9', // Sky Blue
        '#009E73', // Bluish Green
        '#F0E442', // Yellow
        '#0072B2', // Blue
        '#D55E00', // Vermillion
        '#CC79A7', // Reddish Purple
      ];

      const coordinatorFill = colorblindLightTheme.agents.coordinator.fill;
      expect(okabeItoColors).toContain(coordinatorFill);
    });
  });

  describe('colorblindDarkTheme', () => {
    it('should have correct id and scheme', () => {
      expect(colorblindDarkTheme.id).toBe('colorblind-dark');
      expect(colorblindDarkTheme.scheme).toBe('dark');
    });

    it('should have colorblind-safe accessibility level', () => {
      expect(colorblindDarkTheme.accessibility).toBe('colorblind-safe');
    });
  });

  describe('builtinPalettes', () => {
    it('should contain all 6 themes', () => {
      expect(builtinPalettes.length).toBe(6);
    });

    it('should have unique ids', () => {
      const ids = builtinPalettes.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(6);
    });

    it('should include all expected themes', () => {
      const ids = builtinPalettes.map(p => p.id);
      expect(ids).toContain('light');
      expect(ids).toContain('dark');
      expect(ids).toContain('high-contrast-light');
      expect(ids).toContain('high-contrast-dark');
      expect(ids).toContain('colorblind-light');
      expect(ids).toContain('colorblind-dark');
    });
  });

  describe('defaultTheme', () => {
    it('should be the light theme', () => {
      expect(defaultTheme.id).toBe('light');
    });
  });

  describe('all palettes validation', () => {
    const allThemes: ThemePalette[] = [
      lightTheme,
      darkTheme,
      highContrastLightTheme,
      highContrastDarkTheme,
      colorblindLightTheme,
      colorblindDarkTheme,
    ];

    it.each(allThemes.map(t => [t.id, t]))(
      '%s should have valid hex colors for agent fills',
      (_, theme) => {
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        Object.values(theme.agents).forEach(color => {
          expect(color.fill).toMatch(hexRegex);
          expect(color.stroke).toMatch(hexRegex);
        });
      }
    );

    it.each(allThemes.map(t => [t.id, t]))(
      '%s should have valid hex colors for chrome',
      (_, theme) => {
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        expect(theme.chrome.background).toMatch(hexRegex);
        expect(theme.chrome.border).toMatch(hexRegex);
        expect(theme.chrome.text).toMatch(hexRegex);
        expect(theme.chrome.muted).toMatch(hexRegex);
      }
    );

    it.each(allThemes.map(t => [t.id, t]))(
      '%s should have valid stroke widths',
      (_, theme) => {
        Object.values(theme.agents).forEach(color => {
          if (color.strokeWidth !== undefined) {
            expect(color.strokeWidth).toBeGreaterThanOrEqual(1);
            expect(color.strokeWidth).toBeLessThanOrEqual(5);
          }
        });
      }
    );
  });
});
