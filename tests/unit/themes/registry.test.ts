/**
 * Theme Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ThemeRegistry,
  getThemeRegistry,
  getTheme,
  getThemeOrDefault,
  isBuiltinTheme,
} from '../../../src/core/themes/registry.js';
import { lightTheme, darkTheme } from '../../../src/core/themes/palettes/index.js';
import type { ThemePalette } from '../../../src/core/themes/types.js';

describe('ThemeRegistry', () => {
  beforeEach(() => {
    // Reset registry to defaults before each test
    ThemeRegistry.reset();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ThemeRegistry.getInstance();
      const instance2 = ThemeRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should have built-in themes pre-registered', () => {
      const registry = ThemeRegistry.getInstance();
      expect(registry.has('light')).toBe(true);
      expect(registry.has('dark')).toBe(true);
      expect(registry.has('high-contrast-light')).toBe(true);
      expect(registry.has('high-contrast-dark')).toBe(true);
      expect(registry.has('colorblind-light')).toBe(true);
      expect(registry.has('colorblind-dark')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return theme by name', () => {
      const registry = getThemeRegistry();
      const theme = registry.get('light');
      expect(theme).toBeDefined();
      expect(theme?.id).toBe('light');
    });

    it('should return undefined for unknown theme', () => {
      const registry = getThemeRegistry();
      const theme = registry.get('nonexistent');
      expect(theme).toBeUndefined();
    });

    it('should sanitize theme name', () => {
      const registry = getThemeRegistry();
      const theme = registry.get('LIGHT');
      expect(theme).toBeDefined();
      expect(theme?.id).toBe('light');
    });
  });

  describe('getOrDefault', () => {
    it('should return theme if exists', () => {
      const registry = getThemeRegistry();
      const theme = registry.getOrDefault('dark');
      expect(theme.id).toBe('dark');
    });

    it('should return default theme if name is undefined', () => {
      const registry = getThemeRegistry();
      const theme = registry.getOrDefault(undefined);
      expect(theme.id).toBe('light');
    });

    it('should return default theme if name is unknown', () => {
      const registry = getThemeRegistry();
      const theme = registry.getOrDefault('nonexistent');
      expect(theme.id).toBe('light');
    });
  });

  describe('list', () => {
    it('should return all registered theme names', () => {
      const registry = getThemeRegistry();
      const themes = registry.list();
      expect(themes).toContain('light');
      expect(themes).toContain('dark');
      expect(themes).toContain('high-contrast-light');
      expect(themes).toContain('high-contrast-dark');
      expect(themes).toContain('colorblind-light');
      expect(themes).toContain('colorblind-dark');
      expect(themes.length).toBe(6);
    });
  });

  describe('getAll', () => {
    it('should return all registered themes', () => {
      const registry = getThemeRegistry();
      const themes = registry.getAll();
      expect(themes.length).toBe(6);
      expect(themes.every(t => t.id && t.name)).toBe(true);
    });
  });

  describe('register', () => {
    it('should register a valid custom theme', () => {
      const registry = getThemeRegistry();
      const customTheme: ThemePalette = {
        ...lightTheme,
        id: 'custom-theme',
        name: 'Custom Theme',
      };

      const result = registry.register(customTheme);
      expect(result.valid).toBe(true);
      expect(registry.has('custom-theme')).toBe(true);
    });

    it('should reject invalid theme', () => {
      const registry = getThemeRegistry();
      const invalidTheme = {
        id: '',
        name: '',
      } as ThemePalette;

      const result = registry.register(invalidTheme);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('setDefault', () => {
    it('should change default theme', () => {
      const registry = getThemeRegistry();
      registry.setDefault('dark');
      const defaultTheme = registry.getDefault();
      expect(defaultTheme.id).toBe('dark');
    });

    it('should return false for unknown theme', () => {
      const registry = getThemeRegistry();
      const result = registry.setDefault('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should not allow unregistering built-in themes', () => {
      const registry = getThemeRegistry();
      const result = registry.unregister('light');
      expect(result).toBe(false);
      expect(registry.has('light')).toBe(true);
    });

    it('should allow unregistering custom themes', () => {
      const registry = getThemeRegistry();
      const customTheme: ThemePalette = {
        ...lightTheme,
        id: 'my-custom',
        name: 'My Custom',
      };
      registry.register(customTheme);
      expect(registry.has('my-custom')).toBe(true);

      const result = registry.unregister('my-custom');
      expect(result).toBe(true);
      expect(registry.has('my-custom')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate a correct theme', () => {
      const registry = getThemeRegistry();
      const result = registry.validate(lightTheme);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject theme with invalid ID', () => {
      const registry = getThemeRegistry();
      const badTheme = { ...lightTheme, id: '123-bad' };
      const result = registry.validate(badTheme);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ID'))).toBe(true);
    });

    it('should reject theme with invalid color', () => {
      const registry = getThemeRegistry();
      const badTheme = {
        ...lightTheme,
        id: 'bad-color',
        agents: {
          ...lightTheme.agents,
          coordinator: { fill: 'not-a-color', stroke: '#000000' },
        },
      } as unknown as ThemePalette;
      const result = registry.validate(badTheme);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  describe('getTheme', () => {
    it('should return theme by name', () => {
      const theme = getTheme('dark');
      expect(theme?.id).toBe('dark');
    });
  });

  describe('getThemeOrDefault', () => {
    it('should return default for unknown theme', () => {
      const theme = getThemeOrDefault('unknown');
      expect(theme.id).toBe('light');
    });
  });

  describe('isBuiltinTheme', () => {
    it('should identify built-in themes', () => {
      expect(isBuiltinTheme('light')).toBe(true);
      expect(isBuiltinTheme('dark')).toBe(true);
      expect(isBuiltinTheme('custom')).toBe(false);
    });
  });
});
